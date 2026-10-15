import type { ThemeSpec } from 'flint-chart';
import research from '../research/michelin.json';
import { cardProbe, flintInput, highlightProbe, POPULATION, signedProbe } from '../probes';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Noto Sans', sans-serif";
const BLACK = '#000000';
const GREY_TEXT = '#757575';
/** rgba(0,0,0,0.1) on white. */
const GRID = '#E6E6E6';
const CHARCOAL = '#333333';
const MICHELIN_BLUE = '#27509B';
/** `categorical-accent`, mode `color-blind-safe` — the default token set in @michelin/theme 12.1. */
const CB_SAFE = ['#074650', '#009292', '#FE6DB6', '#FE5BDA', '#480091', '#BE6AFF', '#B50AFE', '#6DB6FF'];
const ORANGES = ['#FFF5EB', '#FEE6CE', '#FDD0A2', '#FDAE6B', '#FD8D3C', '#F16913', '#D94801', '#A63603', '#7F2704'];
const RDBU = ['#67001F', '#B2182B', '#D6604D', '#F4A582', '#FDDBC7', '#F7F7F7', '#D1E5F0', '#92C5DE', '#4393C3', '#2166AC', '#053061'];

const t: HouseTokens = {
  font: FONT,
  text: BLACK,
  muted: GREY_TEXT,
  grid: GRID,
  axis: null,
  background: '#FFFFFF',
  palette: CB_SAFE,
  highlight: CHARCOAL,
  context: '#B3B3B3',
  titleSize: 20,
  titleWeight: 'bold',
  subtitleSize: 13,
  labelSize: 11,
  lineWidth: 2,
  barCorner: 3,
};

const theme: ThemeSpec = {
  id: 'michelin',
  label: 'Michelin',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: BLACK, secondary: GREY_TEXT, muted: GREY_TEXT, inverse: '#FFFFFF' },
    structure: { grid: GRID, axis: GRID, rule: GREY_TEXT },
    series: {
      single: MICHELIN_BLUE,
      categorical: CB_SAFE,
      sequential: { stops: ORANGES, space: 'lab' },
      diverging: { stops: RDBU, neutral: '#F7F7F7', space: 'lab' },
    },
    accent: MICHELIN_BLUE,
  },
  type: {
    headline: { family: FONT, size: 20, weight: 'bold', case: 'asIs', color: BLACK },
    deck: { family: FONT, size: 13, weight: 'regular', color: GREY_TEXT },
    axisLabel: { family: FONT, size: 11, color: GREY_TEXT },
    axisTitle: { family: FONT, size: 11, color: GREY_TEXT },
    keyLabel: { family: FONT, size: 11, color: GREY_TEXT },
    valueLabel: { family: FONT, size: 11, color: BLACK },
    annotation: { family: FONT, size: 11, color: BLACK },
    footnote: { family: FONT, size: 11, color: GREY_TEXT },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit' },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'omit',
  },
  marks: { strokeWeight: 2, cornerRadius: 3, fillOpacity: 0.6, interpolation: 'linear', slice: { gap: 1, gapStyle: 'rule' }, point: { presence: 'omit' } },
  geometry: {
    line: { width: 2, interpolation: 'linear' },
    point: { presence: 'omit' },
    area: { opacity: 0.4 },
    // A 60% fill edged 1px in the bar's own hue at full strength (M2).
    band: { opacity: 0.6, cornerRadius: 3, outline: 'full', outlineWidth: 1, outlineInk: 'series' },
    arc: { gap: 1, gapStyle: 'rule' },
  },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'omit', numberFormat: { thousands: 'suffix', compact: { threshold: 1000 } } },
  layout: { titleBlock: { anchor: 'start', deckGap: 'loose' } },
  // “Thin donut charts are impossible to read”: the do-example's hole is about half the radius.
  chartDefaults: { 'Donut Chart': { innerRadius: 40 } },
};

// ---------------------------------------------------------------------------
// Data re-keyed by eye from the guide's specimens (anatomy-line, bar-do-1, donut-do-1).
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
const PLANNED = [0, 3.4, 5.9, 5.3, 6.3, 12.4, 20.6];
const COMPLETED = [0, 9.2, 12.2, 14.4, 16.6, 18.8, 20.2];
const REQUESTS = MONTHS.flatMap((m, i) => [
  { Month: `2023-${String(i + 1).padStart(2, '0')}-01`, Status: 'Planned', Requests: PLANNED[i] * 1000 },
  { Month: `2023-${String(i + 1).padStart(2, '0')}-01`, Status: 'Completed', Requests: COMPLETED[i] * 1000 },
]);
const SPECIMEN_INKS = ['#8DA0CC', MICHELIN_BLUE];

const SLICES = [['A', 32], ['B', 25], ['C', 18], ['Others', 17], ['D', 10]].map(([Category, Share]) => ({ Category, Share }));

const config = (extra: Record<string, unknown> = {}) => {
  const base = houseConfig(t);
  return {
    ...base,
    title: { ...(base.title as object), fontSize: 20, fontWeight: 'bold', color: BLACK, subtitleColor: GREY_TEXT, subtitleFontSize: 13, subtitlePadding: 8 },
    axis: { ...(base.axis as object), domain: false, ticks: false, labelColor: GREY_TEXT, labelFontSize: 11, gridColor: GRID },
    legend: { ...(base.legend as object), orient: 'top', direction: 'horizontal', symbolType: 'circle', symbolSize: 50, labelColor: GREY_TEXT, labelFontSize: 11, columnPadding: 22, offset: 16 },
    ...extra,
  };
};

/** anatomy-line: bold title, grey “per month”, circular swatches top-left, faint horizontal rules, no axis lines. */
function signature() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config(),
    title: { text: 'Evolution of requests', subtitle: 'per month', offset: 34 },
    width: W,
    height: H,
    layer: [{
    data: { values: REQUESTS },
    mark: { type: 'line', strokeWidth: 2, interpolate: 'monotone' },
    encoding: {
      x: { field: 'Month', type: 'temporal', title: null, scale: { type: 'utc' }, axis: { format: '%b', tickCount: { interval: 'month', step: 1 }, grid: false } },
      y: { field: 'Requests', type: 'quantitative', title: null, scale: { domain: [0, 20000] }, axis: { values: [0, 5000, 10000, 15000, 20000], labelExpr: "datum.value === 0 ? '0' : format(datum.value / 1000, 'd') + 'k'" } },
      color: { field: 'Status', type: 'nominal', sort: ['Planned', 'Completed'], scale: { domain: ['Planned', 'Completed'], range: SPECIMEN_INKS }, legend: null },
    },
    },
    // The key by hand: Vega-Lite keys a line with a stroked symbol; Chart.js point style is a filled dot.
    ...[['Planned', SPECIMEN_INKS[0]], ['Completed', SPECIMEN_INKS[1]]].flatMap(([label, color], i) => [
      { data: { values: [{}] }, mark: { type: 'point', shape: 'circle', filled: true, size: 45, color, opacity: 1, clip: false }, encoding: { x: { value: 6 + i * 76 }, y: { value: -18 } } },
      { data: { values: [{}] }, mark: { type: 'text', align: 'left', baseline: 'middle', fontSize: 11, color: GREY_TEXT, text: label, clip: false }, encoding: { x: { value: 14 + i * 76 }, y: { value: -18 } } },
    ]),
    ],
  };
}

/** Chart.js bars: series colour at 60% with a 1px opaque border of the same hue, gently rounded tops. */
function translucentBars() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config(),
    title: { text: 'India and China hold over a third of humanity', subtitle: 'Population, millions, 2023' },
    width: W,
    height: H,
    data: { values: POPULATION },
    mark: { type: 'bar', color: MICHELIN_BLUE, fillOpacity: 0.6, stroke: MICHELIN_BLUE, strokeWidth: 1, strokeOpacity: 1, cornerRadiusEnd: 3 },
    encoding: {
      y: { field: 'Country', type: 'nominal', sort: null, title: null },
      x: { field: 'Population', type: 'quantitative', title: null, axis: { grid: true, tickCount: 4 } },
    },
  };
}

/** donut-do-1: charcoal emphasis, greys for the rest, thick ring, boxed “A - 32%” callouts on leader lines. */
function donut() {
  const total = SLICES.reduce((sum, row) => sum + (row.Share as number), 0);
  let acc = 0;
  const cx = W / 2;
  const cy = H / 2;
  const outer = 80;
  const rows = SLICES.map((row, i) => {
    const mid = ((acc + (row.Share as number) / 2) / total) * Math.PI * 2;
    acc += row.Share as number;
    const sx = Math.sin(mid);
    const sy = -Math.cos(mid);
    const label = `${row.Category} - ${row.Share}%`;
    const lx = cx + sx * (outer + 26);
    const ly = cy + sy * (outer + 18);
    const right = sx >= 0;
    const width = label.length * 6.2 + 10;
    return {
      ...row, i, label, emphasis: i === 0,
      x1: cx + sx * (outer - 4), y1: cy + sy * (outer - 4), x2: lx, y2: ly,
      bx1: right ? lx : lx - width, bx2: right ? lx + width : lx, tx: right ? lx + 5 : lx - width + 5, by1: ly - 9, by2: ly + 9,
    };
  });
  const px = (field: string) => ({ field, type: 'quantitative', scale: null });
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...config(), legend: { disable: true } },
    width: W,
    height: H,
    data: { values: rows },
    layer: [
      {
        mark: { type: 'arc', innerRadius: 40, outerRadius: outer, stroke: '#FFFFFF', strokeWidth: 1.5 },
        encoding: {
          theta: { field: 'Share', type: 'quantitative', stack: true },
          order: { field: 'i', type: 'quantitative' },
          color: { field: 'Category', type: 'nominal', sort: SLICES.map((r) => r.Category), scale: { range: [CHARCOAL, '#7A7A7A', '#808080', '#7A7A7A', '#808080'] } },
        },
      },
      { mark: { type: 'rule', strokeWidth: 0.8 }, encoding: { x: px('x1'), y: px('y1'), x2: { field: 'x2' }, y2: { field: 'y2' }, color: { condition: { test: 'datum.emphasis', value: BLACK }, value: '#9E9E9E' } } },
      { mark: { type: 'rect', fill: '#FFFFFF', strokeWidth: 0.8 }, encoding: { x: px('bx1'), x2: { field: 'bx2' }, y: px('by1'), y2: { field: 'by2' }, stroke: { condition: { test: 'datum.emphasis', value: BLACK }, value: '#9E9E9E' } } },
      { mark: { type: 'text', align: 'left', baseline: 'middle', fontSize: 11, font: FONT }, encoding: { x: px('tx'), y: px('y2'), text: { field: 'label' }, color: { condition: { test: 'datum.emphasis', value: BLACK }, value: '#757575' } } },
    ],
  };
}

const michelin: StyleGuideTheme = {
  id: 'michelin',
  org: 'Michelin Design System (data visualization)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch. The design-system pages sit behind a Michelin login, but their public `__data.json` payloads carry the guideline text and specimen images, and the public npm packages `@michelin/theme` and `@michelin/charts` 12.1 carry the real tokens and the Chart.js defaults — so most values here are from code, not from screenshots.',
    'Stated directly: Noto Sans for every piece of chart text; the default `categorical-accent` colour-blind-safe set (`#074650`, `#009292`, `#FE6DB6`, …); ColorBrewer Oranges as the sequential ramp and RdBu as the diverging one; gridlines at 10% black (`#E6E6E6` on white) on the measure only, no axis lines or ticks; bars at 60% fill with slightly rounded tops (`geometry.band`), areas at 40%, white rules between pie slices; straight (not smoothed) 2px lines without markers; a bold title over a smaller regular subtitle that states the measure (axis titles omitted, `thousands: suffix` for “5k”); a key at the top-left; no rotated text; and a thicker donut ring than the template’s default.',
    'Approximated: the library sets every chart text to pure black, but the guide’s specimens draw tick and key labels grey; the theme follows the specimens (`#757575`) and keeps black for titles and values. The single-series ink is the legacy Michelin blue `#27509B` (the library’s fallback first colour), since the colour-blind-safe set has no single-series token.',
    'Not stateable: the 1px opaque border in the bar’s own hue around a translucent fill, the circular point-style key swatch, the charcoal-against-greys emphasis, boxed outside donut labels on leader lines, the light-grey dashboard with a white card per chart, the translucent black tooltip and dark mode — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'anatomy-line: “Evolution of requests” large and bold, top-left; a small grey subtitle “per month” that states the measure; a key under it, left-aligned, with circular swatches; 0 / 5k / 10k / 15k / 20k in grey with very faint horizontal rules only; no axis lines; Jan–Jul under the plot. (The specimen draws smoothed curves although the line guidance says “Avoid using smoothed line”; the theme follows the written rule.)',
      current: 'Flint draws the same seven months with the house theme.',
      expected: 'The anatomy specimen, re-keyed, in its own two blues.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: REQUESTS,
        semantic_types: { Month: 'YearMonth', Status: 'Category', Requests: 'Count' },
        encodings: { x: 'Month', y: 'Requests', color: 'Status' },
        title: 'Evolution of requests',
        subtitle: 'per month',
      }),
      expectedSpec: signature(),
      observed: 'Flint has the frame of it: bold black title, grey deck, key top-left, faint horizontal rules only, no axis lines. It differs in the numbers — 0 … 25,000 with no “k” although `thousands: suffix` is stated, one rule too many — in the deck, which becomes “per month; Requests” (the axis title appended), in the months (“2023 February March … July”, the first one replaced by the year), and in the key, which shows line samples rather than dots. The two series are the colour-blind-safe dark teal and teal where the specimen uses two Michelin blues; the straight lines follow the written rule, not the smoothed specimen.',
    },
    {
      id: 'band-opacity',
      addressed: { stage: 'M2', note: '`band.opacity: 0.6` is drawn on the bars’ fill (it no longer lands only on areas).' },
      title: 'The 60% bar fill is stated but bars are drawn opaque',
      kind: 'realization',
      severity: 'medium',
      probe: 'bar-shape',
      rule: '`@michelin/charts`: bar, pie and polar fills are the series colour at 60% alpha (`RGBA_ALPHA_BAR_BG = 0.6`, 80% on hover) with a fully opaque 1px border of the same colour; the bar specimen rounds the top corners slightly.',
      current: 'The theme states `geometry.band: { opacity: 0.6, cornerRadius: 3 }` and `marks.fillOpacity: 0.6`. The compiled spec carries `bar: { cornerRadiusEnd: 3 }` but the opacity only reaches `config.area.fillOpacity`: bars (and wedges) are drawn at full ink. `band.cornerRadius` meanwhile also lands on `config.arc.cornerRadius`, rounding donut wedges the guide never rounds.',
      expected: 'Blue bars at 60% with a 1px opaque blue edge and 3px rounded ends.',
      proposal: 'Realise `geometry.band.opacity` as `fillOpacity` on bar/rect marks (and `marks.fillOpacity` on every filled mark), and keep `band.cornerRadius` off arcs.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: 'Country', x: 'Population' },
        title: 'India and China hold over a third of humanity',
        subtitle: 'Population, millions, 2023',
      }),
      expectedSpec: translucentBars(),
      observed: 'Flint’s bars are solid `#27509B`; the expected ones are the same blue at 60% with a crisp 1px blue edge. The rounded ends are realised (3px on Flint’s bars too). Every bar in the gallery is likewise opaque, while the area tile does get a translucent fill.',
    },
    {
      id: 'bar-border',
      addressed: { stage: 'M2', note: '`band.outlineInk: "series"` draws the 1px border in each bar’s own hue at full strength.' },
      title: 'An opaque border in the bar’s own hue',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'bar-shape',
      rule: 'Every translucent fill is edged by a 1px border in the same colour at full opacity (`borderWidth: 1`, `borderColor` = series colour).',
      current: '`band.outline` / `marks.outline` can only draw the border in the structure ink or the surface — never in the mark’s own colour — so even with the opacity realised, the crisp same-hue edge that makes a 60% fill read as deliberate cannot be stated.',
      expected: 'See the expected panel of the gap above.',
      proposal: '`marks.outline.source: "series"` (draw the outline in the mark’s own ink, at full opacity) alongside the existing `ink` and `surface`.',
    },
    {
      id: 'highlight',
      title: 'One category in dark charcoal, the rest in greys',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'highlight',
      rule: '“Use colors with high level of contrast to stand out alerts or important information”: the do-examples draw the category that matters in charcoal (`#333`) and the others in mid and light greys, so “users understand that category A is the one to get their attention on”.',
      current: 'Neither the chart spec nor the theme can name the category that matters; every bar takes the single-series ink.',
      expected: 'Nigeria in charcoal, the rest light grey, at the house’s 60% fill.',
      proposal: '`chart_spec.emphasis: { field, values }` with `ink.series.emphasis` / `ink.series.context` in the theme.',
      ...highlightProbe(theme, t),
      observed: 'Flint: eight identical blue bars. Expected: Nigeria charcoal against light-grey bars, the reading the guide’s do-examples teach.',
    },
    {
      id: 'donut-callouts',
      title: 'Donut labels boxed outside the ring on leader lines',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'pie-rules',
      rule: '“Don’t label on top of slices”; label each slice outside the ring in a boxed callout “A - 32%” joined by a thin leader line; fewer than three real categories plus “Others”; slices ordered, largest first from 12 o’clock; “Thin donut charts are impossible to read.”',
      current: '`dataLabels` can only say whether values print and whether they sit `atMark` / `outsideMark`; there is no callout box, no leader line, no “name - value” label form, and no rule that a slice’s name and value share one label. The theme turns labels off, so Flint falls back to a key.',
      expected: 'The do-example: a thick ring, A in charcoal with a black-boxed label, the rest grey with grey-boxed labels on leader lines.',
      proposal: '`dataLabels.placement: "callout"` with `dataLabels.callout: { box: true, leader: true, content: "nameAndValue" }`, the box ink following the mark’s emphasis.',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: SLICES,
        semantic_types: { Category: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Category' },
      }),
      expectedSpec: donut(),
      observed: 'Flint draws a thick ring (the `chartDefaults` hole) with a top-left dot key — the house’s key, but not its donut, which labels outside in boxes. All five slices take distinct accent colours (dark teal, teal, two pinks, purple) where the specimen is one charcoal against greys, and the slices run alphabetically (A, B, C, D, Others) rather than in the data’s order with “Others” before the last category.',
    },
    {
      id: 'rotated-labels',
      addressed: { stage: 'A1', note: 'Names are measured in the face they are drawn in and kept flat: broken at a space, set smaller down to the floor (`type.minSize`, never below ¾ of the stated size), the bands widened — and only then turned (A1).' },
      title: 'Category labels are turned although the house forbids rotated text',
      kind: 'realization',
      severity: 'medium',
      probe: 'rotated-labels',
      rule: '“Horizontal axis labels parallel to axis”; “Use a horizontal bar chart instead of rotating labels”; avoid rotated text generally.',
      current: 'The theme states `labels.`. On the decade columns Flint still turns the x labels −45° to fit them, instead of wrapping, thinning or abbreviating them.',
      expected: 'Every decade label horizontal under its column (thinned if they cannot all fit).',
      proposal: 'Treat `labels.` as a constraint: wrap, thin or abbreviate before turning, and report when nothing fits (a hint to flip the bars horizontal).',
      ...signedProbe(theme, t, { positive: MICHELIN_BLUE, negative: MICHELIN_BLUE }),
      observed: 'Flint turns all nine decade labels −45° under a 360px plot where, set horizontally at 11px, they fit their columns; the gallery’s anomaly tile does the same. The expected panel keeps them flat. (Flint’s headline also wraps to two lines where it fits on one.)',
    },
    {
      id: 'legend-dots',
      title: 'Key swatches are small circles for every chart',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'legend-swatch',
      rule: '`legend.labels: { usePointStyle: true, boxWidth: 6 }`: every key, line charts included, shows a small filled circle in the series colour (anatomy-line).',
      current: '`legend.swatch` only takes `"auto"`: Flint chooses the swatch from the mark, so a line chart’s key shows line samples.',
      expected: 'Circles beside “Planned” and “Completed” (see the signature’s expected panel).',
      proposal: '`legend.swatch: "circle" | "square" | "roundedSquare" | "line" | "mark"`, with a size.',
      observed: 'In the signature Flint keys the two lines with short line samples; on the donut it does use dots.',
    },
    {
      id: 'dashboard-card',
      title: 'A white card per chart on a light-grey dashboard',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'card-container',
      rule: '“We recommend to apply a light grey background. Then you can create cards for each of the visuals”; cards align to the column grid; charts never exceed 600px high.',
      current: 'A theme has one canvas colour and no container: Flint draws the chart on its own white canvas, with nothing to say it sits in a card on a grey ground.',
      expected: 'The chart on a white card with a light shadow, inside a light-grey dashboard ground.',
      proposal: '`layout.container: { kind: "card", surface, ground, radius, shadow, padding }` — rendered by hosts that embed the chart, ignored by bare exports.',
      ...cardProbe(theme, t, {
        style: { background: '#FFFFFF', border: '14px solid #F2F2F2', borderRadius: 4, boxShadow: 'inset 0 0 0 1px #E0E0E0', padding: '12px 14px' },
        header: '<span style="font-weight:700;font-size:16px">Unemployment rate</span>',
        meta: 'per year, %',
      }),
      observed: 'Flint’s chart is drawn straight onto the white page; the expected one sits in a white card on the light-grey dashboard ground, its title smaller and bold.',
    },
    {
      id: 'thousands-suffix',
      addressed: { stage: 'A6', note: '`compact: { threshold: 1000 }` — 0 / 5k / 10k / 15k / 20k on the ticks (A6).' },
      title: '“5k, 10k, 20k” on the value axis',
      kind: 'realization',
      severity: 'low',
      probe: 'number-format',
      rule: 'The specimens abbreviate tick values (5k, 10k, 20k) and put the unit in the subtitle.',
      current: 'Stated as `annotation.numberFormat.thousands: "suffix"`; Flint applies the format to printed values, not to tick labels.',
      expected: '0 / 5k / 10k / 15k / 20k (see the signature’s expected panel).',
      proposal: 'Apply `annotation.numberFormat` to measure-axis tick labels too.',
      observed: 'The signature’s Flint panel reads 5,000 … 25,000.',
    },
    {
      id: 'dark-mode',
      title: 'Dark mode swaps text, gridlines and the palette',
      kind: 'product-ui',
      severity: 'low',
      probe: 'dark-mode',
      rule: '`colorMode: dark`: all chart text white, gridlines `rgba(255,255,255,0.2)`, tooltip border `rgba(255,255,255,0.3)`; a dedicated `michelin-dark-mode-opt` palette (`#FCE500`, `#D6533C`, …) and a fallback palette whose first and last colours swap to lighter tints.',
      current: 'A ThemeSpec is one light or one dark house; there is no paired mode, so the dark Michelin chart has to be a second theme that repeats every non-colour decision.',
      expected: 'One theme with a dark-mode ink block the host can switch to.',
      proposal: '`ink.modes: { dark: { surface, text, structure, series } }` selected by the host (`prefers-color-scheme`), with every non-ink block shared.',
    },
  ],
};

export default michelin;
