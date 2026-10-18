// Deterministic bar-by-bar indicator and next-open strategy execution.
import type { BacktestOptions, Candle, ScriptResult, Trade, PlotStyle, ScriptShape } from '../types';
export type Source = 'open'|'high'|'low'|'close'|'volume';
export interface BarContext {
  readonly index:number; readonly time:number; readonly open:number; readonly high:number; readonly low:number; readonly close:number; readonly volume:number;
  history:(field:Source,barsAgo?:number)=>number|null;
  ta:{sma:(period:number,source?:Source)=>number|null;ema:(period:number,source?:Source)=>number|null;rsi:(period?:number,source?:Source)=>number|null;atr:(period?:number)=>number|null;highest:(period:number,source?:Source)=>number|null;lowest:(period:number,source?:Source)=>number|null;stdev:(period:number,source?:Source)=>number|null;bbands:(period?:number,multiplier?:number)=>{upper:number|null;middle:number|null;lower:number|null};crossover:(a:number|null,b:number|null,key?:string)=>boolean;crossunder:(a:number|null,b:number|null,key?:string)=>boolean};
  plot:(name:string,value:number|null,options?:{color?:string;pane?:'price'|'indicator';paneId?:string;style?:PlotStyle;lineWidth?:number;baseline?:number;opacity?:number;lineStyle?:'solid'|'dashed'|'dotted'})=>void;
  barcolor:(color:string|null,options?:{wickColor?:string;borderColor?:string})=>void;
  bgcolor:(color:string|null)=>void;
  plotshape:(name:string,condition:boolean,options?:{shape?:ScriptShape['shape'];location?:ScriptShape['location'];price?:number;color?:string;text?:string;size?:number})=>void;
  fill:(from:string,to:string,color:string)=>void;
  alert:(message:string)=>void;
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
  const trades:Trade[]=[],equityCurve:ScriptResult['equity']=[],markers:ScriptResult['markers']=[],logs:string[]=[],inputs:ScriptResult['inputs']=Object.create(null),inputDefinitions:NonNullable<ScriptResult['inputDefinitions']>=Object.create(null),alerts:NonNullable<ScriptResult['alerts']>=[],alertKeys=new Set<string>();
  const plots=new Map<string,ScriptResult['plots'][number]>(), cache=new Map<string,(number|null)[]>(), crosses=new Map<string,[number|null,number|null,number]>();
  const barColors=new Map<number,NonNullable<ScriptResult['barColors']>[number]>(),backgrounds=new Map<number,NonNullable<ScriptResult['backgrounds']>[number]>(),shapes=new Map<string,ScriptShape>(),fills=new Map<string,NonNullable<ScriptResult['fills']>[number]>(),shapeNames=new Set<string>();
  let callback:BarHandler|undefined,crossSlot=0,indicatorConfig={name:'Custom indicator',overlay:true};
  const indicator=(config:{name:string;overlay?:boolean})=>{if(callback)throw new Error('Declare indicator before onBar.');if(!config||typeof config.name!=='string'||!config.name.length||config.name.length>80||config.overlay!==undefined&&typeof config.overlay!=='boolean')throw new Error('Invalid indicator declaration.');indicatorConfig={name:config.name,overlay:config.overlay??false};};
  const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
  const checkColor=(color:string)=>{if(typeof color!=='string'||color.length>64||!/^(#[\da-f]{3,8}|(?:rgb|hsl)a?\([\d.,%+\-\s]+\)|[a-z]+)$/i.test(color))throw new Error('Use a CSS color name, hex, rgb() or hsl().');return color;};
  const checkName=(name:string)=>{if(typeof name!=='string'||name.length<1||name.length>80)throw new Error('Visual names must contain 1–80 characters.');};
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
    checkName(name);
    if(v!==null&&v!==undefined&&!finite(v))throw new Error(`Plot ${name} produced a non-finite value.`);
    const pane=style.pane??(indicatorConfig.overlay?'price':'indicator'),paneId=style.paneId??indicatorConfig.name;checkName(paneId);
    const color=checkColor(style.color??'#7dd3fc'),kind=style.style??'line',lineWidth=style.lineWidth??1.5,baseline=style.baseline??0,opacity=style.opacity??.18,lineStyle=style.lineStyle??'solid';
    if(!['line','area','histogram','columns','circles','cross'].includes(kind)||!finite(lineWidth)||lineWidth<1||lineWidth>8||!finite(baseline)||!finite(opacity)||opacity<0||opacity>1||!['solid','dashed','dotted'].includes(lineStyle))throw new Error('Invalid plot style, line width or baseline.');
    if(style.pane!==undefined&&!['price','indicator'].includes(style.pane))throw new Error('Plot pane must be price or indicator.');
    if(!plots.has(name)){
      if(plots.size>=20)throw new Error('A script can create at most 20 plots.');
      plots.set(name,{name,color,pane,paneId,style:kind,lineWidth,baseline,opacity,lineStyle,values:[]});
    }
    const series=plots.get(name)!;if(series.style!==kind||series.pane!==pane||series.paneId!==paneId||series.lineWidth!==lineWidth||series.baseline!==baseline||series.opacity!==opacity||series.lineStyle!==lineStyle)throw new Error('Keep a named plot’s style, pane, width and baseline constant. Colors can vary per bar.');
    if(v===null||v===undefined)return;
    const point={index,time:candles[index].time,value:v,color};
    if(series.values.at(-1)?.index===index)series.values[series.values.length-1]=point;else series.values.push(point);
  };
  const barcolor:BarContext['barcolor']=(color,options={})=>{if(color===null){barColors.delete(index);return;}if(options.wickColor!==undefined)checkColor(options.wickColor);if(options.borderColor!==undefined)checkColor(options.borderColor);barColors.set(index,{index,time:candles[index].time,color:checkColor(color),...(options.wickColor!==undefined?{wickColor:options.wickColor}:{}),...(options.borderColor!==undefined?{borderColor:options.borderColor}:{})});};
  const bgcolor:BarContext['bgcolor']=color=>{if(color===null){backgrounds.delete(index);return;}backgrounds.set(index,{index,time:candles[index].time,color:checkColor(color)});};
  const plotshape:BarContext['plotshape']=(name,condition,options={})=>{
    checkName(name);if(typeof condition!=='boolean')throw new Error('plotshape condition must be boolean.');if(!condition)return;
    shapeNames.add(name);if(shapeNames.size>20||shapes.size>=20000)throw new Error('Use at most 20 named shapes and 20,000 shape points.');
    const shape=options.shape??'triangle-up',location=options.location??'belowbar',size=options.size??6,text=options.text??'',price=options.price??null;
    if(!['triangle-up','triangle-down','circle','square','cross'].includes(shape)||!['abovebar','belowbar','absolute'].includes(location)||!finite(size)||size<2||size>20||typeof text!=='string'||text.length>40||(location==='absolute'&&(!finite(price)||price<=0)))throw new Error('Invalid signal shape options.');
    shapes.set(`${name}:${index}`,{index,time:candles[index].time,name,shape,location,price:location==='absolute'?price:null,color:checkColor(options.color??'#7dd3fc'),text,size});
  };
  const fill:BarContext['fill']=(from,to,color)=>{checkName(from);checkName(to);if(from===to)throw new Error('Fill requires two different plot names.');const key=JSON.stringify([from,to]);if(!fills.has(key)&&fills.size>=20)throw new Error('Use at most 20 fills.');fills.set(key,{from,to,color:checkColor(color)});};
  type InputLimits={min?:number;max?:number;step?:number;editable?:boolean};
  const defineInput=(name:string,defaultValue:number|boolean,type:'number'|'int'|'bool',limits:InputLimits={})=>{
    checkName(name);if(!Object.prototype.hasOwnProperty.call(inputs,name)&&Object.keys(inputs).length>=32)throw new Error('Use at most 32 named inputs.');
    if(limits.editable!==undefined&&typeof limits.editable!=='boolean')throw new Error('Input editable must be boolean.');
    if(type!=='bool'&&(!finite(defaultValue)||(type==='int'&&!Number.isInteger(defaultValue))||limits.min!==undefined&&!finite(limits.min)||limits.max!==undefined&&!finite(limits.max)||limits.min!==undefined&&limits.max!==undefined&&limits.min>limits.max||limits.step!==undefined&&(!finite(limits.step)||limits.step<=0||type==='int'&&!Number.isInteger(limits.step))))throw new Error('Invalid input definition.');
    if(type==='bool'&&typeof defaultValue!=='boolean')throw new Error('Boolean input needs a boolean default.');
    const editable=limits.editable!==false,overridden=editable&&Object.prototype.hasOwnProperty.call(options.inputs??{},name),v=overridden?options.inputs![name]:defaultValue;
    const valid=(x:unknown)=>type==='bool'?typeof x==='boolean':finite(x)&&(type!=='int'||Number.isInteger(x))&&(limits.min===undefined||x>=limits.min)&&(limits.max===undefined||x<=limits.max);
    if(!valid(defaultValue)||!valid(v))throw new Error(`Input ${name} is outside its range or has the wrong type.`);
    inputs[name]=v;inputDefinitions[name]={type,defaultValue,editable,...(type==='bool'?{}:{...(limits.min!==undefined?{min:limits.min}:{}),...(limits.max!==undefined?{max:limits.max}:{}),...(limits.step!==undefined?{step:limits.step}:{})})};return v;
  };
  const input={number:(name:string,value:number,limits:InputLimits={})=>defineInput(name,value,'number',limits) as number,int:(name:string,value:number,limits:InputLimits={})=>defineInput(name,value,'int',limits) as number,bool:(name:string,value:boolean,limits:{editable?:boolean}={})=>defineInput(name,value,'bool',limits) as boolean};
  const alert:BarContext['alert']=message=>{if(typeof message!=='string'||message.length<1||message.length>500)throw new Error('Alert messages must contain 1–500 characters.');const key=JSON.stringify([index,message]);if(alertKeys.has(key))return;if(alerts.length>=10000)throw new Error('Use at most 10,000 alerts per run.');alertKeys.add(key);alerts.push({index,time:candles[index].time,message,frequency:'once-per-bar-close'});};
  const log=(...args:unknown[])=>{if(logs.length<100)logs.push(args.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ').slice(0,1000));};
  if(typeof source==='function')callback=source;
  else{
    if(typeof source!=='string'||source.length>64000)throw new Error('Script source must be under 64 KB.');
    new Function('onBar','input','log','indicator',`"use strict";\n${source}`)((fn:BarHandler)=>{if(callback)throw new Error('Register one onBar callback per script.');if(typeof fn!=='function')throw new Error('onBar expects a function.');callback=fn;},input,log,indicator);
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
    const strategy=Object.freeze({get position(){return (position as Position|null)?.side??null;},get equity(){return equity;},entry:(side:'long'|'short')=>{if(side!=='long'&&side!=='short')throw new Error('Strategy side must be long or short.');pending=(position as Position|null)?.side===side?null:side;},close:()=>{pending=position?'close':null;}});
    const result:unknown=callback(Object.freeze({...bar,index,history:(s:Source,barsAgo=0)=>{field(s);if(!Number.isInteger(barsAgo)||barsAgo<0)throw new Error('History only supports non-negative lookbacks.');return value(index-barsAgo,s);},ta:Object.freeze({sma,ema,rsi,atr,highest:(p:number,s:Source='high')=>extreme(p,s,1),lowest:(p:number,s:Source='low')=>extreme(p,s,-1),stdev,bbands:(p=20,m=2)=>{if(!finite(m)||m<0)throw new Error('Invalid Bollinger multiplier.');const middle=sma(p),dev=stdev(p);return {middle,upper:middle===null||dev===null?null:middle+dev*m,lower:middle===null||dev===null?null:middle-dev*m};},crossover:(a:number|null,b:number|null,key?:string)=>cross(a,b,key,true),crossunder:(a:number|null,b:number|null,key?:string)=>cross(a,b,key,false)}),plot,barcolor,bgcolor,plotshape,fill,alert,strategy}));
    if(result&&typeof (result as {then?:unknown}).then==='function')throw new Error('onBar must be synchronous.');
  }
  const wins=trades.filter(t=>t.pnl>0),grossWins=wins.reduce((s,t)=>s+t.pnl,0),grossLosses=-trades.filter(t=>t.pnl<0).reduce((s,t)=>s+t.pnl,0);
  const fillList=[...fills.values()].filter(f=>plots.has(f.from)&&plots.has(f.to));
  for(const f of fillList)if((plots.get(f.from)!.pane!==plots.get(f.to)!.pane||plots.get(f.from)!.paneId!==plots.get(f.to)!.paneId))throw new Error('Fill plots must share a pane.');
  return {indicator:indicatorConfig,inputDefinitions,alerts,barColors:[...barColors.values()],backgrounds:[...backgrounds.values()],shapes:[...shapes.values()],fills:fillList,configuration:{initialCapital:initial,feeBps,slippageBps:slipBps,allocationPercent:allocation,fillModel:'next-open',equityModel:'bar-close'},plots:[...plots.values()],trades,equity:equityCurve,logs,inputs,markers,metrics:{initialCapital:initial,finalEquity:equity,netProfit:equity-initial,returnPercent:(equity-initial)/initial*100,maxDrawdownPercent:maxDrawdown,totalTrades:trades.length,winRate:trades.length?wins.length/trades.length*100:0,profitFactor:grossLosses>0?grossWins/grossLosses:null,fees:totalFees,openPosition:(position as Position|null)?.side??null,pendingOrder:pending!==null}};
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
