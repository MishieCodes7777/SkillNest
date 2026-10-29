# Doubt topic classifier: first training experiment

## Objective

Suggest a technical topic from a student's question, then let existing Smart Help
rules select eligible helpers. This experiment does not train helper availability,
permissions, publication importing, a general chatbot, or learning-outcome prediction.
The website continues to use its existing rules. No deployment is performed.

## What was trained

A multinomial Naive Bayes text classifier, implemented in standard Python with
Laplace smoothing. It learns word frequencies and class priors from training
examples; it does not call an AI API or use pretrained weights. The first version
predicts one of javascript, python, react or sql. It cannot yet represent multiple
topics, recognize all unsupported subjects, or provide calibrated confidence.

The existing 44 curriculum questions are bootstrap material, not real student
doubts. A deterministic seed-42 split holds out one question per curriculum topic:
33 training examples and 11 test examples. Only question text enters the model;
answers, explanations, IDs and topic identifiers do not become features. The
vocabulary is fitted on training text only. Concepts still overlap between splits,
so these results are a pipeline smoke test, not independent generalization evidence.

Initial run: model 8/11 correct; current keyword rules 2/11 (9 abstentions);
majority-class baseline 4/11. Model macro-F1 was 0.817. React has only one test
example. Do not advertise these numbers as real-world accuracy or product impact.
The keyword comparison maps actual application tags to the same four classes;
React takes precedence over JavaScript, ambiguous unrelated matches abstain.
The model is forced to choose whenever it recognizes any vocabulary, whereas
rules can abstain. Report coverage as well as correctness when comparing them.

## Run locally

Requires Python 3 and Node (used to evaluate the actual JavaScript keyword rules).
No pip installation is needed for this initial baseline.

```powershell
python ml/train_topics.py
python -m unittest discover -s tests -p test_topic_training.py
python ml/train_topics.py --predict "Why does my component rerender after a state update?"
```

Use your installed Python executable if the `python` alias is unavailable.
Artifacts are written to ignored `ml/artifacts/topics/model.json` and
`evaluation.json`. The report records split IDs, dataset hash, per-class metrics,
abstentions and mistakes. It intentionally marks production_ready as false.
Training does not access the database, export private questions or send text out.

## Next dataset

Collect permissioned, de-identified, naturally written doubts. Start with these
four topics; record ambiguous/multi-topic/unsupported examples separately rather
than force-labeling them. Have a knowledgeable reviewer check labels and resolve
disagreements. Public data requires a source/license review before acquisition.
Do not generate paraphrases and present them as independent real-user evidence.

Keep JSONL in ignored `ml/data/`. Each line needs:

```json
{"id":"unique-id","text":"actual reviewed question","label":"react","group":"source-thread-or-paraphrase-family","source":"permission-or-license-reference","split":"train"}
```

The example above describes the format; it is not a training example to copy.
Use `split: "test"` for a frozen independent evaluation set. Both splits must
contain all four classes. All questions from a source thread/paraphrase family
must stay in one split. Also separate authors where possible. The loader rejects
duplicate IDs/text and groups crossing splits, but human review is still needed
for semantic near-duplicates, personal information and incorrect provenance.

```powershell
python ml/train_topics.py --dataset ml/data/reviewed-doubts.jsonl
```

Compare this baseline with TF-IDF plus logistic regression/linear SVM once a
usable dataset exists. Tune only with training/validation data, keep the final
test untouched, and examine each class and unsupported inputs. Before integration,
add appropriate abstention/multi-label handling and let users correct suggestions.
Better classification is not proof of better help: evaluate helper relevance and
actual learner resolutions separately in a consented pilot. No production training
or release is justified by this bootstrap result.
