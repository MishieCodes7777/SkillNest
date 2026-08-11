import React, { useEffect, useState } from 'react';

function authHeaders(extra) {
    return { 'Authorization': 'Bearer ' + localStorage.getItem('token'), ...extra };
}

// Renders the right action for my relationship with `userId`: Connect, a
// pending state, Accept/Decline for an incoming request, or Connected.
export default function FollowButton({ userId, me }) {
    const [state, setState] = useState('loading');
    const [connId, setConnId] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!userId || String(userId) === String(me?.id)) { setState('self'); return; }
        let cancelled = false;
        fetch('/api/connections', { headers: authHeaders() })
            .then(r => r.json())
            .then(d => {
                if (cancelled || !d.success) return;
                const match = d.connections.find(c => String(c.user_id) === String(userId));
                if (!match) { setState('none'); return; }
                setConnId(match.id);
                if (match.status === 'accepted') setState('accepted');
                else if (match.status === 'pending') setState(match.direction === 'outgoing' ? 'outgoing' : 'incoming');
                else setState('none');
            })
            .catch(() => setState('none'));
        return () => { cancelled = true; };
    }, [userId, me?.id]);

    async function connect() {
        setBusy(true);
        try {
            const res = await fetch('/api/connections/request', {
                method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ toUserId: userId }),
            });
            const data = await res.json();
            if (data.success) { setConnId(data.connection.id); setState('outgoing'); }
        } catch (e) { /* leave state as-is; user can retry */ }
        setBusy(false);
    }

    async function respond(action) {
        setBusy(true);
        try {
            const res = await fetch(`/api/connections/${connId}/${action}`, { method: 'POST', headers: authHeaders() });
            const data = await res.json();
            if (data.success) setState(action === 'accept' ? 'accepted' : 'none');
        } catch (e) { }
        setBusy(false);
    }

    const base = { padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' };

    if (state === 'loading' || state === 'self') return null;

    if (state === 'accepted') {
        return <button disabled style={{ ...base, background: 'rgba(52,199,89,0.15)', color: '#34c759', border: '1px solid rgba(52,199,89,0.3)', cursor: 'default' }}>Connected</button>;
    }
    if (state === 'outgoing') {
        return <button disabled style={{ ...base, background: 'rgba(255,255,255,0.06)', color: '#8892b0', cursor: 'default' }}>Requested</button>;
    }
    if (state === 'incoming') {
        return (
            <div style={{ display: 'flex', gap: 8 }}>
                <button disabled={busy} onClick={() => respond('accept')} style={{ ...base, background: 'linear-gradient(45deg,#34c759,#2fa84f)', color: 'white', opacity: busy ? 0.6 : 1 }}>Accept</button>
                <button disabled={busy} onClick={() => respond('reject')} style={{ ...base, background: 'transparent', border: '1px solid rgba(255,77,77,0.4)', color: '#ff8080' }}>Decline</button>
            </div>
        );
    }
    return (
        <button disabled={busy} onClick={connect} style={{ ...base, background: 'linear-gradient(45deg,#FF4FA3,#A855F7)', color: 'white', opacity: busy ? 0.6 : 1 }}>
            {busy ? '...' : 'Connect'}
        </button>
    );
}
