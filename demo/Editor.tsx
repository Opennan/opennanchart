// Local CodeMirror editor with JavaScript highlighting and persistent caller-owned state.
import {useEffect,useRef} from 'react';
import {EditorView,keymap} from '@codemirror/view';
import {EditorState} from '@codemirror/state';
import {basicSetup} from 'codemirror';
import {javascript} from '@codemirror/lang-javascript';
import {HighlightStyle,syntaxHighlighting} from '@codemirror/language';
import {tags} from '@lezer/highlight';
const highlighting=HighlightStyle.define([
  {tag:tags.keyword,color:'#c4b5fd'},{tag:[tags.string,tags.special(tags.string)],color:'#34d399'},
  {tag:[tags.number,tags.bool,tags.null],color:'#fbbf24'},{tag:tags.comment,color:'#8993a3'},
  {tag:[tags.function(tags.variableName),tags.function(tags.propertyName)],color:'#7dd3fc'},
  {tag:[tags.variableName,tags.propertyName],color:'#d3dae4'},{tag:tags.operator,color:'#a0a6b1'},
]);
export function CodeEditor({value,onChange,onRun}:{value:string;onChange:(source:string)=>void;onRun:()=>void}){
  const host=useRef<HTMLDivElement>(null),editor=useRef<EditorView|null>(null),handlers=useRef({onChange,onRun});handlers.current={onChange,onRun};
  useEffect(()=>{if(!host.current)return;const view=new EditorView({parent:host.current,state:EditorState.create({doc:value,extensions:[basicSetup,javascript(),syntaxHighlighting(highlighting),EditorView.contentAttributes.of({'aria-label':'JavaScript indicator editor',spellcheck:'false'}),keymap.of([{key:'Mod-Enter',run:()=>{handlers.current.onRun();return true;}}]),EditorView.updateListener.of(update=>{if(update.docChanged)handlers.current.onChange(update.state.doc.toString());}),EditorView.theme({'&':{height:'100%',color:'#d3dae4',backgroundColor:'#0b0e12',fontSize:'12px'},'.cm-scroller':{fontFamily:'"SFMono-Regular",Consolas,"Liberation Mono",monospace',lineHeight:'1.8'},'.cm-content':{padding:'12px 0',caretColor:'#7dd3fc'},'.cm-gutters':{background:'#0b0e12',color:'#657082',border:'none',minWidth:'40px'},'.cm-activeLine,.cm-activeLineGutter':{backgroundColor:'#ffffff04'},'.cm-cursor':{borderLeftColor:'#7dd3fc'},'&.cm-focused':{outline:'none'},'.cm-selectionBackground, &.cm-focused .cm-selectionBackground':{backgroundColor:'#7dd3fc26'},'.cm-matchingBracket':{backgroundColor:'#7dd3fc20',outline:'1px solid #7dd3fc55'}} ,{dark:true})]})});editor.current=view;return()=>{view.destroy();editor.current=null;};},[]);
  useEffect(()=>{const view=editor.current;if(view&&view.state.doc.toString()!==value)view.dispatch({changes:{from:0,to:view.state.doc.length,insert:value}});},[value]);
  return <div className="code-editor" ref={host}/>;
}
