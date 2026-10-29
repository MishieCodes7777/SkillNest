import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import PreviewLayout from '../components/PreviewLayout';
import { api } from '../utils/api';
import '../styles/learning.css';

export default function LearningHub({ preview = false }) {
    const [catalog, setCatalog] = useState(null);
    const [data, setData] = useState(null);
    const [track, setTrack] = useState('web');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [session, setSession] = useState(null);
    const [answers, setAnswers] = useState({});
    const [index, setIndex] = useState(0);
    const [results, setResults] = useState(null);
    const [demoAnswers, setDemoAnswers] = useState([]);
    const [saved, setSaved] = useState('');
    async function load(currentTrack = track, history = demoAnswers) {
        const d = preview ? await api('/api/learning/preview', { method: 'POST', body: JSON.stringify({ track: currentTrack, answers: history, ...data?.preferences }) }) : await api(`/api/learning/overview?track=${currentTrack}`);
        setData(d);
        return d;
    }
    useEffect(() => {
        let alive = true;
        setError(''); setData(null); setSession(null); setResults(null);
        Promise.all([api('/api/learning/catalog'), preview ? api('/api/learning/preview', { method: 'POST', body: JSON.stringify({ track, answers: demoAnswers }) }) : api(`/api/learning/overview?track=${track}`)])
            .then(([c, d]) => { if (alive) { setCatalog(c); setData(d); } }).catch(e => { if (alive) setError(e.message); });
        return () => { alive = false; };
    }, [track, preview]);
    async function start(mode = 'assessment') {
        setBusy(true); setError(''); setResults(null);
        try {
            const s = preview ? { id: 'preview', questions: mode === 'practice' ? data.practice.questions : data.questions } : await api('/api/learning/assessment', { method: 'POST', body: JSON.stringify({ track, mode }) });
            setSession(s); setAnswers({}); setIndex(0);
        } catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    async function submit() {
        setBusy(true); setError('');
        const submitted = session.questions.map(q => ({ questionId: q.id, answer: answers[q.id] }));
        try {
            let r;
            if (preview) {
                const merged = [...new Map([...demoAnswers, ...submitted].map(a => [a.questionId, a])).values()];
                const updated = await load(track, merged);
                setDemoAnswers(merged);
                r = updated.results.filter(a => submitted.some(s => s.questionId === a.question_id));
            } else {
                r = (await api(`/api/learning/assessment/${session.id}`, { method: 'POST', body: JSON.stringify({ answers: submitted }) })).results;
                await load();
            }
            setResults(r); setSession(null);
        } catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    async function updatePlan(changes) {
        const preferences = { ...data.preferences, ...changes };
        setBusy(true); setError(''); setSaved('');
        try {
            if (preview) { setData(await api('/api/learning/preview', { method: 'POST', body: JSON.stringify({ track, answers: demoAnswers, ...preferences }) })); setSaved('Updated for this preview. Sign in to save across devices.'); }
            else { await api('/api/learning/plan', { method: 'PUT', body: JSON.stringify({ track, ...preferences }) }); await load(); setSaved('Progress saved to your account.'); }
        } catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    const Layout = preview ? PreviewLayout : AppLayout;
    const activeTrack = catalog?.tracks.find(t => t.id === track);
    const topics = data?.topics.filter(t => activeTrack?.topics.includes(t.id)) || [];
    const assessed = topics.filter(t => t.attempts);
    const correct = results?.filter(r => r.correct).length || 0;
    const complete = data?.plan.filter(p => data.preferences.completed[p.topic]).length || 0;
    return <Layout><main className="learn-page">
        <div className="learn-heading"><div><div className="learn-eyebrow"><span className="learn-dot" /> YOUR NEXT CHAPTER</div><h1>A little practice.<br /><span>A clearer path forward.</span></h1><p>Discover what you know, work on what matters, and make your next step count.</p></div><div className="learn-orbit" aria-hidden="true"><div className="learn-orbit-core">✦</div><span className="orbit-label one">Discover</span><span className="orbit-label two">Practise</span><span className="orbit-label three">Grow</span></div></div>
        <div className="learn-tab-row" role="group" aria-label="Learning track">{catalog?.tracks.map(t => <button key={t.id} className={`learn-track ${track === t.id ? 'selected' : ''}`} disabled={busy || Boolean(session)} onClick={() => setTrack(t.id)}><span className="material-icons">{t.icon}</span>{t.name}</button>)}</div>
        {error && <div className="learn-alert" role="alert">{error} <button onClick={() => window.location.reload()}>Reload</button></div>}
        {!data && !error && <p className="learn-muted" role="status">Loading your learning studio…</p>}
        {data && <>
          <div className="learn-stats"><div><span className="learn-stat-icon">◎</span><strong>{assessed.length}<small> / {topics.length}</small></strong><p>Topics explored</p></div><div><span className="learn-stat-icon">↗</span><strong>{data.attempts}</strong><p>Answers recorded{preview ? ' in preview' : ''}</p></div><div><span className="learn-stat-icon">✓</span><strong>{complete}<small> / {data.plan.length}</small></strong><p>Study steps complete</p></div><div><span className="learn-stat-icon">◷</span><strong>{data.preferences.hours}<small> hrs</small></strong><p>Your weekly rhythm</p></div></div>
          {!session && data.recommendation && <section className="learn-card" style={{ marginBottom: 22 }}>
            <div className="learn-eyebrow">YOUR NEXT PRACTICE · CURRICULUM GUIDED</div>
            <h2>{data.recommendation.title}</h2><p className="research-note">{data.recommendation.reason}</p>
            <div className="research-form"><button className="learn-primary" disabled={busy} onClick={() => start('practice')}>Start focused practice →</button><a className="learn-secondary" href={data.recommendation.url} target="_blank" rel="noreferrer">Review the topic ↗</a></div>
          </section>}
          {session ? <section className="learn-card learn-assessment" aria-labelledby="assessment-title"><div className="learn-row"><span className="learn-eyebrow">SKILL CHECK · {index + 1} OF {session.questions.length}</span><button className="learn-text-button" disabled={busy} onClick={() => setSession(null)}>Exit assessment</button></div><div className="learn-progress"><i style={{ width: `${100 * (index + 1) / session.questions.length}%` }} /></div><h2 id="assessment-title">{session.questions[index].question}</h2><div className="learn-options">{session.questions[index].options.map((option, i) => <button key={i} aria-pressed={answers[session.questions[index].id] === i} className={answers[session.questions[index].id] === i ? 'chosen' : ''} onClick={() => setAnswers(a => ({ ...a, [session.questions[index].id]: i }))}><span>{String.fromCharCode(65 + i)}</span>{option}</button>)}</div><div className="learn-row"><button className="learn-secondary" disabled={index === 0 || busy} onClick={() => setIndex(i => i - 1)}>Back</button><button className="learn-primary" disabled={answers[session.questions[index].id] === undefined || busy} onClick={() => index < session.questions.length - 1 ? setIndex(i => i + 1) : submit()}>{busy ? 'Saving…' : index < session.questions.length - 1 ? 'Next question →' : 'See my results →'}</button></div><p className="learn-fine">A short diagnostic, not a certification. Answer keys are checked on the server.</p></section> : <div className="learn-grid">
            <section className="learn-card learn-focus"><div className="learn-eyebrow">{assessed.length ? 'KEEP YOUR MOMENTUM' : 'START WITH CURIOSITY'}</div><h2>{assessed.length ? 'Your next step starts here.' : 'Find your starting point.'}</h2><p>{assessed.length ? 'A fresh skill check helps spot what needs another look. Your study path adjusts to your answers.' : `Take a six-question check in ${activeTrack?.name.toLowerCase()}. There’s no timer and no pressure—just a useful place to begin.`}</p><div className="learn-inline-tags"><span>6 questions</span><span>About 5 minutes</span><span>Explained answers</span></div><button className="learn-primary" onClick={() => start('assessment')} disabled={busy}>{busy ? 'Preparing…' : assessed.length ? 'Continue practising →' : 'Take my first skill check →'}</button><p className="learn-fine">Small starter question bank · Source-linked explanations</p></section>
            <section className="learn-card"><div className="learn-row"><h2>Your skill signals</h2><span className="learn-pill">Recent answers</span></div><p className="learn-muted">A snapshot of practice, not a mastery score.</p><div className="learn-skills">{topics.map(t => <div className="learn-skill" key={t.id}><div className="learn-row"><span>{t.name}</span><small>{t.accuracy === null ? 'Not assessed' : `${t.accuracy}% correct`}</small></div><div className="learn-progress"><i style={{ width: `${t.accuracy || 0}%` }} /></div><small>{t.attempts ? `${t.attempts} answers · ${t.distinctQuestions} distinct questions` : 'Your first check will add a signal here.'}</small></div>)}</div></section>
          </div>}
          {results && <section className="learn-card learn-results" aria-live="polite"><div className="learn-row"><div><div className="learn-eyebrow">A STEP FORWARD</div><h2>{correct} of {results.length} answers correct</h2></div><button className="learn-text-button" onClick={() => setResults(null)}>Close results</button></div><p className="learn-muted">Your study path now reflects these answers. Repeated questions are practice, not independent evidence.</p>{results.map(r => <details key={r.question_id}><summary><span className={r.correct ? 'learn-good' : 'learn-warm'}>{r.correct ? '✓' : '↻'}</span>{r.question}</summary><p>{r.explanation}</p><a href={r.url} target="_blank" rel="noreferrer">Read the reference ↗</a></details>)}</section>}
          <section className="learn-card learn-path"><div className="learn-row"><div><div className="learn-eyebrow">ONE STEP AT A TIME</div><h2>Your learning path</h2><p className="learn-muted">Prerequisites come first. Adjust your weekly pace and save each completed step.</p></div><label className="learn-hours">Hours / week<select value={data.preferences.hours} disabled={busy} onChange={e => updatePlan({ hours: Number(e.target.value) })}>{[3,5,10,15,20].map(n => <option key={n} value={n}>{n} hours</option>)}</select></label></div><div className="learn-path-list">{data.plan.map((p, i) => <article key={p.topic} className={`learn-path-item ${data.preferences.completed[p.topic] ? 'done' : ''}`}><div className="learn-step-number">{data.preferences.completed[p.topic] ? '✓' : String(i + 1).padStart(2, '0')}</div><div className="learn-step-copy"><div className="learn-eyebrow">WEEK {p.startWeek === p.week ? p.week : `${p.startWeek}–${p.week}`} · {p.hours}H · {p.activity}</div><h3>{p.title}</h3><p>{p.reason}</p>{p.prerequisites.length > 0 && <small>Build on: {p.prerequisites.map(id => catalog.topics.find(t => t.id === id)?.name).join(', ')}</small>}<a href={p.url} target="_blank" rel="noreferrer">Open learning material ↗</a></div><label className="learn-check"><input type="checkbox" checked={Boolean(data.preferences.completed[p.topic])} disabled={busy} onChange={e => updatePlan({ completed: { ...data.preferences.completed, [p.topic]: e.target.checked } })} /><span>Completed</span></label></article>)}</div>{saved && <p className="learn-good" role="status">{saved}</p>}<p className="learn-fine">Checking a step records completion; skill signals change only through assessments. Plans use curriculum rules and observed answers.</p></section>
          <div className="learn-grid"><section className="learn-card"><div className="learn-eyebrow">LEARN WITH OTHERS</div><h2>Courses for your direction</h2>{data.courses.length ? data.courses.map(c => <Link className="learn-recommendation" to="/courses" key={c.id}><h3>{c.title} ↗</h3><p>{c.reason}</p><small>{c.mentor_name}</small></Link>) : <div className="learn-empty"><span className="material-icons">school</span><p>No matching courses yet. Your learning material above is ready to use.</p><Link to="/courses">Explore courses →</Link></div>}</section><section className="learn-card"><div className="learn-eyebrow">A HUMAN PERSPECTIVE</div><h2>Mentors in your area</h2><Link to={preview ? '/preview/research-match' : '/research-match'}>Match by research interests →</Link>{data.mentors.length ? data.mentors.map(m => <Link className="learn-recommendation" to={`/u/${m.id}`} key={m.id}><h3>{m.name} ↗</h3><p>{m.reason}</p></Link>) : <div className="learn-empty"><span className="material-icons">groups</span><p>Matching mentors will appear as the community grows.</p><Link to="/community">Meet the community →</Link></div>}</section></div>
          <details className="learn-model"><summary>How your learning path adapts</summary><p>Recommendations use prerequisites, recent assessment results and distinct questions practised. They are curriculum rules, not a trained prediction model. Repeating a question does not establish mastery.</p><Link to="/help">Stuck on a topic? Ask Smart Help →</Link></details>
        </>}
        <footer className="learn-footer">Small steps. Real progress. <span>SkillNest learning studio</span></footer>
    </main></Layout>;
}
