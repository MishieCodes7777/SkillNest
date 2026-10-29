require('dotenv').config({quiet:true});
const {Pool}=require('pg'),{randomUUID}=require('node:crypto'),assert=require('node:assert/strict');
if(!['localhost','127.0.0.1'].includes(process.env.DB_HOST))throw Error('Local DB only');
const pool=new Pool({host:process.env.DB_HOST,port:process.env.DB_PORT,database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD});
(async()=>{const db=await pool.connect();try{
    await db.query('BEGIN');const schema='help_test_'+randomUUID().replaceAll('-','');await db.query(`CREATE SCHEMA ${schema}`);await db.query(`SET LOCAL search_path TO ${schema}`);
    await db.query('CREATE TABLE users(id SERIAL PRIMARY KEY)');await db.query('INSERT INTO users DEFAULT VALUES');
    await require('../config/learningSchema')(db);await require('../config/helpSchema')(db);
    await db.query("INSERT INTO learning_plans(user_id,track,hours) VALUES(1,'web',5)");
    // Simulate an upgraded installation retaining legacy prediction structures.
    await db.query('CREATE TABLE learning_forecasts (id INT PRIMARY KEY); INSERT INTO learning_forecasts VALUES(1); ALTER TABLE learning_plans ADD COLUMN ml_pilot BOOLEAN DEFAULT FALSE');
    await require('../config/learningSchema')(db);await require('../config/helpSchema')(db);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM learning_forecasts')).rows[0].n,1);
    assert.equal((await db.query('SELECT hours FROM learning_plans')).rows[0].hours,5);
    const indexes=(await db.query("SELECT indexname FROM pg_indexes WHERE schemaname=$1",[schema])).rows;
    assert.ok(indexes.some(x=>x.indexname==='help_doubts_search'));assert.ok(indexes.some(x=>x.indexname==='help_request_active'));
    console.log('PASS: fresh schema, repeat migration, populated legacy structures preserved, discovery indexes created. Test schema rolled back.');
}finally{await db.query('ROLLBACK');db.release();await pool.end();}})().catch(e=>{console.error(e);process.exitCode=1;});
