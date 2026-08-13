import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MentorLayout from '../../components/MentorLayout';
import { getCurrentUser } from '../../utils/auth';

const EMPTY_FORM = { title: '', description: '', category: '', difficulty: 'beginner', duration: '', image_url: '', video_count: '' };

export default function MentorCourses() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const [courses, setCourses] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [msg, setMsg] = useState('');

    useEffect(() => { loadCourses(); }, []);

    function loadCourses() {
        fetch('/api/courses').then(r => r.json()).then(d => {
            if (d.success) setCourses(d.courses.filter(c => c.mentor_id === user?.id));
        }).catch(() => { });
    }

    function toggleCreate() {
        if (showCreate && editingId === null) {
            setShowCreate(false);
        } else {
            setEditingId(null);
            setForm(EMPTY_FORM);
            setMsg('');
            setShowCreate(true);
        }
    }

    function startEdit(c) {
        setEditingId(c.id);
        setForm({
            title: c.title || '', description: c.description || '', category: c.category || '',
            difficulty: c.difficulty || 'beginner', duration: c.duration || '',
            image_url: c.image_url || '', video_count: c.video_count || '',
        });
        setMsg('');
        setShowCreate(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function cancelForm() {
        setShowCreate(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        setMsg('');
    }

    async function saveCourse(e) {
        e.preventDefault();
        if (!form.title) { setMsg('Title is required'); return; }
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(editingId ? `/api/courses/${editingId}` : '/api/courses', {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                setMsg(editingId ? 'Course updated!' : 'Course created!');
                setShowCreate(false);
                setEditingId(null);
                setForm(EMPTY_FORM);
                loadCourses();
            } else setMsg(data.message);
        } catch (e) { setMsg(editingId ? 'Error updating course' : 'Error creating course'); }
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
                <button className="m-btn" onClick={toggleCreate}>{showCreate && editingId === null ? 'Cancel' : '+ Create Course'}</button>
            </div>

            {showCreate && (
                <div className="m-card" style={{ marginBottom: 20 }}>
                    <h3><span className="material-icons">{editingId ? 'edit' : 'add_circle'}</span> {editingId ? 'Edit Course' : 'New Course'}</h3>
                    <form onSubmit={saveCourse} style={{ display: 'grid', gap: 12 }}>
                        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Course Title" style={inputStyle} />
                        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                            <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Category (e.g. React, Music)" style={inputStyle} />
                            <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} style={inputStyle}>
                                <option value="beginner" style={{ color: '#111' }}>Beginner</option><option value="intermediate" style={{ color: '#111' }}>Intermediate</option><option value="advanced" style={{ color: '#111' }}>Advanced</option>
                            </select>
                            <input value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="Duration (e.g. 4 weeks)" style={inputStyle} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                            <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="Image URL (Cloudinary link)" style={inputStyle} />
                            <input type="number" min="0" value={form.video_count} onChange={e => setForm({ ...form, video_count: e.target.value })} placeholder="No. of videos" style={inputStyle} />
                        </div>
                        {msg && <p style={{ color: msg.includes('created') || msg.includes('updated') ? '#34c759' : '#ff4d4d', fontSize: 13 }}>{msg}</p>}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="submit" className="m-btn" style={{ width: 'fit-content' }}>{editingId ? 'Save Changes' : 'Create Course'}</button>
                            {editingId && <button type="button" onClick={cancelForm} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#8892b0', padding: '0 16px', cursor: 'pointer' }}>Cancel</button>}
                        </div>
                    </form>
                </div>
            )}

            {courses.length === 0 ? (
                <div className="m-card"><p className="m-empty">No courses yet. Create your first course above!</p></div>
            ) : (
                <div style={{ display: 'grid', gap: 14 }}>
                    {courses.map(c => (
                        <div key={c.id} className="m-card" onClick={() => navigate(`/courses?id=${c.id}`)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                            <img
                                src={c.image_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=200&h=200&fit=crop'}
                                alt={c.title}
                                title={c.title}
                                style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                                onError={e => { e.target.src = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=200&h=200&fit=crop'; }}
                            />
                            <div style={{ flex: 1 }}>
                                <h4 style={{ fontSize: 16, marginBottom: 4 }}>{c.title}</h4>
                                <p style={{ fontSize: 13, color: '#8892b0' }}>{c.category} • {c.difficulty} • {c.duration || 'No duration set'}{c.video_count > 0 ? ` • ${c.video_count} video${c.video_count === 1 ? '' : 's'}` : ''}</p>
                            </div>
                            <button onClick={e => { e.stopPropagation(); startEdit(c); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><span className="material-icons" style={{ color: '#8892b0' }}>edit</span></button>
                            <button onClick={e => { e.stopPropagation(); deleteCourse(c.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><span className="material-icons" style={{ color: '#ff4d4d' }}>delete</span></button>
                        </div>
                    ))}
                </div>
            )}
        </MentorLayout>
    );
}

const inputStyle = { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'white', fontSize: 14 };
