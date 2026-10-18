// Validate script output outside the script's JS realm before rendering or storing it.
export function validateScriptResult(result,candles){
  const fail=message=>{throw new Error(`Invalid script result: ${message}`);};
  const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const number=v=>typeof v==='number'&&Number.isFinite(v);
  const integer=(v,max)=>number(v)&&Number.isInteger(v)&&v>=0&&v<=max;
  const text=(v,max)=>typeof v==='string'&&v.length<=max;
  const color=v=>text(v,64)&&/^(#[\da-f]{3,8}|(?:rgb|hsl)a?\([\d.,%+\-\s]+\)|[a-z]+)$/i.test(v);
  const count=candles.length;
  const point=(p)=>object(p)&&integer(p.index,count-1)&&p.time===candles[p.index]?.time;
  if(!object(result))fail('expected an object.');
  const r=result,m=r.metrics;
  if(r.indicator!==undefined&&(!object(r.indicator)||!text(r.indicator.name,80)||!r.indicator.name.length||typeof r.indicator.overlay!=='boolean'))fail('invalid indicator declaration.');
  if(!object(m)||!['initialCapital','finalEquity','netProfit','returnPercent','maxDrawdownPercent','winRate','fees'].every(k=>number(m[k]))||m.initialCapital<=0||m.maxDrawdownPercent<0||m.fees<0||m.winRate<0||m.winRate>100||!integer(m.totalTrades,10000)||!(m.profitFactor===null||number(m.profitFactor)&&m.profitFactor>=0)||![null,'long','short'].includes(m.openPosition)||typeof m.pendingOrder!=='boolean')fail('invalid backtest metrics.');
  const config=r.configuration;
  if(!object(config)||config.initialCapital!==m.initialCapital||!number(config.feeBps)||config.feeBps<0||config.feeBps>1000||!number(config.slippageBps)||config.slippageBps<0||config.slippageBps>1000||!number(config.allocationPercent)||config.allocationPercent<=0||config.allocationPercent>100||config.fillModel!=='next-open'||config.equityModel!=='bar-close')fail('invalid execution configuration.');
  if(!Array.isArray(r.plots)||r.plots.length>20)fail('too many or invalid plots.');
  const names=new Set();
  for(const p of r.plots){
    if(!object(p)||!text(p.name,80)||!p.name.length||names.has(p.name)||!color(p.color)||!['price','indicator'].includes(p.pane)||!Array.isArray(p.values)||p.values.length>count)fail('invalid plot shape or color.');
    names.add(p.name);let previous=-1;
    if(p.paneId!==undefined&&(!text(p.paneId,80)||!p.paneId.length))fail('invalid pane id.');
    if(p.style!==undefined&&!['line','area','histogram','columns','circles','cross'].includes(p.style)||p.lineWidth!==undefined&&(!number(p.lineWidth)||p.lineWidth<1||p.lineWidth>8)||p.baseline!==undefined&&!number(p.baseline)||p.opacity!==undefined&&(!number(p.opacity)||p.opacity<0||p.opacity>1)||p.lineStyle!==undefined&&!['solid','dashed','dotted'].includes(p.lineStyle))fail('invalid plot style.');
    for(const v of p.values){if(!point(v)||v.index<=previous||!number(v.value)||v.color!==undefined&&!color(v.color))fail('invalid plot point.');previous=v.index;}
  }
  for(const key of ['barColors','backgrounds']){
    const list=r[key]??[];if(!Array.isArray(list)||list.length>count)fail(`invalid ${key}.`);let previous=-1;
    for(const p of list){if(!point(p)||p.index<=previous||!color(p.color)||key==='barColors'&&(p.wickColor!==undefined&&!color(p.wickColor)||p.borderColor!==undefined&&!color(p.borderColor)))fail(`invalid ${key} point.`);previous=p.index;}
  }
  if(r.shapes!==undefined){if(!Array.isArray(r.shapes)||r.shapes.length>20000)fail('invalid shapes.');const keys=new Set(),shapeNames=new Set();for(const s of r.shapes){if(!point(s)||!text(s.name,80)||!s.name.length||!['triangle-up','triangle-down','circle','square','cross'].includes(s.shape)||!['abovebar','belowbar','absolute'].includes(s.location)||!(s.location==='absolute'?number(s.price)&&s.price>0:s.price===null)||!color(s.color)||!text(s.text,40)||!number(s.size)||s.size<2||s.size>20)fail('invalid shape point.');const key=JSON.stringify([s.name,s.index]);if(keys.has(key))fail('duplicate shape point.');keys.add(key);shapeNames.add(s.name);}if(shapeNames.size>20)fail('too many named shapes.');}
  if(r.fills!==undefined){if(!Array.isArray(r.fills)||r.fills.length>20)fail('invalid fills.');const keys=new Set();for(const f of r.fills){const from=r.plots.find(p=>p.name===f?.from),to=r.plots.find(p=>p.name===f?.to),key=JSON.stringify([f?.from,f?.to]);if(!object(f)||!from||!to||from===to||from.pane!==to.pane||from.paneId!==to.paneId||!color(f.color)||keys.has(key))fail('invalid fill.');keys.add(key);}}
  if(!Array.isArray(r.trades)||r.trades.length>10000||m.totalTrades!==r.trades.length)fail('invalid trades.');
  for(const t of r.trades){
    if(!object(t)||!['long','short'].includes(t.side)||!integer(t.entryIndex,count-1)||!integer(t.exitIndex,count-1)||t.entryIndex>t.exitIndex||t.entryTime!==candles[t.entryIndex]?.time||t.exitTime!==candles[t.exitIndex]?.time||!['entryPrice','exitPrice','quantity','grossPnl','fees','pnl','returnPercent'].every(k=>number(t[k]))||t.entryPrice<=0||t.exitPrice<=0||t.quantity<=0||t.fees<0)fail('invalid trade.');
  }
  if(!Array.isArray(r.equity)||r.equity.length!==count)fail('invalid equity series.');
  for(let i=0;i<count;i++)if(!object(r.equity[i])||r.equity[i].time!==candles[i].time||!number(r.equity[i].equity)||!number(r.equity[i].drawdownPercent)||r.equity[i].drawdownPercent<0)fail('invalid equity point.');
  if(!Array.isArray(r.markers)||r.markers.length>20000)fail('invalid markers.');
  for(const p of r.markers)if(!point(p)||!number(p.price)||p.price<=0||!['buy','sell'].includes(p.side)||!text(p.text,80))fail('invalid marker.');
  if(!Array.isArray(r.logs)||r.logs.length>100||r.logs.some(v=>!text(v,1000)))fail('invalid script log.');
  if(!object(r.inputs)||Object.keys(r.inputs).length>32||Object.entries(r.inputs).some(([k,v])=>!text(k,80)||!(number(v)||typeof v==='boolean')))fail('invalid inputs.');
  if(r.inputDefinitions!==undefined){if(!object(r.inputDefinitions)||Object.keys(r.inputDefinitions).length!==Object.keys(r.inputs).length)fail('invalid input definitions.');for(const [name,d]of Object.entries(r.inputDefinitions)){const value=r.inputs[name];if(!object(d)||!Object.hasOwn(r.inputs,name)||!['number','int','bool'].includes(d.type)||typeof d.editable!=='boolean'||(d.type==='bool'?typeof value!=='boolean'||typeof d.defaultValue!=='boolean':!number(value)||!number(d.defaultValue)||d.type==='int'&&(!Number.isInteger(value)||!Number.isInteger(d.defaultValue))||d.min!==undefined&&(!number(d.min)||value<d.min||d.defaultValue<d.min)||d.max!==undefined&&(!number(d.max)||value>d.max||d.defaultValue>d.max)||d.step!==undefined&&(!number(d.step)||d.step<=0||d.type==='int'&&!Number.isInteger(d.step))))fail('invalid input definition.');if(!d.editable&&value!==d.defaultValue)fail('locked input was overridden.');}}
  if(r.alerts!==undefined){if(!Array.isArray(r.alerts)||r.alerts.length>10000)fail('invalid alerts.');const keys=new Set();for(const a of r.alerts){const key=JSON.stringify([a?.index,a?.message]);if(!point(a)||!text(a.message,500)||!a.message.length||a.frequency!=='once-per-bar-close'||keys.has(key))fail('invalid alert.');keys.add(key);}}
  return r;
}
