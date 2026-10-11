const express = require('express');
const { randomUUID } = require('node:crypto');
const pool = require('../config/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const engine = require('../services/learning');
const { evaluateForecasts } = require('../services/modelEvaluation');
const router = express.Router();
const wrap = fn => async (req, res, next) => { try { await fn(req, res); } catch (e) { next(e); } };
async function attemptsFor(id) {
    return (await pool.query('SELECT question_id, topic, correct FROM learning_attempts WHERE user_id=$1 ORDER BY created_at, id', [id])).rows;
}
router.get('/catalog', (req, res) => res.json({ success: true, ...engine.curriculum, model: engine.modelInfo() }));
// Public, stateless preview. Never reads or writes account records.
router.post('/preview', (req, res) => {
    try {
        const history = req.body.answers?.length ? engine.grade(req.body.answers) : [];
        const track = engine.curriculum.tracks.find(t => t.id === req.body.track)?.id || 'web';
        const hours = Number(req.body.hours || 5);
        if (!Number.isInteger(hours) || hours < 1 || hours > 40) throw new Error('Choose 1–40 hours per week.');
        const completed = Object.fromEntries(engine.curriculum.topics.map(t => [t.id, req.body.completed?.[t.id] === true]));
        const pilot = req.body.ml_pilot === true;
        const practice = engine.selectPractice(track, history, pilot);
        res.json({ success: true, preview: true, topics: engine.summarise(history), plan: engine.buildPlan(track, history, hours), questions: engine.selectQuestions(track, history), practice, recommendation: practice.recommendation, results: history, courses: [], mentors: [], attempts: history.length, preferences: { hours, completed, ml_pilot: pilot } });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});
router.use(verifyToken);
router.get('/evidence', wrap(async (req, res) => {
    const rows = (await pool.query(`SELECT f.model_version,f.user_id,f.seen_before,f.probability,f.baseline_probability,a.correct FROM learning_forecasts f JOIN learning_attempts a ON a.session_id=f.session_id AND a.question_id=f.question_id ORDER BY f.created_at DESC LIMIT 100000`)).rows;
    const evaluation = evaluateForecasts(rows).map(r => r.learners >= 30 && r.examples >= 200 ? r : { ...r, model: null, baseline: null });
    res.json({ success: true, evaluation, window: 'Latest 100,000 scored forecasts; model versions are reported separately.' });
}));
router.get('/evaluation', requireAdmin, wrap(async (req, res) => {
    const rows = (await pool.query(`SELECT f.*,a.correct FROM learning_forecasts f JOIN learning_attempts a ON a.session_id=f.session_id AND a.question_id=f.question_id ORDER BY f.created_at DESC LIMIT 100000`)).rows;
    res.json({ success: true, evaluation: evaluateForecasts(rows), cappedAt: 100000, note: 'Prospective session-start predictions, first question per topic, previously unseen questions only. No scores are fabricated when data is missing.' });
}));
router.get('/overview', wrap(async (req, res) => {
    const track = engine.curriculum.tracks.find(t => t.id === req.query.track)?.id || 'web';
    const attempts = await attemptsFor(req.user.id);
    const pref = (await pool.query('SELECT hours, completed, ml_pilot FROM learning_plans WHERE user_id=$1 AND track=$2', [req.user.id, track])).rows[0] || { hours: 5, completed: {}, ml_pilot: false };
    const plan = engine.buildPlan(track, attempts, pref.hours);
    const terms = track === 'web' ? ['javascript', 'react', 'web'] : track === 'sql' ? ['sql', 'database'] : ['python'];
    const courses = (await pool.query('SELECT id,title,description,category,mentor_name,mentor_id FROM courses ORDER BY created_at DESC LIMIT 200')).rows
      .filter(c => terms.some(t => `${c.title} ${c.category} ${c.description}`.toLowerCase().includes(t))).slice(0, 3)
      .map(c => ({ ...c, reason: `Matches your ${engine.curriculum.tracks.find(t => t.id === track).name} track.` }));
    const mentors = (await pool.query('SELECT u.id,u.name,mp.skills,mp.bio FROM mentor_profiles mp JOIN users u ON u.id=mp.user_id ORDER BY mp.updated_at DESC LIMIT 200')).rows
      .filter(m => terms.some(t => `${m.skills} ${m.bio}`.toLowerCase().includes(t))).slice(0, 3)
      .map(m => ({ ...m, reason: 'Profile skills match your selected learning track.' }));
    res.json({ success: true, topics: engine.summarise(attempts), plan, recommendation: engine.recommendPractice(track, attempts, pref.ml_pilot), preferences: pref, courses, mentors, attempts: attempts.length });
}));
router.post('/assessment', wrap(async (req, res) => {
    if (!engine.curriculum.tracks.some(t => t.id === req.body.track)) return res.status(400).json({ success: false, message: 'Unknown track.' });
    const attempts = await attemptsFor(req.user.id);
    const mode = req.body.mode === 'practice' ? 'practice' : 'assessment';
    const pilot = (await pool.query('SELECT ml_pilot FROM learning_plans WHERE user_id=$1 AND track=$2', [req.user.id, req.body.track])).rows[0]?.ml_pilot === true;
    const practice = engine.selectPractice(req.body.track, attempts, pilot);
    const questions = mode === 'practice' ? practice.questions : engine.selectQuestions(req.body.track, attempts);
    const id = randomUUID();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('INSERT INTO learning_sessions (id,user_id,track,question_ids,mode,policy) VALUES ($1,$2,$3,$4,$5,$6)', [id, req.user.id, req.body.track, JSON.stringify(questions.map(q => q.id)), mode, mode === 'practice' ? practice.recommendation.policy : 'assessment-v2']);
        for (const f of engine.forecastsFor(questions, attempts)) await client.query('INSERT INTO learning_forecasts (session_id,question_id,user_id,model_version,probability,baseline_probability,features,prior_attempts,seen_before) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [id, f.questionId, req.user.id, f.version, f.probability, f.baseline, JSON.stringify(f.features), f.priorAttempts, f.seenBefore]);
        await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    res.json({ success: true, id, questions, mode, recommendation: mode === 'practice' ? practice.recommendation : null });
}));
router.post('/assessment/:id', wrap(async (req, res) => {
    if (!/^[a-f0-9-]{36}$/i.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid assessment.' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const session = (await client.query('SELECT * FROM learning_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE', [req.params.id, req.user.id])).rows[0];
        if (!session || session.submitted_at) { await client.query('ROLLBACK'); return res.status(409).json({ success: false, message: 'Assessment is unavailable or already submitted.' }); }
        let results;
        try {
            results = engine.grade(req.body.answers, session.question_ids);
            if (results.length !== session.question_ids.length) throw new Error('Answer every question before submitting.');
        } catch (e) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: e.message }); }
        for (const r of results) await client.query('INSERT INTO learning_attempts (session_id,user_id,question_id,question_version,topic,answer,correct) VALUES ($1,$2,$3,$4,$5,$6,$7)', [session.id, req.user.id, r.question_id, r.question_version, r.topic, r.answer, r.correct]);
        await client.query('UPDATE learning_sessions SET submitted_at=NOW() WHERE id=$1', [session.id]);
        await client.query('COMMIT');
        res.json({ success: true, results, score: Math.round(100 * results.filter(r => r.correct).length / results.length) });
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}));
router.put('/plan', wrap(async (req, res) => {
    const track = engine.curriculum.tracks.find(t => t.id === req.body.track);
    const hours = Number(req.body.hours);
    const completed = req.body.completed;
    const pilot = req.body.ml_pilot === true;
    if (req.body.ml_pilot !== undefined && typeof req.body.ml_pilot !== 'boolean') return res.status(400).json({ success: false, message: 'Invalid practice setting.' });
    if (!track || !Number.isInteger(hours) || hours < 1 || hours > 40 || !completed || Array.isArray(completed) || typeof completed !== 'object' || Object.entries(completed).some(([k, v]) => !track.topics.includes(k) || typeof v !== 'boolean')) return res.status(400).json({ success: false, message: 'Invalid plan settings.' });
    await pool.query('INSERT INTO learning_plans (user_id,track,hours,completed,ml_pilot) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id,track) DO UPDATE SET hours=$3,completed=$4,ml_pilot=$5,updated_at=NOW()', [req.user.id, track.id, hours, JSON.stringify(completed), pilot]);
    res.json({ success: true });
}));
module.exports = router;
module.exports.attemptsFor = attemptsFor;
