import {test} from 'node:test';import assert from 'node:assert/strict';
import {executeScript} from '../src/engine';import {sampleCandles} from '../src/data';import {TEMPLATES} from '../src/scripting/templates';import {validateScriptResult} from '../shared/result.mjs';import {validateCustomTool} from '../shared/tools.mjs';
const rows=sampleCandles(100);
test('every shipped example runs and passes outside-realm validation',()=>{for(const [name,t]of Object.entries(TEMPLATES)){const r=executeScript(rows,t.source);assert.equal(validateScriptResult(r,rows),r,name);}});
test('warmup nulls preserve plot declaration order for opaque layered visuals',()=>{const r=executeScript(rows,TEMPLATES.madrid.source);assert.deepEqual(r.plots.map(p=>p.name),['Bear area','Bull area','Sentiment','Midpoint','Overbought','Oversold']);assert.equal(r.plots[1].values[0].index,1);});
test('engulfing matches strict user predicate, colors and recorded alerts',()=>{
  const values=[[10,12],[13,9],[8,12],[12,8],[8,10],[10,7.5]];
  const data=values.map(([open,close],i)=>({time:i*60000,open,close,high:Math.max(open,close)+1,low:Math.min(open,close)-1,volume:1}));const r=executeScript(data,TEMPLATES.engulfing.source);
  assert.deepEqual(r.barColors?.map(c=>[c.index,c.color]),[[1,'#ffff00'],[5,'#ffff00']]);assert.deepEqual(r.alerts?.map(a=>a.index),[1,5]);assert.deepEqual(r.shapes?.map(s=>s.index),[1,5]);
  const disabled=executeScript(data,TEMPLATES.engulfing.source,{inputs:{'Show signal shapes':false,'Record alerts':false}});assert.equal(disabled.shapes?.length,0);assert.equal(disabled.alerts?.length,0);assert.equal(disabled.barColors?.length,2);
});
test('Madrid smoothing matches an independent reference recurrence including null startup',()=>{
  const data=rows.slice(0,40),actual=executeScript(data,TEMPLATES.madrid.source),series=actual.plots.find(p=>p.name==='Sentiment')!.values;
  const close=data.map(c=>c.close),raw:(number|null)[]=[],filter:(number|null)[]=[],expected:{index:number;value:number}[]=[],a=Math.exp(-Math.SQRT2*Math.PI/5),b=2*a*Math.cos(Math.SQRT2*Math.PI/5),c=-a*a;
  for(let i=0;i<data.length;i++){const prices=close.slice(Math.max(0,i-17),i+1),min=Math.min(...prices),max=Math.max(...prices),bull=(close[i]-min)/min*100,bear=(max-close[i])/max*100;raw[i]=bull+bear===0?null:bull/(bull+bear)*100;filter[i]=raw[i]===null?null:(1-b-c)*(raw[i]!+(raw[i-1]??0))/2+b*(filter[i-1]??0)+c*(filter[i-2]??0);if(filter[i]!==null)expected.push({index:i,value:filter[i]!});}
  assert.equal(series.length,expected.length);for(let i=0;i<series.length;i++){assert.equal(series[i].index,expected[i].index);assert.ok(Math.abs(series[i].value-expected[i].value)<1e-10);}
  assert.equal(actual.indicator?.overlay,false);assert.equal(actual.plots.find(p=>p.name==='Bear area')?.opacity,1);assert.equal(actual.plots.find(p=>p.name==='Overbought')?.lineStyle,'dotted');
  const plain=executeScript(data,TEMPLATES.madrid.source,{inputs:{Smooth:false}}).plots.find(p=>p.name==='Sentiment')!.values;for(const p of plain)assert.ok(Math.abs(p.value-raw[p.index]!)<1e-10);
});
test('inputs preserve types and locked defaults and reject bad ranges',()=>{
  const source="const x=input.int('Locked',5,{min:1,max:10,editable:false});const y=input.bool('Enabled',true);onBar(({plot})=>plot('Value',y?x:0));";
  const r=executeScript(rows,source,{inputs:{Locked:9,Enabled:false}});assert.equal(r.inputs.Locked,5);assert.equal(r.inputs.Enabled,false);assert.equal(r.inputDefinitions?.Locked.editable,false);assert.equal(r.plots[0].values[0].value,0);
  assert.throws(()=>executeScript(rows,source,{inputs:{Enabled:1}}),/type/);assert.throws(()=>executeScript(rows,"const x=input.int('x',5,{min:6});onBar(()=>{});"),/range/);
});
test('visual points preserve dynamic colors and reject malicious extensions outside worker',()=>{
  const r=executeScript(rows,({index,close,plot,barcolor,bgcolor,plotshape,fill,alert})=>{plot('A',close,{color:index%2?'red':'lime'});plot('B',close*.99);fill('A','B','#7dd3fc20');barcolor('yellow',{wickColor:'white',borderColor:'orange'});bgcolor('#ff000010');plotshape('Signal',true,{shape:'square'});alert('one');alert('one');});
  assert.equal(r.alerts?.length,rows.length);assert.equal(r.plots[0].values[0].color,'lime');assert.equal(r.plots[0].values[1].color,'red');assert.equal(validateScriptResult(r,rows),r);
  const color=structuredClone(r);color.plots[0].values[0].color='url(https://invalid.example)';assert.throws(()=>validateScriptResult(color,rows),/point/);
  const shape=structuredClone(r);shape.shapes![0].location='absolute';shape.shapes![0].price=null;assert.throws(()=>validateScriptResult(shape,rows),/shape/);
  const locked=structuredClone(r);locked.inputs.X=2;locked.inputDefinitions!.X={type:'int',defaultValue:1,editable:false};assert.throws(()=>validateScriptResult(locked,rows),/locked/);
});
test('named panes are isolated and fills cannot cross pane boundaries',()=>{
  assert.throws(()=>executeScript(rows,"onBar(({plot,close,fill})=>{plot('A',close,{pane:'indicator',paneId:'A'});plot('B',close,{pane:'indicator',paneId:'B'});fill('A','B','red');});"),/pane/);
});
test('custom tools allow bounded primitives and no executable or URL definitions',()=>{
  const tool=validateCustomTool({id:'CustomTool:Range',name:'Range',primitives:[{type:'rectangle',from:0,to:1,fill:'#7dd3fc20'},{type:'text',from:0,text:'Range'}]});assert.equal(tool.primitives.length,2);
  assert.throws(()=>validateCustomTool({...tool,id:'Cursor'}),/Invalid/);assert.throws(()=>validateCustomTool({...tool,primitives:[{type:'eval',from:0}]}),/Invalid/);assert.throws(()=>validateCustomTool({...tool,primitives:[{type:'line',from:0,to:1,color:'url(x)'}]}),/Invalid/);
});
