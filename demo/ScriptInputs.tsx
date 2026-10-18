import type {ScriptResult} from '../src/types';
export function ScriptInputs({result,overrides,onChange}:{result:ScriptResult;overrides:Record<string,number|boolean>;onChange:(name:string,value:number|boolean)=>void}){
  return <div className="settings-grid">{Object.entries(result.inputs).map(([name,current])=>{const definition=result.inputDefinitions?.[name],value=overrides[name]??current,locked=definition?.editable===false;
    return <label key={name}>{name}{locked&&<small>Locked by indicator author</small>}{typeof current==='boolean'?<input type="checkbox" aria-label={name} disabled={locked} checked={Boolean(value)} onChange={e=>onChange(name,e.target.checked)}/>:<input type="number" aria-label={name} disabled={locked} value={Number(value)} min={definition?.min} max={definition?.max} step={definition?.step??(definition?.type==='int'?1:'any')} onChange={e=>onChange(name,Number(e.target.value))}/>}</label>;
  })}</div>;
}
