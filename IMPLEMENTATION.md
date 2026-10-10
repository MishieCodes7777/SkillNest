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
- Existing `DB_*`, `JWT_SECRET`, `PORT`, and other application settings continue to apply.

ORCID public work summaries are imported through the public endpoint. Support depends on availability of the source and its usage conditions; ORCID public API terms restrict commercial use. Google Scholar bulk scraping is intentionally unsupported. A public profile link is not ownership verification.

## Implemented

- Learning Studio with JavaScript/React, Python, and SQL tracks; individual graded answers persist on the server.
- Signed-in assessment sessions: server-held answer keys, ownership checks, atomic submission, duplicate submission protection, question versions.
- Progress and weekly study hours saved per account and track; curriculum prerequisite ordering.
- Actual trained next-answer logistic model and a reproducible learner-disjoint evaluation; limitations displayed in the UI.
- Course and mentor matches using explicit profile/course text, with explanations and honest empty states.
- ORCID and OpenAlex import preview, selection, deduplication, self-declared public publication records, removal, and available full-text links.
- AI model configuration, conversation history, limited authored curriculum retrieval with references, source limitations, validated quiz/roadmap responses, saved roadmaps and per-roadmap progress.
- Removed silent fixed-roadmap and resume-score substitutions when AI is unavailable. Generated Arena practice remains separate from assessed learning records.
- Dashboard confidence now comes from recorded assessments; the previous random percentage and claimed improvement were removed.
- New screens reuse the original dark background and pink/purple palette.

Read `ML_GUIDE.md` for a plain-language walkthrough of exactly where the trained model runs.

## Verification

`npm test` covers grading validation, hidden answer keys, prerequisites, repeated-question handling, prediction features, and safe research URL handling.

With a preview server on port 3001 and local PostgreSQL, `npm run test:integration` creates temporary test accounts, checks authentication, account isolation, atomic grading, replay prevention, persistent progress, publication deduplication, and role restrictions, then removes its fixtures. It refuses to run against a remote database.

`npm run evaluate:ai` makes eight small inference calls; see `ml/README.md`. These are smoke tests, not a claim of general accuracy.

## Still requires real-world validation

The question bank needs independent academic review and more items. The external-data ML model needs a programming-domain pilot. Matching is not trained collaborative filtering. Imported research topics are source labels, not a SkillNest classifier. General tutoring has no live web search; references are supplied curriculum material, not automatic fact verification. Historical browser-local roadmap data is not automatically migrated; it remains in the browser and new roadmaps save to the account.
