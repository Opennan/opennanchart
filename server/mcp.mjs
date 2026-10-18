#!/usr/bin/env node
// MCP exposes the same local workspace operations as the browser and REST bridge.
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';
const base=new URL(process.env.OPENNANCHART_URL??'http://127.0.0.1:3031');
if(!['127.0.0.1','localhost'].includes(base.hostname)||base.protocol!=='http:')throw new Error('OPENNANCHART_URL must point to your local HTTP bridge.');
const server=new McpServer({name:'opennanchart',version:'0.1.0'});
const candle=z.object({time:z.number().int().nonnegative(),open:z.number().positive(),high:z.number().positive(),low:z.number().positive(),close:z.number().positive(),volume:z.number().nonnegative()});
const request=async(path,method='GET',body)=>{
  try{const res=await fetch(new URL(path,base),{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});const value=await res.json();return {content:[{type:'text',text:JSON.stringify(value)}],isError:!res.ok};}
  catch(error){return {content:[{type:'text',text:`Cannot reach Opennanchart: ${error.message}. Start the workspace with npm start and open it in your browser.`}],isError:true};}
};
server.registerTool('chart_get_state',{description:'Read chart settings, candle count, latest candle, revision and connection state. Full datasets are opt-in.',inputSchema:{includeCandles:z.boolean().optional()}},args=>request(`/api/state?includeCandles=${args.includeCandles??false}`));
server.registerTool('chart_get_data',{description:'Read a page of the current candle data without flooding the conversation with the full dataset.',inputSchema:{offset:z.number().int().nonnegative().optional(),limit:z.number().int().min(1).max(1000).optional()}},args=>request(`/api/candles?offset=${args.offset??0}&limit=${args.limit??200}`));
server.registerTool('chart_get_script',{description:'Read the JavaScript source of the last successful script run.',inputSchema:{}},()=>request('/api/script'));
server.registerTool('chart_set_data',{description:'Replace the chart with up to 10,000 OHLCV candles. Times are Unix milliseconds, strictly increasing. This clears old results.',inputSchema:{candles:z.array(candle).max(10000),symbol:z.string().max(40).optional(),interval:z.string().max(10).optional()}},args=>request('/api/candles','PUT',{...args,source:'Injected via MCP'}));
server.registerTool('chart_update_candle',{description:'Replace the latest candle at the same timestamp or append a newer candle for streaming data.',inputSchema:{candle}},args=>request('/api/candle','POST',args));
server.registerTool('chart_set_view',{description:'Change linear, logarithmic or percentage scale, switch chart styles, or fit all candles.',inputSchema:{scaleMode:z.enum(['linear','log','percent']).optional(),chartStyle:z.enum(['candles','line','area','heikin-ashi']).optional(),fitContent:z.boolean().optional()}},args=>request('/api/view','PUT',args));
server.registerTool('chart_run_script',{description:'Run an OpenNan JavaScript indicator or backtest against the active candles. Requires the chart browser to be open. Use onBar(({ta,plot,strategy})=>{...}). Source executes in an isolated browser worker, never on the MCP server. Signals fill at the next candle open. Returns compact metrics and plot metadata unless includeSeries is true.',inputSchema:{source:z.string().max(64000),includeSeries:z.boolean().optional(),options:z.object({initialCapital:z.number().positive().optional(),feeBps:z.number().min(0).max(1000).optional(),slippageBps:z.number().min(0).max(1000).optional(),allocationPercent:z.number().positive().max(100).optional(),inputs:z.record(z.string(),z.number()).optional()}).optional()}},args=>request('/api/run','POST',args));
server.registerTool('chart_get_results',{description:'Read backtest metrics, plot metadata and the latest 100 closed trades. Set includeSeries to retrieve full plot and equity arrays.',inputSchema:{includeSeries:z.boolean().optional()}},args=>request(`/api/results?includeSeries=${args.includeSeries??false}`));
server.registerTool('chart_list_indicators',{description:'List built-in JavaScript indicator functions and execution assumptions.',inputSchema:{}},()=>request('/api/indicators'));
await server.connect(new StdioServerTransport());
