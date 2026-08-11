const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const { verifyToken } = require("../middleware/auth");
const { notify } = require("../utils/notify");

// GET /api/courses - Get all courses (public)
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.*, COUNT(e.id)::int AS enrolled_count
             FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id
             GROUP BY c.id ORDER BY c.created_at DESC`
        );
        res.json({ success: true, courses: result.rows });
    } catch (err) {
        console.error("List courses error:", err);
        res.status(500).json({ success: false, message: "Could not load courses.", courses: [] });
    }
});

// GET /api/courses/my-enrollments - course ids I'm enrolled in (for UI state)
router.get("/my-enrollments", verifyToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT course_id FROM enrollments WHERE student_id = $1", [req.user.id]);
        res.json({ success: true, courseIds: result.rows.map(r => r.course_id) });
    } catch (err) {
        res.status(500).json({ success: false, courseIds: [] });
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

// POST /api/courses/:id/enroll
router.post("/:id/enroll", verifyToken, async (req, res) => {
    try {
        const course = await pool.query("SELECT id, title, mentor_id FROM courses WHERE id = $1", [req.params.id]);
        if (course.rows.length === 0) return res.status(404).json({ success: false, message: "Course not found." });
        if (String(course.rows[0].mentor_id) === String(req.user.id)) {
            return res.status(400).json({ success: false, message: "You can't enroll in your own course." });
        }

        const inserted = await pool.query(
            "INSERT INTO enrollments (course_id, student_id) VALUES ($1, $2) ON CONFLICT (course_id, student_id) DO NOTHING RETURNING id",
            [req.params.id, req.user.id]
        );
        if (inserted.rows.length > 0 && course.rows[0].mentor_id) {
            notify(course.rows[0].mentor_id, 'new_enrollment', `${req.user.name} enrolled in your course "${course.rows[0].title}"`, '/mentor/students');
        }
        res.status(201).json({ success: true, message: "Enrolled!" });
    } catch (err) {
        console.error("Enroll error:", err);
        res.status(500).json({ success: false, message: "Could not enroll." });
    }
});

// DELETE /api/courses/:id/enroll - unenroll
router.delete("/:id/enroll", verifyToken, async (req, res) => {
    try {
        await pool.query("DELETE FROM enrollments WHERE course_id = $1 AND student_id = $2", [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: "Could not unenroll." });
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
