# Smart Help API contracts

All `/api/help` routes require the existing JWT cookie/Bearer authentication and return no-store responses. Errors: `{success:false,message}` with 400 validation, 401 authentication, 403 forbidden, 404 concealed private/unknown resource, 409 invalid state/duplicate/capacity, 429 limits. Queries are parameterized. Rate limits: existing general API limit, plus 120 requests/minute/account and 25 mutations/minute/account. Question creation additionally permits ten/day; five helper solicitations/question. IP and account limits may both apply.

| Method/path | Input / result |
|---|---|
| GET `/taxonomy` | Controlled tags and async/voice/video modes |
| POST `/tags` | `{text}` → inferred rule tags; no external AI |
| GET `/doubts` | q, topic, status, cursor, limit (1–30); public feed, descending ID, nextCursor |
| GET `/my-doubts` | Owner history; same cursor semantics |
| POST `/doubts` | title 8–160, body 20–6000, code ≤6000, tags ≤12, visibility public/private/connected, mode async/voice/video, matching_consent, analytics_consent → doubt |
| GET/PATCH/DELETE `/doubts/:id` | Authorized read; owner edit/delete. PATCH takes full editable question shape. Deletion cascades question-owned records |
| POST `/doubts/:id/resolve` | status resolved/closed/open (default resolved), optional answerId from another user; owner only |
| GET/POST `/doubts/:id/answers` | Paginated answers / `{body}` 1–6000. Private writing requires accepted help relationship or author |
| GET `/doubts/:id/suggestions` | At most five related, resolved, public questions with accepted answers |
| GET `/doubts/:id/matches` | Owner only, matching consent and active case required; at most ten eligible helpers, reasons and role labels |
| GET/PUT `/helpers/me/preferences` | opt_in, skills, modes, availability available/paused, timezone IANA, max_cases 1–10, notifications. GET also includes private 30-day metrics |
| GET `/requests` | Participant-only cursor list, optional doubt_id filter |
| POST `/requests` | doubt_id, helper_id; owner only; derives mode from question |
| POST `/requests/:id/accept`, `/decline` | Invited helper only; pending and unexpired |
| POST `/requests/:id/cancel` | Either participant; pending or accepted |
| POST `/requests/:id/complete` | Learner only; accepted |
| POST `/requests/:id/feedback` | Learner only; completed; resolved boolean and optional rating 1–5; one feedback/receipt |
| GET/POST `/requests/:id/sessions` | Participants; POST requires accepted voice/video case, optional starts_at ISO timestamp ≤7 days ahead. One room/request |
| GET `/blocks`, POST/DELETE `/blocks/:id` | List own blocks, block/unblock account |
| POST `/doubts/:id/report` | reason 10–1000; must be able to read resource |
| GET `/reports`, POST `/reports/:id/review` | Admin only; review status hidden/dismissed |

`POST /api/meetings` creates a normal room; `GET /api/meetings/:uuid` checks join authorization. Existing `/api/notifications/session-invite` requires room ownership, accepted connection, no block and a non-help room. It records invitee membership before notifying. Socket handshake authenticates the JWT; `userconnect` independently checks database membership. No separate bearer join-token is issued: database participant authorization is the chosen boundary.

Socket events: userconnect `{meetingid}`, signal `{to,signal}` (≤64KB JSON), chat-message `{text}` (≤3000), mic-toggle `{muted:boolean}`, cam-toggle `{camOn:boolean}`, screen-share-toggle `{sharing:boolean}`, hand-raised. Ignore client identity/room fields on relays. Invalid/unauthorized signaling is discarded; join failures emit meeting-error. At most 100 events/10 seconds/socket.

No endpoints grant ongoing mentorship, bypass personal-DM acceptance, or promise live presence. Requests and questions have separate states. Completion is not automatic resolution; the learner confirms each explicitly.
