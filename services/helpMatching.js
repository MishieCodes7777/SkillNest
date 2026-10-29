const taxonomy = {
    javascript: ['javascript', 'js', 'ecmascript'], react: ['react', 'reactjs', 'react.js'],
    hooks: ['hooks', 'useeffect', 'usestate', 'usecallback', 'usememo'], python: ['python', 'pandas'],
    sql: ['sql', 'query', 'joins'], postgresql: ['postgresql', 'postgres'],
    node: ['node', 'nodejs', 'node.js', 'express'], css: ['css', 'flexbox', 'grid'],
    html: ['html', 'semantic html'], git: ['git', 'github'], algorithms: ['algorithm', 'algorithms', 'dsa'], other: ['other']
};
const parents = { hooks: ['react','javascript'], react: ['javascript'], postgresql: ['sql'], node: ['javascript'] };
function tagsFor(text) {
    // Only prose is classified; fenced/inline code and URLs are excluded.
    const prose = String(text).toLowerCase().replace(/```[\s\S]*?```|`[^`]*`|https?:\/\/\S+/g, ' ');
    return Object.entries(taxonomy).filter(([, names]) => names.some(n => new RegExp(`(^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).test(prose))).map(([tag]) => tag);
}
function normalizeTags(tags) {
    if (!Array.isArray(tags) || tags.length > 12 || tags.some(t => typeof t !== 'string' || t.length > 40)) throw Object.assign(new Error('Choose up to 12 skill tags.'), { status: 400 });
    return [...new Set(tags.flatMap(t => tagsFor(t)))];
}
function expanded(tags) { return new Set(tags.flatMap(t => [t, ...(parents[t] || [])])); }
function rankHelpers(doubt, rows) {
    const wanted = expanded(doubt.tags);
    return rows.filter(r => r.opt_in && r.availability === 'available' && r.active < r.max_cases && r.modes.includes(doubt.mode) && !r.blocked && !r.duplicate && r.user_id !== doubt.author_id)
      .map(r => {
          const skills = expanded(r.skills), matched = [...wanted].filter(t => t !== 'other' && skills.has(t));
          const overlap = matched.length / Math.max(1, wanted.size);
          const quality = Math.min(.8, (Number(r.resolved) + 1) / (Number(r.feedback) + 3));
          return { ...r, matched, rank: 70*overlap + (r.approved ? 5 : 0) + 10*(1-r.active/r.max_cases) + 10*quality + (r.feedback < 3 ? 3 : 0) };
      }).filter(r => r.matched.length).sort((a,b) => b.rank-a.rank || a.user_id-b.user_id);
}
function hasSecret(text) {
    return /(?:gsk_|sk-(?:proj-)?|gh[pousr]_|github_pat_)[a-z0-9_-]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:postgres(?:ql)?|mongodb(?:\+srv)?):\/\/[^\s]+:[^\s]+@|(?:api[_ -]?key|password|secret|authorization)\s*[:=]\s*["']?(?:bearer\s+)?[a-z0-9_+\/.=-]{12,}/i.test(text);
}
function safeText(value, min, max, label) {
    if (typeof value !== 'string' || value.trim().length < min || value.length > max) throw Object.assign(new Error(`${label} must contain ${min}–${max} characters.`), { status: 400 });
    if (hasSecret(value)) throw Object.assign(new Error('Possible credential detected. Remove secrets before submitting.'), { status: 400 });
    return value.trim();
}
module.exports = { taxonomy, tagsFor, normalizeTags, rankHelpers, hasSecret, safeText };
