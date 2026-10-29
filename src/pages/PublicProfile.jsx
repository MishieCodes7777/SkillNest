import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import CommunityFeed from '../components/CommunityFeed';
import FollowButton from '../components/FollowButton';
import Publications from '../components/Publications';
import { api } from '../utils/api';
import { getCurrentUser } from '../utils/auth';

function safeParseArray(val) { if (Array.isArray(val)) return val; try { return JSON.parse(val || '[]'); } catch (e) { return []; } }

export default function PublicProfile() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const me = getCurrentUser();
    const [user, setUser] = useState(null);
    const [mentorProfile, setMentorProfile] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const [contactNotice,setContactNotice]=useState('');
    const [connection,setConnection]=useState(null);
    useEffect(()=>{api('/api/connections').then(d=>setConnection(d.connections.find(c=>String(c.user_id)===String(userId))||null)).catch(()=>{});},[userId]);
    const token = localStorage.getItem('token');

    useEffect(() => {
        setUser(null); setMentorProfile(null); setNotFound(false);
        fetch(`/api/auth/users/${userId}`, { headers: { 'Authorization': 'Bearer ' + token } })
            .then(r => r.json())
            .then(d => {
                if (!d.success) { setNotFound(true); return; }
                setUser(d.user);
                if (d.user.role === 'mentor' || d.user.isMentor) {
                    fetch(`/api/mentor/profile/${userId}`).then(r => r.json())
                        .then(mp => { if (mp.success) setMentorProfile(mp.profile); })
                        .catch(() => { });
                }
            })
            .catch(() => setNotFound(true));
    }, [userId]);

    if (notFound) return <AppLayout><div style={{ textAlign: 'center', padding: 80, color: 'var(--sn-muted)' }}>User not found.</div></AppLayout>;
    if (!user) return <AppLayout><div style={{ textAlign: 'center', padding: 80, color: 'var(--sn-muted)' }}>Loading profile...</div></AppLayout>;

    const isMe = String(user.id) === String(me?.id);
    const skills = mentorProfile ? safeParseArray(mentorProfile.skills) : [];

    let linkedin='';try{const u=new URL(user.linkedin_url||'');if(u.protocol==='https:'&&['www.linkedin.com','linkedin.com'].includes(u.hostname)&&!u.username&&!u.password&&/^\/in\/[^/]+\/?$/.test(u.pathname))linkedin=u.href;}catch{}
    return <AppLayout><div className="sn-public-profile"><div className="sn-profile-cover"/><section className="sn-profile-summary"><div className="sn-profile-heading">
      {user.avatar_url?<img className="sn-profile-avatar" src={user.avatar_url} alt=""/>:<div className="sn-profile-avatar">{user.name.charAt(0).toUpperCase()}</div>}
      <div><span className="sn-eyebrow">{user.isMentor?'MENTOR & LEARNER':'COMMUNITY MEMBER'}</span><h1>{user.name}</h1><p>{user.headline||'Learning, building and connecting on SkillNest'}</p>{user.username&&<p>@{user.username}</p>}</div></div>
      <div className="sn-profile-actions">{linkedin&&<a href={linkedin} target="_blank" rel="noopener noreferrer">LinkedIn profile ↗</a>}
      {isMe?<Link to="/profile">Edit public profile</Link>:<><FollowButton userId={user.id} me={me}/>{connection?.status==='accepted'?<Link to="/messages">Message connection</Link>:<button disabled={Boolean(connection)} onClick={async()=>{try{await api('/api/connections/request',{method:'POST',body:JSON.stringify({toUserId:user.id})});setConnection({status:'pending'});setContactNotice('Connection request sent.');}catch(e){setContactNotice(e.message);}}}>{connection?'Connection '+connection.status:'Connect'}</button>}</>}
      {user.isMentor&&<Link to={`/u/${user.id}/research`}>Research papers</Link>}</div>
      {linkedin&&<p className="sn-muted">LinkedIn opens externally. This link is supplied by the member.</p>}{contactNotice&&<p role="status">{contactNotice}</p>}</section>
      <section className="sn-public-about"><h2>About</h2><p>{user.about||mentorProfile?.bio||'This member has not added an introduction yet.'}</p><div className="sn-skill-tags">{skills.map(s=><span key={s}>{s}</span>)}</div></section>
      {!isMe&&<details className="sn-public-about"><summary>Contact preferences</summary><button onClick={async()=>{try{await api(`/api/help/blocks/${user.id}`,{method:'POST'});setContactNotice('Account blocked. Manage blocks in Smart Help preferences.');}catch(e){setContactNotice(e.message);}}}>Block contact</button></details>}
      <h2 style={{marginTop:28,fontSize:20}}>Posts & project updates</h2></div>
      {user.isMentor&&<Publications userId={user.id}/>}<CommunityFeed filterUserId={user.id}/></AppLayout>;
}
