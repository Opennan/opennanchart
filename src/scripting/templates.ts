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
  custom:{name:'Custom indicator',description:'Start with your own formula.',source:`// Every callback sees only the current and previous bars.
onBar(({ close, history, plot }) => {
  const previous = history('close', 1);
  if (previous === null) return;
  const change = (close / previous - 1) * 100;
  plot('Change %', change, { color: '#7dd3fc', pane: 'indicator' });
});`},
} as const;
export type TemplateId=keyof typeof TEMPLATES;
