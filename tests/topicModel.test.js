const {test}=require('node:test');
const assert=require('node:assert/strict');
const {classify,features}=require('../services/topicModel');
const model={labels:['python','sql'],counts:{python:{list:8,index:6,constructor:1},sql:{rows:8,join:6}},documents:{python:2,sql:2},training_size:4,vocabulary:['list','index','rows','join','constructor'],alpha:.5,bigrams:false,stopwords:['the'],threshold:.3,validation_gate_passed:true,version:'fixture'};
test('model abstains on unfamiliar input and when validation gate is disabled',()=>{
    assert.equal(classify('unfamiliar xyz',model).suggested,null);
    assert.equal(classify('list index',{...model,validation_gate_passed:false}).suggested,null);
    assert.equal(classify('list index',model).suggested,'python');
    assert.equal(classify('rows join',model).suggested,'sql');
});
test('model ignores fenced code and URLs; evidence contains only observed terms',()=>{
    assert.deepEqual(features('the list `rows join` https://example.com/sql',model),['list']);
    const result=classify('list index constructor',model);
    assert.ok(Number.isFinite(result.margin));
    assert.ok(result.terms.every(term=>['list','index','constructor'].includes(term)));
});
