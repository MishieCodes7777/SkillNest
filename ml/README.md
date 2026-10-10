# SkillNest learning model

This repository contains a trained logistic-regression predictor of the next answer's correctness, not a pretrained language model. Training code is in `train.py`; the four learned coefficients and evaluation report are in `model.json`. Node serves predictions directly, so production does not need a separate Python service.

## Data and reproducibility

Source: https://raw.githubusercontent.com/CAHLR/pyBKT-examples/master/data/as.csv

Dataset provenance: https://github.com/CAHLR/pyBKT-examples and its linked ASSISTments source. The raw dataset is excluded from git. It is used for a local academic experiment; inspect the original dataset's applicable terms before redistributing data or using this experiment commercially. Only aggregate metrics and learned coefficients are shipped, not learner records or identifiers.

1. Download the public CSV to `ml/data/assistments.csv`.
2. Install `ml/requirements.txt` in a Python environment.
3. From the repository root, run `python ml/train.py ml/data/assistments.csv`.
4. Restart the Node server after replacing a model artifact.

The artifact records a SHA-256 digest of the input. Duplicate learner/skill/order rows are removed. Each learner/skill sequence is ordered by order_id. Features use only answers observed before the target: smoothed prior accuracy, capped logarithm of prior attempt count, and last-ten-answer accuracy. The first answer in each sequence is omitted because there is no history.

The SHA-256 hash of learner ID chooses 70% training buckets, 10% validation, and 20% test. Learners cannot cross partitions. Gradient descent fits coefficients with L2 regularisation; validation log loss selects an epoch. Test results are computed once on the selected model. The baseline predicts the training set's overall correctness probability for every test response.

## Limits

- External school mathematics data, not SkillNest programming data.
- Prediction of the next answer is not proof of mastery, teaching ability, or learning improvement.
- Results do not establish that adaptive recommendations improve learning outcomes.
- The UI shows predictions only inside an experimental-model disclosure. Study order uses a prerequisite curriculum and observed answers.
- Twenty-two starter questions are implementation seed content with source-linked explanations. They still need independent professor review and expansion before high-stakes assessments.
- Repeated questions are explicitly counted as repetitions. Account data does not automatically retrain the model.

## Next experiment

Collect consented question-level responses from a pilot, review question quality, and evaluate on held-out learners and future responses. Compare against the current curriculum baseline before allowing model predictions to influence recommendations. Research-topic classification and trained course/mentor ranking remain future experiments; current topic tags come from source records and matching uses explicit text rules.

## AI provider evaluation

`npm run evaluate:ai` compares the existing 8B model and configured model (default `qwen/qwen3.8-27b`) on four small checks using the existing Groq key. It makes eight provider requests. Results go to `ml/ai-evaluation.json`. Passing these checks is not evidence of broad factual reliability. A professor-reviewed task set is still needed.
