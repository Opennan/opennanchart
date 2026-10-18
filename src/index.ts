// Embeddable React and plain-JavaScript entry points.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {OpenNanChart,type OpenNanChartHandle,type OpenNanChartProps} from './chart/OpenNanChart';
export {OpenNanChart,DARK_COLORS} from './chart/OpenNanChart';
export type {OpenNanChartHandle,OpenNanChartProps} from './chart/OpenNanChart';
export {PlotPane} from './chart/PlotPane';
export {runSandboxedScript} from './scripting/sandbox';
export {executeScript,INDICATORS} from './engine';
export {TEMPLATES} from './scripting/templates';
export {normalizeCandle,normalizeCandles,updateCandle,sampleCandles} from './data';
export type * from './types';
/** Plain-JavaScript embedding. The container must have a nonzero height. */
export function createChart(element:HTMLElement,options:OpenNanChartProps={}):OpenNanChartHandle&{destroy:()=>void}{
  const ref=React.createRef<OpenNanChartHandle>(),root=createRoot(element);
  flushSync(()=>root.render(React.createElement(OpenNanChart,{...options,ref})));
  return new Proxy({} as OpenNanChartHandle&{destroy:()=>void},{get(_target,key){if(key==='destroy')return()=>root.unmount();const api=ref.current;if(!api)throw new Error('Chart has been destroyed.');return api[key as keyof OpenNanChartHandle];}});
}
