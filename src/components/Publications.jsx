import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import '../styles/learning.css';
export function PublicationCard({ work, children }) {
    return <article className="research-paper">{children}<div className="research-paper-copy"><div className="learn-eyebrow">{work.year || 'YEAR NOT LISTED'} · {work.source}</div><h3>{work.title}</h3>{work.authors && <p>{work.authors}</p>}<div className="learn-inline-tags">{work.topics?.map(t => <span key={t}>{t}</span>)}</div><a href={work.url} target="_blank" rel="noreferrer">Publication page ↗</a>{work.full_text_url ? <a href={work.full_text_url} target="_blank" rel="noreferrer">Read full text ↗</a> : <small>Full-text availability not confirmed</small>}</div></article>;
}
export default function Publications({ userId }) {
    const [works, setWorks] = useState([]);
    useEffect(() => { let alive = true; api(`/api/research/publications/${userId}`).then(d => { if (alive) setWorks(d.publications); }).catch(() => {}); return () => { alive = false; }; }, [userId]);
    if (!works.length) return null;
    return <section style={{ maxWidth: 800, margin: '25px auto', padding: '0 30px' }}><div className="learn-row"><h2>Research papers</h2><Link className="learn-primary" to={`/u/${userId}/research`}>Research papers · {works.length} →</Link></div><p className="research-note">Browse this mentor’s imported publications and read available full text. Publication ownership is self-declared.</p><div className="research-list">{works.slice(0, 3).map(w => <PublicationCard work={w} key={w.id} />)}</div></section>;
}
