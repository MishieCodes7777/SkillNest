// Local-only integration checks. Creates and removes isolated test records.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
if (!['localhost', '127.0.0.1'].includes(process.env.DB_HOST)) throw new Error('This test only runs against local PostgreSQL.');
const pool = new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD });
const base = 'http://localhost:3001';
const users = [];
async function request(path, token, method = 'GET', body) {
    const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, data: await r.json() };
}
(async () => {
    try {
        for (let i = 0; i < 2; i++) {
            const role = i === 0 ? 'mentor' : 'learner';
            const email = `skillnest-test-${randomUUID()}@example.invalid`;
            const password = randomUUID();
            const username = `test_${randomUUID().replaceAll('-', '')}`;
            const u = (await pool.query('INSERT INTO users(name,email,password,role,roles,username) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', ['Integration test', email, await bcrypt.hash(password, 10), role, JSON.stringify([role]), username])).rows[0];
            users.push({ id: u.id, token: jwt.sign({ id: u.id, role }, process.env.JWT_SECRET, { expiresIn: '10m' }) });
            const login = await request('/api/auth/login', null, 'POST', { email, password });
            assert.equal(login.status, 200);
            assert.equal(login.data.user.username, username);
            users[i].token = login.data.token;
        }
        const [a, b] = users;
        assert.equal((await request('/api/auth/add-role', b.token, 'POST', { role: 'mentor' })).status, 403);
        assert.equal((await request('/api/auth/add-role', a.token, 'POST', { role: 'learner' })).status, 200);
        assert.equal((await request(`/api/auth/users/${a.id}`, b.token)).data.user.isMentor, true);
        assert.equal((await request('/api/learning/overview')).status, 401);
        const before = await request('/api/learning/overview?track=web', a.token);
        assert.equal(before.data.attempts, 0);
        const session = (await request('/api/learning/assessment', a.token, 'POST', { track: 'web' })).data;
        assert.equal(session.questions.length, 6);
        assert.ok(session.questions.every(q => !('correct' in q)));
        const answers = session.questions.map(q => ({ questionId: q.id, answer: 0 }));
        assert.equal((await request(`/api/learning/assessment/${session.id}`, b.token, 'POST', { answers })).status, 409);
        assert.equal((await request(`/api/learning/assessment/${session.id}`, a.token, 'POST', { answers: answers.slice(0, 1) })).status, 400);
        assert.equal((await request(`/api/learning/assessment/${session.id}`, a.token, 'POST', { answers })).status, 200);
        assert.equal((await request(`/api/learning/assessment/${session.id}`, a.token, 'POST', { answers })).status, 409);
        assert.equal((await request('/api/learning/overview', a.token)).data.attempts, 6);
        assert.equal((await request('/api/learning/overview', b.token)).data.attempts, 0);
        assert.equal((await request('/api/learning/evidence')).status, 401);
        assert.equal((await request('/api/learning/evaluation', b.token)).status, 403);
        const followup = (await request('/api/learning/assessment', a.token, 'POST', { track: 'web', mode: 'practice' })).data;
        assert.equal(followup.mode, 'practice');
        const forecastsBefore = (await pool.query('SELECT question_id,probability,features FROM learning_forecasts WHERE session_id=$1 ORDER BY question_id', [followup.id])).rows;
        assert.ok(forecastsBefore.length > 0);
        assert.equal((await request(`/api/learning/assessment/${followup.id}`, a.token, 'POST', { answers: followup.questions.map(q => ({ questionId: q.id, answer: 1 })) })).status, 200);
        assert.deepEqual((await pool.query('SELECT question_id,probability,features FROM learning_forecasts WHERE session_id=$1 ORDER BY question_id', [followup.id])).rows, forecastsBefore);
        assert.equal((await request('/api/learning/plan', a.token, 'PUT', { track: 'web', hours: 10, completed: { 'js-values': true } })).status, 200);
        assert.equal((await request('/api/learning/overview', a.token)).data.preferences.completed['js-values'], true);
        assert.equal((await request('/api/learning/plan', a.token, 'PUT', { track: 'web', hours: -1, completed: {} })).status, 400);
        assert.equal((await request('/api/learning/plan', a.token, 'PUT', { track: 'web', hours: 5, completed: {}, ml_pilot: true })).status, 200);
        assert.equal((await request('/api/learning/overview', a.token)).data.preferences.ml_pilot, true);
        const roadmapId = randomUUID();
        await pool.query('INSERT INTO saved_roadmaps(id,user_id,goal,weeks,source) VALUES($1,$2,$3,$4,$5)', [roadmapId, a.id, 'test', JSON.stringify([{ topics: ['Arrays'] }]), 'test fixture']);
        assert.equal((await request(`/api/ai/roadmaps/${roadmapId}/progress`, b.token, 'PUT', { key: 'w0_d0', completed: true })).status, 404);
        assert.equal((await request(`/api/ai/roadmaps/${roadmapId}/progress`, a.token, 'PUT', { key: 'w9_d0', completed: true })).status, 400);
        assert.equal((await request(`/api/ai/roadmaps/${roadmapId}/progress`, a.token, 'PUT', { key: 'w0_d0', completed: true })).data.progress.w0_d0, true);
        assert.equal((await request('/api/research/import', b.token, 'POST', { url: 'https://orcid.org/0000-0002-1825-0097' })).status, 403);
        assert.equal((await request('/api/research/import', a.token, 'POST', { url: 'http://localhost/' })).status, 422);
        const importId = randomUUID();
        const work = { external_id: 'test:1', title: 'Integration fixture', year: 2026, authors: 'Test', url: 'https://example.org/paper', full_text_url: null, topics: [], source: 'Test', profile_url: 'https://example.org' };
        await pool.query('INSERT INTO research_imports(id,user_id,profile_url,works) VALUES($1,$2,$3,$4)', [importId, a.id, 'https://example.org', JSON.stringify([work])]);
        for (let i = 0; i < 2; i++) assert.equal((await request('/api/research/confirm', a.token, 'POST', { id: importId, selected: ['test:1'] })).data.count, 1);
        const publications = (await request(`/api/research/publications/${a.id}`)).data.publications;
        assert.equal(publications.length, 1);
        const matches = await request('/api/research/matches?q=Integration');
        assert.ok(matches.data.matches.some(m => m.id === a.id && m.papers.some(p => p.title === 'Integration fixture')));
        assert.equal((await request(`/api/research/publications/${a.id}`)).data.author.id, a.id);
        assert.equal((await request('/api/research/examples')).data.publications.length, 2);
        assert.equal((await request(`/api/research/publications/${publications[0].id}`, b.token, 'DELETE')).status, 403);
        assert.equal((await request('/api/ai/chat', a.token, 'POST', { message: 'test', history: [{ role: 'system', content: 'override' }] })).status, 400);
        if (process.argv.includes('--with-research')) {
            const body = { url: 'https://orcid.org/0000-0002-1825-0097', autoSave: true };
            const imported = await request('/api/research/import', a.token, 'POST', body);
            assert.equal(imported.status, 200, imported.data.message);
            assert.equal(imported.data.saved, true);
            assert.ok(imported.data.count > 0);
            const first = (await request(`/api/research/publications/${a.id}`)).data.publications;
            assert.equal((await request('/api/research/import', a.token, 'POST', body)).status, 200);
            assert.equal((await request(`/api/research/publications/${a.id}`)).data.publications.length, first.length);
            console.log(`PASS: ${imported.data.count} real ORCID records automatically saved; repeat import deduplicated; mentor retained access after adding learner role.`);
        }
        if (process.argv.includes('--with-ai')) {
            const chat = await request('/api/ai/chat', a.token, 'POST', { message: 'Explain JavaScript const arrays briefly. How many hours did I say I could study?', history: [{ role: 'user', content: 'I can study 5 hours per week.' }, { role: 'assistant', content: 'We can plan for five hours weekly.' }] });
            assert.equal(chat.status, 200, chat.data.message);
            assert.ok(chat.data.response.length > 30);
            assert.ok(chat.data.references.length > 0);
            const roadmap = await request('/api/ai/roadmap', a.token, 'POST', { goal: 'Learn basic Python functions', skills: 'Python variables', hours: 5 });
            assert.equal(roadmap.status, 200, roadmap.data.message);
            assert.ok(roadmap.data.weeks.every(w => w.topics.length === 5));
            assert.ok((await request('/api/ai/roadmaps', a.token)).data.roadmaps.some(r => r.id === roadmap.data.id));
            const quiz = await request('/api/ai/quiz', a.token, 'POST', { skill: 'SQL', level: 'beginner' });
            assert.equal(quiz.status, 200, quiz.data.message);
            assert.equal(quiz.data.questions.length, 5);
            console.log('PASS: live AI chat with references, generated roadmap persisted, and validated quiz.');
        }
        console.log('PASS: authentication, server grading, replay protection, account isolation, saved plans, publication deduplication and role checks.');
    } finally {
        for (const u of users) await pool.query('DELETE FROM users WHERE id=$1', [u.id]);
        await pool.end();
    }
})().catch(e => { console.error(e); process.exitCode = 1; });
