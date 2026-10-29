module.exports = async function learningSchema(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS learning_sessions (
        id UUID PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        track TEXT NOT NULL, question_ids JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), submitted_at TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS learning_attempts (
        id BIGSERIAL PRIMARY KEY, session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, question_id TEXT NOT NULL,
        question_version INTEGER NOT NULL, topic TEXT NOT NULL, answer INTEGER NOT NULL, correct BOOLEAN NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(session_id, question_id)
      );
      CREATE INDEX IF NOT EXISTS learning_attempts_user ON learning_attempts(user_id, created_at, id);
      CREATE TABLE IF NOT EXISTS learning_plans (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, track TEXT NOT NULL,
        hours INTEGER NOT NULL DEFAULT 5 CHECK(hours BETWEEN 1 AND 40), completed JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY(user_id, track)
      );
      CREATE TABLE IF NOT EXISTS saved_roadmaps (
        id UUID PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        goal TEXT NOT NULL, skills TEXT NOT NULL DEFAULT '', weeks JSONB NOT NULL,
        source TEXT NOT NULL, progress JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS research_imports (
        id UUID PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        profile_url TEXT NOT NULL, author_name TEXT NOT NULL DEFAULT '', works JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS research_publications (
        id BIGSERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        external_id TEXT NOT NULL, title TEXT NOT NULL, year INTEGER, authors TEXT NOT NULL DEFAULT '',
        url TEXT NOT NULL, full_text_url TEXT, topics JSONB NOT NULL DEFAULT '[]', source TEXT NOT NULL,
        profile_url TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, external_id)
      );
      ALTER TABLE learning_sessions ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'assessment';
      ALTER TABLE learning_sessions ADD COLUMN IF NOT EXISTS policy TEXT NOT NULL DEFAULT 'curriculum-v1';
    `);
};
