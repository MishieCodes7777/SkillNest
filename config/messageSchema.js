module.exports=async db=>{
 await db.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_data BYTEA, ADD COLUMN IF NOT EXISTS media_type TEXT, ADD COLUMN IF NOT EXISTS media_name TEXT, ADD COLUMN IF NOT EXISTS view_once BOOLEAN NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
 await db.query(`CREATE TABLE IF NOT EXISTS message_hidden(message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,PRIMARY KEY(message_id,user_id))`);
};
