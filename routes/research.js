const router = require('express').Router();
const { randomUUID } = require('node:crypto');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { importProfile, sourceStatus } = require('../services/research');
const { rateLimit } = require('express-rate-limit');
const { arxivPdf, readPdf } = require('../services/researchReader');
const examples = require('../data/researchExamples.json');
const { matchResearch } = require('../services/researchMatching');
const activeImports = new Set();
const wrap = fn => async (req, res, next) => { try { await fn(req, res); } catch (e) { next(e); } };
router.get('/sources', (req, res) => res.json({ success: true, sources: sourceStatus(), version: 'research-matching-4' }));
router.get('/matches', wrap(async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (query.length < 2 || query.length > 200) return res.status(400).json({ success: false, message: 'Describe your research interest in 2–200 characters.' });
    let papers, corpusLimited = false;
    if (req.query.preview === 'true') papers = examples.map((w, i) => ({ ...w, user_id: `example-${i + 1}`, mentor_name: i === 0 ? 'Example language research collection' : 'Example vision research collection' }));
    else {
        papers = (await pool.query(`SELECT p.*,u.name AS mentor_name,u.role,u.roles FROM research_publications p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC,p.id DESC LIMIT 5001`)).rows;
        corpusLimited = papers.length > 5000;
        papers = papers.slice(0, 5000);
        papers = papers.filter(p => { let roles = []; try { roles = JSON.parse(p.roles || '[]'); } catch {} return p.role === 'mentor' || roles.includes('mentor'); });
    }
    res.json({ success: true, query, preview: req.query.preview === 'true', corpusLimited, ...matchResearch(query, papers) });
}));
const withReader = w => ({ ...w, reader_url: arxivPdf(w.full_text_url) ? `/api/research/papers/${w.id}/file` : null });
router.get('/examples', (req, res) => res.json({ success: true, publications: examples.map(withReader) }));
router.get('/papers/:id/file', rateLimit({ windowMs: 60 * 1000, limit: 20 }), wrap(async (req, res) => {
    let work = examples.find(w => w.id === req.params.id);
    if (!work && /^\d+$/.test(req.params.id)) work = (await pool.query('SELECT full_text_url FROM research_publications WHERE id=$1', [req.params.id])).rows[0];
    if (!work) return res.status(404).type('text').send('Paper not found.');
    try {
        const pdf = await readPdf(work.full_text_url);
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="research-paper.pdf"', 'Cache-Control': 'private, max-age=300' });
        res.send(pdf);
    } catch (e) { res.status(422).type('text').send(e.message); }
}));
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
    const author = (await pool.query('SELECT id,name FROM users WHERE id=$1', [req.params.userId])).rows[0];
    if (!author) return res.status(404).json({ success: false, message: 'Profile not found.' });
    res.json({ success: true, author, publications: result.rows.map(withReader) });
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
