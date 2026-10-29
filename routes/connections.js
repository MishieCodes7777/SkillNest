const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const { verifyToken } = require("../middleware/auth");
const { notify } = require("../utils/notify");
router.get('/suggestions',verifyToken,async(req,res,next)=>{try{
 const q=String(req.query.q||'').slice(0,100);
 const rows=(await pool.query(`WITH edges AS (SELECT requester_id AS a,recipient_id AS b FROM connections WHERE status='accepted' UNION SELECT recipient_id,requester_id FROM connections WHERE status='accepted')
 SELECT u.id,u.name,u.username,u.role,u.headline,(SELECT COUNT(*)::int FROM edges mine JOIN edges theirs ON theirs.b=mine.b WHERE mine.a=$1 AND theirs.a=u.id) AS mutual_count
 FROM users u WHERE u.id<>$1 AND NOT ${require('../services/helpAccess').blockSQL('u.id','$1::int')}
 AND NOT EXISTS(SELECT 1 FROM connections c WHERE (c.requester_id=$1 AND c.recipient_id=u.id) OR(c.recipient_id=$1 AND c.requester_id=u.id))
 AND ($2='' OR u.name ILIKE '%'||$2||'%' OR u.username ILIKE '%'||$2||'%')
 ORDER BY mutual_count DESC,u.id DESC LIMIT 50`,[req.user.id,q])).rows;
 res.json({success:true,users:rows});
 }catch(e){next(e);}});

// GET /api/connections - every relationship involving me (pending + accepted, both directions)
router.get("/", verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.id, c.status, c.created_at,
                    CASE WHEN c.requester_id = $1 THEN 'outgoing' ELSE 'incoming' END AS direction,
                    u.id AS user_id, u.name, u.username, u.role
             FROM connections c
             JOIN users u ON u.id = CASE WHEN c.requester_id = $1 THEN c.recipient_id ELSE c.requester_id END
             WHERE c.requester_id = $1 OR c.recipient_id = $1
             ORDER BY c.created_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, connections: result.rows });
    } catch (err) {
        console.error("List connections error:", err);
        res.status(500).json({ success: false, message: "Could not load connections.", connections: [] });
    }
});

// POST /api/connections/request - { toUserId }
router.post("/request", verifyToken, async (req, res) => {
    try {
        const toUserId = req.body.toUserId;
        if (!toUserId) return res.status(400).json({ success: false, message: "Missing recipient." });
        if (String(toUserId) === String(req.user.id)) return res.status(400).json({ success: false, message: "You can't connect with yourself." });

        if(await require('../services/helpAccess').blocked(pool,req.user.id,toUserId)) return res.status(403).json({success:false,message:'Contact is unavailable.'});
        const existing = await pool.query(
            `SELECT id, status FROM connections WHERE (requester_id = $1 AND recipient_id = $2) OR (requester_id = $2 AND recipient_id = $1)`,
            [req.user.id, toUserId]
        );
        if (existing.rows.length > 0) {
            const s = existing.rows[0].status;
            return res.status(409).json({ success: false, message: s === 'accepted' ? "You're already connected." : s === 'pending' ? "A request is already pending." : "A previous request was declined." });
        }

        const inserted = await pool.query(
            "INSERT INTO connections (requester_id, recipient_id) VALUES ($1, $2) RETURNING id, status, created_at",
            [req.user.id, toUserId]
        );
        notify(toUserId, 'connection_request', `${req.user.name} wants to connect with you`, '/messages');
        req.app.get('io')?.to(`account:${toUserId}`).to(`account:${req.user.id}`).emit('messages-updated');
        res.status(201).json({ success: true, connection: inserted.rows[0] });
    } catch (err) {
        console.error("Send request error:", err);
        res.status(500).json({ success: false, message: "Could not send request." });
    }
});

// POST /api/connections/:id/accept
router.post("/:id/accept", verifyToken, async (req, res) => {
    try {
        const pending=(await pool.query('SELECT requester_id FROM connections WHERE id=$1 AND recipient_id=$2',[req.params.id,req.user.id])).rows[0];
        if(pending && await require('../services/helpAccess').blocked(pool,req.user.id,pending.requester_id)) return res.status(403).json({success:false,message:'Contact is unavailable.'});
        const result = await pool.query(
            "UPDATE connections SET status = 'accepted', responded_at = NOW() WHERE id = $1 AND recipient_id = $2 AND status = 'pending' RETURNING requester_id",
            [req.params.id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Request not found." });
        notify(result.rows[0].requester_id, 'connection_accepted', `${req.user.name} accepted your connection request`, '/messages');
        req.app.get('io')?.to(`account:${result.rows[0].requester_id}`).to(`account:${req.user.id}`).emit('messages-updated');
        res.json({ success: true });
    } catch (err) {
        console.error("Accept request error:", err);
        res.status(500).json({ success: false, message: "Could not accept request." });
    }
});

// POST /api/connections/:id/reject
router.post("/:id/reject", verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            "UPDATE connections SET status = 'rejected', responded_at = NOW() WHERE id = $1 AND recipient_id = $2 AND status = 'pending' RETURNING id",
            [req.params.id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Request not found." });
        res.json({ success: true });
    } catch (err) {
        console.error("Reject request error:", err);
        res.status(500).json({ success: false, message: "Could not reject request." });
    }
});

module.exports = router;
