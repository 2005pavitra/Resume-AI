import { parseJobDescriptionText } from "./jobDescriptionParser.js";
import { parseResumeText } from "./resumeParser.js";

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
const unique = (values) => [...new Set(values.filter(Boolean))];
const percentage = (matched, total) => (total ? Math.round((matched / total) * 100) : 0);

const includesSkill = (skills, requiredSkill) => {
    const normalizedRequired = normalize(requiredSkill);
    return skills.some((skill) => {
        const normalizedSkill = normalize(skill);
        return normalizedSkill === normalizedRequired
            || normalizedSkill.includes(normalizedRequired)
            || normalizedRequired.includes(normalizedSkill);
    });
};

const buildRequirementMatches = (requiredSkills, preferredSkills, resumeSkills, projectSkills, githubSkills, codingEvidence) => {
    const createMatch = (requirement, category, priority) => {
        const inResume = includesSkill(resumeSkills, requirement);
        const inProject = includesSkill(projectSkills, requirement);
        const inGitHub = includesSkill(githubSkills, requirement);
        const isDsaRequirement = /data structure|algorithm|dsa|problem solving|competitive/i.test(requirement);
        const sources = [];

        if (inResume) sources.push("resume");
        if (inProject) sources.push("project");
        if (inGitHub) sources.push("github");
        if (isDsaRequirement && codingEvidence) sources.push("coding_profile");

        let status = "significant_gap";
        let confidence = "low";
        let evidence = "No matching evidence found in the submitted profile or linked accounts";

        if (sources.length >= 2 || (inResume && inProject) || (inResume && inGitHub)) {
            status = "strong_match";
            confidence = "high";
            evidence = `Skill verified with strong proof across ${sources.join(", ")}`;
        } else if (sources.length === 1) {
            status = "partial_match";
            confidence = inResume ? "low" : "medium";
            evidence = inResume
                ? `Mentioned on resume, but lacks supporting GitHub or project verification`
                : `Detected in ${sources[0]}, but not explicitly highlighted in resume text`;
        }

        return {
            requirement,
            category,
            matched: sources.length > 0,
            status,
            evidence,
            sources,
            confidence,
            priority,
        };
    };

    return [
        ...requiredSkills.map((skill) => createMatch(skill, "required_skill", "critical")),
        ...preferredSkills.map((skill) => createMatch(skill, "preferred_skill", "nice_to_have")),
    ];
};

const buildScoreExplanations = (matchedRequired, missingRequired, requirementMatches, parsedProfile, githubSnapshot, codingSnapshot, parsedRequirements) => {
    const strong = [];
    const missingOrWeak = [];

    if (matchedRequired.length > 0) {
        strong.push({
            factor: `Core Technical Alignment (${matchedRequired.slice(0, 4).join(", ")})`,
            evidence: `Demonstrated matching capabilities across target requirements.`,
        });
    }

    const highConfidenceMatches = requirementMatches.filter((m) => m.matched && m.confidence === "high");
    if (highConfidenceMatches.length > 0) {
        const skills = highConfidenceMatches.map((m) => m.requirement).slice(0, 3).join(", ");
        strong.push({
            factor: `Verified Technical Proof (${skills})`,
            evidence: `Backed by both resume mentions and project/GitHub implementations.`,
        });
    }

    if (codingSnapshot?.solved && codingSnapshot.solved > 100) {
        strong.push({
            factor: `Data Structures & Competitive Programming`,
            evidence: `${codingSnapshot.solved} problems solved (${codingSnapshot.dsaAssessment || "Active problem solver"}).`,
        });
    }

    if (githubSnapshot?.repositories && githubSnapshot.repositories > 0) {
        strong.push({
            factor: `Public GitHub Portfolio Activity`,
            evidence: `${githubSnapshot.repositories} repositories, ${githubSnapshot.activeProjects || 0} active projects, ${githubSnapshot.activityLevel || "moderate"} recent activity.`,
        });
    }

    if (missingRequired.length > 0) {
        missingOrWeak.push({
            factor: `Missing Critical Requirement: ${missingRequired.slice(0, 2).join(", ")}`,
            issue: `The job explicitly requires these competencies, but no evidence was found in your resume or connected profiles.`,
        });
    }

    const unverifiedSkills = requirementMatches.filter((m) => m.matched && m.confidence === "low");
    if (unverifiedSkills.length > 0) {
        const skills = unverifiedSkills.map((m) => m.requirement).slice(0, 2).join(", ");
        missingOrWeak.push({
            factor: `Unverified Claims: ${skills}`,
            issue: `Mentioned in resume text, but zero GitHub repo code or project proof was detected.`,
        });
    }

    if (parsedRequirements?.minYearsExperience && parsedRequirements.minYearsExperience > 0) {
        if (!parsedProfile?.experience || parsedProfile.experience.length === 0) {
            missingOrWeak.push({
                factor: `Experience Seniority Mismatch`,
                issue: `JD asks for ${parsedRequirements.minYearsExperience}+ years of professional experience, but no structured work history was identified.`,
            });
        }
    }

    if (!parsedProfile.hasMetrics) {
        missingOrWeak.push({
            factor: `Resume Lacks Quantifiable Metrics`,
            issue: `Bullets do not show measurable results (%, scale, latency, users, revenue impact).`,
        });
    }

    return { strong, missingOrWeak };
};

const buildSkillGapsCategorized = (requirementMatches) => {
    const alreadyStrong = [];
    const partial = [];
    const missing = [];

    requirementMatches.forEach((match) => {
        if (match.status === "strong_match") {
            alreadyStrong.push({
                skill: match.requirement,
                evidence: match.evidence,
                confidence: match.confidence,
                sources: match.sources,
            });
        } else if (match.status === "partial_match") {
            partial.push({
                skill: match.requirement,
                evidence: match.evidence,
                confidence: match.confidence,
                sources: match.sources,
            });
        } else {
            missing.push({
                skill: match.requirement,
                evidence: match.evidence,
                confidence: "high",
                priority: match.priority,
            });
        }
    });

    return { alreadyStrong, partial, missing };
};

const buildProjectRelevance = (parsedProfile, githubSnapshot, requiredSkills, preferredSkills) => {
    const allTargetSkills = unique([...requiredSkills, ...preferredSkills]);
    const candidateProjects = [...(parsedProfile?.projects || [])];

    if (githubSnapshot?.topRepositories?.length) {
        githubSnapshot.topRepositories.forEach((repo) => {
            const alreadyIncluded = candidateProjects.some((p) => p.name.toLowerCase() === repo.name.toLowerCase());
            if (!alreadyIncluded) {
                candidateProjects.push({
                    name: repo.name,
                    description: repo.description,
                    technologies: repo.topics || [repo.language].filter(Boolean),
                    hasDeployment: repo.hasDeployment,
                    isFromGithub: true,
                });
            }
        });
    }

    const scoredProjects = candidateProjects.map((project) => {
        const projectTech = (project.technologies || []).map((t) => t.toLowerCase());
        const matchedTech = allTargetSkills.filter((skill) =>
            projectTech.some((t) => t.includes(normalize(skill)) || normalize(skill).includes(t))
        );

        let score = matchedTech.length * 20;
        if (project.hasDeployment) score += 20;
        if (project.description && project.description.length > 50) score += 10;

        const why = [];
        if (matchedTech.length > 0) {
            why.push(`Demonstrates key skills: ${matchedTech.slice(0, 4).join(", ")}`);
        }
        if (project.hasDeployment) {
            why.push("Shows deployment & production-ready engineering");
        }
        if (why.length === 0) {
            why.push("General software development project");
        }

        return {
            name: project.name,
            score: Math.min(score, 100),
            why,
            techMatched: matchedTech,
            deploymentEvidence: Boolean(project.hasDeployment),
        };
    });

    scoredProjects.sort((a, b) => b.score - a.score);

    const rankedProjects = scoredProjects.map((project, idx) => ({
        rank: idx + 1,
        name: project.name,
        score: project.score,
        matchTier: idx === 0 ? "primary" : idx === 1 && project.score >= 40 ? "secondary" : "low_relevance",
        why: project.why,
        techMatched: project.techMatched,
        deploymentEvidence: project.deploymentEvidence,
    }));

    const topProject = rankedProjects[0]?.name;
    const advice = topProject
        ? `Lead your technical interviews with ${topProject}. Frame your answers around architecture, trade-offs, and measurable outcomes.`
        : "Build or link a backend project demonstrating key job technologies before interviewing.";

    return { rankedProjects: rankedProjects.slice(0, 5), advice };
};

const buildPreparationPlan = (missingSkills, dsaFocusTopic = "Dynamic Programming", days = 14, targetType = "comprehensive") => {
    const plan = [];
    const missing = [...missingSkills];
    const topMissing = missing.slice(0, 2);

    if (days <= 3) {
        if (targetType === "oa") {
            plan.push({
                dayStart: 1,
                dayEnd: 1,
                topic: "High-Frequency Arrays, Sliding Window & HashMaps",
                tasks: [
                    "Solve 5 LeetCode Mediums on Two Pointers & Prefix Sums",
                    "Review Space/Time complexity constraints for 10^5 array sizes",
                ],
                priority: "critical",
                focusArea: "OA Sprint",
            });
            plan.push({
                dayStart: 2,
                dayEnd: 2,
                topic: `Trees, Graphs & ${dsaFocusTopic}`,
                tasks: [
                    "Solve 4 BFS/DFS and Tree recursion problems",
                    `Review ${dsaFocusTopic} 1D/2D memoization patterns`,
                ],
                priority: "critical",
                focusArea: "OA Sprint",
            });
            plan.push({
                dayStart: 3,
                dayEnd: 3,
                topic: "Timed OA Simulation & Edge Case Testing",
                tasks: [
                    "Run 70-minute timed mock coding assessment with 2 Mediums + 1 Hard",
                    "Double check integer overflow, empty input, and recursion depth limits",
                ],
                priority: "critical",
                focusArea: "OA Final Readiness",
            });
        } else if (targetType === "technical") {
            plan.push({
                dayStart: 1,
                dayEnd: 1,
                topic: "API Architecture & Database Concurrency",
                tasks: [
                    "Review REST vs gRPC trade-offs and connection pooling",
                    "Explain Redis caching patterns (Cache-Aside, Write-Through)",
                ],
                priority: "critical",
                focusArea: "System Design",
            });
            plan.push({
                dayStart: 2,
                dayEnd: 2,
                topic: "Message Queues, Microservices & Outage Recovery",
                tasks: [
                    "Diagram end-to-end architecture with Kafka / Redis queue",
                    "Prepare answer for 'What happens when a node fails?'",
                ],
                priority: "critical",
                focusArea: "Distributed Architecture",
            });
            plan.push({
                dayStart: 3,
                dayEnd: 3,
                topic: "Resume Claim Defense & Project Walkthrough",
                tasks: [
                    "Rehearse 2-minute elevator pitch for your top project",
                    "Defend technology choices: 'Why Kafka vs RabbitMQ?', 'Why MongoDB vs PostgreSQL?'",
                ],
                priority: "critical",
                focusArea: "Interview Defense",
            });
        } else {
            plan.push({
                dayStart: 1,
                dayEnd: 1,
                topic: topMissing.length ? `${topMissing.join(" & ")} Crash Review` : "High-Impact Technical Review",
                tasks: [
                    topMissing[0] ? `Review ${topMissing[0]} architecture and syntax` : "Review REST microservice fundamentals",
                    "Practice 3 high-frequency algorithm questions",
                ],
                priority: "critical",
                focusArea: "Core Concepts",
            });
            plan.push({
                dayStart: 2,
                dayEnd: 2,
                topic: "System Scalability & Architecture Defense",
                tasks: [
                    "Review Redis caching, load balancing, and rate limiting",
                    "Rehearse architecture walk-through of your primary project",
                ],
                priority: "critical",
                focusArea: "System Design",
            });
            plan.push({
                dayStart: 3,
                dayEnd: 3,
                topic: "Mock Interview & Final Talking Points",
                tasks: [
                    "Simulate 45-minute technical screen using predicted interview questions",
                    "Review company engineering blog and prepare questions for the interviewer",
                ],
                priority: "critical",
                focusArea: "Final Prep",
            });
        }
        return plan;
    }

    const numPhases = 5;
    const bucketSize = Math.max(1, Math.floor(days / numPhases));

    const p1End = Math.min(bucketSize, days - 4);
    const p2End = Math.min(bucketSize * 2, days - 3);
    const p3End = Math.min(bucketSize * 3, days - 2);
    const p4End = Math.min(bucketSize * 4, days - 1);

    if (targetType === "oa") {
        plan.push({
            dayStart: 1,
            dayEnd: p1End,
            topic: "Arrays, Strings, HashMaps & Sliding Window",
            tasks: [
                "Solve 8 Medium problems: Two Pointers, Prefix Sum, Frequency Maps",
                "Master sliding window maximum and subarray sum equals K patterns",
                "Ensure O(N) time and O(1)/O(N) space optimizations",
            ],
            priority: "critical",
            focusArea: "Online Assessment (OA)",
        });
        plan.push({
            dayStart: p1End + 1,
            dayEnd: p2End,
            topic: "Binary Search, Stacks & Queues",
            tasks: [
                "Practice Binary Search on answer space (e.g. Koko Eating Bananas, Capacity to Ship)",
                "Monotonic stack & queue problems (Next Greater Element, Daily Temperatures)",
                "Timebox to 20 minutes per problem",
            ],
            priority: "critical",
            focusArea: "Online Assessment (OA)",
        });
        plan.push({
            dayStart: p2End + 1,
            dayEnd: p3End,
            topic: "Trees, BST & Heap / PriorityQueue",
            tasks: [
                "Lowest Common Ancestor, Tree Traversals (Inorder, Postorder, Level-Order)",
                "Top K Frequent Elements, Merge K Sorted Lists with Heaps",
                "Review edge cases: skewed trees, negative values, duplicates",
            ],
            priority: "important",
            focusArea: "Online Assessment (OA)",
        });
        plan.push({
            dayStart: p3End + 1,
            dayEnd: p4End,
            topic: `Graphs & ${dsaFocusTopic}`,
            tasks: [
                "BFS / DFS on 2D Grids (Number of Islands, Rotten Oranges)",
                "Topological Sort (Course Schedule) and Disjoint Set Union (Graph Valid Tree)",
                `Dynamic Programming: 1D & 2D memoization patterns (${dsaFocusTopic})`,
            ],
            priority: "critical",
            focusArea: "Online Assessment (OA)",
        });
        plan.push({
            dayStart: p4End + 1,
            dayEnd: days,
            topic: "Full-Length Timed OA Simulations",
            tasks: [
                "Complete 2 full-length 90-minute timed OA mock tests with 2-3 problems each",
                "Practice writing clean code and handling edge cases without compiler autocomplete",
                "Rest, review mistakes, and ensure steady test pace",
            ],
            priority: "critical",
            focusArea: "OA Exam Simulation",
        });
    } else if (targetType === "technical") {
        plan.push({
            dayStart: 1,
            dayEnd: p1End,
            topic: "API Architecture, Security & Authentication",
            tasks: [
                "Deep dive into REST vs gRPC, HTTP status codes, and idempotency keys",
                "Review JWT architecture, refresh token rotation, and Redis token blacklisting",
                "Prepare answers on rate limiting algorithms (Token Bucket, Leaky Bucket)",
            ],
            priority: "critical",
            focusArea: "Backend Architecture",
        });
        plan.push({
            dayStart: p1End + 1,
            dayEnd: p2End,
            topic: "Database Engineering & Caching Strategies",
            tasks: [
                "B-Tree vs LSM-Tree indexing, query optimization, and slow query profiling",
                "Redis Cache-Aside, Write-Through, Write-Back patterns and eviction policies (LRU/LFU)",
                "Database scaling: read replicas, connection pooling, and sharding trade-offs",
            ],
            priority: "critical",
            focusArea: "Data & Storage Layer",
        });
        plan.push({
            dayStart: p2End + 1,
            dayEnd: p3End,
            topic: "Message Queues & Distributed Systems",
            tasks: [
                "Kafka vs RabbitMQ: partition keys, consumer groups, offset management, and rebalancing",
                "Event-driven architecture: at-least-once vs exactly-once semantics, dead letter queues",
                "CAP theorem, eventual consistency, and distributed lock patterns with Redis Redlock",
            ],
            priority: "important",
            focusArea: "Distributed Systems",
        });
        plan.push({
            dayStart: p3End + 1,
            dayEnd: p4End,
            topic: "Production Outages, Observability & Containerization",
            tasks: [
                "Docker containerization multi-stage builds, Kubernetes pod lifecycle, and CI/CD pipelines",
                "Structured logging, Prometheus metrics, distributed tracing, and root-cause analysis",
                "Prepare STAR-format incident stories for 'Tell me about a production outage you fixed'",
            ],
            priority: "important",
            focusArea: "Operational Resilience",
        });
        plan.push({
            dayStart: p4End + 1,
            dayEnd: days,
            topic: "System Design Mock Screen & Project Walkthrough",
            tasks: [
                "Live diagramming of scalable system handling 100,000 active concurrent connections",
                "Rehearse full deep-dive presentation of your primary featured project",
                "Defend architectural choices against interviewer challenge questions",
            ],
            priority: "critical",
            focusArea: "Technical Interview Defense",
        });
    } else {
        // Comprehensive (Balanced)
        plan.push({
            dayStart: 1,
            dayEnd: p1End,
            topic: topMissing.length ? `${topMissing.join(" & ")} Fundamentals` : "Core Architecture Review",
            tasks: [
                topMissing[0] ? `Study ${topMissing[0]} architecture and core primitives` : "Review REST & microservice patterns",
                topMissing[1] ? `Hands-on lab with ${topMissing[1]}` : "Practice database indexing and query tuning",
                "Prepare 2 interview-ready talking points explaining how you would use these in production",
            ],
            priority: "critical",
            focusArea: "Technical Foundation",
        });
        plan.push({
            dayStart: p1End + 1,
            dayEnd: p2End,
            topic: "System Design & Distributed Scalability",
            tasks: [
                "Review Redis caching strategies (Cache-Aside, Write-Through, Eviction Policies)",
                "Practice rate limiting, load balancing, and database horizontal scaling trade-offs",
                "Diagram an end-to-end architecture handling 10,000 req/sec",
            ],
            priority: "critical",
            focusArea: "System Design",
        });
        plan.push({
            dayStart: p2End + 1,
            dayEnd: p3End,
            topic: `Targeted DSA (${dsaFocusTopic} & High-Frequency Patterns)`,
            tasks: [
                `Solve 5 Medium problems focusing on ${dsaFocusTopic}`,
                "Review Binary Search and Tree/Graph traversal patterns",
                "Timebox each problem to 25 minutes explaining space/time complexity",
            ],
            priority: "important",
            focusArea: "Data Structures & Algorithms",
        });
        plan.push({
            dayStart: p3End + 1,
            dayEnd: p4End,
            topic: "Mock Interviews & Resume Claim Defense",
            tasks: [
                "Conduct mock technical interview sessions using the predicted questions",
                "Draft answers for 'Why did you choose X technology over Y?' for each resume bullet",
                "Prepare STAR-format answers for handling production outages and engineering disagreements",
            ],
            priority: "important",
            focusArea: "Interview Simulation",
        });
        plan.push({
            dayStart: p4End + 1,
            dayEnd: days,
            topic: "Final Project Defense & Company Revision",
            tasks: [
                "Rehearse 2-minute elevator pitch for your top featured project",
                "Review recent tech blog posts or engineering stack details of the hiring company",
                "Rest, review your cheat sheet, and prepare thoughtful questions for the interviewer",
            ],
            priority: "critical",
            focusArea: "Final Readiness",
        });
    }

    return plan;
};


const buildResumeOptimization = (parsedProfile, requiredSkills, preferredSkills) => {
    const rawBullets = parsedProfile?.bullets || [];
    const allJobSkills = unique([...requiredSkills, ...preferredSkills]);
    const resumeSkills = (parsedProfile?.skills || []).map((s) => s.toLowerCase());

    const missingSkills = allJobSkills.filter((skill) => !includesSkill(resumeSkills, skill));
    const foundSkills = allJobSkills.filter((skill) => includesSkill(resumeSkills, skill));

    const bulletRewrites = [];

    if (rawBullets.length > 0) {
        const sampleBullet = rawBullets[0];
        bulletRewrites.push({
            original: sampleBullet,
            suggested: `Architected and deployed scalable RESTful services using ${resumeSkills.slice(0, 2).join(" & ") || "Node.js and Express"}, implementing Redis caching and JWT authentication that improved API response times by 35% and scaled to 10k+ daily requests.`,
            improvementReason: "Applies the Google X-Y-Z formula: Accomplished [X], measured by [Y], by doing [Z]. Introduces concrete metrics and architecture depth.",
            impactMetric: "35% latency reduction, 10k+ daily requests",
        });
    } else {
        bulletRewrites.push({
            original: "Developed backend services using Node.js.",
            suggested: "Engineered scalable RESTful microservices using Node.js & Express, integrating Redis-based caching and MongoDB aggregation pipelines to reduce median query latency by 40%.",
            improvementReason: "Replaces vague description with specific technologies, architecture patterns, and quantified engineering impact.",
            impactMetric: "40% latency reduction",
        });
    }

    if (rawBullets.length > 1) {
        const secondBullet = rawBullets[1];
        bulletRewrites.push({
            original: secondBullet,
            suggested: `Built automated CI/CD deployment pipelines using Docker and GitHub Actions, cutting release deployment cycles from 45 minutes to under 8 minutes with zero downtime.`,
            improvementReason: "Adds automated deployment evidence and a high-impact before-and-after operational metric.",
            impactMetric: "Deployment time reduced from 45m to 8m",
        });
    }

    return {
        bulletRewrites,
        atsKeywords: {
            found: foundSkills.slice(0, 10),
            missing: missingSkills.slice(0, 8),
            caution: "These keywords should only be incorporated into your resume if you genuinely possess the corresponding hands-on experience.",
        },
    };
};

const buildInterviewQuestionsGrouped = (matchedRequired, missingRequired, candidateProjects, jobDescription) => {
    const technical = [];
    const resumeDeepDives = [];
    const projectArchitecture = [];
    const behavioral = [];

    const keySkills = matchedRequired.slice(0, 3);
    if (keySkills.length) {
        technical.push({
            question: `How have you used ${keySkills[0]} in production, and how did you handle edge cases and failure modes?`,
            context: `Directly assesses hands-on competency in ${keySkills[0]}.`,
            topic: keySkills[0],
        });
    }
    technical.push({
        question: "Explain how you would design a distributed caching layer using Redis. How do you handle cache stampedes and invalidation?",
        context: "Evaluates system design and real-world backend engineering depth.",
        topic: "Caching & System Design",
    });
    technical.push({
        question: "What is the difference between horizontal and vertical database scaling, and when would you introduce read-replicas vs sharding?",
        context: "Tests database architecture knowledge required for scalable backend roles.",
        topic: "Database Architecture",
    });

    if (matchedRequired.includes("kafka") || matchedRequired.includes("redis")) {
        resumeDeepDives.push({
            question: "You mentioned message queues / caching on your resume. Why did you choose that specific tool over alternatives like RabbitMQ or Memcached?",
            claimedSkillOrProject: "Event Streaming / Caching",
            followUps: ["What happens if a consumer crashes?", "How did you ensure message ordering?"],
            whyAsked: "Interviewers look for intentional architectural choices rather than default copy-paste solutions.",
        });
    } else {
        resumeDeepDives.push({
            question: "Walk me through the most technically challenging bug or outage you encountered in your recent project. How did you isolate and resolve it?",
            claimedSkillOrProject: "Engineering Troubleshooting",
            followUps: ["What monitoring/logs alerted you?", "What architectural safeguard did you implement afterwards?"],
            whyAsked: "Tests root-cause analysis and operational maturity.",
        });
    }

    const topProject = candidateProjects[0]?.name || "your main project";
    projectArchitecture.push({
        question: `Explain the end-to-end architecture of ${topProject}. If traffic increased by 50x tomorrow, what component fails first?`,
        project: topProject,
        focusArea: "Scalability Bottlenecks",
    });

    behavioral.push({
        question: "Tell me about a time you had to balance shipping a feature quickly against paying down technical debt. How did you decide?",
        scenario: "Engineering Trade-offs & Communication",
    });
    behavioral.push({
        question: "Describe a situation where you had a strong technical disagreement with a team member. How did you reach consensus?",
        scenario: "Team Collaboration & Conflict Resolution",
    });

    return { technical, resumeDeepDives, projectArchitecture, behavioral };
};

const buildShortlistBlockers = (parsedProfile, parsedRequirements, requirementMatches, githubSnapshot, codingSnapshot) => {
    const blockers = [];
    const fixTheseFirst = [];
    let blockerId = 1;

    // 1. Measurable Impact
    if (!parsedProfile?.hasMetrics) {
        blockers.push({
            id: blockerId++,
            severity: "high",
            title: "Resume Lacks Measurable Business or Engineering Impact",
            explanation: "Your resume bullets describe duties rather than measurable outcomes (no numbers, %, speedups, or scale figures). Recruiters and hiring managers screen out passive descriptions.",
            impact: "High risk of early recruiter rejection",
        });
        fixTheseFirst.push({
            order: fixTheseFirst.length + 1,
            action: "Rewrite experience bullets with quantifiable metrics",
            detail: "Use the X-Y-Z formula: 'Accomplished [X] as measured by [Y] by doing [Z]' (e.g. reduced latency by 30%, handled 5,000 req/sec).",
            estimatedEffort: "30-45 minutes",
        });
    }

    // 2. Unverified cloud / deployment
    const hasDeploymentEvidence = githubSnapshot?.deploymentEvidence?.length > 0
        || parsedProfile?.projects?.some((p) => p.hasDeployment);
    if (!hasDeploymentEvidence && parsedRequirements?.cloudRequired) {
        blockers.push({
            id: blockerId++,
            severity: "high",
            title: "Missing Production Deployment & Cloud Evidence",
            explanation: "The target job lists cloud/DevOps requirements, but your projects and GitHub repos lack visible proof of Docker, CI/CD, or cloud deployment.",
            impact: "Recruiter cannot verify production readiness",
        });
        fixTheseFirst.push({
            order: fixTheseFirst.length + 1,
            action: "Add Dockerfile and CI/CD workflow to your primary GitHub project",
            detail: "Containerize your backend service and deploy it live (e.g., Render, Railway, or AWS free tier) with a working public API URL.",
            estimatedEffort: "1-2 hours",
        });
    }

    // 3. ATS Keyword Alignment
    const lowMatchRatio = requirementMatches.filter((m) => m.matched).length / Math.max(1, requirementMatches.length);
    if (lowMatchRatio < 0.6) {
        blockers.push({
            id: blockerId++,
            severity: "medium",
            title: "Low ATS Keyword & Skill Overlap for Target Role",
            explanation: `Your profile currently matches less than 60% of explicit job requirements (${Math.round(lowMatchRatio * 100)}% match).`,
            impact: "May fail automated applicant tracking system filters",
        });
        fixTheseFirst.push({
            order: fixTheseFirst.length + 1,
            action: "Incorporate matching technical keywords into your summary and skills section",
            detail: "Ensure skills you have practiced are explicitly named in your technical skills block.",
            estimatedEffort: "15 minutes",
        });
    }

    // 4. DSA / Problem Solving Evidence
    if (parsedRequirements?.dsaRequired && (!codingSnapshot || codingSnapshot.solved < 100)) {
        blockers.push({
            id: blockerId++,
            severity: "medium",
            title: "Limited Competitive Programming / DSA Public Proof",
            explanation: "This role emphasizes strong data structures and algorithms, but your linked coding profiles have fewer than 100 verified solved problems.",
            impact: "May stumble in initial coding screen rounds",
        });
        fixTheseFirst.push({
            order: fixTheseFirst.length + 1,
            action: "Connect or build public LeetCode profile with 150+ solved problems",
            detail: "Focus on Top 100 Liked questions across Arrays, HashMaps, Trees, and Dynamic Programming.",
            estimatedEffort: "2-3 weeks",
        });
    }

    return { blockers, fixTheseFirst };
};

const buildCompanyPrepFocus = (companyName, parsedRequirements) => {
    let backend = 35;
    let dsa = 25;
    let systemDesign = 20;
    let cloud = 10;
    let behavioral = 10;

    if (parsedRequirements?.dsaRequired) {
        dsa = 35;
        backend = 25;
    }
    if (parsedRequirements?.systemDesignRequired) {
        systemDesign = 25;
    }
    if (parsedRequirements?.cloudRequired) {
        cloud = 15;
    }

    return {
        companyName: companyName || "Target Company",
        focusDistribution: { backend, dsa, systemDesign, cloud, behavioral },
        likelyInterviewAreas: [
            "RESTful API & Microservices Architecture",
            "Database Schema Design & Query Optimization",
            "Concurrency, Caching & Redis Integration",
            "Problem Solving & Space-Time Complexity",
            "Production Debugging & Operational Resilience",
        ],
    };
};

export const compareResumeToJob = (resume, jobDescription, externalProfiles = [], options = {}) => {
    const parsedProfile = resume.parsedProfile?.skills?.length || resume.parsedProfile?.experience?.length
        ? resume.parsedProfile
        : parseResumeText(resume.rawText);

    const parsedRequirements = jobDescription.parsedRequirements?.requiredSkills?.length
        ? jobDescription.parsedRequirements
        : parseJobDescriptionText(jobDescription.rawText);

    const resumeSkills = unique(parsedProfile.skills || []);
    const projectSkills = unique((parsedProfile.projects || []).flatMap((project) => project.technologies || []));

    const githubProfile = externalProfiles.find((p) => p.provider === "github" && p.syncStatus === "ready");
    const githubSnapshot = githubProfile?.snapshot || {};
    const githubSkills = unique(githubSnapshot.technologies || []);

    const codingProfile = externalProfiles.find((p) =>
        ["leetcode", "codeforces", "codechef"].includes(p.provider) && p.syncStatus === "ready"
    );
    const codingSnapshot = codingProfile?.snapshot || {};
    const codingEvidence = Boolean(codingSnapshot.solved || codingSnapshot.rating);

    const requiredSkills = unique(parsedRequirements.requiredSkills || []);
    const preferredSkills = unique(parsedRequirements.preferredSkills || []);

    const requirementMatches = buildRequirementMatches(
        requiredSkills,
        preferredSkills,
        resumeSkills,
        projectSkills,
        githubSkills,
        codingEvidence
    );

    const requiredMatches = requirementMatches.filter((match) => match.category === "required_skill");
    const preferredMatches = requirementMatches.filter((match) => match.category === "preferred_skill");

    const matchedRequired = requiredMatches.filter((match) => match.matched).map((match) => match.requirement);
    const missingRequired = requiredMatches.filter((match) => !match.matched).map((match) => match.requirement);
    const matchedPreferred = preferredMatches.filter((match) => match.matched).map((match) => match.requirement);

    const dsaSkills = requiredSkills.filter((skill) => /data structure|algorithm|dsa|problem solving|competitive/i.test(skill));
    const matchedDsa = dsaSkills.filter((skill) => includesSkill(resumeSkills, skill) || codingEvidence);
    const matchedProjectSkills = requiredSkills.filter((skill) => includesSkill(projectSkills, skill));

    const scoreBreakdown = {
        skills: percentage(matchedRequired.length, requiredSkills.length),
        experience: parsedProfile.experience?.length ? (parsedProfile.hasMetrics ? 85 : 70) : 35,
        projects: requiredSkills.length ? percentage(matchedProjectSkills.length, requiredSkills.length) : (projectSkills.length ? 75 : 30),
        dsa: dsaSkills.length ? percentage(matchedDsa.length, dsaSkills.length) : (codingEvidence ? 90 : 65),
        jobSpecific: percentage(matchedPreferred.length, preferredSkills.length || requiredSkills.length),
    };

    const overallFit = Math.round(
        scoreBreakdown.skills * 0.4
        + scoreBreakdown.experience * 0.2
        + scoreBreakdown.projects * 0.15
        + scoreBreakdown.dsa * 0.1
        + scoreBreakdown.jobSpecific * 0.15
    );

    const scoreExplanations = buildScoreExplanations(
        matchedRequired,
        missingRequired,
        requirementMatches,
        parsedProfile,
        githubSnapshot,
        codingSnapshot,
        parsedRequirements
    );

    const skillGapsCategorized = buildSkillGapsCategorized(requirementMatches);
    const projectRelevance = buildProjectRelevance(parsedProfile, githubSnapshot, requiredSkills, preferredSkills);

    const targetType = options.targetType || "comprehensive";
    const planDays = typeof options.days === "number" && options.days >= 1 ? options.days : 14;

    const preparationPlan = buildPreparationPlan(
        missingRequired,
        codingSnapshot.dsaWeaknesses?.[0] || "Dynamic Programming",
        planDays,
        targetType
    );
    const resumeOptimization = buildResumeOptimization(parsedProfile, requiredSkills, preferredSkills);
    const interviewQuestionsGrouped = buildInterviewQuestionsGrouped(matchedRequired, missingRequired, parsedProfile.projects || [], jobDescription);
    const shortlistBlockers = buildShortlistBlockers(parsedProfile, parsedRequirements, requirementMatches, githubSnapshot, codingSnapshot);
    const companyPrepFocus = buildCompanyPrepFocus(jobDescription.company, parsedRequirements);

    const gaps = requirementMatches.filter((match) => !match.matched).map((skill) => ({
        skill: skill.requirement,
        detected: false,
        sources: skill.sources,
        evidence: skill.evidence,
        confidence: skill.confidence,
        priority: skill.priority,
    }));

    const strengths = requirementMatches.filter((match) => match.matched).map((match) =>
        `${match.requirement} verified in ${match.sources.join(" and ")}`
    );

    const recommendedProjects = projectRelevance.rankedProjects.map((p) => p.name);

    const flattenedQuestions = [
        ...interviewQuestionsGrouped.technical.map((q) => ({
            question: q.question,
            category: "technical",
            sourceSkill: q.topic,
            answerNotes: q.context,
        })),
        ...interviewQuestionsGrouped.resumeDeepDives.map((q) => ({
            question: q.question,
            category: "resume_deep_dive",
            sourceSkill: q.claimedSkillOrProject,
            answerNotes: q.whyAsked,
        })),
    ];

    return {
        overallFit,
        targetType,
        customDays: planDays,
        scoreBreakdown,
        scoreExplanations,
        requirementMatches,
        strengths,
        gaps,
        skillGapsCategorized,
        projectRelevance,
        recommendedProjects,
        preparationPlan,
        resumeOptimization,
        interviewQuestions: flattenedQuestions,
        interviewQuestionsGrouped,
        shortlistBlockers,
        companyPrepFocus,
        candidateSignals: {
            githubSnapshot,
            codingSnapshot,
        },
    };
};

export { buildPreparationPlan, buildCompanyPrepFocus };
export default compareResumeToJob;


