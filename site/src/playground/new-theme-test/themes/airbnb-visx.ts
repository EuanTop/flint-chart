import type { ThemeSpec } from 'flint-chart';
import research from '../research/airbnb-visx.json';
import { EV_SHARE, flintInput, POPULATION, tooltipProbe, UNEMPLOYMENT } from '../probes';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "-apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif";
const MONO = "Menlo, Monaco, 'Courier New', monospace";
/** Open Color steps the XYChart light theme names. */
const GRAY5 = '#ADB5BD';
const GRAY7 = '#495057';
const GRAY9 = '#212529';
const LIGHT = ['#0B7285', '#66D9E8', '#FCC419', '#FF8787', '#9C36B5', '#CC5DE8', '#A61E4D'];
const DARK = ['#3BC9DB', '#C3FAE8', '#FFEC99', '#FF8787', '#E599F7', '#BE4BDB', '#FAA2C1'];

const t: HouseTokens = {
  font: FONT,
  text: GRAY9,
  muted: GRAY7,
  grid: GRAY5,
  axis: GRAY9,
  background: '#FFFFFF',
  palette: LIGHT,
  titleSize: 16,
  subtitleSize: 12,
  labelSize: 11,
  lineWidth: 2,
  legendOrient: 'top',
};

/** The @visx/xychart light theme, the only opinionated look visx ships. */
const theme: ThemeSpec = {
  id: 'airbnb-visx',
  label: 'Airbnb visx (XYChart light)',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: GRAY9, secondary: GRAY7, muted: GRAY5, inverse: '#FFFFFF' },
    structure: { axis: GRAY9, grid: GRAY5, rule: GRAY5 },
    series: {
      single: LIGHT[0],
      categorical: LIGHT,
      overflow: GRAY5,
      // Not a declared ramp: the Open Color cyan steps the theme file exports, light to dark.
      sequential: { stops: ['#E3FAFC', '#C5F6FA', '#99E9F2', '#66D9E8', '#3BC9DB', '#22B8CF', '#15AABF', '#1098AD', '#0C8599', '#0B7285'], space: 'lab' },
    },
    accent: '#FF385C',
  },
  type: {
    headline: { family: FONT, size: 16, weight: 'bold', color: GRAY9 },
    deck: { family: FONT, size: 12, color: GRAY7 },
    axisLabel: { family: FONT, size: 11, weight: 'extralight', color: GRAY7 },
    axisTitle: { family: FONT, size: 12, weight: 'bold', color: GRAY9 },
    keyLabel: { family: FONT, size: 14, color: GRAY9 },
    valueLabel: { family: FONT, size: 12, weight: 'bold', color: GRAY9 },
    annotation: { family: FONT, size: 12, weight: 'bold', color: GRAY9 },
  },
  structure: {
    axis: {
      // XYChart draws the bottom axis 2px dark and the left one 1px grey; the schema binds by role.
      categorical: { line: 'full', lineWeight: 2, ticks: 'quiet', tickLength: 'short', tickDirection: 'outward' },
      measure: { line: 'hairline', lineWeight: 1, ticks: 'quiet', tickLength: 'short', tickDirection: 'outward' },
      // XYChart styles its axes by side: a 2px near-black rule along the bottom, a 1px grey one up the left (AX1).
      x: { line: 'full', lineWeight: 2, color: GRAY9, ticks: 'quiet' },
      y: { line: 'full', lineWeight: 1, color: GRAY5, ticks: 'quiet' },
    },
    grid: { measure: 'full', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'omit',
  },
  marks: { bandFraction: 0.6, strokeWeight: 2, cornerRadius: 0, interpolation: 'linear' },
  // Areas fade to clear (R12); stacked areas keep solid bands.
  geometry: { band: { fraction: 0.6, cornerRadius: 0 }, line: { width: 2 }, area: { fill: 'fade' } },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'center' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'always', axisTitlePlacement: 'rotated', unit: 'never' },
  layout: { titleBlock: { anchor: 'start' } },
};

/* ------------------------------------------------------------------ data */

/** English letter frequency (%), the `letterFrequency` mock data the visx bar demo slices from F. */
const LETTERS: [string, number][] = [
  ['F', 2.228], ['G', 2.015], ['H', 6.094], ['I', 6.966], ['J', 0.153], ['K', 0.772], ['L', 4.025], ['M', 2.406], ['N', 6.749],
  ['O', 7.507], ['P', 1.929], ['Q', 0.095], ['R', 5.987], ['S', 6.327], ['T', 9.056], ['U', 2.758], ['V', 0.978], ['W', 2.36],
  ['X', 0.15], ['Y', 1.974], ['Z', 0.074],
];
const LETTER_ROWS = LETTERS.map(([Letter, Frequency]) => ({ Letter, Frequency }));

const EV3 = EV_SHARE.filter((row) => ['Norway', 'China', 'Germany'].includes(row.Country));
const EV_NAMES = ['Norway', 'China', 'Germany'];

/* ------------------------------------------------------------- expected */

/** The visx gallery's “Bars” card: translucent bars on a teal-to-blue gradient, no axes. */
function barsCard() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig({ ...t, background: 'transparent' }), padding: { left: 18, right: 18, top: 40, bottom: 0 } },
    width: W - 30,
    height: H - 20,
    data: { values: LETTER_ROWS },
    mark: { type: 'bar', color: 'rgba(23, 233, 217, 0.5)' },
    encoding: {
      x: { field: 'Letter', type: 'nominal', sort: null, axis: null, scale: { paddingInner: 0.4, paddingOuter: 0.2 } },
      y: { field: 'Frequency', type: 'quantitative', axis: null },
    },
  };
}

const cardCaption = (title: string, component: string, color: string) =>
  `<div style="text-align:center;padding:12px 0 18px;color:${color}">`
  + `<div style="font-family:${FONT};font-weight:700;font-size:15px">${title}</div>`
  + `<div style="font-family:${MONO};font-size:11px;margin-top:4px">${component}</div></div>`;

/** XYChart axes on vertical-orientation data: 2px dark bottom axis, 1px grey left axis, 4px grey ticks. */
const xyAxes = (dark = false) => {
  const ink = dark ? { label: '#E9ECEF', title: '#F8F9FA', grid: '#CED4DA', x: '#F1F3F5' } : { label: GRAY7, title: GRAY9, grid: GRAY5, x: GRAY9 };
  return {
    axis: {
      labelFont: FONT, titleFont: FONT, labelFontSize: 11, labelFontWeight: 200, labelColor: ink.label,
      titleFontSize: 12, titleFontWeight: 700, titleColor: ink.title, ticks: true, tickSize: 4, tickColor: ink.grid,
      gridColor: ink.grid, gridWidth: 1, labelPadding: 4, titlePadding: 8,
    },
    axisX: { domain: true, domainColor: ink.x, domainWidth: 2, grid: false },
    axisY: { domain: true, domainColor: ink.grid, domainWidth: 1, grid: true },
  };
};

/** Horizontal bars as XYChart draws them: the heavy axis stays at the bottom, whatever it carries. */
function horizontalExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), ...xyAxes(), axisX: { domain: true, domainColor: GRAY9, domainWidth: 2, grid: true }, axisY: { domain: true, domainColor: GRAY5, domainWidth: 1, grid: false } },
    title: { text: 'India and China hold over a third of humanity', subtitle: 'Population, millions, 2023' },
    width: W,
    height: H,
    data: { values: POPULATION },
    mark: { type: 'bar', color: LIGHT[0] },
    encoding: {
      y: { field: 'Country', type: 'nominal', sort: null, title: 'Country', scale: { paddingInner: 0.4 } },
      x: { field: 'Population', type: 'quantitative', title: 'Population (m)', axis: { values: [0, 500, 1000, 1500] } },
    },
  };
}

/** An XYChart line chart: thin 200-weight tick labels, bold 12px axis titles. */
function linesExpected(dark = false) {
  const palette = dark ? DARK : LIGHT;
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...houseConfig({ ...t, background: dark ? '#222222' : '#FFFFFF', text: dark ? '#F8F9FA' : GRAY9, muted: dark ? '#E9ECEF' : GRAY7 }),
      ...xyAxes(dark),
      legend: { orient: 'top', direction: 'horizontal', title: null, symbolType: 'stroke', symbolStrokeWidth: 2, labelFontSize: 14, labelFont: FONT, labelColor: dark ? '#F8F9FA' : GRAY9 },
    },
    title: { text: 'Norway leads electric-car sales', subtitle: 'Share of new cars sold that are electric' },
    width: W,
    height: H,
    data: { values: EV3 },
    mark: { type: 'line', strokeWidth: 2 },
    encoding: {
      x: { field: 'Year', type: 'quantitative', title: 'Year', scale: { domain: [2018, 2023], nice: false, zero: false }, axis: { format: 'd', values: [2018, 2019, 2020, 2021, 2022, 2023] } },
      y: { field: 'EV share (%)', type: 'quantitative', title: 'EV share (%)' },
      color: { field: 'Country', type: 'nominal', scale: { domain: EV_NAMES, range: palette } },
    },
  };
}

/** The gallery's “Areas” card: a white-to-clear gradient on mint, faint white grid. */
function areasCard() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...houseConfig({ ...t, background: 'transparent' }),
      padding: { left: 0, right: 0, top: 30, bottom: 0 },
      axis: { grid: true, gridColor: 'rgba(255,255,255,0.35)', gridWidth: 1, domain: false, ticks: false, labels: false, title: null },
      axisX: { grid: true },
      axisY: { grid: true },
    },
    width: W,
    height: H - 20,
    data: { values: UNEMPLOYMENT },
    mark: {
      type: 'area',
      line: { color: '#FFFFFF', strokeWidth: 1 },
      color: { gradient: 'linear', x1: 0, y1: 0, x2: 0, y2: 1, stops: [{ offset: 0, color: '#FFFFFF' }, { offset: 1, color: 'rgba(255,255,255,0.1)' }] },
    },
    encoding: {
      x: { field: 'Year', type: 'quantitative', scale: { domain: [2000, 2023], nice: false, zero: false }, axis: { values: [2004, 2008, 2012, 2016, 2020] } },
      y: { field: 'Unemployment (%)', type: 'quantitative', axis: { values: [2.5, 5, 7.5] } },
    },
  };
}

/** The probe's pinned box is sized for a short line; widen it to hold “Unemployment 8.1%”. */
function widenTooltip<P extends { expectedSpec?: Record<string, unknown> }>(probe: P): P {
  const layers = (probe.expectedSpec?.layer ?? []) as { mark?: Record<string, unknown> }[];
  for (const layer of layers) if (layer.mark?.type === 'rect') layer.mark = { ...layer.mark, x2Offset: 158 };
  return probe;
}

/* --------------------------------------------------------------- house */

const lineFlint = flintInput(theme, {
  chartType: 'Line Chart',
  data: EV3,
  semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
  encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
  title: 'Norway leads electric-car sales',
  subtitle: 'Share of new cars sold that are electric',
});

const visx: StyleGuideTheme = {
  id: 'airbnb-visx',
  org: 'Airbnb (visx)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'visx is a primitives library, not a style guide; the only opinionated look it ships is the `@visx/xychart` light theme, and its public face is the demo gallery. Built from scratch from the theme source: the Open Color series order (dark cyan, light cyan, gold, coral, grape, orchid, burgundy), `#ADB5BD` grid and ticks, `#495057` 11px tick labels, `#212529` 12px bold axis titles, a system font stack, 4px outward ticks, band padding 0.4 and square bar ends.',
    'Approximated: the 2px dark x axis and the 1px grey y axis became `categorical.lineWeight: 2` / `measure.line: hairline` — right on a column chart, swapped on a horizontal one, and both drawn in the one `structure.axis` ink. visx renders no titles, so the headline and deck are Flint’s, set in the label styles. Airbnb’s product brand (Rausch `#FF385C`, Cereal) is not part of visx and appears only as `accent`.',
    'Not statable: the 200 weight and 0.4px letter-spacing of tick labels, the gradient-card look of the gallery, gradient area fills, the dark theme beside the light one, and the tooltip card — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      observed: "Flint (left): a standard XYChart-style column chart — dark-cyan bars, axes, bold “Frequency”/“Letter” titles, the component name as a deck. Expected (right): the gradient card with translucent bars and the centred caption; nothing about it is reachable from the theme.",
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'high',
      probe: 'signature',
      rule: 'The visx gallery: each chart a full-bleed card with 14px rounded corners and a gradient fill (Bars: teal `#17EAD9` → blue `#6078EA`), marks translucent (`rgba(23,233,217,.5)`), band padding 0.4, no axes or grid; a bold centred title near the bottom with the component name in monospace beneath, both in the card’s accent.',
      current: 'Flint draws the XYChart look the theme states — white canvas, dark-cyan bars, grey grid, axes with titles. ThemeSpec has no container, no gradient surface, no “no axes at all” house rule, and nowhere to put a caption under the plot.',
      expected: 'The “Bars” card from the visx gallery with the same letter frequencies the demo uses.',
      proposal: '`ink.surface.canvas` accepting a gradient (`{ gradient: [from, to], angle }`), `layout.container: { radius }`, `structure.axis.*.presence: "omit"` for whole axes, and a caption slot (`layout.titleBlock.position: "bottom"` already exists; it needs `anchor: "middle"` and a second, monospace role).',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: LETTER_ROWS,
        semantic_types: { Letter: 'Category', Frequency: { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Letter', y: 'Frequency' },
        title: 'Bars',
        subtitle: '<Shape.Bar />',
      }),
      expectedSpec: barsCard(),
      expectedFrame: {
        style: { background: 'linear-gradient(180deg, #17EAD9 0%, #6078EA 100%)', borderRadius: '14px', overflow: 'hidden' },
        footerHtml: cardCaption('Bars', '&lt;Shape.Bar /&gt;', '#17EAD9'),
      },
    },
    {
      id: 'axis-by-side',
      addressed: { stage: 'AX1', note: '`structure.axis.x: { line: "full", lineWeight: 2, color: "#212529" }` and `.y: { lineWeight: 1, color: "#ADB5BD" }` — styled by side, so the 2px dark rule stays along the bottom on horizontal bars (AX1).' },
      observed: "Confirmed: Flint draws the 2px dark rule up the left (category) axis and a dark 1px rule along the bottom, and the population axis keeps grid lines at 500s. Expected: 2px dark along the bottom, 1px grey up the left.",
      title: 'The heavy axis is the bottom one, whatever it carries',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'axis-line-style',
      rule: 'XYChart: `x.bottom.axisLine { stroke: gridColorDark #212529, strokeWidth: 2 }`, `y.left.axisLine { stroke: gridColor #ADB5BD, strokeWidth: 1 }` — styled by side, and in two inks.',
      current: 'ThemeSpec styles axes by role (categorical / measure) and gives them one `ink.structure.axis`. On a horizontal bar chart the categorical axis is the left one, so Flint moves the 2px rule to the left and draws both rules dark.',
      expected: 'A 2px near-black rule along the bottom, a 1px grey rule up the left, grey 4px ticks on both.',
      proposal: '`structure.axis.bottom` / `left` (side-bound overrides beside the role-bound ones) and `AxisRole.ink`.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: 'Country', x: 'Population' },
        title: 'India and China hold over a third of humanity',
        subtitle: 'Population, millions, 2023',
      }),
      expectedSpec: horizontalExpected(),
    },
    {
      id: 'thin-tick-labels',
      addressed: { stage: 'T2', note: 'Tick labels are `weight: "extralight"` (200); letter-spacing has no Vega-Lite property and stays open.' },
      observed: "The two panels are close — same palette, stroke-swatch key, bold rotated titles, 2px dark x axis. The difference is the tick numbers: Flint’s are regular weight and darker; expected are the thin 200 weight, which gives XYChart its light look.",
      title: 'Tick labels in a thin 200 weight, letter-spaced',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'type-weight-scale',
      rule: '`baseTickLabel { fontWeight: 200, fontSize: 11 }`, `letterSpacing: 0.4` on every label; axis titles 700/12px. The contrast between hairline numbers and bold titles is the XYChart look.',
      current: '`TypeRole.weight` stops at `regular` on the light side and there is no `letterSpacing`; tick labels come out at 400 with default tracking.',
      expected: 'Light, slightly tracked tick numbers under a bold rotated y title and a bold x title.',
      proposal: 'Numeric `TypeRole.weight` (100–900) and `TypeRole.tracking` in px or em.',
      flint: lineFlint,
      expectedSpec: linesExpected(),
    },
    {
      id: 'tooltip-card',
      observed: "Flint draws the line with no pinned tooltip (its tooltip only appears on hover, in the host’s style). Expected shows the small white card with grey text at the 2020 peak.",
      title: 'The default tooltip: a small white card',
      kind: 'product-ui',
      severity: 'low',
      probe: 'tooltip-style',
      rule: '`@visx/tooltip` defaultStyles: white background, `#666666` text, 14px, padding 0.3rem 0.5rem, 3px radius, `box-shadow: 0 1px 2px rgba(33,33,33,0.2)`.',
      current: '`interaction` carries a `tooltipFormat` and selection paint only; Flint’s tooltip is the host’s default Vega tooltip, whatever the theme.',
      expected: 'A pinned white card with grey text and a hairline shadow at the 2020 peak.',
      proposal: '`interaction.tooltip: { fill, text, radius, shadow, padding }` handed to the tooltip handler.',
      ...widenTooltip(tooltipProbe(theme, t, { fill: '#FFFFFF', text: '#666666', border: '#DEE2E6', radius: 3 })),
    },
    {
      id: 'dark-theme',
      observed: "Flint can only draw the light theme; expected shows the same chart on #222 with the light-cyan/mint/yellow dark palette and light grid.",
      title: 'A dark theme with its own tints of the same hues',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'dark-mode',
      rule: '`darkTheme`: background `#222`, tick labels `#E9ECEF`, titles `#F8F9FA`, grid `#CED4DA`, x axis `#F1F3F5`, series lighter steps of the same Open Color hues (`#3BC9DB`, `#C3FAE8`, `#FFEC99`, `#FF8787`, `#E599F7`, …).',
      current: 'A ThemeSpec holds one ink set; `variants` may not vary `ink`, so a theme cannot carry its dark twin, and a host that switches to dark has to swap whole themes.',
      expected: 'The same chart on `#222` with the dark palette.',
      proposal: '`ink.modes: { dark: Partial<ThemeInk> }` selected by the host (`prefers-color-scheme`), or allow `variants` to vary `ink` under a `colorScheme` guard.',
      flint: lineFlint,
      expectedSpec: linesExpected(true),
    },
    {
      id: 'gradient-area',
      addressed: { stage: 'R12', note: 'A single area fades to clear through `geometry.area.fill: "fade"`. Stacked areas keep solid bands (the warm stacked gradients are not drawn).' },
      observed: "Flint fills the area in solid dark cyan on white with full axes; expected is the mint gallery card with a white area fading downwards under a faint white grid.",
      title: 'Areas fade to transparent',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'gradient-fill',
      rule: 'Gallery “Areas”: a white area whose fill fades to clear (`LinearGradient from #fff to #fff, toOpacity 0.1`) over a mint card, under a faint white grid; stacked areas likewise in warm gradients.',
      current: '`geometry.area` has a flat `opacity`; Flint fills the area in one solid tint of the series ink.',
      expected: 'The Areas card.',
      proposal: '`geometry.area.fill: { kind: "gradient", from: 1, to: 0.1 }`.',
      flint: flintInput(theme, {
        chartType: 'Area Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Areas',
        subtitle: '<Shape.AreaClosed />',
      }),
      expectedSpec: areasCard(),
      expectedFrame: {
        style: { background: '#00E3A6', borderRadius: '14px', overflow: 'hidden' },
        footerHtml: `<div style="background:#00E3A6;margin-top:-2px">${cardCaption('Areas', '&lt;Shape.AreaClosed /&gt;', '#FFFFFF')}</div>`,
      },
    },
    {
      id: 'pattern-fills',
      addressed: { stage: 'R13', note: 'The vocabulary exists (`marks.redundantChannels: ["texture"]` with `marks.texture`), drawn as SVG pattern fills; the house does not turn it on by default, as visx ships the patterns as an option.' },
      title: 'Pattern fills for accessibility',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'pattern-fill',
      rule: '`@visx/pattern` ships line, hatch, circle, wave and path textures (the gallery’s “Patterns” card) so series can differ by more than colour.',
      current: '`marks.redundantChannels` accepts `"texture"`, but nothing in the Vega-Lite realisation draws a texture — Vega-Lite has no pattern fill — so a theme asking for it gets colour alone.',
      expected: 'Each series filled with its own texture in the series ink.',
      proposal: 'Realise `redundantChannels: ["texture"]` with SVG `<pattern>` defs (fill `url(#…)`) in the SVG renderer, and report it as dropped on canvas.',
    },
  ],
};

export default visx;
