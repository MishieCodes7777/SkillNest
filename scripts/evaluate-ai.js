// A small smoke benchmark, NOT a claim of general factual accuracy.
require('dotenv').config({ quiet: true });
const Groq = require('groq-sdk');
const fs = require('node:fs');
const client = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 30000, maxRetries: 0 });
const cases = [
    { name: 'JavaScript mutation', question: 'const a = [1]; a.push(2); What is a? Return JSON {"answer":[...]} only.', expected: [1,2] },
    { name: 'SQL null counting', question: 'A SQL column contains 2, NULL, 5. What does COUNT(column) return? Return JSON {"answer": number} only.', expected: 2 },
    { name: 'Conversation context', history: [{ role: 'user', content: 'My available study time is 5 hours a week.' }, { role: 'assistant', content: 'I will plan around that weekly time budget.' }], question: 'How many hours per week did I say I have? Return JSON {"answer": number} only.', expected: 5 },
    { name: 'Honest uncertainty', question: 'Exactly how many interview rounds will an unspecified company use for me next year? No company or role information is available. Return JSON {"answer": null} if this cannot be determined.', expected: null },
];
(async () => {
    const results = [];
    for (const model of ['llama-3.1-8b-instant', process.env.AI_MODEL || 'qwen/qwen3.8-27b']) {
        for (const c of cases) {
            const started = Date.now();
            try {
                const r = await client.chat.completions.create({ model, messages: [{ role: 'system', content: 'Answer accurately. Do not invent missing information. Return only the requested JSON.' }, ...(c.history || []), { role: 'user', content: c.question }], temperature: 0, max_tokens: 1500 });
                const output = r.choices[0]?.message?.content || '';
                let passed = false;
                try { const raw = output.replace(/^```(?:json)?\s*|\s*```$/g, ''); passed = JSON.stringify(JSON.parse(raw).answer) === JSON.stringify(c.expected); } catch {}
                results.push({ model, case: c.name, passed, latencyMs: Date.now() - started, output });
            } catch (e) { results.push({ model, case: c.name, passed: false, error: e.status ? `HTTP ${e.status}` : 'Network or provider error' }); }
        }
    }
    fs.writeFileSync('ml/ai-evaluation.json', JSON.stringify({ evaluatedAt: new Date().toISOString(), limitation: 'Four deterministic smoke checks per model. Not a representative accuracy or quality benchmark.', results }, null, 2) + '\n');
    console.log(JSON.stringify(results.map(({ output, ...r }) => r), null, 2));
})();
