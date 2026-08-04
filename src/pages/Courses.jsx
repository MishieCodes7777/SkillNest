import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import DomeGallery from '../components/DomeGallery';

const COURSES = [
    { src: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=400&fit=crop', alt: 'React', title: 'React Development', desc: 'Build modern UIs with components, hooks, and state management' },
    { src: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=400&fit=crop', alt: 'JavaScript', title: 'JavaScript', desc: 'Core language fundamentals, ES6+, async patterns' },
    { src: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=400&fit=crop', alt: 'Python', title: 'Python Programming', desc: 'From basics to advanced — data science, ML, automation' },
    { src: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=400&fit=crop', alt: 'Cloud', title: 'Cloud Computing', desc: 'AWS, GCP, Azure — deploy and scale applications' },
    { src: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=400&fit=crop', alt: 'Code', title: 'DSA & Problem Solving', desc: 'Arrays, trees, graphs, dynamic programming' },
    { src: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=400&fit=crop', alt: 'Laptop', title: 'Full Stack Development', desc: 'Frontend + Backend + Database — complete web apps' },
    { src: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&h=400&fit=crop', alt: 'AI', title: 'Machine Learning', desc: 'Neural networks, deep learning, model training' },
    { src: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop', alt: 'Data', title: 'Data Science', desc: 'Pandas, visualization, statistics, insights' },
    { src: 'https://images.unsplash.com/photo-1563986768609-322da13575f2?w=400&h=400&fit=crop', alt: 'Mobile', title: 'Mobile Development', desc: 'React Native, Flutter — cross-platform apps' },
    { src: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=400&h=400&fit=crop', alt: 'Design', title: 'UI/UX Design', desc: 'Figma, prototyping, user research, design systems' },
    { src: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=400&fit=crop', alt: 'Network', title: 'Cyber Security', desc: 'Ethical hacking, networking, security protocols' },
    { src: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=400&h=400&fit=crop', alt: 'Docker', title: 'DevOps & Docker', desc: 'Containers, CI/CD, Kubernetes, deployment' },
    { src: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=400&fit=crop', alt: 'Database', title: 'Database Systems', desc: 'SQL, PostgreSQL, MongoDB, Redis' },
    { src: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=400&fit=crop', alt: 'Team', title: 'System Design', desc: 'Scalability, load balancing, microservices' },
];

export default function Courses() {
    const [selected, setSelected] = useState(null);
    const [courses, setCourses] = useState(COURSES);

    useEffect(() => {
        // Try to load real courses from DB
        fetch('/api/courses').then(r => r.json()).then(data => {
            if (data.success && data.courses.length > 0) {
                // Use real courses from mentors (Cloudinary images)
                const real = data.courses.map(c => ({
                    src: c.image_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=400&fit=crop',
                    alt: c.title,
                    title: c.title,
                    desc: c.description,
                    category: c.category,
                    mentor: c.mentor_name,
                    difficulty: c.difficulty,
                }));
                setCourses(real);
            }
            // If no courses in DB, keep placeholder images
        }).catch(() => { });
    }, []);

    return (
        <AppLayout>
            <div style={{ height: 'calc(100vh - 60px)', position: 'relative' }}>
                {!selected ? (
                    <>
                        <div style={{ position: 'absolute', top: 20, left: 0, right: 0, textAlign: 'center', zIndex: 10, pointerEvents: 'none' }}>
                            <h1 style={{ fontSize: 28, marginBottom: 6, paddingLeft: 55 }}>Browse Courses</h1>
                            <p style={{ color: '#8892b0', fontSize: 14 }}>Drag to explore. Click a course to learn more.</p>
                        </div>
                        <DomeGallery
                            images={COURSES}
                            segments={20}
                            grayscale={false}
                            overlayBlurColor="#050816"
                            onTileClick={(item) => setSelected(COURSES.find(c => c.src === item.src))}
                        />
                    </>
                ) : (
                    <div style={{ padding: '80px 40px', maxWidth: 600, margin: '0 auto' }}>
                        <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', padding: '8px 16px', cursor: 'pointer', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="material-icons" style={{ fontSize: 18 }}>arrow_back</span> Back to Courses
                        </button>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 30, textAlign: 'center' }}>
                            <img src={selected.src} alt={selected.alt} style={{ height: 40, marginBottom: 20 }} />
                            <h2 style={{ fontSize: 24, marginBottom: 10 }}>{selected.title}</h2>
                            <p style={{ color: '#8892b0', fontSize: 15, marginBottom: 20, lineHeight: 1.6 }}>{selected.desc}</p>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                <a href="/ai-roadmap" style={{ padding: '10px 20px', background: 'linear-gradient(45deg,#FF4FA3,#A855F7)', borderRadius: 8, color: 'white', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Generate Roadmap</a>
                                <a href="/arena" style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: 14, textDecoration: 'none' }}>Practice Quiz</a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
