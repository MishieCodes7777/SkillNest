# Where ML belongs in SkillNest now

A local four-topic classifier now powers optional, user-approved topic suggestions
in Smart Help and the `/preview/ml` demonstration. It uses public question titles,
with separate author groups for training, validation and development testing.
It has not been validated on real SkillNest student doubts. See
`docs/ML_DEMO_HANDOFF.md` for current results and the presentation walkthrough.

Smart Help connects a question to a relevant person. Helper ranking uses controlled skill tags, prerequisites between concepts, opt-in availability, help mode, capacity and confirmed outcomes with explainable rules. **The helper ranking itself is not trained ML.** The separate topic classifier is trained ML. Users approve its optional suggestions; manual tag choices remain authoritative. No private question text is sent to an AI provider.

The previous mathematics-trained next-answer predictor has been removed from the product. Assessments, explanations, progress and curriculum-based study plans remain. Their observed answer accuracy is a learner practice statistic, not model accuracy.

Research matching remains corpus-fitted TF-IDF plus cosine similarity over imported titles/topics. Publication importing is data/API integration. AI Mentor and other generative tools remain external LLM integrations. These are three different mechanisms.

A future Smart Help model could learn which eligible helper is likely to resolve a particular kind of question. We first need consented impressions, choices and real outcomes, including unknown feedback. More accurate predictions mean fewer errors on the evaluation sample; they do not prove that learners receive better help. Compare ranking relevance, resolution rate, response time, calibration and new-helper exposure against the rules baseline before release.

For example, predicting 800 of 1,000 outcomes correctly gives 80% accuracy. If simply predicting the most common outcome gets 850 correct, that model is worse than the simple baseline. Representative test data and a real product benefit matter more than a headline percentage.

See `docs/SMART_HELP_ARCHITECTURE.md`, `docs/SMART_HELP_EVALUATION.md` and `docs/OLD_ML_RETIREMENT.md` for the implementation, evidence needed and safe migration.
