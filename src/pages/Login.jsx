import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import ParticleBackground from '../three/ParticleBackground';
import GoogleSignInButton from '../components/GoogleSignInButton';
import '../styles/auth.css';

export default function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirect = searchParams.get('redirect');
    const [role, setRole] = useState('learner');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    function handleAuthSuccess(data) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        if (redirect) {
            // Someone came from a specific link (e.g. a meeting invite) —
            // honor that over the default role-based landing page.
            navigate(redirect);
            return;
        }
        const userRoles = data.user.roles || [data.user.role];
        if (userRoles.includes('mentor')) {
            localStorage.setItem('skillnest_has_mentor_role', 'true');
            navigate('/mentor/dashboard');
        } else if (role === 'mentor') {
            // Not a verified mentor yet — send them to apply instead of
            // granting the role on the spot.
            navigate('/become-mentor');
        } else {
            navigate('/dashboard');
        }
    }

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
            if (data.success) handleAuthSuccess(data);
            else setError(data.message || 'Invalid email or password.');
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
                    {redirect && redirect.startsWith('/meeting') && (
                        <p style={{ color: '#A855F7', fontSize: 13, marginTop: -10, marginBottom: 14 }}>Log in to join the session you were invited to.</p>
                    )}

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
                        <div className="password-field">
                            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
                            <button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                <span className="material-icons">{showPassword ? 'visibility_off' : 'visibility'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="forgot-row">
                        <Link to="/forgot-password">Forgot password?</Link>
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Logging in...' : 'Log In'}
                    </button>

                    <div className="divider"><span>or</span></div>

                    <GoogleSignInButton onSuccess={handleAuthSuccess} onError={setError} />

                    <p className="bottom-text">Don't have an account? <Link to={redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup'}>Sign up for free</Link></p>
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
