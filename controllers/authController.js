const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
require("dotenv").config();

const SALT_ROUNDS = 12;

// ==================== SIGNUP ====================
async function signup(req, res) {
    try {
        const { name, username, email, password } = req.body;
        // Every account starts as a learner — becoming a mentor requires a
        // reviewed application (routes/mentorApplications.js), not a signup flag.
        const userRole = "learner";

        // Validate username
        if (!username || username.length < 3) {
            return res.status(400).json({
                success: false,
                message: "Username must be at least 3 characters.",
            });
        }

        // Username format: only lowercase letters, numbers, underscores, dots
        if (!/^[a-z0-9._]+$/.test(username)) {
            return res.status(400).json({
                success: false,
                message: "Username can only contain lowercase letters, numbers, dots, and underscores.",
            });
        }

        // Check if email already exists
        const existingEmail = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingEmail.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists. Try logging in instead.",
            });
        }

        // Check if username already exists
        const existingUsername = await pool.query(
            "SELECT id FROM users WHERE username = $1",
            [username]
        );

        if (existingUsername.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This username is already taken. Try a different one.",
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Insert user — roles (JSON list) must agree with role from the start,
        // otherwise a mentor who signed up (vs. added the role later via /add-role)
        // ends up with role='mentor' but roles=["learner"], a contradictory account state.
        const result = await pool.query(
            `INSERT INTO users (name, username, email, password, role, roles)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, name, username, email, role, created_at`,
            [name, username, email, hashedPassword, userRole, JSON.stringify([userRole])]
        );

        const user = result.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );

        // Set token in cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return res.status(201).json({
            success: true,
            message: "Account created successfully!",
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                created_at: user.created_at,
            },
            token,
        });
    } catch (err) {
        console.error("Signup error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error. Please try again later.",
        });
    }
}

// ==================== LOGIN ====================
async function login(req, res) {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const result = await pool.query(
            "SELECT id, name, email, password, role, created_at FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        const user = result.rows[0];

        // Try to get roles (column might not exist)
        let roles = [user.role];
        try {
            const rolesResult = await pool.query("SELECT roles FROM users WHERE id = $1", [user.id]);
            if (rolesResult.rows[0]?.roles) roles = JSON.parse(rolesResult.rows[0].roles);
        } catch (e) { /* roles column doesn't exist yet, use single role */ }

        // Compare password with bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );

        // Set token in cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return res.status(200).json({
            success: true,
            message: "Login successful!",
            user: {
                id: user.id,
                name: user.name,
                username: user.username || null,
                email: user.email,
                role: user.role,
                roles: roles,
                created_at: user.created_at,
            },
            token,
        });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error. Please try again later.",
        });
    }
}

// ==================== LOGOUT ====================
function logout(req, res) {
    // Blacklist the token so it can't be reused
    const token = req.cookies?.token || (req.headers.authorization && req.headers.authorization.split(" ")[1]);
    if (token) {
        const { addToBlacklist } = require("../middleware/tokenBlacklist");
        addToBlacklist(token);
    }

    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });

    return res.status(200).json({
        success: true,
        message: "Logged out successfully.",
    });
}

// ==================== GET CURRENT USER ====================
async function getMe(req, res) {
    try {
        const result = await pool.query(
            `SELECT u.id, u.name, u.username, u.email, u.role, u.roles, u.created_at,
                    COALESCE(NULLIF(mp.profile_photo, ''), u.avatar_url, '') AS avatar_url
             FROM users u LEFT JOIN mentor_profiles mp ON mp.user_id = u.id
             WHERE u.id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const row = result.rows[0];
        let roles = [row.role];
        try { roles = JSON.parse(row.roles || '[]'); } catch (e) { /* keep single-role fallback */ }

        return res.status(200).json({
            success: true,
            user: { id: row.id, name: row.name, username: row.username, email: row.email, role: row.role, roles, created_at: row.created_at, avatar_url: row.avatar_url },
        });
    } catch (err) {
        console.error("GetMe error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error.",
        });
    }
}

// ==================== VERIFY TOKEN (for frontend page protection) ====================
function verifyAuth(req, res) {
    return res.status(200).json({
        success: true,
        user: req.user,
    });
}

module.exports = { signup, login, logout, getMe, verifyAuth };
