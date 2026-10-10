"""Reproducible baseline training. No model SDK, hosted AI, or synthetic labels.

Usage: python ml/train.py ml/data/assistments.csv
Uses only past answers for each learner/skill. Holdout is by learner, not row.
"""
import csv
import hashlib
import json
import math
import sys
from collections import defaultdict
from pathlib import Path
import numpy as np

source = Path(sys.argv[1])
groups = defaultdict(list)
seen = set()
with source.open(encoding='utf-8-sig', newline='') as f:
    for row in csv.DictReader(f):
        if row.get('correct') not in ('0', '1') or not row.get('skill_id'):
            continue
        key = (row['user_id'], row['skill_id'], row['order_id'])
        if key in seen:
            continue
        seen.add(key)
        groups[key[:2]].append((int(row['order_id']), int(row['correct'])))

splits = {k: [[], []] for k in ('train', 'validation', 'test')}
students = {k: set() for k in splits}
for (user, skill), events in groups.items():
    bucket = int(hashlib.sha256(user.encode()).hexdigest()[:8], 16) % 10
    split = 'test' if bucket < 2 else 'validation' if bucket == 2 else 'train'
    students[split].add(user)
    history = []
    count_correct = 0
    for _, correct in sorted(events):
        if history:
            n = len(history)
            recent = history[-10:]
            splits[split][0].append([1, (count_correct + 1) / (n + 2), min(math.log1p(n) / math.log(51), 1), sum(recent) / len(recent)])
            splits[split][1].append(correct)
        history.append(correct)
        count_correct += correct
arrays = {k: (np.array(v[0], dtype=float), np.array(v[1], dtype=float)) for k, v in splits.items()}
X, y = arrays['train']
if len(y) < 1000 or len(students['test']) < 10:
    raise SystemExit('Insufficient independent training/test data.')
def sigmoid(z):
    return 1 / (1 + np.exp(-np.clip(z, -30, 30)))
def evaluate(X, y, weights):
    p = np.clip(sigmoid(X @ weights), 1e-8, 1 - 1e-8)
    return {'accuracy': float(np.mean((p >= .5) == y)), 'brier': float(np.mean((p - y) ** 2)), 'logLoss': float(-np.mean(y * np.log(p) + (1-y) * np.log(1-p))), 'examples': len(y)}
weights = np.zeros(4)
best = weights.copy()
best_loss = float('inf')
for epoch in range(600):
    gradient = X.T @ (sigmoid(X @ weights) - y) / len(y)
    gradient[1:] += .001 * weights[1:]
    weights -= .25 * gradient
    if epoch % 10 == 0:
        loss = evaluate(*arrays['validation'], weights)['logLoss']
        if loss < best_loss:
            best, best_loss = weights.copy(), loss
prior = float(y.mean())
baseline_weights = np.array([math.log(prior / (1-prior)), 0, 0, 0])
report = {
    'name': 'SkillNest next-answer logistic model', 'version': '1.0.0',
    'dataset': 'ASSISTments public example distributed by CAHLR/pyBKT-examples',
    'source': 'https://raw.githubusercontent.com/CAHLR/pyBKT-examples/master/data/as.csv',
    'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'features': ['bias', 'smoothed_past_accuracy', 'log_past_attempts', 'last_10_accuracy'],
    'weights': best.tolist(),
    'metrics': {'model': evaluate(*arrays['test'], best), 'constantBaseline': evaluate(*arrays['test'], baseline_weights),
                'trainingExamples': len(y), 'validationExamples': len(arrays['validation'][1]), 'learners': {k: len(v) for k,v in students.items()}},
    'limitations': ['External mathematics data; programming-domain transfer has not been validated.',
                   'Next-answer correctness is not a validated measure of skill mastery.',
                   'Learner-disjoint holdout; previous observed answers within each held-out sequence are available at prediction time.',
                   'Predictions are informational only; curriculum sequencing uses observed answers and prerequisites.']
}
Path('ml/model.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report['metrics'], indent=2))
