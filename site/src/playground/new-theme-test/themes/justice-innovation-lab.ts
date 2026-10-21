import type { ThemeSpec } from 'flint-chart';
import research from '../research/justice-innovation-lab.json';
import { EV_SHARE, flintInput, highlightProbe, MEDALS, POPULATION } from '../probes';
import { houseConfig, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

// Matter is proprietary; Work Sans is the nearest open grotesque loaded on the page.
const FONT = "Matter, 'Work Sans', Arial, sans-serif";
const INK = '#1a1a1a';
const AXIS = '#5e667d';
const DARK_BLUE = '#2b5e88';
const LIGHT_BLUE = '#4498cf';
const ORANGE = '#db771a';
const GRAY = '#89929a';
// pt × 4/3: the guide states every size in points.
const PX = { title: 26.7, deck: 21.3, key: 18.7, axisTitle: 18.7, tick: 17.3, value: 18.7 };

const t: HouseTokens = {
  font: FONT,
  text: INK,
  muted: INK,
  grid: null,
  axis: AXIS,
  background: '#FFFFFF',
  palette: [DARK_BLUE, ORANGE, LIGHT_BLUE, GRAY, '#579e9a', '#7075bf'],
  highlight: ORANGE,
  context: GRAY,
  titleSize: PX.title,
  titleWeight: 600,
  subtitleSize: PX.deck,
  subtitleColor: INK,
  labelSize: PX.tick,
  sourceSize: 14,
  gridAxis: 'none',
};

const theme: ThemeSpec = {
  id: 'justice-innovation-lab',
  label: 'Justice Innovation Lab',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: INK, secondary: INK, muted: INK, inverse: '#FFFFFF' },
    structure: { axis: AXIS, grid: '#e8e8e8', rule: AXIS },
    series: {
      single: DARK_BLUE,
      // Ordered so that the first two and the first three are the guide's approved pair and triple.
      categorical: [DARK_BLUE, ORANGE, LIGHT_BLUE, GRAY],
      categoricalExtended: [DARK_BLUE, ORANGE, LIGHT_BLUE, GRAY, '#579e9a', '#7075bf'],
      overflow: GRAY,
      sequential: { stops: ['#add4e9', '#8db5d2', '#6c96bc', '#4a79a6', '#215d90'], space: 'lab' },
      diverging: {
        stops: ['#215d90', '#426d9b', '#758eb1', '#a3b1c7', '#d1d5dd', '#e8e8e8', '#e2d2ca', '#d3a691', '#b36740', '#a65326', '#983d07'],
        neutral: '#e8e8e8',
        space: 'lab',
      },
    },
    accent: ORANGE,
  },
  type: {
    headline: { family: FONT, size: PX.title, weight: 'semibold', case: 'asIs', color: INK },
    deck: { family: FONT, size: PX.deck, weight: 'regular', color: INK },
    axisLabel: { family: FONT, size: PX.tick, color: INK },
    axisTitle: { family: FONT, size: PX.axisTitle, weight: 'regular', color: INK },
    keyLabel: { family: FONT, size: PX.key, color: INK },
    valueLabel: { family: FONT, size: PX.value, weight: 'semibold' },
    annotation: { family: FONT, size: PX.tick, color: INK },
  },
  structure: {
    axis: {
      measure: { line: 'hairline', lineWeight: 0.67, ticks: 'hairline', tickDirection: 'outward', tickLength: 'short', tickDensity: 'sparse' },
      categorical: { line: 'omit', ticks: 'omit' },
    },
    grid: { measure: 'omit', category: 'omit' },
    frame: 'omit',
    baseline: 'hairline',
  },
  marks: {
    bandFraction: 0.72,
    cornerRadius: 0,
    strokeWeight: 2.5,
    separator: { presence: 'full', width: 1.33, source: 'surface' },
    redundantEncoding: 'always',
    redundantChannels: ['dash'],
  },
  geometry: { cell: { gap: 1.33 }, band: { cornerRadius: 0, fraction: 0.72 } },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  // Values flush at the bar's base, reading as one column; black wherever white falls under 4.5:1 (L4).
  dataLabels: { show: 'whenTheyFit', placement: 'atMark', inkMode: 'contrastWithMark', anchor: 'start', minContrast: 4.5 },
  annotation: { axisTitles: 'whenAmbiguous', numberFormat: { thousands: 'separator' } },
  // Titles start where the x axis starts (F3).
  layout: { titleBlock: { anchor: 'start', gap: 'normal', frame: 'plot' } },
};

const SIG_TITLE = 'Enhancements lengthen sentences for every charge';
const SIG_DECK = 'Median sentence in days, by charge';
const CHARGES = [
  ['Charge X', 559, 78],
  ['Charge Y', 641, 418],
  ['Charge Z', 327, 115],
] as const;
const SENTENCES = CHARGES.flatMap(([Charge, withE, without]) => [
  { Charge, Enhancement: 'With enhancement', Days: withE },
  { Charge, Enhancement: 'Without enhancement', Days: without },
]);

/** A value axis on the 0.5pt baseline with outward ticks; `labelStep` labels every other tick (100, 300, 500…). */
const xAxis = (title: string | null, values?: number[], labelStep?: number, labelOffset = 0) => ({
  title,
  titleFontSize: PX.axisTitle,
  titleFontWeight: 'normal',
  titleColor: INK,
  titlePadding: 10,
  labelFontSize: PX.tick,
  labelColor: INK,
  domain: true,
  domainColor: AXIS,
  domainWidth: 0.67,
  ticks: true,
  tickColor: AXIS,
  tickWidth: 0.67,
  tickSize: 6,
  grid: false,
  ...(values ? { values } : {}),
  ...(labelStep ? { labelExpr: `datum.value % ${labelStep} === ${labelOffset} ? format(datum.value, ',') : ''` } : { labelExpr: "format(datum.value, ',')" }),
});

const yBandAxis = { title: null, domain: false, ticks: false, labelFontSize: PX.tick, labelColor: INK, labelPadding: 14, labelAlign: 'right' };

const base = (extra: Record<string, unknown>) => ({
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  config: { ...houseConfig(t), legend: { ...(houseConfig(t).legend as object), labelFontSize: PX.key, labelLimit: 0, symbolSize: 180, symbolType: 'square', columnPadding: 24, offset: 18 } },
  ...extra,
});

/** Page 19's anatomy chart: grouped horizontal bars, values bold inside the bar start, key and title on the axis's start. */
function signature() {
  return base({
    title: { text: SIG_TITLE, subtitle: SIG_DECK },
    width: 640,
    height: 330,
    data: { values: SENTENCES },
    encoding: {
      y: { field: 'Charge', type: 'nominal', axis: yBandAxis, scale: { paddingInner: 0.22 } },
      yOffset: { field: 'Enhancement', sort: ['With enhancement', 'Without enhancement'], scale: { paddingInner: 0.18 } },
      x: { field: 'Days', type: 'quantitative', scale: { domain: [0, 720], nice: false }, axis: xAxis('Days', [0, 100, 200, 300, 400, 500, 600, 700], 200, 100) },
    },
    layer: [
      {
        mark: { type: 'bar' },
        encoding: { color: { field: 'Enhancement', type: 'nominal', sort: ['With enhancement', 'Without enhancement'], scale: { range: [ORANGE, DARK_BLUE] }, legend: { orient: 'top', direction: 'horizontal', title: null } } },
      },
      {
        mark: { type: 'text', align: 'left', baseline: 'middle', dx: 8, fontSize: PX.value, fontWeight: 600, font: FONT },
        encoding: {
          x: { datum: 0 },
          text: { field: 'Days', type: 'quantitative', format: ',' },
          color: { condition: { test: "datum.Enhancement === 'With enhancement'", value: '#000000' }, value: '#ffffff' },
        },
      },
    ],
  });
}

/** Horizontal bars with bold values left-aligned inside the bar start (fig. 1). */
function labelsAtStart() {
  return base({
    title: { text: 'India and China hold over a third of humanity', subtitle: 'Population, millions, 2023' },
    width: 600,
    height: 300,
    data: { values: POPULATION },
    encoding: {
      y: { field: 'Country', type: 'nominal', sort: null, axis: yBandAxis, scale: { paddingInner: 0.22 } },
      x: { field: 'Population', type: 'quantitative', axis: xAxis(null, [0, 250, 500, 750, 1000, 1250, 1500], 500), scale: { domain: [0, 1500], nice: false } },
    },
    layer: [
      { mark: { type: 'bar', color: DARK_BLUE } },
      {
        mark: { type: 'text', align: 'left', baseline: 'middle', dx: 8, fontSize: PX.value, fontWeight: 600, font: FONT, color: '#ffffff' },
        encoding: { x: { datum: 0 }, text: { field: 'Population', type: 'quantitative', format: ',.0f' } },
      },
    ],
  });
}

/** Title, deck and key start where the x axis starts, not at the edge of the row labels. */
function titleOnAxis() {
  return base({
    title: { text: 'India and China hold over a third of humanity', subtitle: 'Population, millions, 2023' },
    width: 600,
    height: 300,
    data: { values: POPULATION },
    mark: { type: 'bar', color: DARK_BLUE },
    encoding: {
      y: { field: 'Country', type: 'nominal', sort: null, axis: yBandAxis, scale: { paddingInner: 0.22 } },
      x: { field: 'Population', type: 'quantitative', axis: xAxis('Millions of people', [0, 250, 500, 750, 1000, 1250, 1500], 500), scale: { domain: [0, 1500], nice: false } },
    },
  });
}

const EV_COUNTRIES = ['Norway', 'China', 'Germany'];
const evRows = EV_SHARE.filter((row) => EV_COUNTRIES.includes(row.Country));

/** Three lines told apart by colour and dash (fig. 2): solid dark blue, dashed light blue, dotted orange. */
function dashedLines() {
  return base({
    title: { text: 'Norway pulled away from China and Germany', subtitle: 'Share of new cars sold that are electric, %' },
    width: 460,
    height: 260,
    data: { values: evRows },
    mark: { type: 'line', strokeWidth: 2.5 },
    encoding: {
      x: { field: 'Year', type: 'quantitative', scale: { domain: [2018, 2023] }, axis: { ...xAxis(null, [2018, 2019, 2020, 2021, 2022, 2023]), format: 'd', labelExpr: undefined } },
      y: { field: 'EV share (%)', type: 'quantitative', axis: { title: null, domain: false, ticks: false, grid: false, labelFontSize: PX.tick, labelColor: INK, labelExpr: "datum.label + '%'", tickCount: 5 } },
      color: { field: 'Country', type: 'nominal', sort: EV_COUNTRIES, scale: { domain: EV_COUNTRIES, range: [DARK_BLUE, ORANGE, LIGHT_BLUE] }, legend: { orient: 'top', title: null, symbolType: 'stroke', symbolStrokeWidth: 2.5, symbolSize: 300 } },
      strokeDash: { field: 'Country', type: 'nominal', sort: EV_COUNTRIES, scale: { domain: EV_COUNTRIES, range: [[1, 0], [6, 3], [2, 2]] }, legend: { orient: 'top', title: null, symbolType: 'stroke', symbolStrokeWidth: 2.5, symbolSize: 300 } },
    },
  });
}

/** Flint's own label position (inside the value end), with the guide's ink: black on orange, white on blue. */
function labelInk() {
  return base({
    title: { text: SIG_TITLE, subtitle: SIG_DECK },
    width: 560,
    height: 280,
    data: { values: SENTENCES },
    encoding: {
      y: { field: 'Charge', type: 'nominal', axis: yBandAxis, scale: { paddingInner: 0.22 } },
      yOffset: { field: 'Enhancement', sort: ['With enhancement', 'Without enhancement'], scale: { paddingInner: 0.18 } },
      x: { field: 'Days', type: 'quantitative', scale: { domain: [0, 700] }, axis: xAxis('Days', [0, 200, 400, 600]) },
    },
    layer: [
      {
        mark: { type: 'bar' },
        encoding: { color: { field: 'Enhancement', type: 'nominal', sort: ['With enhancement', 'Without enhancement'], scale: { range: [DARK_BLUE, ORANGE] }, legend: { orient: 'top', direction: 'horizontal', title: null } } },
      },
      {
        mark: { type: 'text', align: 'right', baseline: 'middle', dx: -6, fontSize: PX.value, fontWeight: 600, font: FONT },
        encoding: {
          text: { field: 'Days', type: 'quantitative', format: ',' },
          color: { condition: { test: "datum.Enhancement === 'Without enhancement'", value: '#000000' }, value: '#ffffff' },
        },
      },
    ],
  });
}

const FILINGS = [[2016, 3110], [2017, 2960], [2018, 4306], [2019, 5501], [2020, 3919], [2021, 2880], [2022, 1641]].map(([Year, Cases]) => ({ Year: String(Year), Cases }));

/** Fig. 3: columns by year, bold values above, y labels without a title or a line, no x title (years are self-evident). */
function columnsNoTitles() {
  return base({
    title: { text: 'Filings peaked in 2019 and have fallen since', subtitle: 'Cases filed per year' },
    width: 420,
    height: 260,
    data: { values: FILINGS },
    encoding: {
      x: { field: 'Year', type: 'ordinal', scale: { paddingInner: 0.12 }, axis: { title: null, labelAngle: 0, labelFontSize: PX.tick, labelColor: INK, domain: true, domainColor: AXIS, domainWidth: 0.67, ticks: false } },
      y: { field: 'Cases', type: 'quantitative', scale: { domain: [0, 6000] }, axis: { title: null, values: [0, 2000, 4000, 6000], labelExpr: "format(datum.value, ',')", labelFontSize: PX.tick, labelColor: INK, domain: false, ticks: false, grid: false } },
    },
    layer: [
      { mark: { type: 'bar', color: DARK_BLUE } },
      { mark: { type: 'text', baseline: 'bottom', dy: -4, fontSize: PX.value, fontWeight: 600, font: FONT, color: '#000000' }, encoding: { text: { field: 'Cases', type: 'quantitative', format: ',' } } },
    ],
  });
}

const MEDAL_ROWS = MEDALS;

/** Grouped columns with every label horizontal: long names wrap onto two lines instead of turning. */
function horizontalLabels() {
  return base({
    title: { text: 'The US and China shared the top of the table', subtitle: 'Paris 2024 Olympic medals by type' },
    width: 420,
    height: 240,
    data: { values: MEDAL_ROWS },
    encoding: {
      x: { field: 'Country', type: 'nominal', sort: null, scale: { paddingInner: 0.2 }, axis: { title: null, labelAngle: 0, labelFontSize: PX.tick, labelColor: INK, labelExpr: "datum.value === 'United States' ? ['United', 'States'] : datum.value", domain: true, domainColor: AXIS, domainWidth: 0.67, ticks: false } },
      xOffset: { field: 'Medal', sort: ['Gold', 'Silver', 'Bronze'] },
      y: { field: 'Count', type: 'quantitative', axis: { title: null, labelFontSize: PX.tick, labelColor: INK, domain: false, ticks: false, grid: false, tickCount: 4 } },
      color: { field: 'Medal', type: 'nominal', sort: ['Gold', 'Silver', 'Bronze'], scale: { range: [DARK_BLUE, ORANGE, LIGHT_BLUE] }, legend: { orient: 'top', title: null } },
    },
    mark: { type: 'bar' },
  });
}

/** Groups of people in small multiples with shared axes, one blue line each, instead of one coloured line per group. */
function smallMultiples() {
  const countries = ['Norway', 'China', 'Germany', 'United States'];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), header: { labelFont: FONT, labelFontSize: PX.tick, labelColor: INK, labelAnchor: 'start', labelPadding: 4, title: null } },
    title: { text: 'Every country sold more electric cars in 2023', subtitle: 'Share of new cars sold that are electric, %' },
    data: { values: EV_SHARE },
    facet: { field: 'Country', type: 'nominal', sort: countries, header: { title: null, labelFontWeight: 600 } },
    columns: 4,
    spacing: 18,
    spec: {
      width: 120,
      height: 150,
      mark: { type: 'line', strokeWidth: 2.5, color: DARK_BLUE },
      encoding: {
        x: { field: 'Year', type: 'quantitative', scale: { domain: [2018, 2023] }, axis: { ...xAxis(null, [2018, 2023]), format: 'd', labelExpr: undefined, labelFontSize: 14 } },
        y: { field: 'EV share (%)', type: 'quantitative', scale: { domain: [0, 100] }, axis: { title: null, domain: false, ticks: false, grid: false, labelFontSize: 14, labelColor: INK, values: [0, 50, 100] } },
      },
    },
    resolve: { scale: { y: 'shared', x: 'shared' } },
  };
}

const jil: StyleGuideTheme = {
  id: 'justice-innovation-lab',
  org: 'Justice Innovation Lab',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch (no `extends`). Stated directly from the April 2024 guide: the data palette (dark blue `#2b5e88`, orange `#db771a`, light blue `#4498cf`, gray `#89929a`, with teal and purple only in the extended set), ordered so that the first two and first three colours are among the guide’s approved pairs and triples; the blue ordinal ramp and the blue–`#e8e8e8`–orange diverging ramp; `#1a1a1a` text; every type role at its stated point size converted to px (title 20pt SemiBold, subtitle 16pt, key 14pt, ticks 13pt, value labels 14pt SemiBold); no grid, no frame, no y-axis line; a 0.5pt `#5e667d` x baseline with outward ticks; horizontal text only; a top, untitled, start-aligned key; white 1pt separators between stacked segments and heatmap cells; bold value labels inside bars in black or white for contrast; and colour plus dash for multi-line charts.',
    'Approximated: Matter is proprietary and falls back to Work Sans. The guide’s bars are wider than their gaps; `bandFraction: 0.72` states that as a ratio.',
    'Not stated (see the gaps): where inside a bar a value label sits (the guide wants it at the bar’s start), the edge the title block aligns to (the start of the x axis, not the row labels), the orange-on-gray highlight, small multiples instead of colour for groups of people, and the per-axis title rule (x title when units are unclear, never a y title).',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Page 19 anatomy: SemiBold 20pt sentence-case title and 16pt subtitle left-aligned with the start of the x axis; key under the subtitle, square swatches, no title; right-aligned row labels with no y-axis line; bold values left-aligned inside each bar start, black on orange and white on blue; no gridlines or border; a 0.5pt `#5e667d` x baseline with ticks and a centred x-axis title.',
      current: 'Flint draws the grouped bars in the house inks with a top key, no grid and the thin baseline. It anchors the title block at the outer edge of the row labels, prints values inside the value end (white on both inks) and writes the x title as “Days (days)”.',
      expected: 'The anatomy specimen, redrawn with three charges and the two enhancement groups.',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: SENTENCES,
        semantic_types: { Charge: 'Category', Enhancement: 'Category', Days: { semanticType: 'Quantity', unit: 'days' } },
        encodings: { y: 'Charge', x: 'Days', group: 'Enhancement' },
        title: SIG_TITLE,
        subtitle: SIG_DECK,
        baseSize: { width: 520, height: 300 },
      }),
      expectedSpec: signature(),
      observed: 'Flint (left) has the house inks, a top key with square swatches, the thin baseline with ticks and no grid. It differs in four places: the headline starts at the left edge of “Charge X”, not above the bars; the values sit right-aligned at the value end, white on the orange bars too; the x title reads “Days (days)”; and ticks are labelled every 100 rather than at 100/300/500/700 with minor ticks between. Expected (right): headline, deck and key start at the bars’ base; bold values at the bar start, black on orange.',
    },
    {
      id: 'labels-at-bar-start',
      addressed: { stage: 'L4', note: '`dataLabels.anchor: "start"` sets every inside value flush at the bar’s base, so they read as one column; a bar too short for its number still prints it past the end.' },
      title: 'Value labels left-aligned inside the start of the bar',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'value-label-placement',
      rule: '“Data value text should be left-aligned within horizontal bars” — bold (Matter SemiBold 14pt), just inside the bar’s base, in white or black for contrast; outside the bar only when it does not fit (fig. 1–3).',
      current: '`dataLabels.placement` offers `atMark | outsideMark | column`; `atMark` has no anchor along the bar, and Flint right-aligns an inside label against the value end, moving it outside where the bar is short.',
      expected: 'Every number starts at the same x, just right of the axis, so the column of numbers reads as a table.',
      proposal: '`dataLabels.anchor: "base" | "end"` (with `align` following), so `atMark` can name which end of the bar the label sits at.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: 'Country', x: 'Population' },
        title: 'India and China hold over a third of humanity',
        subtitle: 'Population, millions, 2023',
        chartProperties: { showValueLabels: true },
        baseSize: { width: 460, height: 300 },
      }),
      expectedSpec: labelsAtStart(),
      observed: 'Flint right-aligns 1,429, 1,426 and 340 inside the value end and pushes 278…173 outside the bar in black, so the numbers zigzag down the chart. Expected: every value bold and white, flush at the bar start, reading as one column.',
    },
    {
      id: 'label-ink-orange',
      addressed: { stage: 'L4', note: 'White on `#db771a` is 3.15:1, which passes the 3:1 default; the house raises the floor with `dataLabels.minContrast: 4.5`, so the orange bars print black.' },
      title: 'Labels on orange bars are white, where the guide prints black',
      kind: 'realization',
      severity: 'medium',
      probe: 'value-label-placement',
      rule: 'Text on data colours is pure black or white, whichever the guide pairs with the swatch: black on orange `#db771a`, white on dark blue `#2b5e88` (page 19: “Matter SemiBold 14pt #000000” on the orange bars, “#ffffff” on the blue).',
      current: 'Stated as `dataLabels.inkMode: "contrastWithMark"`. Flint prints white on both inks; white on `#db771a` is about 2.9:1, under the 4.5:1 that black reaches (≈7:1).',
      expected: 'The same bars and label positions, black on orange.',
      proposal: 'Pick the label ink by WCAG contrast against the mark (the higher of black and white), or let a house pin it per swatch: `ink.series.onInk: { "#db771a": "#000000" }`.',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: SENTENCES,
        semantic_types: { Charge: 'Category', Enhancement: 'Category', Days: 'Quantity' },
        encodings: { y: 'Charge', x: 'Days', group: 'Enhancement' },
        title: SIG_TITLE,
        subtitle: SIG_DECK,
        baseSize: { width: 560, height: 280 },
      }),
      expectedSpec: labelInk(),
      observed: 'Same layout on both sides; Flint’s 78, 418 and 115 on the orange bars are white and visibly weaker than the black the guide uses. On the dark-blue bars both sides agree (white).',
    },
    {
      id: 'title-on-axis-start',
      addressed: { stage: 'F3', note: '`layout.titleBlock.frame: "plot"` starts the title at the plot’s edge.' },
      title: 'Title, subtitle and key start where the x axis starts',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'title-block-alignment',
      rule: '“Left align titles, subtitles, and legends with the start of the x-axis.” Row labels hang to the left of that edge.',
      current: '`layout.titleBlock.anchor: "start"` says left, but not left of what; Flint aligns the block with the outer edge of the whole chart, so long row labels push the plot right of the headline.',
      expected: 'The headline’s first letter directly above the bars’ common base.',
      proposal: '`layout.titleBlock.edge: "chart" | "plot"` (Vega’s title `frame: bounds | group`), applied to the key as well.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: 'Country', x: 'Population' },
        title: 'India and China hold over a third of humanity',
        subtitle: 'Population, millions, 2023',
        chartProperties: { showValueLabels: false },
        baseSize: { width: 460, height: 300 },
      }),
      expectedSpec: titleOnAxis(),
      observed: 'Flint’s headline and deck start at the outer edge of “United States”, about 110px left of the bars; in the expected panel they start exactly over the bars’ common base. (Flint sets Vega’s title `frame: bounds` on purpose for start-anchored titles.)',
    },
    {
      id: 'highlight-orange',
      title: 'One bar in orange, the rest gray',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'highlight',
      rule: '“Use the same bar color for each group … unless there is particular value in highlighting a specific bar (fig. 2)”: the highlighted bar is orange, the others gray.',
      current: 'Neither the chart spec nor the theme can name the subject; every bar takes `ink.series.single` (dark blue).',
      expected: 'Nigeria in orange `#db771a`, the other bars in gray `#89929a`.',
      proposal: '`chart_spec.emphasis: { field, values }`, with `ink.series.emphasis` / `ink.series.context` in the theme.',
      ...highlightProbe(theme, { ...t, labelSize: 14, titleSize: 22, subtitleSize: 17 }),
      observed: 'Flint: every bar dark blue, with value labels; nothing marks Nigeria. Expected: Nigeria orange, the other seven gray `#89929a`.',
    },
    {
      id: 'dash-order',
      addressed: { stage: 'M3', note: 'The dashes and marker shapes now take the colour scale’s order, so the first series is solid (and keeps the first shape) whatever its name (M3).' },
      title: 'Dashes do not follow the colour order',
      kind: 'visual-quality',
      severity: 'low',
      probe: 'redundant-encoding',
      rule: '“Do not use color alone to distinguish lines on the same chart”: colour plus dash (fig. 2) — the first series solid dark blue, then dashed light blue, then dotted orange; the key shows the same dash.',
      current: 'Stated as `marks.redundantEncoding: "always"` with `redundantChannels: ["dash"]`, and Flint draws it, dashed key included. But the dash scale is assigned independently of the colour order, so the leading series can draw dotted while a later one is solid.',
      expected: 'Solid for the first ink, dashed for the second, dotted for the third.',
      proposal: 'Bind the dash range to the same domain order as the colour range, solid first, so the most prominent series keeps the cleanest stroke.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: evRows,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway pulled away from China and Germany',
        subtitle: 'Share of new cars sold that are electric, %',
        baseSize: { width: 460, height: 260 },
      }),
      expectedSpec: dashedLines(),
      observed: 'Flint gives Norway — dark blue, the leading series — a dotted line, China (orange) a solid one and Germany (light blue) a dashed one; the key swatches carry the dashes. Expected: solid, dashed, dotted in colour order. Flint also adds a rotated “EV share (%)” y title the guide never draws.',
    },
    {
      id: 'horizontal-labels',
      addressed: { stage: 'A1', note: 'Flat at 15px, “United States” broken over two lines (A1) — the theme’s check had measured the whole name, not the lines the layout broke it into.' },
      title: 'Category labels are turned although the house says horizontal',
      kind: 'realization',
      severity: 'high',
      probe: 'turned-row-labels',
      rule: '“All chart text should be horizontal, not angled or rotated.”',
      current: 'Stated as `labels.` with `truncation: "wrap"`. Flint still turns crowded x labels (−45° on the grouped medals, 90° on the stacked bars, decades and heatmap months in the gallery) and truncates “United St…”.',
      expected: 'Every label level, wrapping a long name onto two lines rather than turning it.',
      proposal: 'Treat `labels.` as a constraint in the label plan: wrap, then thin, then truncate — never rotate.',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: MEDAL_ROWS,
        semantic_types: { Country: 'Country', Medal: 'Category', Count: 'Quantity' },
        encodings: { x: 'Country', y: 'Count', group: 'Medal' },
        title: 'The US and China shared the top of the table',
        subtitle: 'Paris 2024 Olympic medals by type',
      }),
      expectedSpec: horizontalLabels(),
      observed: 'Flint turns all five country names −45° and cuts “United States” to “United S…” although two lines would fit; the gallery shows the same on the decades, the stacked-bar countries and the heatmap months (turned 90°). Expected: every label horizontal, “United States” wrapped.',
    },
    {
      id: 'axis-title-per-axis',
      title: 'Never a y-axis title; an x-axis title only when units are unclear',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'axis-title-relocation',
      rule: '“The y-axis should not require a title … Include an x-axis title unless the units are clear without one, such as years.” Columns by year carry bold values above them and bare y labels (fig. 3).',
      current: '`annotation.axisTitles` is one policy for both axes (`omit | whenAmbiguous | always`); with `whenAmbiguous` Flint keeps a rotated y title wherever the value axis is a bare number. `omit` would move it into the deck instead.',
      expected: 'Fig. 3: no title on either axis; the deck names the measure.',
      proposal: 'Split the policy by axis role: `annotation.axisTitles: { categorical: "omit", measure: "whenAmbiguous" }`, with a `never` for houses that forbid a y title outright.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: FILINGS,
        semantic_types: { Year: 'Year', Cases: 'Quantity' },
        encodings: { x: 'Year', y: 'Cases' },
        title: 'Filings peaked in 2019 and have fallen since',
        subtitle: 'Cases filed per year',
        chartProperties: { showValueLabels: true },
        baseSize: { width: 420, height: 260 },
      }),
      expectedSpec: columnsNoTitles(),
      observed: 'Flint keeps a rotated “Cases” y title, thins the years to every other one, and prints no value labels on the columns even with `showValueLabels: true`. Expected: bare y labels, every year, bold values above each column, no titles on either axis.',
    },
    {
      id: 'small-multiples',
      title: 'Groups of people in small multiples, not colour',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'small-multiples',
      rule: '“Small multiples can be used to avoid color-coding groups of people”; panels share units, ranges and dimensions, and do not need to repeat axes.',
      current: 'A theme cannot prefer facets to a colour channel: given a series field, Flint colours it with the categorical palette (and here dashes it). Whether the series are groups of people is not something the theme can test either.',
      expected: 'One panel per group, one dark-blue line each, shared y range.',
      proposal: 'A variant guard on the series field’s semantic role (e.g. `when: { seriesIsPeople: true }`) whose `then` may set `facets.preferFacetOverColor: true` — a chart-spec rewrite the compiler offers rather than imposes.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Every country sold more electric cars in 2023',
        subtitle: 'Share of new cars sold that are electric, %',
        baseSize: { width: 520, height: 260 },
      }),
      expectedSpec: smallMultiples(),
      observed: 'Flint: one plot with four coloured, dashed lines, a key and a y title. Expected: four panels side by side, one dark-blue line each, shared 0–100 scale, group names as panel heads.',
    },
    {
      id: 'three-colours',
      title: 'At most three categorical colours, from approved combinations',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'count-palette',
      rule: '“Avoid using any more than three categorical data colors in a single chart”; gray may be a fourth; only the pairs and triples shown in the guide may be combined.',
      current: 'One ordered list. This theme orders it so the first two and three inks are an approved pair and triple, but a fifth and sixth series still get new hues (teal, purple from the extended set) rather than the chart being refused or split.',
      expected: 'Charts with more than four groups folded or split, not coloured with a fifth hue.',
      proposal: '`ink.series.maxDistinct: 3` with `overflow` (gray) for the fourth, plus a report that suggests small multiples beyond it.',
    },
  ],
};

export default jil;
