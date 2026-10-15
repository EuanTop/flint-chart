import type { ThemeSpec } from 'flint-chart';
import research from '../research/tractie.json';
import { PREVIEW_CASES } from '../../../shared/preview-cases';
import { EV_SHARE, flintInput, highlightProbe, MEDALS, W, H } from '../probes';
import { houseConfig, titled, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = 'Roboto, sans-serif';
const CATEGORY = ['#0C44A1', '#33A0C4', '#B69016', '#BE2771', '#A880EF', '#236D86', '#6A5618', '#EA66AA'];
const CATEGORY_DARK = ['#9AC5F1', '#2B87A6', '#FED652', '#F6A2CF', '#885DD0', '#8DD9EC', '#FFF2C8', '#D53483'];
const NEUTRAL = '#919197';
const TEXT = '#252528';
const SUBTLE = '#00010D8C';
const GRID = '#060F2E1C';
const BASELINE = '#00021B3B';
const TITLE = '#0A3680';
const TRACK = '#060F2E1C';

const t: HouseTokens = {
  font: FONT,
  text: TEXT,
  muted: SUBTLE,
  grid: GRID,
  axis: BASELINE,
  background: '#FFFFFF',
  palette: CATEGORY,
  highlight: CATEGORY[0],
  context: NEUTRAL,
  titleSize: 20,
  titleWeight: 500,
  subtitleSize: 14,
  subtitleColor: TEXT,
  labelSize: 14,
  sourceSize: 12,
  barCorner: 3,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'tractie',
  label: 'NS Tractie',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: TEXT, secondary: SUBTLE, muted: SUBTLE, inverse: '#FFFFFF' },
    // Border tokens for structure, content tokens for text, as the guide asks.
    structure: { grid: GRID, axis: BASELINE, rule: BASELINE, zero: BASELINE },
    series: {
      single: CATEGORY[0],
      // “Don't reorder these colors, since they are in an optimized sequence for contrast and accessibility.”
      categorical: CATEGORY,
      status: { positive: '#3E9D7B', negative: '#CE092D', neutral: NEUTRAL },
      selection: { signed: 'categorical', statusUse: 'thresholdOnly' },
    },
    accent: CATEGORY[0],
  },
  type: {
    headline: { family: FONT, size: 20, weight: 'medium', color: TITLE },
    deck: { family: FONT, size: 14, weight: 'regular', color: TEXT },
    axisLabel: { family: FONT, size: 14, weight: 'regular', color: SUBTLE },
    axisTitle: { family: FONT, size: 14, weight: 'regular', color: TEXT },
    keyLabel: { family: FONT, size: 14, color: TEXT },
    valueLabel: { family: FONT, size: 14, color: TEXT },
    footnote: { family: FONT, size: 12, color: SUBTLE },
    display: { family: FONT, size: 32, weight: 'bold', color: TEXT },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit', labelGap: 8 },
      measure: { line: 'omit', ticks: 'omit', labelGap: 8, tickDensity: 'sparse' },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: {
    bandFraction: 0.67,
    cornerRadius: 3,
    strokeWeight: 2.5,
    // “Separate chart colors by a border or gap.”
    separator: { presence: 'full', width: 1, source: 'surface' },
    slice: { gap: 3, gapStyle: 'pad' },
    // “Use other visual indicators like shapes, line patterns or direct labels.”
    redundantEncoding: 'always',
    redundantChannels: ['shape'],
    point: { presence: 'full', size: 50, fill: 'solid' },
  },
  geometry: {
    line: { width: 2.5 },
    point: { presence: 'full', size: 50, fill: 'solid' },
    // Grouped bars 2px apart, 16px between groups (G1).
    band: { fraction: 0.67, cornerRadius: 3, group: { gap: '2px', spacing: '16px' } },
    arc: { gap: 3, gapStyle: 'pad', cornerRadius: 4 },
  },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never' },
  annotation: { unit: 'everyTick', axisTitles: 'whenAmbiguous', axisTitlePlacement: 'rotated', numberFormat: { precision: 'integer' } },
  // 16px bars with 8px between them: a 24px step that does not stretch to fill the width.
  layout: { bandStep: 24, bandStepFit: 0, titleBlock: { anchor: 'start', gap: 'normal' } },
};

const MIX = PREVIEW_CASES.find((c) => c.id === 'electricity-stacked')!.data as { Country: string; Source: string; Share: number }[];
/** Flint's colour order for this data (first appearance); category-1 sits on the baseline, as in the anatomy. */
const SOURCES = ['Nuclear', 'Renewables', 'Fossil'];
const COUNTRIES = ['France', 'Germany', 'United States', 'China', 'Brazil'];

/** Stacked columns as the anatomy draws them: 16px bars, 1px white seams, only the top of the stack rounded. */
function stackedColumns(tokens: HouseTokens, palette: string[], o: { title: string; dark?: boolean }) {
  const rows: { Country: string; Source: string; y0: number; y1: number; top: boolean }[] = [];
  for (const country of COUNTRIES) {
    let base = 0;
    SOURCES.forEach((source, i) => {
      const v = MIX.find((row) => row.Country === country && row.Source === source)?.Share ?? 0;
      rows.push({ Country: country, Source: source, y0: base, y1: base + v, top: i === SOURCES.length - 1 });
      base += v;
    });
  }
  const x = { field: 'Country', type: 'nominal', sort: COUNTRIES, title: null, axis: { labelAngle: 0, labelColor: tokens.muted, labelFontSize: 14, labelExpr: "split(datum.label, ' ')" }, scale: { paddingInner: 1 / 3, paddingOuter: 0.2 } };
  const y = { field: 'y1', type: 'quantitative', title: 'Share (%)', scale: { domain: [0, 100] }, axis: { values: [0, 25, 50, 75, 100], labelExpr: "datum.label + '%'", titleColor: tokens.text, titleFontSize: 14, titlePadding: 8, labelColor: tokens.muted, labelFontSize: 14 } };
  const color = { field: 'Source', type: 'nominal', scale: { domain: SOURCES, range: palette } };
  const spec = titled(tokens, {
    layer: [
      {
        data: { values: rows },
        mark: { type: 'bar', stroke: tokens.background, strokeWidth: 1, width: 16 },
        encoding: { x, y, y2: { field: 'y0' }, color: { ...color, legend: { orient: 'bottom', direction: 'horizontal', symbolType: 'square', symbolSize: 180, symbolCornerRadius: 3, labelFontSize: 14, labelColor: tokens.text, offset: 14, columnPadding: 20 } } },
      },
      {
        data: { values: rows.filter((row) => row.top) },
        mark: { type: 'bar', cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3, width: 16, stroke: tokens.background, strokeWidth: 1 },
        encoding: { x, y: { field: 'y1', type: 'quantitative' }, y2: { field: 'y0' }, color: { ...color, legend: null } },
      },
      {
        data: { values: [{ v: 0 }] },
        mark: { type: 'rule', color: tokens.axis ?? BASELINE, strokeWidth: 1 },
        encoding: { y: { field: 'v', type: 'quantitative' } },
      },
    ],
  }, { title: o.title, width: W - 40, height: H });
  const config = spec.config as { title: Record<string, unknown> };
  config.title = { ...config.title, color: o.dark ? '#9AC5F1' : TITLE, fontWeight: 500 };
  return spec;
}

const SHAPES = ['circle', 'diamond', 'square', 'triangle-up'];

function markerLines() {
  const names = ['Norway', 'China', 'Germany', 'United States'];
  const rows = EV_SHARE.filter((row) => names.includes(row.Country));
  const enc = {
    x: { field: 'Year', type: 'ordinal', title: null, axis: { labelAngle: 0, labelColor: SUBTLE, labelFontSize: 14 } },
    y: { field: 'EV share (%)', type: 'quantitative', title: null, axis: { values: [0, 25, 50, 75, 100], labelExpr: "datum.label + '%'", labelColor: SUBTLE, labelFontSize: 14 } },
    color: { field: 'Country', type: 'nominal', scale: { domain: names, range: CATEGORY.slice(0, 4) }, legend: null },
  };
  const spec = titled(t, {
    data: { values: rows },
    layer: [
      { mark: { type: 'line', strokeWidth: 2.5 }, encoding: enc },
      {
        mark: { type: 'point', filled: true, size: 70, opacity: 1 },
        encoding: { ...enc, shape: { field: 'Country', type: 'nominal', scale: { domain: names, range: SHAPES }, legend: null } },
      },
      {
        data: { values: [{ v: 0 }] },
        mark: { type: 'rule', color: BASELINE },
        encoding: { y: { field: 'v', type: 'quantitative' } },
      },
    ],
  }, { title: 'EV share of new car sales', width: W, height: H });
  const config = spec.config as { title: Record<string, unknown> };
  config.title = { ...config.title, color: TITLE, fontWeight: 500 };
  return spec;
}

const GROUPED = MEDALS.filter((row) => ['United States', 'China', 'Japan', 'Australia'].includes(row.Country));

/** 12px bars, 2px inside a group, 16px between groups. */
function groupedBars() {
  const groupStep = 3 * 12 + 2 * 2 + 16;
  const spec = titled(t, {
    data: { values: GROUPED },
    mark: { type: 'bar', cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
    encoding: {
      x: { field: 'Country', type: 'nominal', sort: ['United States', 'China', 'Japan', 'Australia'], title: null, axis: { labelAngle: 0, labelColor: SUBTLE, labelFontSize: 14, labelExpr: "split(datum.label, ' ')" }, scale: { paddingInner: 16 / groupStep, paddingOuter: 0.3 } },
      xOffset: { field: 'Medal', sort: ['Gold', 'Silver', 'Bronze'], scale: { paddingInner: 2 / 14 } },
      y: { field: 'Count', type: 'quantitative', title: null, axis: { tickCount: 4, labelColor: SUBTLE, labelFontSize: 14 } },
      color: { field: 'Medal', type: 'nominal', sort: ['Gold', 'Silver', 'Bronze'], scale: { range: CATEGORY.slice(0, 3) }, legend: { orient: 'bottom', direction: 'horizontal', symbolType: 'square', symbolCornerRadius: 3, symbolSize: 180, labelFontSize: 14, offset: 12 } },
    },
  }, { title: 'Medals per country', width: Math.round(groupStep * (4 - 16 / groupStep + 0.6)), height: H });
  const config = spec.config as { title: Record<string, unknown> };
  config.title = { ...config.title, color: TITLE, fontWeight: 500 };
  return spec;
}

function progressRing() {
  const rows = [{ part: 'Covered', v: 75, i: 0 }, { part: 'Rest', v: 25, i: 1 }];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    width: 200,
    height: 200,
    layer: [
      {
        data: { values: rows },
        mark: { type: 'arc', innerRadius: 72, outerRadius: 96, cornerRadius: 6, padAngle: 0.04 },
        encoding: {
          theta: { field: 'v', type: 'quantitative', stack: true },
          order: { field: 'i', type: 'quantitative' },
          color: { field: 'part', type: 'nominal', scale: { domain: ['Covered', 'Rest'], range: [CATEGORY[0], TRACK] }, legend: null },
        },
      },
      { data: { values: [{}] }, mark: { type: 'text', font: FONT, fontSize: 32, fontWeight: 'bold', color: TEXT, text: '75%' }, encoding: { x: { value: 100 }, y: { value: 92 } } },
      { data: { values: [{}] }, mark: { type: 'text', font: FONT, fontSize: 16, fontWeight: 500, color: TEXT, text: 'Coverage' }, encoding: { x: { value: 100 }, y: { value: 120 } } },
    ],
  };
}

const DARK: HouseTokens = { ...t, background: '#191A1C', text: '#C4C5CB', muted: '#C4C5CB', grid: '#FFFFFF29', axis: '#FFFFFF52' };

const tractie: StyleGuideTheme = {
  id: 'tractie',
  org: 'NS (Dutch Railways) — Tractie Design System',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Tractie styles NS’s internal tools; it publishes chart guidelines and tokens (read from the public Storybook CSS) but no coded charts. Built from scratch.',
    'Stated directly: Roboto; the eight `color.chart.category-*` inks in their fixed order, category-1 `#0C44A1` for single series; semantic success/error/neutral as status inks; content tokens for text (`#252528`, subtle `#00010D8C`) and border tokens for structure (grid `#060F2E1C`, baseline `#00021B3B` — the guide’s own 8-digit, translucent hexes); a 20px medium headline in `#0A3680`; 14px grey axis labels; value-axis gridlines only, a darker baseline, no axis lines or ticks; percent ticks without decimals; slightly rounded bar ends and 1px white seams between stacked colours; a 24px band step (16px bar, 8px gap) that does not stretch; lines 2.5px with a distinct marker shape per series (`redundantChannels: ["shape"]`); a bottom-left, untitled key; optional rotated axis titles.',
    'Not stated: the grouped-bar spacing (12px bars, 2px within a group, 16px between groups), the rounded-square key swatch, greying out to highlight, the progress ring with its never-data grey track, and the token swap to dark mode.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall: the anatomy’s stacked columns',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'The anatomy diagram: medium-weight navy title top-left; stacked columns 16px wide with 8px+ gaps, dark blue then teal then ochre, separated by a thin white line, only the top of each stack slightly rounded; light grey gridlines, a darker grey baseline, no ticks or axis lines; grey y labels with a rotated y title; legend under the chart, left-aligned, rounded-square swatches.',
      current: 'Flint is given the same stacked columns with the house theme.',
      expected: 'The anatomy re-drawn on the electricity mix.',
      flint: flintInput(theme, {
        chartType: 'Stacked Bar Chart',
        data: MIX,
        semantic_types: { Country: 'Country', Source: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Country', y: 'Share', color: 'Source' },
        title: 'Electricity mix per country',
      }),
      expectedSpec: stackedColumns(t, CATEGORY, { title: 'Electricity mix per country' }),
      observed: 'Flint gets the navy medium title, the category order, the light grid, the darker baseline, grey percent labels and the rotated y title. It differs in three ways: the key is drawn on the right although the theme allows only `bottom`; the country names are turned −45° although the theme says `horizontal`; and category-1 dark blue is stacked on top of each column rather than on the baseline as in the anatomy. Expected: the same columns with dark blue at the base, flat (wrapped) names and the key under the plot with rounded-square swatches.',
    },
    {
      id: 'grouped-spacing',
      addressed: { stage: 'G1', note: '`geometry.band.group: { gap: "2px", spacing: "16px" }` draws 2px between bars in a group and 16px between groups. The bars take the rest of the group’s step, so their 12px width is not stated: a fixed bar width is still open.' },
      title: 'Grouped bars: 12px wide, 2px apart, 16px between groups',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'bar-shape',
      rule: '“Set bar width to 16px, with at least 8px of spacing between bars”; grouped bars 12px wide with 2px between bars in a group and at least 16px between groups; never thinner — switch to horizontal bars or an area instead.',
      current: 'The theme can state a 24px band step and a 0.67 band fraction; a grouped chart divides that one band among its members, and nothing sets the gap inside a group or a member’s own width.',
      expected: 'Three 12px bars per country touching at 2px, groups 16px apart.',
      proposal: '`geometry.band: { width: 16, gap: 8, groupMemberWidth: 12, groupMemberGap: 2, groupGap: 16 }` in px, with `layout.bandStep` derived from them.',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: GROUPED,
        semantic_types: { Country: 'Country', Medal: 'Category', Count: 'Quantity' },
        encodings: { x: 'Country', y: 'Count', group: 'Medal' },
        title: 'Medals per country',
      }),
      expectedSpec: groupedBars(),
      observed: 'Flint: bars about 13px wide with a visible gap of several px between members and a wider one between countries — close in spirit, but set by band fractions, not the guide’s px. Expected: 12px members 2px apart, groups 16px apart, so each country reads as one block.',
    },
    {
      id: 'marker-shapes',
      addressed: { stage: 'M3', note: 'The dashes and marker shapes now take the colour scale’s order, so the first series is solid (and keeps the first shape) whatever its name (M3).' },
      title: 'Every line carries its own marker shape',
      kind: 'realization',
      severity: 'medium',
      probe: 'marker-shape',
      rule: '“You have to be able to understand a data visualisation even when it’s in black and white”: line series get distinct markers — circle, diamond, square, triangle — in category order.',
      current: 'Stated as `marks.redundantEncoding: "always"`, `redundantChannels: ["shape"]` and `geometry.point.presence: "full"`, and Flint does add a shape per series. But the shape scale is sorted alphabetically while the colour scale keeps data order, so the pairing drifts: category-1 blue (Norway) gets triangles, teal (China) circles, magenta (United States) crosses; no diamond is used, and the house order cannot be stated at all.',
      expected: 'Dark blue circles, teal diamonds, ochre squares, magenta triangles on 2.5px lines — shape and colour following the same category order.',
      proposal: 'Give the shape scale the colour scale’s domain order, and let `redundantChannels` take an ordered list (`shapes: ["circle", "diamond", "square", "triangle-up"]`).',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE.filter((row) => ['Norway', 'China', 'Germany', 'United States'].includes(row.Country)),
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'EV share of new car sales',
      }),
      expectedSpec: markerLines(),
      observed: 'Flint: blue Norway with small triangles, teal China with circles, ochre Germany with squares, magenta United States with crosses; the key lists the countries alphabetically with those shapes. Expected: circles on the blue line, diamonds on teal, squares on ochre, triangles on magenta, at a size that reads.',
    },
    {
      id: 'neutral-highlight',
      title: 'Highlight by toning the rest down to neutral grey',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'highlight',
      rule: '“Highlight an interesting data point by toning down less important data in a chart with color.chart.neutral” (`#919197`).',
      current: 'The theme states the neutral ink (`status.neutral`), but nothing in the chart spec says which bar is the interesting one, so every bar stays category-1 blue.',
      expected: 'Nigeria in `#0C44A1`, the others in `#919197`.',
      proposal: '`chart_spec.emphasis: { field, values }`; the theme’s `ink.series.context` (here the neutral token) for everything else.',
      ...highlightProbe(theme, t),
      observed: 'Flint: every bar category-1 blue. (Its value axis also reads “500 m … 1,500 m”: `annotation.unit: "everyTick"`, stated for the guide’s 0% 25% 50% ticks, writes the probe’s “m” for millions where it reads as metres.) Expected: Nigeria blue, the rest neutral grey.',
    },
    {
      id: 'progress-ring',
      title: 'Progress ring: a grey track that is never data, the figure in the centre',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'donut-centre-value',
      rule: '“Use color.accent.gray.subtle when part of a graph is not filled … Do not use it for communicating data.” The ring: category-1 for the share, rounded ends, a gap at each join, a bold value and label centred.',
      current: 'Flint treats “Rest” as a second category: teal, with a key entry, and no centre text. There is no remainder role and no centre-figure slot.',
      expected: 'A thick dark-blue arc for 75% with rounded ends, the remainder in the translucent grey track, “75%” bold and “Coverage” in the middle.',
      proposal: '`ink.series.remainder` (track ink, excluded from keys and contrast checks) and a single-value ring template reading `type.display`.',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: [{ Part: 'Covered', Share: 75 }, { Part: 'Rest', Share: 25 }],
        semantic_types: { Part: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Part' },
        title: 'Coverage',
      }),
      expectedSpec: progressRing(),
      observed: 'Flint: a thin ring three-quarters dark blue and one quarter teal, a “Covered / Rest” key, the title “Coverage” above and nothing in the hole. Expected: a thick ring with rounded ends and gaps, the remainder in the pale track, “75%” and “Coverage” in the centre.',
    },
    {
      id: 'dark-mode',
      title: 'Dark mode swaps every token, the chart inks included',
      kind: 'product-ui',
      severity: 'high',
      probe: 'dark-mode',
      rule: 'Every chart token has a dark value — category-1 `#9AC5F1`, background `#0D0E10`/elevated `#191A1C`, content `#C4C5CB`, borders `#FFFFFF29` — and all chart inks keep 3:1 on every elevation in both modes.',
      current: 'A ThemeSpec holds one set of inks and `variants` may not change `ink`; Flint draws the light chart whatever the host’s colour scheme.',
      expected: 'The anatomy chart on the dark elevated surface with the dark category inks and borders.',
      proposal: 'A `modes: { dark: { ink } }` block (or `variants` on a host `colorScheme` signal that may carry `ink`), so one Tractie theme carries both token sets.',
      flint: flintInput(theme, {
        chartType: 'Stacked Bar Chart',
        data: MIX,
        semantic_types: { Country: 'Country', Source: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Country', y: 'Share', color: 'Source' },
        title: 'Electricity mix per country',
      }),
      expectedSpec: stackedColumns(DARK, CATEGORY_DARK, { title: 'Electricity mix per country', dark: true }),
      expectedFrame: { style: { background: '#191A1C', padding: '6px 0' } },
      observed: 'Flint draws the light chart only. Expected: the elevated dark surface, light-blue category-1, the dark-mode teal and yellow, light grey text and translucent white borders.',
    },
    {
      id: 'key-bottom',
      title: 'The key is moved to the right although the theme allows only the bottom',
      kind: 'realization',
      severity: 'medium',
      probe: 'legend-placement',
      rule: 'Legend below the chart, left-aligned.',
      current: 'The theme states `legend.placement: ["bottom"]`, `align: "start"`. Flint honours it for the grouped bars and line charts, but for stacked bars and the stacked area it puts the key on the right — a position the house did not list — without a report.',
      expected: 'The key under the plot in every chart that has one.',
      proposal: 'Treat the placement list as exhaustive: when no listed position fits, shrink or wrap the key there (or report `legend-placement-overridden`) instead of choosing an unlisted side.',
      observed: 'Seen in the signature panel and in the gallery’s electricity-mix stacked bar and stacked area tiles; the medals, EV and Gapminder tiles have the key at the bottom as stated.',
    },
    {
      id: 'key-swatch',
      title: 'Key swatches are rounded squares; no key for one category',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'legend-swatch',
      rule: 'Legend below the chart, left-aligned, with rounded-square swatches; “Do not include a legend for single-category charts”; tooltips as an extra cue.',
      current: 'Placement, alignment and the single-series rule are stated and drawn; the swatch is the renderer’s (`legend.swatch` only accepts `auto`).',
      expected: 'Rounded 14px squares before each label (see the signature panel).',
      proposal: '`legend.swatch: { shape: "roundedSquare", size: 14, radius: 3 }`.',
    },
  ],
};

export default tractie;
