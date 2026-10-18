import {useId,useRef,useState} from 'react';
import type {CustomToolDefinition} from '../src/types';
import {Icon} from './Icons';
const groups=[
  {name:'Line tools',items:[{id:'LineTool:Segment',icon:'trend',label:'Trend line'},{id:'LineTool:HorzLine',icon:'horizontal',label:'Horizontal line'},{id:'LineTool:VertLine',icon:'vertical',label:'Vertical line'}]},
  {name:'Shape tools',items:[{id:'ShapeTool:Rectangle',icon:'rectangle',label:'Rectangle'},{id:'ShapeTool:Circle',icon:'circle',label:'Circle'}]},
  {name:'Position tools',items:[{id:'PositionTool:Long',icon:'position',label:'Long position'},{id:'PositionTool:Short',icon:'position',label:'Short position'}]},
];
export function DrawingRail({tool,customTools=[],onSelect,count,onClear,onExport}:{customTools?:CustomToolDefinition[];tool:string;onSelect:(tool:string)=>void;count:number;onClear:()=>void;onExport:()=>void}){
  const id=useId(),popover=useRef<HTMLDivElement>(null),[menu,setMenu]=useState(groups[0]),[position,setPosition]=useState({top:100,left:50}),[remembered,setRemembered]=useState<Record<string,string>>({}),[open,setOpen]=useState(false);
  const direct=(id:string,icon:string,label:string)=><button key={id} title={label} aria-label={label} aria-pressed={tool===id} className={tool===id?'active':''} onClick={()=>onSelect(id)}><Icon name={icon} size={18}/></button>;
  const group=(g:typeof groups[number])=>{const selected=g.items.find(t=>t.id===tool)??g.items.find(t=>t.id===remembered[g.name])??g.items[0],active=g.items.some(t=>t.id===tool);return <div className={`rail-tool-group ${active?'active':''}`} key={g.name}><button title={selected.label} aria-label={selected.label} aria-pressed={active} onClick={()=>onSelect(selected.id)}><Icon name={selected.icon} size={18}/>{selected.id.includes('Short')&&<span className="short-tool-mark">−</span>}</button><button className="tool-group-trigger" title={g.name} aria-label={g.name} aria-haspopup="dialog" aria-expanded={open&&menu.name===g.name} aria-controls={id} popoverTarget={id} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setMenu(g);setPosition({top:Math.max(8,Math.min(r.top,innerHeight-Math.min(360,g.items.length*38+20))),left:r.right+8});}}><Icon name="chevron" size={10}/></button></div>;};
  return <aside className="drawing-rail" aria-label="Drawing tools">
    {direct('Cursor','cursor','Select and pan')}{group(groups[0])}
    {direct('FibTool:Retracement','fib','Fibonacci retracement')}{group({...groups[1],items:[...groups[1].items,...customTools.map(t=>({id:t.id,icon:'rectangle',label:t.name}))]})}
    {direct('RangeTool:PriceTime','measure','Price and time measurement')}{group(groups[2])}
    <div className="rail-spacer"/>
    <button aria-label="Clear drawings" title={`Clear ${count} drawings`} disabled={!count} onClick={onClear}><Icon name="trash" size={18}/></button>
    <button aria-label="Export chart image" title="Export chart image" onClick={onExport}><Icon name="download" size={18}/></button>
    <div id={id} ref={popover} onToggle={e=>setOpen(e.newState==='open')} popover="auto" role="dialog" aria-label={menu.name} className="tool-popover" style={position}>{menu.items.map(item=><button key={item.id} aria-label={item.label} className={tool===item.id?'active':''} onClick={()=>{onSelect(item.id);setRemembered(p=>({...p,[menu.name]:item.id}));popover.current?.hidePopover();}}><Icon name={item.icon}/><span>{item.label}</span>{tool===item.id&&<Icon name="check" size={14}/>}</button>)}</div>
  </aside>;
}
