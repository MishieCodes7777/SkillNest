import React, { useState, useEffect } from 'react';
import MentorLayout from '../../components/MentorLayout';

export default function MentorStudents() {
    const [students, setStudents] = useState(null);

    useEffect(() => {
        fetch('/api/mentor/students', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } })
            .then(r => r.json())
            .then(d => { if (d.success) setStudents(d.students); })
            .catch(() => setStudents([]));
    }, []);

    return (
        <MentorLayout>
            <h1 style={{ fontSize: 22, marginBottom: 6, paddingLeft: 50 }}>Students</h1>
            <p style={{ color: '#8892b0', fontSize: 13, marginBottom: 20, paddingLeft: 50 }}>People enrolled in your courses — not every learner on SkillNest.</p>
            {students === null ? (
                <div className="m-card"><p className="m-empty">Loading...</p></div>
            ) : students.length === 0 ? (
                <div className="m-card"><p className="m-empty">No one's enrolled in your courses yet. Once your courses have students, they'll show up here.</p></div>
            ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                    {students.map((s) => (
                        <div key={s.id} className="m-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(45deg,#A855F7,#FF4FA3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 'bold' }}>{s.name.charAt(0).toUpperCase()}</div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ fontSize: 15 }}>{s.name}</h4>
                                <p style={{ fontSize: 12, color: '#8892b0' }}>{s.email}</p>
                                <p style={{ fontSize: 11.5, color: '#A855F7', marginTop: 2 }}>
                                    Enrolled in: {s.enrollments.map(e => e.course_title).join(', ')}
                                </p>
                            </div>
                            <span style={{ fontSize: 11, color: '#8892b0' }}>Since {new Date(s.enrollments[0].enrolled_at).toLocaleDateString()}</span>
                        </div>
                    ))}
                </div>
            )}
        </MentorLayout>
    );
}
