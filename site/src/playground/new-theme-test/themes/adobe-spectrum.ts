import type { ThemeSpec } from 'flint-chart';
import research from '../research/adobe-spectrum.json';
import { EV_SHARE, flintInput } from '../probes';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

/** Adobe Clean is proprietary; React Spectrum Charts falls back to Source Sans Pro, loaded here as Source Sans 3. */
const FONT = "'Adobe Clean', 'Source Sans 3', 'Source Sans Pro', -apple-system, 'Segoe UI', Roboto, sans-serif";
const CATEGORICAL = ['#0FB5AE', '#4046CA', '#F68511', '#DE3D82', '#7E84FA', '#72E06A', '#147AF3', '#7326D3', '#E8C600', '#CB5D00', '#008F5D', '#BCE931', '#5AA9FA', '#C038CC', '#F56BB7', '#FFE22E'];
const GRAY_800 = '#222222';
const GRAY_700 = '#464646';
const GRAY_300 = '#D5D5D5';
/** React Spectrum Charts' ROUNDED_SQUARE_PATH, in Vega's unit symbol space. */
const ROUNDED_SQUARE = 'M -1 -0.45 Q -1 -1 -0.45 -1 L 0.45 -1 Q 1 -1 1 -0.45 L 1 0.45 Q 1 1 0.45 1 L -0.45 1 Q -1 1 -1 0.45 Z';

const t: HouseTokens = {
  font: FONT,
  text: GRAY_800,
  muted: GRAY_700,
  grid: GRAY_300,
  axis: GRAY_800,
  background: '#FFFFFF',
  palette: CATEGORICAL,
  titleSize: 22,
  titleWeight: 'bold',
  subtitleSize: 14,
  labelSize: 14,
  lineWidth: 2.5,
  barCorner: 6,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'adobe-spectrum',
  label: 'Adobe Spectrum',
  ink: {
    // The guide's background is transparent: the chart takes the card it sits in.
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: GRAY_800, secondary: GRAY_700, muted: GRAY_700, inverse: '#FFFFFF' },
    structure: { grid: GRAY_300, axis: GRAY_800, rule: GRAY_800, zero: GRAY_800 },
    series: {
      single: CATEGORICAL[0],
      // categorical6 / categorical12 / categorical16 are prefixes of one token list.
      categorical: CATEGORICAL.slice(0, 6),
      categoricalExtended: CATEGORICAL,
      sequential: { stops: ['#FDE725', '#D2E21B', '#7AD151', '#35B779', '#1F988B', '#2A788E', '#39568C', '#472F7D', '#440154'], space: 'lab' },
      diverging: { stops: ['#49021E', '#9E2B46', '#DE6F86', '#F7C4D9', '#FAF0FF', '#C7D1F1', '#6095C9', '#29538F', '#0C1B4B'], neutral: '#FAF0FF', space: 'lab' },
    },
  },
  type: {
    headline: { family: FONT, size: 22, weight: 'bold', case: 'asIs', color: GRAY_800 },
    deck: { family: FONT, size: 14, color: GRAY_700 },
    axisLabel: { family: FONT, size: 14, color: GRAY_700 },
    axisTitle: { family: FONT, size: 14, weight: 'regular', color: GRAY_700 },
    keyLabel: { family: FONT, size: 14, color: GRAY_800 },
    valueLabel: { family: FONT, size: 14, color: GRAY_800 },
    annotation: { family: FONT, size: 14, color: GRAY_800 },
    footnote: { family: FONT, size: 14, color: GRAY_700 },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit', labelGap: 8 },
      measure: { line: 'omit', ticks: 'omit', labelGap: 8 },
    },
    grid: { measure: 'full', category: 'omit', style: 'solid', weight: 1, zero: 'full' },
    frame: 'omit',
    baseline: 'full',
  },
  marks: {
    bandFraction: 0.6,
    strokeWeight: 2.5,
    cornerRadius: 6,
    fillOpacity: 0.8,
    separator: { presence: 'full', width: 1, source: 'surface' },
    point: { presence: 'omit', size: 100 },
  },
  geometry: {
    line: { width: 2.5, interpolation: 'linear' },
    point: { presence: 'omit', size: 100 },
    area: { opacity: 0.8 },
    band: { fraction: 0.6, cornerRadius: 6 },
    arc: { gap: 2, gapStyle: 'rule' },
  },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'center' },
  dataLabels: { show: 'never', placement: 'outsideMark' },
  annotation: { axisTitles: 'always', axisTitlePlacement: 'rotated', axisTitleGap: 16, numberFormat: { thousands: 'suffix', compact: { style: 'upper', threshold: 1000 } } },
  layout: { titleBlock: { anchor: 'start', gap: 'tight' } },
};

const roundedLegend = { symbolType: ROUNDED_SQUARE, symbolSize: 180, symbolStrokeWidth: 0, columnPadding: 20, rowPadding: 8, labelFontSize: 14, labelColor: GRAY_800 };

/**
 * A line's key draws a hollow stroke symbol. An empty text layer on the same colour field makes
 * Vega-Lite fill the key's symbols, so the swatch is the guide's solid rounded square.
 */
const filledSwatch = (opacity?: string) => ({
  symbolType: ROUNDED_SQUARE,
  ...(opacity ? { encode: { symbols: { update: { opacity: { signal: opacity } } }, labels: { update: { opacity: { signal: opacity } } } } } : {}),
});
const keyFillLayer = (rows: unknown[], encoding: Record<string, unknown>) => ({ data: { values: rows }, mark: { type: 'text', text: '' }, encoding });

// ── 1. Signature: the docs' stacked horizontal bar ──────────────────────────
const OS = ['Windows', 'Mac', 'Other'];
const DOWNLOADS: { Browser: string; 'Operating system': string; Downloads: number }[] = [
  ['Chrome', 'Windows', 5], ['Chrome', 'Mac', 3], ['Chrome', 'Other', 2],
  ['Firefox', 'Windows', 3], ['Firefox', 'Mac', 3], ['Firefox', 'Other', 1],
  ['Safari', 'Windows', 3], ['Safari', 'Mac', 0], ['Safari', 'Other', 1],
].map(([Browser, os, Downloads]) => ({ Browser: Browser as string, 'Operating system': os as string, Downloads: Downloads as number }));

/** The stack drawn Other → Mac → Windows from zero, as the specimen does. */
const stackSegments = (() => {
  const out: Record<string, unknown>[] = [];
  for (const browser of ['Chrome', 'Firefox', 'Safari']) {
    let x = 0;
    for (const os of ['Other', 'Mac', 'Windows']) {
      const v = DOWNLOADS.find((d) => d.Browser === browser && d['Operating system'] === os)!.Downloads;
      out.push({ Browser: browser, 'Operating system': os, from: x, to: x + v });
      x += v;
    }
  }
  return out;
})();
const totals = ['Chrome', 'Firefox', 'Safari'].map((Browser) => ({ Browser, total: DOWNLOADS.filter((d) => d.Browser === Browser).reduce((s, d) => s + d.Downloads, 0) }));

function signature() {
  const yEnc = { field: 'Browser', type: 'nominal', sort: ['Chrome', 'Firefox', 'Safari'], scale: { paddingInner: 0.4, paddingOuter: 0.2 }, title: 'Browser', axis: { titleFontWeight: 'bold', titleColor: GRAY_800, labelColor: GRAY_800, titlePadding: 16 } };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...houseConfig(t),
      axis: { ...(houseConfig(t).axis as object), domain: false, ticks: false, labelPadding: 8, labelFontSize: 14, titleFontSize: 14 },
      legend: { ...(houseConfig(t).legend as object), ...roundedLegend, orient: 'bottom', direction: 'horizontal', titleFontWeight: 'bold', titleFontSize: 14, titleColor: GRAY_800, titlePadding: 8, offset: 24 },
    },
    width: 380,
    height: 200,
    layer: [
      {
        data: { values: totals },
        mark: { type: 'bar', color: CATEGORICAL[0], cornerRadiusEnd: 6 },
        encoding: {
          y: yEnc,
          x: { field: 'total', type: 'quantitative', scale: { domain: [0, 10] }, title: 'Downloads', axis: { grid: true, tickCount: 10, titleFontWeight: 'bold', titleColor: GRAY_800, titlePadding: 16 } },
        },
      },
      {
        data: { values: stackSegments.filter((s) => s['Operating system'] !== 'Windows') },
        mark: { type: 'bar', stroke: '#FFFFFF', strokeWidth: 1.5 },
        encoding: {
          y: { field: 'Browser', type: 'nominal', sort: ['Chrome', 'Firefox', 'Safari'] },
          x: { field: 'from', type: 'quantitative' },
          x2: { field: 'to' },
          color: { field: 'Operating system', type: 'nominal', scale: { domain: OS, range: CATEGORICAL.slice(0, 3) }, legend: { title: 'Operating system' } },
        },
      },
      {
        data: { values: [{ x: 0 }] },
        mark: { type: 'rule', color: GRAY_800, strokeWidth: 1.5 },
        encoding: { x: { field: 'x', type: 'quantitative' } },
      },
    ],
  };
}

// ── 2. Donut with a summary metric in the hole ──────────────────────────────
const VISITORS = [['Chrome', 10000], ['Firefox', 8300], ['Safari', 7000], ['Opera', 6200], ['Other', 4200], ['Brave', 3300], ['Edge', 1000]]
  .map(([Browser, Visitors], i) => ({ Browser: Browser as string, Visitors: Visitors as number, i }));
const VISITORS_TOTAL = VISITORS.reduce((s, d) => s + d.Visitors, 0);

function donutExpected() {
  const outer = 92;
  const k = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}K` : `${v}`);
  const rows = VISITORS.map((d) => ({ ...d, pct: `${Math.round((d.Visitors / VISITORS_TOTAL) * 100)}%  ${k(d.Visitors)}`, show: d.Visitors >= 3000 }));
  const theta = { field: 'Visitors', type: 'quantitative', stack: true };
  const order = { field: 'i', type: 'quantitative' };
  const color = { field: 'Browser', type: 'nominal', scale: { domain: VISITORS.map((d) => d.Browser), range: CATEGORICAL }, legend: null };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), legend: { disable: true } },
    width: W,
    height: 250,
    layer: [
      { data: { values: rows }, mark: { type: 'arc', outerRadius: outer, innerRadius: outer - 12, stroke: '#FFFFFF', strokeWidth: 2 }, encoding: { theta, order, color } },
      { data: { values: rows }, mark: { type: 'text', radius: outer + 30, dy: -8, fontSize: 13, fontWeight: 'bold', color: GRAY_800 }, encoding: { theta, order, text: { condition: { test: 'datum.show', field: 'Browser' }, value: '' } } },
      { data: { values: rows }, mark: { type: 'text', radius: outer + 30, dy: 8, fontSize: 13, color: GRAY_800 }, encoding: { theta, order, text: { condition: { test: 'datum.show', field: 'pct' }, value: '' } } },
      { data: { values: [{}] }, mark: { type: 'text', text: k(VISITORS_TOTAL), fontSize: 40, color: GRAY_800, dy: -8 } },
      { data: { values: [{}] }, mark: { type: 'text', text: 'Visitors', fontSize: 16, color: GRAY_800, dy: 22 } },
    ],
  };
}

// ── 3–4. EV lines: hover fade and dark mode ─────────────────────────────────
const EV4 = ['Norway', 'China', 'Germany', 'United States'];
const evRows = EV_SHARE.filter((r) => EV4.includes(r.Country));
const evFlint = (title: string) => flintInput(theme, {
  chartType: 'Line Chart',
  data: evRows,
  semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
  encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
  title,
});

function evExpected(o: { title: string; focus?: string; dark?: boolean }) {
  const dark = o.dark ?? false;
  const ink = dark
    ? { bg: '#1D1D1D', text: '#EBEBEB', label: '#D0D0D0', grid: '#4B4B4B' }
    : { bg: '#FFFFFF', text: GRAY_800, label: GRAY_700, grid: GRAY_300 };
  const tk: HouseTokens = { ...t, text: ink.text, muted: ink.label, grid: ink.grid, background: ink.bg, axis: ink.text };
  const cfg = houseConfig(tk);
  const enc = {
    x: { field: 'Year', type: 'ordinal', title: 'Year', axis: { labelAngle: 0 } },
    y: { field: 'EV share (%)', type: 'quantitative', title: 'EV share (%)', axis: { tickCount: 5 } },
    color: { field: 'Country', type: 'nominal', scale: { domain: EV4, range: CATEGORICAL }, legend: filledSwatch(o.focus ? `datum.value === '${o.focus}' ? 1 : 0.3` : undefined) },
  };
  // Faded and focused series as two layers: an opacity *encoding* would overwrite the key's own encode block.
  const lines: Record<string, unknown>[] = o.focus
    ? [
      { data: { values: evRows }, transform: [{ filter: `datum.Country !== '${o.focus}'` }], mark: { type: 'line', strokeWidth: 2.5, strokeOpacity: 0.2 }, encoding: enc },
      { data: { values: evRows }, transform: [{ filter: `datum.Country === '${o.focus}'` }], mark: { type: 'line', strokeWidth: 3 }, encoding: enc },
    ]
    : [{ data: { values: evRows }, mark: { type: 'line', strokeWidth: 2.5 }, encoding: enc }];
  lines.push(keyFillLayer(evRows, enc));
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...cfg,
      axis: { ...(cfg.axis as object), domain: false, ticks: false, labelPadding: 8, labelFontSize: 14, titleFontSize: 14 },
      legend: { ...(cfg.legend as object), ...roundedLegend, labelColor: ink.text, orient: 'bottom', direction: 'horizontal', offset: 20 },
    },
    title: { text: o.title, fontSize: 22, color: ink.text, offset: 10 },
    width: W,
    height: H,
    layer: [
      ...lines,
      { data: { values: [{ y: 0 }] }, mark: { type: 'rule', color: ink.text, strokeWidth: 1 }, encoding: { y: { field: 'y', type: 'quantitative' } } },
    ],
  };
}

// ── 5. Days with the month under the first, values in K ─────────────────────
const ACTIONS = ['Add Fallout', 'Add Freeform table', 'Add Line viz', 'Add Bar viz'];
const USERS: Record<string, number[]> = {
  'Add Fallout': [480, 480, 480, 320, 20, 80, 440],
  'Add Freeform table': [5300, 5100, 5050, 3400, 200, 800, 4900],
  'Add Line viz': [2250, 1100, 1550, 1400, 80, 280, 1420],
  'Add Bar viz': [3530, 3520, 3510, 3350, 3040, 3080, 3500],
};
const USER_ROWS = ACTIONS.flatMap((Action) => USERS[Action].map((Users, i) => ({ Date: `2024-11-${String(8 + i).padStart(2, '0')}`, Action, Users })));

function dailyExpected() {
  const cfg = houseConfig(t);
  const last = USER_ROWS.filter((r) => r.Date === '2024-11-14');
  const color = { field: 'Action', type: 'nominal', scale: { domain: ACTIONS, range: CATEGORICAL }, legend: filledSwatch() };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...cfg,
      axis: { ...(cfg.axis as object), domain: false, ticks: false, labelPadding: 8, labelFontSize: 14, titleFontSize: 14, titleFontWeight: 'normal' },
      legend: { ...(cfg.legend as object), ...roundedLegend, orient: 'bottom', direction: 'horizontal', columns: 3, offset: 20 },
    },
    width: W,
    height: H,
    layer: [
      {
        data: { values: USER_ROWS },
        mark: { type: 'line', strokeWidth: 2.5 },
        encoding: {
          x: {
            field: 'Date', type: 'temporal', title: null, scale: { type: 'utc' },
            axis: { tickCount: { interval: 'day', step: 1 }, ticks: true, tickColor: GRAY_300, tickSize: 6, labelExpr: "datum.index === 0 ? [utcFormat(datum.value, '%-d'), utcFormat(datum.value, '%b')] : utcFormat(datum.value, '%-d')", labelAlign: 'center' },
          },
          y: {
            field: 'Users', type: 'quantitative', title: 'Users',
            axis: { values: [0, 2000, 4000], labelExpr: "datum.value >= 1000 ? format(datum.value / 1000, '~g') + 'K' : datum.label" },
          },
          color,
        },
      },
      {
        data: { values: last },
        mark: { type: 'text', align: 'right', dy: -10, fontSize: 14, fontWeight: 'bold' },
        encoding: { x: { field: 'Date', type: 'temporal' }, y: { field: 'Users', type: 'quantitative' }, text: { field: 'Action' }, color },
      },
      { data: { values: [{ y: 0 }] }, mark: { type: 'rule', color: GRAY_800 }, encoding: { y: { field: 'y', type: 'quantitative' } } },
    ],
  };
}

const spectrum: StyleGuideTheme = {
  id: 'adobe-spectrum',
  org: 'Adobe Spectrum',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from React Spectrum Charts’ Spectrum 2 Vega config and colour tokens (the prose guide pages were unreachable). Adobe Clean is proprietary; every panel falls back to Source Sans 3, the face RSC itself names as fallback.',
    'Stated directly: the seafoam-first categorical token order (6 as `categorical`, all 16 as `categoricalExtended` — the guide’s count sets are prefixes, so nothing is lost), gray-800 / gray-700 / gray-300 inks, one 14px size for every axis, key and value label, the 22px left-anchored title, no axis lines or ticks with a dark rule at zero, value-axis gridlines only, 6px rounded value ends with a 0.4 band padding, 2.5px lines without points, 0.8 area opacity, white separators between stacked segments and donut wedges, a centred bottom key, Viridis and red–blue ramps, K-abbreviated thousands.',
    'Approximated: the transparent background (stated as white, since the guide expects a light Spectrum view behind it); the diverging default (RSC defaults to orange–yellow–seafoam but only publishes its end points, so the fully specified red–blue scheme is used).',
    'Not stated: the rounded-square key swatch, the donut’s summary metric, the two-line date axis, hover fading, the dark theme and the S/M/L size tiers — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'RSC’s stacked horizontal bar: Adobe Clean 14px throughout, bold axis titles, no axis lines or ticks, light grey gridlines on the value axis and a black rule at zero, 6px rounding only at the end of each stack, thin white gaps between segments, a centred bottom key with a bold title and rounded-square swatches; colours follow the series’ order in the data (Windows seafoam, Mac indigo, Other orange).',
      current: 'Flint states the inks, the 14px type, the rounding of the stack end, the white separators and the centred bottom key, and keeps the data order for colour. It has no rounded-square swatch and no way to bold the axis titles or title the key, and it sizes the plot by a band step rather than filling its container.',
      expected: 'The docs specimen (`bar_stackedHorizontal_light.png`) redrawn on its own data.',
      flint: flintInput(theme, {
        chartType: 'Stacked Bar Chart',
        data: DOWNLOADS,
        semantic_types: { Browser: 'Category', 'Operating system': 'Category', Downloads: 'Quantity' },
        encodings: { y: 'Browser', x: 'Downloads', color: 'Operating system' },
      }),
      expectedSpec: signature(),
      observed: 'Closer than expected: Flint keeps Windows seafoam / Mac indigo / Other orange, rounds only the stack’s end, cuts white gaps between segments, draws value gridlines and centres the key below. The differences: the plot is a short strip (three 12px bars in ~80px) where the specimen fills its box with 50px bars; the key has small square swatches and no “Operating system” title; axis titles are regular grey rather than bold; there is no dark rule at zero, only a light gridline; and Windows sits at the zero end where RSC stacks it last.',
    },
    {
      id: 'donut-summary',
      title: 'Thin donut with the total in the hole and two-line labels outside',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'pie-rules',
      rule: 'RSC’s donut is a thin ring with white separators, wedges in data order clockwise from 12 o’clock, a large summary metric (“40K”) over its label (“Visitors”) in the hole, and outside labels: bold category name, then “26%  10K”.',
      current: 'ThemeSpec can state the wedge gap but not the ring thickness, a centre metric, or a two-part label; Flint draws whatever donut its template defaults to, with a key.',
      expected: 'A ring about an eighth of its radius thick, “40K / Visitors” centred, labels outside each wedge, no key.',
      proposal: '`geometry.arc.ringFraction` for the donut’s thickness and `annotation.partToWhole: { centre: "total" | "none", labels: "outside", labelParts: ["category", "share", "value"] }`.',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: VISITORS.map(({ Browser, Visitors }) => ({ Browser, Visitors })),
        semantic_types: { Browser: 'Category', Visitors: 'Quantity' },
        encodings: { size: 'Visitors', color: 'Browser' },
      }),
      expectedSpec: donutExpected(),
      observed: 'Flint draws a thick donut (hole about 45% of the radius) with white wedge gaps and a vertical key on the right; nothing in the hole and no labels on the wedges. Expected: a thin ring, “40K / Visitors” in the hole, bold names with “share  value” outside, no key.',
    },
    {
      id: 'axis-k-suffix',
      addressed: { stage: 'A6', note: '`compact: { style: "upper", threshold: 1000 }` — the value axis reads 0, 1K, 2K … (A6).' },
      title: 'Axis values abbreviate with K; Flint prints 6,000',
      kind: 'realization',
      severity: 'medium',
      probe: 'number-format',
      rule: 'Large numbers are abbreviated on axes and labels: “0, 2K, 4K”, “40K”, “8.3K”.',
      current: 'Stated as `annotation.numberFormat.thousands: "suffix"`, but Flint reads `numberFormat` only for printed values (value labels); axis ticks keep the renderer’s grouped format.',
      expected: 'The S2 direct-label specimen: 0 / 2K / 4K on the value axis, bold end labels in each series’ colour, a rounded-square key below.',
      proposal: 'Apply `annotation.numberFormat` to measure-axis tick labels as well as value labels (it is the house’s number style, not a label setting), with `suffixCase: "upper"` for houses that write K rather than d3’s k.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: USER_ROWS,
        semantic_types: { Date: 'Date', Action: 'Category', Users: 'Quantity' },
        encodings: { x: 'Date', y: 'Users', color: 'Action' },
      }),
      expectedSpec: dailyExpected(),
      observed: 'Flint’s y axis reads 0, 1,000 … 6,000 despite `thousands: "suffix"`; expected reads 0 / 2K / 4K. Flint also adds a “Date” axis title and writes the first tick as “Nov 8, 2024”; it has no end labels and its key uses line swatches.',
    },
    {
      id: 'date-two-line',
      title: 'Day ticks with the month written once beneath',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'date-label-format',
      rule: 'Time axes print the day number at each tick and the month as a second line under the first tick of the month (“8 / Nov”, 9, 10 … 14).',
      current: 'No ThemeSpec field governs date tick text. Flint already writes the full date once and the day numbers after it (“Nov 8, 2024, 9, 10 …”, see the panel above), but on one line and with the year.',
      expected: 'Day numbers on the tick line; the month on a second line under the first tick only; no year when the context is a week.',
      proposal: '`annotation.dateLabels: { hierarchy: "stacked" | "inline", parentOnFirstTickOnly: true, year: "whenAmbiguous" }`.',
    },
    {
      id: 'baseline-rule',
      addressed: { stage: 'A7', note: 'The gray-800 rule is drawn at y = 0 under the line, the only dark line on the chart (A7).' },
      title: 'The dark rule at zero is stated but never drawn',
      kind: 'realization',
      severity: 'medium',
      probe: 'zero-line',
      rule: 'No axis lines and no ticks; the only dark line on the chart is a gray-800 1px rule at zero (the bar baseline, the floor of a line chart).',
      current: 'Stated as `structure.baseline: "full"` with `ink.structure.zero`/`axis` #222222. Grounding resolves `DesignDecisions.baseline`, but no realizer reads it; the separate zero rule is drawn only when the data cross zero, so on all-positive charts the floor is an ordinary light gridline.',
      expected: 'The same line chart with a #222222 rule along y = 0, gridlines above it in #D5D5D5.',
      proposal: 'Realise `structure.baseline` as a rule at the measure scale’s origin whenever the categorical axis line is omitted (or always, at its own presence), independent of the sign test used for `grid.zero`.',
      flint: evFlint('Norway leads electric-car sales'),
      expectedSpec: evExpected({ title: 'Norway leads electric-car sales' }),
      observed: 'Flint: the floor at 0 is the same light #D5D5D5 gridline as 20, 40 …; no axis line either, so nothing anchors the plot. Expected: one dark #222222 rule at zero. (In the gallery’s temperature-anomaly tile, where values cross zero, Flint does draw the dark zero rule.)',
    },
    {
      id: 'hover-fade',
      title: 'Hovering a series fades every other mark to 20%',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'focus-hover-state',
      rule: 'Hovering a mark or a key entry highlights that series and fades all others to 20% opacity (`FADE_FACTOR = 0.2`); the hovered line gains 0.5px; click on the key hides a series.',
      current: '`interaction` in ThemeSpec carries a tooltip format and a selection-boundary paint, nothing about what happens to the series that are *not* hovered; the chart is static.',
      expected: 'Norway hovered: its line at full strength and slightly heavier, the other three at 20%.',
      proposal: '`interaction.focus: { others: { opacity: 0.2 }, focused: { strokeDelta: 0.5 }, keyHover: true, keyClick: "toggle" }`, realised as a Vega-Lite point selection bound to the legend and the marks.',
      flint: evFlint('Norway leads electric-car sales'),
      expectedSpec: evExpected({ title: 'Norway leads electric-car sales', focus: 'Norway' }),
      observed: 'Flint draws all four series at full strength and the key is inert. Expected shows the hovered state: Norway at full ink and 3px, the others and their key entries faded.',
    },
    {
      id: 'dark-mode',
      title: 'Dark theme: the gray ramp inverts, the hues stay',
      kind: 'product-ui',
      severity: 'high',
      probe: 'dark-mode',
      rule: 'Light and dark themes are first-class: gray-800 text becomes #EBEBEB, gray-700 labels #D0D0D0, gray-300 gridlines #4B4B4B, on a #1D1D1D view; the categorical hues are the same in both.',
      current: 'A ThemeSpec states one set of inks. `variants` may not vary `ink`, so the dark theme has to be a second, hand-maintained document — and nothing ties the two together.',
      expected: 'The same chart on the dark view, every gray swapped by token, the series inks unchanged.',
      proposal: '`ink.modes: { dark: { surface, text, structure } }` (partial ink overrides selected by the host’s colour scheme), so one house carries both themes.',
      flint: evFlint('Norway leads electric-car sales'),
      expectedSpec: evExpected({ title: 'Norway leads electric-car sales', dark: true }),
      expectedFrame: { style: { background: '#1D1D1D', borderRadius: '4px' } },
      observed: 'Flint can only draw the light theme from this spec. The dark panel keeps seafoam, indigo, orange and magenta unchanged; indigo and magenta lose contrast on #1D1D1D (the guide accepts this — its palette is tuned for both), and the gridlines become #4B4B4B.',
    },
    {
      id: 'size-tiers',
      title: 'Strokes and type scale with the chart’s width',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'responsive-scale',
      rule: 'Charts narrower than 400px draw fonts, strokes, point sizes and label gaps at 0.75×; 400–800px at 1×; 800px and wider at 1.25×.',
      current: '`variants` can key on `canvasWidth`, but a variant may not change `type`, and `geometry` widths are absolute, so the house can only restate each size by hand per tier — and never its type.',
      expected: 'A 14px label is 10.5px in a 360px tile and 17.5px in a 900px one; a 2.5px line is 1.9px and 3.1px.',
      proposal: '`layout.scaleTiers: [{ maxWidth: 400, scale: 0.75 }, { minWidth: 800, scale: 1.25 }]`, applied to every type role and stroke after grounding.',
    },
  ],
};

export default spectrum;
