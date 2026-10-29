import React from 'react';
import { Link } from 'react-router-dom';
import ParticleBackground from '../three/ParticleBackground';
import '../styles/home.css';

export default function Home() {
    return (
        <div className="home-page">
            <ParticleBackground />
            <div className="content">
                <nav className="home-nav">
                    <div className="logo">SkillNest</div>
                </nav>

                <section className="hero">
                    <h1>Learn Skills Together, Anywhere</h1>
                    <p>Join live peer-taught sessions. Connect with mentors, learn in real-time, and grow with AI-powered guidance.</p>
                    <div className="hero-cta">
                        <Link to="/signup" className="btn btn-primary">Get Started Free</Link>
                        <Link to="/login" className="btn btn-secondary">I have an account</Link>
                    </div>
                </section>

                <section className="features">
                    <h2>Everything you need to learn and grow</h2>
                    <div className="features-grid">
                        <FeatureCard icon="&#127909;" title="Live Sessions" desc="Join real-time video sessions with mentors and peers. Learn by doing, not just watching." />
                        <FeatureCard icon="&#129302;" title="AI Mentor" desc="Ask anything — CS concepts, coding help, career advice. Get instant, detailed answers." />
                        <FeatureCard icon="&#128506;" title="AI Learning Roadmap" desc="Tell us what you know. AI generates a personalized week-by-week plan to reach your goals." />
                        <FeatureCard icon="&#128101;" title="Peer-to-Peer" desc="Learn from real people. Anyone can teach. Connect with mentors in your field of interest." />
                        <FeatureCard icon="&#128200;" title="Track Progress" desc="See your learning streaks, completed sessions, and skill growth on a personalized dashboard." />
                        <FeatureCard icon="&#128274;" title="Controlled connections" desc="Mentor applications are reviewed. Connections require acceptance before private messaging." />
                    </div>
                </section>

                <section className="skills-section">
                    <h2>Skills you can learn</h2>
                    <div className="skills-grid">
                        {['React.js', 'Node.js', 'Python', 'AI / ML', 'Data Science', 'Cloud Computing', 'DevOps', 'DSA', 'Cyber Security', 'UI/UX Design', 'Mobile Dev', 'Blockchain', 'System Design', 'TypeScript', 'PostgreSQL'].map(s => (
                            <div className="skill-tag" key={s}>{s}</div>
                        ))}
                        <div className="skill-tag" key="more">and many more...</div>
                    </div>
                </section>

                <section className="cta-section">
                    <h2>Ready to start learning?</h2>
                    <p>Join learners who are growing their skills every day</p>
                    <Link to="/signup" className="btn btn-primary btn-lg">Create Free Account</Link>
                </section>

                <footer className="home-footer">
                    <div className="footer-brand">SkillNest</div>
                    <div className="footer-links">
                        <Link to="/login">Login</Link>
                        <Link to="/signup">Sign Up</Link>
                    </div>
                </footer>
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, desc }) {
    return (
        <div className="feature-card">
            <div className="feature-icon">{icon}</div>
            <h3>{title}</h3>
            <p>{desc}</p>
        </div>
    );
}
