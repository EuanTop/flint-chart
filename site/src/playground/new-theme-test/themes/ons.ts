import type { ThemeSpec } from 'flint-chart';
import research from '../research/ons.json';
import { EV_SHARE, flintInput, footerProbe, groupedProbe, highlightProbe, ANOMALY, UNEMPLOYMENT, withChartSource } from '../probes';
import { houseConfig, titled, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Open Sans', Helvetica, Arial, sans-serif";
const OCEAN = '#206095';
const BLACK = '#222222';
const GREY100 = '#414042';
const GREY75 = '#707071';
const GREY40 = '#B3B3B3';
const GREY20 = '#D9D9D9';
const GREY10 = '#ECECEC';
const PALETTE = ['#206095', '#a8bd3a', '#871a5b', '#f66068', '#05341a', '#27a0cc', '#003c57', '#22d0b6', '#746cb1'];

const t: HouseTokens = {
  font: FONT,
  text: BLACK,
  muted: GREY75,
  grid: GREY20,
  axis: null,
  background: '#FFFFFF',
  palette: PALETTE,
  highlight: OCEAN,
  context: GREY40,
  titleSize: 20,
  titleWeight: 700,
  subtitleSize: 16,
  subtitleColor: BLACK,
  subtitleWeight: 600,
  labelSize: 14,
  sourceSize: 16,
  lineWidth: 2.5,
  legendOrient: 'top',
};

const theme: ThemeSpec = {
  id: 'ons',
  label: 'Office for National Statistics',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: BLACK, secondary: GREY100, muted: GREY75, inverse: '#FFFFFF' },
    structure: { grid: GREY20, axis: GREY40, zero: GREY40, rule: GREY40 },
    series: {
      single: OCEAN,
      // “Always use five colours or fewer”: the core set is the first five; the full nine is the ceiling.
      categorical: PALETTE.slice(0, 5),
      categoricalExtended: PALETTE,
      sequential: { stops: ['#C9DCEB', '#8DB8D6', '#4E8FBF', '#206095', '#003C57'], space: 'lab' },
    },
    accent: '#f39431',
  },
  type: {
    minSize: 12,
    headline: { family: FONT, size: 20, weight: 'bold', case: 'asIs', color: BLACK },
    deck: { family: FONT, size: 16, weight: 'semibold', color: BLACK },
    axisLabel: { family: FONT, size: 14, color: GREY75 },
    axisTitle: { family: FONT, size: 14, weight: 'regular', color: GREY75 },
    keyLabel: { family: FONT, size: 14, color: GREY100 },
    valueLabel: { family: FONT, size: 14, weight: 'semibold', color: GREY100 },
    annotation: { family: FONT, size: 14, color: GREY100 },
    footnote: { family: FONT, size: 16, color: GREY75 },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit', tickDensity: 'dense' },
    },
    // “Zero gridline 1.5px Solid Grey 40”: its own weight and ink, a step up from the grid (GR2).
    grid: { measure: 'full', category: 'omit', style: 'solid', weight: 1, zero: { presence: 'full', weight: 1.5, color: GREY40 } },
    frame: 'omit',
    baseline: 'emphasised',
  },
  marks: {
    bandFraction: 0.8,
    strokeWeight: 2.5,
    strokeCap: 'round',
    separator: { presence: 'full', width: 1, source: 'surface' },
    point: { presence: 'omit' },
  },
  geometry: { line: { width: 2.5, cap: 'round' }, arc: { gap: 1, gapStyle: 'rule' } },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['seriesEnd', 'top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never', placement: 'atMark', inkMode: 'contrastWithMark' },
  annotation: {
    unit: 'everyTick',
    axisTitles: 'whenAmbiguous',
    axisTitlePlacement: 'flatAboveAxis',
    numberFormat: { thousands: 'separator' },
    pointEmphasis: 'latest',
  },
  layout: { titleBlock: { anchor: 'start', gap: 'normal', deckGap: 'tight' } },
  variants: [
    {
      when: { isTemporal: true },
      then: { structure: { axis: { categorical: { line: 'omit', ticks: 'full', tickLength: 'short' } } } },
      because: '“Time axes should have tick marks, but not gridlines; axes showing discrete categories should not have tick marks or gridlines.”',
    },
  ],
  // The source line, as the guide sets it (S1); the chart gives the words.
  source: {},
};

const yTitle = (title: string) => ({
  title,
  titleAngle: 0,
  titleAlign: 'left',
  titleAnchor: 'end',
  titleBaseline: 'bottom',
  titleX: -38,
  titleY: -12,
  titleFontSize: 14,
  titleFontWeight: 'normal',
  titleColor: GREY75,
});

const zeroRule = (channel: 'x' | 'y' = 'y') => ({
  data: { values: [{}] },
  mark: { type: 'rule', color: GREY40, strokeWidth: 1.5 },
  encoding: { [channel]: { datum: 0 } },
});

const SIG_TITLE = 'Unemployment spiked after the financial crisis and again in the pandemic';
const SIG_SUBTITLE = 'Unemployment rate, United States, 2000 to 2023';

/** The guide's spec image: Ocean blue columns, white gaps, ticks on the time axis, horizontal y title, grey Source line. */
function signature() {
  const spec = titled(t, {
    layer: [
      {
        data: { values: UNEMPLOYMENT },
        mark: { type: 'bar', color: OCEAN, stroke: '#FFFFFF', strokeWidth: 1 },
        encoding: {
          x: {
            field: 'Year', type: 'ordinal', title: null, scale: { paddingInner: 0, paddingOuter: 0 },
            axis: { labelAngle: 0, values: [2000, 2005, 2010, 2015, 2020], ticks: true, tickColor: GREY20, tickSize: 6, domain: false, labelPadding: 4 },
          },
          y: {
            field: 'Unemployment (%)', type: 'quantitative', scale: { domain: [0, 10] },
            axis: { tickCount: 6, labelExpr: "datum.label + '%'", ...yTitle('Percentage of labour force') },
          },
        },
      },
      zeroRule(),
    ],
  }, {
    title: SIG_TITLE,
    subtitle: SIG_SUBTITLE,
    footer: ['Source: US Bureau of Labor Statistics'],
  });
  const config = spec.config as Record<string, unknown>;
  return {
    ...spec,
    config: { ...config, title: { ...(config.title as object), frame: 'bounds' } },
    title: { text: ['Unemployment spiked after the financial crisis', 'and again in the pandemic'], subtitle: SIG_SUBTITLE, lineHeight: 26 },
  };
}

const EV_TWO = EV_SHARE.filter((row) => row.Country === 'Norway' || row.Country === 'China');
const SPRING = '#a8bd3a';
const SPRING_TEXT = '#8a9b2e';

/** Line chart with end dots and semibold direct labels; light inks swap to their text-adjusted variant. */
function directLabels() {
  const last = EV_TWO.filter((row) => row.Year === 2023);
  const color = { field: 'Country', type: 'nominal', scale: { domain: ['Norway', 'China'], range: [OCEAN, SPRING] }, legend: null };
  const textColor = { field: 'Country', type: 'nominal', scale: { domain: ['Norway', 'China'], range: [OCEAN, SPRING_TEXT] }, legend: null };
  return titled(t, {
    layer: [
      {
        data: { values: EV_TWO },
        mark: { type: 'line', strokeWidth: 2.5, strokeCap: 'round' },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2018, 2023] }, axis: { format: 'd', values: [2018, 2019, 2020, 2021, 2022, 2023], ticks: true, tickColor: GREY20, tickSize: 6, grid: false, domain: false } },
          y: { field: 'EV share (%)', type: 'quantitative', scale: { domain: [0, 100] }, axis: { tickCount: 6, labelExpr: "datum.label + '%'", ...yTitle('Share of new cars') } },
          color,
        },
      },
      {
        data: { values: last },
        mark: { type: 'point', filled: true, size: 50, opacity: 1 },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'EV share (%)', type: 'quantitative' }, color },
      },
      {
        data: { values: last },
        mark: { type: 'text', align: 'left', dx: 8, fontSize: 14, fontWeight: 600, font: FONT },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'EV share (%)', type: 'quantitative' }, text: { field: 'Country' }, color: textColor },
      },
      zeroRule(),
    ],
  }, { title: 'Norway’s electric-car share is more than double China’s', subtitle: 'Share of new cars sold that are electric, 2018 to 2023' });
}

/** Annotations as the guide draws them: a Grey 10 range band, a dashed Grey 40 reference line, a curved Grey 100 arrow. */
function annotations() {
  const arrowPath = [
    { x: 2015.2, y: 1.9 },
    { x: 2019.2, y: 1.7 },
    { x: 2021.8, y: 3.1 },
  ];
  return titled(t, {
    layer: [
      {
        data: { values: [{ from: 2007.9, to: 2009.6 }] },
        mark: { type: 'rect', color: GREY10 },
        encoding: { x: { field: 'from', type: 'quantitative', scale: { domain: [2000, 2023], nice: false } }, x2: { field: 'to' } },
      },
      {
        data: { values: [{ x: 2007.9, text: 'Financial crisis' }] },
        mark: { type: 'text', align: 'right', baseline: 'top', dx: -4, dy: 2, fontSize: 14, color: GREY100, font: FONT },
        encoding: { x: { field: 'x', type: 'quantitative' }, y: { value: 0 }, text: { field: 'text' } },
      },
      {
        data: { values: [{ x: 2020 }] },
        mark: { type: 'rule', color: GREY40, strokeWidth: 2, strokeDash: [4, 4] },
        encoding: { x: { field: 'x', type: 'quantitative' } },
      },
      {
        data: { values: [{ x: 2020, text: 'Pandemic' }] },
        mark: { type: 'text', align: 'right', baseline: 'top', dx: -4, dy: 2, fontSize: 14, color: GREY100, font: FONT },
        encoding: { x: { field: 'x', type: 'quantitative' }, y: { value: 0 }, text: { field: 'text' } },
      },
      {
        data: { values: UNEMPLOYMENT },
        mark: { type: 'line', strokeWidth: 2.5, color: OCEAN, strokeCap: 'round' },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, axis: { format: 'd', values: [2000, 2005, 2010, 2015, 2020], ticks: true, tickColor: GREY20, tickSize: 6, grid: false, domain: false } },
          y: { field: 'Unemployment (%)', type: 'quantitative', scale: { domain: [0, 12] }, axis: { tickCount: 6, labelExpr: "datum.label + '%'", ...yTitle('Percentage of labour force') } },
        },
      },
      {
        data: { values: arrowPath },
        mark: { type: 'line', interpolate: 'basis', color: GREY100, strokeWidth: 1 },
        encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'y', type: 'quantitative' } },
      },
      {
        data: { values: [arrowPath[2]] },
        mark: { type: 'point', shape: 'M-1,-0.7L0,0L-1,0.7', filled: false, stroke: GREY100, strokeWidth: 1, size: 70, angle: -40 },
        encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'y', type: 'quantitative' } },
      },
      {
        data: { values: [{ x: 2015, y: 1.9, text: 'Lowest rate since 1969' }] },
        mark: { type: 'text', align: 'right', baseline: 'middle', dx: -4, fontSize: 14, color: GREY100, font: FONT },
        encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'y', type: 'quantitative' }, text: { field: 'text' } },
      },
      zeroRule(),
    ],
  }, { title: 'Unemployment is back to its pre-pandemic low', subtitle: 'Unemployment rate, United States, 2000 to 2023', footer: ['Source: US Bureau of Labor Statistics'] });
}

/** Signed bars: no axis line; the zero gridline in 1.5px Grey 40 among 1px Grey 20 lines. */
function zeroLine() {
  return titled(t, {
    layer: [
      {
        data: { values: ANOMALY },
        mark: { type: 'bar', color: OCEAN },
        encoding: {
          x: { field: 'Decade', type: 'ordinal', title: null, axis: { labelAngle: 0, domain: false, ticks: false } },
          y: { field: 'Anomaly (°C)', type: 'quantitative', axis: { tickCount: 6, ...yTitle('°C') } },
        },
      },
      zeroRule(),
    ],
  }, { title: 'The world has warmed every decade since the 1960s', subtitle: 'Temperature anomaly against 1951 to 1980, world, 1880s to 2010s', width: 440 });
}

/** Grouped bars with the key the guide asks for: 12px circles above the plot, left-aligned. */
function circleKey() {
  const probe = groupedProbe(theme, t, { palette: [OCEAN, '#a8bd3a', '#871a5b'] });
  const spec = probe.expectedSpec as Record<string, unknown>;
  const config = spec.config as Record<string, unknown>;
  return {
    ...probe,
    expectedSpec: {
      ...spec,
      config: {
        ...config,
        legend: { ...(config.legend as object), symbolType: 'circle', symbolSize: 144, symbolStrokeWidth: 0, labelColor: GREY100, labelFontSize: 14, orient: 'top', offset: 10, columnPadding: 22 },
      },
    },
  };
}

const ons: StyleGuideTheme = {
  id: 'ons',
  org: 'Office for National Statistics (ONS)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch. Stated directly: Open Sans throughout in #222222 (never pure black); a 20px bold headline and a 16px **semibold** statistical subtitle; 14px axis labels in Grey 75 and key labels in Grey 100; Ocean blue `#206095` for single series and the nine-colour category order with the first five as the core set (“always use five colours or fewer”); 1px Grey 20 gridlines on the measure only; no axis lines, borders or backgrounds; the zero line as an emphasised (1.5×) Grey 40 rule; horizontal labels only; `%` on every tick label; the y-axis title flat above the axis (axis titles only where the labels do not name their kind); comma thousands; direct labels at the line ends before a key above the plot, left-aligned.',
    'The guide’s split between time axes (ticks, no gridlines) and category axes (neither) was stated as a `variants` entry on `isTemporal`. The 1px white separators between adjacent columns come from `marks.separator`.',
    'Not stateable: the open-tail-g stylistic set (`font-feature-settings: "ss01"`), circle and line swatches in the key, the Source line, the “Figure X:” prefix, and the guide’s annotation kit (curved arrow, dashed reference line, Grey 10 range band) — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'The guide’s “Titles and source” specimen: bold #222222 headline and semibold subtitle top-left; a short unit title printed flat above the y axis; right-aligned grey tick labels on 1px Grey 20 gridlines with a 1.5px Grey 40 zero line and no axis lines; Ocean blue columns cut by thin white gaps; small Grey 20 ticks on the time axis; “Source: …” in 16px Grey 75 at the bottom left.',
      current: 'The theme states the headline and deck, Ocean blue, Grey 20 gridlines without axis lines, the flat y title, `%` on every tick, ticks on time axes only and horizontal 14px labels. Flint draws the type, colour and grid, but crowds the year axis (turning and shrinking its labels), drops the `%`, draws the deck regular, and has no slot for the source.',
      expected: 'The specimen applied to US unemployment, 2000 to 2023.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: SIG_TITLE,
        subtitle: SIG_SUBTITLE,
      }),
      expectedSpec: signature(),
      observed: 'Flint (left): the headline is right, but the deck is regular rather than semibold; the flat y title reads “Unemployment (%)” at 16px, larger than the ticks it names; years every two are turned 45° and both axes are shrunk to ~8px; no % on the ticks; no Source line. The columns stand apart at 80% of their band; the specimen cuts them with a 1px white line. Expected (right): flat 14px ticks with %, years every five, a Grey 40 zero line and a Source line.',
    },
    {
      id: 'source-line',
      addressed: { stage: 'S1', note: '“Source: …” at the bottom left, aligned with the title, in the footnote role.' },
      title: '“Source:” line at the bottom left',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: '“Source new: Regular (400) 16px … Grey 75 #707071, Left” — every chart closes with “Source: …” under the plot, aligned with the title.',
      current: 'The chart spec has no source or notes slot, and nothing in Flint draws `type.footnote`, although this theme states it (16px Grey 75).',
      expected: 'A 16px Grey 75 “Source: …” line under the plot, flush with the headline.',
      proposal: '`chart_spec.source` / `chart_spec.notes[]`, rendered in `type.footnote` with a `layout.footer.align` rule.',
      ...footerProbe(theme, t, {
        title: 'India and China hold over a third of the world’s people',
        subtitle: 'Population, millions, selected countries, 2023',
        footer: ['Source: UN World Population Prospects'],
      }),
      observed: 'Flint (left): the chart ends at the “Population” axis title, with no source. It also writes “0 m … 1,500 m” on every tick, where ONS keeps non-currency units in the subtitle. Expected (right): “Source: UN World Population Prospects” in Grey 75 at the bottom left.',
    },
    {
      id: 'circle-key',
      title: 'Key swatches are 12px circles for fills and round-capped lines for lines',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'legend-swatch',
      rule: '“Circles should have a 12-pixel diameter … lines 20px wide, with a 3px stroke” and rounded caps; a 12px Grey 30 square only for ranges; the key above the chart, aligned to the left-hand side.',
      current: '`legend.swatch` only accepts `auto`; Flint picks the renderer’s symbol per mark and sizes it from the key label.',
      expected: 'Gold, silver and bronze keyed by 12px circles above the plot, left-aligned, in Grey 100 14px text.',
      proposal: '`legend.swatch: { fill: "circle" | "square", line: "stroke", size, strokeWidth, cap }` — a swatch shape per mark family rather than one `auto`.',
      ...circleKey(),
      observed: 'Flint (left): square swatches for the bars (it uses circles only for the pie and the scatter in the gallery), and the flat “Count” title runs straight into the key row — the two touch. Expected (right): 12px circles, left-aligned above the plot, with the plot starting clear of the key.',
    },
    {
      id: 'direct-labels',
      addressed: { stage: 'R4', note: 'Light inks switch to their text variant (`categoricalText`) or are darkened to 3:1.' },
      title: 'Direct labels are semibold, and light inks switch to their text variant',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'series-text-ink',
      rule: '“Direct labels – line chart (category): Semibold (600), data colour”; light palette colours have darker text-adjusted variants for 4.5:1 contrast (Spring green `#a8bd3a` → `#8a9b2e`, Mint green → `#1aa590`, Highlight orange → `#f56927`).',
      current: 'Stated as `legend.placement: ["seriesEnd", "top"]` with `annotation.pointEmphasis: "latest"`, so Flint ends each line in a dot and its name. The label takes `type.keyLabel`’s weight (regular — the key itself is regular) and exactly the line’s ink; the series palette has no paired text ink.',
      expected: 'Norway and China named at their 2023 ends in semibold, China’s name in the darker `#8a9b2e`, its line in Spring green.',
      proposal: '`ink.series.textVariants` (an array parallel to `categorical`, or a `{ [ink]: textInk }` map) used wherever a series colour is written as text; and a `type.directLabel` role separate from `keyLabel`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_TWO,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway’s electric-car share is more than double China’s',
        subtitle: 'Share of new cars sold that are electric, 2018 to 2023',
      }),
      expectedSpec: directLabels(),
      observed: 'Flint (left): Norway and China are named at the line ends with a small dot — the `seriesEnd` placement works — but in regular weight and with China in the line’s own Spring green, which is too light to read as text. Expected (right): semibold labels, China’s in the darker `#8a9b2e`.',
    },
    {
      id: 'zero-line',
      addressed: { stage: 'GR2', note: '`grid.zero: { presence: "full", weight: 1.5, color: "#B3B3B3" }` — the zero gridline 1.5px Grey 40, a step up from the grid (GR2).' },
      title: 'The zero gridline is 1.5px Grey 40, the only line heavier than the grid',
      kind: 'realization',
      severity: 'medium',
      probe: 'zero-line',
      rule: '“Zero gridline 1.5px Solid Grey 40 #B3B3B3; all other gridlines 1px Grey 20 #D9D9D9”; no separate axis lines; “never #000000”.',
      current: 'Stated as `structure.grid.zero: "emphasised"` with `ink.structure.zero: #B3B3B3` (and `baseline: "emphasised"` for charts whose zero is the bottom edge). The only way to ask for 1.5px is the `emphasised` presence — and `resolvePresenceInk` returns the foreground text ink for `emphasised`, discarding the declared role ink. The zero rule comes out #222222. `full` would keep the grey but drop the weight to 1px.',
      expected: 'One 1.5px Grey 40 rule at 0 °C among the pale gridlines — a step up from the grid, not a black axis.',
      proposal: 'Let a declared role ink survive every presence (`emphasised` should only raise the weight), and give the rule its own weight: `structure.grid.zeroWeight` (and `baselineWeight`) in px.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: ANOMALY.map(({ Decade, 'Anomaly (°C)': v }) => ({ Decade, 'Anomaly (°C)': v })),
        semantic_types: { Decade: 'Category', 'Anomaly (°C)': { semanticType: 'Quantity', unit: '°C' } },
        encodings: { x: 'Decade', y: 'Anomaly (°C)' },
        title: 'The world has warmed every decade since the 1960s',
        subtitle: 'Temperature anomaly against 1951 to 1980, world, 1880s to 2010s',
      }),
      expectedSpec: zeroLine(),
      observed: 'Flint (left): the zero rule is drawn, at 1.5px, but in near-black `#222222` — it reads as a heavy axis rather than a grey rule. The decades are also turned 90°. Expected (right): a Grey 40 zero line barely heavier than the grid, decades flat.',
    },
    {
      id: 'annotation-kit',
      title: 'Annotations: curved arrow, dashed reference line, grey range band',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'annotation',
      rule: '“Arrow 1px solid curved line, open arrowhead, Grey 100 #414042”; “Reference line 2px, 4px dash 4px gap, Grey 40”; “Range annotation Grey 10 #ECECEC”; annotation text 14px regular Grey 100; every line or range annotation explained in words.',
      current: 'The chart spec has no annotation slot (a point, a reference value or a range with its text), and the ThemeSpec has no annotation styles beyond a `type.annotation` role that nothing draws.',
      expected: 'The 2008–09 range shaded Grey 10 and labelled, the 2020 pandemic as a dashed Grey 40 line, the 2022–23 low pointed to with a curved arrow.',
      proposal: '`chart_spec.annotations[]` (`{ kind: "point" | "line" | "range", at, text }`) with a theme block `annotation.marks: { arrow: { curve, head: "open", weight }, referenceLine: { weight, dash, ink }, range: { fill } }`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Unemployment is back to its pre-pandemic low',
        subtitle: 'Unemployment rate, United States, 2000 to 2023',
      }),
      expectedSpec: annotations(),
      observed: 'Flint (left): the bare line with a dot on the last value (`pointEmphasis: latest`); no range, reference line or arrow, and the ticks shrunk to ~8px. Expected (right): the Grey 10 band behind 2008–09 labelled “Financial crisis”, the dashed Grey 40 2020 line labelled “Pandemic”, and a thin curved arrow with an open head from “Lowest rate since 1969”.',
    },
    {
      id: 'highlight',
      title: 'Important categories in Ocean blue, the rest in grey',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'highlight',
      rule: '“Use grey to show less important categories and use Ocean blue … to highlight important data” (orange #f39431 in Chartbuilder).',
      current: 'Neither the chart spec nor the theme can name the category that matters; every bar takes `ink.series.single`.',
      expected: 'Nigeria in Ocean blue, the other countries in Grey 40.',
      proposal: '`chart_spec.emphasis: { field, values }` with `ink.series.emphasis` / `ink.series.context` in the theme.',
      ...highlightProbe(theme, t, { focus: 'Nigeria', title: 'Nigeria is the most populous country in Africa', subtitle: 'Population, millions, selected countries, 2023' }),
      observed: 'Flint (left): every bar in Ocean blue; nothing marks Nigeria, the subject of the headline. Expected (right): Nigeria in Ocean blue, the rest Grey 40.',
    },
    {
      id: 'labels-shrunk-turned',
      addressed: { stage: 'A1', note: 'Category names stay flat, no smaller than ¾ of the stated size, before they turn (A1). A crowded ruler still shrinks.' },
      title: 'Tick labels shrink to 9px and turn on end, against 14px horizontal text',
      kind: 'realization',
      severity: 'high',
      probe: 'turned-row-labels',
      rule: '“All text … horizontal — no rotated or diagonal text”; minimum text size 14px (12px only in small multiples); on a long time axis label fewer years (“use 6 to 10 gridlines”, round intervals).',
      current: 'Stated as `labels.`, `type.axisLabel.size: 14` and `type.minSize: 12`. On a 24-year column chart Flint labels every second year, finds “2000” wider than its 18px band and turns it (`labels-straight-refused`), then shrinks both axes to 9px (`labels-shrunk`) — the y axis too, although six labels on 150px are not crowded. The same happens to the decades and to country names in the gallery.',
      expected: 'Years every five (2000, 2005 … 2020) laid flat at 14px, as in the signature panel; the y labels untouched by the x axis’s crowding.',
      proposal: 'When the house forbids turning, thin the labels to a round step that fits before turning or shrinking; never shrink below `type.minSize`; shrink each axis on its own evidence.',
      observed: 'Signature (left): years 2000–2022 turned 45° in ~8px type, y labels 0–10 also ~8px, while the deck stays 16px. Zero-line (left): decades turned 90°. Gallery: medal countries, electricity countries and heatmap months all turned.',
    },
    {
      id: 'unit-on-ticks',
      title: '% on every tick label, and a short unit title above the axis',
      kind: 'realization',
      severity: 'medium',
      probe: 'unit-placement',
      rule: '“Always include the relevant symbols (% or currency symbols) directly in the axis labels”, and a short horizontal y-axis title (“Percentage of adults”, “£ million”) above the axis.',
      current: 'Stated as `annotation.unit: "everyTick"` with flat axis titles; the rule is specific to % and currency, which the field cannot say. Flint reports `unit-not-drawn` — “the title already names `%`” — because its title is the field name “Unemployment (%)”; it will not print the unit twice, so the ticks read 0, 2, 4 … with the percent sign only in the title.',
      expected: '0%, 2%, 4% … 10% on the ticks; above them a short description of the unit, not the field name.',
      proposal: 'Treat `unit: "everyTick"` as binding, and let a house scope it to symbol units (`annotation.unitSymbolsOnly: ["%", "£", "$"]`); let the chart spec carry an axis title distinct from the field name (`encodings.y.title`) so the title can describe the population rather than repeat the unit.',
      observed: 'Signature, annotation and series-text panels (left): bare 0–10 / 0–100 ticks under “Unemployment (%)” / “EV share (%)”. The opposite happens for a non-percent unit: the population bars read “0 m, 500 m, 1,000 m”, where ONS keeps such units in the title or subtitle.',
    },
    {
      id: 'semibold-deck',
      addressed: { stage: 'T1', note: 'The deck’s stated weight is now written (`subtitleFontWeight`).' },
      title: 'The semibold subtitle is drawn regular',
      kind: 'realization',
      severity: 'medium',
      probe: 'type-weight-scale',
      rule: '“Sub-title new (statistical): Semibold (600) 16px #222222” — the subtitle is heavier than body text and lighter than the bold headline.',
      current: 'Stated as `type.deck.weight: "semibold"`. The compiled `config.title` carries `subtitleFont`, `subtitleFontSize` and `subtitleColor` but no `subtitleFontWeight`, so the deck renders at 400.',
      expected: 'A 600-weight deck — the three-step bold / semibold / regular hierarchy of the specimen.',
      proposal: 'Realise `type.deck.weight` as `subtitleFontWeight` (and map `semibold` to 600, `medium` to 500).',
      observed: 'In every Flint panel the deck is visibly lighter than in the expected panels beside it.',
    },
  ],
};

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(ons, 'Office for National Statistics', ['source-line']);

export default ons;
