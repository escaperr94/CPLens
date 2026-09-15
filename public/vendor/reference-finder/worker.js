// CP Lens adapter for the GPL-2.0 ReferenceFinder engine; see LICENSE.txt and source.tar.gz.
import initialize from './ref.js';
let waiting;
const queue=[];
let query;
let started=false;
function put(value){if(waiting){const resolve=waiting;waiting=null;resolve(value);}else queue.push(value);}
self.onmessage=({data})=>{
  query=data;
  // Bounded database: rank 4, all seven Huzita-Justin axioms, unit square.
  const rank=data.rank===5?5:4;
  const cap=rank===5?300000:50000;
  const settings=[0,0,1,1,rank,cap,cap,2,3,7,6,5,4,1,1,5000,5000,5000,5000,.1,.342,1,0,0];
  settings.forEach(put);
  initialize({
    locateFile:name=>new URL(name,import.meta.url).href,
    print:text=>{
      if(text==='Ready'){
        if(!started){started=true;[1,.0001,5,1,query.x,query.y].forEach(put);}
        else self.postMessage({done:true});
      }else if(text.startsWith('{')){
        try{const value=JSON.parse(text);self.postMessage(value.steps?{solution:value}:{progress:value});}catch{}
      }
    },
    printErr:error=>self.postMessage({error}),
    get:async()=>queue.length?queue.shift():new Promise(resolve=>{waiting=resolve;}),
    clear:()=>{queue.length=0;},
    checkCancel:async()=>false,
  }).catch(error=>self.postMessage({error:String(error)}));
};
