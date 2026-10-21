import type { ThemeSpec } from 'flint-chart';
import research from '../research/clarity.json';
import { EV_SHARE, MEDALS, flintInput } from '../probes';
import { PREVIEW_CASES } from '../../../shared/preview-cases';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

/** Metropolis is not loaded here; Clarity's own fallback, Avenir Next, then Montserrat (its geometric cousin). */
const FONT = "Metropolis, 'Avenir Next', Montserrat, sans-serif";
const TEXT = '#21333b';
const SECONDARY = '#2d4048';
const SLATE = '#4f6169';
const BLUE = '#009adb';
const CATEGORICAL = ['#009adb', '#7c12a5', '#00565c', '#6e72d8', '#d23292', '#818f00', '#2429c2', '#00a2ad'];
const CATEGORICAL_16 = [...CATEGORICAL, '#657000', '#9b32c8', '#1c9b71', '#004085', '#bb70db', '#42810e', '#99005c', '#0071eb'];
const DARK_CATEGORICAL = ['#2ec0ff', '#ac50d3', '#80f6ff', '#6e72d8', '#ea53ad', '#c9dc18', '#8b8dda', '#00e4f5'];
const DIVERGING = ['#7c12a5', '#9b32c8', '#ac50d3', '#bb70db', '#ce91e8', '#e0b4f3', '#faf0ff', '#00e4f5', '#00cddb', '#00a2ad', '#007780', '#00565c', '#003e42'];
const VIZ_BORDER = '#17252b';
const SEVERITY = { neutral: '#4f6169', success: '#42810e', warning: '#bd7e00', warningLight: '#ffc60a', immediate: '#ff8e3d', critical: '#e02200', freeFill: '#e3eaed', freeBorder: '#859399' };

const t: HouseTokens = {
  font: FONT,
  text: TEXT,
  muted: SLATE,
  grid: null,
  axis: SLATE,
  background: '#ffffff',
  palette: CATEGORICAL,
  titleSize: 16,
  titleWeight: 600,
  labelSize: 12,
  lineWidth: 2.5,
  legendOrient: 'right',
};

const theme: ThemeSpec = {
  id: 'clarity',
  label: 'VMware Clarity',
  ink: {
    surface: { source: 'house', canvas: '#ffffff' },
    text: { primary: TEXT, secondary: SECONDARY, muted: SLATE, inverse: '#ffffff' },
    structure: { axis: SLATE, grid: SLATE, rule: VIZ_BORDER, frame: SLATE },
    series: {
      single: BLUE,
      categorical: CATEGORICAL,
      categoricalExtended: CATEGORICAL_16,
      sequential: { stops: ['#e5f7ff', '#bdebff', '#8fddff', '#66d1ff', '#2ec0ff', '#00abf5', '#009adb', '#0079ad', '#00608a', '#004b6b', '#00364c'], space: 'lab' },
      diverging: { stops: DIVERGING, neutral: '#faf0ff', space: 'lab' },
      status: { positive: SEVERITY.success, negative: SEVERITY.critical, neutral: SEVERITY.neutral },
    },
    accent: BLUE,
  },
  type: {
    headline: { family: FONT, size: 16, weight: 'semibold', color: TEXT },
    deck: { family: FONT, size: 13, color: SECONDARY },
    axisLabel: { family: FONT, size: 12, color: SLATE },
    axisTitle: { family: FONT, size: 12, weight: 'medium', color: TEXT },
    keyLabel: { family: FONT, size: 12, color: TEXT },
    valueLabel: { family: FONT, size: 12, weight: 'medium', color: TEXT },
    annotation: { family: FONT, size: 12, color: TEXT },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 2.5, ticks: 'omit' },
      measure: { line: 'full', lineWeight: 2.5, ticks: 'omit' },
    },
    // "Avoid clutter by using only necessary gridlines": the specimens draw none.
    grid: { measure: 'omit', category: 'omit' },
    frame: 'omit',
    baseline: 'full',
  },
  marks: {
    strokeWeight: 2.5,
    strokeCap: 'round',
    strokeJoin: 'round',
    separator: { presence: 'full', width: 1, source: 'surface' },
    slice: { gap: 1, gapStyle: 'rule' },
    // The 1px --cds-alias-viz-border on sequential/diverging cells, as near as `tile` can say it.
    tile: { gap: 1, source: 'structure' },
    point: { presence: 'full', size: 70, fill: 'solid' },
    redundantEncoding: 'always',
    // “Use both color and pattern”: solid, white diagonal hatch, dot screen (R13).
    redundantChannels: ['shape', 'texture'],
    texture: { patterns: ['solid', 'diagonal', 'dots'], ink: 'white' },
  },
  geometry: {
    line: { width: 2.5, cap: 'round', join: 'round' },
    point: { presence: 'full', size: 70, fill: 'solid' },
  },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['seriesEnd', 'right'], direction: 'vertical', title: 'whenAmbiguous' },
  dataLabels: { show: 'whenTheyFit', placement: 'outsideMark', inkMode: 'fixed' },
  annotation: { axisTitles: 'always', axisTitlePlacement: 'rotated', unitsInAxisTitle: true },
  layout: { titleBlock: { anchor: 'start' } },
  interaction: { selectionBoundary: { color: BLUE, width: 2 } },
};

// ── Shared: two EV series, as the illustration's two lines ─────────────────
const PAIR = ['Norway', 'China'];
const EV2 = EV_SHARE.filter((r) => PAIR.includes(r.Country));
const evFlint = (title: string) => flintInput(theme, {
  chartType: 'Line Chart',
  data: EV2,
  semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
  encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
  title,
});

/** Clarity's axes: thick slate L, rounded caps, no ticks, no gridlines. */
function clarityConfig(ink: { text: string; muted: string; axis: string; bg: string }) {
  const base = houseConfig({ ...t, text: ink.text, muted: ink.muted, axis: ink.axis, background: ink.bg });
  return {
    ...base,
    axis: { ...(base.axis as object), domain: true, domainColor: ink.axis, domainWidth: 2.5, domainCap: 'round', ticks: false, grid: false, labelColor: ink.muted, titleColor: ink.text, titleFontWeight: 500, titleFontSize: 12, labelFontSize: 12, labelPadding: 8, titlePadding: 10 },
    axisY: { domain: true, grid: false },
    axisX: { grid: false },
  };
}

function lineExpected(o: { dark?: boolean; hover?: number; title?: string } = {}) {
  const ink = o.dark ? { text: '#e9ecef', muted: '#aeb8bc', axis: '#aeb8bc', bg: '#21333b' } : { text: TEXT, muted: SLATE, axis: SLATE, bg: '#ffffff' };
  const palette = o.dark ? DARK_CATEGORICAL : CATEGORICAL;
  const color = { field: 'Country', type: 'nominal', scale: { domain: PAIR, range: palette }, legend: null };
  const shape = { field: 'Country', type: 'nominal', scale: { domain: PAIR, range: ['circle', 'triangle-up'] }, legend: null };
  const x = { field: 'Year', type: 'quantitative', title: 'Year', scale: { domain: [2018, 2023] }, axis: { format: 'd', values: [2018, 2019, 2020, 2021, 2022, 2023] } };
  const y = { field: 'EV share (%)', type: 'quantitative', title: 'EV share (%)', scale: { domain: [0, 100] }, axis: { values: [0, 25, 50, 75, 100] } };
  const last = EV2.filter((r) => r.Year === 2023);
  const hovered = o.hover !== undefined ? EV2.filter((r) => r.Year === o.hover) : [];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...clarityConfig(ink), title: { ...(houseConfig(t).title as object), color: ink.text, fontSize: 16, fontWeight: 600 } },
    title: o.title ?? 'Norway leads electric-car sales',
    width: W - 40,
    height: H,
    layer: [
      { data: { values: EV2 }, mark: { type: 'line', strokeWidth: 2.5, strokeCap: 'round', strokeJoin: 'round' }, encoding: { x, y, color } },
      {
        data: { values: EV2 },
        mark: o.hover !== undefined
          ? { type: 'point', filled: false, fill: ink.bg, size: 70, strokeWidth: 2.5, opacity: 1 }
          : { type: 'point', filled: true, size: 80, opacity: 1 },
        encoding: { x, y, color, shape: o.hover !== undefined ? { value: 'circle' } : shape },
      },
      ...(hovered.length ? [{ data: { values: hovered.filter((r) => r.Country === 'Norway') }, mark: { type: 'point', filled: false, fill: ink.bg, size: 160, strokeWidth: 3, opacity: 1 }, encoding: { x, y, color } }] : []),
      { data: { values: last }, mark: { type: 'text', align: 'left', dx: 10, fontSize: 12, fontWeight: 600 }, encoding: { x, y, text: { field: 'Country' }, color } },
    ],
  };
}

/** Clarity's tooltip: white, 2px blue border, rounded, a tail at the bottom-left pointing at the reading. */
function tooltipHtml(text: string, left: number, top: number) {
  return `<div style="position:absolute;z-index:3;left:${left}px;top:${top}px;font-family:${FONT};font-size:13px;color:#22343c;background:#fff;border:2px solid ${BLUE};border-radius:4px;padding:7px 11px;line-height:1.35;white-space:nowrap">${text}`
    + `<div style="position:absolute;left:-2px;bottom:-11px;width:0;height:0;border-left:0 solid transparent;border-right:12px solid transparent;border-top:11px solid ${BLUE}"></div>`
    + `<div style="position:absolute;left:0;bottom:-7px;width:0;height:0;border-right:8px solid transparent;border-top:7px solid #fff"></div></div>`;
}

// ── Patterns as a second channel ────────────────────────────────────────────
const MEDAL_ROWS = MEDALS.filter((r) => ['United States', 'China', 'Japan', 'Australia'].includes(r.Country));
const PATTERN_DEFS = `<svg width="0" height="0" style="position:absolute"><defs>`
  + `<pattern id="clarity-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${CATEGORICAL[1]}"/><line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" stroke-width="2"/></pattern>`
  + `<pattern id="clarity-dots" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="${CATEGORICAL[2]}"/><circle cx="2.5" cy="2.5" r="1.1" fill="#ffffff"/></pattern>`
  + `</defs></svg>`;

function patternExpected() {
  const order = ['Gold', 'Silver', 'Bronze'];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...clarityConfig({ text: TEXT, muted: SLATE, axis: SLATE, bg: '#ffffff' }), legend: { ...(houseConfig(t).legend as object), orient: 'right', direction: 'vertical', symbolType: 'square', symbolSize: 160, symbolStrokeWidth: 0 } },
    title: { text: 'The US and China shared the top of the medal table', fontSize: 16, fontWeight: 600, anchor: 'start', color: TEXT, font: FONT },
    width: W - 40,
    height: H,
    data: { values: MEDAL_ROWS },
    mark: { type: 'bar' },
    encoding: {
      x: { field: 'Country', type: 'nominal', title: 'Country', sort: null, axis: { labelAngle: 0 }, scale: { paddingInner: 0.3 } },
      xOffset: { field: 'Medal', sort: order, scale: { paddingInner: 0.12 } },
      y: { field: 'Count', type: 'quantitative', title: 'Medals (count)' },
      color: { field: 'Medal', type: 'nominal', sort: order, scale: { domain: order, range: [CATEGORICAL[0], 'url(#clarity-hatch)', 'url(#clarity-dots)'] }, legend: { title: null } },
    },
  };
}

// ── Sequential/diverging cells with the viz border ──────────────────────────
const HEATMAP = PREVIEW_CASES.find((c) => c.id === 'temp-heatmap')!;
function heatmapExpected(o: { dark?: boolean } = {}) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...clarityConfig({ text: TEXT, muted: SLATE, axis: SLATE, bg: '#ffffff' }), legend: { orient: 'bottom', direction: 'horizontal', gradientLength: 180, labelFontSize: 12, labelColor: SLATE, titleFontSize: 12, titleColor: TEXT, labelFont: FONT, titleFont: FONT } },
    title: { text: 'Average monthly temperature by city (°C)', anchor: 'start', fontSize: 16, fontWeight: 600, color: TEXT, font: FONT, offset: 12 },
    width: W,
    height: 170,
    data: { values: HEATMAP.data },
    mark: { type: 'rect', stroke: o.dark ? '#f3f5f7' : VIZ_BORDER, strokeWidth: 1 },
    encoding: {
      x: { field: 'Month', type: 'ordinal', sort: months, title: null, axis: { labelAngle: 0, domain: false } },
      y: { field: 'City', type: 'nominal', sort: null, title: null, axis: { domain: false } },
      color: { field: 'Temp (°C)', type: 'quantitative', scale: { range: DIVERGING, domainMid: 0, domain: [-34, 34] }, legend: { title: 'Temp (°C)' } },
    },
  };
}

// ── Capacity: used space by severity, free space in its own fill and border ─
const STORES = [['datastore-01', 58], ['datastore-02', 84], ['datastore-03', 96]] as [string, number][];
const CAPACITY = STORES.flatMap(([Datastore, used]) => [
  { Datastore, Space: 'Used', 'Capacity (%)': used },
  { Datastore, Space: 'Free', 'Capacity (%)': 100 - used },
]);
function capacityExpected() {
  const usedColor = (u: number) => (u >= 95 ? SEVERITY.critical : u >= 80 ? SEVERITY.warning : SEVERITY.success);
  const rows = STORES.map(([Datastore, used]) => ({ Datastore, used, zero: 0, full: 100, c: usedColor(used), label: `${used}% used` }));
  const y = { field: 'Datastore', type: 'nominal', title: null, sort: null };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...clarityConfig({ text: TEXT, muted: SLATE, axis: SLATE, bg: '#ffffff' }) },
    title: { text: 'Datastore capacity', fontSize: 16, fontWeight: 600, anchor: 'start', color: TEXT, font: FONT, offset: 14 },
    width: W - 40,
    height: 150,
    data: { values: rows },
    layer: [
      { mark: { type: 'bar', color: SEVERITY.freeFill, stroke: SEVERITY.freeBorder, strokeWidth: 1, height: 22 }, encoding: { y, x: { field: 'zero', type: 'quantitative', scale: { domain: [0, 100] }, title: 'Capacity used (%)', axis: { values: [0, 25, 50, 75, 100] } }, x2: { field: 'full' } } },
      { mark: { type: 'bar', height: 22, stroke: '#ffffff', strokeWidth: 1 }, encoding: { y, x: { field: 'zero', type: 'quantitative' }, x2: { field: 'used' }, color: { field: 'c', type: 'nominal', scale: null, legend: null } } },
      { mark: { type: 'text', align: 'right', dx: -6, color: '#ffffff', fontSize: 12, fontWeight: 600 }, encoding: { y, x: { field: 'used', type: 'quantitative' }, text: { field: 'label' } } },
    ],
  };
}

const clarity: StyleGuideTheme = {
  id: 'clarity',
  org: 'VMware Clarity (Broadcom) Design System',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Clarity ships colour tokens and accessibility guidance, not a chart library, so this house is mostly ink and rules: built from scratch from `_alias-viz-colors.scss`, the dark theme file and the chart documentation’s schematic illustrations. Metropolis is not loaded here; panels fall back to Avenir Next, the guide’s own fallback.',
    'Stated directly: the 1–16 contrast-ordered categorical tokens (the first 8, which the guide asks charts to stay within, as `categorical`; all 16 as `categoricalExtended`); the 11-step blue sequential and the violet–aqua diverging ramp with its #faf0ff pivot; severity success/critical/neutral as `status`; slate #4f6169 axes drawn thick with round caps; no ticks, no gridlines; dual encoding with marker shapes (`redundantEncoding: always`, `shape`); 1px separators in the surface colour between wedges and segments; axis titles with units; direct labels preferred to a key.',
    'Approximated: the 1px `--cds-alias-viz-border` on sequential and diverging cells, as `marks.tile` with `source: structure` — the gap is cut in a structure ink rather than stroked as a border, and bars cannot carry it. Type sizes: the guide gives none for charts, so the Clarity scale’s 12px body and 16px semibold heading are used.',
    'Not stated: patterns as a second channel, the capacity chart’s free-space fill and border, the severity warning-light inner border, the tooltip, the dark theme’s re-tuned hues and inverted sequential ramps, and the companion data table — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'The categorical-palette illustration: a thick slate L of axes with round caps, no ticks and no gridlines; lines in general-1 blue and general-2 violet, each carrying its own filled marker shape (circle, triangle) so colour is never the only cue; axes labelled with units; direct labels on lines rather than a key.',
      current: 'Flint states the thick slate axes, the absent grid, the palette, markers on every reading and shape as a redundant channel.',
      expected: 'The illustration made into a real chart: two EV series, circles and triangles, labels at the line ends, axis titles with units.',
      flint: evFlint('Norway leads electric-car sales'),
      expectedSpec: lineExpected(),
      observed: 'Flint is close: thick slate L with round caps, no gridlines, markers on every reading, a different shape per series, coloured labels at the line ends instead of a key, axis titles. It differs in detail: Norway gets squares and China circles (the guide pairs circle with triangle), the end labels are about 9px and regular where the key label role is 12px, and the y axis is ruled in 20s.',
    },
    {
      id: 'tooltip',
      title: 'Tooltip: white, a 2px blue border and a tail; the hovered point hollow',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'tooltip-style',
      rule: 'Tooltips give exact values, categories or dates with sufficient contrast, not overloaded. The anatomy illustration: a white rounded box with a 2px #009adb border and a pointer tail at its bottom-left, dark slate text; the hovered reading drawn as a hollow circle in the line’s colour.',
      current: 'ThemeSpec’s `interaction` covers a tooltip number format and the selection-boundary paint; it has no tooltip container (fill, border, radius, tail) and no hover marker style, so Flint shows Vega’s default tooltip.',
      expected: 'Norway’s 2022 reading hovered: hollow ring markers, and the bordered tooltip with its tail pointing at the point.',
      proposal: '`interaction.tooltip: { fill: "surface", border: { color: "accent", width: 2 }, radius: 4, pointer: "bottomStart" }` and `interaction.hoverMark: { fill: "surface", strokeWidth: 2.5 }`.',
      flint: evFlint('EV share of new cars'),
      expectedSpec: lineExpected({ hover: 2022, title: 'EV share of new cars' }),
      observed: 'Flint’s static chart has filled square and circle markers and no hover treatment from the theme. Expected: every marker hollow (white fill, coloured ring), the hovered 2022 reading larger, and the white tooltip with the 2px blue border and bottom-left tail pointing at it.',
      expectedFrame: { style: { position: 'relative' }, headerHtml: tooltipHtml('<b>Norway, 2022</b><br>EV share: 88%', 300, 6) },
    },
    {
      id: 'pattern-fill',
      addressed: { stage: 'R13', note: 'Solid, white diagonal hatch and dot screen in palette order (`marks.texture.patterns`), on bars, wedges and areas, and in the key.' },
      title: 'Colour plus pattern on adjacent fills',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'pattern-fill',
      rule: '“Use both color and pattern to encode information”: dual encoding pairs each fill colour with a pattern or texture, and avoids red–green and blue–purple neighbours.',
      current: '`marks.redundantChannels` accepts `texture`, but Flint has no texture to draw: grouped bars come out in flat colour only (shape works for points, not for fills).',
      expected: 'Gold solid blue, Silver violet with a white diagonal hatch, Bronze dark aqua with a dot screen; the key carries the patterns too.',
      proposal: 'Realise `redundantChannels: ["texture"]` as SVG pattern fills, with `ink.series.textures: ["solid", "hatch45", "dots", …]` in palette order.',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: MEDAL_ROWS,
        semantic_types: { Country: 'Country', Medal: 'Category', Count: 'Quantity' },
        encodings: { x: 'Country', y: 'Count', group: 'Medal' },
        title: 'The US and China shared the top of the medal table',
      }),
      expectedSpec: patternExpected(),
      expectedFrame: { headerHtml: PATTERN_DEFS },
      observed: 'Flint: flat blue, violet and dark-aqua bars — the guide’s own blue–violet neighbours, which its accessibility page warns against pairing by colour alone. Expected: the same colours with a white hatch on Silver and a dot screen on Bronze, carried into the key.',
    },
    {
      id: 'viz-border',
      title: 'Sequential and diverging cells carry a 1px dark border',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'mark-outline',
      rule: '“Utilize 1 px stroke and use --cds-alias-viz-border for the border color at the end of each bar, heatmap, segment” — #17252b in light theme, #f3f5f7 in dark — whenever the fill comes from a sequential or diverging palette.',
      current: 'This theme states `marks.tile: { gap: 1, source: "structure" }`, and Flint cuts each cell apart by 1px in a structure grey — close for a heatmap. But the edge is a gap painted in a blended slate, not a #17252b border; it applies to every grid whatever its palette; and bars or stacked segments on a sequential ramp get nothing, because `marks.outline` borders every filled mark regardless of palette.',
      expected: 'The heatmap on the violet–aqua diverging ramp, every cell outlined 1px in #17252b.',
      proposal: '`marks.outline.when: "continuousColor"` (or a `variants` guard `colorScale: "sequential" | "diverging"`) with `ink.structure.vizBorder`.',
      flint: flintInput(theme, {
        chartType: 'Heatmap',
        data: HEATMAP.data as Record<string, unknown>[],
        semantic_types: HEATMAP.semantic_types as Record<string, unknown>,
        encodings: HEATMAP.encodings as Record<string, unknown>,
        title: 'Average monthly temperature by city (°C)',
      }),
      expectedSpec: heatmapExpected(),
      observed: 'Flint’s cells are separated by a 1px mid-slate line; the expected cells by a near-black #17252b stroke, which reads crisper on the pale violet and cyan cells. Flint also turns the month labels 45° although they fit, and adds “City” / “Month” titles.',
    },
    {
      id: 'capacity',
      title: 'Capacity charts: severity for used space, a bordered grey for free space',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'status-palette',
      rule: 'Status and capacity charts use only the severity set (neutral, success #42810e, warning #bd7e00, immediate #ff8e3d, critical #e02200). Free space is always #e3eaed fill *with* a #859399 border; warning-light #ffc60a always carries a 1px inner border in warning colour.',
      current: '`ink.series.status` has positive/negative/neutral only and applies to signed values; a used/free split is coloured from the categorical palette, and no ink can carry its own border.',
      expected: 'Three datastores: 58% used in success green, 84% in warning, 96% in critical; the free remainder in the bordered pale grey.',
      proposal: 'An ordered severity map in `ink.series.status` (`success, warning, immediate, critical, neutral`) plus per-ink companions — `{ fill: "#e3eaed", border: "#859399" }` — for inks the house never uses without an edge.',
      flint: flintInput(theme, {
        chartType: 'Stacked Bar Chart',
        data: CAPACITY,
        semantic_types: { Datastore: 'Name', Space: 'Status', 'Capacity (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { y: 'Datastore', x: 'Capacity (%)', color: 'Space' },
        title: 'Datastore capacity',
      }),
      expectedSpec: capacityExpected(),
      observed: 'Flint draws Used in general-1 blue and Free in general-2 violet with value labels — the free space reads as a second quantity rather than the empty part of the bar. Expected: green / amber / red by how full each store is, the remainder in #e3eaed edged with #859399.',
    },
    {
      id: 'dark-mode',
      title: 'Dark theme: lighter tints of every hue, and sequential ramps flip',
      kind: 'product-ui',
      severity: 'high',
      probe: 'dark-mode',
      rule: 'Every viz token has a dark value: general-1 #2ec0ff, general-2 #ac50d3, general-3 #80f6ff … on #1b2b32 / #21333b; “in dark themes, the lighter colors represent larger values”; diverging palettes stay the same.',
      current: 'ThemeSpec holds one ink set and `variants` cannot change it, so the dark theme is a second document whose palette, ramp direction and border token must be kept in step by hand.',
      expected: 'The signature chart on the dark container, with the dark-theme tints and light slate axes.',
      proposal: '`ink.modes.dark` with its own `series` (categorical and sequential, with `sequential.reverseInDark` as shorthand) and `structure`.',
      flint: evFlint('Norway leads electric-car sales'),
      expectedSpec: lineExpected({ dark: true }),
      expectedFrame: { style: { background: '#21333b', borderRadius: '4px' } },
      observed: 'Flint can only draw the light theme. Dark panel: blue lifts to #2ec0ff and violet to #ac50d3, axes to light slate; violet at #7c12a5 would have nearly vanished on #21333b.',
    },
    {
      id: 'data-table',
      title: 'A data table near the chart, or a download',
      kind: 'product-ui',
      severity: 'low',
      probe: 'data-table',
      rule: '“Position the table near the chart for easy comparison”; offer the data as a table or downloadable file as an accessible alternative.',
      current: 'Outside the chart spec and the theme: Flint emits a chart, and the host decides whether a table exists.',
      expected: 'A house flag the host can read to render the companion table or download control.',
      proposal: '`interaction.alternatives: ["table", "download"]` surfaced on the compiled spec for hosts to honour.',
    },
  ],
};

export default clarity;
