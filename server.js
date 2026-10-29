const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const hpp = require("hpp");
const morgan = require("morgan");
require("dotenv").config();
require('./config/validateEnvironment')();

// Initialize database
require("./config/database");

const app = express();

// ===== SECURITY MEASURES =====

// 1. Helmet - Secure HTTP headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://accounts.google.com/gsi/client"],
            // Inline `style={{...}}` props (used throughout the React app) render as
            // inline style attributes, which need 'unsafe-inline' here to keep working.
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://www.gstatic.com"],
            mediaSrc: ["'self'", "blob:"],
            connectSrc: ["'self'", "ws:", "wss:", "https://accounts.google.com"],
            // The Google Sign-In button renders inside an iframe from Google's origin.
            frameSrc: ["https://accounts.google.com"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// 2. Request logging
app.use(morgan("combined"));

// 3. CORS whitelist (override with ALLOWED_ORIGINS="https://your-domain.com,https://www.your-domain.com" in prod)
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
    : ["http://localhost:5173", "http://localhost:3000"];
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));

// Photo uploads (sent as base64 data URLs) need a bigger body than the 10kb
// default kept everywhere else as a DoS mitigation — scoped narrowly to just
// these two routes, registered before the general small-limit parser below so
// it runs first; body-parser skips re-parsing a body it's already read.
app.use("/api/mentor/profile", express.json({ limit: "3mb" }));
app.use("/api/auth/avatar", express.json({ limit: "3mb" }));
app.use('/api/messages', express.json({limit:'12mb'}));
app.use('/api/ai/chat', express.json({ limit: '96kb' }));
app.use('/api/ai/resume-review', express.json({ limit: '48kb' }));
app.use('/api/research/confirm', express.json({ limit: '96kb' }));
app.use('/api/help', express.json({ limit: '20kb' }));

// 4. Body parser with size limit (10kb max)
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

// 5. Cookie parser
app.use(cookieParser());

// 6. HPP - prevent parameter pollution
app.use(hpp());

// 7. Input sanitization (XSS prevention)
const sanitizeMiddleware = require("./middleware/sanitize");
app.use(sanitizeMiddleware);

// 8. Rate limiting
const { apiLimiter, authLimiter } = require("./middleware/rateLimiter");
app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

// ===== API ROUTES =====
app.get('/api/health', (req, res) => res.status(require('./config/database').initialized ? 200 : 503).json({
    success: Boolean(require('./config/database').initialized), version: 'learning-studio-1', service: 'SkillNest'
}));
const authRoutes = require("./routes/auth");
const aiRoutes = require("./routes/ai");
const coursesRoutes = require("./routes/courses");
const mentorRoutes = require("./routes/mentor");
const communityRoutes = require("./routes/community");
const mentorApplicationsRoutes = require("./routes/mentorApplications");
const notificationsRoutes = require("./routes/notifications");
const passwordResetRoutes = require("./routes/passwordReset");
const connectionsRoutes = require("./routes/connections");
const messagesRoutes = require("./routes/messages");
const turnRoutes = require("./routes/turn");
app.use("/api/auth", authRoutes);
app.use("/api/auth", passwordResetRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/mentor", mentorRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/mentor-applications", mentorApplicationsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/connections", connectionsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/turn-credentials", turnRoutes);
app.use('/api/learning', require('./routes/learning'));
app.use('/api/research', require('./routes/research'));
app.use('/api/help', require('./routes/help'));
app.use('/api/topic-model', require('./routes/topicModel'));
app.use('/api/meetings', require('./routes/meetings'));

// ===== STATIC FILES =====
const distPath = path.join(__dirname, "dist");
if (require("fs").existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use((req, res, next) => {
        if (!req.path.startsWith("/api") && !req.path.startsWith("/socket.io")) {
            res.sendFile(path.join(distPath, "index.html"));
        } else {
            next();
        }
    });
} else {
    app.use(express.static(path.join(__dirname, "public")));
    app.use("/globe.png", express.static(path.join(__dirname, "globe.png")));
}

// ===== 404 HANDLER =====
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
});

// ===== GLOBAL ERROR HANDLER =====
app.use((err, req, res, next) => {
    console.error("Server error:", err.message);
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === "production"
            ? "Something went wrong"
            : err.message,
    });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port: ${PORT}`);
    console.log(`   Security: Helmet, CORS, Rate Limiting, XSS Protection, HPP active`);
});

// ===== SOCKET.IO =====
const io = require("socket.io")(server, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"] }
});

require('./services/meetingSockets').attach(io, require('./config/database'));
app.set('io',io);
// Enforce retention without depending on a user opening the matching screen.
const housekeeping=setInterval(async()=>{
    const db=require('./config/database');if(!db.initialized)return;
    try{await db.query("DELETE FROM help_match_events WHERE created_at<NOW()-INTERVAL '30 days'");await db.query("UPDATE help_requests SET status='expired' WHERE status='pending' AND expires_at<=NOW()");}catch{console.error('Smart Help housekeeping failed');}
},60*60*1000);housekeeping.unref();
