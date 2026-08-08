import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import { getCurrentUser } from '../utils/auth';
import '../styles/messages.css';

function authHeaders(extra) {
    return { 'Authorization': 'Bearer ' + localStorage.getItem('token'), ...extra };
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    return Math.floor(diff / 86400) + 'd';
}

export default function Messages() {
    const me = getCurrentUser();
    const [tab, setTab] = useState('chats');
    const [search, setSearch] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [connections, setConnections] = useState([]);
    const [currentChat, setCurrentChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const chatRef = useRef();

    useEffect(() => { loadAll(); }, []);
    useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

    function loadAll() {
        fetch('/api/auth/users', { headers: authHeaders() }).then(r => r.json())
            .then(d => { if (d.success) setAllUsers((d.users || []).filter(u => String(u.id) !== String(me?.id))); }).catch(() => { });
        fetch('/api/messages', { headers: authHeaders() }).then(r => r.json())
            .then(d => { if (d.success) setConversations(d.conversations); }).catch(() => { });
        fetch('/api/connections', { headers: authHeaders() }).then(r => r.json())
            .then(d => { if (d.success) setConnections(d.connections); }).catch(() => { });
    }

    function openChat(user) {
        setCurrentChat(user);
        fetch(`/api/messages/${user.id}`, { headers: authHeaders() }).then(r => r.json())
            .then(d => { if (d.success) setMessages(d.messages); })
            .catch(() => setMessages([]));
    }

    async function sendMsg() {
        if (!input.trim() || !currentChat) return;
        const text = input.trim();
        setInput('');
        try {
            const res = await fetch(`/api/messages/${currentChat.id}`, {
                method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ content: text }),
            });
            const data = await res.json();
            if (data.success) { setMessages(prev => [...prev, data.message]); loadAll(); }
            else alert(data.message || 'Could not send message.');
        } catch (e) { alert('Could not connect to the server.'); }
    }

    async function sendRequest(userId) {
        try {
            const res = await fetch('/api/connections/request', {
                method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ toUserId: userId }),
            });
            const data = await res.json();
            if (data.success) loadAll(); else alert(data.message);
        } catch (e) { }
    }

    async function respond(connId, action) {
        try {
            await fetch(`/api/connections/${connId}/${action}`, { method: 'POST', headers: authHeaders() });
            loadAll();
        } catch (e) { }
    }

    function connectionState(userId) {
        return connections.find(c => String(c.user_id) === String(userId));
    }

    const incomingRequests = connections.filter(c => c.direction === 'incoming' && c.status === 'pending');
    const acceptedIds = new Set(connections.filter(c => c.status === 'accepted').map(c => String(c.user_id)));

    const chatsFiltered = conversations.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    const findFiltered = allUsers
        .filter(u => u.name.toLowerCase().includes(search.toLowerCase()))
        .filter(u => !acceptedIds.has(String(u.id)));

    return (
        <AppLayout>
            <div className="msg-app">
                <div className="msg-left">
                    <div className="msg-header">
                        <h2>Messages</h2>
                        <div className="msg-tabs">
                            <button className={tab === 'chats' ? 'active' : ''} onClick={() => setTab('chats')}>Chats</button>
                            <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>
                                Requests{incomingRequests.length > 0 ? ` (${incomingRequests.length})` : ''}
                            </button>
                            <button className={tab === 'find' ? 'active' : ''} onClick={() => setTab('find')}>Find People</button>
                        </div>
                        {tab !== 'requests' && <input className="msg-search" value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === 'chats' ? 'Search chats...' : 'Search by name...'} />}
                    </div>
                    <div className="msg-list">
                        {tab === 'chats' && (
                            chatsFiltered.length === 0 ? <div className="msg-empty">No conversations yet. Connect with people in "Find People" to start chatting.</div> :
                                chatsFiltered.map(c => (
                                    <div key={c.user_id} className={`contact-item ${currentChat?.id === c.user_id ? 'active' : ''}`} onClick={() => openChat({ id: c.user_id, name: c.name })}>
                                        <div className="c-av">{c.name.charAt(0).toUpperCase()}</div>
                                        <div className="c-info"><h4>{c.name}</h4><p>{c.last_message || 'Say hello!'}</p></div>
                                        {c.unread_count > 0 && <span className="msg-badge">{c.unread_count}</span>}
                                    </div>
                                ))
                        )}

                        {tab === 'requests' && (
                            incomingRequests.length === 0 ? <div className="msg-empty">No pending requests.</div> :
                                incomingRequests.map(r => (
                                    <div className="req-item" key={r.id}>
                                        <div className="c-av">{r.name.charAt(0).toUpperCase()}</div>
                                        <div className="c-info"><h4>{r.name}</h4><p>Wants to connect</p></div>
                                        <div className="req-actions">
                                            <button className="req-accept" onClick={() => respond(r.id, 'accept')}><span className="material-icons">check</span></button>
                                            <button className="req-reject" onClick={() => respond(r.id, 'reject')}><span className="material-icons">close</span></button>
                                        </div>
                                    </div>
                                ))
                        )}

                        {tab === 'find' && (
                            findFiltered.length === 0 ? <div className="msg-empty">No one found.</div> :
                                findFiltered.map(u => {
                                    const conn = connectionState(u.id);
                                    let btn;
                                    if (!conn) btn = <button className="conn-btn" onClick={() => sendRequest(u.id)}>Connect</button>;
                                    else if (conn.status === 'pending' && conn.direction === 'outgoing') btn = <button className="conn-btn pending" disabled>Requested</button>;
                                    else if (conn.status === 'pending' && conn.direction === 'incoming') btn = <button className="conn-btn" onClick={() => setTab('requests')}>Respond</button>;
                                    else if (conn.status === 'rejected') btn = <button className="conn-btn" onClick={() => sendRequest(u.id)}>Connect</button>;
                                    return (
                                        <div className="user-card" key={u.id}>
                                            <div className="c-av">{u.name.charAt(0).toUpperCase()}</div>
                                            <div className="c-info"><h4>{u.name}</h4><p>{u.role}</p></div>
                                            {btn}
                                        </div>
                                    );
                                })
                        )}
                    </div>
                </div>
                <div className="msg-right">
                    {!currentChat ? (
                        <div className="msg-empty-chat"><span className="material-icons">chat_bubble_outline</span><p>Select a conversation</p></div>
                    ) : (
                        <>
                            <div className="msg-chat-header"><div className="c-av">{currentChat.name.charAt(0).toUpperCase()}</div><h3>{currentChat.name}</h3></div>
                            <div className="msg-chat-area" ref={chatRef}>
                                {messages.length === 0 ? <div className="msg-empty" style={{ paddingTop: '40px' }}>No messages yet. Say hello!</div> :
                                    messages.map(m => (
                                        <div key={m.id} className={`bubble ${String(m.sender_id) === String(me?.id) ? 'sent' : 'received'}`}>
                                            {m.content}
                                            <span className="bubble-time">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    ))}
                            </div>
                            <div className="msg-input-area">
                                <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." onKeyPress={e => { if (e.key === 'Enter') sendMsg(); }} />
                                <button onClick={sendMsg}><span className="material-icons">send</span></button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
