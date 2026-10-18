# JavaScript indicator guide

Opennanchart is created by [Opennan](https://opennan.com/). Start the workspace,
choose an example in **JavaScript → Load example**, then **Run script**. Open
**Settings** after running to edit parameters; **Apply & run** recalculates.
Author-locked inputs remain disabled. **Workspace settings** controls visible
sections, and **Expand chart** hides the surrounding menus. Escape or Exit full chart restores the selected layout. Visibility preferences are saved in this browser.

## Declare an indicator

```js
indicator({ name: 'My RSI', overlay: false });
const length = input.int('Length', 14, { min: 2, max: 200 });
const showLevels = input.bool('Show levels', true);

onBar(({ ta, plot }) => {
  plot('RSI', ta.rsi(length), { color: '#c4b5fd' });
  if (showLevels) {
    plot('Upper', 70, { color: '#fb7185', lineStyle: 'dotted' });
    plot('Lower', 30, { color: '#34d399', lineStyle: 'dotted' });
  }
});
```

Declare `indicator()` before `onBar()`. `overlay: true` defaults plots to the
price chart; `false` creates a separate pane named after the indicator. Without
a declaration, plots default to price. Override a plot with `pane: 'price'` or
`pane: 'indicator'`. `paneId: 'Momentum'` groups oscillator plots in a named pane
with its own vertical scale. All panes follow the price chart's horizontal range.
The chart holds up to 20 independent JavaScript indicator instances alongside
built-in studies. Each script may create several panes. Only one calculation
runs at a time; attached results remain visible while another script runs.
Choose **Indicators** to add another example. The eye hides one instance, the
settings icon edits only its inputs, the code icon opens its source, and ×
removes it. These controls appear beside its name or in its pane header.
The Indicators dialog also lists hidden studies so they can be shown again.
Attached JS studies survive browser reload while the local bridge stays running;
the bridge is in memory and does not persist them across server shutdown.
Changing datasets clears attached JS results.

Click the bottom panel's chevron to collapse the editor and results while keeping
the tabs visible. Clicking the active tab also collapses or expands it. Clicking
a different tab opens that panel. The draft stays saved locally.

```js
const rsiId = await chart.addIndicator(rsiSource, { inputs: { Length: 14 } });
const sentimentId = await chart.addIndicator(sentimentSource);
console.log(chart.getIndicators()); // IDs, names, visibility, individual inputs
await chart.updateIndicator(rsiId, { inputs: { Length: 21 } });
chart.setIndicatorVisibility(sentimentId, false);
chart.removeIndicator(rsiId);
```

`addIndicator()` always creates a new instance, including another copy of the same
source. `runScript()` adds a new source or updates an existing matching source.
Use an ID with `updateIndicator()` when two copies share source code.
`clearScript()` removes all managed JS studies. With React's controlled `result`
prop, the caller owns the displayed results; these methods manage the component's
internal studies when that prop is omitted.
Each instance namespaces its plot and pane references, so common names such as
`Value` do not merge scales or connect fills between unrelated studies. Later
visible instances take precedence when several scripts color the same candle.

## Bar context and state

`onBar(callback)` runs synchronously once for each supplied candle, oldest first.
Its argument provides `index`, `time`, `open`, `high`, `low`, `close`, `volume`,
`history`, `ta`, the visual functions below, `alert` and `strategy`.

`time` is Unix milliseconds. `history('close', 1)` is the previous close;
unavailable history is `null`. Negative lookbacks are rejected. Read only
current/past data. Variables declared outside the callback retain computed
state for the current run. Each new run starts that state afresh.

```js
let priorFiltered = null;
onBar(({ close, plot }) => {
  const filtered = priorFiltered === null ? close : .2 * close + .8 * priorFiltered;
  plot('Custom filter', filtered);
  priorFiltered = filtered;
});
```

Scripts are snapshots. Rerun after data changes. Streaming preserves completed
custom plots; built-in workspace studies recalculate as data changes. Supplied
candles are treated as finalized bars for the run, including the last one. If
your datafeed contains an open candle, exclude it before evaluating close-only
signals. This is not Pine's tick-by-tick rollback/repainting runtime.

## Inputs

| API | Result | Options |
| --- | --- | --- |
| `input.int(name, default, options)` | integer | `min`, `max`, `step`, `editable` |
| `input.number(name, default, options)` | number | `min`, `max`, `step`, `editable` |
| `input.bool(name, default, options)` | boolean | `editable` |

Names identify inputs. Limits validate both defaults and overrides. `step` guides
the number control; it is not a rounding rule. `editable: false` locks the input
to its default even when an API client sends an override. Use at most 32 inputs.
Values appear in `result.inputs`, definitions in `result.inputDefinitions`.

```js
const multiplier = input.number('Multiplier', 3, { min: .1, max: 20, step: .1 });
const lockedPeriod = input.int('Fixed calibration', 18, { editable: false });
```

From JS: `chart.runScript(source, { inputs: { Length: 21, 'Show levels': false } })`.
From MCP: `chart_update_parameters({indicatorId, inputs:{Length:21}})` reruns
that instance. Omitting `indicatorId` selects the last successful script.
`chart_get_indicators()` lists IDs; `chart_manage_indicator({id, visible:false})`
hides one, and `{id, remove:true}` removes it.

## Built-in calculations

`ta.sma(period, source?)`, `ema`, `rsi`, `stdev`, `highest` and `lowest` accept
OHLCV source names. Default source is close, except highest/lowest use high/low.
`ta.atr(period = 14)` uses Wilder smoothing. `ta.bbands(period = 20, multiplier
= 2)` returns `{upper, middle, lower}` on close. Periods are integers 1–5,000.
Functions return `null` until their required history exists.

EMA is SMA-seeded, which can differ from Pine's initialization. RSI uses Wilder
averages; flat windows return 50. `stdev` uses population deviation. Custom
derived series can be calculated with persistent JS variables/arrays, as shown
in the MACD and Madrid examples; `ta` source arguments are field names, not an
arbitrary computed series.

`ta.crossover(a, b, key?)` and `crossunder` compare consecutive bars. Evaluate
cross functions on every bar. Supply a stable key when calling them from
conditional logic or loops whose call order changes.

## Visuals

| Function | Behavior |
| --- | --- |
| `plot(name, value, options?)` | Named series; `null` skips a point and breaks a line. |
| `barcolor(color, options?)` | Color the main chart's candle body, regardless of indicator pane. |
| `bgcolor(color)` | Color the main chart's background at the current bar. |
| `plotshape(name, condition, options?)` | Conditional signal marker above/below the price candle or at a price. |
| `fill(fromName, toName, color)` | Fill between two named plots in the same pane. |

Plot options: `color` (may vary per bar), `pane`, `paneId`, `style`, `lineWidth`
(1–8), `baseline` (default 0), `lineStyle` (`solid`, `dashed`, `dotted`), and
`opacity` (0–1, area fill only; default .18). Styles are `line`, `area`,
`histogram`, `columns`, `circles`, and `cross`. A named series keeps its initial
style, pane, width, baseline and opacity; only its color varies across bars.
Plot declaration order controls layers. Explicit opacity 1 supports opaque
red/green sentiment areas. Histograms/columns include their baseline in autoscale.

`barcolor(null)` and `bgcolor(null)` leave the default appearance for that bar.
Bar color options are `wickColor` and `borderColor`. Colors accept hex, CSS
names and numeric rgb/hsl forms; no CSS URLs or external assets are accepted.

Shape options: `shape`: `triangle-up`, `triangle-down`, `circle`, `square`,
`cross`; `location`: `abovebar`, `belowbar`, `absolute`; `price` is required for
absolute placement; `color`, `text` (up to 40 chars), `size` (2–20 pixels).
Shape names identify a series; each named shape has at most one point per bar.
Limit: 20 plots, 20 fills, 20 named shapes and 20,000 shape points.

```js
onBar(({ open, close, plot, barcolor, bgcolor, plotshape }) => {
  const up = close > open;
  barcolor(up ? '#7dd3fc' : '#fb7185', { wickColor: '#e8e8ea' });
  bgcolor(up ? '#7dd3fc08' : null);
  plot('Body size', close - open, {
    pane: 'indicator', paneId: 'Body size', style: 'columns',
    color: up ? '#34d399' : '#fb7185'
  });
  plotshape('Up candle', up, { shape: 'circle', location: 'belowbar', size: 3 });
});
```

## Alerts and strategies

`alert('Message')` records a local event on the current supplied candle. The
same message on the same bar is deduplicated. Events are available in the
**Alerts** tab, `result.alerts` and MCP results. Limit: 10,000/run. No push,
webhook, email or server scheduler is created. Pine's running alerts apply to
realtime bars; Opennanchart records historical close-evaluation events for
inspection, so these are deliberately different services.

`strategy.entry('long' | 'short')` and `strategy.close()` queue a fill at the
next candle open. Use `strategy.position` and `strategy.equity` to inspect the
current single-position model. Fees/slippage apply on both sides. Initial
capital, allocation, fee/slippage basis points and inputs are run options.
No pyramiding, leverage/liquidation, stop/limit fills or exchange execution.
The last bar's new order remains pending. See the README's execution model.

`log(...values)` records up to 100 log lines. Source runs in a time-limited
browser worker with network, storage and DOM unavailable. Scripts cannot create
custom drawing tools directly; register those through the chart API or MCP.

## Embedding and tools

Use `createChart(element)` or `<OpenNanChart>`, then `setData`, `updateCandle`,
`appendData`, `runScript`, scales, view/drawing controls and `registerTool`.
[The README](../README.md) has complete embedding examples;
[custom-tools.md](custom-tools.md) describes declarative custom drawing tools;
[mcp.md](mcp.md) describes agent control. Retain [Opennan credits](../CREDITS.md).

`onHover` receives the hovered candle. The optional `onHoverEnd` callback fires
when the pointer leaves the price canvas; clear linked crosshairs in that callback.
