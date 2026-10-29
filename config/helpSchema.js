// Additive and idempotent. No existing learner or prediction records are removed.
module.exports = async pool => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_blocks (
        blocker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        blocked_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(blocker_id,blocked_id), CHECK(blocker_id<>blocked_id)
      );
      CREATE TABLE IF NOT EXISTS help_preferences (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        opt_in BOOLEAN NOT NULL DEFAULT FALSE, skills TEXT[] NOT NULL DEFAULT '{}',
        modes TEXT[] NOT NULL DEFAULT '{async}', availability TEXT NOT NULL DEFAULT 'available' CHECK(availability IN ('available','paused')),
        timezone TEXT NOT NULL DEFAULT 'UTC', max_cases INTEGER NOT NULL DEFAULT 2 CHECK(max_cases BETWEEN 1 AND 10),
        notifications BOOLEAN NOT NULL DEFAULT TRUE, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS help_doubts (
        id BIGSERIAL PRIMARY KEY, author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL CHECK(length(title) BETWEEN 8 AND 160), body TEXT NOT NULL CHECK(length(body) BETWEEN 20 AND 6000),
        code TEXT NOT NULL DEFAULT '' CHECK(length(code)<=6000), tags TEXT[] NOT NULL DEFAULT '{}',
        tag_provenance JSONB NOT NULL DEFAULT '{}', visibility TEXT NOT NULL CHECK(visibility IN ('public','private','connected')),
        status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
        mode TEXT NOT NULL DEFAULT 'async' CHECK(mode IN ('async','voice','video')),
        matching_consent BOOLEAN NOT NULL DEFAULT FALSE, analytics_consent BOOLEAN NOT NULL DEFAULT FALSE,
        moderated BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resolved_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS help_doubts_feed ON help_doubts(visibility,status,id DESC);
      CREATE INDEX IF NOT EXISTS help_doubts_owner ON help_doubts(author_id,id DESC);
      CREATE INDEX IF NOT EXISTS help_doubts_tags ON help_doubts USING GIN(tags);
      CREATE INDEX IF NOT EXISTS help_doubts_search ON help_doubts USING GIN(to_tsvector('english',title || ' ' || body));
      CREATE TABLE IF NOT EXISTS help_requests (
        id BIGSERIAL PRIMARY KEY, doubt_id BIGINT NOT NULL REFERENCES help_doubts(id) ON DELETE CASCADE,
        requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, helper_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mode TEXT NOT NULL CHECK(mode IN ('async','voice','video')), status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','cancelled','expired','completed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), responded_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '7 days', CHECK(requester_id<>helper_id)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS help_request_active ON help_requests(doubt_id,helper_id) WHERE status IN ('pending','accepted');
      CREATE INDEX IF NOT EXISTS help_request_workload ON help_requests(helper_id,status);
      CREATE INDEX IF NOT EXISTS help_request_owner ON help_requests(requester_id,id DESC);
      CREATE TABLE IF NOT EXISTS help_answers (
        id BIGSERIAL PRIMARY KEY, doubt_id BIGINT NOT NULL REFERENCES help_doubts(id) ON DELETE CASCADE,
        author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 6000),
        accepted BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS help_answers_doubt ON help_answers(doubt_id,id);
      CREATE TABLE IF NOT EXISTS help_feedback (
        request_id BIGINT PRIMARY KEY REFERENCES help_requests(id) ON DELETE CASCADE,
        resolved BOOLEAN NOT NULL, rating INTEGER CHECK(rating BETWEEN 1 AND 5), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS help_match_events (
        id BIGSERIAL PRIMARY KEY, doubt_id BIGINT NOT NULL REFERENCES help_doubts(id) ON DELETE CASCADE,
        algorithm TEXT NOT NULL, candidates JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS help_match_retention ON help_match_events(created_at);
      CREATE TABLE IF NOT EXISTS help_reports (
        id BIGSERIAL PRIMARY KEY, reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        doubt_id BIGINT REFERENCES help_doubts(id) ON DELETE CASCADE, reason TEXT NOT NULL CHECK(length(reason) BETWEEN 10 AND 1000),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','dismissed','hidden')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS meeting_rooms (
        id UUID PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        help_request_id BIGINT UNIQUE REFERENCES help_requests(id) ON DELETE CASCADE,
        mode TEXT NOT NULL DEFAULT 'video' CHECK(mode IN ('voice','video')), starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '4 hours'
      );
      CREATE TABLE IF NOT EXISTS meeting_participants (
        room_id UUID REFERENCES meeting_rooms(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY(room_id,user_id)
      );
    `);
};
