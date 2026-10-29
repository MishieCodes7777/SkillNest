const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../services/learning');
const history = (topic, correct) => engine.questions.filter(q => q.topic === topic).map(q => ({ question_id: q.id, topic, correct }));

test('adaptive practice respects prerequisites with observed performance', () => {
    const attempts = history('js-async', false);
    assert.equal(engine.recommendPractice('web', attempts).topic, 'js-values');
    assert.equal(engine.recommendPractice('web', attempts).policy, 'curriculum-v3');
    const ready = [...history('js-values', true), ...history('js-functions', true), ...history('js-arrays', false), ...history('js-async', true)];
    const pick = engine.selectPractice('web', ready);
    assert.equal(pick.recommendation.topic, 'js-arrays');
    assert.equal(pick.recommendation.policy, 'curriculum-v3');
    assert.equal(pick.questions.filter(q => q.topic === 'js-arrays').length, 3);
    assert.equal(new Set(pick.questions.map(q => q.id)).size, 6);
    assert.ok(pick.questions.every(q => !('correct' in q) && !('explanation' in q)));
});
test('question bank has unique IDs, valid options, references and adequate per-topic coverage', () => {
    assert.equal(new Set(engine.questions.map(q => q.id)).size, engine.questions.length);
    for (const t of engine.curriculum.topics) assert.ok(engine.questions.filter(q => q.topic === t.id).length >= 4);
    for (const q of engine.questions) {
        assert.equal(q.options.length, 4); assert.ok(q.correct >= 0 && q.correct < 4);
        assert.ok(engine.curriculum.topics.some(t => t.id === q.topic && t.url.startsWith('https://')));
    }
});
