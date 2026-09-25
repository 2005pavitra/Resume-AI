import { knownSkills } from "./resumeParser.js";

const isPreferredSection = (line) => /preferred|nice to have|bonus|plus|good to have/i.test(line);
const isRequirementSection = (line) => /requirement|qualification|skill|experience|must have|what we are looking for/i.test(line);
const isResponsibilityLine = (line) => /^[-*•–—]|\bresponsibilit|\byou will\b|\bwhat you.{0,3}ll do\b/i.test(line);
const isSectionHeading = (line) => /^(required skills?|preferred skills?|nice to have|requirements?|qualifications?|responsibilities|what you.{0,3}ll do|what you will do)$/i.test(line);

const extractSkills = (text) => {
    if (!text) return [];
    const searchableText = ` ${text.toLowerCase()} `;
    return knownSkills.filter((skill) => {
        const regex = new RegExp(`(?:^|[\\s,;()/\\[\\]{}:.-])${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[\\s,;()/\\[\\]{}:.-])`, "i");
        return regex.test(searchableText);
    });
};

export const parseJobDescriptionText = (rawText) => {
    const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const detectedSkills = extractSkills(rawText);
    let sectionType = "required";
    const preferredLines = [];
    const requiredLines = [];

    for (const line of lines) {
        if (isPreferredSection(line)) {
            sectionType = "preferred";
            continue;
        }

        if (isRequirementSection(line) && !isPreferredSection(line)) {
            sectionType = "required";
            continue;
        }

        if (/responsibilit|what you.{0,3}ll do/i.test(line)) {
            sectionType = "responsibilities";
        }

        if (sectionType === "preferred" && !isSectionHeading(line)) {
            preferredLines.push(line);
        } else if (sectionType === "required" && !isSectionHeading(line)) {
            requiredLines.push(line);
        }
    }

    const preferredText = preferredLines.join(" ").toLowerCase();
    const preferredSkills = detectedSkills.filter((skill) => preferredText.includes(skill));
    const requiredSkills = detectedSkills.filter((skill) => !preferredSkills.includes(skill));

    const responsibilities = lines
        .filter((line) => isResponsibilityLine(line) && !isSectionHeading(line))
        .map((line) => line.replace(/^[-*•–—]\s*/, ""))
        .slice(0, 20);

    const experienceMatch = rawText.match(/(?:at least |minimum of |minimum |approx |about )?(\d+)\+?\s*(-|\s*to\s*)?\s*(\d+)?\s+years?/i);
    const minYears = experienceMatch ? parseInt(experienceMatch[1], 10) : 0;

    const dsaRequired = /data structures?|algorithms?|dsa|problem solving|competitive programming|leetcode/i.test(rawText);
    const cloudRequired = /aws|cloud|docker|kubernetes|k8s|gcp|azure|ci\/cd|devops/i.test(rawText);
    const systemDesignRequired = /system design|distributed systems?|microservices?|scalab|high throughput|low latency/i.test(rawText);

    return {
        requiredSkills,
        preferredSkills,
        responsibilities,
        experienceLevel: experienceMatch ? `${experienceMatch[1]}+ years` : undefined,
        minYearsExperience: minYears,
        dsaRequired,
        cloudRequired,
        systemDesignRequired,
    };
};

