#!/usr/bin/env node
// Loopback chart bridge. User script source is dispatched to the browser, never evaluated in Node.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname,extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist/demo');
const MAX_CANDLES=10000;
const summarize=result=>({metrics:result.metrics,inputs:result.inputs,logs:result.logs,trades:result.trades.slice(-100),totalTrades:result.trades.length,plots:result.plots.map(p=>({name:p.name,color:p.color,pane:p.pane,pointCount:p.values.length,lastValue:p.values.at(-1)?.value??null})),equityPoints:result.equity.length});
export function validateCandle(input){
  const c=Array.isArray(input)?{time:input[0],open:input[1],high:input[2],low:input[3],close:input[4],volume:input[5]}:input;
  if(!c||![c.time,c.open,c.high,c.low,c.close,c.volume].every(Number.isFinite)||!Number.isSafeInteger(c.time)||c.time<0||Math.min(c.open,c.high,c.low,c.close)<=0||c.volume<0||c.high<Math.max(c.open,c.close,c.low)||c.low>Math.min(c.open,c.close,c.high))throw new Error('Invalid OHLCV candle. Use Unix milliseconds and positive prices.');
  return {time:c.time,open:c.open,high:c.high,low:c.low,close:c.close,volume:c.volume};
}
export function validateData(inputs){
  if(!Array.isArray(inputs)||inputs.length>MAX_CANDLES)throw new Error('Provide at most 10,000 candles.');const rows=inputs.map(validateCandle);
  for(let i=1;i<rows.length;i++)if(rows[i].time<=rows[i-1].time)throw new Error('Candle timestamps must be unique and increasing.');return rows;
}
export function createBridgeServer({port=3031,apiOnly=false}={}){
  let state={candles:[],symbol:'BTCUSDT',interval:'1h',source:'No data',scaleMode:'linear',chartStyle:'candles',revision:0,result:null,script:''};
  const clients=new Map(),jobs=new Map();
  const publish=(message,origin)=>{for(const [id,res]of clients)if(id!==origin)res.write(`data: ${JSON.stringify(message)}\n\n`);};
  const invalidate=()=>{state.result=null;state.revision++;for(const [id,job]of jobs){clearTimeout(job.timer);job.reject(new Error('Chart data changed during the run. Run again on the new data.'));jobs.delete(id);}};
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
    const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
    try{
      const host=req.headers.host??'';
      if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(host))return json(403,{error:'Invalid host.'});
      const url=new URL(req.url,`http://127.0.0.1:${port}`),origin=req.headers.origin;
      if(url.pathname.startsWith('/api/')&&origin&&!['http://127.0.0.1:3030','http://localhost:3030',`http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(origin))return json(403,{error:'This bridge only accepts its local chart UI.'});
      if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
      const client=typeof req.headers['x-opennanchart-client']==='string'?req.headers['x-opennanchart-client']:undefined;
      let body={};
      if(['POST','PUT'].includes(req.method)){
        if(!req.headers['content-type']?.startsWith('application/json'))return json(415,{error:'Use Content-Type: application/json.'});
        let size=0;const chunks=[];
        const maxBody=(url.pathname==='/api/result'||url.pathname.startsWith('/api/jobs/'))?32*1024*1024:4*1024*1024;
        for await(const chunk of req){size+=chunk.length;if(size>maxBody)return json(413,{error:'Request exceeds the endpoint size limit.'});chunks.push(chunk);}
        body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
        if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Provide a JSON object.');
      }
      if(req.method==='GET'&&url.pathname==='/api/state')return json(200,url.searchParams.get('includeCandles')==='false'?{symbol:state.symbol,interval:state.interval,source:state.source,scaleMode:state.scaleMode,chartStyle:state.chartStyle,revision:state.revision,candleCount:state.candles.length,lastCandle:state.candles.at(-1)??null,hasResults:!!state.result,connectedBrowsers:clients.size}:{...state,connectedBrowsers:clients.size});
      if(req.method==='GET'&&url.pathname==='/api/candles'){const offset=Number(url.searchParams.get('offset')??0),limit=Number(url.searchParams.get('limit')??200);if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>1000)throw new Error('Use a nonnegative offset and a limit from 1 to 1,000.');return json(200,{candles:state.candles.slice(offset,offset+limit),offset,total:state.candles.length});}
      if(req.method==='GET'&&url.pathname==='/api/health')return json(200,{status:'ok',name:'Opennanchart',version:'0.1.0',connectedBrowsers:clients.size});
      if(req.method==='GET'&&url.pathname==='/api/results')return state.result?json(200,url.searchParams.get('includeSeries')==='false'?summarize(state.result):state.result):json(404,{error:'Run a script on the current dataset first.'});
      if(req.method==='GET'&&url.pathname==='/api/script')return json(200,{source:state.script});
      if(req.method==='GET'&&url.pathname==='/api/indicators')return json(200,{indicators:['sma','ema','rsi','atr','bbands','highest','lowest','stdev'],execution:'Signals at bar close; fills at the next bar open. Fees and slippage in basis points.'});
      if(req.method==='GET'&&url.pathname==='/api/events'){
        const id=url.searchParams.get('client')??randomUUID();if(clients.size>=20)return json(429,{error:'Too many chart connections.'});
        clients.get(id)?.end();res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive'});res.write(`data: ${JSON.stringify({type:'hello',state})}\n\n`);clients.set(id,res);
        const keepalive=setInterval(()=>res.write(': ping\n\n'),15000);req.on('close',()=>{clearInterval(keepalive);if(clients.get(id)===res)clients.delete(id);});return;
      }
      if(req.method==='PUT'&&url.pathname==='/api/candles'){
        const rows=validateData(body.candles);invalidate();state={...state,candles:rows,symbol:typeof body.symbol==='string'?body.symbol.slice(0,40):state.symbol,interval:typeof body.interval==='string'?body.interval.slice(0,10):state.interval,source:typeof body.source==='string'?body.source.slice(0,80):'Injected via API'};
        publish({type:'data',state},client);return json(200,{revision:state.revision,candles:state.candles.length});
      }
      if(req.method==='POST'&&url.pathname==='/api/candle'){
        const candle=validateCandle(body.candle),last=state.candles.at(-1);if(last&&candle.time<last.time)throw new Error('Update the latest candle or append a newer one.');
        if(last?.time!==candle.time&&state.candles.length>=MAX_CANDLES)throw new Error('Dataset reached 10,000 candles.');
        invalidate();state.candles=last?.time===candle.time?[...state.candles.slice(0,-1),candle]:[...state.candles,candle];publish({type:'candle',candle,revision:state.revision},client);return json(200,{revision:state.revision,candles:state.candles.length});
      }
      if(req.method==='PUT'&&url.pathname==='/api/view'){
        if(body.scaleMode!==undefined&&!['linear','log','percent'].includes(body.scaleMode))throw new Error('Invalid scale mode.');
        if(body.chartStyle!==undefined&&!['candles','line','area','heikin-ashi'].includes(body.chartStyle))throw new Error('Invalid chart style.');
        if(body.scaleMode)state.scaleMode=body.scaleMode;if(body.chartStyle)state.chartStyle=body.chartStyle;
        publish({type:'view',scaleMode:state.scaleMode,chartStyle:state.chartStyle,fitContent:!!body.fitContent},client);return json(200,{scaleMode:state.scaleMode,chartStyle:state.chartStyle});
      }
      if(req.method==='POST'&&url.pathname==='/api/run'){
        if(typeof body.source!=='string'||body.source.length>64000)throw new Error('Script source must be under 64 KB.');
        const browser=[...clients.values()][0];if(!browser)return json(409,{error:`Open http://127.0.0.1:${apiOnly?3030:port}/ in a browser first. Scripts run in the browser sandbox.`});
        if(!state.candles.length)throw new Error('Inject candle data before running a script.');
        if(jobs.size>=4)return json(429,{error:'Wait for the current scripts to finish.'});
        const id=randomUUID(),revision=state.revision;
        const result=await new Promise((resolveJob,rejectJob)=>{
          const timer=setTimeout(()=>{jobs.delete(id);rejectJob(new Error('The chart browser did not return a result in time.'));},15000);
          jobs.set(id,{resolve:resolveJob,reject:rejectJob,timer,revision,source:body.source});
          browser.write(`data: ${JSON.stringify({type:'run',jobId:id,revision,candles:state.candles,source:body.source,options:body.options??{}})}\n\n`);
        });return json(200,body.includeSeries?result:summarize(result));
      }
      if(req.method==='POST'&&url.pathname.startsWith('/api/jobs/')){
        const id=url.pathname.split('/')[3],job=jobs.get(id);if(!job)return json(404,{error:'Run expired or was cancelled.'});clearTimeout(job.timer);jobs.delete(id);
        if(body.error){job.reject(new Error(String(body.error).slice(0,2000)));return json(200,{accepted:true});}
        if(job.revision!==state.revision){job.reject(new Error('Chart data changed. Run again.'));return json(409,{error:'Stale run.'});}
        if(!body.result?.metrics||!Array.isArray(body.result.plots)){job.reject(new Error('Invalid browser result.'));throw new Error('Invalid result.');}
        state.result=body.result;state.script=job.source;job.resolve(body.result);publish({type:'result',result:body.result,source:state.script},client);return json(200,{accepted:true});
      }
      if(req.method==='POST'&&url.pathname==='/api/result'){
        if(body.revision!==state.revision)return json(409,{error:'Data changed; this result is stale.'});
        if(!body.result?.metrics||!Array.isArray(body.result.plots))throw new Error('Invalid result.');
        state.result=body.result;state.script=typeof body.source==='string'?body.source.slice(0,64000):'';publish({type:'result',result:state.result,source:state.script},client);return json(200,{accepted:true});
      }
      if(url.pathname.startsWith('/api/'))return json(404,{error:'Unknown API operation.'});
      if(apiOnly)return json(404,{error:'API bridge only. Open the Vite demo on port 3030.'});
      if(req.method!=='GET'&&req.method!=='HEAD')return json(405,{error:'Method not allowed.'});
      const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+sep))return json(403,{error:'Invalid path.'});
      const content=await readFile(path);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2'})[extname(path)]??'application/octet-stream'});res.end(req.method==='HEAD'?undefined:content);
    }catch(error){if(!res.headersSent)json(error.code==='ENOENT'?404:400,{error:error.code==='ENOENT'?'Build the demo with npm run build first.':String(error.message).slice(0,2000)});else res.end();}
  });
  server.on('close',()=>{for(const res of clients.values())res.end();for(const job of jobs.values()){clearTimeout(job.timer);job.reject(new Error('Chart bridge stopped.'));}});
  return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const portFlag=process.argv.indexOf('--port'),port=portFlag>=0?Number(process.argv[portFlag+1]):3031;
  if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Choose a port from 1024 to 65535.');
  const server=createBridgeServer({port,apiOnly:process.argv.includes('--api-only')});server.listen(port,'127.0.0.1',()=>console.error(`Opennanchart ${process.argv.includes('--api-only')?'bridge':'workspace'}: http://127.0.0.1:${port}`));
}
