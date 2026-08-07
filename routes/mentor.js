const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const { verifyToken } = require("../middleware/auth");

// GET /api/mentor/profile - Get mentor profile
router.get("/profile", verifyToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM mentor_profiles WHERE user_id = $1", [req.user.id]);
        if (result.rows.length === 0) {
            // Create empty profile
            await pool.query("INSERT INTO mentor_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [req.user.id]);
            const fresh = await pool.query("SELECT * FROM mentor_profiles WHERE user_id = $1", [req.user.id]);
            return res.json({ success: true, profile: fresh.rows[0] || {} });
        }
        res.json({ success: true, profile: result.rows[0] });
    } catch (err) {
        console.error("Get mentor profile error:", err);
        res.json({ success: true, profile: {} });
    }
});

// PUT /api/mentor/profile - Update mentor profile  [mentor role required — was open to any logged-in user]
router.put("/profile", verifyToken, async (req, res) => {
    try {
        const requester = await pool.query("SELECT role, roles FROM users WHERE id = $1", [req.user.id]);
        let requesterRoles = [];
        try { requesterRoles = JSON.parse(requester.rows[0]?.roles || '[]'); } catch (e) { requesterRoles = requester.rows[0] ? [requester.rows[0].role] : []; }
        if (!requesterRoles.includes('mentor')) {
            return res.status(403).json({ success: false, message: "Only verified mentors can set up a mentor profile." });
        }

        const { bio, skills, categories, languages, experience, linkedin, github, portfolio, twitter, profile_photo, hourly_rate, customLinks } = req.body;

        // Upsert mentor profile
        await pool.query(`
            INSERT INTO mentor_profiles (user_id, bio, skills, categories, languages, experience, linkedin, github, portfolio, twitter, profile_photo, hourly_rate, custom_links, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                bio = COALESCE($2, mentor_profiles.bio),
                skills = COALESCE($3, mentor_profiles.skills),
                categories = COALESCE($4, mentor_profiles.categories),
                languages = COALESCE($5, mentor_profiles.languages),
                experience = COALESCE($6, mentor_profiles.experience),
                linkedin = COALESCE($7, mentor_profiles.linkedin),
                github = COALESCE($8, mentor_profiles.github),
                portfolio = COALESCE($9, mentor_profiles.portfolio),
                twitter = COALESCE($10, mentor_profiles.twitter),
                profile_photo = COALESCE($11, mentor_profiles.profile_photo),
                hourly_rate = COALESCE($12, mentor_profiles.hourly_rate),
                custom_links = COALESCE($13, mentor_profiles.custom_links),
                updated_at = NOW()
        `, [req.user.id, bio || '', JSON.stringify(skills || []), JSON.stringify(categories || []), JSON.stringify(languages || ['English']), experience || '', linkedin || '', github || '', portfolio || '', twitter || '', profile_photo || '', hourly_rate || 0, JSON.stringify(customLinks || [])]);

        res.json({ success: true, message: "Profile updated!" });
    } catch (err) {
        console.error("Update mentor profile error:", err);
        res.status(500).json({ success: false, message: "Could not update profile" });
    }
});

// GET /api/mentor/profile/:userId - Get public mentor profile
router.get("/profile/:userId", async (req, res) => {
    try {
        const profile = await pool.query("SELECT mp.*, u.name, u.email, u.username FROM mentor_profiles mp JOIN users u ON u.id = mp.user_id WHERE mp.user_id = $1", [req.params.userId]);
        if (profile.rows.length === 0) return res.status(404).json({ success: false });
        res.json({ success: true, profile: profile.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;
