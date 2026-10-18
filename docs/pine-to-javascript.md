# From Pine Script to Opennanchart JavaScript

Opennanchart runs JavaScript. It does not compile Pine, load protected scripts,
or reproduce the entire TradingView runtime. Translate formulas and visual
intent explicitly, then verify values on identical OHLCV bars.

This guide was checked against TradingView's official documentation:
[execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/),
[operators/history](https://www.tradingview.com/pine-script-docs/language/operators/),
[plot visuals](https://www.tradingview.com/pine-script-docs/visuals/plots/),
[bar coloring](https://www.tradingview.com/pine-script-docs/visuals/bar-coloring/),
and [alerts](https://www.tradingview.com/pine-script-docs/concepts/alerts/).

## Translation map

| Pine concept | JavaScript equivalent |
| --- | --- |
| `indicator('Name', overlay=true)` | `indicator({name:'Name', overlay:true})` before `onBar` |
| Default separate indicator pane | `indicator({name:'Name', overlay:false})` |
| `open`, `close`, `high`, `low`, `volume` | Destructure from `onBar` context |
| `close[1]` | `history('close', 1)` |
| `na` | `null`; use explicit checks before arithmetic |
| `nz(x)` | `x ?? 0` for nullable values |
| `var` / prior recursive values | Variables outside callback, updated after computing current output |
| `:=` | Assign with `=` to a `let` variable |
| `math.*` | `Math.*` (`Math.PI`, `Math.sqrt`, `Math.exp`, `Math.cos`) |
| `input.int/float/bool` | `input.int/number/bool` with limits and editable metadata |
| `ta.sma(close, len)` | `ta.sma(len, 'close')` |
| `ta.lowest(src,len)` | `ta.lowest(len, 'close')`; see warmup difference below |
| `ta.change(computedValue)` | Keep previous computed value in a variable and subtract |
| `plot(..., style=plot.style_area)` | `plot(name,value,{style:'area',opacity:1})` for opaque fills |
| `plot.style_columns / histogram / circles` | `style:'columns' / 'histogram' / 'circles'` |
| `hline(level, linestyle=hline.style_dotted)` | `plot('Level',level,{lineStyle:'dotted'})` |
| Conditional `color` | Pass a ternary color to plot/barcolor on every bar |
| `barcolor(signal ? color.yellow : na)` | `barcolor(signal ? '#ffff00' : null)` |
| `fill(plotA,plotB,color)` | `fill('Plot A','Plot B',color)` |
| `plotshape(signal, ...)` | `plotshape('Signal',signal,{shape,location,color,text})` |
| Bar-close alert call | `alert(message)` records local close-evaluation events; not hosted realtime alerts |

JS callbacks receive primitive current-bar values. `close[1]` is not meaningful
JavaScript history access. Do not turn unavailable values into zero accidentally
through `null + number`; check for null or explicitly use the `nz` equivalent.

## Your Madrid Bull Bear Sentiment example

Choose **Load example → Madrid Bull Bear Sentiment**. The translation preserves
Madrid's credit, an 18-bar editable length, Smooth checkbox, the two-pole
recursive filter, opaque red/green areas, conditional lime/maroon line,
conditional midpoint circles and dotted 76.4/23.6 levels in its own pane.

The formula uses lowest/highest **close**, not low/high. At the start, it uses
`Math.min(length, index + 1)` so extrema include available history. The 0/0
case becomes null. Filter state retains previous raw and two previous filter
values; null history is replaced with zero only where the supplied Pine used
`nz`. Compute all current values before shifting those stored values.

```js
let previousRaw = null, filter1 = null, filter2 = null;
// Inside onBar, after computing raw and filter coefficients:
const filtered = raw === null ? null
  : c1 * (raw + (previousRaw ?? 0)) / 2
    + c2 * (filter1 ?? 0) + c3 * (filter2 ?? 0);
filter2 = filter1;
filter1 = filtered;
previousRaw = raw;
```

The complete runnable source is in `shared/templates.mjs` and is available
to agents with `chart_get_example({name:'madrid'})`.

## Your Bearish Engulfing example

Choose **Load example → Bearish Engulfing**, or ask MCP for `engulfing`.
This is the same predicate with nested ternaries written as conjunctions:

```js
indicator({ name: 'Bearish Engulfing', overlay: true });
onBar(({ open, close, history, barcolor, alert }) => {
  const previousOpen = history('open', 1);
  const previousClose = history('close', 1);
  const signal = previousOpen !== null && previousClose !== null
    && previousClose > previousOpen && open > close
    && open >= previousClose && previousOpen >= close
    && open - close > previousClose - previousOpen;
  barcolor(signal ? '#ffff00' : null);
  if (signal) alert('Bearish Engulfing Formed');
});
```

Equal body lengths do not signal because the last comparison is strict `>`.
The built-in example also provides switches for signal shapes and event
recording. Main candles can be colored even by a separate-pane indicator.

## Other indicator families researched

| Family | Current approach | Material difference/limit |
| --- | --- | --- |
| Moving averages, RSI, ATR, Bollinger | Built-in math plus runnable examples | Warmup and EMA seeding documented in JS guide |
| [MACD](https://www.tradingview.com/support/solutions/43000502344-moving-average-convergence-divergence-macd-indicator/) | `macd` example: two EMAs, recursive signal, columns, separate pane | SMA-seeded EMAs; don't promise exact Pine early-bar values |
| [Supertrend](https://www.tradingview.com/support/solutions/43000634738-supertrend/) | `supertrend`: ATR, persistent bands/direction, colored overlay | Compare initialization on the same data before using signals |
| Donchian/cloud channels | `channel`: highest/lowest and named-plot fill | Current-bar plots only; no forward displacement API |
| Candle patterns | `engulfing`: OHLC history, conditional bar colors/shapes | No hosted realtime alert scheduler |
| Custom recursive oscillators | `madrid`: JS Math, persistent state, area/circle/line plots | Explicit state replaces Pine's automatic series history |
| Ichimoku-style shifted clouds | Calculations can be written in JS | Full displaced plots are not implemented |
| [Volume profile](https://www.tradingview.com/support/solutions/43000502040-volume-profile-indicators-basic-concepts/) | Requires separate lower-timeframe/price-volume data and renderer work | OHLCV-only data cannot establish exact traded volume at each price |
| Multi-timeframe `request.security` | Fetch/align data in your host before injection | No Pine-style multi-symbol/timeframe request runtime |
| Arbitrary tables, boxes, complex tool drawings | Host/agent registers documented custom drawing tools | Worker scripts have no DOM; tools use anchored primitives |

All scripts run on a supplied historical snapshot, once per bar. Pine can rerun
on realtime ticks with rollback; this implementation does not. Pine alerts are
realtime-triggered services; local events here are historical inspection data.
Backtests model next-open single-position execution. Formula similarity alone
does not establish matching signals, fills or profitability.

See [javascript-api.md](javascript-api.md) for complete signatures and limits,
and [mcp.md](mcp.md) for an agent's read → create → run → inspect workflow.
