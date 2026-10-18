import type {ScriptPlot,ScriptFill,ScriptShape} from '../types';
type Axes={x:(index:number)=>number;y:(value:number)=>number;start:number;end:number;barWidth:number;top:number;bottom:number};
/** Shared plot renderer for the price chart and synchronized oscillator pane. */
export function drawPlots(ctx:CanvasRenderingContext2D,plots:ScriptPlot[],fills:ScriptFill[],a:Axes){
  for(const fill of fills){
    const from=plots.find(p=>(p.id??p.name)===fill.from),to=plots.find(p=>(p.id??p.name)===fill.to);if(!from||!to)continue;
    const other=new Map(to.values.map(p=>[p.index,p]));ctx.fillStyle=fill.color;let previous:typeof from.values[number]|undefined;
    for(const p of from.values){if(p.index<a.start-1||p.index>a.end+1){previous=undefined;continue;}const q=other.get(p.index),old=previous&&other.get(previous.index);if(previous&&q&&old&&p.index===previous.index+1){const coords=[a.y(previous.value),a.y(p.value),a.y(q.value),a.y(old.value)];if(coords.every(Number.isFinite)){ctx.beginPath();ctx.moveTo(a.x(previous.index),coords[0]);ctx.lineTo(a.x(p.index),coords[1]);ctx.lineTo(a.x(p.index),coords[2]);ctx.lineTo(a.x(previous.index),coords[3]);ctx.closePath();ctx.fill();}}previous=p;}
  }
  for(const p of plots){
    const style=p.style??'line',lineWidth=p.lineWidth??1.5,base=a.y(p.baseline??0),baseline=Number.isFinite(base)?Math.max(a.top,Math.min(a.bottom,base)):a.bottom;
    let previous:typeof p.values[number]|undefined;ctx.lineWidth=lineWidth;ctx.setLineDash(p.lineStyle==='dotted'?[1,3]:p.lineStyle==='dashed'?[6,4]:[]);
    for(const point of p.values){if(point.index<a.start-1||point.index>a.end+1){previous=undefined;continue;}const x=a.x(point.index),y=a.y(point.value);if(!Number.isFinite(y)){previous=undefined;continue;}
      ctx.fillStyle=point.color??p.color;ctx.strokeStyle=point.color??p.color;
      if(style==='histogram'||style==='columns'){const width=style==='columns'?Math.max(1,a.barWidth*.8):lineWidth;ctx.fillRect(x-width/2,Math.min(y,baseline),width,Math.max(1,Math.abs(y-baseline)));}
      else if(style==='circles'){ctx.beginPath();ctx.arc(x,y,lineWidth+1,0,Math.PI*2);ctx.fill();}
      else if(style==='cross'){const r=lineWidth+2;ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x+r,y);ctx.moveTo(x,y-r);ctx.lineTo(x,y+r);ctx.stroke();}
      else if(previous&&point.index===previous.index+1){const px=a.x(previous.index),py=a.y(previous.value);if(Number.isFinite(py)){if(style==='area'){ctx.save();ctx.globalAlpha=p.opacity??.18;ctx.beginPath();ctx.moveTo(px,baseline);ctx.lineTo(px,py);ctx.lineTo(x,y);ctx.lineTo(x,baseline);ctx.closePath();ctx.fill();ctx.restore();}ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(x,y);ctx.stroke();}}
      else{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+.01,y);ctx.stroke();}
      previous=point;
    }
  }
  ctx.setLineDash([]);
}
export function drawSignalShape(ctx:CanvasRenderingContext2D,s:ScriptShape,x:number,y:number){
  const r=s.size;ctx.fillStyle=s.color;ctx.strokeStyle=s.color;ctx.lineWidth=1.5;ctx.beginPath();
  if(s.shape==='circle')ctx.arc(x,y,r,0,Math.PI*2);
  else if(s.shape==='square')ctx.rect(x-r,y-r,r*2,r*2);
  else if(s.shape==='cross'){ctx.moveTo(x-r,y-r);ctx.lineTo(x+r,y+r);ctx.moveTo(x+r,y-r);ctx.lineTo(x-r,y+r);ctx.stroke();}
  else{const direction=s.shape==='triangle-up'?-1:1;ctx.moveTo(x,y+direction*r);ctx.lineTo(x-r,y-direction*r);ctx.lineTo(x+r,y-direction*r);ctx.closePath();}
  if(s.shape!=='cross')ctx.fill();
  if(s.text){ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText(s.text,x,y+(s.location==='abovebar'?-r-5:r+12));ctx.textAlign='left';}
}
