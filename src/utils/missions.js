// ===== DAILY MISSIONS SYSTEM =====
// Missions are auto-verified — never manually checkable

import { getUserEmail } from './auth';

const MISSIONS_KEY_PREFIX = 'skillnest_missions_';

export function getMissionsKey() {
    return MISSIONS_KEY_PREFIX + getUserEmail() + '_' + new Date().toDateString();
}

export function getDailyMissions() {
    const saved = localStorage.getItem(getMissionsKey());
    if (saved) return JSON.parse(saved);

    // Generate fresh missions for today
    const missions = [
        { id: 'arena', text: 'Complete Skill Arena Challenge', xp: 50, completed: false },
        { id: 'quiz', text: 'Practice 10 Quiz Questions', xp: 50, completed: false },
        { id: 'ai_mentor', text: 'Ask AI Mentor a Question', xp: 25, completed: false },
        { id: 'roadmap', text: 'Review or Generate AI Roadmap', xp: 25, completed: false },
        { id: 'profile', text: 'Visit Your Profile', xp: 25, completed: false },
    ];

    localStorage.setItem(getMissionsKey(), JSON.stringify(missions));
    return missions;
}

export function completeMission(missionId) {
    const missions = getDailyMissions();
    const mission = missions.find(m => m.id === missionId);
    if (mission && !mission.completed) {
        mission.completed = true;
        localStorage.setItem(getMissionsKey(), JSON.stringify(missions));
        return mission; // return for XP reward
    }
    return null;
}

export function getMissionProgress() {
    const missions = getDailyMissions();
    const completed = missions.filter(m => m.completed).length;
    const total = missions.length;
    const totalXP = missions.reduce((sum, m) => sum + (m.completed ? m.xp : 0), 0);
    const allDone = completed === total;
    return { completed, total, totalXP, allDone, pct: Math.round((completed / total) * 100) };
}

// Call this from other pages to auto-complete missions
export function trackActivity(activityType) {
    const missionMap = {
        'arena_completed': 'arena',
        'quiz_completed': 'quiz',
        'ai_mentor_used': 'ai_mentor',
        'roadmap_viewed': 'roadmap',
        'profile_visited': 'profile',
    };

    const missionId = missionMap[activityType];
    if (missionId) {
        return completeMission(missionId);
    }
    return null;
}
