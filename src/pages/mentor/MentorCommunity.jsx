import React, { useState } from 'react';
import MentorLayout from '../../components/MentorLayout';
import { getCurrentUser } from '../../utils/auth';

export default function MentorCommunity() {
    const user = getCurrentUser();
    const [posts, setPosts] = useState([]);
    const [input, setInput] = useState('');

    function addPost() {
        if (!input.trim()) return;
        setPosts([{ text: input, author: user?.name, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...posts]);
        setInput('');
    }

    return (
        <MentorLayout>
            <h1 style={{ fontSize: 22, marginBottom: 20, paddingLeft: 50 }}>Community</h1>
            <div className="m-card">
                <h3><span className="material-icons">campaign</span> Post an Announcement</h3>
                <div style={{ display: 'flex', gap: 10 }}>
                    <input value={input} onChange={e => setInput(e.target.value)} placeholder="Share an update with your students..." onKeyPress={e => { if (e.key === 'Enter') addPost(); }} style={{ flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'white', fontSize: 14 }} />
                    <button className="m-btn" onClick={addPost}>Post</button>
                </div>
            </div>
            <div className="m-card">
                <h3><span className="material-icons">forum</span> Recent Posts</h3>
                {posts.length === 0 ? <p className="m-empty">No community posts yet. Share your first announcement!</p> :
                    posts.map((p, i) => (
                        <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><strong style={{ fontSize: 13 }}>{p.author}</strong><span style={{ fontSize: 11, color: '#555' }}>{p.time}</span></div>
                            <p style={{ fontSize: 14, color: '#ccc' }}>{p.text}</p>
                        </div>
                    ))}
            </div>
        </MentorLayout>
    );
}
