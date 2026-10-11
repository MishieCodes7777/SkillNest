"""Train a programming-domain candidate from a local pseudonymised pilot export.
Never replaces ml/model.json or deploys a candidate automatically.
Usage: python ml/train_skillnest.py ml/data/skillnest-pilot.json
"""
import hashlib
import json
import sys
from pathlib import Path
import numpy as np

def metrics(y, p):
    p = np.clip(p, 1e-8, 1 - 1e-8)
    return dict(examples=len(y), accuracy=float(np.mean((p >= .5) == y)),
                brier=float(np.mean((p - y) ** 2)),
                logLoss=float(-np.mean(y * np.log(p) + (1-y) * np.log(1-p))))

def train(source, output=Path('ml/skillnest-candidate.json')):
    payload = json.loads(source.read_text(encoding='utf-8'))
    if payload.get('schema') != 1:
        raise ValueError('Unsupported export schema.')
    rows = payload['records']
    groups = {name: [] for name in ('train', 'validation', 'test')}
    for row in rows:
        bucket = int(hashlib.sha256(row['learner'].encode()).hexdigest()[:8], 16) % 10
        group = 'test' if bucket < 2 else 'validation' if bucket == 2 else 'train'
        x = row['features']
        if len(x) != 4 or x[0] != 1 or not all(np.isfinite(v) for v in x) or not all(0 <= v <= 1 for v in x) or row['correct'] not in (0, 1):
            raise ValueError('Invalid features or labels in export.')
        groups[group].append(row)
    counts = {k: dict(learners=len({r['learner'] for r in v}), examples=len(v)) for k, v in groups.items()}
    # Operational floor, not a statistical power calculation.
    ready = (counts['train']['learners'] >= 50 and counts['train']['examples'] >= 1000
             and all(counts[k]['learners'] >= 15 and counts[k]['examples'] >= 200 for k in ('validation', 'test')))
    if not ready:
        print(json.dumps(dict(status='insufficient_data', counts=counts,
            message='Collect more independent learners and fresh-question outcomes. No candidate was trained or activated.'), indent=2))
        return False
    arrays = {k: (np.array([r['features'] for r in v]), np.array([r['correct'] for r in v])) for k, v in groups.items()}
    x, y = arrays['train']
    sigmoid = lambda z: 1 / (1 + np.exp(-np.clip(z, -30, 30)))
    weights = np.zeros(4); best = weights.copy(); best_loss = float('inf')
    for epoch in range(600):
        grad = x.T @ (sigmoid(x @ weights) - y) / len(y)
        grad[1:] += .001 * weights[1:]
        weights -= .25 * grad
        if epoch % 10 == 0:
            vx, vy = arrays['validation']
            loss = metrics(vy, sigmoid(vx @ weights))['logLoss']
            if loss < best_loss:
                best = weights.copy(); best_loss = loss
    tx, ty = arrays['test']
    report = dict(status='candidate_only', dataset='SkillNest prospective local pilot',
        sha256=hashlib.sha256(source.read_bytes()).hexdigest(), weights=best.tolist(), split=counts,
        model=metrics(ty, sigmoid(tx @ best)), pastAccuracyBaseline=metrics(ty, tx[:, 1]),
        constantBaseline=metrics(ty, np.full(len(ty), y.mean())),
        limitations=['Learner-disjoint split; validation selects weights, test reports once.',
                     'Observational prediction results do not establish educational benefit.',
                     'Question bank, subgroup performance and probability calibration still need review.',
                     'Candidate is not automatically activated, even if accuracy increases.'])
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))
    return True

if __name__ == '__main__':
    train(Path(sys.argv[1]))
