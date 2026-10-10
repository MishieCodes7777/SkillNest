const { test } = require('node:test');
const assert = require('node:assert/strict');
const { profileId, importProfile, sourceStatus } = require('../services/research');

test('profile links identify authors without accepting arbitrary fetch destinations', () => {
    assert.equal(profileId('https://scholar.google.co.in/citations?hl=en&user=LSsXyncAAAAJ').id, 'LSsXyncAAAAJ');
    assert.equal(profileId('https://www.semanticscholar.org/author/Example-Name/1741101').id, '1741101');
    for (const link of ['https://scholar.google.com.evil.test/citations?user=LSsXyncAAAAJ', 'https://scholar.google.com/citations?user=../../secret', 'https://www.semanticscholar.org/paper/1741101']) assert.throws(() => profileId(link));
});

test('ORCID imports more than 500 works without truncating', async t => {
    t.mock.method(global, 'fetch', async () => ({ ok: true, json: async () => ({ group: Array.from({ length: 501 }, (_, i) => ({ 'work-summary': [{ 'put-code': i, title: { title: { value: `Paper ${i}` } } }] })) }) }));
    const result = await importProfile('https://orcid.org/0000-0002-1825-0097');
    assert.equal(result.works.length, 501);
    assert.equal(result.truncated, false);
});

test('Semantic Scholar follows every page and preserves available full-text links', async t => {
    const calls = [];
    t.mock.method(global, 'fetch', async url => {
        calls.push(url);
        const data = !url.includes('/papers?') ? { name: 'Example' } : url.endsWith('offset=0')
            ? { next: 1, data: [{ paperId: 'p1', title: 'First', externalIds: { DOI: '10.1234/ABC' }, openAccessPdf: { url: 'https://example.org/full.pdf' } }] }
            : { data: [{ paperId: 'p2', title: 'Second' }] };
        return { ok: true, json: async () => data };
    });
    const result = await importProfile('https://www.semanticscholar.org/author/1741101');
    assert.equal(calls.length, 3);
    assert.equal(result.works.length, 2);
    assert.equal(result.works[0].external_id, 'doi:10.1234/abc');
    assert.equal(result.works[0].full_text_url, 'https://example.org/full.pdf');
});

test('Google Scholar paginates using a fixed provider host and deduplicates', async t => {
    const previous = process.env.SERPAPI_API_KEY;
    process.env.SERPAPI_API_KEY = 'test-key';
    t.after(() => { if (previous === undefined) delete process.env.SERPAPI_API_KEY; else process.env.SERPAPI_API_KEY = previous; });
    const calls = [];
    t.mock.method(global, 'fetch', async value => {
        const url = new URL(value); calls.push(url);
        const work = { citation_id: 'author:paper', title: 'Example', link: 'https://scholar.google.com/citations?citation_for_view=author:paper' };
        return { ok: true, json: async () => ({ author: { name: 'Author' }, articles: [work], ...(url.searchParams.get('start') === '0' ? { serpapi_pagination: { next: 'https://untrusted.example/?cstart=100' } } : {}) }) };
    });
    const result = await importProfile('https://scholar.google.com/citations?user=LSsXyncAAAAJ');
    assert.equal(calls.length, 2);
    assert.ok(calls.every(url => url.hostname === 'serpapi.com'));
    assert.equal(result.works.length, 1);
});

test('an interrupted paginated import fails instead of returning a partial success', async t => {
    t.mock.method(global, 'fetch', async url => ({ ok: !url.endsWith('offset=1'), status: 429, json: async () => !url.includes('/papers?') ? { name: 'Example' } : { next: 1, data: [{ paperId: 'p1' }] } }));
    await assert.rejects(importProfile('https://www.semanticscholar.org/author/1741101'), /429/);
});

test('unconfigured Google Scholar is explicitly unavailable and makes no request', async t => {
    const previous = process.env.SERPAPI_API_KEY;
    delete process.env.SERPAPI_API_KEY;
    t.after(() => { if (previous !== undefined) process.env.SERPAPI_API_KEY = previous; });
    t.mock.method(global, 'fetch', () => { throw new Error('Unexpected network request'); });
    assert.equal(sourceStatus().find(s => s.name === 'Google Scholar').enabled, false);
    await assert.rejects(importProfile('https://scholar.google.com/citations?user=LSsXyncAAAAJ'), /provider connection/);
});
