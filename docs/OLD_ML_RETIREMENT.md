# Retiring next-answer prediction

The former mathematics-trained logistic predictor is retired from this working tree. Removed: model.json, train.py, train_skillnest.py, export-learning.js, modelEvaluation.js, LearningEvidence.jsx, and predictor-specific Python tests. Learning service no longer loads coefficients, computes probabilities, or writes forecasts. Model evaluation endpoints and opt-in UI are removed.

Preserved: 44 authored questions, server-side grading, account/session ownership, submission replay protection, question versions, recent-answer summaries, curriculum prerequisites, saved study plans, saved AI roadmaps, research TF-IDF matching, publication imports/reader, AI service integration and `ml/ai-evaluation.json` / `scripts/evaluate-ai.js`.

`curriculum-v3` first selects prerequisite-eligible topics that need practice; among those it chooses unassessed or lowest recent observed accuracy, breaking ties by curriculum order. Focused practice takes up to three questions from that topic, prioritizing unseen items, and fills a six-question batch from the assessment selection. The small bank is diagnostic practice, not certification. Independent academic question review is still needed.

## Database migration and rollback

Application startup no longer creates or writes `learning_forecasts` or `learning_plans.ml_pilot`. On existing installations these remain untouched; no DROP/TRUNCATE or user-data deletion runs at startup. All learning/session/plan/research tables are retained. Old clients' additional pilot field is ignored when saving plans; it does not reactivate inference.

Before deployment take a private provider database snapshot, record its restore point, and back up the current app release. The local database was backed up outside the repository before the new additive schema was run. Production was not migrated by this task.

Optional cleanup, **not executed and requiring separate owner approval**:

```sql
-- Only after a verified backup, retention decision, rollback window and explicit approval:
BEGIN;
DROP TABLE IF EXISTS learning_forecasts;
ALTER TABLE learning_plans DROP COLUMN IF EXISTS ml_pilot;
COMMIT;
```

Restore from the private backup to undo destructive cleanup; table recreation alone cannot recover historical records. Rolling the app back before cleanup needs no restoration because the old table/column still exist. A fresh installation can run the previous schema to recreate empty prediction structures if an app rollback requires them. No cleanup has been applied locally or to production.
