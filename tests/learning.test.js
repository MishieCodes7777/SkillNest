const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../services/learning');
const { profileId, safeUrl } = require('../services/research');

test('grading rejects fabricated questions, duplicate answers, and answers outside a session', () => {
    assert.throws(() => engine.grade([{ questionId: 'fake', answer: 0 }]));
    assert.throws(() => engine.grade([{ questionId: 'js-values-1', answer: 0 }, { questionId: 'js-values-1', answer: 0 }]));
    assert.throws(() => engine.grade([{ questionId: 'js-values-1', answer: 0 }], ['js-arrays-1']));
    assert.throws(() => engine.grade([{ questionId: 'js-values-1', answer: 4 }]));
    assert.equal(engine.grade([{ questionId: 'js-values-1', answer: 0 }])[0].correct, true);
    assert.equal(engine.grade([{ questionId: 'js-values-1', answer: 1 }])[0].correct, false);
});
test('assessment payload does not reveal answer keys; unseen questions get priority', () => {
    const history = [{ question_id: 'js-values-1', topic: 'js-values', correct: true }];
    const selected = engine.selectQuestions('web', history);
    assert.equal(selected.length, 6);
    assert.ok(selected.every(q => q.correct === undefined && q.explanation === undefined));
    assert.ok(selected.every(q => q.id !== 'js-values-1'));
});
test('plan respects prerequisites and does not treat repeated questions as independent mastery', () => {
    const repeated = Array.from({ length: 10 }, () => ({ topic: 'js-values', question_id: 'js-values-1', correct: true }));
    assert.equal(engine.summarise(repeated)[0].status, 'Practise next');
    const plan = engine.buildPlan('web', repeated, 5);
    assert.ok(plan.findIndex(p => p.topic === 'js-functions') < plan.findIndex(p => p.topic === 'react-state'));
    const none = engine.summarise([])[0];
    assert.equal(none.accuracy, null);
    assert.equal(none.prediction, null);
});
test('model uses only prior answers and emits bounded predictions', () => {
    assert.deepEqual(engine.features([]), [1, .5, 0, .5]);
    if (engine.modelInfo().available) {
        const p = engine.predict([{ correct: true }]);
        assert.ok(p >= 0 && p <= 100);
    }
});
test('research import only accepts supported identifiers, rejecting private URLs and invalid checksums', () => {
    assert.equal(profileId('https://orcid.org/0000-0002-1825-0097').id, '0000-0002-1825-0097');
    assert.equal(profileId('https://openalex.org/A123').source, 'OpenAlex');
    for (const url of ['http://127.0.0.1/', 'https://orcid.org.evil.test/0000-0002-1825-0097', 'https://orcid.org:444/0000-0002-1825-0097', 'https://orcid.org/0000-0002-1825-0098', 'file:///etc/passwd']) assert.throws(() => profileId(url));
    assert.equal(safeUrl('javascript:alert(1)'), null);
    assert.equal(safeUrl('https://user:pass@example.org'), null);
});
