import type { ThemeSpec } from 'flint-chart';
import research from '../research/morningstar.json';
import { flintInput, signedProbe, UNEMPLOYMENT } from '../probes';
import { houseConfig, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

/** MorningstarIntrinsic is proprietary; the guide's own fallback stack, in its light weight. */
const FONT = "MorningstarIntrinsic, HelveticaNeue, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const INK = '#1A1918';
const GREY = '#7F7D7A';
const DOTS = '#C9C7C4';
const GENERIC = ['#2364B9', '#B2013C', '#F5C72C', '#125B2F', '#72A1E0', '#6B4EA1', '#F47206', '#075F65', '#039649', '#E42513'];
/** Asset-allocation semantic colours: every chart that shows these classes paints them alike. */
const ASSET: Record<string, string> = {
  Equities: '#2364B9',
  'Fixed Income': '#F47206',
  'Real Estate': '#B2013C',
  Cash: '#039649',
  Commodities: '#F5C72C',
  'Private Equity': '#ECEBEA',
};

const t: HouseTokens = {
  font: FONT,
  text: INK,
  muted: GREY,
  grid: DOTS,
  gridDash: [1, 3],
  axis: INK,
  background: '#FFFFFF',
  palette: GENERIC,
  highlight: '#2364B9',
  context: '#ECEBEA',
  titleSize: 18,
  titleWeight: 500,
  subtitleSize: 14,
  labelSize: 14,
  lineWidth: 2,
  legendOrient: 'right',
};

/** Morningstar's semantic palette for asset classes: the data's own annotation (R8). */
const ASSET_CLASS_COLOURS = { Equity: '#2364B9', Equities: '#2364B9', 'Fixed Income': '#F47206', Alternative: '#B2013C', 'Real Estate': '#B2013C', Cash: '#039649' };

const theme: ThemeSpec = {
  id: 'morningstar',
  label: 'Morningstar Chart Elements',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: INK, secondary: GREY, muted: GREY, inverse: '#FFFFFF' },
    structure: { axis: INK, grid: DOTS, frame: INK, rule: INK, zero: INK, connector: GREY },
    series: {
      single: GENERIC[0],
      categorical: GENERIC.slice(0, 5),
      // Other and Not classified take their reserved inks (R8); asset-class colours are the chart's.
      roles: { other: '#F5C72C', missing: '#ECEBEA' },
      categoricalExtended: GENERIC,
      overflow: '#ECEBEA',
      // The correlation pair around a neutral grey; Morningstar documents no full ramp.
      diverging: { stops: ['#F47206', '#ECEBEA', '#2364B9'], neutral: '#ECEBEA', space: 'lab' },
      status: { positive: '#039649', negative: '#E42513', neutral: '#ECEBEA' },
      selection: { signed: 'status', statusUse: 'anySigned' },
    },
    accent: '#2364B9',
  },
  type: {
    headline: { family: FONT, size: 18, weight: 'medium', color: INK },
    deck: { family: FONT, size: 14, weight: 'light', color: GREY },
    axisLabel: { family: FONT, size: 14, weight: 'light', color: INK },
    axisTitle: { family: FONT, size: 14, weight: 'light', color: GREY },
    keyLabel: { family: FONT, size: 14, weight: 'light', color: INK },
    valueLabel: { family: FONT, size: 14, weight: 'light', color: INK },
    annotation: { family: FONT, size: 14, weight: 'light', color: INK },
    footnote: { family: FONT, size: 14, color: GREY },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1, ticks: 'omit', labelGap: 6 },
      measure: { line: 'omit', ticks: 'full', tickLength: 'long', tickDirection: 'outward', labelGap: 4 },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'dotted', dash: [1, 3], weight: 1 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: {
    bandFraction: 0.94,
    strokeWeight: 2,
    interpolation: 'linear',
    cornerRadius: 0,
    separator: { presence: 'full', width: 3, source: 'surface' },
    slice: { gap: 3, gapStyle: 'rule' },
    point: { presence: 'omit' },
  },
  // Donuts start at 12 o'clock, largest first (M4).
  geometry: { arc: { gap: 3, gapStyle: 'rule', order: 'largestFirst' }, line: { width: 2, interpolation: 'linear' } },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['right'], direction: 'vertical', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'always', axisTitlePlacement: 'rotated', unit: 'never', numberFormat: { thousands: 'separator' } },
  layout: { titleBlock: { anchor: 'start' } },
  furniture: [{ kind: 'headerRule', color: INK, height: 1 }],
};

/* ------------------------------------------------------------------ data */

const SECTORS = [
  { Sector: 'Technology', 'Percent of GDP (%)': 31, Benchmark: 37 },
  { Sector: 'Finance', 'Percent of GDP (%)': 34, Benchmark: 50 },
  { Sector: 'Healthcare', 'Percent of GDP (%)': 41, Benchmark: 23 },
  { Sector: 'Energy', 'Percent of GDP (%)': 50, Benchmark: 17 },
  { Sector: 'Retail', 'Percent of GDP (%)': 24, Benchmark: 31 },
  { Sector: 'Other', 'Percent of GDP (%)': 3, Benchmark: 26 },
];

const ALLOCATION = [
  { 'Asset class': 'Equities', 'Weight (%)': 35 },
  { 'Asset class': 'Fixed Income', 'Weight (%)': 21 },
  { 'Asset class': 'Real Estate', 'Weight (%)': 20 },
  { 'Asset class': 'Cash', 'Weight (%)': 12 },
  { 'Asset class': 'Commodities', 'Weight (%)': 8 },
  { 'Asset class': 'Private Equity', 'Weight (%)': 4 },
];

/** Two funds whose classes come in different orders: semantic colour must not follow the order. */
const FUNDS = [
  ...[['Fixed Income', 55], ['Cash', 25], ['Equities', 15], ['Real Estate', 5]].map(([c, v]) => ({ Fund: 'Income Fund', 'Asset class': c, 'Weight (%)': v })),
  ...[['Equities', 70], ['Real Estate', 15], ['Fixed Income', 10], ['Cash', 5]].map(([c, v]) => ({ Fund: 'Growth Fund', 'Asset class': c, 'Weight (%)': v })),
];

/* ------------------------------------------------------------- expected */

const PLOT_W = 400;
const PLOT_H = 220;
const COL = 74;
const LEGEND_W = 150;

const text = (extra: Record<string, unknown>) => ({ type: 'text', font: FONT, fontSize: 14, fontWeight: 300, color: INK, clip: false, ...extra });
/** A rule placed in pixels; Vega-Lite needs the positions as encoding values, not mark properties. */
const ruleLayer = ({ x, x2, y, ...style }: { x: number; x2: number; y: number } & Record<string, unknown>) => ({
  data: { values: [{}] },
  mark: { type: 'rule', color: INK, strokeWidth: 1, clip: false, ...style },
  encoding: { x: { value: x }, x2: { value: x2 }, y: { value: y } },
});

/**
 * The Chart Elements frame drawn around any plot: a y-label column on the left with each value
 * hanging under its own short rule, dotted gridlines, solid rules at the plot's top and base, and
 * a legend column on the right under its own top rule.
 */
function elementsFrame(o: { ticks: number[]; max: number; yTitle: string; xTitle: string; format?: (v: number) => string; legend: Record<string, unknown>[] }) {
  const fmt = o.format ?? ((v: number) => v.toLocaleString('en-US'));
  const y = (v: number) => PLOT_H - (v / o.max) * PLOT_H;
  const rows = o.ticks.map((v) => ({ v, label: fmt(v), py: y(v) }));
  return [
    // y-label column: a short rule at each value, the label right-aligned beneath it
    ...rows.map((row) => (ruleLayer({ x: -COL, x2: -8, y: row.py }))),
    ...rows.filter((row) => row.v !== 0).map((row) => ({ data: { values: [row] }, mark: text({ x: -8, y: row.py + 3, align: 'right', baseline: 'top', text: row.label }) })),
    { data: { values: [{}] }, mark: text({ x: -8, y: PLOT_H - 3, align: 'right', baseline: 'bottom', text: fmt(0) }) },
    { data: { values: [{}] }, mark: text({ x: -COL - 2, y: PLOT_H, angle: 270, align: 'left', baseline: 'bottom', color: GREY, fontSize: 13, text: o.yTitle }) },
    // dotted gridlines inside, solid rules at top and base
    ...rows.filter((row) => row.v !== 0 && row.v !== o.max).map((row) => (ruleLayer({ x: 0, x2: PLOT_W, y: row.py, color: DOTS, strokeDash: [1, 3] }))),
    ruleLayer({ x: 0, x2: PLOT_W, y: 0 }),
    ruleLayer({ x: 0, x2: PLOT_W, y: PLOT_H }),
    // x title, left-aligned under the first label
    { data: { values: [{}] }, mark: text({ x: 2, y: PLOT_H + 26, align: 'left', baseline: 'top', color: GREY, text: o.xTitle }) },
    // legend column
    ruleLayer({ x: PLOT_W + 14, x2: PLOT_W + 14 + LEGEND_W, y: 0 }),
    ruleLayer({ x: PLOT_W + 14, x2: PLOT_W + 14 + LEGEND_W, y: PLOT_H }),
    ...o.legend,
  ];
}

const elementsConfig = () => ({
  ...houseConfig(t),
  padding: { left: 12, right: 12, top: 12, bottom: 12 },
  axis: { ...(houseConfig(t).axis as object), labelFontWeight: 300, labelColor: INK, labelFontSize: 14 },
});

/** The bar-vertical anatomy specimen, with its benchmark dashes. */
function barsExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: elementsConfig(),
    width: PLOT_W,
    height: PLOT_H,
    layer: [
      {
        data: { values: SECTORS },
        mark: { type: 'bar', color: GENERIC[0] },
        encoding: {
          x: { field: 'Sector', type: 'nominal', sort: null, title: null, scale: { paddingInner: 0.06, paddingOuter: 0 }, axis: { labelAngle: 0, domain: false, ticks: false, grid: false, labelPadding: 8 } },
          y: { field: 'Percent of GDP (%)', type: 'quantitative', scale: { domain: [0, 100] }, axis: null },
        },
      },
      {
        data: { values: SECTORS },
        mark: { type: 'tick', color: INK, thickness: 3.5, size: 46 },
        encoding: { x: { field: 'Sector', type: 'nominal', sort: null }, y: { field: 'Benchmark', type: 'quantitative' } },
      },
      ...elementsFrame({
        ticks: [0, 20, 40, 60, 80, 100], max: 100, yTitle: 'Percent of GDP (%)', xTitle: 'Sectors',
        legend: [
          { data: { values: [{}] }, mark: { type: 'rect', color: GENERIC[0], x: PLOT_W + 14, x2: PLOT_W + 26, y: 12, y2: 24, clip: false } },
          { data: { values: [{}] }, mark: text({ x: PLOT_W + 32, y: 18, align: 'left', baseline: 'middle', text: 'Percent of U.S. GDP' }) },
          ruleLayer({ x: PLOT_W + 14, x2: PLOT_W + 26, y: 40, strokeWidth: 3.5 }),
          { data: { values: [{}] }, mark: text({ x: PLOT_W + 32, y: 40, align: 'left', baseline: 'middle', text: 'Benchmark' }) },
        ],
      }),
    ],
  };
}

/** The time-series line anatomy: same frame, a line key and the latest value in the legend column. */
function lineExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: elementsConfig(),
    width: PLOT_W,
    height: PLOT_H,
    layer: [
      {
        data: { values: UNEMPLOYMENT },
        mark: { type: 'line', color: GENERIC[0], strokeWidth: 2 },
        encoding: {
          x: {
            field: 'Year', type: 'quantitative', title: null, scale: { domain: [2000, 2023], nice: false, zero: false },
            axis: { values: [2000, 2005, 2010, 2015, 2020], format: 'd', labelAlign: 'left', labelPadding: 8, domain: false, ticks: false, grid: false },
          },
          y: { field: 'Unemployment (%)', type: 'quantitative', scale: { domain: [0, 10] }, axis: null },
        },
      },
      ...elementsFrame({
        ticks: [0, 2, 4, 6, 8, 10], max: 10, yTitle: 'Rate %', xTitle: 'Year',
        legend: [
          ruleLayer({ x: PLOT_W + 14, x2: PLOT_W + 28, y: 14, strokeWidth: 3, color: GENERIC[0] }),
          { data: { values: [{}] }, mark: text({ x: PLOT_W + 14, y: 24, align: 'left', baseline: 'top', text: 'US unemployment' }) },
          { data: { values: [{}] }, mark: text({ x: PLOT_W + 14, y: 42, align: 'left', baseline: 'top', text: '3.6% (2023)' }) },
        ],
      }),
    ],
  };
}

/** The donut anatomy: 12 o'clock, clockwise, largest first, 3px white gaps, ring markers in a column. */
function donutExpected() {
  const names = ALLOCATION.map((row) => row['Asset class']);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 10, right: 10, top: 10, bottom: 10 } },
    hconcat: [
      {
        width: 220,
        height: 220,
        data: { values: ALLOCATION },
        mark: { type: 'arc', innerRadius: 52, outerRadius: 108, stroke: '#FFFFFF', strokeWidth: 3 },
        encoding: {
          theta: { field: 'Weight (%)', type: 'quantitative', stack: true },
          order: { field: 'Weight (%)', type: 'quantitative', sort: 'descending' },
          color: { field: 'Asset class', type: 'nominal', sort: names, scale: { domain: names, range: names.map((n) => ASSET[n]) }, legend: null },
        },
      },
      {
        width: 160,
        height: 220,
        data: { values: ALLOCATION.map((row, i) => ({ ...row, i })) },
        layer: [
          ruleLayer({ x: 0, x2: 160, y: 0 }),
          ruleLayer({ x: 0, x2: 160, y: 220 }),
          {
            mark: { type: 'point', shape: 'circle', filled: false, size: 90, strokeWidth: 2.8 },
            encoding: {
              x: { value: 8 },
              y: { field: 'i', type: 'quantitative', scale: { domain: [-0.6, 7.4], reverse: true }, axis: null },
              stroke: { field: 'Asset class', type: 'nominal', scale: { domain: names, range: names.map((n) => ASSET[n]) }, legend: null },
            },
          },
          {
            mark: text({ align: 'left', baseline: 'middle', dx: 0 }),
            encoding: { x: { value: 20 }, y: { field: 'i', type: 'quantitative' }, text: { field: 'Asset class' } },
          },
        ],
      },
    ],
    spacing: 24,
  };
}

/** Stacked allocation bars where each class keeps its semantic colour, whatever its order. */
function fundsExpected() {
  const names = Object.keys(ASSET).slice(0, 4);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), axis: { ...(houseConfig(t).axis as object), labelFontWeight: 300, labelColor: INK, labelFontSize: 14 }, legend: { orient: 'right', direction: 'vertical', title: null, symbolType: 'square', labelFont: FONT, labelFontSize: 14, labelColor: INK } },
    title: { text: 'Two funds, two mixes', subtitle: 'Asset allocation, % of portfolio' },
    width: 300,
    height: 120,
    data: { values: FUNDS },
    mark: { type: 'bar', stroke: '#FFFFFF', strokeWidth: 3 },
    encoding: {
      y: { field: 'Fund', type: 'nominal', title: null, scale: { paddingInner: 0.35 } },
      x: { field: 'Weight (%)', type: 'quantitative', title: null, stack: 'normalize', axis: { format: '%', values: [0, 0.5, 1], gridDash: [1, 3], gridColor: DOTS } },
      color: { field: 'Asset class', type: 'nominal', scale: { domain: names, range: names.map((n) => ASSET[n]) } },
      order: { field: 'Weight (%)', type: 'quantitative', sort: 'descending' },
    },
  };
}

/** Give a probe's titled view more width, so the nine 14px decade labels do not touch. */
function widened<P extends { expectedSpec?: Record<string, unknown> }>(probe: P, width: number): P {
  const views = (probe.expectedSpec?.vconcat ?? []) as Record<string, unknown>[];
  if (views[0]) views[0].width = width;
  return probe;
}

/* --------------------------------------------------------------- house */

const morningstar: StyleGuideTheme = {
  id: 'morningstar',
  org: 'Morningstar Design System – Charts / Chart Elements',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the Chart Elements colour tokens and the CSS shipped in the x-axis, y-axis, legend and guideline bundles. Stated directly: the generic categorical order (blue `#2364B9`, crimson `#B2013C`, yellow `#F5C72C`, forest `#125B2F`, sky `#72A1E0` …), held to five in `categorical` because the accessibility guide asks for no more than four or five colours; performance green/red as `status` with `selection.signed: status`; all chart text 14px `#1A1918` with axis titles in grey `#7F7D7A`; dotted light-grey horizontal grid (`grid.style: dotted, dash: [1, 3]`); a solid dark baseline; no y-axis line but full-length y ticks; rotated axis titles; legend in a vertical column on the right; never-smoothed 2px lines; and 3px white separators between stacked segments and donut slices.',
    'Approximated: the flat bars “separated by small white gaps (3px)” became `bandFraction: 0.94`, a fraction that only equals 3px at one bar width. The black rule along the top of the plot, y-label column and legend became `furniture: headerRule`. MorningstarIntrinsic is proprietary and falls back to Helvetica Neue; its 300 weight cannot be named.',
    'Not statable: the y-label column with each value hanging under a short rule, axis titles anchored to the bottom-left and under the first category, semantic colours keyed to asset classes, the donut’s start angle and order, the latest value in a line legend, and the light weight — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      observed: "Flint (left): blue bars, dotted grid, rotated grey titles, but y labels with tick stubs against the plot, category names turned −45° (despite `angle: horizontal`), the header rule floating above the plot only, no legend for a single series, no benchmark. Expected (right): label column with hanging values, black rules top and base across plot and legend column, flat labels, “Sectors” under Technology.",
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'high',
      probe: 'signature',
      rule: 'Bar-vertical anatomy: a y-label column detached from the plot, each value right-aligned beneath a short black rule; rotated grey axis title at the column’s bottom-left; dotted grey horizontal gridlines; solid black rules at the plot’s top and base; flat blue bars 3px apart with thick black benchmark dashes; light condensed category labels, the grey x title under the first; a legend column on the right under its own top rule.',
      current: 'Flint draws the blue bars, dotted grid, rotated titles and right-hand key. Its y labels sit beside their ticks against the plot; the header rule is drawn under the title block rather than across the plot top; the x title is centred; there is no benchmark mark.',
      expected: 'The anatomy specimen, drawn on the same sector data.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: SECTORS.map(({ Sector, 'Percent of GDP (%)': v }) => ({ Sector, 'Percent of GDP (%)': v })),
        semantic_types: { Sector: 'Category', 'Percent of GDP (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Sector', y: 'Percent of GDP (%)' },
        baseSize: { width: 420, height: 240 },
      }),
      expectedSpec: barsExpected(),
    },
    {
      id: 'label-column',
      observed: "Flint’s y labels (3–10, starting at 3 not 0) sit beside short ticks against the plot; the header rule spans the plot only; no legend for one series. Expected: values hanging under rules in a separate column from 0, “Year” under 2000, the latest value in the legend column.",
      title: 'Y values hang beneath short rules in their own column',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'axis-label-on-gridline',
      rule: '`.mce-axis-y__tick { border-top: 1px solid; padding-top: 2px; text-align: right; width: 100% }` — the y axis is a column of short rules, one per value, the label right-aligned just below its rule; the plot starts after a gap. Line legends show the series name and its latest value.',
      current: 'ThemeSpec can draw y ticks (`ticks: full, tickLength: long`) and drop the axis line, but the label always stands beside its tick, vertically centred on it, and the tick touches the plot. There is no field for “label below the tick”, for a gap between the label column and the plot, or for a value in a key entry.',
      expected: 'The time-series anatomy on US unemployment: rules with hanging labels, “Year” under 2000, the latest reading in the legend column.',
      proposal: '`structure.axis.measure.labelPosition: "besideTick" | "belowTick" | "aboveGridline"`, `structure.axis.measure.offset` (px between column and plot), and `legend.entryValue: "latest"`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        baseSize: { width: 420, height: 240 },
      }),
      expectedSpec: lineExpected(),
    },
    {
      id: 'donut-rules',
      addressed: { stage: 'M4', note: '`geometry.arc.order: "largestFirst"` runs the wedges largest first from 12 o’clock, the key in the same order. The ring markers stay open.' },
      observed: "Flint orders the slices alphabetically from 12 o’clock (Cash, Commodities, Equities …) and lists the key in reverse data order; with the generic palette Equities is purple and Fixed Income light blue. The 3px white gaps are right. Expected: Equities blue from 12 o’clock, descending, semantic colours, ring markers.",
      title: 'Donuts start at 12 o’clock, largest first, with ring markers',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'pie-rules',
      rule: '“Build clockwise from the top, in descending order starting with the largest category”; 3px white gaps between segments; a thick ring (inner radius ≈ 45%); legend in a right-hand column under a top rule with hollow ring markers.',
      current: 'Nothing in the theme orders slices: Flint sorts them alphabetically from 12 o’clock, whatever their size. `geometry.arc` states the 3px gap but no inner-radius ratio; `legend.swatch` cannot ask for a ring.',
      expected: 'Equities from 12 o’clock, then each class in descending order; ring markers in the legend column.',
      proposal: '`geometry.arc: { innerRadius: 0.45, order: "descending", start: "top" }` (a house default the chart spec may override) and `legend.swatch: "ring"`.',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: ALLOCATION.slice().reverse(),
        semantic_types: { 'Asset class': { semanticType: 'Category', colors: ASSET_CLASS_COLOURS }, 'Weight (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Weight (%)', color: 'Asset class' },
        baseSize: { width: 420, height: 240 },
      }),
      expectedSpec: donutExpected(),
    },
    {
      id: 'semantic-colors',
      addressed: { stage: 'R8', note: 'The chart annotates Asset class with the semantic palette (`semantic_types[…].colors`); Other and Not classified are house roles.' },
      observed: "Confirmed: in Flint Fixed Income is blue (first met) and Equities yellow; Real Estate is forest green. Expected keeps Equities blue and Fixed Income orange in both funds.",
      title: 'Asset classes keep their own colours',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'semantic-category-color',
      rule: '“Use semantic palettes when the data has meaning”: Equity `#2364B9`, Fixed Income `#F47206`, Alternative/Real Estate `#B2013C`, Cash `#039649`, Other `#F5C72C`, Not classified `#ECEBEA`; super-sectors Cyclical orange, Sensitive blue, Defensive green.',
      current: 'ThemeSpec has indexed palettes only. Flint gives the first class it meets the first generic ink, so Fixed Income turns blue or crimson depending on the data, and the same class changes colour between charts.',
      expected: 'Fixed Income orange and Equities blue in both funds, whatever their order.',
      proposal: '`ink.series.named: { "Equities": "#2364B9", … }` matched on category value (case-insensitive, with aliases), falling back to the indexed palette.',
      flint: flintInput(theme, {
        chartType: 'Stacked Bar Chart',
        data: FUNDS,
        semantic_types: { Fund: 'Category', 'Asset class': { semanticType: 'Category', colors: ASSET_CLASS_COLOURS }, 'Weight (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { y: 'Fund', x: 'Weight (%)', color: 'Asset class' },
        title: 'Two funds, two mixes',
        subtitle: 'Asset allocation, % of portfolio',
        chartProperties: { stackMode: 'normalize' },
      }),
      expectedSpec: fundsExpected(),
    },
    {
      id: 'performance-colors',
      addressed: { stage: 'R2', note: 'Gains green, losses red, by the sign of each bar.' },
      observed: "Confirmed: every decade bar is the single blue in Flint, and the nine decade labels are turned −90°. Expected: red below zero, green above, horizontal labels.",
      title: 'Gains green, losses red',
      kind: 'realization',
      severity: 'medium',
      probe: 'signed-color',
      rule: 'Performance palette: positive `#039649`, neutral `#ECEBEA`, negative `#E42513`.',
      current: 'Stated as `ink.series.status` with `selection.signed: "status"` and `statusUse: "anySigned"`. Flint still draws every bar in the single blue: a single signed measure is not treated as signed for colour unless the data carries a separate sign field.',
      expected: 'Decades below the baseline red, above it green.',
      proposal: 'Honour `selection.signed: "status"` for a single signed measure on bars (colour by the sign of the value itself), and report when it does not apply.',
      ...widened(signedProbe(theme, t, { positive: '#039649', negative: '#E42513' }), 460),
    },
    {
      id: 'top-rules',
      title: 'Black rules close the top of the plot, label column and legend',
      kind: 'realization',
      severity: 'medium',
      probe: 'brand-rule',
      rule: 'Plot, y-label column and legend column each bounded by a solid black rule at the top and at the base; no box.',
      current: '`structure.frame` is all four sides or none, so the top rule is stated as `furniture: headerRule`. Flint draws that rule under the title block, across the plot width only; the y-label column and legend column get none.',
      expected: 'Three aligned top rules (column, plot, legend) at the height of the highest value, matched by three at the base.',
      proposal: '`structure.frame: { top, bottom, left, right }` per side, and a `furniture.headerRule` anchored to the chart top that spans label and legend columns.',
    },
    {
      id: 'labels-turned',
      addressed: { stage: 'A1', note: 'No gallery tile turns its labels now (A1).' },
      title: 'Category labels turned although the theme forbids it',
      kind: 'realization',
      severity: 'medium',
      probe: 'label-angle',
      rule: 'Category labels are horizontal (the anatomy’s “Technology Finance Healthcare …” under the bars); “vertical bars with long labels” are discouraged rather than turned.',
      current: 'The theme states `labels.` and `truncation: "wrap"`. Flint turns the six sector names −45° in the signature panel and the nine decades −90° in the performance panel instead of wrapping or thinning them.',
      expected: 'Horizontal labels, wrapped onto two lines where a name is wider than its band.',
      proposal: 'Treat `labels.` as a constraint in the label plan (wrap, then thin, then report), never as a preference that rotation can override.',
    },
    {
      id: 'axis-title-anchor',
      title: 'Axis titles anchored to the start, not centred',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'axis-title-relocation',
      rule: 'The rotated y title reads bottom-to-top from the bottom-left of the label column (“Percent of GDP (%)”, “Price $”); the x title is left-aligned beneath the first category (“Sectors”, “Year”).',
      current: '`annotation.axisTitlePlacement` chooses rotated / flat / inline, but not where along the axis the title sits; Flint centres both.',
      expected: 'See the signature and label-column panels.',
      proposal: '`annotation.axisTitleAnchor: "start" | "center" | "end"`.',
    },
    {
      id: 'light-weight',
      addressed: { stage: 'T2', note: 'Every chart element is `weight: "light"` (300); the proprietary face still falls back.' },
      title: 'All chart text in a light (300) weight',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'type-weight-scale',
      rule: '`font-size: 14px; font-weight: 300; line-height: 18px` for every chart element; legend group headings 500.',
      current: '`TypeRole.weight` starts at `regular` (400); the light, condensed MorningstarIntrinsic look falls back to regular Helvetica.',
      expected: 'Light-weight labels throughout.',
      proposal: 'Numeric `TypeRole.weight` (100–900), or a `light` step.',
    },
  ],
};

export default morningstar;
