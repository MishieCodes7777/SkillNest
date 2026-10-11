import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import PreviewLayout from '../components/PreviewLayout';
import { api } from '../utils/api';
import '../styles/learning.css';

export default function ResearchMatches({ preview = false }) {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function search(e) {
        e.preventDefault(); setBusy(true); setError(''); setResult(null);
        try { setResult(await api(`/api/research/matches?q=${encodeURIComponent(query)}${preview ? '&preview=true' : ''}`)); }
        catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    const Layout = preview ? PreviewLayout : AppLayout;
    return <Layout><main className="learn-page">
        <div className="learn-eyebrow">RESEARCH THAT CONNECTS</div><h1>Find a mentor through their work.</h1>
        <p className="research-note">Describe your interest. Explore mentors whose imported papers share relevant terms and topics.</p>
        {preview && <p className="learn-alert">Example mode uses two real papers grouped into demonstration collections. These are not registered mentors. Try “computer vision” or “natural language processing”.</p>}
        <form className="research-form" onSubmit={search}><input className="learn-input" aria-label="Research interest" placeholder="e.g. computer vision, neural networks" value={query} onChange={e => setQuery(e.target.value)} minLength={2} maxLength={200} required /><button className="learn-primary" disabled={busy}>{busy ? 'Finding relevant work…' : 'Find research matches →'}</button></form>
        {error && <p role="alert" className="learn-alert">{error}</p>}
        {result && <>
            <p role="status" className="research-note">{result.matches.length} matches from {result.model.documents} distinct imported papers.{result.corpusLimited && ' Search is limited to the latest 5,000 publication records.'}</p>
            <div className="research-list">{result.matches.map(m => <section className="learn-card" key={m.id}><h2>{m.name}</h2><p className="research-note">Why this match: these papers overlap with your research interest.</p>{m.papers.map(p => <article className="research-paper" key={p.id}><div className="research-paper-copy"><h3>{p.title}</h3><div className="learn-inline-tags">{p.matchedTerms.map(term => <span key={term}>{term}</span>)}</div><a href={p.url} target="_blank" rel="noreferrer">Original publication ↗</a></div></article>)}<div className="research-form"><Link className="learn-primary" to={preview ? '/preview/research/papers' : `/u/${m.id}/research`}>Research papers →</Link>{!preview && <Link className="learn-secondary" to={`/u/${m.id}`}>View mentor profile</Link>}</div></section>)}</div>
            {!result.matches.length && <section className="learn-card learn-empty"><h2>{result.model.documents ? 'No matching research yet' : 'The research collection is still growing'}</h2><p>{result.model.documents ? 'Try a more specific term from your topic. This model does not understand every synonym.' : 'Matches will appear after mentors import their publications.'}</p></section>}
            <details className="learn-model"><summary>How research matching works</summary><p>{result.model.name} · {result.model.documents} papers · {result.model.vocabulary} learned terms.</p><p>{result.model.notice}</p><p>The model fits word weights from the current publication collection. It does not call an AI API or assign an “expertise accuracy” percentage.</p></details>
        </>}
    </main></Layout>;
}
