import type { ThemeSpec } from 'flint-chart';
import research from '../research/gitlab.json';
import { flintInput } from '../probes';
import { houseConfig, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'GitLab Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', sans-serif";
const BLUE = '#617ae2';
const CHEVRON = [
  '#617ae2', '#b14f18', '#0090b1', '#4e7f0e', '#cf4d81',
  '#3f51ae', '#6f3500', '#006381', '#275600', '#9a2e5d',
  '#303470', '#4b2707', '#004059', '#133a03', '#661e3a',
];
const CHEVRON_DARK = ['#617ae2', '#e07e41', '#0090b1', '#81ac41', '#cf4d81'];
const TEXT = '#3a383f';
const SUBTLE = '#626168';
const LINE = '#bfbfc3';
const THRESHOLD = '#dd2b0e';

const t: HouseTokens = {
  font: FONT,
  text: TEXT,
  muted: SUBTLE,
  grid: LINE,
  axis: null,
  background: '#ffffff',
  palette: CHEVRON,
  highlight: BLUE,
  context: LINE,
  titleSize: 14,
  titleWeight: 600,
  labelSize: 12,
  lineWidth: 2,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'gitlab',
  label: 'GitLab Pajamas',
  ink: {
    surface: { source: 'host', canvas: '#ffffff' },
    text: { primary: TEXT, secondary: SUBTLE, muted: SUBTLE, inverse: '#ffffff' },
    structure: { grid: LINE, axis: LINE, rule: LINE },
    series: {
      single: BLUE,
      categorical: CHEVRON.slice(0, 5),
      categoricalExtended: CHEVRON,
      overflow: LINE,
      sequential: { stops: ['#617ae2', '#4e65cd', '#3f51ae', '#374291', '#303470', '#2a2b59'], space: 'lab' },
      diverging: { stops: ['#3f51ae', '#7992f5', '#b7c6ff', '#e9ebff', '#f5d6b3', '#e99b60', '#c95d2e', '#92430a'], neutral: '#e9ebff', space: 'lab' },
      status: { positive: '#619025', negative: '#b93d71', neutral: BLUE },
    },
    accent: BLUE,
  },
  type: {
    headline: { family: FONT, size: 14, weight: 'semibold', case: 'asIs', color: TEXT },
    deck: { family: FONT, size: 12, color: SUBTLE },
    axisLabel: { family: FONT, size: 12, color: SUBTLE },
    axisTitle: { family: FONT, size: 12, weight: 'bold', color: TEXT },
    keyLabel: { family: FONT, size: 12, color: TEXT },
    valueLabel: { family: FONT, size: 12, color: TEXT },
    footnote: { family: FONT, size: 12, color: SUBTLE },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'hairline', tickLength: 'short', tickDirection: 'outward', labelGap: 8 },
      measure: { line: 'omit', ticks: 'omit', labelGap: 8 },
    },
    grid: { measure: 'full', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'quiet',
  },
  marks: {
    bandFraction: 0.5,
    strokeWeight: 2,
    interpolation: 'linear',
    fillOpacity: 0.2,
    separator: { presence: 'hairline', width: 1, source: 'surface' },
  },
  geometry: {
    line: { width: 2, interpolation: 'linear' },
    point: { presence: 'omit', size: 28 },
    area: { opacity: 0.2, edge: 'full', edgeWidth: 2 },
    // Columns at 20% with a 1px border in the full series colour (M2).
    band: { fraction: 0.5, opacity: 0.2, outline: 'full', outlineWidth: 1, outlineInk: 'series' },
  },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'always', axisTitlePlacement: 'rotated', numberFormat: { thousands: 'suffix', compact: { per: 'value', threshold: 1000 } } },
  layout: { titleBlock: { anchor: 'start', gap: 'tight' } },
};

// ---------------------------------------------------------------------------
// The @gitlab/ui column-chart story: pushes per day by user.
// ---------------------------------------------------------------------------

const PUSHES = [['Joe', 1220], ['Sarah', 932], ['Tom', 901], ['Mary', 935], ['Mike', 1290], ['Ben', 1330], ['Jane', 1320]].map(([User, Pushes]) => ({ User: User as string, 'Pushes per day': Pushes as number }));
const USERS = PUSHES.map((r) => r.User);

const pushesFlint = () => flintInput(theme, {
  chartType: 'Bar Chart',
  data: PUSHES,
  semantic_types: { User: 'Category', 'Pushes per day': 'Count' },
  encodings: { x: 'User', y: 'Pushes per day' },
  baseSize: { width: 420, height: 230 },
});

const kLabel = "datum.value >= 1000 ? format(datum.value / 1000, '.2~f') + 'k' : format(datum.value, 'd')";

interface Ink { text: string; muted: string; grid: string; background: string; palette: string[] }
const LIGHT: Ink = { text: TEXT, muted: SUBTLE, grid: LINE, background: '#ffffff', palette: CHEVRON };
const DARK: Ink = { text: '#ececef', muted: '#bfbfc3', grid: '#4c4b51', background: '#18171d', palette: CHEVRON_DARK };

const axisTitle = (ink: Ink) => ({ titleFontWeight: 'bold', titleFontSize: 12, titleColor: ink.text, titleFont: FONT });

/** ECharts-style column chart: 20% fill, 1px border in the full colour, half the band, bold axis titles. */
function columns(ink: Ink, o: { hover?: string; threshold?: number } = {}): Record<string, unknown> {
  const color = ink.palette[0];
  const barX = {
    field: 'User', type: 'nominal', sort: USERS, title: 'User',
    axis: { labelAngle: 0, ticks: true, tickSize: 4, tickColor: ink.grid, tickBand: 'center', domain: false, labelColor: ink.muted, labelPadding: 4, titlePadding: 10, ...axisTitle(ink) },
  };
  const barY = {
    field: 'Pushes per day', type: 'quantitative', title: 'Pushes per day', scale: { domain: [0, 1500] },
    axis: { values: [0, 300, 600, 900, 1200, 1500], labelExpr: kLabel, labelColor: ink.muted, gridColor: ink.grid, titlePadding: 14, ...axisTitle(ink) },
  };
  const layers: Record<string, unknown>[] = [];
  layers.push({
    data: { values: PUSHES },
    mark: { type: 'bar', width: { band: 0.5 }, stroke: color, strokeWidth: 1 },
    encoding: {
      x: barX, y: barY,
      fill: o.hover
        ? { condition: { test: `datum.User === '${o.hover}'`, value: hexA(color, 0.4) }, value: hexA(color, 0.2) }
        : { value: hexA(color, 0.2) },
    },
  });
  if (o.threshold !== undefined) {
    layers.push({
      data: { values: [{ 'Pushes per day': o.threshold, top: 1500 }] },
      mark: { type: 'rect', color: 'rgba(221,43,14,0.1)' },
      encoding: { x: { value: 0 }, x2: { value: 'width' }, y: { field: 'Pushes per day', type: 'quantitative' }, y2: { field: 'top' } },
    }, {
      data: { values: [{ 'Pushes per day': o.threshold }] },
      mark: { type: 'rule', color: THRESHOLD, strokeWidth: 1, strokeDash: [5, 5] },
      encoding: { x: { value: 0 }, x2: { value: 'width' }, y: { field: 'Pushes per day', type: 'quantitative' } },
    });
  }
  if (o.hover) {
    const row = PUSHES.find((r) => r.User === o.hover)!;
    const i = USERS.indexOf(o.hover);
    const x0 = ((i + 0.5) / USERS.length) * 380 + 18;
    layers.push(
      { data: { values: [{}] }, mark: { type: 'rect', color: '#ffffff', stroke: '#dcdcde', cornerRadius: 4, clip: false }, encoding: { x: { value: x0 }, x2: { value: x0 + 150 }, y: { value: 40 }, y2: { value: 104 } } },
      { data: { values: [{}] }, mark: { type: 'rule', color: '#dcdcde', clip: false }, encoding: { x: { value: x0 }, x2: { value: x0 + 150 }, y: { value: 66 } } },
      { data: { values: [{}] }, mark: { type: 'text', align: 'left', baseline: 'middle', fontSize: 12, fontWeight: 'bold', font: FONT, color: TEXT, text: `${row.User} (User)` }, encoding: { x: { value: x0 + 10 }, y: { value: 53 } } },
      { data: { values: [{}] }, mark: { type: 'text', align: 'left', baseline: 'middle', fontSize: 12, font: FONT, color: TEXT, text: 'Pushes per day' }, encoding: { x: { value: x0 + 10 }, y: { value: 85 } } },
      { data: { values: [{}] }, mark: { type: 'text', align: 'right', baseline: 'middle', fontSize: 12, fontWeight: 'bold', font: FONT, color: TEXT, text: row['Pushes per day'].toLocaleString('en-US') }, encoding: { x: { value: x0 + 140 }, y: { value: 85 } } },
    );
  }
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig({ ...t, text: ink.text, muted: ink.muted, grid: ink.grid, background: ink.background }), padding: { left: 6, top: 10, right: 10, bottom: 6 } },
    width: 380,
    height: 210,
    layer: layers,
  };
}

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  return `rgba(${[0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',')},${a})`;
}

// The line-chart story: Requested / Actual / Predicted over a week.
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK = [
  ['Requested', [1180, 1350, 1030, 1230, 1420, 1350, 1030]],
  ['Actual', [1510, 1280, 1190, 1290, 1100, 1460, 1450]],
  ['Predicted', [1040, 1470, 1280, 1500, 1210, 1420, 1215]],
] as const;
const WEEK_ROWS = WEEK.flatMap(([Series, values]) => values.map((Value, i) => ({ Day: DAYS[i], Series, Value })));
const fmtK = (v: number) => `${+(v / 1000).toFixed(2)}k`;
const STATS = WEEK.map(([Series, values]) => ({ Series, avg: fmtK(values.reduce((a, b) => a + b, 0) / values.length), max: fmtK(Math.max(...values)) }));

function weekLines(o: { gapAt?: string; series?: string[] } = {}): Record<string, unknown> {
  const series = o.series ?? WEEK.map(([s]) => s);
  const colors = series.map((s) => CHEVRON[WEEK.findIndex(([n]) => n === s)]);
  const rows = WEEK_ROWS.filter((r) => series.includes(r.Series));
  const xEnc = { field: 'Day', type: 'point', sort: DAYS, title: 'Time', scale: { domain: DAYS, padding: 0 }, axis: { labelAngle: 0, ticks: true, tickSize: 4, tickColor: LINE, domain: false, labelColor: SUBTLE, titlePadding: 10, ...axisTitle(LIGHT) } } as Record<string, unknown>;
  xEnc.type = 'ordinal';
  const yEnc = { field: 'Value', type: 'quantitative', title: 'Value', scale: { domain: [0, 1800] }, axis: { values: [0, 300, 600, 900, 1200, 1500, 1800], labelExpr: kLabel, labelColor: SUBTLE, gridColor: LINE, ...axisTitle(LIGHT) } };
  const color = { field: 'Series', type: 'nominal', scale: { domain: series, range: colors }, legend: null };
  const layers: Record<string, unknown>[] = [];
  if (o.gapAt) {
    const i = DAYS.indexOf(o.gapAt);
    const bridge = rows.filter((r) => r.Day === DAYS[i - 1] || r.Day === DAYS[i + 1]);
    layers.push(
      { data: { values: rows.filter((r) => DAYS.indexOf(r.Day) < i) }, mark: { type: 'line', strokeWidth: 2 }, encoding: { x: xEnc, y: yEnc, color } },
      { data: { values: rows.filter((r) => DAYS.indexOf(r.Day) > i) }, mark: { type: 'line', strokeWidth: 2 }, encoding: { x: xEnc, y: yEnc, color } },
      { data: { values: bridge }, mark: { type: 'line', strokeWidth: 2, strokeDash: [5, 5], color: LINE }, encoding: { x: xEnc, y: yEnc, detail: { field: 'Series' } } },
    );
  } else {
    layers.push({ data: { values: rows }, mark: { type: 'line', strokeWidth: 2 }, encoding: { x: xEnc, y: yEnc, color } });
  }
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 6, top: 10, right: 10, bottom: 6 } },
    width: 380,
    height: 200,
    layer: layers,
  };
}

/** The legend as Pajamas draws it: a short line chip, the name, then smaller Avg · Max stats. */
function statsLegend(series: string[], withStats = true): string {
  return `<div style="font-family:${FONT};display:flex;flex-wrap:wrap;gap:4px 18px;margin:2px 6px 4px 52px;color:${TEXT}">`
    + series.map((s) => {
      const i = WEEK.findIndex(([n]) => n === s);
      const st = STATS[i];
      return `<span style="white-space:nowrap"><span style="display:inline-block;width:12px;height:4px;background:${CHEVRON[i]};vertical-align:middle;margin-right:6px"></span>`
        + `<span style="font-size:13px">${s}</span>${withStats ? `<span style="font-size:11px;margin-left:6px">Avg: ${st.avg} · Max: ${st.max}</span>` : ''}</span>`;
    }).join('') + '</div>';
}

const weekFlint = (rows: Record<string, unknown>[]) => flintInput(theme, {
  chartType: 'Line Chart',
  data: rows,
  semantic_types: { Day: 'Day', Series: 'Category', Value: 'Quantity' },
  encodings: { x: 'Day', y: 'Value', color: 'Series' },
  baseSize: { width: 420, height: 230 },
});

/** The area story: 20% washes stacked, each under its own 2px line. */
function weekAreas(): Record<string, unknown> {
  const series = WEEK.map(([s]) => s);
  const enc = {
    x: { field: 'Day', type: 'ordinal', sort: DAYS, title: 'Time', scale: { domain: DAYS, padding: 0 }, axis: { labelAngle: 0, ticks: true, tickSize: 4, tickColor: LINE, domain: false, labelColor: SUBTLE, titlePadding: 10, ...axisTitle(LIGHT) } },
    y: { field: 'Value', type: 'quantitative', aggregate: 'sum', stack: 'zero', title: 'Value', axis: { labelExpr: kLabel, labelColor: SUBTLE, gridColor: LINE, tickCount: 5, ...axisTitle(LIGHT) } },
    color: { field: 'Series', type: 'nominal', scale: { domain: series, range: CHEVRON.slice(0, 3) }, legend: null },
    order: { field: 'rank', type: 'quantitative' },
  };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 6, top: 10, right: 10, bottom: 6 } },
    width: 380,
    height: 200,
    data: { values: WEEK_ROWS },
    transform: [{ calculate: `indexof(${JSON.stringify(series)}, datum.Series)`, as: 'rank' }],
    layer: [
      { mark: { type: 'area', opacity: 0.2 }, encoding: enc },
      { mark: { type: 'line', strokeWidth: 2 }, encoding: enc },
    ],
  };
}

const gitlab: StyleGuideTheme = {
  id: 'gitlab',
  org: 'GitLab (Pajamas data visualization + GitLab Tableau style guide)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the Pajamas colour and chart pages and the `@gitlab/ui` ECharts theme. Stated directly: the chevron-skipping sequence (blue-500, orange-600, aqua-500, green-600, magenta-500, then the darker steps) with blue-500 as the single-series ink; the 500→950 blue ramp; the green-500/magenta-600 success/failure pair; no axis lines; solid `#bfbfc3` horizontal split lines only; small ticks on the category axis; bold axis titles, the y one rotated; 2px straight lines with symbols hidden; 20% area washes; columns half the band at 20% opacity with a 1px outline; a bottom, left-aligned, untitled legend; no data labels.',
    'Approximated: GitLab Sans is a fork of Inter, so the panels use Inter. Type sizes come from the ECharts defaults (12px). Dark-UI greys for text and split lines are not in the research and are estimated from the neutral scale.',
    'Not stated: the column outline in the series’ own colour, k-abbreviated ticks, the legend’s Avg/Max stats, the popover tooltip and 40% hover fill, the dark-UI palette, threshold lines and areas, and dashed grey bridges over gaps in continuous data. See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall: the default column chart',
      kind: 'visual-quality',
      severity: 'high',
      probe: 'signature',
      rule: 'Column charts are the default chart type: columns half the band wide, filled with the series colour at 20% opacity and bordered 1px in the full colour; no axis lines; `#bfbfc3` horizontal split lines; small ticks under category labels; k-abbreviated values; a rotated y title and a centred x title, no chart title, no legend for one series.',
      current: 'The theme states `geometry.band: { fraction: 0.5, opacity: 0.2, outline: "full", outlineWidth: 1 }`, hairline category ticks and `numberFormat.thousands: "suffix"`. Flint draws the split lines, titles and band width, but not the tint, the outline, the ticks or the k values (see the gaps that follow).',
      expected: 'The `column-chart/default` story: Joe … Jane, pushes per day.',
      flint: pushesFlint(),
      expectedSpec: columns(LIGHT),
      observed: 'Flint (left) gets the split lines, the absent axis lines, the rotated bold y title and the centred x title, and the band fraction. But the columns are solid `#617ae2` with no outline — the 20% tint and 1px border never arrive — the ticks under the category labels are missing although the theme asks for hairline ticks, and the y labels print 0 … 1,400 in full instead of k. Expected (right): pale tinted columns with a crisp blue outline, ticks under each user, 0 … 1.5k.',
    },
    {
      id: 'translucent-columns',
      addressed: { stage: 'M2', note: '`band.opacity` now reaches the bars’ fill, and `outlineInk: "series"` edges each column 1px in its own colour at full strength.' },
      title: 'Columns at 20% opacity with a 1px border in their own colour',
      kind: 'realization',
      severity: 'high',
      probe: 'bar-shape',
      rule: '`itemStyle: { color: hexToRgba(color, 0.2), borderColor: color, borderWidth: 1 }` — the pale tint with a crisp outline is the most recognisable thing about a GitLab chart.',
      current: 'The theme states `geometry.band.opacity: 0.2` and `outline: "full", outlineWidth: 1`. Grounding folds the band opacity into one `marks.fillOpacity`, which the Vega-Lite realisation writes only to `config.area`, so bars stay opaque; the outline becomes `marks.outline`, which is drawn in structural ink (if at all), and ThemeSpec has no way to ask for an outline in the series’ own colour.',
      expected: 'Pale blue columns with a 1px `#617ae2` border.',
      proposal: 'Apply `fillOpacity` to bar/rect marks when `geometry.band.opacity` is stated, and let `BandGeometry.outlineSource: "series" | "ink" | "surface"`.',
      flint: pushesFlint(),
      expectedSpec: columns(LIGHT),
      observed: 'Same pair as the signature: Flint’s columns are opaque blue with no visible border. Expected: 20% tint, 1px border in the full blue. The gallery shows it on every bar chart — population, medals, the stacked electricity mix — all solid.',
    },
    {
      id: 'label-truncation',
      title: '“Wed” is cut to “W…” while its neighbours fit',
      kind: 'realization',
      severity: 'medium',
      probe: 'label-truncation',
      rule: 'Category labels print in full (axis label margin 8px, overlapping labels hidden — never truncated mid-word).',
      current: 'The line chart’s day axis is narrow, and Flint’s label plan ellipsises “Wed” — the one label a few pixels wider than the rest — while Mon, Tue, Thu … print whole. Three letters cannot be shortened usefully.',
      expected: 'Mon … Sun in full, spaced across the plot.',
      proposal: 'Never ellipsise a label to fewer characters than it would keep by thinning; prefer dropping alternate labels, and do not truncate labels of three characters or fewer.',
      flint: weekFlint(WEEK_ROWS),
      expectedSpec: weekLines(),
      expectedFrame: { footerHtml: statsLegend(WEEK.map(([s]) => s), false) },
      observed: 'Flint prints “Mon Tue W… Thu Fri Sat Sun” under its line chart (and again in the area and missing-data panels). The plot is also narrower than the 420px base asks for, which is what squeezes the day bands. Expected: all seven days in full.',
    },
    {
      id: 'legend-stats',
      title: 'The legend carries Avg · Max after each series',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'legend-values',
      rule: 'Legend below the chart, left-aligned: a short rectangular line chip, the series name, then optional supplementary stats in smaller type (“Avg: 1.23k · Max: 1.42k”); a tabular legend when there are many series or stats.',
      current: 'ThemeSpec’s legend states placement, direction, title and alignment, but no statistics column and no chip shape; Flint’s key is names only.',
      expected: 'Requested, Actual, Predicted with line chips and their weekly average and maximum.',
      proposal: '`legend.statistics: ["mean", "max"]` (formatted with the measure’s number format) and `legend.layout: "inline" | "table"`.',
      flint: weekFlint(WEEK_ROWS),
      expectedSpec: weekLines(),
      expectedFrame: { footerHtml: statsLegend(WEEK.map(([s]) => s)) },
      observed: 'Flint’s key: line chips and names only, centred under the plot. Expected: line chips, names, then “Avg: 1.23k · Max: 1.42k” in smaller type, left-aligned under the axis.',
    },
    {
      id: 'k-format',
      addressed: { stage: 'A6', note: '`compact: { per: "value", threshold: 1000 }` — 0 … 800, then 1k, 1.2k (A6).' },
      title: 'Value ticks abbreviate to k',
      kind: 'realization',
      severity: 'medium',
      probe: 'number-format',
      rule: 'Axis values are abbreviated with k (300, 600, 900, 1.2k, 1.5k); the Tableau guide adds $10k / $10m for money.',
      current: 'The theme states `annotation.numberFormat.thousands: "suffix"`, but Flint applies the house number format only to value labels; the axis keeps the semantic default and prints 1,200 and 1,500.',
      expected: '0 … 900, 1.2k, 1.5k.',
      proposal: 'Let `annotation.numberFormat` reach measure-axis ticks (or add `structure.axis.measure.format`).',
      flint: weekFlint(WEEK_ROWS),
      expectedSpec: weekLines(),
      expectedFrame: { footerHtml: statsLegend(WEEK.map(([s]) => s), false) },
      observed: 'Flint’s y axis reads 0, 200 … 1,600; the expected axis reads 0, 300 … 1.8k. (Flint also picks a 200 step where the house uses 300.)',
    },
    {
      id: 'popover',
      title: 'Hover: 40% fill and a popover to the right',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'tooltip-style',
      rule: 'Hover shows a GitLab popover, not an ECharts tooltip: header = x value (x-axis title), body = y-axis title and value; placed to the right by default, max 512px wide. The hovered column’s fill rises from 20% to 40%.',
      current: 'ThemeSpec’s `interaction` has `tooltipFormat` and a selection boundary only — no tooltip surface, header/body structure, placement or hover fill. Flint’s static chart shows neither.',
      expected: 'Mary’s column at 40% with a white popover beside it: “Mary (User)” header, “Pushes per day 935”.',
      proposal: '`interaction.tooltip: { surface, border, radius, placement: "right", header: "x", body: "yTitle: value" }` and `interaction.hover: { fillOpacity: 0.4 }`.',
      flint: pushesFlint(),
      expectedSpec: columns(LIGHT, { hover: 'Mary' }),
      observed: 'Flint shows the static chart. Expected: Mary’s column at 40% and a white bordered popover to its right with the header “Mary (User)” over a rule and “Pushes per day 935”.',
    },
    {
      id: 'dark-mode',
      title: 'A dark-UI palette with lighter steps',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'dark-mode',
      rule: 'Dark UI (`#18171d`): the chevron sequence steps lighter (blue-500, orange-400, aqua-500, green-400, magenta-500, blue-300 …); sequential runs 500→50; every step meets 3:1 on the dark surface.',
      current: 'One ThemeSpec holds one palette; `surface.source: "host"` lets the canvas follow a dark host but the series inks stay the light-UI steps (orange-600 `#b14f18` and green-600 fall below 3:1 on `#18171d`).',
      expected: 'Columns and lines on `#18171d` in the dark-UI steps.',
      proposal: '`ink.modes: { dark: Partial<ThemeInk> }`, chosen by the host’s colour scheme.',
      flint: pushesFlint(),
      expectedSpec: columns(DARK),
      expectedFrame: { style: { background: '#18171d' } },
      observed: 'Flint renders the light chart; nothing in the theme changes for a dark host. Expected: `#18171d` ground, 20% blue columns with blue borders, light labels and dark split lines.',
    },
    {
      id: 'threshold',
      title: 'Thresholds: a dashed red line over a 10% red area',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'annotation',
      rule: 'Threshold markLine: 1px dashed red-500 `#dd2b0e`, no label, no end symbols; threshold markArea filled `rgba(221,43,14,0.1)`.',
      current: 'The chart spec has no reference-line or band slot that names a threshold, and the theme has no threshold ink (`marks.reference` covers a summary rule, not a limit). Flint draws the columns alone.',
      expected: 'A dashed red rule at 1.2k with the area above it washed red.',
      proposal: '`chart_spec.references: [{ value, kind: "threshold", direction: "above" }]` with `ink.series.threshold` and `marks.reference.style` in the theme.',
      flint: pushesFlint(),
      expectedSpec: columns(LIGHT, { threshold: 1200 }),
      observed: 'Flint draws the columns alone. Expected: a dashed red rule at 1.2k and a pale red wash above it, unlabelled — Joe, Mike, Ben and Jane visibly cross it.',
    },
    {
      id: 'data-gap',
      title: 'Gaps in continuous data: a dashed grey bridge, no point',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'missing-data',
      rule: '“Represent gaps in continuous data with a dashed $grey-300 line, and without a data point.”',
      current: 'ThemeSpec has no rule for missing readings. Thursday is null in this data; see whether Flint breaks the line, joins it, or drops the day.',
      expected: 'Each line solid up to Wednesday and from Friday, joined across Thursday by a dashed grey line.',
      proposal: '`marks.missing: { style: "bridge" | "break" | "join", ink, dash }`.',
      flint: weekFlint(WEEK_ROWS.map((r) => (r.Day === 'Thu' ? { ...r, Value: null } : r))),
      expectedSpec: weekLines({ gapAt: 'Thu' }),
      expectedFrame: { footerHtml: statsLegend(WEEK.map(([s]) => s), false) },
      observed: 'Flint breaks every line at Thursday and leaves the day empty (no bridge), which reads as two separate charts. Expected: the lines stop at Wednesday and resume at Friday, joined by dashed grey bridges with no Thursday point.',
    },
    {
      id: 'area-edge',
      addressed: { stage: 'M1', note: '`geometry.area.edge` is drawn as a line along the top of each area, stacked bands included, in the area’s own ink (M1).' },
      title: 'Stacked areas lose their 2px top line',
      kind: 'realization',
      severity: 'medium',
      probe: 'area-edge',
      rule: 'Area fill opacity 0.2 under a solid 2px line in the series colour; stacked areas build up translucent layers, each series still traced by its line (the `area-chart/mult-series` story).',
      current: 'The theme states `geometry.area: { opacity: 0.2, edge: "full", edgeWidth: 2 }`. Flint draws the 20% washes but no line along each layer; grounding turns `area.edge` into `marks.outline`, the per-mark outline, rather than a top line.',
      expected: 'Three stacked layers, each a 20% wash under a 2px line in blue, orange and aqua.',
      proposal: 'Realise `geometry.area.edge` as a stacked line layer in the series colour, separate from `marks.outline`.',
      flint: flintInput(theme, {
        chartType: 'Area Chart',
        data: WEEK_ROWS,
        semantic_types: { Day: 'Day', Series: 'Category', Value: 'Quantity' },
        encodings: { x: 'Day', y: 'Value', color: 'Series' },
        baseSize: { width: 420, height: 230 },
      }),
      expectedSpec: weekAreas(),
      expectedFrame: { footerHtml: statsLegend(WEEK.map(([s]) => s)) },
      observed: 'Flint stacks three pale washes with no line on top; the series read only as tints, and its key chips are 20%-opacity circles. Flint also stacks Predicted at the base. Expected: each layer traced by a 2px line in blue, orange and aqua over its wash, Requested at the base. The gallery’s World electricity tile shows the same edgeless washes.',
    },
  ],
};

export default gitlab;
