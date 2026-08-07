import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, isLoggedIn, logout } from '../utils/auth';
import '../styles/mentor.css';

const mentorNav = [
    { path: '/mentor/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/mentor/courses', icon: 'school', label: 'My Courses' },
    { path: '/mentor/students', icon: 'people', label: 'Students' },
    { path: '/mentor/sessions', icon: 'videocam', label: 'Sessions' },
    { path: '/mentor/community', icon: 'forum', label: 'Community' },
    { path: '/mentor/resources', icon: 'folder', label: 'Resources' },
    { path: '/mentor/earnings', icon: 'payments', label: 'Earnings' },
    { path: '/mentor/settings', icon: 'settings', label: 'Settings' },
];

export default function MentorLayout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getCurrentUser();
    const [sideOpen, setSideOpen] = useState(false);
    const [avatarOpen, setAvatarOpen] = useState(false);
    const isMentor = user?.role === 'mentor' || (user?.roles && user.roles.includes('mentor'));

    useEffect(() => {
        if (!isLoggedIn()) { navigate('/login'); return; }
        // Login alone used to be enough to reach every /mentor/* page — anyone
        // could type the URL. Now the account must actually hold the mentor role.
        if (!isMentor) { navigate('/become-mentor'); return; }
    }, []);

    if (!isLoggedIn() || !isMentor) return null;

    const ddLinkStyle = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', color: '#ccc', fontSize: 13, cursor: 'pointer', transition: '0.2s' };

    return (
        <div className="mentor-app">
            {/* Sidebar */}
            {!sideOpen && <button className="m-hamburger" onClick={() => setSideOpen(true)}><span className="material-icons">menu</span></button>}
            {sideOpen && <div className="m-overlay" onClick={() => setSideOpen(false)} />}
            <aside className={`m-sidebar ${sideOpen ? 'open' : ''}`}>
                <div className="m-sidebar-header">
                    <Link to="/mentor/dashboard" className="m-logo">SkillNest <span>Mentor</span></Link>
                    <button className="m-close" onClick={() => setSideOpen(false)}><span className="material-icons">close</span></button>
                </div>
                <nav className="m-nav">
                    {mentorNav.map(item => (
                        <Link key={item.path} to={item.path} className={`m-nav-item ${location.pathname === item.path ? 'active' : ''}`} onClick={() => setSideOpen(false)}>
                            <span className="material-icons">{item.icon}</span>{item.label}
                        </Link>
                    ))}
                </nav>
                <div className="m-sidebar-footer">
                    <Link to="/dashboard" className="m-nav-item"><span className="material-icons">swap_horiz</span>Switch to Student</Link>
                </div>
            </aside>

            {/* Main */}
            <div className="m-main">
                <header className="m-topbar">
                    <div />
                    <div className="m-topbar-right">
                        <span className="material-icons">notifications</span>
                        <div style={{ position: 'relative' }}>
                            <div className="m-avatar" onClick={() => setAvatarOpen(!avatarOpen)}>{user?.name?.charAt(0).toUpperCase()}</div>
                            {avatarOpen && (
                                <div style={{ position: 'absolute', top: 42, right: 0, minWidth: 200, background: 'rgba(12,12,30,0.98)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px 0', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', zIndex: 60 }}>
                                    <div style={{ padding: '10px 16px', fontSize: 13, color: '#8892b0', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{user?.name}</div>
                                    <div onClick={() => { setAvatarOpen(false); navigate('/mentor/settings'); }} style={ddLinkStyle}><span className="material-icons" style={{ fontSize: 18, color: '#8892b0' }}>person</span> Mentor Profile</div>
                                    <div onClick={() => { setAvatarOpen(false); navigate('/mentor/dashboard'); }} style={ddLinkStyle}><span className="material-icons" style={{ fontSize: 18, color: '#8892b0' }}>dashboard</span> Dashboard</div>
                                    <div onClick={() => { setAvatarOpen(false); navigate('/dashboard'); }} style={ddLinkStyle}><span className="material-icons" style={{ fontSize: 18, color: '#8892b0' }}>swap_horiz</span> Switch to Student</div>
                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                                    <div onClick={() => { logout(); window.location.href = '/login'; }} style={{ ...ddLinkStyle, color: '#ff4d4d' }}><span className="material-icons" style={{ fontSize: 18, color: '#ff4d4d' }}>logout</span> Log Out</div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <div className="m-content">{children}</div>
            </div>
        </div>
    );
}
