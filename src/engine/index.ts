// Deterministic bar-by-bar indicator and next-open strategy execution.
import type { BacktestOptions, Candle, ScriptResult, Trade } from '../types';
export type Source = 'open'|'high'|'low'|'close'|'volume';
export interface BarContext {
  readonly index:number; readonly time:number; readonly open:number; readonly high:number; readonly low:number; readonly close:number; readonly volume:number;
  history:(field:Source,barsAgo?:number)=>number|null;
  ta:{sma:(period:number,source?:Source)=>number|null;ema:(period:number,source?:Source)=>number|null;rsi:(period?:number,source?:Source)=>number|null;atr:(period?:number)=>number|null;highest:(period:number,source?:Source)=>number|null;lowest:(period:number,source?:Source)=>number|null;stdev:(period:number,source?:Source)=>number|null;bbands:(period?:number,multiplier?:number)=>{upper:number|null;middle:number|null;lower:number|null};crossover:(a:number|null,b:number|null,key?:string)=>boolean;crossunder:(a:number|null,b:number|null,key?:string)=>boolean};
  plot:(name:string,value:number|null,options?:{color?:string;pane?:'price'|'indicator'})=>void;
  strategy:{readonly position:'long'|'short'|null;readonly equity:number;entry:(side:'long'|'short')=>void;close:()=>void};
}
export type BarHandler=(bar:BarContext)=>void;

/** Direct execution is for trusted code. Use runSandboxedScript for user source. */
export function executeScript(candles:readonly Candle[],source:string|BarHandler,options:BacktestOptions={}):ScriptResult {
  // Keep this function self-contained: the browser serializes it into an isolated worker.
  if(!Array.isArray(candles)||candles.length>10000) throw new Error('Use at most 10,000 candles per run.');
  for(let n=0;n<candles.length;n++){
    const c=candles[n];
    if(!c||![c.time,c.open,c.high,c.low,c.close,c.volume].every(Number.isFinite)||!Number.isSafeInteger(c.time)||c.time<0||Math.min(c.open,c.high,c.low,c.close)<=0||c.volume<0||c.high<Math.max(c.open,c.low,c.close)||c.low>Math.min(c.open,c.high,c.close)||(n>0&&c.time<=candles[n-1].time)) throw new Error('Invalid or unordered candle data.');
  }
  const initial=options.initialCapital??10000, feeBps=options.feeBps??10, slipBps=options.slippageBps??2, allocation=options.allocationPercent??100;
  if(!Number.isFinite(initial)||initial<=0||!Number.isFinite(feeBps)||feeBps<0||feeBps>1000||!Number.isFinite(slipBps)||slipBps<0||slipBps>1000||!Number.isFinite(allocation)||allocation<=0||allocation>100) throw new Error('Invalid backtest capital, fees, slippage or allocation.');
  const fee=feeBps/10000,slip=slipBps/10000;
  let index=-1,cash=initial,equity=initial,peak=initial,maxDrawdown=0,totalFees=0;
  type Position={side:'long'|'short';price:number;quantity:number;entryTime:number;entryIndex:number;entryFee:number};
  let position:Position|null=null,pending:'long'|'short'|'close'|null=null;
  const trades:Trade[]=[],equityCurve:ScriptResult['equity']=[],markers:ScriptResult['markers']=[],logs:string[]=[],inputs:Record<string,number>=Object.create(null);
  const plots=new Map<string,ScriptResult['plots'][number]>(), cache=new Map<string,(number|null)[]>(), crosses=new Map<string,[number|null,number|null,number]>();
  let callback:BarHandler|undefined,crossSlot=0;
  const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
  const period=(p:number)=>{if(!Number.isInteger(p)||p<1||p>5000)throw new Error('Indicator periods must be integers from 1 to 5,000.');return p;};
  const field=(s:Source='close')=>{if(!['open','high','low','close','volume'].includes(s))throw new Error('Unknown indicator source.');return s;};
  const value=(n:number,s:Source='close')=>candles[n]?.[s]??null;
  const sma=(p:number,s:Source='close'):number|null=>{period(p);field(s);if(index+1<p)return null;let sum=0;for(let n=index-p+1;n<=index;n++)sum+=candles[n][s];return sum/p;};
  const ema=(p:number,s:Source='close'):number|null=>{
    period(p);field(s);const key=`ema:${p}:${s}`,arr=cache.get(key)??[];cache.set(key,arr);
    for(let n=arr.length;n<=index;n++){
      if(n<p-1){arr.push(null);continue;}
      if(n===p-1){let sum=0;for(let j=0;j<p;j++)sum+=candles[j][s];arr.push(sum/p);}
      else arr.push(candles[n][s]*(2/(p+1))+(arr[n-1] as number)*(1-2/(p+1)));
    }return arr[index]??null;
  };
  const rma=(key:string,p:number,at:(n:number)=>number,start:number):number|null=>{
    period(p);const arr=cache.get(key)??[];cache.set(key,arr);
    for(let n=arr.length;n<=index;n++){
      if(n<start+p-1){arr.push(null);continue;}
      if(n===start+p-1){let sum=0;for(let j=start;j<=n;j++)sum+=at(j);arr.push(sum/p);}
      else arr.push(((arr[n-1] as number)*(p-1)+at(n))/p);
    }return arr[index]??null;
  };
  const rsi=(p=14,s:Source='close'):number|null=>{
    period(p);field(s);
    const gain=rma(`rsi-g:${p}:${s}`,p,n=>Math.max(candles[n][s]-candles[n-1][s],0),1);
    const loss=rma(`rsi-l:${p}:${s}`,p,n=>Math.max(candles[n-1][s]-candles[n][s],0),1);
    if(gain===null||loss===null)return null;
    return loss===0?(gain===0?50:100):100-100/(1+gain/loss);
  };
  const atr=(p=14)=>rma(`atr:${p}`,p,n=>{const c=candles[n],prev=candles[n-1]?.close??c.open;return Math.max(c.high-c.low,Math.abs(c.high-prev),Math.abs(c.low-prev));},0);
  const extreme=(p:number,s:Source,direction:1|-1)=>{period(p);field(s);if(index+1<p)return null;let result=direction===1?-Infinity:Infinity;for(let n=index-p+1;n<=index;n++)result=direction===1?Math.max(result,candles[n][s]):Math.min(result,candles[n][s]);return result;};
  const stdev=(p:number,s:Source='close')=>{const mean=sma(p,s);if(mean===null)return null;let sum=0;for(let n=index-p+1;n<=index;n++)sum+=(candles[n][s]-mean)**2;return Math.sqrt(sum/p);};
  const cross=(a:number|null,b:number|null,key:string|undefined,up:boolean)=>{
    const id=key??`slot:${crossSlot++}`,prev=crosses.get(`${up}:${id}`);crosses.set(`${up}:${id}`,[a,b,index]);
    return !!prev&&prev[2]===index-1&&finite(prev[0])&&finite(prev[1])&&finite(a)&&finite(b)&&(up?prev[0]<=prev[1]&&a>b:prev[0]>=prev[1]&&a<b);
  };
  const plot:BarContext['plot']=(name,v,style={})=>{
    if(typeof name!=='string'||name.length<1||name.length>80)throw new Error('Plot names must contain 1–80 characters.');
    if(v===null||v===undefined)return;
    if(!finite(v))throw new Error(`Plot ${name} produced a non-finite value.`);
    if(!plots.has(name)){
      if(plots.size>=20)throw new Error('A script can create at most 20 plots.');
      const color=style.color??'#7dd3fc';
      if(typeof color!=='string'||color.length>64||!/^(#[\da-f]{3,8}|(?:rgb|hsl)a?\([\d.,%+\-\s]+\)|[a-z]+)$/i.test(color))throw new Error('Use a CSS color name, hex, rgb() or hsl() for plots.');
      if(style.pane!==undefined&&!['price','indicator'].includes(style.pane))throw new Error('Plot pane must be price or indicator.');
      plots.set(name,{name,color,pane:style.pane??'price',values:[]});
    }
    const series=plots.get(name)!;const point={index,time:candles[index].time,value:v};
    if(series.values.at(-1)?.index===index)series.values[series.values.length-1]=point;else series.values.push(point);
  };
  const input={number:(name:string,defaultValue:number,limits:{min?:number;max?:number}={})=>{
    if(typeof name!=='string'||name.length>80||Object.keys(inputs).length>=32)throw new Error('Use at most 32 named inputs.');
    const v=Object.prototype.hasOwnProperty.call(options.inputs??{},name)?options.inputs![name]:defaultValue;
    if(!finite(v)||(limits.min!==undefined&&v<limits.min)||(limits.max!==undefined&&v>limits.max))throw new Error(`Input ${name} is outside its range.`);
    inputs[name]=v;return v;
  },int:(name:string,defaultValue:number,limits:{min?:number;max?:number}={})=>{const v=input.number(name,defaultValue,limits);if(!Number.isInteger(v))throw new Error(`Input ${name} must be an integer.`);return v;}};
  const log=(...args:unknown[])=>{if(logs.length<100)logs.push(args.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ').slice(0,1000));};
  if(typeof source==='function')callback=source;
  else{
    if(typeof source!=='string'||source.length>64000)throw new Error('Script source must be under 64 KB.');
    new Function('onBar','input','log',`"use strict";\n${source}`)((fn:BarHandler)=>{if(callback)throw new Error('Register one onBar callback per script.');if(typeof fn!=='function')throw new Error('onBar expects a function.');callback=fn;},input,log);
  }
  if(!callback)throw new Error('Register your script with onBar(({ ta, plot, strategy }) => { ... }).');
  const fillClose=(bar:Candle,n:number)=>{
    if(!position)return;
    const pos=position,dir=pos.side==='long'?1:-1,price=bar.open*(1-dir*slip),grossPnl=pos.quantity*(price-pos.price)*dir,exitFee=pos.quantity*price*fee;
    cash+=grossPnl-exitFee;totalFees+=exitFee;
    const pnl=grossPnl-pos.entryFee-exitFee;
    trades.push({side:pos.side,entryTime:pos.entryTime,exitTime:bar.time,entryIndex:pos.entryIndex,exitIndex:n,entryPrice:pos.price,exitPrice:price,quantity:pos.quantity,grossPnl,fees:pos.entryFee+exitFee,pnl,returnPercent:pnl/(pos.price*pos.quantity)*100});
    markers.push({index:n,time:bar.time,price,side:dir===1?'sell':'buy',text:'Close'});position=null;
  };
  const fillEntry=(side:'long'|'short',bar:Candle,n:number)=>{
    if(position?.side===side)return;
    if(position)fillClose(bar,n);
    if(cash<=0)return;
    const dir=side==='long'?1:-1,price=bar.open*(1+dir*slip),notional=cash*(allocation/100)/(1+fee),quantity=notional/price,entryFee=notional*fee;
    cash-=entryFee;totalFees+=entryFee;position={side,price,quantity,entryTime:bar.time,entryIndex:n,entryFee};
    markers.push({index:n,time:bar.time,price,side:side==='long'?'buy':'sell',text:side==='long'?'Long':'Short'});
  };
  for(index=0;index<candles.length;index++){
    const bar=candles[index],order=pending;pending=null;
    if(order==='close')fillClose(bar,index);else if(order)fillEntry(order,bar,index);
    const pos=position as Position|null;
    equity=cash+(pos?pos.quantity*(bar.close-pos.price)*(pos.side==='long'?1:-1):0);
    if(!Number.isFinite(equity))throw new Error('Backtest equity overflowed.');
    peak=Math.max(peak,equity);const drawdown=peak>0?(peak-equity)/peak*100:0;maxDrawdown=Math.max(maxDrawdown,drawdown);
    equityCurve.push({time:bar.time,equity,drawdownPercent:drawdown});crossSlot=0;
    const strategy=Object.freeze({get position(){return (position as Position|null)?.side??null;},get equity(){return equity;},entry:(side:'long'|'short')=>{if(side!=='long'&&side!=='short')throw new Error('Strategy side must be long or short.');pending=side;},close:()=>{pending='close';}});
    const result:unknown=callback(Object.freeze({...bar,index,history:(s:Source,barsAgo=0)=>{field(s);if(!Number.isInteger(barsAgo)||barsAgo<0)throw new Error('History only supports non-negative lookbacks.');return value(index-barsAgo,s);},ta:Object.freeze({sma,ema,rsi,atr,highest:(p:number,s:Source='high')=>extreme(p,s,1),lowest:(p:number,s:Source='low')=>extreme(p,s,-1),stdev,bbands:(p=20,m=2)=>{if(!finite(m)||m<0)throw new Error('Invalid Bollinger multiplier.');const middle=sma(p),dev=stdev(p);return {middle,upper:middle===null||dev===null?null:middle+dev*m,lower:middle===null||dev===null?null:middle-dev*m};},crossover:(a:number|null,b:number|null,key?:string)=>cross(a,b,key,true),crossunder:(a:number|null,b:number|null,key?:string)=>cross(a,b,key,false)}),plot,strategy}));
    if(result&&typeof (result as {then?:unknown}).then==='function')throw new Error('onBar must be synchronous.');
  }
  const wins=trades.filter(t=>t.pnl>0),grossWins=wins.reduce((s,t)=>s+t.pnl,0),grossLosses=-trades.filter(t=>t.pnl<0).reduce((s,t)=>s+t.pnl,0);
  return {plots:[...plots.values()],trades,equity:equityCurve,logs,inputs,markers,metrics:{initialCapital:initial,finalEquity:equity,netProfit:equity-initial,returnPercent:(equity-initial)/initial*100,maxDrawdownPercent:maxDrawdown,totalTrades:trades.length,winRate:trades.length?wins.length/trades.length*100:0,profitFactor:grossLosses>0?grossWins/grossLosses:null,fees:totalFees,openPosition:(position as Position|null)?.side??null,pendingOrder:pending!==null}};
}
export const INDICATORS=[
  {id:'sma',name:'Simple moving average',description:'The mean close over the last N bars.'},
  {id:'ema',name:'Exponential moving average',description:'An SMA-seeded, exponentially weighted average.'},
  {id:'rsi',name:'Relative strength index',description:'Wilder RSI, with a 0–100 range.'},
  {id:'bbands',name:'Bollinger bands',description:'A moving average with population standard-deviation bands.'},
  {id:'atr',name:'Average true range',description:'Wilder-smoothed true range.'},
  {id:'highest',name:'Highest high',description:'The maximum high over a rolling window.'},
  {id:'lowest',name:'Lowest low',description:'The minimum low over a rolling window.'},
  {id:'stdev',name:'Standard deviation',description:'Population standard deviation over a rolling window.'},
];
export type { Candle, ScriptResult, BacktestOptions } from '../types';
