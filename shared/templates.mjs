// Editable JavaScript examples that share the same public scripting API.
export const TEMPLATES={
  crossover:{name:'SMA crossover',description:'Two moving averages with long entries and exits.',source:`// OpenNan Script · signals execute at the next bar's open.
const fastLength = input.int('Fast length', 12, { min: 2, max: 200 });
const slowLength = input.int('Slow length', 30, { min: 3, max: 300 });

onBar(({ ta, plot, strategy }) => {
  const fast = ta.sma(fastLength);
  const slow = ta.sma(slowLength);

  plot('Fast SMA', fast, { color: '#7dd3fc' });
  plot('Slow SMA', slow, { color: '#c4b5fd' });

  if (ta.crossover(fast, slow)) strategy.entry('long');
  if (ta.crossunder(fast, slow)) strategy.close();
});`},
  ema:{name:'EMA ribbon',description:'Exponential moving averages over price.',source:`onBar(({ ta, plot }) => {
  plot('EMA 9', ta.ema(9), { color: '#7dd3fc' });
  plot('EMA 21', ta.ema(21), { color: '#c4b5fd' });
  plot('EMA 55', ta.ema(55), { color: '#fbbf24' });
});`},
  rsi:{name:'RSI oscillator',description:'Wilder RSI in its own indicator pane.',source:`const length = input.int('RSI length', 14, { min: 2, max: 200 });

onBar(({ ta, plot }) => {
  const options = { pane: 'indicator' };
  plot('RSI', ta.rsi(length), { ...options, color: '#c4b5fd' });
  plot('Overbought', 70, { ...options, color: '#fb7185' });
  plot('Oversold', 30, { ...options, color: '#34d399' });
});`},
  bands:{name:'Bollinger bands',description:'A rolling average and volatility bands.',source:`const length = input.int('Length', 20, { min: 2, max: 200 });
const multiplier = input.number('Deviation', 2, { min: 0.1, max: 5 });

onBar(({ ta, plot }) => {
  const bands = ta.bbands(length, multiplier);
  plot('Upper band', bands.upper, { color: '#7dd3fc' });
  plot('Middle band', bands.middle, { color: '#c4b5fd' });
  plot('Lower band', bands.lower, { color: '#7dd3fc' });
});`},
  atr:{name:'ATR volatility',description:'Average true range in a separate pane.',source:`onBar(({ ta, plot }) => {
  plot('ATR 14', ta.atr(14), { color: '#fbbf24', pane: 'indicator' });
});`},
  madrid:{name:'Madrid Bull Bear Sentiment',description:'Separate pane, recursive smoothing, layered areas and dynamic colors. Formula credit: Madrid.',source:`// Formula: Madrid, Bull Bear Sentiment 2.0 (2015; Pine v5 update 2022).
// JavaScript translation of the user-supplied example.
indicator({ name: 'Madrid Bull Bear Sentiment', overlay: false });
const length = input.int('Length', 18, { min: 1, max: 5000 });
const smooth = input.bool('Smooth', true);
const angle = Math.SQRT2 * Math.PI / 5;
const a1 = Math.exp(-angle);
const c2 = 2 * a1 * Math.cos(angle), c3 = -a1 * a1;
const c1 = 1 - c2 - c3;
let previousRaw = null, filter1 = null, filter2 = null, previous = null;

onBar(({ index, close, ta, plot }) => {
  // Pine extrema use the available history at the start of a dataset.
  const window = Math.min(length, index + 1);
  const lowest = ta.lowest(window, 'close');
  const highest = ta.highest(window, 'close');
  const bull = (close - lowest) * 100 / lowest;
  const bear = (highest - close) * 100 / highest;
  const raw = bull + bear === 0 ? null : bull * 100 / (bear + bull);
  const filtered = raw === null ? null : c1 * (raw + (previousRaw ?? 0)) / 2
    + c2 * (filter1 ?? 0) + c3 * (filter2 ?? 0);
  const sentiment = smooth ? filtered : raw;
  filter2 = filter1; filter1 = filtered; previousRaw = raw;

  // Declaration order controls layers: red area, green area, then levels/line.
  plot('Bear area', 100, { color: '#ff0000', style: 'area', opacity: 1 });
  plot('Bull area', sentiment, { color: '#008000', style: 'area', opacity: 1 });
  plot('Sentiment', sentiment, { color: sentiment !== null && previous !== null && sentiment >= previous ? '#00ff00' : '#800000' });
  plot('Midpoint', 50, { color: sentiment !== null && sentiment >= 50 ? '#00ff00' : '#ff0000', style: 'circles', lineWidth: 1 });
  plot('Overbought', 76.4, { color: '#ffffff', lineStyle: 'dotted', lineWidth: 1 });
  plot('Oversold', 23.6, { color: '#ffffff', lineStyle: 'dotted', lineWidth: 1 });
  previous = sentiment;
});`},
  engulfing:{name:'Bearish Engulfing',description:'Yellow signal candles and recorded bar-close alerts on the price chart.',source:`indicator({ name: 'Bearish Engulfing', overlay: true });
const showSignals = input.bool('Show signal shapes', true);
const enableAlerts = input.bool('Record alerts', true);

onBar(({ open, close, history, barcolor, plotshape, alert }) => {
  const previousOpen = history('open', 1);
  const previousClose = history('close', 1);
  const signal = previousOpen !== null && previousClose !== null
    && previousClose > previousOpen && open > close
    && open >= previousClose && previousOpen >= close
    && open - close > previousClose - previousOpen;
  barcolor(signal ? '#ffff00' : null);
  plotshape('Bearish engulfing', signal && showSignals, {
    shape: 'triangle-down', location: 'abovebar', color: '#ffff00', text: 'BE'
  });
  if (signal && enableAlerts) alert('Bearish Engulfing Formed');
});`},
  macd:{name:'MACD histogram',description:'Separate pane with an EMA signal, histogram columns and editable inputs.',source:`indicator({ name: 'MACD', overlay: false });
const fast = input.int('Fast length', 12, { min: 1, max: 500 });
const slow = input.int('Slow length', 26, { min: 2, max: 500 });
const signalLength = input.int('Signal length', 9, { min: 1, max: 500 });
let signal = null;
const seed = [];
onBar(({ ta, plot }) => {
  const a = ta.ema(fast), b = ta.ema(slow);
  if (a === null || b === null) return;
  const macd = a - b;
  if (signal === null) {
    seed.push(macd);
    if (seed.length === signalLength) signal = seed.reduce((a, b) => a + b, 0) / signalLength;
  } else signal += 2 / (signalLength + 1) * (macd - signal);
  const histogram = signal === null ? null : macd - signal;
  plot('Histogram', histogram, { style: 'columns', color: histogram >= 0 ? '#34d399' : '#fb7185' });
  plot('MACD', macd, { color: '#7dd3fc' });
  plot('Signal', signal, { color: '#fbbf24' });
  plot('Zero', 0, { color: '#a0a6b1', lineStyle: 'dotted' });
});`},
  channel:{name:'Donchian cloud',description:'Price overlay with a filled channel and breakout signals.',source:`indicator({ name: 'Donchian channel', overlay: true });
const length = input.int('Length', 20, { min: 2, max: 500 });
onBar(({ ta, plot, fill }) => {
  plot('Upper', ta.highest(length), { color: '#7dd3fc' });
  plot('Lower', ta.lowest(length), { color: '#c4b5fd' });
  fill('Upper', 'Lower', '#7dd3fc18');
});`},
  supertrend:{name:'Supertrend',description:'ATR-based recursive trend overlay and candle colors.',source:`indicator({ name: 'Supertrend', overlay: true });
const length = input.int('ATR length', 10, { min: 1, max: 500 });
const multiplier = input.number('Multiplier', 3, { min: 0.1, max: 20, step: 0.1 });
let upper = null, lower = null, previousClose = null, trend = null;
onBar(({ high, low, close, ta, plot, barcolor }) => {
  const atr = ta.atr(length);
  if (atr === null) { previousClose = close; return; }
  const midpoint = (high + low) / 2;
  const basicUpper = midpoint + multiplier * atr, basicLower = midpoint - multiplier * atr;
  const oldUpper = upper, oldLower = lower, oldTrend = trend;
  upper = oldUpper === null || basicUpper < oldUpper || previousClose > oldUpper ? basicUpper : oldUpper;
  lower = oldLower === null || basicLower > oldLower || previousClose < oldLower ? basicLower : oldLower;
  const up = oldTrend === null ? false : oldTrend === oldUpper ? close > upper : close >= lower;
  trend = up ? lower : upper;
  const color = up ? '#34d399' : '#fb7185';
  plot('Supertrend', trend, { color, lineWidth: 2 });
  barcolor(color);
  previousClose = close;
});`},
  custom:{name:'Custom indicator',description:'Start with your own formula.',source:`// Every callback sees only the current and previous bars.
onBar(({ close, history, plot }) => {
  const previous = history('close', 1);
  if (previous === null) return;
  const change = (close / previous - 1) * 100;
  plot('Change %', change, { color: '#7dd3fc', pane: 'indicator' });
});`},
};
