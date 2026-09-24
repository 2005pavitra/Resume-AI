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

const buildPreparationPlan = (missingSkills) => missingSkills.slice(0, 5).map((skill, index) => ({
    dayStart: index * 2 + 1,
    dayEnd: index * 2 + 2,
    topic: skill,
    tasks: [`Review ${skill} fundamentals`, `Practice a ${skill} project or interview question`],
    priority: index < 2 ? "critical" : "important",
}));

const buildQuestions = (matchedSkills, missingSkills) => [
    ...matchedSkills.slice(0, 3).map((skill) => ({
        question: `How have you used ${skill} in a real project?`,
        category: "technical",
        sourceSkill: skill,
    })),
    ...missingSkills.slice(0, 2).map((skill) => ({
        question: `What do you know about ${skill}, and how would you learn it for this role?`,
        category: "technical",
        sourceSkill: skill,
    })),
];

export const compareResumeToJob = (resume, jobDescription) => {
    const parsedProfile = resume.parsedProfile?.skills?.length || resume.parsedProfile?.experience?.length
        ? resume.parsedProfile
        : parseResumeText(resume.rawText);
    const parsedRequirements = jobDescription.parsedRequirements?.requiredSkills?.length
        ? jobDescription.parsedRequirements
        : parseJobDescriptionText(jobDescription.rawText);
    const resumeSkills = unique(parsedProfile.skills || []);
    const requiredSkills = unique(parsedRequirements.requiredSkills || []);
    const preferredSkills = unique(parsedRequirements.preferredSkills || []);
    const matchedRequired = requiredSkills.filter((skill) => includesSkill(resumeSkills, skill));
    const missingRequired = requiredSkills.filter((skill) => !includesSkill(resumeSkills, skill));
    const matchedPreferred = preferredSkills.filter((skill) => includesSkill(resumeSkills, skill));
    const dsaSkills = requiredSkills.filter((skill) => /data structure|algorithm|dsa|competitive/i.test(skill));
    const matchedDsa = dsaSkills.filter((skill) => includesSkill(resumeSkills, skill));
    const projectSkills = unique((parsedProfile.projects || []).flatMap((project) => project.technologies || []));
    const matchedProjectSkills = requiredSkills.filter((skill) => includesSkill(projectSkills, skill));
    const scoreBreakdown = {
        skills: percentage(matchedRequired.length, requiredSkills.length),
        experience: parsedProfile.experience?.length ? 75 : 25,
        projects: requiredSkills.length ? percentage(matchedProjectSkills.length, requiredSkills.length) : 0,
        dsa: dsaSkills.length ? percentage(matchedDsa.length, dsaSkills.length) : 100,
        jobSpecific: percentage(matchedPreferred.length, preferredSkills.length || requiredSkills.length),
    };
    const overallFit = Math.round(
        scoreBreakdown.skills * 0.4
        + scoreBreakdown.experience * 0.2
        + scoreBreakdown.projects * 0.15
        + scoreBreakdown.dsa * 0.1
        + scoreBreakdown.jobSpecific * 0.15
    );
    const gaps = [...missingRequired, ...preferredSkills.filter((skill) => !includesSkill(resumeSkills, skill))]
        .map((skill) => ({
            skill,
            detected: false,
            sources: [],
            evidence: "No matching skill evidence was found in the resume profile",
            confidence: "low",
            priority: requiredSkills.includes(skill) ? "critical" : "nice_to_have",
        }));
    const strengths = matchedRequired.map((skill) => `Resume matches the required skill: ${skill}`);
    const recommendedProjects = (parsedProfile.projects || []).map((project) => project.name).filter(Boolean);

    return {
        overallFit,
        scoreBreakdown,
        strengths,
        gaps,
        recommendedProjects,
        preparationPlan: buildPreparationPlan(missingRequired),
        interviewQuestions: buildQuestions(matchedRequired, missingRequired),
    };
};
