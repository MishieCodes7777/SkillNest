import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('collector',Path(__file__).resolve().parents[1]/'ml/collect_public_topics.py')
collector=importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


def question(i,title,tags,author=12,license='CC BY-SA 4.0'):
    return dict(question_id=i,title=title,tags=tags,owner=dict(user_id=author,display_name='Fixture'),
                content_license=license,link=f'https://stackoverflow.com/questions/{i}')


class PublicDataTests(unittest.TestCase):
    def test_ambiguous_labels_and_react_precedence(self):
        self.assertEqual(collector.label_for(['reactjs','javascript']), 'react')
        self.assertIsNone(collector.label_for(['python','sql']))

    def test_filtering_attribution_and_author_split(self):
        first=question(1,'Why does my Python iterator stop unexpectedly?', ['python'])
        second=question(2,'How can decorators preserve function arguments?', ['python'])
        near=question(3,first['title']+' today', ['python'])
        invalid=question(4,'How can SQL joins select missing records?', ['sql'],license='unknown')
        rows,rejected=collector.prepare([dict(items=[first,second,first,near,invalid])])
        self.assertEqual(len(rows),2)
        self.assertEqual(rows[0]['split'],rows[1]['split'])
        self.assertEqual(rows[0]['group'],rows[1]['group'])
        self.assertEqual(rows[0]['attribution']['author'],'Fixture')
        self.assertEqual(rows[0]['label_status'],'weak-source-tags-unreviewed')
        self.assertEqual(rejected['duplicate_id'],1)
        self.assertEqual(rejected['near_duplicate_title'],1)


if __name__=='__main__':
    unittest.main()
