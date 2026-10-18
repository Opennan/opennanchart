export interface Candle { time:number; open:number; high:number; low:number; close:number; volume:number }
/** Unix milliseconds, open, high, low, close, volume. */
export type CandleTuple = [number,number,number,number,number,number];
export type CandleInput = Candle | CandleTuple;
export type ScaleMode = 'linear' | 'log' | 'percent';
export type ChartStyle = 'candles' | 'line' | 'area' | 'heikin-ashi';
export interface PlotPoint { index:number; time:number; value:number }
export interface ScriptPlot { name:string; color:string; pane:'price'|'indicator'; values:PlotPoint[] }
export interface Trade { side:'long'|'short'; entryTime:number; exitTime:number; entryIndex:number; exitIndex:number; entryPrice:number; exitPrice:number; quantity:number; grossPnl:number; fees:number; pnl:number; returnPercent:number }
export interface EquityPoint { time:number; equity:number; drawdownPercent:number }
export interface ScriptResult {
  configuration:{initialCapital:number;feeBps:number;slippageBps:number;allocationPercent:number;fillModel:'next-open';equityModel:'bar-close'};
  plots:ScriptPlot[]; trades:Trade[]; equity:EquityPoint[]; logs:string[];
  inputs:Record<string,number>; markers:{index:number;time:number;price:number;side:'buy'|'sell';text:string}[];
  metrics:{initialCapital:number;finalEquity:number;netProfit:number;returnPercent:number;maxDrawdownPercent:number;totalTrades:number;winRate:number;profitFactor:number|null;fees:number;openPosition:'long'|'short'|null;pendingOrder:boolean};
}
export interface BacktestOptions { initialCapital?:number; feeBps?:number; slippageBps?:number; allocationPercent?:number; inputs?:Record<string,number> }
export interface Drawing {id:string;type:string;p:{t:number;y$:number}[];color?:string;lineWidth?:number;text?:string;showPrice?:boolean}
export interface ViewRange {start:number;end:number}
