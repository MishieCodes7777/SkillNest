import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/learning.css';
export default function PreviewLayout({ children }) {
    const location = useLocation();
    return <><header className="learn-preview-nav"><Link to="/" className="learn-brand">Skill<span>Nest</span><small>PRODUCT PREVIEW</small></Link><nav aria-label="Preview navigation"><Link className={location.pathname === '/preview' ? 'active' : ''} to="/preview">Learning studio</Link><Link className={location.pathname === '/preview/research' ? 'active' : ''} to="/preview/research">Research profiles</Link><Link to="/preview/research-match">Research matches</Link><Link to="/login">Sign in ↗</Link></nav></header><div className="learn-preview-note">Interactive preview · Assessment answers here are temporary. Sign in to save your progress to your account.</div>{children}</>;
}
