import {test} from 'node:test';import assert from 'node:assert/strict';
import {combineIndicators,paneOwner,paneTitle,type IndicatorInstance} from '../src/studies';
import {executeScript} from '../src/engine';
const candles=[{time:0,open:10,high:12,low:9,close:11,volume:1}];
const study=(id:string,name:string,n:number):IndicatorInstance=>({id,visible:true,source:'',result:executeScript(candles,`indicator({name:'${name}',overlay:false});onBar(({plot,fill,barcolor})=>{plot('Value',${n});plot('Base',0);fill('Value','Base','#abcdef');barcolor('${n===1?'#ff0000':'#00ff00'}');});`)});
test('independent studies with common plot names keep separate panes and fill references',()=>{
 const a=study('one','First',1),b=study('two','Second',2),r=combineIndicators([a,b])!;assert.equal(r.plots.length,4);assert.equal(new Set(r.plots.map(p=>p.id)).size,4);assert.notEqual(r.plots[0].paneId,r.plots[2].paneId);
 for(const [i,s]of [[0,a],[1,b]] as const){const f=r.fills![i],from=r.plots.find(p=>p.id===f.from)!,to=r.plots.find(p=>p.id===f.to)!;assert.equal(from.values[0].value,i+1);assert.equal(to.values[0].value,0);assert.equal(from.paneId,to.paneId);assert.equal(paneTitle(from.paneId!,[a,b]),s.result.indicator!.name);assert.equal(paneOwner(from.paneId!,[a,b])?.id,s.id);}
 assert.deepEqual(r.barColors?.map(v=>v.color),['#ff0000','#00ff00']);
});
test('hidden studies contribute no plots, fills, candle colors or markers',()=>{const a=study('one','First',1),b={...study('two','Second',2),visible:false},r=combineIndicators([a,b])!;assert.equal(r.plots.length,2);assert.equal(r.fills?.length,1);assert.deepEqual(r.barColors?.map(v=>v.color),['#ff0000']);assert.equal(combineIndicators([{...a,visible:false},b]),null);});

import {validateScriptResult,validateScriptSnapshot} from '../shared/result.mjs';
test('streaming snapshot validation remains bounded to its original candle prefix',()=>{const rows=[...candles,{...candles[0],time:60000}],r=study('one','First',1).result;assert.equal(validateScriptSnapshot(r,rows),r);assert.throws(()=>validateScriptResult(r,rows),/equity series/);const forged=structuredClone(r);forged.plots[0].values[0]={index:1,time:60000,value:99};assert.throws(()=>validateScriptSnapshot(forged,rows),/plot point/);assert.throws(()=>validateScriptSnapshot(r,[{...candles[0],time:123}]),/plot point|equity point/);});
