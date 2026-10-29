const blockSQL = (a,b) => `EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id=${a} AND b.blocked_id=${b}) OR (b.blocker_id=${b} AND b.blocked_id=${a}))`;
const approvedSQL = alias => `EXISTS (SELECT 1 FROM mentor_applications ma WHERE ma.user_id=${alias} AND ma.status='approved')`;
async function blocked(db,a,b) { return (await db.query(`SELECT ${blockSQL('$1::int','$2::int')} AS blocked`,[a,b])).rows[0].blocked; }
async function canRead(db,d,userId) {
    if (d.author_id === userId) return true;
    if (d.moderated || await blocked(db,d.author_id,userId)) return false;
    if (d.visibility === 'public') return true;
    const invite = await db.query("SELECT 1 FROM help_requests WHERE doubt_id=$1 AND helper_id=$2 AND status IN ('pending','accepted','completed') AND (status<>'pending' OR expires_at>NOW())",[d.id,userId]);
    if (invite.rowCount) return true;
    return d.visibility === 'connected' && Boolean((await db.query("SELECT 1 FROM connections WHERE status='accepted' AND ((requester_id=$1 AND recipient_id=$2) OR (requester_id=$2 AND recipient_id=$1))",[d.author_id,userId])).rowCount);
}
module.exports = { blockSQL, approvedSQL, blocked, canRead };
