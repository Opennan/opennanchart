// Real Chromium + compiled demo + stdio MCP integration. No browser or engine mocks.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createBridgeServer} from '../server/serve.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {resolve} from 'node:path';

const port=3032,base=`http://127.0.0.1:${port}`;let server=createBridgeServer({port});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL??(process.platform==='darwin'?'chrome':undefined)});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));await mkdir('test-results',{recursive:true});
await page.addInitScript(()=>{window.canvasTimes=[];const original=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(typeof text==='string'&&/\d:\d/.test(text)){window.canvasTimes.push(text);if(window.canvasTimes.length>100)window.canvasTimes.shift();}return original.call(this,text,...args);};});
// Retain the real SSE transport, but deterministically widen the open/hello race.
await page.addInitScript(()=>{const NativeEventSource=window.EventSource;window.EventSource=class extends NativeEventSource{set onmessage(handler){super.onmessage=event=>{if(window.delayBridgeHello&&JSON.parse(event.data).type==='hello'){window.delayBridgeHello=false;setTimeout(()=>{const a=window.opennanchart,last=a.getData().at(-1);a.updateCandle({...last,time:last.time+60000});window.expectedReconnectRows=a.getData();},40);setTimeout(()=>handler.call(this,event),200);}else handler.call(this,event);};}};});
let mcp;
const checks=[];
const check=(name)=>{checks.push(name);console.log(`PASS ${name}`);};
const api=async(path,method='GET',body)=>{const res=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:res.status,body:await res.json()};};
const selectTool=async(name)=>{const button=page.getByRole('button',{name,exact:true});if(!await button.count()){await page.getByRole('button',{name:['Horizontal line','Vertical line'].includes(name)?'Line tools':'Shape tools',exact:true}).click();}await page.getByRole('button',{name,exact:true}).click();};
try{
  await page.goto(base);await page.locator('canvas').first().waitFor();await page.getByText('Agent bridge online',{exact:true}).waitFor();
  await page.waitForFunction(()=>window.opennanchart?.getData().length===700);
  assert.equal((await api('/state')).body.candles.length,700);check('compiled workspace loads and synchronizes 700 candles');

  await page.getByRole('button',{name:'Run script',exact:false}).click();await page.waitForFunction(()=>document.querySelector('.panel-status')?.textContent?.includes('closed trades'));
  const output=(await api('/results')).body;assert.ok(output.trades.length>0);assert.equal(output.plots.length,2);
  await page.getByRole('tab',{name:'Strategy tester'}).click();await page.getByText('Max drawdown',{exact:true}).waitFor();assert.equal(await page.locator('canvas').count(),2);check('JavaScript runs in the production sandbox and displays backtest equity');
  await page.getByRole('tab',{name:'Trades',exact:false}).click();assert.ok(await page.locator('tbody tr').count()>0);
  await page.getByRole('tab',{name:'JavaScript'}).click();

  await page.getByLabel('Price scale',{exact:true}).selectOption('log');await page.getByLabel('Price scale',{exact:true}).selectOption('percent');await page.getByLabel('Price scale',{exact:true}).selectOption('linear');
  const canvas=page.locator('[data-opennanchart] canvas'),box=await canvas.boundingBox();
  await page.mouse.move(box.x+box.width-25,box.y+box.height*.45);await page.mouse.down();await page.mouse.move(box.x+box.width-25,box.y+box.height*.3,{steps:8});await page.mouse.up();
  await page.waitForFunction(()=>!document.querySelector('.chart-status button')?.classList.contains('active'));
  await page.getByRole('button',{name:'Auto',exact:true}).click();check('linear, log, percentage and manual price-axis drag work');

  await page.getByRole('button',{name:'5m',exact:true}).click();
  const timePoint=await page.evaluate(()=>{const a=window.opennanchart,range=a.getVisibleRange(),c=a.getData()[650],rect=document.querySelector('[data-opennanchart] canvas').getBoundingClientRect(),date=new Date(c.time);window.canvasTimes=[];return {x:rect.x+(650.5-range.start)/(range.end-range.start)*(rect.width-70),y:rect.y+rect.height/2,expected:date.toLocaleDateString([],{month:'short',day:'numeric'})+' '+date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false})};});
  await page.mouse.move(timePoint.x,timePoint.y);await page.waitForTimeout(70);assert.equal(await page.evaluate(()=>window.canvasTimes.at(-1)),timePoint.expected);check('5-minute crosshair labels use the actual candle timestamp');

  await page.evaluate(()=>{const a=window.opennanchart,len=a.getData().length;a.setVisibleRange({start:len-2,end:len+6});});
  await page.mouse.move(box.x+box.width*.65,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+40,box.y+box.height*.5,{steps:8});await page.mouse.up();
  assert.ok(await page.evaluate(()=>window.opennanchart.getVisibleRange().start<window.opennanchart.getData().length));
  await page.mouse.move(box.x+box.width*.3,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.5,{steps:8});await page.mouse.up();assert.ok(await page.evaluate(()=>window.opennanchart.getVisibleRange().start<window.opennanchart.getData().length-1));await page.getByRole('button',{name:'Fit all candles'}).click();check('right-edge panning keeps a visible candle and can pan back');

  await page.getByRole('button',{name:'Trend line',exact:true}).click();
  await page.mouse.click(box.x+box.width*.35,box.y+box.height*.55);await page.mouse.click(box.x+box.width*.55,box.y+box.height*.35);
  await page.waitForFunction(()=>window.opennanchart.getDrawings().length===1);
  assert.equal(await page.getByRole('button',{name:'Select and pan',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Clear drawings',exact:true}).click();await page.waitForFunction(()=>window.opennanchart.getDrawings().length===0);check('two-point trend drawing, automatic tool return and deletion work');
  await selectTool('Horizontal line');await page.mouse.click(box.x+box.width*.3,box.y+box.height*.6);await page.waitForFunction(()=>window.opennanchart.getDrawings().length===1);await page.mouse.click(box.x+box.width*.8,box.y+box.height*.6);await page.getByTitle('Color',{exact:true}).waitFor();await page.getByRole('button',{name:'Clear drawings',exact:true}).click();
  await selectTool('Vertical line');await page.mouse.click(box.x+box.width*.4,box.y+box.height*.3);await page.mouse.click(box.x+box.width*.4,box.y+box.height*.8);await page.getByTitle('Color',{exact:true}).waitFor();await page.getByRole('button',{name:'Clear drawings',exact:true}).click();
  await selectTool('Circle');await page.mouse.click(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.click(box.x+box.width*.6,box.y+box.height*.5);await page.mouse.click(box.x+box.width*.4,box.y+box.height*.5);await page.getByTitle('Color',{exact:true}).waitFor();await page.getByRole('button',{name:'Clear drawings',exact:true}).click();check('horizontal, vertical and circle hit tests select the visible geometry');

  const before=await page.evaluate(()=>window.opennanchart.getVisibleRange());
  await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.wheel(0,-200);await page.waitForTimeout(150);
  const zoomed=await page.evaluate(()=>window.opennanchart.getVisibleRange());assert.ok(zoomed.end-zoomed.start<before.end-before.start);
  const injected=await page.evaluate(()=>{const api=window.opennanchart,last=api.getData().at(-1);api.updateCandle({...last,time:last.time+3600000});return api.getData().length;});
  assert.equal(injected,701);await page.waitForFunction(()=>document.querySelector('.chart-status').textContent.includes('701 candles'));
  const after=await page.evaluate(()=>window.opennanchart.getVisibleRange());assert.ok(Math.abs((after.end-after.start)-(zoomed.end-zoomed.start))<1e-6);check('streaming injection preserves the zoomed viewport');

  await page.getByRole('button',{name:'Indicators',exact:false}).click();await page.getByRole('button',{name:'RSI 14',exact:false}).click();await page.getByRole('button',{name:'Close dialog'}).click();assert.equal(await page.locator('canvas').count(),2);check('built-in RSI plots in a synchronized indicator pane');

  await page.getByRole('button',{name:'Data',exact:true}).click();
  await page.getByLabel('Candle JSON or CSV').fill('[{"time":0,"open":2,"high":1,"low":1,"close":2,"volume":1}]');
  await page.getByRole('button',{name:'Import candles',exact:true}).click();await page.getByRole('alert').getByText(/high\/low/).waitFor();
  const rows=(await api('/state')).body.candles.slice(-25);await page.getByLabel('Candle JSON or CSV').fill(JSON.stringify(rows));await page.getByRole('button',{name:'Import candles',exact:true}).click();await page.waitForFunction(()=>window.opennanchart.getData().length===25);check('invalid imports are recoverable and valid JSON imports render');

  const editor=page.getByRole('textbox',{name:'JavaScript indicator editor'});
  await editor.fill("onBar(({ close, plot }) => {\n  plot('Custom close', close, { color: '#7dd3fc' });\n});");
  await page.waitForTimeout(450);await page.reload();await page.getByRole('textbox',{name:'JavaScript indicator editor'}).waitFor();assert.match(await page.getByRole('textbox',{name:'JavaScript indicator editor'}).innerText(),/Custom close/);
  await page.getByRole('button',{name:'Run script',exact:false}).click();await page.waitForFunction(()=>document.querySelector('.panel-status')?.textContent?.includes('1 plots'));
  check('multiline JavaScript, focus, local save, reopen and rerun work');

  await editor.fill("onBar(() => { throw new Error('intentional test error'); });");await page.getByRole('button',{name:'Run script',exact:false}).click();await page.getByRole('alert').getByText('intentional test error').waitFor();
  await editor.fill("onBar(({ plot, close }) => plot('Retry', close));");await page.getByRole('button',{name:'Run script',exact:false}).click();await page.waitForFunction(()=>document.querySelector('.panel-status')?.textContent?.includes('1 plots'));check('script errors can be fixed and retried without reload');

  await editor.fill('while (true) {}');await page.getByRole('button',{name:'Run script',exact:false}).click();await page.getByRole('alert').getByText(/timed out/).waitFor({timeout:10000});
  await page.getByRole('button',{name:'Indicators',exact:false}).click();await page.getByRole('button',{name:'Close dialog'}).click();check('an infinite script is terminated and the UI remains responsive');

  mcp=new Client({name:'opennanchart-browser-test',version:'1.0.0'});
  await mcp.connect(new StdioClientTransport({command:process.execPath,args:[resolve('server/mcp.mjs')],env:{...process.env,OPENNANCHART_URL:base}}));
  const names=(await mcp.listTools()).tools.map(t=>t.name);assert.ok(names.includes('chart_run_script'));
  const call=async(name,args={})=>{const result=await mcp.callTool({name,arguments:args});assert.ok(!result.isError,JSON.stringify(result));return JSON.parse(result.content[0].text);};
  const original=(await api('/state')).body.candles;
  await call('chart_set_data',{candles:original,symbol:'TESTUSDT',interval:'1h'});
  await page.getByText('TEST / USDT',{exact:true}).waitFor();
  await call('chart_set_view',{scaleMode:'log',chartStyle:'line',fitContent:true});await page.waitForFunction(()=>document.querySelector('select[aria-label="Price scale"]').value==='log');
  const result=await call('chart_run_script',{source:"onBar(({ ta, plot }) => plot('MCP SMA', ta.sma(3), {color:'#7dd3fc'}));"});
  assert.equal(result.plots[0].name,'MCP SMA');await page.locator('.plot-legend').getByText('MCP SMA',{exact:false}).waitFor();assert.equal((await call('chart_get_results',{includeSeries:true})).plots[0].values.length,original.length-2);check('real stdio MCP injects data, changes the UI and runs a sandboxed custom indicator');
  assert.match(await editor.innerText(),/while \(true\)/);await page.getByRole('button',{name:'Load agent script',exact:false}).waitFor();check('MCP results preserve the saved editor draft and offer an explicit load action');

  const tampered=await mcp.callTool({name:'chart_run_script',arguments:{source:"RegExp.prototype.test=()=>true;onBar(({plot})=>plot('x',1,{color:'url(https://invalid.example)'}));"}});assert.equal(tampered.isError,true);assert.match(tampered.content[0].text,/Invalid script result/);
  const missingValues=await mcp.callTool({name:'chart_run_script',arguments:{source:"Map.prototype.values=function*(){yield {name:'broken',pane:'price',color:'red'}};onBar(()=>{});"}});assert.equal(missingValues.isError,true);await page.getByRole('button',{name:'Data',exact:true}).click();await page.getByRole('button',{name:'Close dialog'}).click();check('prototype-tampered output is rejected without corrupting stored state or crashing the UI');
  const oldResult=(await api('/results')).body;const badStored=await api('/result','POST',{revision:(await api('/state')).body.revision,result:{metrics:{},plots:[]}});assert.equal(badStored.status,400);assert.deepEqual((await api('/results')).body,oldResult);check('the bridge independently rejects malformed result uploads');

  const stressRows=Array.from({length:10000},(_,i)=>({time:1700000000000+i*60000,open:100+Math.sin(i/20),high:102,low:98,close:100+Math.sin(i/20),volume:0}));await api('/candles','PUT',{candles:stressRows,source:'Stress test'});await page.waitForFunction(()=>window.opennanchart.getData().length===10000);await call('chart_set_view',{fitContent:true});
  const stress=await call('chart_run_script',{source:"onBar(({plot,index})=>{for(let n=0;n<20;n++)plot('P'+n,50+Math.sin(index/20+n),{pane:'indicator',color:'#7dd3fc'});});"});assert.equal(stress.plots.length,20);assert.equal(stress.plots[0].pointCount,10000);await page.waitForTimeout(100);assert.deepEqual(errors,[]);await api('/candles','PUT',{candles:original,source:'Injected via MCP'});await page.waitForFunction(()=>window.opennanchart.getData().length===25);check('10,000 candles and 20 indicator plots render and synchronize without argument-stack overflow');

  const firstRun=api('/run','POST',{source:'const start=Date.now();while(Date.now()-start<600){};onBar(()=>{});'});await page.getByRole('button',{name:'Cancel',exact:true}).waitFor();const concurrent=await api('/run','POST',{source:'onBar(()=>{});'});assert.equal(concurrent.status,429);assert.equal((await firstRun).status,200);check('concurrent MCP/REST script jobs are rejected instead of cancelling each other');

  const forbidden=await fetch(base+'/api/candles',{method:'PUT',headers:{Origin:'https://unrelated.example','Content-Type':'application/json'},body:JSON.stringify({candles:[]})});assert.equal(forbidden.status,403);
  const form=await fetch(base+'/api/candle',{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'});assert.equal(form.status,415);check('bridge rejects foreign browser origins and form-style mutations');
  const isolation=await call('chart_run_script',{source:"log(typeof fetch,typeof indexedDB,typeof document,typeof send,typeof run);onBar(()=>{});"});assert.equal(isolation.logs[0],'undefined undefined undefined undefined undefined');check('script source cannot access network, storage, DOM or the worker transport closure');
  const reflection=await call('chart_run_script',{includeSeries:true,source:"onBar(Function('bar','const caller=arguments.callee.caller;bar.plot(\"Probe\",caller?caller.arguments[0].at(-1).close:0,{pane:\"indicator\"})'));"});assert.ok(reflection.plots[0].values.every(p=>p.value===0));check('strict worker execution prevents caller-stack access to future candle data');

  await editor.fill("onBar(({ close, plot }) => plot('Offline draft', close));");await page.waitForTimeout(350);
  server.closeAllConnections();await new Promise(r=>server.close(r));await page.getByText('Browser workspace',{exact:true}).waitFor();
  await page.evaluate(()=>window.opennanchart.setData(window.opennanchart.getData().slice(-7)));await page.getByRole('button',{name:'Run script',exact:false}).click();await page.waitForFunction(()=>document.querySelector('.panel-status')?.textContent?.includes('1 plots'));
  server=createBridgeServer({port});await new Promise(r=>server.listen(port,'127.0.0.1',r));await page.getByText('Agent bridge online',{exact:true}).waitFor({timeout:15000});assert.equal((await api('/state')).body.candles.length,7);assert.equal((await api('/state')).body.scaleMode,'log');assert.match(await editor.innerText(),/Offline draft/);
  await page.getByRole('button',{name:'Run script',exact:false}).click();await page.waitForFunction(()=>document.querySelector('.panel-status')?.textContent?.includes('1 plots'));await page.waitForTimeout(80);assert.equal((await api('/results')).status,200);check('offline edits and local results survive bridge restart and resynchronize before sharing');

  server.closeAllConnections();await new Promise(r=>server.close(r));await page.getByText('Browser workspace',{exact:true}).waitFor();
  await page.evaluate(()=>{const a=window.opennanchart;a.setData(a.getData().slice(-4));window.delayBridgeHello=true;});
  await new Promise(r=>server.listen(port,'127.0.0.1',r));await page.getByText('Agent bridge online',{exact:true}).waitFor({timeout:15000});await page.waitForFunction(()=>!!window.expectedReconnectRows);await page.waitForTimeout(100);
  assert.deepEqual((await api('/state')).body.candles,await page.evaluate(()=>window.expectedReconnectRows));await page.getByRole('button',{name:'Run script',exact:false}).click();await page.waitForFunction(()=>document.querySelector('.panel-status')?.textContent?.includes('1 plots'));assert.equal((await api('/results')).status,200);check('a stream tick between reconnect open and hello preserves the full offline dataset and matching results');

  server.closeAllConnections();await new Promise(r=>server.close(r));await page.getByText('Browser workspace',{exact:true}).waitFor();await page.getByLabel('Price scale',{exact:true}).selectOption('percent');await page.getByLabel('Chart type',{exact:true}).selectOption('area');await editor.fill("onBar(({plot,close})=>plot('Offline newer run',close));");await page.getByRole('button',{name:'Run script',exact:false}).click();await page.waitForFunction(()=>document.querySelector('.panel-status')?.textContent?.includes('1 plots'));
  await new Promise(r=>server.listen(port,'127.0.0.1',r));await page.getByText('Agent bridge online',{exact:true}).waitFor({timeout:15000});const resumed=(await api('/state')).body;assert.equal(resumed.scaleMode,'percent');assert.equal(resumed.chartStyle,'area');assert.equal(resumed.result.plots[0].name,'Offline newer run');check('a plain reconnect preserves and shares offline view changes and newer local results');
  await editor.fill('onBar(()=>{}); // unrun draft after my own result');await page.waitForTimeout(350);await page.reload();await page.getByText('Agent bridge online',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Load agent script',exact:false}).count(),0);assert.match(await editor.innerText(),/unrun draft/);check('the browser does not mislabel its own saved script as an agent script');

  server.closeAllConnections();await new Promise(r=>server.close(r));await page.getByText('Browser workspace',{exact:true}).waitFor();server=createBridgeServer({port});await new Promise(r=>server.listen(port,'127.0.0.1',r));const agentRows=original.slice(-3);await call('chart_set_data',{candles:agentRows,symbol:'AGENTUSDT',interval:'5m'});await page.getByText('Agent bridge online',{exact:true}).waitFor({timeout:15000});await page.waitForFunction(()=>window.opennanchart.getData().length===3);assert.deepEqual((await api('/state')).body.candles,agentRows);assert.equal((await api('/state')).body.symbol,'AGENTUSDT');check('a restarted bridge respects data preloaded by MCP before the browser reconnects');
  const embed=await browser.newPage({viewport:{width:800,height:500}}),embedErrors=[];embed.on('pageerror',e=>embedErrors.push(e.message));await embed.setContent('<div id="chart" style="height:400px;width:700px"></div>');await embed.addScriptTag({url:base+'/opennanchart.js'});
  await embed.evaluate(()=>{window.embedded=OpennanChart.createChart(document.getElementById('chart'));window.embedded.setData([{time:0,open:1,high:1,low:1,close:1,volume:0}]);window.embedded.fitContent();});await embed.locator('canvas').waitFor();await embed.waitForFunction(()=>window.embedded.getVisibleRange().start===0);assert.deepEqual(embedErrors,[]);check('standalone script-tag embedding renders a flat single candle without a bundler');
  const staleRun=await embed.evaluate(async()=>{const promise=window.embedded.runScript('const start=Date.now();while(Date.now()-start<400){};onBar(({plot,close})=>plot("Old data",close));').then(()=>false,error=>/cancelled|changed/i.test(error.message));window.embedded.setData([{time:3600000,open:2,high:2,low:2,close:2,volume:0}]);return promise;});assert.equal(staleRun,true);check('replacing chart data cancels an in-flight public API script result');
  await embed.evaluate(()=>{window.plotStrokes=0;const original=CanvasRenderingContext2D.prototype.stroke;CanvasRenderingContext2D.prototype.stroke=function(...args){if(this.strokeStyle==='#e879f9')window.plotStrokes++;return original.apply(this,args);};});
  const streaming=await embed.evaluate(async()=>{const a=window.embedded,promise=a.runScript('const start=Date.now();while(Date.now()-start<350){};onBar(({plot,close})=>plot("Snapshot",close,{color:"#e879f9"}));');await new Promise(r=>setTimeout(r,50));a.updateCandle({time:3600000,open:2,high:3,low:2,close:3,volume:1});a.appendData([{time:7200000,open:3,high:4,low:3,close:4,volume:1}]);return promise;});assert.equal(streaming.plots[0].values[0].value,2);await embed.waitForFunction(()=>window.plotStrokes>0);const strokes=await embed.evaluate(()=>window.plotStrokes);await embed.evaluate(()=>window.embedded.updateCandle({time:7200000,open:3,high:5,low:3,close:5,volume:2}));await embed.waitForFunction(before=>window.plotStrokes>before,strokes);check('streaming updates allow an in-flight snapshot to finish and retain completed custom plots');
  await embed.evaluate(()=>window.embedded.setTool('Crosshair'));await embed.locator('canvas').click({position:{x:200,y:150}});assert.equal(await embed.evaluate(()=>window.embedded.getDrawings().length),0);await embed.evaluate(()=>window.embedded.destroy());await embed.close();
  await page.screenshot({path:'test-results/desktop.png'});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);const mobileBox=await page.locator('[data-opennanchart] canvas').boundingBox();await selectTool('Horizontal line');await page.mouse.click(mobileBox.x+mobileBox.width*.3,mobileBox.y+mobileBox.height*.55);await page.mouse.click(mobileBox.x+mobileBox.width*.6,mobileBox.y+mobileBox.height*.55);const toolbox=await page.getByTitle('Color',{exact:true}).boundingBox();assert.ok(toolbox.x>=0&&toolbox.x+toolbox.width<=390);await page.getByRole('button',{name:'Clear drawings',exact:true}).click();check('drawing edit controls remain reachable on a narrow chart');
  await page.screenshot({path:'test-results/mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);check('mobile viewport has no horizontal page overflow');
  assert.deepEqual(errors,[]);console.log(`\n${checks.length} browser/integration checks passed; no runtime page errors.`);
}finally{await mcp?.close();await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
