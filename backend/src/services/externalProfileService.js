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

const sanitizeHandle = (input) => {
    if (!input) return "";
    let val = String(input).trim();
    try {
        if (val.startsWith("http://") || val.startsWith("https://")) {
            const u = new URL(val);
            const segments = u.pathname.split("/").filter(Boolean);
            val = segments[segments.length - 1] || val;
        }
    } catch {
        // fallback
    }
    return val.replace(/^@/, "").replace(/[\/\.]+$/, "").trim();
};

const syncCodeChef = async (rawHandle) => {
    const username = sanitizeHandle(rawHandle);
    if (!username) throw new Error("A valid CodeChef username or profile URL is required");

    const response = await fetch(`https://www.codechef.com/users/${encodeURIComponent(username)}`, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    });

    if (!response.ok) {
        throw new Error(`CodeChef responded with HTTP ${response.status}`);
    }

    // If redirected to home page, profile does not exist
    if (response.url === "https://www.codechef.com/" || response.url === "https://www.codechef.com") {
        throw new Error(`CodeChef profile "${username}" was not found. Please verify the handle.`);
    }

    const html = await response.text();

    const ratingMatch = html.match(/class="rating-number"[^>]*>([^<]+)/i);
    const rating = ratingMatch ? parseInt(ratingMatch[1].trim(), 10) : undefined;

    const starMatches = html.match(/class="rating-star"[^>]*>([\s\S]*?)<\/span>/i);
    let stars;
    if (starMatches) {
        const starCount = (starMatches[1].match(/&#9733;|★/g) || []).length;
        if (starCount) stars = `${starCount}★`;
    }

    const solvedMatch = html.match(/Fully Solved\s*\(([0-9]+)\)/i) || html.match(/Total Problems Solved:\s*([0-9]+)/i);
    const solved = solvedMatch ? parseInt(solvedMatch[1], 10) : 0;

    const highestRatingMatch = html.match(/\(Highest Rating\s*([0-9]+)\)/i);
    const highestRating = highestRatingMatch ? parseInt(highestRatingMatch[1], 10) : rating;

    const globalRankMatch = html.match(/<a href="\/ratings\/all"[^>]*>([0-9]+)<\/a>/i);
    const globalRank = globalRankMatch ? parseInt(globalRankMatch[1], 10) : undefined;

    return {
        profileUrl: `https://www.codechef.com/users/${encodeURIComponent(username)}`,
        snapshot: {
            solved,
            rating,
            highestRating,
            stars,
            globalRank,
            activityLevel: activityLevel(solved),
            dsaAssessment: rating && rating >= 1700 ? "Strong Competitive Coder" : "Active Problem Solver",
        },
    };
};

const providers = { github: syncGitHub, leetcode: syncLeetCode, codeforces: syncCodeforces, codechef: syncCodeChef };

export const syncExternalProfile = async (provider, rawUsername) => {
    const username = sanitizeHandle(rawUsername);
    if (!username) throw new Error(`Please provide a valid ${provider} handle or URL`);

    const syncProvider = providers[provider];
    if (!syncProvider) throw new Error("Unsupported external profile provider");

    return syncProvider(username);
};

