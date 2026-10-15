import type { ThemeSpec } from 'flint-chart';
import research from '../research/visma.json';
import { EV_SHARE, flintInput, groupedProbe, highlightProbe, scatterProbe } from '../probes';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Open Sans', OpenSansFallback, sans-serif";
const HEADING_FONT = "Ubuntu, 'Open Sans', sans-serif";
const TEXT = '#252626';
const SECONDARY = '#494a4a';
const BORDER = '#8a8a8a';
const BRAND = '#116fae';
const NEUTRAL = '#dadada';
const PALETTE = ['#8c510a', '#d73027', '#a06fae', '#2b8078', '#638ec2'];
const DARK_PALETTE = ['#f6e8c3', '#fee090', '#b791c2', '#9ad0ca', '#bddaea'];
/** The pair the accessibility specimens use: pink (scheme c) under light green (scheme f). */
const PINK = '#de78ab';
const GREEN = '#a2d077';
/** The specimens draw the gridlines far lighter than the #8a8a8a token. */
const SPECIMEN_GRID = '#ececec';

const t: HouseTokens = {
  font: FONT,
  titleFont: HEADING_FONT,
  text: TEXT,
  muted: SECONDARY,
  grid: SPECIMEN_GRID,
  axis: null,
  background: '#ffffff',
  palette: PALETTE,
  highlight: BRAND,
  context: NEUTRAL,
  titleSize: 16,
  titleWeight: 'bold',
  subtitleSize: 13,
  subtitleColor: SECONDARY,
  labelSize: 12,
  lineWidth: 2,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'visma',
  label: 'Visma (VUD)',
  ink: {
    surface: { source: 'house', canvas: '#ffffff' },
    text: { primary: TEXT, secondary: SECONDARY, muted: SECONDARY, inverse: '#ffffff' },
    structure: { grid: BORDER, axis: BORDER, rule: BORDER },
    series: {
      single: BRAND,
      categorical: PALETTE,
      // Two series differ in lightness: the accessibility guide's pink and light green (R6).
      categoricalByCount: { 2: ['#de78ab', '#a2d077'] },
      overflow: NEUTRAL,
      sequential: { stops: ['#e0f3f8', '#bddaea', '#9dc0dd', '#80a7cf', '#638ec2', '#4575b4'], space: 'lab' },
      diverging: { stops: ['#d73027', '#f17c4d', '#fee090', '#e0f3f8', '#9dc0dd', '#4575b4'], space: 'lab' },
    },
    accent: BRAND,
  },
  type: {
    headline: { family: HEADING_FONT, size: 16, weight: 'bold', color: TEXT },
    deck: { family: FONT, size: 13, color: SECONDARY },
    axisLabel: { family: FONT, size: 12, color: TEXT },
    axisTitle: { family: FONT, size: 12, weight: 'regular', color: TEXT },
    keyLabel: { family: FONT, size: 12, color: SECONDARY },
    valueLabel: { family: FONT, size: 12, color: TEXT },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit' },
    },
    grid: { measure: 'hairline', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'hairline',
  },
  marks: {
    bandFraction: 0.45,
    cornerRadius: 2,
    strokeWeight: 2,
    point: { presence: 'full', size: 30, fill: 'solid' },
    separator: { presence: 'full', width: 1.5, source: 'surface' },
    redundantEncoding: 'always',
    redundantChannels: ['shape', 'dash'],
  },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'center' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'whenAmbiguous', axisTitlePlacement: 'rotated', unitsInAxisTitle: true },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' }, bandStepFit: 1 },
};

/** The accessibility specimen’s readings: rain (pink, below) and sleet (green, above), Jan–May. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
const RAIN = [['Jan', 27.5, 10.5], ['Feb', 15, 8], ['Mar', 12.5, 5.5], ['Apr', 25, 10.5], ['May', 27.5, 10.5]]
  .flatMap(([Month, rain, sleet]) => [{ Month, Type: 'Rain', 'Rainfall (mm)': rain }, { Month, Type: 'Sleet', 'Rainfall (mm)': sleet }]);
const STACKS = MONTHS.map((Month) => {
  const rain = RAIN.find((row) => row.Month === Month && row.Type === 'Rain')!['Rainfall (mm)'] as number;
  const sleet = RAIN.find((row) => row.Month === Month && row.Type === 'Sleet')!['Rainfall (mm)'] as number;
  return { Month, zero: 0, rain, top: rain + sleet };
});
const SIG_TITLE = 'Rainfall peaked in January and May';
const SIG_SUBTITLE = 'Monthly rainfall, Jan–May';

const rainFlint = (title = SIG_TITLE, subtitle = SIG_SUBTITLE) => flintInput(theme, {
  chartType: 'Stacked Bar Chart',
  data: RAIN,
  semantic_types: { Month: 'Month', Type: 'Category', 'Rainfall (mm)': { semanticType: 'Quantity', unit: 'mm' } },
  encodings: { x: 'Month', y: 'Rainfall (mm)', color: 'Type' },
  title,
  subtitle,
});

function rainChart(o: { colors?: (string | Record<string, unknown>)[]; focus?: string; dark?: boolean } = {}) {
  const ink: HouseTokens = o.dark
    ? { ...t, background: '#2b3033', text: '#c3d0d9', muted: '#c3d0d9', grid: '#4a5257', subtitleColor: '#c3d0d9' }
    : t;
  const range = o.colors ?? [PINK, GREEN];
  const focus = o.focus;
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...houseConfig(ink),
      axis: { ...(houseConfig(ink).axis as object), labelColor: ink.text, titleColor: ink.text, titleFontSize: 12, titlePadding: 12 },
      legend: { ...(houseConfig(ink).legend as object), orient: 'bottom', direction: 'horizontal', symbolType: 'circle', symbolSize: 110, labelColor: ink.muted, labelFontSize: 12, columnPadding: 24, offset: 18 },
    },
    title: { text: SIG_TITLE, subtitle: SIG_SUBTITLE },
    width: W,
    height: H,
    layer: [
      {
        data: { values: RAIN },
        mark: { type: 'bar', stroke: ink.background, strokeWidth: 1.5, width: { band: 0.45 } },
        encoding: {
          x: {
            field: 'Month', type: 'ordinal', sort: MONTHS, title: null,
            axis: { labelAngle: 0, labelPadding: 8, ...(focus ? { labelFontWeight: { condition: { test: `datum.value !== '${focus}'`, value: 'bold' }, value: 'normal' } } : {}) },
          },
          y: { field: 'Rainfall (mm)', type: 'quantitative', title: 'Rainfall (mm)', scale: { domain: [0, 50] }, axis: { values: [0, 10, 20, 30, 40, 50], labelPadding: 12 } },
          color: { field: 'Type', type: 'nominal', sort: ['Sleet', 'Rain'], scale: { domain: ['Sleet', 'Rain'], range: [range[1], range[0]] } },
          order: { field: 'Type', sort: 'ascending' },
        },
      },
      ...(focus ? [{
        data: { values: STACKS.filter((row) => row.Month !== focus) },
        mark: { type: 'bar', color: '#4f3a48', stroke: '#ffffff', strokeWidth: 1.5, width: { band: 0.45 } },
        encoding: { x: { field: 'Month', type: 'ordinal', sort: MONTHS }, y: { field: 'zero', type: 'quantitative' }, y2: { field: 'rain' } },
      }, {
        data: { values: STACKS.filter((row) => row.Month !== focus) },
        mark: { type: 'bar', color: '#3f4a35', stroke: '#ffffff', strokeWidth: 1.5, width: { band: 0.45 } },
        encoding: { x: { field: 'Month', type: 'ordinal', sort: MONTHS }, y: { field: 'rain', type: 'quantitative' }, y2: { field: 'top' } },
      }, {
        data: { values: [{ Month: 'Mar', v: 33 }] },
        mark: { type: 'text', fontSize: 18, fontWeight: 'bold', color: TEXT, text: '38%', xOffset: 30 },
        encoding: { x: { field: 'Month', type: 'ordinal', sort: MONTHS }, y: { field: 'v', type: 'quantitative' } },
      }, {
        data: { values: [{ Month: 'Mar', v: 28.5 }] },
        mark: { type: 'text', fontSize: 13, color: TEXT, text: '15 tasks', xOffset: 26 },
        encoding: { x: { field: 'Month', type: 'ordinal', sort: MONTHS }, y: { field: 'v', type: 'quantitative' } },
      }] : []),
    ],
  };
}

const EV3 = ['Norway', 'China', 'Germany'];
const ev3 = EV_SHARE.filter((row) => EV3.includes(row.Country));

/** Lines as the guide asks: round markers, a shape and a dash per series, circle keys centred below. */
function evExpected(names: string[], palette: string[], dark = false) {
  const ink: HouseTokens = dark
    ? { ...t, background: '#2b3033', text: '#c3d0d9', muted: '#c3d0d9', grid: '#9aa5ae', palette, subtitleColor: '#c3d0d9' }
    : { ...t, palette };
  const scale = (range: unknown[]) => ({ domain: names, range });
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...houseConfig(ink),
      axis: { ...(houseConfig(ink).axis as object), labelColor: ink.text, titleColor: ink.text, titleFontSize: 12, ...(dark ? { gridOpacity: 0.35 } : {}) },
      legend: { ...(houseConfig(ink).legend as object), orient: 'bottom', direction: 'horizontal', labelColor: ink.muted, labelFontSize: 12, columnPadding: 20, offset: 16 },
    },
    title: { text: 'Norway leads electric-car sales', subtitle: 'Share of new cars sold that are electric' },
    width: W,
    height: H,
    data: { values: EV_SHARE.filter((row) => names.includes(row.Country)) },
    mark: { type: 'line', strokeWidth: 2, point: { filled: true, size: 36 } },
    encoding: {
      x: { field: 'Year', type: 'ordinal', title: null, axis: { labelAngle: 0 } },
      y: { field: 'EV share (%)', type: 'quantitative', title: 'EV share (%)', axis: { tickCount: 5 } },
      color: { field: 'Country', type: 'nominal', scale: scale(palette.slice(0, names.length)) },
      shape: { field: 'Country', type: 'nominal', scale: scale(['circle', 'square', 'triangle-up'].slice(0, names.length)) },
      strokeDash: { field: 'Country', type: 'nominal', scale: scale([[1, 0], [6, 3], [2, 2]].slice(0, names.length)) },
    },
  };
}

/** A probe’s expected panel with Visma’s centred circle key (and, for grouped bars, Flint’s data order). */
function withCircleKey<P extends { expectedSpec?: Record<string, unknown> }>(probe: P, dataOrder = false): P {
  const spec = probe.expectedSpec as { config: Record<string, unknown>; vconcat: { encoding?: { x?: Record<string, unknown> } }[] };
  const legend = { ...(spec.config.legend as object), orient: 'bottom', symbolType: 'circle', labelColor: SECONDARY, columnPadding: 20 };
  const vconcat = dataOrder
    ? spec.vconcat.map((view, i) => (i === 0 && view.encoding?.x ? { ...view, encoding: { ...view.encoding, x: { ...view.encoding.x, sort: null } } } : view))
    : spec.vconcat;
  return { ...probe, expectedSpec: { ...spec, config: { ...spec.config, legend }, vconcat } };
}

const visma: StyleGuideTheme = {
  id: 'visma',
  org: 'Visma (VUD)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the Visma Unified Design data-visualisation pages (best practices, palettes, specifications) and the `@vismaux/vud` token CSS. Open Sans is loaded; the Ubuntu heading face is not, so headlines fall back to Open Sans. The guide publishes no chart type sizes; 12px labels and a 16px headline are a reading of the illustrations.',
    'Stated directly: the light-mode chart tokens — label #252626, legend #494a4a, the brand blue #116fae for one-colour charts, the five-step numbered categorical sequence, the blue sequential and orange–blue diverging schemes — plus horizontal gridlines only, no axis lines or ticks, a rotated y title carrying its unit, a centred key below the plot, white seams in stacks, and dots, shapes and dashes on lines.',
    'Approximated: the gridlines. The `chart-border` token is #8a8a8a, but every specimen draws them barely visible; the theme states the token at `hairline` presence. Not stated: the dark-mode values of every token, the hover state, circle key swatches, the neutral #dadada for context data, and the lightness-contrasting pairs the specimens use instead of the numbered sequence. See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      observed: 'Flint (left) gets the structure right: white seams, faint horizontal rules, a rotated “Rainfall (mm)”, no axis lines, a centred key below. It differs in colour (brown and red-orange from the numbered sequence, not the specimen’s pink and light green — see the next gap), in the key swatches (squares, not circles) and in headroom (the axis stops at 40; the specimen runs to 50).',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Accessibility specimen: stacked columns (pink below, light green above) split by a thin white line; barely-there horizontal gridlines every 10; small grey tick numbers; rotated “Rainfall (mm)” y title; no axis lines; a centred key below with circular swatches.',
      current: 'Flint stacks the columns with white seams, rules horizontally only, rotates the y title and centres the key below.',
      expected: 'The specimen with its own readings.',
      flint: rainFlint(),
      expectedSpec: rainChart(),
    },
    {
      id: 'count-palette',
      addressed: { stage: 'R6', note: 'The accessible pink/light-green pair is stated as `categoricalByCount[2]`.' },
      observed: 'Flint draws two dark hues of similar lightness (brown, red-orange), helped by its dash and marker redundancy. Expected: pink and light green, separated by lightness as well as hue.',
      title: 'Two series take a lightness-contrasting pair, not tokens 1 and 2',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'count-palette',
      rule: 'Categorical colours “follow the numbered sequence” (brown #8c510a, red-orange #d73027, …), but the accessibility “do” pairs pink with light green so the two series differ in lightness, and the “don’t” shows two hues of equal lightness.',
      current: 'One ordered list; a two-series chart takes brown and red-orange, two dark hues of similar lightness — the pairing the guide’s “don’t” warns against.',
      expected: 'A two-series chart in the specimen’s pink and light green.',
      proposal: '`ink.series.categoricalByCount: { 2: ["#de78ab", "#a2d077"] }`, or a lightness-separation constraint on the first n inks.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE.filter((row) => ['Norway', 'China'].includes(row.Country)),
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway leads electric-car sales',
        subtitle: 'Share of new cars sold that are electric',
      }),
      expectedSpec: evExpected(['Norway', 'China'], [PINK, GREEN]),
    },
    {
      id: 'highlight',
      observed: 'Flint: all eight bars in brand blue, with a rotated “Country” title the house would not draw. Expected: Nigeria #116fae, the rest #dadada.',
      title: 'Brand blue for the subject, neutral grey for the rest',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'highlight',
      rule: '`chart-brand` #116fae: “primary colour on charts, use when only one colour is required”; `chart-neutral` #dadada: “use for the less important data points”.',
      current: 'Flint draws every bar in the brand blue; nothing in the chart spec names the important one and the theme has no context ink.',
      expected: 'Nigeria in #116fae, the other bars #dadada.',
      proposal: '`chart_spec.emphasis` with `ink.series.emphasis` / `ink.series.context`.',
      ...highlightProbe(theme, { ...t, barCorner: 2 }, { title: 'Nigeria is the most populous country in Africa' }),
    },
    {
      id: 'focus-hover-state',
      observed: 'Flint shows the static stacked chart. Expected, as in the specimen: April keeps pink and green while the other months turn dark plum and olive, the bold “38%” callout beside it, and the other months’ labels in bold.',
      title: 'Hover keeps the column’s colour and darkens the others',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'focus-hover-state',
      rule: '“Provide better visual feedback”: the hovered column keeps its colours while every other column turns dark (dark plum under dark olive), and a borderless callout shows the value in bold (“38%”) over a regular descriptor (“15 tasks”).',
      current: 'ThemeSpec has no hover state; the interaction presets dim with opacity in Flint’s own grey, not with the house’s darkened tones, and the callout is the renderer’s tooltip box.',
      expected: 'April hovered: pink and green kept, the other months in #4f3a48 / #3f4a35, the “38% / 15 tasks” callout beside it.',
      proposal: '`interaction.states.hover: { others: "darken" | "fade" | colour, callout: { valueWeight: "bold", border: "none" } }`.',
      flint: rainFlint(),
      expectedSpec: rainChart({ focus: 'Apr' }),
    },
    {
      id: 'dark-mode',
      observed: 'Flint draws the light tokens on white. Expected: #2b3033 surface, #c3d0d9 text, the dark categorical tokens with shapes and dashes kept, a circle key.',
      title: 'Every token has a dark-mode value',
      kind: 'product-ui',
      severity: 'high',
      probe: 'dark-mode',
      rule: 'Light/dark token pairs: surface #ffffff / #2b3033, text #252626 / #c3d0d9, gridlines #8a8a8a / #9aa5ae, neutral #dadada / #6f7a82, categorical brown #8c510a / #f6e8c3, orange #d73027 / #fee090, purple #a06fae / #b791c2, …; sequential schemes reverse in dark mode.',
      current: 'A ThemeSpec holds one set of inks and `variants` may not vary `ink`; dark Visma would be a separate theme with nothing tying the tokens together.',
      expected: 'The EV chart on #2b3033 with the dark tokens, shapes and dashes kept.',
      proposal: '`ink.modes.dark` with per-token pairs and `sequential.invertInDark`, chosen by a `colorScheme` option.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: ev3,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway leads electric-car sales',
        subtitle: 'Share of new cars sold that are electric',
      }),
      expectedSpec: evExpected(EV3, DARK_PALETTE, true),
    },
    {
      id: 'scatter-grid',
      addressed: { stage: 'GR1', note: 'Horizontal rules only: the vertical grid the house omits is no longer restored on a scatter while the horizontal one is drawn (GR1).' },
      observed: 'Flint (left) draws vertical #8a8a8a rules at every log tick, at full strength and much darker than its own hairline horizontal rules. Expected: faint horizontal rules only.',
      title: 'Scatter plots get vertical rules the theme switched off',
      kind: 'realization',
      severity: 'medium',
      probe: 'gridline-style',
      rule: 'Gridlines are horizontal only, thin and light (chart-border token); no vertical rules in any specimen.',
      current: 'The theme states `grid.measure: "hairline"` and `grid.category: "omit"`. On the scatter, Flint draws the horizontal rules as hairlines but adds vertical rules at every log tick of the x axis, at full #8a8a8a ink — darker than the grid it was asked for.',
      expected: 'Faint horizontal rules only; dots in the categorical sequence.',
      proposal: 'Bind `grid.category` on a scatter to the x axis (the one the chart is indexed by) and route log-scale ticks through the same presence.',
      ...withCircleKey(scatterProbe(theme, t, { palette: PALETTE, opacity: 1, size: 40 })),
    },
    {
      id: 'grouped-slivers',
      observed: 'Flint (left): three bars of about 4px per country with gaps wider than the bars. Expected: each group fills 45% of its step with its bars touching.',
      title: 'Grouped bars shrink to slivers',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'bar-shape',
      rule: 'Bars are medium-width with clear gaps between them (the column specimens fill a little under half of each step).',
      current: '`marks.bandFraction: 0.45` is applied to each bar inside a group as well as to the group, so the medal chart’s three bars per country come out as hairline slivers with wide gaps between them.',
      expected: 'Each country’s group filling 45% of its step, its three bars side by side.',
      proposal: 'Read `bandFraction` as the share of the step the *group* fills, with a separate `marks.groupGap` (default 0) between dodged bars.',
      ...withCircleKey(groupedProbe(theme, { ...t, barCorner: 2 }, { padding: 0.55, palette: PALETTE }), true),
    },
    {
      id: 'legend-swatch',
      title: 'Key swatches are circles',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'legend-swatch',
      rule: 'Every specimen keys its series with small filled circles before the label, centred below the chart, in the secondary text colour.',
      current: 'Placement, alignment and label ink are stated; the swatch shape is not (`legend.swatch` accepts only `auto`), so bars get squares.',
      expected: 'Circles — see the signature panels.',
      proposal: '`legend.swatch: { shape: "circle" }`.',
    },
    {
      id: 'border-tokens',
      title: 'Each colour scheme has its own border token',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'series-ink-variants',
      rule: 'Every fill scheme has a matching `chart-border` stroke token (brown fill with #a36e29 border; diverging schemes with `chart-border-start`/`-end`), used to edge filled marks.',
      current: '`marks.outline` draws one outline ink for every series (`ink` or `surface`); a per-series border cannot be named.',
      expected: 'Each fill edged in its scheme’s border token.',
      proposal: '`ink.series.variants.stroke: [...]` indexed with `categorical`, and `marks.outline.source: "seriesStroke"`.',
    },
  ],
};

export default visma;
