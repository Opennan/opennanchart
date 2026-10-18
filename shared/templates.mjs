// SPDX-License-Identifier: MIT
// Editable JavaScript examples that share the same public scripting API.
import {MADRID_EXAMPLE} from './examples/madrid.mjs';
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
  madrid: MADRID_EXAMPLE,
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
