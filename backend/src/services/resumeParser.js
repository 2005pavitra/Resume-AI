export const knownSkills = [
    // Languages
    "javascript", "typescript", "python", "java", "c++", "c#", "go", "golang", "rust", "php", "ruby", "sql", "html", "css",
    // Frontend
    "react", "react.js", "next.js", "vue", "angular", "redux", "redux toolkit", "tailwind", "tailwind css",
    // Backend & APIs
    "node.js", "express", "fastapi", "django", "flask", "spring boot", "rest api", "restful apis", "graphql", "grpc", "websockets",
    // Databases & Caching
    "mongodb", "postgresql", "mysql", "redis", "elasticsearch", "cassandra", "dynamodb", "prisma", "mongoose",
    // Messaging & Streaming
    "kafka", "rabbitmq", "sqs",
    // Cloud & DevOps
    "docker", "kubernetes", "aws", "gcp", "azure", "ci/cd", "github actions", "terraform", "linux", "nginx",
    // Architecture & Core
    "microservices", "system design", "distributed systems", "event-driven architecture", "data structures", "algorithms", "dsa", "oop",
    // Security & Auth
    "jwt", "oauth",
    // Testing
    "jest", "unit testing", "pytest",
    // AI / ML
    "langchain", "langgraph", "llm", "rag", "vector db", "prompt engineering"
];

const sectionAliases = {
    summary: ["summary", "profile", "about", "professional summary"],
    skills: ["skills", "technical skills", "technologies", "core competencies", "skills & tools"],
    experience: ["experience", "work experience", "employment", "professional experience", "internships"],
    projects: ["projects", "personal projects", "key projects", "academic projects"],
    education: ["education", "academic background", "qualifications"],
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

export const extractSkills = (text) => {
    if (!text) return [];
    const searchableText = ` ${text.toLowerCase()} `;
    return knownSkills.filter((skill) => {
        const regex = new RegExp(`(?:^|[\\s,;()/\\[\\]{}:.-])${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[\\s,;()/\\[\\]{}:.-])`, "i");
        return regex.test(searchableText);
    });
};

const hasMeasurableMetric = (text) => {
    return /\b\d+(?:\.\d+)?\s*(?:%|x|k|ms|s|sec|seconds?|users?|req|rpm|rps|clients?|customers?|\$|million|billion|mb|gb|tb|tbps|gbps)\b/i.test(text)
        || /\b(?:reduced|increased|improved|optimized|boosted|accelerated|cut|scaled)\s+.*\b\d+/i.test(text);
};

const isBulletLine = (line) => {
    return /^[-*•–—]\s*/.test(line)
        || /^(developed|built|designed|implemented|architected|scaled|optimized|created|engineered|led|spearheaded|refactored|integrated)\b/i.test(line);
};

const cleanBullet = (line) => line.replace(/^[-*•–—]\s*/, "").trim();

const parseExperience = (lines) => {
    if (!lines?.length) return [];

    const bullets = lines.filter(isBulletLine).map(cleanBullet);
    const text = lines.join(" ");

    return [{
        role: lines[0],
        company: lines[1] && !isBulletLine(lines[1]) ? lines[1] : undefined,
        description: text.slice(0, 1500),
        bullets: bullets.length ? bullets : [lines.slice(1).join(" ").slice(0, 500)],
        skills: extractSkills(text),
        current: /present|current|ongoing/i.test(text),
        hasMetrics: lines.some(hasMeasurableMetric),
    }];
};

const parseExperienceBlocks = (blocks) => blocks?.map(parseExperience).flat().filter(Boolean) || [];

const parseProjects = (lines) => {
    if (!lines?.length) return [];

    const bullets = lines.filter(isBulletLine).map(cleanBullet);
    const text = lines.join(" ");
    const hasDeployment = /docker|kubernetes|aws|vercel|render|ci\/cd|pipeline|production|deployed|live/i.test(text);

    return [{
        name: lines[0].replace(/^[-*•–—]\s*/, "").split(/[:\-–|]/)[0].trim(),
        description: lines.slice(1).join(" ").slice(0, 1000),
        bullets: bullets.length ? bullets : [lines.slice(1).join(" ").slice(0, 400)],
        technologies: extractSkills(text),
        hasDeployment,
        hasMetrics: lines.some(hasMeasurableMetric),
    }];
};

const parseProjectBlocks = (blocks) => blocks?.map(parseProjects).flat().filter(Boolean) || [];

export const parseResumeText = (rawText) => {
    const rawLines = rawText.split(/\r?\n/).map((line) => line.trim());
    const lines = rawLines.filter(Boolean);
    const sections = extractSections(lines);
    const sectionBlocks = extractSectionBlocks(rawLines);

    const experience = sectionBlocks.experience?.length > 1
        ? parseExperienceBlocks(sectionBlocks.experience)
        : parseExperience(sections.experience);

    const projects = sectionBlocks.projects?.length > 1
        ? parseProjectBlocks(sectionBlocks.projects)
        : parseProjects(sections.projects);

    const allBullets = [
        ...experience.flatMap((e) => e.bullets || []),
        ...projects.flatMap((p) => p.bullets || []),
    ].filter((b) => b && b.length > 20);

    const hasAnyMetrics = allBullets.some(hasMeasurableMetric);
    const skills = extractSkills(rawText);

    return {
        summary: (sections.summary || lines.slice(0, 4)).join(" ").slice(0, 1000),
        skills,
        experience,
        projects,
        education: sections.education || [],
        bullets: allBullets,
        hasMetrics: hasAnyMetrics,
    };
};

