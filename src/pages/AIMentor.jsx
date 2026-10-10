import React, { useState, useRef, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { trackActivity } from '../utils/missions';
import '../styles/aimentor.css';
import '../styles/learning.css';
import { api } from '../utils/api';

export default function AIMentor() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const chatRef = useRef();

    const quickPrompts = ['Explain BFS', 'REST vs GraphQL', 'Async/Await in JS', 'What is Big O?', 'React Hooks', 'System Design basics'];

    useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);
    useEffect(() => { api('/api/ai/status').then(setStatus).catch(() => {}); }, []);

    async function sendMessage(text) {
        const msg = text || input.trim();
        if (!msg || loading) return;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: msg }]);
        setLoading(true);

        try {
            const history = messages.filter(m => !m.error).slice(-12).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text.slice(0, 6000) }));
            const data = await api('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message: msg, history }) });
            setMessages(prev => [...prev, { role: 'ai', text: data.response, references: data.references, grounding: data.grounding, model: data.model }]);
            if (data.success) trackActivity('ai_mentor_used');
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', text: e.message || 'Unable to connect to AI service.', error: true }]);
        }
        setLoading(false);
    }

    return (
        <AppLayout>
            <div className="mentor-container">
                <div className="mentor-header">
                    <h1>AI Mentor</h1>
                    <p>Ask anything — CS concepts, coding help, career advice</p>
                    <p className="learn-fine">{status?.configured ? `Powered by ${status.model} · Remembers this conversation` : 'Checking AI availability…'}</p>
                    {messages.length > 0 && <button className="learn-text-button" disabled={loading} onClick={() => setMessages([])}>Start a new conversation</button>}
                </div>

                {messages.length === 0 && (
                    <div className="quick-prompts">
                        {quickPrompts.map(q => <button key={q} className="qp-chip" onClick={() => sendMessage(q)}>{q}</button>)}
                    </div>
                )}

                <div className="chat-area" ref={chatRef}>
                    {messages.map((m, i) => (
                        <div key={i} className={`msg ${m.role}`}>
                            <div className="msg-bubble">{m.model && <div className="learn-ai-meta">{m.grounding}</div>}<div dangerouslySetInnerHTML={{ __html: formatText(m.text) }} />{m.references?.length > 0 && <div className="learn-source-list">{m.references.map(r => <a href={r.url} key={r.id} target="_blank" rel="noreferrer">[{r.id}] {r.title} ↗</a>)}</div>}</div>
                        </div>
                    ))}
                    {loading && <div className="msg ai"><div className="msg-bubble typing">AI is thinking...</div></div>}
                </div>

                <div className="chat-input-area">
                    <input aria-label="Message to AI Mentor" maxLength={6000} value={input} onChange={e => setInput(e.target.value)} placeholder="Ask your AI mentor anything..." onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }} />
                    <button onClick={() => sendMessage()} disabled={loading}><span className="material-icons">send</span></button>
                </div>
            </div>
        </AppLayout>
    );
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatText(text) {
    if (!text) return '';
    return text.split(/(```[\s\S]*?```)/g).map(part => {
        if (part.startsWith('```')) return '<pre><code>' + escapeHtml(part.slice(3, -3).replace(/^[a-zA-Z0-9]+\n/, '')) + '</code></pre>';
        return escapeHtml(part).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
    }).join('');
}
