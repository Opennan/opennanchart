// OHLCV JSON and numeric CSV import; normalization is shared with the public API.
import {normalizeCandles} from '../src/data';
import type {CandleInput} from '../src/types';
export function parseCandleText(text:string){
  if(text.length>4*1024*1024)throw new Error('Import up to 4 MB of candle data.');
  const trimmed=text.trim();if(!trimmed)throw new Error('Paste candle JSON or CSV first.');
  if(trimmed.startsWith('[')||trimmed.startsWith('{')){
    const parsed=JSON.parse(trimmed);const rows=Array.isArray(parsed)?parsed:parsed.candles??parsed.ohlcv;
    if(!Array.isArray(rows))throw new Error('Provide a candle array, or an object containing candles.');
    return normalizeCandles(rows as CandleInput[]);
  }
  const lines=trimmed.split(/\r?\n/).filter(Boolean),first=lines[0].split(',').map(x=>x.trim().toLowerCase()),header=first.includes('open');
  const names=['time','open','high','low','close','volume'],indexes=header?names.map(name=>name==='time'?first.findIndex(x=>['time','timestamp','date'].includes(x)):first.indexOf(name)):names.map((_,i)=>i);
  if(indexes.some(i=>i<0))throw new Error('CSV headers must include time, open, high, low, close and volume.');
  return normalizeCandles(lines.slice(header?1:0).map(line=>{const cells=line.split(',').map(x=>x.trim());return indexes.map((index,i)=>{const raw=cells[index];if(!raw)throw new Error('Every CSV row needs six candle values.');if(i===0&&!Number.isFinite(Number(raw)))return Date.parse(raw);return Number(raw);}) as [number,number,number,number,number,number];}));
}
