const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "skillnest",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "your_password_here",
});

// Test connection
pool.query("SELECT NOW()")
    .then(() => console.log("✅ PostgreSQL connected successfully"))
    .catch((err) => console.error("❌ PostgreSQL connection error:", err.message));

// Create users table if not exists
async function initDatabase() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'learner' CHECK (role IN ('learner', 'mentor')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `;

    try {
        await pool.query(createTableQuery);
        console.log("✅ Users table ready");
    } catch (err) {
        console.error("❌ Error creating table:", err.message);
    }
}

initDatabase();

module.exports = pool;
