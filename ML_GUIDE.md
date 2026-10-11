# Where machine learning is used in SkillNest

## What the model actually predicts

The trained logistic-regression model estimates: **given a learner's previous answers on one topic, how likely are they to answer the next question correctly?**

It does not write chat replies, import papers, certify mastery, or predict employment outcomes.

You can see its output in **Learning Studio → About your learning signals**, after completing a skill check. The percentage is labelled experimental because the training data comes from mathematics tutoring, while SkillNest's starter assessments cover programming.

## Follow an answer through the application

1. The learner takes a skill check in `src/pages/LearningHub.jsx`.
2. `routes/learning.js` checks each answer against the server's question bank. The browser cannot choose its own correctness label.
3. PostgreSQL stores the question ID and version, topic, selected answer, correctness, account, session, and time in `learning_attempts`.
4. `services/learning.js` groups previous answers by topic and calculates the model's inputs.
5. The learned weights in `ml/model.json` produce a next-answer probability.
6. The interface displays the probability. If the learner enables experimental ML-assisted practice, it also helps prioritize eligible topics after four recorded answers and two distinct questions. Prerequisites still apply.
7. When a new session starts, the server freezes the first forecast per topic before answers arrive. Submitted outcomes are then joined to those forecasts for evaluation; repeated questions are excluded.

Example: a learner has answered several functions questions. The model uses their historical correctness and recent practice pattern to produce a probability for the next functions answer. It is not looking up a stored reply for that learner.

## What the model learned from

`ml/train.py` trains a logistic-regression model from a public ASSISTments example dataset distributed by the pyBKT researchers. Training means adjusting numerical coefficients to reduce prediction error on labelled examples.

The model has three measured inputs plus a constant intercept:

- Past correctness, smoothed so one answer does not immediately mean 0% or 100%.
- Number of previous attempts, transformed so very long histories do not dominate.
- Correctness across the last ten answers.

It combines these inputs with learned weights and maps the result to a probability between zero and one. The website expresses that as a percentage. Node can perform this small calculation directly; Python is needed for retraining, not for serving the site.

## How it was evaluated

The model was trained on **215,787** answer events and selected using **24,417** validation events. A separate test partition contained **55,815** events. Learners are kept in separate training, validation, and test groups.

Test accuracy was **71.5%**, compared with **65.7%** for a baseline that always predicts using the training set's overall success rate. Brier score improved from **0.2253** to **0.1939**; lower is better for this probability-error measure.

These are external-dataset results, not SkillNest accuracy. They also do not prove that a recommended lesson causes better learning. A pilot with appropriate programming questions is the next validation step.

## Which features are not this model?

| Feature | Current implementation |
|---|---|
| AI Mentor, generated roadmaps, Arena practice, resume feedback | Existing language model accessed through Groq; default selected from live account availability |
| Research-paper importing | Supported source APIs and data normalisation |
| Imported research-topic tags | Labels supplied by OpenAlex |
| Recent-answer accuracy | Direct arithmetic on recorded answers |
| Study-path ordering | Explicit topic prerequisites and observed performance |
| Course matching and basic mentor suggestions | Text matching against the chosen track |
| Research Matches | Corpus-fitted TF-IDF vectors and cosine similarity over imported paper titles and source topics |
| Experimental next-answer percentage | Our trained logistic-regression model |

This distinction matters in your PBL presentation. You can demonstrate an original trained ML component without describing every automated feature as ML.

## Why the model does not control the whole roadmap yet

The public training data covers another educational domain, and the starter bank has 44 questions and still needs independent academic review. Automatically treating this model as a dependable programming assessment would overstate what we have tested. Curriculum rules give the application a usable initial behaviour while we collect and evaluate relevant data.

New SkillNest answers are saved, but they do **not** silently retrain the model. Retraining should be a deliberate, versioned process, followed by comparison with the existing model on held-out data.

## What to show your professor

Open the learning studio, complete an assessment, inspect the resulting practice signals, expand the ML details, and then show `ml/train.py` and `ml/model.json`. Explain the data split, baseline, results, and domain limitation. This is stronger evidence than simply calling an external AI API and assuming its responses are accurate.

## Adaptive practice and measurement

The default practice recommendation uses recorded performance and prerequisites. The experimental switch allows the model to prioritize eligible topics after at least four prior answers and two distinct questions. It does not declare mastery, change official course access, or guarantee that a question will be easy. Focused practice includes up to three questions on the recommended topic and other questions for breadth.

`learning_forecasts` stores the model version, probability, baseline, and historical features before a learner submits answers. The baseline is smoothed past accuracy. The first question per topic per session is forecast; repeated questions are excluded from the aggregate evaluation. The signed-in “Is the model improving on SkillNest?” panel reports no performance percentage until at least 30 learners and 200 eligible outcomes exist. This is an operational display floor, not a statistical power calculation. Admin-only `/api/learning/evaluation` additionally exposes calibration bins, Brier score and log loss, separately by model version. Neither metric proves that recommendations improve learning.

A future learning-impact study should compare curriculum-guided practice with ML-assisted practice, use a common set of unseen post-test questions, and analyze uncertainty and learning gains. The present optional pilot is observational, not a randomized trial.

## Research-topic matching

`services/researchMatching.js` fits inverse-document-frequency weights from the current publication collection. Queries and papers become normalized TF-IDF vectors; cosine similarity ranks matches. The UI shows the actual papers and shared terms. The top paper sets each mentor's score, avoiding a reward for uploading duplicates. This is an unsupervised text-retrieval baseline, not a supervised expertise classifier or a model of mentoring quality. There is no measured relevance-accuracy percentage yet; that needs independently judged search examples and metrics such as precision at 3. Scores are not shown as confidence percentages.

## Retraining with real programming outcomes

1. Run `node scripts/export-learning.js` against local pilot data. Output is ignored under `ml/data`; names, emails, and raw account IDs are excluded. Pseudonyms remain linkable, so this is not fully anonymous data.
2. Run `python ml/train_skillnest.py ml/data/skillnest-pilot.json`. Learners are split into training, validation and test groups. Training uses only frozen pre-answer features and labels from submitted answers.
3. The trainer refuses insufficient data. When enough data exists, it saves a candidate separately, compares past-accuracy and constant baselines, and never replaces the running model automatically.
4. Review calibration, subgroup errors, question quality and fresh-question learning outcomes before promotion. A higher test accuracy alone is insufficient.

No learner data has been sent to an external training service, and no new SkillNest-domain accuracy is claimed.
