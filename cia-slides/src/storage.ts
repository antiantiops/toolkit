import type {Message} from './types';
const key='ai-body.conversation.v1';
export function load():Message[]{try{const d=JSON.parse(localStorage.getItem(key)||'null');if(d?.version!==1||!Array.isArray(d.messages)||d.messages.length>200)return [];return d.messages.filter((m:Message)=>m&&typeof m.id==='string'&&['user','assistant'].includes(m.role)&&typeof m.content==='string'&&m.content.length<=64000).map((m:Message)=>({id:m.id,role:m.role,content:m.content,modelLabel:typeof m.modelLabel==='string'?m.modelLabel:undefined,demo:m.demo===true}));}catch{return [];}}
export function save(messages:Message[]){try{localStorage.setItem(key,JSON.stringify({version:1,messages:messages.slice(-200)}));return true;}catch{return false;}}
