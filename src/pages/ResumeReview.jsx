import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { getUserData, saveUserData } from '../utils/auth';

export default function ResumeReview() {
    const [step, setStep] = useState('upload');
    const [feedback, setFeedback] = useState(null);
    const [fileName, setFileName] = useState('');

    function handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; }
        // Plain-text reading only extracts real content from .txt — PDF/DOCX
        // are binary formats and need a real parser, which isn't wired up yet.
        if (!file.name.toLowerCase().endsWith('.txt')) {
            alert('For accurate feedback, please upload a .txt file for now — PDF/DOCX parsing isn\'t supported yet.');
            return;
        }
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => { analyze(ev.target.result); };
        reader.readAsText(file);
    }

    async function analyze(content) {
        setStep('loading');
        const cleaned = content.replace(/[^\x20-\x7E\n\r]/g, ' ');
        let fb;
        try {
            const res = await fetch('/api/ai/resume-review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                body: JSON.stringify({ resumeText: cleaned }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            fb = data.feedback;
        } catch (e) {
            // AI unavailable — fall back to keyword-based scoring rather than a dead end
            fb = performAnalysis(cleaned.toLowerCase());
        }
        setFeedback(fb);
        setStep('results');
        const d = getUserData(); d.activity.unshift({ text: `Reviewed resume (Score: ${fb.score}/100)`, time: 'Just now' }); saveUserData(d);
    }

    function performAnalysis(t) {
        let score = 0, strengths = [], improvements = [], critical = [];
        if (t.includes('@')) { score += 8; strengths.push('Email found'); } else critical.push('No email address found');
        if (/\d{10}/.test(t)) score += 5; else improvements.push('Add phone number');
        if (t.includes('linkedin')) { score += 5; strengths.push('LinkedIn included'); } else improvements.push('Add LinkedIn profile');
        if (t.includes('github')) { score += 5; strengths.push('GitHub linked'); } else improvements.push('Add GitHub link');
        if (t.includes('education') || t.includes('university') || t.includes('degree')) { score += 10; strengths.push('Education section present'); } else critical.push('Missing Education section');
        if (t.includes('experience') || t.includes('internship')) { score += 12; strengths.push('Experience found'); } else improvements.push('Add Experience/Internship section');
        if (t.includes('project')) { score += 12; strengths.push('Projects included'); } else critical.push('Missing Projects section');
        if (t.includes('skill') || t.includes('technologies')) { score += 10; strengths.push('Skills section present'); } else critical.push('No Skills section');
        if (/\d+%|\d+\s*(users|reduced|improved)/.test(t)) { score += 10; strengths.push('Quantifiable metrics used'); } else improvements.push('Add measurable impact (numbers, percentages)');
        if (['developed', 'built', 'designed', 'implemented', 'created'].some(v => t.includes(v))) { score += 8; strengths.push('Strong action verbs'); } else improvements.push('Use action verbs (Built, Developed, Implemented)');
        if (t.includes('certif') || t.includes('course')) { score += 5; strengths.push('Certifications mentioned'); } else improvements.push('Add certifications/courses');
        if (t.includes('achievement') || t.includes('award') || t.includes('hackathon')) { score += 7; strengths.push('Achievements found'); } else improvements.push('Add achievements section');
        return { score: Math.min(score, 100), strengths, improvements, critical };
    }

    return (
        <AppLayout>
            <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 30px 40px' }}>
                <div style={{ textAlign: 'center', marginBottom: 35, paddingLeft: 55 }}><h1 style={{ fontSize: 24, marginBottom: 6 }}>AI Resume Reviewer</h1><p style={{ color: '#8892b0', fontSize: 14 }}>Upload your resume and get instant feedback</p></div>

                {step === 'upload' && (
                    <div onClick={() => document.getElementById('fileInput').click()} style={{ background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(168,85,247,0.3)', borderRadius: 16, padding: 50, textAlign: 'center', cursor: 'pointer' }}>
                        <span className="material-icons" style={{ fontSize: 48, color: '#A855F7', marginBottom: 15 }}>cloud_upload</span>
                        <h3 style={{ marginBottom: 8 }}>Drop your resume here</h3>
                        <p style={{ color: '#8892b0', fontSize: 14 }}>.txt files — max 5MB (PDF/DOCX parsing coming soon)</p>
                        {fileName && <p style={{ color: '#34c759', marginTop: 10, fontSize: 13 }}>{fileName}</p>}
                        <input id="fileInput" type="file" accept=".txt" onChange={handleFile} style={{ display: 'none' }} />
                    </div>
                )}

                {step === 'loading' && <div style={{ textAlign: 'center', padding: 50, color: '#888' }}>Analyzing your resume...</div>}

                {step === 'results' && feedback && (
                    <div>
                        <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 30, marginBottom: 20 }}>
                            <div style={{ width: 100, height: 100, borderRadius: '50%', border: `4px solid ${feedback.score >= 70 ? '#34c759' : feedback.score >= 40 ? '#f5a623' : '#ff4d4d'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 28, fontWeight: 'bold', color: feedback.score >= 70 ? '#34c759' : feedback.score >= 40 ? '#f5a623' : '#ff4d4d' }}>{feedback.score}</div>
                            <h3>{feedback.score >= 70 ? 'Strong Resume' : feedback.score >= 40 ? 'Needs Improvement' : 'Major Issues'}</h3>
                        </div>

                        {feedback.critical.length > 0 && <FeedbackSection title="Critical Issues" items={feedback.critical} color="#ff4d4d" icon="error" />}
                        {feedback.improvements.length > 0 && <FeedbackSection title="Suggestions" items={feedback.improvements} color="#f5a623" icon="warning" />}
                        {feedback.strengths.length > 0 && <FeedbackSection title="Strengths" items={feedback.strengths} color="#34c759" icon="check_circle" />}

                        <button onClick={() => { setStep('upload'); setFeedback(null); setFileName(''); }} style={{ display: 'block', margin: '20px auto', padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', cursor: 'pointer' }}>Review Another</button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function FeedbackSection({ title, items, color, icon }) {
    return (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20, marginBottom: 15 }}>
            <h4 style={{ fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><span className="material-icons" style={{ color, fontSize: 20 }}>{icon}</span>{title}</h4>
            {items.map((item, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 14, color: '#ccc' }}><span style={{ color, fontSize: 14 }}>•</span>{item}</div>)}
        </div>
    );
}
