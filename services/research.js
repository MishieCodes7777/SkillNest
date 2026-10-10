function profileId(value) {
    let url;
    try { url = new URL(value); } catch { throw new Error('Paste a full ORCID or OpenAlex profile URL.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Use a secure public profile URL.');
    if (url.hostname === 'scholar.google.com') throw new Error('Google Scholar does not provide a supported bulk import here. Paste your ORCID or OpenAlex profile link instead.');
    if (url.hostname === 'orcid.org' && /^\/\d{4}-\d{4}-\d{4}-\d{3}[\dX]\/?$/.test(url.pathname)) {
        const id = url.pathname.replaceAll('/', '');
        const digits = id.replaceAll('-', '');
        let total = 0;
        for (const digit of digits.slice(0, 15)) total = (total + Number(digit)) * 2;
        const check = (12 - total % 11) % 11;
        if (digits[15] !== (check === 10 ? 'X' : String(check))) throw new Error('That ORCID identifier has an invalid check digit.');
        return { source: 'ORCID', id, url: `https://orcid.org/${id}` };
    }
    if (url.hostname === 'openalex.org' && /^\/A\d+\/?$/.test(url.pathname)) return { source: 'OpenAlex', id: url.pathname.replaceAll('/', ''), url: `https://openalex.org/${url.pathname.replaceAll('/', '')}` };
    throw new Error('Currently supported: orcid.org researcher profiles and openalex.org author profiles.');
}
function safeUrl(value) {
    try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
}
async function getJson(url, headers = {}) {
    const response = await fetch(url, { headers: { Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (!response.ok) throw new Error(response.status === 404 ? 'Profile not found or not public.' : `Research source is unavailable (${response.status}). Please try again later.`);
    return response.json();
}
async function importProfile(value) {
    const profile = profileId(value);
    if (profile.source === 'ORCID') {
        const record = await getJson(`https://pub.orcid.org/v3.0/${profile.id}/works`);
        const works = (record.group || []).flatMap(group => {
            const w = group['work-summary']?.[0];
            if (!w) return [];
            const doi = w['external-ids']?.['external-id']?.find(e => e['external-id-type'] === 'doi')?.['external-id-value'];
            const url = safeUrl(w.url?.value) || (doi ? `https://doi.org/${encodeURIComponent(doi)}` : profile.url);
            return [{ external_id: doi ? `doi:${doi.toLowerCase()}` : `orcid:${profile.id}:${w['put-code']}`, title: w.title?.title?.value || 'Untitled work',
                year: Number(w['publication-date']?.year?.value) || null, authors: '', url, full_text_url: null, topics: [], source: 'ORCID', profile_url: profile.url }];
        });
        return { profile, authorName: '', works: [...new Map(works.map(w => [w.external_id, w])).values()].slice(0, 500), truncated: works.length > 500 };
    }
    const key = process.env.OPENALEX_API_KEY;
    if (!key) throw new Error('OpenAlex import needs an OPENALEX_API_KEY on the server. ORCID import is also available.');
    const queryKey = `api_key=${encodeURIComponent(key)}`;
    const author = await getJson(`https://api.openalex.org/authors/${profile.id}?${queryKey}`);
    let cursor = '*';
    const works = [];
    do {
        const page = await getJson(`https://api.openalex.org/works?filter=author.id:${profile.id}&per-page=100&cursor=${encodeURIComponent(cursor)}&${queryKey}`);
        for (const w of page.results || []) works.push({ external_id: w.doi ? `doi:${w.doi.replace(/^https?:\/\/doi.org\//, '').toLowerCase()}` : w.id,
            title: w.title || 'Untitled work', year: w.publication_year || null,
            authors: (w.authorships || []).map(a => a.author?.display_name).filter(Boolean).join(', ').slice(0, 2000),
            url: safeUrl(w.doi) || safeUrl(w.primary_location?.landing_page_url) || safeUrl(w.id),
            full_text_url: safeUrl(w.best_oa_location?.pdf_url) || safeUrl(w.best_oa_location?.landing_page_url),
            topics: (w.topics || []).slice(0, 3).map(t => t.display_name), source: 'OpenAlex', profile_url: profile.url });
        cursor = page.meta?.next_cursor;
    } while (cursor && works.length < 500);
    return { profile, authorName: author.display_name || '', works: works.filter(w => w.url), truncated: Boolean(cursor) };
}
module.exports = { profileId, safeUrl, importProfile };
