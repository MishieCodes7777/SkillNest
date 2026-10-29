import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import MentorLayout from '../../components/MentorLayout';

export default function MentorSessions() {
    const navigate = useNavigate();

    async function createSession() {
        try {const {room}=await api('/api/meetings',{method:'POST',body:'{}'});navigate(`/meeting?meet=${room.id}`);}
        catch(e){alert(e.message);}
    }

    return (
        <MentorLayout>
            <h1 style={{ fontSize: 22, marginBottom: 20, paddingLeft: 50 }}>Live Sessions</h1>
            <div className="m-card">
                <h3><span className="material-icons">videocam</span> Create New Session</h3>
                <p style={{ color: '#8892b0', fontSize: 14, marginBottom: 15 }}>Start a live session. Invite an accepted connection from inside the room. A room code alone does not grant access.</p>
                <button className="m-btn" onClick={createSession}>Start Live Session</button>
            </div>
            <div className="m-card">
                <h3><span className="material-icons">history</span> Past Sessions</h3>
                <p className="m-empty">No past sessions recorded yet.</p>
            </div>
        </MentorLayout>
    );
}
