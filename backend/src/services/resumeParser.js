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

const extractSectionBlocks = (rawLines) => {
    const sections = {};
    let currentSection = "other";
    let currentBlock = [];

    const flushBlock = () => {
        if (currentBlock.length) {
            sections[currentSection] ||= [];
            sections[currentSection].push(currentBlock);
            currentBlock = [];
        }
    };

    for (const rawLine of rawLines) {
        const line = rawLine.trim();
        const normalizedLine = normalizeHeading(line);
        const sectionName = Object.entries(sectionAliases).find(([, aliases]) => aliases.includes(normalizedLine))?.[0];

        if (sectionName) {
            flushBlock();
            currentSection = sectionName;
            continue;
        }

        if (!line) {
            flushBlock();
            continue;
        }

        currentBlock.push(line);
    }

    flushBlock();
    return sections;
};

const extractSkills = (text) => {
    const searchableText = text.toLowerCase();
    return knownSkills.filter((skill) => searchableText.includes(skill));
};

const parseExperience = (lines) => {
    if (!lines?.length) return [];

    return [{
        role: lines[0],
        company: lines[1],
        description: lines.join(" ").slice(0, 1500),
        skills: extractSkills(lines.join(" ")),
        current: /present|current/i.test(lines.join(" ")),
    }];
};

const parseExperienceBlocks = (blocks) => blocks?.map(parseExperience).filter(Boolean) || [];

const parseProjects = (lines) => {
    if (!lines?.length) return [];

    return [{
        name: lines[0],
        description: lines.slice(1).join(" ").slice(0, 1000),
        technologies: extractSkills(lines.join(" ")),
    }];
};

const parseProjectBlocks = (blocks) => blocks?.map(parseProjects).filter(Boolean) || [];

export const parseResumeText = (rawText) => {
    const rawLines = rawText.split(/\r?\n/).map((line) => line.trim());
    const lines = rawLines.filter(Boolean);
    const sections = extractSections(lines);
    const sectionBlocks = extractSectionBlocks(rawLines);

    return {
        summary: (sections.summary || lines.slice(0, 4)).join(" ").slice(0, 1000),
        skills: extractSkills(rawText),
        experience: sectionBlocks.experience?.length > 1
            ? parseExperienceBlocks(sectionBlocks.experience)
            : parseExperience(sections.experience),
        projects: sectionBlocks.projects?.length > 1
            ? parseProjectBlocks(sectionBlocks.projects)
            : parseProjects(sections.projects),
        education: sections.education || [],
    };
};
