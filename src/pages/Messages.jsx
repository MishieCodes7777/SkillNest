import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import { getCurrentUser, getUserEmail, getUserData, saveUserData } from '../utils/auth';
import '../styles/messages.css';

export default function Messages() {
    const email = getUserEmail();
    const msgKey = 'skillnest_msgs_' + email;
    const connKey = 'skillnest_conns_' + email;

    const [tab, setTab] = useState('chats');
    const [search, setSearch] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const [connections, setConnections] = useState(JSON.parse(localStorage.getItem(connKey) || '[]'));
    const [messages, setMessages] = useState(JSON.parse(localStorage.getItem(msgKey) || '{}'));
    const [currentChat, setCurrentChat] = useState(null);
    const [input, setInput] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLink, setInviteLink] = useState('');
    const chatRef = useRef();
    const me = getCurrentUser()?.name || 'You';

    useEffect(() => { fetch('/api/auth/users').then(r => r.json()).then(d => setAllUsers((d.users || []).filter(u => u.name !== me))).catch(() => { }); }, []);
    useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages, currentChat]);

    function saveConns(c) { setConnections(c); localStorage.setItem(connKey, JSON.stringify(c)); }
    function saveMsgs(m) { setMessages(m); localStorage.setItem(msgKey, JSON.stringify(m)); }

    function connectUser(name) {
        if (!connections.includes(name)) { const c = [...connections, name]; saveConns(c); }
        const d = getUserData(); d.mentors = (d.mentors || 0) + 1; d.activity.unshift({ text: 'Connected with ' + name, time: 'Just now' }); saveUserData(d);
    }

    function sendMsg() {
        if (!input.trim() || !currentChat) return;
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const updated = { ...messages, [currentChat]: [...(messages[currentChat] || []), { from: 'me', text: input.trim(), time }] };
        saveMsgs(updated);
        setInput('');
    }

    function generateInvite() {
        if (!inviteEmail.includes('@')) { alert('Enter valid email'); return; }
        const code = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        setInviteLink(window.location.origin + '/signup?ref=' + code);
    }

    const filtered = tab === 'chats' ? connections.filter(c => c.toLowerCase().includes(search.toLowerCase())) :
        allUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <AppLayout>
            <div className="msg-app">
                <div className="msg-left">
                    <div className="msg-header">
                        <h2>Messages</h2>
                        <div className="msg-tabs">
                            <button className={tab === 'chats' ? 'active' : ''} onClick={() => setTab('chats')}>Chats</button>
                            <button className={tab === 'search' ? 'active' : ''} onClick={() => setTab('search')}>Find People</button>
                            <button className={tab === 'invite' ? 'active' : ''} onClick={() => setTab('invite')}>Invite</button>
                        </div>
                        {tab !== 'invite' && <input className="msg-search" value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === 'chats' ? 'Search chats...' : 'Search by name...'} />}
                    </div>
                    <div className="msg-list">
                        {tab === 'invite' ? (
                            <div className="invite-panel">
                                <h4>Invite a Friend</h4>
                                <p>Generate a unique signup link</p>
                                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Friend's email" />
                                <button className="invite-btn" onClick={generateInvite}>Generate Link</button>
                                {inviteLink && <input className="invite-link" value={inviteLink} readOnly onClick={e => { e.target.select(); navigator.clipboard.writeText(inviteLink); }} />}
                            </div>
                        ) : tab === 'chats' ? (
                            filtered.length === 0 ? <div className="msg-empty">No conversations. Find people to connect!</div> :
                                filtered.map(name => (
                                    <div key={name} className={`contact-item ${currentChat === name ? 'active' : ''}`} onClick={() => setCurrentChat(name)}>
                                        <div className="c-av">{name.charAt(0).toUpperCase()}</div>
                                        <div className="c-info"><h4>{name}</h4><p>{(messages[name] || []).slice(-1)[0]?.text || 'No messages'}</p></div>
                                    </div>
                                ))
                        ) : (
                            filtered.length === 0 ? <div className="msg-empty">No users found</div> :
                                filtered.map(u => (
                                    <div key={u.email} className="user-card">
                                        <div className="c-av">{u.name.charAt(0).toUpperCase()}</div>
                                        <div className="c-info"><h4>{u.name}</h4><p>{u.role}</p></div>
                                        <button className={`conn-btn ${connections.includes(u.name) ? 'connected' : ''}`} onClick={() => connectUser(u.name)}>{connections.includes(u.name) ? 'Connected' : 'Connect'}</button>
                                    </div>
                                ))
                        )}
                    </div>
                </div>
                <div className="msg-right">
                    {!currentChat ? (
                        <div className="msg-empty-chat"><span className="material-icons">chat_bubble_outline</span><p>Select a conversation</p></div>
                    ) : (
                        <>
                            <div className="msg-chat-header"><div className="c-av">{currentChat.charAt(0).toUpperCase()}</div><h3>{currentChat}</h3></div>
                            <div className="msg-chat-area" ref={chatRef}>
                                {(messages[currentChat] || []).length === 0 ? <div className="msg-empty" style={{ paddingTop: '40px' }}>No messages yet. Say hello!</div> :
                                    (messages[currentChat] || []).map((m, i) => (
                                        <div key={i} className={`bubble ${m.from === 'me' ? 'sent' : 'received'}`}>{m.text}<span className="bubble-time">{m.time}</span></div>
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
