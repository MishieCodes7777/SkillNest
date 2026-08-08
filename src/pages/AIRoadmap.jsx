import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { getUserEmail } from '../utils/auth';

export default function AIRoadmap() {
    const histKey = 'skillnest_roadmap_history_' + getUserEmail();
    const progKey = 'skillnest_roadmap_progress_' + getUserEmail();
    const [step, setStep] = useState('form');
    const [skills, setSkills] = useState('');
    const [goal, setGoal] = useState('');
    const [hours, setHours] = useState('10');
    const [roadmap, setRoadmap] = useState(null);
    const [history, setHistory] = useState(JSON.parse(localStorage.getItem(histKey) || '[]'));
    const [progress, setProgress] = useState(JSON.parse(localStorage.getItem(progKey) || '{}'));
    const [expanded, setExpanded] = useState(null);

    useEffect(() => { if (history.length > 0) { setRoadmap(history[0]); setStep('result'); } }, []);

    async function generate() {
        if (!skills || !goal) { alert('Fill in your skills and goal'); return; }
        setStep('loading');
        let weeks;
        try {
            const res = await fetch('/api/ai/roadmap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                body: JSON.stringify({ skills, goal, hours }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            weeks = data.weeks;
        } catch (e) {
            // AI unavailable — fall back to the rule-based generator rather than a dead end
            weeks = createRoadmap(skills.toLowerCase(), goal.toLowerCase(), hours);
        }
        const entry = { id: Date.now(), skills, goal, hours, weeks, date: new Date().toLocaleDateString() };
        const updated = [entry, ...history].slice(0, 10);
        localStorage.setItem(histKey, JSON.stringify(updated));
        setHistory(updated);
        setRoadmap(entry);
        setStep('result');
    }

    function toggleTask(weekIdx, dayIdx) {
        const key = `w${weekIdx}_d${dayIdx}`;
        const updated = { ...progress, [key]: !progress[key] };
        setProgress(updated);
        localStorage.setItem(progKey, JSON.stringify(updated));
    }

    const totalTasks = roadmap ? roadmap.weeks.length * 5 : 0;
    const completed = Object.values(progress).filter(Boolean).length;
    const pct = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    return (
        <AppLayout>
            <div style={{ maxWidth: 850, margin: '0 auto', padding: '60px 30px 40px' }}>
                <div style={{ textAlign: 'center', marginBottom: 30, paddingLeft: 55 }}>
                    <h1 style={{ fontSize: 24, background: 'linear-gradient(45deg,#FF4FA3,#A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI Learning Roadmap</h1>
                    <p style={{ color: '#8892b0', fontSize: 14 }}>Tell us what you want to learn and we'll create a personalized plan</p>
                </div>

                {step === 'form' && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 30 }}>
                        <InputField label="Your current skills" value={skills} onChange={setSkills} placeholder="e.g. HTML, CSS, basic JavaScript" />
                        <InputField label="What do you want to learn?" value={goal} onChange={setGoal} placeholder="e.g. Full Stack, Data Science, AI/ML" />
                        <div style={{ marginBottom: 16 }}><label style={{ color: '#aaa', fontSize: 13, display: 'block', marginBottom: 6 }}>Hours per week</label><select value={hours} onChange={e => setHours(e.target.value)} style={{ width: '100%', padding: 12, background: '#1c1c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: 14 }}><option value="5">5 hrs (casual)</option><option value="10">10 hrs (moderate)</option><option value="15">15 hrs (dedicated)</option><option value="20">20+ hrs (intensive)</option></select></div>
                        <button onClick={generate} style={{ width: '100%', padding: 14, background: 'linear-gradient(45deg,#FF4FA3,#A855F7)', border: 'none', borderRadius: 10, color: 'white', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Generate My Roadmap</button>
                    </div>
                )}

                {step === 'loading' && <div style={{ textAlign: 'center', padding: 50, color: '#888' }}>Generating your roadmap...</div>}

                {step === 'result' && roadmap && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}><h2 style={{ fontSize: 20 }}>Your Roadmap</h2><p style={{ color: '#888', fontSize: 13 }}>From "{roadmap.skills}" to "{roadmap.goal}" in {roadmap.weeks.length} weeks</p></div>

                        {roadmap.weeks.map((w, wi) => (
                            <div key={wi} onClick={() => setExpanded(expanded === wi ? null : wi)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '4px solid #A855F7', borderRadius: 12, padding: 20, marginBottom: 12, cursor: 'pointer' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: '#FF4FA3', fontWeight: 600 }}>WEEK {w.week}</span><span style={{ fontSize: 12, color: '#555' }}>{w.hours} hrs</span></div>
                                <h3 style={{ fontSize: 16, margin: '6px 0' }}>{w.title}</h3>
                                <p style={{ fontSize: 13, color: '#8892b0' }}>{w.desc}</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{w.topics.map(t => <span key={t} style={{ background: 'rgba(168,85,247,0.15)', color: '#c4a5ff', padding: '3px 10px', borderRadius: 12, fontSize: 12 }}>{t}</span>)}</div>

                                {expanded === wi && (
                                    <div style={{ marginTop: 15, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }} onClick={e => e.stopPropagation()}>
                                        <p style={{ fontSize: 12, color: '#A855F7', fontWeight: 600, marginBottom: 8 }}>DAILY TASKS</p>
                                        {generateTasks(w).map((task, di) => {
                                            const checked = progress[`w${wi}_d${di}`];
                                            return <label key={di} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 14, color: checked ? '#555' : '#ccc', textDecoration: checked ? 'line-through' : 'none', cursor: 'pointer' }}><input type="checkbox" checked={!!checked} onChange={() => toggleTask(wi, di)} style={{ accentColor: '#A855F7' }} /><span style={{ color: '#FF4FA3', fontWeight: 600, minWidth: 45 }}>Day {di + 1}:</span>{task}</label>;
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}

                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                            <h4 style={{ marginBottom: 10, color: '#ccc' }}>Progress</h4>
                            <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}><div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg,#FF4FA3,#A855F7)', borderRadius: 10, transition: 'width 0.5s' }} /></div>
                            <p style={{ fontSize: 13, color: '#888', marginTop: 8 }}>{completed}/{totalTasks} tasks ({pct}%)</p>
                        </div>

                        <button onClick={() => { setStep('form'); setRoadmap(null); }} style={{ display: 'block', margin: '20px auto', padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', cursor: 'pointer' }}>+ Generate New Roadmap</button>

                        {history.length > 1 && (
                            <div style={{ marginTop: 20 }}><h3 style={{ fontSize: 15, marginBottom: 12, color: '#ccc' }}>Previous Roadmaps</h3>
                                {history.slice(1).map(h => <div key={h.id} onClick={() => { setRoadmap(h); }} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14, marginBottom: 8, cursor: 'pointer' }}><strong style={{ fontSize: 14 }}>{h.goal}</strong><p style={{ fontSize: 12, color: '#888' }}>{h.skills} | {h.weeks.length} weeks | {h.date}</p></div>)}
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}

function InputField({ label, value, onChange, placeholder }) {
    return <div style={{ marginBottom: 16 }}><label style={{ color: '#aaa', fontSize: 13, display: 'block', marginBottom: 6 }}>{label}</label><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: '100%', padding: 12, background: '#1c1c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: 14 }} /></div>;
}

function generateTasks(week) { return week.topics.slice(0, 5).map((t, i) => ['Study ' + t, 'Practice ' + t, 'Build with ' + t, 'Review ' + t, 'Solve problems on ' + t][i]); }

function createRoadmap(skills, goal, hours) {
    const weeks = [];
    let n = 1;
    if (goal.includes('full stack') || goal.includes('web')) {
        if (!skills.includes('javascript')) weeks.push({ week: n++, title: 'JavaScript Essentials', desc: 'Variables, functions, arrays, DOM', topics: ['ES6+', 'DOM', 'Events', 'Arrays', 'Objects'], hours });
        weeks.push({ week: n++, title: 'Advanced JavaScript', desc: 'Async/await, closures, prototypes', topics: ['Async/Await', 'Promises', 'Closures', 'Fetch', 'Modules'], hours });
        if (!skills.includes('react')) { weeks.push({ week: n++, title: 'React Fundamentals', desc: 'Components, JSX, state, props', topics: ['JSX', 'Components', 'Props', 'State', 'Hooks'], hours }); weeks.push({ week: n++, title: 'React Advanced', desc: 'Routing, context, projects', topics: ['Router', 'Context', 'Custom Hooks', 'API calls', 'Project'], hours }); }
        weeks.push({ week: n++, title: 'Node.js & Express', desc: 'Server, REST APIs, middleware', topics: ['Node.js', 'Express', 'REST', 'Middleware', 'CRUD'], hours });
        weeks.push({ week: n++, title: 'Database', desc: 'PostgreSQL, queries, ORM', topics: ['PostgreSQL', 'SQL', 'Joins', 'Migrations', 'Prisma'], hours });
        weeks.push({ week: n++, title: 'Auth & Security', desc: 'JWT, bcrypt, sessions', topics: ['JWT', 'bcrypt', 'OAuth', 'Sessions', 'CORS'], hours });
        weeks.push({ week: n++, title: 'Full Stack Project', desc: 'Build and deploy', topics: ['Integration', 'Deploy', 'Vercel', 'Git', 'Testing'], hours });
    } else if (goal.includes('data') || goal.includes('ml') || goal.includes('ai')) {
        if (!skills.includes('python')) weeks.push({ week: n++, title: 'Python', desc: 'Basics, data types, functions', topics: ['Python', 'Lists', 'Functions', 'OOP', 'Modules'], hours });
        weeks.push({ week: n++, title: 'NumPy & Pandas', desc: 'Data manipulation', topics: ['NumPy', 'Pandas', 'DataFrames', 'Cleaning', 'EDA'], hours });
        weeks.push({ week: n++, title: 'Visualization', desc: 'Charts and plots', topics: ['Matplotlib', 'Seaborn', 'Plotly', 'Dashboards', 'EDA'], hours });
        weeks.push({ week: n++, title: 'ML Basics', desc: 'Scikit-learn, regression', topics: ['Scikit-learn', 'Regression', 'Classification', 'Evaluation', 'Features'], hours });
        weeks.push({ week: n++, title: 'Advanced ML', desc: 'Trees, boosting, neural nets', topics: ['Random Forest', 'XGBoost', 'Neural Nets', 'Deep Learning', 'Projects'], hours });
    } else {
        weeks.push({ week: n++, title: 'Foundations', desc: 'Core concepts', topics: ['Basics', 'Syntax', 'Practice', 'Projects', 'Review'], hours });
        weeks.push({ week: n++, title: 'Intermediate', desc: 'Build skills', topics: ['Patterns', 'Problems', 'Projects', 'Debug', 'Optimize'], hours });
        weeks.push({ week: n++, title: 'Advanced', desc: 'Master concepts', topics: ['Advanced', 'Architecture', 'Performance', 'Testing', 'Deploy'], hours });
    }
    return weeks;
}
