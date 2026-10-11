function score(rows, field) {
    if (!rows.length) return null;
    const bins = Array.from({ length: 5 }, (_, i) => ({ lower: i / 5, upper: (i + 1) / 5, count: 0, predicted: 0, actual: 0 }));
    let correct = 0, brier = 0, loss = 0;
    for (const row of rows) {
        const p = Math.max(1e-8, Math.min(1 - 1e-8, Number(row[field])));
        const y = row.correct ? 1 : 0;
        correct += Number((p >= .5) === Boolean(y)); brier += (p - y) ** 2;
        loss -= y * Math.log(p) + (1 - y) * Math.log(1 - p);
        const bin = bins[Math.min(4, Math.floor(p * 5))]; bin.count++; bin.predicted += p; bin.actual += y;
    }
    return { accuracy: correct / rows.length, brier: brier / rows.length, logLoss: loss / rows.length,
        calibration: bins.filter(b => b.count).map(b => ({ ...b, predicted: b.predicted / b.count, actual: b.actual / b.count })) };
}
function evaluateForecasts(rows) {
    const versions = [...new Set(rows.map(r => r.model_version))];
    return versions.map(version => {
        const eligible = rows.filter(r => r.model_version === version && !r.seen_before);
        const learners = new Set(eligible.map(r => r.user_id)).size;
        return { version, examples: eligible.length, learners, repeatedExcluded: rows.filter(r => r.model_version === version && r.seen_before).length,
            model: score(eligible, 'probability'), baseline: score(eligible, 'baseline_probability'),
            status: learners < 30 || eligible.length < 200 ? 'Collecting pilot evidence; too little data for a performance claim.' : 'Descriptive pilot results; not proof of learning improvement or a randomized comparison.' };
    });
}
module.exports = { score, evaluateForecasts };
