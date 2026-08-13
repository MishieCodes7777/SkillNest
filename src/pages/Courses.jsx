import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import DomeGallery from '../components/DomeGallery';

function authHeaders(extra) {
    return { 'Authorization': 'Bearer ' + localStorage.getItem('token'), ...extra };
}

function Stars({ value, size = 15 }) {
    return (
        <span style={{ letterSpacing: 1 }}>
            {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className="material-icons" style={{ fontSize: size, color: i <= Math.round(value) ? '#FFB800' : 'rgba(255,255,255,0.15)' }}>star</span>
            ))}
        </span>
    );
}

function StarPicker({ value, onChange }) {
    return (
        <span>
            {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className="material-icons" onClick={() => onChange(i)} style={{ fontSize: 30, cursor: 'pointer', color: i <= value ? '#FFB800' : 'rgba(255,255,255,0.2)' }}>star</span>
            ))}
        </span>
    );
}

const PLACEHOLDER_COURSES = [
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
    const navigate = useNavigate();
    const [selected, setSelected] = useState(null);
    const [courses, setCourses] = useState([]);
    const [usingPlaceholders, setUsingPlaceholders] = useState(true);
    const [myEnrollments, setMyEnrollments] = useState([]);
    const [busy, setBusy] = useState(false);

    const [reviews, setReviews] = useState([]);
    const [avgRating, setAvgRating] = useState(null);
    const [reviewCount, setReviewCount] = useState(0);
    const [myReview, setMyReview] = useState(undefined); // undefined = not loaded yet, null = none
    const [showRatePrompt, setShowRatePrompt] = useState(false);
    const [ratingInput, setRatingInput] = useState(0);
    const [commentInput, setCommentInput] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        fetch('/api/courses').then(r => r.json()).then(data => {
            if (data.success && data.courses.length > 0) {
                const real = data.courses.map(c => ({
                    id: c.id,
                    mentorId: c.mentor_id,
                    src: c.image_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=400&fit=crop',
                    alt: c.title,
                    title: c.title,
                    desc: c.description,
                    category: c.category,
                    mentor: c.mentor_name,
                    difficulty: c.difficulty,
                    duration: c.duration,
                    video_count: c.video_count,
                    enrolled_count: c.enrolled_count,
                    avgRating: c.avg_rating,
                    reviewCount: c.review_count,
                }));
                setCourses(real);
                setUsingPlaceholders(false);
            } else {
                setCourses(PLACEHOLDER_COURSES);
                setUsingPlaceholders(true);
            }
        }).catch(() => { setCourses(PLACEHOLDER_COURSES); setUsingPlaceholders(true); });

        fetch('/api/courses/my-enrollments', { headers: authHeaders() }).then(r => r.json())
            .then(d => { if (d.success) setMyEnrollments(d.courseIds); }).catch(() => { });
    }, []);

    const isEnrolled = selected?.id && myEnrollments.includes(selected.id);

    useEffect(() => {
        setReviews([]); setAvgRating(null); setReviewCount(0); setMyReview(undefined);
        setShowRatePrompt(false); setRatingInput(0); setCommentInput('');
        if (!selected?.id) return;

        fetch(`/api/courses/${selected.id}/reviews`).then(r => r.json()).then(d => {
            if (d.success) { setReviews(d.reviews); setAvgRating(d.avgRating); setReviewCount(d.count); }
        }).catch(() => { });

        if (isEnrolled) {
            fetch(`/api/courses/${selected.id}/reviews/mine`, { headers: authHeaders() }).then(r => r.json())
                .then(d => { if (d.success) setMyReview(d.review); }).catch(() => setMyReview(null));
        }
    }, [selected?.id, isEnrolled]);

    useEffect(() => {
        if (!selected?.id || !isEnrolled || myReview === undefined || myReview) { setShowRatePrompt(false); return; }
        const skipped = localStorage.getItem(`skillnest_skip_review_${selected.id}`);
        const laterThisSession = sessionStorage.getItem(`skillnest_later_review_${selected.id}`);
        setShowRatePrompt(!skipped && !laterThisSession);
    }, [selected?.id, isEnrolled, myReview]);

    async function toggleEnroll() {
        if (!selected?.id || busy) return;
        setBusy(true);
        try {
            if (isEnrolled) {
                await fetch(`/api/courses/${selected.id}/enroll`, { method: 'DELETE', headers: authHeaders() });
                setMyEnrollments(prev => prev.filter(id => id !== selected.id));
            } else {
                const res = await fetch(`/api/courses/${selected.id}/enroll`, { method: 'POST', headers: authHeaders() });
                const data = await res.json();
                if (data.success) setMyEnrollments(prev => [...prev, selected.id]);
                else alert(data.message);
            }
        } catch (e) { alert('Could not connect to the server.'); }
        setBusy(false);
    }

    function skipReview() {
        localStorage.setItem(`skillnest_skip_review_${selected.id}`, '1');
        setShowRatePrompt(false);
    }

    function laterReview() {
        sessionStorage.setItem(`skillnest_later_review_${selected.id}`, '1');
        setShowRatePrompt(false);
    }

    async function submitReview() {
        if (!ratingInput || submittingReview) return;
        setSubmittingReview(true);
        try {
            const res = await fetch(`/api/courses/${selected.id}/reviews`, {
                method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ rating: ratingInput, comment: commentInput.trim() }),
            });
            const data = await res.json();
            if (data.success) {
                setMyReview(data.review);
                setShowRatePrompt(false);
                localStorage.removeItem(`skillnest_skip_review_${selected.id}`);
                sessionStorage.removeItem(`skillnest_later_review_${selected.id}`);
                fetch(`/api/courses/${selected.id}/reviews`).then(r => r.json()).then(d => {
                    if (d.success) { setReviews(d.reviews); setAvgRating(d.avgRating); setReviewCount(d.count); }
                }).catch(() => { });
            } else alert(data.message);
        } catch (e) { alert('Could not submit review.'); }
        setSubmittingReview(false);
    }

    return (
        <AppLayout>
            <div style={{ height: 'calc(100vh - 60px)', position: 'relative' }}>
                {!selected ? (
                    <>
                        <div style={{ position: 'absolute', top: 20, left: 0, right: 0, textAlign: 'center', zIndex: 10, pointerEvents: 'none' }}>
                            <h1 style={{ fontSize: 28, marginBottom: 6, paddingLeft: 55 }}>Browse Courses</h1>
                            <p style={{ color: '#8892b0', fontSize: 14 }}>
                                {usingPlaceholders ? 'No courses published yet — here are some ideas of what could be taught. Drag to explore.' : 'Drag to explore. Click a course to learn more.'}
                            </p>
                        </div>
                        <DomeGallery
                            images={courses}
                            segments={20}
                            grayscale={false}
                            overlayBlurColor="#050816"
                            onTileClick={(item) => setSelected(courses.find(c => c.src === item.src))}
                        />
                    </>
                ) : (
                    <div style={{ padding: '80px 40px', maxWidth: 600, margin: '0 auto' }}>
                        <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', padding: '8px 16px', cursor: 'pointer', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="material-icons" style={{ fontSize: 18 }}>arrow_back</span> Back to Courses
                        </button>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', textAlign: 'center' }}>
                            <img src={selected.src} alt={selected.alt} style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
                            <div style={{ padding: 30 }}>
                            <h2 style={{ fontSize: 24, marginBottom: 10 }}>{selected.title}</h2>
                            {selected.mentor && (
                                selected.mentorId ? (
                                    <p onClick={() => navigate(`/u/${selected.mentorId}`)} style={{ color: '#A855F7', fontSize: 13, marginBottom: 10, cursor: 'pointer', textDecoration: 'underline' }}>Taught by {selected.mentor}</p>
                                ) : (
                                    <p style={{ color: '#A855F7', fontSize: 13, marginBottom: 10 }}>Taught by {selected.mentor}</p>
                                )
                            )}
                            {reviewCount > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
                                    <Stars value={avgRating} />
                                    <span style={{ color: '#8892b0', fontSize: 13 }}>{avgRating} ({reviewCount} review{reviewCount === 1 ? '' : 's'})</span>
                                </div>
                            )}
                            {selected.id && (selected.difficulty || selected.duration || selected.video_count > 0) && (
                                <p style={{ color: '#8892b0', fontSize: 12.5, marginBottom: 10, textTransform: 'capitalize' }}>
                                    {[selected.difficulty, selected.duration, selected.video_count > 0 ? `${selected.video_count} video${selected.video_count === 1 ? '' : 's'}` : null].filter(Boolean).join(' • ')}
                                </p>
                            )}
                            <p style={{ color: '#8892b0', fontSize: 15, marginBottom: 8, lineHeight: 1.6 }}>{selected.desc}</p>
                            {typeof selected.enrolled_count === 'number' && (
                                <p style={{ color: '#666', fontSize: 12.5, marginBottom: 20 }}>{selected.enrolled_count} {selected.enrolled_count === 1 ? 'person' : 'people'} enrolled</p>
                            )}

                            {selected.id ? (
                                <button onClick={toggleEnroll} disabled={busy} style={{ padding: '11px 26px', background: isEnrolled ? 'rgba(52,199,89,0.15)' : 'linear-gradient(45deg,#FF4FA3,#A855F7)', border: isEnrolled ? '1px solid rgba(52,199,89,0.4)' : 'none', borderRadius: 8, color: isEnrolled ? '#34c759' : 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}>
                                    {busy ? '...' : isEnrolled ? '✓ Enrolled — click to leave' : 'Enroll in this course'}
                                </button>
                            ) : (
                                <p style={{ color: '#555', fontSize: 12.5, marginBottom: 16 }}>This is an example — no mentor has published this course yet.</p>
                            )}

                            {isEnrolled && (
                                <p style={{ marginBottom: 16 }}>
                                    {myReview ? (
                                        <button onClick={() => { setRatingInput(myReview.rating); setCommentInput(myReview.comment || ''); setShowRatePrompt(true); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#8892b0', padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>Edit your review</button>
                                    ) : (
                                        <button onClick={() => setShowRatePrompt(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#8892b0', padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>Rate this course</button>
                                    )}
                                </p>
                            )}

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                <a href="/ai-roadmap" style={{ padding: '10px 20px', background: 'linear-gradient(45deg,#FF4FA3,#A855F7)', borderRadius: 8, color: 'white', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Generate Roadmap</a>
                                <a href="/arena" style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: 14, textDecoration: 'none' }}>Practice Quiz</a>
                            </div>

                            {reviews.length > 0 && (
                                <div style={{ marginTop: 26, textAlign: 'left', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
                                    <h3 style={{ fontSize: 15, marginBottom: 14, color: '#ccc' }}>Reviews</h3>
                                    <div style={{ display: 'grid', gap: 12 }}>
                                        {reviews.map(r => (
                                            <div key={r.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: 12 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: r.comment ? 6 : 0 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.student_name}</span>
                                                    <Stars value={r.rating} size={13} />
                                                </div>
                                                {r.comment && <p style={{ color: '#8892b0', fontSize: 13, lineHeight: 1.5 }}>{r.comment}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                )}

                {showRatePrompt && selected && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                        <div style={{ background: '#12121e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 30, width: 380, maxWidth: '90vw', textAlign: 'center' }}>
                            <h3 style={{ fontSize: 18, marginBottom: 6 }}>{myReview ? 'Update your review' : 'Rate this course'}</h3>
                            <p style={{ color: '#8892b0', fontSize: 13, marginBottom: 18 }}>How was "{selected.title}"?</p>
                            <div style={{ marginBottom: 16 }}><StarPicker value={ratingInput} onChange={setRatingInput} /></div>
                            <textarea
                                value={commentInput}
                                onChange={e => setCommentInput(e.target.value)}
                                placeholder="Optional: share more about your experience"
                                style={{ width: '100%', minHeight: 70, resize: 'vertical', padding: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'white', fontSize: 13, marginBottom: 18 }}
                            />
                            <button onClick={submitReview} disabled={!ratingInput || submittingReview} style={{ width: '100%', padding: 12, background: 'linear-gradient(45deg,#FF4FA3,#A855F7)', border: 'none', borderRadius: 8, color: 'white', fontSize: 14, fontWeight: 600, cursor: ratingInput ? 'pointer' : 'not-allowed', opacity: ratingInput ? 1 : 0.5, marginBottom: 10 }}>
                                {submittingReview ? 'Submitting...' : 'Submit Review'}
                            </button>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                <button onClick={laterReview} style={{ background: 'transparent', border: 'none', color: '#8892b0', fontSize: 13, cursor: 'pointer' }}>Later</button>
                                <button onClick={skipReview} style={{ background: 'transparent', border: 'none', color: '#666', fontSize: 13, cursor: 'pointer' }}>Don't ask again</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
