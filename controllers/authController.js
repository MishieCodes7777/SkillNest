const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
require("dotenv").config();

const SALT_ROUNDS = 12;

// ==================== SIGNUP ====================
async function signup(req, res) {
    try {
        const { name, email, password, role } = req.body;
        const userRole = role || "learner";

        // Check if email already exists
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists.",
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Insert user
        const result = await pool.query(
            `INSERT INTO users (name, email, password, role) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, name, email, role, created_at`,
            [name, email, hashedPassword, userRole]
        );

        const user = result.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
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
                email: user.email,
                role: user.role,
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
            "SELECT id, name, email, password, role FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        const user = result.rows[0];

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
            { id: user.id, email: user.email, role: user.role },
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
                email: user.email,
                role: user.role,
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
            "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        return res.status(200).json({
            success: true,
            user: result.rows[0],
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
