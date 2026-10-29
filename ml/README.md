# ML and AI evaluation

The previous next-answer predictor is retired. See `docs/OLD_ML_RETIREMENT.md`. Smart Help starts with an explainable rules baseline; its trained-ranking release gates are in `docs/SMART_HELP_EVALUATION.md`. Research TF-IDF is preserved.

## AI provider evaluation

`npm run evaluate:ai` compares the existing 8B model and configured model (default `qwen/qwen3.8-27b`) on four small checks using the existing Groq key. It makes eight provider requests. Results go to `ml/ai-evaluation.json`. Passing these checks is not evidence of broad factual reliability. A professor-reviewed task set is still needed.
