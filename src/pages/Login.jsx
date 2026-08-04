import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ParticleBackground from '../three/ParticleBackground';
import '../styles/auth.css';

export default function Login() {
    const navigate = useNavigate();
    const [role, setRole] = useState('learner');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin(e) {
        e.preventDefault();
        if (!email || !password) { setError('Please enter both email and password.'); return; }
        if (!email.includes('@')) { setError('Please enter a valid email.'); return; }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                // If user selected "Teach Skills" but doesn't have mentor role, add it
                const userRoles = data.user.roles || [data.user.role];
                if (role === 'mentor' && !userRoles.includes('mentor')) {
                    // Add mentor role to their account
                    fetch('/api/auth/add-role', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + data.token },
                        body: JSON.stringify({ role: 'mentor' })
                    }).then(r => r.json()).then(d => {
                        if (d.success) {
                            const updated = { ...data.user, roles: d.roles, role: 'mentor' };
                            localStorage.setItem('currentUser', JSON.stringify(updated));
                            localStorage.setItem('skillnest_has_mentor_role', 'true');
                        }
                        navigate('/mentor/dashboard');
                    }).catch(() => navigate('/mentor/dashboard'));
                } else if (role === 'mentor' || userRoles.includes('mentor')) {
                    localStorage.setItem('skillnest_has_mentor_role', 'true');
                    navigate('/mentor/dashboard');
                } else {
                    navigate('/dashboard');
                }
            } else {
                setError(data.message || 'Invalid email or password.');
            }
        } catch (err) {
            setError('Unable to connect to server.');
        }
        setLoading(false);
    }

    return (
        <div className="auth-page">
            <div className="auth-left">
                <form className="auth-form" onSubmit={handleLogin}>
                    <div className="auth-brand">Learn. Teach. Grow.</div>

                    <div className="role-toggle">
                        <button type="button" className={role === 'learner' ? 'active' : ''} onClick={() => setRole('learner')}>Learn Skills</button>
                        <button type="button" className={role === 'mentor' ? 'active' : ''} onClick={() => setRole('mentor')}>Teach Skills</button>
                    </div>

                    <div className="input-group">
                        <label>Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
                    </div>

                    <div className="forgot-row">
                        <Link to="/forgot-password">Forgot password?</Link>
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Logging in...' : 'Log In'}
                    </button>

                    <div className="divider"><span>or</span></div>

                    <button type="button" className="google-btn" onClick={() => alert('Google Sign-In coming soon')}>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" />
                        Continue with Google
                    </button>

                    <p className="bottom-text">Don't have an account? <Link to="/signup">Sign up for free</Link></p>
                </form>
            </div>
            <div className="auth-right">
                <ParticleBackground style={{ position: 'absolute' }} />
                <div className="auth-right-overlay">
                    <h1>SkillNest</h1>
                    <p>Learn skills together with real mentors, in real-time, for free.</p>
                </div>
            </div>
        </div>
    );
}
