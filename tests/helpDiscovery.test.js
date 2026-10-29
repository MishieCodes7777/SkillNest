const {test}=require('node:test');
const assert=require('node:assert/strict');
const {rank,resources}=require('../services/helpDiscovery');
test('React backend question retrieves actual teaching resources including video',()=>{
 const result=rank('I am unable to connect my react with backend',resources);
 assert.ok(result.some(r=>r.id==='fetch'));assert.ok(result.some(r=>r.kind==='Video course'));
 assert.ok(result.every(r=>r.url.startsWith('https://')));
});
test('unmatched input does not invent a result; matching preserves discussion URLs',()=>{
 assert.deepEqual(rank('zxxyyzz',resources),[]);
 const results=rank('react backend',[{id:2,title:'React backend connection',url:'/help/2'},{id:3,title:'Python lists',url:'/help/3'}]);
 assert.deepEqual(results.map(r=>r.url),['/help/2']);
});
