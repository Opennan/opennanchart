// User scripts run in a time-limited worker owned by an opaque-origin iframe.
import { executeScript } from '../engine';
import { normalizeCandles } from '../data';
import {validateScriptResult} from '../../shared/result.mjs';
import type { BacktestOptions, CandleInput, ScriptResult } from '../types';

const bridge=`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; connect-src 'none'"><script>
addEventListener('message',function boot(event){
  if(event.source!==parent||!event.ports[0])return;
  removeEventListener('message',boot);
  const port=event.ports[0];let worker,timer,url;
  const finish=(message)=>{clearTimeout(timer);worker?.terminate();if(url)URL.revokeObjectURL(url);port.postMessage(message);port.close();};
  try{
    url=URL.createObjectURL(new Blob([event.data.workerSource],{type:'text/javascript'}));
    worker=new Worker(url);
    worker.onmessage=e=>finish(e.data);
    worker.onerror=e=>{e.preventDefault();finish({ok:false,error:e.message||'Script worker failed.'});};
    timer=setTimeout(()=>finish({ok:false,error:'Script timed out. Check for infinite loops or reduce the dataset.'}),event.data.timeout);
    port.onmessage=()=>{clearTimeout(timer);worker.terminate();if(url)URL.revokeObjectURL(url);port.close();};
    worker.postMessage(event.data.payload);
  }catch(error){finish({ok:false,error:String(error.message||error)});}
});
<\/script>`;

export function runSandboxedScript(candles:readonly CandleInput[],source:string,options:BacktestOptions={},runtime:{timeout?:number;signal?:AbortSignal}={}):Promise<ScriptResult>{
  if(typeof document==='undefined')return Promise.reject(new Error('User-source execution requires a browser. For trusted Node callbacks, use executeScript.'));
  let rows;try{rows=normalizeCandles(candles);}catch(error){return Promise.reject(error);}
  if(typeof source!=='string'||source.length>64000)return Promise.reject(new Error('Script source must be under 64 KB.'));
  const timeout=Math.max(100,Math.min(runtime.timeout??2500,10000));
  if(runtime.signal?.aborted)return Promise.reject(new Error('Script cancelled.'));
  return new Promise((resolve,reject)=>{
    const frame=document.createElement('iframe'),channel=new MessageChannel();let settled=false;
    frame.sandbox.add('allow-scripts');frame.hidden=true;frame.title='Isolated JavaScript indicator runtime';frame.srcdoc=bridge;
    const cleanup=()=>{clearTimeout(watchdog);runtime.signal?.removeEventListener('abort',cancel);channel.port1.postMessage({cancel:true});channel.port1.close();frame.remove();};
    const finish=(error:Error|null,result?:ScriptResult)=>{if(settled)return;settled=true;cleanup();if(error)reject(error);else resolve(result!);};
    const cancel=()=>finish(new Error('Script cancelled.'));
    const watchdog=setTimeout(()=>finish(new Error("Script runtime did not respond. Check that the host CSP permits inline/eval scripts and blob workers for the isolated runtime.")),timeout+2000);
    runtime.signal?.addEventListener('abort',cancel,{once:true});
    channel.port1.onmessage=event=>{
      const message=event.data;
      if(!message?.ok){finish(new Error(typeof message?.error==='string'?message.error:'Script failed.'));return;}
      try{finish(null,validateScriptResult(message.result,rows));}catch(error){finish(error as Error);}
    };
    const workerSource=`"use strict";(()=>{const send=self.postMessage.bind(self);\nconst run=${executeScript.toString()};\nself.onmessage=function(event){
      self.onmessage=null;
      for(const key of ['fetch','XMLHttpRequest','WebSocket','EventSource','importScripts','Worker','SharedWorker','BroadcastChannel','postMessage','indexedDB','caches']){try{Object.defineProperty(self,key,{value:undefined,writable:false,configurable:false});}catch{}}
      try{const result=run(event.data.candles,event.data.source,event.data.options);send({ok:true,result});}
      catch(error){send({ok:false,error:String(error?.message||error).slice(0,2000)});}
    };})();`;
    frame.onload=()=>{if(!settled)frame.contentWindow?.postMessage({workerSource,timeout,payload:{candles:rows,source,options}},'*',[channel.port2]);};
    document.body.append(frame);
  });
}
