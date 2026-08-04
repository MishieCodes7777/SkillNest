import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MentorLayout from '../../components/MentorLayout';
import { getCurrentUser } from '../../utils/auth';

export default function MentorSessions() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const [sessionTitle, setSessionTitle] = useState('');

    function createSession() {
        const code = Array.from({ length: 3 }, () => Math.random().toString(36).substring(2, 5)).join('-');
        navigate(`/meeting?meet=${code}&user=${user?.name || 'Mentor'}`);
    }

    return (
        <MentorLayout>
            <h1 style={{ fontSize: 22, marginBottom: 20, paddingLeft: 50 }}>Live Sessions</h1>
            <div className="m-card">
                <h3><span className="material-icons">videocam</span> Create New Session</h3>
                <p style={{ color: '#8892b0', fontSize: 14, marginBottom: 15 }}>Start a live session. Share the meeting code with your students.</p>
                <button className="m-btn" onClick={createSession}>Start Live Session</button>
            </div>
            <div className="m-card">
                <h3><span className="material-icons">history</span> Past Sessions</h3>
                <p className="m-empty">No past sessions recorded yet.</p>
            </div>
        </MentorLayout>
    );
}
