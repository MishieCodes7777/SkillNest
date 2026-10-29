const { randomUUID } = require('node:crypto');
const { blocked } = require('./helpAccess');
async function authorize(db,roomId,userId) {
    if(typeof roomId!=='string'||!/^[a-f\d-]{36}$/i.test(roomId)) return null;
    const room=(await db.query(`SELECT m.*,r.requester_id,r.helper_id,r.status AS request_status FROM meeting_rooms m JOIN meeting_participants p ON p.room_id=m.id AND p.user_id=$2 LEFT JOIN help_requests r ON r.id=m.help_request_id WHERE m.id=$1 AND m.starts_at<=NOW() AND m.expires_at>NOW()`,[roomId,userId])).rows[0];
    if(!room) return null;
    if(room.help_request_id&&(room.request_status!=='accepted'||await blocked(db,room.requester_id,room.helper_id))) return null;
    const participants=(await db.query('SELECT user_id FROM meeting_participants WHERE room_id=$1',[roomId])).rows;
    for(const p of participants) if(await blocked(db,p.user_id,userId)) return null;
    return room;
}
async function create(db,ownerId,{request=null,startsAt=new Date(),mode='video'}={}) {
    const roomId=randomUUID();
    const end=new Date(new Date(startsAt).getTime()+4*60*60*1000);
    const room=(await db.query('INSERT INTO meeting_rooms(id,owner_id,help_request_id,mode,starts_at,expires_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[roomId,ownerId,request?.id||null,mode,startsAt,end])).rows[0];
    for(const userId of new Set(request?[request.requester_id,request.helper_id]:[ownerId])) await db.query('INSERT INTO meeting_participants(room_id,user_id) VALUES($1,$2)',[roomId,userId]);
    return room;
}
module.exports={authorize,create};
