import React from 'react';
import AppLayout from '../components/AppLayout';
import CommunityFeed from '../components/CommunityFeed';

export default function Community() {
    return (
        <AppLayout>
            <div style={{ textAlign: 'center', marginBottom: 10, paddingTop: 40, paddingLeft: 55 }}>
                <h1 style={{ fontSize: 26, marginBottom: 6 }}>Community</h1>
                <p style={{ color: '#8892b0', fontSize: 14 }}>Share progress, ask questions, and learn from mentors and peers across SkillNest</p>
            </div>
            <CommunityFeed />
        </AppLayout>
    );
}
