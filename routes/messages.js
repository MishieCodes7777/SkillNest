const router=require('express').Router(),pool=require('../config/database');
const {verifyToken}=require('../middleware/auth');
const {blocked,blockSQL}=require('../services/helpAccess');
const {decodeMedia}=require('../services/messageMedia');
const {rateLimit}=require('express-rate-limit');
const fields='m.id,m.sender_id,m.recipient_id,m.content,m.created_at,m.is_read,m.media_type,m.media_name,m.view_once,m.opened_at,m.deleted_at';
const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){console.error('Messaging operation failed:',e.code||e.name);res.status(500).json({success:false,message:'Could not complete the messaging operation.'});}};
async function connected(a,b){return !(await blocked(pool,a,b))&&(await pool.query("SELECT 1 FROM connections WHERE status='accepted' AND ((requester_id=$1 AND recipient_id=$2) OR(requester_id=$2 AND recipient_id=$1))",[a,b])).rowCount>0;}
function emit(req,a,b){req.app.get('io')?.to(`account:${a}`).to(`account:${b}`).emit('messages-updated');}
router.use(verifyToken);router.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});
router.use(rateLimit({windowMs:60000,limit:100,keyGenerator:req=>String(req.user.id),standardHeaders:'draft-7',legacyHeaders:false}));
router.get('/',wrap(async(req,res)=>{
 const result=await pool.query(`SELECT u.id AS user_id,u.name,u.username,u.role,last.content AS last_message,last.created_at AS last_message_at,last.media_type,last.deleted_at,
 (SELECT COUNT(*)::int FROM messages m WHERE m.sender_id=u.id AND m.recipient_id=$1 AND NOT m.is_read AND m.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM message_hidden h WHERE h.message_id=m.id AND h.user_id=$1)) AS unread_count
 FROM connections c JOIN users u ON u.id=CASE WHEN c.requester_id=$1 THEN c.recipient_id ELSE c.requester_id END
 LEFT JOIN LATERAL(SELECT m.content,m.created_at,m.media_type,m.deleted_at FROM messages m WHERE ((m.sender_id=u.id AND m.recipient_id=$1) OR(m.sender_id=$1 AND m.recipient_id=u.id)) AND NOT EXISTS(SELECT 1 FROM message_hidden h WHERE h.message_id=m.id AND h.user_id=$1) ORDER BY m.id DESC LIMIT 1) last ON true
 WHERE (c.requester_id=$1 OR c.recipient_id=$1) AND c.status='accepted' AND NOT ${blockSQL('u.id','$1::int')} ORDER BY last.created_at DESC NULLS LAST,u.id`,[req.user.id]);
 res.json({success:true,conversations:result.rows});
}));
router.post('/item/:id/open',wrap(async(req,res)=>{
 const m=(await pool.query('SELECT * FROM messages WHERE id=$1',[req.params.id])).rows[0];
 if(!m||![m.sender_id,m.recipient_id].includes(req.user.id)||m.deleted_at||!await connected(m.sender_id,m.recipient_id)||(await pool.query('SELECT 1 FROM message_hidden WHERE message_id=$1 AND user_id=$2',[m.id,req.user.id])).rowCount)return res.status(404).json({success:false,message:'Attachment unavailable.'});
 if(!m.media_data||m.view_once&&(m.sender_id===req.user.id||m.opened_at))return res.status(410).json({success:false,message:'This attachment is no longer available.'});
 if(m.view_once){const taken=await pool.query('UPDATE messages SET opened_at=NOW(),media_data=NULL,is_read=true WHERE id=$1 AND opened_at IS NULL AND deleted_at IS NULL RETURNING id',[m.id]);if(!taken.rowCount)return res.status(410).json({success:false,message:'Already opened.'});emit(req,m.sender_id,m.recipient_id);}
 res.set('Content-Type',m.media_type);res.set('X-Content-Type-Options','nosniff');res.send(m.media_data);
}));
router.delete('/item/:id',wrap(async(req,res)=>{
 const m=(await pool.query('SELECT sender_id,recipient_id FROM messages WHERE id=$1',[req.params.id])).rows[0];
 if(!m||![m.sender_id,m.recipient_id].includes(req.user.id))return res.status(404).json({success:false,message:'Message not found.'});
 if(req.body.scope==='everyone'){
 if(m.sender_id!==req.user.id)return res.status(403).json({success:false,message:'Only the sender can delete for everyone.'});
 await pool.query("UPDATE messages SET content='',media_data=NULL,media_name=NULL,media_type=NULL,deleted_at=NOW() WHERE id=$1",[req.params.id]);
 }else if(req.body.scope==='me')await pool.query('INSERT INTO message_hidden(message_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.params.id,req.user.id]);
 else return res.status(400).json({success:false,message:'Choose me or everyone.'});
 emit(req,m.sender_id,m.recipient_id);res.json({success:true});
}));
router.get('/:userId',wrap(async(req,res)=>{
 if(!await connected(req.user.id,req.params.userId))return res.status(403).json({success:false,message:'An accepted connection is required.'});
 const before=req.query.before||'2147483647';if(!/^[1-9][0-9]{0,9}$/.test(before))return res.status(400).json({success:false,message:'Invalid history cursor.'});
 const rows=(await pool.query(`SELECT ${fields} FROM messages m WHERE ((sender_id=$1 AND recipient_id=$2) OR(sender_id=$2 AND recipient_id=$1)) AND m.id<$3 AND NOT EXISTS(SELECT 1 FROM message_hidden h WHERE h.message_id=m.id AND h.user_id=$1) ORDER BY m.id DESC LIMIT 51`,[req.user.id,req.params.userId,before])).rows;
 const page=rows.slice(0,50);await pool.query('UPDATE messages SET is_read=true WHERE sender_id=$1 AND recipient_id=$2 AND NOT is_read',[req.params.userId,req.user.id]);
 res.json({success:true,messages:page.reverse(),nextCursor:rows.length>50?page[0].id:null});
}));
router.post('/:userId',wrap(async(req,res)=>{
 if(!await connected(req.user.id,req.params.userId))return res.status(403).json({success:false,message:'An accepted connection is required.'});
 const content=typeof req.body.content==='string'?req.body.content.trim():'';if(content.length>3000||(!content&&!req.body.media))return res.status(400).json({success:false,message:'Write a message or attach media (text maximum 3,000 characters).'});
 let media;try{if(req.body.media)media=decodeMedia(req.body.media);}catch(e){return res.status(400).json({success:false,message:e.message});}
 const m=(await pool.query(`INSERT INTO messages AS m(sender_id,recipient_id,content,media_data,media_type,media_name,view_once) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING ${fields}`,[req.user.id,req.params.userId,content,media?.data,media?.type,media?.name,Boolean(media&&req.body.view_once)])).rows[0];
 require('../utils/notify').notify(req.params.userId,'new_message',`New message from ${req.user.name}`,'/messages');
 emit(req,req.user.id,req.params.userId);res.status(201).json({success:true,message:m});
}));
module.exports=router;
