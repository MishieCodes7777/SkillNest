// Read-only local checks; no private data, test accounts or external providers.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {classify}=require('../services/topicModel');
async function main(){
    const fixtures=JSON.parse(fs.readFileSync('ml/artifacts/topic-demo/parity.json','utf8'));
    for(const f of fixtures){const result=classify(f.text);assert.ok(Math.abs(result.margin-f.margin)<1e-10);assert.equal(result.knownFeatures,f.known);}
    const base='http://localhost:'+(process.env.TEST_PORT||3003);
    const evidence=await fetch(base+'/api/topic-model/evidence');assert.equal(evidence.status,200);
    const report=(await evidence.json()).evidence;assert.equal(report.counts.test,55);assert.equal(report.production_ready,false);
    async function post(text){return fetch(base+'/api/topic-model/suggest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});}
    const good=await post('How can I group rows and count records in each category?');assert.equal(good.status,200);assert.equal((await good.json()).suggested,'sql');
    const unknown=await post('zxqv yyyzz abcdefgh');assert.equal((await unknown.json()).suggested,null);
    const unrelated=await post('How should I plan a weekend trip?');assert.equal((await unrelated.json()).suggested,null);
    assert.equal((await post('tiny')).status,400);
    assert.equal((await post('x'.repeat(6501))).status,400);
    const secret=await post('api_key = '+'gsk_'+'x'.repeat(30));assert.equal(secret.status,400);assert.ok(!(await secret.text()).includes('x'.repeat(30)));
    const page=await fetch(base+'/preview/ml');assert.equal(page.status,200);assert.ok((await page.text()).includes('id="root"'));
    console.log('PASS: Python/JS feature and score parity; evidence, SQL suggestion, unknown abstention, input limits, secret rejection and demo route.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
