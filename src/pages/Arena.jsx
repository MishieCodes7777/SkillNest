import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { getUserEmail, getUserData, saveUserData } from '../utils/auth';
import { trackActivity } from '../utils/missions';

export default function Arena() {
    const arenaKey = 'skillnest_arena_' + getUserEmail();
    const [level, setLevel] = useState('');
    const [skill, setSkill] = useState('');
    const [step, setStep] = useState('landing');
    const [questions, setQuestions] = useState([]);
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [score, setScore] = useState(0);

    const levels = [{ id: 'beginner', label: 'Beginner', desc: 'Basic concepts, fundamentals', time: '3-5 min' }, { id: 'intermediate', label: 'Intermediate', desc: 'Scenario-based, practical', time: '5-7 min' }, { id: 'expert', label: 'Expert', desc: 'Complex problem-solving', time: '8-10 min' }, { id: 'interview', label: 'Interview Ready', desc: 'Technical + behavioral', time: '10-12 min' }];
    const skills = ['React', 'Node.js', 'JavaScript', 'Python', 'DSA', 'SQL', 'System Design', 'OS', 'DBMS', 'CSS', 'TypeScript', 'ML'];

    async function enterArena() {
        if (!level || !skill) { alert('Select level and skill'); return; }
        setStep('loading');
        const numQ = level === 'beginner' ? 5 : level === 'intermediate' ? 7 : 8;
        try {
            const res = await fetch('/api/ai/interview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company: skill, topic: `Generate ${numQ} ${level} MCQ questions for ${skill}. Format as JSON: [{"question":"...","options":["A)...","B)...","C)...","D)..."],"correct":0,"topic":"..."}]` }) });
            const data = await res.json();
            if (data.success) {
                const text = data.response; const s = text.indexOf('['); const e = text.lastIndexOf(']') + 1;
                if (s !== -1 && e > s) { setQuestions(JSON.parse(text.substring(s, e))); setAnswers(new Array(numQ).fill(-1)); setStep('quiz'); setCurrent(0); return; }
            }
        } catch (e) { }
        alert('Could not generate quiz. Try again.'); setStep('landing');
    }

    function selectAnswer(idx) { const a = [...answers]; a[current] = idx; setAnswers(a); }
    function next() { if (answers[current] === -1) { alert('Select an answer'); return; } if (current < questions.length - 1) setCurrent(current + 1); else finish(); }

    function finish() {
        let correct = 0; questions.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
        const s = Math.round((correct / questions.length) * 100); setScore(s);
        const arena = JSON.parse(localStorage.getItem(arenaKey) || '{"history":[],"badges":[],"attempts":0}');
        arena.history.unshift({ skill, level, score: s, date: new Date().toLocaleDateString() }); arena.attempts++;
        if (s >= 50 && !arena.badges.includes('First Victory')) arena.badges.push('First Victory');
        if (s >= 80 && !arena.badges.includes('Problem Solver')) arena.badges.push('Problem Solver');
        if (arena.attempts >= 3 && !arena.badges.includes('Arena Challenger')) arena.badges.push('Arena Challenger');
        localStorage.setItem(arenaKey, JSON.stringify(arena));
        const ud = getUserData(); ud.activity.unshift({ text: `Scored ${s}% in ${skill} ${level} Arena`, time: 'Just now' }); if (!ud.skills.includes(skill)) ud.skills.push(skill); saveUserData(ud);
        trackActivity('arena_completed');
        setStep('results');
    }

    return (
        <AppLayout>
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 30px 40px' }}>
                {step === 'landing' && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: 35, paddingLeft: 55 }}><h1 style={{ fontSize: 26, color: '#A855F7' }}>Skill Arena</h1><p style={{ color: '#8892b0', fontSize: 14 }}>Challenge yourself, discover strengths, level up</p></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 25 }}>
                            {levels.map(l => <div key={l.id} onClick={() => setLevel(l.id)} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${level === l.id ? '#A855F7' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: 20, cursor: 'pointer', transition: '0.3s' }}><h3 style={{ fontSize: 15, marginBottom: 4 }}>{l.label}</h3><p style={{ fontSize: 12, color: '#8892b0' }}>{l.desc}</p><span style={{ fontSize: 11, color: '#555' }}>{l.time}</span></div>)}
                        </div>
                        <div style={{ marginBottom: 25 }}><h3 style={{ fontSize: 15, marginBottom: 10 }}>Choose skill:</h3><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{skills.map(s => <button key={s} onClick={() => setSkill(s)} style={{ padding: '8px 16px', background: skill === s ? 'linear-gradient(45deg,#FF4FA3,#A855F7)' : 'rgba(255,255,255,0.03)', border: `1px solid ${skill === s ? 'transparent' : 'rgba(255,255,255,0.08)'}`, borderRadius: 20, color: 'white', fontSize: 13, cursor: 'pointer' }}>{s}</button>)}</div></div>
                        <button onClick={enterArena} disabled={!level || !skill} style={{ display: 'block', margin: '0 auto', padding: '14px 40px', background: 'linear-gradient(45deg,#FF4FA3,#A855F7)', border: 'none', borderRadius: 10, color: 'white', fontSize: 16, fontWeight: 600, cursor: 'pointer', opacity: level && skill ? 1 : 0.4 }}>Enter Arena</button>
                    </>
                )}
                {step === 'loading' && <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>AI is generating your challenge...</div>}
                {step === 'quiz' && questions[current] && (
                    <div>
                        <div style={{ marginBottom: 15, display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 10 }}><div style={{ height: '100%', width: ((current / questions.length) * 100) + '%', background: 'linear-gradient(90deg,#FF4FA3,#A855F7)', borderRadius: 10, transition: 'width 0.3s' }} /></div><span style={{ fontSize: 13, color: '#888' }}>{current + 1}/{questions.length}</span></div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 28 }}>
                            <p style={{ fontSize: 11, color: '#A855F7', fontWeight: 600, marginBottom: 10 }}>{skill} - {level}</p>
                            <p style={{ fontSize: 17, marginBottom: 20, lineHeight: 1.6 }}>{questions[current].question}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {questions[current].options.map((opt, i) => <div key={i} onClick={() => selectAnswer(i)} style={{ padding: 14, background: answers[current] === i ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${answers[current] === i ? '#A855F7' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, cursor: 'pointer', fontSize: 14 }}>{opt}</div>)}
                            </div>
                            <button onClick={next} style={{ float: 'right', marginTop: 15, padding: '10px 24px', background: 'linear-gradient(45deg,#FF4FA3,#A855F7)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 600, cursor: 'pointer' }}>{current < questions.length - 1 ? 'Next' : 'Finish'}</button>
                        </div>
                    </div>
                )}
                {step === 'results' && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: 120, height: 120, borderRadius: '50%', border: `4px solid ${score >= 70 ? '#34c759' : score >= 40 ? '#f5a623' : '#ff4d4d'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', fontSize: 32, fontWeight: 'bold', color: score >= 70 ? '#34c759' : score >= 40 ? '#f5a623' : '#ff4d4d' }}>{score}%</div>
                        <h2 style={{ marginBottom: 8 }}>{score >= 70 ? 'Great Job!' : score >= 40 ? 'Good Effort' : 'Keep Practicing'}</h2>
                        <p style={{ color: '#888', marginBottom: 25 }}>{skill} | {level}</p>
                        <button onClick={() => { setStep('landing'); setLevel(''); setSkill(''); }} style={{ padding: '12px 28px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', cursor: 'pointer' }}>Challenge Again</button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
