const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const { verifyToken } = require("../middleware/auth");
const { notify } = require("../utils/notify");

// GET /api/courses - Get all courses (public)
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.*, COUNT(DISTINCT e.id)::int AS enrolled_count,
                    COUNT(DISTINCT r.id)::int AS review_count,
                    ROUND(AVG(r.rating)::numeric, 1)::float AS avg_rating
             FROM courses c
             LEFT JOIN enrollments e ON e.course_id = c.id
             LEFT JOIN course_reviews r ON r.course_id = c.id
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
        const { title, description, category, image_url, difficulty, duration, video_count } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: "Title is required" });
        }

        // Get mentor info
        const mentor = await pool.query("SELECT id, name, role FROM users WHERE id = $1", [req.user.id]);
        if (!mentor.rows[0] || mentor.rows[0].role !== 'mentor') {
            return res.status(403).json({ success: false, message: "Only mentors can create courses" });
        }

        const result = await pool.query(
            `INSERT INTO courses (title, description, category, image_url, mentor_id, mentor_name, difficulty, duration, video_count)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [title, description || '', category || '', image_url || '', req.user.id, mentor.rows[0].name, difficulty || 'beginner', duration || '', Number(video_count) || 0]
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

// GET /api/courses/:id/reviews - all reviews + average rating (public)
router.get("/:id/reviews", async (req, res) => {
    try {
        const reviews = await pool.query(
            `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS student_name
             FROM course_reviews r JOIN users u ON u.id = r.student_id
             WHERE r.course_id = $1 ORDER BY r.created_at DESC`,
            [req.params.id]
        );
        const agg = await pool.query(
            `SELECT COUNT(*)::int AS count, ROUND(AVG(rating)::numeric, 1)::float AS avg_rating
             FROM course_reviews WHERE course_id = $1`,
            [req.params.id]
        );
        res.json({ success: true, reviews: reviews.rows, avgRating: agg.rows[0].avg_rating, count: agg.rows[0].count });
    } catch (err) {
        console.error("List reviews error:", err);
        res.status(500).json({ success: false, message: "Could not load reviews.", reviews: [] });
    }
});

// GET /api/courses/:id/reviews/mine - the logged-in student's own review, if any
router.get("/:id/reviews/mine", verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, rating, comment, created_at FROM course_reviews WHERE course_id = $1 AND student_id = $2",
            [req.params.id, req.user.id]
        );
        res.json({ success: true, review: result.rows[0] || null });
    } catch (err) {
        res.status(500).json({ success: false, review: null });
    }
});

// POST /api/courses/:id/reviews - create or update the logged-in student's review
router.post("/:id/reviews", verifyToken, async (req, res) => {
    try {
        const rating = Number(req.body.rating);
        const comment = (req.body.comment || '').trim();
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." });
        }

        const enrolled = await pool.query(
            "SELECT id FROM enrollments WHERE course_id = $1 AND student_id = $2",
            [req.params.id, req.user.id]
        );
        if (enrolled.rows.length === 0) {
            return res.status(403).json({ success: false, message: "Enroll in this course before reviewing it." });
        }

        const course = await pool.query("SELECT title, mentor_id FROM courses WHERE id = $1", [req.params.id]);
        if (course.rows.length === 0) return res.status(404).json({ success: false, message: "Course not found." });

        const result = await pool.query(
            `INSERT INTO course_reviews (course_id, student_id, rating, comment)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (course_id, student_id) DO UPDATE SET rating = $3, comment = $4, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [req.params.id, req.user.id, rating, comment]
        );

        if (course.rows[0].mentor_id) {
            notify(course.rows[0].mentor_id, 'new_review', `${req.user.name} left a ${rating}-star review on "${course.rows[0].title}"`, `/mentor/courses`);
        }

        res.status(201).json({ success: true, review: result.rows[0] });
    } catch (err) {
        console.error("Submit review error:", err);
        res.status(500).json({ success: false, message: "Could not submit review." });
    }
});

// PUT /api/courses/:id - Edit a course (owner only)
router.put("/:id", verifyToken, async (req, res) => {
    try {
        const existing = await pool.query("SELECT * FROM courses WHERE id = $1 AND mentor_id = $2", [req.params.id, req.user.id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Course not found." });
        }
        const c = existing.rows[0];
        const { title, description, category, image_url, difficulty, duration, video_count } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: "Title is required" });
        }

        const result = await pool.query(
            `UPDATE courses SET title = $1, description = $2, category = $3, image_url = $4, difficulty = $5, duration = $6, video_count = $7
             WHERE id = $8 AND mentor_id = $9 RETURNING *`,
            [
                title,
                description ?? c.description,
                category ?? c.category,
                image_url ?? c.image_url,
                difficulty || c.difficulty,
                duration ?? c.duration,
                video_count !== undefined ? (Number(video_count) || 0) : c.video_count,
                req.params.id, req.user.id
            ]
        );

        res.json({ success: true, course: result.rows[0] });
    } catch (err) {
        console.error("Update course error:", err);
        res.status(500).json({ success: false, message: "Could not update course" });
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
