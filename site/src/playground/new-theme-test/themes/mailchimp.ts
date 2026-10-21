import type { ThemeSpec } from 'flint-chart';
import research from '../research/mailchimp.json';
import { flintInput } from '../probes';
import { PREVIEW_CASES } from '../../../shared/preview-cases';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

// Mailchimp's product face is the proprietary Graphik; the guide's text could not be read, so this is
// what the case-study images show. It falls back to Helvetica/Arial on this page.
const FONT = "Graphik, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const PEPPERCORN = '#241C15';
const WARM_GREY = '#716C69';
const GRID = '#E9E8E8';
const OCHRE = '#D99536';
const SKY = '#99C7EF';
const TOOLTIP = '#39332C';
/** “Combo One”, sampled from the case-study swatch sheet (approximate). */
const COMBO_ONE = ['#F97F50', '#4F135E', '#99C7EF', '#FAD173', '#A3296E'];

const t: HouseTokens = {
  font: FONT,
  text: PEPPERCORN,
  muted: WARM_GREY,
  grid: GRID,
  axis: PEPPERCORN,
  background: '#FFFFFF',
  palette: COMBO_ONE,
  highlight: OCHRE,
  context: '#EEEDEC',
  titleSize: 19,
  titleWeight: 'normal',
  subtitleSize: 13,
  labelSize: 11,
  lineWidth: 2,
};

const theme: ThemeSpec = {
  id: 'mailchimp',
  label: 'Mailchimp (data patterns)',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: PEPPERCORN, secondary: WARM_GREY, muted: WARM_GREY, inverse: '#FFFFFF' },
    structure: { axis: PEPPERCORN, grid: GRID, zero: PEPPERCORN },
    series: {
      single: OCHRE,
      // One five-colour combo, cycled in order; the guide offers several and never mixes them.
      categorical: COMBO_ONE,
    },
    accent: OCHRE,
  },
  type: {
    headline: { family: FONT, size: 19, weight: 'regular', case: 'title', color: PEPPERCORN },
    deck: { family: FONT, size: 13, color: WARM_GREY },
    axisLabel: { family: FONT, size: 11, color: WARM_GREY },
    axisTitle: { family: FONT, size: 11, color: WARM_GREY },
    keyLabel: { family: FONT, size: 12, color: PEPPERCORN },
    valueLabel: { family: FONT, size: 12, color: PEPPERCORN },
    annotation: { family: FONT, size: 12, color: PEPPERCORN },
    footnote: { family: FONT, size: 12, color: PEPPERCORN },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1.5, ticks: 'full', tickLength: 'short', tickDirection: 'outward' },
      measure: { line: 'omit', ticks: 'omit', tickDensity: 'sparse' },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: { strokeWeight: 2, interpolation: 'linear', point: { presence: 'omit' } },
  geometry: { line: { width: 2, interpolation: 'linear' }, point: { presence: 'omit' } },
  legend: { show: 'always', placement: ['top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'end' },
  dataLabels: { show: 'never' },
  annotation: {
    axisTitles: 'omit',
    unit: 'everyTick',
    numberFormat: { thousands: 'suffix', precision: 'integer', compact: { threshold: 1000 } },
  },
  layout: { titleBlock: { anchor: 'start', gap: 'loose' } },
};

// ---------------------------------------------------------------------------
// Data re-keyed by eye from the case-study specimens (chart-audience-growth, rev-projections).
// ---------------------------------------------------------------------------

const DAY = 86_400_000;
const isoDate = (start: number, i: number, stepDays: number) => new Date(start + Math.round(i * stepDays) * DAY).toISOString().slice(0, 10);

const AUDIENCE_K = [
  9.2, 7.8, 8.6, 7.2, 6.1, 6.9, 8.3, 9.6, 7.9, 8.4, 11, 9.8, 8.7, 6.2, 7.1, 6.3, 5.4, 6.2, 7.2, 7.0, 8.6, 9.8, 6.0, 8.4, 13.9,
  10.9, 7.0, 9.8, 10.6, 11.4, 13.0, 16.8, 22.7, 19.0, 15.2, 14.0, 15.0, 17.2, 20.1, 19.1, 22.0, 24.1, 22.8, 26.0, 22.9, 26.0,
  29.8, 33.4, 32.7, 34.6, 38.2, 40.0,
];
const START = Date.UTC(2015, 0, 5);
const AUDIENCE = AUDIENCE_K.map((k, i) => ({ Date: isoDate(START, i, 452 / (AUDIENCE_K.length - 1)), Subscribers: Math.round(k * 1000) }));
/** The segmented trend band under the axis: ochre where the audience grew. */
const TRENDS = [
  ['2015-01-05', '2015-02-28', 'flat'], ['2015-03-03', '2015-04-02', 'up'], ['2015-04-05', '2015-06-25', 'flat'],
  ['2015-06-28', '2015-10-05', 'up'], ['2015-10-08', '2015-11-02', 'flat'], ['2015-11-05', '2016-04-01', 'up'],
].map(([from, to, trend]) => ({ from, to, trend }));

const REVENUE_K = [7.1, 6.6, 6.9, 6.2, 5.8, 6.4, 7.0, 7.4, 6.6, 7.0, 7.9, 7.4, 6.8, 6.0, 6.4, 5.9, 5.6, 6.1, 6.4, 6.6, 7.5, 5.9, 6.9, 9.0, 7.8, 6.2, 7.6, 8.4, 9.9, 12.3, 10.4, 9.2, 9.9, 11.3, 10.8, 12.4, 12.0, 13.6, 12.4, 13.8, 15.1, 16.6, 16.3, 17.2, 18.6, 19.3];
const TODAY = '2015-09-20';
const REVENUE = [
  ...REVENUE_K.map((k, i) => ({ Date: isoDate(START, i, 258 / (REVENUE_K.length - 1)), Series: 'Revenue', Revenue: Math.round(k * 1000) })),
  ...[[TODAY, 19300], ['2015-12-01', 23800], ['2016-02-01', 28400], ['2016-04-01', 33200]].map(([Date, Revenue]) => ({ Date: Date as string, Series: 'Projected', Revenue: Revenue as number })),
];

const SOURCES = [['Signup form', 35], ['Import', 28], ['Integrations', 22], ['Other', 15]].map(([Source, Share]) => ({ Source, Share }));

const config = (extra: Record<string, unknown> = {}) => {
  const base = houseConfig(t);
  return {
    ...base,
    title: { ...(base.title as object), fontWeight: 'normal', fontSize: 19, offset: 26 },
    axis: { ...(base.axis as object), labelColor: WARM_GREY, labelFontSize: 11 },
    axisX: { domain: true, domainColor: PEPPERCORN, domainWidth: 1.5, ticks: true, tickColor: PEPPERCORN, tickSize: 5, tickWidth: 1.5, labelColor: PEPPERCORN, grid: false, labelPadding: 4 },
    axisY: { grid: true, domain: false, ticks: false, labelPadding: 8 },
    ...extra,
  };
};

/** Month abbreviations, the year spelled out at January. */
const MONTH_LABELS = "month(datum.value) === 0 ? timeFormat(datum.value, '%Y') : timeFormat(datum.value, '%b')";
/** 0, 20k, 40k. */
const K_LABELS = "datum.value === 0 ? '0' : format(datum.value / 1000, 'd') + 'k'";

/** chart-audience-growth: regular-weight title, 0/20k/40k, dark baseline with ticks, ochre line, trend band and caption. */
function signature() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config(),
    title: { text: 'Audience Growth' },
    width: W,
    height: H - 20,
    layer: [
      {
        data: { values: AUDIENCE },
        mark: { type: 'line', strokeWidth: 2, color: OCHRE },
        encoding: {
          x: { field: 'Date', type: 'temporal', title: null, scale: { domain: ['2015-01-01', '2016-04-03'] }, axis: { tickCount: { interval: 'month', step: 3 }, labelExpr: MONTH_LABELS } },
          y: { field: 'Subscribers', type: 'quantitative', title: null, scale: { domain: [0, 40000] }, axis: { values: [0, 20000, 40000], labelExpr: K_LABELS } },
        },
      },
      {
        data: { values: TRENDS },
        mark: { type: 'rect', clip: false },
        encoding: {
          x: { field: 'from', type: 'temporal' },
          x2: { field: 'to' },
          y: { value: H - 20 + 30 },
          y2: { value: H - 20 + 34 },
          color: { field: 'trend', type: 'nominal', scale: { domain: ['up', 'flat'], range: [OCHRE, '#EEEDEC'] }, legend: null },
        },
      },
    ],
  };
}

const caption = `<div style="font-family:${FONT};font-size:12.5px;color:${PEPPERCORN};margin:2px 14px 12px">Large trends of <span style="color:${OCHRE}">increasing</span> audience size</div>`;

/** rev-projections: ochre actuals, then a dotted light-blue projection from a dotted “Today” rule. */
function projection() {
  const x = { field: 'Date', type: 'temporal', title: null, scale: { domain: ['2015-01-01', '2016-04-03'] }, axis: { tickCount: { interval: 'month', step: 3 }, labelExpr: MONTH_LABELS } };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config({ legend: { ...(houseConfig(t).legend as object), orient: 'top', layout: { top: { anchor: 'end' } }, symbolType: 'stroke', symbolStrokeWidth: 2, symbolSize: 220, labelColor: PEPPERCORN, labelFontSize: 12, columnPadding: 20, offset: 10 } }),
    title: { text: 'Revenue Projection' },
    width: W,
    height: H - 20,
    layer: [
      {
        data: { values: REVENUE },
        mark: { type: 'line', strokeWidth: 2 },
        encoding: {
          x,
          y: { field: 'Revenue', type: 'quantitative', title: null, scale: { domain: [0, 40000] }, axis: { values: [0, 20000, 40000], labelExpr: `'$' + (${K_LABELS})` } },
          color: { field: 'Series', type: 'nominal', sort: ['Revenue', 'Projected'], scale: { domain: ['Revenue', 'Projected'], range: [OCHRE, SKY] } },
          strokeDash: { field: 'Series', type: 'nominal', sort: ['Revenue', 'Projected'], scale: { domain: ['Revenue', 'Projected'], range: [[1, 0], [2, 3]] } },
        },
      },
      {
        data: { values: [{ Date: TODAY }] },
        mark: { type: 'rule', color: '#8C8784', strokeDash: [2, 3], strokeWidth: 1.5 },
        encoding: { x: { field: 'Date', type: 'temporal' }, y: { value: 0 }, y2: { value: H - 20 } },
      },
      {
        data: { values: [{ Date: TODAY }] },
        mark: { type: 'text', text: 'Today', baseline: 'bottom', dy: -4, fontSize: 12, color: PEPPERCORN, font: FONT },
        encoding: { x: { field: 'Date', type: 'temporal' }, y: { value: H - 20 } },
      },
    ],
  };
}

/** pie-large: largest source from 12 o'clock, no slice labels, square-swatch key in two columns below. */
function pie() {
  const order = SOURCES.map((row) => row.Source);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config({
      legend: {
        ...(houseConfig(t).legend as object), orient: 'bottom', direction: 'horizontal', columns: 2, columnPadding: 36, rowPadding: 8,
        symbolType: 'square', symbolSize: 90, labelColor: PEPPERCORN, labelFontSize: 12, offset: 18,
      },
    }),
    title: { text: 'Signup Sources' },
    width: W,
    height: H - 30,
    data: { values: SOURCES },
    mark: { type: 'arc', outerRadius: 82, stroke: null },
    encoding: {
      theta: { field: 'Share', type: 'quantitative', stack: true },
      order: { field: 'Share', type: 'quantitative', sort: 'descending' },
      color: { field: 'Source', type: 'nominal', sort: order, scale: { domain: order, range: COMBO_ONE } },
    },
  };
}

/** chart-audience-growth's hover state: halo on the point, a black rule up to a charcoal box above the plot. */
function tooltip() {
  const hovered = AUDIENCE[AUDIENCE.findIndex((row) => row.Date >= '2015-08-01')];
  const top = -6;
  return {
    ...signature(),
    layer: [
      signature().layer[0],
      {
        data: { values: [hovered] },
        mark: { type: 'rule', color: PEPPERCORN, strokeWidth: 1 },
        encoding: { x: { field: 'Date', type: 'temporal' }, y: { field: 'Subscribers', type: 'quantitative' }, y2: { value: top } },
      },
      {
        data: { values: [hovered] },
        mark: { type: 'point', filled: true, size: 260, color: OCHRE, opacity: 0.35 },
        encoding: { x: { field: 'Date', type: 'temporal' }, y: { field: 'Subscribers', type: 'quantitative' } },
      },
      {
        data: { values: [hovered] },
        mark: { type: 'rect', color: TOOLTIP, cornerRadius: 0, xOffset: -34, x2Offset: 98, clip: false },
        encoding: { x: { field: 'Date', type: 'temporal' }, x2: { field: 'Date' }, y: { value: top - 46 }, y2: { value: top } },
      },
      {
        data: { values: [hovered] },
        mark: { type: 'text', align: 'left', baseline: 'top', dx: -24, fontSize: 11.5, fontWeight: 'bold', color: '#FFFFFF', text: 'Aug 3, 2015', font: FONT },
        encoding: { x: { field: 'Date', type: 'temporal' }, y: { value: top - 38 } },
      },
      {
        data: { values: [hovered] },
        mark: { type: 'text', align: 'left', baseline: 'top', dx: -24, fontSize: 11.5, color: '#FFFFFF', font: FONT },
        encoding: { x: { field: 'Date', type: 'temporal' }, y: { value: top - 20 }, text: { field: 'label' } },
        transform: [{ calculate: "format(datum.Subscribers, ',') + ' subscribers'", as: 'label' }],
      },
    ],
  };
}

/** The revenue series on its own: what “$40k” means on the ticks. */
function revenueTicks() {
  const actual = REVENUE.filter((row) => row.Series === 'Revenue');
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config(),
    title: { text: 'Revenue' },
    width: W,
    height: H - 20,
    data: { values: actual },
    mark: { type: 'line', strokeWidth: 2, color: OCHRE },
    encoding: {
      x: { field: 'Date', type: 'temporal', title: null, scale: { domain: ['2015-01-01', '2015-10-01'] }, axis: { tickCount: { interval: 'month', step: 3 }, labelExpr: MONTH_LABELS } },
      y: { field: 'Revenue', type: 'quantitative', title: null, scale: { domain: [0, 20000] }, axis: { values: [0, 10000, 20000], labelExpr: `'$' + (${K_LABELS})` } },
    },
  };
}

const MIX = (PREVIEW_CASES.find((c) => c.id === 'electricity-mix-area')?.data ?? []) as Record<string, unknown>[];
const MIX_SOURCES = ['Coal', 'Gas', 'Hydro', 'Nuclear', 'Wind & solar', 'Other'];

/** Six series against a five-colour combo: the combo, with the sixth in the house's light grey. */
function sixSeries() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config({ legend: { ...(houseConfig(t).legend as object), orient: 'top', symbolType: 'square', labelColor: PEPPERCORN, columns: 3 } }),
    title: { text: 'World Electricity by Source' },
    width: W,
    height: H - 30,
    data: { values: MIX },
    mark: { type: 'area' },
    encoding: {
      x: { field: 'Year', type: 'quantitative', title: null, axis: { format: 'd', values: [1990, 2000, 2010, 2020] } },
      y: { field: 'Generation (TWh)', type: 'quantitative', title: null, stack: 'normalize', axis: { values: [0, 0.5, 1], format: '.0%' } },
      color: { field: 'Source', type: 'nominal', sort: MIX_SOURCES, scale: { domain: MIX_SOURCES, range: [...COMBO_ONE, '#D8D5D2'] } },
      order: { field: 'i', type: 'quantitative' },
    },
    transform: [{ calculate: `indexof(${JSON.stringify(MIX_SOURCES)}, datum.Source)`, as: 'i' }],
  };
}

const mailchimp: StyleGuideTheme = {
  id: 'mailchimp',
  org: 'Mailchimp (UX patterns: Data)',
  research: research as ResearchRecord,
  theme,
  notes: [
    '**No direct access.** ux.mailchimp.com/patterns/data is gone (503 / DNS failure) and the Wayback Machine was down at research time, so the guideline text was never read. This house is built from the portfolio case study of the designer who wrote the guideline: its specimen images and the palette sheet. **Every hex here was sampled from those PNGs with ImageMagick and is approximate**; none is a published token. Nothing about type sizes or weights is stated anywhere that was read — they are measured off the images.',
    'From the specimens: a regular-weight, title-case headline in near-black `#241C15`; small warm-grey y labels at 0 / 20k / 40k (`annotation.numberFormat.thousands: "suffix"`, sparse ticks); very light `#E9E8E8` horizontal rules only; a solid dark x baseline with short ticks hanging below (`structure.axis.categorical`), no y-axis line; one thin 2px ochre `#D99536` line as the single-series ink; no markers, no value labels, no axis titles; the key top-right.',
    'Approximated: the face looks like Mailchimp’s proprietary Graphik and is named with a Helvetica/Arial fallback. The guide builds categorical colour from five-colour “combos” the author picks per chart; the theme can carry only one, so it carries Combo One.',
    'Not stateable: the dark tooltip with its rule and halo, the dotted light-blue projection after a “Today” rule, the trend band and coloured-keyword caption under the axis, month labels with the year at January, the pie’s two-column key below, and the choice between combos — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'chart-audience-growth: “Audience Growth” in a regular-weight sans top-left; grey 0 / 20k / 40k labels with two very light rules; a solid near-black baseline with short downward ticks under 2015, Apr, Jul, Oct, 2016, Apr; one thin ochre line, no markers; under the axis a thin segmented band (ochre where the audience grew) and a caption with the keyword “increasing” in ochre.',
      current: 'Flint draws the same weekly series with the house theme. The band and caption have no slot in the chart spec.',
      expected: 'The specimen, re-keyed.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: AUDIENCE,
        semantic_types: { Date: 'Date', Subscribers: 'Count' },
        encodings: { x: 'Date', y: 'Subscribers' },
        title: 'Audience Growth',
      }),
      expectedSpec: signature(),
      expectedFrame: { footerHtml: caption },
      observed: 'Flint gets the voice right — regular-weight title, warm greys, light horizontal rules only, a dark baseline with short ticks hanging below, one thin ochre line with no markers. It differs in the numbers and the furniture: ticks read 0 / 10,000 / … / 40,000 (five rules where the specimen has two, and no “k”), the deck “Subscribers” is manufactured from the axis title, the months are spelled out (“January April July October”), and nothing sits under the axis — no trend band, no caption.',
    },
    {
      id: 'tooltip',
      title: 'A dark warm-charcoal tooltip tied to its point by a rule',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'tooltip-style',
      rule: 'Hover: a square-cornered `#39332C` box above the plot, bold white date line, regular white value line, joined to the hovered point by a thin dark vertical rule; the point gets a translucent halo in the series colour.',
      current: 'ThemeSpec’s `interaction` block has only `tooltipFormat` and selection-boundary paint: no tooltip fill, text ink, corner radius, connector rule or hover halo. Flint’s tooltip is the renderer’s default.',
      expected: 'The specimen’s hover on early August pinned open: halo, rule, charcoal box above the plot.',
      proposal: '`interaction.tooltip: { fill, text, radius, titleWeight, anchor: "abovePlot", connector: { color, width } }` and `interaction.hover.point: { halo: { opacity, size } }`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: AUDIENCE,
        semantic_types: { Date: 'Date', Subscribers: 'Count' },
        encodings: { x: 'Date', y: 'Subscribers' },
        title: 'Audience Growth',
      }),
      expectedSpec: tooltip(),
      observed: 'The Flint panel is the resting chart: nothing in the theme reaches the hover state, so the comparison is between Flint’s default tooltip and the expected charcoal box with its rule and halo. The expected panel is drawn from the specimen; Flint cannot be asked for any of it.',
    },
    {
      id: 'projection',
      title: 'Projections continue as a dotted light-blue line after a “Today” rule',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'forecast-style',
      rule: 'rev-projections: actuals in ochre; from today the series continues as a dotted light-blue line; a dotted grey vertical rule labelled “Today” at its foot; the key top-right shows a solid and a dotted line sample.',
      current: 'Flint has no notion of a projected segment or of “now”. Given the two states as `strokeDash: Series`, it draws one colour with a dash and a key; the colour change, the “Today” rule and its label cannot be stated.',
      expected: 'Ochre actuals, dotted `#99C7EF` projection, a dotted rule with “Today” under it, line samples in the key.',
      proposal: 'A semantic marker for projected rows plus `annotation.forecast: { style: "dotted", ink: "#99C7EF", nowRule: { dash, label: "Today" } }`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: REVENUE,
        semantic_types: { Date: 'Date', Series: 'Category', Revenue: { semanticType: 'Amount', unit: '$' } },
        encodings: { x: 'Date', y: 'Revenue', strokeDash: 'Series' },
        title: 'Revenue Projection',
      }),
      expectedSpec: projection(),
      observed: 'Flint draws one ochre line, dashed after September, with a titled “Series” key (despite `legend.title: "omit"`) at the bottom right instead of the top. The projection keeps the actuals’ colour, there is no “Today” rule, and the ticks again read 10,000 … 40,000 with “Revenue ($)” in the deck.',
    },
    {
      id: 'pie-key',
      title: 'Pie key below, in a two-column grid of square swatches',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'legend-placement',
      rule: 'Pies break down sources (four slices), largest from 12 o’clock clockwise, no borders or labels on the slices; the key sits below the pie in a two-column grid with small square swatches; values only on hover (“35% • 476 Subscribers”).',
      current: '`legend.placement` can say `bottom` but not how many columns; `legend.swatch` is `auto` only. The theme keeps the line-chart key at the top right, and a `variants` guard on `isPartToWhole` could move a pie’s key down but still not lay it out in two columns.',
      expected: 'A Combo One pie, largest slice first, key in two columns underneath.',
      proposal: '`legend.columns` (or `legend.grid: { columns: 2 }`) and `legend.swatch: "square"`; both allowed inside a `variants` entry so a house can key pies differently from lines.',
      flint: flintInput(theme, {
        chartType: 'Pie Chart',
        data: SOURCES,
        semantic_types: { Source: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Source' },
        title: 'Signup Sources',
      }),
      expectedSpec: pie(),
      observed: 'Flint wraps the key into two columns, but above the pie, with round swatches. Its slices also run in alphabetical order from 12 o’clock (Import, Integrations, Other, Signup form) while the colours follow the data order — so the largest slice, Signup form, ends at 12 o’clock instead of starting there. The gallery’s browser pie shows the same alphabetical order.',
    },
    {
      id: 'number-format',
      addressed: { stage: 'A6', note: '`compact: { threshold: 1000 }` — 0 / 5k / 10k … on the ticks (A6). The $ needs the field to be a currency.' },
      title: '“$40k” on the ticks: the suffix and the currency sign do not reach the axis',
      kind: 'realization',
      severity: 'medium',
      probe: 'number-format',
      rule: 'Tick labels are abbreviated and carry their unit on every tick: 0 / 20k / 40k, $0 / $20k / $40k (rev-projections, chart-audience-growth); no y-axis title.',
      current: 'The theme states `annotation.numberFormat: { thousands: "suffix" }` and `annotation.unit: "everyTick"`. Flint prints the measure ticks in full with a thousands separator (“20,000”), and for an `Amount` with unit `$` it moves “($)” into the deck instead of prefixing the ticks — while the same `unit: everyTick` does put “%” on every tick of a percentage.',
      expected: '$0 / $10k / $20k on the ticks, nothing appended to the title block.',
      proposal: 'Apply `annotation.numberFormat` to measure-axis tick labels as well as value labels, and let `unit: everyTick` place a currency unit as a prefix (`unitPosition: "prefix" | "suffix"`, defaulting from the semantic type).',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: REVENUE.filter((row) => row.Series === 'Revenue'),
        semantic_types: { Date: 'Date', Revenue: { semanticType: 'Amount', unit: '$' } },
        encodings: { x: 'Date', y: 'Revenue' },
        title: 'Revenue',
      }),
      expectedSpec: revenueTicks(),
      observed: 'Flint: 0 / 5,000 / … / 20,000 with “Revenue ($)” added as a deck; no “$”, no “k”. Expected: $0 / $10k / $20k and the title alone. Flint also labels the months one by one (“Feb 2015 Apr May Jun …”) where the specimen keeps a quarterly rhythm.',
    },
    {
      id: 'palette-exhausted',
      addressed: { stage: 'R1', note: 'The house colours stay; series past them share a house grey.' },
      title: 'Past five series the house colours vanish altogether',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'count-palette',
      rule: 'Colour comes from one five-colour combo, cycled in order; the case study never shows more than five categories, and every combo was tested so neighbours stay distinct.',
      current: 'With six series and no `categoricalExtended` or `overflow`, grounding marks the palette `exhausted` and stops imposing the house set; Vega-Lite’s default Tableau colours take over, so the six-source area in the gallery is blue, orange, red, teal, green, yellow — nothing Mailchimp would draw.',
      expected: 'The chart stays in Combo One, the sixth (smallest) series in the house’s light warm grey.',
      proposal: 'When a house names no overflow ink, keep its palette for the first n series and fold the tail into `text.muted`-derived grey (or report and stop) instead of handing the chart to the renderer’s scheme.',
      flint: flintInput(theme, {
        chartType: 'Area Chart',
        data: MIX,
        semantic_types: { Year: 'Year', Source: 'Category', 'Generation (TWh)': 'Quantity' },
        encodings: { x: 'Year', y: 'Generation (TWh)', color: 'Source' },
        chartProperties: { stackMode: 'normalize' },
        title: 'World Electricity by Source',
      }),
      expectedSpec: sixSeries(),
      observed: 'Flint’s area is Tableau blue, orange, red, teal, green and yellow — the house palette is dropped entirely, not just for the sixth series. The expected chart keeps coral, plum, light blue, pale yellow and magenta and folds the sixth into a warm grey.',
    },
    {
      id: 'date-labels',
      title: 'Month labels, with the year at each January',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'date-label-format',
      rule: 'Time axes read “2015 Apr Jul Oct 2016 Apr”: abbreviated months, the year replacing January; tooltips spell the day out (“Aug 3, 2015”).',
      current: 'No ThemeSpec field governs temporal tick text; Flint chooses its own labels and format for the span.',
      expected: 'See the signature’s expected panel.',
      proposal: '`annotation.dateLabels: { granularity: "auto", yearAtBoundary: true, monthStyle: "short" }`.',
      observed: 'In the signature Flint writes “January April July October 2016 April”: it already puts the year at the boundary, but spells the months in full.',
    },
    {
      id: 'trend-band',
      title: 'A trend band under the axis, explained by a coloured keyword',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'annotation',
      rule: 'Under the time axis a thin segmented band marks periods (ochre where the audience is increasing, light grey otherwise); a caption below names the pattern with its keyword set in the matching colour (“Large trends of **increasing** audience size”).',
      current: 'The chart spec has no slot for period annotations or for a caption, and the theme has no style for either; nothing under the axis is drawn.',
      expected: 'See the band and caption under the signature’s expected panel.',
      proposal: '`chart_spec.annotations: [{ kind: "period", from, to, class }]` and `chart_spec.caption` with inline references to a class (`{increasing}`), styled by `annotation.period` and `type.annotation` in the theme.',
    },
    {
      id: 'combos',
      title: 'Pick one five-colour combo per chart',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'named-palettes',
      rule: '“Designers and engineers could simply choose a combo and our tools would simply move through the sequence of colors”: Combo One (coral, plum, light blue, pale yellow, magenta), Two, Four, Five, Six — each tested for colour-vision deficiency; categories differ in hue, saturation and value.',
      current: '`ink.series.categorical` is one list, so the theme can carry only one combo (Combo One here); the other four are lost, and a chart cannot ask for “Combo Six”.',
      expected: 'The house ships every combo and a chart names the one it uses.',
      proposal: '`ink.series.categoricalSets: { "combo-one": [...], "combo-six": [...] }` with `categorical` naming the default, and a chart-spec `palette: "combo-six"` that picks among the house’s sets.',
    },
  ],
};

export default mailchimp;
