import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getUserData, saveUserData } from '../utils/auth';
import { io } from 'socket.io-client';
import SimplePeer from 'simple-peer';

export default function MeetingRoom() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const meetId = searchParams.get('meet');
    const userName = searchParams.get('user') || 'User';

    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    const [chatMsgs, setChatMsgs] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [timer, setTimer] = useState('00:00:00');
    const [remoteStreams, setRemoteStreams] = useState({});

    const localVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const socketRef = useRef(null);
    const peersRef = useRef({});
    const startTimeRef = useRef(Date.now());

    useEffect(() => {
        if (!meetId) { navigate('/sessions'); return; }
        init();
        const interval = setInterval(updateTimer, 1000);
        return () => { clearInterval(interval); cleanup(); };
    }, []);

    function updateTimer() {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const h = Math.floor(elapsed / 3600), m = Math.floor((elapsed % 3600) / 60), s = elapsed % 60;
        setTimer(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }

    async function init() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        } catch (e) { console.warn('Camera error', e); }

        const socket = io();
        socketRef.current = socket;
        socket.on('connect', () => {
            socket.emit('userconnect', { displayName: userName, meetingid: meetId });
            socket.on('all-users', users => users.forEach(u => createPeer(u.connectionId, true)));
            socket.on('user-joined', data => createPeer(data.connId, false));
            socket.on('signal', data => { if (!peersRef.current[data.from]) createPeer(data.from, false); peersRef.current[data.from].signal(data.signal); });
            socket.on('user-left', data => { if (peersRef.current[data.connId]) { peersRef.current[data.connId].destroy(); delete peersRef.current[data.connId]; } setRemoteStreams(prev => { const n = { ...prev }; delete n[data.connId]; return n; }); });
            socket.on('chat-message', data => setChatMsgs(prev => [...prev, data]));
        });
    }

    function createPeer(connId, initiator) {
        const peer = new SimplePeer({ initiator, trickle: false, stream: localStreamRef.current });
        peersRef.current[connId] = peer;
        peer.on('signal', signal => socketRef.current.emit('signal', { to: connId, signal }));
        peer.on('stream', stream => setRemoteStreams(prev => ({ ...prev, [connId]: stream })));
    }

    function cleanup() {
        if (socketRef.current) socketRef.current.disconnect();
        Object.values(peersRef.current).forEach(p => p.destroy());
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    }

    function toggleMic() { if (localStreamRef.current) { localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; }); setMicOn(p => !p); } }
    function toggleCam() { if (localStreamRef.current) { localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; }); setCamOn(p => !p); } }

    function sendChat() {
        if (!chatInput.trim()) return;
        const msg = { name: userName, text: chatInput.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        setChatMsgs(prev => [...prev, msg]);
        socketRef.current?.emit('chat-message', { ...msg, meetingid: meetId });
        setChatInput('');
    }

    function endMeeting() {
        cleanup();
        const d = getUserData(); d.sessions++; d.weeklySessions++; d.weeklyHours++; d.activity.unshift({ text: 'Completed session: ' + meetId, time: 'Just now' }); saveUserData(d);
        navigate('/dashboard');
    }

    const btnStyle = (active, color) => ({ width: 44, height: 44, borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: active ? '#2a2a2a' : (color || '#ff4d4d') });

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0A0A0A', color: 'white' }}>
            {/* Top */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: '#111', borderBottom: '1px solid #222' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}><span style={{ color: '#9F67FF', fontWeight: 'bold' }}>SkillNest</span><span style={{ fontSize: 12, color: '#666', background: '#1a1a1a', padding: '4px 10px', borderRadius: 4 }}>{meetId}</span></div>
                <span style={{ fontSize: 14, color: '#ccc', fontVariantNumeric: 'tabular-nums' }}>{timer}</span>
                <span style={{ fontSize: 12, color: '#888' }}>{Object.keys(remoteStreams).length + 1} participants</span>
            </div>

            {/* Video + Chat */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: Object.keys(remoteStreams).length > 0 ? 'repeat(auto-fit,minmax(280px,1fr))' : '1fr', gap: 10, padding: 15, alignContent: 'center' }}>
                    <div style={{ background: '#1F1F1F', borderRadius: 12, position: 'relative', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                        <span style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: 4, fontSize: 12 }}>{userName} (You)</span>
                    </div>
                    {Object.entries(remoteStreams).map(([id, stream]) => <RemoteVideo key={id} stream={stream} />)}
                </div>

                {/* Chat */}
                <div style={{ width: 280, background: '#111', borderLeft: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: 12, borderBottom: '1px solid #222', fontSize: 14, fontWeight: 600 }}>Chat</div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                        {chatMsgs.map((m, i) => <div key={i} style={{ marginBottom: 8, fontSize: 13 }}><span style={{ color: '#9F67FF', fontWeight: 600 }}>{m.name}</span> <span style={{ color: '#555', fontSize: 11 }}>{m.time}</span><div style={{ color: '#ccc' }}>{m.text}</div></div>)}
                    </div>
                    <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #222' }}>
                        <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => { if (e.key === 'Enter') sendChat(); }} placeholder="Message..." style={{ flex: 1, padding: 8, background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: 'white', fontSize: 13 }} />
                        <button onClick={sendChat} style={{ padding: '8px 12px', background: '#6C2BD9', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer' }}><span className="material-icons" style={{ fontSize: 18 }}>send</span></button>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 15, background: '#111', borderTop: '1px solid #222' }}>
                <button onClick={toggleMic} style={btnStyle(micOn)}><span className="material-icons" style={{ color: 'white', fontSize: 22 }}>{micOn ? 'mic' : 'mic_off'}</span></button>
                <button onClick={toggleCam} style={btnStyle(camOn)}><span className="material-icons" style={{ color: 'white', fontSize: 22 }}>{camOn ? 'videocam' : 'videocam_off'}</span></button>
                <button onClick={endMeeting} style={{ ...btnStyle(false, '#ff4d4d'), width: 54, borderRadius: 12 }}><span className="material-icons" style={{ color: 'white', fontSize: 22 }}>call_end</span></button>
            </div>
        </div>
    );
}

function RemoteVideo({ stream }) {
    const ref = useRef();
    useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
    return <div style={{ background: '#1F1F1F', borderRadius: 12, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><video ref={ref} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} /></div>;
}
