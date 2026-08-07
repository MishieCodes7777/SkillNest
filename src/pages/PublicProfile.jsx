import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import CommunityFeed from '../components/CommunityFeed';
import { getCurrentUser } from '../utils/auth';

function safeParseArray(val) { if (Array.isArray(val)) return val; try { return JSON.parse(val || '[]'); } catch (e) { return []; } }

export default function PublicProfile() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const me = getCurrentUser();
    const [user, setUser] = useState(null);
    const [mentorProfile, setMentorProfile] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const token = localStorage.getItem('token');

    useEffect(() => {
        setUser(null); setMentorProfile(null); setNotFound(false);
        fetch(`/api/auth/users/${userId}`, { headers: { 'Authorization': 'Bearer ' + token } })
            .then(r => r.json())
            .then(d => {
                if (!d.success) { setNotFound(true); return; }
                setUser(d.user);
                if (d.user.role === 'mentor') {
                    fetch(`/api/mentor/profile/${userId}`).then(r => r.json())
                        .then(mp => { if (mp.success) setMentorProfile(mp.profile); })
                        .catch(() => { });
                }
            })
            .catch(() => setNotFound(true));
    }, [userId]);

    if (notFound) return <AppLayout><div style={{ textAlign: 'center', padding: 80, color: '#8892b0' }}>User not found.</div></AppLayout>;
    if (!user) return <AppLayout><div style={{ textAlign: 'center', padding: 80, color: '#8892b0' }}>Loading profile...</div></AppLayout>;

    const isMe = String(user.id) === String(me?.id);
    const skills = mentorProfile ? safeParseArray(mentorProfile.skills) : [];

    return (
        <AppLayout>
            <div style={{ maxWidth: 640, margin: '0 auto', padding: '50px 20px 10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 26, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                    {mentorProfile?.profile_photo ? (
                        <img src={mentorProfile.profile_photo} alt="" style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '3px solid #A855F7' }} />
                    ) : (
                        <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'linear-gradient(45deg,#A855F7,#FF4FA3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 'bold', color: 'white' }}>{user.name.charAt(0).toUpperCase()}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <h2 style={{ fontSize: 22, marginBottom: 4 }}>{user.name}</h2>
                        {user.username && <p style={{ color: '#A855F7', fontSize: 14, marginBottom: 4 }}>@{user.username}</p>}
                        <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(168,85,247,0.15)', color: '#A855F7', textTransform: 'capitalize' }}>{user.role}</span>
                        <p style={{ color: '#555', fontSize: 12, marginTop: 8 }}>Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                    </div>
                    {isMe && (
                        <button onClick={() => navigate(user.role === 'mentor' ? '/mentor/settings' : '/profile')} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', cursor: 'pointer', fontSize: 13 }}>Edit Profile</button>
                    )}
                </div>

                {mentorProfile?.bio && (
                    <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20 }}>
                        <p style={{ fontSize: 14, color: '#ccc', lineHeight: 1.7 }}>{mentorProfile.bio}</p>
                        {skills.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                                {skills.map((s, i) => <span key={i} style={{ padding: '5px 12px', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 20, fontSize: 12.5, color: '#c4a5ff' }}>{s}</span>)}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <CommunityFeed filterUserId={user.id} />
        </AppLayout>
    );
}
