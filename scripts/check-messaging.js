require('dotenv').config({quiet:true});
const assert=require('node:assert/strict'),{randomUUID}=require('crypto'),jwt=require('jsonwebtoken'),{Pool}=require('pg');
if(!['localhost','127.0.0.1'].includes(process.env.DB_HOST))throw Error('Local DB only');
const db=new Pool({host:process.env.DB_HOST,port:process.env.DB_PORT,database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD}),users=[],base='http://localhost:3003';
async function raw(path,u,method='GET',body){return fetch(base+path,{method,headers:{Authorization:'Bearer '+u.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
async function call(path,u,method='GET',body){const r=await raw(path,u,method,body);return {status:r.status,...await r.json()};}
(async()=>{try{
for(let i=0;i<3;i++){const u=(await db.query("INSERT INTO users(name,email,password,role,roles) VALUES($1,$2,'unusable','learner','[\"learner\"]') RETURNING id",['Messaging fixture '+i,randomUUID()+'@example.invalid'])).rows[0];u.token=jwt.sign({id:u.id,name:'Messaging fixture',role:'learner'},process.env.JWT_SECRET,{expiresIn:'10m'});users.push(u);}const[a,b,c]=users;
assert.ok((await call('/api/connections/suggestions',a)).users.some(u=>u.id===b.id));
const request=(await call('/api/connections/request',a,'POST',{toUserId:b.id})).connection;
assert.equal((await call(`/api/connections/${request.id}/accept`,c,'POST',{})).status,404);
assert.equal((await call(`/api/connections/${request.id}/accept`,b,'POST',{})).status,200);
await db.query("INSERT INTO messages(sender_id,recipient_id,content) SELECT $1,$2,'History '||n FROM generate_series(1,230) n",[a.id,b.id]);
let d=await call('/api/messages/'+a.id,b);assert.equal(d.messages.length,50);assert.equal(d.messages.at(-1).content,'History 230');let count=d.messages.length;
while(d.nextCursor){d=await call('/api/messages/'+a.id+'?before='+d.nextCursor,b);count+=d.messages.length;}assert.equal(count,230);
assert.equal((await call('/api/messages/'+a.id,b)).messages.at(-1).content,'History 230');
const media={type:'image/png',name:'test.png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz1kAAAAASUVORK5CYII='};
const normal=(await call('/api/messages/'+b.id,a,'POST',{content:'Photo',media})).message;assert.ok(normal.id);
assert.equal((await raw('/api/messages/item/'+normal.id+'/open',c,'POST')).status,404);
assert.equal((await raw('/api/messages/item/'+normal.id+'/open',b,'POST')).status,200);
assert.equal((await call('/api/messages/item/'+normal.id,b,'DELETE',{scope:'everyone'})).status,403);
assert.equal((await call('/api/messages/item/'+normal.id,b,'DELETE',{scope:'me'})).status,200);
assert.ok(!(await call('/api/messages/'+a.id,b)).messages.some(m=>m.id===normal.id));
assert.ok((await call('/api/messages/'+b.id,a)).messages.some(m=>m.id===normal.id));
await call('/api/messages/item/'+normal.id,a,'DELETE',{scope:'everyone'});
assert.equal((await raw('/api/messages/item/'+normal.id+'/open',a,'POST')).status,404);
const once=(await call('/api/messages/'+b.id,a,'POST',{content:'',media,view_once:true})).message;
const opens=await Promise.all([raw('/api/messages/item/'+once.id+'/open',b,'POST'),raw('/api/messages/item/'+once.id+'/open',b,'POST')]);assert.deepEqual(opens.map(r=>r.status).sort(),[200,410]);
assert.equal((await db.query('SELECT media_data FROM messages WHERE id=$1',[once.id])).rows[0].media_data,null);
assert.equal((await call('/api/messages/'+b.id,a,'POST',{media:{...media,type:'image/svg+xml'}})).status,400);
await db.query('INSERT INTO user_blocks(blocker_id,blocked_id) VALUES($1,$2)',[a.id,b.id]);
assert.equal((await call('/api/messages/'+a.id,b)).status,403);
console.log('PASS: suggestions, recipient-only acceptance, 230-message pagination and reload, authenticated photo access, delete-for-me isolation, sender-only delete-for-everyone, atomic view-once consumption, media validation and blocks.');
}finally{for(const u of users){await db.query('DELETE FROM connections WHERE requester_id=$1 OR recipient_id=$1',[u.id]);await db.query('DELETE FROM users WHERE id=$1',[u.id]);}await db.end();}})().catch(e=>{console.error(e);process.exitCode=1;});
