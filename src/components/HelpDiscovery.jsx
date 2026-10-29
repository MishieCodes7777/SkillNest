import React,{useState} from 'react';
import {Link} from 'react-router-dom';
import {api} from '../utils/api';
export default function HelpDiscovery({text}){
 const [query,setQuery]=useState(''),[result,setResult]=useState(null),[searched,setSearched]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const input=text===undefined?query:text,current=searched===input?result:null;
 async function search(){setBusy(true);setError('');setResult(null);try{const data=await api('/api/help/discover',{method:'POST',body:JSON.stringify({text:input})});setResult(data);setSearched(input);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="learn-card" aria-label="Find existing help"><h2>Find existing help</h2><p>Describe what is going wrong. Look for an existing discussion or a teaching resource before posting.</p>
 {text===undefined&&<label>Your question<textarea className="learn-input" style={{width:'100%',margin:'12px 0'}} rows={3} maxLength={6500} value={query} onChange={e=>setQuery(e.target.value)} placeholder="I am unable to connect my React with backend"/></label>}
 <button type="button" className="learn-primary" disabled={busy||input.trim().length<8} onClick={search}>{busy?'Finding help…':'Find discussions & resources'}</button>
 {error&&<p role="alert">{error}</p>}
 {current&&<div aria-live="polite"><h3 style={{marginTop:24}}>Existing discussions</h3>{current.discussions.length?current.discussions.map(r=><Link className="learn-recommendation" key={r.id} to={r.url}><strong>{r.title}</strong><p>{r.status} · {r.answer_count} answers</p><p>{r.summary}</p></Link>):<p>No matching public discussion was found. You can still ask the community.</p>}
 <h3 style={{marginTop:24}}>Videos & learning resources</h3>{current.resources.length?current.resources.map(r=><a className="learn-recommendation" key={r.id} href={r.url} target="_blank" rel="noopener noreferrer"><strong>{r.title} ↗</strong><p>{r.kind} · {r.source}</p><p>{r.summary}</p></a>):<p>No matching resource in the library yet.</p>}<p className="learn-fine">{current.notice}</p><Link to="/help/ask">Still stuck? Ask a question →</Link></div>}
 </section>;
}
