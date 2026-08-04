// ===== BADGE & ACHIEVEMENT SYSTEM =====

export const ALL_BADGES = [
    // Streak badges
    { id: 'first_step', name: 'First Step', icon: '🌱', desc: 'Complete your first activity', rarity: 'common', xp: 50, category: 'streak' },
    { id: 'streak_3', name: '3-Day Streak', icon: '🔥', desc: 'Practice 3 consecutive days', rarity: 'common', xp: 50, category: 'streak' },
    { id: 'week_warrior', name: 'Week Warrior', icon: '🔥', desc: '7-day learning streak', rarity: 'uncommon', xp: 100, category: 'streak' },
    { id: 'momentum', name: 'Momentum Master', icon: '🚀', desc: '30-day learning streak', rarity: 'epic', xp: 500, category: 'streak' },
    { id: 'unstoppable', name: 'Unstoppable', icon: '💎', desc: '100-day learning streak', rarity: 'legendary', xp: 1000, category: 'streak' },

    // Knowledge badges
    { id: 'quick_learner', name: 'Quick Learner', icon: '📚', desc: 'Score 80%+ in a quiz', rarity: 'common', xp: 50, category: 'knowledge' },
    { id: 'precision_pro', name: 'Precision Pro', icon: '🎯', desc: 'Score 100% in a quiz', rarity: 'rare', xp: 250, category: 'knowledge' },
    { id: 'quiz_champion', name: 'Quiz Champion', icon: '🏅', desc: '90%+ in 10 quizzes', rarity: 'epic', xp: 500, category: 'knowledge' },
    { id: 'knowledge_master', name: 'Knowledge Master', icon: '👑', desc: '90% avg across 50 quizzes', rarity: 'legendary', xp: 1000, category: 'knowledge' },

    // Coding badges
    { id: 'code_rookie', name: 'Code Rookie', icon: '👨‍💻', desc: 'Complete first coding challenge', rarity: 'common', xp: 50, category: 'coding' },
    { id: 'problem_solver', name: 'Problem Solver', icon: '🛠', desc: 'Complete 50 challenges', rarity: 'rare', xp: 250, category: 'coding' },
    { id: 'coding_legend', name: 'Coding Legend', icon: '🚀', desc: 'Solve 500 challenges', rarity: 'mythic', xp: 2500, category: 'coding' },

    // Meeting badges
    { id: 'active_learner', name: 'Active Learner', icon: '🎥', desc: 'Attend first live meeting', rarity: 'common', xp: 50, category: 'meeting' },
    { id: 'consistent', name: 'Consistent Attendee', icon: '📅', desc: 'Attend 10 live meetings', rarity: 'uncommon', xp: 100, category: 'meeting' },
    { id: 'classroom_champ', name: 'Classroom Champion', icon: '🏆', desc: 'Attend 100 sessions', rarity: 'legendary', xp: 1000, category: 'meeting' },

    // Smart learning badges
    { id: 'thoughtful', name: 'Thoughtful Learner', icon: '📝', desc: 'Save your first doubt', rarity: 'common', xp: 50, category: 'habits' },
    { id: 'revision_hero', name: 'Revision Hero', icon: '📖', desc: 'Complete revision packs for a week', rarity: 'rare', xp: 250, category: 'habits' },
    { id: 'memory_builder', name: 'Memory Builder', icon: '🧠', desc: 'Review flashcards 10 days in a row', rarity: 'epic', xp: 500, category: 'habits' },

    // Arena badges
    { id: 'arena_rookie', name: 'Arena Rookie', icon: '🏟', desc: 'Complete first arena challenge', rarity: 'common', xp: 50, category: 'arena' },
    { id: 'challenger', name: 'Challenger', icon: '⚔', desc: 'Complete 10 challenges', rarity: 'uncommon', xp: 100, category: 'arena' },
    { id: 'arena_champion', name: 'Arena Champion', icon: '🏆', desc: 'Complete 100 challenges', rarity: 'epic', xp: 500, category: 'arena' },
    { id: 'arena_elite', name: 'Arena Elite', icon: '💎', desc: 'Top 5% performance', rarity: 'legendary', xp: 1000, category: 'arena' },

    // Career badges
    { id: 'interview_ready', name: 'Interview Ready', icon: '🎤', desc: 'Complete first mock interview', rarity: 'uncommon', xp: 100, category: 'career' },
    { id: 'placement_ready', name: 'Placement Ready', icon: '🏅', desc: 'Reach target interview score', rarity: 'epic', xp: 500, category: 'career' },

    // AI badges
    { id: 'ai_explorer', name: 'AI Explorer', icon: '🤝', desc: 'Use AI Mentor for the first time', rarity: 'common', xp: 50, category: 'ai' },
    { id: 'ai_power_user', name: 'AI Power User', icon: '🚀', desc: 'Use all AI features', rarity: 'legendary', xp: 1000, category: 'ai' },

    // Hidden badges
    { id: 'night_owl', name: 'Night Owl', icon: '🌙', desc: 'Practice after midnight 5 times', rarity: 'rare', xp: 250, category: 'hidden', hidden: true },
    { id: 'early_bird', name: 'Early Bird', icon: '☀', desc: 'Practice before 7 AM for 7 days', rarity: 'rare', xp: 250, category: 'hidden', hidden: true },
    { id: 'speedster', name: 'Speedster', icon: '⚡', desc: 'Quiz under 2 min with 90%+', rarity: 'epic', xp: 500, category: 'hidden', hidden: true },
    { id: 'comeback_kid', name: 'Comeback Kid', icon: '🔥', desc: 'Return after 30 days inactive', rarity: 'rare', xp: 250, category: 'hidden', hidden: true },
];

export const RARITY_COLORS = {
    common: '#9ca3af', uncommon: '#34c759', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b', mythic: '#ef4444'
};

export function getBadgeKey(email) { return 'skillnest_badges_' + email; }

export function getUserBadges(email) {
    return JSON.parse(localStorage.getItem(getBadgeKey(email)) || '{"unlocked":[],"xp":0,"level":1}');
}

export function saveUserBadges(email, data) {
    localStorage.setItem(getBadgeKey(email), JSON.stringify(data));
}

export function unlockBadge(email, badgeId) {
    const data = getUserBadges(email);
    if (data.unlocked.find(b => b.id === badgeId)) return null; // already unlocked

    const badge = ALL_BADGES.find(b => b.id === badgeId);
    if (!badge) return null;

    data.unlocked.push({ id: badgeId, date: new Date().toLocaleDateString() });
    data.xp += badge.xp;
    data.level = Math.floor(data.xp / 500) + 1;
    saveUserBadges(email, data);
    return badge; // return badge for celebration
}

export function checkAndUnlockBadges(email, userData) {
    const newBadges = [];

    // Streak badges
    if (userData.streak >= 1) { const b = unlockBadge(email, 'first_step'); if (b) newBadges.push(b); }
    if (userData.streak >= 3) { const b = unlockBadge(email, 'streak_3'); if (b) newBadges.push(b); }
    if (userData.streak >= 7) { const b = unlockBadge(email, 'week_warrior'); if (b) newBadges.push(b); }
    if (userData.streak >= 30) { const b = unlockBadge(email, 'momentum'); if (b) newBadges.push(b); }
    if (userData.streak >= 100) { const b = unlockBadge(email, 'unstoppable'); if (b) newBadges.push(b); }

    // Meeting badges
    if (userData.sessions >= 1) { const b = unlockBadge(email, 'active_learner'); if (b) newBadges.push(b); }
    if (userData.sessions >= 10) { const b = unlockBadge(email, 'consistent'); if (b) newBadges.push(b); }
    if (userData.sessions >= 100) { const b = unlockBadge(email, 'classroom_champ'); if (b) newBadges.push(b); }

    // Time-based hidden badges
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) { const b = unlockBadge(email, 'night_owl'); if (b) newBadges.push(b); }
    if (hour >= 5 && hour < 7) { const b = unlockBadge(email, 'early_bird'); if (b) newBadges.push(b); }

    return newBadges;
}
