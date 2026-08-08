import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MentorLayout from '../../components/MentorLayout';
import { getCurrentUser } from '../../utils/auth';

export default function MentorDashboard() {
    const user = getCurrentUser();
    const [courses, setCourses] = useState([]);
    const [studentCount, setStudentCount] = useState(0);
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    useEffect(() => {
        fetch('/api/courses').then(r => r.json()).then(d => {
            if (d.success) setCourses(d.courses.filter(c => c.mentor_id === user?.id));
        }).catch(() => { });
        fetch('/api/mentor/students', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } }).then(r => r.json())
            .then(d => { if (d.success) setStudentCount(d.students.length); }).catch(() => { });
    }, []);

    return (
        <MentorLayout>
            <h1 style={{ fontSize: 24, marginBottom: 6, paddingLeft: 50 }}>{greeting}, {user?.name}!</h1>
            <p style={{ color: '#8892b0', fontSize: 14, marginBottom: 25, paddingLeft: 50 }}>Here's your mentor dashboard</p>

            <div className="m-stats">
                <div className="m-stat"><div className="ms-val">{courses.length}</div><div className="ms-label">Courses Created</div></div>
                <div className="m-stat"><div className="ms-val">{studentCount}</div><div className="ms-label">Total Students</div></div>
                <div className="m-stat"><div className="ms-val">0</div><div className="ms-label">Sessions This Week</div></div>
                <div className="m-stat"><div className="ms-val">0</div><div className="ms-label">Earnings</div></div>
            </div>

            <div className="m-grid">
                <div className="m-card">
                    <h3><span className="material-icons">school</span> Quick Actions</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <Link to="/mentor/courses" className="m-btn">Create Course</Link>
                        <Link to="/mentor/sessions" className="m-btn-outline">Schedule Session</Link>
                        <Link to="/mentor/community" className="m-btn-outline">Post Update</Link>
                    </div>
                </div>

                <div className="m-card">
                    <h3><span className="material-icons">schedule</span> Today's Schedule</h3>
                    <p className="m-empty">No sessions scheduled today</p>
                </div>
            </div>

            <div className="m-card">
                <h3><span className="material-icons">trending_up</span> Recent Activity</h3>
                {courses.length > 0 ? (
                    courses.slice(0, 3).map((c, i) => (
                        <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 14, color: '#ccc' }}>Created course: {c.title}</div>
                    ))
                ) : <p className="m-empty">No activity yet. Create your first course to get started!</p>}
            </div>
        </MentorLayout>
    );
}
