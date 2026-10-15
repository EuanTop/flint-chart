import type { ThemeSpec } from 'flint-chart';
import research from '../research/microsoft.json';
import { EV_SHARE, flintInput, tooltipProbe } from '../probes';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

/** Segoe UI is proprietary; Open Sans (loaded on the page) stands in for it off Windows. */
const FONT = "'Segoe UI', 'Open Sans', 'Helvetica Neue', Arial, sans-serif";
const NEUTRAL_PRIMARY = '#323130';
const NEUTRAL_SECONDARY = '#605E5C';
const NEUTRAL_TERTIARY = '#A19F9D';
const GRID = '#EDEBE9';
/** Fluent UI react-charting DataVizPalette, qualitative 1–10. */
const FLUENT = ['#637CEF', '#E3008C', '#2AA0A4', '#9373C0', '#13A10E', '#3A96DD', '#CA5010', '#57811B', '#B146C2', '#AE8C00'];
/** The Office colours the guide's own specimens are drawn in. */
const OFFICE_BLUE = '#0078D4';
const OFFICE_ORANGE = '#D83B01';
const OFFICE_GREY = '#8A8886';

const t: HouseTokens = {
  font: FONT,
  text: NEUTRAL_PRIMARY,
  muted: NEUTRAL_SECONDARY,
  grid: GRID,
  axis: NEUTRAL_SECONDARY,
  background: '#FFFFFF',
  palette: FLUENT,
  highlight: OFFICE_BLUE,
  context: NEUTRAL_TERTIARY,
  titleSize: 20,
  titleWeight: 'normal',
  subtitleSize: 11,
  subtitleColor: NEUTRAL_PRIMARY,
  labelSize: 12,
  lineWidth: 1.5,
  legendOrient: 'top-left',
};

const theme: ThemeSpec = {
  id: 'microsoft',
  label: 'Microsoft Office add-ins (Fluent)',
  ink: {
    // “Choose colors that follow operating system or application themes rather than hardcoded colors.”
    surface: { source: 'host', canvas: '#FFFFFF' },
    text: { primary: NEUTRAL_PRIMARY, secondary: NEUTRAL_SECONDARY, muted: NEUTRAL_TERTIARY, inverse: '#FFFFFF' },
    structure: { axis: NEUTRAL_SECONDARY, grid: GRID, zero: NEUTRAL_SECONDARY, rule: '#E1DFDD' },
    series: {
      single: FLUENT[0],
      categorical: FLUENT.slice(0, 7),
      categoricalExtended: FLUENT,
      overflow: NEUTRAL_TERTIARY,
      status: { positive: '#107C10', negative: '#C50F1F', neutral: NEUTRAL_TERTIARY },
    },
    accent: OFFICE_BLUE,
  },
  type: {
    headline: { family: FONT, size: 20, weight: 'semibold', case: 'asIs', color: NEUTRAL_PRIMARY },
    deck: { family: FONT, size: 11, weight: 'regular', case: 'upper', color: NEUTRAL_PRIMARY },
    axisLabel: { family: FONT, size: 12, color: NEUTRAL_SECONDARY },
    axisTitle: { family: FONT, size: 12, color: NEUTRAL_SECONDARY },
    keyLabel: { family: FONT, size: 12, color: NEUTRAL_PRIMARY },
    valueLabel: { family: FONT, size: 12, color: NEUTRAL_PRIMARY },
    annotation: { family: FONT, size: 12, color: NEUTRAL_PRIMARY },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1, ticks: 'quiet', tickLength: 'short', tickDirection: 'outward' },
      measure: { line: 'omit', ticks: 'omit' },
    },
    // “Product review”: a faint fine grid behind the labelled lines (GR2).
    grid: { measure: 'full', category: 'omit', style: 'solid', weight: 1, zero: 'full', minor: { divisions: 2 } },
    frame: 'omit',
    baseline: 'full',
  },
  marks: { strokeWeight: 1.5, interpolation: 'linear', cornerRadius: 0, outline: { presence: 'omit' }, point: { presence: 'omit' } },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['top', 'inside'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'omit', unit: 'lastTick', numberFormat: { thousands: 'separator', precision: 'auto' } },
  layout: { titleBlock: { anchor: 'start', gap: 'normal', deckGap: 'tight' } },
};

/* ------------------------------------------------------------------ data */

const MONTHS = ['2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01', '2024-05-01'];
const CHANGE: Record<string, number[]> = {
  Price: [0, -8, -2, 14, 20],
  Quality: [0, 21, -10, 0, -20],
  Popularity: [0, -22, -17, -14, -22],
};
const REVIEW = Object.entries(CHANGE).flatMap(([Measure, values]) => values.map((v, i) => ({ Month: MONTHS[i], Measure, 'Change (%)': v })));
const REVIEW_COLORS = [OFFICE_GREY, OFFICE_ORANGE, OFFICE_BLUE];

/* ------------------------------------------------------------- expected */

/** The guide's “Product review” specimen: direct labels with signed values, % on the top tick, dark zero line. */
function reviewExpected() {
  const last = REVIEW.filter((row) => row.Month === MONTHS[MONTHS.length - 1]);
  const names = Object.keys(CHANGE);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...houseConfig({ ...t, titleSize: 24, titleWeight: 700, text: '#000000', subtitleSize: 13, subtitleColor: '#000000' }),
      axis: { ...(houseConfig(t).axis as object), labelColor: NEUTRAL_PRIMARY, gridColor: '#E1DFDD' },
    },
    title: { text: 'Product review', subtitle: '% change in product price, quality and popularity since January' },
    width: W - 70,
    height: H + 20,
    layer: [
      {
        data: { values: REVIEW },
        mark: { type: 'line', strokeWidth: 1.5 },
        encoding: {
          x: {
            field: 'Month', type: 'temporal', title: null, scale: { nice: false },
            axis: { format: '%B', labelOverlap: false, tickCount: 5, values: MONTHS.map((m) => new Date(`${m}T00:00:00`).getTime()), grid: true, gridColor: '#EDEBE9', ticks: true, tickSize: 4, tickColor: NEUTRAL_SECONDARY, domain: false, labelAngle: 0 },
          },
          y: {
            field: 'Change (%)', type: 'quantitative', title: null, scale: { domain: [-30, 50] },
            axis: { values: [-30, -20, -10, 0, 10, 20, 30, 40, 50], tickCount: 9, labelOverlap: false, labelExpr: "datum.value === 50 ? datum.label + '%' : datum.label", ticks: true, tickSize: 4, tickColor: NEUTRAL_SECONDARY, domain: true, domainColor: NEUTRAL_SECONDARY },
          },
          color: { field: 'Measure', type: 'nominal', scale: { domain: names, range: REVIEW_COLORS }, legend: null },
        },
      },
      {
        data: { values: [{ v: 0 }] },
        mark: { type: 'rule', color: NEUTRAL_SECONDARY, strokeWidth: 1.5 },
        encoding: { y: { field: 'v', type: 'quantitative' } },
      },
      {
        data: { values: last.map((row) => ({ ...row, ly: row['Change (%)'] + (row.Measure === 'Popularity' ? -2.5 : row.Measure === 'Quality' ? 2.5 : 0) })) },
        mark: { type: 'text', align: 'left', dx: 6, fontSize: 12 },
        encoding: {
          x: { field: 'Month', type: 'temporal' },
          y: { field: 'ly', type: 'quantitative' },
          text: { field: 'Measure' },
          color: { field: 'Measure', type: 'nominal', scale: { domain: names, range: REVIEW_COLORS }, legend: null },
        },
      },
      {
        data: { values: last.map((row) => ({ ...row, ly: row['Change (%)'] + (row.Measure === 'Popularity' ? -2.5 : row.Measure === 'Quality' ? 2.5 : 0), label: `${row['Change (%)'] > 0 ? '+' : ''}${row['Change (%)']}%` })) },
        mark: { type: 'text', align: 'right', dx: 118, fontSize: 12 },
        encoding: {
          x: { field: 'Month', type: 'temporal' },
          y: { field: 'ly', type: 'quantitative' },
          text: { field: 'label' },
          color: { field: 'Measure', type: 'nominal', scale: { domain: names, range: REVIEW_COLORS }, legend: null },
        },
      },
    ],
  };
}

/** The “Current Users” anatomy: one series drawn thick in the accent, the rest thin, key flush left above. */
function highlightExpected() {
  const names = ['Norway', 'China', 'Germany', 'United States'];
  const point = EV_SHARE.find((row) => row.Country === 'Norway' && row.Year === 2020)!;
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...houseConfig(t),
      legend: { orient: 'top', direction: 'horizontal', title: null, symbolType: 'stroke', symbolStrokeWidth: 2, symbolSize: 160, labelFont: FONT, labelFontSize: 12, labelColor: NEUTRAL_PRIMARY, columnPadding: 18, offset: 22 },
      axisX: { domain: true, domainColor: NEUTRAL_SECONDARY, ticks: true, tickSize: 4, tickColor: NEUTRAL_SECONDARY, grid: false },
      axisY: { grid: false, domain: false },
    },
    title: { text: 'Electric-car share of sales', subtitle: 'NEW CARS SOLD THAT ARE ELECTRIC, 2018 - 2023' },
    width: W,
    height: H,
    layer: [
      {
        data: { values: EV_SHARE },
        mark: { type: 'line' },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2018, 2023], nice: false, zero: false }, axis: { format: 'd', values: [2018, 2019, 2020, 2021, 2022, 2023] } },
          y: { field: 'EV share (%)', type: 'quantitative', title: null, axis: { values: [0, 20, 40, 60, 80, 100] } },
          color: { field: 'Country', type: 'nominal', sort: names, scale: { domain: names, range: [OFFICE_BLUE, '#FFB900', '#2B2457', OFFICE_ORANGE] } },
          strokeWidth: { condition: { test: "datum.Country === 'Norway'", value: 3.5 }, value: 1.2 },
        },
      },
      {
        data: { values: [point] },
        mark: { type: 'point', filled: true, fill: '#FFFFFF', stroke: OFFICE_BLUE, strokeWidth: 2, size: 40 },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'EV share (%)', type: 'quantitative' } },
      },
      {
        data: { values: [point] },
        mark: { type: 'rect', fill: '#FFFFFF', stroke: OFFICE_BLUE, strokeWidth: 1, xOffset: 8, x2Offset: 70, yOffset: 6, y2Offset: 40 },
        encoding: { x: { field: 'Year', type: 'quantitative' }, x2: { field: 'Year' }, y: { field: 'EV share (%)', type: 'quantitative' }, y2: { field: 'EV share (%)' } },
      },
      {
        data: { values: [point] },
        mark: { type: 'text', align: 'left', baseline: 'top', dx: 13, dy: 10, fontSize: 11, lineHeight: 14, color: NEUTRAL_PRIMARY, text: ['Norway', '75%'] },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'EV share (%)', type: 'quantitative' } },
      },
    ],
  };
}

/** Office dark theme: the same chart in the app's dark neutrals and Fluent's dark data colours. */
function evExpected(dark: boolean) {
  const names = ['Norway', 'China', 'Germany', 'United States'];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...houseConfig({ ...t, background: dark ? '#292827' : '#FFFFFF', text: dark ? '#FFFFFF' : NEUTRAL_PRIMARY, muted: dark ? '#C8C6C4' : NEUTRAL_SECONDARY, subtitleColor: dark ? '#C8C6C4' : NEUTRAL_PRIMARY, grid: dark ? '#3B3A39' : GRID, axis: dark ? '#C8C6C4' : NEUTRAL_SECONDARY, titleWeight: 600 }),
      legend: { orient: 'top', direction: 'horizontal', title: null, symbolType: 'stroke', symbolStrokeWidth: 2, labelFont: FONT, labelFontSize: 12, labelColor: dark ? '#FFFFFF' : NEUTRAL_PRIMARY },
      axisX: { domain: true, domainColor: dark ? '#C8C6C4' : NEUTRAL_SECONDARY, ticks: true, tickSize: 4, tickColor: dark ? '#C8C6C4' : NEUTRAL_SECONDARY, grid: false },
    },
    title: { text: 'Electric-car share of sales', subtitle: 'NEW CARS SOLD THAT ARE ELECTRIC, 2018 - 2023' },
    width: W,
    height: H,
    data: { values: EV_SHARE },
    mark: { type: 'line', strokeWidth: 1.5 },
    encoding: {
      x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2018, 2023], nice: false, zero: false }, axis: { format: 'd', values: [2018, 2019, 2020, 2021, 2022, 2023] } },
      y: { field: 'EV share (%)', type: 'quantitative', title: null, axis: { values: [0, 20, 40, 60, 80, 100], labelExpr: "datum.value === 100 ? datum.label + '%' : datum.label" } },
      color: { field: 'Country', type: 'nominal', sort: names, scale: { domain: names, range: dark ? ['#7C93F3', '#FF5CB8', '#4BC2C5', '#B49FD8'] : FLUENT.slice(0, 4) } },
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

const evFlint = flintInput(theme, {
  chartType: 'Line Chart',
  data: EV_SHARE,
  semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
  encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
  title: 'Electric-car share of sales',
  subtitle: 'New cars sold that are electric, 2018 - 2023',
});

const microsoft: StyleGuideTheme = {
  id: 'microsoft',
  org: 'Microsoft – Office Add-ins data visualization style guidelines',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch. The guide is principles, not values: it defers to the Fluent UI type ramp and neutral palette, so the inks come from Fluent’s `DefaultPalette` (neutralPrimary `#323130`, neutralSecondary `#605E5C`, neutralTertiary `#A19F9D`, neutralLight `#EDEBE9`) and the series order from Fluent react-charting’s DataViz palette (cornflower, hot pink, teal, orchid, green, light blue, pumpkin …). Stated directly: sentence-case 20px headline, an all-caps deck (`deck.case: upper`), light-grey tick labels and gridlines, a thin dark x baseline with small outward ticks, no y-axis line, an emphasised dark zero line (`grid.zero: full`), the unit on the top tick only (`unit: lastTick`), thousands separators, a flush-left key above the plot, and no shadows, outlines or rounding.',
    'Approximated: the two specimens disagree on the title (regular in “Current Users”, bold in “Product review”), so the theme takes Fluent’s semibold. The guide asks colours to follow the app theme, so the surface is `source: host`; every other ink is still a hard-coded light-theme hex. Segoe UI is proprietary and falls back to Open Sans off Windows.',
    'Not statable: the highlighted series drawn thicker, direct end labels carrying a signed value, the tooltip callout that flips at the edge, the fine minor grid, inks that follow the app’s dark theme, the key’s scrollable overflow, and the staged motion rules — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      observed: "Flint (left): Fluent palette (cornflower, pink, teal) instead of the specimen’s grey/orange/blue, a key above the plot, “; Change (%)” appended to the deck, first x label printed as “2024” instead of “January”. The dark zero line, light grid and “%” on the top tick only are right. Expected (right): end labels with signed values, no key, vertical grid.",
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: '“Product review”: bold title top-left and a plain subtitle naming the measure; light grid both ways; y values left with “%” on the top label only; an emphasised dark zero line; three straight thin lines, each labelled at its right end in its own colour with a signed value (+20%, −20%, −22%); months on x with small ticks; no key.',
      current: 'Flint draws the light horizontal grid, the dark zero line and “%” on the top tick only (`unit: lastTick`). It puts a key above the plot where the specimen labels each line’s end, has no way to carry a signed value beside an end label, draws no vertical grid, and appends “; Change (%)” to a deck that already names the measure.',
      expected: 'The Product review specimen, in its Office colours.',
      proposal: '`legend.placement: "seriesEnd"` with `legend.endValue: "last" | "change"` and `annotation.numberFormat.signed`; a way for the author to mark the deck as already naming the measure.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: REVIEW,
        semantic_types: { Month: 'Date', Measure: 'Category', 'Change (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Month', y: 'Change (%)', color: 'Measure' },
        title: 'Product review',
        subtitle: '% change in product price, quality and popularity since January',
      }),
      expectedSpec: reviewExpected(),
    },
    {
      id: 'highlight-thicker',
      observed: "Flint draws four equal 1.5px lines; Norway is cornflower like the rest. Expected: Norway thick in Office blue, others thin, with a bordered “Norway 75%” callout.",
      title: 'The series that matters is drawn thicker, in the accent',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'highlight',
      rule: '“Current Users” anatomy: “Label Four” in Office blue at ~3px, the other four series at ~1px; a white callout with a thin blue border points at one reading (“New 3,254”).',
      current: 'Neither the chart spec nor the theme can name one series as the subject, so every line gets `marks.strokeWeight` and its palette ink; there is no annotation slot for the callout.',
      expected: 'Norway in blue at 3.5px, the rest thin; a bordered callout on Norway’s 2020 reading.',
      proposal: '`chart_spec.emphasis: { field, values }` and `ink.series.emphasis`, with `marks.emphasis: { strokeWeight, contextWeight }` so emphasis can be weight, not only colour; `chart_spec.annotations[]` for the callout.',
      flint: evFlint,
      expectedSpec: highlightExpected(),
    },
    {
      id: 'callout-tooltip',
      observed: "Flint draws the plain line; no callout. Expected: the white box with a 1px blue border right of the 2020 point.",
      title: 'Tooltips surface right of the point and flip at the edge',
      kind: 'product-ui',
      severity: 'low',
      probe: 'tooltip-style',
      rule: '“A tooltip might surface to the right of a data point by default, but surface to the left if right edges are detected”; specimen: white box, thin blue border, dark text.',
      current: 'ThemeSpec’s `interaction` has a `tooltipFormat` only; position, border and edge behaviour are the host tooltip handler’s.',
      expected: 'A white callout with a 1px blue border right of the 2020 peak.',
      proposal: '`interaction.tooltip: { fill, border, radius, placement: "right", flip: true }`.',
      ...widenTooltip(tooltipProbe(theme, t, { fill: '#FFFFFF', text: NEUTRAL_PRIMARY, border: OFFICE_BLUE, radius: 0 })),
    },
    {
      id: 'follow-app-theme',
      observed: "Flint’s panel is the light chart (and would be the same under a dark host, apart from the canvas). Expected shows the dark Office theme with lighter data inks.",
      title: 'Colours follow the app theme, dark included',
      kind: 'product-ui',
      severity: 'high',
      probe: 'dark-mode',
      rule: '“Choose colors that follow operating system or application themes rather than hardcoded colors”; gridlines may be heavier in high-contrast mode.',
      current: '`ink.surface.source: "host"` lets the canvas follow the host, but every other ink is a fixed hex chosen for a light surface: on a dark Office theme the `#323130` text and `#EDEBE9` grid would vanish. `variants` cannot vary `ink`.',
      expected: 'The same chart in Office’s dark theme: dark canvas, white text, darker grid, Fluent’s dark-theme data colours.',
      proposal: 'Let inks name host tokens (`ink.text.primary: "host:neutralPrimary"`) or carry `ink.modes: { dark, highContrast }` chosen by the host.',
      flint: evFlint,
      expectedSpec: evExpected(true),
    },
    {
      id: 'labels-turned',
      addressed: { stage: 'A1', note: 'No gallery tile turns its labels now (A1).' },
      title: 'Labels turned although the theme keeps them horizontal',
      kind: 'realization',
      severity: 'medium',
      probe: 'label-angle',
      rule: 'Task-pane charts read left to right: the specimens’ month and year labels are all horizontal, with “adequate white space … algorithms to avoid occlusion/collision”.',
      current: 'The theme states `labels.`. In the gallery Flint still turns the decade labels, the five country names under the stacked bars and the twelve three-letter months of the heatmap to −45°.',
      expected: 'Horizontal labels, thinned or wrapped when they do not fit.',
      proposal: 'Treat `labels.` as a constraint in the label plan (wrap, then thin, then report).',
      observed: 'Gallery tiles “Global temperature anomaly”, “Electricity generation mix by country” and “Average monthly temperature by city” all show −45° labels; “Jan … Dec” would fit flat in their columns.',
    },
    {
      id: 'minor-grid',
      addressed: { stage: 'GR2', note: '`grid.minor: { divisions: 2 }` — a faint fine line between the labelled ones (GR2).' },
      title: 'A fine minor grid between the major lines',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'gridline-style',
      rule: '“Product review” shows a faint fine grid in both directions behind the labelled gridlines; “Light grays are most effective for gridlines.”',
      current: '`structure.grid` has one presence per direction and no notion of subdivisions; Flint draws one line per labelled tick.',
      expected: 'Major lines at the labels, two or three fainter minor lines between them.',
      proposal: '`structure.grid.minor: { presence, divisions }`.',
    },
    {
      id: 'deck-caps',
      addressed: { stage: 'T3', note: 'The deck is set in capitals (`deck.case: "upper"`).' },
      observed: "Confirmed: Flint prints the deck in sentence case with “; EV share (%)” appended, although `deck.case` is `upper`. Expected: “NEW CARS SOLD THAT ARE ELECTRIC, 2018 - 2023” in small caps.",
      title: 'The all-caps deck is stated but set in sentence case',
      kind: 'realization',
      severity: 'medium',
      probe: 'type-case',
      rule: '“Use sentence capitalization … you can use all caps, but all caps should be used sparingly” — the anatomy’s subtitle “AUGUST - SEPTEMBER 2019” is the one place it does.',
      current: 'The theme states `type.deck.case: "upper"`; Flint draws the deck as written, in sentence case, and then appends the axis title to it (“…, 2018 - 2023; EV share (%)”) because `axisTitles` is `omit`.',
      expected: 'A small capitalised deck naming the period, nothing appended.',
      proposal: 'Apply `TypeRole.case` when the title block is realised (Vega `subtitle` text transformed, or a `case` channel in the title mark), and keep the appended axis title out of a deck the author marked as a date range.',
      flint: evFlint,
      expectedSpec: evExpected(false),
    },
    {
      id: 'motion',
      title: 'Animate axes before data ink, one stage at a time',
      kind: 'product-ui',
      severity: 'low',
      probe: 'motion',
      rule: '“Stage changes to axes before changes to data ink”; one thing at a time, groups of no more than 4–5 objects; motion in the chart’s own coordinate space; no gratuitous animation.',
      current: 'ThemeSpec has no motion block; Flint compiles static specs and leaves transitions to the host.',
      expected: 'A house `motion` policy the host’s renderer can follow.',
      proposal: '`interaction.motion: { stage: ["axes", "marks"], maxGroup: 5, duration }`.',
    },
  ],
};

export default microsoft;
