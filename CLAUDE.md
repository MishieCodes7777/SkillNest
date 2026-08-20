# SkillNest — Pitch Prep & Project Reference

This file exists for two reasons: (1) so you can answer any question a judge throws at you tomorrow without blanking, and (2) as the source material for your slide deck and speaking notes. Read it end to end at least once tonight, then use the "Hard Questions" section as a drill — cover the answer and try to say it out loud from memory.

---

## 1. The one-liner

**SkillNest is a free, peer-to-peer learning platform where anyone can become a mentor and anyone can learn — backed by AI tools that make both sides more effective.**

Think of it as "Coursera meets Discord meets an AI tutor," but nobody pays to teach and nobody pays to learn.

## 2. The problem

- Structured mentorship is expensive and gatekept. Platforms like MentorCruise charge $39–$480/month for 1:1 mentorship — out of reach for most students, especially in markets like India.
- Free alternatives (YouTube, random Discord servers) have no structure, no accountability, and no way to verify a mentor actually knows what they're teaching.
- Students get stuck between "too expensive" (paid mentorship) and "too unstructured" (free content) with nothing in between.

## 3. The solution

SkillNest removes the price barrier by making mentorship **peer-to-peer**: anyone with real skill in something can apply to become a mentor (reviewed, not automatic — see Trust & Safety below), publish courses, run live sessions, and post in the community. Anyone can learn — enroll in courses, join live video sessions, ask an AI mentor, get an AI-generated learning roadmap, practice with AI-generated quizzes and mock interviews, and get resume feedback.

The AI layer isn't the core pitch (that's a crowded category on its own) — it's the **support system** that makes free peer mentorship viable at scale: AI fills the gaps between human sessions instead of trying to replace them.

## 4. Full feature breakdown

### For learners
- **Browse Courses** — a 3D "globe" gallery of published courses (drag to explore, click to view details), with search by skill or mentor name, ratings/reviews, and enroll/unenroll.
- **Live Sessions** — WebRTC video calls with mentors (see Architecture below for how this works technically).
- **AI Mentor** — a chat-based AI tutor for quick questions, available 24/7 (unlike a human mentor).
- **AI Roadmap Generator** — input your current skills + what you want to learn + hours/week available → get a personalized learning plan.
- **Skill Arena** — AI-generated multiple-choice quizzes at Beginner/Intermediate/Expert/Interview-Ready difficulty, per skill.
- **Interview Prep** — AI-generated mock interview questions (technical + behavioral).
- **Resume Review** — AI feedback on an uploaded resume.
- **Community Feed** — posts, likes, comments, shared between learners and mentors.
- **Messaging** — connection requests (must be accepted, like LinkedIn) → then real-time chat.
- **Achievements/Badges** — streaks, quiz scores, session attendance, XP, rarity tiers (common → legendary/mythic). **Note:** this is currently client-side (stored in the browser, not the database) — be ready to say "gamification layer is built, server-side sync is next" if asked, don't imply it's cross-device synced.
- **Notifications** — real per-user notifications (not fake): new follower, connection accepted, message, mentor application status, course enrollment, new review, etc.

### For mentors
- **Mentor Application** — not self-service. Requires a portfolio/resume/GitHub/LinkedIn link *and* a real project description, reviewed by an admin before approval. This is a deliberate trust gate.
- **Mentor Portal** — separate dashboard: My Courses, Students, Sessions, Community, Resources, Earnings, Settings.
- **Course management** — create/edit courses (title, description, category, difficulty, duration, cover image, video count), see enrolled student counts, see reviews and ratings.
- **Students tab** — see who's actually enrolled in your courses (not just "every learner on the platform," which was an earlier bug — it's now scoped correctly via an `enrollments` table).
- **Public mentor profile** (`/u/:id`) — bio, skills, socials, follow/connect button, linked from anywhere a mentor's name appears (course pages, mentor cards).

### Trust & safety
- Mentor approval is admin-gated, not automatic.
- Admin can remove accounts (test/abuse cleanup).
- Reviews require actual enrollment — you can't review a course you never joined.

## 5. How the tech actually works (for technical judges)

**Stack:** Node/Express + Socket.io backend, React (Vite) frontend, PostgreSQL (Neon in production).

**Live video calls:** Peer-to-peer WebRTC via `simple-peer`, with Socket.io handling signaling (who's calling whom) and Metered.ca providing TURN relay servers so calls work across real-world NATs/firewalls, not just same-WiFi. This is a **mesh** topology — every participant connects directly to every other participant. Fine for 2–3 people; would need a real SFU (media server) to scale to large group calls. Good, honest answer if asked "does this scale to 100-person calls?" — no, not yet, and you know why.

**AI features:** All AI Mentor / Roadmap / Arena / Interview Prep / Resume Review features run on **Groq's `llama-3.1-8b-instant`** — chosen for speed (Groq's inference is extremely fast) and cost (free/cheap tier viable for a bootstrapped product). The API key is kept server-side, never exposed to the browser.

**Auth:** JWT-based sessions + Google Sign-In (OAuth) as an alternative to email/password. Passwords hashed with bcrypt. Password reset via email (Gmail SMTP) with expiring tokens.

**Security hardening already in place:** `helmet` (secure HTTP headers), rate limiting (stricter on login/signup/password-reset endpoints specifically, to blunt brute-force), `hpp` (HTTP parameter pollution protection), input sanitization against XSS, `express-validator`. This is a legitimate talking point if a judge asks "is this just a hackathon toy or production-minded?" — the security middleware stack says the latter.

**Images:** currently mentor-supplied direct URLs (e.g., a Cloudinary asset link), not a built-in upload pipeline. If asked "can mentors upload from their device," the honest answer is "not yet — that's a near-term roadmap item, currently they paste a hosted image link."

**Hosting:** Render (free tier) for the app, Neon for Postgres. Free tier means cold starts after idle (~20–60s to wake up) — worth pre-warming the app right before you go on stage.

## 6. Differentiation

| | MentorCruise (and similar) | SkillNest |
|---|---|---|
| Price | $39–$480/month | Free |
| Mentor supply | Curated professionals, paid | Peer-to-peer, application-reviewed |
| AI support | None / bolt-on | Built into the core loop (roadmap, quizzes, 24/7 chat, interview prep, resume review) |
| Between-session support | None | AI fills the gap between live sessions |

The pitch is **not** "we have an AI mentor" (that alone is a crowded, easily-copied category). The pitch is **"free peer-to-peer + AI as the connective tissue that makes free mentorship actually work at scale."**

## 7. Honest gaps — know these before a judge finds them

Judges probe for weaknesses; better to own them than get caught flat-footed.

- **Mentor-side cold start (chicken-and-egg problem):** why would a skilled person mentor for free? You need a real answer here — possible angles: reputation-building/portfolio (mentors get a public profile + reviews they can point to), paying it forward, community recognition (badges/leaderboard for mentors too), or a future path to paid tiers for top mentors. **This is unresolved in your notes as of the last check-in — decide your answer before tomorrow.**
- **Monetization:** not yet built. The product is currently 100% free with no payment processing. When asked "how do you make money," don't dodge — pick a direction. Common models for this shape of product: (a) freemium — free peer tier + paid "verified expert" tier, (b) B2B — sell to colleges/bootcamps as a mentorship add-on, (c) job-placement referral fees once you have engaged learners, (d) sponsored/featured mentor slots. **You need to commit to one and be ready to defend it — I won't fabricate a number or claim here, that has to come from you.**
- **Traction:** whatever your real signup/session/course numbers are, use them. If it's pre-launch or very early, say so plainly and pivot to *why the architecture is ready to scale* rather than pretending otherwise. Judges respect honesty over inflated numbers more than you'd think.
- **Gamification isn't server-synced yet** (see above) — don't overstate this if pressed technically.
- **Video calls are mesh, not SFU** — fine for the current use case (1:1 or small group mentorship), be upfront it's not built for large webinars yet.
- **Image uploads are link-paste, not device upload** — small thing, but a sharp judge might click through a course and ask.

## 8. Likely hard questions — rehearse these out loud

1. **"Why would a skilled mentor spend their time for free?"** → See mentor cold-start above. Pick your angle and commit.
2. **"How do you make money?"** → Pick from section 7 and be specific, not vague.
3. **"What stops someone from putting garbage info in as a 'mentor'?"** → Application review is admin-gated (portfolio/resume/GitHub/LinkedIn + real project description required before approval) — it's not self-service.
4. **"How is this different from just posting on YouTube / Discord?"** → Structure (courses, ratings, enrollment tracking) + live 1:1/small-group access + AI support between sessions, none of which YouTube/Discord give you.
5. **"How is this different from an AI tutor app?"** → The core value is human peer connection; AI is the support layer, not the product.
6. **"Does this scale?"** → Be honest: current video architecture (mesh WebRTC) is fine for small groups, would need an SFU for large-scale live classes — that's a known, scoped next step, not a surprise you're hiding.
7. **"What's your traction?"** → Use your real numbers. If early/pre-launch, say so and pivot to readiness/architecture.
8. **"What happens if Groq changes pricing or goes down?"** → The AI calls are isolated behind a server-side route, so swapping providers (OpenAI, Anthropic, another Groq model) is a backend config change, not a rebuild — reasonable technical answer.
9. **"Who's on your team?"** → Answer honestly based on your actual current team status.

## 9. Suggested narrative arc for the pitch itself

1. **Hook** — the price/access gap (mentorship is either $39-480/mo or unstructured free chaos).
2. **Problem**, told through a concrete student scenario, not abstractly.
3. **Solution** — SkillNest, one sentence, then a live or recorded demo moment (browse courses → click a course → see the AI-generated roadmap or a quiz).
4. **Why now / why you** — AI models got fast and cheap enough (Groq) to make "always-on support" viable for a free product; you built the trust layer (mentor review process) that naive AI-only competitors skip.
5. **Differentiation slide** — the table in section 6.
6. **Honest state + roadmap** — what's live today, what's next (server-synced achievements, image upload, monetization pilot, SFU for scale).
7. **Ask** — whatever you're asking AIC/the judges for (funding, mentorship, incubation resources) — make sure this is a clear, specific ask, not vague.

---

*This file is for your prep, not a public artifact — it's fine for it to stay in the repo as project documentation afterward, but nothing here should be read verbatim on stage. Practice saying it in your own words.*
