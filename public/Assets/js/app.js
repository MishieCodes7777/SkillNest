var peers = {};
var socket = null;
var localStream = null;
var audioTrack = null;
var videoTrack = null;

var AppProcess = (function () {

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            
            localStream = stream;
            audioTrack = stream.getAudioTracks()[0];
            videoTrack = stream.getVideoTracks()[0];
            console.log("Audio tracks:", localStream.getAudioTracks());
            document.getElementById("localVideoPlayer").srcObject = stream;
            
            console.log("Camera started:", stream.getTracks());
        } catch (e) {
            console.warn("Camera not available:", e);
        }
    }

    function createConnection(connId, isInitiator) {
        console.log("Connecting to:", connId);

        const peer = new SimplePeer({
            initiator: isInitiator,
            trickle: false,
            stream: localStream
        });

        peers[connId] = peer;

        // create UI box
        addRemoteVideo(connId, null);

        // send signal
        peer.on("signal", (signal) => {
            socket.emit("signal", {
                to: connId,
                signal: signal
            });
        });

        // receive stream
        peer.on("stream", (stream) => {
            console.log("Stream received from:", connId);
            addRemoteVideo(connId, stream);
        });

        peer.on("close", () => {
            console.log("Connection closed:", connId);
        });

        peer.on("error", (err) => {
            console.log("Peer error:", err);
        });
    }

    function addRemoteVideo(connId, stream) {

        let existing = document.getElementById(connId);

        if (existing && stream) {
            let video = existing.querySelector("video");

            video.srcObject = stream;
            video.muted = false;
video.volume = 1;


video.onloadedmetadata = () => {
    video.play()
        .then(() => console.log("Playing audio+video for:", connId))
        .catch(e => console.log("Autoplay blocked:", e));
};

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

            // 🔥 existing users
            socket.on("all-users", (users) => {
                console.log("Existing users:", users);

                users.forEach(u => {
                    createConnection(u.connectionId, true);
                });
            });

            // 🔥 new user joined
            socket.on("user-joined", (data) => {
                console.log("New user joined:", data);
                createConnection(data.connId, false);
            });

            // 🔥 receive signal
            socket.on("signal", (data) => {
                const from = data.from;

                if (!peers[from]) {
                    createConnection(from, false);
                }

                peers[from].signal(data.signal);
            });
            document.getElementById("micMuteUnmute").addEventListener("click", function () {

    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;

    const icon = document.getElementById("micIcon");

    if (audioTrack.enabled) {
        icon.innerText = "mic";
        this.classList.remove("off");
    } else {
        icon.innerText = "mic_off";
        this.classList.add("off");
    }
});
document.getElementById("micMuteUnmute").addEventListener("click", function () {

    console.log("Mic clicked");

    if (!localStream) {
        console.log("No local stream!");
        return;
    }

    const audioTracks = localStream.getAudioTracks();

    if (audioTracks.length === 0) {
        console.log("No audio track found!");
        return;
    }

    // toggle
    audioTracks[0].enabled = !audioTracks[0].enabled;

    console.log("Mic enabled:", audioTracks[0].enabled);

    const icon = document.getElementById("micIcon");

    if (audioTracks[0].enabled) {
        icon.innerText = "mic";
        this.classList.remove("off");
    } else {
        icon.innerText = "mic_off";
        this.classList.add("off");
    }
});
document.getElementById("videoCamOnOff").addEventListener("click", function () {

    if (!localStream) return;

    const videoTracks = localStream.getVideoTracks();

    if (videoTracks.length === 0) return;

    videoTracks.forEach(track => {
        track.enabled = !track.enabled;
    });

    const icon = document.getElementById("cameraIcon");

    if (videoTracks[0].enabled) {
        icon.innerText = "videocam";
        this.classList.remove("off");
    } else {
        icon.innerText = "videocam_off";
        this.classList.add("off");
    }
});
            // 🔥 user disconnected
            socket.on("user-left", (data) => {
                let el = document.getElementById(data.connId);
                if (el) el.remove();

                if (peers[data.connId]) {
                    peers[data.connId].destroy();
                    delete peers[data.connId];
                }
            });
        });
    }

    return { innit: init };

})();
window.onload = function () {

    const micBtn = document.getElementById("micMuteUnmute");

    if (!micBtn) {
        console.log("Mic button not found!");
        return;
    }

    micBtn.addEventListener("click", function () {

        console.log("Mic clicked");

        if (!localStream) {
            console.log("No local stream!");
            return;
        }

        const audioTracks = localStream.getAudioTracks();

        if (audioTracks.length === 0) {
            console.log("No audio track!");
            return;
        }

        audioTracks[0].enabled = !audioTracks[0].enabled;

        const icon = document.getElementById("micIcon");

        if (audioTracks[0].enabled) {
            icon.innerText = "mic";
            this.classList.remove("off");
        } else {
            icon.innerText = "mic_off";
            this.classList.add("off");
        }
    });

};