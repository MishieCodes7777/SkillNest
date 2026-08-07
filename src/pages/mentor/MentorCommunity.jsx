import React from 'react';
import MentorLayout from '../../components/MentorLayout';
import CommunityFeed from '../../components/CommunityFeed';

export default function MentorCommunity() {
    return (
        <MentorLayout>
            <div style={{ marginBottom: 10, paddingLeft: 50 }}>
                <h1 style={{ fontSize: 22, marginBottom: 6 }}>Community</h1>
                <p style={{ color: '#8892b0', fontSize: 14 }}>Post updates for your students, share resources, and see what the rest of SkillNest is talking about</p>
            </div>
            <CommunityFeed />
        </MentorLayout>
    );
}
