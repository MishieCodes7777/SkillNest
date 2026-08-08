import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../utils/auth';
import '../styles/topbar.css';

function authHeaders(extra) {
    return { 'Authorization': 'Bearer ' + localStorage.getItem('token'), ...extra };
}

function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
}

const ICONS = {
    post_like: 'favorite',
    post_comment: 'chat_bubble',
    mentor_approved: 'verified',
    mentor_rejected: 'info',
    session_invite: 'videocam',
    connection_request: 'person_add',
    connection_accepted: 'how_to_reg',
    new_message: 'mail',
};

export default function TopBar() {
    const navigate = useNavigate();
    const [notifOpen, setNotifOpen] = useState(false);
    const [avatarOpen, setAvatarOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isAdmin, setIsAdmin] = useState(false);
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

    useEffect(() => {
        loadUnreadCount();
        const interval = setInterval(loadUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetch('/api/auth/am-i-admin', { headers: authHeaders() }).then(r => r.json())
            .then(d => { if (d.success) setIsAdmin(d.isAdmin); }).catch(() => { });
    }, []);

    function loadUnreadCount() {
        fetch('/api/notifications/unread-count', { headers: authHeaders() }).then(r => r.json())
            .then(d => { if (d.success) setUnreadCount(d.count); }).catch(() => { });
    }

    function openNotifications() {
        const next = !notifOpen;
        setNotifOpen(next); setAvatarOpen(false);
        if (next) {
            fetch('/api/notifications', { headers: authHeaders() }).then(r => r.json())
                .then(d => { if (d.success) setNotifications(d.notifications); }).catch(() => { });
            fetch('/api/notifications/read-all', { method: 'POST', headers: authHeaders() }).then(() => setUnreadCount(0)).catch(() => { });
        }
    }

    function goToNotification(n) {
        setNotifOpen(false);
        if (n.link) navigate(n.link);
    }

    function handleLogout() {
        logout();
        window.location.href = '/login';
    }

    return (
        <div className="sn-topbar" ref={ref}>
            <div className="tb-notif">
                <span className="material-icons" onClick={openNotifications} style={{ position: 'relative' }}>
                    notifications
                    {unreadCount > 0 && <span className="tb-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </span>
                {notifOpen && (
                    <div className="tb-dropdown tb-notif-dropdown">
                        <div className="tb-dd-title">Notifications</div>
                        {notifications.length === 0 ? (
                            <div className="tb-dd-empty">No notifications yet</div>
                        ) : notifications.map(n => (
                            <div key={n.id} className={`tb-notif-item ${n.is_read ? '' : 'unread'}`} onClick={() => goToNotification(n)}>
                                <span className="material-icons tb-notif-icon">{ICONS[n.type] || 'notifications'}</span>
                                <div>
                                    <p>{n.message}</p>
                                    <span className="tb-notif-time">{timeAgo(n.created_at)}</span>
                                </div>
                            </div>
                        ))}
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
                        {isMentor ? (
                            <Link to="/mentor/dashboard" className="tb-dd-link" onClick={() => setAvatarOpen(false)}><span className="material-icons">swap_horiz</span> Switch to Mentor</Link>
                        ) : (
                            <Link to="/become-mentor" className="tb-dd-link" onClick={() => setAvatarOpen(false)}><span className="material-icons">workspace_premium</span> Become a Mentor</Link>
                        )}
                        {isAdmin && (
                            <Link to="/admin/mentor-applications" className="tb-dd-link" onClick={() => setAvatarOpen(false)} style={{ color: '#f5a623' }}><span className="material-icons" style={{ color: '#f5a623' }}>shield</span> Admin Panel</Link>
                        )}
                        <div className="tb-dd-divider" />
                        <div className="tb-dd-link tb-logout" onClick={handleLogout}><span className="material-icons">logout</span> Log Out</div>
                    </div>
                )}
            </div>
        </div>
    );
}
