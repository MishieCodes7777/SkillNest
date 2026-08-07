import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCurrentUser, logout } from '../utils/auth';
import '../styles/sidebar.css';

const navItems = [
    { path: '/', icon: 'home', label: 'Home' },
    { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/sessions', icon: 'videocam', label: 'Sessions' },
    { path: '/messages', icon: 'chat', label: 'Messages' },
    { path: '/community', icon: 'groups', label: 'Community' },
    { path: '/courses', icon: 'school', label: 'Courses' },
    { path: '/profile', icon: 'person', label: 'Profile' },
];

const aiItems = [
    { path: '/ai-mentor', icon: 'smart_toy', label: 'AI Mentor' },
    { path: '/ai-roadmap', icon: 'map', label: 'AI Roadmap' },
    { path: '/arena', icon: 'emoji_events', label: 'Skill Arena' },
    { path: '/interview', icon: 'psychology', label: 'Interview Prep' },
    { path: '/resume-review', icon: 'description', label: 'Resume Review' },
    { path: '/achievements', icon: 'military_tech', label: 'Achievements' },
];

// Add mentor link if user is a mentor
const mentorLink = { path: '/mentor/dashboard', icon: 'swap_horiz', label: 'Mentor Portal' };

export default function Sidebar() {
    const [open, setOpen] = useState(false);
    const location = useLocation();
    const user = getCurrentUser();
    const isMentor = user?.role === 'mentor' || (user?.roles && user.roles.includes('mentor'));

    function handleLogout() {
        logout();
        window.location.href = '/login';
    }

    return (
        <>
            {/* Hamburger */}
            {!open && (
                <button className="sn-hamburger" onClick={() => setOpen(true)}>
                    <span className="material-icons">menu</span>
                </button>
            )}

            {/* Overlay */}
            {open && <div className="sn-overlay" onClick={() => setOpen(false)} />}

            {/* Sidebar */}
            <div className={`sn-sidebar ${open ? 'open' : ''}`}>
                <div className="sn-sidebar-header">
                    <Link to="/" className="sn-sidebar-logo">SkillNest</Link>
                    <button className="sn-sidebar-close" onClick={() => setOpen(false)}>
                        <span className="material-icons">close</span>
                    </button>
                </div>

                {navItems.map(item => (
                    <Link key={item.path} to={item.path} className={`sn-nav-item ${location.pathname === item.path ? 'active' : ''}`} onClick={() => setOpen(false)}>
                        <span className="material-icons">{item.icon}</span> {item.label}
                    </Link>
                ))}

                <div className="sn-nav-divider" />

                {aiItems.map(item => (
                    <Link key={item.path} to={item.path} className={`sn-nav-item ${location.pathname === item.path ? 'active' : ''}`} onClick={() => setOpen(false)}>
                        <span className="material-icons">{item.icon}</span> {item.label}
                    </Link>
                ))}

                {isMentor ? (
                    <>
                        <div className="sn-nav-divider" />
                        <Link to={mentorLink.path} className="sn-nav-item" onClick={() => setOpen(false)} style={{ color: '#A855F7' }}>
                            <span className="material-icons">{mentorLink.icon}</span> {mentorLink.label}
                        </Link>
                    </>
                ) : (
                    <>
                        <div className="sn-nav-divider" />
                        <Link to="/become-mentor" className="sn-nav-item" onClick={() => setOpen(false)} style={{ color: '#A855F7' }}>
                            <span className="material-icons">workspace_premium</span> Become a Mentor
                        </Link>
                    </>
                )}
            </div>
        </>
    );
}
