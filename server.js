const express = require("express");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log("Server running on port:", PORT);
});

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

        // send existing users to new user
        socket.emit("all-users", others);

        // notify others
        others.forEach((user) => {
            socket.to(user.connectionId).emit("user-joined", {
                connId: socket.id,
                user_id: data.displayName,
            });
        });
    });

    // 🔥 SIMPLEPEER SIGNAL HANDLING
    socket.on("signal", (data) => {
        socket.to(data.to).emit("signal", {
            from: socket.id,
            signal: data.signal,
        });
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