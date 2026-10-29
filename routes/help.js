const express = require('express');
const { rateLimit } = require('express-rate-limit');
const pool = require('../config/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { taxonomy, tagsFor, normalizeTags, rankHelpers, safeText } = require('../services/helpMatching');
const { blockSQL, approvedSQL, blocked, canRead } = require('../services/helpAccess');
const router = express.Router();
const fail = (status,message) => { throw Object.assign(new Error(message),{status}); };
const wrap = fn => async (req,res,next) => { try { await fn(req,res); } catch(e) { if(e.status) return res.status(e.status).json({success:false,message:e.message}); if(e.code==='23505') return res.status(409).json({success:false,message:'This request already exists.'}); next(e); } };
const id = value => { if(!/^[1-9]\d{0,14}$/.test(String(value))) fail(400,'Invalid identifier.'); return String(value); };
const page = req => ({ limit: Math.min(30,Math.max(1,Number.parseInt(req.query.limit)||15)), cursor: req.query.cursor ? id(req.query.cursor) : '9223372036854775807' });
const send = (res,key,rows,limit) => res.json({success:true,[key]:rows.slice(0,limit),nextCursor:rows.length>limit?rows[limit-1].id:null});
async function transaction(fn) { const db=await pool.connect(); try { await db.query('BEGIN'); const result=await fn(db); await db.query('COMMIT'); return result; } catch(e) { await db.query('ROLLBACK'); throw e; } finally { db.release(); } }
async function doubtFor(db,raw,userId,owner=false) {
    const d=(await db.query('SELECT d.*,u.name FROM help_doubts d JOIN users u ON u.id=d.author_id WHERE d.id=$1',[id(raw)])).rows[0];
    if(!d || !(await canRead(db,d,userId))) fail(404,'Question not found.');
    if(owner && d.author_id!==userId) fail(403,'Only the question author can do this.');
    return d;
}
async function requestFor(db,raw,userId,lock=false) {
    const r=(await db.query(`SELECT * FROM help_requests WHERE id=$1 ${lock?'FOR UPDATE':''}`,[id(raw)])).rows[0];
    if(!r || ![r.requester_id,r.helper_id].includes(userId)) fail(404,'Request not found.');
    if(await blocked(db,r.requester_id,r.helper_id)) fail(403,'Contact is unavailable.');
    return r;
}
async function notice(db,userId,message,link) {
    await db.query(`INSERT INTO notifications(user_id,type,message,link) SELECT $1,'smart_help',$2,$3 WHERE NOT EXISTS(SELECT 1 FROM help_preferences WHERE user_id=$1 AND NOT notifications)`,[userId,message,link]);
}
async function candidates(db,d) {
    const rows=(await db.query(`SELECT p.*,u.name,${approvedSQL('p.user_id')} AS approved,
      (SELECT COUNT(*)::int FROM help_requests r WHERE r.helper_id=p.user_id AND r.status='accepted') AS active,
      (SELECT COUNT(*)::int FROM help_feedback f JOIN help_requests r ON r.id=f.request_id WHERE r.helper_id=p.user_id) AS feedback,
      (SELECT COUNT(*)::int FROM help_feedback f JOIN help_requests r ON r.id=f.request_id WHERE r.helper_id=p.user_id AND f.resolved) AS resolved
      FROM help_preferences p JOIN users u ON u.id=p.user_id
      WHERE p.opt_in AND p.availability='available' AND p.user_id<>$1 AND $2=ANY(p.modes)
      AND NOT ${blockSQL('p.user_id','$1::int')}
      AND NOT EXISTS(SELECT 1 FROM help_requests r WHERE r.helper_id=p.user_id AND r.doubt_id=$3 AND (r.status='accepted' OR (r.status='pending' AND r.expires_at>NOW()) OR (r.status='declined' AND r.responded_at>NOW()-INTERVAL '7 days')))
      ORDER BY p.user_id LIMIT 1000`,[d.author_id,d.mode,d.id])).rows;
    return rankHelpers(d,rows);
}
router.use(verifyToken);
router.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});
router.use(rateLimit({windowMs:60000,limit:120,keyGenerator:req=>String(req.user.id),standardHeaders:'draft-7',legacyHeaders:false}));
const mutations=rateLimit({windowMs:60000,limit:25,keyGenerator:req=>String(req.user.id),standardHeaders:'draft-7',legacyHeaders:false});
router.use((req,res,next)=>req.method==='GET'?next():mutations(req,res,next));
router.get('/taxonomy',(req,res)=>res.json({success:true,tags:Object.keys(taxonomy),modes:['async','voice','video']}));
router.post('/discover',wrap(async(req,res)=>{
    const query=safeText(req.body.text,8,6500,'Question');
    const {rank,resources}=require('../services/helpDiscovery');
    const rows=(await pool.query(`SELECT d.id,d.title,LEFT(d.body,500) AS summary,d.tags,d.status,
      (SELECT COUNT(*)::int FROM help_answers a WHERE a.doubt_id=d.id) AS answer_count
      FROM help_doubts d WHERE d.visibility='public' AND NOT d.moderated
      AND NOT ${blockSQL('d.author_id','$1::int')} ORDER BY d.id DESC LIMIT 500`,[req.user.id])).rows;
    res.json({success:true,discussions:rank(query,rows.map(r=>({...r,url:'/help/'+r.id}))),resources:rank(query,resources),notice:'Searches up to 500 recent public questions and a small curated learning library. Private chats are excluded. Results are text matches, not guaranteed solutions.'});
}));
router.post('/tags',wrap(async(req,res)=>res.json({success:true,tags:tagsFor(safeText(req.body.text,0,6500,'Question'))})));
router.get('/doubts',wrap(async(req,res)=>{
    const {limit,cursor}=page(req), topic=req.query.topic||'', q=String(req.query.q||'').slice(0,160), status=req.query.status||'';
    const rows=(await pool.query(`SELECT d.id,d.title,d.tags,d.status,d.created_at,d.author_id,u.name,(SELECT COUNT(*)::int FROM help_answers a WHERE a.doubt_id=d.id) AS answer_count
      FROM help_doubts d JOIN users u ON u.id=d.author_id WHERE d.visibility='public' AND NOT d.moderated AND d.id<$1
      AND ($2='' OR $2=ANY(d.tags)) AND ($3='' OR d.status=$3) AND NOT ${blockSQL('d.author_id','$4::int')}
      AND ($5='' OR to_tsvector('english',d.title||' '||d.body) @@ plainto_tsquery('english',$5)) ORDER BY d.id DESC LIMIT $6`,[cursor,topic,status,req.user.id,q,limit+1])).rows;
    send(res,'doubts',rows,limit);
}));
router.get('/my-doubts',wrap(async(req,res)=>{const {limit,cursor}=page(req);send(res,'doubts',(await pool.query('SELECT id,title,tags,status,visibility,created_at FROM help_doubts WHERE author_id=$1 AND id<$2 ORDER BY id DESC LIMIT $3',[req.user.id,cursor,limit+1])).rows,limit);}));
function questionInput(body) {
    const title=safeText(body.title,8,160,'Title'), text=safeText(body.body,20,6000,'Description'), code=safeText(body.code||'',0,6000,'Code');
    if(!['public','private','connected'].includes(body.visibility)||!['async','voice','video'].includes(body.mode)) fail(400,'Choose a visibility and help mode.');
    // An explicitly supplied tag list overrides inference, including an empty list.
    const manual=Array.isArray(body.tags), tags=manual?normalizeTags(body.tags):tagsFor(title+' '+text);
    return {title,text,code,tags:tags.length?tags:['other'],provenance:Object.fromEntries((tags.length?tags:['other']).map(t=>[t,manual?'user':'rules']))};
}
router.post('/doubts',wrap(async(req,res)=>{
    const x=questionInput(req.body);
    const d=await transaction(async db=>{
        await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
        const count=(await db.query("SELECT COUNT(*)::int AS n FROM help_doubts WHERE author_id=$1 AND created_at>NOW()-INTERVAL '1 day'",[req.user.id])).rows[0].n;
        if(count>=10) fail(429,'You can post up to ten questions per day.');
        return (await db.query('INSERT INTO help_doubts(author_id,title,body,code,tags,tag_provenance,visibility,mode,matching_consent,analytics_consent) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',[req.user.id,x.title,x.text,x.code,x.tags,JSON.stringify(x.provenance),req.body.visibility,req.body.mode,req.body.matching_consent===true,req.body.analytics_consent===true])).rows[0];
    });res.status(201).json({success:true,doubt:d});
}));
router.get('/doubts/:id',wrap(async(req,res)=>res.json({success:true,doubt:await doubtFor(pool,req.params.id,req.user.id)})));
router.patch('/doubts/:id',wrap(async(req,res)=>{
    await doubtFor(pool,req.params.id,req.user.id,true); const x=questionInput(req.body);
    await transaction(async db=>{
        await db.query('UPDATE help_doubts SET title=$1,body=$2,code=$3,tags=$4,tag_provenance=$5,visibility=$6,mode=$7,matching_consent=$8,analytics_consent=$9,updated_at=NOW() WHERE id=$10',[x.title,x.text,x.code,x.tags,JSON.stringify(x.provenance),req.body.visibility,req.body.mode,req.body.matching_consent===true,req.body.analytics_consent===true,req.params.id]);
        if(req.body.analytics_consent!==true) await db.query('DELETE FROM help_match_events WHERE doubt_id=$1',[req.params.id]);
    });res.json({success:true});
}));
router.delete('/doubts/:id',wrap(async(req,res)=>{await doubtFor(pool,req.params.id,req.user.id,true);await pool.query('DELETE FROM help_doubts WHERE id=$1',[req.params.id]);res.json({success:true});}));
router.post('/doubts/:id/resolve',wrap(async(req,res)=>{
    await doubtFor(pool,req.params.id,req.user.id,true);
    const status=req.body.status||'resolved'; if(!['resolved','closed','open'].includes(status)) fail(400,'Invalid question status.');
    await transaction(async db=>{
        await db.query('SELECT id FROM help_doubts WHERE id=$1 FOR UPDATE',[req.params.id]);
        if(status==='resolved' && req.body.answerId) {
            const result=await db.query('UPDATE help_answers SET accepted=true WHERE id=$1 AND doubt_id=$2 AND author_id<>$3 RETURNING id',[id(req.body.answerId),req.params.id,req.user.id]);
            if(!result.rowCount) fail(400,'Select an answer from another helper.');
        }
        if(status==='open') await db.query('UPDATE help_answers SET accepted=false WHERE doubt_id=$1',[req.params.id]);
        await db.query("UPDATE help_doubts SET status=$1,resolved_at=CASE WHEN $1='resolved' THEN NOW() ELSE NULL END,updated_at=NOW() WHERE id=$2",[status,req.params.id]);
        if(status!=='open') await db.query("UPDATE help_requests SET status=CASE WHEN status='accepted' AND $2='resolved' THEN 'completed' ELSE 'cancelled' END,completed_at=NOW() WHERE doubt_id=$1 AND status IN ('pending','accepted')",[req.params.id,status]);
    });res.json({success:true});
}));
router.get('/doubts/:id/answers',wrap(async(req,res)=>{
    await doubtFor(pool,req.params.id,req.user.id);const {limit,cursor}=page(req);
    send(res,'answers',(await pool.query(`SELECT a.id,a.author_id,u.name,a.body,a.accepted,a.created_at FROM help_answers a JOIN users u ON u.id=a.author_id WHERE a.doubt_id=$1 AND a.id<$2 AND NOT ${blockSQL('a.author_id','$3::int')} ORDER BY a.id DESC LIMIT $4`,[req.params.id,cursor,req.user.id,limit+1])).rows,limit);
}));
router.post('/doubts/:id/answers',wrap(async(req,res)=>{
    const d=await doubtFor(pool,req.params.id,req.user.id); if(d.moderated||['resolved','closed'].includes(d.status)) fail(409,'This question is closed to new answers.');
    if(d.visibility!=='public' && d.author_id!==req.user.id && !(await pool.query("SELECT 1 FROM help_requests WHERE doubt_id=$1 AND helper_id=$2 AND status='accepted'",[d.id,req.user.id])).rowCount) fail(403,'Accept the help request before answering a private question.');
    await pool.query('INSERT INTO help_answers(doubt_id,author_id,body) VALUES($1,$2,$3)',[d.id,req.user.id,safeText(req.body.body,1,6000,'Answer')]);res.status(201).json({success:true});
}));
router.get('/doubts/:id/suggestions',wrap(async(req,res)=>{
    const d=await doubtFor(pool,req.params.id,req.user.id);
    const rows=(await pool.query(`SELECT d.id,d.title,d.tags FROM help_doubts d WHERE d.visibility='public' AND d.status='resolved' AND NOT d.moderated AND d.id<>$1 AND d.tags && $2::text[] AND NOT ${blockSQL('d.author_id','$3::int')} AND EXISTS(SELECT 1 FROM help_answers a WHERE a.doubt_id=d.id AND a.accepted AND a.author_id<>d.author_id) ORDER BY cardinality(ARRAY(SELECT unnest(d.tags) INTERSECT SELECT unnest($2::text[]))) DESC,d.id DESC LIMIT 5`,[d.id,d.tags,req.user.id])).rows;
    res.json({success:true,suggestions:rows.map(r=>({...r,url:`/help/${r.id}`})),notice:'Public questions with an answer accepted by their author; not independently fact-checked.'});
}));
router.get('/doubts/:id/matches',wrap(async(req,res)=>{
    const d=await doubtFor(pool,req.params.id,req.user.id,true);
    if(!d.matching_consent) fail(403,'Enable helper suggestions for this question first.');
    if(d.moderated||!['open','in_progress'].includes(d.status)) fail(409,'Reopen this question to request help.');
    const rows=(await candidates(pool,d)).slice(0,10);
    if(d.analytics_consent) {await pool.query("DELETE FROM help_match_events WHERE created_at<NOW()-INTERVAL '30 days'");await pool.query('INSERT INTO help_match_events(doubt_id,algorithm,candidates) VALUES($1,$2,$3)',[d.id,'skills-v1',JSON.stringify(rows.map(r=>({id:r.user_id,overlap:r.matched.length,headroom:r.max_cases-r.active}))) ]);}
    res.json({success:true,matches:rows.map(r=>({id:r.user_id,name:r.name,role:r.approved?'Approved mentor':'Peer helper',matched:r.matched,availability:'Accepting requests',reason:`${r.matched.join(', ')} match · accepts ${{async:'written help',voice:'voice calls',video:'video calls'}[d.mode]} · capacity available`})),notice:'Explainable skill rules, not a trained ML score. Availability is declared, not live presence. Search currently considers up to 1,000 opted-in helpers.'});
}));
router.get('/helpers/me/preferences',wrap(async(req,res)=>{
    const preferences=(await pool.query('SELECT * FROM help_preferences WHERE user_id=$1',[req.user.id])).rows[0]||{opt_in:false,skills:[],modes:['async'],max_cases:2,availability:'available',timezone:'UTC',notifications:true};
    const approved=(await pool.query(`SELECT ${approvedSQL('$1::int')} AS approved`,[req.user.id])).rows[0].approved;
    const metrics=(await pool.query(`SELECT (SELECT COUNT(*)::int FROM help_requests WHERE helper_id=$1 AND status='accepted') AS active_cases,COUNT(f.request_id)::int AS feedback_count,COUNT(*) FILTER(WHERE f.resolved)::int AS confirmed_resolutions,COUNT(DISTINCT r.requester_id) FILTER(WHERE f.resolved)::int AS learners_helped,AVG(EXTRACT(EPOCH FROM r.responded_at-r.created_at)/3600) FILTER(WHERE r.responded_at IS NOT NULL) AS response_hours FROM help_requests r LEFT JOIN help_feedback f ON f.request_id=r.id WHERE r.helper_id=$1 AND r.created_at>NOW()-INTERVAL '30 days'`,[req.user.id])).rows[0];
    res.json({success:true,preferences,role:approved?'Approved mentor':'Peer helper',metrics,period:'All active cases; outcomes for requests created in the last 30 days. Resolution counts require learner feedback.'});
}));
router.put('/helpers/me/preferences',wrap(async(req,res)=>{
    const b=req.body,skills=normalizeTags(b.skills),modes=b.modes;
    if(typeof b.opt_in!=='boolean'||typeof b.notifications!=='boolean'||!Array.isArray(modes)||!modes.length||modes.length>3||modes.some(m=>!['async','voice','video'].includes(m))||!Number.isInteger(b.max_cases)||b.max_cases<1||b.max_cases>10||!['available','paused'].includes(b.availability)) fail(400,'Invalid helper preferences.');
    if(typeof b.timezone!=='string'||b.timezone.length>80)fail(400,'Choose an IANA timezone.');
    try {new Intl.DateTimeFormat('en',{timeZone:b.timezone}).format();} catch {fail(400,'Choose an IANA timezone.');}
    if(b.opt_in&&!skills.length) fail(400,'Choose at least one skill.');
    await pool.query('INSERT INTO help_preferences(user_id,opt_in,skills,modes,max_cases,availability,timezone,notifications) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id) DO UPDATE SET opt_in=$2,skills=$3,modes=$4,max_cases=$5,availability=$6,timezone=$7,notifications=$8,updated_at=NOW()',[req.user.id,b.opt_in,skills,modes,b.max_cases,b.availability,b.timezone,b.notifications]);res.json({success:true});
}));
router.get('/requests',wrap(async(req,res)=>{
    const {limit,cursor}=page(req);send(res,'requests',(await pool.query(`SELECT r.*,f.resolved AS feedback_resolved,d.title,u.name AS helper_name,v.name AS requester_name FROM help_requests r LEFT JOIN help_feedback f ON f.request_id=r.id JOIN help_doubts d ON d.id=r.doubt_id JOIN users u ON u.id=r.helper_id JOIN users v ON v.id=r.requester_id WHERE (r.requester_id=$1 OR r.helper_id=$1) AND r.id<$2 AND NOT ${blockSQL('r.requester_id','r.helper_id')} AND ($4::bigint IS NULL OR r.doubt_id=$4) ORDER BY r.id DESC LIMIT $3`,[req.user.id,cursor,limit+1,req.query.doubt_id?id(req.query.doubt_id):null])).rows.map(r=>({...r,status:r.status==='pending'&&new Date(r.expires_at)<new Date()?'expired':r.status})),limit);
}));
router.post('/requests',wrap(async(req,res)=>{
    const helper=id(req.body.helper_id), doubt=id(req.body.doubt_id);
    const result=await transaction(async db=>{
        await db.query('SELECT id FROM help_doubts WHERE id=$1 FOR UPDATE',[doubt]);const d=await doubtFor(db,doubt,req.user.id,true);
        if(!d.matching_consent||d.moderated||!['open','in_progress'].includes(d.status)) fail(409,'This question is not accepting help requests.');
        await db.query("UPDATE help_requests SET status='expired' WHERE doubt_id=$1 AND status='pending' AND expires_at<=NOW()",[doubt]);
        if((await db.query('SELECT COUNT(*)::int AS n FROM help_requests WHERE doubt_id=$1',[doubt])).rows[0].n>=5) fail(429,'This question has reached its five-helper request limit.');
        if(!(await candidates(db,d)).some(r=>String(r.user_id)===helper)) fail(409,'This helper is unavailable or does not match this question.');
        const r=(await db.query('INSERT INTO help_requests(doubt_id,requester_id,helper_id,mode) VALUES($1,$2,$3,$4) RETURNING *',[doubt,req.user.id,helper,d.mode])).rows[0];
        await notice(db,helper,'You have a new Smart Help request.','/help/manage');return r;
    });res.status(201).json({success:true,request:result});
}));
for(const action of ['accept','decline','cancel','complete']) router.post(`/requests/:id/${action}`,wrap(async(req,res)=>{
    await transaction(async db=>{
        // Lock preferences before the request so concurrent accepts serialize per helper.
        const initial=await requestFor(db,req.params.id,req.user.id);
        const pref=(await db.query('SELECT * FROM help_preferences WHERE user_id=$1 FOR UPDATE',[initial.helper_id])).rows[0];
        const r=await requestFor(db,req.params.id,req.user.id,true);
        if(['accept','decline'].includes(action)&&r.helper_id!==req.user.id) fail(403,'Only the invited helper may respond.');
        if(action==='complete'&&r.requester_id!==req.user.id) fail(403,'Only the learner may confirm completion.');
        if(['accept','decline'].includes(action)&&(r.status!=='pending'||new Date(r.expires_at)<=new Date())) fail(409,'This request is no longer pending.');
        if(action==='cancel'&&!['pending','accepted'].includes(r.status)||action==='complete'&&r.status!=='accepted') fail(409,'Invalid request transition.');
        if(action==='accept') {
            const d=await doubtFor(db,r.doubt_id,req.user.id);
            const active=(await db.query("SELECT COUNT(*)::int AS n FROM help_requests WHERE helper_id=$1 AND status='accepted'",[r.helper_id])).rows[0].n;
            if(!pref?.opt_in||pref.availability!=='available'||!pref.modes.includes(r.mode)||active>=pref.max_cases||d.moderated||!['open','in_progress'].includes(d.status)) fail(409,'Capacity or availability has changed.');
            await db.query("UPDATE help_doubts SET status='in_progress',updated_at=NOW() WHERE id=$1 AND status='open'",[r.doubt_id]);
        }
        const status={accept:'accepted',decline:'declined',cancel:'cancelled',complete:'completed'}[action];
        await db.query("UPDATE help_requests SET status=$1,responded_at=COALESCE(responded_at,NOW()),completed_at=CASE WHEN $1='completed' THEN NOW() ELSE completed_at END WHERE id=$2",[status,r.id]);
        await notice(db,r.requester_id===req.user.id?r.helper_id:r.requester_id,`Your Smart Help request is ${status}.`,`/help/${r.doubt_id}`);
    });res.json({success:true});
}));
router.post('/requests/:id/feedback',wrap(async(req,res)=>{
    const r=await requestFor(pool,req.params.id,req.user.id);
    if(r.requester_id!==req.user.id||r.status!=='completed') fail(403,'Feedback requires your completed request.');
    if(typeof req.body.resolved!=='boolean'||req.body.rating!=null&&(!Number.isInteger(req.body.rating)||req.body.rating<1||req.body.rating>5)) fail(400,'Invalid feedback.');
    await pool.query('INSERT INTO help_feedback(request_id,resolved,rating) VALUES($1,$2,$3)',[r.id,req.body.resolved,req.body.rating||null]);res.status(201).json({success:true});
}));
router.get('/blocks',wrap(async(req,res)=>res.json({success:true,blocks:(await pool.query('SELECT b.blocked_id,u.name FROM user_blocks b JOIN users u ON u.id=b.blocked_id WHERE b.blocker_id=$1',[req.user.id])).rows})));
router.post('/blocks/:id',wrap(async(req,res)=>{
    const other=id(req.params.id);if(other===String(req.user.id)) fail(400,'You cannot block yourself.');
    await transaction(async db=>{await db.query('INSERT INTO user_blocks(blocker_id,blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.user.id,other]);await db.query("UPDATE help_requests SET status='cancelled' WHERE ((requester_id=$1 AND helper_id=$2) OR (requester_id=$2 AND helper_id=$1)) AND status IN ('pending','accepted')",[req.user.id,other]);});res.json({success:true});
}));
router.delete('/blocks/:id',wrap(async(req,res)=>{await pool.query('DELETE FROM user_blocks WHERE blocker_id=$1 AND blocked_id=$2',[req.user.id,id(req.params.id)]);res.json({success:true});}));
router.post('/doubts/:id/report',wrap(async(req,res)=>{await doubtFor(pool,req.params.id,req.user.id);await pool.query('INSERT INTO help_reports(reporter_id,doubt_id,reason) VALUES($1,$2,$3)',[req.user.id,req.params.id,safeText(req.body.reason,10,1000,'Report')]);res.status(201).json({success:true});}));
router.get('/reports',requireAdmin,wrap(async(req,res)=>res.json({success:true,reports:(await pool.query("SELECT * FROM help_reports WHERE status='pending' ORDER BY id LIMIT 100")).rows})));
router.post('/reports/:id/review',requireAdmin,wrap(async(req,res)=>{if(!['hidden','dismissed'].includes(req.body.status)) fail(400,'Invalid review.');await transaction(async db=>{const r=(await db.query('UPDATE help_reports SET status=$1 WHERE id=$2 RETURNING doubt_id',[req.body.status,id(req.params.id)])).rows[0];if(!r) fail(404,'Report not found.');if(req.body.status==='hidden'){await db.query('UPDATE help_doubts SET moderated=true WHERE id=$1',[r.doubt_id]);await db.query("UPDATE help_requests SET status='cancelled' WHERE doubt_id=$1 AND status IN ('pending','accepted')",[r.doubt_id]);}});res.json({success:true});}));
router.get('/requests/:id/sessions',wrap(async(req,res)=>{const r=await requestFor(pool,req.params.id,req.user.id);res.json({success:true,sessions:(await pool.query('SELECT id,mode,starts_at,expires_at FROM meeting_rooms WHERE help_request_id=$1',[r.id])).rows});}));
router.post('/requests/:id/sessions',wrap(async(req,res)=>{
    const room=await transaction(async db=>{
        const r=await requestFor(db,req.params.id,req.user.id,true);
        if(r.status!=='accepted'||!['voice','video'].includes(r.mode)) fail(409,'An accepted call request is required.');
        const existing=(await db.query('SELECT * FROM meeting_rooms WHERE help_request_id=$1',[r.id])).rows[0];
        if(existing) return existing;
        const start=req.body.starts_at?new Date(req.body.starts_at):new Date();
        if(!Number.isFinite(start.getTime())||start.getTime()<Date.now()-60000||start.getTime()>Date.now()+7*86400000) fail(400,'Schedule within the next seven days.');
        const room=await require('../services/meetings').create(db,req.user.id,{request:r,mode:r.mode,startsAt:start});
        await notice(db,req.user.id===r.helper_id?r.requester_id:r.helper_id,'Your Smart Help call is ready. Check the scheduled time.',`/help/${r.doubt_id}`);
        return room;
    });res.status(201).json({success:true,room});
}));
module.exports=router;
