import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { getCurrentUser } from '../utils/auth';

function authHeaders(extra) {
    return { 'Authorization': 'Bearer ' + localStorage.getItem('token'), ...extra };
}

export default function BecomeMentor() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [application, setApplication] = useState(null);
    const [motivation, setMotivation] = useState('');
    const [skills, setSkills] = useState('');
    const [experience, setExperience] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { checkStatus(); }, []);

    async function checkStatus() {
        setLoading(true);
        try {
            const res = await fetch('/api/mentor-applications/me', { headers: authHeaders() });
            const data = await res.json();
            if (data.success) {
                setApplication(data.application);
                if (data.application?.status === 'approved') syncApprovedRole();
            }
        } catch (e) { }
        setLoading(false);
    }

    // If the account was just approved, refresh the locally-cached role so the
    // mentor portal unlocks without needing to log out and back in.
    async function syncApprovedRole() {
        try {
            const res = await fetch('/api/auth/me', { headers: authHeaders() });
            const data = await res.json();
            if (data.success) {
                const current = getCurrentUser() || {};
                localStorage.setItem('currentUser', JSON.stringify({ ...current, role: data.user.role, roles: data.user.roles, username: data.user.username }));
                localStorage.setItem('skillnest_has_mentor_role', 'true');
            }
        } catch (e) { }
    }

    async function submit() {
        if (!motivation.trim()) { setError("Tell us why you'd like to become a mentor."); return; }
        setSubmitting(true); setError('');
        try {
            const res = await fetch('/api/mentor-applications', {
                method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ motivation: motivation.trim(), skills: skills.trim(), experience: experience.trim() }),
            });
            const data = await res.json();
            if (data.success) { setApplication(data.application); }
            else { setError(data.message || 'Could not submit application.'); }
        } catch (e) { setError('Could not connect to the server.'); }
        setSubmitting(false);
    }

    const box = { maxWidth: 640, margin: '0 auto', padding: '60px 24px 60px' };
    const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 30 };
    const input = { width: '100%', padding: 12, background: '#1c1c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: 14, fontFamily: 'inherit' };

    if (loading) return <AppLayout><div style={{ textAlign: 'center', padding: 80, color: '#8892b0' }}>Loading...</div></AppLayout>;

    return (
        <AppLayout>
            <div style={box}>
                <div style={{ textAlign: 'center', marginBottom: 26, paddingLeft: 55 }}>
                    <h1 style={{ fontSize: 24, marginBottom: 6 }}>Become a Mentor</h1>
                    <p style={{ color: '#8892b0', fontSize: 14 }}>A short application, reviewed by the SkillNest team — this keeps the mentor side of the site trustworthy for everyone learning here.</p>
                </div>

                {application?.status === 'approved' && (
                    <div style={card}>
                        <h3 style={{ marginBottom: 10, color: '#34c759' }}>You're a verified mentor!</h3>
                        <p style={{ color: '#ccc', fontSize: 14, marginBottom: 20 }}>Your application was approved. Head over to your mentor dashboard to set up your profile and create your first course.</p>
                        <button onClick={() => navigate('/mentor/dashboard')} style={{ padding: '12px 22px', background: 'linear-gradient(45deg,#FF4FA3,#A855F7)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 600, cursor: 'pointer' }}>Go to Mentor Dashboard</button>
                    </div>
                )}

                {application?.status === 'pending' && (
                    <div style={card}>
                        <h3 style={{ marginBottom: 10, color: '#f5a623' }}>Application under review</h3>
                        <p style={{ color: '#ccc', fontSize: 14 }}>Thanks for applying! We'll review what you shared and let your account know once it's decided. No need to resubmit.</p>
                    </div>
                )}

                {application?.status === 'rejected' && (
                    <>
                        <div style={{ ...card, marginBottom: 18, borderColor: 'rgba(255,77,77,0.3)' }}>
                            <p style={{ color: '#ff8080', fontSize: 14 }}>Your last application wasn't approved. You're welcome to submit a new one below.</p>
                        </div>
                        <ApplicationForm {...{ card, input, motivation, setMotivation, skills, setSkills, experience, setExperience, error, submit, submitting }} />
                    </>
                )}

                {!application && (
                    <ApplicationForm {...{ card, input, motivation, setMotivation, skills, setSkills, experience, setExperience, error, submit, submitting }} />
                )}
            </div>
        </AppLayout>
    );
}

function ApplicationForm({ card, input, motivation, setMotivation, skills, setSkills, experience, setExperience, error, submit, submitting }) {
    return (
        <div style={card}>
            <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#aaa', fontSize: 13, display: 'block', marginBottom: 6 }}>Why do you want to mentor on SkillNest?</label>
                <textarea value={motivation} onChange={e => setMotivation(e.target.value)} placeholder="What draws you to teaching, and what kind of learners do you want to help?" style={{ ...input, minHeight: 100, resize: 'vertical' }} maxLength={2000} />
            </div>
            <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#aaa', fontSize: 13, display: 'block', marginBottom: 6 }}>What could you teach?</label>
                <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="e.g. React, Python, System Design" style={input} maxLength={500} />
            </div>
            <div style={{ marginBottom: 20 }}>
                <label style={{ color: '#aaa', fontSize: 13, display: 'block', marginBottom: 6 }}>Relevant experience (optional)</label>
                <textarea value={experience} onChange={e => setExperience(e.target.value)} placeholder="Work experience, projects, prior teaching — whatever's relevant" style={{ ...input, minHeight: 70, resize: 'vertical' }} maxLength={2000} />
            </div>
            {error && <p style={{ color: '#ff8080', fontSize: 13, marginBottom: 14 }}>{error}</p>}
            <button onClick={submit} disabled={submitting} style={{ width: '100%', padding: 14, background: 'linear-gradient(45deg,#FF4FA3,#A855F7)', border: 'none', borderRadius: 10, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>{submitting ? 'Submitting...' : 'Submit Application'}</button>
        </div>
    );
}
