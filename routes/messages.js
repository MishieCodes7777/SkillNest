const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const { verifyToken } = require("../middleware/auth");
const { notify } = require("../utils/notify");

async function areConnected(userA, userB) {
    const result = await pool.query(
        `SELECT id FROM connections WHERE status = 'accepted' AND
         ((requester_id = $1 AND recipient_id = $2) OR (requester_id = $2 AND recipient_id = $1))`,
        [userA, userB]
    );
    return result.rows.length > 0;
}

// GET /api/messages - conversation list: accepted connections + last message + unread count
router.get("/", verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id AS user_id, u.name, u.username, u.role,
                    (SELECT content FROM messages WHERE (sender_id = u.id AND recipient_id = $1) OR (sender_id = $1 AND recipient_id = u.id) ORDER BY created_at DESC LIMIT 1) AS last_message,
                    (SELECT created_at FROM messages WHERE (sender_id = u.id AND recipient_id = $1) OR (sender_id = $1 AND recipient_id = u.id) ORDER BY created_at DESC LIMIT 1) AS last_message_at,
                    (SELECT COUNT(*)::int FROM messages WHERE sender_id = u.id AND recipient_id = $1 AND is_read = false) AS unread_count
             FROM connections c
             JOIN users u ON u.id = CASE WHEN c.requester_id = $1 THEN c.recipient_id ELSE c.requester_id END
             WHERE (c.requester_id = $1 OR c.recipient_id = $1) AND c.status = 'accepted'
             ORDER BY last_message_at DESC NULLS LAST`,
            [req.user.id]
        );
        res.json({ success: true, conversations: result.rows });
    } catch (err) {
        console.error("List conversations error:", err);
        res.status(500).json({ success: false, message: "Could not load conversations.", conversations: [] });
    }
});

// GET /api/messages/:userId - full history with one connected person (marks their messages as read)
router.get("/:userId", verifyToken, async (req, res) => {
    try {
        const otherId = req.params.userId;
        if (!(await areConnected(req.user.id, otherId))) {
            return res.status(403).json({ success: false, message: "You're not connected with this person yet." });
        }
        const result = await pool.query(
            `SELECT id, sender_id, recipient_id, content, created_at FROM messages
             WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
             ORDER BY created_at ASC LIMIT 200`,
            [req.user.id, otherId]
        );
        pool.query("UPDATE messages SET is_read = true WHERE sender_id = $1 AND recipient_id = $2 AND is_read = false", [otherId, req.user.id]).catch(() => { });
        res.json({ success: true, messages: result.rows });
    } catch (err) {
        console.error("Get conversation error:", err);
        res.status(500).json({ success: false, message: "Could not load messages.", messages: [] });
    }
});

// POST /api/messages/:userId - { content }
router.post("/:userId", verifyToken, async (req, res) => {
    try {
        const otherId = req.params.userId;
        const content = (req.body.content || '').trim();
        if (!content) return res.status(400).json({ success: false, message: "Message can't be empty." });
        if (content.length > 3000) return res.status(400).json({ success: false, message: "Message is too long." });
        if (!(await areConnected(req.user.id, otherId))) {
            return res.status(403).json({ success: false, message: "You're not connected with this person yet." });
        }

        const inserted = await pool.query(
            "INSERT INTO messages (sender_id, recipient_id, content) VALUES ($1, $2, $3) RETURNING id, sender_id, recipient_id, content, created_at",
            [req.user.id, otherId, content]
        );
        notify(otherId, 'new_message', `New message from ${req.user.name}`, '/messages');
        res.status(201).json({ success: true, message: inserted.rows[0] });
    } catch (err) {
        console.error("Send message error:", err);
        res.status(500).json({ success: false, message: "Could not send message." });
    }
});

module.exports = router;
