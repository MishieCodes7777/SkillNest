# Evaluation and ML release gates

## What is ML today?

Smart Help v1 is an explainable deterministic ranking baseline, **not a trained ML model**. Research search still fits TF-IDF statistics to publication titles/topics. Existing AI Mentor/roadmap features call an external language-model API and are separate. Next-answer correctness prediction has been retired.

Useful future learning target: connecting a learner to a helper who can resolve the actual problem. Higher offline prediction accuracy alone does not prove better matches, better teaching or causal improvement.

## Data required before training

Consented candidate displays must be recorded before choices, including non-chosen candidates; labels must distinguish requests, accepts, responses, completions and learner-confirmed resolution. Use resolved within seven days after acceptance as one outcome, with conditional resolution and end-to-end resolution reported separately. No response/feedback is unknown/censored, not automatic failure. Avoid datasets containing only successful accepted cases.

Current display events retain IDs/order/overlap/headroom for 30 days and link to operational request/feedback records through the doubt. They do not yet include per-impression click IDs, randomized exposure propensity or complete frozen candidate quality/response features. **Do not train a production model from this as though it were a complete unbiased dataset.** Obtain a clear pilot data policy and implement the missing instrumentation first. Do not export raw private question text, credentials or user records into Git.

## Offline and product metrics

Compare simple skill overlap, current skills-v1 and any trained logistic/gradient-boosted ranking candidate on the same judgments. Use future-time holdouts plus helper/learner-aware splits; ensure all features precede the outcome. Report NDCG@5/Recall@5 on independently judged candidate relevance; acceptance rate, time to first helpful reply and confirmed resolution rate with explicit denominators and unknown-feedback share. Probability outputs require calibration, Brier/log loss and confidence intervals, not just accuracy. Report peer/new-helper exposure and quality across sufficient cohorts, without protected-attribute profiling.

Keep a candidate separate from the active rules. Release only after sufficient consented data, leakage review, statistically planned sample sizes, meaningful improvement over the baseline, complaint/spam/fairness checks and latency tests. A consent-respecting controlled pilot must establish whether learners actually get help faster and more often. Retain human choice and a rules fallback. No fabricated percentages or successful-outcome claims are displayed.

## Verification scope

Unit tests cover taxonomy boundaries/aliases, code exclusion, hard eligibility, cold start, capacity ranking, secret rejection and production-config validation. Local API tests cover private access, actual approved-application labels, duplicate/self requests, simultaneous accepts, scoped answers vs personal DMs, feedback, rooms, blocks, deletion of consented telemetry and directory privacy. Socket clients exercise authorized join/signal/chat and cross-room rejection without media/provider calls. Existing learning/research regression tests remain.

Before release, run a two-account desktop/mobile browser journey and test real two-device calls across different networks. Verify microphone denial, camera unavailable, reconnection, expiry and cancellation. TURN credentials must be rotated privately and tested; a passing signaling test cannot establish TURN or media quality. No production provider key was used in the automated tests.
