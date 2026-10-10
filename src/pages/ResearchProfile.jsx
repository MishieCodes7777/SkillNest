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
    const [draft, setDraft] = useState(null);
    const [selected, setSelected] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const user = getCurrentUser();
    async function load() { setWorks((await api(`/api/research/publications/${user.id}`)).publications); }
    useEffect(() => { if (!preview && user?.id) load().catch(e => setError(e.message)); }, [preview]);
    async function importWorks(e) {
        e.preventDefault(); setBusy(true); setError(''); setMessage(''); setDraft(null);
        try { const d = await api('/api/research/import', { method: 'POST', body: JSON.stringify({ url }) }); setDraft(d); setSelected(d.works.map(w => w.external_id)); }
        catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    async function confirm() {
        setBusy(true); setError('');
        try { const d = await api('/api/research/confirm', { method: 'POST', body: JSON.stringify({ id: draft.id, selected }) }); await load(); setDraft(null); setMessage(`${d.count} publication records saved. Existing records were updated without duplicates.`); }
        catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    async function remove(id) {
        setBusy(true); setError('');
        try { await api(`/api/research/publications/${id}`, { method: 'DELETE' }); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    const Layout = preview ? PreviewLayout : MentorLayout;
    return <Layout><main className="learn-page" style={!preview ? { paddingTop: 25 } : {}}><div className="learn-heading"><div><div className="learn-eyebrow"><span className="learn-dot" /> KNOWLEDGE WORTH SHARING</div><h1>Your work.<br /><span>All in one place.</span></h1><p>Bring your publications into your mentor profile and help curious learners discover your research.</p></div><div className="learn-orbit" aria-hidden="true"><div className="learn-orbit-core">⌘</div><span className="orbit-label one">Research</span><span className="orbit-label two">Connect</span><span className="orbit-label three">Share</span></div></div>
        <section className="learn-card"><div className="learn-row"><div><h2>One profile link. Less busywork.</h2><p className="learn-muted">Import from ORCID or OpenAlex, review the list, and add your publications together.</p></div><span className="learn-pill">Preview before publishing</span></div>
        {preview ? <div className="research-form"><input className="learn-input" aria-label="Example profile URL" placeholder="https://orcid.org/0000-0000-0000-0000" disabled /><Link className="learn-primary" to="/login">Sign in to import →</Link></div> : <form className="research-form" onSubmit={importWorks}><input className="learn-input" type="url" aria-label="Research profile URL" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://orcid.org/your-researcher-id" required maxLength={300} /><button className="learn-primary" disabled={busy}>{busy ? 'Working…' : 'Find my publications →'}</button></form>}
        <p className="learn-fine">Google Scholar links are not supported for bulk import. OpenAlex requires a server API key. We link to available full text; some publications have only a publisher page.</p></section>
        {error && <div className="learn-alert" role="alert" style={{ marginTop: 20 }}>{error}</div>}{message && <p className="learn-good" role="status" style={{ marginTop: 20 }}>{message}</p>}
        {draft && <section style={{ marginTop: 28 }}><div className="learn-row"><div><h2>Review {draft.works.length} publications</h2><p className="research-note">{draft.authorName || draft.profile.url} · Select only work you authored. Importing a link does not verify identity.</p></div><button className="learn-secondary" onClick={() => setSelected(selected.length ? [] : draft.works.map(w => w.external_id))}>{selected.length ? 'Deselect all' : 'Select all'}</button></div>{draft.truncated && <p className="learn-alert">This import is limited to the first 500 records.</p>}{!draft.works.length && <p className="research-note">No public publications were returned by this source.</p>}<div className="research-list">{draft.works.map(w => <PublicationCard key={w.external_id} work={w}><input type="checkbox" aria-label={`Select ${w.title}`} checked={selected.includes(w.external_id)} onChange={e => setSelected(s => e.target.checked ? [...s, w.external_id] : s.filter(id => id !== w.external_id))} /></PublicationCard>)}</div><div className="research-form"><button className="learn-primary" disabled={!selected.length || busy} onClick={confirm}>{busy ? 'Saving…' : `Add ${selected.length} publications`}</button><button className="learn-secondary" disabled={busy} onClick={() => setDraft(null)}>Cancel</button></div></section>}
        <section style={{ marginTop: 35 }}><div className="learn-row"><h2>{preview ? 'A look at your future research profile' : 'Your publications'}</h2><span className="learn-pill">{works.length} records</span></div><p className="research-note">{preview ? 'Example layout using two real publications. These are not attributed to your account.' : 'These records appear on your public profile. Topic tags are supplied by the source, not a SkillNest-trained classifier.'}</p><div className="research-list">{works.map(w => <div key={w.id || w.external_id}><PublicationCard work={w} />{!preview && <button className="learn-text-button" disabled={busy} onClick={() => remove(w.id)} style={{ marginTop: 8 }}>Remove from my profile</button>}</div>)}</div>{!works.length && <div className="learn-card learn-empty"><span className="material-icons">science</span><h3>Your research belongs here.</h3><p>Paste your profile link above to get started.</p></div>}</section><footer className="learn-footer">Your research, connected to your community.<span>SkillNest</span></footer>
    </main></Layout>;
}
