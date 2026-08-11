import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getUserData, saveUserData, getCurrentUser, isLoggedIn } from '../utils/auth';
import { io } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import InvitePanel from '../components/InvitePanel';

export default function MeetingRoom() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    // Normalized here regardless of how someone arrived (typed code, shared
    // link, hand-edited URL) so two people can never silently land in
    // different rooms over stray whitespace or casing.
    const meetId = (searchParams.get('meet') || '').trim().toLowerCase();
    // Identity comes from the logged-in account, never from the URL — a URL
    // param can be copy-pasted or spoofed and previously showed up as your
    // name in someone else's room (and vice versa).
    const userName = getCurrentUser()?.name || 'User';
    const [authError, setAuthError] = useState('');

    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    const [chatMsgs, setChatMsgs] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [timer, setTimer] = useState('00:00:00');
    const [remoteStreams, setRemoteStreams] = useState({});
    const [inviteOpen, setInviteOpen] = useState(false);
    const [connecting, setConnecting] = useState(true);
    const [slowConnect, setSlowConnect] = useState(false);
    const [sharingScreen, setSharingScreen] = useState(false);
    const [shareAudioEnabled, setShareAudioEnabled] = useState(false);
    const [myAvatar, setMyAvatar] = useState('');
    // Per-peer info keyed by connId: { userId, avatarUrl, muted, camOff }.
    // Muted/camOff come from explicit mic-toggle/cam-toggle broadcasts (there's
    // no other reliable way to tell "silent" apart from "actually muted").
    const [remotePeers, setRemotePeers] = useState({});

    const localVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const socketRef = useRef(null);
    const peersRef = useRef({});
    const startTimeRef = useRef(Date.now());
    const iceServersRef = useRef([{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]);
    // Whichever video track is currently being sent — camera or screen. A ref
    // (not state) because createPeer/socket handlers close over it from a
    // single effect run and would otherwise see a stale value.
    const activeVideoTrackRef = useRef(null);
    const screenStreamRef = useRef(null);
    const sharingScreenRef = useRef(false);

    useEffect(() => {
        // Preserve where they were trying to go — otherwise anyone who clicks a
        // meeting link while logged out gets sent to login, signs in, and lands
        // on their dashboard with no way back to the meeting except re-sharing.
        if (!isLoggedIn()) { navigate('/login?redirect=' + encodeURIComponent(`/meeting?meet=${meetId}`)); return; }
        if (!meetId) { navigate('/sessions'); return; }
        init();
        fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } })
            .then(r => r.json()).then(d => { if (d.success) setMyAvatar(d.user.avatar_url || ''); }).catch(() => { });
        const interval = setInterval(updateTimer, 1000);
        // A free-tier backend that's been idle can take 30-60s to wake up —
        // without this, that delay looks identical to the meeting being broken.
        const slowTimer = setTimeout(() => setSlowConnect(true), 12000);
        return () => { clearInterval(interval); clearTimeout(slowTimer); cleanup(); };
    }, []);

    if (!isLoggedIn()) return null;

    function updateTimer() {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const h = Math.floor(elapsed / 3600), m = Math.floor((elapsed % 3600) / 60), s = elapsed % 60;
        setTimer(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }

    async function init() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            activeVideoTrackRef.current = stream.getVideoTracks()[0] || null;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        } catch (e) { console.warn('Camera error', e); }

        // Fresh TURN credentials for this call — falls back to the default STUN-only
        // list (already set in iceServersRef) if this fails or isn't configured.
        try {
            const res = await fetch('/api/turn-credentials', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
            const data = await res.json();
            if (data.success && Array.isArray(data.iceServers) && data.iceServers.length > 0) iceServersRef.current = data.iceServers;
        } catch (e) { console.warn('Could not fetch TURN credentials, falling back to STUN-only', e); }

        const socket = io({ auth: { token: localStorage.getItem('token') } });
        socketRef.current = socket;
        socket.on('connect', () => {
            setConnecting(false);
            socket.emit('userconnect', { meetingid: meetId });
            socket.on('all-users', users => users.forEach(u => { createPeer(u.connectionId, true); trackPeer(u.connectionId, u.user_id); }));
            socket.on('user-joined', data => { createPeer(data.connId, false); trackPeer(data.connId, data.user_id); });
            socket.on('signal', data => { if (!peersRef.current[data.from]) createPeer(data.from, false); peersRef.current[data.from].signal(data.signal); });
            socket.on('user-left', data => {
                if (peersRef.current[data.connId]) { peersRef.current[data.connId].destroy(); delete peersRef.current[data.connId]; }
                setRemoteStreams(prev => { const n = { ...prev }; delete n[data.connId]; return n; });
                setRemotePeers(prev => { const n = { ...prev }; delete n[data.connId]; return n; });
            });
            socket.on('chat-message', data => setChatMsgs(prev => [...prev, data]));
            socket.on('mic-toggle', data => setRemotePeers(prev => ({ ...prev, [data.from]: { ...prev[data.from], muted: data.muted } })));
            socket.on('cam-toggle', data => setRemotePeers(prev => ({ ...prev, [data.from]: { ...prev[data.from], camOff: !data.camOn } })));
        });
        socket.on('connect_error', (err) => { setConnecting(false); setAuthError(err.message || 'Could not join the meeting.'); });
    }

    function trackPeer(connId, userId) {
        if (!userId) return;
        setRemotePeers(prev => ({ ...prev, [connId]: { ...prev[connId], userId } }));
        fetch(`/api/auth/users/${userId}`, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } })
            .then(r => r.json())
            .then(d => { if (d.success) setRemotePeers(prev => ({ ...prev, [connId]: { ...prev[connId], avatarUrl: d.user.avatar_url || '' } })); })
            .catch(() => { });
    }

    function createPeer(connId, initiator) {
        const peer = new SimplePeer({
            initiator, trickle: true, stream: localStreamRef.current,
            // STUN alone only works when both sides can find a direct path to each
            // other — it fails on plenty of real networks (campus wifi, mobile data,
            // strict/symmetric NATs), which is exactly what "I join but never see the
            // other person" looks like. iceServersRef holds a TURN relay fetched from
            // the backend for that case (see init()), with STUN-only as the fallback.
            config: { iceServers: iceServersRef.current },
        });
        peersRef.current[connId] = peer;
        peer.on('signal', signal => socketRef.current.emit('signal', { to: connId, signal }));
        peer.on('stream', stream => setRemoteStreams(prev => ({ ...prev, [connId]: stream })));
        peer.on('error', err => console.warn('Peer connection error', connId, err.message));
        // If someone joins mid-screen-share, their very first offer/answer already
        // carries the camera track (from `stream` above) — swap it for the screen
        // track right away so they see the share instead of a frozen camera frame.
        if (sharingScreenRef.current && activeVideoTrackRef.current) {
            const camTrack = localStreamRef.current?.getVideoTracks()[0];
            if (camTrack && camTrack !== activeVideoTrackRef.current) {
                try { peer.replaceTrack(camTrack, activeVideoTrackRef.current, localStreamRef.current); } catch (e) { /* peer not ready yet; ignore */ }
            }
        }
    }

    async function startScreenShare() {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: shareAudioEnabled });
            const screenTrack = screenStream.getVideoTracks()[0];
            const oldTrack = activeVideoTrackRef.current;
            Object.values(peersRef.current).forEach(peer => {
                try { peer.replaceTrack(oldTrack, screenTrack, localStreamRef.current); } catch (e) { console.warn('replaceTrack failed', e); }
            });
            const screenAudioTrack = screenStream.getAudioTracks()[0];
            if (screenAudioTrack) {
                Object.values(peersRef.current).forEach(peer => {
                    try { peer.addTrack(screenAudioTrack, screenStream); } catch (e) { /* non-fatal */ }
                });
            }
            screenStreamRef.current = screenStream;
            activeVideoTrackRef.current = screenTrack;
            sharingScreenRef.current = true;
            setSharingScreen(true);
            if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
            // Fires when the share ends via the browser's own "Stop sharing" control
            // (the tab bar / OS picker bar), not just our in-app button.
            screenTrack.onended = () => stopScreenShare();
        } catch (e) {
            if (e.name !== 'NotAllowedError') console.warn('Screen share failed', e);
        }
    }

    function stopScreenShare() {
        const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
        const screenTrack = activeVideoTrackRef.current;
        if (cameraTrack && screenTrack && cameraTrack !== screenTrack) {
            Object.values(peersRef.current).forEach(peer => {
                try { peer.replaceTrack(screenTrack, cameraTrack, localStreamRef.current); } catch (e) { /* peer may have closed */ }
            });
        }
        if (screenStreamRef.current) {
            const screenAudioTrack = screenStreamRef.current.getAudioTracks()[0];
            if (screenAudioTrack) {
                Object.values(peersRef.current).forEach(peer => {
                    try { peer.removeTrack(screenAudioTrack, screenStreamRef.current); } catch (e) { /* non-fatal */ }
                });
            }
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
        }
        activeVideoTrackRef.current = cameraTrack || null;
        sharingScreenRef.current = false;
        setSharingScreen(false);
        if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    }

    function cleanup() {
        if (socketRef.current) socketRef.current.disconnect();
        Object.values(peersRef.current).forEach(p => p.destroy());
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
        if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
    }

    function toggleMic() {
        if (!localStreamRef.current) return;
        const next = !micOn;
        localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = next; });
        setMicOn(next);
        socketRef.current?.emit('mic-toggle', { meetingid: meetId, muted: !next });
    }
    function toggleCam() {
        if (!localStreamRef.current) return;
        const next = !camOn;
        localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = next; });
        setCamOn(next);
        socketRef.current?.emit('cam-toggle', { meetingid: meetId, camOn: next });
    }

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

    if (authError) {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: '#0A0A0A', color: 'white' }}>
                <p style={{ color: '#ff8080', fontSize: 15 }}>{authError}</p>
                <button onClick={() => navigate('/login')} style={{ padding: '10px 22px', background: '#6C2BD9', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer' }}>Log in again</button>
            </div>
        );
    }

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0A0A0A', color: 'white' }}>
            {/* Top */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: '#111', borderBottom: '1px solid #222' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}><span style={{ color: '#9F67FF', fontWeight: 'bold' }}>SkillNest</span><span style={{ fontSize: 12, color: '#666', background: '#1a1a1a', padding: '4px 10px', borderRadius: 4 }}>{meetId}</span></div>
                <span style={{ fontSize: 14, color: '#ccc', fontVariantNumeric: 'tabular-nums' }}>{timer}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 12, color: '#888' }}>{Object.keys(remoteStreams).length + 1} participants</span>
                    <button onClick={() => setInviteOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 20, color: '#c4a5ff', fontSize: 12.5, cursor: 'pointer' }}>
                        <span className="material-icons" style={{ fontSize: 16 }}>person_add</span> Invite
                    </button>
                </div>
            </div>

            {/* Video + Chat */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: Object.keys(remoteStreams).length > 0 ? 'repeat(auto-fit,minmax(280px,1fr))' : '1fr', gap: 10, padding: 15, alignContent: 'center' }}>
                    <div style={{ background: '#1F1F1F', borderRadius: 12, position: 'relative', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12, display: camOn || sharingScreen ? 'block' : 'none' }} />
                        {!camOn && !sharingScreen && <AvatarFallback avatarUrl={myAvatar} name={userName} />}
                        <span style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: 4, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {!micOn && <span className="material-icons" style={{ fontSize: 14, color: '#ff6b6b' }}>mic_off</span>}
                            {userName} (You)
                        </span>
                    </div>
                    {Object.entries(remoteStreams).map(([id, stream]) => (
                        <RemoteVideo key={id} stream={stream} peer={remotePeers[id]} />
                    ))}
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
                <button onClick={sharingScreen ? stopScreenShare : startScreenShare} title={sharingScreen ? 'Stop sharing' : 'Share screen'} style={btnStyle(!sharingScreen, sharingScreen ? '#34c759' : undefined)}>
                    <span className="material-icons" style={{ color: 'white', fontSize: 22 }}>{sharingScreen ? 'stop_screen_share' : 'screen_share'}</span>
                </button>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8892b0', cursor: sharingScreen ? 'default' : 'pointer', userSelect: 'none' }}>
                    <input type="checkbox" checked={shareAudioEnabled} disabled={sharingScreen} onChange={e => setShareAudioEnabled(e.target.checked)} />
                    Share audio too
                </label>
                <button onClick={endMeeting} style={{ ...btnStyle(false, '#ff4d4d'), width: 54, borderRadius: 12 }}><span className="material-icons" style={{ color: 'white', fontSize: 22 }}>call_end</span></button>
            </div>

            {connecting && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.92)', zIndex: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <span className="material-icons" style={{ fontSize: 32, color: '#A855F7' }}>sync</span>
                    <p style={{ color: 'white', fontSize: 15 }}>Connecting to session...</p>
                    {slowConnect && (
                        <p style={{ color: '#8892b0', fontSize: 13, maxWidth: 320, textAlign: 'center' }}>
                            Taking longer than usual — the server may just be waking up from being idle. Hang tight a little longer.
                        </p>
                    )}
                </div>
            )}

            {inviteOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setInviteOpen(false)}>
                    <div style={{ background: '#0d1025', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, width: 440, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <h3 style={{ fontSize: 16 }}>Invite to this session</h3>
                            <button onClick={() => setInviteOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><span className="material-icons" style={{ color: '#888', fontSize: 22 }}>close</span></button>
                        </div>
                        <div style={{ padding: 20 }}>
                            <InvitePanel meetCode={meetId} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function RemoteVideo({ stream, peer }) {
    const ref = useRef();
    useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
    const camOff = peer?.camOff;
    return (
        <div style={{ background: '#1F1F1F', borderRadius: 12, position: 'relative', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video ref={ref} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12, display: camOff ? 'none' : 'block' }} />
            {camOff && <AvatarFallback avatarUrl={peer?.avatarUrl} />}
            {peer?.muted && (
                <span style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-icons" style={{ fontSize: 15, color: '#ff6b6b' }}>mic_off</span>
                </span>
            )}
        </div>
    );
}

// Shown in place of video when the camera is off: the person's real photo if
// they've set one, otherwise a generic silhouette (no external image needed).
function AvatarFallback({ avatarUrl, name }) {
    return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, overflow: 'hidden' }}>
            {avatarUrl ? (
                <img src={avatarUrl} alt={name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
                <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 100 100" width="60%" height="60%">
                        <circle cx="50" cy="36" r="20" fill="#666" />
                        <path d="M15 95 C15 65 35 55 50 55 C65 55 85 65 85 95 Z" fill="#666" />
                    </svg>
                </div>
            )}
        </div>
    );
}
