import React,{useState} from 'react';
import {api} from '../utils/api';

export default function TopicSuggestion({text,onApply}){
    const [result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[analysed,setAnalysed]=useState('');
    const current=analysed===text?result:null;
    async function analyse(){setBusy(true);setError('');setResult(null);try{const value=await api('/api/topic-model/suggest',{method:'POST',body:JSON.stringify({text})});setResult(value);setAnalysed(text);}catch(e){setError(e.message);}finally{setBusy(false);}}
    return <section className="topic-suggestion" aria-label="Experimental topic suggestion">
      <div className="topic-kicker">FIND THE RIGHT HELP</div>
      <h3>Suggest topics for my question</h3>
      <p>Get a suggested topic, review it, then find relevant helpers. Currently supports JavaScript, Python, React and SQL.</p>
      <button type="button" disabled={busy||text.trim().length<8} onClick={analyse}>{busy?'Analysing…':'Analyse question'}</button>
      {error&&<p role="alert">{error}</p>}
      {current&&<div aria-live="polite" className="topic-result">
        <h3>{current.suggested||'Choose topics manually'}</h3><p>{current.suggested?'Does this match your question? You can change or add topics before posting.':current.reason}</p>
        {current.suggested&&onApply&&<button type="button" onClick={()=>onApply(current.suggested)}>Add {current.suggested} to my topics</button>}
        <details><summary>How this suggestion works</summary>
          <p>A locally trained experimental model processes this question on the server, without an external AI API or saving it for training.</p>
          {current.terms?.length>0&&<p>Contributing words: <strong>{current.terms.join(', ')}</strong></p>}
          <p>Keyword comparison: {current.rules?.join(', ')||'No keyword match'}.</p>
          <p className="topic-note">{current.warning||'Choose topics manually if the model is unavailable.'} Helper permissions and capacity are checked separately.</p>
        </details>
      </div>}
    </section>;
}
