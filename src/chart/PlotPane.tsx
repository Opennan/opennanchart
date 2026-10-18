// A synchronized canvas pane for custom oscillators and strategy equity.
import {useEffect,useRef,useState} from 'react';
import type {ScriptPlot,ViewRange} from '../types';
export function PlotPane({plots,range,height=130,label='Indicator'}:{plots:ScriptPlot[];range:ViewRange;height?:number;label?:string}){
  const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),[width,setWidth]=useState(0);
  useEffect(()=>{const el=host.current;if(!el)return;const ro=new ResizeObserver(()=>setWidth(Math.floor(el.clientWidth)));ro.observe(el);return()=>ro.disconnect();},[]);
  useEffect(()=>{
    const c=canvas.current;if(!c||width<=80)return;const dpr=window.devicePixelRatio||1;c.width=width*dpr;c.height=height*dpr;const ctx=c.getContext('2d');if(!ctx)return;ctx.scale(dpr,dpr);
    ctx.fillStyle='#0a0c0f';ctx.fillRect(0,0,width,height);const chartWidth=width-70,top=28,bottom=height-15;
    const values=plots.flatMap(p=>p.values.filter(v=>v.index>=range.start&&v.index<=range.end).map(v=>v.value));
    if(!values.length)return;let lo=Math.min(...values),hi=Math.max(...values);const padding=Math.max((hi-lo)*.12,Math.abs(hi)*.01,1e-6);lo-=padding;hi+=padding;
    const x=(i:number)=>(i-range.start+.5)/(range.end-range.start)*chartWidth,y=(v:number)=>top+(hi-v)/(hi-lo)*(bottom-top);
    ctx.font='10px ui-monospace,monospace';for(let n=0;n<3;n++){const v=lo+(hi-lo)*n/2,py=y(v);ctx.strokeStyle='#171c23';ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(chartWidth,py);ctx.stroke();ctx.fillStyle='#a0a6b1';ctx.fillText(v.toFixed(2),chartWidth+8,py+3);}
    ctx.save();ctx.beginPath();ctx.rect(0,top,chartWidth,bottom-top);ctx.clip();
    for(const p of plots){ctx.strokeStyle=p.color;ctx.lineWidth=1.4;ctx.beginPath();let start=true,previous=-2;for(const point of p.values){if(point.index<range.start-1||point.index>range.end+1)continue;if(start||point.index>previous+1)ctx.moveTo(x(point.index),y(point.value));else ctx.lineTo(x(point.index),y(point.value));start=false;previous=point.index;}ctx.stroke();}ctx.restore();
  },[plots,range,height,width]);
  return <div ref={host} style={{height,position:'relative',borderTop:'1px solid #ffffff14'}}><div style={{position:'absolute',top:9,left:12,color:'#a0a6b1',font:'11px system-ui',display:'flex',gap:14}}><span>{label}</span>{plots.slice(0,5).map(p=><span key={p.name} style={{color:p.color}}>{p.name}</span>)}</div><canvas ref={canvas} aria-label={`${label} chart`} style={{display:'block',width:'100%',height}}/></div>;
}
