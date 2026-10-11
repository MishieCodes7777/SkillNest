// Local pilot export only. No emails, names, raw account IDs, or database credentials in output.
require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const { createHmac } = require('node:crypto');
const fs = require('node:fs');
if (!['localhost', '127.0.0.1'].includes(process.env.DB_HOST)) throw new Error('This export is restricted to a local development database. Production research exports require a separate reviewed process.');
if (!process.env.JWT_SECRET) throw new Error('Missing local pseudonymisation secret.');
const pool = new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD });
(async () => {
    const rows = (await pool.query(`SELECT f.*,a.correct,a.topic,a.question_version,s.mode,s.policy FROM learning_forecasts f JOIN learning_attempts a ON a.session_id=f.session_id AND a.question_id=f.question_id JOIN learning_sessions s ON s.id=f.session_id WHERE NOT f.seen_before ORDER BY f.created_at,f.question_id`)).rows;
    const records = rows.map(r => ({ learner: createHmac('sha256', process.env.JWT_SECRET).update(`skillnest-ml-export:${r.user_id}`).digest('hex'),
        features: r.features, correct: r.correct ? 1 : 0, topic: r.topic, question: r.question_id, questionVersion: r.question_version,
        mode: r.mode, policy: r.policy, modelVersion: r.model_version, probability: r.probability, baseline: r.baseline_probability }));
    fs.mkdirSync('ml/data', { recursive: true });
    fs.writeFileSync('ml/data/skillnest-pilot.json', JSON.stringify({ schema: 1, note: 'Pseudonymised, not anonymous. Local-only pilot. First question per topic per session; repeats excluded.', records }, null, 2));
    console.log(`Exported ${records.length} eligible forecasts from ${new Set(records.map(r => r.learner)).size} learners to ignored ml/data/skillnest-pilot.json.`);
})().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => pool.end());
