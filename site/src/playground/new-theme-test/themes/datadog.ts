import type { ThemeSpec } from 'flint-chart';
import research from '../research/datadog.json';
import { POPULATION, flintInput } from '../probes';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Noto Sans', NotoSans, 'Lucida Grande', 'Lucida Sans Unicode', sans-serif";
const TEXT = '#1f2137';
/** The rotated axis title in the previews is a light grey; DRUIDS publishes no token for it (sampled). */
const AXIS_TITLE = '#8b9397';
/** Faint horizontal gridlines, sampled from the Timeseries preview: DRUIDS publishes no grid token. */
const GRID = '#ececec';
const CLASSIC = ['#95cbff', '#3498eb', '#d7c3ff', '#7463e0', '#ffcd1d', '#fff095'];
const DATAVIZ_BLUE = '#3598ec';
const TOP_LIST = '#c1ddfd';
const TILE_BORDER = '#e2e3e9';
const DARK = { bg: '#1d1c1f', axis: 'rgba(255,255,255,0.76)', grid: '#3a393f', blue: '#6b9cc8', border: '#3a393f' };

const t: HouseTokens = {
  font: FONT,
  text: TEXT,
  muted: TEXT,
  grid: GRID,
  axis: null,
  background: '#ffffff',
  palette: CLASSIC,
  titleSize: 13,
  titleWeight: 'normal',
  labelSize: 11,
  lineWidth: 1.5,
  legendOrient: 'none',
};

const theme: ThemeSpec = {
  id: 'datadog',
  label: 'Datadog DRUIDS',
  ink: {
    surface: { source: 'house', canvas: '#ffffff' },
    text: { primary: TEXT, secondary: TEXT, muted: AXIS_TITLE, inverse: '#ffffff' },
    structure: { grid: GRID, axis: TEXT },
    series: {
      single: DATAVIZ_BLUE,
      categorical: CLASSIC,
      // "Colors assigned to series repeat if the number of series exceeds six" (R6).
      repeat: true,
    },
    accent: DATAVIZ_BLUE,
  },
  type: {
    headline: { family: FONT, size: 13, weight: 'regular', case: 'asIs', color: TEXT },
    deck: { family: FONT, size: 12, color: AXIS_TITLE },
    axisLabel: { family: FONT, size: 11, color: TEXT },
    axisTitle: { family: FONT, size: 11, weight: 'regular', color: AXIS_TITLE },
    keyLabel: { family: FONT, size: 11, color: TEXT },
    valueLabel: { family: FONT, size: 13, weight: 'bold', color: TEXT },
    display: { family: FONT, size: 32, weight: 'semibold', color: TEXT },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit' },
    },
    grid: { measure: 'full', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'hairline',
  },
  marks: {
    bandFraction: 0.9,
    strokeWeight: 1.5,
    cornerRadius: 0,
    fillOpacity: 1,
    separator: { presence: 'full', width: 1, source: 'surface' },
    point: { presence: 'omit' },
  },
  geometry: {
    line: { width: 1.5, interpolation: 'linear' },
    point: { presence: 'omit' },
    area: { opacity: 1, edge: 'omit' },
    band: { fraction: 0.9, cornerRadius: 0 },
    arc: { gap: 1, gapStyle: 'rule' },
  },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'whenAmbiguous', axisTitlePlacement: 'rotated', numberFormat: { thousands: 'suffix' } },
  layout: { density: 'compact', titleBlock: { anchor: 'start', gap: 'tight' } },
};

/** A Unitile: white, 1px light border, the title inside at the top-left. */
const TILE = { background: '#ffffff', border: `1px solid ${TILE_BORDER}`, borderRadius: '4px', padding: '8px 10px 6px', margin: '4px' };
const tileTitle = (text: string, color = TEXT) => `<div style="font-family:${FONT};font-size:13px;font-weight:400;color:${color};margin:0 0 6px 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:${W + 40}px">${text}</div>`;

// ── A timeseries: six hosts, one minute apart ───────────────────────────────
const HOSTS = ['web-01', 'web-02', 'db-01', 'db-02', 'cache-01', 'cache-02'];
const HOST_LEVELS: [number, number][] = [[3, 0.8], [22, 0.6], [5, 1.4], [9.5, 1.6], [1.2, 0.4], [16, 0.5]];
const pad = (n: number) => String(n).padStart(2, '0');
const SERIES = HOSTS.flatMap((Host, k) => Array.from({ length: 56 }, (_, i) => {
  const [base, amp] = HOST_LEVELS[k];
  const v = base + amp * Math.sin(i * 1.7 + k) + (amp / 2) * Math.sin(i * 0.45 + k * 2);
  const m = 9 * 60 + 25 + i;
  return { Time: `2024-05-14T${pad(Math.floor(m / 60))}:${pad(m % 60)}:00`, Host, 'CPU (%)': Math.round(Math.max(0, v) * 100) / 100 };
}));
const QUARTERS = [30, 45, 60, 75].map((m) => ({ year: 2024, month: 5, date: 14, hours: 9 + Math.floor(m / 60), minutes: m % 60 }));
const seriesFlint = (title: string) => flintInput(theme, {
  chartType: 'Line Chart',
  data: SERIES,
  semantic_types: { Time: 'DateTime', Host: 'Category', 'CPU (%)': { semanticType: 'Percentage', unit: '%' } },
  encodings: { x: 'Time', y: 'CPU (%)', color: 'Host' },
  title,
});

function timeseriesExpected(o: { dark?: boolean } = {}) {
  const ink = o.dark ? { text: DARK.axis, grid: DARK.grid, bg: DARK.bg } : { text: TEXT, grid: GRID, bg: '#ffffff' };
  const palette = o.dark ? [CLASSIC[0], DARK.blue, ...CLASSIC.slice(2)] : CLASSIC;
  const base = houseConfig({ ...t, text: ink.text, muted: ink.text, grid: ink.grid, background: ink.bg });
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...base, padding: { left: 2, right: 6, top: 6, bottom: 2 }, axis: { ...(base.axis as object), labelFontSize: 10.5, labelColor: ink.text, labelPadding: 4, domain: false, ticks: false }, legend: { disable: true } },
    width: W,
    height: H - 20,
    data: { values: SERIES },
    mark: { type: 'line', strokeWidth: 1.5, interpolate: 'linear' },
    encoding: {
      x: { field: 'Time', type: 'temporal', title: null, axis: { format: '%H:%M', values: QUARTERS, grid: false } },
      y: { field: 'CPU (%)', type: 'quantitative', title: 'Percent', axis: { titleColor: AXIS_TITLE, titleFontWeight: 'normal', titleFontSize: 11, values: [0, 5, 10, 15, 20, 25] } },
      color: { field: 'Host', type: 'nominal', sort: HOSTS, scale: { domain: HOSTS, range: palette } },
    },
  };
}

// ── Top List ────────────────────────────────────────────────────────────────
function topListExpected() {
  const rows = POPULATION.map((r) => ({ ...r, v: Math.round(r.Population) }));
  const y = { field: 'Country', type: 'nominal', sort: { field: 'Population', order: 'descending' }, axis: null, scale: { paddingInner: 0.06, paddingOuter: 0 } };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 44, right: 8, top: 4, bottom: 4 } },
    width: W - 30,
    height: 230,
    data: { values: rows },
    encoding: { y },
    layer: [
      { mark: { type: 'bar', color: TOP_LIST }, encoding: { x: { field: 'Population', type: 'quantitative', axis: null, scale: { domain: [0, 1450] } } } },
      { mark: { type: 'text', align: 'left', dx: 8, fontSize: 13, color: TEXT, font: FONT }, encoding: { x: { datum: 0, type: 'quantitative' }, text: { field: 'Country' } } },
      { mark: { type: 'text', align: 'right', dx: -8, fontSize: 13, fontWeight: 'bold', color: TEXT, font: FONT }, encoding: { x: { datum: 0, type: 'quantitative' }, text: { field: 'v', format: 'd' } } },
    ],
  };
}

// ── Donut: total in the hole, leader-line callouts, the tail as "other" ─────
const SERVICES: [string, number][] = [
  ['balance-checker', 10.74], ['auth-dotnet', 9.43], ['ad-server', 8.43], ['fraud-detector', 7.16], ['trade-executor', 7.16], ['web-store', 4.79],
  ['ledger', 4.4], ['quote-api', 3.9], ['cart', 3.6], ['search', 3.3], ['recommend', 3.0], ['email', 2.8], ['shipping', 2.6], ['currency', 2.4], ['payment', 0.8],
];
const SERVICE_ROWS = SERVICES.map(([Service, v]) => ({ Service, 'Logs (M)': v }));
const TOTAL = SERVICES.reduce((s, [, v]) => s + v, 0);

function donutExpected() {
  const main = SERVICES.slice(0, 6);
  const rest = SERVICES.slice(6);
  const rows = [...main.map(([Service, v], i) => ({ Service, v, c: CLASSIC[i % 6], i })), ...rest.map(([Service, v], j) => ({ Service, v, c: j % 2 ? '#d5d7de' : '#c4c7d1', i: 6 + j }))];
  const cx = 190;
  const cy = 120;
  const R = 82;
  let acc = 0;
  const callouts = main.map(([Service, v], i) => {
    const mid = (acc + v / 2) / TOTAL * Math.PI * 2;
    acc += v;
    const sx = Math.sin(mid);
    const sy = -Math.cos(mid);
    const right = sx >= 0;
    const p1 = { x: cx + R * sx, y: cy + R * sy };
    const p2 = { x: cx + (R + 12) * sx, y: cy + (R + 12) * sy };
    return { Service, v, right, p1, p2, p3: { x: cx + (right ? 1 : -1) * (R + 34), y: p2.y }, c: CLASSIC[i] };
  });
  // Callouts on one side keep 30px apart, so two neighbouring wedges never print over each other.
  for (const side of [true, false]) {
    const group = callouts.filter((k) => k.right === side).sort((a, b) => a.p2.y - b.p2.y);
    for (let i = 1; i < group.length; i++) {
      if (group[i].p2.y - group[i - 1].p3.y < 30) group[i].p3 = { ...group[i].p3, y: group[i - 1].p3.y + 30 };
    }
  }
  for (const k of callouts) if (k.p3.y !== k.p2.y) k.p2 = { x: k.p2.x, y: k.p3.y };
  const seg = (a: { x: number; y: number }, b: { x: number; y: number }, c: string) => ({ data: { values: [{}] }, mark: { type: 'rule', color: c, strokeWidth: 1.5, clip: false }, encoding: { x: { value: a.x }, y: { value: a.y }, x2: { value: b.x }, y2: { value: b.y } } });
  const txt = (p: { x: number; y: number }, text: string, right: boolean, dy: number, bold: boolean) => ({ data: { values: [{}] }, mark: { type: 'text', text, align: right ? 'left' : 'right', dx: right ? 3 : -3, dy, fontSize: 11.5, fontWeight: bold ? 'bold' : 'normal', color: TEXT, font: FONT, clip: false }, encoding: { x: { value: p.x }, y: { value: p.y } } });
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: 6 },
    width: 380,
    height: 240,
    layer: [
      {
        data: { values: rows },
        mark: { type: 'arc', outerRadius: R, innerRadius: R * 0.6, stroke: '#ffffff', strokeWidth: 1 },
        encoding: { theta: { field: 'v', type: 'quantitative', stack: true }, order: { field: 'i', type: 'quantitative' }, color: { field: 'c', type: 'nominal', scale: null, legend: null } },
      },
      { data: { values: [{}] }, mark: { type: 'text', text: `${TOTAL.toFixed(1)}M`, fontSize: 26, fontWeight: 600, color: TEXT, font: FONT }, encoding: { x: { value: cx }, y: { value: cy } } },
      ...callouts.flatMap((k) => [seg(k.p1, k.p2, k.c), seg(k.p2, k.p3, k.c), txt(k.p3, k.Service, k.right, -7, false), txt(k.p3, `${k.v.toFixed(2)}M`, k.right, 7, true)]),
    ],
  };
}

// ── Stacked bars over time ──────────────────────────────────────────────────
const FUNCTIONS = ['ingest', 'resize', 'notify', 'billing', 'export'];
const BUCKETS = Array.from({ length: 36 }, (_, i) => i);
const THROTTLED = BUCKETS.flatMap((i) => FUNCTIONS.map((Function, k) => {
  const m = 16 * 60 + 40 + i;
  return { Time: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`, Function, Throttled: Math.max(0.2, Math.round((2.4 - k * 0.3 + 1.1 * Math.sin(i * 0.9 + k * 1.7)) * 10) / 10) };
}));
function stackedExpected() {
  const base = houseConfig(t);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...base, padding: { left: 2, right: 6, top: 6, bottom: 2 }, axis: { ...(base.axis as object), labelFontSize: 10.5, domain: false, ticks: false }, legend: { disable: true } },
    width: W,
    height: H - 20,
    data: { values: THROTTLED },
    mark: { type: 'bar', stroke: '#ffffff', strokeWidth: 0.5 },
    encoding: {
      x: { field: 'Time', type: 'ordinal', title: null, scale: { paddingInner: 0.18, paddingOuter: 0.05 }, axis: { labelAngle: 0, values: ['16:45', '17:00', '17:15'] } },
      y: { field: 'Throttled', type: 'quantitative', title: null, stack: 'zero', axis: { tickCount: 6 } },
      color: { field: 'Function', type: 'nominal', sort: FUNCTIONS, scale: { domain: FUNCTIONS, range: CLASSIC } },
      order: { field: 'Function', sort: 'ascending' },
    },
  };
}

const datadog: StyleGuideTheme = {
  id: 'datadog',
  org: 'Datadog (DRUIDS design system)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the DRUIDS “Dataviz & Graphing” page text, the DRUIDS CSS tokens and the public widget-colour guide. Noto Sans is the house face and is loaded here.',
    'Stated directly: the six-colour Classic palette (light blue, blue, lilac, purple, yellow, pale yellow) — repeating after six (`repeat: true`); the --ui-dataviz-blue #3598ec single-series ink; #1f2137 for text and axis labels; 13px regular titles (the guide’s floor); faint horizontal gridlines only, no axis lines or ticks; 1.5px unsmoothed lines without points; solid stacked areas; flat-ended bars with thin white gaps; compact density; SI-suffixed numbers; a bottom-left key when there is one.',
    'Approximated: the gridline (#ececec) and axis-title (#8b9397) greys, sampled from the official preview images since DRUIDS publishes no token for them; no sequential or diverging ramps are stated, as the guide names the families (purple, orange, … cool, warm) without hex values.',
    'Not stated: the dashboard tile, the Top List’s inside labels and value column, the donut’s total and callouts with the “Other” bundle, the dark-mode inks and the axis-text underlay — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'A Timeseries widget in its Unitile: white tile with a thin light-grey border and a 13px regular title inside at the top-left; thin unsmoothed lines in the Classic palette; faint horizontal gridlines only; no axis lines or ticks; small dark labels, HH:MM along the bottom, a light-grey rotated “Percent”; no key — series are identified on hover.',
      current: 'Flint states the palette, line weight, faint grid, absent axes and the 13px regular title. It has no tile to put the chart in, and it adds a key below the plot.',
      expected: 'The DRUIDS Timeseries preview, in its tile.',
      flint: seriesFlint('CPU utilisation by host'),
      expectedSpec: timeseriesExpected(),
      expectedFrame: { style: TILE, headerHtml: tileTitle('CPU utilisation by host') },
      observed: 'Flint’s body is close: thin unsmoothed Classic-palette lines, faint horizontal grid, no axis lines or ticks, a 13px regular title, a grey rotated y title. Differences: no tile around it; a two-row key below that the guide leaves to hover; the first time tick reads “May 14, 2024 09:…” (truncated) and later ones mix “9:45” with “10 AM”, where the preview prints 09:30 · 09:45 · 10:00 · 10:15; the y title is the field name “CPU (%)” rather than the unit word “Percent”.',
    },
    {
      id: 'top-list',
      title: 'Top List: names inside the bars, bold values in a column to their left',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'value-label-placement',
      rule: '“A Top List is a horizontal bar chart that sorts entities from most to least”: one pale blue for every bar, thin white gaps, flat ends; the category name inside each bar at its left; the value bold, right-aligned in a column left of the bars; no axes, gridlines or key.',
      current: '`dataLabels.placement` offers `atMark`, `outsideMark` or `column`, but nothing puts the *category* label inside the bar, and the value column cannot be set before the bars. Flint keeps the category axis and the value axis.',
      expected: 'The preview’s Top List on the population data.',
      proposal: '`labels.categoryPlacement: "axis" | "insideBar" | "aboveBar"` beside `dataLabels.placement: "leadingColumn"`, with `structure.axis.measure.suppressWhenValuesPrinted` doing the rest.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: 'Country', x: 'Population' },
        chartProperties: { showTextLabels: true },
      }),
      expectedSpec: topListExpected(),
      observed: 'Flint draws a ranked bar chart with bold values at the bar ends (the theme’s bold `valueLabel` shows), but keeps the country axis on the left, the 0–1,500 value axis and its title, and paints the bars in the saturated dataviz blue. Expected: pale blue bars, names inside, bold values in a column to the left, no axes. Flint also stops at eight countries here because the probe data has eight; the Top List would show them all.',
    },
    {
      id: 'donut',
      title: 'Donut: the total in the hole, leader-line callouts, the tail bundled',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'pie-rules',
      rule: '“Smaller slices are bundled together automatically in an ‘Other’ category … 4 to 7 main categories are ideal”; the Pie/Sunburst widget is a donut with a large bold total in the centre and leader-line callouts outside: the name in regular, the value bold beneath.',
      current: 'ThemeSpec has no centre metric, no callout style and no tail rule for wedges. Flint draws all fifteen services as wedges, colours them from the cycled palette and lists them in a key.',
      expected: 'Six named wedges with coloured leader lines and “name / value” callouts; the nine small services as grey slivers; 74.5M in the hole.',
      proposal: '`annotation.partToWhole: { centre: "total", labels: "callout", maxWedges: 7, tail: { label: "Other", ink: "overflow" } }`.',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: SERVICE_ROWS,
        semantic_types: { Service: 'Category', 'Logs (M)': 'Quantity' },
        encodings: { size: 'Logs (M)', color: 'Service' },
        title: 'Indexed logs by service',
      }),
      expectedSpec: donutExpected(),
      expectedFrame: { style: TILE, headerHtml: tileTitle('Indexed logs by service') },
      observed: 'Flint: fifteen wedges cycling the six Classic colours, so ledger, quote-api, cart … repeat the inks of the top six and become indistinguishable from them; a fifteen-row key on the right; nothing in the hole. Expected: six coloured wedges with callouts, the nine small services as grey slivers, 74.5M centred.',
    },
    {
      id: 'stacked-timeseries',
      title: 'Stacked bars over time: every minute labelled, turned and shrunk',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'label-thinning',
      rule: 'Timeseries can be drawn as stacked bars: one column per time bucket, narrow 1–2px gaps, flat ends, the Classic colours cycling up each stack; minutes labelled sparsely (16:45, 17:00 …).',
      current: 'The bars are stated (`bandFraction: 0.9`, `cornerRadius: 0`, a 1px surface separator). The time buckets arrive as `Time` categories, and Flint labels a banded axis band by band: with 36 buckets it turns every label 45° and shrinks it, instead of thinning to a few round times as it does on a continuous time axis.',
      expected: 'The palette guide’s “Lambda throttled invocation attempts” widget, on synthetic data: flat labels at 16:45, 17:00, 17:15 only.',
      proposal: 'Thin band labels for ordered temporal categories (`Time`, `Hour`, `Date` strings) to round values, as for a temporal scale, before turning them; let `labels.` — stated by this theme — forbid the turn.',
      flint: flintInput(theme, {
        chartType: 'Stacked Bar Chart',
        data: THROTTLED,
        semantic_types: { Time: 'Time', Function: 'Category', Throttled: 'Count' },
        encodings: { x: 'Time', y: 'Throttled', color: 'Function' },
        title: 'Throttled invocations by function',
      }),
      expectedSpec: stackedExpected(),
      expectedFrame: { style: TILE, headerHtml: tileTitle('Throttled invocations by function') },
      observed: 'Flint’s stacked columns, colours and thin gaps match the widget, but the x axis prints all 36 minutes (16:40 … 17:15) turned 45° at about 7px, and adds a key and a “Throttled” title. Expected: three flat labels and no key.',
    },
    {
      id: 'dark-mode',
      title: 'Every widget has a dark mode',
      kind: 'product-ui',
      severity: 'high',
      probe: 'dark-mode',
      rule: 'Light and dark variants ship for every widget: the axis ink becomes white at 76%, the dataviz blue shifts from #3598ec to #6b9cc8, the tile goes near-black, and axis text keeps an 85% underlay in the dark surface colour.',
      current: 'One ThemeSpec holds one set of inks; `variants` cannot change ink, so the dark tile is a second theme kept in step by hand — including the one palette entry that changes.',
      expected: 'The Timeseries tile in dark mode.',
      proposal: '`ink.modes.dark` with partial overrides (text, structure, and a single `series.categorical[1]` replacement), selected by the host.',
      flint: seriesFlint('CPU utilisation by host'),
      expectedSpec: timeseriesExpected({ dark: true }),
      expectedFrame: { style: { ...TILE, background: DARK.bg, border: `1px solid ${DARK.border}` }, headerHtml: tileTitle('CPU utilisation by host', '#ffffff') },
      observed: 'Flint can only draw the light tile. In the dark tile the pale Classic inks (light blue, lilac, pale yellow) gain contrast, the dataviz blue shifts to the duller #6b9cc8, and the 76%-white axis text stays readable.',
    },
    {
      id: 'palette-cycle',
      addressed: { stage: 'R6', note: '`ink.series.repeat: true` replaces the hand-written cycle (a donut still folds its tail).' },
      title: 'The palette cycles after six; ThemeSpec makes the cycle be written out',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'count-palette',
      rule: '“Colors assigned to series repeat if the number of series exceeds six. Adjacent series typically have distinct colors.”',
      current: 'Past the categorical set, grounding takes `categoricalExtended`, then `overflow`, else gives up on the house set. A cycling house must repeat its six inks by hand (this theme lists them three times), and still stops after eighteen.',
      expected: 'Series 7 takes light blue again, series 8 blue, and so on, however many there are.',
      proposal: '`ink.series.categoricalOverflow: "cycle" | "overflowInk" | "extend"`.',
    },
    {
      id: 'axis-underlay',
      title: 'Axis text sits on an 85% underlay',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'axis-label-alignment',
      rule: '`--ui-dataviz-graph-axis-text-underlay`: a semi-opaque (85%) surface-coloured backing behind axis text, so labels stay legible where data runs under them.',
      current: 'ThemeSpec type roles have family, size, weight, style, case and colour; no halo or underlay.',
      expected: 'Axis labels with a soft surface-coloured halo when they overlap marks.',
      proposal: '`TypeRole.halo: { color: "surface", opacity: 0.85, width: 3 }`, realised as a text stroke behind the glyphs.',
    },
  ],
};

export default datadog;
