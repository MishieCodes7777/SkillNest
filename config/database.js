const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "skillnest",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "your_password_here",

    ssl: process.env.DB_HOST && process.env.DB_HOST.includes("neon.tech")
        ? { rejectUnauthorized: false }
        : false,
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
            username VARCHAR(50) UNIQUE,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'learner',
            roles TEXT DEFAULT '["learner"]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

       
    `;

    try {
        await pool.query(createTableQuery);
        // Add username column if table already exists without it
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE`).catch(() => { });
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username_changes TEXT DEFAULT '[]'`).catch(() => { });
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT DEFAULT '["learner"]'`).catch(() => { });
        await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email);
`);

        await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_username
    ON users(username);
`);
        console.log("✅ Users table ready");

        // Courses table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS courses (
                id SERIAL PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                image_url TEXT,
                mentor_id INTEGER REFERENCES users(id),
                mentor_name VARCHAR(100),
                difficulty VARCHAR(20) DEFAULT 'beginner',
                duration VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Mentor profiles table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS mentor_profiles (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE REFERENCES users(id),
                bio TEXT DEFAULT '',
                skills TEXT DEFAULT '[]',
                categories TEXT DEFAULT '[]',
                languages TEXT DEFAULT '["English"]',
                experience TEXT DEFAULT '',
                linkedin VARCHAR(255) DEFAULT '',
                github VARCHAR(255) DEFAULT '',
                portfolio VARCHAR(255) DEFAULT '',
                twitter VARCHAR(255) DEFAULT '',
                profile_photo TEXT DEFAULT '',
                hourly_rate INTEGER DEFAULT 0,
                custom_links TEXT DEFAULT '[]',
                is_verified BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log("✅ Courses & Mentor Profiles table ready");
    } catch (err) {
        console.error("❌ Error creating table:", err.message);
    }
}

initDatabase();

module.exports = pool;
