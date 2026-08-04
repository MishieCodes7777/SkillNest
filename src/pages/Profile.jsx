import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { getCurrentUser, getUserData } from '../utils/auth';
import { trackActivity } from '../utils/missions';
import '../styles/profile.css';

export default function Profile() {
    const user = getCurrentUser();
    const data = getUserData();
    const [editOpen, setEditOpen] = useState(false);
    const [usernameModal, setUsernameModal] = useState(false);
    const [newName, setNewName] = useState(user?.name || '');
    const [newUsername, setNewUsername] = useState(user?.username || '');
    const [usernameStatus, setUsernameStatus] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [profilePic, setProfilePic] = useState(localStorage.getItem('skillnest_profile_pic') || '');

    const hasUsername = !!user?.username;

    // Track profile visit for daily mission
    useEffect(() => { trackActivity('profile_visited'); }, []);

    function getMemberSince(user) {
        // Check stored created_at
        if (user?.created_at) return new Date(user.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
        // Fallback: check localStorage for first login date
        const key = 'skillnest_joined_' + (user?.email || 'default');
        let joined = localStorage.getItem(key);
        if (!joined) { joined = new Date().toISOString(); localStorage.setItem(key, joined); }
        return new Date(joined).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    async function checkUsername(val) {
        setNewUsername(val);
        setUsernameError('');
        setUsernameStatus('');
        if (val.length < 3) { setUsernameError('Min 3 characters'); return; }
        if (!/^[a-z0-9._]+$/.test(val)) { setUsernameError('Only lowercase, numbers, dots, underscores'); return; }
        try {
            const res = await fetch(`/api/auth/check-username?username=${val}`);
            const data = await res.json();
            if (data.available) setUsernameStatus('Available');
            else setUsernameError('Already taken');
        } catch (e) { }
    }

    async function saveUsername() {
        if (!newUsername || newUsername.length < 3) { setUsernameError('Username too short'); return; }
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/auth/update-username', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ username: newUsername }),
            });
            const data = await res.json();
            if (data.success) {
                const updated = { ...user, username: data.username };
                localStorage.setItem('currentUser', JSON.stringify(updated));
                setUsernameModal(false);
                window.location.reload();
            } else {
                setUsernameError(data.message);
            }
        } catch (e) { setUsernameError('Server error'); }
    }

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { alert('Max 2MB'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => { setProfilePic(ev.target.result); };
        reader.readAsDataURL(file);
    }

    function saveProfile() {
        if (newName.trim()) {
            const u = { ...user, name: newName.trim() };
            localStorage.setItem('currentUser', JSON.stringify(u));
        }
        if (profilePic) localStorage.setItem('skillnest_profile_pic', profilePic);
        setEditOpen(false);
        window.location.reload();
    }

    return (
        <AppLayout>
            <div className="profile-container">
                <h1 className="page-title">My Profile</h1>

                <div className="profile-card">
                    <div className="profile-avatar-wrap">
                        {profilePic ? <img src={profilePic} className="profile-img" alt="avatar" /> : <div className="profile-avatar">{user?.name?.charAt(0).toUpperCase() || '?'}</div>}
                    </div>
                    <div className="profile-details">
                        <h2>{user?.name || 'User'}</h2>
                        <p style={{ color: '#A855F7', fontSize: 14 }}>{user?.username ? `@${user.username}` : ''}</p>
                        <p style={{ color: '#8892b0', fontSize: 13 }}>{user?.email}</p>
                        <span className={`profile-role role-${user?.role}`}>{user?.role}</span>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button className="edit-btn" onClick={() => setEditOpen(true)}><span className="material-icons">edit</span> Edit</button>
                        <button className="edit-btn" onClick={() => setUsernameModal(true)} style={{ borderColor: '#A855F7', color: '#A855F7' }}><span className="material-icons">alternate_email</span> {hasUsername ? 'Change' : 'Set'} Username</button>
                    </div>
                </div>

                <div className="info-grid">
                    <div className="info-card"><h4>Full Name</h4><p>{user?.name}</p></div>
                    <div className="info-card"><h4>Username</h4><p style={{ color: user?.username ? '#A855F7' : '#ff4d4d' }}>{user?.username ? `@${user.username}` : '⚠ Not set'}</p></div>
                    <div className="info-card"><h4>Email</h4><p>{user?.email}</p></div>
                    <div className="info-card"><h4>Role</h4><p style={{ textTransform: 'capitalize' }}>{user?.role}</p></div>
                    <div className="info-card"><h4>Member Since</h4><p>{getMemberSince(user)}</p></div>
                    <div className="info-card"><h4>Current Streak</h4><p style={{ color: '#A855F7' }}>{data.streak} days</p></div>
                </div>

                <div className="stats-grid-profile">
                    <div className="stat-box"><div className="sv">{data.streak}</div><div className="sl">Streak</div></div>
                    <div className="stat-box"><div className="sv">{data.sessions}</div><div className="sl">Sessions</div></div>
                    <div className="stat-box"><div className="sv">{data.skills.length}</div><div className="sl">Skills</div></div>
                    <div className="stat-box"><div className="sv">{data.mentors}</div><div className="sl">Mentors</div></div>
                </div>

                {data.activity.length > 0 && (
                    <div className="activity-section">
                        <h3>Recent Activity</h3>
                        {data.activity.slice(0, 5).map((a, i) => <div className="act-item" key={i}><span className="act-dot" />{a.text} <span className="act-time">{a.time}</span></div>)}
                    </div>
                )}

                {/* Edit Modal */}
                {editOpen && (
                    <div className="modal-overlay" onClick={() => setEditOpen(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h3>Edit Profile</h3><button onClick={() => setEditOpen(false)} className="modal-close"><span className="material-icons">close</span></button></div>
                            <div className="modal-body">
                                <div className="upload-section">
                                    <div className="upload-preview">{profilePic ? <img src={profilePic} alt="preview" /> : <span className="material-icons">person</span>}</div>
                                    <div><p>Profile Picture</p><label className="upload-btn" htmlFor="fileInput"><span className="material-icons" style={{ fontSize: '16px' }}>upload</span> Upload</label><input type="file" id="fileInput" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} /></div>
                                </div>
                                <div className="modal-input"><label>Display Name</label><input value={newName} onChange={e => setNewName(e.target.value)} /></div>
                                <div className="modal-actions"><button className="m-cancel" onClick={() => setEditOpen(false)}>Cancel</button><button className="m-save" onClick={saveProfile}>Save</button></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Username Modal */}
                {usernameModal && (
                    <div className="modal-overlay" onClick={() => setUsernameModal(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h3>{hasUsername ? 'Change' : 'Set'} Username</h3><button onClick={() => setUsernameModal(false)} className="modal-close"><span className="material-icons">close</span></button></div>
                            <div className="modal-body">
                                <p style={{ fontSize: 13, color: '#8892b0', marginBottom: 15 }}>
                                    {hasUsername ? 'You can change your username up to 3 times per month.' : 'Set a unique username for your profile.'}
                                </p>
                                <div className="modal-input">
                                    <label>Username</label>
                                    <input value={newUsername} onChange={e => checkUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))} placeholder="e.g. bhavya.k" />
                                    <span style={{ fontSize: 11, color: '#555', display: 'block', marginTop: 4 }}>Lowercase letters, numbers, dots, underscores</span>
                                    {usernameStatus && <span style={{ fontSize: 12, color: '#34c759', display: 'block', marginTop: 4 }}>{usernameStatus}</span>}
                                    {usernameError && <span style={{ fontSize: 12, color: '#ff4d4d', display: 'block', marginTop: 4 }}>{usernameError}</span>}
                                </div>
                                <div className="modal-actions">
                                    <button className="m-cancel" onClick={() => setUsernameModal(false)}>Cancel</button>
                                    <button className="m-save" onClick={saveUsername} disabled={newUsername.length < 3 || !!usernameError}>Save Username</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
