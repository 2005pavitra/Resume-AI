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
        "Keep the summary under 120 words.",
        "Return at most 5 actionable recommendations.",
    ],
    resume: {
        profile: resume.parsedProfile,
        text: resume.rawText.slice(0, 10000),
    },
    jobDescription: {
        requirements: jobDescription.parsedRequirements,
        text: jobDescription.rawText.slice(0, 10000),
    },
    comparison: {
        overallFit: comparison.overallFit,
        scoreBreakdown: comparison.scoreBreakdown,
        scoreExplanations: comparison.scoreExplanations,
        strengths: comparison.strengths,
        gaps: comparison.gaps,
        shortlistBlockers: comparison.shortlistBlockers,
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

const callGroq = async (prompt, systemInstruction = "You are an evidence-based career analysis assistant.") => {
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
                { role: "system", content: systemInstruction },
                { role: "user", content: prompt },
            ],
        }),
    });

    if (!response.ok) {
        throw new Error(`Groq request failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
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
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

export const generateAiInsights = async (resume, jobDescription, comparison) => {
    const provider = process.env.LLM_PROVIDER || (process.env.GROQ_API_KEY ? "groq" : "gemini");
    const hasKey = provider === "groq" ? process.env.GROQ_API_KEY : process.env.GEMINI_API_KEY;

    if (!hasKey) return null;

    try {
        const prompt = buildPrompt(resume, jobDescription, comparison);
        const rawContent = provider === "groq" ? await callGroq(prompt) : await callGemini(prompt);
        return parseJsonResponse(rawContent);
    } catch (error) {
        console.error(`${provider} insight generation failed:`, error.message);
        return null;
    }
};

export const evaluateMockInterviewAnswer = async (question, userAnswer, jobTitle = "Software Engineer", expectedContext = "") => {
    const provider = process.env.LLM_PROVIDER || (process.env.GROQ_API_KEY ? "groq" : "gemini");
    const hasKey = provider === "groq" ? process.env.GROQ_API_KEY : process.env.GEMINI_API_KEY;

    const fallbackEvaluation = () => {
        const wordCount = (userAnswer || "").trim().split(/\s+/).length;
        let score = 5;
        let technicalAccuracy = 6;
        let clarity = 6;
        let depth = 5;
        let confidence = 6;

        if (wordCount > 60) {
            score = 7.5;
            technicalAccuracy = 8;
            clarity = 7;
            depth = 7;
            confidence = 8;
        } else if (wordCount < 20) {
            score = 4.0;
            technicalAccuracy = 4;
            clarity = 5;
            depth = 3;
            confidence = 5;
        }

        return {
            score,
            rubric: { technicalAccuracy, clarity, depth, confidence },
            missingPoints: [
                "Could expand on trade-offs and alternative architectural approaches",
                "Explain production edge cases or failure recovery mechanisms",
            ],
            sampleIdealAnswer: `A comprehensive answer should define the core architecture, explain trade-offs (e.g. why Redis vs in-memory maps), describe eviction policies like LRU, and address failure handling with fallback strategies.`,
            feedback: wordCount < 30
                ? "Your response was brief. Try structuring your answer with context, technical decision, and operational outcomes."
                : "Good foundational answer. Deepen your explanation of failure handling, scaling metrics, and architectural trade-offs.",
        };
    };

    if (!hasKey) {
        return fallbackEvaluation();
    }

    const evaluationPrompt = JSON.stringify({
        task: "Evaluate a candidate's answer to an interview question.",
        jobTitle,
        question,
        userAnswer,
        expectedContext,
        requiredOutputFormat: {
            score: "number between 1 and 10 (e.g. 7.5)",
            rubric: {
                technicalAccuracy: "number 1-10",
                clarity: "number 1-10",
                depth: "number 1-10",
                confidence: "number 1-10",
            },
            missingPoints: ["string array of critical points or trade-offs candidate missed"],
            sampleIdealAnswer: "concise, exemplary 2-3 paragraph answer to this question",
            feedback: "2-3 sentences of direct constructive feedback on how to improve next time",
        },
    });

    try {
        const rawContent = provider === "groq"
            ? await callGroq(evaluationPrompt, "You are a senior engineering hiring manager conducting a technical interview.")
            : await callGemini(evaluationPrompt);

        const cleaned = rawContent.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
        const jsonStart = cleaned.indexOf("{");
        const jsonEnd = cleaned.lastIndexOf("}");
        const jsonText = jsonStart >= 0 && jsonEnd > jsonStart ? cleaned.slice(jsonStart, jsonEnd + 1) : cleaned;
        const parsed = JSON.parse(jsonText);

        return {
            score: Number(parsed.score) || 7.0,
            rubric: {
                technicalAccuracy: Number(parsed.rubric?.technicalAccuracy) || 7,
                clarity: Number(parsed.rubric?.clarity) || 7,
                depth: Number(parsed.rubric?.depth) || 6,
                confidence: Number(parsed.rubric?.confidence) || 7,
            },
            missingPoints: Array.isArray(parsed.missingPoints) ? parsed.missingPoints : ["Expand on operational trade-offs"],
            sampleIdealAnswer: typeof parsed.sampleIdealAnswer === "string" ? parsed.sampleIdealAnswer : "An ideal answer covers architecture and trade-offs.",
            feedback: typeof parsed.feedback === "string" ? parsed.feedback : "Solid effort. Add more technical depth and quantifiable outcomes.",
        };
    } catch (error) {
        console.error("Mock interview evaluation error:", error.message);
        return fallbackEvaluation();
    }
};

