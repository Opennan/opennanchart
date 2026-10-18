// Public React chart and imperative JavaScript data API.
import React,{forwardRef,useCallback,useEffect,useImperativeHandle,useMemo,useRef,useState} from 'react';
import {LegacyCanvasChart,TOOLS} from './LegacyCanvas';
import {PlotPane} from './PlotPane';
import {normalizeCandles,normalizeCandle,toTuples,updateCandle} from '../data';
import {validateCustomTool} from '../../shared/tools.mjs';
import {runSandboxedScript} from '../scripting/sandbox';
import type {BacktestOptions,CustomToolDefinition,Candle,CandleInput,ChartStyle,Drawing,ScaleMode,ScriptResult,ViewRange} from '../types';

export const DARK_COLORS={back:'#0a0c0f',grid:'#171c23',text:'#a0a6b1',up:'#34d399',dw:'#fb7185',cross:'#647083',volUp:'#34d39930',volDw:'#fb718530'};
interface CanvasControls {fitContent:()=>void;resetScale:()=>void;zoom:(factor:number)=>void;getVisibleRange:()=>ViewRange;setVisibleRange:(r:ViewRange)=>void;getDrawings:()=>Drawing[];setDrawings:(items:Drawing[])=>void;clearDrawings:()=>void;exportImage:()=>string|undefined}
export interface OpenNanChartHandle {
  setData:(data:readonly CandleInput[])=>void;getData:()=>Candle[];updateCandle:(candle:CandleInput)=>void;appendData:(candles:readonly CandleInput[])=>void;
  fitContent:()=>void;resetScale:()=>void;zoom:(factor:number)=>void;setScaleMode:(mode:ScaleMode)=>void;setChartStyle:(style:ChartStyle)=>void;setTool:(tool:string)=>void;
  registerTool:(definition:CustomToolDefinition)=>void;getCustomTools:()=>CustomToolDefinition[];
  getVisibleRange:()=>ViewRange;setVisibleRange:(range:ViewRange)=>void;getDrawings:()=>Drawing[];setDrawings:(items:Drawing[])=>void;clearDrawings:()=>void;
  runScript:(source:string,options?:BacktestOptions)=>Promise<ScriptResult>;clearScript:()=>void;exportImage:()=>string|undefined;
}
export interface OpenNanChartProps {
  data?:readonly CandleInput[];height?:number|string;scaleMode?:ScaleMode;chartStyle?:ChartStyle;activeTool?:string;
  result?:ScriptResult|null;colors?:Partial<typeof DARK_COLORS>;showIndicatorPanes?:boolean;
  onCustomToolsChange?:(tools:CustomToolDefinition[])=>void;
  onToolChange?:(tool:string)=>void;onDataChange?:(candles:Candle[],change:{reset:boolean})=>void;onHover?:(candle:Candle)=>void;
  onViewChange?:(range:ViewRange)=>void;onDrawingsChange?:(items:Drawing[])=>void;onScaleChange?:(state:{auto:boolean;zoom:number;offset:number})=>void;
}
const Canvas=LegacyCanvasChart as React.ComponentType<any>;
const EMPTY:CandleInput[]=[];
export const OpenNanChart=forwardRef<OpenNanChartHandle,OpenNanChartProps>(function OpenNanChart({data=EMPTY,height='100%',scaleMode='linear',chartStyle='candles',activeTool,result,colors,showIndicatorPanes=true,onToolChange,onCustomToolsChange,onDataChange,onHover,onViewChange,onDrawingsChange,onScaleChange},ref){
  const [rows,setRows]=useState(()=>normalizeCandles(data)),rowsRef=useRef(rows),lastProp=useRef(data);
  const [version,setVersion]=useState(0),[scale,setScale]=useState<ScaleMode>(scaleMode),[style,setStyle]=useState<ChartStyle>(chartStyle),[ownResult,setOwnResult]=useState<ScriptResult|null>(null);
  const [customTools,setCustomTools]=useState<CustomToolDefinition[]>([]),customToolsRef=useRef(customTools);
  const [selectedTool,setSelectedTool]=useState(activeTool??'Cursor');
  const container=useRef<HTMLDivElement>(null),controls=useRef<CanvasControls|null>(null),[size,setSize]=useState({width:0,height:0}),run=useRef<AbortController|null>(null);
  const pendingFit=useRef(false),renderedRows=useRef(rows);renderedRows.current=rows;
  const datasetVersion=useRef(0);
  const changeRef=useRef(onDataChange);changeRef.current=onDataChange;
  const commit=useCallback((next:Candle[],reset=false)=>{rowsRef.current=next;setRows(next);if(reset){run.current?.abort();datasetVersion.current++;setOwnResult(null);setVersion(n=>n+1);}changeRef.current?.(next.map(c=>({...c})),{reset});},[]);
  useEffect(()=>{if(lastProp.current!==data){lastProp.current=data;commit(normalizeCandles(data),true);}},[data,commit]);
  useEffect(()=>setScale(scaleMode),[scaleMode]);useEffect(()=>setStyle(chartStyle),[chartStyle]);
  useEffect(()=>{const el=container.current;if(!el)return;const observer=new ResizeObserver(()=>{const rect=el.getBoundingClientRect();setSize(prev=>prev.width===Math.floor(rect.width)&&prev.height===Math.floor(rect.height)?prev:{width:Math.floor(rect.width),height:Math.floor(rect.height)});});observer.observe(el);return ()=>observer.disconnect();},[]);
  useEffect(()=>()=>run.current?.abort(),[]);
  useEffect(()=>{if(pendingFit.current&&controls.current){pendingFit.current=false;controls.current.fitContent();}},[rows,size]);
  useImperativeHandle(ref,()=>({
    setData:inputs=>commit(normalizeCandles(inputs),true),getData:()=>rowsRef.current.map(c=>({...c})),
    updateCandle:input=>commit(updateCandle(rowsRef.current,input)),
    appendData:inputs=>{const batch=normalizeCandles(inputs);let next=rowsRef.current;for(const candle of batch)next=updateCandle(next,candle);commit(next);},
    fitContent:()=>{if(controls.current&&renderedRows.current===rowsRef.current)controls.current.fitContent();else pendingFit.current=true;},resetScale:()=>controls.current?.resetScale(),
    zoom:factor=>{if(!Number.isFinite(factor)||factor<=0)throw new Error('Zoom factor must be positive.');controls.current?.zoom(factor);},
    setScaleMode:mode=>{if(!['linear','log','percent'].includes(mode))throw new Error('Unknown scale mode.');setScale(mode);},
    setChartStyle:mode=>{if(!['candles','line','area','heikin-ashi'].includes(mode))throw new Error('Unknown chart style.');setStyle(mode);},
    setTool:tool=>{if(tool==='Crosshair')tool='Cursor';if(!TOOLS.some(t=>t.type===tool)&&!customToolsRef.current.some(t=>t.id===tool))throw new Error('Unknown drawing tool.');setSelectedTool(tool);onToolChange?.(tool);},
    registerTool:definition=>{const clean=validateCustomTool(definition),next=customToolsRef.current.filter(t=>t.id!==clean.id);if(next.length>=20)throw new Error('Use at most 20 custom tools.');next.push(clean);customToolsRef.current=next;setCustomTools(next);onCustomToolsChange?.(structuredClone(next));},getCustomTools:()=>structuredClone(customToolsRef.current),
    getVisibleRange:()=>controls.current?.getVisibleRange()??{start:0,end:0},setVisibleRange:r=>controls.current?.setVisibleRange(r),
    getDrawings:()=>controls.current?.getDrawings()??[],
    setDrawings:items=>{
      if(!Array.isArray(items)||items.length>200)throw new Error('Provide at most 200 drawings.');
      const clean=items.map(item=>{if(!item||typeof item.id!=='string'||typeof item.type!=='string'||!Array.isArray(item.p)||item.p.length<1||item.p.length>32||item.p.some(p=>!Number.isFinite(p.t)||!Number.isFinite(p.y$)))throw new Error('Invalid drawing data.');return {id:item.id.slice(0,100),type:item.type.slice(0,100),p:item.p.map(p=>({t:p.t,y$:p.y$})),color:typeof item.color==='string'?item.color.slice(0,64):'#7dd3fc',lineWidth:Math.max(1,Math.min(10,item.lineWidth??2)),text:typeof item.text==='string'?item.text.slice(0,500):'',showPrice:!!item.showPrice};});
      if(new Set(clean.map(d=>d.id)).size!==clean.length)throw new Error('Drawing IDs must be unique.');controls.current?.setDrawings(clean);
    },
    clearDrawings:()=>controls.current?.clearDrawings(),
    runScript:async(source,options)=>{run.current?.abort();const controller=new AbortController();run.current=controller;const snapshot=rowsRef.current,version=datasetVersion.current;const output=await runSandboxedScript(snapshot,source,options,{signal:controller.signal});if(controller.signal.aborted||version!==datasetVersion.current)throw new Error('Chart data was replaced during the script run.');setOwnResult(output);return output;},
    clearScript:()=>{run.current?.abort();setOwnResult(null);},exportImage:()=>controls.current?.exportImage(),
  }),[commit,onToolChange,onCustomToolsChange]);
  const tuples=useMemo(()=>{
    const values=toTuples(rows);if(style!=='heikin-ashi')return values;
    let previousOpen=values[0]?.[1]??0,previousClose=values[0]?.[4]??0;
    return values.map((c,i)=>{const close=(c[1]+c[2]+c[3]+c[4])/4,open=i===0?(c[1]+c[4])/2:(previousOpen+previousClose)/2;previousOpen=open;previousClose=close;return [c[0],open,Math.max(c[2],open,close),Math.min(c[3],open,close),close,c[5]];});
  },[rows,style]);
  const palette=useMemo(()=>({...DARK_COLORS,...colors}),[colors]);
  const handleHover=useCallback((index:number)=>{if(rows[index])onHover?.({...rows[index]});},[rows,onHover]);
  const handleScale=useCallback((_count:number,_selected:string|null,state:{auto:boolean;zoom:number;offset:number})=>onScaleChange?.(state),[onScaleChange]);
  const output=result===undefined?ownResult:result;
  const [paneRange,setPaneRange]=useState<ViewRange>({start:0,end:100});
  const handleRange=useCallback((range:ViewRange)=>{setPaneRange(range);onViewChange?.(range);},[onViewChange]);
  const panes=useMemo(()=>{const groups=new Map<string,NonNullable<ScriptResult['plots']>>();if(showIndicatorPanes)for(const p of output?.plots??[])if(p.pane==='indicator'){const name=p.paneId??'Indicator';groups.set(name,[...(groups.get(name)??[]),p]);}return [...groups];},[output,showIndicatorPanes]);
  const paneHeight=Math.min(size.height*.45,panes.length*125),priceHeight=Math.max(120,size.height-paneHeight);
  const effectiveTool=(activeTool??selectedTool)==='Crosshair'?'Cursor':(activeTool??selectedTool);
  return <div ref={container} style={{height,width:'100%',minWidth:0,minHeight:120,background:palette.back,position:'relative',overflow:'hidden',display:'flex',flexDirection:'column'}} data-opennanchart="true">
    {rows.length===0?<div style={{height:'100%',display:'grid',placeItems:'center',color:palette.text,font:'13px system-ui'}}>Inject candles with setData() to start charting.</div>:size.width>80&&size.height>40&&<Canvas data={tuples} width={size.width} height={priceHeight} colors={palette} tool={effectiveTool} onToolChange={(tool:string)=>{setSelectedTool(tool);onToolChange?.(tool);}} onDrawUpdate={handleScale} controlsRef={controls} plots={output?.plots??[]} markers={output?.markers??[]} barColors={output?.barColors??[]} backgrounds={output?.backgrounds??[]} shapes={output?.shapes??[]} fills={output?.fills??[]} customTools={customTools} scaleMode={scale} chartStyle={style==='heikin-ashi'?'candles':style} onViewChange={handleRange} onHover={handleHover} onDrawingsChange={onDrawingsChange} dataVersion={version}/>}
    {rows.length>0&&panes.length>0&&<div style={{height:paneHeight,flexShrink:0,overflowY:'auto',overflowX:'hidden'}}>{panes.map(([name,plots])=><PlotPane canvasWidth={size.width} key={name} label={name} plots={plots} fills={output?.fills} range={paneRange} height={125}/>)}</div>}
  </div>;
});
