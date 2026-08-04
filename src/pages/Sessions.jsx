import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { getCurrentUser, getUserData, saveUserData } from '../utils/auth';
import '../styles/sessions.css';

export default function Sessions() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const [name, setName] = useState(user?.name || '');
    const [code, setCode] = useState('');
    const [mentors, setMentors] = useState([]);
    const [stats, setStats] = useState({ learners: 0, mentors: 0 });

    useEffect(() => {
        fetch('/api/auth/stats').then(r => r.json()).then(d => { if (d.success) setStats(d); }).catch(() => { });
        fetch('/api/auth/mentors').then(r => r.json()).then(d => { if (d.success) setMentors(d.mentors || []); }).catch(() => { });
    }, []);

    function generateCode() {
        const c = 'abcdefghijklmnopqrstuvwxyz';
        const p = () => Array.from({ length: 3 }, () => c[Math.floor(Math.random() * c.length)]).join('');
        return `${p()}-${p()}-${p()}`;
    }

    function joinSession() {
        if (!name || !code) { alert('Enter name and session code'); return; }
        const d = getUserData(); d.sessions++; d.activity.unshift({ text: 'Joined session: ' + code, time: 'Just now' }); saveUserData(d);
        navigate(`/meeting?meet=${code}&user=${name}`);
    }

    function createSession() {
        if (!name) { alert('Enter your name'); return; }
        const c = generateCode();
        const d = getUserData(); d.sessions++; d.activity.unshift({ text: 'Created session: ' + c, time: 'Just now' }); saveUserData(d);
        navigate(`/meeting?meet=${c}&user=${name}`);
    }

    return (
        <AppLayout>
            <div className="sessions-container">
                <div className="sess-hero">
                    <div className="sess-left">
                        <h1>Welcome Back, <span>{user?.name || 'Learner'}</span></h1>
                        <p>Discover live sessions, connect with mentors, and grow your skills in real-time.</p>
                        <div className="quick-stats">
                            <div className="qs"><div className="qs-val">{getUserData().sessions}</div><div className="qs-label">Your Sessions</div></div>
                            <div className="qs"><div className="qs-val">{stats.mentors}</div><div className="qs-label">Mentors</div></div>
                            <div className="qs"><div className="qs-val">{stats.learners}</div><div className="qs-label">Learners</div></div>
                            <div className="qs"><div className="qs-val">12</div><div className="qs-label">Communities</div></div>
                        </div>
                    </div>
                    <div className="sess-center">
                        <div className="join-card">
                            <h2>Join a Session</h2>
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" />
                            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Session Code" />
                            <div className="jc-btns">
                                <button className="jc-primary" onClick={joinSession}>Join Session</button>
                                <button className="jc-secondary" onClick={createSession}>Create Session</button>
                            </div>
                            <div className="sec-badges">
                                <span><span className="material-icons">lock</span> Authenticated</span>
                                <span><span className="material-icons">shield</span> Secure</span>
                                <span><span className="material-icons">verified_user</span> Verified</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="sess-globe">
                    <img src="/globe.png" alt="Technologies" />
                </div>

                {mentors.length > 0 && (
                    <div className="sess-section">
                        <h2><span className="material-icons">people</span> Registered Mentors</h2>
                        <div className="mentors-grid">
                            {mentors.map((m, i) => (
                                <div className="mentor-card" key={i}>
                                    <div className="mc-avatar">{m.name.charAt(0).toUpperCase()}</div>
                                    <h4>{m.name}</h4>
                                    <p>{m.role}</p>
                                    <button className="mc-follow">Follow</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="sess-section">
                    <h2><span className="material-icons">groups</span> Popular Communities</h2>
                    <div className="communities">
                        {['React.js', 'Node.js', 'Python', 'AI / ML', 'Cloud Computing', 'DevOps', 'DSA', 'Cyber Security', 'Mobile Dev', 'UI/UX Design', 'Blockchain', 'Game Dev'].map(c => (
                            <div className="comm-tag" key={c}>{c}</div>
                        ))}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
