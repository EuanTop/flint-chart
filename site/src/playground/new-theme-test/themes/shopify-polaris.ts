import type { ThemeSpec } from 'flint-chart';
import research from '../research/shopify-polaris.json';
import { flintInput, POPULATION, signedProbe, UNEMPLOYMENT } from '../probes';
import { houseConfig, W, H as HEIGHT, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "Inter, -apple-system, 'San Francisco', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";
const TEXT = '#1F1F25';
const SECONDARY = '#70707B';
const GRID = '#EEEEEF';
const PAGE = '#F1F2F4';
/** polaris-viz LIGHT_THEME seriesColors.all, in order. */
const PALETTE = ['#13ACF0', '#6A42E9', '#597EED', '#D147AC', '#23BABA', '#9B3CDD', '#9E84F2', '#128AC0', '#D75EB7', '#305EE8', '#AF63E4', '#33DBDB'];
const SINGLE = PALETTE[0];
/** #13ACF0 at 60% opacity over white. */
const SINGLE_60 = '#71CDF6';
const PAST = '#637381';

const t: HouseTokens = {
  font: FONT,
  text: TEXT,
  muted: SECONDARY,
  grid: GRID,
  axis: null,
  background: '#FFFFFF',
  palette: PALETTE,
  titleSize: 14,
  titleWeight: 600,
  subtitleSize: 13,
  labelSize: 11,
  lineWidth: 2,
  barCorner: 3,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'shopify-polaris',
  label: 'Shopify Polaris (polaris-viz)',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: TEXT, secondary: SECONDARY, muted: SECONDARY, inverse: '#FFFFFF' },
    structure: { grid: GRID, axis: GRID, rule: '#CBCBCF', zero: GRID },
    series: {
      single: SINGLE,
      categorical: PALETTE.slice(0, 4),
      categoricalExtended: PALETTE,
      overflow: '#CBCBCF',
      // Trend indicators: the library's "negative" is grey, not red.
      status: { positive: '#078D4E', negative: '#616161', neutral: '#8A8A8A' },
    },
    accent: SINGLE,
  },
  type: {
    headline: { family: FONT, size: 14, weight: 'semibold', color: TEXT },
    deck: { family: FONT, size: 13, color: SECONDARY },
    axisLabel: { family: FONT, size: 11, color: SECONDARY },
    keyLabel: { family: FONT, size: 11, color: SECONDARY },
    valueLabel: { family: FONT, size: 11, color: '#FFFFFF' },
    footnote: { family: FONT, size: 11, color: SECONDARY },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit', tickDensity: 'sparse' },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'quiet',
  },
  marks: {
    // “Make the width of each bar about twice as wide as the space between them.”
    bandFraction: 0.67,
    cornerRadius: 3,
    strokeWeight: 2,
    interpolation: 'monotone',
    minSize: 2,
    point: { presence: 'omit', halo: { presence: 'full', width: 1 } },
    // polaris-viz lines carry a gradient area fill by default; a flat wash is the nearest field.
    trailingFill: { presence: 'quiet', opacity: 0.25 },
    separator: { presence: 'hairline', width: 2, source: 'surface' },
  },
  geometry: {
    // An area under each line that fades from the series colour to transparent (R12).
    line: { width: 2, interpolation: 'monotone', wash: 'fade', washOpacity: 0.3 },
    band: { fraction: 0.67, cornerRadius: 3 },
    arc: { cornerRadius: 2 },
  },
  // “category name above the bar’s start”: names above where, beside, they would be cut.
  labels: { truncation: 'ellipsis', rowNames: 'auto' },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'center' },
  dataLabels: { show: 'never', placement: 'atMark', inkMode: 'contrastWithMark' },
  annotation: { axisTitles: 'omit', unit: 'everyTick', numberFormat: { thousands: 'suffix', precision: 'one', compact: { per: 'value', threshold: 1000 } } },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' } },
  compileDefaults: { baseSize: { width: 360, height: 200 } },
};

// Daily sales by channel over two weeks — a merchant's “What are my sales over time?”.
const CHANNELS: [string, number[]][] = [
  ['Online store', [820, 1240, 1010, 900, 860, 980, 1450, 1720, 1650, 1100, 1180, 1290, 1050, 1210]],
  ['Point of sale', [560, 600, 640, 610, 580, 590, 760, 980, 930, 620, 650, 700, 640, 690]],
  ['Shop app', [310, 330, 260, 300, 340, 360, 520, 690, 610, 330, 380, 410, 370, 340]],
  ['Wholesale', [200, 220, 230, 210, 190, 260, 300, 280, 320, 250, 240, 260, 280, 300]],
];
const DAY = (i: number) => `2024-04-${String(i + 1).padStart(2, '0')}T00:00`;
const SALES = CHANNELS.flatMap(([Channel, values]) => values.map((Sales, i) => ({ Date: DAY(i), Channel, Sales })));
const NAMES = CHANNELS.map(([name]) => name);

const salesFlint = (title?: string, subtitle?: string) => flintInput(theme, {
  chartType: 'Line Chart',
  data: SALES,
  semantic_types: { Date: 'Date', Channel: 'Category', Sales: { semanticType: 'Amount', unit: 'USD' } },
  encodings: { x: 'Date', y: 'Sales', color: 'Channel' },
  title,
  subtitle,
});

const money = "datum.value >= 1000 ? '$' + format(datum.value / 1000, '.1f') + 'k' : '$' + format(datum.value, 'd')";

/** y labels left-aligned at the card's edge, sitting just above their gridline; gridlines only under the data. */
const yAxisPolaris = (gutter = 46) => ({
  labelAlign: 'left', labelBaseline: 'bottom', labelPadding: gutter, labelOffset: -2, labelColor: SECONDARY, labelFontSize: 11,
  labelExpr: money, gridColor: GRID, domain: false, ticks: false, tickCount: 4, zindex: 1,
});
const xDays = {
  field: 'Date', type: 'temporal', title: null,
  axis: { format: '%-d %b', values: [0, 3, 6, 9, 13].map((i) => Date.parse(DAY(i))), labelColor: SECONDARY, labelFontSize: 11, labelPadding: 8, domain: false, ticks: false, grid: false, zindex: 1 },
};

/** A white rounded card on the admin's grey page, drawn behind the chart. */
const cardLayer = (w: number, h: number) => ({
  data: { values: [{}] },
  mark: { type: 'rect', fill: '#FFFFFF', cornerRadius: 12, clip: false },
  encoding: { x: { value: -62 }, x2: { value: w + 18 }, y: { value: -22 }, y2: { value: h + 58 } },
});

function signatureExpected(o: { dark?: boolean } = {}) {
  const dark = o.dark ?? false;
  const ink = dark ? { card: '#1F1F25', page: '#0B0B0E', label: '#DADADD', grid: '#2E2E36' } : { card: '#FFFFFF', page: PAGE, label: SECONDARY, grid: GRID };
  const card = cardLayer(W, HEIGHT);
  card.mark.fill = ink.card;
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), background: ink.page, padding: { left: 76, right: 32, top: 36, bottom: 20 }, legend: { ...(houseConfig(t).legend as object), labelColor: ink.label, symbolType: 'stroke', symbolStrokeWidth: 2, orient: 'bottom', columnPadding: 16, labelFontSize: 11 } },
    width: W,
    height: HEIGHT,
    layer: [
      card,
      {
        data: { values: SALES },
        mark: { type: 'line', strokeWidth: 2, interpolate: 'monotone' },
        encoding: {
          x: { ...xDays, axis: { ...xDays.axis, labelColor: ink.label } },
          y: { field: 'Sales', type: 'quantitative', title: null, scale: { domain: [0, 2000] }, axis: { ...yAxisPolaris(), labelColor: ink.label, gridColor: ink.grid } },
          color: { field: 'Channel', type: 'nominal', scale: { domain: NAMES, range: PALETTE }, legend: { title: null } },
        },
      },
    ],
  };
}

/** Horizontal bars: name above each bar, value inside its end in white (outside when short), no value axis. */
function labelledBarsExpected() {
  const rows = POPULATION.slice(0, 6);
  const y = { field: 'Country', type: 'nominal', sort: null, title: null, axis: null, scale: { paddingInner: 0.1, paddingOuter: 0 } };
  const x = { field: 'Population', type: 'quantitative', title: null, axis: null, scale: { domain: [0, 1450] } };
  const fits = 'datum.Population > 120';
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: { text: 'India and China hold over a third of humanity', subtitle: 'Population, millions, 2023' },
    width: W,
    height: 6 * 38,
    data: { values: rows },
    encoding: { y },
    layer: [
      { mark: { type: 'bar', color: SINGLE, height: 16, yOffset: 8, cornerRadiusEnd: 3 }, encoding: { x } },
      { mark: { type: 'text', align: 'left', baseline: 'bottom', yOffset: -2, fontSize: 11, font: FONT, color: SECONDARY }, encoding: { x: { value: 0 }, text: { field: 'Country' } } },
      { transform: [{ filter: fits }], mark: { type: 'text', align: 'right', dx: -6, yOffset: 8, fontSize: 11, font: FONT, color: '#FFFFFF' }, encoding: { x, text: { field: 'Population', format: ',.0f' } } },
      { transform: [{ filter: `!(${fits})` }], mark: { type: 'text', align: 'left', dx: 5, yOffset: 8, fontSize: 11, font: FONT, color: TEXT }, encoding: { x, text: { field: 'Population', format: ',.0f' } } },
    ],
  };
}

/** The guide's hover: a crosshair, a dot, and a white card with the date above the bold value. */
function tooltipExpected() {
  const peak = UNEMPLOYMENT.find((row) => row.Year === 2020)!;
  const x = { field: 'Year', type: 'quantitative' };
  const yv = { field: 'Unemployment (%)', type: 'quantitative' };
  const at = { x, y: yv };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: { text: 'Unemployment rate', subtitle: 'United States, %' },
    width: W,
    height: HEIGHT,
    layer: [
      {
        data: { values: UNEMPLOYMENT },
        mark: { type: 'line', strokeWidth: 2, interpolate: 'monotone', color: SINGLE },
        encoding: {
          x: { ...x, title: null, scale: { domain: [2000, 2023], nice: false }, axis: { format: 'd', values: [2000, 2005, 2010, 2015, 2020], labelColor: SECONDARY, domain: false, ticks: false } },
          y: { ...yv, title: null, scale: { domain: [0, 12] }, axis: { labelAlign: 'left', labelBaseline: 'bottom', labelPadding: 30, labelOffset: -2, labelColor: SECONDARY, gridColor: GRID, tickCount: 4, labelExpr: "datum.label + '%'" } },
        },
      },
      { data: { values: [peak] }, mark: { type: 'rule', color: '#CBCBCF', strokeWidth: 1 }, encoding: { x } },
      { data: { values: [peak] }, mark: { type: 'point', filled: true, size: 50, color: SINGLE, stroke: '#FFFFFF', strokeWidth: 2 }, encoding: at },
      { data: { values: [peak] }, mark: { type: 'rect', fill: 'rgba(31,31,37,0.10)', cornerRadius: 10, xOffset: -129, x2Offset: -13, yOffset: -27, y2Offset: 29 }, encoding: { ...at, x2: { field: 'Year' }, y2: { field: 'Unemployment (%)' } } },
      { data: { values: [peak] }, mark: { type: 'rect', fill: '#FFFFFF', cornerRadius: 8, xOffset: -128, x2Offset: -14, yOffset: -28, y2Offset: 26 }, encoding: { ...at, x2: { field: 'Year' }, y2: { field: 'Unemployment (%)' } } },
      { data: { values: [peak] }, mark: { type: 'text', align: 'left', dx: -118, dy: -12, fontSize: 11, font: FONT, color: SECONDARY, text: '2020' }, encoding: at },
      { data: { values: [peak] }, mark: { type: 'text', align: 'left', dx: -118, dy: 8, fontSize: 12, fontWeight: 'bold', font: FONT, color: TEXT, text: '8.1%' }, encoding: at },
    ],
  };
}

// This week against the same week last year: a merchant comparison.
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const COMPARE = [
  ...[1210, 1380, 1290, 1460, 1720, 2110, 1840].map((Sales, i) => ({ Day: WEEK[i], Period: 'Apr 8–14, 2024', Sales })),
  ...[980, 1100, 1190, 1150, 1380, 1620, 1500].map((Sales, i) => ({ Day: WEEK[i], Period: 'Apr 10–16, 2023', Sales })),
];

function comparisonExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), legend: { ...(houseConfig(t).legend as object), symbolType: 'stroke', symbolStrokeWidth: 2, labelColor: SECONDARY } },
    title: { text: 'Sales this week vs last year', subtitle: 'Total sales, $' },
    width: W,
    height: HEIGHT,
    data: { values: COMPARE },
    mark: { type: 'line', strokeWidth: 2, interpolate: 'monotone' },
    encoding: {
      x: { field: 'Day', type: 'ordinal', sort: WEEK, title: null, axis: { labelAngle: 0, labelColor: SECONDARY, domain: false, ticks: false } },
      y: { field: 'Sales', type: 'quantitative', title: null, scale: { domain: [0, 2400] }, axis: { ...yAxisPolaris(34), labelPadding: 34 } },
      color: { field: 'Period', type: 'nominal', sort: ['Apr 8–14, 2024', 'Apr 10–16, 2023'], scale: { range: [SINGLE, PAST] } },
    },
  };
}

function gradientExpected() {
  const online = SALES.filter((row) => row.Channel === 'Online store');
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: { text: 'Online store sales', subtitle: 'Total sales, $, April 2024' },
    width: W,
    height: HEIGHT,
    data: { values: online },
    encoding: {
      x: xDays,
      y: { field: 'Sales', type: 'quantitative', title: null, scale: { domain: [0, 2000] }, axis: yAxisPolaris() },
    },
    layer: [
      {
        mark: {
          type: 'area', interpolate: 'monotone',
          color: { gradient: 'linear', x1: 1, y1: 1, x2: 1, y2: 0, stops: [{ offset: 0, color: 'rgba(19,172,240,0)' }, { offset: 1, color: 'rgba(19,172,240,0.35)' }] },
        },
      },
      { mark: { type: 'line', strokeWidth: 2, interpolate: 'monotone', color: SINGLE } },
    ],
  };
}

const polaris: StyleGuideTheme = {
  id: 'shopify-polaris',
  org: 'Shopify Polaris — Data visualizations (and Polaris Viz library)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch. The guide page (written for older Polaris, with purple series and slate comparisons) gives the rules; the polaris-viz `LIGHT_THEME` constants give today’s values, so the ink is the library’s: #13ACF0 single series, its twelve-colour series order (the first four as the core set, since the guide caps line charts at four), #EEEEEF gridlines, 11px Inter labels in #70707B, #1F1F25 text.',
    'Stated directly: horizontal gridlines only, no axis lines or ticks, bars about twice as wide as their gaps (`bandFraction: 0.67`) with 3px rounded ends, 2px spline lines without points, labels never turned, no axis titles, a key under the plot, money abbreviated with one decimal, a white page.',
    'Approximated: the gradient fill under every line as a flat `trailingFill`. Not stated: left-aligned y labels above their gridline, the 60% negative bar, name-above-bar labelling, the grey “previous period” series, the date and money formats, the dark theme and the tooltip — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Multiseries specimen: a white rounded card on the admin’s pale grey page; a few light horizontal gridlines that run only under the data; y labels left-aligned at the card’s edge, just above their gridline; x labels below; no axis lines; contrasting series colours and a key.',
      current: 'Flint draws the lines, grid and key on a bare white canvas: no card or page; y labels right-aligned beside each gridline; money and dates in Flint’s own format.',
      expected: 'The specimen’s layout on two weeks of sales by channel, in polaris-viz colours and smooth 2px lines.',
      flint: salesFlint(),
      expectedSpec: signatureExpected(),
      observed: 'Flint (left): the polaris-viz colours and smooth 2px lines are right; y labels are right-aligned against the plot and centred on their lines (“$1,500”), x labels “April 2024, 3, 4 … 14”, all on a bare canvas. Expected (right): a white rounded card on the grey page, “$1.5k” labels flush left and sitting on their gridlines, gridlines starting at the plot, “1 Apr … 14 Apr”.',
    },
    {
      id: 'labels-above-gridlines',
      title: 'Y labels left-aligned, sitting on top of their gridline',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'axis-label-on-gridline',
      rule: '“Left align labels and keep them above y-axis lines.” “Ensure axis lines only appear where the data appears.”',
      current: 'No ThemeSpec field says where a tick label stands relative to its gridline or which edge it aligns to; Flint right-aligns y labels and centres them on the line.',
      expected: 'Labels flush with the card’s left padding, baseline just above the gridline, gridlines starting where the plot starts (signature panel).',
      proposal: '`structure.axis.measure.labelPosition: "aboveGridline"` with `labelAlign: "blockEdge"`.',
    },
    {
      id: 'negative-60',
      title: 'Negative bars in the same colour at 60% opacity',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'signed-ink',
      rule: '“Use one color for all bars.” “Give negative bars 60% opacity.”',
      current: 'ThemeSpec colours signed bars through `ink.series.status` or a diverging ramp — another ink, not the same ink lighter. Polaris’s status slots already belong to its trend indicators (green up, grey down), so they cannot also mean “negative bar”.',
      expected: 'Every decade in #13ACF0; the three cooler decades at 60%.',
      proposal: '`ink.series.selection.signed: "single"` with `marks.negativeOpacity: 0.6` (sign carried by opacity on the single ink).',
      ...signedProbe(theme, t, { positive: SINGLE, negative: SINGLE_60 }),
      observed: 'Flint (left) draws all nine decades in the same full-strength #13ACF0, so the sign is carried by position alone; its decade labels are turned −45° and the deck repeats the measure (“…, °C; Anomaly (°C)”). Expected (right): the three negative decades in the 60% tint, labels horizontal.',
    },
    {
      id: 'labels-above-bars',
      title: 'Each horizontal bar named above it, its value inside the bar end',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'labels-above-bars',
      rule: '“Include a label on each bar. If the bar is too small, include it outside of the bar”: category name above the bar’s start, value in white inside its end; no value axis; a table past six bars.',
      current: 'With `showTextLabels` and `inkMode: contrastWithMark` Flint already prints each value in white inside the bar end. `labels.rowNames: "auto"` moves the names above the bars where, beside, they would be cut; the value axis still stays under the plot.',
      expected: 'Six bars, each with its country above and its value in white at the end (outside for small bars).',
      proposal: 'Names above: `labels.rowNames` (done). Left: `dataLabels.placement: "insideEnd"` falling back to outside, and no value axis.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION.slice(0, 6),
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: 'Country', x: 'Population' },
        title: 'India and China hold over a third of humanity',
        subtitle: 'Population, millions, 2023',
        chartProperties: { showTextLabels: true },
      }),
      expectedSpec: labelledBarsExpected(),
      observed: 'Flint (left) already prints white values inside the bar ends, but names stay on a left axis and a “0 m … 1,500 m” axis stays underneath; the deck adds “; Population (m)”. Expected (right): each name in grey above its bar, values inside the ends, no axes at all.',
    },
    {
      id: 'comparison-period',
      title: 'The previous period in grey beside the current one',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'highlight',
      rule: '“Comparison to past: the current value will be [the series colour] and the past value will be grey.”',
      current: 'The chart spec cannot mark one series as the comparison period, so Flint gives last year the second palette colour (indigo) as if it were another channel.',
      expected: 'This week in #13ACF0, the same week last year in slate grey.',
      proposal: '`chart_spec.emphasis` / a `comparison` role on a series value, with `ink.series.comparison` in the theme.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: COMPARE,
        semantic_types: { Day: 'Day', Period: 'Category', Sales: { semanticType: 'Amount', unit: 'USD' } },
        encodings: { x: 'Day', y: 'Sales', color: 'Period' },
        title: 'Sales this week vs last year',
        subtitle: 'Total sales, $',
      }),
      expectedSpec: comparisonExpected(),
      observed: 'Flint (left): last year in indigo, as strong as this week, so the two read as two channels; deck “Total sales, $; Sales ($)”. Expected (right): this week in #13ACF0 over last year in slate grey, “$1.5k” labels above their lines.',
    },
    {
      id: 'gradient-area',
      addressed: { stage: 'R12', note: 'The fading area under each line is `geometry.line.wash: "fade"`.' },
      title: 'Lines sit on a soft gradient fill',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'gradient-fill',
      rule: 'polaris-viz defaults: `DEFAULT_LINE_HAS_SPLINE = true`, 2px lines, and an area under each line that fades from the series colour to transparent.',
      current: 'ThemeSpec has no gradient; the nearest field, `marks.trailingFill`, is a flat wash and is not realised either, so Flint draws a bare spline.',
      expected: 'The spline over a vertical gradient from ~35% #13ACF0 to nothing at the baseline.',
      proposal: '`geometry.area.fill: { kind: "gradient", from: 0.35, to: 0 }` and a `geometry.line.underfill` that reuses it.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: SALES.filter((row) => row.Channel === 'Online store'),
        semantic_types: { Date: 'Date', Sales: { semanticType: 'Amount', unit: 'USD' } },
        encodings: { x: 'Date', y: 'Sales' },
        title: 'Online store sales',
        subtitle: 'Total sales, $, April 2024',
      }),
      expectedSpec: gradientExpected(),
      observed: 'Flint (left): a bare blue spline, no fill. Expected (right): the same spline over a blue gradient that fades to white at the baseline.',
    },
    {
      id: 'axis-text',
      addressed: { stage: 'A6', note: '`compact: { per: "value", threshold: 1000 }` — $0, $500, $1k, $1.5k (A6). The date ticks are not addressed.' },
      title: 'Axis text: money as “$1.0k”, days as “10 Apr”',
      kind: 'realization',
      severity: 'medium',
      probe: 'number-format',
      rule: '“Abbreviate using ‘k’ for thousand, ‘b’ for billion” — at most 3 numerals, 1 decimal and 1 letter ($1.0k). Dates: specific days “10 Apr”, weekdays “Mon”, months “Feb”, months of a year “Apr 2011”, times “12am”.',
      current: '`annotation.numberFormat: { thousands: "suffix", precision: "one" }` is stated, yet the measure axis prints whole dollars ($1,500). No ThemeSpec field shapes date ticks, and Flint labels the fourteen days “April 2024, 3, 4 … 14”.',
      expected: '$0, $500, $1.0k, $1.5k, $2.0k; 1 Apr, 4 Apr, 7 Apr, 10 Apr, 14 Apr (signature panel).',
      proposal: 'Apply `annotation.numberFormat` to axes (with `suffixCase: "lower"`), and add `annotation.dateLabels: { day: "d MMM", month: "MMM yyyy", time: "ha" }`.',
    },
    {
      id: 'no-slant',
      addressed: { stage: 'A1', note: 'Never slanted now: names are set flat, smaller down to the floor, with wider bands (A1). Skipping names is not offered.' },
      title: 'Labels are never slanted; skip them instead',
      kind: 'realization',
      severity: 'medium',
      probe: 'turned-row-labels',
      rule: '“Slant labels to make them fit” is a Don’t: “skip labels at regular intervals instead.”',
      current: 'The theme states `labels.`. Flint still turns the decade labels −45° in the negative-bars panel and in the gallery’s anomaly tile.',
      expected: 'Horizontal labels, every other decade dropped if they do not fit (see the expected negative-bars panel).',
      proposal: 'Make `labels.` binding: thin to a regular step (or wrap) instead of turning.',
      observed: 'Negative-bars panel and gallery anomaly tile: 1880s … 2020s at −45° although nine short labels fit flat at this width (the expected panel prints all nine horizontally). Elsewhere — the stacked tile’s country names — Flint wraps instead, as the house asks.',
    },
    {
      id: 'dark-mode',
      title: 'A dark theme with its own surfaces and label ink',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'dark-mode',
      rule: 'polaris-viz `DARK_THEME`: chart container #1F1F25, axis labels #DADADD, tooltip #2E2E36; the series order is kept.',
      current: 'A ThemeSpec is one mode. A dark admin needs a second, unrelated theme, and nothing ties the two together or lets the host switch; with this theme the chart stays white.',
      expected: 'The signature chart on the dark container: light labels, dim gridlines, same series colours.',
      proposal: '`modes: { dark: { ink: { surface, text, structure } } }` inside one ThemeSpec, selected by the host (`prefers-color-scheme`).',
      flint: salesFlint(),
      expectedSpec: signatureExpected({ dark: true }),
      observed: 'Flint (left) can only draw the light chart. Expected (right): the #1F1F25 card on a near-black page with #DADADD labels and dim gridlines; the series colours are unchanged.',
    },
    {
      id: 'tooltip',
      title: 'Hover tooltip: date on top, bold value below, a 1px crosshair',
      kind: 'product-ui',
      severity: 'low',
      probe: 'tooltip-style',
      rule: 'Tooltips on hover with the date (x-axis abbreviation rules) above the bold value (y-axis rules); a 1px #CBCBCF crosshair; light tooltip white with #1F1F25 text.',
      current: '`interaction` carries `tooltipFormat` only; Flint hands Vega its default tooltip.',
      expected: 'A white rounded tooltip with a soft shadow pinned at the 2020 peak: “2020” in grey above a bold “8.1%”, a 1px crosshair.',
      proposal: '`interaction.tooltip: { surface, text, radius, layout: "titleThenValue" }` and `interaction.crosshair: { color, width }`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Unemployment rate',
        subtitle: 'United States, %',
      }),
      expectedSpec: tooltipExpected(),
      observed: 'Flint (left): the bare spline, its deck extended to “United States, %; Unemployment (%)”. Expected (right): a 1px #CBCBCF crosshair at 2020, a dot with a white ring, and a white rounded card with a soft shadow: “2020” in grey above a bold “8.1%”.',
    },
  ],
};

export default polaris;
