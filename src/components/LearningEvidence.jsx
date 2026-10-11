import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
export default function LearningEvidence({ preview }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
        if (preview) return;
        let alive = true;
        api('/api/learning/evidence').then(d => { if (alive) setData(d); }).catch(e => { if (alive) setError(e.message); });
        return () => { alive = false; };
    }, [preview]);
    return <details className="learn-model"><summary>Is the model improving on SkillNest?</summary>
        <p>We record predictions before answers arrive and compare them with a simple past-accuracy baseline. Repeated questions are excluded from these results.</p>
        {preview ? <p>Preview answers are temporary and never enter the evaluation dataset. Sign in for the current pilot evidence.</p> : error ? <p role="alert">{error}</p> : !data ? <p>Loading pilot evidence…</p> : !data.evaluation.length ? <p>No scored pilot predictions yet. There is no measured SkillNest accuracy to report.</p> : data.evaluation.map(r => <div key={r.version}><p>Model {r.version}: {r.examples} fresh-question predictions from {r.learners} learners. {r.status}</p>{r.model && <div className="learn-model-stats"><span>Accuracy: {(100*r.model.accuracy).toFixed(1)}% · baseline {(100*r.baseline.accuracy).toFixed(1)}%</span><span>Brier score: {r.model.brier.toFixed(3)} · baseline {r.baseline.brier.toFixed(3)} (lower is better)</span></div>}</div>)}
        <p>Higher accuracy means more correct predictions on the measured sample. It does not prove better teaching. We also need to check probability calibration and improvement on fresh questions after practice.</p>
    </details>;
}
