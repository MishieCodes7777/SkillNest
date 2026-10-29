# SkillNest ML Studio — local team demo

## Open

http://localhost:3003/preview/ml — no sign-in required on this explicitly enabled
development server. The live Render deployment is unchanged. Localhost works on
this computer; present using this machine or screen sharing.

http://localhost:3003/help/ask — actual account-based question form, now with an
optional model suggestion alongside keyword tags. Sign in with a local account.
Applying a suggestion adds a topic without deleting manually selected tags.

Existing previews: `/preview`, `/preview/research`, `/preview/research-match`.
ML Studio is linked from the existing preview navigation. Original dark/pink/
purple palette retained. No fake mentors, learners or success events were added.

## Five-minute walkthrough

1. Open ML Studio and select SQL example. Click Analyse question. The locally
   trained model suggests SQL; the current keyword rules have no match.
2. Click Add sql to my topics. Explain that users approve suggestions. The
   standalone demo does not post anything or contact a helper.
3. Select Outside scope and analyse. The travel example now abstains. Explain
   that this guard is imperfect, not a general unrelated-question detector.
4. Try your own question. A wrong result is possible; show manual review rather
   than claiming a general-purpose assistant.
5. Show the evaluation table and expand the topic-level limitations. JavaScript
   remains weak. Then open the real question form to show where this belongs.

## What was actually trained

Multinomial Naive Bayes, six candidates (word unigrams or unigrams+bigrams;
alpha 0.5, 1, 2). Model choice uses validation macro-F1. The selected model uses
unigrams and alpha 0.5. A validation-selected margin threshold of 0.15 plus at
least two non-generic known features gates suggestions. Scores are not calibrated
probabilities. This trains word/topic associations, not chatbot responses.

321 public titles: 211 training, 55 validation, 55 development-test questions.
No author overlap across these groups where author IDs exist. Existing test
questions were not fitted, but this development holdout has been inspected over
iterations. A fresh independently reviewed final benchmark is still required.
Public source tags are weak labels; no real SkillNest learner outcomes measured.

Current development-test results:
- Model with guard: 40 suggestions / 55 questions, 32 matching source tags,
  80.0% correct when suggesting, 72.7% coverage, 15 abstentions.
- Keyword rules: 22 suggestions / 55 questions, 18 matching source tags,
  81.8% correct when suggesting, 40.0% coverage.
- Model JavaScript F1: 0.200, so more work is needed in this class.

The model covers more questions in this sample but is not more accurate when it
answers. Do not claim statistically proven superiority, production readiness,
or improved learning. The first travel-demo failure led to the generic-word
guard and a regression test; it did not become a training example.

## Files and reproduction

- `ml/build_topic_demo.py`: grouped validation, candidate selection, guard and
  reproducible artifact/report export. Uses cached public data, no new download.
- `services/topicModel.js`: local JavaScript inference using exported learned
  word counts; code/URLs excluded, explanatory input terms, no prompt storage.
- `routes/topicModel.js`: bounded, rate-limited inference/evidence endpoints.
  Anonymous access requires TOPIC_MODEL_DEMO=true and non-production environment;
  otherwise authentication is required. No arbitrary file/model loading.
- `src/pages/TopicLab.jsx`, `src/components/TopicSuggestion.jsx`,
  `src/styles/topicLab.css`: demo, shared suggestion widget, original palette.
- `tests/topicModel.test.js`, `scripts/check-topic-demo.js`: inference guard,
  Python/JS score parity, API validation, credential rejection, unrelated input.

```powershell
python ml/build_topic_demo.py
npm run build
powershell -File scripts/start-ml-demo.ps1
```

If Python's alias is unavailable, use the installed Python executable. Current
machine runtime is under the user's `.cache/codex-runtimes` directory. Training
needs the cached ignored public JSONL prepared by `ml/collect_public_topics.py`.
Model and dataset files remain ignored; do not publish them without source/licence
and privacy review. The server loads artifacts at startup: restart after training.
Stop a foreground demo server with Ctrl+C; do not run two servers on port 3003.

Verification: 24 Node unit tests passed; application integration checks passed
for authentication, grading, replay protection, account isolation, saved plans,
publication deduplication and roles. Topic API/parity checks passed. Frontend
production build passed (existing large-asset warning). Browser verified SQL
inference, explicit topic approval and travel-question abstention.

No public deployment, push, credential rotation or trained-helper-ranking claim.
