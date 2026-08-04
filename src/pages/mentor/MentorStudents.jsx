import React, { useState, useEffect } from 'react';
import MentorLayout from '../../components/MentorLayout';

export default function MentorStudents() {
    const [students, setStudents] = useState([]);

    useEffect(() => {
        fetch('/api/auth/users').then(r => r.json()).then(d => {
            if (d.success) setStudents(d.users.filter(u => u.role === 'learner'));
        }).catch(() => { });
    }, []);

    return (
        <MentorLayout>
            <h1 style={{ fontSize: 22, marginBottom: 20, paddingLeft: 50 }}>Students</h1>
            {students.length === 0 ? (
                <div className="m-card"><p className="m-empty">No students on the platform yet.</p></div>
            ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                    {students.map((s, i) => (
                        <div key={i} className="m-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(45deg,#A855F7,#FF4FA3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 'bold' }}>{s.name.charAt(0).toUpperCase()}</div>
                            <div style={{ flex: 1 }}><h4 style={{ fontSize: 15 }}>{s.name}</h4><p style={{ fontSize: 12, color: '#8892b0' }}>{s.email}</p></div>
                            <span style={{ fontSize: 11, color: '#8892b0' }}>{new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                    ))}
                </div>
            )}
        </MentorLayout>
    );
}
