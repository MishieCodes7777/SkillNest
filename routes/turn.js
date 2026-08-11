const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");

const GOOGLE_STUN = { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] };

// GET /api/turn-credentials - fresh TURN/STUN server list for the meeting room.
// The Metered API key stays server-side (same pattern as GROQ_API_KEY) — the
// client never sees it, only the short-lived credentials it returns.
router.get("/", verifyToken, async (req, res) => {
    const domain = process.env.METERED_APP_DOMAIN;
    const apiKey = process.env.METERED_API_KEY;

    if (!domain || !apiKey) {
        // Not configured (e.g. local dev) — STUN-only still works for peers
        // on the same network, it just can't cross strict NATs.
        return res.json({ success: true, iceServers: [GOOGLE_STUN] });
    }

    try {
        const r = await fetch(`https://${domain}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`);
        if (!r.ok) throw new Error(`Metered API responded ${r.status}`);
        const iceServers = await r.json();
        res.json({ success: true, iceServers: [GOOGLE_STUN, ...iceServers] });
    } catch (err) {
        console.error("TURN credentials fetch error:", err.message);
        res.json({ success: true, iceServers: [GOOGLE_STUN] });
    }
});

module.exports = router;
