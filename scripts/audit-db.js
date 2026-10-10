require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const fs = require('node:fs');
const local = ['localhost','127.0.0.1'].includes(process.env.DB_HOST);
const pool = new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD, ssl: local ? false : { rejectUnauthorized: true } });
(async () => {
    const counts = {};
    for (const table of ['users','courses','mentor_profiles','enrollments','course_reviews','posts','connections','messages','learning_sessions','learning_attempts','learning_plans','saved_roadmaps','research_imports','research_publications']) {
        counts[table] = (await pool.query(`SELECT COUNT(*)::int AS n FROM ${table}`)).rows[0].n;
    }
    const constraints = (await pool.query("SELECT tc.table_name,tc.constraint_type,count(*)::int AS count FROM information_schema.table_constraints tc WHERE tc.table_schema='public' GROUP BY tc.table_name,tc.constraint_type ORDER BY tc.table_name,tc.constraint_type")).rows;
    const report = { checkedAt: new Date().toISOString(), environment: local ? 'Local development database, not Render production' : 'Configured remote database', counts, constraints };
    fs.mkdirSync('.preview-logs', { recursive: true });
    fs.writeFileSync('.preview-logs/database-audit.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ environment: report.environment, counts, constraintGroups: constraints.length }, null, 2));
})().catch(e => { console.error(e.code || e.message); process.exitCode = 1; }).finally(() => pool.end());
