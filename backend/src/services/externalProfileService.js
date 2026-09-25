const jsonRequest = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`Provider request failed with HTTP ${response.status}`);
    }

    return response.json();
};

const activityLevel = (count) => {
    if (count >= 20) return "high";
    if (count >= 8) return "medium";
    return "low";
};

const isBackendRepo = (repo) => {
    const text = `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
    return /backend|api|server|microservice|service|database|express|nest|fastapi|django|flask|spring|kafka|redis|sql|mongo|grpc/i.test(text);
};

const hasDeploymentProof = (repo) => {
    const text = `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
    return /docker|dockerfile|kubernetes|k8s|aws|gcp|azure|terraform|ci\/cd|github-actions|vercel|render|railway|deploy/i.test(text);
};

const syncGitHub = async (username) => {
    const [profile, repositories] = await Promise.all([
        jsonRequest(`https://api.github.com/users/${encodeURIComponent(username)}`),
        jsonRequest(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`),
    ]);

    const languageCounts = {};
    const technologies = new Set();
    let totalLanguageBytesOrCount = 0;

    let backendProjectsCount = 0;
    const deploymentEvidence = new Set();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    let recentlyActiveCount = 0;

    const topRepositories = [];

    repositories.forEach((repository) => {
        if (repository.language) {
            languageCounts[repository.language] = (languageCounts[repository.language] || 0) + 1;
            technologies.add(repository.language);
            totalLanguageBytesOrCount += 1;
        }

        (repository.topics || []).forEach((topic) => {
            technologies.add(topic);
            if (/docker|kubernetes|aws|ci-cd|terraform|gcp|azure/i.test(topic)) {
                deploymentEvidence.add(topic);
            }
        });

        const isBackend = isBackendRepo(repository);
        const hasDeploy = hasDeploymentProof(repository);

        if (isBackend) backendProjectsCount += 1;
        if (hasDeploy) deploymentEvidence.add("Docker / Deployment Configs");

        if (new Date(repository.pushed_at) > ninetyDaysAgo) {
            recentlyActiveCount += 1;
        }

        if (!repository.fork && topRepositories.length < 15) {
            topRepositories.push({
                name: repository.name,
                description: repository.description || "",
                language: repository.language || "",
                stars: repository.stargazers_count,
                topics: repository.topics || [],
                isBackend,
                hasDeployment: hasDeploy,
                updatedAt: repository.updated_at,
            });
        }
    });

    const languagePercentages = {};
    if (totalLanguageBytesOrCount > 0) {
        Object.entries(languageCounts).forEach(([lang, count]) => {
            languagePercentages[lang] = Math.round((count / totalLanguageBytesOrCount) * 100);
        });
    }

    const activeProjects = repositories.filter((repository) => !repository.archived && !repository.fork).length;

    return {
        profileUrl: profile.html_url,
        snapshot: {
            repositories: profile.public_repos,
            activeProjects,
            languages: languageCounts,
            languagePercentages,
            technologies: [...technologies],
            backendProjectsCount,
            deploymentEvidence: [...deploymentEvidence],
            recentActivityCount: recentlyActiveCount,
            activityLevel: recentlyActiveCount >= 5 ? "high" : recentlyActiveCount >= 2 ? "medium" : "low",
            topRepositories,
        },
    };
};

const syncCodeforces = async (username) => {
    const [profileResponse, submissionsResponse] = await Promise.all([
        jsonRequest(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(username)}`),
        jsonRequest(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(username)}&from=1&count=1000`),
    ]);
    const profile = profileResponse.result?.[0];
    const submissions = submissionsResponse.result || [];

    if (!profile) throw new Error("Codeforces profile was not found");

    const solvedProblems = new Set(
        submissions
            .filter((submission) => submission.verdict === "OK")
            .map((submission) => `${submission.problem.contestId}-${submission.problem.index}`)
    );

    const solvedCount = solvedProblems.size;
    const rating = profile.rating || 0;

    return {
        profileUrl: `https://codeforces.com/profile/${encodeURIComponent(username)}`,
        snapshot: {
            solved: solvedCount,
            rating,
            contests: profile.contribution || 0,
            activityLevel: activityLevel(submissions.length),
            dsaAssessment: rating >= 1600 ? "Advanced CP" : rating >= 1300 ? "Strong CP" : "Moderate CP",
        },
    };
};

const syncLeetCode = async (username) => {
    const response = await fetch("https://leetcode.com/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", Referer: "https://leetcode.com/" },
        body: JSON.stringify({
            query: `query userProfile($username: String!) { matchedUser(username: $username) { username profile { realName } submitStats { acSubmissionNum { difficulty count } } } userContestRanking(username: $username) { rating attendedContestsCount } }`,
            variables: { username },
        }),
    });
    const data = await response.json();
    const user = data.data?.matchedUser;
    const ranking = data.data?.userContestRanking;

    if (!user) throw new Error("LeetCode profile was not found");

    const stats = Object.fromEntries((user.submitStats?.acSubmissionNum || []).map((item) => [item.difficulty.toLowerCase(), item.count]));
    const totalSolved = stats.all || 0;
    const medium = stats.medium || 0;
    const hard = stats.hard || 0;

    let dsaAssessment = "Moderate DSA";
    if (totalSolved >= 400 || (medium >= 200 && hard >= 40)) {
        dsaAssessment = "Strong DSA evidence";
    } else if (totalSolved >= 200) {
        dsaAssessment = "Good DSA foundations";
    }

    const dsaStrengths = [];
    if (stats.easy >= 100) dsaStrengths.push("Arrays & Strings");
    if (medium >= 100) dsaStrengths.push("Trees & Graphs", "Binary Search");
    if (hard >= 25) dsaStrengths.push("Advanced Algorithms");

    return {
        profileUrl: `https://leetcode.com/u/${encodeURIComponent(username)}/`,
        snapshot: {
            solved: totalSolved,
            easy: stats.easy || 0,
            medium,
            hard,
            rating: ranking?.rating ? Math.round(ranking.rating) : undefined,
            contests: ranking?.attendedContestsCount,
            activityLevel: activityLevel(totalSolved),
            dsaAssessment,
            dsaStrengths: dsaStrengths.length ? dsaStrengths : ["Data Structure Fundamentals"],
            dsaWeaknesses: hard < 20 ? ["Dynamic Programming", "Complex Graph Algorithms"] : [],
        },
    };
};

const syncCodeChef = async (username) => {
    const profile = await jsonRequest(`https://codechef-api.vercel.app/handle/${encodeURIComponent(username)}`);

    if (!profile || profile.status === "error") throw new Error("CodeChef profile was not found");

    const solved = Number(profile.totalProblemsSolved || profile.problemsSolved || 0);
    const rating = Number(profile.currentRating || profile.rating || 0) || undefined;

    return {
        profileUrl: `https://www.codechef.com/users/${encodeURIComponent(username)}`,
        snapshot: {
            solved,
            rating,
            contests: Number(profile.contestParticipated || profile.contests || 0) || undefined,
            activityLevel: activityLevel(solved),
            dsaAssessment: rating && rating >= 1700 ? "Strong Competitive Coder" : "Active Problem Solver",
        },
    };
};

const providers = { github: syncGitHub, leetcode: syncLeetCode, codeforces: syncCodeforces, codechef: syncCodeChef };

export const syncExternalProfile = async (provider, username) => {
    const syncProvider = providers[provider];
    if (!syncProvider) throw new Error("Unsupported external profile provider");

    return syncProvider(username);
};

