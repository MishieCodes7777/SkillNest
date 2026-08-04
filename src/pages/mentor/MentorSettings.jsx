import React, { useState, useEffect } from 'react';
import MentorLayout from '../../components/MentorLayout';
import { getCurrentUser } from '../../utils/auth';

export default function MentorSettings() {
    const user = getCurrentUser();
    const [profile, setProfile] = useState({ bio: '', skills: [], categories: [], languages: ['English'], experience: '', linkedin: '', github: '', portfolio: '', twitter: '', profile_photo: '', hourly_rate: 0 });
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const [skillInput, setSkillInput] = useState('');
    const [catInput, setCatInput] = useState('');
    const [editPhotoOpen, setEditPhotoOpen] = useState(false);
    useEffect(() => { loadProfile(); }, []);

    async function loadProfile() {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/mentor/profile', { headers: { 'Authorization': 'Bearer ' + token } });
            const data = await res.json();
            if (data.success && data.profile) {
                const p = data.profile;
                setProfile({
                    bio: p.bio || '',
                    skills: safeParseArray(p.skills),
                    categories: safeParseArray(p.categories),
                    languages: safeParseArray(p.languages) || ['English'],
                    experience: p.experience || '',
                    linkedin: p.linkedin || '',
                    github: p.github || '',
                    portfolio: p.portfolio || '',
                    twitter: p.twitter || '',
                    profile_photo: p.profile_photo || '',
                    hourly_rate: p.hourly_rate || 0,
                    customLinks: safeParseArray(p.custom_links),
                });
            }
        } catch (e) { }
        setLoading(false);
    }

    function safeParseArray(val) { if (Array.isArray(val)) return val; try { return JSON.parse(val || '[]'); } catch (e) { return []; } }

    async function saveProfile() {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/mentor/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(profile) });
            const data = await res.json();
            setMsg(data.success ? 'Profile saved!' : data.message);
            setTimeout(() => setMsg(''), 3000);
        } catch (e) { setMsg('Error saving'); }
    }

    function addSkill() { if (skillInput.trim() && !profile.skills.includes(skillInput.trim())) { setProfile({ ...profile, skills: [...profile.skills, skillInput.trim()] }); setSkillInput(''); } }
    function removeSkill(s) { setProfile({ ...profile, skills: profile.skills.filter(x => x !== s) }); }
    function addCategory() { if (catInput.trim() && !profile.categories.includes(catInput.trim())) { setProfile({ ...profile, categories: [...profile.categories, catInput.trim()] }); setCatInput(''); } }
    function removeCategory(c) { setProfile({ ...profile, categories: profile.categories.filter(x => x !== c) }); }

    function addCustomLink() { setProfile({ ...profile, customLinks: [...(profile.customLinks || []), { name: '', url: '' }] }); }
    function updateCustomLink(idx, field, value) { const links = [...(profile.customLinks || [])]; links[idx] = { ...links[idx], [field]: value }; setProfile({ ...profile, customLinks: links }); }
    function removeCustomLink(idx) { setProfile({ ...profile, customLinks: (profile.customLinks || []).filter((_, i) => i !== idx) }); }

    function handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { alert('Max 2MB'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => { setProfile({ ...profile, profile_photo: ev.target.result }); setEditPhotoOpen(false); };
        reader.readAsDataURL(file);
    }

    if (loading) return <MentorLayout><p style={{ padding: 50, color: '#888' }}>Loading...</p></MentorLayout>;

    return (
        <MentorLayout>
            <h1 style={{ fontSize: 22, marginBottom: 20, paddingLeft: 50 }}>Mentor Profile</h1>

            {/* Profile Card (like student section) */}
            <div className="m-card" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 18 }}>
                <div style={{ position: 'relative' }}>
                    {profile.profile_photo ? (
                        <img src={profile.profile_photo} alt="Profile" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #A855F7' }} />
                    ) : (
                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(45deg,#A855F7,#FF4FA3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 'bold' }}>{user?.name?.charAt(0).toUpperCase()}</div>
                    )}
                </div>
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 22, marginBottom: 4 }}>{user?.name}</h2>
                    <p style={{ color: '#A855F7', fontSize: 14 }}>{user?.username ? `@${user.username}` : ''}</p>
                    <p style={{ color: '#8892b0', fontSize: 13 }}>{user?.email}</p>
                    <span style={{ display: 'inline-block', marginTop: 6, padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(168,85,247,0.15)', color: '#A855F7' }}>Mentor</span>
                </div>
                <button onClick={() => setEditPhotoOpen(true)} className="m-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-icons" style={{ fontSize: 16 }}>edit</span> Edit
                </button>
            </div>

            {/* Photo Upload Modal */}
            {editPhotoOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setEditPhotoOpen(false)}>
                    <div style={{ background: '#0d1025', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, width: 400, maxWidth: '90vw', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 25px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <h3 style={{ fontSize: 18 }}>Edit Profile</h3>
                            <button onClick={() => setEditPhotoOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><span className="material-icons" style={{ color: '#888', fontSize: 22 }}>close</span></button>
                        </div>
                        <div style={{ padding: 25 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20, padding: 18, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(168,85,247,0.1)', border: '2px dashed rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {profile.profile_photo ? <img src={profile.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : <span className="material-icons" style={{ fontSize: 24, color: '#A855F7' }}>person</span>}
                                </div>
                                <div>
                                    <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Profile Picture</p>
                                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'linear-gradient(45deg,#FF4FA3,#A855F7)', borderRadius: 6, color: 'white', fontSize: 12, cursor: 'pointer' }} htmlFor="mentorPhotoInput">
                                        <span className="material-icons" style={{ fontSize: 16 }}>upload</span> Upload
                                    </label>
                                    <input id="mentorPhotoInput" type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                                    <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>JPG, PNG. Max 2MB.</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button onClick={() => setEditPhotoOpen(false)} style={{ padding: '10px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#888', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={() => setEditPhotoOpen(false)} className="m-btn">Done</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Basic Info */}
            <div className="m-card">
                <h3><span className="material-icons">person</span> Basic Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div><p style={{ fontSize: 12, color: '#8892b0', marginBottom: 4 }}>Name</p><p style={{ fontSize: 16 }}>{user?.name}</p></div>
                    <div><p style={{ fontSize: 12, color: '#8892b0', marginBottom: 4 }}>Email</p><p style={{ fontSize: 16 }}>{user?.email}</p></div>
                    <div><p style={{ fontSize: 12, color: '#8892b0', marginBottom: 4 }}>Username</p><p style={{ fontSize: 16, color: user?.username ? '#A855F7' : '#ff4d4d' }}>@{user?.username || 'Not set'}</p></div>
                    <div><p style={{ fontSize: 12, color: '#8892b0', marginBottom: 4 }}>Hourly Rate</p><input type="number" value={profile.hourly_rate} onChange={e => setProfile({ ...profile, hourly_rate: parseInt(e.target.value) || 0 })} placeholder="0 = Free" style={{ ...inputStyle, width: 120 }} /></div>
                </div>
            </div>

            {/* Bio */}
            <div className="m-card">
                <h3><span className="material-icons">edit_note</span> Bio & Experience</h3>
                <textarea value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })} placeholder="Write a short bio about yourself and your teaching style..." style={textareaStyle} />
                <textarea value={profile.experience} onChange={e => setProfile({ ...profile, experience: e.target.value })} placeholder="Your experience (e.g. 5+ years in web development, taught 200+ students...)" style={{ ...textareaStyle, minHeight: 60 }} />
            </div>

            {/* Skills */}
            <div className="m-card">
                <h3><span className="material-icons">code</span> Skills</h3>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyPress={e => { if (e.key === 'Enter') addSkill(); }} placeholder="Add a skill (e.g. React, Python, Guitar)" style={inputStyle} />
                    <button onClick={addSkill} className="m-btn" style={{ padding: '8px 16px' }}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {profile.skills.map((s, i) => <span key={i} style={tagStyle} onClick={() => removeSkill(s)}>{s} ×</span>)}
                    {profile.skills.length === 0 && <span style={{ color: '#555', fontSize: 13 }}>No skills added yet</span>}
                </div>
            </div>

            {/* Categories */}
            <div className="m-card">
                <h3><span className="material-icons">category</span> Teaching Categories</h3>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input value={catInput} onChange={e => setCatInput(e.target.value)} onKeyPress={e => { if (e.key === 'Enter') addCategory(); }} placeholder="Add category (e.g. Web Dev, Music, Fitness)" style={inputStyle} />
                    <button onClick={addCategory} className="m-btn" style={{ padding: '8px 16px' }}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {profile.categories.map((c, i) => <span key={i} style={tagStyle} onClick={() => removeCategory(c)}>{c} ×</span>)}
                    {profile.categories.length === 0 && <span style={{ color: '#555', fontSize: 13 }}>No categories added yet</span>}
                </div>
            </div>

            {/* Social Links */}
            <div className="m-card">
                <h3><span className="material-icons">link</span> Social Links</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><label style={labelStyle}>LinkedIn</label><input value={profile.linkedin} onChange={e => setProfile({ ...profile, linkedin: e.target.value })} placeholder="https://linkedin.com/in/yourname" style={inputStyle} /></div>
                    <div><label style={labelStyle}>GitHub</label><input value={profile.github} onChange={e => setProfile({ ...profile, github: e.target.value })} placeholder="https://github.com/yourname" style={inputStyle} /></div>
                    <div><label style={labelStyle}>Portfolio / Website</label><input value={profile.portfolio} onChange={e => setProfile({ ...profile, portfolio: e.target.value })} placeholder="https://yoursite.com" style={inputStyle} /></div>
                    <div><label style={labelStyle}>Twitter / X</label><input value={profile.twitter} onChange={e => setProfile({ ...profile, twitter: e.target.value })} placeholder="https://twitter.com/yourname" style={inputStyle} /></div>
                </div>

                {/* Custom Links */}
                <div style={{ marginTop: 18, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>Additional Links</label>
                        <button onClick={addCustomLink} style={{ background: 'none', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 6, color: '#A855F7', padding: '5px 12px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><span className="material-icons" style={{ fontSize: 16 }}>add</span> Add Link</button>
                    </div>
                    {(profile.customLinks || []).map((link, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                            <input value={link.name} onChange={e => updateCustomLink(i, 'name', e.target.value)} placeholder="Label (e.g. YouTube)" style={inputStyle} />
                            <input value={link.url} onChange={e => updateCustomLink(i, 'url', e.target.value)} placeholder="https://..." style={inputStyle} />
                            <button onClick={() => removeCustomLink(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><span className="material-icons" style={{ color: '#ff4d4d', fontSize: 20 }}>close</span></button>
                        </div>
                    ))}
                    {(!profile.customLinks || profile.customLinks.length === 0) && <p style={{ color: '#555', fontSize: 13 }}>No additional links. Click + to add.</p>}
                </div>
            </div>

            {/* Save */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 10 }}>
                <button onClick={saveProfile} className="m-btn">Save Profile</button>
                {msg && <span style={{ color: msg.includes('saved') ? '#34c759' : '#ff4d4d', fontSize: 14 }}>{msg}</span>}
            </div>
        </MentorLayout>
    );
}

const inputStyle = { width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'white', fontSize: 14 };
const textareaStyle = { width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'white', fontSize: 14, minHeight: 80, resize: 'vertical', marginBottom: 10 };
const labelStyle = { display: 'block', fontSize: 12, color: '#8892b0', marginBottom: 5 };
const tagStyle = { padding: '5px 12px', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 20, fontSize: 13, color: '#c4a5ff', cursor: 'pointer' };
