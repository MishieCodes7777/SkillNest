const router = require('express').Router();
const { randomUUID } = require('node:crypto');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { importProfile, sourceStatus } = require('../services/research');
const { rateLimit } = require('express-rate-limit');
const activeImports = new Set();
const wrap = fn => async (req, res, next) => { try { await fn(req, res); } catch (e) { next(e); } };
router.get('/sources', (req, res) => res.json({ success: true, sources: sourceStatus(), version: 'automatic-import-2' }));
async function saveWorks(userId, works) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const w of works) await client.query(`INSERT INTO research_publications (user_id,external_id,title,year,authors,url,full_text_url,topics,source,profile_url)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (user_id,external_id) DO UPDATE SET title=$3,year=$4,authors=$5,url=$6,full_text_url=COALESCE($7,research_publications.full_text_url),topics=$8,source=$9,profile_url=$10`,
          [userId, w.external_id, w.title, w.year, w.authors, w.url, w.full_text_url, JSON.stringify(w.topics), w.source, w.profile_url]);
        await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}
router.get('/publications/:userId', wrap(async (req, res) => {
    if (!/^\d+$/.test(req.params.userId)) return res.status(400).json({ success: false, message: 'Invalid profile.' });
    const result = await pool.query('SELECT * FROM research_publications WHERE user_id=$1 ORDER BY year DESC NULLS LAST, title', [req.params.userId]);
    res.json({ success: true, publications: result.rows });
}));
router.use(verifyToken);
router.use(async (req, res, next) => {
  try {
    const user = (await pool.query('SELECT role,roles FROM users WHERE id=$1', [req.user.id])).rows[0];
    let roles = []; try { roles = JSON.parse(user?.roles || '[]'); } catch {}
    if (user?.role !== 'mentor' && !roles.includes('mentor')) return res.status(403).json({ success: false, message: 'An approved mentor account is required.' });
    next();
  } catch (e) { next(e); }
});
router.post('/import', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, keyGenerator: req => String(req.user.id), message: { success: false, message: 'Please wait before starting more publication imports.' } }), wrap(async (req, res) => {
    if (typeof req.body.url !== 'string' || req.body.url.length > 300) return res.status(400).json({ success: false, message: 'Enter a profile URL.' });
    if (activeImports.has(req.user.id)) return res.status(409).json({ success: false, message: 'Your publication import is already running.' });
    activeImports.add(req.user.id);
    try {
        let imported;
        try { imported = await importProfile(req.body.url); }
        catch (e) { return res.status(422).json({ success: false, message: e.message }); }
        if (req.body.autoSave === true) {
            await saveWorks(req.user.id, imported.works);
            return res.json({ success: true, saved: true, count: imported.works.length, profile: imported.profile, authorName: imported.authorName });
        }
        const id = randomUUID();
        await pool.query('INSERT INTO research_imports (id,user_id,profile_url,author_name,works) VALUES ($1,$2,$3,$4,$5)', [id, req.user.id, imported.profile.url, imported.authorName, JSON.stringify(imported.works)]);
        res.json({ success: true, id, ...imported });
    } finally { activeImports.delete(req.user.id); }
}));
router.post('/confirm', wrap(async (req, res) => {
    if (!/^[a-f0-9-]{36}$/i.test(req.body.id || '') || !Array.isArray(req.body.selected) || req.body.selected.length > 500) return res.status(400).json({ success: false, message: 'Invalid import selection.' });
    const imported = (await pool.query("SELECT * FROM research_imports WHERE id=$1 AND user_id=$2 AND created_at > NOW() - INTERVAL '1 hour'", [req.body.id, req.user.id])).rows[0];
    if (!imported) return res.status(404).json({ success: false, message: 'Import expired. Please import again.' });
    const works = imported.works.filter(w => req.body.selected.includes(w.external_id));
    await saveWorks(req.user.id, works);
    res.json({ success: true, count: works.length });
}));
router.delete('/publications/:id', wrap(async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid publication.' });
    await pool.query('DELETE FROM research_publications WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
}));
module.exports = router;
