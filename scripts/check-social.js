require('dotenv').config({quiet:true});
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),jwt=require('jsonwebtoken'),{Pool}=require('pg'),{io}=require('socket.io-client');
if(!['localhost','127.0.0.1'].includes(process.env.DB_HOST))throw Error('Local DB required');
const pool=new Pool({host:process.env.DB_HOST,port:process.env.DB_PORT,database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD});
const base='http://localhost:3003',users=[];let socket;
async function call(path,u,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${u.token}`},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
function event(name){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Missing '+name)),4000);socket.once(name,d=>{clearTimeout(timer);resolve(d);});});}
(async()=>{try{
 for(let i=0;i<3;i++){const u=(await pool.query('INSERT INTO users(name,email,password,role,roles) VALUES($1,$2,$3,$4,$5) RETURNING id',[`Social fixture ${i}`,`${randomUUID()}@example.invalid`,'unusable','learner','["learner"]'])).rows[0];u.token=jwt.sign({id:u.id,name:'Social fixture',email:'fixture@example.invalid',role:'learner'},process.env.JWT_SECRET,{expiresIn:'10m'});users.push(u);}
 const [a,b,c]=users;
 const profile={headline:'Building a learning project',about:'Test introduction',linkedin_url:'https://linkedin.com/in/skillnest-fixture/?tracking=test'};
 assert.equal((await call('/api/auth/professional-profile',a,'PUT',profile)).status,200);
 const publicProfile=await call(`/api/auth/users/${a.id}`,b);assert.equal(publicProfile.user.linkedin_url,'https://www.linkedin.com/in/skillnest-fixture');assert.equal(publicProfile.user.headline,profile.headline);assert.ok(!('email' in publicProfile.user));
 assert.equal((await call('/api/auth/professional-profile',b)).profile.linkedin_url,'');
 assert.equal((await call('/api/auth/professional-profile',a,'PUT',{...profile,linkedin_url:'https://linkedin.com.evil.test/in/a'})).status,400);
 await pool.query("INSERT INTO connections(requester_id,recipient_id,status) VALUES($1,$2,'accepted')",[a.id,b.id]);
 socket=io(base,{auth:{token:b.token},transports:['websocket'],forceNew:true});await event('connect');
 const updated=event('messages-updated');assert.equal((await call(`/api/messages/${b.id}`,a,'POST',{content:'Hello from the local integration test'})).status,201);await updated;
 assert.equal((await call(`/api/messages/${a.id}`,b)).messages.length,1);
 assert.equal((await call(`/api/messages/${b.id}`,c,'POST',{content:'Not connected'})).status,403);
 const room=(await call('/api/meetings',a,'POST',{mode:'voice'})).room;assert.equal(room.mode,'voice');
 assert.equal((await call('/api/notifications/session-invite',a,'POST',{toUserId:b.id,meetingCode:room.id})).status,200);
 assert.equal((await call(`/api/meetings/${room.id}`,b)).room.mode,'voice');assert.equal((await call(`/api/meetings/${room.id}`,c)).status,403);
 assert.equal((await call('/api/meetings',a,'POST',{mode:'invalid'})).status,400);
 assert.equal((await call('/api/auth/professional-profile',a,'PUT',{...profile,linkedin_url:''})).profile.linkedin_url,'');
 console.log('PASS: public professional profile, safe LinkedIn URL/removal, account isolation, live message invalidation, connection permissions, audio room and invitation access.');
}finally{socket?.disconnect();for(const u of users){await pool.query('DELETE FROM connections WHERE requester_id=$1 OR recipient_id=$1',[u.id]);await pool.query('DELETE FROM users WHERE id=$1',[u.id]);}await pool.end();}})().catch(e=>{console.error(e);process.exitCode=1;});
