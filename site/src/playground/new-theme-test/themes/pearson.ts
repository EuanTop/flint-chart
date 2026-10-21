import type { ThemeSpec } from 'flint-chart';
import research from '../research/pearson.json';
import { BROWSERS, EV_SHARE, flintInput, MEDALS } from '../probes';
import { houseConfig, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Open Sans', Arial, sans-serif";
const PURPLE = '#9e007e';
const TURQUOISE = '#11b0a6';
const GREEN = '#84bd00';
const CORAL = '#ff757a';
const ORANGE = '#ffba1a';
const MIDNIGHT = '#003057';
const GRAPHITE = '#505758';
const GRID = '#c8c8c8';
const BRAND = [PURPLE, TURQUOISE, GREEN, CORAL, ORANGE, '#d2dd0e', '#95e7ea', '#008537', MIDNIGHT];

const t: HouseTokens = {
  font: FONT,
  text: '#000000',
  muted: '#000000',
  grid: GRID,
  gridWidth: 1.5,
  axis: '#000000',
  background: '#ffffff',
  palette: BRAND,
  titleSize: 18,
  titleWeight: 'normal',
  subtitleSize: 15,
  labelSize: 13,
  sourceSize: 13,
  lineWidth: 3,
};

const theme: ThemeSpec = {
  id: 'pearson',
  label: 'Pearson (accessible dataviz)',
  ink: {
    surface: { source: 'house', canvas: '#ffffff' },
    text: { primary: '#000000', secondary: '#000000', muted: GRAPHITE, inverse: '#ffffff' },
    structure: { axis: '#000000', grid: GRID, frame: '#000000', rule: '#000000' },
    series: {
      single: PURPLE,
      categorical: BRAND.slice(0, 5),
      categoricalExtended: BRAND,
      overflow: '#898989',
      sequential: { stops: ['#dceab9', '#bbd87c', '#84bd00', '#6a9510', '#496414'], space: 'lab' },
      diverging: { stops: ['#ff757a', '#e0875c', '#c2993d', '#a3ab1f', '#84bd00'], space: 'lab' },
    },
    accent: PURPLE,
  },
  type: {
    // Title > axis titles > tick labels, one size per level; value, key and note text at the tick size.
    minSize: 13,
    headline: { family: FONT, size: 18, weight: 'regular', case: 'title', color: '#000000' },
    deck: { family: FONT, size: 15, weight: 'regular', color: GRAPHITE },
    axisTitle: { family: FONT, size: 15, weight: 'regular', color: '#000000' },
    axisLabel: { family: FONT, size: 13, weight: 'regular', color: '#000000' },
    keyLabel: { family: FONT, size: 13, color: '#000000' },
    valueLabel: { family: FONT, size: 13, weight: 'regular', color: '#000000' },
    annotation: { family: FONT, size: 13, color: '#000000' },
    footnote: { family: FONT, size: 13, color: GRAPHITE },
  },
  structure: {
    axis: {
      measure: { line: 'full', lineWeight: 2, ticks: 'full', tickDirection: 'outward', tickLength: 'short', labelGap: 14 },
      categorical: { line: 'full', lineWeight: 2, ticks: 'omit' },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'solid', weight: 1.5 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: {
    bandFraction: 0.95,
    strokeWeight: 3,
    strokeCap: 'round',
    strokeJoin: 'round',
    fillOpacity: 1,
    redundantEncoding: 'always',
    redundantChannels: ['shape'],
    slice: { gap: 0 },
  },
  geometry: {
    line: { width: 3, cap: 'round', join: 'round' },
    point: { presence: 'full', size: 110, vertexSize: 110, fill: 'solid' },
    area: { opacity: 0.8, edge: 'full', edgeWidth: 3 },
    band: { fraction: 0.95 },
    // Largest first from 12 o'clock (M4).
    arc: { gap: 0, order: 'largestFirst' },
  },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['seriesEnd', 'right'], direction: 'vertical', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'whenTheyFit', placement: 'outsideMark', inkMode: 'fixed' },
  annotation: { axisTitles: 'always', axisTitlePlacement: 'rotated', axisTitleGap: 8, unitsInAxisTitle: true },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' }, density: 'airy' },
};

// The guide's direct-labelling specimen.
const ENROLLMENT = ([
  ['science', [193, 101, 188]],
  ['math', [46, 232, 110]],
  ['english', [81, 135, 22]],
] as const).flatMap(([Subject, values]) => ['Fall', 'Spring', 'Summer'].map((Semester, i) => ({ Semester, Subject, Students: values[i] })));
const SPECIMEN_INKS = ['#97341c', '#8ba441', '#6072a9'];
const SUBJECTS = ['science', 'math', 'english'];
const SIG_TITLE = 'Student Enrollment per Subject by Semester';

/** The direct-labelling line chart: 3px lines, a different filled symbol per series, names at the line ends, both axis lines. */
function signature() {
  const last = ENROLLMENT.filter((row) => row.Semester === 'Summer');
  const scale = { domain: SUBJECTS, range: SPECIMEN_INKS };
  const shape = { field: 'Subject', type: 'nominal', scale: { domain: SUBJECTS, range: ['circle', 'square', 'triangle-up'] }, legend: null };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), legend: { disable: true }, axis: { ...(houseConfig(t).axis as object), labelColor: '#000', titleColor: '#000', titleFontSize: 15, labelFontSize: 13, domainWidth: 2, domainColor: '#000' } },
    title: { text: SIG_TITLE },
    width: 380,
    height: 300,
    data: { values: ENROLLMENT },
    encoding: {
      x: { field: 'Semester', type: 'ordinal', sort: ['Fall', 'Spring', 'Summer'], scale: { paddingOuter: 0.35 }, axis: { title: null, labelAngle: 0, domain: true, ticks: false, labelPadding: 10 } },
      y: { field: 'Students', type: 'quantitative', scale: { domain: [0, 250] }, axis: { title: 'Student Enrollment', values: [0, 50, 100, 150, 200, 250], domain: true, ticks: true, tickSize: 6, tickColor: '#000', grid: true, gridColor: GRID, gridWidth: 1.5, titlePadding: 8 } },
      color: { field: 'Subject', type: 'nominal', scale, legend: null },
    },
    layer: [
      { mark: { type: 'line', strokeWidth: 3, strokeCap: 'round' } },
      { mark: { type: 'point', filled: true, size: 150, opacity: 1 }, encoding: { shape } },
      {
        data: { values: last },
        mark: { type: 'text', align: 'left', dx: 14, fontSize: 13, color: '#000', font: FONT },
        encoding: { text: { field: 'Subject' }, color: { value: '#000' } },
      },
    ],
  };
}

/** The donut as the guide orders and labels it: ≤5 slices, largest first clockwise from 12, names outside, values inside, no separators. */
function donut() {
  const rows = BROWSERS.slice().sort((a, b) => b.Share - a.Share);
  const order = rows.map((row) => row.Browser);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), legend: { disable: true }, title: { ...(houseConfig(t).title as object), anchor: 'middle', frame: 'group' } },
    title: 'Desktop Browser Market Share, 2024',
    width: 340,
    height: 300,
    data: { values: rows },
    encoding: {
      theta: { field: 'Share', type: 'quantitative', stack: true },
      order: { field: 'Share', type: 'quantitative', sort: 'descending' },
      color: { field: 'Browser', type: 'nominal', sort: order, scale: { domain: order, range: BRAND } },
    },
    layer: [
      { mark: { type: 'arc', outerRadius: 110, innerRadius: 59, stroke: null } },
      {
        mark: { type: 'text', radius: 138, fontSize: 13, font: FONT },
        encoding: { text: { field: 'Browser' }, color: { value: '#000000' } },
      },
      {
        mark: { type: 'text', radius: 85, fontSize: 13, font: FONT },
        encoding: {
          text: { field: 'pct' },
          color: { condition: { test: `datum.Browser === '${order[0]}'`, value: '#ffffff' }, value: '#000000' },
        },
        transform: [{ calculate: "datum.Share + '%'", as: 'pct' }],
      },
    ],
  };
}

/** A key that is never the only way in: 44px swatches, direct labels on the bars as well. */
function bigKey(swatch = 1936) {
  const rows = MEDALS.filter((row) => ['United States', 'China', 'Japan', 'Australia'].includes(row.Country));
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...houseConfig(t),
      legend: { orient: 'right', direction: 'vertical', title: null, symbolType: 'square', symbolSize: swatch, symbolStrokeWidth: 0, labelFontSize: 13, labelFont: FONT, labelColor: '#000', rowPadding: swatch > 500 ? 10 : 4, labelOffset: swatch > 500 ? 10 : 5 },
    },
    title: 'Paris 2024 Medals by Type',
    width: 340,
    height: 240,
    data: { values: rows },
    encoding: {
      x: { field: 'Country', type: 'nominal', sort: null, axis: { title: null, labelAngle: 0, domain: true, domainWidth: 2, domainColor: '#000' }, scale: { paddingInner: 0.18 } },
      xOffset: { field: 'Medal', sort: ['Gold', 'Silver', 'Bronze'], scale: { paddingInner: 0.05 } },
      y: { field: 'Count', type: 'quantitative', axis: { title: 'Medals', titleFontSize: 15, domain: true, domainWidth: 2, domainColor: '#000', ticks: true, tickColor: '#000', grid: true, gridColor: GRID } },
      color: { field: 'Medal', type: 'nominal', sort: ['Gold', 'Silver', 'Bronze'], scale: { range: [PURPLE, TURQUOISE, GREEN] } },
    },
    mark: { type: 'bar' },
  };
}

/** Four lines in Pearson inks that avoid the red/green pair, each with its own symbol and named at its end. */
function safeLines() {
  const countries = ['Norway', 'China', 'Germany', 'United States'];
  const inks = [PURPLE, TURQUOISE, ORANGE, MIDNIGHT];
  const color = { field: 'Country', type: 'nominal', scale: { domain: countries, range: inks }, legend: null };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), legend: { disable: true }, axis: { ...(houseConfig(t).axis as object), labelColor: '#000', titleColor: '#000', titleFontSize: 15, labelFontSize: 13, domainWidth: 2, domainColor: '#000' } },
    title: { text: 'Norway Leads Electric-Car Sales', subtitle: 'Share of new cars sold that are electric, %' },
    width: 340,
    height: 240,
    data: { values: EV_SHARE },
    encoding: {
      x: { field: 'Year', type: 'quantitative', scale: { domain: [2018, 2023] }, axis: { title: null, format: 'd', values: [2018, 2020, 2022, 2023], domain: true, ticks: false } },
      y: { field: 'EV share (%)', type: 'quantitative', axis: { title: 'EV Share (%)', domain: true, ticks: true, tickColor: '#000', grid: true, gridColor: GRID, tickCount: 5 } },
      color,
    },
    layer: [
      { mark: { type: 'line', strokeWidth: 3, strokeCap: 'round' } },
      { mark: { type: 'point', filled: true, size: 90, opacity: 1 }, encoding: { shape: { field: 'Country', type: 'nominal', scale: { domain: countries, range: ['circle', 'square', 'triangle-up', 'diamond'] }, legend: null } } },
      { transform: [{ filter: 'datum.Year === 2023' }], mark: { type: 'text', align: 'left', dx: 10, fontSize: 13, font: FONT, color: '#000' }, encoding: { text: { field: 'Country' }, color: { value: '#000' } } },
    ],
  };
}

const pearson: StyleGuideTheme = {
  id: 'pearson',
  org: 'Pearson',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch (no `extends`) from the Accessible Data Visualization Style Guide v0.3.0 (Pearson accessibility with Fizz Studio; the GitHub source, since the live page refused connections). Stated directly: Open Sans with an Arial fallback; a strict three-level hierarchy (18px title, 15px axis titles, 13px ticks, with values, keys and notes at the tick size) and a 13px floor; regular weights only; black text; both axis lines always drawn in black, y ticks; optional light-grey horizontal gridlines; 3px round-capped lines with a filled symbol at every point and a different shape per series (`redundantEncoding: "always"`, `redundantChannels: ["shape"]`); series named at the line ends rather than in a key; wide bars with narrow gaps (`bandFraction: 0.95`, the anatomy’s 3px padding); donut wedges with no separators; value labels outside, close to the mark; the Pearson brand palette as the categorical set.',
    'Approximated: the brand palette is ordered as the guide’s donut uses it (Royal Purple, Marine Turquoise, Fresh Green, Coral Pink, Bright Orange); the guide’s own example line chart uses muted rust, olive and slate instead, which the signature’s expected panel keeps. The 3px/6px bar spacing is stated as a fraction.',
    'Not stated (see the gaps): the donut rules (at most five slices, largest first, names outside and values inside), the 44px minimum key swatch, “no red with green” as a palette constraint, keyboard focus on every data point, and the alt text the guide requires.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'The direct-labelling specimen: 18px regular title top-left; solid black x and y axis lines with y ticks; light-grey horizontal gridlines; rotated 15px y-axis title; 3px lines, each with its own filled symbol (circle, square, triangle) at every point; the series names in black beside the last points; no key.',
      current: 'Flint draws the lines in the brand inks with the house axis lines, ticks, gridlines and type sizes.',
      expected: 'The specimen redrawn (in its own muted rust, olive and slate).',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: ENROLLMENT,
        semantic_types: { Semester: 'Category', Subject: 'Category', Students: 'Quantity' },
        encodings: { x: { field: 'Semester', sort: ['Fall', 'Spring', 'Summer'] }, y: 'Students', color: 'Subject' },
        title: SIG_TITLE,
        baseSize: { width: 380, height: 300 },
      }),
      expectedSpec: signature(),
      observed: 'Close: both have black x and y axis lines, y ticks, grey horizontal gridlines, 3px lines with a different symbol per series and names at the line ends instead of a key. Flint differs in the inks (the brand purple/turquoise/green rather than the specimen’s muted rust/olive/slate), prints each name in its series colour rather than black, sets the symbols small (about 6px against the specimen’s 12px), adds an x-axis title “Semester”, truncates “Summ…” at this width, and takes the y title from the field (“Students”).',
    },
    {
      id: 'bar-outline',
      addressed: { stage: 'M1', note: 'The area edge is no longer folded into a chart-wide outline, so bars, wedges and dots are drawn without it (M1).' },
      title: 'An area’s edge turns into a black outline on every bar',
      kind: 'realization',
      severity: 'high',
      probe: 'bar-shape',
      rule: '“Use solid colors for fill”: bars are solid single-colour fills, wide, 3px apart (the anatomy specimen); separately, areas carry a 3px stroke in their own colour (the example CSS: fill opacity 0.8, stroke-width 3).',
      current: 'The theme states the area rule as `geometry.area: { edge: "full", edgeWidth: 3 }` and says nothing about bar outlines. Grounding folds `area.edge`/`edgeWidth` into the global `marks.outline`, so grouped and stacked bars and scatter dots get a 3px outline in the structure ink — black.',
      expected: 'Solid brand-colour bars with no outline.',
      proposal: 'Keep `geometry.area.edge` on the area’s top line only; `marks.outline` should come from `geometry.band.outline` / `marks.outline`, never from another geometry.',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: MEDALS.filter((row) => ['United States', 'China', 'Japan', 'Australia'].includes(row.Country)),
        semantic_types: { Country: 'Country', Medal: 'Category', Count: 'Quantity' },
        encodings: { x: 'Country', y: 'Count', group: 'Medal' },
        title: 'Paris 2024 Medals by Type',
      }),
      expectedSpec: bigKey(160),
      observed: 'Flint outlines every bar in a 3px black stroke, which reads as a cartoon sticker style the guide never shows (the same black ring appears on the gallery’s stacked bars and scatter dots). Expected: the same bars as solid fills with no stroke.',
    },
    {
      id: 'donut-rules',
      addressed: { stage: 'M4', note: '`geometry.arc.order: "largestFirst"` runs the wedges largest first from 12 o’clock. The slice cap and the name-outside/value-inside label stay open.' },
      title: 'Donuts: largest first from 12 o’clock, names outside, values inside',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'pie-rules',
      rule: '“A donut chart should be used instead of a pie chart … no more than 5 slices … sorted from largest to smallest”; category labels outside the slice, value (and percentage) inside; the example starts at 12 o’clock, runs clockwise, inner radius about 54% of the outer, no separators.',
      current: 'ThemeSpec has `marks.slice` / `geometry.arc` for the gap only; it cannot state a slice cap, a sort, or a two-part label (name outside, value inside). Flint draws the case as the chart spec asks.',
      expected: 'Five slices, Chrome first from 12 o’clock, browser names outside, percentages inside.',
      proposal: '`geometry.arc.innerRadius`, `chartDefaults["Donut Chart"].sortSlices` (already a template control) and a `dataLabels.partToWhole: { name: "outside", value: "inside" }` placement; `maxSlices` with an “Other” fold in the chart spec.',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: BROWSERS,
        semantic_types: { Browser: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Browser' },
        title: 'Desktop Browser Market Share, 2024',
      }),
      expectedSpec: donut(),
      observed: 'Flint already sorts largest first from 12 o’clock and draws no separators, but puts the percentages outside the ring with a key on the right. Expected: names outside each wedge, percentages inside, no key.',
    },
    {
      id: 'big-key',
      title: 'Key swatches at least 44px, and never instead of labels',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'legend-swatch',
      rule: 'Key items must be “big enough to be legible (… 44px square minimum or 10mm square minimum for colours, patterns and symbols)”; “keys are not an alternative, they should be used as an additional tool”.',
      current: '`legend.swatch` only accepts `auto`; Flint sizes swatches from the key-label font, a few px square.',
      expected: 'A key of 44px squares beside the grouped bars.',
      proposal: '`legend.swatchSize: number` (px edge), honoured by layout when it reserves the key’s width.',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: MEDALS.filter((row) => ['United States', 'China', 'Japan', 'Australia'].includes(row.Country)),
        semantic_types: { Country: 'Country', Medal: 'Category', Count: 'Quantity' },
        encodings: { x: 'Country', y: 'Count', group: 'Medal' },
        title: 'Paris 2024 Medals by Type',
      }),
      expectedSpec: bigKey(),
      observed: 'Flint’s key swatches are about 10px squares (and carry the stray black outline). Expected: 44px squares, labels beside them, the bars still directly readable.',
    },
    {
      id: 'no-red-green',
      title: 'Red and green never in the same chart',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'count-palette',
      rule: '“Do not use red and green in the same document/chart or data visualisation if at all possible”; also avoid red/blue, pink/green, black/red, green/purple.',
      current: 'The brand order puts Fresh Green third and Coral Pink fourth, so every chart with four series pairs them; ThemeSpec cannot name pairs to keep apart.',
      expected: 'Four series without the green/coral pair: purple, turquoise, orange, midnight blue.',
      proposal: '`ink.series.avoidPairs` checked at grounding — skip an ink that would form a listed pair with one already used, and report it.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway Leads Electric-Car Sales',
        subtitle: 'Share of new cars sold that are electric, %',
      }),
      expectedSpec: safeLines(),
      observed: 'Flint gives the third and fourth countries Fresh Green and Coral Pink — exactly the red/green pairing the guide forbids — although each line carries its own symbol. Expected: purple, turquoise, orange and midnight blue, with symbols and end labels kept.',
    },
    {
      id: 'heatmap-row-labels',
      addressed: { stage: 'A1', note: 'The row names are never turned for the column names (A1), and the months sit flat.' },
      title: 'Heatmap row names are turned diagonally',
      kind: 'realization',
      severity: 'medium',
      probe: 'turned-row-labels',
      rule: 'Text stays horizontal and is never shrunk or tilted to fit — abbreviate instead; tick labels share one size.',
      current: 'In the gallery’s heatmap the city names on the y axis are drawn at −45°, as if they were crowded x labels, although horizontal names fit beside their rows.',
      expected: 'City names horizontal, right-aligned beside their rows.',
      proposal: 'Never turn y-axis band labels; wrap or abbreviate them instead.',
    },
    {
      id: 'focus-every-point',
      title: 'Every data point keyboard-focusable, with a visible focus state',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'focus-hover-state',
      rule: 'The guide’s SVG examples give each slice and bar group `tabindex=0` and a `<title>`; screen-reader users need each value in visual order plus a summary; state changes must not rely on colour alone.',
      current: 'Flint’s interaction presets include `accessible-navigation`, but the theme cannot ask for it or style the focus ring; a static render has no focus order.',
      expected: 'Tab moves through the marks in reading order, a dark outline marks the focused one, and its value is announced.',
      proposal: 'Let a theme default interaction presets (`interaction.defaults: ["accessible-navigation"]`) and state the focus ring (`interaction.focus: { color, width, offset }`).',
    },
    {
      id: 'alt-text',
      title: 'Alt text and a long description for every chart',
      kind: 'chart-spec',
      severity: 'low',
      probe: 'alt-text',
      rule: 'Always provide alt text naming the chart type, what the data is and its meaning or trend; complex charts also need a long description and ideally a data table or CSV.',
      current: 'The chart spec has `title` and `subtitle`; there is no slot for the trend sentence, so Flint can only describe the chart from its encodings.',
      expected: 'An SVG `<title>`/`<desc>` (Vega `description`) carrying the author’s alt text and long description.',
      proposal: '`chart_spec.description: { short, long }`, emitted as the Vega `description` and an ARIA label.',
    },
  ],
};

export default pearson;
