import type { ThemeSpec } from 'flint-chart';
import research from '../research/pinterest-gestalt.json';
import { ANOMALY, EV_SHARE, POPULATION, PROJECTION, UNEMPLOYMENT, flintInput } from '../probes';
import { houseConfig, titled, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const BLUE = '#0081FE';
const TEXT = '#111111';
const SUBTLE = '#767676';
const BORDER = '#CDCDCD';
const PALETTE = ['#003C96', '#11A69C', '#924AF7', '#D17711', '#0081FE', '#FF5383'];
const EXTENDED = [...PALETTE, '#00AB55', '#400387', '#F2681F', '#005062', '#DE2C62', '#660E00'];
const DARK_PALETTE = ['#005FCB', '#75E4D5', '#B190FF', '#FDA600', '#75BFFF', '#DE2C62'];

const t: HouseTokens = {
  font: FONT,
  text: TEXT,
  muted: SUBTLE,
  grid: BORDER,
  axis: null,
  background: '#FFFFFF',
  palette: PALETTE,
  highlight: BLUE,
  titleSize: 20,
  titleWeight: 'bold',
  subtitleSize: 16,
  subtitleColor: TEXT,
  labelSize: 12,
  lineWidth: 3,
  barCorner: 4,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'pinterest-gestalt',
  label: 'Pinterest Gestalt',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: TEXT, secondary: SUBTLE, muted: SUBTLE, inverse: '#FFFFFF' },
    structure: { grid: BORDER, axis: BORDER, rule: BORDER },
    series: {
      single: BLUE,
      categorical: PALETTE,
      categoricalExtended: EXTENDED,
      status: { positive: '#008753', negative: '#ED0000' },
    },
    accent: BLUE,
  },
  type: {
    headline: { family: FONT, size: 20, weight: 'bold', case: 'asIs', color: TEXT },
    deck: { family: FONT, size: 16, weight: 'regular', color: TEXT },
    axisLabel: { family: FONT, size: 12, weight: 'regular', color: SUBTLE },
    axisTitle: { family: FONT, size: 12, color: SUBTLE },
    keyLabel: { family: FONT, size: 12, color: TEXT },
    valueLabel: { family: FONT, size: 12, weight: 'regular', color: TEXT },
    display: { family: FONT, size: 28, weight: 'bold', color: TEXT },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit', tickDensity: 'sparse' },
    },
    grid: { measure: 'full', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: {
    bandFraction: 0.5,
    cornerRadius: 4,
    strokeWeight: 3,
    interpolation: 'linear',
    point: { presence: 'omit' },
    separator: { presence: 'full', width: 2, source: 'surface' },
    slice: { gap: 2, gapStyle: 'rule' },
  },
  geometry: {
    line: { width: 3, interpolation: 'linear', cap: 'butt' },
    band: { fraction: 0.5, cornerRadius: 4 },
    arc: { cornerRadius: 0 },
  },
  labels: { truncation: 'never' },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never', placement: 'outsideMark' },
  annotation: { axisTitles: 'omit', unit: 'never', numberFormat: { thousands: 'suffix' } },
  layout: { titleBlock: { anchor: 'start', gap: 'loose', deckGap: 'tight' }, bandStepFit: 1 },
};

const evRows = (names: string[]) => EV_SHARE.filter((row) => names.includes(row.Country));
const TOP5 = POPULATION.slice(0, 5);

/** The guide's column specimen: 50% bars, 4px top corners, grey rules, no axis lines. */
function signature() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), title: { ...(houseConfig(t).title as object), offset: 24, subtitlePadding: 4 } },
    title: { text: 'India and China are far ahead', subtitle: 'Population in millions, 2023' },
    width: W,
    height: H,
    data: { values: TOP5 },
    mark: { type: 'bar', color: BLUE, cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4, width: { band: 0.5 } },
    encoding: {
      x: { field: 'Country', type: 'nominal', sort: null, title: null, axis: { labelAngle: 0, labelPadding: 8, labelColor: SUBTLE } },
      y: { field: 'Population', type: 'quantitative', title: null, axis: { tickCount: 5, format: ',.0f', labelPadding: 12 } },
    },
  };
}

const pill = (color: string, arrow: string) =>
  `<span style="display:inline-flex;align-items:center;gap:2px;margin-left:8px;color:${color};font-size:14px;font-weight:700">${arrow}<span style="display:inline-block;width:26px;height:14px;border-radius:7px;background:${color}"></span></span>`;

const datapoint = (label: string, value: string, trend: string, selected = false) =>
  `<div style="padding:10px 12px;border-radius:12px;${selected ? `background:#E6F2FF;border:1px solid ${BLUE};` : 'border:1px solid transparent;'}">`
  + `<div style="font-size:12px;color:${SUBTLE};margin-bottom:2px">${label}</div>`
  + `<div style="display:flex;align-items:center;font-size:24px;font-weight:700;color:${TEXT}">${value}${trend}</div></div>`;

const peak = UNEMPLOYMENT.reduce((a, b) => (b['Unemployment (%)'] > a['Unemployment (%)'] ? b : a));
const latest = UNEMPLOYMENT[UNEMPLOYMENT.length - 1];

const cardHeader = `<div style="font-family:${FONT}">`
  + `<div style="font-size:20px;font-weight:700;color:${TEXT}">Unemployment rate</div>`
  + `<div style="font-size:16px;color:${TEXT};margin-top:2px">United States, 2000–2023</div>`
  + `<div style="display:flex;gap:8px;margin-top:24px;margin-bottom:24px">`
  + datapoint('Latest', `${latest['Unemployment (%)']}%`, pill('#005F3E', '↓'), true)
  + datapoint('Peak', `${peak['Unemployment (%)']}%`, pill('#CC0000', '↑'))
  + datapoint('Low', '3.6%', pill('#005F3E', '↓'))
  + '</div></div>';

const cardLegend = `<div style="font-family:${FONT};font-size:12px;color:${TEXT};margin-top:16px;display:flex;align-items:center;gap:6px">`
  + `<span style="display:inline-block;width:16px;height:3px;background:${BLUE}"></span>Unemployment</div>`;

function cardExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: 0 },
    width: W,
    height: H - 40,
    data: { values: UNEMPLOYMENT },
    mark: { type: 'line', strokeWidth: 3, color: BLUE },
    encoding: {
      x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2000, 2023], nice: false }, axis: { format: 'd', values: [2000, 2005, 2010, 2015, 2020], labelColor: SUBTLE } },
      y: { field: 'Unemployment (%)', type: 'quantitative', title: null, axis: { tickCount: 5, labelExpr: "datum.label + '%'", labelPadding: 12 } },
    },
  };
}

function forecastExpected() {
  const observed = PROJECTION.filter((row) => row.Series === 'Observed');
  const projected = PROJECTION.filter((row) => row.Series === 'Projected');
  const x = { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2015, 2030], nice: false }, axis: { format: 'd', values: [2015, 2020, 2025, 2030] } };
  const y = { field: 'Capacity (GW)', type: 'quantitative', title: null, axis: { tickCount: 5, format: '~s', labelPadding: 12 } };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), legend: { ...(houseConfig(t).legend as object), orient: 'bottom', direction: 'horizontal', symbolType: 'stroke', symbolSize: 200, symbolStrokeWidth: 3 } },
    title: { text: 'Capacity is forecast to double by 2030', subtitle: 'Global renewable capacity, GW' },
    width: W,
    height: H,
    layer: [
      { data: { values: observed }, mark: { type: 'line', strokeWidth: 3, interpolate: 'linear' }, encoding: { x, y, color: { datum: 'Actual', type: 'nominal', legend: null, scale: { domain: ['Actual', 'Forecast'], range: [BLUE, BLUE] } }, strokeDash: { datum: 'Actual', type: 'nominal', scale: { domain: ['Actual', 'Forecast'], range: [[1, 0], [8, 8]] } } } },
      { data: { values: projected }, mark: { type: 'line', strokeWidth: 2, interpolate: 'monotone' }, encoding: { x, y, color: { datum: 'Forecast', type: 'nominal' }, strokeDash: { datum: 'Forecast', type: 'nominal' } } },
    ],
  };
}

function darkExpected() {
  const names = ['Norway', 'China', 'Germany'];
  const dark: HouseTokens = { ...t, background: '#111111', text: '#FFFFFF', muted: '#A5A5A5', grid: '#767676', palette: DARK_PALETTE, subtitleColor: '#FFFFFF' };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(dark), legend: { ...(houseConfig(dark).legend as object), symbolType: 'stroke', symbolStrokeWidth: 3 } },
    title: { text: 'Norway leads electric-car sales', subtitle: 'Share of new cars sold that are electric, %' },
    width: W,
    height: H,
    data: { values: evRows(names) },
    mark: { type: 'line', strokeWidth: 3 },
    encoding: {
      x: { field: 'Year', type: 'quantitative', title: null, axis: { format: 'd', values: [2018, 2020, 2022, 2023] } },
      y: { field: 'EV share (%)', type: 'quantitative', title: null, axis: { tickCount: 5, labelPadding: 12 } },
      color: { field: 'Country', type: 'nominal', scale: { domain: names, range: DARK_PALETTE } },
    },
  };
}

/** The tooltip is HTML over the chart: white, shadowed, 16px rounding, pinned on the 2020 reading. */
function tooltipExpected() {
  const point = UNEMPLOYMENT.find((row) => row.Year === 2020)!;
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: 'Unemployment rate',
    width: W,
    height: H,
    layer: [
      {
        data: { values: UNEMPLOYMENT },
        mark: { type: 'line', strokeWidth: 3, color: BLUE },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2000, 2023], nice: false }, axis: { format: 'd', values: [2000, 2005, 2010, 2015, 2020] } },
          y: { field: 'Unemployment (%)', type: 'quantitative', title: null, axis: { tickCount: 5, labelPadding: 12 } },
        },
      },
      {
        data: { values: [point] },
        mark: { type: 'point', filled: true, size: 80, color: BLUE, stroke: '#FFFFFF', strokeWidth: 2, opacity: 1 },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'Unemployment (%)', type: 'quantitative' } },
      },
    ],
  };
}

const tooltipHtml = `<div style="position:absolute;left:246px;top:52px;font-family:${FONT};background:#FFFFFF;border-radius:16px;box-shadow:0 0 8px rgba(0,0,0,0.18);padding:6px 12px;max-width:300px">`
  + `<div style="font-size:12px;color:${SUBTLE}">2020</div>`
  + `<div style="display:flex;align-items:center;gap:6px;font-size:14px;color:${TEXT}"><span style="display:inline-block;width:12px;height:3px;background:${BLUE}"></span><b>8.1%</b></div></div>`;

/** Hatch pattern for "unavailable" bars, referenced from the Vega-Lite fill as url(#…). */
const HATCH_ID = 'gestalt-unavailable-hatch';
const hatchDefs = `<svg width="0" height="0" style="position:absolute"><defs><pattern id="${HATCH_ID}" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">`
  + `<rect width="6" height="6" fill="#FFFFFF"/><line x1="0" y1="0" x2="0" y2="6" stroke="${BORDER}" stroke-width="2.5"/></pattern></defs></svg>`;

const WEEKS = [
  { Week: 'W1', Impressions: 41000 },
  { Week: 'W2', Impressions: 46000 },
  { Week: 'W3', Impressions: 38000 },
  { Week: 'W4', Impressions: null },
  { Week: 'W5', Impressions: 52000 },
  { Week: 'W6', Impressions: 49000 },
];

function unavailableExpected() {
  const max = 60000;
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: { text: 'Impressions by week', subtitle: 'Week 4 data is unavailable' },
    width: W,
    height: H,
    data: { values: WEEKS.map((row) => ({ ...row, missing: row.Impressions === null, shown: row.Impressions ?? max })) },
    layer: [
      {
        mark: { type: 'bar', cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4, width: { band: 0.5 } },
        encoding: {
          x: { field: 'Week', type: 'nominal', sort: null, title: null, axis: { labelAngle: 0 } },
          y: { field: 'shown', type: 'quantitative', title: null, scale: { domain: [0, max] }, axis: { tickCount: 5, format: '~s', labelPadding: 12 } },
          fill: { condition: { test: 'datum.missing', value: `url(#${HATCH_ID})` }, value: BLUE },
        },
      },
      {
        transform: [{ filter: 'datum.missing' }],
        mark: { type: 'text', dy: -8, fontSize: 12, color: SUBTLE, text: 'No data' },
        encoding: { x: { field: 'Week', type: 'nominal', sort: null }, y: { field: 'shown', type: 'quantitative' } },
      },
    ],
  };
}

const lineData = { semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } }, encodings: { x: 'Year', y: 'Unemployment (%)' } };

const gestalt: StyleGuideTheme = {
  id: 'pinterest-gestalt',
  org: 'Pinterest (Gestalt)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the Gestalt data-visualisation pages and the `gestalt-charts` Recharts wrapper. The system UI stack is named as the family (Roboto on this page); Gestalt itself ships no web font.',
    'Stated directly: #0081FE as the single-series ink, the 01–06 palette with 07–12 as `categoricalExtended`, success/error status inks, 12px #767676 tick labels, 1px #CDCDCD gridlines only across the value axis, no axis lines or ticks, 50% bars with 4px value-end corners, a 2px surface gap between stacked segments, 3px straight lines without dots, a bottom-left untitled key, `k`/`M` suffixes, and a loose gap under the title block (24px in the spec).',
    'Not stated: everything that makes the chart a Gestalt *card* — the rounded container, the KPI datapoint row with trend pills, the shadowed tooltip — and the dark token pairs. The pattern language (dashed + curved forecast, hatched unavailable data) also has no field. See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      observed: 'Flint (left) is very close to the specimen: blue columns at half the band with 4px top corners, #CDCDCD rules and no axis lines, grey 12px labels, the bold heading over a regular deck, largest first. Two departures: the deck gains “; Population” although it already names the measure, and “United States” wraps onto two lines although the theme states `truncation: "never"` and Gestalt forbids wrapping.',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Column specimen: bright blue #0081FE columns at 50% of the band with 4px top corners and square bases; five #CDCDCD horizontal rules, the bottom one the baseline; no axis lines or ticks; 12px #767676 labels; a bold heading with regular supporting text and 24px before the plot. Categories largest to smallest.',
      current: 'Flint states nearly all of it from the theme: blue, 50% band, top corners, rules only across the value axis, no axis lines, grey 12px labels.',
      expected: 'The guide’s column specimen with the population data.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: TOP5,
        semantic_types: { Country: 'Country', Population: 'Quantity' },
        encodings: { x: { field: 'Country', sortBy: 'y', sortOrder: 'descending' }, y: 'Population' },
        title: 'India and China are far ahead',
        subtitle: 'Population in millions, 2023',
      }),
      expectedSpec: signature(),
    },
    {
      id: 'card-container',
      observed: 'Flint (left) draws a bare chart, extends the deck to “…2000–2023; Unemployment (%)” and shrinks the tick labels to about 8px although the theme states 12px. The expected card adds the rounded #CDCDCD container, three datapoints (the selected one tinted blue) with trend pills, % ticks and the line key bottom-left.',
      title: 'The chart lives in a card with a KPI datapoint row',
      kind: 'product-ui',
      severity: 'high',
      probe: 'card-container',
      rule: 'Chart card: rounded corners, 24px padding all round; bold Heading + Supporting text, 24px, a row of KPI datapoints (label, big number, green ↑ / red ↓ trend pill; the selected one a light-blue tile with a blue border), 24px, the plot, 16px, the key bottom-left.',
      current: 'ThemeSpec has no container, padding or corner radius for the chart block, and the chart spec has no slot for datapoints or trend indicators; `type.display` names a big-number role but only the KPI chart type reads it. Flint draws a bare chart.',
      expected: 'The layout redline applied to the unemployment series: card, header, three datapoints with the first selected, 3px blue line, line-swatch key under the plot.',
      proposal: '`layout.container: { padding, cornerRadius, border, elevation }` in the theme; `chart_spec.datapoints: [{ label, value, trend }]` rendered with `type.display` and `ink.series.status`, with a `selected` state the theme paints.',
      flint: flintInput(theme, { chartType: 'Line Chart', data: UNEMPLOYMENT, ...lineData, title: 'Unemployment rate', subtitle: 'United States, 2000–2023' }),
      expectedSpec: cardExpected(),
      expectedFrame: {
        style: { border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, background: '#FFFFFF' },
        headerHtml: cardHeader,
        footerHtml: cardLegend,
      },
    },
    {
      id: 'forecast-style',
      observed: 'Flint dashes the projected half in the same blue, but keeps it at 3px and straight, and adds a titled “Series” key on the right although the theme asks for an untitled key below; the deck gains “; Capacity (GW)”. Expected: 3px straight actuals, a 2px 8-8 dashed curve, an untitled Actual/Forecast key below.',
      title: 'Forecasts are thinner, dashed 8-8 and curved',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'forecast-style',
      rule: '“Sharp ends for absolute data, curved lines for approximate historical data and dashed + curved lines for forecasts”: actuals are 3px straight; forecasts 2px, dashed `8 8`, monotone, in the same colour.',
      current: 'The chart can map a series to `strokeDash`, but the theme cannot say what a forecast looks like: no dash rhythm, width or interpolation per epistemic state. Flint dashes the second series with its own default rhythm, at full weight and straight.',
      expected: 'One blue measure: a 3px straight actual line, then a 2px 8-8 dashed curve for the forecast.',
      proposal: 'A forecast/estimate status on rows (`semantic_types` status) and `annotation.forecast: { dash: [8, 8], width: 2, interpolation: "monotone", ink: "sameAsSeries" }`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: PROJECTION,
        semantic_types: { Year: 'Year', Series: 'Category', 'Capacity (GW)': 'Quantity' },
        encodings: { x: 'Year', y: 'Capacity (GW)', strokeDash: 'Series' },
        title: 'Capacity is forecast to double by 2030',
        subtitle: 'Global renewable capacity, GW',
      }),
      expectedSpec: forecastExpected(),
    },
    {
      id: 'pattern-fill',
      observed: 'Flint drops week 4 altogether — the axis reads W1, W2, W3, W5, W6 with no hint that a week is missing. Expected keeps the W4 slot as a full-height grey hatch labelled “No data”.',
      title: 'Unavailable data is a diagonal hatch, not a gap',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'pattern-fill',
      rule: '“A dashed line for forecasted data, a solid line for historical data, a diagonal pattern for unavailable data and a pulsating dot for real-time data.” The optional accessibility “visual pattern” mode also adds hatch fills to bars.',
      current: 'Missing values simply vanish. ThemeSpec has no fill pattern at all (`redundantChannels: ["texture"]` is reported as not realizable), and no state for “unavailable”.',
      expected: 'Week 4 drawn as a full-height grey diagonal hatch labelled “No data”.',
      proposal: '`ink.series.patterns` (hatch angle, spacing, ink) and a missing-data policy `marks.missing: "gap" | "placeholder"` that draws the placeholder in the hatch.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: WEEKS,
        semantic_types: { Week: 'Category', Impressions: 'Quantity' },
        encodings: { x: 'Week', y: 'Impressions' },
        title: 'Impressions by week',
        subtitle: 'Week 4 data is unavailable',
      }),
      expectedSpec: unavailableExpected(),
      expectedFrame: { headerHtml: hatchDefs },
    },
    {
      id: 'tooltip-style',
      observed: 'Nothing to compare on the left: Flint has no tooltip styling to show (and its tick labels drop to about 8px on this chart). Expected: the shadowed, 16px-rounded white card pinned beside the 2020 spike.',
      title: 'Tooltip: white, shadowed, rounded, immediate',
      kind: 'product-ui',
      severity: 'low',
      probe: 'tooltip-style',
      rule: 'Tooltips appear immediately on hover or keyboard focus: a white box with a shadow (elevation in dark mode), rounding 4 (16px), padding 2 (8px), max-width 300px; on touch they pin to the very top of the chart.',
      current: '`interaction` only carries a tooltip number format and the selection-boundary paint; the tooltip box is the host renderer’s default, with no theme field for its fill, rounding, shadow or placement.',
      expected: 'A pinned tooltip on the 2020 reading in the Gestalt box.',
      proposal: '`interaction.tooltip: { surface, text, radius, padding, elevation, maxWidth, placement: "follow" | "pinTop" }`.',
      flint: flintInput(theme, { chartType: 'Line Chart', data: UNEMPLOYMENT, ...lineData, title: 'Unemployment rate' }),
      expectedSpec: tooltipExpected(),
      expectedFrame: { style: { position: 'relative' }, footerHtml: tooltipHtml },
    },
    {
      id: 'dark-mode',
      observed: 'Flint renders the light house only. Expected: the same chart on #111111 with the dark palette (#005FCB, #75E4D5, #B190FF), white headline and #767676 rules.',
      title: 'Every data colour has a dark-mode token',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'dark-mode',
      rule: 'Dark mode: background #111111, text #FFFFFF, subtle text #A5A5A5, gridlines #767676, and a dark palette 01–12 (#005FCB, #75E4D5, #B190FF, #FDA600, …) tuned for the dark surface.',
      current: 'A ThemeSpec holds one set of inks; `variants` may not vary `ink`. A dark Gestalt is a second, separately maintained theme, and nothing ties the two together or follows the host’s colour scheme.',
      expected: 'The same EV chart on #111111 with the dark tokens.',
      proposal: '`ink.modes: { dark: Partial<ThemeInk> }` (or paired tokens `{ light, dark }` on each ink) chosen by a `colorScheme` option or the host’s `prefers-color-scheme`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: evRows(['Norway', 'China', 'Germany']),
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway leads electric-car sales',
        subtitle: 'Share of new cars sold that are electric, %',
      }),
      expectedSpec: darkExpected(),
    },
    {
      id: 'label-collision',
      addressed: { stage: 'A1', note: 'Names are measured in the face they are drawn in and kept flat: broken at a space, set smaller down to the floor (`type.minSize`, never below ¾ of the stated size), the bands widened — and only then turned (A1). Measured, the names no longer run into each other.' },
      observed: 'At 320px Flint (left) prints “1880s1900s1920s1940s…” as one unbroken string under the columns, and appends “; Anomaly (°C)” to a deck that already says °C. The expected panel labels every other decade with clear gaps.',
      title: 'Horizontal category labels run into each other',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'label-collision',
      rule: 'Labels must not wrap or truncate, and stay horizontal; below the breakpoint the chart shows fewer ticks (5 → 3) rather than crowding them.',
      current: 'With `labels.` Flint keeps the decades flat at a dashboard-tile width (320px), but sets all nine of them edge to edge — “1880s1900s1920s…” reads as one string. Its width estimate for the system UI face is too small to see the collision, so it neither thins nor turns them.',
      expected: 'Every other decade labelled, horizontally, with clear space between.',
      proposal: 'Measure labels in the resolved face (or pad unknown faces), and thin banded labels (`tickLabels: "sparse"`) before they touch.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: ANOMALY.map(({ Decade, 'Anomaly (°C)': v }) => ({ Decade, 'Anomaly (°C)': v })),
        semantic_types: { Decade: 'Category', 'Anomaly (°C)': { semanticType: 'Quantity', unit: '°C' } },
        encodings: { x: 'Decade', y: 'Anomaly (°C)' },
        title: 'The world has warmed since the 1960s',
        subtitle: 'Temperature anomaly vs 1951–1980, °C',
        baseSize: { width: 320, height: 210 },
      }),
      expectedSpec: titled(t, {
        data: { values: ANOMALY },
        mark: { type: 'bar', color: BLUE, cornerRadiusEnd: 4, width: { band: 0.5 } },
        encoding: {
          x: { field: 'Decade', type: 'ordinal', title: null, axis: { labelAngle: 0, values: ['1880s', '1920s', '1960s', '2000s', '2020s'] } },
          y: { field: 'Anomaly (°C)', type: 'quantitative', title: null, axis: { tickCount: 3, labelPadding: 12 } },
        },
      }, { title: 'The world has warmed since the 1960s', subtitle: 'Temperature anomaly vs 1951–1980, °C', width: 290, height: 150 }),
    },
    {
      id: 'adjacent-pairs',
      title: 'Forbidden neighbouring colour pairs; at most four colours',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'chart-type-policy',
      rule: 'Apply colours in palette order; never place pairs 1&8, 2&6, 7&9, 5&3, 7&6, 4&9, 2&7, 7&11, 4&6, 6&11 next to each other; at most 4 colours in a bar or line chart — use small multiples beyond; donuts only with 2–3 categories.',
      current: 'The palette is an ordered list; ThemeSpec cannot list forbidden adjacencies or a series ceiling that turns a chart into small multiples, so a seven-series chart takes colours 1–7 side by side.',
      expected: 'A theme-level ceiling (`maxSeries: 4`) that the compiler reports or facets past, and an adjacency constraint the palette assignment honours.',
      proposal: '`ink.series.avoidAdjacent: [[1, 8], [2, 6], …]` and `legend.maxSeries` / `facets.splitAboveSeries`.',
    },
  ],
};

export default gestalt;
