import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';

function authHeaders(extra) {
    return { 'Authorization': 'Bearer ' + localStorage.getItem('token'), ...extra };
}

export default function AdminMentorApplications() {
    const [tab, setTab] = useState('applications');
    const [apps, setApps] = useState(null);
    const [denied, setDenied] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [users, setUsers] = useState(null);
    const [userBusyId, setUserBusyId] = useState(null);

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            const res = await fetch('/api/mentor-applications', { headers: authHeaders() });
            if (res.status === 403) { setDenied(true); return; }
            const data = await res.json();
            if (data.success) setApps(data.applications);
        } catch (e) { setDenied(true); }
    }

    async function loadUsers() {
        setUsers(null);
        try {
            const res = await fetch('/api/auth/users', { headers: authHeaders() });
            const data = await res.json();
            if (data.success) setUsers(data.users);
        } catch (e) { setUsers([]); }
    }

    function openUsersTab() {
        setTab('users');
        if (users === null) loadUsers();
    }

    async function act(id, action) {
        setBusyId(id);
        try {
            await fetch(`/api/mentor-applications/${id}/${action}`, { method: 'POST', headers: authHeaders() });
            setApps(prev => prev.filter(a => a.id !== id));
        } catch (e) { alert('Could not update the application. Try again.'); }
        setBusyId(null);
    }

    async function deleteUser(u) {
        if (!confirm(`Delete ${u.name} (${u.email})? This removes their account, posts, connections, and courses. This can't be undone.`)) return;
        setUserBusyId(u.id);
        try {
            const res = await fetch(`/api/auth/users/${u.id}`, { method: 'DELETE', headers: authHeaders() });
            const data = await res.json();
            if (data.success) setUsers(prev => prev.filter(x => x.id !== u.id));
            else alert(data.message || 'Could not delete this account.');
        } catch (e) { alert('Could not delete this account.'); }
        setUserBusyId(null);
    }

    const box = { maxWidth: 760, margin: '0 auto', padding: '60px 24px 60px' };
    const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 22, marginBottom: 14 };
    const tabBtn = active => ({ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, background: active ? 'linear-gradient(45deg,#FF4FA3,#A855F7)' : 'rgba(255,255,255,0.06)', color: active ? 'white' : '#8892b0' });

    if (denied) return <AppLayout><div style={{ textAlign: 'center', padding: 80, color: '#8892b0' }}>You don't have access to this page.</div></AppLayout>;

    return (
        <AppLayout>
            <div style={box}>
                <h1 style={{ fontSize: 24, marginBottom: 20, paddingLeft: 55 }}>Admin</h1>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    <button style={tabBtn(tab === 'applications')} onClick={() => setTab('applications')}>Mentor Applications</button>
                    <button style={tabBtn(tab === 'users')} onClick={openUsersTab}>Users</button>
                </div>

                {tab === 'applications' && (
                    <>
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
                                {a.experience && <p style={{ fontSize: 13.5, color: '#ccc', marginBottom: 8, whiteSpace: 'pre-wrap' }}><strong style={{ color: '#8892b0' }}>Experience: </strong>{a.experience}</p>}
                                {a.portfolio_url && <p style={{ fontSize: 13.5, color: '#ccc', marginBottom: 8 }}><strong style={{ color: '#8892b0' }}>Portfolio/Resume: </strong><a href={a.portfolio_url} target="_blank" rel="noreferrer" style={{ color: '#A855F7' }}>{a.portfolio_url}</a></p>}
                                {a.projects && <p style={{ fontSize: 13.5, color: '#ccc', marginBottom: 14, whiteSpace: 'pre-wrap' }}><strong style={{ color: '#8892b0' }}>Projects: </strong>{a.projects}</p>}
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button disabled={busyId === a.id} onClick={() => act(a.id, 'approve')} style={{ padding: '8px 18px', background: 'linear-gradient(45deg,#34c759,#2fa84f)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Approve</button>
                                    <button disabled={busyId === a.id} onClick={() => act(a.id, 'reject')} style={{ padding: '8px 18px', background: 'transparent', border: '1px solid rgba(255,77,77,0.4)', borderRadius: 8, color: '#ff8080', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Reject</button>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {tab === 'users' && (
                    <>
                        {users === null && <p style={{ color: '#8892b0' }}>Loading...</p>}
                        {users?.length === 0 && <p style={{ color: '#8892b0' }}>No users found.</p>}
                        {users?.map(u => (
                            <div key={u.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h4 style={{ fontSize: 15 }}>{u.name} <span style={{ color: '#8892b0', fontWeight: 400, fontSize: 12.5, textTransform: 'capitalize' }}>&middot; {u.role}</span></h4>
                                    <p style={{ fontSize: 12.5, color: '#8892b0' }}>{u.email} &middot; joined {new Date(u.created_at).toLocaleDateString()}</p>
                                </div>
                                <button disabled={userBusyId === u.id} onClick={() => deleteUser(u)} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid rgba(255,77,77,0.4)', borderRadius: 8, color: '#ff8080', fontWeight: 600, cursor: 'pointer', fontSize: 12.5 }}>
                                    {userBusyId === u.id ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </AppLayout>
    );
}
