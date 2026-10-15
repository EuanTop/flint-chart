import type { ThemeSpec } from 'flint-chart';
import research from '../research/ibm-carbon.json';
import { cardProbe, EV_SHARE, flintInput, paletteCountProbe, POPULATION } from '../probes';
import { houseConfig, W, H as HEIGHT, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

// IBM Plex Sans is loaded on the page; IBM Plex Sans Condensed is not, so the axis face falls back.
const PLEX = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
const COND = "'IBM Plex Sans Condensed', 'Arial Narrow', 'IBM Plex Sans', sans-serif";

/** The light-theme categorical sequence, applied strictly in this order. */
const SEQUENCE = ['#6929c4', '#1192e8', '#005d5d', '#9f1853', '#fa4d56', '#570408', '#198038', '#002d9c', '#ee538b', '#b28600', '#009d9a', '#012749', '#8a3800', '#a56eff'];

const TEXT = '#161616';
const TEXT2 = '#525252';
const GRID = '#e0e0e0';
const AXIS = '#8d8d8d';
const FOCUS = '#0f62fe';

const t: HouseTokens = {
  font: COND,
  titleFont: PLEX,
  text: TEXT,
  muted: TEXT2,
  grid: GRID,
  axis: AXIS,
  background: '#ffffff',
  palette: SEQUENCE,
  highlight: SEQUENCE[0],
  context: '#c6c6c6',
  titleSize: 16,
  titleWeight: 600,
  subtitleSize: 12,
  subtitleColor: TEXT2,
  labelSize: 12,
  gridAxis: 'both',
  lineWidth: 1.5,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'ibm-carbon',
  label: 'IBM Carbon (white theme)',
  ink: {
    surface: { source: 'house', canvas: '#ffffff', plot: '#ffffff' },
    text: { primary: TEXT, secondary: TEXT2, muted: '#6f6f6f', inverse: '#ffffff' },
    structure: { axis: AXIS, grid: GRID, zero: AXIS, rule: AXIS },
    series: {
      single: SEQUENCE[0],
      categorical: SEQUENCE,
      // The fixed palettes for a predictable count of one to five series (R6); above five, the sequence.
      categoricalByCount: {
        2: ['#6929c4', '#009d9a'],
        3: ['#a56eff', '#005d5d', '#9f1853'],
        4: ['#9f1853', '#fa4d56', '#570408', '#a56eff'],
        5: ['#6929c4', '#1192e8', '#005d5d', '#9f1853', '#570408'],
      },
      sequential: { stops: ['#edf5ff', '#d0e2ff', '#a6c8ff', '#78a9ff', '#4589ff', '#0f62fe', '#0043ce', '#002d9c', '#001d6c', '#001141'], space: 'lab' },
      diverging: {
        stops: ['#750e13', '#a2191f', '#da1e28', '#fa4d56', '#ff8389', '#ffb3b8', '#ffd7d9', '#fff1f1', '#e5f6ff', '#bae6ff', '#82cfff', '#33b1ff', '#1192e8', '#0072c3', '#00539a', '#003a6d'],
        neutral: '#f4f4f4',
        space: 'lab',
      },
      status: { positive: '#198038', negative: '#da1e28', neutral: '#f1c21b' },
    },
    accent: FOCUS,
  },
  type: {
    headline: { family: PLEX, size: 16, weight: 'semibold', color: TEXT },
    deck: { family: PLEX, size: 12, color: TEXT2 },
    axisLabel: { family: COND, size: 12, color: TEXT2 },
    axisTitle: { family: PLEX, size: 12, weight: 'regular', color: TEXT },
    keyLabel: { family: COND, size: 12, color: TEXT2 },
    valueLabel: { family: COND, size: 12, color: TEXT2 },
    annotation: { family: COND, size: 12, color: TEXT2 },
    footnote: { family: COND, size: 12, color: TEXT2 },
    display: { family: PLEX, size: 42, weight: 'regular', color: TEXT },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1, ticks: 'omit', labelGap: 6 },
      measure: { line: 'full', lineWeight: 1, ticks: 'omit', labelGap: 6, tickDensity: 'sparse' },
    },
    grid: { measure: 'quiet', category: 'quiet', style: 'solid', weight: 1, zero: 'full' },
    frame: 'omit',
    baseline: 'full',
  },
  marks: {
    bandFraction: 0.75,
    strokeWeight: 1.5,
    interpolation: 'linear',
    separator: { presence: 'full', width: 1.5, source: 'surface' },
  },
  geometry: {
    line: { width: 1.5, interpolation: 'linear' },
    point: { presence: 'full', size: 50, vertexSize: 28, fill: 'hollow', outlineWidth: 1.5 },
    band: { fraction: 0.75, cornerRadius: 0 },
  },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'always', axisTitlePlacement: 'rotated', unitsInAxisTitle: true, numberFormat: { thousands: 'separator' } },
  layout: { density: 'normal', titleBlock: { anchor: 'start', gap: 'normal' } },
  interaction: { selectionBoundary: { color: FOCUS, width: 2 } },
};

// ---------------------------------------------------------------------------
// The anatomy specimen: two metrics over a week.

const DAYS = ['2017-08-08', '2017-08-09', '2017-08-10', '2017-08-11', '2017-08-12', '2017-08-13', '2017-08-14'];
const OPEN = [4.6, 7.7, 10.8, 10.2, 5.8, 5.1, 6.4];
const UNSUB = [8.9, 8.4, 4.8, 18.7, 15.9, 14.3, 12.1];
const CLICKS = DAYS.flatMap((Day, i) => [
  { Day, Metric: 'Open rate', 'Clicks in thousands': OPEN[i] },
  { Day, Metric: 'Unsubscribe rate', 'Clicks in thousands': UNSUB[i] },
]);
const METRICS = ['Open rate', 'Unsubscribe rate'];
const PAIR = ['#1192e8', '#005d5d'];

const icon = (path: string) => `<svg width="18" height="18" viewBox="0 0 32 32" fill="none" stroke="${TEXT}" stroke-width="2">${path}</svg>`;
const ZOOM_IN = icon('<circle cx="13" cy="13" r="9"/><path d="M20 20l8 8M13 9v8M9 13h8"/>');
const ZOOM_OUT = icon('<circle cx="13" cy="13" r="9"/><path d="M20 20l8 8M9 13h8"/>');
const KEBAB = `<svg width="18" height="18" viewBox="0 0 32 32" fill="${TEXT}"><circle cx="16" cy="8" r="2"/><circle cx="16" cy="16" r="2"/><circle cx="16" cy="24" r="2"/></svg>`;

const titleRow = (title: string, color = TEXT, toolbar = true) =>
  `<div style="display:flex;justify-content:space-between;align-items:center;margin:0 14px 6px;font-family:${PLEX};font-size:16px;font-weight:600;color:${color}">`
  + `<span>${title}</span>${toolbar ? `<span style="display:flex;gap:12px">${ZOOM_IN}${ZOOM_OUT}${KEBAB}</span>` : ''}</div>`;

const dayAxis = {
  format: '%-d %b', labelExpr: "datum.index === 0 ? utcFormat(datum.value, '%-d %b %Y') : utcFormat(datum.value, '%-d %b')",
  tickCount: { interval: 'day', step: 1 }, domain: true, domainColor: AXIS, grid: true, gridColor: GRID, ticks: false,
  labelFont: COND, labelColor: TEXT2, labelFontSize: 12, labelPadding: 6, labelAngle: 0,
  title: 'Day', titleFont: PLEX, titleColor: TEXT, titleFontSize: 12, titleFontWeight: 'normal', titlePadding: 10,
};
const clicksAxis = {
  tickCount: 2, domain: true, domainColor: AXIS, grid: true, gridColor: GRID, ticks: false,
  labelFont: COND, labelColor: TEXT2, labelFontSize: 12, labelPadding: 6,
  title: 'Clicks in thousands', titleFont: PLEX, titleColor: TEXT, titleFontSize: 12, titleFontWeight: 'normal', titlePadding: 10,
};

const carbonLegend = {
  orient: 'bottom', direction: 'horizontal', title: null, symbolType: 'square', symbolSize: 169, symbolStrokeWidth: 0,
  labelFont: COND, labelFontSize: 12, labelColor: TEXT2, columnPadding: 16, offset: 18,
  // A line's key swatch is a stroke by default; Carbon's is a filled 13px square.
  encoding: { symbols: { fill: { value: { expr: "scale('color', datum.value)" } }, strokeWidth: { value: 0 } } },
};

function clicksLayers(o: { ruler?: boolean } = {}) {
  const x = { field: 'Day', type: 'temporal', title: 'Day', scale: { type: 'utc' }, axis: dayAxis };
  const y = { field: 'Clicks in thousands', type: 'quantitative', scale: { domain: [0, 20] }, axis: clicksAxis };
  const color = { field: 'Metric', type: 'nominal', scale: { domain: METRICS, range: PAIR }, legend: carbonLegend };
  const hovered = CLICKS.filter((row) => row.Day === '2017-08-11');
  return [
    { data: { values: CLICKS }, mark: { type: 'line', strokeWidth: 1.5 }, encoding: { x, y, color } },
    ...(o.ruler
      ? [
        { data: { values: [{ Day: '2017-08-11' }] }, mark: { type: 'rule', color: TEXT, strokeDash: [3, 3], strokeWidth: 1 }, encoding: { x: { field: 'Day', type: 'temporal', scale: { type: 'utc' } } } },
        { data: { values: hovered }, mark: { type: 'point', filled: true, size: 40, opacity: 1 }, encoding: { x: { field: 'Day', type: 'temporal', scale: { type: 'utc' } }, y: { field: 'Clicks in thousands', type: 'quantitative' }, color: { field: 'Metric', type: 'nominal', scale: { domain: METRICS, range: PAIR }, legend: null } } },
      ]
      : [{ data: { values: CLICKS }, mark: { type: 'point', filled: false, fill: '#ffffff', size: 28, strokeWidth: 1.5, opacity: 1 }, encoding: { x: { field: 'Day', type: 'temporal', scale: { type: 'utc' } }, y: { field: 'Clicks in thousands', type: 'quantitative' }, color: { field: 'Metric', type: 'nominal', scale: { domain: METRICS, range: PAIR }, legend: null } } }]),
  ];
}

function signatureExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 14, right: 14, top: 4, bottom: 10 } },
    width: W,
    height: 190,
    layer: clicksLayers(),
  };
}

/** The hover state: a dashed ruler, filled dots, the white elevated tooltip with colour strips. */
function tooltipExpected() {
  const at = { datum: { year: 2017, month: 8, date: 11, utc: true }, type: 'temporal' };
  const box = (y: number, y2: number, fill: string, x0 = 12, x1 = 170) => ({
    data: { values: [{}] },
    mark: { type: 'rect', fill, xOffset: x0, x2Offset: x1 },
    encoding: { x: at, x2: { datum: { year: 2017, month: 8, date: 11, utc: true } }, y: { value: y }, y2: { value: y2 } },
  });
  const text = (y: number, label: string, o: { right?: boolean; bold?: boolean; dx?: number } = {}) => ({
    data: { values: [{}] },
    mark: { type: 'text', text: label, align: o.right ? 'right' : 'left', baseline: 'middle', font: COND, fontSize: 12, fontWeight: o.bold ? 600 : 'normal', color: TEXT, xOffset: o.dx ?? (o.right ? 164 : 22) },
    encoding: { x: at, y: { value: y } },
  });
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 14, right: 14, top: 4, bottom: 10 } },
    width: W,
    height: 190,
    layer: [
      ...clicksLayers({ ruler: true }),
      box(58, 132, 'rgba(0,0,0,0.10)', 13, 172),
      box(56, 130, '#ffffff'),
      box(80, 81, GRID),
      box(105, 106, GRID),
      box(83, 103, PAIR[0], 12, 15),
      box(108, 128, PAIR[1], 12, 15),
      text(68, 'Day', { bold: true }),
      text(68, 'Aug 11', { bold: true, right: true }),
      text(93, 'Open rate'),
      text(93, '10.2', { right: true }),
      text(118, 'Unsubscribe rate'),
      text(118, '18.7', { right: true }),
    ],
  };
}

// ---------------------------------------------------------------------------
// Landmark labels: the label that starts a new year is semibold.

const NEW_YEAR = ['2017-12-28', '2017-12-29', '2017-12-30', '2017-12-31', '2018-01-01', '2018-01-02', '2018-01-03', '2018-01-04', '2018-01-05']
  .map((Day, i) => ({ Day, 'Click rate (%)': [11.2, 10.8, 7.1, 9.4, 21.5, 18.4, 16.4, 12.7, 15.6][i] }));

function landmarkExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 14, right: 22, top: 4, bottom: 10 } },
    width: W,
    height: 180,
    data: { values: NEW_YEAR },
    layer: [
      { mark: { type: 'line', strokeWidth: 1.5, color: '#002d9c' } },
      { mark: { type: 'point', filled: true, fill: '#ffffff', stroke: '#002d9c', strokeWidth: 1.5, size: 28, opacity: 1 } },
    ],
    encoding: {
      x: {
        field: 'Day', type: 'temporal', title: 'Time', scale: { type: 'utc' },
        axis: {
          ...dayAxis, title: 'Time', labelAngle: -45, labelAlign: 'right',
          labelExpr: "datum.index === 0 || utcFormat(datum.value, '%-d %b') === '1 Jan' ? utcFormat(datum.value, '%-d %b %Y') : utcFormat(datum.value, '%-d')",
          labelFontWeight: { condition: { test: "datum.index === 0 || utcFormat(datum.value, '%-d %b') === '1 Jan'", value: 600 }, value: 'normal' },
        },
      },
      y: { field: 'Click rate (%)', type: 'quantitative', scale: { domain: [0, 25] }, axis: { ...clicksAxis, tickCount: 5, title: 'Click rate / %' } },
    },
  };
}

// ---------------------------------------------------------------------------
// Legend hover: every other series drops to 30% opacity.

const EV4 = ['Norway', 'China', 'Germany', 'United States'];

function hoverExpected() {
  const rows = EV_SHARE.filter((row) => EV4.includes(row.Country));
  const color = { field: 'Country', type: 'nominal', scale: { domain: EV4, range: SEQUENCE.slice(0, 4) }, legend: { ...carbonLegend, symbolOpacity: 1 } };
  const opacity = { condition: { test: "datum.Country === 'China'", value: 1 }, value: 0.3 };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 14, right: 14, top: 4, bottom: 10 } },
    width: W,
    height: 180,
    data: { values: rows },
    mark: { type: 'line', strokeWidth: 1.5 },
    encoding: {
      x: { field: 'Year', type: 'quantitative', axis: { ...dayAxis, format: 'd', labelExpr: 'datum.label', tickCount: 6, title: 'Year' } },
      y: { field: 'EV share (%)', type: 'quantitative', axis: { ...clicksAxis, tickCount: 5, title: 'EV share / %' } },
      color,
      opacity,
    },
  };
}

// ---------------------------------------------------------------------------
// Dark theme (g100): the same chart, a different palette, not only a darker ground.

const STREAM_DAYS = Array.from({ length: 13 }, (_, i) => `2019-08-${String(8 + i).padStart(2, '0')}`);
const STREAM = STREAM_DAYS.flatMap((Day, i) => [
  { Day, Rate: 'Open rate', Value: [10, 13, 13, 15, 14, 17, 16, 17, 18, 17, 21, 23, 26][i] },
  { Day, Rate: 'Click rate', Value: [6, 5, 4, 6, 7, 9, 7, 7, 9, 6, 7, 4, 2][i] },
  { Day, Rate: 'Unsubscribe rate', Value: [19, 13, 12, 15, 8, 9, 7, 10, 6, 8, 2, 1, 1][i] },
]);
const RATES = ['Open rate', 'Click rate', 'Unsubscribe rate'];

function darkExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig({ ...t, background: '#161616', text: '#f4f4f4', muted: '#c6c6c6', grid: '#393939', axis: '#6f6f6f' }), padding: { left: 14, right: 14, top: 4, bottom: 10 } },
    width: W,
    height: 180,
    data: { values: STREAM },
    mark: { type: 'area', interpolate: 'monotone', stroke: '#161616', strokeWidth: 1 },
    encoding: {
      x: { field: 'Day', type: 'temporal', scale: { type: 'utc' }, axis: { ...dayAxis, labelExpr: "utcFormat(datum.value, '%-d %b')", labelAngle: -45, labelAlign: 'right', labelColor: '#c6c6c6', domainColor: '#6f6f6f', gridColor: '#393939', titleColor: '#f4f4f4' } },
      y: { field: 'Value', type: 'quantitative', stack: 'center', axis: null },
      color: { field: 'Rate', type: 'nominal', sort: RATES, scale: { domain: RATES, range: ['#08bdba', '#d4bbff', '#4589ff'] }, legend: { ...carbonLegend, labelColor: '#c6c6c6' } },
      order: { field: 'order', type: 'quantitative', sort: 'descending' },
    },
    transform: [{ calculate: `indexof(${JSON.stringify(RATES)}, datum.Rate)`, as: 'order' }],
  };
}

// ---------------------------------------------------------------------------
// Bars capped at 16px.

const TOP4 = POPULATION.slice(0, 4);

function thinBarsExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 14, right: 14, top: 4, bottom: 10 } },
    width: W,
    height: HEIGHT,
    data: { values: TOP4 },
    mark: { type: 'bar', height: 16, color: SEQUENCE[0] },
    encoding: {
      y: { field: 'Country', type: 'nominal', sort: null, axis: { ...clicksAxis, grid: false, title: null } },
      x: { field: 'Population', type: 'quantitative', axis: { ...clicksAxis, tickCount: 5, title: 'Population / millions' } },
    },
  };
}

const carbon: StyleGuideTheme = {
  id: 'ibm-carbon',
  org: 'IBM Design Language / Carbon Design System — Data visualization (Carbon Charts)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the Carbon palette data, the carbon-charts SCSS and `configuration.ts`, and the white-theme tokens. IBM Plex Sans is loaded on this page and states every title; IBM Plex Sans Condensed (axes, legend, tooltip) is not, so it is named with an Arial Narrow fallback.',
    'Stated directly: the 14-colour light sequence in its strict order, Purple 70 as the single-series ink, the 10-step blue sequential and red–cyan diverging palettes, the alert colours as status inks, `#161616` / `#525252` text, `#e0e0e0` gridlines in **both** directions, `#8d8d8d` axis lines on both axes with no tick marks, 1.5px straight lines with hollow 3px-radius vertices, 1.5px surface dividers between stacked segments, a bottom-left untitled key, rotated axis titles carrying units, Focus blue for selection.',
    'Stated since R6: the fixed palettes for two to five series (`categoricalByCount`). Not stated: the 16px bar cap; the dark themes (g90/g100) with their own categorical sequence; the semibold landmark date labels; and everything that lives in the product chrome — tile, toolbar, tooltip and the 30% hover dimming. See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look: the chart-anatomy specimen',
      kind: 'visual-quality',
      severity: 'medium',
      observed: "Flint gets the type, the both-ways grid, the grey axis lines, the missing ticks and the rotated “Clicks in thousands” right. It differs in the colours (Purple 70 + Cyan 50 from the sequence, not the Cyan 50 + Teal 70 pair), the dates (“Aug 8, 2017, 9, 10 …” instead of “8 Aug 2017, 9 Aug …”), the key (hollow circles, centred under the plot rather than filled squares at the left), and the vertices: the hollow 3px points come out as white rings with no fill, invisible on the lines. No toolbar.",
      probe: 'signature',
      rule: 'Chart anatomy: a 16px semibold Plex Sans title top-left with the toolbar (zoom in, zoom out, overflow ⋮) on the same row; a full light-grey grid in both directions; grey axis lines on the left and bottom, no tick marks; 12px condensed grey tick labels, the first date carrying its year (“8 Aug 2017”, “9 Aug” …); a rotated y title with the unit and an x title below; 1.5px straight lines; the key bottom-left with 13px square swatches. Two series take the fixed two-colour pair Cyan 50 + Teal 70.',
      current: 'The theme states the type, grid, axes, line weight and key; Flint takes the first two inks of the 14-colour sequence (Purple 70, Cyan 50) because it cannot know Carbon’s two-series palette, formats dates its own way, and has no toolbar.',
      expected: 'The anatomy chart with the toolbar in the title row.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: CLICKS,
        semantic_types: { Day: 'Date', Metric: 'Category', 'Clicks in thousands': 'Quantity' },
        encodings: { x: 'Day', y: 'Clicks in thousands', color: 'Metric' },
        title: 'Clicks of CTA in emails over time',
      }),
      expectedSpec: signatureExpected(),
      expectedFrame: { headerHtml: titleRow('Clicks of CTA in emails over time') },
    },
    {
      id: 'count-palette',
      addressed: { stage: 'R6', note: 'The house states its one-to-five-series sets as `ink.series.categoricalByCount`.' },
      title: 'A fixed palette for each series count from one to five',
      kind: 'expressiveness',
      severity: 'high',
      observed: "Flint draws the three lines in Purple 70, Cyan 50 and Teal 70 — the sequence’s first three; the expected panel uses the prescribed three-series set Purple 50, Teal 70, Magenta 70, which separates Germany from China far more clearly than two blues-and-teals.",
      probe: 'count-palette',
      rule: '“You can override the categorical sequence with one of the following palettes if the exact number of data categories is predictable.” 1 series: Purple 70 (or Blue 80, Cyan 50, Teal 70); 2: Purple 70 + Teal 50; 3: Purple 50, Teal 70, Magenta 70; 4: Magenta 70, Red 50, Red 90, Purple 50; 5: Purple 70, Cyan 50, Teal 70, Magenta 70, Red 90. Above five, the 14-colour sequence “applied in sequence strictly”.',
      current: '`ink.series.categorical` is one ordered list, so a three-series chart takes the sequence’s first three (Purple 70, Cyan 50, Teal 70). A `variants` guard on `seriesCount` exists, but variants may not change `ink`.',
      expected: 'Three series in the three-colour palette: Purple 50 `#a56eff`, Teal 70 `#005d5d`, Magenta 70 `#9f1853`.',
      proposal: '`ink.series.categoricalByCount: { 1: [...], 2: [...], 3: [...], 4: [...], 5: [...] }`, chosen before `categorical` when the series count matches — or allow `ink.series` inside a `variants[].then` keyed by `seriesCount`.',
      ...paletteCountProbe(theme, t, { n: 3, palette: ['#a56eff', '#005d5d', '#9f1853'], title: 'Norway leads electric-car sales' }),
    },
    {
      id: 'landmark-labels',
      title: 'Landmark date labels: semibold where a new day, month or year begins',
      kind: 'expressiveness',
      severity: 'low',
      observed: "Flint already marks the year change (“28 29 30 31 Jan 2018 2 3”), but at the same weight as its neighbours and without a month on the first tick; its y axis starts at 5. Expected: “28 Dec 2017” and “1 Jan 2018” in semibold, bare day numbers between, labels turned 45° as in the guide’s specimen.",
      probe: 'date-label-format',
      rule: '“Whenever data crosses into a new time cycle … semibold the label to make it a ‘landmark’ label.” Ordinary ticks show only the changing unit; the landmark carries the larger one too (“1 Jan 2018”).',
      current: 'There is no date-format field and no weight rule for a subset of tick labels; Flint formats the time axis with one pattern at one weight.',
      expected: 'Days crossing into 2018: “28 Dec 2017” and “1 Jan 2018” semibold, the other days as bare numbers, labels turned 45° as in the specimen.',
      proposal: '`labels.time: { landmarks: "cycle", landmarkWeight: "semibold", format: { day: "%-d", landmark: "%-d %b %Y" } }`, realised as a `labelExpr` plus a conditional `labelFontWeight`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: NEW_YEAR,
        semantic_types: { Day: 'Date', 'Click rate (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Day', y: 'Click rate (%)' },
        title: 'Email CTA click rate over time',
      }),
      expectedSpec: landmarkExpected(),
      expectedFrame: { headerHtml: titleRow('Email CTA click rate over time', TEXT, false) },
    },
    {
      id: 'tooltip',
      title: 'Tooltip: white elevated box, header row, colour strip per series',
      kind: 'product-ui',
      severity: 'medium',
      observed: "The static Flint panel shows no hover state at all (Vega’s default tooltip appears only on a single point). Expected: dashed ruler at 11 Aug, filled dots on both lines, and the white shadowed box with the “Day | Aug 11” header and cyan/teal strips beside each row.",
      probe: 'tooltip-style',
      rule: 'On hover: a dashed vertical ruler at the hovered x and filled dots on each line; a white (layer-02) box with `0 1px 6px rgba(0,0,0,.2)` shadow, 12px Plex Sans Condensed, a bold header row (“Day | Aug 11”), then one row per series with a coloured strip at the left, the label left-aligned and the value right-aligned.',
      current: 'ThemeSpec has only `interaction.tooltipFormat`; the tooltip is Vega’s default box listing one point’s fields, with no ruler and no shared rows.',
      expected: 'The anatomy’s hover state pinned open at 11 Aug.',
      proposal: '`interaction.tooltip: { surface, shadow, header: "x", rows: "allSeries", swatch: "strip", ruler: { style: "dashed", color } }`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: CLICKS,
        semantic_types: { Day: 'Date', Metric: 'Category', 'Clicks in thousands': 'Quantity' },
        encodings: { x: 'Day', y: 'Clicks in thousands', color: 'Metric' },
        title: 'Clicks of CTA in emails over time',
      }),
      expectedSpec: tooltipExpected(),
      expectedFrame: { headerHtml: titleRow('Clicks of CTA in emails over time') },
    },
    {
      id: 'legend-hover',
      title: 'Hovering a key item dims every other series to 30%',
      kind: 'product-ui',
      severity: 'low',
      observed: "Flint draws the four lines at full strength with hollow-circle keys. Expected: China at full opacity, Norway, Germany and the United States at 30%, square keys.",
      probe: 'focus-hover-state',
      rule: '“Hovering over the legend of one category lowers the opacity of all other categories in the chart to 30 percent.” Clicking the key’s checkbox swatch hides a series.',
      current: 'No theme field for hover or legend states; whatever interactivity the host adds uses its own opacity.',
      expected: 'China hovered in the key: its line at full strength, the other three at 30%.',
      proposal: '`interaction.focus: { dimOthers: 0.3, trigger: ["legendHover", "markHover"] }`, `legend.toggle: "checkbox"`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE.filter((row) => EV4.includes(row.Country)),
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Electric-car share of new sales',
      }),
      expectedSpec: hoverExpected(),
      expectedFrame: { headerHtml: titleRow('Electric-car share of new sales') },
    },
    {
      id: 'tile',
      title: 'Charts live in dashboard tiles with the toolbar in the header',
      kind: 'product-ui',
      severity: 'medium',
      observed: "Flint’s chart floats on the panel with its own title block; the y axis starts at 2. Expected: the same line in a square white tile on the gray-10 ground with the title, the meta line and the overflow menu in the header.",
      probe: 'card-container',
      rule: 'Dashboards are built on the Carbon 2x grid in tiles: a white tile on the gray-10 page, square corners, 16px padding, the title and its toolbar in the tile’s header row.',
      current: 'Flint draws a chart, not a tile: no container, no header actions.',
      expected: 'The unemployment chart in a white, square, padded tile on gray 10 with the overflow menu.',
      proposal: 'A `container` block in the theme (`surface`, `radius`, `padding`, `border`, `elevation`) and a header slot for actions, emitted as host-UI metadata beside the spec.',
      ...cardProbe(theme, t, {
        style: { background: '#ffffff', padding: '16px', borderRadius: '0', outline: '16px solid #f4f4f4', margin: '16px' },
        header: 'Unemployment rate',
        meta: 'United States, 2000–2023',
      }),
    },
    {
      id: 'dark-theme',
      title: 'g90/g100 dark themes carry their own categorical sequence',
      kind: 'product-ui',
      severity: 'medium',
      observed: "Flint can only draw the light streamgraph — Purple 70, Cyan 50, Teal 70 on white, with a centred circle key. Expected: the g100 version — Teal 40, Purple 30 and Blue 50 on #161616, thin dark dividers between the layers, grey labels and a white title: a different palette, not the light one on a dark ground.",
      probe: 'dark-mode',
      rule: 'Four themes (white, g10, g90, g100). On g100 the ground is `#161616`, text `#f4f4f4` / `#c6c6c6`, gridlines `#393939`, and the categorical sequence is re-tuned for the dark ground: Purple 60 `#8a3ffc`, Cyan 40 `#33b1ff`, Teal 60 `#007d79`, Magenta 40 `#ff7eb6`… One-colour options: Purple 30, Blue 50, Cyan 40, Teal 40. In dark themes the lightest colour marks the largest value.',
      current: 'One ThemeSpec, one set of inks; `variants` cannot change `ink`. A dark Carbon needs a second theme maintained by hand, and the sequential ramp would have to be reversed by hand too.',
      expected: 'The guide’s g100 streamgraph: Teal 40, Purple 30, Blue 50 layers with dark dividers on `#161616`.',
      proposal: '`ink.modes: { dark: { surface, text, structure, series: { categorical, sequential: { reverse: true } } } }`, selected by the host’s colour scheme.',
      flint: flintInput(theme, {
        chartType: 'Streamgraph',
        data: STREAM,
        semantic_types: { Day: 'Date', Rate: 'Category', Value: 'Quantity' },
        encodings: { x: 'Day', y: 'Value', color: 'Rate' },
        title: '2019 Optimization rates (overall)',
      }),
      expectedSpec: darkExpected(),
      expectedFrame: { style: { background: '#161616', paddingTop: '14px' }, headerHtml: titleRow('2019 Optimization rates (overall)', '#f4f4f4', false) },
    },
    {
      id: 'legend-swatch',
      title: 'Key: 13px square checkbox swatches, aligned left under the plot',
      kind: 'realization',
      severity: 'low',
      probe: 'legend-swatch',
      rule: '`legend: { position: BOTTOM, alignment: LEFT }`; each item a 13×13px square with a 2px radius (the checkbox that toggles the series; outlined when unchecked), 12px condensed grey label.',
      current: 'The theme states `placement: ["bottom"]` and `align: "start"`, but Flint centres the key under the plot (see the signature panel); for lines it draws hollow circles, and `legend.swatch` only accepts `"auto"`, so a square cannot be asked for.',
      expected: 'See the key under the signature panel’s expected chart.',
      proposal: 'Honour `legend.align: "start"` for bottom keys; `legend.swatch: "square" | "circle" | "line" | "lineWithMarker"` with `swatchRadius`.',
    },
    {
      id: 'heatmap-row-labels',
      addressed: { stage: 'A1', note: 'The row names are never turned for the column names (A1), and the months sit flat.' },
      title: 'Heatmap row labels turned −45°',
      kind: 'realization',
      severity: 'low',
      probe: 'turned-row-labels',
      rule: 'Carbon turns only crowded time labels (45°); category labels on a vertical axis read horizontally.',
      current: 'In the gallery’s temperature heatmap Flint turns the six city names on the y axis by −45° although they are short and the axis is vertical; `labels.` gives the theme no way to forbid it for row labels.',
      expected: 'City names flat, right-aligned against the rows.',
      proposal: 'Never turn labels on a vertical band axis; `labels.angle` could take per-orientation values (`{ horizontal: "auto", vertical: "horizontal" }`).',
    },
    {
      id: 'bar-max-width',
      title: 'Bars never wider than 16px',
      kind: 'expressiveness',
      severity: 'low',
      observed: "Flint keeps its own band step, so the four bars come out about 17px thick but packed into a 90px-tall plot under a rotated “Country” title; the expected panel spreads the same 16px bars over the full height with open space between them. The cap only bites once the band is stretched (a taller chart or `layout.bandStepFit`), where Flint’s bars grow with it.",
      probe: 'bar-shape',
      rule: '`bars: { maxWidth: 16, spacingFactor: 0.25 }` — a bar takes its band up to 16px and then stops growing; the rest is air.',
      current: '`marks.bandFraction` / `geometry.band.fraction` state a share of the band only, so on a roomy axis bars grow as thick as the band allows.',
      expected: 'Four 16px bars with open space between them, full grid behind.',
      proposal: '`geometry.band.maxThickness: 16` (px), applied after the fraction.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: TOP4,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'millions' } },
        encodings: { y: 'Country', x: 'Population' },
        title: 'Most populous countries, 2023',
        baseSize: { width: W, height: HEIGHT },
      }),
      expectedSpec: thinBarsExpected(),
      expectedFrame: { headerHtml: titleRow('Most populous countries, 2023', TEXT, false) },
    },
  ],
};

export default carbon;
