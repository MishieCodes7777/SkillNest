const curriculum = require('../data/curriculum.json');
const questions = require('../data/questions.json');
const byId = new Map(questions.map(q => [q.id, q]));
function recommendPractice(trackId, attempts = []) {
    const track = curriculum.tracks.find(t => t.id === trackId);
    if (!track) throw new Error('Unknown track.');
    const topics = summarise(attempts);
    const inTrack = topics.filter(t => track.topics.includes(t.id));
    const eligible = inTrack.filter(t => t.prerequisites.every(id => topics.find(p => p.id === id)?.status === 'On track'));
    const candidates = eligible.filter(t => t.status !== 'On track');
    const pool = candidates.length ? candidates : eligible;
    const priority = t => t.accuracy ?? -1;
    const topic = [...pool].sort((a, b) => priority(a) - priority(b) || track.topics.indexOf(a.id) - track.topics.indexOf(b.id))[0];
    return { topic: topic.id, title: topic.name, url: topic.url, policy: 'curriculum-v3',
        reason: !topic.attempts ? 'Start here: this topic has no unresolved prerequisites and no recorded answers yet.' : `Recent answers were ${topic.accuracy}% correct across ${topic.distinctQuestions} distinct questions. Prerequisites are checked before suggesting this topic.`,
        evidence: topic.attempts,
        notice: 'A practice suggestion, not a mastery certificate. Repeated questions can inflate performance.' };
}
function selectPractice(trackId, attempts = []) {
    const recommendation = recommendPractice(trackId, attempts);
    const seen = id => attempts.filter(a => a.question_id === id).length;
    const target = questions.filter(q => q.topic === recommendation.topic).sort((a, b) => seen(a.id) - seen(b.id) || a.difficulty - b.difficulty).slice(0, 3);
    const rest = selectQuestions(trackId, attempts).filter(q => !target.some(t => t.id === q.id));
    return { recommendation, questions: [...target, ...rest].slice(0, 6).map(({ correct, explanation, ...q }) => q) };
}
function summarise(attempts = []) {
    return curriculum.topics.map(topic => {
        const history = attempts.filter(a => a.topic === topic.id);
        const recent = history.slice(-10);
        const correct = recent.filter(a => a.correct).length;
        const accuracy = recent.length ? Math.round(100 * correct / recent.length) : null;
        const distinct = new Set(history.map(a => a.question_id || a.questionId)).size;
        return { ...topic, attempts: history.length, distinctQuestions: distinct, accuracy,
            status: !history.length ? 'Not assessed' : accuracy >= 80 && distinct >= 2 ? 'On track' : 'Practise next' };
    });
}
function buildPlan(trackId, attempts = [], hours = 5) {
    const track = curriculum.tracks.find(t => t.id === trackId);
    if (!track) throw new Error('Choose a supported learning track.');
    const summary = summarise(attempts);
    // Curriculum order is topological. Prerequisites always precede dependants.
    return track.topics.map(id => {
        const topic = summary.find(t => t.id === id);
        const practice = topic.status !== 'On track';
        const blockers = topic.prerequisites.filter(p => summary.find(t => t.id === p)?.status !== 'On track');
        return { topic: id, title: topic.name, hours: practice ? topic.hours : 1, url: topic.url,
            reason: !topic.attempts ? 'Establish a baseline with a short assessment.' : practice ? `Your recent answers were ${topic.accuracy}% correct. Review and practise this topic.` : 'Keep this topic fresh with a short review.',
            prerequisites: blockers, activity: practice ? 'Learn and practise' : 'Quick review' };
    }).map((item, index, all) => ({ ...item,
        startWeek: Math.floor(all.slice(0, index).reduce((n, t) => n + t.hours, 0) / hours) + 1,
        week: Math.ceil(all.slice(0, index + 1).reduce((n, t) => n + t.hours, 0) / hours) }));
}
function grade(answers, allowedIds) {
    if (!Array.isArray(answers) || !answers.length || answers.length > questions.length) throw new Error('Invalid number of answers.');
    const seen = new Set();
    return answers.map(a => {
        const q = byId.get(a.questionId);
        if (!q || seen.has(q.id) || (allowedIds && !allowedIds.includes(q.id)) || !Number.isInteger(a.answer) || a.answer < 0 || a.answer >= q.options.length) throw new Error('Invalid or duplicate question answer.');
        seen.add(q.id);
        const source = curriculum.topics.find(t => t.id === q.topic);
        return { question_id: q.id, question_version: q.version, topic: q.topic, answer: a.answer, correct: a.answer === q.correct,
            correctAnswer: q.correct, explanation: q.explanation, url: source.url, question: q.question };
    });
}
function selectQuestions(trackId, attempts = []) {
    const track = curriculum.tracks.find(t => t.id === trackId);
    if (!track) throw new Error('Unknown track.');
    const ids = new Set(track.topics);
    const summary = summarise(attempts);
    return questions.filter(q => ids.has(q.topic)).sort((a, b) => {
        const count = id => attempts.filter(h => h.question_id === id).length;
        return count(a.id) - count(b.id) || (summary.find(t => t.id === a.topic).accuracy ?? 0) - (summary.find(t => t.id === b.topic).accuracy ?? 0);
    }).slice(0, 6).map(({ correct, explanation, ...q }) => q);
}
module.exports = { curriculum, questions, summarise, buildPlan, grade, selectQuestions, recommendPractice, selectPractice };
