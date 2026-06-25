const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");
require("dotenv").config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// POST /api/ai/interview - Get interview prep for a company
router.post("/interview", async (req, res) => {
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

// POST /api/ai/chat - General AI chat (for AI Mentor)
router.post("/chat", async (req, res) => {
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

module.exports = router;
