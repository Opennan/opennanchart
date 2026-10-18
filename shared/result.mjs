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
  if(!object(m)||!['initialCapital','finalEquity','netProfit','returnPercent','maxDrawdownPercent','winRate','fees'].every(k=>number(m[k]))||m.initialCapital<=0||m.maxDrawdownPercent<0||m.fees<0||m.winRate<0||m.winRate>100||!integer(m.totalTrades,10000)||!(m.profitFactor===null||number(m.profitFactor)&&m.profitFactor>=0)||![null,'long','short'].includes(m.openPosition)||typeof m.pendingOrder!=='boolean')fail('invalid backtest metrics.');
  const config=r.configuration;
  if(!object(config)||config.initialCapital!==m.initialCapital||!number(config.feeBps)||config.feeBps<0||config.feeBps>1000||!number(config.slippageBps)||config.slippageBps<0||config.slippageBps>1000||!number(config.allocationPercent)||config.allocationPercent<=0||config.allocationPercent>100||config.fillModel!=='next-open'||config.equityModel!=='bar-close')fail('invalid execution configuration.');
  if(!Array.isArray(r.plots)||r.plots.length>20)fail('too many or invalid plots.');
  const names=new Set();
  for(const p of r.plots){
    if(!object(p)||!text(p.name,80)||!p.name.length||names.has(p.name)||!color(p.color)||!['price','indicator'].includes(p.pane)||!Array.isArray(p.values)||p.values.length>count)fail('invalid plot shape or color.');
    names.add(p.name);let previous=-1;
    for(const v of p.values){if(!point(v)||v.index<=previous||!number(v.value))fail('invalid plot point.');previous=v.index;}
  }
  if(!Array.isArray(r.trades)||r.trades.length>10000||m.totalTrades!==r.trades.length)fail('invalid trades.');
  for(const t of r.trades){
    if(!object(t)||!['long','short'].includes(t.side)||!integer(t.entryIndex,count-1)||!integer(t.exitIndex,count-1)||t.entryIndex>t.exitIndex||t.entryTime!==candles[t.entryIndex]?.time||t.exitTime!==candles[t.exitIndex]?.time||!['entryPrice','exitPrice','quantity','grossPnl','fees','pnl','returnPercent'].every(k=>number(t[k]))||t.entryPrice<=0||t.exitPrice<=0||t.quantity<=0||t.fees<0)fail('invalid trade.');
  }
  if(!Array.isArray(r.equity)||r.equity.length!==count)fail('invalid equity series.');
  for(let i=0;i<count;i++)if(!object(r.equity[i])||r.equity[i].time!==candles[i].time||!number(r.equity[i].equity)||!number(r.equity[i].drawdownPercent)||r.equity[i].drawdownPercent<0)fail('invalid equity point.');
  if(!Array.isArray(r.markers)||r.markers.length>20000)fail('invalid markers.');
  for(const p of r.markers)if(!point(p)||!number(p.price)||p.price<=0||!['buy','sell'].includes(p.side)||!text(p.text,80))fail('invalid marker.');
  if(!Array.isArray(r.logs)||r.logs.length>100||r.logs.some(v=>!text(v,1000)))fail('invalid script log.');
  if(!object(r.inputs)||Object.keys(r.inputs).length>32||Object.entries(r.inputs).some(([k,v])=>!text(k,80)||!number(v)))fail('invalid inputs.');
  return r;
}
