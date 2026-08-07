import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import InvitePanel from '../components/InvitePanel';
import { getCurrentUser, getUserData, saveUserData } from '../utils/auth';
import '../styles/sessions.css';

export default function Sessions() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const [code, setCode] = useState('');
    const [mentors, setMentors] = useState([]);
    const [stats, setStats] = useState({ learners: 0, mentors: 0 });
    const [createdCode, setCreatedCode] = useState(null);

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
        if (!code) { alert('Enter a session code'); return; }
        const d = getUserData(); d.sessions++; d.activity.unshift({ text: 'Joined session: ' + code, time: 'Just now' }); saveUserData(d);
        navigate(`/meeting?meet=${code}`);
    }

    function createSession() {
        const c = generateCode();
        const d = getUserData(); d.sessions++; d.activity.unshift({ text: 'Created session: ' + c, time: 'Just now' }); saveUserData(d);
        setCreatedCode(c);
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
                            <p style={{ fontSize: 13, color: '#8892b0', margin: '-6px 0 4px' }}>You'll join as {user?.name || 'yourself'}</p>
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

                {createdCode && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setCreatedCode(null)}>
                        <div style={{ background: '#0d1025', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, width: 440, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 25px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <h3 style={{ fontSize: 17 }}>Session Created</h3>
                                <button onClick={() => setCreatedCode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><span className="material-icons" style={{ color: '#888', fontSize: 22 }}>close</span></button>
                            </div>
                            <div style={{ padding: 22 }}>
                                <p style={{ color: '#8892b0', fontSize: 13, marginBottom: 16 }}>Share the link below or invite people directly. You can also just enter now and invite people once you're in.</p>
                                <InvitePanel meetCode={createdCode} />
                                <button onClick={() => navigate(`/meeting?meet=${createdCode}`)} style={{ width: '100%', marginTop: 18, padding: 13, background: 'linear-gradient(45deg,#FF4FA3,#A855F7)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 600, cursor: 'pointer' }}>Enter Meeting Room</button>
                            </div>
                        </div>
                    </div>
                )}

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
