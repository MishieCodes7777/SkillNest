import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '../utils/auth';
import '../styles/community.css';

function authHeaders(extra) {
    const token = localStorage.getItem('token');
    return { 'Authorization': 'Bearer ' + token, ...extra };
}

function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd';
    return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function Avatar({ author, size = 44 }) {
    const initial = author.name?.charAt(0).toUpperCase() || '?';
    return author.profile_photo ? (
        <img src={author.profile_photo} alt="" className="cf-avatar" style={{ width: size, height: size }} />
    ) : (
        <div className="cf-avatar cf-avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.4 }}>{initial}</div>
    );
}

// filterUserId: when set, shows only that user's posts (profile page). Otherwise the full shared feed.
export default function CommunityFeed({ filterUserId }) {
    const me = getCurrentUser();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [draft, setDraft] = useState('');
    const [draftImage, setDraftImage] = useState('');
    const [posting, setPosting] = useState(false);

    useEffect(() => { load(); }, [filterUserId]);

    function load() {
        setLoading(true);
        const url = filterUserId ? `/api/community/posts/user/${filterUserId}` : '/api/community/posts';
        fetch(url, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { if (d.success) { setPosts(d.posts); setError(''); } else setError(d.message || 'Could not load posts.'); })
            .catch(() => setError('Could not connect to the server.'))
            .finally(() => setLoading(false));
    }

    async function publish() {
        if (!draft.trim() || posting) return;
        setPosting(true);
        try {
            const res = await fetch('/api/community/posts', {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ content: draft.trim(), image_url: draftImage.trim() }),
            });
            const data = await res.json();
            if (data.success) {
                setDraft(''); setDraftImage('');
                if (!filterUserId || String(filterUserId) === String(me?.id)) setPosts(prev => [data.post, ...prev]);
            } else { alert(data.message || 'Could not publish post.'); }
        } catch (e) { alert('Could not connect to the server.'); }
        setPosting(false);
    }

    async function toggleLike(post) {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, liked_by_me: !p.liked_by_me, like_count: p.like_count + (p.liked_by_me ? -1 : 1) } : p));
        try {
            const res = await fetch(`/api/community/posts/${post.id}/like`, { method: 'POST', headers: authHeaders() });
            const data = await res.json();
            if (data.success) setPosts(prev => prev.map(p => p.id === post.id ? { ...p, liked_by_me: data.liked, like_count: data.like_count } : p));
        } catch (e) { /* optimistic state stands; a refresh will reconcile */ }
    }

    async function removePost(post) {
        if (!confirm('Delete this post?')) return;
        setPosts(prev => prev.filter(p => p.id !== post.id));
        await fetch(`/api/community/posts/${post.id}`, { method: 'DELETE', headers: authHeaders() }).catch(() => { });
    }

    return (
        <div className="cf-wrap">
            {!filterUserId && (
                <div className="cf-composer">
                    <Avatar author={{ name: me?.name, profile_photo: '' }} size={44} />
                    <div className="cf-composer-main">
                        <textarea
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            placeholder="Share something progressive or informative with the SkillNest community..."
                            maxLength={3000}
                        />
                        {draftImage && <img src={draftImage} alt="" className="cf-composer-preview" onError={() => { }} />}
                        <div className="cf-composer-row">
                            <input
                                className="cf-image-input"
                                value={draftImage}
                                onChange={e => setDraftImage(e.target.value)}
                                placeholder="Optional image URL"
                            />
                            <button className="cf-post-btn" onClick={publish} disabled={!draft.trim() || posting}>{posting ? 'Posting...' : 'Post'}</button>
                        </div>
                    </div>
                </div>
            )}

            {loading && <div className="cf-empty">Loading posts...</div>}
            {!loading && error && <div className="cf-empty cf-error">{error}</div>}
            {!loading && !error && posts.length === 0 && (
                <div className="cf-empty">{filterUserId ? 'No posts yet.' : 'No posts yet. Be the first to share something with the community!'}</div>
            )}

            {!loading && posts.map(post => (
                <Post key={post.id} post={post} me={me} onLike={() => toggleLike(post)} onDelete={() => removePost(post)} />
            ))}
        </div>
    );
}

function Post({ post, me, onLike, onDelete }) {
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [comments, setComments] = useState(null);
    const [commentInput, setCommentInput] = useState('');
    const [commentCount, setCommentCount] = useState(post.comment_count);
    const isMine = String(post.author.id) === String(me?.id);

    function openComments() {
        setCommentsOpen(v => !v);
        if (!comments) {
            fetch(`/api/community/posts/${post.id}/comments`, { headers: authHeaders() })
                .then(r => r.json()).then(d => setComments(d.success ? d.comments : []))
                .catch(() => setComments([]));
        }
    }

    async function addComment() {
        if (!commentInput.trim()) return;
        const text = commentInput.trim();
        setCommentInput('');
        try {
            const res = await fetch(`/api/community/posts/${post.id}/comments`, {
                method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ content: text }),
            });
            const data = await res.json();
            if (data.success) { setComments(prev => [...(prev || []), data.comment]); setCommentCount(c => c + 1); }
        } catch (e) { }
    }

    return (
        <article className="cf-post">
            <div className="cf-post-head">
                <Link to={`/u/${post.author.id}`} className="cf-post-author">
                    <Avatar author={post.author} />
                    <div>
                        <div className="cf-author-name">{post.author.name}</div>
                        <div className="cf-author-meta">{post.author.role === 'mentor' ? 'Mentor' : 'Learner'} &middot; {timeAgo(post.created_at)}</div>
                    </div>
                </Link>
                {isMine && <button className="cf-delete-btn" onClick={onDelete} title="Delete post"><span className="material-icons">delete_outline</span></button>}
            </div>

            <p className="cf-post-content">{post.content}</p>
            {post.image_url && <img src={post.image_url} alt="" className="cf-post-image" onError={e => { e.target.style.display = 'none'; }} />}

            <div className="cf-post-actions">
                <button className={`cf-action ${post.liked_by_me ? 'active' : ''}`} onClick={onLike}>
                    <span className="material-icons">{post.liked_by_me ? 'favorite' : 'favorite_border'}</span> {post.like_count > 0 ? post.like_count : ''} Like
                </button>
                <button className="cf-action" onClick={openComments}>
                    <span className="material-icons">chat_bubble_outline</span> {commentCount > 0 ? commentCount : ''} Comment
                </button>
            </div>

            {commentsOpen && (
                <div className="cf-comments">
                    {comments === null && <div className="cf-comments-loading">Loading comments...</div>}
                    {comments?.map(c => (
                        <div className="cf-comment" key={c.id}>
                            <div className="cf-avatar cf-avatar-fallback cf-avatar-sm">{c.name.charAt(0).toUpperCase()}</div>
                            <div className="cf-comment-body">
                                <span className="cf-comment-name">{c.name}</span>
                                <span className="cf-comment-text">{c.content}</span>
                                <div className="cf-comment-time">{timeAgo(c.created_at)}</div>
                            </div>
                        </div>
                    ))}
                    <div className="cf-comment-input-row">
                        <input value={commentInput} onChange={e => setCommentInput(e.target.value)} placeholder="Write a comment..." onKeyPress={e => { if (e.key === 'Enter') addComment(); }} />
                        <button onClick={addComment} disabled={!commentInput.trim()}><span className="material-icons">send</span></button>
                    </div>
                </div>
            )}
        </article>
    );
}
