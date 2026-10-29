"""Small cached Stack Overflow title corpus via the official read-only API.
Tags supply weak labels, not independently reviewed ground truth.
"""
from collections import Counter
from datetime import datetime, timezone
import hashlib
import html
import json
from pathlib import Path
import re
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'ml/data/stackoverflow-topics-v1'
TAGS = {'javascript':'javascript','python':'python','react':'reactjs','sql':'sql'}


def label_for(tags):
    labels = {label for label, tag in TAGS.items() if tag in tags}
    if 'react' in labels:
        labels.discard('javascript')
    return next(iter(labels)) if len(labels) == 1 else None


def prepare(pages):
    rows, seen_ids, seen_words, rejected = [], set(), [], Counter()
    for page in pages:
        for q in page.get('items', []):
            label = label_for(q['tags'])
            text = html.unescape(q['title']).strip()
            words = set(re.findall(r'[a-z0-9]+', text.lower()))
            if q['question_id'] in seen_ids:
                rejected['duplicate_id'] += 1; continue
            seen_ids.add(q['question_id'])
            if not label or q.get('closed_date') or q.get('content_license') != 'CC BY-SA 4.0':
                rejected['ambiguous_closed_or_license'] += 1; continue
            if len(words) < 4 or re.search(r'\S+@\S+|https?://|gsk_|sk-proj-|password\s*[:=]', text, re.I):
                rejected['short_or_sensitive_pattern'] += 1; continue
            if any(len(words & old)/len(words | old) >= .8 for old in seen_words):
                rejected['near_duplicate_title'] += 1; continue
            seen_words.append(words)
            owner = q.get('owner', {})
            group = 'so-author-' + str(owner.get('user_id', 'missing-'+str(q['question_id'])))
            split = 'test' if int(hashlib.sha256(group.encode()).hexdigest()[:8],16)%5 == 0 else 'train'
            rows.append(dict(id='so-'+str(q['question_id']), text=text, label=label, group=group,
                source=q['link'], split=split, label_status='weak-source-tags-unreviewed',
                license=q['content_license'], license_url='https://creativecommons.org/licenses/by-sa/4.0/',
                attribution=dict(author=html.unescape(owner.get('display_name','Unknown/deleted user')),
                                 author_url=owner.get('link'), post_url=q['link']),
                modifications='HTML entities decoded; topic mapped from tags; title only',
                source_tags=q['tags']))
    return rows, rejected


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    pages=[]
    for label, tag in TAGS.items():
        cached=OUT/(label+'-api.json')
        if cached.exists():
            data=json.loads(cached.read_text(encoding='utf-8'))
        else:
            params=dict(site='stackoverflow',tagged=tag,pagesize=100,page=1,sort='votes',order='desc',
                        fromdate=1577836800,todate=1767225599)
            request=urllib.request.Request('https://api.stackexchange.com/2.3/questions?'+urllib.parse.urlencode(params),
                                           headers={'User-Agent':'SkillNest-academic-topic-pilot/1.0'})
            with urllib.request.urlopen(request,timeout=40) as response:
                data=json.load(response)
            if 'error_id' in data:
                raise RuntimeError('API error; no retry: '+str(data['error_id']))
            cached.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')
            if data.get('backoff'):
                raise RuntimeError('API backoff requested. Cached response saved; rerun after '+str(data['backoff'])+' seconds.')
            if data.get('quota_remaining',1)<1:
                raise RuntimeError('Quota exhausted; stop until reset.')
            time.sleep(1)
        pages.append(data)
    rows,rejected=prepare(pages)
    path=OUT/'weak-labelled.jsonl'
    path.write_text('\n'.join(json.dumps(r,ensure_ascii=False) for r in rows)+'\n',encoding='utf-8')
    manifest=dict(source='Stack Overflow / official Stack Exchange API', acquired_at=datetime.now(timezone.utc).isoformat(),
        raw_count=sum(len(p.get('items',[])) for p in pages), retained=len(rows), rejected=dict(rejected),
        counts=dict(Counter(r['split']+'/'+r['label'] for r in rows)),
        sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        license='CC BY-SA 4.0; retain per-row attribution and modification notices',
        label_status='weak-source-tags-unreviewed', production_ready=False,
        limitations=['Top-voted 2020-2025 titles, not representative student doubts.',
                    'React takes precedence over JavaScript; other cross-topic questions excluded.',
                    'Author-group holdout; lexical near-duplicate filtering is imperfect.',
                    'Natural topic words retained; separately test questions without explicit topic names.',
                    'Only titles enter model; source tags and attribution are metadata, never features.'])
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print(json.dumps(manifest,indent=2))


if __name__=='__main__':
    main()
