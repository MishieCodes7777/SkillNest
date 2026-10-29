const jwt=require('jsonwebtoken');
const {isBlacklisted}=require('../middleware/tokenBlacklist');
const {authorize}=require('./meetings');
function attach(io,pool) {
    // Serialize joins within each room in this single-process deployment.
    const joins=new Map();
    async function withRoom(roomId,fn){const previous=joins.get(roomId)||Promise.resolve();let release;const gate=new Promise(r=>release=r);const tail=previous.then(()=>gate);joins.set(roomId,tail);await previous;try{return await fn();}finally{release();if(joins.get(roomId)===tail)joins.delete(roomId);}}
    io.use((socket,next)=>{try{const token=socket.handshake.auth?.token;if(!token||isBlacklisted(token))throw new Error();socket.user=jwt.verify(token,process.env.JWT_SECRET);socket.sessionToken=token;next();}catch{next(new Error('Authentication required'));}});
    io.on('connection',socket=>{
        socket.join(`account:${socket.user.id}`);
        let joined=null,joining=false,count=0,windowStart=Date.now();
        const allowed=()=>{if(Date.now()-windowStart>10000){count=0;windowStart=Date.now();}return ++count<=100;};
        const valid=async()=>{
            if(!joined||isBlacklisted(socket.sessionToken)||socket.user.exp*1000<=Date.now())return false;
            return Boolean(await authorize(pool,joined,socket.user.id));
        };
        const safe=fn=>async data=>{try{if(!allowed())return socket.emit('meeting-error',{message:'Too many meeting events.'});await fn(data);}catch{socket.emit('meeting-error',{message:'Meeting request failed.'});}};
        socket.on('userconnect',safe(async data=>{
            if(isBlacklisted(socket.sessionToken)||!Number.isFinite(socket.user.exp)||socket.user.exp*1000<=Date.now())return socket.emit('meeting-error',{message:'Please sign in again.'});
            if(joined||joining)return;joining=true;
            try{
                const room=await authorize(pool,data?.meetingid,socket.user.id);
                if(!room)return socket.emit('meeting-error',{message:'An invitation to an active room is required.'});
                await withRoom(room.id,async()=>{
                    const peers=await io.in(room.id).fetchSockets();
                    if(peers.some(p=>p.data.userId===socket.user.id)||peers.length>=2)return socket.emit('meeting-error',{message:'This 1:1 room is full or you are already connected.'});
                    joined=room.id;socket.data.room=joined;socket.data.userId=socket.user.id;
                    await socket.join(joined);
                    socket.emit('all-users',peers.map(p=>({connectionId:p.id,user_id:p.data.userId})));
                    socket.to(joined).emit('user-joined',{connId:socket.id,user_id:socket.user.id});
                });
            }finally{joining=false;}
        }));
        socket.on('signal',safe(async data=>{
            if(!await valid()||!data||typeof data.to!=='string'||!data.signal||typeof data.signal!=='object'||JSON.stringify(data.signal).length>64000)return;
            const target=io.sockets.sockets.get(data.to);
            if(!target||target.data.room!==joined||target.id===socket.id||isBlacklisted(target.sessionToken)||target.user.exp*1000<=Date.now()||!await authorize(pool,joined,target.data.userId))return;
            target.emit('signal',{from:socket.id,signal:data.signal});
        }));
        socket.on('chat-message',safe(async data=>{if(!await valid()||typeof data?.text!=='string'||!data.text.trim()||data.text.length>3000)return;socket.to(joined).emit('chat-message',{name:socket.user.name||'Participant',text:data.text.trim(),time:new Date().toLocaleTimeString(),from:socket.id});}));
        for(const [event,key] of [['mic-toggle','muted'],['cam-toggle','camOn'],['screen-share-toggle','sharing']])socket.on(event,safe(async data=>{if(await valid()&&typeof data?.[key]==='boolean')socket.to(joined).emit(event,{from:socket.id,[key]:data[key]});}));
        socket.on('hand-raised',safe(async()=>{if(await valid())socket.to(joined).emit('hand-raised',{from:socket.id,name:socket.user.name||'Participant'});}));
        const expiry=setInterval(async()=>{try{if(isBlacklisted(socket.sessionToken)||socket.user.exp*1000<=Date.now()||(joined&&!await valid())){socket.emit('meeting-error',{message:'Session access ended.'});socket.disconnect(true);}}catch{socket.disconnect(true);}},15000);expiry.unref();
        socket.on('disconnect',()=>{clearInterval(expiry);if(joined)socket.to(joined).emit('user-left',{connId:socket.id});});
    });
}
module.exports={attach};
