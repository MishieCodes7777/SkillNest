import React from 'react';
import MentorLayout from '../../components/MentorLayout';

export default function MentorEarnings() {
    return (
        <MentorLayout>
            <h1 style={{ fontSize: 22, marginBottom: 20, paddingLeft: 50 }}>Earnings</h1>
            <div className="m-stats">
                <div className="m-stat"><div className="ms-val">$0</div><div className="ms-label">Total Earnings</div></div>
                <div className="m-stat"><div className="ms-val">$0</div><div className="ms-label">This Month</div></div>
                <div className="m-stat"><div className="ms-val">0</div><div className="ms-label">Paid Students</div></div>
                <div className="m-stat"><div className="ms-val">0%</div><div className="ms-label">Platform Fee</div></div>
            </div>
            <div className="m-card">
                <h3><span className="material-icons">info</span> Revenue Model</h3>
                <p style={{ color: '#ccc', fontSize: 14, lineHeight: 1.6 }}>
                    SkillNest takes a small commission only when you earn. Revenue streams include:
                    premium courses, 1-on-1 mentoring sessions, digital resources, and personalized coaching.
                    <br /><br />Your earnings will appear here once payment integration is live.
                </p>
            </div>
        </MentorLayout>
    );
}
