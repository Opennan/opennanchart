// Validate in a separate, untampered realm before any output reaches the UI or bridge.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {executeScript} from '../src/engine';import {sampleCandles} from '../src/data';import {validateScriptResult} from '../shared/result.mjs';
const rows=sampleCandles(30),valid=executeScript(rows,({ta,plot})=>plot('SMA',ta.sma(3)));
test('valid engine output passes the outside-realm schema',()=>assert.equal(validateScriptResult(valid,rows),valid));
test('invalid output cannot smuggle CSS requests or missing arrays into rendering',()=>{
  const r=structuredClone(valid);r.plots[0].color='url(https://invalid.example)';assert.throws(()=>validateScriptResult(r,rows),/plot/);
  const missing:any=structuredClone(valid);delete missing.plots[0].values;assert.throws(()=>validateScriptResult(missing,rows),/plot/);
  const badTrade:any=structuredClone(valid);badTrade.trades={};assert.throws(()=>validateScriptResult(badTrade,rows),/trades/);
});
test('non-finite metrics, stale times and excessive plots are rejected',()=>{
  const r=structuredClone(valid);r.metrics.finalEquity=Infinity;assert.throws(()=>validateScriptResult(r,rows),/metrics/);
  const stale=structuredClone(valid);stale.plots[0].values[0].time++;assert.throws(()=>validateScriptResult(stale,rows),/point/);
  const large=structuredClone(valid);large.plots=Array.from({length:21},()=>valid.plots[0]);assert.throws(()=>validateScriptResult(large,rows),/plots/);
});
