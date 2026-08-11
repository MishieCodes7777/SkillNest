const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const { verifyToken, requireAdmin } = require("../middleware/auth");
const { notify } = require("../utils/notify");

async function grantMentorRole(userId) {
    const user = await pool.query("SELECT role, roles FROM users WHERE id = $1", [userId]);
    let roles = [];
    try { roles = JSON.parse(user.rows[0]?.roles || '[]'); } catch (e) { roles = user.rows[0] ? [user.rows[0].role] : []; }
    if (!roles.includes('mentor')) roles.push('mentor');
    await pool.query("UPDATE users SET roles = $1, role = 'mentor', updated_at = NOW() WHERE id = $2", [JSON.stringify(roles), userId]);
}

// GET /api/mentor-applications/me - my latest application status
router.get("/me", verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, status, motivation, skills, experience, portfolio_url, projects, created_at, reviewed_at FROM mentor_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
            [req.user.id]
        );
        res.json({ success: true, application: result.rows[0] || null });
    } catch (err) {
        console.error("Get application status error:", err);
        res.status(500).json({ success: false, message: "Could not check application status." });
    }
});

// POST /api/mentor-applications - submit (or resubmit after rejection) an application
router.post("/", verifyToken, async (req, res) => {
    try {
        const motivation = (req.body.motivation || '').trim();
        const skills = (req.body.skills || '').trim();
        const experience = (req.body.experience || '').trim();
        const portfolioUrl = (req.body.portfolioUrl || '').trim();
        const projects = (req.body.projects || '').trim();

        if (!motivation) return res.status(400).json({ success: false, message: "Tell us why you'd like to become a mentor." });
        // Eligibility: a skills list alone isn't proof of anything — require a link to
        // real work and at least one concrete project so admins have something to check.
        if (!skills) return res.status(400).json({ success: false, message: "List at least one skill you can teach." });
        if (!portfolioUrl) return res.status(400).json({ success: false, message: "A portfolio, resume, GitHub, or LinkedIn link is required." });
        if (!/^https?:\/\/.+/i.test(portfolioUrl)) return res.status(400).json({ success: false, message: "Portfolio/resume link must be a valid URL (starting with http:// or https://)." });
        if (!projects) return res.status(400).json({ success: false, message: "Describe at least one project you've built or worked on." });
        if (motivation.length > 2000 || skills.length > 500 || experience.length > 2000 || portfolioUrl.length > 500 || projects.length > 2000) {
            return res.status(400).json({ success: false, message: "One of your answers is too long." });
        }

        const existing = await pool.query(
            "SELECT status FROM mentor_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
            [req.user.id]
        );
        if (existing.rows[0]?.status === 'pending') {
            return res.status(409).json({ success: false, message: "You already have an application under review." });
        }
        if (existing.rows[0]?.status === 'approved') {
            return res.status(409).json({ success: false, message: "You're already a verified mentor." });
        }

        const inserted = await pool.query(
            `INSERT INTO mentor_applications (user_id, motivation, skills, experience, portfolio_url, projects)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, status, created_at`,
            [req.user.id, motivation, skills, experience, portfolioUrl, projects]
        );
        res.status(201).json({ success: true, application: inserted.rows[0] });
    } catch (err) {
        console.error("Submit application error:", err);
        res.status(500).json({ success: false, message: "Could not submit application." });
    }
});

// GET /api/mentor-applications - list pending applications (admin only)
router.get("/", verifyToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ma.id, ma.motivation, ma.skills, ma.experience, ma.portfolio_url, ma.projects, ma.status, ma.created_at,
                    u.id AS user_id, u.name, u.username, u.email, u.created_at AS member_since
             FROM mentor_applications ma JOIN users u ON u.id = ma.user_id
             WHERE ma.status = 'pending' ORDER BY ma.created_at ASC`
        );
        res.json({ success: true, applications: result.rows });
    } catch (err) {
        console.error("List applications error:", err);
        res.status(500).json({ success: false, message: "Could not load applications.", applications: [] });
    }
});

// POST /api/mentor-applications/:id/approve (admin only)
router.post("/:id/approve", verifyToken, requireAdmin, async (req, res) => {
    try {
        const app = await pool.query("UPDATE mentor_applications SET status = 'approved', reviewed_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING user_id", [req.params.id]);
        if (app.rows.length === 0) return res.status(404).json({ success: false, message: "Application not found or already reviewed." });
        await grantMentorRole(app.rows[0].user_id);
        notify(app.rows[0].user_id, 'mentor_approved', "Your mentor application was approved! You're now a verified mentor.", '/become-mentor');
        res.json({ success: true, message: "Mentor application approved." });
    } catch (err) {
        console.error("Approve application error:", err);
        res.status(500).json({ success: false, message: "Could not approve application." });
    }
});

// POST /api/mentor-applications/:id/reject (admin only)
router.post("/:id/reject", verifyToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query("UPDATE mentor_applications SET status = 'rejected', reviewed_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING id, user_id", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Application not found or already reviewed." });
        notify(result.rows[0].user_id, 'mentor_rejected', "Your mentor application wasn't approved this time. You're welcome to apply again.", '/become-mentor');
        res.json({ success: true, message: "Application rejected." });
    } catch (err) {
        console.error("Reject application error:", err);
        res.status(500).json({ success: false, message: "Could not reject application." });
    }
});

module.exports = router;
