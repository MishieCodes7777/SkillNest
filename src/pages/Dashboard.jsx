import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { getCurrentUser, getUserData, saveUserData, getUserEmail } from '../utils/auth';
import { checkAndUnlockBadges, getUserBadges, ALL_BADGES, RARITY_COLORS } from '../utils/badges';
import { getDailyMissions, getMissionProgress } from '../utils/missions';
import '../styles/dashboard.css';
import { api } from '../utils/api';

export default function Dashboard() {
    const [data, setData] = useState(getUserData());
    const [learning, setLearning] = useState(null);
    const [learningError, setLearningError] = useState('');
    const user = getCurrentUser();
    const userName = user?.name || 'User';
    const email = getUserEmail();
    const badgeData = getUserBadges(email);
    const missions = getDailyMissions();
    const missionProgress = getMissionProgress();
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    useEffect(() => {
        api('/api/learning/overview').then(setLearning).catch(e => setLearningError(e.message));
        const d = getUserData();
        const today = new Date().toDateString();
        if (d.lastVisit !== today) {
            if (d.lastVisit) {
                const last = new Date(d.lastVisit);
                const diff = Math.floor((new Date() - last) / (1000 * 60 * 60 * 24));
                if (diff === 1) d.streak++;
                else if (diff > 1) d.streak = 1;
            } else { d.streak = 1; }
            d.lastVisit = today;
            saveUserData(d);
        }
        setData(d);
        checkAndUnlockBadges(email, d);
    }, []);

    const todayFocus = getTodayFocus(learning);
    const aiAdvice = learningError ? 'Learning progress could not be loaded. Open Learning Studio to try again.' : todayFocus.reason;
    const recentBadges = badgeData.unlocked.slice(-4).reverse().map(b => ALL_BADGES.find(a => a.id === b.id)).filter(Boolean);

    return (
        <AppLayout>
            <div className="dash-container">
                <Link to="/learning" style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', padding: '20px 24px', marginBottom: 22, border: '1px solid #a77bdd55', borderRadius: 14, background: 'linear-gradient(120deg,#a16ed422,#17172d)' }}><div><strong style={{ color: '#d2b7f4' }}>Your Learning Studio is ready</strong><p style={{ fontSize: 13, color: '#aaa0bb', marginTop: 5 }}>Check your skills. Follow a path shaped by your progress.</p></div><span style={{ color: '#c5a4ef' }}>Explore →</span></Link>
                {/* === AI DAILY BRIEF (Information only, NO checkboxes) === */}
                <div className="daily-brief">
                    <div className="db-header">
                        <h1>{greeting}, {userName}!</h1>
                        <p>Here's your personalized learning summary for today</p>
                    </div>
                    <div className="db-grid">
                        <div className="db-item"><span className="db-icon">&#128197;</span><div><strong>Live Sessions Today</strong><p>{data.upcomingSessions.length > 0 ? data.upcomingSessions[0].title : 'No sessions scheduled'}</p></div></div>
                        <div className="db-item"><span className="db-icon">&#129504;</span><div><strong>Today's Weak Topic</strong><p>{todayFocus.topic}</p></div></div>
                        <div className="db-item"><span className="db-icon">&#128293;</span><div><strong>Learning Streak</strong><p>{data.streak} {data.streak === 1 ? 'Day' : 'Days'}</p></div></div>
                        <div className="db-item"><span className="db-icon">&#127942;</span><div><strong>Daily XP Goal</strong><p>150 XP</p></div></div>
                    </div>
                    <div className="db-recommendation">
                        <strong>Practice suggestion</strong>
                        <p>{todayFocus.reason}</p>
                    </div>
                    <Link to="/learning" className="db-cta-btn">Start Learning</Link>
                </div>

                {/* === STATS === */}
                <div className="stats-row">
                    <StatCard icon="&#128293;" value={data.streak} label="Streak" />
                    <StatCard icon="&#127909;" value={data.sessions} label="Sessions" />
                    <StatCard icon="&#128218;" value={data.skills.length} label="Skills" />
                    <StatCard icon="&#128100;" value={data.mentors} label="Mentors" />
                    <StatCard icon="&#127942;" value={badgeData.xp} label="XP" />
                    <StatCard icon="&#127895;" value={badgeData.level} label="Level" />
                </div>

                <div className="dash-grid">
                    {/* === DAILY MISSIONS (Auto-verified task tracker, NO manual checkboxes) === */}
                    <div className="dash-card missions-card">
                        <h3><span className="material-icons">flag</span> Daily Missions <span className="xp-tag">+{missionProgress.totalXP + (missionProgress.allDone ? 150 : 0)} XP</span></h3>
                        <div className="mission-progress">
                            <span>{missionProgress.completed} / {missionProgress.total} Completed</span>
                            <div className="mp-bar"><div className="mp-fill" style={{ width: missionProgress.pct + '%' }} /></div>
                        </div>
                        <div className="missions-list">
                            {missions.map((m, i) => (
                                <div key={i} className={`mission-row ${m.completed ? 'done' : ''}`}>
                                    <span className="mission-check">{m.completed ? <span className="material-icons" style={{ fontSize: 18, color: '#34c759' }}>check_circle</span> : <span className="material-icons" style={{ fontSize: 18, color: '#555' }}>radio_button_unchecked</span>}</span>
                                    <span className="mission-text">{m.text}</span>
                                    <span className="mission-xp">+{m.xp}</span>
                                </div>
                            ))}
                        </div>
                        {missionProgress.allDone && <div className="missions-bonus">All missions complete! +150 Bonus XP</div>}
                    </div>

                    {/* === AI COACH === */}
                    <div className="dash-card ai-coach-card">
                        <h3><span className="material-icons">psychology</span> Learning Coach</h3>
                        <p className="coach-msg">{aiAdvice}</p>
                        <div className="coach-actions">
                            <Link to="/ai-mentor" className="coach-btn">Ask AI Mentor</Link>
                            <Link to="/ai-roadmap" className="coach-btn secondary">Study Plan</Link>
                        </div>
                    </div>
                </div>

                <div className="dash-grid">
                    {/* === TODAY'S FOCUS === */}
                    <div className="dash-card focus-card">
                        <h3><span className="material-icons">center_focus_strong</span> Today's Focus</h3>
                        <div className="focus-topic">{todayFocus.topic}</div>
                        <div className="focus-confidence">Recent answer accuracy: <span>{todayFocus.confidence === null ? 'Not assessed' : `${todayFocus.confidence}%`}</span></div>
                        <div className="focus-reason-text">{todayFocus.detail}</div>
                        <div className="focus-actions">
                            <Link to="/learning" className="focus-btn">Practice</Link>
                            <Link to="/ai-mentor" className="focus-btn">Ask AI</Link>
                        </div>
                    </div>

                    {/* === SKILL ARENA SNAPSHOT === */}
                    <div className="dash-card">
                        <h3><span className="material-icons">emoji_events</span> Skill Arena</h3>
                        <div className="arena-snap">
                            <div className="as-row"><span>Level</span><strong>{badgeData.level}</strong></div>
                            <div className="as-row"><span>Total XP</span><strong>{badgeData.xp}</strong></div>
                            <div className="as-row"><span>Badges</span><strong>{badgeData.unlocked.length}</strong></div>
                            <div className="as-row"><span>Next Level</span><strong>{500 - (badgeData.xp % 500)} XP away</strong></div>
                        </div>
                        <div className="as-progress"><div className="as-fill" style={{ width: ((badgeData.xp % 500) / 500 * 100) + '%' }} /></div>
                        <Link to="/arena" className="coach-btn" style={{ marginTop: 12, display: 'inline-block' }}>Enter Arena</Link>
                    </div>
                </div>

                <div className="dash-grid">
                    {/* === RECENT ACHIEVEMENTS === */}
                    <div className="dash-card">
                        <h3><span className="material-icons">military_tech</span> Recent Achievements</h3>
                        {recentBadges.length > 0 ? (
                            <div className="badge-showcase">{recentBadges.map((b, i) => (
                                <div key={i} className="badge-item" style={{ borderColor: RARITY_COLORS[b.rarity] + '40' }}><span className="badge-icon">{b.icon}</span><span className="badge-name">{b.name}</span><span className="badge-rarity" style={{ color: RARITY_COLORS[b.rarity] }}>{b.rarity}</span></div>
                            ))}</div>
                        ) : <p className="empty-hint">Complete activities to earn your first badge</p>}
                        <Link to="/achievements" className="view-all-link">View All Achievements</Link>
                    </div>

                    {/* === QUICK ACTIONS === */}
                    <div className="dash-card">
                        <h3><span className="material-icons">bolt</span> Quick Actions</h3>
                        <div className="quick-actions">
                            <Link to="/sessions" className="qa-btn"><span className="material-icons">videocam</span> Session</Link>
                            <Link to="/arena" className="qa-btn"><span className="material-icons">emoji_events</span> Arena</Link>
                            <Link to="/interview" className="qa-btn"><span className="material-icons">psychology</span> Interview</Link>
                            <Link to="/messages" className="qa-btn"><span className="material-icons">chat</span> Messages</Link>
                            <Link to="/resume-review" className="qa-btn"><span className="material-icons">description</span> Resume</Link>
                            <Link to="/ai-roadmap" className="qa-btn"><span className="material-icons">map</span> Roadmap</Link>
                        </div>
                    </div>
                </div>

                {/* === WEEKLY ANALYTICS === */}
                <div className="dash-card" style={{ marginBottom: 18 }}>
                    <h3><span className="material-icons">analytics</span> This Week</h3>
                    <div className="analytics-grid">
                        <div className="a-item"><div className="a-val">{data.weeklyHours}h</div><div className="a-label">Study Hours</div></div>
                        <div className="a-item"><div className="a-val">{data.weeklySessions}</div><div className="a-label">Sessions</div></div>
                        <div className="a-item"><div className="a-val">{data.milestones}</div><div className="a-label">Tasks Done</div></div>
                        <div className="a-item"><div className="a-val">{badgeData.xp}</div><div className="a-label">XP Earned</div></div>
                    </div>
                </div>

                {/* === RECENT ACTIVITY === */}
                {data.activity.length > 0 && (
                    <div className="dash-card">
                        <h3><span className="material-icons">history</span> Recent Activity</h3>
                        {data.activity.slice(0, 5).map((a, i) => (
                            <div className="timeline-item" key={i}><div className="tl-dot" /><div><h4>{a.text}</h4><p>{a.time}</p></div></div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function StatCard({ icon, value, label }) {
    return <div className="stat-card"><div className="stat-icon" dangerouslySetInnerHTML={{ __html: icon }} /><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>;
}

function getTodayFocus(learning) {
    const topic = learning?.topics.filter(t => t.attempts > 0).sort((a, b) => a.accuracy - b.accuracy)[0];
    if (topic) {
        return {
            topic: topic.name,
            confidence: topic.accuracy,
            reason: `Review ${topic.name}: ${topic.accuracy}% of your recent answers were correct. Your Learning Studio has source-linked practice material.`,
            detail: `Based on ${topic.attempts} saved answers across ${topic.distinctQuestions} distinct questions. This is a practice signal, not a mastery rating.`
        };
    }
    return {
        topic: 'Get Started',
        confidence: null,
        reason: 'Take a short Learning Studio skill check to find a useful starting point.',
        detail: 'No saved assessment evidence yet. Your suggestions will update after a skill check.'
    };
}
