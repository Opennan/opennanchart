export interface Candle { time:number; open:number; high:number; low:number; close:number; volume:number }
/** Unix milliseconds, open, high, low, close, volume. */
export type CandleTuple = [number,number,number,number,number,number];
export type CandleInput = Candle | CandleTuple;
export type ScaleMode = 'linear' | 'log' | 'percent';
export type ChartStyle = 'candles' | 'line' | 'area' | 'heikin-ashi';
export type PlotStyle = 'line'|'area'|'histogram'|'columns'|'circles'|'cross';
export interface PlotPoint { index:number; time:number; value:number; color?:string }
export interface ScriptPlot { name:string; color:string; pane:'price'|'indicator'; paneId?:string; style?:PlotStyle; lineWidth?:number; baseline?:number; opacity?:number; lineStyle?:'solid'|'dashed'|'dotted'; values:PlotPoint[] }
export interface BarColor {index:number;time:number;color:string;wickColor?:string;borderColor?:string}
export interface BackgroundColor {index:number;time:number;color:string}
export interface ScriptShape {index:number;time:number;name:string;shape:'triangle-up'|'triangle-down'|'circle'|'square'|'cross';location:'abovebar'|'belowbar'|'absolute';price:number|null;color:string;text:string;size:number}
export interface ScriptFill {from:string;to:string;color:string}
export interface ScriptInputDefinition {type:'number'|'int'|'bool';defaultValue:number|boolean;editable:boolean;min?:number;max?:number;step?:number}
export interface ScriptAlert {index:number;time:number;message:string;frequency:'once-per-bar-close'}
export interface Trade { side:'long'|'short'; entryTime:number; exitTime:number; entryIndex:number; exitIndex:number; entryPrice:number; exitPrice:number; quantity:number; grossPnl:number; fees:number; pnl:number; returnPercent:number }
export interface EquityPoint { time:number; equity:number; drawdownPercent:number }
export interface ScriptResult {
  indicator?:{name:string;overlay:boolean};
  configuration:{initialCapital:number;feeBps:number;slippageBps:number;allocationPercent:number;fillModel:'next-open';equityModel:'bar-close'};
  plots:ScriptPlot[]; trades:Trade[]; equity:EquityPoint[]; logs:string[];
  barColors?:BarColor[];backgrounds?:BackgroundColor[];shapes?:ScriptShape[];fills?:ScriptFill[];
  inputs:Record<string,number|boolean>;inputDefinitions?:Record<string,ScriptInputDefinition>;alerts?:ScriptAlert[]; markers:{index:number;time:number;price:number;side:'buy'|'sell';text:string}[];
  metrics:{initialCapital:number;finalEquity:number;netProfit:number;returnPercent:number;maxDrawdownPercent:number;totalTrades:number;winRate:number;profitFactor:number|null;fees:number;openPosition:'long'|'short'|null;pendingOrder:boolean};
}
export interface BacktestOptions { initialCapital?:number; feeBps?:number; slippageBps?:number; allocationPercent?:number; inputs?:Record<string,number|boolean> }
export interface Drawing {id:string;type:string;p:{t:number;y$:number}[];color?:string;lineWidth?:number;text?:string;showPrice?:boolean}
export interface CustomToolPrimitive {type:'line'|'rectangle'|'ellipse'|'horizontal'|'vertical'|'text';from:0|1;to?:0|1;color?:string;fill?:string;text?:string}
export interface CustomToolDefinition {id:string;name:string;primitives:CustomToolPrimitive[]}
export interface ViewRange {start:number;end:number}
