export const DEFAULT_LAYOUT={header:true,toolbar:true,tools:true,editor:true,indicators:true,legend:true,status:true};
export type LayoutPreferences=typeof DEFAULT_LAYOUT;
export const LAYOUT_LABELS:Record<keyof LayoutPreferences,string>={header:'Product header',toolbar:'Chart toolbar',tools:'Drawing tools',editor:'JavaScript and results',indicators:'Indicator panes',legend:'Price and plot legends',status:'Chart status bar'};
export function normalizeLayout(input:unknown):LayoutPreferences{
  const out={...DEFAULT_LAYOUT};if(input&&typeof input==='object')for(const key of Object.keys(out) as (keyof LayoutPreferences)[])if(typeof (input as Record<string,unknown>)[key]==='boolean')out[key]=(input as LayoutPreferences)[key];return out;
}
export function readLayout():LayoutPreferences{try{return normalizeLayout(JSON.parse(localStorage.getItem('opennanchart:layout')??'{}'));}catch{return {...DEFAULT_LAYOUT};}}
