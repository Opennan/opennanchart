import type {CustomToolDefinition} from '../types';
type Point={x:number;y:number};
export function renderCustomTool(ctx:CanvasRenderingContext2D,definition:CustomToolDefinition,points:Point[],width:number,height:number,color:string,lineWidth:number){
  for(const p of definition.primitives){const a=points[p.from],b=points[p.to??p.from];if(!a||!b||![a.x,a.y,b.x,b.y].every(Number.isFinite))continue;ctx.strokeStyle=p.color??color;ctx.fillStyle=p.fill??'transparent';ctx.lineWidth=lineWidth;ctx.beginPath();
    if(p.type==='line'){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    if(p.type==='rectangle'){ctx.rect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(b.x-a.x),Math.abs(b.y-a.y));if(p.fill)ctx.fill();ctx.stroke();}
    if(p.type==='ellipse'){ctx.ellipse(a.x,a.y,Math.abs(b.x-a.x),Math.abs(b.y-a.y),0,0,Math.PI*2);if(p.fill)ctx.fill();ctx.stroke();}
    if(p.type==='horizontal'){ctx.moveTo(0,a.y);ctx.lineTo(width,a.y);ctx.stroke();}
    if(p.type==='vertical'){ctx.moveTo(a.x,0);ctx.lineTo(a.x,height);ctx.stroke();}
    if(p.type==='text'){ctx.font='12px system-ui';ctx.fillStyle=p.color??color;ctx.fillText(p.text??definition.name,a.x+8,a.y-8);}
  }
}
export function hitCustomTool(definition:CustomToolDefinition,points:Point[],x:number,y:number){
  return definition.primitives.some(p=>{const a=points[p.from],b=points[p.to??p.from];if(!a||!b)return false;
    if(p.type==='horizontal')return Math.abs(y-a.y)<8;
    if(p.type==='vertical')return Math.abs(x-a.x)<8;
    if(p.type==='rectangle')return x>=Math.min(a.x,b.x)-6&&x<=Math.max(a.x,b.x)+6&&y>=Math.min(a.y,b.y)-6&&y<=Math.max(a.y,b.y)+6;
    if(p.type==='ellipse'){const rx=Math.abs(b.x-a.x),ry=Math.abs(b.y-a.y);return rx>0&&ry>0&&Math.abs(Math.hypot((x-a.x)/rx,(y-a.y)/ry)-1)<8/Math.min(rx,ry);}
    if(p.type==='text')return x>=a.x&&x<a.x+8+(p.text??definition.name).length*8&&y>a.y-23&&y<a.y;
    const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a.x-t*dx,y-a.y-t*dy)<8;
  });
}
