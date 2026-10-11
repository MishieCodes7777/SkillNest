const { test } = require('node:test');
const assert = require('node:assert/strict');
const { matchResearch } = require('../services/researchMatching');
const papers = [
    { id: 1, external_id: 'p1', user_id: 1, mentor_name: 'Test A', title: 'Deep learning for computer vision', topics: ['Image classification'] },
    { id: 2, external_id: 'p2', user_id: 2, mentor_name: 'Test B', title: 'Database query optimization', topics: ['SQL'] },
];
test('research matching returns relevant paper evidence instead of invented expertise', () => {
    const r = matchResearch('computer vision', papers);
    assert.equal(r.matches.length, 1);
    assert.equal(r.matches[0].id, 1);
    assert.ok(r.matches[0].papers[0].matchedTerms.includes('computer vision'));
    assert.equal(r.model.documents, 2);
    assert.equal(matchResearch('ocean ecology', papers).matches.length, 0);
    assert.equal(matchResearch('computer vision', []).matches.length, 0);
});
test('duplicate papers do not inflate corpus size or mentor ranking', () => {
    const a = matchResearch('computer vision', papers);
    const b = matchResearch('computer vision', [...papers, { ...papers[0], id: 3 }]);
    assert.equal(a.matches[0].score, b.matches[0].score);
    assert.equal(b.model.documents, 2);
    assert.equal(b.matches[0].papers.length, 1);
});
