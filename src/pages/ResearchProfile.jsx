import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MentorLayout from '../components/MentorLayout';
import PreviewLayout from '../components/PreviewLayout';
import { PublicationCard } from '../components/Publications';
import { getCurrentUser } from '../utils/auth';
import { api } from '../utils/api';
import '../styles/learning.css';

const exampleWorks = [
    { external_id: 'example-1', title: 'Attention Is All You Need', year: 2017, authors: 'Ashish Vaswani and colleagues', source: 'Example publication', url: 'https://arxiv.org/abs/1706.03762', full_text_url: 'https://arxiv.org/pdf/1706.03762', topics: ['Natural language processing', 'Transformers'] },
    { external_id: 'example-2', title: 'Deep Residual Learning for Image Recognition', year: 2015, authors: 'Kaiming He and colleagues', source: 'Example publication', url: 'https://arxiv.org/abs/1512.03385', full_text_url: 'https://arxiv.org/pdf/1512.03385', topics: ['Computer vision', 'Deep learning'] },
];
export default function ResearchProfile({ preview = false }) {
    const [url, setUrl] = useState('');
    const [works, setWorks] = useState(preview ? exampleWorks : []);
    const [sources, setSources] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const user = getCurrentUser();
    async function load() { setWorks((await api(`/api/research/publications/${user.id}`)).publications); }
    useEffect(() => {
        api('/api/research/sources').then(d => setSources(d.sources)).catch(e => setError(e.message));
        if (!preview && user?.id) load().catch(e => setError(e.message));
    }, [preview]);
    async function importWorks(e) {
        e.preventDefault(); setBusy(true); setError(''); setMessage('');
        try {
            const d = await api('/api/research/import', { method: 'POST', body: JSON.stringify({ url, autoSave: true }) });
            setMessage(d.count ? `${d.count} publications imported automatically from ${d.profile.source}. Re-importing updates existing records without duplicates.` : 'This profile returned no public publications. Your existing records were kept.');
            await load();
        } catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    async function remove(id) {
        setBusy(true); setError('');
        try { await api(`/api/research/publications/${id}`, { method: 'DELETE' }); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    const Layout = preview ? PreviewLayout : MentorLayout;
    return <Layout><main className="learn-page" style={!preview ? { paddingTop: 25 } : {}}><div className="learn-heading"><div><div className="learn-eyebrow"><span className="learn-dot" /> KNOWLEDGE WORTH SHARING</div><h1>Your work.<br /><span>All in one place.</span></h1><p>Bring your publications into your mentor profile and help curious learners discover your research.</p></div><div className="learn-orbit" aria-hidden="true"><div className="learn-orbit-core">⌘</div><span className="orbit-label one">Research</span><span className="orbit-label two">Connect</span><span className="orbit-label three">Share</span></div></div>
        <section className="learn-card"><div className="learn-row"><div><h2>Paste your link. Import your research.</h2><p className="learn-muted">SkillNest fetches every available page of public publications and saves the records to your mentor profile automatically.</p></div><span className="learn-pill">Mentor-only importing</span></div>
        {preview ? <div className="research-form"><input className="learn-input" aria-label="Example profile URL" placeholder="https://orcid.org/0000-0000-0000-0000" disabled /><Link className="learn-primary" to="/mentor/research">Open Mentor Portal →</Link></div> : <form className="research-form" onSubmit={importWorks}><input className="learn-input" type="url" aria-label="Research profile URL" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://orcid.org/your-researcher-id" required maxLength={300} /><button className="learn-primary" disabled={busy}>{busy ? 'Importing publications…' : 'Import all publications →'}</button></form>}
        <div className="learn-inline-tags" aria-label="Research sources">{sources.map(source => <span key={source.name}>{source.name} · {source.enabled ? 'Connected' : 'Awaiting connection'}</span>)}</div>
        <p className="learn-fine">Paste your own profile link. Clicking import adds its public publications to your mentor profile. No paper-by-paper entry or selection is required. You can remove records afterward.</p>
        <p className="learn-fine">Only sources marked Connected are ready. Full text is linked when the source provides it; some records link to a publication page. A profile link does not verify authorship.</p>
        {busy && <p role="status" className="research-note">Fetching publication pages and saving your research. Large profiles can take a little longer; keep this page open.</p>}</section>
        {error && <div className="learn-alert" role="alert" style={{ marginTop: 20 }}>{error}</div>}{message && <p className="learn-good" role="status" style={{ marginTop: 20 }}>{message}</p>}
        <section style={{ marginTop: 35 }}><div className="learn-row"><h2>{preview ? 'A look at your future research profile' : 'Your publications'}</h2><span className="learn-pill">{works.length} records</span></div><p className="research-note">{preview ? 'Example layout using two real publications. These are not attributed to your account.' : 'These records appear on your public profile. Topic tags are supplied by the source, not a SkillNest-trained classifier.'}</p><div className="research-list">{works.map(w => <div key={w.id || w.external_id}><PublicationCard work={w} />{!preview && <button className="learn-text-button" disabled={busy} onClick={() => remove(w.id)} style={{ marginTop: 8 }}>Remove from my profile</button>}</div>)}</div>{!works.length && <div className="learn-card learn-empty"><span className="material-icons">science</span><h3>Your research belongs here.</h3><p>Paste your profile link above to get started.</p></div>}</section><footer className="learn-footer">Your research, connected to your community.<span>SkillNest</span></footer>
    </main></Layout>;
}
