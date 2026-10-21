import type { ThemeSpec } from 'flint-chart';
import research from '../research/sprout-social.json';
import { ANOMALY, EV_SHARE, flintInput, POPULATION, valueLabelProbe } from '../probes';
import { PREVIEW_CASES } from '../../../shared/preview-cases';
import { houseConfig, W, H as HEIGHT, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";
const TEXT = '#364141';
const HEADLINE = '#273333';
const SUBTEXT = '#515E5F';
const GRID = '#DEE1E1';
const ZERO = '#6E797A';
const EMPTY = '#C8CCCC';
/** --color-dataviz-list-0..19, the rotation order. */
const ROTATION = [
  '#08C4B2', '#9747FF', '#CE3665', '#FFCD1C', '#3876E3', '#DB61DB', '#59CB59', '#FC8943', '#DB3E3E', '#026661',
  '#D5A9FF', '#931847', '#944C0C', '#0C3F89', '#6C2277', '#006B40', '#962C0B', '#FF7F6E', '#0CA750', '#BA7506',
];
const DARK_ROTATION = ['#24E0C5', '#D5A9FF', '#FF76AE', '#FFCD1C', '#679EFF', '#F282F5', '#75DD66', '#FF9C5D', '#DB3E3E', '#0B968F'];

const t: HouseTokens = {
  font: FONT,
  text: TEXT,
  muted: SUBTEXT,
  grid: GRID,
  axis: GRID,
  background: '#FFFFFF',
  palette: ROTATION,
  titleSize: 16,
  titleWeight: 600,
  subtitleSize: 13,
  labelSize: 11,
  lineWidth: 3,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'sprout-social',
  label: 'Sprout Social Seeds',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: TEXT, secondary: SUBTEXT, muted: SUBTEXT },
    structure: { grid: GRID, axis: GRID, rule: ZERO, zero: ZERO },
    series: {
      single: ROTATION[0],
      // “The ideal state for readability is four … no more than ten.”
      categorical: ROTATION.slice(0, 10),
      categoricalExtended: ROTATION,
      overflow: EMPTY,
    },
    accent: ROTATION[0],
  },
  type: {
    headline: { family: FONT, size: 16, weight: 'semibold', color: HEADLINE },
    deck: { family: FONT, size: 13, color: SUBTEXT },
    axisLabel: { family: FONT, size: 11, weight: 'regular', color: SUBTEXT },
    keyLabel: { family: FONT, size: 12, color: TEXT },
    valueLabel: { family: FONT, size: 11, color: TEXT },
    footnote: { family: FONT, size: 11, color: SUBTEXT },
  },
  structure: {
    axis: {
      categorical: { line: 'hairline', lineWeight: 1, ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit' },
    },
    // `y-axis-zero-line`: the decorative-neutral ink at full strength, the heaviest line in the plot (GR2).
    grid: { measure: 'quiet', category: 'omit', style: 'solid', weight: 1, zero: { presence: 'emphasised', color: ZERO } },
    frame: 'omit',
    baseline: 'full',
  },
  marks: {
    strokeWeight: 3,
    // “Use sharp edges.”
    strokeJoin: 'miter',
    strokeCap: 'butt',
    interpolation: 'linear',
    point: { presence: 'omit' },
    separator: { presence: 'hairline', width: 1, source: 'surface' },
    slice: { gap: 1, gapStyle: 'rule' },
  },
  geometry: {
    line: { width: 3, join: 'miter', cap: 'butt', interpolation: 'linear' },
    area: { opacity: 0.3, edge: 'full' },
    arc: { gap: 1, gapStyle: 'rule' },
  },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'whenTheyFit', placement: 'outsideMark', inkMode: 'fixed' },
  annotation: { axisTitles: 'omit', numberFormat: { thousands: 'suffix', precision: 'two', compact: { per: 'value' } } },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' } },
};

// The guide's “sharp edges” specimen, its polyline read back into daily impressions.
const SPECIMEN_Y = [152, 106, 197, 203, 161, 178, 117, 229, 203, 138, 178, 97];
const IMPRESSIONS = SPECIMEN_Y.map((y, i) => ({ Date: `2024-01-${String(i + 1).padStart(2, '0')}T00:00`, Impressions: (308 - y) * 100 }));

function signatureExpected() {
  const first = IMPRESSIONS[0];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: { text: 'Impressions', subtitle: 'All profiles, January 1–12, 2024', color: HEADLINE },
    width: W,
    height: HEIGHT,
    layer: [
      {
        data: { values: IMPRESSIONS },
        mark: { type: 'line', strokeWidth: 3, strokeJoin: 'miter', strokeCap: 'butt', color: ROTATION[0] },
        encoding: {
          x: {
            field: 'Date', type: 'temporal', title: null,
            axis: { format: '%-d', tickCount: { interval: 'day', step: 1 }, labelColor: SUBTEXT, labelFontSize: 11, domain: false, ticks: false, grid: false, labelPadding: 8 },
          },
          y: {
            field: 'Impressions', type: 'quantitative', title: null, scale: { domain: [0, 24000] },
            axis: { values: [0, 6000, 12000, 18000, 24000], labelExpr: "datum.value === 0 ? '0' : format(datum.value / 1000, ',.0f') + 'K'", labelColor: SUBTEXT, labelFontSize: 11, gridColor: GRID, domain: false, ticks: false, labelPadding: 8 },
          },
        },
      },
      // The zero line in the darker decorative-neutral ink.
      { data: { values: [{ v: 0 }] }, mark: { type: 'rule', color: ZERO, strokeWidth: 1 }, encoding: { y: { field: 'v', type: 'quantitative' } } },
      // The boundary token (the month) on a second, semibold line under the first day.
      {
        data: { values: [first] },
        mark: { type: 'text', text: 'Jan', fontWeight: 600, fontSize: 11, font: FONT, color: SUBTEXT, baseline: 'top', clip: false },
        encoding: { x: { field: 'Date', type: 'temporal' }, y: { value: HEIGHT + 22 } },
      },
    ],
  };
}

const wordmark = '<span style="display:inline-flex;align-items:center;gap:5px;font-weight:700;letter-spacing:-0.2px;color:#273333">'
  + '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 13 C7 8 3 7 1 7 C1 3 4 1 7 4 C10 1 13 3 13 7 C11 7 7 8 7 13Z" fill="#59CB59"/></svg>sproutsocial</span>';
const staticFrame = {
  style: { border: `1px solid ${GRID}`, background: '#FFFFFF' },
  footerHtml: `<div style="display:flex;justify-content:space-between;align-items:center;margin:2px 14px 10px;font-family:${FONT};font-size:11px;color:${SUBTEXT}">${wordmark}<span>sproutsocial.com</span></div>`,
};

/** Social impressions by network: the guide’s large-number rule (two decimals, trailing zeros kept). */
const NETWORKS = [
  { Network: 'Instagram', Impressions: 6450022339 },
  { Network: 'Facebook', Impressions: 5000120000 },
  { Network: 'TikTok', Impressions: 3204500000 },
  { Network: 'LinkedIn', Impressions: 1080000000 },
  { Network: 'Pinterest', Impressions: 950400000 },
];

function networksExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: { text: 'Instagram drove the most impressions', subtitle: 'Impressions by network, 2023' },
    width: W,
    height: HEIGHT,
    data: { values: NETWORKS },
    transform: [{ calculate: "datum.Impressions >= 1e9 ? format(datum.Impressions / 1e9, '.2f') + 'B' : format(datum.Impressions / 1e6, '.2f') + 'M'", as: 'label' }],
    encoding: {
      y: { field: 'Network', type: 'nominal', sort: null, title: null, axis: { labelAlign: 'right', labelColor: SUBTEXT, domain: false, ticks: false } },
      x: { field: 'Impressions', type: 'quantitative', title: null, axis: { labelExpr: "datum.value === 0 ? '0' : format(datum.value / 1e9, '.0f') + 'B'", gridColor: GRID, labelColor: SUBTEXT } },
    },
    layer: [
      { mark: { type: 'bar', color: ROTATION[0] } },
      { mark: { type: 'text', align: 'left', dx: 4, fontSize: 11, font: FONT, color: TEXT }, encoding: { text: { field: 'label' } } },
    ],
  };
}

/** The Seeds tooltip: ≥285px white card, 1px border, 6px radius, divided header and footer; 1px crosshair. */
function tooltipExpected() {
  const day = IMPRESSIONS[6];
  const at = { x: { field: 'Date', type: 'temporal' }, y: { field: 'Impressions', type: 'quantitative' } };
  const span = { x2: { field: 'Date' }, y2: { field: 'Impressions' } };
  const rect = (x0: number, x1: number, y0: number, y1: number, extra: Record<string, unknown>) => ({
    data: { values: [day] }, mark: { type: 'rect', xOffset: x0, x2Offset: x1, yOffset: y0, y2Offset: y1, ...extra }, encoding: { ...at, ...span },
  });
  const text = (dx: number, dy: number, value: string, extra: Record<string, unknown> = {}) => ({
    data: { values: [day] }, mark: { type: 'text', align: 'left', baseline: 'middle', dx, dy, fontSize: 12, font: FONT, color: TEXT, text: value, ...extra }, encoding: at,
  });
  const L = 14;
  const R = L + 200;
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: { text: 'Impressions', subtitle: 'All profiles, January 1–12, 2024', color: HEADLINE },
    width: W,
    height: HEIGHT,
    layer: [
      {
        data: { values: IMPRESSIONS },
        mark: { type: 'line', strokeWidth: 3, strokeJoin: 'miter', color: ROTATION[0] },
        encoding: {
          x: { ...at.x, title: null, axis: { format: '%b %-d', labelColor: SUBTEXT, domain: false, ticks: false, grid: false, tickCount: 4 } },
          y: { ...at.y, title: null, scale: { domain: [0, 24000] }, axis: { tickCount: 4, labelExpr: "datum.value === 0 ? '0' : format(datum.value / 1000, ',.0f') + 'K'", labelColor: SUBTEXT, gridColor: GRID } },
        },
      },
      { data: { values: [day] }, mark: { type: 'rule', color: ZERO, strokeWidth: 1 }, encoding: { x: at.x } },
      { data: { values: [day] }, mark: { type: 'point', filled: true, size: 60, color: ROTATION[0], stroke: '#FFFFFF', strokeWidth: 2 }, encoding: at },
      rect(L - 2, R + 2, -58, 60, { fill: 'rgba(39,51,51,0.08)', cornerRadius: 8 }),
      rect(L, R, -56, 56, { fill: '#FFFFFF', stroke: GRID, strokeWidth: 1, cornerRadius: 6 }),
      rect(L, R, -26, -25, { fill: GRID }),
      rect(L, R, 25, 26, { fill: GRID }),
      text(L + 14, -41, 'Sunday, January 7, 2024', { fontWeight: 600, color: HEADLINE }),
      text(L + 14, -9, '■', { color: ROTATION[0], fontSize: 10 }),
      text(L + 28, -9, 'Impressions'),
      text(R - 14, -9, '19,100', { align: 'right', fontWeight: 600 }),
      text(L + 14, 9, 'vs. previous day'),
      text(R - 14, 9, '↑ 31.7%', { align: 'right' }),
      text(L + 14, 41, 'Click to view posts', { color: SUBTEXT }),
    ],
  };
}

const EV4 = ['Norway', 'China', 'Germany', 'United States'];

const MIX = PREVIEW_CASES.find((c) => c.id === 'electricity-mix-area')!;
const MIX_ORDER = ['Coal', 'Gas', 'Hydro', 'Nuclear', 'Wind & solar', 'Other'];

/** Stacked area as the Highcharts styling draws it: 30% fills, each band edged by its full-strength line. */
function stackedAreaExpected() {
  const color = { field: 'Source', type: 'nominal', sort: MIX_ORDER, scale: { domain: MIX_ORDER, range: ROTATION } };
  const y = { field: 'Generation (TWh)', type: 'quantitative', stack: 'normalize', title: null, axis: { format: '.0%', labelColor: SUBTEXT, gridColor: GRID, tickCount: 5 } };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), legend: { ...(houseConfig(t).legend as object), orient: 'bottom', symbolType: 'circle', labelColor: TEXT, columns: 3 } },
    title: { text: 'World electricity generation by source', subtitle: 'Share of generation, 1990–2020' },
    width: W,
    height: HEIGHT,
    data: { values: MIX.data },
    encoding: {
      x: { field: 'Year', type: 'quantitative', title: null, axis: { format: 'd', values: [1990, 2000, 2010, 2020], labelColor: SUBTEXT, domainColor: GRID, ticks: false, grid: false } },
      y,
      color,
      order: { field: 'order', type: 'quantitative', sort: 'descending' },
    },
    transform: [{ calculate: `indexof(${JSON.stringify(MIX_ORDER)}, datum.Source)`, as: 'order' }],
    layer: [
      { mark: { type: 'area', opacity: 0.3 } },
      { mark: { type: 'line', strokeWidth: 2, strokeJoin: 'miter' } },
    ],
  };
}

/** Signed bars with the zero line drawn in the darker decorative-neutral ink. */
function zeroLineExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: { text: 'The world has warmed every decade since the 1960s', subtitle: 'Temperature anomaly vs 1951–1980, °C' },
    width: W,
    height: HEIGHT,
    layer: [
      {
        data: { values: ANOMALY },
        mark: { type: 'bar', color: ROTATION[0] },
        encoding: {
          x: { field: 'Decade', type: 'ordinal', title: null, axis: { labelAngle: 0, labelColor: SUBTEXT, domain: false, ticks: false } },
          y: { field: 'Anomaly (°C)', type: 'quantitative', title: null, axis: { labelColor: SUBTEXT, gridColor: GRID, tickCount: 5 } },
        },
      },
      { data: { values: [{ v: 0 }] }, mark: { type: 'rule', color: ZERO, strokeWidth: 1 }, encoding: { y: { field: 'v', type: 'quantitative' } } },
    ],
  };
}

function darkExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...houseConfig({ ...t, background: '#1B2424', grid: '#364141', text: '#F3F4F4', muted: '#C8CCCC' }),
      legend: { ...(houseConfig(t).legend as object), orient: 'bottom', labelColor: '#F3F4F4', symbolType: 'stroke', symbolStrokeWidth: 3 },
    },
    title: { text: 'Norway leads electric-car sales', subtitle: 'Share of new cars sold that are electric, %' },
    width: W,
    height: HEIGHT,
    data: { values: EV_SHARE.filter((row) => EV4.includes(row.Country)) },
    mark: { type: 'line', strokeWidth: 3, strokeJoin: 'miter' },
    encoding: {
      x: { field: 'Year', type: 'ordinal', title: null, axis: { labelAngle: 0, domainColor: '#364141', ticks: false } },
      y: { field: 'EV share (%)', type: 'quantitative', title: null },
      color: { field: 'Country', type: 'nominal', scale: { domain: EV4, range: DARK_ROTATION } },
    },
  };
}

const sprout: StyleGuideTheme = {
  id: 'sprout-social',
  org: 'Sprout Social — Seeds design system (data visualization & charts)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the Seeds chart pages and the published `seeds-react-theme` / `seeds-react-data-viz` CSS (the swatches on the site are rendered by script). The type is the system UI stack the CSS names.',
    'Stated directly: the twenty-colour rotation (the first ten as the core set, since the guide caps a chart at ten metrics, all twenty as the extended set), #DEE1E1 gridlines and x-axis line, no ticks, a darker #6E797A zero line, 11px #515E5F axis labels, 3px lines with mitred (sharp) joins, 30% area fills, 1px white cuts between donut slices, a key under the plot, no axis titles, values just past the bar end, two-decimal abbreviations.',
    'Not stated: the static-export frame (grey border, logo bottom-left, URL bottom-right), the two-line date labels with a semibold month, the tooltip card and the dark rotation. Trend colours were not recoverable from the guide, so `status` is left unset.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: '“Use sharp edges” specimen and the static-chart rules: one teal 3px polyline with sharp corners; light #DEE1E1 gridlines and a darker baseline; 11px grey labels; datetime labels with the month as a semibold second line; white background with a grey border, the Sprout logo bottom-left and the URL bottom-right.',
      current: 'Flint draws the teal line, the light grid and the zero rule. It cannot draw the export frame, the logo or the URL, and it labels days in its own format.',
      expected: 'The specimen’s line as twelve days of impressions, in the static-export frame.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: IMPRESSIONS,
        semantic_types: { Date: 'Date', Impressions: 'Count' },
        encodings: { x: 'Date', y: 'Impressions' },
        title: 'Impressions',
        subtitle: 'All profiles, January 1–12, 2024',
      }),
      expectedSpec: signatureExpected(),
      expectedFrame: staticFrame,
      observed: 'Close: Flint (left) draws the teal 3px polyline with sharp joins, #DEE1E1 gridlines and 11px grey labels. It labels “January 2024, 3, 4 … 12”, prints 25,000 rather than 24K, adds “; Impressions” to the deck, and its floor line is near-invisible. Expected (right): the bordered export with the darker zero line, day numbers with a semibold “Jan” under the first, the leaf wordmark bottom-left and sproutsocial.com bottom-right.',
    },
    {
      id: 'brand-mark',
      title: 'Static exports: logo bottom-left, URL bottom-right, grey border',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'brand-mark',
      rule: '“The Sprout Social or Bambu logo should be located in the bottom-left and a URL in the bottom-right”; static charts sit on white with a grey border.',
      current: '`furniture` offers a masthead tab and header/footer rules only — no logo, no text furniture, no outer border; Flint exports the bare chart.',
      expected: 'The signature’s expected frame: 1px #DEE1E1 border, the logo at the bottom left, “sproutsocial.com” at the bottom right.',
      proposal: '`furniture: [{ kind: "logo", src, anchor: "bottomLeft" }, { kind: "text", text: "{url}", anchor: "bottomRight" }, { kind: "border", color }]`, with a per-brand logo slot (Sprout vs Bambu).',
    },
    {
      id: 'two-line-dates',
      title: 'Datetime labels on two lines, the boundary token semibold',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'date-label-format',
      rule: 'Two-line datetime x labels: the day on the first line; at a boundary (a new month or year) the month/year on a second line in semibold (`hc-axis-label-secondary`).',
      current: 'No ThemeSpec field shapes date ticks; Flint writes one line per tick in one weight.',
      expected: 'Days 1–12 on the first line, “Jan” in semibold under the first (signature panel).',
      proposal: '`annotation.dateLabels: { boundary: "secondLine", boundaryWeight: "semibold" }`.',
    },
    {
      id: 'bar-values',
      addressed: { stage: 'A6', note: 'The values are in millions, so the suffix rule leaves them whole — and grouped: 1,429, 1,426 (A6).' },
      title: 'Values under 10,000 keep their thousands separator',
      kind: 'realization',
      severity: 'low',
      probe: 'number-format',
      rule: '“Right-align topic labels in bar charts to the y-axis. Numerical values should be left aligned with the end of a given topic’s data bar”; bars sorted highest to lowest; numbers use locale separators and are abbreviated only from 10,000.',
      current: 'Flint ranks the bars (`sortBy: "x"`), right-aligns the names and prints each value just past the bar end, as the house asks. But `numberFormat.thousands: "suffix"` replaces the separator rather than adding a suffix above a threshold, so four-digit values print bare.',
      expected: '“1,429” and “1,426” at the ends of the two long bars.',
      proposal: '`numberFormat.suffixFrom: 10000` — keep the locale separator below the threshold, abbreviate above it.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: { field: 'Country', sortBy: 'x', sortOrder: 'descending' }, x: 'Population' },
        title: 'India and China hold over a third of humanity',
        subtitle: 'Population, millions, 2023',
      }),
      expectedSpec: valueLabelProbe(theme, t, { placement: 'outside', color: TEXT }).expectedSpec,
      observed: 'Placement and order match: India and China first, names right-aligned to the axis, values just past each bar. The only differences are “1429”/“1426” without a separator, and the deck repeats the measure (“…, 2023; Population (m)”).',
    },
    {
      id: 'zero-line',
      addressed: { stage: 'GR2', note: '`grid.zero: { presence: "emphasised", color: "#6E797A" }` — the baseline at zero takes the zero rule’s ink and weight, so the line stands on a clearly darker rule (A7, GR2).' },
      title: 'The darker zero line goes missing when zero is the floor',
      kind: 'realization',
      severity: 'medium',
      probe: 'zero-line',
      rule: 'The y-axis zero plot line is stroked in the darker decorative-neutral #6E797A against #DEE1E1 gridlines (`y-axis-zero-line` in the data-viz CSS); the specimen’s baseline is the heaviest line in the plot.',
      current: 'Stated as `ink.structure.zero: "#6E797A"`, `structure.grid.zero: "full"` and `baseline: "full"`. Flint draws the dark rule where zero falls inside the domain (the gallery’s anomaly bars), but when zero is the floor — every count chart — the zero gridline is suppressed and the x-axis line, at `hairline`, renders almost white.',
      expected: 'The impressions line standing on a clearly darker #6E797A line at 0.',
      proposal: 'Draw `grid.zero` whenever zero is in the domain, including at its edge, and let `baseline` override the categorical axis line’s presence.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: IMPRESSIONS,
        semantic_types: { Date: 'Date', Impressions: 'Count' },
        encodings: { x: 'Date', y: 'Impressions' },
        title: 'Impressions',
        subtitle: 'All profiles, January 1–12, 2024',
      }),
      expectedSpec: signatureExpected(),
      observed: 'Sampled from the panels: Flint’s gridlines are #DEE1E1 but its line at 0 is #F8F9F9, practically invisible; the expected panel’s zero rule is #6E797A. In the anomaly tile, where zero is mid-plot, Flint’s zero rule does come out dark.',
    },
    {
      id: 'area-edge',
      addressed: { stage: 'M1', note: '`geometry.area.edge` is drawn as a line along the top of each area, stacked bands included, in the area’s own ink (M1).' },
      title: 'Stacked areas lose their edges',
      kind: 'realization',
      severity: 'medium',
      probe: 'area-edge',
      rule: 'Areas fill at 30% opacity (`fill-opacity: 0.3` in the line-area CSS) under the series line drawn at full strength, so each band keeps its true colour at its edge.',
      current: 'Stated as `geometry.area: { opacity: 0.3, edge: "full" }`. Flint applies the opacity but draws no edge, so six pale fills have to tell six series apart.',
      expected: 'Six 30% bands, each topped by its own 2px line in full colour.',
      proposal: 'Realise `geometry.area.edge` as a line layer on each band’s upper boundary.',
      flint: flintInput(theme, {
        chartType: 'Area Chart',
        data: MIX.data,
        semantic_types: MIX.semantic_types,
        encodings: MIX.encodings,
        title: 'World electricity generation by source',
        subtitle: 'Share of generation, 1990–2020',
        chartProperties: MIX.chartProperties,
      }),
      expectedSpec: stackedAreaExpected(),
      observed: 'Flint (left): six 30% washes with no lines, so Gas, Hydro and Other blur into three similar pinks and lilacs and the band edges are hard to find. Expected (right): the same washes, each topped by its full-strength line.',
    },
    {
      id: 'big-numbers',
      addressed: { stage: 'A6', note: '`compact: { per: "value" }` with `precision: "two"` — 6.45B, 5.00B, 3.20B, 1.08B, 950.40M (A6).' },
      title: 'Large numbers with exactly two decimals: 6.45B, 5.00B',
      kind: 'realization',
      severity: 'medium',
      probe: 'number-format',
      rule: '“6,450,022,339 use 6.45B, not 6B”: values ≥10,000 abbreviated with two decimals, trailing zeros kept (5.00B); currency always two decimals; null “-”, not applicable “N/A”.',
      current: '`annotation.numberFormat: { thousands: "suffix", precision: "two" }` is stated, but Flint’s suffix is SI (G for billions), the precision is trimmed rather than held at two, and the axis prints full numbers.',
      expected: '6.45B, 5.00B, 3.20B, 1.08B, 950.40M at the bar ends.',
      proposal: 'Honour `precision` with the suffix on labels and axes, and add `numberFormat.keepTrailingZeros` and `nullText` / `notApplicableText`.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: NETWORKS,
        semantic_types: { Network: 'Category', Impressions: 'Count' },
        encodings: { y: 'Network', x: 'Impressions' },
        title: 'Instagram drove the most impressions',
        subtitle: 'Impressions by network, 2023',
      }),
      expectedSpec: networksExpected(),
      observed: 'Flint (left) prints “6.45G, 5G, 3.2G, 1.08G, 950M”: SI “G” for billions, trailing zeros dropped, and a value axis reading 0 … 7,000,000,000 under it. Expected (right): 6.45B, 5.00B, 3.20B, 1.08B, 950.40M and an axis in B.',
    },
    {
      id: 'tooltip',
      title: 'Tooltip card: 285px, 16px padding, divided header and footer',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'tooltip-style',
      rule: 'Tooltip min-width 285px, 16px padding, 12px gap, white, 1px #DEE1E1 border, 6px radius, medium shadow; header and footer separated by full-width dividers; percent-change rows show both periods. A 1px #6E797A vertical crosshair; hovering a series does not dim the others.',
      current: '`interaction` holds `tooltipFormat` and selection paint only; Flint uses Vega’s default tooltip and draws no crosshair.',
      expected: 'The hover on January 7: crosshair, a white bordered card with a semibold date header, the metric row, the change row, and a footer action.',
      proposal: '`interaction.tooltip: { minWidth, padding, border, radius, shadow, sections: ["header", "rows", "footer"], dividers: true }` and `interaction.crosshair: { color, width }`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: IMPRESSIONS,
        semantic_types: { Date: 'Date', Impressions: 'Count' },
        encodings: { x: 'Date', y: 'Impressions' },
        title: 'Impressions',
        subtitle: 'All profiles, January 1–12, 2024',
      }),
      expectedSpec: tooltipExpected(),
      observed: 'Flint (left): the bare line. Expected (right): a 1px #6E797A crosshair on January 7, a white 200px card with a 1px border and 6px radius, “Sunday, January 7, 2024” in a divided header, Impressions 19,100 and “↑ 31.7%” rows, and a divided footer action.',
    },
    {
      id: 'dark-mode',
      title: 'Dark theme swaps to a brighter rotation',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'dark-mode',
      rule: 'The dark theme has its own rotation: #24E0C5, #D5A9FF, #FF76AE, #FFCD1C, #679EFF … (brighter, for contrast on dark containers).',
      current: 'A ThemeSpec is one mode with one rotation; a dark Seeds surface needs a separate theme with nothing tying the two together.',
      expected: 'The four EV series in the dark rotation on a dark container (the container colour is assumed: the research recovered only the rotation).',
      proposal: '`modes: { dark: { ink: { surface, text, structure, series } } }` within one ThemeSpec, chosen by the host.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE.filter((row) => EV4.includes(row.Country)),
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway leads electric-car sales',
        subtitle: 'Share of new cars sold that are electric, %',
      }),
      expectedSpec: darkExpected(),
      observed: 'Flint (left) draws the light rotation (teal, purple, raspberry, yellow) on white. Expected (right): the brighter dark rotation (#24E0C5, lilac, pink, yellow) on a dark container.',
    },
  ],
};

export default sprout;
