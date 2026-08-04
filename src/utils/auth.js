// Auth utilities

export function getToken() {
    return localStorage.getItem('token');
}

export function getCurrentUser() {
    const s = localStorage.getItem('currentUser');
    if (s) { try { return JSON.parse(s); } catch (e) { } }
    return null;
}

export function getUserEmail() {
    const user = getCurrentUser();
    return user?.email || 'default';
}

export function getDataKey() {
    return 'skillnest_data_' + getUserEmail();
}

export function getUserData() {
    const raw = localStorage.getItem(getDataKey());
    if (raw) return JSON.parse(raw);
    return { streak: 0, sessions: 0, skills: [], mentors: 0, progress: [], upcomingSessions: [], activity: [], weeklyHours: 0, weeklySessions: 0, milestones: 0, lastVisit: null };
}

export function saveUserData(data) {
    localStorage.setItem(getDataKey(), JSON.stringify(data));
}

export function isLoggedIn() {
    return !!getToken();
}

export function logout() {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => { });
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
}
