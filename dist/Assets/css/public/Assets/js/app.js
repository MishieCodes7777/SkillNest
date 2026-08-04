var peers = {};
var socket = null;
var localStream = null;

var AppProcess = (function () {

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            localStream = stream;
            document.getElementById("localVideoPlayer").srcObject = stream;

            console.log("Camera started:", stream.getTracks());
        } catch (e) {
            console.warn("Camera not available:", e);
        }
    }

    function createConnection(connId, isInitiator) {
        console.log("Connecting to:", connId);

       const peer = new RTCPeerConnection({
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
});
        peers[connId] = peer;

        // add tracks
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peer.addTrack(track, localStream);
            });
        }

        // create UI box
        addRemoteVideo(connId, null);

        // receive stream
        peer.ontrack = (event) => {
            console.log("Stream received from:", connId);
            addRemoteVideo(connId, event.streams[0]);
        };

        // ICE
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("SDPProcess", {
                    message: { type: "candidate", candidate: event.candidate },
                    to_connid: connId
                });
            }
        };

        // offer
        if (isInitiator) {
            peer.createOffer().then(offer => {
                peer.setLocalDescription(offer);

                socket.emit("SDPProcess", {
                    message: { type: "offer", offer },
                    to_connid: connId
                });
            });
        }
    }

function addRemoteVideo(connId, stream) {

    let existing = document.getElementById(connId);

    if (existing && stream) {
        let video = existing.querySelector("video");

        video.srcObject = stream;

        video.onloadedmetadata = () => {
            video.play().catch(e => console.log("Play blocked", e));
        };

        console.log("Updated video for:", connId);
        return;
    }

    if (existing) return;

    let template = document.getElementById("otherTemplate");
    let clone = template.cloneNode(true);

    clone.id = connId;
    clone.style.display = "flex";

    let video = clone.querySelector("video");

    if (stream) {
        video.srcObject = stream;

        video.onloadedmetadata = () => {
            video.play().catch(e => console.log("Play blocked", e));
        };
    }

    document.getElementById("divUsers").appendChild(clone);
}

    function init(user_id, meeting_id) {

        socket = io();

        socket.on("connect", async () => {
            console.log("Socket connected:", socket.id);

            await startCamera();

            socket.emit("userconnect", {
                displayName: user_id,
                meetingid: meeting_id
            });

            socket.on("inform_me_about_other_user", (users) => {
                console.log("Existing users:", users);
                users.forEach(u => createConnection(u.connectionId, true));
            });

            socket.on("inform_others_about_me", (data) => {
                console.log("New user joined:", data);
                createConnection(data.connId, false);
            });

            socket.on("SDPProcess", async (data) => {
                const from = data.from_connid;
                const msg = data.message;

                if (!peers[from]) createConnection(from, false);

                const peer = peers[from];

                if (msg.type === "offer") {
                    await peer.setRemoteDescription(msg.offer);

                    const answer = await peer.createAnswer();
                    await peer.setLocalDescription(answer);

                    socket.emit("SDPProcess", {
                        message: { type: "answer", answer },
                        to_connid: from
                    });
                }

                else if (msg.type === "answer") {
                    await peer.setRemoteDescription(msg.answer);
                }

                else if (msg.type === "candidate") {
                    await peer.addIceCandidate(msg.candidate);
                }
            });

            socket.on("inform_other_about_disconnected_user", (data) => {
                let el = document.getElementById(data.connId);
                if (el) el.remove();
            });
        });
    }

    return { innit: init };

})();