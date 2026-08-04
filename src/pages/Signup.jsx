import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ParticleBackground from '../three/ParticleBackground';
import '../styles/auth.css';

export default function Signup() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('learner');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSignup(e) {
        e.preventDefault();
        if (!name || !username || !email || !password) { setError('Please fill all fields.'); return; }
        if (username.length < 3) { setError('Username must be at least 3 characters.'); return; }
        if (!/^[a-z0-9._]+$/.test(username)) { setError('Username: only lowercase letters, numbers, dots, underscores.'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        if (!/\d/.test(password)) { setError('Password must contain a number.'); return; }

        setLoading(true); setError('');
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, username, email, password, role }),
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                navigate('/dashboard');
            } else { setError(data.message); }
        } catch (err) { setError('Unable to connect to server.'); }
        setLoading(false);
    }

    return (
        <div className="auth-page">
            <div className="auth-left">
                <form className="auth-form" onSubmit={handleSignup}>
                    <div className="auth-brand">Create your account</div>
                    <div className="input-group"><label>Full Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" /></div>
                    <div className="input-group"><label>Username</label><input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))} placeholder="e.g. bhavya.k or coder_123" /><span style={{ fontSize: '11px', color: '#555' }}>Lowercase, numbers, dots, underscores only</span></div>
                    <div className="input-group"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" /></div>
                    <div className="input-group"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" /><span style={{ fontSize: '11px', color: '#555' }}>Min 6 chars, must include a number</span></div>
                    <div className="input-group"><label>I want to</label><select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '13px 16px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', background: '#1c1c2e', color: 'white', fontSize: '15px' }}><option value="learner">Learn Skills</option><option value="mentor">Teach Skills</option></select></div>
                    {error && <div className="auth-error">{error}</div>}
                    <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Creating...' : 'Sign Up'}</button>
                    <div className="divider"><span>or</span></div>
                    <button type="button" className="google-btn" onClick={() => alert('Coming soon')}><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" />Continue with Google</button>
                    <p className="bottom-text">Already have an account? <Link to="/login">Log in</Link></p>
                </form>
            </div>
            <div className="auth-right">
                <ParticleBackground style={{ position: 'absolute' }} />
                <div className="auth-right-overlay"><h1>SkillNest</h1><p>Learn skills together with real mentors, in real-time, for free.</p></div>
            </div>
        </div>
    );
}
