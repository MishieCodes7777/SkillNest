"""Synthetic fixtures verify plumbing only; these scores are not model evidence."""
import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from ml.train_skillnest import train


class CandidateTrainingTest(unittest.TestCase):
    def test_insufficient_data_does_not_write_model(self):
        with tempfile.TemporaryDirectory(dir=Path('.preview-logs').resolve()) as directory:
            source, output = Path(directory) / 'data.json', Path(directory) / 'candidate.json'
            source.write_text(json.dumps({'schema': 1, 'records': []}))
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertFalse(train(source, output))
            self.assertFalse(output.exists())

    def test_candidate_is_separate_and_running_model_is_unchanged(self):
        production = Path('ml/model.json').read_bytes()
        rows = [{'learner': f'fixture-{learner}', 'features': [1, (i + 1) / 22, .5, (i + 1) / 22], 'correct': int(i >= 10)}
                for learner in range(500) for i in range(20)]
        with tempfile.TemporaryDirectory(dir=Path('.preview-logs').resolve()) as directory:
            source, output = Path(directory) / 'data.json', Path(directory) / 'candidate.json'
            source.write_text(json.dumps({'schema': 1, 'records': rows}))
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertTrue(train(source, output))
            report = json.loads(output.read_text())
            self.assertEqual(report['status'], 'candidate_only')
            self.assertEqual(sum(v['learners'] for v in report['split'].values()), 500)
            self.assertEqual(len(report['weights']), 4)
        self.assertEqual(Path('ml/model.json').read_bytes(), production)


if __name__ == '__main__':
    unittest.main()
