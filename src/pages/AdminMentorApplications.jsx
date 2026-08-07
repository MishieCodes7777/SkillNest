import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';

function authHeaders(extra) {
    return { 'Authorization': 'Bearer ' + localStorage.getItem('token'), ...extra };
}

export default function AdminMentorApplications() {
    const [apps, setApps] = useState(null);
    const [denied, setDenied] = useState(false);
    const [busyId, setBusyId] = useState(null);

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            const res = await fetch('/api/mentor-applications', { headers: authHeaders() });
            if (res.status === 403) { setDenied(true); return; }
            const data = await res.json();
            if (data.success) setApps(data.applications);
        } catch (e) { setDenied(true); }
    }

    async function act(id, action) {
        setBusyId(id);
        try {
            await fetch(`/api/mentor-applications/${id}/${action}`, { method: 'POST', headers: authHeaders() });
            setApps(prev => prev.filter(a => a.id !== id));
        } catch (e) { alert('Could not update the application. Try again.'); }
        setBusyId(null);
    }

    const box = { maxWidth: 760, margin: '0 auto', padding: '60px 24px 60px' };
    const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 22, marginBottom: 14 };

    if (denied) return <AppLayout><div style={{ textAlign: 'center', padding: 80, color: '#8892b0' }}>You don't have access to this page.</div></AppLayout>;

    return (
        <AppLayout>
            <div style={box}>
                <h1 style={{ fontSize: 24, marginBottom: 20, paddingLeft: 55 }}>Mentor Applications</h1>
                {apps === null && <p style={{ color: '#8892b0' }}>Loading...</p>}
                {apps?.length === 0 && <p style={{ color: '#8892b0' }}>No pending applications.</p>}
                {apps?.map(a => (
                    <div key={a.id} style={card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div>
                                <h4 style={{ fontSize: 16 }}>{a.name} {a.username && <span style={{ color: '#A855F7', fontWeight: 400 }}>@{a.username}</span>}</h4>
                                <p style={{ fontSize: 12.5, color: '#8892b0' }}>{a.email} &middot; member since {new Date(a.member_since).toLocaleDateString()}</p>
                            </div>
                            <span style={{ fontSize: 11.5, color: '#666' }}>{new Date(a.created_at).toLocaleDateString()}</span>
                        </div>
                        <p style={{ fontSize: 13.5, color: '#ccc', marginBottom: 8, whiteSpace: 'pre-wrap' }}><strong style={{ color: '#8892b0' }}>Why: </strong>{a.motivation}</p>
                        {a.skills && <p style={{ fontSize: 13.5, color: '#ccc', marginBottom: 8 }}><strong style={{ color: '#8892b0' }}>Can teach: </strong>{a.skills}</p>}
                        {a.experience && <p style={{ fontSize: 13.5, color: '#ccc', marginBottom: 14, whiteSpace: 'pre-wrap' }}><strong style={{ color: '#8892b0' }}>Experience: </strong>{a.experience}</p>}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button disabled={busyId === a.id} onClick={() => act(a.id, 'approve')} style={{ padding: '8px 18px', background: 'linear-gradient(45deg,#34c759,#2fa84f)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Approve</button>
                            <button disabled={busyId === a.id} onClick={() => act(a.id, 'reject')} style={{ padding: '8px 18px', background: 'transparent', border: '1px solid rgba(255,77,77,0.4)', borderRadius: 8, color: '#ff8080', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Reject</button>
                        </div>
                    </div>
                ))}
            </div>
        </AppLayout>
    );
}
