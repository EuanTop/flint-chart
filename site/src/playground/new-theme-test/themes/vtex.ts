import type { ThemeSpec } from 'flint-chart';
import research from '../research/vtex.json';
import { ANOMALY, GAPMINDER, POPULATION, UNEMPLOYMENT, flintInput } from '../probes';
import { houseConfig, titled, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "Fabriga, -apple-system, BlinkMacSystemFont, 'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Roboto, 'Segoe UI', Arial, sans-serif";
const COLORS = ['#EE7850', '#4CAABF', '#9F50B6', '#479A5E', '#0000FF'];
const ORANGE = COLORS[0];
const TEAL = COLORS[1];
/** Recharts’ own defaults, which VTEX leaves in place: #666 tick text and axis lines, #ccc grid. */
const TICK = '#666666';
const GRID = '#cccccc';
const TEXT = '#3f3f40';

/** VTEX charts fill their container at 4:3. */
const W43 = 360;
const H43 = 270;

const t: HouseTokens = {
  font: FONT,
  text: TEXT,
  muted: TICK,
  grid: null,
  axis: null,
  background: '#ffffff',
  palette: COLORS,
  highlight: TEAL,
  labelSize: 12,
  lineWidth: 3,
  barCorner: 3,
  legendOrient: 'none',
};

const theme: ThemeSpec = {
  id: 'vtex',
  label: 'VTEX Styleguide (experimental charts)',
  ink: {
    surface: { source: 'house', canvas: '#ffffff' },
    text: { primary: TEXT, secondary: TICK, muted: '#828282', inverse: '#ffffff' },
    structure: { grid: GRID, axis: TICK, rule: TICK },
    series: {
      single: TEAL,
      categorical: COLORS,
      // A single line or scatter takes colors[0]; a single bar colors[1] (R7).
      byMark: { line: { single: COLORS[0] }, point: { single: COLORS[0] } },
      status: { positive: '#8bc34a', negative: '#ff4c4c' },
    },
    accent: '#134cd8',
  },
  type: {
    headline: { family: FONT, size: 16, weight: 'bold', color: TEXT },
    deck: { family: FONT, size: 14, color: TICK },
    axisLabel: { family: FONT, size: 12, color: TICK },
    axisTitle: { family: FONT, size: 12, color: TICK },
    keyLabel: { family: FONT, size: 12, color: TEXT },
    valueLabel: { family: FONT, size: 12, color: TEXT },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit', labelGap: 5 },
      measure: { line: 'omit', ticks: 'omit', labelGap: 5, tickDensity: 'sparse' },
    },
    grid: { measure: 'omit', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'omit',
  },
  marks: {
    bandFraction: 0.8,
    cornerRadius: 3,
    strokeWeight: 3,
    interpolation: 'monotone',
    point: { presence: 'omit' },
  },
  geometry: {
    line: { width: 3, interpolation: 'monotone' },
    band: { fraction: 0.8, cornerRadius: 3 },
  },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'never' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'omit', unit: 'never' },
  layout: { titleBlock: { anchor: 'start', gap: 'tight' }, bandStepFit: 1 },
  compileDefaults: { baseSize: { width: W43, height: H43 } },
  variants: [
    {
      when: { hasBandedAxis: true },
      then: { structure: { axis: { categorical: { line: 'full', lineWeight: 1, ticks: 'omit', labelGap: 5 }, measure: { line: 'full', lineWeight: 1, ticks: 'omit', labelGap: 10, tickDensity: 'sparse' } }, baseline: 'full' } },
      because: 'BarChart overrides the shared props with `axisLine: true` on both axes.',
    },
  ],
};

const TOP5 = POPULATION.slice(0, 5);

/** The BarChart wrapper: teal columns with 3px top corners, both axis lines in Recharts grey, no grid, no ticks, 4:3. */
function signature() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...houseConfig(t),
      axis: { ...(houseConfig(t).axis as object), domain: true, domainColor: TICK, labelColor: TICK, labelPadding: 5 },
      axisY: { domain: true, grid: false, labelPadding: 10 },
    },
    width: W43,
    height: H43,
    data: { values: TOP5 },
    mark: { type: 'bar', color: TEAL, cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3, width: { band: 0.8 } },
    encoding: {
      x: { field: 'Country', type: 'nominal', sort: null, title: null, axis: { labelAngle: 0 } },
      y: { field: 'Population', type: 'quantitative', title: null, axis: { tickCount: 5 } },
    },
  };
}

const lineAxes = (y: Record<string, unknown> = {}) => ({
  x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2000, 2023], nice: false }, axis: { format: 'd', values: [2000, 2005, 2010, 2015, 2020], labelPadding: 5 } },
  y: { field: 'Unemployment (%)', type: 'quantitative', title: null, axis: { tickCount: 5, labelPadding: 5 }, ...y },
});

/** The LineChart wrapper: series coloured from `colors[0]`, monotone, 3px, no dots, no axis lines or grid. */
function singleLine() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    width: W43,
    height: H43,
    data: { values: UNEMPLOYMENT },
    mark: { type: 'line', strokeWidth: 3, interpolate: 'monotone', color: ORANGE },
    encoding: lineAxes(),
  };
}

function tooltipChart() {
  const point = UNEMPLOYMENT.find((row) => row.Year === 2010)!;
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    width: W43,
    height: H43,
    layer: [
      { data: { values: UNEMPLOYMENT }, mark: { type: 'line', strokeWidth: 3, interpolate: 'monotone', color: ORANGE }, encoding: lineAxes() },
      {
        data: { values: [point] },
        mark: { type: 'point', filled: true, size: 70, color: ORANGE, stroke: '#ffffff', strokeWidth: 2, opacity: 1 },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'Unemployment (%)', type: 'quantitative' } },
      },
    ],
  };
}

/** Recharts’ default tooltip box with VTEX’s grey label and no cursor band. */
const tooltipHtml = `<div style="position:relative;height:0;z-index:5"><div style="position:absolute;left:40px;top:24px;font-family:${FONT};background:#ffffff;border:1px solid ${GRID};padding:8px 10px;white-space:nowrap;font-size:12px">`
  + '<div style="color:#828282;margin-bottom:4px">2010</div>'
  + `<div style="color:${ORANGE}">Unemployment : 9.6%</div></div></div>`;

function scatterExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig({ ...t, grid: GRID, gridAxis: 'y' }), axisY: { grid: true, domain: false, gridColor: GRID } },
    width: W43,
    height: H43,
    data: { values: GAPMINDER },
    mark: { type: 'circle', color: ORANGE, opacity: 1, size: 40 },
    encoding: {
      x: { field: 'GDP per capita', type: 'quantitative', scale: { type: 'log', domain: [1000, 150000] }, title: null, axis: { values: [1000, 10000, 100000], format: '~s', grid: false } },
      y: { field: 'Life expectancy', type: 'quantitative', scale: { zero: false }, title: null, axis: { tickCount: 5 } },
    },
  };
}

function bubbleExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    width: W43,
    height: H43,
    data: { values: GAPMINDER },
    mark: { type: 'circle', color: ORANGE, opacity: 0.85 },
    encoding: {
      x: { field: 'GDP per capita', type: 'quantitative', scale: { type: 'log', domain: [1000, 150000] }, title: null, axis: { values: [1000, 10000, 100000], format: '~s' } },
      y: { field: 'Life expectancy', type: 'quantitative', scale: { zero: false }, title: null, axis: { tickCount: 5 } },
      size: { field: 'Population (M)', type: 'quantitative', legend: null, scale: { range: [20, 900] } },
    },
  };
}

const lineInput = (subtitle?: string) => flintInput(theme, {
  chartType: 'Line Chart',
  data: UNEMPLOYMENT,
  semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
  encodings: { x: 'Year', y: 'Unemployment (%)' },
  ...(subtitle ? { subtitle } : {}),
  baseSize: { width: W43, height: H43 },
});

const vtex: StyleGuideTheme = {
  id: 'vtex',
  org: 'VTEX (Styleguide)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the source of VTEX Styleguide’s experimental chart components — thin Recharts wrappers with a short do/don’t list. The deployed styleguide no longer shows them and there are no screenshots, so the expected panels are drawn from the source constants, with Recharts’ own defaults (#666 tick text and axis lines, #ccc grid) wherever VTEX sets nothing. Fabriga is proprietary; the VTEX Tachyons fallback stack is named.',
    'Stated directly: the fixed five-colour array (orange, teal, purple, green, blue), teal for single-series bars, 3px top corners and a 20% gap, 3px monotone lines with no dots, no gridlines, no axis lines, no ticks, no legend, and a 4:3 base size. One chart-type override maps onto `variants`: bars (a banded axis) draw both axis lines. The other — scatters draw horizontal gridlines — cannot be guarded apart from line charts, so it is left out.',
    'Not stated: that a single line takes `colors[0]` orange while a single bar takes `colors[1]` teal, the scatter’s gridlines, the Recharts tooltip and a ceiling on series — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      observed: 'Flint (left) is all but identical to the panel built from the source: teal columns with 3px top corners, grey left and bottom axis lines, no grid, ticks or titles. Only “United States” wraps onto two lines.',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'BarChart: teal #4CAABF columns with `radius={[3, 3, 0, 0]}` and a 20% gap; both axis lines drawn, no tick marks (`tickLine: false`), no gridlines; no title, axis titles or legend inside the component; a 4:3 responsive container.',
      current: 'With a `hasBandedAxis` variant turning the axis lines on, Flint draws teal columns with 3px top corners and both axis lines, no grid, no ticks, no titles.',
      expected: 'Teal columns between a grey left and bottom axis line, labels only, at 4:3.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: TOP5,
        semantic_types: { Country: 'Country', Population: 'Quantity' },
        encodings: { x: 'Country', y: 'Population' },
        baseSize: { width: W43, height: H43 },
      }),
      expectedSpec: signature(),
    },
    {
      id: 'per-mark-palette',
      addressed: { stage: 'R7', note: 'A single line and scatter take colors[0] through `ink.series.byMark`.' },
      observed: 'Flint draws the 3px monotone line in teal, the bar colour; expected orange. (Flint also fits the y axis to the data, 3–10, where Recharts starts at 0 — a chart-spec choice, not the theme’s.)',
      title: 'A single line is orange, a single bar is teal',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'per-mark-palette',
      rule: 'LineChart zips its series with `colors` from the start, so one line is `colors[0]` #EE7850; BarChart fills with `colors[1]` #4CAABF; ScatterChart fills with `colors[0]`.',
      current: '`ink.series.single` is one ink for every mark, and `variants` may not vary `ink`, so the theme cannot give lines and points a different single colour from bars. Flint draws the line teal.',
      expected: 'The unemployment line in orange: 3px, monotone, no dots, no axis lines, no grid.',
      proposal: 'Let a variant carry `ink.series.single` (guarded by `markChannel`), or add `geometry.<kind>.ink`.',
      flint: lineInput(),
      expectedSpec: singleLine(),
    },
    {
      id: 'scatter-grid',
      addressed: { stage: 'GR1', note: 'The scatter is ruled horizontally only: with every grid and line omitted, just the value axis’s quiet grid returns (GR1). The orange dots and a scatter-only variant remain open.' },
      observed: 'Flint (left) rules the scatter in both directions in #ccc and draws teal dots. Expected: horizontal rules only, orange dots.',
      title: 'Scatters get a full grid the theme switched off',
      kind: 'realization',
      severity: 'medium',
      probe: 'gridline-style',
      rule: 'ScatterChart sets `grid: { horizontal: true, vertical: false }` while LineChart and BarChart draw no grid; scatter points are filled `colors[0]` orange.',
      current: 'The theme omits both grids: a variant cannot single out scatters for horizontal rules, because a scatter and a line over years look the same to the guards (`markChannel: "position"`, no banded axis, not temporal). Flint nonetheless rules the scatter both ways, horizontal and vertical, and draws the dots teal.',
      expected: 'Orange dots, horizontal #ccc rules only, no axis lines.',
      proposal: 'Respect `grid.measure` / `grid.category: "omit"` on scatters (and log axes); add a guard on the geometry the chart is built from (`when: { geometry: "point" }`) and let a variant carry `ink.series.single`.',
      flint: flintInput(theme, {
        chartType: 'Scatter Plot',
        data: GAPMINDER,
        semantic_types: { 'GDP per capita': 'Quantity', 'Life expectancy': 'Quantity', 'Population (M)': 'Quantity', Continent: 'Category' },
        encodings: { x: 'GDP per capita', y: 'Life expectancy' },
        chartProperties: { logScale_x: true },
        baseSize: { width: W43, height: H43 },
      }),
      expectedSpec: scatterExpected(),
    },
    {
      id: 'tooltip-style',
      observed: 'Flint shows the static line. Expected: Recharts’ square white box with a #ccc border beside the 2010 peak, the year in grey and “Unemployment : 9.6%” in orange, no cursor band.',
      title: 'Recharts tooltip, grey label, no cursor band',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'tooltip-style',
      rule: '`tooltipProps = { cursor: false, labelStyle: { color: "#828282" } }`: the default Recharts box (white, 1px #ccc border, 10px padding, square corners) with a grey label and “name : value” in the series colour; no hover band or crosshair. With no legend, the tooltip is how a reader names a series.',
      current: 'ThemeSpec’s `interaction` has a number format only; the box, its label ink and whether a cursor band is drawn are the renderer’s.',
      expected: 'The 2010 peak hovered: a square white box, “2010” in grey, “Unemployment : 9.6%” in orange.',
      proposal: '`interaction.tooltip: { surface, border, radius: 0, padding, labelInk, itemInk: "series", cursor: "none" | "band" | "line" }`.',
      flint: lineInput(),
      expectedSpec: tooltipChart(),
      expectedFrame: { headerHtml: tooltipHtml },
    },
    {
      id: 'label-collision',
      addressed: { stage: 'A1', note: 'Names are measured in the face they are drawn in and kept flat: broken at a space, set smaller down to the floor (`type.minSize`, never below ¾ of the stated size), the bands widened — and only then turned (A1). Measured, the names no longer run into each other.' },
      observed: 'Flint (left) sets “1880s1900s1920s1940s1960s…” as one string under the bars. Expected labels every other decade, flat, with space between.',
      title: 'Flat category labels run into each other',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'label-collision',
      rule: '“Don’ts: rotate bar labels”; “keep axis labels clear and concise; abbreviate when needed”. Recharts’ default `interval: "preserveEnd"` hides ticks that would overlap.',
      current: 'With `labels.` Flint keeps the decades flat at a 320px tile, but sets all nine edge to edge (“1880s1900s1920s…”): its width estimate for the fallback face misses the collision, so it neither thins nor abbreviates.',
      expected: 'Every other decade, flat, with space between — what Recharts’ interval does.',
      proposal: 'Measure in the resolved face (or pad unknown faces) and thin banded labels before they touch (`tickLabels: "sparse"`).',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: ANOMALY.map(({ Decade, 'Anomaly (°C)': v }) => ({ Decade, 'Anomaly (°C)': v })),
        semantic_types: { Decade: 'Category', 'Anomaly (°C)': { semanticType: 'Quantity', unit: '°C' } },
        encodings: { x: 'Decade', y: 'Anomaly (°C)' },
        baseSize: { width: 320, height: 240 },
      }),
      expectedSpec: titled(t, {
        data: { values: ANOMALY },
        mark: { type: 'bar', color: TEAL, cornerRadiusEnd: 3, width: { band: 0.8 } },
        encoding: {
          x: { field: 'Decade', type: 'ordinal', title: null, axis: { labelAngle: 0, domain: true, domainColor: TICK, values: ['1880s', '1920s', '1960s', '2000s', '2020s'] } },
          y: { field: 'Anomaly (°C)', type: 'quantitative', title: null, axis: { domain: true, domainColor: TICK, tickCount: 4, labelPadding: 10 } },
        },
      }, { width: 290, height: 200 }),
    },
    {
      id: 'legend-never',
      observed: 'Flint draws a seven-entry “Population (M)” size key at the right (and a full grid). Expected: bubbles only, across the full width.',
      title: 'A size key appears although the house shows no legend',
      kind: 'realization',
      severity: 'low',
      probe: 'legend-suppression',
      rule: 'No Legend component is ever rendered; series and sizes are read from the tooltip.',
      current: 'The theme states `legend.show: "never"`. Flint suppresses the colour key, but on a bubble chart it still draws a “Population (M)” size key with seven entries beside the plot.',
      expected: 'Bubbles only, the plot using the full width.',
      proposal: 'Apply `legend.show` to every key the chart would draw (colour, size, shape, dash), or split it per channel.',
      flint: flintInput(theme, {
        chartType: 'Scatter Plot',
        data: GAPMINDER,
        semantic_types: { 'GDP per capita': 'Quantity', 'Life expectancy': 'Quantity', 'Population (M)': 'Quantity', Continent: 'Category' },
        encodings: { x: 'GDP per capita', y: 'Life expectancy', size: 'Population (M)' },
        chartProperties: { logScale_x: true },
        baseSize: { width: W43, height: H43 },
      }),
      expectedSpec: bubbleExpected(),
    },
    {
      id: 'series-ceiling',
      title: 'Five colours, four lines, then nothing',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'chart-type-policy',
      rule: '“Avoid spaghetti chart (don’t use more than 4 lines)”; the colour array is fixed at five entries, zipped with the series, so a sixth series has no colour.',
      current: 'Flint cycles or falls back past the palette; ThemeSpec cannot state a series ceiling or what happens beyond it.',
      expected: 'The compiler reporting (or faceting) a fifth line, and never colouring a sixth from outside the house.',
      proposal: '`legend.maxSeries` / `ink.series.ceiling: { count: 4, beyond: "report" | "facet" | "overflow" }`.',
    },
    {
      id: 'font-source',
      title: 'Fabriga is proprietary',
      kind: 'visual-quality',
      severity: 'low',
      probe: 'font-source',
      rule: 'Text is set in Fabriga through the VTEX Tachyons stack.',
      current: 'ThemeSpec names a family but cannot ship or point at the font; the page falls back to the system face.',
      expected: 'Fabriga where licensed, the stated fallback elsewhere.',
      proposal: '`type.fontFaces: [{ family, src, weight }]` so a theme can declare where its faces load from.',
    },
  ],
};

export default vtex;
