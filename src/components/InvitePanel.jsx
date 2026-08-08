import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../utils/auth';
import '../styles/invite.css';

function authHeaders(extra) {
    return { 'Authorization': 'Bearer ' + localStorage.getItem('token'), ...extra };
}

export default function InvitePanel({ meetCode }) {
    const me = getCurrentUser();
    const [users, setUsers] = useState([]);
    const [connectedIds, setConnectedIds] = useState(new Set());
    const [search, setSearch] = useState('');
    const [invited, setInvited] = useState([]);
    const [copied, setCopied] = useState(false);
    const shareLink = `${window.location.origin}/meeting?meet=${meetCode}`;

    useEffect(() => {
        fetch('/api/auth/users', { headers: authHeaders() }).then(r => r.json())
            .then(d => { if (d.success) setUsers((d.users || []).filter(u => String(u.id) !== String(me?.id))); })
            .catch(() => { });
        fetch('/api/connections', { headers: authHeaders() }).then(r => r.json())
            .then(d => { if (d.success) setConnectedIds(new Set(d.connections.filter(c => c.status === 'accepted').map(c => String(c.user_id)))); })
            .catch(() => { });
    }, []);

    const filtered = users
        .filter(u => u.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            const aConn = connectedIds.has(String(a.id)) ? 0 : 1;
            const bConn = connectedIds.has(String(b.id)) ? 0 : 1;
            return aConn - bConn;
        });

    function copyLink() {
        navigator.clipboard.writeText(shareLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }

    async function invite(user) {
        setInvited(prev => [...prev, user.id]);
        try {
            await fetch('/api/notifications/session-invite', {
                method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ toUserId: user.id, meetingCode: meetCode }),
            });
        } catch (e) { setInvited(prev => prev.filter(id => id !== user.id)); }
    }

    return (
        <div className="ip-wrap">
            <div className="ip-share">
                <span className="material-icons">link</span>
                <input value={shareLink} readOnly onClick={e => e.target.select()} />
                <button onClick={copyLink}>{copied ? 'Copied!' : 'Copy Link'}</button>
            </div>

            <input className="ip-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people to invite..." />

            <div className="ip-list">
                {filtered.length === 0 && <div className="ip-empty">No one found.</div>}
                {filtered.map(u => {
                    const isSuggested = connectedIds.has(String(u.id));
                    const isInvited = invited.includes(u.id);
                    return (
                        <div className="ip-row" key={u.id}>
                            <div className="ip-avatar">{u.name.charAt(0).toUpperCase()}</div>
                            <div className="ip-info">
                                <span className="ip-name">{u.name}</span>
                                {isSuggested && <span className="ip-suggested">Past connection</span>}
                            </div>
                            <button className={`ip-invite-btn ${isInvited ? 'done' : ''}`} disabled={isInvited} onClick={() => invite(u)}>{isInvited ? 'Invited' : 'Invite'}</button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
