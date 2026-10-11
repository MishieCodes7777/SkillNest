import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import '../styles/learning.css';
import PaperReader from '../components/PaperReader';

export default function ResearchPapers({ preview = false }) {
    const { userId } = useParams();
    const [works, setWorks] = useState([]);
    const [author, setAuthor] = useState('');
    const [selected, setSelected] = useState(null);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        let alive = true;
        setLoading(true); setError(''); setSelected(null);
        api(preview ? '/api/research/examples' : `/api/research/publications/${userId}`)
            .then(d => { if (alive) { setWorks(d.publications); setAuthor(d.author?.name || 'Example collection'); } })
            .catch(e => { if (alive) setError(e.message); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [userId, preview]);
    const filtered = works.filter(w => `${w.title} ${w.authors} ${w.year || ''}`.toLowerCase().includes(query.toLowerCase()));
    return <>
        <header className="learn-preview-nav"><Link to="/" className="learn-brand">Skill<span>Nest</span><small>RESEARCH LIBRARY</small></Link><nav aria-label="Research navigation"><Link to={preview ? '/preview/research' : `/u/${userId}`}>{preview ? 'Import preview' : 'Mentor profile'}</Link><Link to="/mentor/research">Manage my research</Link></nav></header>
        <main className="learn-page">
            <div className="learn-eyebrow">{author || 'MENTOR RESEARCH'}</div><h1>Research papers</h1>
            <p className="research-note">{preview ? 'Two example papers to demonstrate the student reading experience. These are not a mentor’s claimed publications.' : 'Publications imported by this mentor. Browse the collection and read available full-text papers.'}</p>
            {error && <p className="learn-alert" role="alert">{error}</p>}
            {loading ? <p role="status">Loading research papers…</p> : <>
                <div className="research-form"><input className="learn-input" aria-label="Search research papers" placeholder="Search by title, author, or year" value={query} onChange={e => setQuery(e.target.value)} /><span className="learn-pill">{filtered.length} papers</span></div>
                {selected && <section className="learn-card research-reader" aria-label="Paper reader">
                    <div className="learn-row"><h2>{selected.title}</h2><button className="learn-secondary" onClick={() => setSelected(null)}>Close reader</button></div>
                    <p className="research-note">{selected.authors} {selected.year ? `· ${selected.year}` : ''}</p>
                    {selected.reader_url ? <><p className="learn-fine">Full paper from the original source. Use the page controls to read the whole document.</p><PaperReader key={selected.id} url={selected.reader_url} title={selected.title} /></> : <p className="research-note">{selected.full_text_url ? 'Full text is available on the source website. Open it below to read the paper.' : 'The source supplied publication details but no open full-text PDF. Open the publication page to check access.'}</p>}
                    <div className="research-form"><a className="learn-primary" href={selected.full_text_url || selected.url} target="_blank" rel="noreferrer">Open original paper ↗</a><a className="learn-secondary" href={selected.url} target="_blank" rel="noreferrer">Publication details ↗</a></div>
                </section>}
                <div className="research-list">{filtered.map(w => <article className="research-paper" key={w.id}><div className="research-paper-copy"><div className="learn-eyebrow">{w.year || 'YEAR NOT LISTED'} · {w.source}</div><h2>{w.title}</h2>{w.authors && <p>{w.authors}</p>}<div className="learn-inline-tags">{w.topics?.map(t => <span key={t}>{t}</span>)}</div><button className="learn-primary" onClick={() => { setSelected(w); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{w.reader_url ? 'Read paper on SkillNest' : 'View paper & access options'}</button><span className="research-note">{w.reader_url ? 'Full-text reader available' : w.full_text_url ? 'Full text on source website' : 'Publication details available'}</span></div></article>)}</div>
                {!filtered.length && <section className="learn-card learn-empty"><h2>{works.length ? 'No matching papers' : 'No papers published here yet'}</h2><p>{works.length ? 'Try another title, author, or year.' : 'This mentor’s imported publications will appear here automatically.'}</p></section>}
            </>}
        </main>
    </>;
}
