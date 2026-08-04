const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const hpp = require("hpp");
const morgan = require("morgan");
require("dotenv").config();

// Initialize database
require("./config/database");

const app = express();

// ===== SECURITY MEASURES =====

// 1. Helmet - Secure HTTP headers
app.use(helmet({
    contentSecurityPolicy: false, // disabled for dev (React needs inline scripts)
    crossOriginEmbedderPolicy: false,
}));

// 2. Request logging
app.use(morgan("combined"));

// 3. CORS whitelist
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
}));

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

// ===== API ROUTES =====
const authRoutes = require("./routes/auth");
const aiRoutes = require("./routes/ai");
const coursesRoutes = require("./routes/courses");
const mentorRoutes = require("./routes/mentor");
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/mentor", mentorRoutes);

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
    cors: { origin: ["http://localhost:5173", "http://localhost:3000"], methods: ["GET", "POST"] }
});

let userConnections = [];

io.on("connection", (socket) => {
    socket.on("userconnect", (data) => {
        const others = userConnections.filter(p => p.meeting_id === data.meetingid);
        userConnections.push({ connectionId: socket.id, user_id: data.displayName, meeting_id: data.meetingid });
        socket.emit("all-users", others);
        others.forEach(user => { socket.to(user.connectionId).emit("user-joined", { connId: socket.id, user_id: data.displayName }); });
    });

    socket.on("signal", (data) => { socket.to(data.to).emit("signal", { from: socket.id, signal: data.signal }); });

    socket.on("chat-message", (data) => {
        const meetUsers = userConnections.filter(p => p.meeting_id === data.meetingid && p.connectionId !== socket.id);
        meetUsers.forEach(u => { socket.to(u.connectionId).emit("chat-message", data); });
    });

    socket.on("hand-raised", (data) => {
        const meetUsers = userConnections.filter(p => p.meeting_id === data.meetingid && p.connectionId !== socket.id);
        meetUsers.forEach(u => { socket.to(u.connectionId).emit("hand-raised", data); });
    });

    socket.on("disconnect", () => {
        const disUser = userConnections.find(p => p.connectionId === socket.id);
        if (!disUser) return;
        const meetingid = disUser.meeting_id;
        userConnections = userConnections.filter(p => p.connectionId !== socket.id);
        userConnections.filter(p => p.meeting_id === meetingid).forEach(user => { socket.to(user.connectionId).emit("user-left", { connId: socket.id }); });
    });
});
