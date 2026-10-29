# Smart Help architecture

React/Vite → authenticated `/api/help` → PostgreSQL. The existing Express server, notifications, profile routes, approved-mentor applications, Socket.IO and WebRTC client are reused. The existing dark/pink/purple theme is retained. No third-party AI receives question text.

## Implemented first release

- `/help`: paginated public question feed with topic/status/full-text search.
- `/help/ask`, `/help/:id`: private by default, editable question, prose/code-as-text, controlled tags, rule-based tag suggestions with manual override, visibility and matching/analytics choices. Public, private and accepted-connection visibility are supported. Obvious credential patterns are rejected before storage (not a comprehensive secret detector).
- `/help/manage`, `/mentor/help`: opt-in peer/mentor help, self-declared skills, modes, availability pause, timezone, active case capacity, notifications, requests, own questions, block management and private outcome counts.
- A mentor badge in matching requires an approved application record. A user.role string alone is insufficient. Existing mentor-role accounts without approval evidence appear as peer helpers until verification is established; we do not manufacture approvals.
- Private invitees can read a pending invitation's question to decide whether to accept. Only accepted helpers can contribute to a private thread. Public question answers are community discussion, not personal direct messages. Accepting a case grants no general connection or DM privilege.
- Learners explicitly resolve/reopen/close questions. Accepted answers make a resolved public question eligible for related-question suggestions; these are author-confirmed, not independently vetted factual answers.
- Requests expire after seven days, allow five lifetime solicitations per question, prohibit duplicates/self-requests and enforce decline cooldown. Acceptance locks the helper preference row and then request; active capacity is counted inside the transaction. Closing/resolving cancels pending requests and ends active work. Learner-only completion/feedback avoids counting accepts as resolutions.
- Blocking excludes matches and contact, cancels active help requests, restricts direct messages/connection requests/meeting access, filters community feed/comments, and can be reversed. Question reports are admin-reviewable through the API; a hidden question is excluded from discovery and new help.

## Matching baseline (skills-v1)

Candidates must opt in, accept the mode, have capacity, be unblocked, not be the asker, and have no outstanding duplicate or recent decline for the case. Corpus currently caps discovery at 1,000 eligible helper preferences; this is an MVP bound and can exclude later candidates at scale.

Canonical aliases and parent tags normalize React/hooks/JavaScript, PostgreSQL/SQL etc. Fenced code, inline code and URLs are excluded from prose inference. Manually supplied tags override inference. Rule tags are not trained classification and have no probabilistic confidence.

Internal ranking: 70 × normalized skill overlap + 5 for reviewed mentor approval + 10 × spare capacity fraction + 10 × min(0.8, (confirmed resolutions+1)/(feedback responses+3)) + 3 for fewer than three feedback samples. Tags must overlap; zero relevance produces no fabricated match. The small cold-start boost helps new peers but is not a guarantee of fair exposure. Tie-break is stable user ID; exploration/randomized evaluation is future work. Numerical ranking is not exposed as a match probability. Quality is observational and selection-biased.

Related questions use controlled tag overlap against public resolved cases with an accepted answer. Feed search uses indexed PostgreSQL full-text search. No stored embeddings/vector database exists. Research matching remains its separate on-demand TF-IDF service.

## Rooms and communication

Rooms are database-backed UUIDs, four-hour duration, two participants at a time. Normal rooms are created by an authenticated owner who may invite accepted connections. Legacy arbitrary codes no longer work; create a new room. Smart Help rooms are restricted to the accepted request's two participants. Optional schedule may be up to seven days ahead; participants cannot join early. JWT, blacklist/expiry, membership, active request, time window and block checks protect joins and subsequent events. A link is not authorization. Cross-room target IDs are rejected. Chat and state events derive identity/room from the socket. Payload bounds, rate limits, disconnect cleanup and periodic access expiry are implemented. Single-process join serialization is not a multi-instance distributed lock; scaling needs coordinated presence/admission.

Voice starts with camera off. Camera failure falls back to audio; media denial can leave text-only communication. Real TURN and two-device/cross-network media still require owner testing; signaling tests are not proof of successful media transport. Existing MeetingRoom renders the calls; no second call stack was added.

## Privacy, retention and deletion

Stored text stays in the app database, is rendered as React text (no HTML injection), and is excluded from ranking analytics. Candidate-display logging requires question-author analytics consent. Events hold candidate IDs/order and minimal overlap/headroom features, so they are personal metadata, **not anonymous data**. Current evaluation is limited to that small feature set; it is not a complete training dataset. Consent revocation deletes that question's display events; deletion cascades the question's related records. A hourly job removes events older than 30 days and expires stale pending requests. Private provider backups follow the owner's separate retention policy.

No attachments, remote embeds, external-private-repo ingestion, payment integration or vector storage. Cookies retain existing SameSite=strict behavior; the old localStorage-token architecture is not migrated in this release. Public profiles/directories no longer expose unnecessary email fields; admins still have emails needed for application review.

## Explicit remaining scope

Ongoing mentorship enrollment/capacity is not implemented: one-off help capacity is separate from courses. There is no public reputation badge, saved-suggestion library, moderation UI, waitlist, learned ranker, causal impact claim or verified per-skill certification. Follow-up chat uses the question discussion; private direct chat still requires the normal mutual connection. Model training, advanced fairness/exploration, broad moderation, multi-instance room admission and cross-network media certification remain release gates/follow-on work. Do not present these as shipped.
