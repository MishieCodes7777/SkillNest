const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const pool = require("../config/database");

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function getTransporter() {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
    return nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
}

async function sendResetEmail(toEmail, name, resetUrl) {
    const transporter = getTransporter();
    if (!transporter) {
        console.warn(`⚠️  Email not configured (set GMAIL_USER + GMAIL_APP_PASSWORD in .env) — reset link for ${toEmail}: ${resetUrl}`);
        return;
    }
    await transporter.sendMail({
        from: `SkillNest <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: "Reset your SkillNest password",
        text: `Hi ${name},\n\nSomeone requested a password reset for your SkillNest account. If this was you, reset it here (link expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
        html: `<p>Hi ${name},</p><p>Someone requested a password reset for your SkillNest account. If this was you, click below to choose a new password (this link expires in 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
    });
}

// POST /api/auth/forgot-password - { email }
// Always responds with the same generic message regardless of whether the
// email exists, so this endpoint can't be used to check which emails are registered.
router.post("/forgot-password", async (req, res) => {
    const GENERIC_MESSAGE = "If an account exists for that email, we've sent a password reset link.";
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        if (!email) return res.status(400).json({ success: false, message: "Email is required." });

        const result = await pool.query("SELECT id, name, email FROM users WHERE LOWER(email) = $1", [email]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const token = crypto.randomBytes(32).toString("hex");
            const expiry = new Date(Date.now() + RESET_TOKEN_TTL_MS);
            await pool.query("UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3", [token, expiry, user.id]);

            const origin = req.body.origin || `${req.protocol}://${req.get('host')}`;
            const resetUrl = `${origin}/reset-password/${token}`;
            sendResetEmail(user.email, user.name, resetUrl).catch(err => console.error("Send reset email failed:", err.message));
        }

        return res.json({ success: true, message: GENERIC_MESSAGE });
    } catch (err) {
        console.error("Forgot password error:", err);
        return res.json({ success: true, message: GENERIC_MESSAGE });
    }
});

// GET /api/auth/reset-password/:token/valid - lets the frontend check the token before showing the form
router.get("/reset-password/:token/valid", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()",
            [req.params.token]
        );
        res.json({ success: true, valid: result.rows.length > 0 });
    } catch (err) {
        res.json({ success: true, valid: false });
    }
});

// POST /api/auth/reset-password/:token - { password }
router.post("/reset-password/:token", async (req, res) => {
    try {
        const password = req.body.password || '';
        if (password.length < 6 || !/\d/.test(password)) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters and contain a number." });
        }

        const result = await pool.query(
            "SELECT id FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()",
            [req.params.token]
        );
        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: "This reset link is invalid or has expired. Request a new one." });
        }

        const hashed = await bcrypt.hash(password, 12);
        await pool.query(
            "UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL, updated_at = NOW() WHERE id = $2",
            [hashed, result.rows[0].id]
        );
        return res.json({ success: true, message: "Password updated. You can log in now." });
    } catch (err) {
        console.error("Reset password error:", err);
        return res.status(500).json({ success: false, message: "Could not reset password." });
    }
});

module.exports = router;
