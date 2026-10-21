import type { ThemeSpec } from 'flint-chart';
import research from '../research/semrush.json';
import { BROWSERS, flintInput, UNEMPLOYMENT } from '../probes';
import { houseConfig, W, H as HEIGHT, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const TEXT = '#191D21';
const SECONDARY = '#69747E'; // --text-secondary: #001324 at 59% on white
const LABEL = '#7E8088';
const GRID = '#D1D9DE'; // --chart-grid-x-axis
const PALETTE = ['#191D21', '#666BDB', '#38E3B5', '#C18DFF', '#FFB400', '#B0C1FE', '#F56BED', '#B0CBC7'];
const SECOND_PACK = ['#5C5CC4', '#00AA7D', '#A261FD', '#92B3AF', '#A35400', '#FF95FB', '#94A5F5', '#00CC9A'];
const TOTAL = '#818E99';
const OTHER = '#BBC6CD';

const t: HouseTokens = {
  font: FONT,
  text: TEXT,
  muted: LABEL,
  grid: GRID,
  axis: null,
  background: '#FFFFFF',
  palette: PALETTE,
  titleSize: 16,
  titleWeight: 700,
  subtitleSize: 14,
  subtitleColor: SECONDARY,
  labelSize: 12,
  lineWidth: 3,
  barCorner: 2,
  legendOrient: 'top-left',
};

const theme: ThemeSpec = {
  id: 'semrush',
  label: 'Semrush Intergalactic',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: TEXT, secondary: SECONDARY, muted: LABEL },
    structure: { grid: GRID, axis: GRID, rule: '#94A0AB', zero: GRID },
    series: {
      single: PALETTE[1],
      categorical: PALETTE,
      // Reserved greys for totals, other and missing data (R8).
      roles: { total: TOTAL, other: OTHER, missing: OTHER },
      categoricalExtended: [...PALETTE, ...SECOND_PACK],
      overflow: OTHER,
      sequential: { stops: ['#CEDDFF', '#B0C1FE', '#94A5F5', '#666BDB', '#5C5CC4'], space: 'lab' },
      status: { positive: '#70E26C', negative: '#FF7073', neutral: TOTAL },
    },
    accent: '#006DCA',
  },
  type: {
    headline: { family: FONT, size: 16, weight: 'bold', case: 'asIs', color: TEXT },
    deck: { family: FONT, size: 14, color: SECONDARY },
    axisLabel: { family: FONT, size: 12, color: LABEL },
    axisTitle: { family: FONT, size: 12, color: LABEL },
    keyLabel: { family: FONT, size: 14, color: TEXT },
    valueLabel: { family: FONT, size: 12, color: TEXT },
    display: { family: FONT, size: 24, weight: 'bold', color: TEXT },
    footnote: { family: FONT, size: 12, color: SECONDARY },
  },
  structure: {
    axis: {
      categorical: { line: 'hairline', ticks: 'omit', labelGap: 12 },
      measure: { line: 'omit', ticks: 'omit', labelGap: 16, tickDensity: 'sparse' },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'hairline',
  },
  marks: {
    bandFraction: 0.8,
    strokeWeight: 3,
    interpolation: 'linear',
    cornerRadius: 2,
    minSize: 2,
    point: { presence: 'omit', size: 64, halo: { presence: 'full', width: 1 } },
    slice: { gap: 1, gapStyle: 'rule' },
    separator: { presence: 'hairline', width: 1, source: 'surface' },
  },
  geometry: {
    line: { width: 3, interpolation: 'linear' },
    band: { cornerRadius: 2, fraction: 0.8 },
    arc: { gap: 1, gapStyle: 'rule' },
  },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['top', 'bottom', 'right'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'whenAmbiguous', unit: 'everyTick', numberFormat: { thousands: 'suffix', precision: 'integer', compact: {} } },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' } },
  chartDefaults: { 'Donut Chart': { innerRadius: 67 } },
};

// The heading.png specimen: four traffic series over thirty days, read off the image (millions).
const SERIES: [string, number[]][] = [
  ['Organic', [55, 55, 50, 54, 50, 47, 45, 43, 43, 38, 38, 38, 42, 45, 44, 44, 44, 46, 41, 43, 43, 43, 36, 40, 35, 40, 40, 35, 31, 35]],
  ['Paid', [3, 5, 4, 5, 7, 8, 7, 9, 7, 10, 10, 10, 10, 11, 10, 10, 10, 10, 11, 10, 10, 9, 9, 10, 11, 13, 15, 14, 17, 17]],
  ['Referral', [24, 30, 23, 32, 40, 40, 30, 43, 30, 46, 46, 46, 40, 52, 46, 46, 46, 52, 46, 46, 37, 37, 37, 46, 46, 55, 62, 70, 90, 88]],
  ['Social', [25, 23, 25, 21, 20, 20, 22, 19, 22, 18, 18, 18, 20, 17, 18, 18, 18, 17, 18, 19, 21, 21, 21, 18, 18, 16, 14, 12, 15, 12]],
];
const DAY = (i: number) => `2024-01-${String(i + 1).padStart(2, '0')}T00:00`; // local midnight, as the axis formats it
const TRAFFIC = SERIES.flatMap(([Source, values]) => values.map((v, i) => ({ Date: DAY(i), Source, Visits: v * 1e6 })));
const SOURCES = SERIES.map(([name]) => name);

const trafficFlint = (title?: string) => flintInput(theme, {
  chartType: 'Line Chart',
  data: TRAFFIC,
  semantic_types: { Date: 'Date', Source: 'Category', Visits: 'Count' },
  encodings: { x: 'Date', y: 'Visits', color: 'Source' },
  title,
});

const xDays = {
  field: 'Date', type: 'temporal', title: null,
  axis: { format: '%b %-d', values: [0, 4, 8, 12, 16, 20, 24, 28].map((i) => Date.parse(DAY(i))), labelColor: LABEL, labelPadding: 12, domain: true, domainColor: GRID, ticks: false, grid: false },
};
const yMillions = {
  field: 'Visits', type: 'quantitative', title: null, scale: { domain: [0, 100e6] },
  axis: { values: [0, 25e6, 50e6, 75e6, 100e6], labelExpr: "datum.value === 0 ? '0' : format(datum.value / 1e6, 'd') + 'M'", labelColor: LABEL, labelPadding: 16, gridColor: '#E6EAED', domain: false, ticks: false },
};

/** The chart inside the specimen card: no key (the card draws it as checkboxes), 3px straight lines. */
function trafficLines(o: { focus?: string; title?: string } = {}) {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), background: 'transparent', padding: { left: 6, right: 16, top: 6, bottom: 6 } },
    ...(o.title ? { title: { text: o.title } } : {}),
    width: W + 90,
    height: HEIGHT - 30,
    data: { values: TRAFFIC },
    mark: { type: 'line', strokeWidth: 3, strokeJoin: 'round' },
    encoding: {
      x: xDays,
      y: yMillions,
      color: { field: 'Source', type: 'nominal', scale: { domain: SOURCES, range: PALETTE }, legend: null },
      ...(o.focus ? { opacity: { condition: { test: `datum.Source === '${o.focus}'`, value: 1 }, value: 0.3 } } : {}),
    },
  };
}

const check = (color: string, faded = false) =>
  `<span style="display:inline-flex;width:16px;height:16px;border-radius:4px;background:${color};opacity:${faded ? 0.3 : 1};align-items:center;justify-content:center;margin-right:6px">`
  + '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5.2 L4.2 7.3 L8 3" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg></span>';

const legendRow = (focus?: string) =>
  `<div style="display:flex;gap:16px;font-family:${FONT};font-size:14px;color:${TEXT}">`
  + SOURCES.map((name, i) => `<span style="display:inline-flex;align-items:center;opacity:${focus && focus !== name ? 0.3 : 1}${focus === name ? ';text-decoration:underline dotted' : ''}">${check(PALETTE[i])}${name}</span>`).join('')
  + '</div>';

const tabs = `<div style="display:flex;gap:14px;font-family:${FONT};font-size:14px;color:${TEXT}">`
  + `<span style="border-bottom:3px solid #006DCA;padding-bottom:3px">1M</span><span>3M</span><span>6M</span><span>All time</span></div>`;

const card = { border: '1px solid #E0E1E9', borderRadius: '6px', background: '#FFFFFF', width: `${W + 150}px` };
const cardHeader = (title: string, focus?: string) =>
  `<div style="display:flex;align-items:center;gap:6px;padding:12px 16px;border-bottom:1px solid #E0E1E9;font-family:${FONT}">`
  + `<span style="font-size:16px;font-weight:700;color:${TEXT}">${title}</span><span style="font-family:Georgia,serif;font-style:italic;color:#A6A7AC;font-size:15px">i</span></div>`
  + `<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px 4px">${legendRow(focus)}${tabs}</div>`;

/** The tooltip-scheme specimen: guide line, dot, white card with a grey date, a row and a footer. */
function tooltipExpected() {
  const peak = UNEMPLOYMENT.find((row) => row.Year === 2020)!;
  const x = { field: 'Year', type: 'quantitative' };
  const y = { field: 'Unemployment (%)', type: 'quantitative' };
  const box = (dx: number, dy: number, w: number, h: number, fill: string, extra: Record<string, unknown> = {}) => ({
    data: { values: [peak] },
    mark: { type: 'rect', fill, cornerRadius: 6, xOffset: dx, x2Offset: dx + w, yOffset: dy, y2Offset: dy + h, ...extra },
    encoding: { x, x2: { field: 'Year' }, y, y2: { field: 'Unemployment (%)' } },
  });
  const text = (dx: number, dy: number, value: string, extra: Record<string, unknown> = {}) => ({
    data: { values: [peak] },
    mark: { type: 'text', align: 'left', baseline: 'middle', dx, dy, fontSize: 12, font: FONT, color: TEXT, text: value, ...extra },
    encoding: { x, y },
  });
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: { text: 'Unemployment rate' },
    width: W,
    height: HEIGHT,
    layer: [
      {
        data: { values: UNEMPLOYMENT },
        mark: { type: 'line', strokeWidth: 3, color: PALETTE[1] },
        encoding: {
          x: { ...x, title: null, scale: { domain: [2000, 2023], nice: false }, axis: { format: 'd', labelColor: LABEL, domainColor: GRID, ticks: false, grid: false, labelPadding: 12 } },
          y: { ...y, title: null, axis: { labelColor: LABEL, labelPadding: 16, gridColor: '#E6EAED', tickCount: 4, labelExpr: "datum.label + '%'" } },
        },
      },
      { data: { values: [peak] }, mark: { type: 'rule', color: '#ABADB5', strokeWidth: 1 }, encoding: { x } },
      { data: { values: [peak] }, mark: { type: 'point', filled: true, size: 100, color: PALETTE[1], stroke: '#FFFFFF', strokeWidth: 1 }, encoding: { x, y } },
      // A soft shadow, then the card, then its grey footer.
      box(-190, -46, 178, 90, 'rgba(25,29,33,0.08)', { cornerRadius: 8, xOffset: -192, x2Offset: -10, yOffset: -48, y2Offset: 46 }),
      box(-190, -46, 178, 88, '#FFFFFF', { stroke: '#E0E1E9', strokeWidth: 1 }),
      box(-189, 6, 176, 35, '#F4F5F9', { cornerRadius: 0, cornerRadiusBottomLeft: 5, cornerRadiusBottomRight: 5 }),
      text(-178, -32, '2020', { color: '#8D8E96' }),
      text(-178, -10, '●', { color: PALETTE[1], fontSize: 10 }),
      text(-166, -10, 'Unemployment'),
      text(-24, -10, '8.1%', { align: 'right' }),
      text(-178, 23, 'Pandemic layoffs', { color: '#393B42' }),
    ],
  };
}

/** A donut with the reserved grey for "Other", 1px gaps, the metric in the middle. */
function donutExpected() {
  const domain = BROWSERS.map((row) => row.Browser);
  const range = domain.map((name, i) => (name === 'Other' ? OTHER : PALETTE[i]));
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), legend: { ...(houseConfig(t).legend as object), orient: 'right', direction: 'vertical', symbolType: 'circle', labelFontSize: 14, labelColor: TEXT, offset: 24, rowPadding: 12 } },
    title: { text: 'Chrome dominates desktop browsing', subtitle: 'Desktop browser market share, %, 2024' },
    width: W,
    height: HEIGHT,
    data: { values: BROWSERS },
    layer: [
      {
        mark: { type: 'arc', outerRadius: 90, innerRadius: 60, stroke: '#FFFFFF', strokeWidth: 1 },
        encoding: {
          theta: { field: 'Share', type: 'quantitative', stack: true },
          color: { field: 'Browser', type: 'nominal', sort: domain, scale: { domain, range } },
        },
      },
      { data: { values: [{}] }, mark: { type: 'text', text: '100%', fontSize: 24, fontWeight: 'bold', font: FONT, color: TEXT, dy: -6 } },
      { data: { values: [{}] }, mark: { type: 'text', text: 'all browsers', fontSize: 12, font: FONT, color: SECONDARY, dy: 14 } },
    ],
  };
}

const semrush: StyleGuideTheme = {
  id: 'semrush',
  org: 'Semrush — Intergalactic design system (D3 chart)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the Intergalactic markdown and its OKLCH tokens (converted to hex). Inter is loaded on the page, so the type is real.',
    'Stated directly: the eight-colour “basic pack” in its fixed order (near-black, indigo, mint, lilac, amber…) with the second pack as the extended set and the “other data” grey as overflow; the blue 100–500 ramp; success/critical tokens as status; 16px bold card title, 14px secondary description, 12px grey axis labels, 14px key labels; dim horizontal grid only, no y-axis line, a hairline x axis, 12px/16px label gaps; 3px straight lines without dots; 2px rounded bar ends with ≥20% gaps; 1px donut gaps; a top-left key; abbreviated ticks.',
    'Not stated: the grid token. `--chart-grid-line` (#94A0AB) is darker than any screenshot, so the lighter x-axis token #D1D9DE is used for both. Everything the system does around and on top of the chart — the card, checkbox legend, period tabs, tooltip, hover fade, reserved greys for totals and “other” — has no field; see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'high',
      probe: 'signature',
      rule: 'heading.png: a white card with a bold title and an “i” icon over a hairline divider; a top-left row of checkbox swatches; period tabs (1M 3M 6M All time) at the right, the active one underlined in blue; 3px straight lines; dim horizontal gridlines; y labels 0/25M/50M… with no axis line; x labels “Jan 1, Jan 5…”.',
      current: 'Flint draws the lines, the dim grid and a top-left key on a bare canvas. The card, the info icon, the divider, the checkbox swatches and the period tabs have no field anywhere; the y ticks print in full.',
      expected: 'The specimen redrawn with the current palette (the screenshot predates the OKLCH tokens).',
      flint: trafficFlint('Traffic by source'),
      expectedSpec: trafficLines(),
      expectedFrame: { style: card, headerHtml: cardHeader('Traffic by source') },
      observed: 'Flint (left) gets the palette, the 3px straight lines and the dim grid right, and puts the key on top — but starting at the plot’s edge, not the title’s, with plain stroke swatches. Its y ticks read 0 … 100,000,000 under a rotated “Visits” title; its x ticks read “Jan 2024, 5, 7, 9 … 28”. Expected (right): the card with “Traffic by source ⓘ” over a divider, checkbox key and 1M/3M/6M/All time tabs on one row, 0–100M, Jan 1 … Jan 29.',
    },
    {
      id: 'card-container',
      title: 'Card.Title with an info icon, a divider, and controls in the header',
      kind: 'product-ui',
      severity: 'high',
      probe: 'card-container',
      rule: '“In our design system, data is typically placed within a Card”: Card.Title (bold, optional info icon), optional Card.Description, a hairline under the header, period switchers and tab toggles top-right; skeletons keep the title while loading.',
      current: 'ThemeSpec has a headline and a deck, both drawn inside the chart canvas. There is no container, no icon slot after the headline, no header divider, and no place for controls beside the key.',
      expected: 'See the signature’s expected panel: card border #E0E1E9, 6px radius, divider under the title, tabs right of the key.',
      proposal: '`layout.container: { border, radius, padding, header: { divider, trailingIcon } }` and a host slot (`toolbar`) beside the key, so the chart and the card share one key row.',
    },
    {
      id: 'checkbox-legend',
      title: 'The key is a row of coloured checkboxes',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'legend-swatch',
      rule: 'Legend at the top left above the chart as coloured checkboxes (interactive) or circles (static); hide it when there is only one dataset; if every item is unchecked, show only the x axis.',
      current: '`legend.swatch` accepts only `"auto"`, so Flint keys lines with a short stroke; the key is a picture, not a control.',
      expected: 'Rounded 16px squares in the series colour with a white tick, label 14px in primary text (signature panel).',
      proposal: '`legend.swatch: "checkbox" | "circle" | …` plus `interaction: legend-toggle` drawing the unchecked state from the theme.',
    },
    {
      id: 'tooltip',
      title: 'Tooltip: white card, grey date, rows with right-aligned values, a footer note',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'tooltip-style',
      rule: 'Tooltip follows the cursor 4px away, 12px padding, white with a soft shadow; a grey date header, one row per series (dot, name, right-aligned value), totals, “n/a” for missing; an optional grey footer message; a thin vertical guide line at the hovered x.',
      current: '`interaction` holds `tooltipFormat` and selection paint only. Flint hands Vega its default tooltip (a table of field: value pairs in the browser’s font) and draws no guide line.',
      expected: 'The tooltip-scheme specimen pinned on the 2020 reading.',
      proposal: '`interaction.tooltip: { surface, border, radius, shadow, padding, header: "x" , rows: "allSeries", valueAlign: "end", footer }` and `interaction.guideLine: { color, width }`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Unemployment rate',
      }),
      expectedSpec: tooltipExpected(),
      observed: 'Flint (left) is the bare line (a hover would raise Vega’s default tooltip). Expected (right): a grey guide line at 2020, an indigo dot with a white ring, and a white rounded card with a faint shadow: “2020” in grey, “● Unemployment … 8.1%” with the value right-aligned, and a grey footer “Pandemic layoffs”.',
    },
    {
      id: 'legend-hover',
      title: 'Hovering a key item fades the other series to 30%',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'focus-hover-state',
      rule: '“Reducing the transparency of other data categories to 30%” on legend hover; disabled items stay disabled; a hovered bar gets a translucent background band.',
      current: 'Flint has `hover-group-focus` and `legend-toggle` interaction presets, but the theme cannot say what the faded state looks like (opacity, whether the key fades too); the static spec shows every series at full strength.',
      expected: 'Referral hovered: its line and key item at full ink, the others at 30%.',
      proposal: '`interaction.focus: { contextOpacity: 0.3, fadeKey: true }`, read by the hover/legend presets.',
      flint: trafficFlint('Traffic by source'),
      expectedSpec: trafficLines({ focus: 'Referral' }),
      expectedFrame: { style: card, headerHtml: cardHeader('Traffic by source', 'Referral') },
      observed: 'Flint (left) has no faded state to show: all four lines at full ink. Expected (right): Referral’s mint line and key item at full strength, the other three lines and their checkboxes at 30%.',
    },
    {
      id: 'date-ticks',
      title: 'Daily ticks every few days as “Jan 1, Jan 5…”',
      kind: 'realization',
      severity: 'medium',
      probe: 'date-label-format',
      rule: 'Short “Jan 1”, “Jan 5” axis ticks at an even step; the tooltip header spells the date out (“January 10, 2021”).',
      current: 'There is no ThemeSpec field for date tick text. On thirty daily readings Flint labels “Jan 2024, 5, 7, 9 … 17, 20, 22, 24, 28”: the month and year on the first tick, bare day numbers after, and an uneven step (2, then 3, then 4 days).',
      expected: 'Eight labels, every four days, each with its month: Jan 1, Jan 5 … Jan 29.',
      proposal: 'An even calendar step for date ticks, and `annotation.dateLabels: { day: "MMM d", repeatMonth: true }` for the house’s short form.',
      flint: trafficFlint('Traffic by source'),
      expectedSpec: trafficLines({ title: 'Traffic by source' }),
      observed: 'Flint (left): “Jan 2024  5  7  9  11  13  15  17  20  22  24  28” — gaps of 2, then 3, then 4 days, and day numbers without their month. Expected (right): Jan 1, Jan 5, Jan 9 … Jan 29 at an even four-day step.',
    },
    {
      id: 'reserved-greys',
      addressed: { stage: 'R8', note: 'Total, Other and missing data take their greys through `ink.series.roles`.' },
      title: '“Other” and totals take reserved greys, not the next palette colour',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'reserved-category-ink',
      rule: 'Totals in --chart-palette-order-total-amount #818E99; other/missing data #BBC6CD; null #D8DFE3. Donuts run clockwise with 1px gaps and can carry a bold 24px metric in the hole.',
      current: 'ThemeSpec can name an `overflow` ink for series past the palette, but not an ink for a category that *means* “other” or “total”; Flint gives “Other” the fifth palette colour (amber). The KPI-in-the-hole is not a donut option.',
      expected: 'Four browsers in the basic pack, “Other” in light grey, a 1px white cut between slices, 24px bold metric in the centre.',
      proposal: '`ink.series.reserved: { other, total, missing }` matched against semantic roles the chart spec can mark (`semantic_types: { Browser: { other: "Other" } }`).',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: BROWSERS,
        semantic_types: { Browser: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Browser' },
        title: 'Chrome dominates desktop browsing',
        subtitle: 'Desktop browser market share, %, 2024',
      }),
      expectedSpec: donutExpected(),
      observed: 'Flint (left) gives “Other” the fifth basic-pack colour, amber, so it reads as a peer of the four browsers, and orders the ring alphabetically. Expected (right): Other in pale #BBC6CD, slices in data order with visible 1px cuts, and “100% / all browsers” in the hole.',
    },
    {
      id: 'abbreviated-ticks',
      addressed: { stage: 'A6', note: '`compact: {}` — 0, 20M … 100M (A6).' },
      title: 'Axis values rounded and abbreviated (25M, 50M)',
      kind: 'realization',
      severity: 'medium',
      probe: 'number-format',
      rule: '“Use rounded values on axes”: 25K, 20K, 15K; 25M, 50M, 100M.',
      current: '`annotation.numberFormat.thousands: "suffix"` is stated, but the measure axis prints full numbers (see the signature’s current panel).',
      expected: '0, 25M, 50M, 75M, 100M.',
      proposal: 'Apply `annotation.numberFormat` to measure-axis labels, not only to value labels.',
    },
    {
      id: 'legend-placement',
      title: 'The key drifts to the right in small tiles',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'legend-placement',
      rule: '“The recommended placement of the legend is the top left position above the chart”; below-left or right are alternatives.',
      current: 'The theme ranks `legend.placement: ["top", "bottom", "right"]` with `align: "start"`. In the 360px gap panels the key is on top; in the 320×210 gallery tiles grounding falls through to the third choice.',
      expected: 'Top-left keys throughout, the plot giving up a row of height rather than a column of width.',
      proposal: 'Let a house mark its first placement as strong (`legend.placement: [{ at: "top", strong: true }, …]`), and report each fall-through.',
      observed: 'Gallery: the anomaly, stacked-column, EV line, stacked-area, pie and Gapminder tiles all carry their key at the right; only the medals tile keeps it on top.',
    },
    {
      id: 'missing-data',
      title: 'Missing periods drawn as a dashed line; 0 is data, n/a is not',
      kind: 'chart-spec',
      severity: 'low',
      probe: 'missing-data',
      rule: '“Represent missing data with a dashed line” between the known points; a one-point series is a dot with a dashed line in the other-data grey; tooltips say “n/a”.',
      current: 'Neither the chart spec nor the theme can say which rows are missing rather than zero; Flint breaks or bridges the line as Vega-Lite does by default.',
      expected: 'Solid segments where data exists, a dashed segment in the series colour across the gap.',
      proposal: '`semantic_types` status for missing rows and `marks.gap: { style: "dashed" | "break" | "bridge" }` in the theme.',
    },
  ],
};

export default semrush;
