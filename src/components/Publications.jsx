import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import '../styles/learning.css';
export function PublicationCard({ work, children }) {
    return <article className="research-paper">{children}<div className="research-paper-copy"><div className="learn-eyebrow">{work.year || 'YEAR NOT LISTED'} · {work.source}</div><h3>{work.title}</h3>{work.authors && <p>{work.authors}</p>}<div className="learn-inline-tags">{work.topics?.map(t => <span key={t}>{t}</span>)}</div><a href={work.url} target="_blank" rel="noreferrer">Publication page ↗</a>{work.full_text_url ? <a href={work.full_text_url} target="_blank" rel="noreferrer">Read full text ↗</a> : <small>Full-text availability not confirmed</small>}</div></article>;
}
export default function Publications({ userId }) {
    const [works, setWorks] = useState([]);
    useEffect(() => { let alive = true; api(`/api/research/publications/${userId}`).then(d => { if (alive) setWorks(d.publications); }).catch(() => {}); return () => { alive = false; }; }, [userId]);
    if (!works.length) return null;
    return <section style={{ maxWidth: 800, margin: '25px auto', padding: '0 30px' }}><h2>Research & publications</h2><p className="research-note">Imported records selected by this mentor. Publication ownership is self-declared; topic tags come from the source.</p><div className="research-list">{works.map(w => <PublicationCard work={w} key={w.id} />)}</div></section>;
}
