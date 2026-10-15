import type { ThemeSpec } from 'flint-chart';
import research from '../research/twilio-paste.json';
import { BROWSERS, EV_SHARE, flintInput, UNEMPLOYMENT } from '../probes';
import { houseConfig, W, H as HEIGHT, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";
const TEXT = '#121C2D';
const WEAK = '#606B85';
const WEAKER = '#8B93AA';
const AXIS = '#CACDD8';
const GRID = '#E1E3EA';
const PAGE = '#F4F4F6';
/** color-data-visualization-1..10, to be applied strictly in this order (from any starting point). */
const SEQUENCE = ['#001489', '#0E7C3A', '#0D3A1F', '#008CFF', '#394762', '#A67FE3', '#6D2ED1', '#8891AA', '#750C0C', '#EC5B5B'];
const DARK_SEQUENCE = ['#0263E0', '#C8AFF0', '#606B85', '#66B3FF', '#0E7C3A', '#FA9950', '#C35323', '#F6B1B1', '#8C5BD8', '#E8B407'];
const SHAPES = ['diamond', 'square', 'circle', 'triangle-up'];

const t: HouseTokens = {
  font: FONT,
  text: TEXT,
  muted: TEXT,
  grid: GRID,
  gridDash: [4, 4],
  axis: AXIS,
  background: '#FFFFFF',
  palette: SEQUENCE,
  titleSize: 16,
  titleWeight: 700,
  subtitleSize: 12,
  subtitleColor: WEAK,
  labelSize: 10,
  lineWidth: 3,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'twilio-paste',
  label: 'Twilio Paste',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: TEXT, secondary: WEAK, muted: WEAKER, inverse: '#FFFFFF' },
    structure: { grid: GRID, axis: AXIS, rule: AXIS },
    series: {
      single: SEQUENCE[0],
      categorical: SEQUENCE,
      // Paste publishes no sequential or diverging palette yet (“we don't yet have this type of color palette”).
    },
    accent: '#0263E0',
  },
  type: {
    headline: { family: FONT, size: 16, weight: 'bold', color: TEXT },
    deck: { family: FONT, size: 12, weight: 'regular', color: WEAK },
    axisLabel: { family: FONT, size: 10, weight: 'medium', color: TEXT },
    axisTitle: { family: FONT, size: 14, weight: 'semibold', color: TEXT },
    keyLabel: { family: FONT, size: 10, color: TEXT },
    valueLabel: { family: FONT, size: 10, weight: 'medium', color: TEXT },
    footnote: { family: FONT, size: 10, color: WEAKER },
  },
  structure: {
    axis: {
      categorical: { line: 'quiet', lineWeight: 1.5, ticks: 'omit' },
      measure: { line: 'quiet', lineWeight: 1.5, ticks: 'omit' },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'dashed', dash: [4, 4], weight: 1 },
    frame: 'omit',
    baseline: 'quiet',
  },
  marks: {
    strokeWeight: 3,
    interpolation: 'linear',
    cornerRadius: 2,
    // “Shapes can also be used in combination with color-coded data points.”
    point: { presence: 'full', size: 50, fill: 'solid' },
    redundantEncoding: 'always',
    redundantChannels: ['shape'],
    // “We recommend using a divider line to separate any touching colors.”
    separator: { presence: 'hairline', width: 1, source: 'surface' },
    slice: { gap: 1.5, gapStyle: 'rule' },
  },
  geometry: {
    line: { width: 3, interpolation: 'linear' },
    point: { presence: 'full', size: 50, vertexSize: 50, fill: 'solid' },
    band: { cornerRadius: 2 },
    arc: { gap: 1.5, gapStyle: 'rule' },
  },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'center' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'whenAmbiguous', axisTitlePlacement: 'rotated' },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' } },
};

const EV4 = ['Norway', 'China', 'Germany', 'United States'];
const EV_ROWS = EV_SHARE.filter((row) => EV4.includes(row.Country));

const evFlint = () => flintInput(theme, {
  chartType: 'Line Chart',
  data: EV_ROWS,
  semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
  encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
  title: 'Norway leads electric-car sales',
  subtitle: 'Share of new cars sold that are electric, %',
});

/** The line-chart specimen: four series in sequence, a marker shape each, dashed grid, L-shaped axis, on a card. */
function linesExpected(o: { dark?: boolean } = {}) {
  const palette = o.dark ? DARK_SEQUENCE : SEQUENCE;
  const ink = o.dark
    ? { bg: '#0F1621', text: '#FFFFFF', weak: '#AEB2C1', grid: '#394762', axis: '#606B85' }
    : { bg: '#FFFFFF', text: TEXT, weak: WEAK, grid: GRID, axis: AXIS };
  const color = { field: 'Country', type: 'nominal', scale: { domain: EV4, range: palette }, title: null };
  const shape = { field: 'Country', type: 'nominal', scale: { domain: EV4, range: SHAPES }, title: null };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...houseConfig({ ...t, background: ink.bg, text: ink.text, muted: ink.text, subtitleColor: ink.weak, grid: ink.grid, axis: ink.axis }),
      axis: { ...(houseConfig(t).axis as object), labelColor: ink.text, labelFontWeight: 500, labelFontSize: 10, domainColor: ink.axis, domainWidth: 1.5, gridColor: ink.grid, gridDash: [4, 4] },
      axisY: { domain: true, grid: true },
      legend: { orient: 'bottom', direction: 'horizontal', labelColor: ink.text, labelFontSize: 10, symbolStrokeWidth: 3, columnPadding: 16, layout: { bottom: { anchor: 'middle' } } },
    },
    title: { text: 'Norway leads electric-car sales', subtitle: 'Share of new cars sold that are electric, %' },
    width: W,
    height: HEIGHT,
    data: { values: EV_ROWS },
    encoding: {
      x: { field: 'Year', type: 'ordinal', title: null, axis: { labelAngle: 0 } },
      y: { field: 'EV share (%)', type: 'quantitative', title: null },
      color,
    },
    layer: [
      { mark: { type: 'line', strokeWidth: 3 } },
      { mark: { type: 'point', filled: true, size: 60, opacity: 1 }, encoding: { shape } },
    ],
  };
}

const card = { background: PAGE, padding: '18px' };

/** A pie whose colours start at 5 in the sequence and continue in order; white dividers between slices. */
function rotatedPieExpected(start: number) {
  const range = BROWSERS.map((_, i) => SEQUENCE[(start - 1 + i) % SEQUENCE.length]);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), legend: { orient: 'bottom', direction: 'horizontal', labelColor: TEXT, labelFontSize: 10, symbolType: 'circle', title: null, layout: { bottom: { anchor: 'middle' } } } },
    title: { text: 'Chrome dominates desktop browsing', subtitle: 'Desktop browser market share, %, 2024' },
    width: W,
    height: HEIGHT,
    data: { values: BROWSERS },
    mark: { type: 'arc', outerRadius: 92, stroke: '#FFFFFF', strokeWidth: 1.5 },
    encoding: {
      theta: { field: 'Share', type: 'quantitative', stack: true },
      color: { field: 'Browser', type: 'nominal', sort: BROWSERS.map((row) => row.Browser), scale: { range } },
    },
  };
}

/** The Paste tooltip: inverse #121C2D card, #8891AA border, 8px radius, 12px padding, white 14px Inter. */
function tooltipExpected() {
  const peak = UNEMPLOYMENT.find((row) => row.Year === 2020)!;
  const x = { field: 'Year', type: 'quantitative' };
  const y = { field: 'Unemployment (%)', type: 'quantitative' };
  const at = { x, y };
  const span = { x2: { field: 'Year' }, y2: { field: 'Unemployment (%)' } };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), axisY: { domain: true, grid: true } },
    title: { text: 'Unemployment rate', subtitle: 'United States, %' },
    width: W,
    height: HEIGHT,
    layer: [
      {
        data: { values: UNEMPLOYMENT },
        mark: { type: 'line', strokeWidth: 3, color: SEQUENCE[0], point: { filled: true, size: 30, shape: 'diamond' } },
        encoding: {
          x: { ...x, title: null, scale: { domain: [2000, 2023], nice: false }, axis: { format: 'd', values: [2000, 2005, 2010, 2015, 2020], labelColor: TEXT, labelFontWeight: 500, domainColor: AXIS, domainWidth: 1.5 } },
          y: { ...y, title: null, scale: { domain: [0, 12] }, axis: { tickCount: 4, labelColor: TEXT, labelFontWeight: 500, gridDash: [4, 4], gridColor: GRID, domainColor: AXIS, domainWidth: 1.5 } },
        },
      },
      { data: { values: [peak] }, mark: { type: 'rect', fill: TEXT, stroke: '#8891AA', strokeWidth: 1, cornerRadius: 8, xOffset: -214, x2Offset: -14, yOffset: -26, y2Offset: 30 }, encoding: { ...at, ...span } },
      { data: { values: [peak] }, mark: { type: 'text', align: 'left', dx: -202, dy: -11, fontSize: 12, font: FONT, color: '#FFFFFF', text: '2020' }, encoding: at },
      { data: { values: [peak] }, mark: { type: 'text', align: 'left', dx: -202, dy: 12, fontSize: 14, font: FONT, color: '#FFFFFF', text: '◆ Unemployment:' }, encoding: at },
      { data: { values: [peak] }, mark: { type: 'text', align: 'right', dx: -26, dy: 12, fontSize: 14, fontWeight: 'bold', font: FONT, color: '#FFFFFF', text: '8.1%' }, encoding: at },
    ],
  };
}

function markersExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), axisY: { domain: true, grid: true } },
    title: { text: 'Unemployment rate', subtitle: 'United States, %' },
    width: W,
    height: HEIGHT,
    data: { values: UNEMPLOYMENT },
    mark: { type: 'line', strokeWidth: 3, color: SEQUENCE[0], point: { filled: true, size: 50, shape: 'circle', color: SEQUENCE[0] } },
    encoding: {
      x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2000, 2023], nice: false }, axis: { format: 'd', values: [2000, 2005, 2010, 2015, 2020], labelColor: TEXT, labelFontWeight: 500, domainColor: AXIS, domainWidth: 1.5 } },
      y: { field: 'Unemployment (%)', type: 'quantitative', title: null, scale: { domain: [0, 12] }, axis: { tickCount: 4, labelColor: TEXT, labelFontWeight: 500, gridDash: [4, 4], gridColor: GRID, domainColor: AXIS, domainWidth: 1.5 } },
    },
  };
}

const twilio: StyleGuideTheme = {
  id: 'twilio-paste',
  org: 'Twilio — Paste design system',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the Paste data-visualisation foundations page, its design tokens and the `usePasteHighchartsTheme` hook. Inter is loaded on the page.',
    'Stated directly: the strict ten-colour sequence (navy, green, dark green, blue, slate, lilac, purple, grey, maroon, coral) as the categorical set; #121C2D text with #606B85 for the deck; a 16px bold title, 12px deck, 10px medium axis labels, 14px semibold axis titles, 10px key; light dashed horizontal gridlines; a thin grey-blue L of axis lines as the guide’s images show (the Highcharts hook strokes the x axis in text colour; the specimens do not); 3px lines with a solid marker at every reading and a different marker shape per series (`redundantEncoding: always`, `["shape"]`); 2px column corners; white dividers between touching colours; a centred key underneath.',
    'Not stated: the rule that a chart may start anywhere in the sequence but must continue in order, the inverse tooltip, the dark-mode sequence and the always-on accessibility module. Paste has no sequential or diverging palette, so none is stated — see what Flint does with the heatmap.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Line-chart specimen: white cards on a light grey page; four series in palette order, ~3px, a filled marker at every reading in a different shape per series (diamond, square, circle, triangle); light dashed horizontal gridlines; a thin grey-blue axis line on the left and bottom; Inter, 16px bold title over a 12px weak-grey subtitle; Highcharts’ centred key below.',
      current: 'Flint draws most of it: dashed grid, the L of axis lines, a marker shape per series, Inter, the bold title and weak deck. Its markers are small (`geometry.point.vertexSize: 50` does not enlarge them), its fourth shape is a cross rather than a triangle (the shape order cannot be stated), the key is sorted alphabetically, and there is no card or page.',
      expected: 'The specimen on the EV data: navy, green, dark green, blue; ◆ ■ ● ▲.',
      flint: evFlint(),
      expectedSpec: linesExpected(),
      expectedFrame: { style: card },
      observed: 'Flint (left) is close: navy/green/dark-green/blue lines with ●■▲✚ markers, dashed grid, grey-blue L axis, centred key. But the markers are barely larger than the 3px line, so the shapes are hard to tell apart, and it adds a 14px semibold rotated “EV share (%)” title. Expected (right): bold ◆■●▲ markers in the specimen’s order, keyed in data order, on the white card over the grey page.',
    },
    {
      id: 'sequence-offset',
      title: 'Start anywhere in the sequence, then keep its order',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'palette-rotation',
      rule: '“The colors of this palette should be applied in sequence strictly as described … You can start anywhere in the sequence, but be sure to follow the remaining order (i.e. You can start with 5 … 6, 7, 8, 9, 10, 1, 2, 3, 4).” The pie specimens start at 1, 5 and 2.',
      current: 'A ThemeSpec palette always starts at its first ink, and the chart spec has no way to ask for an offset; reordering the palette per chart means writing a new theme.',
      expected: 'The browsers pie starting at colour 5: slate, lilac, purple, grey, maroon — with white dividers between slices.',
      proposal: '`chart_spec.paletteOffset: n` (or `colorStart`), wrapping round `ink.series.categorical`, with the theme declaring `ink.series.rotation: "strict"` so grounding never reorders.',
      flint: flintInput(theme, {
        chartType: 'Pie Chart',
        data: BROWSERS,
        semantic_types: { Browser: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Browser' },
        title: 'Chrome dominates desktop browsing',
        subtitle: 'Desktop browser market share, %, 2024',
      }),
      expectedSpec: rotatedPieExpected(5),
      observed: 'Flint (left) starts at colour 1 (navy Chrome, then greens and blue) and does draw the white dividers between slices. Expected (right): the same pie starting at colour 5 — slate Chrome, lilac, purple, grey, maroon — as the second specimen does.',
    },
    {
      id: 'tooltip',
      title: 'Tooltip: the inverse card',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'tooltip-style',
      rule: 'Tooltip background color-background-body-inverse #121C2D, 1px border color-border-inverse #8891AA, 8px radius, 12px padding, white 14px Inter text.',
      current: '`interaction` holds `tooltipFormat` and selection paint only; Flint hands Vega its default light tooltip, in the browser’s font.',
      expected: 'A dark navy card with a grey hairline border, white text, pinned at the 2020 reading.',
      proposal: '`interaction.tooltip: { surface: "inverse", border, radius, padding, type }`, reading `ink.text.inverse` for the text.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Unemployment rate',
        subtitle: 'United States, %',
      }),
      expectedSpec: tooltipExpected(),
      observed: 'Flint (left): the bare line. Expected (right): a #121C2D rounded card with a grey hairline border and white Inter text, “2020” over “◆ Unemployment: 8.1%”.',
    },
    {
      id: 'dark-mode',
      title: 'Dark mode swaps to its own sequence',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'dark-mode',
      rule: 'Dark theme: chart background gray-110 #0F1621 and a different, lighter sequence — #0263E0, #C8AFF0, #606B85, #66B3FF, #0E7C3A, #FA9950 …',
      current: 'One ThemeSpec is one mode. The dark sequence has to live in a second theme, nothing links the two, and with this theme the chart stays white in a dark console.',
      expected: 'The signature chart on #0F1621 in the dark sequence, white labels.',
      proposal: '`modes: { dark: { ink: { surface, text, structure, series } } }` inside one ThemeSpec, chosen by the host.',
      flint: evFlint(),
      expectedSpec: linesExpected({ dark: true }),
      observed: 'Flint (left): the light chart, navy first. Expected (right): #0F1621 background, white labels, dim dashed grid, and the dark sequence (#0263E0, lilac, slate, light blue) with the same marker shapes.',
    },
    {
      id: 'markers',
      title: 'Every reading carries a marker, single series too',
      kind: 'realization',
      severity: 'medium',
      probe: 'legend-swatch',
      rule: 'Line series carry a filled marker at every data point (the palette illustration shows one on every reading), the shape distinguishing series where there are several.',
      current: 'The theme states `marks.point.presence: "full"` (and `geometry.point.presence: "full"`). On multi-series lines the redundant shape channel puts a marker on each reading; on a single series nothing does.',
      expected: 'The unemployment line with a navy marker on each year.',
      proposal: 'Realise `point.presence: "full"` on every line chart, not only when a shape channel is in play.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Unemployment rate',
        subtitle: 'United States, %',
      }),
      expectedSpec: markersExpected(),
      observed: 'Flint (left): a bare navy line, no markers at all. Expected (right): a filled navy dot on each of the 24 years.',
    },
    {
      id: 'no-ramp',
      title: 'No sequential palette — and Flint invents one',
      kind: 'visual-quality',
      severity: 'low',
      probe: 'ramp-domain',
      rule: '“We don’t yet have this type of color palette available” (sequential and diverging); every colour must hold 3:1 against the background.',
      current: 'The theme states no ramp. For the gallery’s temperature heatmap Flint silently derives one from the single ink (pale lavender → navy #001489) and spreads it over a zero-centred −34…34 domain, though the data run −9…34; the pale end is not checked against the 3:1 rule.',
      expected: 'Either a report that the house has no continuous palette, or a ramp built from one Paste hue (blue-10 → blue-100) with the light end held at 3:1.',
      proposal: 'Report `ink.series.sequential` as missing instead of silently substituting; optionally derive a ramp from `series.single` with `endpointsAgainstSurface`.',
      observed: 'Gallery heatmap: lavender-to-navy cells under a −34 … 34 key; the coldest cells (Moscow, January) are already mid-lavender and the palest end of the ramp is unused.',
    },
    {
      id: 'accessibility',
      title: 'Keyboard navigation and screen-reader descriptions always on',
      kind: 'product-ui',
      severity: 'low',
      probe: 'accessibility-default',
      rule: '“Always include the Highcharts Accessibility module” — keyboard navigation between points, screen-reader descriptions, WCAG 2.1.',
      current: 'Flint has an `accessible-navigation` interaction preset, but it is the chart author’s choice per chart; a theme cannot require it for every chart in the house.',
      expected: 'Every Paste chart reachable by keyboard and described to screen readers, without the author asking.',
      proposal: '`interaction.defaults: ["accessible-navigation"]` in the ThemeSpec, merged into every chart’s `interaction_spec`.',
    },
  ],
};

export default twilio;
