import test from 'node:test';
import assert from 'node:assert/strict';
import { computeHash } from './src/controllers/resumeController.js';
import { buildPreparationPlan } from './src/services/analysisService.js';

test('SHA-256 contentHash generates identical hash for identical text with different spacing/line endings', () => {
    const textA = 'Experienced Software Engineer with Node.js, Go, and Redis experience.\nBuilt high-scale microservices.';
    const textB = 'Experienced Software Engineer with Node.js, Go, and Redis experience.   \r\nBuilt high-scale microservices.  ';

    const hashA = computeHash(textA);
    const hashB = computeHash(textB);

    assert.equal(hashA, hashB, 'Normalized content hashes must match exactly to deduplicate resumes and job descriptions');
});

test('buildPreparationPlan dynamically adapts for OA vs Technical vs Comprehensive sprint', () => {
    const gaps = [
        { requirement: 'Docker', category: 'cloud', status: 'significant_gap' },
        { requirement: 'System Design', category: 'architecture', status: 'significant_gap' },
    ];
    const targetSkills = ['Go', 'Docker', 'Redis', 'Kafka', 'System Design'];

    // 1. OA Sprint (3 days)
    const oaPlan = buildPreparationPlan(gaps, targetSkills, 3, 'oa');
    assert.ok(oaPlan.length > 0, 'OA plan should generate steps');
    assert.equal(oaPlan[0].focusArea, 'OA Sprint');
    const allOaTasks = oaPlan.flatMap(p => p.tasks).join(' ');
    assert.ok(allOaTasks.includes('LeetCode') || allOaTasks.includes('OA') || allOaTasks.includes('Two Pointers') || allOaTasks.includes('Sliding Window'));

    // 2. Technical / System Design Sprint (7 days)
    const techPlan = buildPreparationPlan(gaps, targetSkills, 7, 'technical');
    assert.ok(techPlan.length > 0, 'Technical plan should generate steps');
    assert.equal(techPlan[0].focusArea, 'Backend Architecture');
    const allTechTasks = techPlan.flatMap(p => p.tasks).join(' ');
    assert.ok(allTechTasks.includes('API Architecture') || allTechTasks.includes('caching') || allTechTasks.includes('rate limiting'));

    // 3. Comprehensive Sprint (14 days)
    const compPlan = buildPreparationPlan(gaps, targetSkills, 14, 'comprehensive');
    assert.ok(compPlan.length >= 4, '14-day comprehensive plan should have 5 phased steps');
    assert.equal(compPlan[compPlan.length - 1].dayEnd, 14);
});
