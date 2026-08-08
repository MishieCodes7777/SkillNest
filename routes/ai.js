const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");
const { verifyToken } = require("../middleware/auth");
require("dotenv").config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// POST /api/ai/interview - Get interview prep for a company  [auth required — was public, unmetered]
router.post("/interview", verifyToken, async (req, res) => {
    try {
        const { company, topic } = req.body;

        if (!company) {
            return res.status(400).json({ success: false, message: "Company name is required" });
        }

        const prompt = topic
            ? `You are an interview preparation expert. Give me specific ${topic} interview questions asked at ${company}. Include:
- 8-10 actual questions with difficulty level (Easy/Medium/Hard)
- Brief hints for each question
- Topics covered
Format as JSON array: [{"question":"...","difficulty":"...","hint":"...","topic":"..."}]
Only return the JSON array, no other text.`
            : `You are an interview preparation expert. Give me the complete interview syllabus for ${company}. Include:
1. DSA topics they focus on (with weightage)
2. Core CS subjects required (OS, DBMS, CN, System Design)
3. Most frequently asked DSA patterns
4. Coding round format
5. Number of rounds typically

Format your response clearly with headers and bullet points. Be specific to ${company}'s actual interview pattern.`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant",
            temperature: 0.7,
            max_tokens: 2000,
        });

        const response = completion.choices[0]?.message?.content || "No response generated";
        res.json({ success: true, response });
    } catch (err) {
        console.error("AI error:", err.message);
        res.status(500).json({ success: false, message: "AI service temporarily unavailable. Try again." });
    }
});

// POST /api/ai/chat - General AI chat (for AI Mentor)  [auth required — was public, unmetered]
router.post("/chat", verifyToken, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, message: "Message is required" });
        }

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are SkillNest AI Mentor - a helpful, knowledgeable programming and computer science tutor. Give clear, concise explanations with code examples when relevant. Be encouraging and supportive." },
                { role: "user", content: message }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.7,
            max_tokens: 1500,
        });

        const response = completion.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
        res.json({ success: true, response });
    } catch (err) {
        console.error("AI Chat error:", err.message);
        res.status(500).json({ success: false, message: "AI service temporarily unavailable." });
    }
});

// Pulls the first JSON array or object out of a model response that may
// include stray prose around it, since models don't always obey "JSON only."
function extractJson(text) {
    const arrStart = text.indexOf('['), arrEnd = text.lastIndexOf(']');
    const objStart = text.indexOf('{'), objEnd = text.lastIndexOf('}');
    const useArray = arrStart !== -1 && arrEnd > arrStart && (objStart === -1 || arrStart < objStart);
    const start = useArray ? arrStart : objStart;
    const end = useArray ? arrEnd : objEnd;
    if (start === -1 || end <= start) throw new Error("No JSON found in AI response");
    return JSON.parse(text.substring(start, end + 1));
}

// POST /api/ai/roadmap - Generate a real, personalized learning roadmap
router.post("/roadmap", verifyToken, async (req, res) => {
    try {
        const { skills, goal, hours } = req.body;
        if (!goal) return res.status(400).json({ success: false, message: "Goal is required" });

        const prompt = `You are a curriculum designer. A learner currently knows: "${skills || 'nothing specific yet'}". Their goal is: "${goal}". They can study ${hours || 10} hours per week.

Design a week-by-week learning roadmap (4-8 weeks, however many genuinely makes sense for this goal — don't pad it). For each week return:
- "week": the week number
- "title": short title for the week's focus
- "desc": one sentence describing what they'll learn
- "topics": an array of exactly 5 short topic/skill strings covered that week
- "hours": ${hours || 10}

Skip any topics the learner says they already know. Return ONLY a JSON array like:
[{"week":1,"title":"...","desc":"...","topics":["...","...","...","...","..."],"hours":${hours || 10}}]
No other text before or after the JSON.`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant",
            temperature: 0.6,
            max_tokens: 2000,
        });

        const raw = completion.choices[0]?.message?.content || "";
        const weeks = extractJson(raw);
        if (!Array.isArray(weeks) || weeks.length === 0) throw new Error("Empty roadmap");
        res.json({ success: true, weeks });
    } catch (err) {
        console.error("AI roadmap error:", err.message);
        res.status(500).json({ success: false, message: "Could not generate a roadmap right now. Try again." });
    }
});

// POST /api/ai/resume-review - Real AI resume feedback (replaces keyword-matching)
router.post("/resume-review", verifyToken, async (req, res) => {
    try {
        const { resumeText } = req.body;
        if (!resumeText || resumeText.trim().length < 40) {
            return res.status(400).json({ success: false, message: "Resume text is too short to review." });
        }

        const prompt = `You are an experienced technical recruiter reviewing this resume. Give honest, specific, actionable feedback — not generic advice.

Resume:
"""
${resumeText.slice(0, 6000)}
"""

Return ONLY this JSON object, nothing else:
{"score": <0-100 integer>, "critical": [<up to 4 strings — serious gaps that would hurt them in screening>], "improvements": [<up to 5 strings — specific, actionable suggestions>], "strengths": [<up to 5 strings — what's genuinely working>]}`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant",
            temperature: 0.4,
            max_tokens: 1200,
        });

        const raw = completion.choices[0]?.message?.content || "";
        const feedback = extractJson(raw);
        if (typeof feedback.score !== 'number') throw new Error("Malformed feedback");
        res.json({ success: true, feedback: { score: Math.max(0, Math.min(100, Math.round(feedback.score))), critical: feedback.critical || [], improvements: feedback.improvements || [], strengths: feedback.strengths || [] } });
    } catch (err) {
        console.error("AI resume review error:", err.message);
        res.status(500).json({ success: false, message: "Could not analyze the resume right now. Try again." });
    }
});

module.exports = router;
