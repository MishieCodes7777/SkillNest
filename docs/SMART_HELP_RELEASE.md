# Smart Help local release notes and review checklist

## Implemented

The working tree retires next-answer prediction and adds the first Smart Help workflow: private/public questions, rule-based topics, eligible helper matching, opt-in preferences, guarded requests, answers, learner feedback, scheduled 1:1 rooms, block/report controls and private contribution counts. Existing assessment/plans, courses, mentor applications, research import/search/reader and general AI features remain.

UI routes: `/help`, `/help/ask`, `/help/:id`, `/help/manage`, `/mentor/help`. The local preview runs on port 3002. The existing Render site has **not** received these changes.

## Impacted files

- `config/helpSchema.js`, `services/helpMatching.js`, `services/helpAccess.js`, `routes/help.js`: data model, authorization and matching.
- `services/meetings.js`, `services/meetingSockets.js`, `routes/meetings.js`, existing meeting/session/invite components: authorized rooms and guarded signaling.
- `src/pages/SmartHelp.jsx`, `src/styles/help.css`, app/sidebar/profile/community/course/dashboard links: new UX using the existing theme.
- Learning service/routes/UI/schema/tests: predictor retirement with preserved deterministic practice.
- Auth/mentor directory queries, blocks in community/messages/connections, environment validation, `.gitignore`, `.env.example`, security scanner.
- Architecture/API/evaluation/attribution/retirement documents in `docs/`, updated ML guide and implementation notes.

## Migration and rollout

1. Review diff and tests locally. No production push/deploy is authorized by the supplied master prompt for this milestone.
2. Privately rotate the exposed credentials described in the user's security runbook; old keys must actually be revoked. Source edits do not do this.
3. Take a private production DB snapshot and record the previous app release. Verify all DB_* fields and JWT_SECRET ≥32 characters before deploying with NODE_ENV=production. No secret values belong in Git or chat.
4. Once separately authorized, deploy the app with the normal npm install/build/start workflow. Startup adds help/room tables and indexes; it does not drop existing learning or research data. Follow `OLD_ML_RETIREMENT.md` for optional, separately approved historical-data cleanup.
5. Verify health, login, courses, research, assessment, student→mentor review, help request lifecycle and real media. Normal meetings now need a server-created UUID and explicit accepted-connection invitations; old arbitrary room codes are intentionally rejected. Explain this behavior change to users before rollout.
6. Roll back code if necessary; keep additive tables until a separately reviewed cleanup. Restoring data requires the snapshot, not merely reverting source.

## Verification commands

- `npm test`: 22 unit tests passed (exit 0).
- `npm run build`: production bundle passed (exit 0); existing large Three.js chunk warning remains.
- `npm run security:check`: narrow file/secret-pattern scan passed (exit 0); does not prove full history is secret-free.
- `git diff --check`: passed (exit 0; line-ending notices only).
- `node scripts/check-help-schema.js`: passed (exit 0). Fresh/idempotent schema, populated legacy preservation and discovery indexes checked in a rolled-back local test schema.
- `node scripts/check-help-integration.js`: passed (exit 0). Local temporary accounts; concurrent accepts, private cases, blocks, feedback, approved-role labels, actual Socket.IO authorized and cross-room behavior. No AI/TURN calls.
- `$env:TEST_PORT='3002'; node scripts/check-integration.js`: passed (exit 0) on a fresh local preview. One earlier combined run hit the existing shared API rate limit and failed; restarting the verified test server and running the suite alone resolved it. No production limits were weakened for tests.

Browser verification exercised a disposable learner posting a private React question, rule tags, mentor matching/request, mentor acceptance, mobile (390×844) answer submission, learner accepted-answer resolution and one-time feedback. A literal script tag in a code example rendered as inert text. Desktop and mobile screenshots are in ignored `.preview-logs`. The temporary viewport was reset. Google Sign-In logs an existing unauthorized-local-origin warning on port 3002; the password sign-in journey passed, and no Google settings were changed.

The preview database was backed up privately before migration. Fixtures are disposable and removed after browser verification. Do not commit `.preview-logs`, backups, credentials or personal learner datasets.

## Known limits and owner actions

- Smart Help v1 is not a trained ranker. Learned ranking requires real consented data, complete impression instrumentation and the release gates in `SMART_HELP_EVALUATION.md`.
- Written help is scoped question discussion. Separate personal DMs retain mutual connection approval. Ongoing mentorship enrollment/mentee caps, saved-suggestion library, public reputation badges, waitlists and moderation UI remain follow-on features, not implemented claims.
- Questions and answers need community moderation and academic review. Obvious-secret detection is not comprehensive.
- Scheduling supports one four-hour room per accepted call request; rescheduling/recurring sessions are not implemented. Real cross-network voice/video, TURN relay, microphone/camera denial and mobile media behavior require manual testing with two devices. Socket tests do not validate media delivery.
- Room admission is single-process; distributed deployments need coordinated locks/presence. Discovery is bounded to 1,000 helper preferences; load tests at real product scale remain necessary.
- Production credential rotations are **unverified**. Owner must perform Groq/Metered/JWT/database rotations in private dashboards, confirm old credentials are revoked, and verify the live service afterwards. Google Scholar/OpenAlex keys remain optional missing-provider setup.
- The existing Nodemailer advisory requires a mail-library upgrade/review; the task has not claimed the incident resolved or the whole application security-complete.
- The current GitHub API/history do not reproduce Claude attribution. See `CONTRIBUTOR_ATTRIBUTION_AUDIT.md`; no history rewrite, identity change, force-push or push was performed.

This is a local review milestone, not a production-ready certification or a claim that every long-term item in the master document has shipped.
