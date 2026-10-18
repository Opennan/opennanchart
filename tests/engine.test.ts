// Hand-calculated execution and indicator regressions, independent of the renderer.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {executeScript} from '../src/engine';
import type {Candle} from '../src/types';
const zero={initialCapital:10000,feeBps:0,slippageBps:0};
const bars:Candle[]=[100,120,130,150].map((open,i)=>({time:1700000000000+i*3600000,open,high:open+20,low:open-10,close:open+5,volume:100}));
const almost=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('close signals fill at next open, never at the signal close',()=>{
  const result=executeScript(bars,b=>{if(b.index===0)b.strategy.entry('long');if(b.index===1)b.strategy.close();},zero);
  assert.equal(result.trades.length,1);const trade=result.trades[0];assert.equal(trade.entryPrice,120);assert.equal(trade.exitPrice,130);assert.equal(trade.entryIndex,1);assert.equal(trade.exitIndex,2);almost(trade.pnl,10000/120*10);almost(result.metrics.finalEquity,10833.333333333334);
});
test('fees and adverse slippage apply on both sides of a long trade',()=>{
  const result=executeScript(bars,b=>{if(b.index===0)b.strategy.entry('long');if(b.index===1)b.strategy.close();},{initialCapital:10000,feeBps:100,slippageBps:100});
  const entry=121.2,exit=128.7,quantity=10000/1.01/entry,entryFee=quantity*entry*.01,exitFee=quantity*exit*.01;
  const trade=result.trades[0];almost(trade.entryPrice,entry);almost(trade.exitPrice,exit);almost(trade.quantity,quantity);almost(trade.pnl,quantity*(exit-entry)-entryFee-exitFee);almost(result.metrics.fees,entryFee+exitFee);almost(result.metrics.finalEquity,10000+trade.pnl);
});
test('short trades use the reverse price direction and adverse fills',()=>{
  const result=executeScript(bars,b=>{if(b.index===0)b.strategy.entry('short');if(b.index===1)b.strategy.close();},zero);
  assert.equal(result.trades[0].side,'short');almost(result.trades[0].pnl,-10000/120*10);assert.ok(result.metrics.maxDrawdownPercent>0);
});
test('reversal closes one position before opening the other',()=>{
  const result=executeScript(bars,b=>{if(b.index===0)b.strategy.entry('long');if(b.index===1)b.strategy.entry('short');if(b.index===2)b.strategy.close();},zero);
  assert.equal(result.trades.length,2);assert.equal(result.trades[0].exitIndex,result.trades[1].entryIndex);assert.equal(result.metrics.openPosition,null);
});
test('last bar orders remain pending, open positions are marked to market',()=>{
  const pending=executeScript(bars,b=>{if(b.index===3)b.strategy.entry('long');},zero);assert.equal(pending.metrics.pendingOrder,true);assert.equal(pending.trades.length,0);assert.equal(pending.metrics.finalEquity,10000);
  const open=executeScript(bars,b=>{if(b.index===0)b.strategy.entry('long');},zero);assert.equal(open.trades.length,0);assert.equal(open.metrics.openPosition,'long');almost(open.metrics.finalEquity,10000+10000/120*(155-120));
});
test('allocation and same-side entries do not pyramid positions',()=>{
  const result=executeScript(bars,b=>b.strategy.entry('long'),{...zero,allocationPercent:50});assert.equal(result.markers.length,1);almost(result.metrics.finalEquity,10000+5000/120*35);
});
const line:Candle[]=[1,2,3,4,5].map((close,i)=>({time:i*3600000,open:close,high:close+.1,low:close-.1,close,volume:10}));
test('SMA warmup, SMA-seeded EMA and Bollinger population deviation match known values',()=>{
  const r=executeScript(line,({ta,plot})=>{plot('sma',ta.sma(3));plot('ema',ta.ema(3));plot('upper',ta.bbands(3,2).upper);});
  assert.deepEqual(r.plots[0].values.map(p=>p.value),[2,3,4]);assert.deepEqual(r.plots[1].values.map(p=>p.value),[2,3,4]);almost(r.plots[2].values[0].value,2+2*Math.sqrt(2/3));
});
test('Wilder RSI returns 100 for only gains and 50 for a flat window',()=>{
  const rising=executeScript(line,({ta,plot})=>plot('rsi',ta.rsi(2),{pane:'indicator'}));assert.deepEqual(rising.plots[0].values.map(p=>p.value),[100,100,100]);
  const flat=executeScript(line.map(b=>({...b,open:2,high:3,low:1,close:2})),({ta,plot})=>plot('rsi',ta.rsi(2)));assert.deepEqual(flat.plots[0].values.map(p=>p.value),[50,50,50]);
});
test('ATR includes overnight gaps and uses Wilder smoothing',()=>{
  const input=[{...bars[0],high:110,low:90,close:100},{...bars[1],high:125,low:115,close:120},{...bars[2],high:140,low:120,close:130}];
  const r=executeScript(input,({ta,plot})=>plot('atr',ta.atr(2)));almost(r.plots[0].values[0].value,22.5);almost(r.plots[0].values[1].value,21.25);
});
test('history rejects future access and returns null during warmup',()=>{
  const values:(number|null)[]=[];executeScript(line,b=>values.push(b.history('close',2)));assert.deepEqual(values,[null,null,1,2,3]);assert.throws(()=>executeScript(line,b=>b.history('close',-1)),/non-negative/);
});
test('crossovers require consecutive evaluated bars and handle equality',()=>{
  const indices:number[]=[];executeScript(line,b=>{if(b.ta.crossover(b.close,2))indices.push(b.index);});assert.deepEqual(indices,[2]);
  const missed:number[]=[];executeScript(line,b=>{if(b.index!==1&&b.ta.crossover(b.close,2))missed.push(b.index);});assert.deepEqual(missed,[]);
});
test('the JavaScript interface supports inputs, logs and separate panes',()=>{
  const r=executeScript(line,`const p=input.int('Length',3,{min:2,max:5});log('ready');onBar(({ta,plot})=>plot('Mean',ta.sma(p),{pane:'indicator',color:'#7dd3fc'}));`,{inputs:{Length:2}});
  assert.equal(r.inputs.Length,2);assert.equal(r.logs[0],'ready');assert.equal(r.plots[0].pane,'indicator');assert.equal(r.plots[0].values[0].value,1.5);
});
test('validation catches invalid data, non-finite plots, async callbacks and network-like colors',()=>{
  assert.throws(()=>executeScript([bars[1],bars[0]],()=>{}),/Invalid/);assert.throws(()=>executeScript(bars,({plot})=>plot('broken',Infinity)),/non-finite/);assert.throws(()=>executeScript(bars,async()=>{}),/synchronous/);assert.throws(()=>executeScript(bars,({plot})=>plot('bad',1,{color:'url(https://invalid.example)'})),/CSS color/);assert.throws(()=>executeScript(bars,()=>{},{feeBps:-1}),/Invalid/);assert.throws(()=>executeScript(bars,'const n=1;'),/onBar/);
});
