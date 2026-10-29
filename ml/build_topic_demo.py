"""Select a local suggestion model using validation only; preserve public test split."""
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import re
from train_topics import LABELS, STOP, load_dataset, metrics, keyword_predictions

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'ml/data/stackoverflow-topics-v1/weak-labelled.jsonl'
OUT=ROOT/'ml/artifacts/topic-demo'
GENERIC=set('i my me we our you your should would could why when where be been being have has had am not on at as from by into using use get want need help please make work works working problem issue error'.split())


def features(text, bigrams=False):
    text=re.sub(r'```[\s\S]*?```|`[^`]*`|https?://\S+', ' ', text.lower())
    words=[w for w in re.findall(r'[a-z][a-z0-9_]*',text) if w not in STOP]
    return words + ([a+' '+b for a,b in zip(words,words[1:])] if bigrams else [])


def fit(rows,bigrams,alpha):
    counts={label:Counter() for label in LABELS}
    docs=Counter(r['label'] for r in rows)
    for r in rows: counts[r['label']].update(features(r['text'],bigrams))
    return dict(labels=LABELS,counts=counts,documents=docs,vocabulary=sorted(set().union(*(set(c) for c in counts.values()))),
                bigrams=bigrams,alpha=alpha,stopwords=sorted(STOP),training_size=len(rows),version='topic-demo-v2',
                production_ready=False,algorithm='Multinomial Naive Bayes',generic_terms=sorted(GENERIC))


def score(model,text):
    vocab=set(model['vocabulary']); known=Counter(w for w in features(text,model['bigrams']) if w in vocab)
    scores={label: math.log(model['documents'][label]/model['training_size']) + sum(
        n*math.log((model['counts'][label].get(w,0)+model['alpha'])/
                   (sum(model['counts'][label].values())+model['alpha']*len(vocab))) for w,n in known.items())
        for label in LABELS}
    ranked=sorted(scores,key=scores.get,reverse=True)
    informative=sum(len(w)>2 and w not in GENERIC for w in known)
    return ranked[0],(scores[ranked[0]]-scores[ranked[1]])/max(1,sum(known.values())),informative


def predictions(model,rows,threshold=None):
    output=[]
    for r in rows:
        label,margin,known=score(model,r['text'])
        output.append(label if known>=2 and (threshold is None or margin>=threshold) else None)
    return output


def main():
    original_train,test=load_dataset(DATA)
    validation=[r for r in original_train if int(hashlib.sha256(('validation:'+r['group']).encode()).hexdigest()[:8],16)%5==0]
    train=[r for r in original_train if r not in validation]
    for rows in (train,validation,test):
        assert set(r['label'] for r in rows)==set(LABELS)
    groups=[{r['group'] for r in rows} for rows in (train,validation,test)]
    assert not any(groups[i]&groups[j] for i in range(3) for j in range(i+1,3))
    candidates=[]
    for bigrams in (False,True):
        for alpha in (.5,1,2):
            model=fit(train,bigrams,alpha)
            result=metrics(validation,predictions(model,validation))
            candidates.append((result['macro_f1'],model,result))
    _,model,validation_metrics=max(candidates,key=lambda c:c[0])
    thresholds=[]
    for threshold in (.15,.3,.5,.8,1.2):
        result=metrics(validation,predictions(model,validation,threshold))
        if len(validation)-result['abstentions']>=10 and (result['accuracy_when_answered'] or 0)>=.8:
            thresholds.append((result['coverage'],threshold,result))
    # If no validation threshold passes, do not offer an ML topic to the user.
    _,threshold,selective_validation=max(thresholds,key=lambda t:t[0]) if thresholds else (0,1000000,metrics(validation,[None]*len(validation)))
    model['threshold']=threshold
    model['validation_gate_passed']=bool(thresholds)
    report=dict(version=model['version'],algorithm=model['algorithm'],production_ready=False,
        data_source='Stack Overflow titles, 2020–2025; labels inferred from public tags',
        licence='CC BY-SA 4.0; attribution retained locally',
        dataset_sha256=hashlib.sha256(DATA.read_bytes()).hexdigest(),
        counts=dict(train=len(train),validation=len(validation),test=len(test)),
        selection='Six fixed candidates selected by validation macro-F1; abstention selected on validation only.',
        selected=dict(bigrams=model['bigrams'],alpha=model['alpha'],threshold=threshold),
        candidates=[dict(bigrams=m['bigrams'],alpha=m['alpha'],macro_f1=r['macro_f1']) for _,m,r in candidates],
        validation=validation_metrics,selective_validation=selective_validation,
        model=metrics(test,predictions(model,test)),selective_model=metrics(test,predictions(model,test,threshold)),
        rules=metrics(test,keyword_predictions(test)),
        limitations=['Small, popular-title sample; not representative of SkillNest learners.',
                    'This development holdout has been inspected across iterations; obtain a fresh final benchmark before claiming generalisation.',
                    'Public tags are weak labels, not independently reviewed ground truth.',
                    'Single-topic classifier; mixed and unrelated questions can still be wrong.',
                    'Validation threshold is not calibrated confidence or reliable out-of-domain detection.',
                    'No evidence yet of improved helper response times or learner resolutions.'])
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/'model.json').write_text(json.dumps(model),encoding='utf-8')
    (OUT/'evaluation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    (OUT/'splits.json').write_text(json.dumps({name:[r['id'] for r in rows] for name,rows in [('train',train),('validation',validation),('test',test)]}),encoding='utf-8')
    fixtures=[dict(text=text,label=score(model,text)[0],margin=score(model,text)[1],known=score(model,text)[2])
              for text in ['My component keeps rerendering after a state update','How to group rows and count records','zxqv unexpectedunknown','Python list indexing fails', 'React `sql query` https://example.com/python']]
    (OUT/'parity.json').write_text(json.dumps(fixtures),encoding='utf-8')
    print(json.dumps(report,indent=2))


if __name__=='__main__': main()
