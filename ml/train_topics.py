"""Offline topic-classification prototype. No API, private DB access or deployment.

Default curriculum data is a pipeline smoke test, NOT a real-doubt benchmark.
Only the question text is a feature; answers, explanations and IDs are excluded.
"""
import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import random
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
LABELS = ['javascript', 'python', 'react', 'sql']
STOP = set('a an the is are of to in for and or what which how does do can with it this'.split())


def tokens(text):
    return [t for t in re.findall(r'[a-z][a-z0-9_]*', text.lower()) if t not in STOP]


def fit(rows):
    counts = {label: Counter() for label in LABELS}
    documents = Counter()
    for row in rows:
        counts[row['label']].update(tokens(row['text']))
        documents[row['label']] += 1
    if any(not documents[label] for label in LABELS):
        raise ValueError('Training must contain all four supported labels.')
    vocabulary = sorted(set().union(*(set(c) for c in counts.values())))
    return dict(labels=LABELS, vocabulary=vocabulary, counts=counts,
                documents=documents, training_size=len(rows), alpha=1,
                algorithm='multinomial-naive-bayes', production_ready=False)


def predict(model, text):
    vocabulary = set(model['vocabulary'])
    words = Counter(t for t in tokens(text) if t in vocabulary)
    if not words:
        return None
    scores = {}
    for label in model['labels']:
        counts = model['counts'][label]
        denominator = sum(counts.values()) + len(vocabulary)
        scores[label] = math.log(model['documents'][label] / model['training_size']) + sum(
            n * math.log((counts.get(word, 0) + 1) / denominator) for word, n in words.items())
    return max(scores, key=scores.get)


def metrics(rows, predictions):
    per_class = {}
    for label in LABELS:
        tp = sum(r['label'] == label and p == label for r, p in zip(rows, predictions))
        fp = sum(r['label'] != label and p == label for r, p in zip(rows, predictions))
        fn = sum(r['label'] == label and p != label for r, p in zip(rows, predictions))
        per_class[label] = dict(support=sum(r['label'] == label for r in rows),
                               f1=2*tp/(2*tp+fp+fn) if 2*tp+fp+fn else 0)
    return dict(accuracy=sum(r['label'] == p for r, p in zip(rows, predictions))/len(rows),
                coverage=sum(p is not None for p in predictions)/len(rows),
                accuracy_when_answered=(sum(r['label'] == p for r,p in zip(rows,predictions)) /
                    sum(p is not None for p in predictions)) if any(p is not None for p in predictions) else None,
                macro_f1=sum(v['f1'] for v in per_class.values())/len(LABELS),
                abstentions=predictions.count(None), per_class=per_class)


def curriculum_split():
    questions = json.loads((ROOT / 'data/questions.json').read_text(encoding='utf-8'))
    mapping = {'js': 'javascript', 'py': 'python', 'react': 'react', 'sql': 'sql'}
    groups = {}
    for q in questions:
        row = dict(id=q['id'], text=q['question'], label=mapping[q['topic'].split('-')[0]])
        groups.setdefault(q['topic'], []).append(row)
    train, test = [], []
    rng = random.Random(42)
    for group in sorted(groups):
        rows = sorted(groups[group], key=lambda r: r['id'])
        rng.shuffle(rows)
        test.extend(rows[:1])
        train.extend(rows[1:])
    return train, test


def load_dataset(path):
    rows = [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]
    ids, texts, group_splits = set(), set(), {}
    for r in rows:
        if r.get('label') not in LABELS or r.get('split') not in ('train', 'test'):
            raise ValueError('Each row needs a supported label and train/test split.')
        if not all(isinstance(r.get(k), str) and r[k].strip() for k in ('id','text','group','source')):
            raise ValueError('Each row needs nonempty id, text, group and source strings.')
        key = ' '.join(r['text'].lower().split())
        if r['id'] in ids or key in texts:
            raise ValueError('Duplicate ID or text; remove duplicate questions before splitting.')
        ids.add(r['id']); texts.add(key)
        if r['group'] in group_splits and group_splits[r['group']] != r['split']:
            raise ValueError('A source/paraphrase group crosses the train/test boundary.')
        group_splits[r['group']] = r['split']
    train = [r for r in rows if r['split'] == 'train']
    test = [r for r in rows if r['split'] == 'test']
    if any(not any(r['label'] == label for r in subset) for subset in (train, test) for label in LABELS):
        raise ValueError('Both splits must include every supported class.')
    return train, test


def keyword_predictions(rows):
    # Exercise the actual application baseline, not an approximate reimplementation.
    script = "const {tagsFor}=require('./services/helpMatching');let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(s).map(x=>tagsFor(x)))));"
    result = subprocess.run(['node', '-e', script], input=json.dumps([r['text'] for r in rows]),
                            text=True, capture_output=True, cwd=ROOT, check=True)
    tags = json.loads(result.stdout)
    # Specific React/hooks win over JavaScript; multiple unrelated matches abstain.
    predictions = []
    for row_tags in tags:
        mapped = set(row_tags) & set(LABELS)
        if 'hooks' in row_tags:
            mapped.add('react')
        if 'postgresql' in row_tags:
            mapped.add('sql')
        if 'react' in mapped:
            mapped.discard('javascript')
        predictions.append(next(iter(mapped)) if len(mapped) == 1 else None)
    return predictions


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', type=Path, help='Locally held, reviewed labelled JSONL; see TOPIC_TRAINING.md')
    parser.add_argument('--out', type=Path, default=ROOT / 'ml/artifacts/topics')
    parser.add_argument('--predict', help='Run a local demonstration after training; not a confidence estimate')
    args = parser.parse_args()
    train, test = load_dataset(args.dataset) if args.dataset else curriculum_split()
    model = fit(train)
    predicted = [predict(model, r['text']) for r in test]
    keywords = keyword_predictions(test)
    majority = Counter(r['label'] for r in train).most_common(1)[0][0]
    report = dict(dataset='external-input-not-independently-validated' if args.dataset else 'curriculum-smoke-test',
        label_status=sorted({r.get('label_status', 'unspecified') for r in train+test}),
        production_ready=False, train_count=len(train), test_count=len(test),
        dataset_sha256=hashlib.sha256(json.dumps(train+test, sort_keys=True).encode()).hexdigest(),
        model=metrics(test, predicted), keyword_rules=metrics(test, keywords),
        majority_baseline=metrics(test, [majority]*len(test)),
        train_ids=[r['id'] for r in train], test_ids=[r['id'] for r in test],
        errors=[dict(id=r['id'], expected=r['label'], predicted=p) for r,p in zip(test,predicted) if r['label'] != p],
        limitations=['Single-label four-topic prototype; real doubts can be multi-topic or unsupported.',
                    'No calibrated confidence or reliable out-of-domain rejection.',
                    'Curriculum smoke tests share concepts; external inputs require separate provenance and label audits.',
                    'No claim of improved helper resolution or production readiness.'])
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out/'model.json').write_text(json.dumps(model, indent=2), encoding='utf-8')
    (args.out/'evaluation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({k:report[k] for k in ('dataset','train_count','test_count','model','keyword_rules','majority_baseline','production_ready')}, indent=2))
    if args.predict:
        print('Experimental suggested topic:', predict(model,args.predict) or 'unknown')


if __name__ == '__main__':
    main()
