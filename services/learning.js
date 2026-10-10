const curriculum = require('../data/curriculum.json');
const questions = require('../data/questions.json');
const fs = require('node:fs');
const path = require('node:path');
const byId = new Map(questions.map(q => [q.id, q]));
let model = null;
const modelPath = path.join(__dirname, '../ml/model.json');
if (fs.existsSync(modelPath)) model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));

function features(history) {
    const recent = history.slice(-10);
    const correct = history.filter(a => a.correct).length;
    return [1, (correct + 1) / (history.length + 2), Math.min(Math.log1p(history.length) / Math.log(51), 1), recent.length ? recent.filter(a => a.correct).length / recent.length : 0.5];
}
function predict(history) {
    if (!model || !history.length) return null;
    const x = features(history);
    return Math.round(100 / (1 + Math.exp(-x.reduce((s, v, i) => s + v * model.weights[i], 0))));
}
function summarise(attempts = []) {
    return curriculum.topics.map(topic => {
        const history = attempts.filter(a => a.topic === topic.id);
        const recent = history.slice(-10);
        const correct = recent.filter(a => a.correct).length;
        const accuracy = recent.length ? Math.round(100 * correct / recent.length) : null;
        const distinct = new Set(history.map(a => a.question_id || a.questionId)).size;
        return { ...topic, attempts: history.length, distinctQuestions: distinct, accuracy,
            prediction: predict(history), status: !history.length ? 'Not assessed' : accuracy >= 80 && distinct >= 2 ? 'On track' : 'Practise next' };
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
    if (!Array.isArray(answers) || !answers.length || answers.length > 30) throw new Error('Submit between 1 and 30 answers.');
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
function modelInfo() {
    return model ? { available: true, name: model.name, version: model.version, dataset: model.dataset, metrics: model.metrics,
        notice: 'Experimental: trained on external mathematics practice data. Predictions are not validated for SkillNest programming learners. Your plan uses curriculum rules and observed answers.' }
        : { available: false, notice: 'Your plan uses curriculum rules and observed answers. A trained predictor has not been installed.' };
}
module.exports = { curriculum, questions, features, predict, summarise, buildPlan, grade, selectQuestions, modelInfo };
