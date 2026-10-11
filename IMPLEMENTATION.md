# SkillNest: adaptive learning and research profiles

## Run and preview

Existing Node/Express, React/Vite, and PostgreSQL architecture is retained.

```sh
npm install
npm test
npm run build
npm start
```

Open `/preview` for the unauthenticated, stateless interactive demonstration, `/preview/research` for a sample publication layout, or sign in and open `/learning` for persistent assessments and study plans. Approved mentors can open `/mentor/research`.

The live Render service remains at https://skillnest-92ha.onrender.com/ until these files are deployed there. Render should run `npm ci && npm run build` and `npm start`. New tables are added during existing database initialisation; existing accounts and courses are retained. A separate Python service is not needed for model inference.

## Environment

Keep existing secrets in the environment, never in git.

- `AI_MODEL`: optional Groq model ID; default is `qwen/qwen3.8-27b`.
- `GROQ_API_KEY`: existing server-side key, required for AI Mentor, generated quizzes, roadmaps, and resume feedback.
- `OPENALEX_API_KEY`: optional, required for OpenAlex author importing.
- `SERPAPI_API_KEY`: required to enable Google Scholar profile importing through SerpApi. Set it privately in Render Environment; never in frontend code. Provider quotas and charges apply. This connector is fixture-tested but awaits a real key for live validation.
- `SEMANTIC_SCHOLAR_API_KEY`: optional for Semantic Scholar; unauthenticated access is subject to shared rate limits.
- Existing `DB_*`, `JWT_SECRET`, `PORT`, and other application settings continue to apply.

ORCID public work summaries are imported through the public endpoint. Support depends on availability of the source and its usage conditions; ORCID public API terms restrict commercial use. Google Scholar is accessed through the optional SerpApi connector, not direct scraping. A public profile link is not ownership verification.

## Implemented

- Learning Studio with JavaScript/React, Python, and SQL tracks; individual graded answers persist on the server.
- Signed-in assessment sessions: server-held answer keys, ownership checks, atomic submission, duplicate submission protection, question versions.
- Progress and weekly study hours saved per account and track; curriculum prerequisite ordering.
- Actual trained next-answer logistic model and a reproducible learner-disjoint evaluation; limitations displayed in the UI.
- Course and mentor matches using explicit profile/course text, with explanations and honest empty states.
- Mentor-only profile-link import automatically saves all returned publications, with deduplication, removal, and available full-text links. Connectors cover ORCID, Semantic Scholar, OpenAlex, and Google Scholar via SerpApi. The UI reports which connections are configured. Students need approval to become mentors; mentors retain student access without an application.
- AI model configuration, conversation history, limited authored curriculum retrieval with references, source limitations, validated quiz/roadmap responses, saved roadmaps and per-roadmap progress.
- Removed silent fixed-roadmap and resume-score substitutions when AI is unavailable. Generated Arena practice remains separate from assessed learning records.
- Dashboard confidence now comes from recorded assessments; the previous random percentage and claimed improvement were removed.
- New screens reuse the original dark background and pink/purple palette.

Read `ML_GUIDE.md` for a plain-language walkthrough of exactly where the trained model runs.

## Verification

`npm test` covers grading validation, hidden answer keys, prerequisites, repeated-question handling, prediction features, and safe research URL handling.

With a preview server on port 3001 and local PostgreSQL, `npm run test:integration` creates temporary test accounts, checks authentication, account isolation, atomic grading, replay prevention, persistent progress, publication deduplication, and role restrictions, then removes its fixtures. It refuses to run against a remote database.

`node scripts/check-integration.js --with-research` additionally fetches a real public ORCID profile and verifies automatic saving and repeat-import deduplication. Connector tests exercise pagination, source errors, unavailable credentials, and imports larger than 500 records. Imports follow source pagination; a 100-page/90-second guard fails oversized jobs without saving a partial list. Such profiles require a future background-import worker. Re-import is user-triggered, not scheduled synchronization. Source coverage can be incomplete and private/paywalled documents are not downloaded.

`npm run evaluate:ai` makes eight small inference calls; see `ml/README.md`. These are smoke tests, not a claim of general accuracy.

## Still requires real-world validation

The question bank needs independent academic review and more items. The external-data ML model needs a programming-domain pilot. Matching is not trained collaborative filtering. Imported research topics are source labels, not a SkillNest classifier. General tutoring has no live web search; references are supplied curriculum material, not automatic fact verification. Historical browser-local roadmap data is not automatically migrated; it remains in the browser and new roadmaps save to the account.

## Adaptive learning and research discovery update

- `/learning` now offers focused practice and an opt-in experimental ML prioritizer; `/preview` exercises the same recommendation logic without account writes. The authored starter bank has 44 questions, pending independent academic review.
- Prospective, versioned forecasts are stored before submissions. `/api/learning/evidence` returns aggregate pilot evidence to signed-in learners, suppressing metrics with insufficient samples. `/api/learning/evaluation` is admin-only and includes calibration. No automatic online retraining or educational benefit claim.
- `/research-match` matches interests to approved mentors' imported titles/topics with corpus-fitted TF-IDF, supporting papers and honest empty states. `/preview/research-match` uses explicitly labelled demonstration collections. Search covers up to the latest 5,000 publication records; no embedding service or external AI API is called.
- `/u/:userId/research` is a public research library linked from mentor profiles. `/preview/research/papers` demonstrates reading. The built-in reader currently serves validated arXiv PDFs (maximum 25 MB); other sources use their external full-text/publisher links. No paywall bypass, summary substituted for a paper, or claim that every paper has readable full text.
- Mentor identity on public profiles respects approved mentor membership even after adding the learner role.
- `node scripts/export-learning.js` exports local, pseudonymised pilot data to ignored storage; `python ml/train_skillnest.py ml/data/skillnest-pilot.json` checks data sufficiency and trains a separate candidate only when ready.

The PDF reader uses Mozilla PDF.js with page navigation and an extracted-text alternative; it does not rely on a browser PDF plugin. Compatible dependency security fixes were applied alongside the renderer installation. The audit still reports a high-severity advisory for the existing Nodemailer dependency; a mail-library upgrade and mail-flow review remain separate work. No email was sent during verification.
