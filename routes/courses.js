const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const { verifyToken } = require("../middleware/auth");

// GET /api/courses - Get all courses (public)
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM courses ORDER BY created_at DESC");
        res.json({ success: true, courses: result.rows });
    } catch (err) {
        console.error("List courses error:", err);
        res.status(500).json({ success: false, message: "Could not load courses.", courses: [] });
    }
});

// POST /api/courses - Create a course (mentor only)
router.post("/", verifyToken, async (req, res) => {
    try {
        const { title, description, category, image_url, difficulty, duration } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: "Title is required" });
        }

        // Get mentor info
        const mentor = await pool.query("SELECT id, name, role FROM users WHERE id = $1", [req.user.id]);
        if (!mentor.rows[0] || mentor.rows[0].role !== 'mentor') {
            return res.status(403).json({ success: false, message: "Only mentors can create courses" });
        }

        const result = await pool.query(
            `INSERT INTO courses (title, description, category, image_url, mentor_id, mentor_name, difficulty, duration)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [title, description || '', category || '', image_url || '', req.user.id, mentor.rows[0].name, difficulty || 'beginner', duration || '']
        );

        res.status(201).json({ success: true, course: result.rows[0] });
    } catch (err) {
        console.error("Create course error:", err);
        res.status(500).json({ success: false, message: "Could not create course" });
    }
});

// DELETE /api/courses/:id - Delete a course (owner only)
router.delete("/:id", verifyToken, async (req, res) => {
    try {
        await pool.query("DELETE FROM courses WHERE id = $1 AND mentor_id = $2", [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: "Could not delete" });
    }
});

module.exports = router;
