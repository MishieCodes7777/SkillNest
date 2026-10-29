const xss = require("xss");

// Sanitize all inputs to prevent XSS
function sanitizeInput(obj) {
    if (typeof obj === "string") return xss(obj.trim());
    if (Array.isArray(obj)) return obj.map(sanitizeInput);
    if (obj && typeof obj === "object") {
        const clean = {};
        for (const key in obj) {
            clean[key] = sanitizeInput(obj[key]);
        }
        return clean;
    }
    return obj;
}

function sanitizeMiddleware(req, res, next) {
    // Smart Help stores bounded plain text/code and renders it only as React text.
    // HTML sanitization here would corrupt code examples into visible entities.
    if (req.body && !req.path.startsWith('/api/help/')) req.body = sanitizeInput(req.body);
    if (req.query) req.query = sanitizeInput(req.query);
    if (req.params) req.params = sanitizeInput(req.params);
    next();
}

module.exports = sanitizeMiddleware;
