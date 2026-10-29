# SkillNest submission handoff — 28 October 2026

## Open the whole site

- Home: http://localhost:3003/
- Sign in: http://localhost:3003/login
- Account dashboard: http://localhost:3003/dashboard
- No-login learning preview: http://localhost:3003/preview
- ML demonstration and results: http://localhost:3003/preview/ml
- Real question form with model suggestions: http://localhost:3003/help/ask

Use your own local account. Production accounts are not necessarily present in the local database. Localhost is available on this computer, not a public deployment.

If the server stops, open PowerShell in this project and run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-ml-demo.ps1
```

Leave that terminal open. Do not start another copy if port 3003 is already running. PostgreSQL must also be running. The existing private .env supplies local configuration; never submit it or database backups to GitHub.

## Five-minute demonstration

1. Open the home page and sign in to show the actual dashboard/community/profile flows. Show the LinkedIn link on a profile you have filled out.
2. Open Learning studio; choose a track, complete a short assessment, inspect explanations and the recommended next topic. Signed-in progress is saved; preview answers are temporary. Recommendations here use curriculum rules, not a trained mastery predictor.
3. Open ML Studio. Select the SQL example, analyse, and accept the SQL suggestion. Expand the explanation to compare keyword matching with the trained model. Try Outside scope to demonstrate abstention.
4. Open the real help form. Explain that users approve topic tags, and helper eligibility uses explicit skills, permissions, capacity and availability rules.
5. Show the evaluation table. Explain the separated training/validation/development-test groups and limitations. Do not present this as a general-purpose chatbot.

## What our ML actually does

Multinomial Naive Bayes learns word/topic associations from public question titles. Six configurations are compared using validation macro-F1. A validation-selected margin threshold withholds some uncertain suggestions. Python trains the artifact; Node performs local inference. No paid inference API is required for this feature.

Rebuilt from the existing data for submission: 211 training, 55 validation, 55 development-test examples. The guarded model suggested 40 topics, 32 matching source tags (80% correctness when suggesting, 72.7% coverage). Keyword rules suggested 22, of which 18 matched (81.8%, 40% coverage). These results show a coverage tradeoff, not proven superiority. Public tags are weak labels; this inspected holdout is not an untouched final benchmark.

Research matching separately uses corpus-fitted TF-IDF retrieval. Importing publications is data integration. AI tutor content uses an external provider. Helper ranking and learning recommendations remain rules. No trained outcome-based helper ranker or general-purpose LLM was created.

## Verification completed

- Frontend production build; 26 Node tests and 5 Python tests passed.
- ML API, Python/JavaScript prediction parity, input limits, credential rejection and abstention passed.
- Authentication, grading, replay protection, account isolation, saved learning plans, publication deduplication and role checks passed.
- Profile/LinkedIn save and removal, live message refresh, connection permissions, audio room creation and invitations passed.
- Help integration passed, including approval, concurrency/capacity, private discussion, feedback, blocks, consent deletion and socket room authorization.
- Light-mode learning styling and the SQL suggestion/accept interaction were checked in the browser. Remaining legacy screens have not all had a full visual audit.
- Current-file secret-pattern scan and diff check passed. Previous reachable-history pattern scan covered 26 commits and 1,226 blobs without matching credentials; this is not a full security audit.

## Limits to disclose

- Google Scholar and OpenAlex provider keys are absent locally. Use supported ORCID/Semantic Scholar import options; provider availability still depends on their services. Full text is available only where access permits it.
- Groq and TURN configuration are present, but presence alone does not verify provider availability. Actual two-device cross-network camera/audio delivery is not tested; rooms remain 1:1.
- Valuable streak rewards, public live-discovery/group rooms, outcome-trained helper ranking and a fresh independent ML benchmark remain future work.
- No real learner-outcome improvement has been established. No new dataset, fabricated user activity, public push or Render deployment was performed.

The current deliverable is a tested local submission build with an experimental ML feature, not a guarantee that every future product idea or production requirement is complete.

## Correction: help discovery

The homepage topic-suggestion button has been removed. The actual /help page and question composer now offer Find existing help: public discussions plus curated guide/video-course links, ranked by TF-IDF text similarity. Up to 500 recent public questions are considered; private, moderated and blocked-author questions are excluded. Empty results are explicit. This is a bounded retrieval baseline, not a newly trained semantic model or a full video search engine. The earlier classifier remains an experiment in ML Studio, not the primary user-facing feature.

The homepage now uses theme-aware headings and a visible light-mode background. Instructions above describing topic acceptance in the real question form are superseded by this discovery flow.
