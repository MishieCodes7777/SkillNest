const Groq = require('groq-sdk');
const { curriculum } = require('./learning');
let client;
function configuration() {
    return { model: process.env.AI_MODEL || 'qwen/qwen3.8-27b', provider: 'Groq', configured: Boolean(process.env.GROQ_API_KEY) };
}
async function complete(options) {
    if (!process.env.GROQ_API_KEY) throw new Error('AI is not configured.');
    client ||= new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 45000, maxRetries: 1 });
    return client.chat.completions.create({ ...options, model: configuration().model });
}
function referencesFor(text) {
    const words = new Set(text.toLowerCase().match(/[a-z]{3,}/g) || []);
    const stop = new Set(['what', 'how', 'the', 'and', 'for', 'with', 'can', 'does', 'that', 'this', 'are', 'from', 'have', 'explain', 'function']);
    return curriculum.topics.map(t => ({ ...t, score: [...words].filter(w => !stop.has(w) && `${t.name} ${t.summary}`.toLowerCase().includes(w)).length }))
      .filter(t => t.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
}
module.exports = { complete, configuration, referencesFor };
