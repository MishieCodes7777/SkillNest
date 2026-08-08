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

// PUT /api/auth/change-password - change your own password while logged in
router.put("/change-password", verifyToken, async (req, res) => {
    const bcrypt = require("bcrypt");
    const pool = require("../config/database");
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: "Current and new password are required." });
    }
    if (newPassword.length < 6 || !/\d/.test(newPassword)) {
        return res.status(400).json({ success: false, message: "New password must be at least 6 characters and contain a number." });
    }

    try {
        const user = await pool.query("SELECT password FROM users WHERE id = $1", [req.user.id]);
        if (user.rows.length === 0) return res.status(404).json({ success: false, message: "User not found." });

        const valid = await bcrypt.compare(currentPassword, user.rows[0].password);
        if (!valid) return res.status(401).json({ success: false, message: "Current password is incorrect." });

        const hashed = await bcrypt.hash(newPassword, 12);
        await pool.query("UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2", [hashed, req.user.id]);
        return res.json({ success: true, message: "Password updated." });
    } catch (err) {
        console.error("Change password error:", err);
        return res.status(500).json({ success: false, message: "Could not update password." });
    }
});

// POST /api/auth/add-role - Add a role to existing account.
// Switching to 'learner' is instant — an existing mentor doesn't need reverification.
// Switching to 'mentor' is NOT granted here anymore — it requires a reviewed
// application (see routes/mentorApplications.js) so an account can't just
// self-upgrade into posting/teaching as a mentor with no verification.
router.post("/add-role", verifyToken, async (req, res) => {
    const pool = require("../config/database");
    const { role } = req.body;
    const userId = req.user.id;

    if (!role || !['learner', 'mentor'].includes(role)) {
        return res.status(400).json({ success: false, message: "Invalid role" });
    }

    try {
        const user = await pool.query("SELECT role, roles FROM users WHERE id = $1", [userId]);
        if (user.rows.length === 0) return res.status(404).json({ success: false, message: "User not found" });

        let roles = [];
        try { roles = JSON.parse(user.rows[0].roles || '[]'); } catch (e) { roles = [user.rows[0].role]; }

        if (roles.includes(role)) {
            return res.json({ success: true, message: "You already have this role", roles });
        }

        if (role === 'mentor') {
            return res.status(403).json({
                success: false,
                needsApplication: true,
                message: "Becoming a mentor requires a quick application. Submit one and we'll review it.",
            });
        }

        roles.push(role);
        await pool.query("UPDATE users SET roles = $1, role = $2, updated_at = NOW() WHERE id = $3", [JSON.stringify(roles), role, userId]);

        return res.json({ success: true, message: `You are now also a ${role}!`, roles });
    } catch (err) {
        console.error("Add role error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// (Note: check-username stays public — signup form needs it before login)
// GET /api/auth/check-username?username=xxx - Check if username is available
router.get("/check-username", async (req, res) => {
    const pool = require("../config/database");
    const username = req.query.username || '';
    if (username.length < 3) return res.json({ available: false, message: 'Too short' });
    try {
        const result = await pool.query("SELECT id FROM users WHERE username = $1", [username.toLowerCase()]);
        res.json({ available: result.rows.length === 0 });
    } catch (err) {
        res.json({ available: true });
    }
});

// PUT /api/auth/update-username - Update username (max 3 times per month)
router.put("/update-username", verifyToken, async (req, res) => {
    const pool = require("../config/database");
    const { username } = req.body;
    const userId = req.user.id;

    if (!username || username.length < 3) {
        return res.status(400).json({ success: false, message: "Username must be at least 3 characters." });
    }
    if (!/^[a-z0-9._]+$/.test(username)) {
        return res.status(400).json({ success: false, message: "Username can only contain lowercase letters, numbers, dots, and underscores." });
    }

    try {
        // Check if username is taken by someone else
        const existing = await pool.query("SELECT id FROM users WHERE username = $1 AND id != $2", [username, userId]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, message: "This username is already taken." });
        }

        // Check change limit (3 per month)
        const user = await pool.query("SELECT username_changes FROM users WHERE id = $1", [userId]);
        const changes = user.rows[0]?.username_changes || '[]';
        let changeHistory = [];
        try { changeHistory = JSON.parse(changes); } catch (e) { changeHistory = []; }

        // Filter to this month only
        const now = new Date();
        const thisMonth = changeHistory.filter(d => {
            const date = new Date(d);
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        });

        if (thisMonth.length >= 3) {
            return res.status(429).json({ success: false, message: "You can only change your username 3 times per month. Try again next month." });
        }

        // Update username
        changeHistory.push(now.toISOString());
        // Update username in DB (skip username_changes if column doesn't exist)
        await pool.query("UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2", [username, userId]);
        await pool.query("UPDATE users SET username_changes = $1 WHERE id = $2", [JSON.stringify(changeHistory), userId]).catch(() => { });

        return res.json({ success: true, message: "Username updated successfully!", username });
    } catch (err) {
        console.error("Update username error:", err);
        return res.status(500).json({ success: false, message: "Could not update username. Try restarting the server." });
    }
});

// GET /api/auth/users - Get all users (for messaging/search)  [auth required — was public]
router.get("/users", verifyToken, async (req, res) => {
    const pool = require("../config/database");
    try {
        const result = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC");
        res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error("List users error:", err);
        res.status(500).json({ success: false, message: "Could not load users.", users: [] });
    }
});

// GET /api/auth/users/search?q=term - Search users  [auth required — was public]
router.get("/users/search", verifyToken, async (req, res) => {
    const pool = require("../config/database");
    const q = req.query.q || '';
    try {
        const result = await pool.query(
            "SELECT id, name, email, role, created_at FROM users WHERE LOWER(name) LIKE $1 OR LOWER(email) LIKE $1 ORDER BY name",
            ['%' + q.toLowerCase() + '%']
        );
        res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error("Search users error:", err);
        res.status(500).json({ success: false, message: "Search failed.", users: [] });
    }
});

// GET /api/auth/stats - Platform stats  [auth required — was public]
router.get("/stats", verifyToken, async (req, res) => {
    const pool = require("../config/database");
    try {
        const learners = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'learner'");
        const mentors = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'mentor'");
        res.json({ success: true, learners: parseInt(learners.rows[0].count), mentors: parseInt(mentors.rows[0].count) });
    } catch (err) {
        console.error("Stats error:", err);
        res.status(500).json({ success: false, message: "Could not load stats.", learners: 0, mentors: 0 });
    }
});

// GET /api/auth/users/:id - Get one user's public info (for profile pages)
router.get("/users/:id", verifyToken, async (req, res) => {
    const pool = require("../config/database");
    try {
        const result = await pool.query("SELECT id, name, username, role, created_at FROM users WHERE id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "User not found." });
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error("Get user error:", err);
        res.status(500).json({ success: false, message: "Could not load user." });
    }
});

// GET /api/auth/mentors - Get mentors list  [auth required — was public]
router.get("/mentors", verifyToken, async (req, res) => {
    const pool = require("../config/database");
    try {
        const result = await pool.query("SELECT id, name, email, role, created_at FROM users WHERE role = 'mentor' ORDER BY created_at DESC");
        res.json({ success: true, mentors: result.rows });
    } catch (err) {
        console.error("List mentors error:", err);
        res.status(500).json({ success: false, message: "Could not load mentors.", mentors: [] });
    }
});

module.exports = router;
