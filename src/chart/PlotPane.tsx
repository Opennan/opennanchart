// A synchronized canvas pane for custom oscillators and strategy equity.
import {useEffect,useRef,useState} from 'react';
import type {ScriptPlot,ScriptFill,ViewRange} from '../types';
import {drawPlots} from './visuals';
export function PlotPane({plots,fills=[],range,height=130,label='Indicator',canvasWidth}:{plots:ScriptPlot[];fills?:ScriptFill[];range:ViewRange;height?:number;label?:string;canvasWidth?:number}){
  const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),[measuredWidth,setWidth]=useState(0),width=canvasWidth??measuredWidth;
  useEffect(()=>{const el=host.current;if(!el)return;const ro=new ResizeObserver(()=>setWidth(Math.floor(el.clientWidth)));ro.observe(el);return()=>ro.disconnect();},[]);
  useEffect(()=>{
    const c=canvas.current;if(!c||width<=80)return;const dpr=window.devicePixelRatio||1;c.width=width*dpr;c.height=height*dpr;const ctx=c.getContext('2d');if(!ctx)return;ctx.scale(dpr,dpr);
    ctx.fillStyle='#0a0c0f';ctx.fillRect(0,0,width,height);const chartWidth=width-70,top=28,bottom=height-15;
    const values=plots.flatMap(p=>p.values.filter(v=>v.index>=range.start&&v.index<=range.end).map(v=>v.value));
    for(const p of plots)if(['area','histogram','columns'].includes(p.style??'line')&&p.values.some(v=>v.index>=range.start&&v.index<=range.end))values.push(p.baseline??0);
    if(!values.length)return;let lo=Infinity,hi=-Infinity;for(const value of values){lo=Math.min(lo,value);hi=Math.max(hi,value);}const padding=Math.max((hi-lo)*.12,Math.abs(hi)*.01,1e-6);lo-=padding;hi+=padding;
    const x=(i:number)=>(i-range.start+.5)/(range.end-range.start)*chartWidth,y=(v:number)=>top+(hi-v)/(hi-lo)*(bottom-top);
    ctx.font='10px ui-monospace,monospace';for(let n=0;n<3;n++){const v=lo+(hi-lo)*n/2,py=y(v);ctx.strokeStyle='#171c23';ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(chartWidth,py);ctx.stroke();ctx.fillStyle='#a0a6b1';ctx.fillText(v.toFixed(2),chartWidth+8,py+3,44);}
    ctx.save();ctx.beginPath();ctx.rect(0,top,chartWidth,bottom-top);ctx.clip();
    drawPlots(ctx,plots,fills,{x,y,start:range.start,end:range.end,barWidth:chartWidth/(range.end-range.start),top,bottom});ctx.restore();
  },[plots,fills,range,height,width]);
  return <div ref={host} style={{height,width:canvasWidth,position:'relative',borderTop:'1px solid #ffffff14'}}><div style={{position:'absolute',top:9,left:12,color:'#a0a6b1',font:'11px system-ui',display:'flex',gap:14,maxWidth:'calc(100% - 80px)',overflow:'hidden',whiteSpace:'nowrap'}}><span>{label}</span>{plots.slice(0,5).map(p=><span key={p.name} style={{color:'#a0a6b1',flexShrink:0}}><i style={{display:'inline-block',width:7,height:2,background:p.color,marginRight:5,verticalAlign:'middle'}}/>{p.name}</span>)}</div><canvas ref={canvas} aria-label={`${label} chart`} style={{display:'block',width:canvasWidth??'100%',height}}/></div>;
}
