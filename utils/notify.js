const pool = require("../config/database");

// Creates a notification for a user. Never throws — a failed notification
// shouldn't ever break the action that triggered it (a like, an approval, etc).
async function notify(userId, type, message, link = "") {
    try {
        await pool.query(
            "INSERT INTO notifications (user_id, type, message, link) VALUES ($1, $2, $3, $4)",
            [userId, type, message, link]
        );
    } catch (err) {
        console.error("Notify error:", err.message);
    }
}

module.exports = { notify };
