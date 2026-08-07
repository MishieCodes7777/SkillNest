import React, { useState, useRef, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { trackActivity } from '../utils/missions';
import '../styles/aimentor.css';

export default function AIMentor() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatRef = useRef();

    const quickPrompts = ['Explain BFS', 'REST vs GraphQL', 'Async/Await in JS', 'What is Big O?', 'React Hooks', 'System Design basics'];

    useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

    async function sendMessage(text) {
        const msg = text || input.trim();
        if (!msg) return;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: msg }]);
        setLoading(true);

        try {
            const res = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) });
            const data = await res.json();
            setMessages(prev => [...prev, { role: 'ai', text: data.success ? data.response : 'Could not get response.' }]);
            if (data.success) trackActivity('ai_mentor_used');
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', text: 'Unable to connect to AI service.' }]);
        }
        setLoading(false);
    }

    return (
        <AppLayout>
            <div className="mentor-container">
                <div className="mentor-header">
                    <h1>AI Mentor</h1>
                    <p>Ask anything — CS concepts, coding help, career advice</p>
                </div>

                {messages.length === 0 && (
                    <div className="quick-prompts">
                        {quickPrompts.map(q => <button key={q} className="qp-chip" onClick={() => sendMessage(q)}>{q}</button>)}
                    </div>
                )}

                <div className="chat-area" ref={chatRef}>
                    {messages.map((m, i) => (
                        <div key={i} className={`msg ${m.role}`}>
                            <div className="msg-bubble" dangerouslySetInnerHTML={{ __html: formatText(m.text) }} />
                        </div>
                    ))}
                    {loading && <div className="msg ai"><div className="msg-bubble typing">AI is thinking...</div></div>}
                </div>

                <div className="chat-input-area">
                    <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask your AI mentor anything..." onKeyPress={e => { if (e.key === 'Enter') sendMessage(); }} />
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
    text = escapeHtml(text);
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');
    text = text.replace(/\n/g, '<br>');
    return text;
}
