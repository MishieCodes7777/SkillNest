const express = require("express");
const router = express.Router();
const { signup, login, logout, getMe, verifyAuth } = require("../controllers/authController");
const { verifyToken, requireAdmin } = require("../middleware/auth");
const { signupValidation, loginValidation, handleValidation } = require("../middleware/validate");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const googleClient = process.env.VITE_GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID) : null;

// POST /api/auth/signup
router.post("/signup", signupValidation, handleValidation, signup);

// POST /api/auth/login
router.post("/login", loginValidation, handleValidation, login);

// POST /api/auth/google - sign up or log in with a Google ID token.
// Every account still starts as role='learner', same as normal signup — this
// never grants mentor status; that still requires a reviewed application
// (routes/mentorApplications.js). "Sign in as a mentor" just controls where
// the frontend routes you afterward, same as the existing role toggle does.
router.post("/google", async (req, res) => {
    const pool = require("../config/database");
    if (!googleClient) {
        return res.status(503).json({ success: false, message: "Google Sign-In isn't configured on this server yet." });
    }
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ success: false, message: "Missing Google credential." });

    try {
        const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.VITE_GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
            return res.status(401).json({ success: false, message: "Google account email isn't verified." });
        }

        const email = payload.email.toLowerCase();
        const existing = await pool.query("SELECT id, name, username, email, role, roles, google_id FROM users WHERE email = $1", [email]);

        let user;
        if (existing.rows.length > 0) {
            user = existing.rows[0];
            // First time this existing (password-based) account uses Google — link it.
            if (!user.google_id) {
                await pool.query("UPDATE users SET google_id = $1, updated_at = NOW() WHERE id = $2", [payload.sub, user.id]);
            }
        } else {
            // Generate a unique username from the email, and a random password the
            // user will never see or need — this account only ever logs in via Google,
            // but the `password` column is NOT NULL and every other code path assumes
            // a real bcrypt hash lives there.
            let base = (payload.given_name || email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9._]/g, '');
            if (base.length < 3) base = ('user' + base).slice(0, 20);
            let username = base;
            let suffix = 0;
            while (true) {
                const taken = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
                if (taken.rows.length === 0) break;
                suffix++;
                username = `${base}${suffix}`;
            }
            const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);

            const inserted = await pool.query(
                `INSERT INTO users (name, username, email, password, role, roles, google_id)
                 VALUES ($1, $2, $3, $4, 'learner', '["learner"]', $5)
                 RETURNING id, name, username, email, role, created_at`,
                [payload.name || base, username, email, randomPassword, payload.sub]
            );
            user = { ...inserted.rows[0], roles: '["learner"]' };
        }

        let roles = ['learner'];
        try { roles = JSON.parse(user.roles || '["learner"]'); } catch (e) { roles = [user.role || 'learner']; }

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({
            success: true,
            message: "Signed in with Google!",
            user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, roles },
            token,
        });
    } catch (err) {
        console.error("Google sign-in error:", err.message);
        res.status(401).json({ success: false, message: "Could not verify Google sign-in." });
    }
});

// POST /api/auth/logout
router.post("/logout", logout);

// GET /api/auth/me - Get current user (protected)
router.get("/me", verifyToken, getMe);

// GET /api/auth/verify - Check if token is valid (for page protection)
router.get("/verify", verifyToken, verifyAuth);

// GET /api/auth/am-i-admin - lets the frontend show/hide the admin nav link
router.get("/am-i-admin", verifyToken, (req, res) => {
    const admins = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
    res.json({ success: true, isAdmin: admins.includes((req.user.email || "").toLowerCase()) });
});

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
// avatar_url prefers the mentor profile photo (if they have one) over the
// account-level one, since that's the photo they curated for their mentor page.
router.get("/users/:id", verifyToken, async (req, res) => {
    const pool = require("../config/database");
    try {
        const result = await pool.query(
            `SELECT u.id, u.name, u.username, u.role, u.created_at,
                    COALESCE(NULLIF(mp.profile_photo, ''), u.avatar_url, '') AS avatar_url
             FROM users u LEFT JOIN mentor_profiles mp ON mp.user_id = u.id
             WHERE u.id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "User not found." });
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error("Get user error:", err);
        res.status(500).json({ success: false, message: "Could not load user." });
    }
});

// PUT /api/auth/avatar - set/update your own profile photo (data URL or image URL)
router.put("/avatar", verifyToken, async (req, res) => {
    const pool = require("../config/database");
    const { avatar_url } = req.body;
    if (typeof avatar_url !== 'string') return res.status(400).json({ success: false, message: "Missing photo." });
    if (avatar_url.length > 2_800_000) return res.status(413).json({ success: false, message: "Image is too large. Try a smaller photo (max ~2MB)." });
    try {
        await pool.query("UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2", [avatar_url, req.user.id]);
        res.json({ success: true, message: "Profile photo updated.", avatar_url });
    } catch (err) {
        console.error("Update avatar error:", err);
        res.status(500).json({ success: false, message: "Could not update photo." });
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

// DELETE /api/auth/users/:id - remove an account (admin only)
// Blocked for the caller's own account and for any other admin account, so
// cleanup can't accidentally lock everyone out of the admin panel.
router.delete("/users/:id", verifyToken, requireAdmin, async (req, res) => {
    const pool = require("../config/database");
    const targetId = req.params.id;
    try {
        if (String(targetId) === String(req.user.id)) {
            return res.status(400).json({ success: false, message: "You can't delete your own account from here." });
        }
        const admins = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
        const target = await pool.query("SELECT email FROM users WHERE id = $1", [targetId]);
        if (target.rows.length === 0) return res.status(404).json({ success: false, message: "User not found." });
        if (admins.includes((target.rows[0].email || "").toLowerCase())) {
            return res.status(400).json({ success: false, message: "Can't delete another admin account from here." });
        }

        await pool.query("DELETE FROM users WHERE id = $1", [targetId]);
        res.json({ success: true, message: "Account deleted." });
    } catch (err) {
        console.error("Delete user error:", err);
        res.status(500).json({ success: false, message: "Could not delete account." });
    }
});

module.exports = router;
