const { test } = require('node:test');
const assert = require('node:assert/strict');
const { arxivPdf, readPdf } = require('../services/researchReader');
test('reader only proxies canonical arXiv PDF URLs', () => {
    assert.equal(arxivPdf('https://arxiv.org/pdf/1706.03762'), 'https://arxiv.org/pdf/1706.03762');
    for (const url of ['http://arxiv.org/pdf/1706.03762', 'https://arxiv.org.evil.test/pdf/1706.03762', 'https://127.0.0.1/file.pdf', 'https://arxiv.org:444/pdf/1706.03762', 'https://arxiv.org/abs/1706.03762']) assert.equal(arxivPdf(url), null);
});
test('reader validates PDF bytes and refuses HTML responses', async t => {
    t.mock.method(global, 'fetch', async () => new Response('<html>blocked</html>'));
    await assert.rejects(readPdf('https://arxiv.org/pdf/1706.03762'), /did not return a PDF/);
});
test('reader preserves a real PDF body and disallows redirects', async t => {
    t.mock.method(global, 'fetch', async (url, options) => { assert.equal(options.redirect, 'error'); return new Response('%PDF-1.7\nfixture'); });
    assert.equal((await readPdf('https://arxiv.org/pdf/1706.03762')).subarray(0, 5).toString(), '%PDF-');
});
