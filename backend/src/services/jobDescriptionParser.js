const knownSkills = [
    "javascript",
    "typescript",
    "react",
    "redux",
    "redux toolkit",
    "node.js",
    "express",
    "python",
    "java",
    "php",
    "c++",
    "mongodb",
    "mysql",
    "postgresql",
    "redis",
    "kafka",
    "docker",
    "kubernetes",
    "aws",
    "git",
    "rest api",
    "graphql",
    "microservices",
    "system design",
    "data structures",
    "algorithms",
];

const isPreferredSection = (line) => /preferred|nice to have|bonus|plus/i.test(line);
const isRequirementSection = (line) => /requirement|qualification|skill|experience/i.test(line);
const isResponsibilityLine = (line) => /^[-*•]|\bresponsibilit|\byou will\b|\bwhat you.{0,3}ll do\b/i.test(line);
const isSectionHeading = (line) => /^(required skills?|preferred skills?|nice to have|requirements?|qualifications?|responsibilities|what you.{0,3}ll do)$/i.test(line);

export const parseJobDescriptionText = (rawText) => {
    const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const searchableText = rawText.toLowerCase();
    const detectedSkills = knownSkills.filter((skill) => searchableText.includes(skill));
    let sectionType = "required";
    const preferredLines = [];

    for (const line of lines) {
        if (isPreferredSection(line)) {
            sectionType = "preferred";
            continue;
        }

        if (isRequirementSection(line) && !isPreferredSection(line)) {
            sectionType = "required";
        }

        if (/responsibilit|what you.{0,3}ll do/i.test(line)) {
            sectionType = "other";
        }

        if (sectionType === "preferred" && !isSectionHeading(line)) {
            preferredLines.push(line);
        }
    }

    const preferredText = preferredLines.join(" ").toLowerCase();
    const preferredSkills = detectedSkills.filter((skill) => preferredText.includes(skill));
    const requiredSkills = detectedSkills.filter((skill) => !preferredSkills.includes(skill));
    const responsibilities = lines
        .filter((line) => isResponsibilityLine(line) && !isSectionHeading(line))
        .map((line) => line.replace(/^[-*•]\s*/, ""))
        .slice(0, 20);
    const experienceMatch = rawText.match(/(?:at least |minimum of )?(\d+)\+?\s+years?/i);

    return {
        requiredSkills,
        preferredSkills,
        responsibilities,
        experienceLevel: experienceMatch ? `${experienceMatch[1]}+ years` : undefined,
    };
};
