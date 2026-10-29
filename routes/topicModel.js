const router=require('express').Router();
const {rateLimit}=require('express-rate-limit');
const {verifyToken}=require('../middleware/auth');
const {safeText}=require('../services/helpMatching');
const {suggest,getEvidence}=require('../services/topicModel');
// Anonymous demo is explicitly enabled only for local development.
router.use((req,res,next)=>process.env.TOPIC_MODEL_DEMO==='true'&&process.env.NODE_ENV!=='production'?next():verifyToken(req,res,next));
router.use(rateLimit({windowMs:60000,limit:30,standardHeaders:'draft-7',legacyHeaders:false}));
router.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});
router.get('/evidence',(req,res)=>res.json({success:true,available:Boolean(getEvidence()),evidence:getEvidence()}));
router.post('/suggest',(req,res)=>{
    try {const text=safeText(req.body?.text,8,6500,'Question');res.json({success:true,...suggest(text)});}
    catch(e){res.status(e.status||400).json({success:false,message:e.status?e.message:'Invalid question.'});}
});
module.exports=router;
