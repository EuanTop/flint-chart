import type { ThemeSpec } from 'flint-chart';
import research from '../research/aws-cloudscape.json';
import { cardProbe, flintInput } from '../probes';
import { PREVIEW_CASES } from '../../../shared/preview-cases';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Open Sans', 'Helvetica Neue', Roboto, Arial, sans-serif";
const TEXT = '#0f141a';
const SECONDARY = '#424650';
const LINE = '#dedee3';
const CATEGORICAL = ['#688ae8', '#c33d69', '#2ea597', '#8456ce', '#e07941', '#3759ce', '#962249', '#096f64', '#6237a7', '#a84401'];
const CATEGORICAL_20 = [...CATEGORICAL, '#273ea5', '#780d35', '#03524a', '#4a238b', '#7e3103', '#1b2b88', '#ce567c', '#003e38', '#9469d6', '#602400'];
const SEVERITY = { critical: '#7d2105', high: '#ba2e0f', medium: '#cc5f21', low: '#b2911c', positive: '#67a353', info: '#3184c2', neutral: '#8c8c94' };
const DARK = { container: '#161d26', text: '#c6c6cd', heading: '#ffffff', line: '#424650', palette: ['#486de8', '#e07f9d', '#018977', '#b088f5', '#c55305'] };

/** The Cloudscape container: white, 16px corners, the soft two-layer shadow of the visual refresh. */
const CARD = { background: '#ffffff', borderRadius: '16px', boxShadow: '0 1px 1px 0 rgba(0,7,22,0.12), 0 1px 8px 2px rgba(0,7,22,0.12)', padding: '20px 20px 14px', margin: '6px' };
const cardHeader = (text: string, color = TEXT) => `<div style="font-family:${FONT};font-size:18px;font-weight:700;color:${color};margin:0 0 4px 4px">${text}</div>`;

const t: HouseTokens = {
  font: FONT,
  text: TEXT,
  muted: SECONDARY,
  grid: LINE,
  axis: LINE,
  background: '#ffffff',
  palette: CATEGORICAL,
  titleSize: 18,
  titleWeight: 'bold',
  subtitleSize: 14,
  labelSize: 12,
  lineWidth: 2,
  barCorner: 4,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'aws-cloudscape',
  label: 'AWS Cloudscape',
  ink: {
    surface: { source: 'house', canvas: '#ffffff' },
    text: { primary: TEXT, secondary: SECONDARY, muted: SECONDARY, inverse: '#ffffff' },
    structure: { grid: LINE, axis: LINE, rule: '#656871', connector: '#656871' },
    series: {
      single: CATEGORICAL[0],
      categorical: CATEGORICAL,
      categoricalExtended: CATEGORICAL_20,
      sequential: { stops: ['#529ccb', '#3184c2', '#0273bb', '#0166ab', '#015b9d', '#015292', '#014a87', '#01437d', '#003c75', '#00366d'], space: 'lab' },
      status: { positive: SEVERITY.positive, negative: SEVERITY.high, neutral: SEVERITY.neutral },
    },
    accent: '#006ce0',
  },
  type: {
    headline: { family: FONT, size: 18, weight: 'bold', case: 'asIs', color: TEXT },
    deck: { family: FONT, size: 14, color: SECONDARY },
    axisLabel: { family: FONT, size: 12, color: SECONDARY },
    axisTitle: { family: FONT, size: 14, weight: 'bold', color: TEXT },
    keyLabel: { family: FONT, size: 14, color: TEXT },
    valueLabel: { family: FONT, size: 14, weight: 'bold', color: TEXT },
    annotation: { family: FONT, size: 12, color: SECONDARY },
    footnote: { family: FONT, size: 12, color: SECONDARY },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1, ticks: 'full', tickLength: 'short', tickDirection: 'outward' },
      measure: { line: 'omit', ticks: 'omit' },
    },
    grid: { measure: 'full', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: {
    bandFraction: 0.85,
    strokeWeight: 2,
    cornerRadius: 4,
    fillOpacity: 0.4,
    separator: { presence: 'full', width: 2, source: 'surface' },
    point: { presence: 'omit', size: 28 },
    reference: { presence: 'full', style: 'dashed', weight: 2, label: false },
  },
  geometry: {
    line: { width: 2, interpolation: 'linear' },
    point: { presence: 'omit', size: 28 },
    area: { opacity: 0.4, edge: 'full' },
    band: { fraction: 0.85, cornerRadius: 4 },
    arc: { gap: 2, gapStyle: 'rule' },
  },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'whenAmbiguous', axisTitlePlacement: 'flatAboveAxis', unitsInAxisTitle: true, numberFormat: { thousands: 'suffix' } },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' }, density: 'normal' },
  chartDefaults: { 'Donut Chart': { innerRadius: 80 } },
};

const legendSquare = { symbolType: 'square', symbolSize: 150, labelFontSize: 14, labelColor: TEXT, orient: 'bottom', direction: 'horizontal', columnPadding: 14, offset: 16 };

/** Cloudscape's chart body: bold flat y title above the axis, faint grid, x baseline with short ticks. */
function cloudscapeConfig(ink: { text: string; muted: string; line: string; bg: string }) {
  const base = houseConfig({ ...t, text: ink.text, muted: ink.muted, grid: ink.line, axis: ink.line, background: ink.bg });
  return {
    ...base,
    padding: { left: 4, right: 8, top: 4, bottom: 4 },
    axis: { ...(base.axis as object), labelFontSize: 12, labelColor: ink.muted, labelPadding: 6 },
    axisX: { ...(base.axisX as object), domain: true, domainColor: ink.line, ticks: true, tickColor: ink.line, tickSize: 6 },
    axisY: {
      ...(base.axisY as object), domain: false, ticks: false,
      titleAngle: 0, titleAlign: 'left', titleAnchor: 'end', titleBaseline: 'bottom', titleX: -30, titleY: -14,
      titleFontSize: 14, titleFontWeight: 'bold', titleColor: ink.text,
    },
    legend: { ...(base.legend as object), ...legendSquare, labelColor: ink.text },
  };
}

// ── 1. Signature: "Configuration changes" ───────────────────────────────────
const SERVICES = ['S3', 'RDS', 'EC2'];
const CHANGES = ([
  ['April 6', 207, 128, 232], ['April 7', 116, 96, 137], ['April 8', 165, 95, 143], ['April 9', 166, 132, 162], ['April 10', 164, 155, 210],
] as [string, number, number, number][]).flatMap(([Date, ...v]) => SERVICES.map((Service, i) => ({ Date, Service, Total: v[i] * 1000 })));

function signature() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: cloudscapeConfig({ text: TEXT, muted: SECONDARY, line: LINE, bg: '#ffffff' }),
    width: W,
    height: H,
    data: { values: CHANGES },
    mark: { type: 'bar', cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4, stroke: '#ffffff', strokeWidth: 2 },
    encoding: {
      x: { field: 'Date', type: 'nominal', sort: null, title: null, scale: { paddingInner: 0.15, paddingOuter: 0.05 }, axis: { labelAngle: 0 } },
      xOffset: { field: 'Service', sort: SERVICES },
      y: { field: 'Total', type: 'quantitative', title: 'Total', scale: { domain: [0, 250000] }, axis: { values: [0, 50000, 100000, 150000, 200000, 250000], labelExpr: "datum.value === 0 ? '0' : format(datum.value, '~s')" } },
      color: { field: 'Service', type: 'nominal', sort: SERVICES, scale: { range: CATEGORICAL } },
    },
  };
}

// ── CPU utilisation, five instances at five-minute steps ────────────────────
const HALF_HOURS = [0, 30, 60, 90, 120, 150].map((m) => ({ year: 2024, month: 4, date: 6, hours: 19 + Math.floor(m / 60), minutes: m % 60 }));
const INSTANCES = ['i-a83w', 'i-2v9s', 'i-1s98', 'i-c0e4', 'i-a4b3'];
const LEVELS: [number, number, number][] = [[50, 5, 0], [18, 5, 0], [30, 4, 1.7], [70, 7, 0], [6, 2, 0]];
const CPU = INSTANCES.flatMap((Instance, k) => Array.from({ length: 31 }, (_, i) => {
  const [base, amp, slope] = LEVELS[k];
  const v = base + slope * i + amp * Math.sin(i * 0.9 + k * 1.3) + (amp / 2) * Math.sin(i * 2.3 + k);
  const minutes = 19 * 60 + i * 5;
  return { Time: `2024-04-06T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`, Instance, 'Percent (%)': Math.round(Math.max(1, Math.min(98, v)) * 10) / 10 };
}));
const cpuFlint = (title: string) => flintInput(theme, {
  chartType: 'Line Chart',
  data: CPU,
  semantic_types: { Time: 'DateTime', Instance: 'Category', 'Percent (%)': { semanticType: 'Percentage', unit: '%' } },
  encodings: { x: 'Time', y: 'Percent (%)', color: 'Instance' },
  title,
});

function cpuExpected(o: { dark?: boolean; cursor?: string }) {
  const ink = o.dark
    ? { text: DARK.heading, muted: DARK.text, line: DARK.line, bg: DARK.container }
    : { text: TEXT, muted: SECONDARY, line: LINE, bg: '#ffffff' };
  const palette = o.dark ? DARK.palette : CATEGORICAL;
  const x = { field: 'Time', type: 'temporal', title: null, axis: { format: '%H:%M', values: HALF_HOURS } };
  const color = { field: 'Instance', type: 'nominal', sort: INSTANCES, scale: { domain: INSTANCES, range: palette }, legend: { symbolType: 'M -1 0 L 1 0', symbolStrokeWidth: 4, symbolStrokeCap: 'round', symbolSize: 120 } };
  const at = o.cursor ? CPU.filter((r) => r.Time === o.cursor) : [];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...cloudscapeConfig(ink), background: ink.bg },
    width: W,
    height: H,
    layer: [
      {
        data: { values: CPU },
        mark: { type: 'line', strokeWidth: 2 },
        encoding: {
          x,
          y: { field: 'Percent (%)', type: 'quantitative', title: 'Percent (%)', scale: { domain: [0, 100] }, axis: { values: [0, 20, 40, 60, 80, 100] } },
          color,
        },
      },
      ...(o.cursor ? [
        { data: { values: [{ Time: o.cursor }] }, mark: { type: 'rule', color: '#8c8c94', strokeWidth: 1 }, encoding: { x: { field: 'Time', type: 'temporal' } } },
        { data: { values: at }, mark: { type: 'circle', size: 60, stroke: '#ffffff', strokeWidth: 2, opacity: 1 }, encoding: { x: { field: 'Time', type: 'temporal' }, y: { field: 'Percent (%)', type: 'quantitative' }, color } },
      ] : []),
    ],
  };
}

/** Cloudscape's details popover, pinned at the cursor: header time, then a row per series with its value. */
function popoverHtml(time: string) {
  const rows = CPU.filter((r) => r.Time === time).sort((a, b) => INSTANCES.indexOf(a.Instance) - INSTANCES.indexOf(b.Instance));
  const body = rows.map((r) => `<div style="display:flex;align-items:center;gap:6px;margin-top:4px"><span style="display:inline-block;width:12px;height:4px;border-radius:2px;background:${CATEGORICAL[INSTANCES.indexOf(r.Instance)]}"></span><span style="flex:1">${r.Instance}</span><span style="font-weight:400;margin-left:14px">${r['Percent (%)'].toFixed(1)}</span></div>`).join('');
  return `<div style="position:absolute;z-index:3;left:236px;top:70px;width:150px;background:#fff;border:1px solid #c6c6cd;border-radius:8px;box-shadow:0 4px 20px 1px rgba(0,7,22,0.10);padding:10px 12px;font-family:${FONT};font-size:12px;color:${TEXT};line-height:1.3">`
    + `<div style="font-weight:700;font-size:13px;padding-bottom:6px;border-bottom:1px solid ${LINE}">${time.slice(11, 16)}</div>${body}</div>`;
}

// ── Severity donut ──────────────────────────────────────────────────────────
const FINDINGS = [['Critical', 32], ['High', 24], ['Medium', 22], ['Low', 14], ['Undefined', 8]].map(([Severity, Findings]) => ({ Severity: Severity as string, Findings: Findings as number }));
function severityExpected() {
  const domain = FINDINGS.map((d) => d.Severity);
  const outer = 88;
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...cloudscapeConfig({ text: TEXT, muted: SECONDARY, line: LINE, bg: '#ffffff' }), view: { stroke: null } },
    width: W,
    height: H,
    layer: [
      {
        data: { values: FINDINGS.map((d, i) => ({ ...d, i })) },
        mark: { type: 'arc', outerRadius: outer, innerRadius: outer * 0.8, stroke: '#ffffff', strokeWidth: 2, cornerRadius: 2 },
        encoding: {
          theta: { field: 'Findings', type: 'quantitative', stack: true },
          order: { field: 'i', type: 'quantitative' },
          color: { field: 'Severity', type: 'nominal', scale: { domain, range: [SEVERITY.critical, SEVERITY.high, SEVERITY.medium, SEVERITY.low, SEVERITY.neutral] }, sort: domain, legend: { orient: 'bottom', direction: 'horizontal', symbolType: 'square', title: null } },
        },
      },
      { data: { values: [{}] }, mark: { type: 'text', text: '100', fontSize: 22, fontWeight: 'bold', color: TEXT, dy: -12 } },
      { data: { values: [{}] }, mark: { type: 'text', text: 'total units', fontSize: 16, fontWeight: 'bold', color: SECONDARY, dy: 14 } },
    ],
  };
}

// ── Threshold ───────────────────────────────────────────────────────────────
const AVG = CPU.filter((r) => r.Instance === 'i-a83w');
function thresholdExpected(withThreshold = true) {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: cloudscapeConfig({ text: TEXT, muted: SECONDARY, line: LINE, bg: '#ffffff' }),
    width: W,
    height: H,
    padding: { left: 4, right: 8, top: 4, bottom: 40 },
    layer: [
      {
        data: { values: AVG },
        mark: { type: 'line', strokeWidth: 2, color: CATEGORICAL[0] },
        encoding: {
          x: { field: 'Time', type: 'temporal', title: null, axis: { format: '%H:%M', values: HALF_HOURS } },
          y: { field: 'Percent (%)', type: 'quantitative', title: 'Percent (%)', scale: { domain: [0, 100] }, axis: { values: [0, 20, 40, 60, 80, 100] } },
        },
      },
      ...(withThreshold ? [{ data: { values: [{ y: 54 }] }, mark: { type: 'rule', color: '#00802f', strokeWidth: 2, strokeDash: [4, 4] }, encoding: { y: { field: 'y', type: 'quantitative' } } }] : []),
      // The key, drawn by hand: a line swatch for the series, a dashed one for the threshold.
      ...([[0, CATEGORICAL[0], [], 'Average CPU'], [112, '#00802f', [3, 3], 'Target (54%)']] as [number, string, number[], string][]).slice(0, withThreshold ? 2 : 1).flatMap(([x0, c, dash, label]) => [
        { data: { values: [{}] }, mark: { type: 'rule', clip: false, color: c, strokeWidth: 3, strokeCap: 'round', strokeDash: dash }, encoding: { x: { value: x0 }, x2: { value: x0 + 14 }, y: { value: H + 46 } } },
        { data: { values: [{}] }, mark: { type: 'text', clip: false, align: 'left', baseline: 'middle', fontSize: 14, color: TEXT, text: label }, encoding: { x: { value: x0 + 20 }, y: { value: H + 46 } } },
      ]),
    ],
  };
}

const UNEMPLOYMENT_ROWS = [4, 4.7, 5.8, 6, 5.5, 5.1, 4.6, 4.6, 5.8, 9.3, 9.6, 8.9, 8.1, 7.4, 6.2, 5.3, 4.9, 4.4, 3.9, 3.7, 8.1, 5.3, 3.6, 3.6]
  .map((u, i) => ({ Year: 2000 + i, 'Unemployment (%)': u }));

/** The 24-year series with the house's 12px labels, as stated. */
function unemploymentExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...cloudscapeConfig({ text: TEXT, muted: SECONDARY, line: LINE, bg: '#ffffff' }), title: { ...(houseConfig(t).title as object), fontSize: 18, offset: 30 } },
    title: { text: 'Unemployment rate', subtitle: 'United States, 2000–2023' },
    width: W,
    height: H,
    data: { values: UNEMPLOYMENT_ROWS },
    mark: { type: 'line', strokeWidth: 2, color: CATEGORICAL[0] },
    encoding: {
      x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2000, 2023] }, axis: { format: 'd', values: [2000, 2005, 2010, 2015, 2020] } },
      y: { field: 'Unemployment (%)', type: 'quantitative', title: 'Unemployment (%)', axis: { tickCount: 5 } },
    },
  };
}

const HEATMAP = PREVIEW_CASES.find((c) => c.id === 'temp-heatmap')!;
const SEQUENTIAL = (theme.ink!.series!.sequential!.stops);

/** The heatmap on the house's sequential scale, spread over the data's own range. */
function heatmapExpected() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...cloudscapeConfig({ text: TEXT, muted: SECONDARY, line: LINE, bg: '#ffffff' }), legend: { orient: 'bottom', direction: 'horizontal', gradientLength: 160, labelFontSize: 12, labelColor: SECONDARY, titleFontSize: 12, titleColor: TEXT } },
    title: { text: 'Average monthly temperature by city (°C)', anchor: 'start', fontSize: 18, font: FONT, color: TEXT, offset: 12 },
    width: W,
    height: 170,
    data: { values: HEATMAP.data },
    mark: { type: 'rect', stroke: '#ffffff', strokeWidth: 2 },
    encoding: {
      x: { field: 'Month', type: 'ordinal', sort: months, title: null, axis: { labelAngle: 0, domain: false, ticks: false } },
      y: { field: 'City', type: 'nominal', sort: null, title: null, axis: { domain: false, ticks: false } },
      color: { field: 'Temp (°C)', type: 'quantitative', scale: { range: SEQUENTIAL, domain: [-9, 34] }, legend: { title: 'Temp (°C)' } },
    },
  };
}

const cloudscape: StyleGuideTheme = {
  id: 'aws-cloudscape',
  org: 'Amazon Web Services Cloudscape',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the Cloudscape data-vis pattern and colour pages, the visual-refresh design tokens and the Highcharts styles in `cloudscape-design/chart-components`. Open Sans is the house face and is loaded on this page.',
    'Stated directly: the ten-step chevron palette (blue, pink, teal, purple, orange, then their darker steps) and the twenty-step extension; #0f141a / #424650 text; #dedee3 for gridlines, the x-axis line and its short ticks, with no y-axis line; 18px bold headline; 12px axis labels; 14px bold axis titles flat above the axis with the unit in them; a bottom-left key without a title; 4px rounded column tops; 2px dividers in the surface colour between segments and wedges; 2px unmarked lines; 0.4 area opacity; dashed reference lines; lowercase-k abbreviations; an 80% donut hole.',
    'Approximated: the severity palette, mapped onto `status` as positive/high/neutral — ThemeSpec’s status set has no room for critical, medium, low or info.',
    'Not stated: the container card that *is* the chart’s frame and title, threshold lines, the details popover, the dark-mode palette (which changes hue, not only lightness) and the series-count limits — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'high',
      probe: 'signature',
      rule: 'A chart is a dashboard item: a white container with 16px corners and a soft shadow, whose bold 18px header is the title. Inside: a bold, flat y title (“Total”) above the axis, faint #dedee3 horizontal gridlines, k-abbreviated values, a #dedee3 x baseline with short ticks, columns with 4px rounded tops held apart by 2px white borders, and a key at the bottom left with square swatches.',
      current: 'Flint draws the inks, the bold flat y title, the baseline and the bottom-left key. It cannot draw the container, so the headline floats on the page; the y values print as 50,000 rather than 50k.',
      expected: 'The guide’s categorical-palette specimen (“Configuration changes”) redrawn on its own data.',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: CHANGES,
        semantic_types: { Date: 'Category', Service: 'Category', Total: 'Quantity' },
        encodings: { x: 'Date', y: 'Total', group: 'Service' },
        title: 'Configuration changes',
      }),
      expectedSpec: signature(),
      expectedFrame: { style: CARD, headerHtml: cardHeader('Configuration changes') },
      observed: 'Flint gets most of the body right: bold flat “Total” above the axis, faint grid, pale baseline, grouped columns with white gaps between them, a square-swatch key at the bottom left, no x title. It differs on the frame — the headline floats on the bare page instead of heading a rounded, shadowed card — and on the numbers: 250,000 … 50,000 where the guide prints 250k … 50k. The 4px rounded tops are drawn as stated.',
    },
    {
      id: 'card-container',
      title: 'The container card is the chart’s frame and its title',
      kind: 'product-ui',
      severity: 'high',
      probe: 'card-container',
      rule: '“Place charts only on the default container background color”: every chart sits in a Cloudscape Container — 16px radius, shadow, 20px padding — whose header (heading-m, 18px bold) is the chart title, with optional filters and header actions at the right.',
      current: 'ThemeSpec has a canvas colour and furniture rules and tabs, but no container: no radius, border, shadow or padding, and no notion that the headline belongs to a card header.',
      expected: 'The chart inside a rounded, shadowed card, the title as the card header.',
      proposal: '`layout.container: { radius: 16, padding: 20, border?, shadow: "raised", titleIn: "header" }` — a product-UI frame Flint draws around the title block and the plot (or reports to the host to draw).',
      ...cardProbe(theme, t, { style: CARD, header: 'Unemployment rate', meta: 'United States, 2000–2023', actions: true }),
      observed: 'Flint: title and deck on the page, no container. Expected: the same chart inside the 16px-radius card with its shadow, the title as the card header and an actions menu at the right. (Flint’s tick labels here are also visibly smaller than 12px — see “A dense time axis shrinks every label”.)',
    },
    {
      id: 'threshold',
      title: 'Threshold lines, dashed and coloured by what they mean',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'annotation',
      rule: 'Thresholds are dashed horizontal lines coloured by meaning — positive #00802f, negative #db0000, info #006ce0, neutral #656871 — and are named in the key.',
      current: '`marks.reference` states a dashed style, but the chart spec has no slot for a threshold value or its meaning, so nothing is drawn; the ink set has no threshold colours.',
      expected: 'The specimen “Average CPU utilization”: one blue line, a dashed green target at 54%, both in the key.',
      proposal: '`chart_spec.thresholds: [{ value, label, meaning: "positive" | "negative" | "info" | "neutral" }]`, drawn with `marks.reference` in `ink.series.status[meaning]` (add `info`).',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: AVG.map(({ Time, 'Percent (%)': p }) => ({ Time, 'Percent (%)': p })),
        semantic_types: { Time: 'DateTime', 'Percent (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Time', y: 'Percent (%)' },
        title: 'Average CPU utilization',
      }),
      expectedSpec: thresholdExpected(),
      observed: 'Flint draws the line alone; the 54% target has nowhere to go. It also zooms the y scale to 40–60 and labels time as “Apr 6, 2024 7 PM, 7:30 … 8 PM” in 12-hour form, where the guide uses 19:00 … 21:30. Expected: 0–100, the dashed green target, and a key naming both.',
      expectedFrame: { style: CARD, headerHtml: cardHeader('Average CPU utilization') },
    },
    {
      id: 'zero-baseline',
      title: 'Line charts keep zero; Flint zooms in to the data',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'chart-type-policy',
      rule: 'Don’t start a bar or line chart’s y axis anywhere but 0 where that exaggerates change; a percentage is read against 0–100 (every specimen draws CPU on 0–100).',
      current: 'Flint fits a line chart’s value scale to the data. The house cannot ask otherwise: `chartDefaults` drops any key that changes how the data is read, zero baseline included, and no other ThemeSpec field speaks to the domain.',
      expected: 'The specimen’s scale: 0–100 for a percentage, so a ±5-point wobble reads as a wobble.',
      proposal: '`annotation.measureDomain: { zero: "always" | "lengthMarksOnly", percentage: "fullRange" }` as a house policy — distinct from per-chart `chartDefaults`, and reported when the chart spec overrides it.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: AVG.map(({ Time, 'Percent (%)': p }) => ({ Time, 'Percent (%)': p })),
        semantic_types: { Time: 'DateTime', 'Percent (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Time', y: 'Percent (%)' },
        title: 'Average CPU utilization',
      }),
      expectedSpec: thresholdExpected(false),
      observed: 'Flint’s 40–60 scale turns a ±5-point wobble into a sawtooth that fills the plot; on the guide’s 0–100 the same series is a calm line near 50.',
      expectedFrame: { style: CARD, headerHtml: cardHeader('Average CPU utilization') },
    },
    {
      id: 'label-size-override',
      title: 'A dense time axis shrinks every label below the stated 12px',
      kind: 'realization',
      severity: 'medium',
      probe: 'type-size-override',
      rule: 'Axis labels are font-size-body-s, 12px, in #424650; key labels 14px.',
      current: 'Stated as `type.axisLabel.size: 12` and `keyLabel.size: 14`. On a 24-point yearly series Flint’s layout sets `labelFontSize: 9` on *both* axes and on the key, overriding the house (the same theme keeps 12px on an 11-point series).',
      expected: 'The same chart with 12px tick labels, thinned to every fifth year instead of shrunk.',
      proposal: 'Treat a stated `type.axisLabel.size` as a floor the layout may not go under (or above `type.minSize`); thin the ticks instead, and report `type.axisLabel.size` on `_theme.report` when it must give way.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: UNEMPLOYMENT_ROWS,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Unemployment rate',
        subtitle: 'United States, 2000–2023',
      }),
      expectedSpec: unemploymentExpected(),
      observed: 'Flint’s tick labels are about 9px on both axes (x every two years), against a 14px bold y title and an 18px headline — the hierarchy inverts. Expected keeps 12px and labels every fifth year.',
    },
    {
      id: 'severity-palette',
      title: 'Status data takes the severity palette, not the categorical one',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'status-palette',
      rule: 'Status or severity data uses the dedicated palette — critical #7d2105, high #ba2e0f, medium #cc5f21, low #b2911c, positive #67a353, info #3184c2, neutral #8c8c94 — using only the values that apply; a donut is a thin ring (80% hole) with the total in bold and its unit in secondary grey in the centre.',
      current: '`ink.series.status` has three slots (positive, negative, neutral) and is used for *signed* values; a `Status` field is coloured with the categorical palette. The 80% hole is stated through `chartDefaults`.',
      expected: 'The specimen “Findings severity”: critical → low in the dark-red-to-mustard ramp, undefined grey, 2px white gaps, “100 / total units” centred, key bottom-left.',
      proposal: '`ink.series.status` as an open, ordered map (`{ critical, high, medium, low, positive, info, neutral }`) plus a `statusValues` alias table, used whenever the colour field is semantically `Status`.',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: FINDINGS,
        semantic_types: { Severity: 'Status', Findings: 'Count' },
        encodings: { size: 'Findings', color: 'Severity' },
        title: 'Findings severity',
      }),
      expectedSpec: severityExpected(),
      expectedFrame: { style: CARD, headerHtml: cardHeader('Findings severity') },
      observed: 'Flint honours the 80% hole (via `chartDefaults`) and the white gaps, but colours Critical blue, High pink, Medium teal, Low purple — severity reads as five unrelated categories — and moves the key to the right although the theme lists only `bottom`. No centre total. Expected: dark red → mustard → grey, “100 / total units”, key bottom-left.',
    },
    {
      id: 'details-popover',
      title: 'Hover opens a details popover listing every series',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'tooltip-style',
      rule: 'Hover or keyboard focus shows a details popover: the x value as a bold header, then one row per series (line swatch, name, value); a vertical cursor line and the hovered points mark the position; inactive series dim to 30%.',
      current: '`interaction.tooltipFormat` is a number format; ThemeSpec has nothing for the popover’s container, its grouping by x, or the cursor line, so Flint’s tooltip is Vega’s default box per mark.',
      expected: 'The CPU chart with the cursor at 20:00: a grey rule, a dot on each line, and a white popover (1px #c6c6cd border, 8px radius, soft shadow) listing the five instances.',
      proposal: '`interaction.tooltip: { group: "byX", cursor: "rule", container: { fill, border, radius, shadow }, rowSwatch: "seriesMark" }`.',
      flint: cpuFlint('CPU utilization'),
      expectedSpec: cpuExpected({ cursor: '2024-04-06T20:00:00' }),
      expectedFrame: { style: { ...CARD, position: 'relative' }, headerHtml: cardHeader('CPU utilization') + popoverHtml('2024-04-06T20:00:00') },
      observed: 'The static panels cannot show Flint’s hover, but nothing in the theme reaches it: Flint’s tooltip is Vega’s default per-point box. Expected: grey cursor rule at 20:00, a dot on each line, and the bordered, shadowed popover listing all five instances in key order.',
    },
    {
      id: 'dark-mode',
      title: 'Dark mode changes the series hues, not just the greys',
      kind: 'product-ui',
      severity: 'high',
      probe: 'dark-mode',
      rule: 'Every token has a dark value: the container becomes #161d26, body text #c6c6cd, lines #424650, and the categorical inks are re-tuned — blue #486de8, pink #e07f9d, teal #018977, purple #b088f5, orange #c55305 — so each still meets 3:1 against the dark container.',
      current: 'One ThemeSpec, one set of inks; `variants` cannot change `ink`. A dark Cloudscape needs a second theme whose palette is maintained by hand in parallel.',
      expected: 'The CPU chart in a dark container with the dark palette.',
      proposal: '`ink.modes.dark` carrying its own `series.categorical`, not only surfaces and text — the hues are part of the mode.',
      flint: cpuFlint('CPU utilization'),
      expectedSpec: cpuExpected({ dark: true }),
      expectedFrame: { style: { ...CARD, background: DARK.container, boxShadow: 'none', border: `1px solid ${DARK.line}` }, headerHtml: cardHeader('CPU utilization', DARK.heading) },
      observed: 'Flint can only draw the light version. In the dark panel the teal and orange are noticeably darker (#018977, #c55305) and the purple and pink lighter — a different palette, not the light one on a dark ground.',
    },
    {
      id: 'signed-domain-on-sequential',
      addressed: { stage: 'A5', note: 'On the sequential ramp the domain spans the data, −9 to 34 °C, and the report says so (A5).' },
      title: 'Without a diverging ramp, a signed field keeps a symmetric domain on the sequential ramp',
      kind: 'realization',
      severity: 'medium',
      probe: 'ramp-domain',
      rule: 'Cloudscape publishes no diverging palette: colour ramps are built from one of its sequential scales, darker meaning more (“darker = more important/larger”).',
      current: 'The theme states `ink.series.sequential` and no `diverging`. Flint reads temperature as signed, keeps the diverging choice of a symmetric −34…34 domain, and paints it with the sequential ramp: the data (−9…34) occupy only the dark upper half, so the heatmap is a nearly uniform navy.',
      expected: 'The same blue scale spread over the data’s own range, −9 to 34 °C, so Moscow’s winter reads light and Delhi’s summer dark.',
      proposal: 'When grounding falls back from `diverging` to `sequential` for want of a ramp, fall back to the sequential domain too (data extent, or zero-anchored), and report the substitution.',
      flint: flintInput(theme, {
        chartType: 'Heatmap',
        data: HEATMAP.data as Record<string, unknown>[],
        semantic_types: HEATMAP.semantic_types as Record<string, unknown>,
        encodings: HEATMAP.encodings as Record<string, unknown>,
        title: 'Average monthly temperature by city (°C)',
      }),
      expectedSpec: heatmapExpected(),
      observed: 'Flint’s key runs −34 to 34; every cell sits in its dark half, so only Moscow’s winter separates from the navy field. Expected spreads the same scale over −9…34: Moscow and Seattle winters come out pale, the tropics dark. (The guide’s own scale starts at mid-blue #529ccb, so even the expected field is dark — a light end is not in the token set.) Flint also turns the three-letter months 45° though they fit flat.',
    },
    {
      id: 'series-limits',
      title: 'At most 8 series per line or bar chart, 5 slices per donut',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'chart-type-policy',
      rule: '“Consider displaying only up to 8 data series for a line chart or bar chart, and up to 5 data points for a pie chart or donut chart”; one colour for a single series.',
      current: 'ThemeSpec has no cardinality policy per chart family; Flint will colour a twelve-series line chart from the extended palette and a twelve-wedge donut without comment.',
      expected: 'A report (or the author’s guidance) when a chart exceeds the house’s limit, and the donut swapped for a bar chart past five wedges.',
      proposal: '`chartPolicy: { maxSeries: { line: 8, bar: 8 }, maxWedges: 5 }`, reported on `_theme.report` like any other departure.',
    },
  ],
};

export default cloudscape;
