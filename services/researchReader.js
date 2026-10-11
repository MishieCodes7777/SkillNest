// Fetch only canonical public arXiv PDFs. Never proxy arbitrary author-supplied URLs.
function arxivPdf(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hostname !== 'arxiv.org') return null;
        if (!/^\/pdf\/(?:\d{4}\.\d{4,5}(?:v\d+)?|[a-z-]+(?:\.[A-Z]{2})?\/\d{7}(?:v\d+)?)(?:\.pdf)?$/.test(url.pathname)) return null;
        return `https://arxiv.org${url.pathname}`;
    } catch { return null; }
}
async function readPdf(value) {
    const url = arxivPdf(value);
    if (!url) throw new Error('This paper is available through its publisher link rather than the built-in reader.');
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(25000), headers: { Accept: 'application/pdf' } });
    if (!response.ok) throw new Error('The paper source is temporarily unavailable. Use the original paper link.');
    const max = 25 * 1024 * 1024;
    if (Number(response.headers.get('content-length')) > max) { await response.body.cancel(); throw new Error('This PDF is too large for the built-in reader. Use the original paper link.'); }
    const reader = response.body.getReader();
    const chunks = []; let size = 0;
    try {
        while (true) {
            const { done, value: chunk } = await reader.read();
            if (done) break;
            size += chunk.byteLength;
            if (size > max) throw new Error('This PDF is too large for the built-in reader. Use the original paper link.');
            chunks.push(Buffer.from(chunk));
        }
    } finally { await reader.cancel(); }
    const pdf = Buffer.concat(chunks);
    if (pdf.subarray(0, 5).toString() !== '%PDF-') throw new Error('The source did not return a PDF. Use the original paper link.');
    return pdf;
}
module.exports = { arxivPdf, readPdf };
