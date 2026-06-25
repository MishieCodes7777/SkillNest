const jwt = require("jsonwebtoken");
require("dotenv").config();

// Middleware to verify JWT token from cookies or Authorization header
function verifyToken(req, res, next) {
    // Check cookie first, then Authorization header
    const token =
        req.cookies?.token ||
        (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access denied. No token provided. Please log in.",
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, email, role }
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
