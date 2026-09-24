const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

const responseSchema = {
    summary: "string",
    recommendations: ["string"],
};

const buildPrompt = (resume, jobDescription, comparison) => JSON.stringify({
    task: "Enrich a deterministic job-fit comparison with concise, evidence-based guidance.",
    output: responseSchema,
    rules: [
        "Return valid JSON only.",
        "Do not invent experience, projects, skills, or achievements.",
        "Use only the supplied resume, job description, and comparison.",
        "Mention uncertainty when the evidence is weak.",
        "Keep the summary under 100 words.",
        "Return at most 5 recommendations.",
    ],
    resume: {
        profile: resume.parsedProfile,
        text: resume.rawText.slice(0, 12000),
    },
    jobDescription: {
        requirements: jobDescription.parsedRequirements,
        text: jobDescription.rawText.slice(0, 12000),
    },
    comparison: {
        overallFit: comparison.overallFit,
        scoreBreakdown: comparison.scoreBreakdown,
        strengths: comparison.strengths,
        gaps: comparison.gaps,
    },
});

const parseJsonResponse = (text) => {
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    const jsonText = jsonStart >= 0 && jsonEnd > jsonStart
        ? cleaned.slice(jsonStart, jsonEnd + 1)
        : cleaned;
    const parsed = JSON.parse(jsonText);

    if (typeof parsed.summary !== "string" || !Array.isArray(parsed.recommendations)) {
        throw new Error("LLM response did not match the expected shape");
    }

    return {
        summary: parsed.summary.slice(0, 1000),
        recommendations: parsed.recommendations.filter((item) => typeof item === "string").slice(0, 5),
    };
};

const callGroq = async (prompt) => {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: "You are an evidence-based career analysis assistant." },
                { role: "user", content: prompt },
            ],
        }),
    });

    if (!response.ok) {
        throw new Error(`Groq request failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    return parseJsonResponse(data.choices?.[0]?.message?.content || "");
};

const callGemini = async (prompt) => {
    const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
    });

    if (!response.ok) {
        throw new Error(`Gemini request failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    return parseJsonResponse(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
};

export const generateAiInsights = async (resume, jobDescription, comparison) => {
    const provider = process.env.LLM_PROVIDER || (process.env.GROQ_API_KEY ? "groq" : "gemini");
    const hasKey = provider === "groq" ? process.env.GROQ_API_KEY : process.env.GEMINI_API_KEY;

    if (!hasKey) return null;

    try {
        const prompt = buildPrompt(resume, jobDescription, comparison);
        return provider === "groq" ? await callGroq(prompt) : await callGemini(prompt);
    } catch (error) {
        console.error(`${provider} insight generation failed:`, error.message);
        return null;
    }
};
