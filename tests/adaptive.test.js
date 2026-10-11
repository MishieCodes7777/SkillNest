const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../services/learning');
const { evaluateForecasts } = require('../services/modelEvaluation');
const history = (topic, correct) => engine.questions.filter(q => q.topic === topic).map(q => ({ question_id: q.id, topic, correct }));

test('adaptive practice respects prerequisites even with experimental ML enabled', () => {
    const attempts = history('js-async', false);
    assert.equal(engine.recommendPractice('web', attempts, true).topic, 'js-values');
    assert.equal(engine.recommendPractice('web', attempts, true).policy, 'curriculum-v2');
    const ready = [...history('js-values', true), ...history('js-functions', true), ...history('js-arrays', false), ...history('js-async', true)];
    const pick = engine.selectPractice('web', ready, true);
    assert.equal(pick.recommendation.topic, 'js-arrays');
    assert.equal(pick.recommendation.policy, 'experimental-ml-v1');
    assert.equal(pick.questions.filter(q => q.topic === 'js-arrays').length, 3);
    assert.equal(new Set(pick.questions.map(q => q.id)).size, 6);
    assert.ok(pick.questions.every(q => !('correct' in q) && !('explanation' in q)));
});
test('forecasts only use prior history and score one question per topic', () => {
    const attempts = history('js-values', true).slice(0, 2);
    const selected = engine.questions.filter(q => q.topic === 'js-values').slice(2);
    const forecasts = engine.forecastsFor(selected, attempts);
    assert.equal(forecasts.length, 1);
    assert.equal(forecasts[0].priorAttempts, 2);
    assert.equal(forecasts[0].seenBefore, false);
    assert.deepEqual(forecasts[0].features, engine.features(attempts));
    assert.equal(engine.forecastsFor(selected, []).length, 0);
});
test('evaluation separates model versions, excludes repeats, and measures probability error', () => {
    const rows = [
        { model_version: '1', user_id: 1, probability: .8, baseline_probability: .5, correct: true, seen_before: false },
        { model_version: '1', user_id: 2, probability: .2, baseline_probability: .5, correct: false, seen_before: false },
        { model_version: '1', user_id: 1, probability: .01, baseline_probability: .5, correct: true, seen_before: true },
        { model_version: '2', user_id: 2, probability: .8, baseline_probability: .5, correct: false, seen_before: false },
    ];
    const [a, b] = evaluateForecasts(rows);
    assert.equal(a.examples, 2); assert.equal(a.repeatedExcluded, 1);
    assert.equal(a.model.accuracy, 1); assert.ok(Math.abs(a.model.brier - .04) < 1e-9);
    assert.equal(b.model.accuracy, 0);
    assert.match(a.status, /too little data/);
    assert.deepEqual(evaluateForecasts([]), []);
});
test('question bank has unique IDs, valid options, references and adequate per-topic coverage', () => {
    assert.equal(new Set(engine.questions.map(q => q.id)).size, engine.questions.length);
    for (const t of engine.curriculum.topics) assert.ok(engine.questions.filter(q => q.topic === t.id).length >= 4);
    for (const q of engine.questions) {
        assert.equal(q.options.length, 4); assert.ok(q.correct >= 0 && q.correct < 4);
        assert.ok(engine.curriculum.topics.some(t => t.id === q.topic && t.url.startsWith('https://')));
    }
});
