const router=require('express').Router();
const pool=require('../config/database');
const {verifyToken}=require('../middleware/auth');
const {create,authorize}=require('../services/meetings');
router.use(verifyToken);
router.post('/',async(req,res,next)=>{
    const mode=req.body.mode||'video';if(!['voice','video'].includes(mode))return res.status(400).json({success:false,message:'Choose voice or video.'});
    const db=await pool.connect();try{await db.query('BEGIN');await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
        if((await db.query('SELECT COUNT(*)::int AS n FROM meeting_rooms WHERE owner_id=$1 AND expires_at>NOW()',[req.user.id])).rows[0].n>=5){await db.query('ROLLBACK');return res.status(429).json({success:false,message:'You already have five active rooms.'});}
        const room=await create(db,req.user.id,{mode});await db.query('COMMIT');res.status(201).json({success:true,room});
    }catch(e){await db.query('ROLLBACK');next(e);}finally{db.release();}
});
router.get('/:id',async(req,res,next)=>{try{const room=await authorize(pool,req.params.id,req.user.id);if(!room)return res.status(403).json({success:false,message:'This room requires an invitation and must be within its scheduled time.'});res.json({success:true,room:{id:room.id,mode:room.mode,expires_at:room.expires_at,owner_id:room.owner_id,help_request_id:room.help_request_id}});}catch(e){next(e);}});
module.exports=router;
