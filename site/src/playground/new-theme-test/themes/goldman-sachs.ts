import type { ThemeSpec } from 'flint-chart';
import research from '../research/goldman-sachs.json';
import { BROWSERS, flintInput } from '../probes';
import { houseConfig, W, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

// Goldman Sans is proprietary; Roboto (loaded on the page) stands in.
const FONT = "'Goldman Sans', Roboto, 'Helvetica Neue', Arial, sans-serif";

/** dataviz-default-sequence-01…10. */
const SEQUENCE = ['#0D4EA6', '#E86427', '#279C9C', '#D9A514', '#AC71F0', '#23254D', '#52A31D', '#CC1D92', '#48B8F0', '#077D55'];
/** Performance ramps, 100 → 010: green for gains, red for losses. */
const GREEN = ['#081A15', '#092E25', '#094536', '#075E45', '#077D55', '#16A163', '#43C478', '#88DBA8', '#C7EBD1', '#EBF7ED'];
const RED = ['#24120C', '#4F150F', '#75160C', '#A1160A', '#D91F11', '#FA5343', '#FC9086', '#FABBB4', '#FADCD9', '#FCF3F2'];
/** The colour-blind-safe alternative: blue for positive, orange for negative. */
const BLUE = ['#0D1826', '#11294D', '#103A75', '#0D4EA6', '#186ADE', '#3D8DF5', '#75B1FF', '#ADCCF7', '#D4E4FA', '#F0F4FA'];
const ORANGE = ['#1F1410', '#3D1E13', '#632B17', '#8F3415', '#BF4815', '#E86427', '#FC9162', '#FCBC97', '#FCDDC7', '#FCF2EB'];

const PAGE = '#F2F5F7';
const GRAY = { 20: '#DCE3E8', 30: '#C1CCD6', 50: '#7A909E', 60: '#5B7282', 90: '#1C2B36' };

const t: HouseTokens = {
  font: FONT,
  text: GRAY[90],
  muted: GRAY[60],
  grid: GRAY[20],
  axis: GRAY[30],
  background: '#FFFFFF',
  palette: SEQUENCE,
  highlight: SEQUENCE[0],
  context: GRAY[30],
  titleSize: 16,
  titleWeight: 500,
  subtitleSize: 12,
  labelSize: 10,
  gridAxis: 'y',
  lineWidth: 2,
  legendOrient: 'top',
};

const theme: ThemeSpec = {
  id: 'goldman-sachs',
  label: 'Goldman Sachs Design System',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF', plot: '#FFFFFF' },
    text: { primary: GRAY[90], secondary: GRAY[60], muted: GRAY[50], inverse: '#FFFFFF' },
    structure: { axis: GRAY[30], grid: GRAY[20], frame: GRAY[20], zero: GRAY[50] },
    series: {
      single: SEQUENCE[0],
      categorical: SEQUENCE,
      sequential: { stops: BLUE.slice().reverse(), space: 'lab' },
      // The two performance ramps joined at their palest steps: losses darkest at the left, gains at the right.
      diverging: { stops: [...RED.slice(1), ...GREEN.slice(1).reverse()], neutral: '#F2F5F7', space: 'lab' },
      status: { positive: '#077D55', negative: '#D91F11', neutral: GRAY[50] },
      selection: { signed: 'status', statusUse: 'anySigned' },
    },
    accent: SEQUENCE[0],
  },
  type: {
    headline: { family: FONT, size: 16, weight: 'medium', color: GRAY[90] },
    deck: { family: FONT, size: 12, color: GRAY[60] },
    axisLabel: { family: FONT, size: 10, color: GRAY[60] },
    axisTitle: { family: FONT, size: 11, color: GRAY[60] },
    keyLabel: { family: FONT, size: 10, color: GRAY[60] },
    valueLabel: { family: FONT, size: 10, color: GRAY[90] },
    footnote: { family: FONT, size: 10, color: GRAY[60] },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1, ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit' },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'solid', weight: 1 },
    frame: 'hairline',
    baseline: 'full',
  },
  marks: { strokeWeight: 2, interpolation: 'linear', cornerRadius: 0 },
  geometry: {
    line: { width: 2, interpolation: 'linear' },
    // A dot at every reading, however many (M5).
    point: { presence: 'full', size: 18, vertexSize: 18, fill: 'solid', density: 'all' },
    arc: { gap: 0 },
  },
  labels: { truncation: 'ellipsis', overflow: ['rotate45', 'rotate90'] },
  legend: { show: 'always', placement: ['top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'end' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'whenAmbiguous' },
  layout: { density: 'compact', titleBlock: { anchor: 'start', gap: 'tight' } },
};

// ---------------------------------------------------------------------------
// Signature: the chart-editor illustration — card, toolbar band, two divisions.

const MONTHS = ['2018-02-01', '2018-03-01', '2018-04-01', '2018-05-01', '2018-06-01', '2018-07-01', '2018-08-01', '2018-09-01', '2018-10-01', '2018-11-01', '2018-12-01', '2019-01-01', '2019-02-01', '2019-03-01'];
const DIV_A = [3, 5, 3, 4, 6, 7, 8, 3, 5, 6, 7, 8, 9, 8];
const DIV_B = [7, 6, 5, 7, 8, 9, 5, 4, 6, 7, 8, 3, 4, 5];
const DIVISIONS = MONTHS.flatMap((Month, i) => [
  { Month, Division: 'Division_A', Value: DIV_A[i] },
  { Month, Division: 'Division_B', Value: DIV_B[i] },
]);
const PAIR = ['#E86427', '#279C9C'];

const toolbar = `<div style="display:flex;align-items:center;gap:14px;background:#EEF2F5;border-bottom:1px solid ${GRAY[20]};padding:5px 8px;font-family:${FONT};font-size:12px;color:${GRAY[90]}">`
  + `<span style="background:#DCE3E8;border-radius:2px;padding:3px 8px;font-weight:500">⤓ Export ▾</span><span>📈</span><span>⚙</span></div>`;

const CARD = { background: '#FFFFFF', border: `1px solid ${GRAY[20]}`, boxShadow: '0 1px 3px rgba(14,23,31,0.15)', outline: `16px solid ${PAGE}`, margin: '16px' };

function divisionLayers(o: { tooltip?: boolean } = {}) {
  const x = {
    field: 'Month', type: 'ordinal', title: null,
    axis: { labelAngle: -45, labelAlign: 'right', labelBaseline: 'middle', labelFontSize: 9, labelColor: GRAY[90], domain: true, domainColor: GRAY[30], ticks: false, grid: false },
  };
  const y = { field: 'Value', type: 'quantitative', title: null, scale: { domain: [2, 10] }, axis: { tickCount: 5, labelFontSize: 8, labelColor: GRAY[60], domain: false, ticks: false, grid: true, gridColor: GRAY[20] } };
  const color = {
    field: 'Division', type: 'nominal', scale: { range: PAIR },
    legend: { orient: 'top-right', direction: 'horizontal', title: null, symbolType: 'square', symbolSize: 90, labelFontSize: 9, labelColor: GRAY[60], offset: -18, encoding: { symbols: { fill: { value: { expr: "scale('color', datum.value)" } }, strokeWidth: { value: 0 } } } },
  };
  const point = { field: 'Month', type: 'ordinal' };
  const layers: Record<string, unknown>[] = [
    { data: { values: DIVISIONS }, mark: { type: 'line', strokeWidth: 1.8 }, encoding: { x, y, color } },
    { data: { values: DIVISIONS }, mark: { type: 'circle', size: 16, opacity: 1 }, encoding: { x: point, y: { field: 'Value', type: 'quantitative' }, color: { field: 'Division', type: 'nominal', scale: { range: PAIR }, legend: null } } },
  ];
  if (o.tooltip) {
    const at = { datum: '2018-07-01', type: 'ordinal' };
    const yAt = { datum: 7, type: 'quantitative' };
    layers.push(
      { data: { values: [{}] }, mark: { type: 'rule', color: GRAY[50], strokeWidth: 1 }, encoding: { x: at } },
      { data: { values: [{}] }, mark: { type: 'circle', size: 70, color: PAIR[0], stroke: '#fff', strokeWidth: 2, opacity: 1 }, encoding: { x: at, y: yAt } },
      { data: { values: [{}] }, mark: { type: 'rect', color: PAIR[0], cornerRadius: 3, xOffset: 10, x2Offset: 108, yOffset: -30, y2Offset: 6 }, encoding: { x: at, x2: { datum: '2018-07-01' }, y: yAt, y2: { datum: 7 } } },
      { data: { values: [{}] }, mark: { type: 'text', align: 'left', dx: 18, dy: -18, fontSize: 10, color: '#fff', text: '2018-07-01' }, encoding: { x: at, y: yAt } },
      { data: { values: [{}] }, mark: { type: 'text', align: 'left', dx: 18, dy: -4, fontSize: 11, fontWeight: 'bold', color: '#fff', text: 'Division_A: 7' }, encoding: { x: at, y: yAt } },
    );
  }
  return layers;
}

function signatureExpected(o: { tooltip?: boolean } = {}) {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 12, right: 12, top: 26, bottom: 8 } },
    width: W,
    height: 180,
    layer: divisionLayers(o),
  };
}

const divisionsFlint = (title?: string) => flintInput(theme, {
  chartType: 'Line Chart',
  data: DIVISIONS,
  semantic_types: { Month: 'Date', Division: 'Category', Value: 'Quantity' },
  encodings: { x: 'Month', y: 'Value', color: 'Division' },
  ...(title ? { title } : {}),
});

// ---------------------------------------------------------------------------
// Gain/loss ramps on a returns heatmap.

const ASSETS: [string, number[]][] = [
  ['US equities', [-4.4, 31.5, 18.4, 28.7, -18.1, 26.3]],
  ['Intl equities', [-13.8, 22.0, 7.8, 11.3, -14.5, 18.2]],
  ['EM equities', [-14.6, 18.4, 18.3, -2.5, -20.1, 9.8]],
  ['US bonds', [0.0, 8.7, 7.5, -1.5, -13.0, 5.5]],
  ['High yield', [-2.1, 14.3, 7.1, 5.3, -11.2, 13.4]],
  ['Commodities', [-11.2, 7.7, -3.1, 27.1, 16.1, -7.9]],
  ['REITs', [-4.6, 28.7, -5.1, 43.2, -24.4, 13.7]],
];
const YEARS = ['2018', '2019', '2020', '2021', '2022', '2023'];
const RETURNS = ASSETS.flatMap(([Asset, values]) => values.map((v, i) => ({ 'Asset class': Asset, Year: YEARS[i], 'Total return (%)': v })));

/** Steps of 5 points: six loss steps, six gain steps, picked from each ramp so each step keeps its own contrast. */
const THRESHOLDS = [-25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25];
function heatmapExpected(gain: string[], loss: string[]) {
  const losses = [loss[2], loss[3], loss[4], loss[5], loss[6], loss[8]];
  const gains = [gain[8], gain[7], gain[6], gain[5], gain[4], gain[2]];
  const y = { field: 'Asset class', type: 'nominal', sort: ASSETS.map(([a]) => a), title: null, axis: { domain: false, ticks: false, labelFontSize: 10, labelColor: GRAY[90], labelPadding: 6 } };
  const x = { field: 'Year', type: 'ordinal', title: null, axis: { orient: 'top', domain: false, ticks: false, labelAngle: 0, labelFontSize: 10, labelColor: GRAY[60] } };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 12, right: 12, top: 8, bottom: 8 } },
    width: W - 60,
    height: 200,
    data: { values: RETURNS },
    encoding: { x, y },
    layer: [
      { mark: { type: 'rect', stroke: '#FFFFFF', strokeWidth: 1 }, encoding: { color: { field: 'Total return (%)', type: 'quantitative', scale: { type: 'threshold', domain: THRESHOLDS, range: [...losses, ...gains] }, legend: null } } },
      {
        mark: { type: 'text', fontSize: 10 },
        encoding: {
          text: { field: 'Total return (%)', type: 'quantitative', format: '+.1f' },
          color: { condition: { test: "abs(datum['Total return (%)']) >= 15", value: '#FFFFFF' }, value: GRAY[90] },
        },
      },
    ],
  };
}

const returnsFlint = (title: string) => flintInput(theme, {
  chartType: 'Heatmap',
  data: RETURNS,
  semantic_types: { 'Asset class': 'Category', Year: 'Year', 'Total return (%)': { semanticType: 'Percentage', unit: '%' } },
  encodings: { x: 'Year', y: 'Asset class', color: 'Total return (%)' },
  title,
});

// ---------------------------------------------------------------------------
// Signed columns: gains green, losses red.

const SP500 = [
  [2008, -37.0], [2009, 26.5], [2010, 15.1], [2011, 2.1], [2012, 16.0], [2013, 32.4], [2014, 13.7], [2015, 1.4],
  [2016, 12.0], [2017, 21.8], [2018, -4.4], [2019, 31.5], [2020, 18.4], [2021, 28.7], [2022, -18.1], [2023, 26.3],
].map(([Year, v]) => ({ Year: String(Year), 'Total return (%)': v }));

function signedExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 12, right: 12, top: 8, bottom: 8 } },
    width: W,
    height: 190,
    data: { values: SP500 },
    layer: [
      {
        mark: { type: 'bar', width: { band: 0.7 } },
        encoding: {
          x: { field: 'Year', type: 'ordinal', title: null, axis: { labelAngle: -45, labelAlign: 'right', labelFontSize: 9, labelColor: GRAY[60], domain: false, ticks: false } },
          y: { field: 'Total return (%)', type: 'quantitative', title: null, axis: { tickCount: 6, labelFontSize: 9, labelColor: GRAY[60], grid: true, gridColor: GRAY[20], domain: false, ticks: false, labelExpr: "datum.label + '%'" } },
          color: { condition: { test: "datum['Total return (%)'] < 0", value: '#D91F11' }, value: '#077D55' },
        },
      },
      { data: { values: [{}] }, mark: { type: 'rule', color: GRAY[50], strokeWidth: 1 }, encoding: { y: { datum: 0, type: 'quantitative' } } },
    ],
  };
}

// ---------------------------------------------------------------------------
// The thumbnail's half donut.

function halfDonutExpected() {
  const rows = BROWSERS.slice().sort((a, b) => b.Share - a.Share);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), background: PAGE, padding: 12 },
    width: W,
    height: 150,
    data: { values: rows },
    encoding: {
      theta: { field: 'Share', type: 'quantitative', stack: true, scale: { range: [-Math.PI / 2, Math.PI / 2] } },
      order: { field: 'Share', type: 'quantitative', sort: 'descending' },
      color: { field: 'Browser', type: 'nominal', sort: rows.map((row) => row.Browser), scale: { range: SEQUENCE }, legend: { orient: 'bottom', direction: 'horizontal', title: null, symbolType: 'square', labelFontSize: 10, labelColor: GRAY[60] } },
    },
    mark: { type: 'arc', outerRadius: 130, innerRadius: 80, radiusOffset: 0, y: 140 },
  };
}

const gs: StyleGuideTheme = {
  id: 'goldman-sachs',
  org: 'Goldman Sachs Design System (GS UI Toolkit)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the archived (2023) Charts, Chart Colors and Chart Guidelines pages of design.gs.com and the two chart-editor illustrations that survive. The pages give colours but no chart type sizes, gridline or axis inks; those come from the GS gray ramp as the illustrations show it (gray 20 grid, gray 30 baseline, gray 60 labels). Goldman Sans is proprietary and falls back to Roboto.',
    'Stated directly: the ten-colour default sequence led by Blue 70, the blue ramp as the sequential palette, the two **performance ramps** joined into one diverging ramp (red 090→020, green 020→090), Green 60 / Red 60 as the status inks with signed values coloured by status, horizontal light gridlines only, a light baseline and no value-axis line, straight 2px lines with a small filled dot at every reading, a compact key at the top right with no title, rotated date labels, a hairline plot frame.',
    'Not stated: the ramps are *stepped* ten-swatch scales with a text-contrast rating per step, not an interpolation; the colour-blind-safe blue/orange alternative cannot live beside the green/red one; the tooltip takes the hovered series’ colour; and the card, the toolbar band (Export, chart type, settings) and the pale page belong to the product chrome. See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look: the chart-editor card',
      kind: 'visual-quality',
      severity: 'medium',
      observed: "Flint draws Division_A in Blue 70 and Division_B in Orange 50, a top-right key of line swatches, horizontal light gridlines and turned month names (“February, April, July, October, 2019”). It drops the dots it was asked for (`dots-stand-down` at 14 readings), keeps a rotated “Value” title, and has no card or toolbar. Expected: the illustration — orange and teal lines with a dot at every month, square key swatches top-right, all fourteen ISO dates turned 45°, inside the white card with the Export / chart / settings band on the pale page.",
      probe: 'signature',
      rule: 'A white card on the pale `#F2F5F7` page with a light toolbar band (Export ▾, chart type, settings) above a lightly framed plot; no title inside the chart; a compact key of small squares at the top right; two straight lines with a small filled dot at every reading; light horizontal gridlines only; tiny grey y labels and no y-axis line; ISO dates (2018-02-01) turned 45°.',
      current: 'The theme states the key position, the dots, the grid and the turned labels. Flint takes the sequence’s first two inks (Blue 70, Orange 50) — the illustration happens to show Orange 50 and Teal 50 — and formats the dates its own way. There is no toolbar band or card.',
      expected: 'The illustration redrawn with the same fourteen months of data.',
      flint: divisionsFlint(),
      expectedSpec: signatureExpected(),
      expectedFrame: { style: CARD, headerHtml: toolbar },
    },
    {
      id: 'gain-loss-ramps',
      title: 'Gains and losses read off two stepped ten-swatch ramps',
      kind: 'expressiveness',
      severity: 'high',
      observed: "Flint interpolates the joined red–green ramp over a symmetric −43…43 domain with a gradient key; it reads well but the cells carry no numbers and small returns fade to near-white (US bonds 2018 is invisible). Expected: discrete 5-point steps from each ramp with the return printed in every cell, white on the dark steps. The gallery also shows the cost of one diverging ramp: the temperature heatmap is drawn in gain/loss green and red.",
      probe: 'signed-ramp',
      rule: '“Performance Values — use to show positive, neutral, and negative values”: a Green ramp (100 → 010) for gains and a Red ramp for losses, each ten swatches with the same contrast per step and an AA/AAA text rating, so a cell’s number is set white on the dark steps and dark on the pale ones.',
      current: 'The theme can only join the two ramps into one `diverging` ramp and let Flint interpolate across it; `consumption: "quantize"` would cut the joined ramp into equal bins, not pick the house’s own swatches by step. The cell text is not part of the heatmap.',
      expected: 'Asset-class returns by year in 5-point steps taken from each ramp, the number in each cell in white or ink according to the step.',
      proposal: '`ink.series.signedRamps: { positive: Ramp, negative: Ramp, step: 5, consumption: "swatch" }` with per-stop `textInk`, so a printed value picks its contrast from the swatch it lands on.',
      flint: returnsFlint('Bonds offered no shelter in 2022'),
      expectedSpec: heatmapExpected(GREEN, RED),
      expectedFrame: { headerHtml: `<div style="font-family:${FONT};font-size:16px;font-weight:500;color:${GRAY[90]};margin:0 14px 2px">Bonds offered no shelter in 2022</div><div style="font-family:${FONT};font-size:12px;color:${GRAY[60]};margin:0 14px 4px">Annual total return by asset class, % (approximate index returns)</div>` },
    },
    {
      id: 'signed-columns',
      addressed: { stage: 'R2', note: 'Gains and losses take the house’s positive and negative inks by sign.' },
      title: 'Positive and negative columns in Green 60 and Red 60',
      kind: 'realization',
      severity: 'medium',
      observed: "Flint draws all sixteen years in Blue 70 — the status inks are not applied because no colour field is bound — and there is no distinct zero line; year labels are turned 45°. Expected: green gains, red losses (2008, 2018, 2022), a grey zero line, % labels.",
      probe: 'per-mark-palette',
      rule: 'Positive values take the Green ramp, negative values the Red ramp; a deviation chart always keeps its zero reference line.',
      current: 'The theme states `status: { positive: "#077D55", negative: "#D91F11" }` with `selection.signed: "status"`. A chart whose measure crosses zero but has no colour field is the case the rule exists for.',
      expected: 'Sixteen years of S&P 500 returns: gains green, losses red, a grey zero line.',
      proposal: 'Apply `selection.signed` to the measure itself when no colour channel is bound (one ink per sign), and draw `structure.grid.zero` whenever the domain crosses zero.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: SP500,
        semantic_types: { Year: 'Year', 'Total return (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Total return (%)' },
        title: 'Four losing years in sixteen',
      }),
      expectedSpec: signedExpected(),
      expectedFrame: { headerHtml: `<div style="font-family:${FONT};font-size:16px;font-weight:500;color:${GRAY[90]};margin:0 14px 2px">Four losing years in sixteen</div><div style="font-family:${FONT};font-size:12px;color:${GRAY[60]};margin:0 14px 4px">S&amp;P 500 annual total return, %</div>` },
    },
    {
      id: 'colour-blind-alternative',
      title: 'A colour-blind-safe blue/orange alternative to green/red',
      kind: 'expressiveness',
      severity: 'medium',
      observed: "Flint can only show the green/red version (same panel as the previous gap). Expected: the same table on the blue (gains) and orange (losses) ramps, legible for red–green colour-blind readers.",
      probe: 'series-ink-variants',
      rule: '“Alternative Palette — use to show correlation or valuation or as a color-blind-safe option”: Blue ramp for positive, Orange ramp for negative, offered beside the green/red performance ramps.',
      current: 'A ThemeSpec holds one diverging ramp and one status pair, so the theme must choose green/red; the alternative needs a second theme, and nothing lets the chart (or the reader) ask for the safe variant.',
      expected: 'The same returns heatmap on the blue/orange ramps.',
      proposal: '`ink.series.alternatives: { colorBlindSafe: { diverging, status } }`, selected by a chart-spec or host flag (`accessibility: { colorVision: "deuteranopia" }`).',
      flint: returnsFlint('Bonds offered no shelter in 2022'),
      expectedSpec: heatmapExpected(BLUE, ORANGE),
      expectedFrame: { headerHtml: `<div style="font-family:${FONT};font-size:16px;font-weight:500;color:${GRAY[90]};margin:0 14px 2px">Bonds offered no shelter in 2022</div><div style="font-family:${FONT};font-size:12px;color:${GRAY[60]};margin:0 14px 4px">Annual total return by asset class, % — colour-blind-safe palette</div>` },
    },
    {
      id: 'series-tooltip',
      title: 'Tooltips take the hovered series’ colour',
      kind: 'product-ui',
      severity: 'low',
      observed: "The static Flint panel has no hover state. Expected: a grey scrubber at July 2018, Division_A’s dot enlarged with a white ring, and an orange tooltip with white “2018-07-01 / Division_A: 7”.",
      probe: 'tooltip-style',
      rule: '“By default, charts tooltips are colored to align to the series color used in the chart. Alternately you can use the contrast or primary tooltips.” The scrubber (a vertical rule) marks the hovered reading.',
      current: 'Only `interaction.tooltipFormat`; the tooltip is Vega’s neutral box whatever series is hovered, and there is no scrubber.',
      expected: 'Division_A hovered in July 2018: a scrubber, the dot enlarged, an orange tooltip with white text.',
      proposal: '`interaction.tooltip: { fill: "series" | "contrast" | "primary", scrubber: "rule" }`.',
      flint: divisionsFlint(),
      expectedSpec: signatureExpected({ tooltip: true }),
      expectedFrame: { style: CARD, headerHtml: toolbar },
    },
    {
      id: 'half-donut',
      title: 'A thick half donut, largest slice first from the left, no gaps',
      kind: 'expressiveness',
      severity: 'low',
      observed: "Flint draws a full donut with a dot-swatch key above it. Expected: a thick half ring on the page grey, Chrome’s blue from the left, then orange, teal, yellow and purple, no gaps, square key below.",
      probe: 'pie-rules',
      rule: 'The charts thumbnail draws part-to-whole as a thick semicircular ring on the page grey, slices in sequence order starting with the largest at the left, butted together without gaps or labels.',
      current: 'No ThemeSpec field for the arc’s sweep (half or full) or start angle; Flint draws a full donut in the sequence colours.',
      expected: 'Browser shares as a half ring, Blue 70 → Orange 50 → Teal 50 → Yellow 40 → Purple 50 from left to right.',
      proposal: '`geometry.arc: { sweep: 180, startAngle: -90, innerRadius: 0.62 }`.',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: BROWSERS,
        semantic_types: { Browser: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Browser' },
        title: 'Desktop browser share, 2024',
      }),
      expectedSpec: halfDonutExpected(),
      expectedFrame: { style: { background: PAGE }, headerHtml: `<div style="font-family:${FONT};font-size:16px;font-weight:500;color:${GRAY[90]};margin:10px 14px 0">Desktop browser share, 2024</div>` },
    },
    {
      id: 'dots-stand-down',
      addressed: { stage: 'M5', note: '`geometry.point.density: "all"` keeps a dot at every reading past the countable dozen; they still shrink where readings sit close.' },
      title: 'A dot at every reading — Flint drops them past twelve',
      kind: 'realization',
      severity: 'medium',
      probe: 'point-visibility',
      rule: 'The illustrations put a small filled dot on every one of the fourteen monthly readings of each line.',
      current: 'The theme states `geometry.point.presence: "full"`, but Flint reports `dots-stand-down` — “14 readings on one line is past the 12 a reader can take one at a time” — and draws the lines bare (see the signature panel).',
      expected: 'See the dots on both lines in the signature panel’s expected chart.',
      proposal: 'Treat `presence: "full"` as the house’s explicit answer and keep the dots (report the density instead), or expose the threshold (`geometry.point.maxReadings`).',
    },
    {
      id: 'card-toolbar',
      title: 'Card, toolbar band and pale page',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'card-container',
      rule: 'Every chart sits in a white card on the `#F2F5F7` page; a light toolbar band (Export ▾, chart-type switcher, settings) runs across the top of the plot; the anatomy names a Header and a Footer region.',
      current: 'Flint draws the chart only. The canvas colour is the one surface the theme can set, and setting it to the page grey would put the plot on grey too.',
      expected: 'See the card and toolbar around the signature and tooltip panels.',
      proposal: 'A `container` block (`surface`, `pageSurface`, `border`, `elevation`) and a toolbar slot (`actions: ["export", "chartType", "settings"]`) in host-UI metadata beside the spec.',
    },
    {
      id: 'iso-dates',
      title: 'ISO dates, turned 45°',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'date-label-format',
      rule: 'The illustrations print monthly dates as ISO `2018-02-01`, turned 45°, truncated with an ellipsis (“2018-…”) when the plot is narrow.',
      current: 'The theme can ask for turned labels (`labels.angle: "rotated"`) and ellipsis truncation, but there is no date-format field, so Flint prints its own month labels (“February, April, July, October, 2019”); and `labels.angle` cannot be limited to dates, so the gallery turns every axis — population values, medal countries, decade bars — by 45°.',
      expected: 'See the x axis of the signature panel.',
      proposal: '`labels.time.format: "%Y-%m-%d"` (or a named style: `iso`, `short`, `long`).',
    },
  ],
};

export default gs;
