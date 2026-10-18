import type {ScriptResult} from './types';
export interface IndicatorInstance {id:string;source:string;visible:boolean;result:ScriptResult}
export type IndicatorInfo={id:string;name:string;visible:boolean;inputs:ScriptResult['inputs']};
export const indicatorName=(study:IndicatorInstance)=>study.result.indicator?.name??study.result.plots[0]?.name??'JavaScript indicator';
export const indicatorInfo=(study:IndicatorInstance):IndicatorInfo=>({id:study.id,name:indicatorName(study),visible:study.visible,inputs:{...study.result.inputs}});
/** Namespace series references so independent studies may reuse plot and pane names. */
export function combineIndicators(studies:readonly IndicatorInstance[],base?:ScriptResult|null):ScriptResult|null{
 const visible=studies.filter(s=>s.visible),latest=visible.at(-1)?.result??base;if(!latest)return null;
 const result:ScriptResult={...latest,plots:[...(base?.plots??[])],fills:[...(base?.fills??[])],markers:[...(base?.markers??[])],barColors:[...(base?.barColors??[])],backgrounds:[...(base?.backgrounds??[])],shapes:[...(base?.shapes??[])]};
 for(const s of visible){const key=(name:string)=>JSON.stringify([s.id,name]);
  result.plots.push(...s.result.plots.map(p=>({...p,id:key(p.name),paneId:p.pane==='indicator'?key(p.paneId??indicatorName(s)):p.paneId})));
  result.fills!.push(...(s.result.fills??[]).map(f=>({...f,from:key(f.from),to:key(f.to)})));
  result.markers.push(...s.result.markers);result.barColors!.push(...s.result.barColors??[]);result.backgrounds!.push(...s.result.backgrounds??[]);result.shapes!.push(...s.result.shapes??[]);
 }return result;
}
export function paneTitle(id:string,studies:readonly IndicatorInstance[]){
 for(const s of studies)for(const p of s.result.plots)if(p.pane==='indicator'&&JSON.stringify([s.id,p.paneId??indicatorName(s)])===id)return p.paneId??indicatorName(s);return id;
}
export function paneOwner(id:string,studies:readonly IndicatorInstance[]){return studies.find(s=>s.result.plots.some(p=>p.pane==='indicator'&&JSON.stringify([s.id,p.paneId??indicatorName(s)])===id));}
