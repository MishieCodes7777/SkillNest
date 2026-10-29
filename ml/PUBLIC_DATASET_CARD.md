# Public question-topic pilot v1

Prepared 2026-10-28. Local experiment only; no production changes or public upload.

## Source selection and licence

Selected the official Stack Exchange API instead of an unverified Kaggle mirror.
It provides source post links, author attribution, tags and per-post licence
metadata. Sources checked:

- https://api.stackexchange.com/docs/questions
- https://api.stackexchange.com/docs/types/question
- https://api.stackexchange.com/docs/throttle
- https://stackoverflow.com/help/licensing
- https://stackoverflow.com/legal/api-terms-of-use
- https://stackoverflow.com/legal/terms-of-service/public

This bounded pilot retains only records whose API content_license is CC BY-SA
4.0. Each transformed row retains source URL, author credit/link where available,
licence/link and a transformation notice. Attribution metadata is not a feature.
Preserve these records and applicable attribution/share-alike notices if sharing
adapted content. No raw content or model has been published. This source review
does not settle the licensing of a future commercially distributed trained model.

## Acquisition and processing

Four requests, at most 100 titles per tag: javascript, python, reactjs, sql.
Creation dates restricted to 2020-2025, sorted by votes. Responses cached locally;
reruns use the cache. API backoff/quota responses stop collection rather than retry.
No answers, bodies or comments are requested. API default metadata, including
public owner attribution, is kept in ignored local cache files.

400 returned records -> 321 retained unique titles:
38 duplicate IDs, 31 ambiguous/closed/licence-filtered records, 9 short or
sensitive-pattern records and 1 lexical near duplicate removed.
Exact/near title deduplication happens before author-group splitting. No author
appears in both splits where the API provides an author ID. Deleted/missing
authors use question-specific groups, so author separation cannot be verified
for those records. This is imperfect deduplication, not a semantic audit.

Labels are WEAK public-tag labels, not human-verified ground truth. React takes
precedence over JavaScript when both occur; other cross-topic combinations are
excluded. Only title text becomes a feature. Natural language names remain in
titles; challenge questions without those explicit names are needed later.

| Topic | Train | Test |
|---|---:|---:|
| JavaScript | 46 | 8 |
| Python | 68 | 22 |
| React | 77 | 14 |
| SQL | 75 | 11 |
| Total | 266 | 55 |

Dataset SHA-256:
`e866a1fd0a32f10bd46e04b47137dffcbe648039c01834506e458a5c0ecb0727`

## First fixed baseline result

No hyperparameter search or tuning on this test split was performed.

| Method | Correct / all 55 | Predictions made | Correct / predictions made |
|---|---:|---:|---:|
| Naive Bayes | 41/55 (74.5%) | 55 | 41/55 (74.5%) |
| Existing keyword rules | 18/55 (32.7%) | 22 | 18/22 (81.8%) |
| Training-majority class | 14/55 (25.5%) | 55 | 14/55 (25.5%) |

The model answers more questions but is less accurate when answering than the
conservative rules in this sample. Do not claim it is simply better or deploy it
from headline accuracy alone. Model macro-F1: 0.696; JavaScript F1: 0.429.
This exposes a weak class and the need for validation-based abstention and better
data. The holdout is small, imbalanced, tag-derived and biased toward popular
forum titles. It measures agreement with tags, not resolution of real doubts.

## Reproduction and next steps

```powershell
python ml/collect_public_topics.py
python ml/train_topics.py --dataset ml/data/stackoverflow-topics-v1/weak-labelled.jsonl --out ml/artifacts/public-topics-v1
python -m unittest discover -s tests -p "test_*.py"
```

Raw/processed data: ignored `ml/data/stackoverflow-topics-v1/`.
Model/report: ignored `ml/artifacts/public-topics-v1/`.
Dataset and model manifests are local, not website assets.

Before another model comparison, create a separate author-group validation split
from training data; keep the present test untouched. Independently review labels,
audit ambiguous cases, add underrepresented JavaScript questions and evaluate
unsupported/mixed-topic examples. Collect independent student questions using
`STUDENT_QUESTION_COLLECTION.md`; that collection is evaluation-only unless new
training consent is obtained. No student responses have yet been collected.
