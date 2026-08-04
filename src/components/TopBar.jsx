import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser, logout } from '../utils/auth';
import '../styles/topbar.css';

export default function TopBar() {
    const [notifOpen, setNotifOpen] = useState(false);
    const [avatarOpen, setAvatarOpen] = useState(false);
    const user = getCurrentUser();
    const initial = user?.name?.charAt(0).toUpperCase() || 'U';
    const isMentor = user?.role === 'mentor' || (user?.roles && user.roles.includes('mentor')) || localStorage.getItem('skillnest_has_mentor_role') === 'true';
    const ref = useRef();

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setNotifOpen(false);
                setAvatarOpen(false);
            }
        }
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    function handleLogout() {
        logout();
        window.location.href = '/login';
    }

    return (
        <div className="sn-topbar" ref={ref}>
            <div className="tb-notif">
                <span className="material-icons" onClick={() => { setNotifOpen(!notifOpen); setAvatarOpen(false); }}>notifications</span>
                {notifOpen && (
                    <div className="tb-dropdown">
                        <div className="tb-dd-title">Notifications</div>
                        <div className="tb-dd-empty">No new notifications</div>
                    </div>
                )}
            </div>
            <div className="tb-avatar-wrap">
                <div className="tb-avatar" onClick={() => { setAvatarOpen(!avatarOpen); setNotifOpen(false); }}>{initial}</div>
                {avatarOpen && (
                    <div className="tb-dropdown">
                        <div className="tb-dd-title">{user?.name || 'User'}</div>
                        <Link to="/profile" className="tb-dd-link" onClick={() => setAvatarOpen(false)}><span className="material-icons">person</span> My Profile</Link>
                        <Link to="/dashboard" className="tb-dd-link" onClick={() => setAvatarOpen(false)}><span className="material-icons">dashboard</span> Dashboard</Link>
                        <Link to="/mentor/dashboard" className="tb-dd-link" onClick={() => setAvatarOpen(false)}><span className="material-icons">swap_horiz</span> Switch to Mentor</Link>
                        <div className="tb-dd-divider" />
                        <div className="tb-dd-link tb-logout" onClick={handleLogout}><span className="material-icons">logout</span> Log Out</div>
                    </div>
                )}
            </div>
        </div>
    );
}
