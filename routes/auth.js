const express = require("express");
const router = express.Router();
const { signup, login, logout, getMe, verifyAuth } = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");
const { signupValidation, loginValidation, handleValidation } = require("../middleware/validate");

// POST /api/auth/signup
router.post("/signup", signupValidation, handleValidation, signup);

// POST /api/auth/login
router.post("/login", loginValidation, handleValidation, login);

// POST /api/auth/logout
router.post("/logout", logout);

// GET /api/auth/me - Get current user (protected)
router.get("/me", verifyToken, getMe);

// GET /api/auth/verify - Check if token is valid (for page protection)
router.get("/verify", verifyToken, verifyAuth);

// GET /api/auth/users - Get all users (for messaging/search)
router.get("/users", async (req, res) => {
    const pool = require("../config/database");
    try {
        const result = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC");
        res.json({ success: true, users: result.rows });
    } catch (err) {
        res.json({ success: true, users: [] });
    }
});

// GET /api/auth/users/search?q=term - Search users
router.get("/users/search", async (req, res) => {
    const pool = require("../config/database");
    const q = req.query.q || '';
    try {
        const result = await pool.query(
            "SELECT id, name, email, role, created_at FROM users WHERE LOWER(name) LIKE $1 OR LOWER(email) LIKE $1 ORDER BY name",
            ['%' + q.toLowerCase() + '%']
        );
        res.json({ success: true, users: result.rows });
    } catch (err) {
        res.json({ success: true, users: [] });
    }
});

// GET /api/auth/stats - Platform stats
router.get("/stats", async (req, res) => {
    const pool = require("../config/database");
    try {
        const learners = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'learner'");
        const mentors = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'mentor'");
        res.json({ success: true, learners: parseInt(learners.rows[0].count), mentors: parseInt(mentors.rows[0].count) });
    } catch (err) {
        res.json({ success: true, learners: 0, mentors: 0 });
    }
});

// GET /api/auth/mentors - Get mentors list
router.get("/mentors", async (req, res) => {
    const pool = require("../config/database");
    try {
        const result = await pool.query("SELECT id, name, email, role, created_at FROM users WHERE role = 'mentor' ORDER BY created_at DESC");
        res.json({ success: true, mentors: result.rows });
    } catch (err) {
        res.json({ success: true, mentors: [] });
    }
});

module.exports = router;
