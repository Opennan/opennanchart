// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Original: Madrid, Bull Bear Sentiment 2.0.
// https://www.tradingview.com/script/4vBxsw2R-Madrid-Bull-Bear-Sentiment/
// JavaScript adaptation: Copyright (c) 2026 Opennan and contributors.

export const MADRID_EXAMPLE={name:'Madrid Bull Bear Sentiment',description:'Separate pane, recursive smoothing, layered areas and dynamic colors. Formula credit: Madrid.',source:`// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Original: Madrid, Bull Bear Sentiment 2.0.
// https://www.tradingview.com/script/4vBxsw2R-Madrid-Bull-Bear-Sentiment/
// JavaScript adaptation: Copyright (c) 2026 Opennan and contributors.
// Madrid : 150424FR0007 : Bull Bear Sentiment : 2.0
// Madrid : 220120TH2201 : Conversion to PS version 5
// This measures the difference in PCT from the last Lowest/Highest Point
// to determine the overall sentiment
//
// JavaScript translation for the Opennanchart API.
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
});`};
