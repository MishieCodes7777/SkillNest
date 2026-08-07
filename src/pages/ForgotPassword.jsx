import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ParticleBackground from '../three/ParticleBackground';
import '../styles/auth.css';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function submit(e) {
        e.preventDefault();
        if (!email.includes('@')) { setError('Please enter a valid email.'); return; }
        setLoading(true); setError('');
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, origin: window.location.origin }),
            });
            const data = await res.json();
            setSent(true);
        } catch (err) {
            setError('Unable to connect to server.');
        }
        setLoading(false);
    }

    return (
        <div className="auth-page">
            <div className="auth-left">
                <form className="auth-form" onSubmit={submit}>
                    <div className="auth-brand">Reset your password</div>

                    {sent ? (
                        <>
                            <p style={{ color: '#ccc', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                                If an account exists for <strong>{email}</strong>, we've sent a link to reset your password. Check your inbox (and spam folder) — it expires in 1 hour.
                            </p>
                            <p className="bottom-text"><Link to="/login">Back to login</Link></p>
                        </>
                    ) : (
                        <>
                            <p style={{ color: '#8892b0', fontSize: 14, marginBottom: 20 }}>Enter the email on your account and we'll send you a reset link.</p>
                            <div className="input-group">
                                <label>Email</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" />
                            </div>
                            {error && <div className="auth-error">{error}</div>}
                            <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
                            <p className="bottom-text"><Link to="/login">Back to login</Link></p>
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
