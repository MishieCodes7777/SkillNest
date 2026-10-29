const fs=require('node:fs');
const path=require('node:path');
const {tagsFor}=require('./helpMatching');
const directory=path.join(__dirname,'../ml/artifacts/topic-demo');
let model=null,evidence=null;
try { model=JSON.parse(fs.readFileSync(path.join(directory,'model.json'),'utf8'));evidence=JSON.parse(fs.readFileSync(path.join(directory,'evaluation.json'),'utf8')); } catch { /* Optional local artifact; rules remain available. */ }
function features(text,m){
    const stop=new Set(m.stopwords);
    const prose=text.toLowerCase().replace(/```[\s\S]*?```|`[^`]*`|https?:\/\/\S+/g,' ');
    const words=(prose.match(/[a-z][a-z0-9_]*/g)||[]).filter(w=>!stop.has(w));
    return m.bigrams?[...words,...words.slice(0,-1).map((w,i)=>w+' '+words[i+1])]:words;
}
function classify(text,m=model){
    if(!m)return {available:false,suggested:null,reason:'Model is unavailable. Choose topics manually or use keyword tags.'};
    const vocabulary=new Set(m.vocabulary),known=new Map();
    for(const word of features(text,m))if(vocabulary.has(word))known.set(word,(known.get(word)||0)+1);
    const denominators=Object.fromEntries(m.labels.map(label=>[label,Object.values(m.counts[label]).reduce((n,c)=>n+c,0)+m.alpha*vocabulary.size]));
    const logWord=(label,w)=>Math.log(((Object.hasOwn(m.counts[label],w)?m.counts[label][w]:0)+m.alpha)/denominators[label]);
    const scores=m.labels.map(label=>({label,score:Math.log(m.documents[label]/m.training_size)+[...known].reduce((s,[w,n])=>s+n*logWord(label,w),0)})).sort((a,b)=>b.score-a.score);
    const margin=(scores[0].score-scores[1].score)/Math.max(1,[...known.values()].reduce((s,n)=>s+n,0));
    const generic=new Set(m.generic_terms||[]);
    const informative=[...known].filter(([w])=>w.length>2&&!generic.has(w));
    const accepted=m.validation_gate_passed&&informative.length>=2&&margin>=m.threshold;
    const terms=informative.map(([term,n])=>({term,weight:n*(logWord(scores[0].label,term)-logWord(scores[1].label,term))})).filter(t=>t.weight>0).sort((a,b)=>b.weight-a.weight).slice(0,5).map(t=>t.term);
    return {available:true,version:m.version,suggested:accepted?scores[0].label:null,
        reason:accepted?'Experimental topic suggestion. Review it before applying.':'Not enough separation between topics. Please choose the topics yourself.',
        terms:accepted?terms:[],knownFeatures:informative.length,margin,
        warning:'This is not a confidence percentage. Mixed or unrelated questions can still be misclassified.'};
}
function suggest(text){return {...classify(text),rules:tagsFor(text)};}
module.exports={classify,suggest,features,getEvidence:()=>evidence};
