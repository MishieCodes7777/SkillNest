import React, { useState, useEffect } from 'react';
import MentorLayout from '../../components/MentorLayout';
import { getCurrentUser } from '../../utils/auth';

export default function MentorCourses() {
    const user = getCurrentUser();
    const [courses, setCourses] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', category: '', difficulty: 'beginner', duration: '', image_url: '' });
    const [msg, setMsg] = useState('');

    useEffect(() => { loadCourses(); }, []);

    function loadCourses() {
        fetch('/api/courses').then(r => r.json()).then(d => {
            if (d.success) setCourses(d.courses.filter(c => c.mentor_id === user?.id));
        }).catch(() => { });
    }

    async function createCourse(e) {
        e.preventDefault();
        if (!form.title) { setMsg('Title is required'); return; }
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/courses', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) { setMsg('Course created!'); setShowCreate(false); setForm({ title: '', description: '', category: '', difficulty: 'beginner', duration: '', image_url: '' }); loadCourses(); }
            else setMsg(data.message);
        } catch (e) { setMsg('Error creating course'); }
    }

    async function deleteCourse(id) {
        if (!confirm('Delete this course?')) return;
        const token = localStorage.getItem('token');
        await fetch(`/api/courses/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
        loadCourses();
    }

    return (
        <MentorLayout>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, paddingLeft: 50 }}>
                <h1 style={{ fontSize: 22 }}>My Courses</h1>
                <button className="m-btn" onClick={() => setShowCreate(!showCreate)}>+ Create Course</button>
            </div>

            {showCreate && (
                <div className="m-card" style={{ marginBottom: 20 }}>
                    <h3><span className="material-icons">add_circle</span> New Course</h3>
                    <form onSubmit={createCourse} style={{ display: 'grid', gap: 12 }}>
                        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Course Title" style={inputStyle} />
                        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                            <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Category (e.g. React, Music)" style={inputStyle} />
                            <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} style={inputStyle}>
                                <option value="beginner" style={{ color: '#111' }}>Beginner</option><option value="intermediate" style={{ color: '#111' }}>Intermediate</option><option value="advanced" style={{ color: '#111' }}>Advanced</option>
                            </select>
                            <input value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="Duration (e.g. 4 weeks)" style={inputStyle} />
                        </div>
                        <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="Image URL (Cloudinary link)" style={inputStyle} />
                        {msg && <p style={{ color: msg.includes('created') ? '#34c759' : '#ff4d4d', fontSize: 13 }}>{msg}</p>}
                        <button type="submit" className="m-btn" style={{ width: 'fit-content' }}>Create Course</button>
                    </form>
                </div>
            )}

            {courses.length === 0 ? (
                <div className="m-card"><p className="m-empty">No courses yet. Create your first course above!</p></div>
            ) : (
                <div style={{ display: 'grid', gap: 14 }}>
                    {courses.map(c => (
                        <div key={c.id} className="m-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h4 style={{ fontSize: 16, marginBottom: 4 }}>{c.title}</h4>
                                <p style={{ fontSize: 13, color: '#8892b0' }}>{c.category} • {c.difficulty} • {c.duration || 'No duration set'}</p>
                            </div>
                            <button onClick={() => deleteCourse(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><span className="material-icons" style={{ color: '#ff4d4d' }}>delete</span></button>
                        </div>
                    ))}
                </div>
            )}
        </MentorLayout>
    );
}

const inputStyle = { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'white', fontSize: 14 };
