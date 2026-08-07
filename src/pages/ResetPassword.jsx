import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ParticleBackground from '../three/ParticleBackground';
import '../styles/auth.css';

export default function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [checking, setChecking] = useState(true);
    const [valid, setValid] = useState(false);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch(`/api/auth/reset-password/${token}/valid`).then(r => r.json())
            .then(d => setValid(!!d.valid))
            .catch(() => setValid(false))
            .finally(() => setChecking(false));
    }, [token]);

    async function submit(e) {
        e.preventDefault();
        if (password.length < 6 || !/\d/.test(password)) { setError('Password must be at least 6 characters and contain a number.'); return; }
        if (password !== confirm) { setError('Passwords do not match.'); return; }
        setLoading(true); setError('');
        try {
            const res = await fetch(`/api/auth/reset-password/${token}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (data.success) setDone(true);
            else setError(data.message || 'Could not reset password.');
        } catch (err) { setError('Unable to connect to server.'); }
        setLoading(false);
    }

    return (
        <div className="auth-page">
            <div className="auth-left">
                <form className="auth-form" onSubmit={submit}>
                    <div className="auth-brand">Choose a new password</div>

                    {checking && <p style={{ color: '#8892b0', fontSize: 14 }}>Checking your link...</p>}

                    {!checking && !valid && !done && (
                        <>
                            <p style={{ color: '#ff8080', fontSize: 14, marginBottom: 20 }}>This reset link is invalid or has expired.</p>
                            <p className="bottom-text"><Link to="/forgot-password">Request a new link</Link></p>
                        </>
                    )}

                    {!checking && valid && !done && (
                        <>
                            <div className="input-group">
                                <label>New Password</label>
                                <div className="password-field">
                                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a new password" />
                                    <button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                        <span className="material-icons">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                                <span style={{ fontSize: 11, color: '#555' }}>Min 6 chars, must include a number</span>
                            </div>
                            <div className="input-group">
                                <label>Confirm Password</label>
                                <input type={showPassword ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter the new password" />
                            </div>
                            {error && <div className="auth-error">{error}</div>}
                            <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Saving...' : 'Reset Password'}</button>
                        </>
                    )}

                    {done && (
                        <>
                            <p style={{ color: '#34c759', fontSize: 14, marginBottom: 20 }}>Your password has been updated.</p>
                            <button type="button" className="submit-btn" onClick={() => navigate('/login')}>Log In</button>
                        </>
                    )}
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
