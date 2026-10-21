import type { ThemeSpec } from 'flint-chart';
import research from '../research/kraft-heinz.json';
import { EV_SHARE, flintInput, forecastProbe, highlightProbe, pieProbe, PROJECTION, scatterProbe, valueLabelProbe } from '../probes';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

/** Segoe UI is the product font; Open Sans (loaded on the page) stands in for it off Windows. */
const FONT = "'Segoe UI', 'Open Sans', 'Helvetica Neue', Arial, sans-serif";
const BLUE = '#295CAD';
const GRAY = '#A2AEB5';
const YELLOW = '#DF9F37';
const CORE = [BLUE, GRAY, '#B94431', '#05A3B1', '#0B3873', '#529C74', YELLOW];
/** Measured in the guide's “Do this” line specimen. */
const GRID = '#CACECE';
const BASELINE = '#595959';

const t: HouseTokens = {
  font: FONT,
  text: '#36383A',
  muted: BASELINE,
  grid: GRID,
  axis: BASELINE,
  background: '#FFFFFF',
  palette: CORE,
  highlight: BLUE,
  context: GRAY,
  titleSize: 20,
  titleWeight: 600,
  subtitleSize: 14,
  labelSize: 14,
  lineWidth: 3.5,
  legendOrient: 'top',
};

const theme: ThemeSpec = {
  id: 'kraft-heinz',
  label: 'Kraft Heinz (Delish)',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: '#36383A', secondary: BASELINE, muted: GRAY, inverse: '#FFFFFF' },
    structure: { axis: BASELINE, grid: GRID, zero: BASELINE, rule: GRID },
    series: {
      single: BLUE,
      categorical: CORE,
      overflow: GRAY,
      sequential: { stops: ['#9EBBE6', '#6F94CE', BLUE, '#133A77'], space: 'lab' },
      status: { positive: '#529C74', negative: '#B94431', neutral: GRAY },
    },
    accent: BLUE,
  },
  type: {
    headline: { family: FONT, size: 20, weight: 'semibold', color: '#36383A' },
    deck: { family: FONT, size: 14, color: BASELINE },
    axisLabel: { family: FONT, size: 14, color: BASELINE },
    axisTitle: { family: FONT, size: 12, color: BASELINE },
    keyLabel: { family: FONT, size: 12, color: BASELINE },
    valueLabel: { family: FONT, size: 12, color: '#36383A' },
    footnote: { family: FONT, size: 10, color: BASELINE },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1.5, ticks: 'omit' },
      // “Gridlines or direct labels. Use one or the other.”
      measure: { line: 'omit', ticks: 'omit', tickDensity: 'sparse', suppressWhenValuesPrinted: true },
    },
    grid: { measure: 'full', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: { bandFraction: 0.58, strokeWeight: 3.5, cornerRadius: 0, interpolation: 'linear', point: { presence: 'full', size: 60, fill: 'solid' } },
  geometry: { line: { width: 3.5 }, point: { presence: 'full', size: 60, vertexSize: 60, fill: 'solid' }, band: { fraction: 0.58, cornerRadius: 0 } },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start', suppressWhenValuesPrinted: true },
  dataLabels: { show: 'never', inkMode: 'contrastWithMark' },
  annotation: { axisTitles: 'whenAmbiguous', unit: 'never', numberFormat: { thousands: 'separator' } },
  layout: { titleBlock: { anchor: 'start' } },
};

/* ------------------------------------------------------------------ data */

const TWO = EV_SHARE.filter((row) => row.Country === 'China' || row.Country === 'Germany');

/* ------------------------------------------------------------- expected */

/** The “Do this” line specimen: two thick lines with dots, three gridlines at round steps, a dark baseline. */
function signatureExpected() {
  const names = ['China', 'Germany'];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...houseConfig({ ...t, background: '#F8F8F8' }),
      legend: { orient: 'top', direction: 'horizontal', title: null, symbolType: 'circle', symbolSize: 70, labelFont: FONT, labelFontSize: 12, labelColor: BASELINE, offset: 12 },
      axisX: { domain: true, domainColor: BASELINE, domainWidth: 1.5, ticks: false, grid: false, labelColor: BASELINE },
      axisY: { domain: false, ticks: false, grid: true, gridColor: GRID, labelColor: BASELINE },
    },
    title: { text: 'China overtook Germany in electric-car sales', subtitle: 'Share of new cars sold that are electric, %' },
    width: W,
    height: H,
    layer: [
      {
        data: { values: [{ v: 10 }, { v: 20 }, { v: 30 }, { v: 40 }] },
        mark: { type: 'rule', color: GRID, strokeWidth: 1 },
        encoding: { y: { field: 'v', type: 'quantitative' } },
      },
      {
        data: { values: TWO },
        mark: { type: 'line', strokeWidth: 3.5, point: { filled: true, size: 70 } },
        encoding: {
          x: { field: 'Year', type: 'ordinal', title: null, axis: { labelAngle: 0 } },
          y: { field: 'EV share (%)', type: 'quantitative', title: null, scale: { domain: [0, 40] }, axis: { values: [0, 10, 20, 30, 40], grid: false } },
          color: { field: 'Country', type: 'nominal', scale: { domain: names, range: [BLUE, YELLOW] } },
        },
      },
    ],
  };
}

const grayPie = () => pieProbe(theme, { ...t, palette: [BLUE, '#646B6F', GRAY, '#D1DBE2', '#E6ECF0'] }, { labels: 'legend', sort: true });

/** Forecast as the guide asks: the same blue, dashed from the last actual, and a key entry for each. */
function forecastExpected() {
  const probe = forecastProbe(theme, t, { projectedColor: BLUE, dash: [7, 5], label: false });
  return {
    ...probe.expectedSpec,
    config: {
      ...(probe.expectedSpec as { config: Record<string, unknown> }).config,
      legend: { orient: 'top', direction: 'horizontal', title: null, symbolType: 'stroke', symbolStrokeColor: BLUE, symbolStrokeWidth: 3, symbolSize: 300, labelFont: FONT, labelFontSize: 12, labelColor: BASELINE },
    },
    layer: [
      {
        data: { values: PROJECTION },
        mark: { type: 'line', strokeWidth: 3.5, color: BLUE, point: { filled: true, size: 60 } },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, axis: { format: 'd', values: [2015, 2020, 2025, 2030] }, scale: { domain: [2015, 2030], zero: false } },
          y: { field: 'Capacity (GW)', type: 'quantitative', title: null, axis: { values: [0, 2000, 4000, 6000] } },
          strokeDash: { field: 'Series', type: 'nominal', scale: { domain: ['Observed', 'Projected'], range: [[1, 0], [7, 5]] } },
        },
      },
    ],
  };
}

/** The probe's scatter, with the guide's transparent fill and a full-strength outline in the series ink. */
const outlinedScatter = () => {
  const probe = scatterProbe(theme, t, { opacity: 1, size: 70 });
  const views = (probe.expectedSpec as { vconcat: Record<string, unknown>[] }).vconcat;
  const view = views[0] as { mark: Record<string, unknown>; encoding: Record<string, unknown> };
  view.mark = { ...view.mark, fillOpacity: 0.25, strokeWidth: 1.5, strokeOpacity: 1 };
  view.encoding = { ...view.encoding, stroke: view.encoding.color };
  return probe;
};

/* --------------------------------------------------------------- house */

const kraftHeinz: StyleGuideTheme = {
  id: 'kraft-heinz',
  org: 'Kraft Heinz (Delish Design System)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the Delish data-visualisation pages and their do/don’t specimens. Stated directly: the core order (Blue `#295CAD`, Gray `#A2AEB5`, Red `#B94431`, Teal `#05A3B1`, Ocean `#0B3873`, Green `#529C74`, Yellow `#DF9F37`), the blue 4-step ramp, positive/negative semantic inks, Segoe UI, light gridlines (`#CACECE`, measured) with few, round steps (`tickDensity: sparse`), a darker baseline (`#595959`) and no y-axis line or ticks, square bars wider than their gaps (0.58), thick lines with round markers, a top-left key with circle swatches, and “gridlines or direct labels, not both” as `suppressWhenValuesPrinted` on the measure axis and the key.',
    'Approximated: the guide gives no chart type sizes, so the 20px semibold headline and 14px body come from the product type scale (title4, body1). The examples sit on `#F8F8F8` cards; the canvas is left white because the card belongs to the dashboard, not the chart. Segoe UI falls back to Open Sans off Windows.',
    'Not statable: gray is a *role* in this house (de-emphasis), but the schema can only list it as the second categorical ink, so a two-series chart comes out blue and gray; the highlight-one-rest-gray story, transparent outlined scatter dots, the line-count limit with its small-multiples fallback, and the dark-background semantic set — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      observed: "Flint (left): thick lines with dots, light grid, dark baseline, top key with circle swatches — close to the specimen. But Germany is gray (the second core ink), which reads as context; the y title “EV share (%)” is kept and every year is labelled. Expected (right): blue and amber, round 10-point grid, on the #F8F8F8 card.",
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: '“Do this” line specimen: two medium-thick lines (cobalt and amber) with filled round markers; three light gridlines at round steps plus a darker charcoal baseline at 0; grey Segoe UI tick labels at the left; no axis line, ticks or axis titles.',
      current: 'Flint draws the thick lines, markers, light grid and dark baseline. The second series takes the second core ink, which is the house’s de-emphasis gray, so China and Germany read as “highlight and context” rather than two equals.',
      expected: 'China in blue, Germany in amber, gridlines every 10 points.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: TWO,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'China overtook Germany in electric-car sales',
        subtitle: 'Share of new cars sold that are electric, %',
      }),
      expectedSpec: signatureExpected(),
      expectedFrame: { style: { background: '#F8F8F8', borderRadius: '8px' } },
    },
    {
      id: 'highlight-gray',
      observed: "Confirmed: every bar blue in Flint, with a dark y-axis line beside the names. Expected: Nigeria blue, the rest gray.",
      title: 'Highlight one in blue, everything else gray',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'highlight',
      rule: '“Gray can be used to deemphasize lines that are shown for context”; bars and slices likewise: the key item in blue, the rest gray. Gray `#A2AEB5` is listed in the core palette for exactly this job.',
      current: 'The chart spec cannot name the item the story is about, and the theme has no context ink, so gray can only be the second categorical colour. A single-series bar chart is all blue.',
      expected: 'Nigeria in blue, the other countries gray.',
      proposal: '`chart_spec.emphasis: { field, values }` with `ink.series.emphasis` and `ink.series.context` — and let a house take its context gray out of `categorical`.',
      ...highlightProbe(theme, t),
    },
    {
      id: 'labels-or-gridlines',
      addressed: { stage: 'L6', note: 'With the ruler gone, its title moves into the deck — or goes, where the headline or deck already names the quantity — instead of floating under the bars (L6).' },
      observed: "Flint drops the value axis and gridlines as stated, but leaves the “Population” axis title alone under the bars. Expected has no title.",
      title: 'Gridlines or direct labels: the axis goes, its title stays',
      kind: 'realization',
      severity: 'low',
      probe: 'labels-replace-axis',
      rule: '“Gridlines or direct labels. Use one or the other, you generally don’t need both.”',
      current: 'Stated as `structure.axis.measure.suppressWhenValuesPrinted: true`. With value labels asked for (`showTextLabels`), Flint drops the value axis and its gridlines as stated — but leaves the axis title (“Population”) behind, floating under the bars with no ruler to name.',
      expected: 'Values at the bar ends; no value axis, no gridlines, no stray title.',
      proposal: 'When an axis is suppressed, its title goes with it (or moves to the deck under `axisTitles: omit`).',
      ...valueLabelProbe(theme, t, { placement: 'outside', hideAxis: true }),
    },
    {
      id: 'forecast-dash',
      observed: "Confirmed: the line is right (one blue, dashed after 2023, dots on every reading) but the key is on the right with a bold “Series” title and ring symbols. Expected: a top key with solid and dashed segments.",
      title: 'The forecast is drawn right, but its key is not',
      kind: 'realization',
      severity: 'medium',
      probe: 'forecast-style',
      rule: '“Use a dashed line in the same color as the past data. Make sure to add a legend entry.” The house key sits top-left, untitled, with small swatches.',
      current: 'Flint keeps one blue and dashes the projected part — what the guide asks — but its key ignores the theme: it goes to the right although `legend.placement` is `["top"]`, carries the field name “Series” as a title although `legend.title` is `omit`, and draws each entry as a ring (solid and dashed) rather than a line segment.',
      expected: 'One blue line, solid then dashed from 2023; a top-left key with a solid and a dashed segment.',
      proposal: 'A strokeDash-only key should honour `legend.placement`/`title` like a colour key, and use a line swatch (`legend.swatch: "line"` once swatches can be named).',
      flint: forecastProbe(theme, t, { projectedColor: BLUE, dash: [7, 5] }).flint,
      expectedSpec: forecastExpected(),
    },
    {
      id: 'pie-gray',
      observed: "Flint: blue, gray, red, teal, ocean slices; the lone gray slice (Safari) reads as the unimportant one. Expected: Chrome blue, the rest in a gray ramp, largest first.",
      title: 'Pies: one slice in colour, the rest in shades of gray',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'pie-rules',
      rule: '“Try not to use more than 4 or 5 segments … shades of gray are a good choice for less important segments”; parts must sum to 100%.',
      current: 'Flint gives each slice its own core colour (blue, gray, red, teal, ocean), so the one gray slice looks like the de-emphasised one and the colourful rest compete. The theme cannot ask for “lead in blue, rest in the gray ramp”.',
      expected: 'Chrome in blue, the others in four grays, largest first.',
      proposal: '`ink.series.selection.partToWhole: "emphasisAndGrays"` using the gray ramp, keyed by `chart_spec.emphasis` (default: the largest part).',
      ...grayPie(),
    },
    {
      id: 'outlined-dots',
      observed: "Flint draws solid dots; expected draws pale fills with full-strength outlines so overlaps show.",
      title: 'Overlapping points: transparent dots with outlines',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'per-mark-palette',
      rule: '“Use transparent dots with outlines rather than solid dots” where points overlap.',
      current: '`marks.fillOpacity` applies to every filled mark (bars too) and `marks.outline` draws in the structure ink or the surface, not the series ink; `geometry.point` has no fill opacity. So the scatter keeps solid dots.',
      expected: 'Light fills with a full-strength outline in each continent’s colour.',
      proposal: '`geometry.point: { fillOpacity, outline: "series" }`.',
      ...outlinedScatter(),
    },
    {
      id: 'heatmap-row-labels',
      addressed: { stage: 'A1', note: 'The row names are never turned for the column names (A1), and the months sit flat.' },
      title: 'Heatmap row names are turned diagonally',
      kind: 'realization',
      severity: 'medium',
      probe: 'turned-row-labels',
      rule: 'Dashboard charts read left to right; none of the guide’s examples turns a category name.',
      current: 'In the heatmap tile Flint turns the six city names on the y axis to −45°, as if they were crowded x labels, and turns the month labels as well.',
      expected: 'City names horizontal, right-aligned beside their rows; months flat under their columns.',
      proposal: 'Never turn y-axis band labels; measure x band labels before turning them.',
      observed: 'Gallery tile “Average monthly temperature by city”: “Singapore … Moscow” at −45° stacked into each other at the left edge; “Jan … Dec” at −45° too.',
    },
    {
      id: 'line-count',
      title: 'Up to four lines, then small multiples',
      kind: 'chart-spec',
      severity: 'low',
      probe: 'small-multiples',
      rule: '“Only include up to 4 lines in a single chart. Try to never use more than 6 lines”; otherwise split into small multiples.',
      current: 'ThemeSpec cannot say how many series a chart type may carry, and faceting is the chart spec’s decision; `variants` can react to `seriesCount` but only with policy blocks, not by splitting the chart.',
      expected: 'At five or more series, a guidance warning (and, if the author allows, a facet by series).',
      proposal: 'A house `limits: { line: { seriesCount: { prefer: 4, max: 6 } } }` reported by the compiler, plus `ThemePreset.guidance` text for agents.',
    },
    {
      id: 'dark-semantics',
      title: 'Semantic colours switch on dark backgrounds',
      kind: 'product-ui',
      severity: 'low',
      probe: 'dark-mode',
      rule: 'Positive / Negative / Notice are `#529C74 / #B94431 / #DF9F37` on light backgrounds and `#37BB65 / #CC2E48 / #DF9F37` on dark.',
      current: 'One `ink.series.status` per theme; `variants` may not vary `ink`.',
      expected: 'The dark set chosen when the dashboard is dark.',
      proposal: '`ink.modes.dark.series.status`.',
    },
  ],
};

export default kraftHeinz;
