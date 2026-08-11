const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const hpp = require("hpp");
const morgan = require("morgan");
const jwt = require("jsonwebtoken");
require("dotenv").config();

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
            imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://www.gstatic.com"],
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

// Require a valid session for every meeting-room connection, and trust ONLY
// the name from the verified JWT — never a client-supplied display name.
// (Previously the client could pass any name it liked via `data.displayName`,
// which is how one user could show up in a room labeled with someone else's name.)
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    try {
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        next(new Error("Invalid or expired session"));
    }
});

let userConnections = [];

io.on("connection", (socket) => {
    socket.on("userconnect", (data) => {
        const others = userConnections.filter(p => p.meeting_id === data.meetingid);
        // user_id here is the real numeric account id (trusted, from the verified
        // JWT) — used by the frontend to fetch that person's profile photo.
        userConnections.push({ connectionId: socket.id, user_id: socket.user.id, meeting_id: data.meetingid });
        socket.emit("all-users", others);
        others.forEach(user => { socket.to(user.connectionId).emit("user-joined", { connId: socket.id, user_id: socket.user.id }); });
    });

    socket.on("signal", (data) => { socket.to(data.to).emit("signal", { from: socket.id, signal: data.signal }); });

    socket.on("chat-message", (data) => {
        const meetUsers = userConnections.filter(p => p.meeting_id === data.meetingid && p.connectionId !== socket.id);
        const safeData = { ...data, name: socket.user.name };
        meetUsers.forEach(u => { socket.to(u.connectionId).emit("chat-message", safeData); });
    });

    socket.on("hand-raised", (data) => {
        const meetUsers = userConnections.filter(p => p.meeting_id === data.meetingid && p.connectionId !== socket.id);
        meetUsers.forEach(u => { socket.to(u.connectionId).emit("hand-raised", data); });
    });

    // Mic/camera state — relayed with the sender's own socket id attached so
    // the receiving side can map it to the right video tile (mirrors "signal").
    socket.on("mic-toggle", (data) => {
        const meetUsers = userConnections.filter(p => p.meeting_id === data.meetingid && p.connectionId !== socket.id);
        meetUsers.forEach(u => { socket.to(u.connectionId).emit("mic-toggle", { from: socket.id, muted: data.muted }); });
    });
    socket.on("cam-toggle", (data) => {
        const meetUsers = userConnections.filter(p => p.meeting_id === data.meetingid && p.connectionId !== socket.id);
        meetUsers.forEach(u => { socket.to(u.connectionId).emit("cam-toggle", { from: socket.id, camOn: data.camOn }); });
    });

    socket.on("disconnect", () => {
        const disUser = userConnections.find(p => p.connectionId === socket.id);
        if (!disUser) return;
        const meetingid = disUser.meeting_id;
        userConnections = userConnections.filter(p => p.connectionId !== socket.id);
        userConnections.filter(p => p.meeting_id === meetingid).forEach(user => { socket.to(user.connectionId).emit("user-left", { connId: socket.id }); });
    });
});
