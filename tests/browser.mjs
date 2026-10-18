// Real Chromium + compiled demo + stdio MCP integration. No browser or engine mocks.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createBridgeServer} from '../server/serve.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {resolve} from 'node:path';

const port=3032,base=`http://127.0.0.1:${port}`,server=createBridgeServer({port});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL??(process.platform==='darwin'?'chrome':undefined)});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));await mkdir('test-results',{recursive:true});
let mcp;
const checks=[];
const check=(name)=>{checks.push(name);console.log(`PASS ${name}`);};
const api=async(path,method='GET',body)=>{const res=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:res.status,body:await res.json()};};
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

  await page.getByRole('button',{name:'Trend line',exact:true}).click();
  await page.mouse.click(box.x+box.width*.35,box.y+box.height*.55);await page.mouse.click(box.x+box.width*.55,box.y+box.height*.35);
  await page.waitForFunction(()=>window.opennanchart.getDrawings().length===1);
  assert.equal(await page.getByRole('button',{name:'Select and pan',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Clear drawings',exact:true}).click();await page.waitForFunction(()=>window.opennanchart.getDrawings().length===0);check('two-point trend drawing, automatic tool return and deletion work');

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

  const forbidden=await fetch(base+'/api/candles',{method:'PUT',headers:{Origin:'https://unrelated.example','Content-Type':'application/json'},body:JSON.stringify({candles:[]})});assert.equal(forbidden.status,403);
  const form=await fetch(base+'/api/candle',{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'});assert.equal(form.status,415);check('bridge rejects foreign browser origins and form-style mutations');
  const isolation=await call('chart_run_script',{source:"log(typeof fetch,typeof indexedDB,typeof document,typeof send,typeof run);onBar(()=>{});"});assert.equal(isolation.logs[0],'undefined undefined undefined undefined undefined');check('script source cannot access network, storage, DOM or the worker transport closure');
  const embed=await browser.newPage({viewport:{width:800,height:500}}),embedErrors=[];embed.on('pageerror',e=>embedErrors.push(e.message));await embed.setContent('<div id="chart" style="height:400px;width:700px"></div>');await embed.addScriptTag({url:base+'/opennanchart.js'});
  await embed.evaluate(()=>{window.embedded=OpennanChart.createChart(document.getElementById('chart'));window.embedded.setData([{time:0,open:1,high:1,low:1,close:1,volume:0}]);window.embedded.fitContent();});await embed.locator('canvas').waitFor();await embed.waitForFunction(()=>window.embedded.getVisibleRange().start===0);assert.deepEqual(embedErrors,[]);await embed.evaluate(()=>window.embedded.destroy());await embed.close();check('standalone script-tag embedding renders a flat single candle without a bundler');
  await page.screenshot({path:'test-results/desktop.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);check('mobile viewport has no horizontal page overflow');
  assert.deepEqual(errors,[]);console.log(`\n${checks.length} browser/integration checks passed; no runtime page errors.`);
}finally{await mcp?.close();await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
