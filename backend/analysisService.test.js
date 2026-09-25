import test from "node:test";
import assert from "node:assert/strict";
import { compareResumeToJob } from "./src/services/analysisService.js";

test("compareResumeToJob produces full explainable report with all report.txt pillars", () => {
    const resume = {
        rawText: `
Pavitra Pandey
Full Stack Backend Developer
Skills: React, Node.js, Express, MongoDB, Redis, Git, Data Structures
Experience:
Backend Engineer - TechCorp (2023 - Present)
- Developed scalable REST APIs using Node.js and Express
- Implemented Redis-based caching and JWT authentication
Projects:
Cortex AI
- Built microservices architecture using Node.js, Express, Redis, and Docker
- Handled rate limiting and user session token blacklisting
        `,
    };

    const jobDescription = {
        title: "Senior Backend Engineer",
        company: "Stripe",
        rawText: `
We are looking for a Backend Engineer with experience in:
Requirements:
- Node.js and Express
- Redis and Kafka
- AWS and Docker
- Microservices and System Design
- Data structures and algorithms
Preferred:
- Kubernetes and CI/CD
- 2+ years experience
        `,
    };

    const externalProfiles = [
        {
            provider: "github",
            syncStatus: "ready",
            snapshot: {
                repositories: 18,
                activeProjects: 6,
                technologies: ["Node.js", "Express", "Docker", "JavaScript", "MongoDB", "Redis"],
                activityLevel: "high",
                deploymentEvidence: ["Docker / Deployment Configs"],
                topRepositories: [
                    { name: "Cortex-AI", description: "Microservices and AI engine", topics: ["docker", "redis", "node"], hasDeployment: true },
                    { name: "Advanced_Backend", description: "Distributed rate limiter", topics: ["redis", "kafka"], hasDeployment: false },
                ],
            },
        },
        {
            provider: "leetcode",
            syncStatus: "ready",
            snapshot: {
                solved: 350,
                easy: 120,
                medium: 190,
                hard: 40,
                rating: 1750,
                dsaAssessment: "Strong DSA evidence",
                dsaStrengths: ["Trees & Graphs", "Binary Search"],
                dsaWeaknesses: ["Dynamic Programming"],
            },
        },
    ];

    const report = compareResumeToJob(resume, jobDescription, externalProfiles, { days: 14 });

    // Verify overallFit is calculated
    assert.ok(report.overallFit > 0 && report.overallFit <= 100);

    // Verify Score Explanations
    assert.ok(report.scoreExplanations.strong.length > 0);
    assert.ok(report.scoreExplanations.missingOrWeak.length > 0);

    // Verify Tri-state skill gaps
    assert.ok(report.skillGapsCategorized.alreadyStrong.length > 0);
    assert.ok(report.skillGapsCategorized.missing.length > 0);

    // Verify Project Relevance Ranking
    assert.ok(report.projectRelevance.rankedProjects.length > 0);
    assert.equal(report.projectRelevance.rankedProjects[0].rank, 1);
    assert.ok(report.projectRelevance.advice);

    // Verify Preparation Plan (14 days)
    assert.ok(report.preparationPlan.length >= 4);
    assert.equal(report.preparationPlan[0].dayStart, 1);
    assert.ok(report.preparationPlan.some((p) => p.priority === "critical"));

    // Verify Resume Optimization (Bullet rewrites & ATS keywords)
    assert.ok(report.resumeOptimization.bulletRewrites.length > 0);
    assert.ok(report.resumeOptimization.atsKeywords.missing.length > 0);
    assert.ok(report.resumeOptimization.atsKeywords.caution);

    // Verify Grouped Interview Questions
    assert.ok(report.interviewQuestionsGrouped.technical.length > 0);
    assert.ok(report.interviewQuestionsGrouped.resumeDeepDives.length > 0);
    assert.ok(report.interviewQuestionsGrouped.projectArchitecture.length > 0);

    // Verify Shortlist Blockers & Fix First list
    assert.ok(report.shortlistBlockers.blockers.length > 0);
    assert.ok(report.shortlistBlockers.fixTheseFirst.length > 0);

    // Verify Company Focus Radar
    assert.equal(report.companyPrepFocus.companyName, "Stripe");
    assert.ok(report.companyPrepFocus.focusDistribution.backend > 0);
});
