const {fit,tokens}=require('./researchMatching');
const curriculum=require('../data/curriculum.json');
const resources=[
 {id:'fetch',title:'Connect your frontend to an API with Fetch',summary:'JavaScript React frontend backend connection: HTTP requests, JSON responses and fetch errors.',url:'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch',kind:'Guide',source:'MDN'},
 {id:'cors',title:'Understand and fix cross-origin request problems',summary:'React frontend backend connection blocked by CORS, origins and HTTP response headers.',url:'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS',kind:'Guide',source:'MDN'},
 {id:'effects',title:'Fetching data and synchronizing React Effects',summary:'React useEffect fetching backend data, cleanup and repeated requests.',url:'https://react.dev/learn/synchronizing-with-effects',kind:'Guide',source:'React documentation'},
 {id:'mern-video',title:'MERN stack video course (2025)',summary:'Connect React frontend to Node Express backend API and MongoDB in a full stack project.',url:'https://www.freecodecamp.org/news/learn-the-mern-stack-in-2025',kind:'Video course',source:'freeCodeCamp · external course page'},
 ...curriculum.topics.map(t=>({id:t.id,title:t.name,summary:t.summary,url:t.url,kind:'Guide',source:'Learning library'}))
];
function rank(query,items,limit=6){
 if(!items.length)return [];
 const corpus=items.map((r,i)=>({id:String(i),title:r.title+' '+(r.summary||''),topics:r.tags||[]}));
 const model=fit(corpus),q=model.vector(tokens(query));
 return items.map((r,i)=>{const v=model.vectors.get(String(i));const terms=[...q].filter(([t])=>v.has(t));return {...r,score:terms.reduce((s,[t,w])=>s+w*v.get(t),0),matchedTerms:terms.slice(0,4).map(([t])=>t)};}).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(({score,...r})=>r);
}
module.exports={rank,resources};
