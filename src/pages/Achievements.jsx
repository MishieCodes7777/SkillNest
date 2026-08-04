import React from 'react';
import AppLayout from '../components/AppLayout';
import { getUserEmail, getUserData } from '../utils/auth';
import { ALL_BADGES, RARITY_COLORS, getUserBadges } from '../utils/badges';

export default function Achievements() {
    const email = getUserEmail();
    const badgeData = getUserBadges(email);
    const userData = getUserData();
    const unlockedIds = badgeData.unlocked.map(b => b.id);
    const totalBadges = ALL_BADGES.filter(b => !b.hidden).length;
    const unlockedCount = badgeData.unlocked.length;
    const pct = Math.round((unlockedCount / totalBadges) * 100);

    const categories = [
        { id: 'streak', label: 'Learning Streaks' },
        { id: 'knowledge', label: 'Knowledge Mastery' },
        { id: 'coding', label: 'Coding Achievements' },
        { id: 'meeting', label: 'Meeting Participation' },
        { id: 'habits', label: 'Smart Learning Habits' },
        { id: 'arena', label: 'Skill Arena' },
        { id: 'career', label: 'Career & Interview' },
        { id: 'ai', label: 'AI Features' },
        { id: 'hidden', label: 'Hidden Achievements' },
    ];

    return (
        <AppLayout>
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 30px 40px' }}>
                <h1 style={{ fontSize: 24, marginBottom: 20, paddingLeft: 55 }}>Achievements</h1>

                {/* Overview */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 30 }}>
                    <StatBox label="Level" value={badgeData.level} />
                    <StatBox label="Total XP" value={badgeData.xp} />
                    <StatBox label="Badges" value={`${unlockedCount}/${totalBadges}`} />
                    <StatBox label="Streak" value={userData.streak} />
                </div>

                {/* Progress bar */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20, marginBottom: 30 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}><span>Collection Progress</span><span style={{ color: '#A855F7' }}>{pct}%</span></div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}><div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg,#FF4FA3,#A855F7)', borderRadius: 10 }} /></div>
                </div>

                {/* Badge categories */}
                {categories.map(cat => {
                    const badges = ALL_BADGES.filter(b => b.category === cat.id);
                    return (
                        <div key={cat.id} style={{ marginBottom: 25 }}>
                            <h3 style={{ fontSize: 16, marginBottom: 12, color: '#ccc' }}>{cat.label}</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                                {badges.map(badge => {
                                    const unlocked = unlockedIds.includes(badge.id);
                                    const unlockDate = badgeData.unlocked.find(b => b.id === badge.id)?.date;
                                    return (
                                        <div key={badge.id} style={{ background: unlocked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)', border: `1px solid ${unlocked ? RARITY_COLORS[badge.rarity] + '40' : 'rgba(255,255,255,0.04)'}`, borderRadius: 12, padding: 16, opacity: unlocked ? 1 : 0.4, transition: '0.3s' }}>
                                            <div style={{ fontSize: 28, marginBottom: 8 }}>{badge.hidden && !unlocked ? '???' : badge.icon}</div>
                                            <h4 style={{ fontSize: 13, marginBottom: 3 }}>{badge.hidden && !unlocked ? 'Hidden Achievement' : badge.name}</h4>
                                            <p style={{ fontSize: 11, color: '#8892b0', marginBottom: 6 }}>{badge.hidden && !unlocked ? 'Unlock to reveal' : badge.desc}</p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 10, color: RARITY_COLORS[badge.rarity], textTransform: 'uppercase', fontWeight: 600 }}>{badge.rarity}</span>
                                                <span style={{ fontSize: 10, color: '#555' }}>{unlocked ? unlockDate : `+${badge.xp} XP`}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </AppLayout>
    );
}

function StatBox({ label, value }) {
    return <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 18, textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 700, color: '#A855F7' }}>{value}</div><div style={{ fontSize: 12, color: '#8892b0', marginTop: 3 }}>{label}</div></div>;
}
