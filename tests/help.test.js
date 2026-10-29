const {test}=require('node:test');
const assert=require('node:assert/strict');
const {tagsFor,normalizeTags,rankHelpers,hasSecret,safeText}=require('../services/helpMatching');
const validate=require('../config/validateEnvironment');
test('topic rules normalize aliases, respect boundaries and ignore code and URLs',()=>{
    assert.deepEqual(normalizeTags(['ReactJS','JS','postgres','react']),['react','javascript','postgresql']);
    assert.deepEqual(tagsFor('My useEffect loops in React'),['react','hooks']);
    assert.deepEqual(tagsFor('A javascript question ```python\nreact``` https://sql.example.org'),['javascript']);
    assert.deepEqual(tagsFor('reactive geology'),[]);
    assert.throws(()=>normalizeTags('react'));
});
const helper=(id,extra={})=>({user_id:id,skills:['react'],modes:['async'],opt_in:true,availability:'available',active:0,max_cases:2,feedback:0,resolved:0,approved:false,...extra});
test('helper ranking excludes blocked/self/full/unavailable/duplicates and supports new peers',()=>{
    const d={author_id:1,tags:['react','hooks'],mode:'async'};
    const rows=[helper(1),helper(2,{blocked:true}),helper(3,{active:2}),helper(4,{opt_in:false}),helper(5,{duplicate:true}),helper(6,{modes:['voice']}),helper(7,{skills:['python']}),helper(8)];
    const ranked=rankHelpers(d,rows);assert.equal(ranked.length,1);assert.equal(ranked[0].user_id,8);assert.ok(ranked[0].matched.includes('react'));assert.equal(ranked[0].approved,false);
    assert.equal(rankHelpers(d,[helper(9,{active:1}),helper(10)])[0].user_id,10);
    assert.deepEqual(rankHelpers({...d,tags:['other']},[helper(8)]),[]);
});
test('obvious credentials are rejected without returning their content',()=>{
    const fake='gsk_'+'x'.repeat(30);assert.equal(hasSecret(fake),true);assert.throws(()=>safeText(fake,1,100,'Text'),/Remove secrets/);
    assert.equal(hasSecret('const value = 12;'),false);assert.equal(hasSecret(['postgresql://','test:', 'password','@localhost/db'].join('')),true);
});
test('production fails safely with missing configuration; development remains usable',()=>{
    assert.doesNotThrow(()=>validate({NODE_ENV:'development'}));assert.throws(()=>validate({NODE_ENV:'production'}),/configuration/);
    assert.throws(()=>validate({NODE_ENV:'production',DB_HOST:'h',DB_PORT:'1',DB_NAME:'d',DB_USER:'u',DB_PASSWORD:'p',JWT_SECRET:'short'}),/JWT_SECRET/);
});
test('candidate ranking stays bounded and deterministic with a thousand synthetic helpers',()=>{
    const rows=Array.from({length:1000},(_,i)=>helper(i+2,{active:i%2,skills:i%3?['react']:['python']}));
    const doubt={author_id:1,tags:['react'],mode:'async'};
    const start=performance.now(),a=rankHelpers(doubt,rows);assert.ok(performance.now()-start<1000);
    assert.deepEqual(a.map(r=>r.user_id),rankHelpers(doubt,rows).map(r=>r.user_id));assert.ok(a.every(r=>r.matched.length));
});
