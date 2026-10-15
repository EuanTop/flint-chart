import type { ThemeSpec } from 'flint-chart';
import research from '../research/liferay.json';
import { EV_SHARE, flintInput, forecastProbe, MEDALS } from '../probes';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif";
const INK = '#272833';
const SLATE = '#6B6C7E';
const LINE = '#E7E7ED';
const OTHER = '#F1F2F5';
const BLUE = '#4B9FFF';
/** Lexicon's flat colours, in the order the guide makes mandatory. */
const FLAT = ['#4B9FFF', '#FFB46E', '#FF5F5F', '#50D2A0', '#FF73C3', '#9CE269', '#AF78FF', '#FFD76E', '#5FC8FF', '#7785FF'];
const BLUES = ['#B1D4FF', '#95C5FF', '#7EB7FF', '#64A9FF', '#4B9FFF', '#318DFF', '#187FFF', '#0071FD', '#0065E4'];
/** A rounded square in Vega's unit symbol space: the swatch every Lexicon key uses. */
const ROUNDED_SQUARE = 'M -1 -0.55 Q -1 -1 -0.55 -1 L 0.55 -1 Q 1 -1 1 -0.55 L 1 0.55 Q 1 1 0.55 1 L -0.55 1 Q -1 1 -1 0.55 Z';

const t: HouseTokens = {
  font: FONT,
  text: INK,
  muted: SLATE,
  grid: LINE,
  gridDash: [4, 3],
  axis: null,
  background: '#FFFFFF',
  palette: FLAT,
  highlight: BLUE,
  context: OTHER,
  titleSize: 16,
  titleWeight: 600,
  subtitleSize: 13,
  labelSize: 12,
  lineWidth: 2,
  legendOrient: 'right',
};

const theme: ThemeSpec = {
  id: 'liferay',
  label: 'Liferay Lexicon',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF', plot: '#FFFFFF' },
    text: { primary: INK, secondary: SLATE, muted: SLATE },
    structure: { grid: LINE, axis: LINE, frame: LINE, rule: LINE },
    series: {
      single: BLUE,
      categorical: FLAT,
      categoricalExtended: FLAT,
      overflow: OTHER,
      sequential: { stops: BLUES, space: 'lab', consumption: 'interpolate' },
    },
    accent: BLUE,
  },
  type: {
    headline: { family: FONT, size: 16, weight: 'semibold', color: INK },
    deck: { family: FONT, size: 13, color: SLATE },
    axisLabel: { family: FONT, size: 12, color: SLATE },
    axisTitle: { family: FONT, size: 12, color: SLATE },
    keyLabel: { family: FONT, size: 12, color: SLATE },
    valueLabel: { family: FONT, size: 12, color: INK },
    footnote: { family: FONT, size: 11, color: SLATE },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit' },
    },
    // The line-chart specimen: solid light rules both ways inside the frame.
    grid: { measure: 'quiet', category: 'quiet', style: 'solid', weight: 1 },
    frame: 'full',
    baseline: 'omit',
  },
  marks: {
    strokeWeight: 2,
    cornerRadius: 0,
    fillOpacity: 0.1,
    redundantEncoding: 'always',
    redundantChannels: ['dash', 'shape'],
    point: { presence: 'full', size: 50, fill: 'solid' },
    slice: { gap: 2, gapStyle: 'rule' },
  },
  geometry: {
    line: { width: 2, interpolation: 'linear' },
    point: { presence: 'full', size: 50, vertexSize: 64, fill: 'solid' },
    area: { opacity: 0.1, edge: 'full', edgeWidth: 2 },
    // Small gaps inside a group, a bar's width between groups (G1).
    band: { cornerRadius: 0, group: { gap: 0.1, spacing: 1 } },
    arc: { gap: 2, gapStyle: 'rule' },
  },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['right', 'top'], direction: 'vertical', title: 'whenAmbiguous', align: 'center' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'omit' },
  layout: { titleBlock: { anchor: 'start' } },
  // The donut specimen's ring is about 40% of its radius; the template's hole is in px.
  chartDefaults: { 'Donut Chart': { innerRadius: 40 } },
  variants: [
    {
      when: { hasBandedAxis: true },
      then: { structure: { grid: { measure: 'quiet', category: 'omit', style: 'dashed', dash: [4, 3] } } },
      because: 'The bar-chart specimen rules dashed horizontal gridlines only; the line-chart specimen rules solid lines both ways.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Data re-keyed from the guide's own specimens (charts-12, charts-16).
// ---------------------------------------------------------------------------

const DEVICES = ['Desktop', 'Mobile', 'Tablet', 'TVs'];
const QUARTERS = ['First quarter', 'Second quarter', 'Third quarter'];
const VISITS = ([[322, 246, 228, 271], [228, 326, 352, 190], [161, 122, 190, 73]] as number[][])
  .flatMap((row, q) => row.map((Visits, d) => ({ Quarter: QUARTERS[q], Device: DEVICES[d], Visits })));
const SOCIAL = [['Facebook', 38], ['Twitter', 33], ['Linkedin', 14], ['Other', 15]].map(([Network, Share]) => ({ Network, Share }));

const config = (extra: Record<string, unknown> = {}) => {
  const base = houseConfig(t);
  return {
    ...base,
    view: { stroke: LINE, strokeWidth: 1, cornerRadius: 4 },
    axis: { ...(base.axis as object), labelColor: SLATE, labelFontSize: 12, labelPadding: 8 },
    legend: {
      ...(base.legend as object),
      orient: 'none',
      legendX: W + 24,
      legendY: H / 2 - 44,
      direction: 'vertical',
      labelColor: SLATE,
      labelFontSize: 13,
      symbolType: ROUNDED_SQUARE,
      symbolSize: 180,
      symbolStrokeWidth: 0,
      rowPadding: 10,
      offset: 22,
    },
    ...extra,
  };
};

const vl = (body: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  config: config(extra),
  ...body,
});

/** charts-12: grouped columns in a rounded frame, dashed rules, key at the right in reverse order. */
function signature() {
  return vl({
    width: W,
    height: H,
    data: { values: VISITS },
    mark: { type: 'bar' },
    encoding: {
      x: { field: 'Quarter', type: 'nominal', sort: QUARTERS, title: null, axis: { labelAngle: 0, domain: false }, scale: { paddingInner: 0.28, paddingOuter: 0.2 } },
      xOffset: { field: 'Device', sort: DEVICES, scale: { paddingInner: 0.25 } },
      y: { field: 'Visits', type: 'quantitative', title: null, scale: { domain: [0, 400] }, axis: { tickCount: 4, gridDash: [4, 3], gridColor: LINE } },
      color: { field: 'Device', type: 'nominal', sort: DEVICES, scale: { range: FLAT.slice(0, 4) }, legend: { values: [...DEVICES].reverse() } },
    },
  });
}

/** charts-26: four lines told apart by colour, dash and marker together. */
const LINE_STYLE: Record<string, { dash: number[]; shape: string }> = {
  Norway: { dash: [2, 3], shape: 'square' },
  China: { dash: [1, 1.5], shape: 'M -1 -0.45 L 1 -0.45 L 1 0.45 L -1 0.45 Z' },
  Germany: { dash: [5, 3], shape: 'circle' },
  'United States': { dash: [2, 3], shape: 'triangle-up' },
};
const EV_COUNTRIES = ['Norway', 'China', 'Germany', 'United States'];

function redundantLines() {
  const domain = EV_COUNTRIES;
  return vl({
    width: W,
    height: H,
    data: { values: EV_SHARE },
    mark: { type: 'line', strokeWidth: 2, point: { filled: true, size: 55 } },
    encoding: {
      x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2018, 2023] }, axis: { values: [2018, 2020, 2022, 2023], format: 'd', grid: true, gridColor: LINE } },
      y: { field: 'EV share (%)', type: 'quantitative', title: null, scale: { domain: [0, 100] }, axis: { tickCount: 5 } },
      color: { field: 'Country', type: 'nominal', scale: { domain, range: FLAT.slice(0, 4) }, legend: { symbolType: 'stroke' } },
      strokeDash: { field: 'Country', type: 'nominal', scale: { domain, range: domain.map((c) => LINE_STYLE[c].dash) } },
      shape: { field: 'Country', type: 'nominal', scale: { domain, range: domain.map((c) => LINE_STYLE[c].shape) } },
    },
  }, {
    legend: { ...(config().legend as object), symbolType: undefined, symbolSize: 70, symbolStrokeWidth: 2 },
  });
}

/** chart-stacked-bar: segments stack in colour order from the bottom, the key reads the stack top-down. */
function stackedLegend() {
  return vl({
    width: W,
    height: H,
    data: { values: VISITS },
    mark: { type: 'bar' },
    encoding: {
      x: { field: 'Quarter', type: 'nominal', sort: QUARTERS, title: null, axis: { labelAngle: 0 }, scale: { paddingInner: 0.45 } },
      y: { field: 'Visits', type: 'quantitative', title: null, axis: { tickCount: 5, gridDash: [4, 3] } },
      color: { field: 'Device', type: 'nominal', sort: DEVICES, scale: { range: FLAT.slice(0, 4) }, legend: { values: [...DEVICES].reverse() } },
      order: { field: 'order', type: 'quantitative', sort: 'ascending' },
    },
    transform: [{ calculate: `indexof(${JSON.stringify(DEVICES)}, datum.Device)`, as: 'order' }],
  });
}

/** chart-interaction: the selected line keeps 2px; the rest drop to 1px at 40% opacity, same hue. */
function selection() {
  const domain = EV_COUNTRIES;
  const selected = "datum.Country === 'China'";
  return vl({
    width: W,
    height: H,
    layer: [
      {
        data: { values: EV_SHARE },
        mark: { type: 'line', point: { filled: true, size: 45 } },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2018, 2023] }, axis: { values: [2018, 2020, 2022, 2023], format: 'd', grid: true, gridColor: LINE } },
          y: { field: 'EV share (%)', type: 'quantitative', title: null, scale: { domain: [0, 100] }, axis: { tickCount: 5 } },
          color: { field: 'Country', type: 'nominal', scale: { domain, range: FLAT.slice(0, 4) }, legend: null },
          opacity: { condition: { test: selected, value: 1 }, value: 0.4 },
          strokeWidth: { condition: { test: selected, value: 2 }, value: 1 },
        },
      },
      {
        data: { values: EV_SHARE.filter((row) => row.Country === 'China' && row.Year === 2022) },
        mark: { type: 'rect', color: '#FFFFFF', stroke: LINE, cornerRadius: 4, xOffset: -52, x2Offset: 44, yOffset: -50, y2Offset: -12 },
        encoding: { x: { field: 'Year', type: 'quantitative' }, x2: { field: 'Year' }, y: { field: 'EV share (%)', type: 'quantitative' }, y2: { field: 'EV share (%)' } },
      },
      {
        data: { values: EV_SHARE.filter((row) => row.Country === 'China' && row.Year === 2022) },
        mark: { type: 'text', fontSize: 12, fontWeight: 600, color: INK, dy: -38, text: 'China · 2022' },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'EV share (%)', type: 'quantitative' } },
      },
      {
        data: { values: EV_SHARE.filter((row) => row.Country === 'China' && row.Year === 2022) },
        mark: { type: 'text', fontSize: 12, color: SLATE, dy: -22 },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'EV share (%)', type: 'quantitative' }, text: { field: 'label' } },
        transform: [{ calculate: "datum['EV share (%)'] + '% of sales'", as: 'label' }],
      },
      // The key, drawn by hand so the selected entry can turn semi-bold.
      ...domain.map((country, i) => ({
        data: { values: [{}] },
        layer: [
          { mark: { type: 'point', shape: ROUNDED_SQUARE, size: 160, filled: true, strokeWidth: 0, color: FLAT[i], opacity: country === 'China' ? 1 : 0.4 }, encoding: { x: { value: W + 30 }, y: { value: H / 2 - 42 + i * 28 } } },
          { mark: { type: 'text', align: 'left', baseline: 'middle', fontSize: 13, color: SLATE, fontWeight: country === 'China' ? 600 : 400, text: country }, encoding: { x: { value: W + 44 }, y: { value: H / 2 - 42 + i * 28 } } },
        ],
      })),
    ],
  }, { padding: { left: 14, top: 14, bottom: 14, right: 120 } });
}

const MEDAL_ROWS = MEDALS.filter((row) => ['United States', 'China', 'Japan', 'Australia'].includes(row.Country));
const MEDAL_TITLE = 'The US and China shared the top of the medal table';

/** Flat square columns in the house frame, no rim. */
function medals() {
  return vl({
    title: { text: MEDAL_TITLE, subtitle: 'Paris 2024 Olympic medals by type' },
    width: W,
    height: H,
    data: { values: MEDAL_ROWS },
    mark: { type: 'bar' },
    encoding: {
      x: { field: 'Country', type: 'nominal', sort: null, title: null, axis: { labelAngle: 0 }, scale: { paddingInner: 0.3, paddingOuter: 0.2 } },
      xOffset: { field: 'Medal', sort: ['Gold', 'Silver', 'Bronze'], scale: { paddingInner: 0.2 } },
      y: { field: 'Count', type: 'quantitative', title: null, axis: { tickCount: 5 } },
      color: { field: 'Medal', type: 'nominal', sort: ['Gold', 'Silver', 'Bronze'], scale: { range: FLAT.slice(0, 3) } },
    },
  });
}

/** Overlapping areas at 10%, each with its 2px line, so every overlap stays visible. */
function overlappingAreas() {
  const domain = EV_COUNTRIES;
  return vl({
    width: W,
    height: H,
    data: { values: EV_SHARE },
    mark: { type: 'area', opacity: 0.1, line: { strokeWidth: 2, opacity: 1 }, point: { filled: true, size: 45, opacity: 1 } },
    encoding: {
      x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2018, 2023] }, axis: { values: [2018, 2020, 2022, 2023], format: 'd', grid: true, gridColor: LINE } },
      y: { field: 'EV share (%)', type: 'quantitative', title: null, stack: null, scale: { domain: [0, 100] }, axis: { tickCount: 5 } },
      color: { field: 'Country', type: 'nominal', scale: { domain, range: FLAT.slice(0, 4) } },
    },
  });
}

/** charts-16: legend row above the framed card, donut with white cuts, “Other” in near-white grey. */
function donut() {
  const order = SOCIAL.map((row) => row.Network);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...config(),
      view: { stroke: null },
      legend: { ...(config().legend as object), orient: 'top', direction: 'horizontal', columnPadding: 22, offset: 12 },
    },
    width: 240,
    height: H,
    layer: [
      {
        data: { values: [{}] },
        mark: { type: 'rect', fill: null, stroke: LINE, strokeWidth: 1, cornerRadius: 4 },
        encoding: { x: { value: 0 }, x2: { value: 240 }, y: { value: 0 }, y2: { value: H } },
      },
      {
        data: { values: SOCIAL },
        mark: { type: 'arc', innerRadius: 44, outerRadius: 74, stroke: '#FFFFFF', strokeWidth: 3 },
        encoding: {
          theta: { field: 'Share', type: 'quantitative', stack: true },
          order: { field: 'i', type: 'quantitative' },
          color: { field: 'Network', type: 'nominal', sort: order, scale: { domain: order, range: [...FLAT.slice(0, 3), OTHER] }, legend: { values: order } },
        },
        transform: [{ calculate: `indexof(${JSON.stringify(order)}, datum.Network)`, as: 'i' }],
      },
    ],
    resolve: { scale: { theta: 'independent' } },
  };
}

const liferay: StyleGuideTheme = {
  id: 'liferay',
  org: 'Liferay (Lexicon design system)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the Lexicon chart pages (read from the public liferay.design repo — the live site now 404s). Lexicon is a product system: its charts are untitled dashboard tiles, so nearly everything it states is about ink, marks and behaviour rather than a title block.',
    'Stated directly: the ten flat colours in their mandatory order (blue `#4B9FFF` first, also the single-series ink), the nine-step blue ramp for heat maps, 2px lines, 10% area fills, white cuts between donut slices, no value labels inside coloured areas (`dataLabels.show: never`), no axis titles, a light frame around the plot with no axis lines or ticks, a vertical key at the right, and — through a `variants` entry on `hasBandedAxis` — dashed horizontal rules for bars against solid rules both ways for lines. The redundant dash + marker per series is stated with `marks.redundantEncoding: always` over `dash` and `shape`.',
    'Approximated: the guide never names a typeface; the specimens look like Source Sans Pro, set here as Source Sans 3. The slate label grey (`#6B6C7E`) and frame grey (`#E7E7ED`) are Clay tokens matched to the specimens, not chart tokens the guide states. The “Other” slice’s near-white grey is put in `overflow`, which only reaches a series when the palette runs out.',
    'Not stateable: the frame’s rounded corners, rounded-square key swatches, the key reading a stack top-down, the selection model (others to 40% opacity, lines to 1px, key entry semi-bold), the forecast background and the “Other”-is-grey rule — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'charts-12: grouped columns in the flat colours, square corners, small gaps inside a group and wide ones between groups; the plot sits in a thin light-grey rounded frame with dashed horizontal rules; slate labels outside the frame, no axis titles, no title; the key at the right, vertically centred, rounded-square swatches.',
      current: 'Flint is given the same quarters × devices data with the house theme: frame, dashed measure rules (via the banded-axis variant), right-hand key without title.',
      expected: 'The guide’s grouped-column specimen, re-keyed.',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: VISITS,
        semantic_types: { Quarter: 'Category', Device: 'Category', Visits: 'Count' },
        encodings: { x: 'Quarter', y: 'Visits', group: 'Device' },
      }),
      expectedSpec: signature(),
      observed: 'Flint is close: flat colours in order, square columns, light frame, dashed horizontal rules only (the banded-axis variant works), slate labels, untitled key at the right, vertically centred. It differs in four places: every column carries a light-grey 2px rim (see gap 8), the quarter names are wrapped onto two lines although each fits its group, the space between groups is barely wider than the space inside one, and the key lists Desktop first where the guide lists TVs first. The frame is square-cornered.',
    },
    {
      id: 'redundant-encoding',
      title: 'Each line differs by colour, dash and marker together',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'redundant-encoding',
      rule: '“Only use borders, 2px thickness … Differentiate them using dash types, shape types, and colors.” charts-26 pairs each colour with its own dash and marker (blue dotted squares, orange fine dots with bars, red dashes with circles, teal dots with triangles); the key repeats line + marker.',
      current: 'Stated with `marks.redundantEncoding: "always"`, `redundantChannels: ["dash", "shape"]` and `geometry.point: { presence: "full", vertexSize: 64 }`. Flint does give each series a dash and a marker, but from its own sequences: there is no field for the guide’s pairing of a specific dash and marker with each flat colour.',
      expected: 'Four 2px lines, each with the dash and marker the guide pairs with its colour, solid grid both ways inside the frame, line + marker samples in the key.',
      proposal: 'Let `marks.redundantChannels` carry ordered sets — `{ dash: [[2,3],[1,1.5],[5,3],…], shape: ["square","bar","circle","triangle-up",…] }` — indexed like `ink.series.categorical`, so the house’s nth series gets its nth colour, dash and marker together.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
      }),
      expectedSpec: redundantLines(),
      observed: 'Flint draws dash + marker per series, but the dash and shape scales are keyed alphabetically while colour follows the data, so blue Norway gets a dotted line with triangles and orange China a solid line with circles — no series looks like its specimen counterpart. The markers come out small, each inside a 1.5px white halo, and the key shows a marker glyph with no line sample. Solid rules both ways inside the frame are right (the non-banded default).',
    },
    {
      id: 'stack-key-order',
      title: 'Rounded-square swatches; the key reads a stack from the top down',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'legend-swatch',
      rule: 'Stacked segments follow the colour order from the bottom up; the key lists the series top-down in the order they appear in the stack (charts-12 lists TVs, Tablet, Mobile, Desktop). Every key swatch is a rounded square.',
      current: '`legend.swatch` only takes `"auto"`, so the swatch shape is the renderer’s. There is no field for stack order or key order: Flint stacks the first series at the top of each column and lists the key in palette order.',
      expected: 'Blue Desktop at the bottom of each column; key at the right, vertically centred, TVs at the top, rounded swatches.',
      proposal: '`legend.swatch: "square" | "roundedSquare" | "circle" | "line" | "lineAndMarker"` and `legend.order: "palette" | "stack"` (stack order reverses the key so it reads like the marks).',
      flint: flintInput(theme, {
        chartType: 'Stacked Bar Chart',
        data: VISITS,
        semantic_types: { Quarter: 'Category', Device: 'Category', Visits: 'Count' },
        encodings: { x: 'Quarter', y: 'Visits', color: 'Device' },
      }),
      expectedSpec: stackedLegend(),
      observed: 'Flint puts Desktop (blue, first colour) at the top of every column and TVs at the bottom — the opposite of the guide — with a key reading Desktop, Mobile, Tablet, TVs. Swatches are small squares with sharp corners. Each segment also carries the light-grey rim of gap 8, which reads as a white cut between segments.',
    },
    {
      id: 'rounded-frame',
      title: 'The plot frame has rounded corners',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'plot-frame',
      rule: 'Every specimen encloses the plot (and the donut) in a thin light-grey rectangle with slightly rounded corners; it stands in for the axis lines.',
      current: '`structure.frame` is a presence and `ink.structure.frame` an ink; there is no radius, so Flint’s frame is square-cornered.',
      expected: 'A 1px `#E7E7ED` frame with a ~4px corner radius (see the expected signature panel).',
      proposal: '`structure.frameRadius` (px), or a `geometry.frame: { radius, weight }` block alongside the mark geometries.',
    },
    {
      id: 'selection',
      title: 'Selecting a series fades the rest to 40% and thins their lines',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'focus-hover-state',
      rule: '“Selects the element. Grays out the remaining elements with a 40% opacity.” Lines: the selected one keeps 2px, the others drop to 1px; the hue never changes. The matching key entry turns semi-bold; a popover sits on top of the selected mark.',
      current: 'ThemeSpec’s `interaction` block has `tooltipFormat` and `selectionBoundary` paint only; there is no field for how unselected marks recede, so a Flint selection uses its own muting.',
      expected: 'China selected: full colour, 2px, a white rounded popover above its 2022 reading; the other three at 40% and 1px; “China” semi-bold in the key.',
      proposal: '`interaction.inactive: { opacity: 0.4, lineWidth: 1, keepHue: true }` and `interaction.activeKeyLabel: { weight: "semibold" }`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
      }),
      expectedSpec: selection(),
      observed: 'The static Flint panel shows the resting state only: all four lines at full ink, no selection treatment to compare. The expected panel shows what the theme would need to say: China at 2px and full colour with its popover, the rest at 40% and 1px in the same hues, “China” semi-bold in the key.',
    },
    {
      id: 'donut',
      title: 'Donut in a frame, key above it, “Other” in near-white grey',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'pie-rules',
      rule: 'Donut preferred to pie; the first slice starts at 12 o’clock and runs clockwise in colour order; thin white cuts between slices; no labels on the slices (text inside flat colours fails contrast); the key is a row above the framed card; the “Other” slice is a very light grey.',
      current: 'The cuts (`geometry.arc.gap`) and the absence of labels are stated. Nothing can say that the category called “Other” is the residual and takes the overflow grey: `ink.series.overflow` only applies once the palette is exhausted, so “Other” takes the fourth flat colour.',
      expected: 'Facebook, Twitter, Linkedin in blue, orange, red from 12 o’clock; Other in `#F1F2F5`; key row above, top-left.',
      proposal: 'A chart-spec marker for the residual category (`encodings.color.other: "Other"`) that the theme paints with `ink.series.overflow` and sorts last.',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: SOCIAL,
        semantic_types: { Network: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Network' },
      }),
      expectedSpec: donut(),
      observed: 'Flint draws a donut starting at 12 o’clock with white cuts between slices (`arc.gap` works), and with `chartDefaults.innerRadius: 40` the ring is about the specimen’s thickness (the template default is a 50px hole, which leaves a hairline ring at tile size). But “Other” is teal, the fourth flat colour; the slices run alphabetically clockwise (Facebook, Linkedin, Other, Twitter) so the second colour lands last; the key sits at the right with circular swatches instead of a row above; and there is no frame round the donut.',
    },
    {
      id: 'forecast',
      title: 'The future is a shaded background, not a different line',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'forecast-style',
      rule: 'Predictive forecast chart: the past is a line; the present is marked where a shaded background begins; the future runs over that shaded region.',
      current: 'Flint has no notion of a forecast period; the projected series is just a second series, told apart by dash and named in the key.',
      expected: 'One blue line; the years after 2023 on a pale shaded band that starts at “now”.',
      proposal: 'A semantic marker for projected rows plus `annotation.forecast: { style: "band", fill, label }` in the theme.',
      ...forecastProbe(theme, { ...t, context: OTHER }, { band: true, label: false }),
      observed: 'Flint joins the two series into one blue line, dashing the projected years and dotting every reading, with a key titled “Series” (the theme says `legend.title: "omit"`) and “; Capacity (GW)” appended to the deck. There is no shaded future.',
    },
    {
      id: 'area-edge-outlines-bars',
      addressed: { stage: 'M1', note: 'The area edge is no longer folded into a chart-wide outline, so bars, wedges and dots are drawn without it (M1).' },
      title: 'An area’s edge is drawn round every bar',
      kind: 'realization',
      severity: 'medium',
      probe: 'bar-shape',
      rule: 'Bars are flat, square-cornered blocks of one flat colour with no border (“When data is not grouped, all bars in the chart must have the same color … a legend is not required”). Area charts keep “the same borders and shapes as line charts”.',
      current: 'The theme states the area rule as `geometry.area: { edge: "full", edgeWidth: 2 }`. `geometryToMarks` folds `area.edge` into the chart-wide `marks.outline`, so grouped and stacked bars get `stroke: <axis ink>, strokeWidth: 2` and the `arc` config gets the same stroke. (A plain Bar Chart escapes because its resolved geometry holds only `band`.)',
      expected: 'Square flat columns with no rim.',
      proposal: 'Keep each `geometry.*` block scoped to its shape: `area.edge` should become the area’s top line only, never `marks.outline`; `band.outline` alone should outline bars.',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: MEDAL_ROWS,
        semantic_types: { Country: 'Country', Medal: 'Category', Count: 'Quantity' },
        encodings: { x: 'Country', y: 'Count', group: 'Medal' },
        title: MEDAL_TITLE,
        subtitle: 'Paris 2024 Olympic medals by type',
      }),
      expectedSpec: medals(),
      observed: 'Every Flint column has a 2px #E7E7ED rim: faint against the white page, but it eats 2px of each colour and shows as a pale seam where columns touch. The expected columns are flat. Confirmed in the compiled spec: `mark.stroke` is the axis ink only when the theme states `geometry.area.edge`.',
    },
    {
      id: 'area-opacity',
      title: 'The 10% area fill is meant for overlapping areas, not stacked ones',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'area-fill',
      rule: '“Use 10% opacity for each Area Chart’s background color” so overlaps remain visible; the series keep their 2px lines and markers.',
      current: '`geometry.area.opacity: 0.1` is applied as stated, but Flint stacks area series, so the 10% wash that was meant to show overlaps fills stacked bands that never overlap and the chart nearly disappears. Nothing in the theme can say “areas overlap rather than stack”, and stacking is the chart spec’s call.',
      expected: 'Four unstacked areas at 10%, each edged by its 2px line with markers.',
      proposal: 'Let `geometry.area.opacity` be conditional on stacking (a `variants` guard such as `isStacked`), so a house can say 10% when areas overlap and full ink when they stack.',
      flint: flintInput(theme, {
        chartType: 'Area Chart',
        data: EV_SHARE,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
      }),
      expectedSpec: overlappingAreas(),
      observed: 'Flint stacks the four countries to 160% at 10% opacity with no edge line: four pastel washes with no readable boundary between them. The `area.edge` the theme asked for is not drawn as a line on the area (it went to the bars instead, gap 8). The expected panel keeps the series unstacked, each with its 2px line and markers, so the 10% fill shows where they overlap.',
    },
  ],
};

export default liferay;
