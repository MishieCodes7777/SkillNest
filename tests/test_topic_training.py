import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('topics', Path(__file__).resolve().parents[1]/'ml/train_topics.py')
topics = importlib.util.module_from_spec(spec)
spec.loader.exec_module(topics)


class TopicTests(unittest.TestCase):
    def test_holdout_does_not_enter_vocabulary(self):
        rows = [dict(text=label, label=label) for label in topics.LABELS]
        model = topics.fit(rows)
        self.assertNotIn('unseenholdout', model['vocabulary'])
        self.assertIsNone(topics.predict(model, 'unseenholdout'))
        self.assertEqual(topics.predict(model, 'python'), 'python')
        self.assertEqual(topics.predict(json.loads(json.dumps(model)), 'python'), 'python')

    def test_curriculum_split_disjoint_reproducible(self):
        train, test = topics.curriculum_split()
        self.assertFalse({r['id'] for r in train} & {r['id'] for r in test})
        self.assertEqual((train,test), topics.curriculum_split())
        self.assertEqual(len(train)+len(test), 44)

    def test_group_leakage_rejected(self):
        rows = [dict(id=str(i), text=f'unique question {i}', label=label, source='test',
                     group=label, split=split) for i,(label,split) in enumerate(
                         ( (label,split) for label in topics.LABELS for split in ('train','test') ))]
        scratch = topics.ROOT/'ml/artifacts'
        scratch.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=scratch) as directory:
            path=Path(directory)/'data.jsonl'
            path.write_text('\n'.join(json.dumps(r) for r in rows),encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'boundary'):
                topics.load_dataset(path)


if __name__ == '__main__':
    unittest.main()
