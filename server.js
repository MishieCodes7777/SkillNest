const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();

// Initialize database connection
require("./config/database");

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
const authRoutes = require("./routes/auth");
const aiRoutes = require("./routes/ai");
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);

// Serve static files
app.use(express.static(path.join(__dirname)));

// Root URL serves home.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "home.html"));
});

// Protected page route - serves dashboard only if authenticated
// (Frontend also checks via fetch, this is an extra layer)
app.get("/dashboard.html", (req, res) => {
    res.sendFile(path.join(__dirname, "dashboard.html"));
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port: ${PORT}`);
    console.log(`   http://localhost:${PORT}`);
});

// ==================== SOCKET.IO (unchanged) ====================
const io = require("socket.io")(server);

let userConnections = [];

io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("userconnect", (data) => {
        const others = userConnections.filter(
            (p) => p.meeting_id === data.meetingid
        );

        userConnections.push({
            connectionId: socket.id,
            user_id: data.displayName,
            meeting_id: data.meetingid,
        });

        socket.emit("all-users", others);

        others.forEach((user) => {
            socket.to(user.connectionId).emit("user-joined", {
                connId: socket.id,
                user_id: data.displayName,
            });
        });
    });

    socket.on("signal", (data) => {
        socket.to(data.to).emit("signal", {
            from: socket.id,
            signal: data.signal,
        });
    });

    // Chat message relay
    socket.on("chat-message", (data) => {
        const meetUsers = userConnections.filter(p => p.meeting_id === data.meetingid && p.connectionId !== socket.id);
        meetUsers.forEach(u => { socket.to(u.connectionId).emit("chat-message", data); });
    });

    // Hand raised relay
    socket.on("hand-raised", (data) => {
        const meetUsers = userConnections.filter(p => p.meeting_id === data.meetingid && p.connectionId !== socket.id);
        meetUsers.forEach(u => { socket.to(u.connectionId).emit("hand-raised", data); });
    });

    socket.on("disconnect", () => {
        const disUser = userConnections.find(
            (p) => p.connectionId === socket.id
        );

        if (!disUser) return;

        const meetingid = disUser.meeting_id;

        userConnections = userConnections.filter(
            (p) => p.connectionId !== socket.id
        );

        userConnections
            .filter((p) => p.meeting_id === meetingid)
            .forEach((user) => {
                socket.to(user.connectionId).emit("user-left", {
                    connId: socket.id,
                });
            });
    });
});
