export type ModelConfig={id:string;label:string;provider:string;model:string};
export type Message={id:string;role:'user'|'assistant';content:string;modelLabel?:string;demo?:boolean};
export type Phase='idle'|'thinking'|'responding';
