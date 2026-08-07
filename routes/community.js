const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const { verifyToken } = require("../middleware/auth");
const { notify } = require("../utils/notify");

const FEED_SELECT = `
    SELECT p.id, p.content, p.image_url, p.created_at, p.user_id,
           u.name, u.username, u.role, mp.profile_photo,
           COUNT(DISTINCT pl.id)::int AS like_count,
           COUNT(DISTINCT pc.id)::int AS comment_count,
           BOOL_OR(pl.user_id = $1) AS liked_by_me
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN mentor_profiles mp ON mp.user_id = u.id
    LEFT JOIN post_likes pl ON pl.post_id = p.id
    LEFT JOIN post_comments pc ON pc.post_id = p.id
`;

function serializePost(row) {
    return {
        id: row.id,
        content: row.content,
        image_url: row.image_url || '',
        created_at: row.created_at,
        author: { id: row.user_id, name: row.name, username: row.username, role: row.role, profile_photo: row.profile_photo || '' },
        like_count: row.like_count || 0,
        comment_count: row.comment_count || 0,
        liked_by_me: !!row.liked_by_me,
    };
}

// GET /api/community/posts - the shared feed (newest first, latest 50)
router.get("/posts", verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `${FEED_SELECT} GROUP BY p.id, u.id, mp.profile_photo ORDER BY p.created_at DESC LIMIT 50`,
            [req.user.id]
        );
        res.json({ success: true, posts: result.rows.map(serializePost) });
    } catch (err) {
        console.error("Feed error:", err);
        res.status(500).json({ success: false, message: "Could not load the feed.", posts: [] });
    }
});

// GET /api/community/posts/user/:userId - one person's posts (for their profile page)
router.get("/posts/user/:userId", verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `${FEED_SELECT} WHERE p.user_id = $2 GROUP BY p.id, u.id, mp.profile_photo ORDER BY p.created_at DESC LIMIT 50`,
            [req.user.id, req.params.userId]
        );
        res.json({ success: true, posts: result.rows.map(serializePost) });
    } catch (err) {
        console.error("User posts error:", err);
        res.status(500).json({ success: false, message: "Could not load posts.", posts: [] });
    }
});

// POST /api/community/posts - create a post
router.post("/posts", verifyToken, async (req, res) => {
    try {
        const content = (req.body.content || '').trim();
        const imageUrl = (req.body.image_url || '').trim();
        if (!content) return res.status(400).json({ success: false, message: "Post can't be empty." });
        if (content.length > 3000) return res.status(400).json({ success: false, message: "Keep posts under 3000 characters." });

        const inserted = await pool.query(
            "INSERT INTO posts (user_id, content, image_url) VALUES ($1, $2, $3) RETURNING id, content, image_url, created_at, user_id",
            [req.user.id, content, imageUrl]
        );
        const result = await pool.query(
            `${FEED_SELECT} WHERE p.id = $2 GROUP BY p.id, u.id, mp.profile_photo`,
            [req.user.id, inserted.rows[0].id]
        );
        res.status(201).json({ success: true, post: serializePost(result.rows[0]) });
    } catch (err) {
        console.error("Create post error:", err);
        res.status(500).json({ success: false, message: "Could not publish post." });
    }
});

// DELETE /api/community/posts/:id - delete your own post
router.delete("/posts/:id", verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            "DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id",
            [req.params.id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Post not found." });
        res.json({ success: true });
    } catch (err) {
        console.error("Delete post error:", err);
        res.status(500).json({ success: false, message: "Could not delete post." });
    }
});

// POST /api/community/posts/:id/like - toggle like
router.post("/posts/:id/like", verifyToken, async (req, res) => {
    try {
        const existing = await pool.query(
            "SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2",
            [req.params.id, req.user.id]
        );
        let liked;
        if (existing.rows.length > 0) {
            await pool.query("DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2", [req.params.id, req.user.id]);
            liked = false;
        } else {
            await pool.query("INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)", [req.params.id, req.user.id]);
            liked = true;
            const post = await pool.query("SELECT user_id FROM posts WHERE id = $1", [req.params.id]);
            if (post.rows[0] && String(post.rows[0].user_id) !== String(req.user.id)) {
                notify(post.rows[0].user_id, 'post_like', `${req.user.name} liked your post`, `/u/${post.rows[0].user_id}`);
            }
        }
        const count = await pool.query("SELECT COUNT(*)::int AS n FROM post_likes WHERE post_id = $1", [req.params.id]);
        res.json({ success: true, liked, like_count: count.rows[0].n });
    } catch (err) {
        console.error("Like error:", err);
        res.status(500).json({ success: false, message: "Could not update like." });
    }
});

// GET /api/community/posts/:id/comments
router.get("/posts/:id/comments", verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT pc.id, pc.content, pc.created_at, pc.user_id, u.name, u.username, u.role
             FROM post_comments pc JOIN users u ON u.id = pc.user_id
             WHERE pc.post_id = $1 ORDER BY pc.created_at ASC`,
            [req.params.id]
        );
        res.json({ success: true, comments: result.rows });
    } catch (err) {
        console.error("List comments error:", err);
        res.status(500).json({ success: false, message: "Could not load comments.", comments: [] });
    }
});

// POST /api/community/posts/:id/comments - add a comment
router.post("/posts/:id/comments", verifyToken, async (req, res) => {
    try {
        const content = (req.body.content || '').trim();
        if (!content) return res.status(400).json({ success: false, message: "Comment can't be empty." });
        if (content.length > 1000) return res.status(400).json({ success: false, message: "Keep comments under 1000 characters." });

        const inserted = await pool.query(
            "INSERT INTO post_comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING id, content, created_at, user_id",
            [req.params.id, req.user.id, content]
        );
        const user = await pool.query("SELECT name, username, role FROM users WHERE id = $1", [req.user.id]);

        const post = await pool.query("SELECT user_id FROM posts WHERE id = $1", [req.params.id]);
        if (post.rows[0] && String(post.rows[0].user_id) !== String(req.user.id)) {
            notify(post.rows[0].user_id, 'post_comment', `${req.user.name} commented on your post`, `/u/${post.rows[0].user_id}`);
        }

        res.status(201).json({ success: true, comment: { ...inserted.rows[0], ...user.rows[0] } });
    } catch (err) {
        console.error("Create comment error:", err);
        res.status(500).json({ success: false, message: "Could not post comment." });
    }
});

module.exports = router;
