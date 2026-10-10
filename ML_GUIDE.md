# Where machine learning is used in SkillNest

## What the model actually predicts

The trained model estimates: **given a learner's previous answers on one topic, how likely are they to answer the next question correctly?**

It does not write chat replies, import papers, certify mastery, or predict employment outcomes.

You can see its output in **Learning Studio → About your learning signals**, after completing a skill check. The percentage is labelled experimental because the training data comes from mathematics tutoring, while SkillNest's starter assessments cover programming.

## Follow an answer through the application

1. The learner takes a skill check in `src/pages/LearningHub.jsx`.
2. `routes/learning.js` checks each answer against the server's question bank. The browser cannot choose its own correctness label.
3. PostgreSQL stores the question ID and version, topic, selected answer, correctness, account, session, and time in `learning_attempts`.
4. `services/learning.js` groups previous answers by topic and calculates the model's inputs.
5. The learned weights in `ml/model.json` produce a next-answer probability.
6. The interface displays that probability inside the experimental-model disclosure.

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
| Course and mentor matching | Text matching against the chosen track |
| Experimental next-answer percentage | Our trained logistic-regression model |

This distinction matters in your PBL presentation. You can demonstrate an original trained ML component without describing every automated feature as ML.

## Why the model does not control the whole roadmap yet

The public training data covers another educational domain, and the starter bank has only 22 questions. Automatically treating this model as a dependable programming assessment would overstate what we have tested. Curriculum rules give the application a usable initial behaviour while we collect and evaluate relevant data.

New SkillNest answers are saved, but they do **not** silently retrain the model. Retraining should be a deliberate, versioned process, followed by comparison with the existing model on held-out data.

## What to show your professor

Open the learning studio, complete an assessment, inspect the resulting practice signals, expand the ML details, and then show `ml/train.py` and `ml/model.json`. Explain the data split, baseline, results, and domain limitation. This is stronger evidence than simply calling an external AI API and assuming its responses are accurate.
