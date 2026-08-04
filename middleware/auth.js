const jwt = require("jsonwebtoken");
const { isBlacklisted } = require("./tokenBlacklist");
require("dotenv").config();

// Middleware to verify JWT token from cookies or Authorization header
function verifyToken(req, res, next) {
    const token =
        req.cookies?.token ||
        (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access denied. No token provided. Please log in.",
        });
    }

    // Check blacklist
    if (isBlacklisted(token)) {
        return res.status(401).json({
            success: false,
            message: "Token has been invalidated. Please log in again.",
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token. Please log in again.",
        });
    }
}

// Middleware to restrict by role
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Insufficient permissions.",
            });
        }
        next();
    };
}

module.exports = { verifyToken, requireRole };
