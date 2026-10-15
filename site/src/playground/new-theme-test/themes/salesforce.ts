import type { ThemeSpec } from 'flint-chart';
import research from '../research/salesforce.json';
import { BROWSERS, EV_SHARE, flintInput } from '../probes';
import { houseConfig, W, H as HEIGHT, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Salesforce Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const NAVY = '#17324D';
const WEAK = '#706E6B';
const AXIS_BLUE = '#7D98B3';
const GRID = '#E4E3E2';
/** The "Default Palette": six midtone hues around the wheel. */
const DEFAULT = ['#52B7D8', '#E16032', '#FFB03B', '#54A77B', '#4FD2D2', '#E287B2'];
/** The "Light" palette the guide's own specimens are drawn in. */
const LIGHT = ['#3296ED', '#77B9F2', '#9D53F2', '#C398F5', '#26ABA4', '#4ED4CD'];
const WATER = ['#96F2EE', '#68CEEE', '#2D9CED', '#0E6ECE', '#073E92', '#051C61'];

const t: HouseTokens = {
  font: FONT,
  text: NAVY,
  muted: WEAK,
  grid: GRID,
  axis: null,
  background: '#FFFFFF',
  palette: DEFAULT,
  titleSize: 14,
  titleWeight: 700,
  subtitleSize: 12,
  labelSize: 12,
  lineWidth: 4,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'salesforce',
  label: 'Salesforce Lightning (SLDS 2)',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: NAVY, secondary: WEAK, muted: '#C9C7C5' },
    structure: { grid: GRID, axis: GRID, rule: GRID },
    series: {
      single: DEFAULT[0],
      categorical: DEFAULT,
      // No larger set is published; the other named palettes are alternatives, not extensions.
      sequential: { stops: WATER, space: 'lab' },
    },
    accent: DEFAULT[0],
  },
  type: {
    headline: { family: FONT, size: 14, weight: 'bold', color: NAVY },
    deck: { family: FONT, size: 12, color: WEAK },
    axisLabel: { family: FONT, size: 12, color: WEAK },
    axisTitle: { family: FONT, size: 12, weight: 'regular', color: '#C9C7C5' },
    keyLabel: { family: FONT, size: 12, color: NAVY },
    valueLabel: { family: FONT, size: 12, color: NAVY },
    footnote: { family: FONT, size: 10, color: WEAK },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit' },
      // The value scale runs across the top of a bar chart; a vertical one stays on the left (AX1).
      measure: { line: 'omit', ticks: 'omit', tickDensity: 'sparse', placement: 'top' },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'quiet',
  },
  marks: {
    bandFraction: 0.88,
    strokeWeight: 4,
    strokeJoin: 'round',
    interpolation: 'linear',
    cornerRadius: 0,
    // The line specimen fills each line's area with a pale wash of its own colour.
    trailingFill: { presence: 'quiet', opacity: 0.15 },
    point: { presence: 'omit' },
  },
  geometry: {
    // Each line over a translucent wash of its colour to the zero line (R12).
    line: { width: 4, interpolation: 'linear', wash: 'tint', washOpacity: 0.18 },
    // Largest slice first from 12 o'clock, clockwise (M4).
    arc: { gap: 0, order: 'largestFirst' },
  },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'center' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'whenAmbiguous', axisTitlePlacement: 'rotated', unit: 'everyTick', numberFormat: { thousands: 'suffix', compact: {} } },
  layout: { titleBlock: { anchor: 'start', gap: 'tight' } },
  chartDefaults: { 'Donut Chart': { innerRadius: 75 } },
};

// The guide's stacked-bar specimen, "Sales by Account and Product", read off the image.
const ACCOUNTS = [
  ['Account A', 80, 465, 52], ['Account B', 138, 395, 57], ['Account C', 176, 276, 52],
  ['Account D', 138, 141, 88], ['Account E', 82, 80, 91],
] as const;
const SALES = ACCOUNTS.flatMap(([Account, a, b, c]) => [
  { Account, Product: 'Product A', Sales: a },
  { Account, Product: 'Product B', Sales: b },
  { Account, Product: 'Product C', Sales: c },
]);

const legendCircles = {
  orient: 'bottom', direction: 'horizontal', title: null, symbolType: 'circle', symbolSize: 150,
  labelFontSize: 13, labelColor: NAVY, columnPadding: 28, symbolOffset: 0, padding: 4, offset: 18,
};

function stackedBarExpected(palette: string[], o: { valueAxis?: 'top' | 'bottom' } = {}) {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), legend: { ...(houseConfig(t).legend as object), ...legendCircles, layout: { bottom: { anchor: 'middle' } } } },
    width: W,
    height: HEIGHT,
    data: { values: SALES },
    mark: { type: 'bar' },
    encoding: {
      y: {
        field: 'Account', type: 'nominal', title: null, scale: { paddingInner: 0.12 },
        axis: { labelColor: NAVY, labelFontSize: 13, labelPadding: 14, domain: false, ticks: false },
      },
      x: {
        field: 'Sales', type: 'quantitative', title: null, stack: 'zero', scale: { domain: [0, 650], nice: false },
        axis: { orient: o.valueAxis ?? 'top', values: [0, 200, 400, 600], labelColor: AXIS_BLUE, labelFontSize: 13, grid: true, gridColor: GRID, domain: false, ticks: false, labelPadding: 8 },
      },
      color: { field: 'Product', type: 'nominal', sort: ['Product A', 'Product B', 'Product C'], scale: { range: palette } },
      order: { field: 'Product', sort: 'ascending' },
    },
  };
}

const stackedFlint = (title?: string) => flintInput(theme, {
  chartType: 'Stacked Bar Chart',
  title,
  data: SALES,
  semantic_types: { Account: 'Category', Product: 'Category', Sales: 'Quantity' },
  encodings: { y: 'Account', x: 'Sales', color: 'Product' },
});

// The two-value line specimen: weekly sales and profit, Jan–Apr, each with a pale fill.
const WEEKS = [1.5, 5.1, 7.4, 7.5, 14.3, 12.9, 20.9, 24.5, 24.4, 25.5, 28.9, 33.8, 39.6, 37.8, 35.4, 45.9];
const PROFIT = [1.5, 3.9, 5.4, 5.5, 10, 9.1, 14.3, 16.7, 16.7, 17.3, 19.6, 22.9, 26.7, 25.5, 23.9, 30.9];
const DATES = WEEKS.map((_, i) => new Date(Date.UTC(2024, 0, 1 + i * 6.07)).toISOString().slice(0, 10) + 'T00:00'); // local midnight, as the axis formats it
const TREND = DATES.flatMap((Date, i) => [
  { Date, Measure: 'Sales', Value: WEEKS[i] * 1e6 },
  { Date, Measure: 'Profit', Value: PROFIT[i] * 1e6 },
]);

/** Vega-Lite keys a line with a stroke; an invisible filled dot, drawn first, gives the key the guide's filled circles. */
const circleKeyLayer = { mark: { type: 'point', filled: true, opacity: 0, size: 1 } };

function areaLinesExpected() {
  const enc = (field: string) => ({
    x: { field: 'Date', type: 'temporal', title: null, scale: { domain: [Date.parse('2024-01-01T00:00'), Date.parse('2024-04-01T00:00')] }, axis: { format: '%b', values: ['01', '02', '03', '04'].map((m) => Date.parse(`2024-${m}-01T00:00`)), labelFlush: true, labelColor: WEAK, labelFontSize: 13, grid: false, domain: false, ticks: false, labelPadding: 10 } },
    y: {
      field, type: 'quantitative', title: null, scale: { domain: [0, 50e6] },
      axis: { values: [0, 10e6, 20e6, 30e6, 40e6, 50e6], labelExpr: "datum.value === 0 ? '0' : '$' + format(datum.value / 1e6, 'd') + 'M'", labelColor: WEAK, labelFontSize: 13, gridColor: GRID, labelPadding: 12 },
    },
  });
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), legend: { ...(houseConfig(t).legend as object), ...legendCircles, layout: { bottom: { anchor: 'middle' } } } },
    width: W,
    height: HEIGHT,
    data: { values: TREND },
    encoding: {
      ...enc('Value'),
      color: { field: 'Measure', type: 'nominal', sort: ['Sales', 'Profit'], scale: { range: [LIGHT[2], LIGHT[0]] }, legend: { symbolOpacity: 1 } },
    },
    layer: [
      circleKeyLayer,
      { mark: { type: 'area', opacity: 0.18 }, encoding: { y: { ...enc('Value').y, stack: null } } },
      { mark: { type: 'line', strokeWidth: 4, strokeJoin: 'round', strokeCap: 'round' } },
    ],
  };
}

const circleKey = { ...(houseConfig(t).legend as object), ...legendCircles, layout: { bottom: { anchor: 'middle' } } };

/** The donut specimen: a thin ring, largest slice first from 12 o’clock, circle key below. */
function donutExpected() {
  const rows = BROWSERS.slice().sort((a, b) => b.Share - a.Share);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), legend: { ...circleKey, labelColor: WEAK } },
    title: { text: 'Chrome dominates desktop browsing', subtitle: 'Desktop browser market share, %, 2024' },
    width: W,
    height: HEIGHT,
    data: { values: rows },
    mark: { type: 'arc', outerRadius: 92, innerRadius: 70, stroke: null },
    encoding: {
      theta: { field: 'Share', type: 'quantitative', stack: true },
      order: { field: 'Share', type: 'quantitative', sort: 'descending' },
      color: { field: 'Browser', type: 'nominal', sort: rows.map((row) => row.Browser), scale: { range: DEFAULT } },
    },
  };
}

const EV3 = EV_SHARE.filter((row) => ['Norway', 'China', 'Germany'].includes(row.Country));

/** Three lines in a named palette, keyed with filled circles. */
function paletteExpected(palette: string[]) {
  const color = { field: 'Country', type: 'nominal', scale: { domain: ['Norway', 'China', 'Germany'], range: palette } };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), legend: circleKey },
    title: { text: 'Norway leads electric-car sales', subtitle: 'Share of new cars sold that are electric, %' },
    width: W,
    height: HEIGHT,
    data: { values: EV3 },
    encoding: {
      x: { field: 'Year', type: 'ordinal', title: null, axis: { labelAngle: 0, labelColor: WEAK, domain: false, ticks: false } },
      y: { field: 'EV share (%)', type: 'quantitative', title: null, axis: { labelColor: WEAK, gridColor: GRID } },
    },
    layer: [
      { mark: { type: 'point', filled: true, opacity: 0, size: 1 }, encoding: { color: { ...color, legend: { symbolOpacity: 1 } } } },
      { mark: { type: 'line', strokeWidth: 4, strokeJoin: 'round', strokeCap: 'round' }, encoding: { color } },
    ],
  };
}

const cardStyle = { border: '1px solid #DDDBDA', borderRadius: '4px', boxShadow: '0 2px 2px 0 rgba(0,0,0,0.10)', background: '#FFFFFF', padding: '0 0 10px' };
const cardHeader = (title: string, meta: string) =>
  `<div style="display:flex;align-items:center;gap:10px;padding:12px 14px 8px;font-family:${FONT}">`
  + '<div style="width:24px;height:24px;border-radius:4px;background:#3296ED;display:flex;align-items:center;justify-content:center">'
  + '<svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="7" width="3" height="6" fill="#fff"/><rect x="5.5" y="3" width="3" height="10" fill="#fff"/><rect x="10" y="5" width="3" height="8" fill="#fff"/></svg></div>'
  + `<div style="flex:1"><div style="font-size:14px;font-weight:700;color:#181818">${title}</div><div style="font-size:12px;color:${WEAK}">${meta}</div></div>`
  + '<div style="display:flex;gap:6px">'
  + `<span style="border:1px solid #DDDBDA;border-radius:4px;padding:3px 10px;font-size:12px;color:#0176D3;background:#fff">View Report</span>`
  + `<span style="border:1px solid #DDDBDA;border-radius:4px;padding:3px 7px;font-size:12px;color:${WEAK}">▾</span></div></div>`;

const salesforce: StyleGuideTheme = {
  id: 'salesforce',
  org: 'Salesforce Lightning Design System (SLDS 2) — Charts',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch. The guide is chart-selection advice plus a set of named palettes; sizes, greys and structure were read off its three specimen images (stacked bar, two-value line, donut) and the ui-analytics tokens (12/14px sizes, 300/400/700 weights). Salesforce Sans is proprietary, so every panel falls back to the system UI stack the analytics tokens name.',
    'Stated directly: the Default palette (#52B7D8, #E16032, #FFB03B, #54A77B, #4FD2D2, #E287B2) as the categorical set, the Water ramp as sequential, light grey `#E4E3E2` gridlines across the value axis only, no axis lines or ticks, square bars filling ~88% of their band, 4px straight lines without markers, a centred key under the plot, no value labels, a thin-ring donut through `chartDefaults`.',
    'Approximated: the pale wash under every line is stated as `marks.trailingFill`, which nothing realises. Not stated: the value axis on top of horizontal bars only, circle key swatches, the other seven palettes a user can switch to, descending pies from 12 o’clock, and the Lightning card the chart lives in — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Stacked-bar specimen “Sales by Account and Product”: value labels 0–600 in blue-grey along the TOP, light grey vertical gridlines, no axis lines or ticks, navy category labels, thick square bars with small gaps, a centred row of filled-circle swatches under the plot.',
      current: 'Flint draws the bars, the vertical gridlines and a centred bottom key. The value axis stays at the bottom (see the next gap), category and value labels share one grey because `type.axisLabel` is a single role for both axes, and the key uses square swatches because `legend.swatch` can only say `"auto"`.',
      expected: 'The specimen redrawn on the same data in the Default palette.',
      flint: stackedFlint(),
      expectedSpec: stackedBarExpected(DEFAULT),
      observed: 'Close in palette, band weight and gridlines. Flint (left) puts 0–600 under the plot with a pale “Sales” title, labels every 100 instead of every 200, draws square swatches, and its category labels are the same grey as the ticks; the expected panel has the scale across the top in blue-grey, navy account names and filled-circle swatches. Flint’s plot is also shorter, so the bars read thinner than the specimen’s.',
    },
    {
      id: 'value-axis-top',
      addressed: { stage: 'AX1', note: '`measure.placement: "top"` — the value scale runs across the top of a bar chart and stays on the left of columns and lines (AX1).' },
      title: 'Horizontal bars put their value axis on top',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'axis-placement',
      rule: 'In the bar specimen the value scale runs across the top; in the line specimen the value axis is on the left as usual.',
      current: '`structure.axis.measure.placement: "opposite"` moves the measure axis for every chart; a variant could scope it, but `ThemeGuard` has no orientation signal (`hasBandedAxis` and `markChannel: "length"` are true of columns too), so columns would get a right-hand axis.',
      expected: 'Value axis on top for bars, on the left for columns and lines (compare the signature panels).',
      proposal: 'A guard `measureOrientation: "horizontal" | "vertical"`, or `placement: "top" | "bottom" | "left" | "right"` per screen side rather than “opposite”.',
    },
    {
      id: 'line-wash',
      addressed: { stage: 'R12', note: 'The wash under each line is `geometry.line.wash: "tint"`.' },
      title: 'Lines carry a pale fill of their own colour down to the baseline',
      kind: 'realization',
      severity: 'medium',
      probe: 'gradient-fill',
      rule: '“Line Chart (Two Values)” specimen: thick (~4px) straight lines without markers, each over a translucent wash of its colour (lilac, periwinkle) to the zero line; rotated, very pale axis titles; money ticks $0–$50M; months as Jan, Feb, Mar.',
      current: 'The theme states `marks.trailingFill: { presence: "quiet", opacity: 0.15 }`, the only field that describes a fill under a line, but no realizer reads it: Flint draws bare lines.',
      expected: 'Each line over a ~18% fill of its own ink, $10M-style ticks, month names.',
      proposal: 'Realise `marks.trailingFill` (or `geometry.line.fill: { opacity }`) as an unstacked area layer under each line, drawn before the lines.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: TREND,
        semantic_types: { Date: 'Date', Measure: 'Category', Value: { semanticType: 'Amount', unit: 'USD' } },
        encodings: { x: 'Date', y: 'Value', color: 'Measure' },
      }),
      expectedSpec: areaLinesExpected(),
      observed: 'Flint (left): two bare 4px lines, no fill; ticks “$50,000,000”; x labels “2024, Jan 17, Feb 1, Feb 16…”; a pale rotated “Value” title, which does match the specimen’s pale axis titles. Expected (right): both lines over a lilac/periwinkle wash, “$10M…$50M”, “Jan Feb Mar”, circle key.',
    },
    {
      id: 'abbreviated-money',
      addressed: { stage: 'A6', note: '`compact: {}` — $0, $10M … $50M (A6).' },
      title: 'Money ticks abbreviated to $10M',
      kind: 'realization',
      severity: 'medium',
      probe: 'number-format',
      rule: 'Unit on every tick with abbreviations: $10M … $50M; plain integers for counts (0, 200, 400).',
      current: '`annotation.numberFormat.thousands: "suffix"` and `unit: "everyTick"` are stated; the currency sign reaches every tick but the suffix does not — the axis prints $50,000,000 (see the line-wash panels). The number format reaches value labels, not axes.',
      expected: '$0, $10M, $20M … $50M.',
      proposal: 'Apply `annotation.numberFormat` to measure-axis labels as well as value labels (`~s` with the currency prefix and an `M`/`B` suffix map).',
    },
    {
      id: 'donut',
      addressed: { stage: 'M4', note: '`geometry.arc.order: "largestFirst"` runs the wedges largest first, clockwise from 12 o’clock.' },
      title: 'Donuts: largest slice first from 12 o’clock, clockwise',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'pie-rules',
      rule: '“Do show data in descending order, starting at the 12 o’clock point and moving clockwise”; 2–5 slices; the specimen is a thin ring with no labels on it and a circle key underneath.',
      current: 'The ring thickness is stated through `chartDefaults["Donut Chart"].innerRadius`, and Flint keys wedges with circles. Ordering is a chart-spec decision (`sortSlices`), so the theme cannot ask for descending slices.',
      expected: 'Chrome first from 12 o’clock, then Safari, Edge, Firefox, Other clockwise.',
      proposal: 'Let `chartDefaults` carry presentation-only sorts for part-to-whole charts (`sortSlices: "descending"`), or a `marks.slice.order` house rule.',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: BROWSERS,
        semantic_types: { Browser: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Browser' },
        title: 'Chrome dominates desktop browsing',
        subtitle: 'Desktop browser market share, %, 2024',
      }),
      expectedSpec: donutExpected(),
      observed: 'Both draw a thin ring with a centred circle key. Flint (left) runs clockwise Chrome, Edge, Firefox, Other, Safari — alphabetical, so the 5% “Other” sits before the 12% Safari; expected (right) runs Chrome, Safari, Edge, Firefox, Other. Flint’s ring is also thinner than the specimen’s and sits lower, leaving a gap under the deck.',
    },
    {
      id: 'named-palettes',
      title: 'Eight named palettes the user switches between',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'palette-themes',
      rule: 'The charting library offers Default, Color Safe (WCAG 2.0), Light, Dark, Bluegrass, Sunrise, Water and Watermelon; the guide’s own specimens are drawn in Light (#3296ED, #77B9F2, #9D53F2).',
      current: 'A ThemeSpec holds one categorical sequence; switching palettes means shipping eight themes that differ only in `ink.series`, with nothing tying them together.',
      expected: 'The same house with its Light palette selected, keyed with filled circles.',
      proposal: '`ink.series.palettes: { [name]: { categorical, sequential } }` plus a `palette` selector in the chart spec or host.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV3,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway leads electric-car sales',
        subtitle: 'Share of new cars sold that are electric, %',
      }),
      expectedSpec: paletteExpected(LIGHT),
      observed: 'Same chart, different house: Flint (left) in the Default cyan/orange/amber, expected (right) in the Light blues and violet of the guide’s own specimens, keyed with filled circles. Flint also keeps a pale rotated “EV share (%)” title and labels every year.',
    },
    {
      id: 'card',
      title: 'Charts live in a Lightning card with an icon header and actions',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'card-container',
      rule: 'Charts sit inside Lightning cards on dashboards; the guide captions them “<Chart type>: <Measure> by <Dimension>” rather than writing a headline.',
      current: 'ThemeSpec has no container: Flint draws the chart and its title on a bare canvas; the card, its icon tile, border and shadow, and its action buttons are left to the host.',
      expected: 'A white card with a 1px #DDDBDA border, 4px radius and soft shadow; an icon tile, bold title and meta line; “View Report” and a menu at the right.',
      proposal: '`layout.container: { fill, border, radius, shadow, padding, header: { icon, actions } }`, or a documented host contract for the card around a Flint chart.',
      flint: stackedFlint('Sales by Account and Product'),
      expectedSpec: { ...stackedBarExpected(DEFAULT), config: { ...stackedBarExpected(DEFAULT).config, background: 'transparent', padding: 10 } },
      expectedFrame: { style: cardStyle, headerHtml: cardHeader('Bar Chart: Sales by Account and Product', 'Sorted by Account · As of today at 9:41 AM') },
      observed: 'Flint (left) prints “Sales by Account and Product” as a navy headline over a bare chart. Expected (right): the same chart inside a bordered, shadowed card with a blue icon tile, the caption-style title, a grey meta line and “View Report” / menu buttons; the key and value scale sit inside the card.',
    },
    {
      id: 'labels-turned',
      title: 'Labels turned and the key moved, against the theme',
      kind: 'realization',
      severity: 'medium',
      probe: 'turned-row-labels',
      rule: 'Labels stay horizontal (every specimen); the key is a centred row under the plot.',
      current: 'The theme states `labels.` and `legend.placement: ["bottom"]` with no fallback. In the gallery’s stacked-column tile the five country names are turned 90° and the key stands at the right; in the anomaly tile the decade labels are turned −45°.',
      expected: 'Horizontal (wrapped) country names under the columns, the key centred below.',
      proposal: 'Treat `labels.` as binding in the label plan (wrap or thin instead of turning), and report when the key leaves the house’s only stated placement.',
      observed: 'Gallery, “Electricity generation mix by country”: France / Germany / United States / China / Brazil stand vertically under 22px-wide columns, and Nuclear / Renewables / Fossil are stacked at the right of the plot. “Global temperature anomaly”: 1880s…2020s at −45°.',
    },
    {
      id: 'heatmap-ramp',
      addressed: { stage: 'A5', note: 'On the sequential ramp the domain spans the data rather than a zero-centred one (A5).' },
      title: 'A sequential ramp spread over a zero-centred domain',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'ramp-domain',
      rule: '“Continuous values: one hue or a gradient of one hue” (the Water palette, light cyan to deep navy).',
      current: 'The house states a sequential ramp and no diverging one. For the temperature heatmap (−9 to 34 °C) Flint still centres the domain on zero (−34…34) and lays the one-hue ramp across it, so the light half of the ramp is spent on temperatures that do not occur.',
      expected: 'The Water ramp across the data’s own range: Moscow’s winter pale, Delhi’s summer deep navy.',
      proposal: 'When a signed measure meets a house without `ink.series.diverging`, fit the sequential ramp to the data extent (or report the substitution) instead of keeping the symmetric domain.',
      observed: 'Gallery heatmap: the key reads −34 … 34; every cell from Singapore to Sydney is mid-to-deep blue and only Moscow’s winter reaches the middle of the ramp; the pale cyan end is never used.',
    },
  ],
};

export default salesforce;
