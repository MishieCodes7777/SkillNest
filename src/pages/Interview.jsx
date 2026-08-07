import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';

export default function Interview() {
    const [company, setCompany] = useState('');
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');

    const topics = ['', 'DSA', 'OS', 'DBMS', 'System Design', 'OOPs', 'Computer Networks', 'Behavioral'];

    async function generate() {
        if (!company) { alert('Enter a company name'); return; }
        setLoading(true); setResult('');
        try {
            const res = await fetch('/api/ai/interview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company, topic }) });
            const data = await res.json();
            if (data.success) setResult(data.response);
            else setResult('Could not generate. Try again.');
        } catch (e) { setResult('Server unavailable.'); }
        setLoading(false);
    }

    return (
        <AppLayout>
            <div style={{ maxWidth: 850, margin: '0 auto', padding: '60px 30px 40px' }}>
                <div style={{ textAlign: 'center', marginBottom: 30, paddingLeft: 55 }}><h1 style={{ fontSize: 24, marginBottom: 6 }}>AI Interview Practice</h1><p style={{ color: '#8892b0', fontSize: 14 }}>Prepare for your dream company with AI-powered questions</p></div>

                {!result && !loading && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 30 }}>
                        <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company name (e.g. Google, Amazon, Microsoft...)" style={{ width: '100%', padding: 13, background: '#1c1c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: 14, marginBottom: 15 }} />
                        <p style={{ fontSize: 13, color: '#8892b0', marginBottom: 10 }}>Select topic (optional):</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                            {topics.map(t => <button key={t || 'all'} onClick={() => setTopic(t)} style={{ padding: '8px 14px', background: topic === t ? 'linear-gradient(45deg,#FF4FA3,#A855F7)' : 'rgba(255,255,255,0.03)', border: `1px solid ${topic === t ? 'transparent' : 'rgba(255,255,255,0.08)'}`, borderRadius: 20, color: 'white', fontSize: 13, cursor: 'pointer' }}>{t || 'Full Syllabus'}</button>)}
                        </div>
                        <button onClick={generate} style={{ width: '100%', padding: 14, background: 'linear-gradient(45deg,#FF4FA3,#A855F7)', border: 'none', borderRadius: 10, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Generate Interview Prep</button>
                    </div>
                )}

                {loading && <div style={{ textAlign: 'center', padding: 50, color: '#888' }}>AI is fetching interview data...</div>}

                {result && (
                    <div>
                        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>Interview Prep: <span style={{ color: '#FF4FA3' }}>{company}</span></h2>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 24 }}>
                            <div style={{ fontSize: 14, color: '#ccc', lineHeight: 1.8, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: formatMd(result) }} />
                        </div>
                        <button onClick={() => setResult('')} style={{ display: 'block', margin: '20px auto', padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', cursor: 'pointer' }}>Try Another Company</button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMd(t) {
    t = escapeHtml(t);
    return t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code style="background:rgba(168,85,247,0.15);padding:2px 6px;border-radius:4px;color:#c4a5ff;">$1</code>').replace(/^### (.*?)$/gm, '<h3 style="margin:12px 0 6px;font-size:15px;">$1</h3>').replace(/^## (.*?)$/gm, '<h2 style="margin:15px 0 8px;font-size:17px;">$1</h2>').replace(/^- (.*?)$/gm, '<li>$1</li>').replace(/\n/g, '<br>');
}
