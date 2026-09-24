const knownSkills = [
    "javascript",
    "typescript",
    "react",
    "node.js",
    "express",
    "python",
    "java",
    "c++",
    "mongodb",
    "postgresql",
    "redis",
    "kafka",
    "docker",
    "kubernetes",
    "aws",
    "git",
    "rest api",
    "graphql",
    "system design",
    "data structures",
    "algorithms",
];

const sectionAliases = {
    summary: ["summary", "profile", "about"],
    skills: ["skills", "technical skills", "technologies"],
    experience: ["experience", "work experience", "employment"],
    projects: ["projects", "personal projects"],
    education: ["education", "academic background"],
};

const normalizeHeading = (line) => line.trim().toLowerCase().replace(/[:\-]+$/, "");

const extractSections = (lines) => {
    const sections = {};
    let currentSection = "other";

    for (const line of lines) {
        const normalizedLine = normalizeHeading(line);
        const sectionName = Object.entries(sectionAliases).find(([, aliases]) => aliases.includes(normalizedLine))?.[0];

        if (sectionName) {
            currentSection = sectionName;
            sections[currentSection] ||= [];
        } else if (line.trim()) {
            sections[currentSection] ||= [];
            sections[currentSection].push(line.trim());
        }
    }

    return sections;
};

export const parseResumeText = (rawText) => {
    const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const sections = extractSections(lines);
    const searchableText = rawText.toLowerCase();
    const skills = knownSkills.filter((skill) => searchableText.includes(skill));

    return {
        summary: (sections.summary || lines.slice(0, 4)).join(" ").slice(0, 1000),
        skills,
        experience: [],
        projects: [],
        education: sections.education || [],
    };
};
