import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import ParticleBackground from '../three/ParticleBackground';
import GoogleSignInButton from '../components/GoogleSignInButton';
import '../styles/auth.css';

export default function Signup() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirect = searchParams.get('redirect');
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState('learner');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    function handleAuthSuccess(data) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        if (redirect) { navigate(redirect); return; }
        // Every account starts as a learner (see authController.signup) —
        // picking "Teach Skills" here means "I'd like to apply," not an
        // instant mentor grant, so route to the application instead.
        navigate(role === 'mentor' ? '/become-mentor' : '/dashboard');
    }

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
            if (data.success) handleAuthSuccess(data);
            else setError(data.message);
        } catch (err) { setError('Unable to connect to server.'); }
        setLoading(false);
    }

    return (
        <div className="auth-page">
            <div className="auth-left">
                <form className="auth-form" onSubmit={handleSignup}>
                    <div className="auth-brand">Create your account</div>
                    {redirect && redirect.startsWith('/meeting') && (
                        <p style={{ color: '#A855F7', fontSize: 13, marginTop: -10, marginBottom: 14 }}>Sign up to join the session you were invited to.</p>
                    )}
                    <div className="input-group"><label>Full Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" /></div>
                    <div className="input-group"><label>Username</label><input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))} placeholder="e.g. bhavya.k or coder_123" /><span style={{ fontSize: '11px', color: '#555' }}>Lowercase, numbers, dots, underscores only</span></div>
                    <div className="input-group"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" /></div>
                    <div className="input-group">
                        <label>Password</label>
                        <div className="password-field">
                            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" />
                            <button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                <span className="material-icons">{showPassword ? 'visibility_off' : 'visibility'}</span>
                            </button>
                        </div>
                        <span style={{ fontSize: '11px', color: '#555' }}>Min 6 chars, must include a number</span>
                    </div>
                    <div className="input-group"><label>I want to</label><select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '13px 16px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', background: '#1c1c2e', color: 'white', fontSize: '15px' }}><option value="learner">Learn Skills</option><option value="mentor">Teach Skills</option></select></div>
                    {error && <div className="auth-error">{error}</div>}
                    <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Creating...' : 'Sign Up'}</button>
                    <div className="divider"><span>or</span></div>
                    <GoogleSignInButton onSuccess={handleAuthSuccess} onError={setError} />
                    <p className="bottom-text">Already have an account? <Link to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}>Log in</Link></p>
                </form>
            </div>
            <div className="auth-right">
                <ParticleBackground style={{ position: 'absolute' }} />
                <div className="auth-right-overlay"><h1>SkillNest</h1><p>Learn skills together with real mentors, in real-time, for free.</p></div>
            </div>
        </div>
    );
}
