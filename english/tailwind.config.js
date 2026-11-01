const colors = require('tailwindcss/colors');
const families = ['slate','gray','zinc','neutral','stone','red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'];
const rgb = hex => hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v,16)).join(' ');
const lightNeutral = {50:'#1c1c1e',100:'#28282a',200:'#303034',300:'#48484a',400:'#636366',500:'#737378',600:'#c7c7cc',700:'#d1d1d6',800:'#e5e5ea',900:'#ffffff',950:'#f5f5f7'};
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: { extend: { colors: Object.fromEntries(families.map(name => [name,Object.fromEntries(Object.entries(colors[name]).map(([shade,hex]) => [shade,`rgb(var(--ui-${name}-${shade}, ${rgb(hex)}) / <alpha-value>)`]))])) } },
  plugins: [require('tailwindcss/plugin')(({addBase}) => {
    const vars = {};
    for (const name of families) for (const shade of Object.keys(colors[name])) {
      const neutral = ['slate','gray','zinc','neutral','stone'].includes(name);
      const target = {50:950,100:900,200:800,300:700,400:600,500:500,600:600,700:200,800:100,900:50,950:50}[shade];
      vars[`--ui-${name}-${shade}`] = rgb(neutral ? lightNeutral[shade] : colors[name][target]);
    }
    addBase({'html[data-theme="light"]': {...vars, 'color-scheme':'light'}, 'html[data-theme="dark"]':{'color-scheme':'dark'}});
  })],
};
