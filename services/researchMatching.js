// A corpus-fitted TF-IDF retrieval baseline. No LLM calls or invented expertise labels.
const stop = new Set('a an the and or of for to in on with by from using use via at as is are this that into based study paper approach'.split(' '));
function tokens(value) {
    const words = String(value || '').toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]+/gu) || [];
    const cleaned = words.filter(w => w.length > 1 && !stop.has(w) && !/^\d+$/.test(w));
    return [...cleaned, ...cleaned.slice(1).map((w, i) => `${cleaned[i]} ${w}`)];
}
function fit(publications) {
    const documents = new Map();
    for (const p of publications) if (!documents.has(p.external_id || p.id)) documents.set(p.external_id || p.id, tokens(`${p.title} ${(p.topics || []).join(' ')}`));
    const df = new Map();
    for (const terms of documents.values()) for (const term of new Set(terms)) df.set(term, (df.get(term) || 0) + 1);
    const idf = new Map([...df].map(([term, n]) => [term, Math.log((1 + documents.size) / (1 + n)) + 1]));
    const vector = textTokens => {
        const counts = new Map();
        for (const term of textTokens) if (idf.has(term)) counts.set(term, (counts.get(term) || 0) + 1);
        const weights = new Map([...counts].map(([term, n]) => [term, (1 + Math.log(n)) * idf.get(term)]));
        const norm = Math.sqrt([...weights.values()].reduce((sum, weight) => sum + weight ** 2, 0)) || 1;
        return new Map([...weights].map(([term, weight]) => [term, weight / norm]));
    };
    return { documentCount: documents.size, vocabularySize: idf.size, vector, vectors: new Map([...documents].map(([id, terms]) => [id, vector(terms)])) };
}
function matchResearch(query, publications, limit = 10) {
    const model = fit(publications);
    const queryVector = model.vector(tokens(query));
    const matches = new Map();
    for (const paper of publications) {
        const v = model.vectors.get(paper.external_id || paper.id);
        const evidence = [...queryVector].filter(([term]) => v.has(term));
        const similarity = evidence.reduce((sum, [term, weight]) => sum + weight * v.get(term), 0);
        if (!similarity) continue;
        if (!matches.has(paper.user_id)) matches.set(paper.user_id, { id: paper.user_id, name: paper.mentor_name, score: 0, papers: [] });
        const mentor = matches.get(paper.user_id);
        // Best paper sets ranking, so uploading many copies cannot inflate a mentor's score.
        mentor.score = Math.max(mentor.score, similarity);
        if (!mentor.papers.some(p => p.external_id === paper.external_id)) mentor.papers.push({ id: paper.id, external_id: paper.external_id, title: paper.title, year: paper.year,
            url: paper.url, score: similarity, matchedTerms: evidence.sort((a, b) => b[1] * v.get(b[0]) - a[1] * v.get(a[0])).slice(0, 5).map(([term]) => term) });
    }
    const ranked = [...matches.values()].sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id))).slice(0, limit);
    ranked.forEach(m => { m.papers = m.papers.sort((a, b) => b.score - a.score).slice(0, 3); });
    return { matches: ranked, model: { name: 'Corpus-fitted TF-IDF + cosine similarity', version: 'tfidf-1', documents: model.documentCount, vocabulary: model.vocabularySize,
        notice: 'Text relevance from imported titles and source topics. This is not a probability, verified expertise, or a measure of mentoring quality. Synonyms and papers without useful metadata can be missed.' } };
}
module.exports = { tokens, fit, matchResearch };
