const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const { verifyToken } = require("../middleware/auth");
const { notify } = require("../utils/notify");

// GET /api/notifications - latest 30 for the current user
router.get("/", verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, type, message, link, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30",
            [req.user.id]
        );
        res.json({ success: true, notifications: result.rows });
    } catch (err) {
        console.error("List notifications error:", err);
        res.status(500).json({ success: false, message: "Could not load notifications.", notifications: [] });
    }
});

// GET /api/notifications/unread-count
router.get("/unread-count", verifyToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND is_read = false", [req.user.id]);
        res.json({ success: true, count: result.rows[0].n });
    } catch (err) {
        console.error("Unread count error:", err);
        res.status(500).json({ success: false, count: 0 });
    }
});

// POST /api/notifications/:id/read
router.post("/:id/read", verifyToken, async (req, res) => {
    try {
        await pool.query("UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// POST /api/notifications/read-all
router.post("/read-all", verifyToken, async (req, res) => {
    try {
        await pool.query("UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false", [req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// POST /api/notifications/session-invite - invite someone to a live session
router.post("/session-invite", verifyToken, async (req, res) => {
    try {
        const toUserId = req.body.toUserId;
        const meetingCode = (req.body.meetingCode || '').trim();
        if (!toUserId || !meetingCode) return res.status(400).json({ success: false, message: "Missing recipient or meeting code." });
        if (String(toUserId) === String(req.user.id)) return res.status(400).json({ success: false, message: "You can't invite yourself." });

        await notify(toUserId, 'session_invite', `${req.user.name} invited you to join a live session`, `/meeting?meet=${encodeURIComponent(meetingCode)}`);
        res.json({ success: true });
    } catch (err) {
        console.error("Session invite error:", err);
        res.status(500).json({ success: false, message: "Could not send invite." });
    }
});

module.exports = router;
