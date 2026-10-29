import React from 'react';
import AppLayout from '../components/AppLayout';
import CommunityFeed from '../components/CommunityFeed';
import {Link} from 'react-router-dom';

export default function Community() {
    return (
        <AppLayout>
            <div className="sn-community-heading">
                <span className="sn-eyebrow">THE SKILLNEST COMMUNITY</span><h1>Build something. Share the journey.</h1>
                <p>Project updates, useful questions and people learning alongside you.</p>
                <div className="sn-community-links"><Link to="/help/ask">Ask for help</Link><Link to="/messages">Find & connect</Link><Link to="/profile">Complete your profile</Link></div>
            </div>
            <CommunityFeed />
        </AppLayout>
    );
}
