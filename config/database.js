const { Pool } = require("pg");
require("dotenv").config();

// Local Postgres (DB_HOST=localhost, dev) doesn't speak SSL at all.
// Neon (prod) requires it, and its certs are publicly CA-signed, so
// verifying them is safe — only skip SSL entirely for local dev.
const isLocalDb = ["localhost", "127.0.0.1"].includes(process.env.DB_HOST);

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    ssl: isLocalDb ? false : { rejectUnauthorized: true },
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
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)`).catch(() => { });
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP`).catch(() => { });
        // Google Sign-In: accounts created this way still get a normal (random,
        // unusable) password hash so the existing NOT NULL password column and
        // password-login path don't need special-casing anywhere else.
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE`).catch(() => { });
        // Every account's own photo (learners included — mentor_profiles.profile_photo
        // only ever covered mentors). Stored as a data URL, same as mentor photos.
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT ''`).catch(() => { });
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
        await pool.query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS video_count INTEGER DEFAULT 0`).catch(() => { });

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

        // Neither FK originally specified ON DELETE behavior, so removing a user
        // whose id is still referenced (e.g. a future "delete my account" feature,
        // or the account cleanup used while testing this) fails with a raw
        // constraint error instead of cleaning up related rows.
        await pool.query(`ALTER TABLE mentor_profiles DROP CONSTRAINT IF EXISTS mentor_profiles_user_id_fkey`);
        await pool.query(`ALTER TABLE mentor_profiles ADD CONSTRAINT mentor_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
        await pool.query(`ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_mentor_id_fkey`);
        await pool.query(`ALTER TABLE courses ADD CONSTRAINT courses_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE SET NULL`);

        console.log("✅ Courses & Mentor Profiles table ready");

        // Community feed: posts, likes, comments (students + mentors, shared network)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS posts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                image_url TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS post_likes (
                id SERIAL PRIMARY KEY,
                post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(post_id, user_id)
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS post_comments (
                id SERIAL PRIMARY KEY,
                post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id)`);
        console.log("✅ Community feed tables ready");

        // Mentor applications: becoming a mentor requires review, not a self-service toggle
        await pool.query(`
            CREATE TABLE IF NOT EXISTS mentor_applications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                motivation TEXT NOT NULL,
                skills TEXT DEFAULT '',
                experience TEXT DEFAULT '',
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                reviewed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_mentor_apps_user_id ON mentor_applications(user_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_mentor_apps_status ON mentor_applications(status)`);
        // Eligibility now requires proof, not just a skills list — a link to real work
        // (portfolio/resume) and concrete project examples, reviewed by an admin.
        await pool.query(`ALTER TABLE mentor_applications ADD COLUMN IF NOT EXISTS portfolio_url TEXT DEFAULT ''`).catch(() => { });
        await pool.query(`ALTER TABLE mentor_applications ADD COLUMN IF NOT EXISTS projects TEXT DEFAULT ''`).catch(() => { });
        console.log("✅ Mentor applications table ready");

        // Notifications — real per-user activity feed for the bell icon
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(40) NOT NULL,
                message TEXT NOT NULL,
                link TEXT DEFAULT '',
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC)`);
        console.log("✅ Notifications table ready");

        // Real messaging: connection requests must be accepted before a chat
        // exists, and messages persist server-side (not per-browser localStorage).
        await pool.query(`
            CREATE TABLE IF NOT EXISTS connections (
                id SERIAL PRIMARY KEY,
                requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                responded_at TIMESTAMP
            )
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_connections_requester ON connections(requester_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_connections_recipient ON connections(recipient_id)`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, recipient_id, created_at)`);
        console.log("✅ Connections & Messages tables ready");

        // Enrollments — a mentor's "Students" list should be people who
        // actually enrolled in one of their courses, not every learner on
        // the platform (which is what it showed before this table existed).
        await pool.query(`
            CREATE TABLE IF NOT EXISTS enrollments (
                id SERIAL PRIMARY KEY,
                course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(course_id, student_id)
            )
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id)`);
        console.log("✅ Enrollments table ready");

        // Course reviews — one review per student per course (editable), so a
        // student rating a course twice updates their existing review instead
        // of creating duplicates.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS course_reviews (
                id SERIAL PRIMARY KEY,
                course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
                comment TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(course_id, student_id)
            )
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_course_reviews_course ON course_reviews(course_id)`);
        console.log("✅ Course reviews table ready");
    } catch (err) {
        console.error("❌ Error creating table:", err.message);
    }
}

initDatabase();

module.exports = pool;
