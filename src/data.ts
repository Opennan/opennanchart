import type { Candle, CandleInput, CandleTuple } from './types';
export const MAX_CANDLES=10000;
export function normalizeCandle(input:CandleInput):Candle {
  const c=Array.isArray(input)?{time:input[0],open:input[1],high:input[2],low:input[3],close:input[4],volume:input[5]}:{...input};
  if(!c || !['time','open','high','low','close','volume'].every(k=>Number.isFinite(c[k as keyof Candle]))) throw new Error('Every candle needs finite time, open, high, low, close and volume values.');
  if(!Number.isSafeInteger(c.time)||c.time<0) throw new Error('Candle time must be Unix milliseconds, as a non-negative safe integer.');
  if(c.high<Math.max(c.open,c.close,c.low)||c.low>Math.min(c.open,c.close,c.high)) throw new Error('Candle high/low do not contain its open and close.');
  if(Math.min(c.open,c.high,c.low,c.close)<=0||c.volume<0) throw new Error('Prices must be positive and volume cannot be negative.');
  return c;
}
export function normalizeCandles(inputs:readonly CandleInput[]):Candle[] {
  if(!Array.isArray(inputs)||inputs.length>MAX_CANDLES) throw new Error(`Provide an array of at most ${MAX_CANDLES} candles.`);
  const rows=inputs.map(normalizeCandle);
  for(let i=1;i<rows.length;i++) if(rows[i].time<=rows[i-1].time) throw new Error('Candles must have unique, strictly increasing timestamps.');
  return rows;
}
export function updateCandle(rows:readonly Candle[],input:CandleInput):Candle[] {
  const c=normalizeCandle(input), last=rows.at(-1);
  if(last&&c.time<last.time) throw new Error('An update can only replace the latest candle or append a newer candle.');
  if(last?.time===c.time) return [...rows.slice(0,-1),c];
  if(rows.length>=MAX_CANDLES) throw new Error(`The chart supports up to ${MAX_CANDLES} candles. Replace the dataset to load another range.`);
  return [...rows,c];
}
export function toTuples(rows:readonly Candle[]):CandleTuple[]{return rows.map(c=>[c.time,c.open,c.high,c.low,c.close,c.volume]);}
export function sampleCandles(count=700,interval=3600000):Candle[]{
  let seed=7907,price=67280; const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const end=Math.floor(Date.UTC(2026,9,18,7)/interval)*interval;
  return Array.from({length:count},(_,i)=>{const open=price;price=Math.max(1,price+(random()-.48)*560+Math.sin(i/24)*55);return {time:end-(count-i)*interval,open,high:Math.max(open,price)+random()*250,low:Math.min(open,price)-random()*250,close:price,volume:10+random()*700};});
}
