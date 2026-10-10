function profileId(value) {
    let url;
    try { url = new URL(value); } catch { throw new Error('Paste a full researcher profile URL.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Use a secure public profile URL.');
    if (['scholar.google.com', 'scholar.google.co.in'].includes(url.hostname) && url.pathname === '/citations' && /^[\w-]{6,32}$/.test(url.searchParams.get('user') || '')) {
        const id = url.searchParams.get('user');
        return { source: 'Google Scholar', id, url: `https://scholar.google.com/citations?user=${id}` };
    }
    const semantic = url.pathname.match(/^\/author\/(?:[^/]+\/)?(\d+)\/?$/);
    if (['www.semanticscholar.org', 'semanticscholar.org'].includes(url.hostname) && semantic) return { source: 'Semantic Scholar', id: semantic[1], url: `https://www.semanticscholar.org/author/${semantic[1]}` };
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
    throw new Error('Use a Google Scholar, ORCID, Semantic Scholar, or OpenAlex author profile link. Other websites are not connected yet.');
}
function sourceStatus() {
    return [
        { name: 'ORCID', enabled: true },
        { name: 'Semantic Scholar', enabled: true },
        { name: 'Google Scholar', enabled: Boolean(process.env.SERPAPI_API_KEY) },
        { name: 'OpenAlex', enabled: Boolean(process.env.OPENALEX_API_KEY) },
    ];
}
function safeUrl(value) {
    try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
}
async function getJson(url, headers = {}) {
    const response = await fetch(url, { headers: { Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (!response.ok) throw new Error(response.status === 404 ? 'Profile not found or not public.' : `Research source is unavailable (${response.status}). Please try again later.`);
    const data = await response.json();
    if (data.error) throw new Error('The research provider could not complete this import. Please retry later or use another supported profile.');
    return data;
}
async function importProfile(value) {
    const profile = profileId(value);
    const started = Date.now();
    let pages = 0;
    const checkBudget = () => {
        if (++pages > 100 || Date.now() - started > 90000) throw new Error('This profile is too large to finish in one request. No publications were saved. Contact support for a background import.');
    };
    const finish = (works, authorName = '') => ({ profile, authorName, works: [...new Map(works.map(w => [w.external_id, w])).values()], truncated: false });
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
        return finish(works);
    }
    if (profile.source === 'Google Scholar') {
        if (!process.env.SERPAPI_API_KEY) throw new Error('Google Scholar importing is awaiting the site owner’s provider connection. Use an ORCID or Semantic Scholar profile now; no paper-by-paper entry is needed.');
        const works = [];
        let start = 0, authorName = '';
        do {
            checkBudget();
            const params = new URLSearchParams({ engine: 'google_scholar_author', author_id: profile.id, start: String(start), num: '100', hl: 'en', api_key: process.env.SERPAPI_API_KEY });
            const page = await getJson(`https://serpapi.com/search.json?${params}`);
            authorName = page.author?.name || authorName;
            if (!Array.isArray(page.articles)) throw new Error('The provider did not return a publication list. No publications were saved.');
            for (const w of page.articles) {
                if (!w.citation_id || !safeUrl(w.link)) throw new Error('The provider returned an incomplete record. No publications were saved.');
                works.push({ external_id: `scholar:${w.citation_id}`, title: w.title || 'Untitled work', year: Number(w.year) || null,
                    authors: w.authors || '', url: safeUrl(w.link), full_text_url: null, topics: [], source: profile.source, profile_url: profile.url });
            }
            if (!page.serpapi_pagination?.next) break;
            // Read only the offset; never fetch a provider-supplied URL or forward credentials to it.
            const next = new URL(page.serpapi_pagination.next);
            const offset = Number(next.searchParams.get('start') ?? next.searchParams.get('cstart'));
            if (!Number.isInteger(offset) || offset <= start) throw new Error('The provider returned invalid pagination. No publications were saved.');
            start = offset;
        } while (true);
        return finish(works, authorName);
    }
    if (profile.source === 'Semantic Scholar') {
        const headers = process.env.SEMANTIC_SCHOLAR_API_KEY ? { 'x-api-key': process.env.SEMANTIC_SCHOLAR_API_KEY } : {};
        const author = await getJson(`https://api.semanticscholar.org/graph/v1/author/${profile.id}?fields=name`, headers);
        const works = [];
        let offset = 0;
        do {
            checkBudget();
            const page = await getJson(`https://api.semanticscholar.org/graph/v1/author/${profile.id}/papers?fields=title,year,authors,url,openAccessPdf,externalIds&limit=100&offset=${offset}`, headers);
            if (!Array.isArray(page.data)) throw new Error('The provider did not return a publication list. No publications were saved.');
            for (const w of page.data) {
                if (!w.paperId) throw new Error('The provider returned an incomplete record. No publications were saved.');
                const doi = w.externalIds?.DOI;
                works.push({ external_id: doi ? `doi:${doi.toLowerCase()}` : `semantic:${w.paperId}`, title: w.title || 'Untitled work', year: w.year || null,
                    authors: (w.authors || []).map(a => a.name).join(', ').slice(0, 2000), url: safeUrl(w.url) || `https://www.semanticscholar.org/paper/${w.paperId}`,
                    full_text_url: safeUrl(w.openAccessPdf?.url), topics: [], source: profile.source, profile_url: profile.url });
            }
            if (page.next == null) break;
            if (!Number.isInteger(page.next) || page.next <= offset) throw new Error('The provider returned invalid pagination. No publications were saved.');
            offset = page.next;
        } while (true);
        return finish(works, author.name || '');
    }
    const key = process.env.OPENALEX_API_KEY;
    if (!key) throw new Error('OpenAlex import needs an OPENALEX_API_KEY on the server. ORCID import is also available.');
    const queryKey = `api_key=${encodeURIComponent(key)}`;
    const author = await getJson(`https://api.openalex.org/authors/${profile.id}?${queryKey}`);
    let cursor = '*';
    const works = [];
    do {
        checkBudget();
        const page = await getJson(`https://api.openalex.org/works?filter=author.id:${profile.id}&per-page=100&cursor=${encodeURIComponent(cursor)}&${queryKey}`);
        if (!Array.isArray(page.results)) throw new Error('The provider did not return a publication list. No publications were saved.');
        for (const w of page.results || []) works.push({ external_id: w.doi ? `doi:${w.doi.replace(/^https?:\/\/doi.org\//, '').toLowerCase()}` : w.id,
            title: w.title || 'Untitled work', year: w.publication_year || null,
            authors: (w.authorships || []).map(a => a.author?.display_name).filter(Boolean).join(', ').slice(0, 2000),
            url: safeUrl(w.doi) || safeUrl(w.primary_location?.landing_page_url) || safeUrl(w.id),
            full_text_url: safeUrl(w.best_oa_location?.pdf_url) || safeUrl(w.best_oa_location?.landing_page_url),
            topics: (w.topics || []).slice(0, 3).map(t => t.display_name), source: 'OpenAlex', profile_url: profile.url });
        const next = page.results.length ? page.meta?.next_cursor : null;
        if (next && next === cursor) throw new Error('The provider returned repeated pagination. No publications were saved.');
        cursor = next;
    } while (cursor);
    return finish(works.filter(w => w.url), author.display_name || '');
}
module.exports = { profileId, safeUrl, importProfile, sourceStatus };
