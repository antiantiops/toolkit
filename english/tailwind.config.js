const colors = require('tailwindcss/colors');
const families = ['slate','gray','zinc','neutral','stone','red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'];
const rgb = hex => hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v,16)).join(' ');
const lightNeutral = {50:'#1c1c1e',100:'#28282a',200:'#303034',300:'#48484a',400:'#636366',500:'#737378',600:'#c7c7cc',700:'#d1d1d6',800:'#e5e5ea',900:'#ffffff',950:'#f5f5f7'};
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: { extend: { colors: Object.fromEntries(families.map(name => [name,Object.fromEntries(Object.entries(colors[name]).map(([shade,hex]) => [shade,`rgb(var(--ui-${name}-${shade}, ${rgb(hex)}) / <alpha-value>)`]))])) } },
  plugins: [require('tailwindcss/plugin')(({addBase, e}) => {
    const vars = {};
    for (const name of families) for (const shade of Object.keys(colors[name])) {
      const neutral = ['slate','gray','zinc','neutral','stone'].includes(name);
      const target = {50:950,100:900,200:800,300:700,400:600,500:500,600:600,700:200,800:100,900:50,950:50}[shade];
      vars[`--ui-${name}-${shade}`] = rgb(neutral ? lightNeutral[shade] : colors[name][target]);
    }
    addBase({'html[data-theme="light"]': {...vars, 'color-scheme':'light'}, 'html[data-theme="dark"]':{'color-scheme':'dark'}});
    // Separate color roles: a pale surface must not make its border pale too.
    const fs = require('node:fs'), path = require('node:path');
    const tokens = new Set();
    function scan(dir) { for(const item of fs.readdirSync(dir,{withFileTypes:true})) { const file=path.join(dir,item.name); if(item.isDirectory())scan(file);else if(/\.(js|css)$/.test(file)) for(const m of fs.readFileSync(file,'utf8').matchAll(/(?:(?:hover|focus|disabled|group-hover):)?(?:bg|text|border|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+(?:\/\d+)?/g))tokens.add(m[0]); } }
    scan(path.join(__dirname,'src'));
    const rules={};
    for(const token of tokens) {
      const [,variant,role,family,shade,opacity]=token.match(/^(?:(hover|focus|disabled|group-hover):)?(bg|text|border|from|to|via)-([a-z]+)-(\d+)(?:\/(\d+))?$/)||[];
      if(!role||!colors[family]?.[shade])continue;
      const neutral=['slate','gray','zinc','neutral','stone'].includes(family), n=Number(shade);
      const alpha=opacity?Number(opacity)/100:1;
      const selector='html[data-theme="light"] '+(variant==='group-hover'?'.group:hover ':'')+'.'+e(token)+(variant&&variant!=='group-hover'?':'+variant:'');
      let hex, property;
      if(role==='text') { property='color';hex=neutral?(n>=400?'#3f3f46':'#27272a'):colors[family][n>=500?800:900]; }
      else if(role==='border') {property='border-color';hex=neutral?'#b8bec8':colors[family][400];}
      else {property=role==='bg'?'background-color':`--tw-gradient-${role}`;hex=neutral?({950:'#f5f5f7',900:'#ffffff',800:'#e1e5ec',700:'#d1d7e0',600:'#bdc6d2'}[n]||'#e1e5ec'):colors[family][n>=800?200:700];}
      const a=role==='text'?Math.max(alpha,.88):role==='border'?Math.max(alpha,.75):n>=800?Math.max(alpha,.65):alpha;
      const value=`rgb(${rgb(hex)} / ${a})`;
      rules[selector]={[property]:value};
      if(role==='from') Object.assign(rules[selector],{'--tw-gradient-to':`rgb(${rgb(hex)} / 0) var(--tw-gradient-to-position)`,'--tw-gradient-from':`${value} var(--tw-gradient-from-position)`,'--tw-gradient-stops':'var(--tw-gradient-from), var(--tw-gradient-to)'});
      if(role==='to') rules[selector]['--tw-gradient-to']=`${value} var(--tw-gradient-to-position)`;
      if(role==='via') Object.assign(rules[selector],{'--tw-gradient-to':`rgb(${rgb(hex)} / 0) var(--tw-gradient-to-position)`,'--tw-gradient-stops':`var(--tw-gradient-from), ${value} var(--tw-gradient-via-position), var(--tw-gradient-to)`});
      if(role==='bg'&&!neutral&&n>=500&&n<=700&&alpha>=.5) rules[selector].color='#fff';
    }
    addBase(rules);

  })],
};
