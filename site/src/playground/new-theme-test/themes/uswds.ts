import type { ThemeSpec } from 'flint-chart';
import research from '../research/uswds.json';
import { cardProbe, flintInput, POPULATION, UNEMPLOYMENT, withChartSource } from '../probes';
import { houseConfig, titled, W, H as HEIGHT, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Public Sans', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const INK = '#1B1B1B';
const BASE = '#71767A';
const BLUE = '#005EA2';
const ORANGE = '#FA9441';
const ORANGE_DARK = '#C05600';
const GRID = '#DFE1E2';

const t: HouseTokens = {
  font: FONT,
  text: INK,
  muted: BASE,
  grid: GRID,
  axis: BASE,
  background: '#FFFFFF',
  palette: [BLUE, ORANGE, '#1A4480', '#D83933', '#00BDE3'],
  titleSize: 18,
  titleWeight: 700,
  subtitleSize: 14,
  subtitleColor: BASE,
  labelSize: 12,
  sourceSize: 15,
  lineWidth: 2.5,
  legendOrient: 'top',
};

const theme: ThemeSpec = {
  id: 'uswds',
  label: 'U.S. Web Design System',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: INK, secondary: INK, muted: BASE },
    structure: { axis: BASE, grid: GRID, zero: BASE },
    series: {
      single: BLUE,
      // The guide has no chart palette; its two examples use primary blue and accent-warm orange.
      categorical: [BLUE, ORANGE],
      // USWDS default theme tokens (primary-dark, secondary, accent-cool, primary-darker), not chart guidance.
      categoricalExtended: [BLUE, ORANGE, '#1A4480', '#D83933', '#00BDE3', '#162E51'],
      overflow: BASE,
    },
    accent: BLUE,
  },
  type: {
    headline: { family: FONT, size: 18, weight: 'bold', case: 'asIs', color: INK },
    deck: { family: FONT, size: 14, weight: 'regular', color: BASE },
    axisLabel: { family: FONT, size: 12, color: INK },
    axisTitle: { family: FONT, size: 12, weight: 'regular', color: INK },
    keyLabel: { family: FONT, size: 12, color: INK },
    valueLabel: { family: FONT, size: 12, color: INK },
    footnote: { family: FONT, size: 15, color: INK },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1, ticks: 'omit' },
      measure: { line: 'full', lineWeight: 1, ticks: 'omit' },
    },
    grid: { measure: 'full', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: {
    bandFraction: 0.72,
    strokeWeight: 2.5,
    strokeCap: 'round',
    redundantEncoding: 'always',
    redundantChannels: ['dash'],
  },
  geometry: {
    line: { width: 2.5, cap: 'round', join: 'round' },
    point: { presence: 'full', size: 40, fill: 'solid' },
    band: { fraction: 0.72, cornerRadius: 0 },
  },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'omit', unit: 'never' },
  layout: { titleBlock: { anchor: 'start', gap: 'loose', deckGap: 'normal' } },
  // The source line, as the guide sets it (S1); the chart gives the words.
  source: {},
};

// ---------------------------------------------------------------------------
// Data from the guide's two specimens.

const PARKS = [
  { Park: 'Great Smoky Mountains National Park', 'Visits (in millions)': 12.5 },
  { Park: 'Grand Canyon National Park', 'Visits (in millions)': 6.0 },
  { Park: 'Rocky Mountain National Park', 'Visits (in millions)': 4.7 },
  { Park: 'Zion National Park', 'Visits (in millions)': 4.5 },
  { Park: 'Yosemite National Park', 'Visits (in millions)': 4.4 },
];
const PARKS_TITLE = 'The five most-visited national parks of 2019';
const PARKS_SUMMARY = 'Of the 62 parks with the designation “national park” as part of their official title, these were the top five. The Great Smoky Mountains National Park was the most-visited park by more than a factor of two.';

const DAYS = ['2024-03-01', '2024-03-02', '2024-03-03', '2024-03-04', '2024-03-05', '2024-03-06', '2024-03-07'];
const FDR = [47, 87, 91, 86, 100, 78, 39];
const TR = [30, 50, 46, 42, 46, 39, 22];
const TRENDS = [
  ...DAYS.map((Date, i) => ({ Date, Person: 'Franklin D. Roosevelt', 'Search interest': FDR[i] })),
  ...DAYS.map((Date, i) => ({ Date, Person: 'Theodore Roosevelt', 'Search interest': TR[i] })),
];
/** The same rows with the guide's day labels, for the hand-drawn panels (no time-zone parsing). */
const TRENDS_DAYS = TRENDS.map((row) => ({ ...row, Day: `Mar. ${Number(row.Date.slice(-2))}` }));
const TRENDS_TITLE = 'Franklin D. Roosevelt drew more searches than Theodore every day';
const TRENDS_SUMMARY = 'Search interest relative to the week’s peak (100), 1–7 March';

// ---------------------------------------------------------------------------
// Frames: the card, its heading and summary, and the linked source line.

const CARD = { border: '1px solid #565C65', borderRadius: '8px', padding: '16px 4px 8px', background: '#FFFFFF', maxWidth: '560px' };

const headerHtml = (title: string, summary: string) =>
  `<div style="margin:0 14px 6px;font-family:${FONT}">`
  + `<div style="font-size:18px;font-weight:700;color:${INK};line-height:1.25">${title}</div>`
  + `<div style="font-size:14px;color:${BASE};line-height:1.5;margin-top:6px;max-width:460px">${summary}</div></div>`;

const EXT_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" style="vertical-align:-1px;margin-left:3px"><path fill="${BLUE}" d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>`;

const sourceHtml = (name: string) =>
  `<div style="margin:6px 14px 4px;font-family:${FONT};font-size:15px;color:${INK}">Source: `
  + `<a style="color:${BLUE};text-decoration:underline" href="#">${name}</a>${EXT_ICON}</div>`;

/** The bar specimen: legend naming the measure, wrapped park names, vertical grid, L-shaped axes. */
function parksView(withKey: boolean) {
  return {
    data: { values: PARKS },
    mark: { type: 'bar', height: { band: 0.72 } },
    encoding: {
      y: {
        field: 'Park', type: 'nominal', sort: null, title: null,
        axis: {
          domain: true, domainColor: BASE, labelColor: INK, labelFontSize: 12, labelPadding: 8, labelLineHeight: 15,
          labelExpr: "[replace(datum.label, ' National Park', ''), 'National Park']",
        },
      },
      x: {
        field: 'Visits (in millions)', type: 'quantitative', title: null, scale: { domain: [0, 14] },
        axis: { grid: true, gridColor: GRID, domain: true, domainColor: BASE, labelColor: INK, values: [0, 2, 4, 6, 8, 10, 12, 14] },
      },
      color: withKey
        ? { datum: 'Visits (in millions)', type: 'nominal', scale: { range: [BLUE] }, legend: { orient: 'top', symbolType: 'square', symbolSize: 260, labelFontSize: 13, labelColor: INK, offset: 10 } }
        : { value: BLUE },
    },
  };
}

function parksExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), axisY: { grid: false, domain: true } },
    width: 300,
    height: 230,
    ...parksView(true),
  };
}

/** The line specimen: one solid line, one dashed with darker markers, a dot at every reading. */
function trendsExpected() {
  const domain = ['Franklin D. Roosevelt', 'Theodore Roosevelt'];
  const x = {
    field: 'Day', type: 'ordinal', title: null, sort: null, scale: { padding: 0.3 },
    axis: { domain: true, domainColor: BASE, labelColor: INK, grid: false, labelAngle: 0 },
  };
  const y = {
    field: 'Search interest', type: 'quantitative', title: null, scale: { domain: [0, 100] },
    axis: { values: [0, 25, 50, 75, 100], domain: true, domainColor: BASE, labelColor: INK },
  };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), axisY: { grid: true, domain: true } },
    width: W,
    height: HEIGHT,
    data: { values: TRENDS_DAYS },
    layer: [
      {
        mark: { type: 'line', strokeWidth: 2.5, strokeCap: 'butt' },
        encoding: {
          x, y,
          color: { field: 'Person', type: 'nominal', scale: { domain, range: [ORANGE, BLUE] }, legend: { orient: 'top', direction: 'horizontal', symbolType: 'stroke', symbolStrokeWidth: 2.5, symbolSize: 500, labelFontSize: 12, columnPadding: 60, labelColor: INK } },
          strokeDash: { field: 'Person', type: 'nominal', scale: { domain, range: [[4, 2], [1, 0]] }, legend: null },
        },
      },
      {
        mark: { type: 'circle', size: 45, opacity: 1 },
        encoding: {
          x, y,
          color: { field: 'Person', type: 'nominal', scale: { domain, range: [ORANGE, BLUE] }, legend: null },
          fill: { field: 'Person', type: 'nominal', scale: { domain, range: [ORANGE_DARK, BLUE] }, legend: null },
        },
      },
    ],
    resolve: { scale: { fill: 'independent' } },
  };
}

const trendsFlint = () => flintInput(theme, {
  chartType: 'Line Chart',
  data: TRENDS,
  semantic_types: { Date: 'Date', Person: 'Category', 'Search interest': 'Score' },
  encodings: { x: 'Date', y: 'Search interest', color: 'Person' },
  title: TRENDS_TITLE,
  subtitle: TRENDS_SUMMARY,
});

const parksFlint = (title?: string, subtitle?: string) => flintInput(theme, {
  chartType: 'Bar Chart',
  data: PARKS,
  semantic_types: { Park: 'Category', 'Visits (in millions)': { semanticType: 'Quantity', unit: 'm' } },
  encodings: { y: 'Park', x: 'Visits (in millions)' },
  title,
  subtitle,
  baseSize: { width: 380, height: 280 },
});

const uswds: StyleGuideTheme = {
  id: 'uswds',
  org: 'U.S. Web Design System (GSA)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch. USWDS publishes accessibility guidance rather than a chart style, so the theme is read off its two example charts (the SVG source gives exact inks and weights): Public Sans; text `#1B1B1B`; thin `#71767A` axis lines on both the left and the bottom with no ticks; `#DFE1E2` gridlines across the value axis only; primary blue `#005EA2` for every bar of one measure; a key above the plot with no title; thick round-capped lines with a dot at every reading.',
    'Stated directly: the inks, Public Sans in every role, the L-shaped axes, value-axis-only grid, a 2.5px round line with solid point markers, `redundantEncoding: always` over dash (the guide’s “colour isn’t required” rule), a wrapping label policy, and a loose title block whose deck is the grey summary paragraph. There is no chart palette, so the categorical set is the two example inks; the extended set borrows USWDS theme tokens and is not guidance.',
    'Not stated: almost everything that makes a USWDS chart a USWDS chart lives *around* the SVG — the bordered card, the heading and plain-language summary, the linked “Source:” line, the screen-reader table — and has no home in the ThemeSpec or the chart spec. Neither does the guide’s single-series key, the darker marker on the dashed line, or the AP-style “Mar. 1” date. See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'high',
      probe: 'signature',
      rule: 'A white card with a thin border and rounded corners holds a bold plain-language heading, a grey summary paragraph stating the message, a key above the plot naming the measure (“Visits (in millions)”), one-colour blue bars sorted descending with two-line park names, thin grey left and bottom axes, light vertical gridlines, and “Source:” with a link to the data at the bottom.',
      current: 'Flint draws the title, the summary as a deck, the blue bars, the value grid and the L-shaped axes, and wraps the long park names. It has no card, no key for a single series and no source line, and `annotation.axisTitles: "omit"` appends the measure to the summary.',
      expected: 'The guide’s bar-chart example, redrawn: card, heading, summary, key, chart and linked source.',
      flint: parksFlint(PARKS_TITLE, PARKS_SUMMARY),
      expectedSpec: parksExpected(),
      expectedFrame: { style: CARD, headerHtml: headerHtml(PARKS_TITLE, PARKS_SUMMARY), footerHtml: sourceHtml('National Park Service') },
      observed: 'Close in structure: Flint’s bars, wrapped two-line park names, light vertical grid and grey L-shaped axes match the specimen. What is missing is everything around the plot — no card border, no key naming “Visits (in millions)”, no linked source — and the deck ends with an appended “; Visits (in millions) (m)”, which both repeats the measure and prints the unit twice.',
    },
    {
      id: 'card',
      title: 'Every chart sits in a bordered, rounded white card',
      kind: 'product-ui',
      severity: 'high',
      probe: 'card-container',
      rule: 'The example markup wraps heading, summary, chart and source in one `border bg-white padding-2 radius-md maxw-tablet` container.',
      current: 'ThemeSpec has `ink.surface.panel` but no container: no border, radius or padding around the whole figure, and Flint draws only the SVG.',
      expected: 'A 1px dark-grey border, 8px radius and 16px padding enclosing the chart and all its text.',
      proposal: '`layout.container: { border: { color, width }, radius, padding, maxWidth }` — realised by the host wrapper, since it encloses HTML text as well as the SVG.',
      ...cardProbe(theme, t, {
        style: CARD,
        header: 'Unemployment rate',
        meta: 'The rate doubled in the 2009 recession and spiked again in 2020 before falling back below 4%.',
        actions: false,
      }),
      observed: 'Flint (left) is a bare chart on the page: no border, no radius, no padding; its deck reads “United States, 2000–2023; Unemployment (%)” because the measure is appended. Expected (right) sits in a 1px dark-grey, 8px-radius card with heading and summary inside. Flint also fits the y axis to 3–10% with ticks every 1, where the card shows 0–10%.',
    },
    {
      id: 'source-link',
      addressed: { stage: 'S1', note: '“Source:” and the publisher, linked when the chart gives `source: { text, href }`. The external-link icon stays open.' },
      title: '“Source:” with a link to the original data',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: '“Original data linked. We linked back to the original source data” — below the chart, “Source: ” then the publisher’s name as a hyperlink with the external-link icon; the screen-reader table is `aria-describedby` this line.',
      current: 'The chart spec has no source field and no URL slot; there is no footer at all.',
      expected: 'A body-size “Source:” line under the chart whose name is an underlined blue link with the external-link icon.',
      proposal: '`chart_spec.source: { text, url }`, drawn with `type.footnote` and the theme’s link ink (`ink.text.link`) and emitted as a real `<a>` by the host.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: 'Country', x: 'Population' },
        title: 'India and China hold over a third of humanity',
        subtitle: 'Population in 2023, in millions. India passed China as the most populous country that year.',
      }),
      expectedSpec: titled(t, {
        data: { values: POPULATION },
        mark: { type: 'bar', color: BLUE },
        encoding: {
          y: { field: 'Country', type: 'nominal', sort: null, title: null, axis: { domain: true, domainColor: BASE, labelColor: INK } },
          x: { field: 'Population', type: 'quantitative', title: null, axis: { grid: true, domain: true, domainColor: BASE, labelColor: INK, values: [0, 500, 1000, 1500], format: ',.0f' } },
        },
      }, { title: 'India and China hold over a third of humanity', subtitle: 'Population in 2023, in millions.' }),
      expectedFrame: { footerHtml: sourceHtml('UN World Population Prospects') },
      observed: 'No footer of any kind under Flint’s chart; the deck again gains “; Population (m)” after a sentence that already ends with “that year.”, producing “that year.; Population (m)”. Expected closes with “Source: UN World Population Prospects” as an underlined blue link with the external-link icon.',
    },
    {
      id: 'single-series-key',
      title: 'A key names the measure even for one series',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'single-series-key',
      rule: 'The bar example has one series and still shows a key above the plot — a blue square and “Visits (in millions)” — so the measure and its unit are named without an axis title.',
      current: '`legend.show: "always"` is stated, but a single-series bar chart has no colour channel, so Flint draws no key; with `axisTitles: "omit"` the measure moves into the deck instead.',
      expected: 'The key above the plot, left-aligned with it, naming the measure and its unit; no axis title.',
      proposal: '`annotation.measureName: "deck" | "key" | "axisTitle"` — where a house names the measure when no axis title is drawn; `key` draws a one-entry swatch legend.',
      flint: parksFlint(),
      expectedSpec: { ...parksExpected(), height: 230 },
      observed: 'Flint (left) draws the five bars with no key and, with no title or deck, nothing on the chart names the measure or its unit at all. Expected (right) has a blue square and “Visits (in millions)” above the plot, left-aligned with it.',
    },
    {
      id: 'dash-and-marker',
      title: 'Second line dashed, with markers darker than the line',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'line-dash-redundancy',
      rule: '“One is a solid color, and the other uses both a dash pattern and a color contrast between the line and the indicators”: blue solid with blue dots; orange `#FA9441` dashed with `#C05600` dots, a dot at every day.',
      current: 'The theme asks for `redundantEncoding: "always"` over dash, and puts a solid dot on every vertex. Flint does dash the second line (4,2) and dots every reading, but ThemeSpec has no way to give a series’ markers an ink of their own: each dot takes its line’s colour. Flint also adds a second redundant cue the guide does not ask for — a different marker *shape* per series (circle, then a cross/triangle) — and keys the series with those marker shapes rather than line samples.',
      expected: 'One solid blue line, one finely dashed orange line whose dots are a darker burnt orange, both with dots at every reading, the key showing line samples.',
      proposal: '`ink.series.markerContrast: { mode: "darker", amount }` or a per-palette-entry `{ line, marker }` pair, so a house can separate series by marker ink as well as dash.',
      flint: trendsFlint(),
      expectedSpec: trendsExpected(),
      observed: 'Flint dashes Theodore Roosevelt’s orange line and dots every day, as asked, but the orange dots are the line’s own orange (not the darker `#C05600`), and the two series also get different marker shapes; the key shows a filled circle and an orange cross rather than line samples. Its x labels read “March 2024, 2, 3 … 7” instead of “Mar. 1 … Mar. 7”. The deck gains “; Search interest”.',
    },
    {
      id: 'date-format',
      title: 'Dates in AP style: “Mar. 1”',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'date-label-format',
      rule: 'The line example labels days “Mar. 1 … Mar. 7” — the abbreviated month with a period, then the day without a leading zero (AP/GPO style).',
      current: 'No ThemeSpec field governs date tick text; Flint picks its own d3 time format.',
      expected: 'See the expected panel of the dash-and-marker gap: “Mar. 1”, “Mar. 2” … under each day.',
      proposal: '`annotation.dateLabels: { style: "ap" | "iso" | "d3", format? }` — a house rule, with AP abbreviations (Jan., Feb., Aug., Sept., Oct., Nov., Dec.; March–July spelled out) built in.',
    },
    {
      id: 'zero-origin',
      title: 'Line charts start at zero unless clearly noted',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'zero-line',
      rule: '“Line charts origin should start at zero, unless clearly noted.”',
      current: 'Zero is the chart spec’s call, and `chartDefaults` refuses a zero-baseline setting because it changes how the data is read. Flint decides from the semantic type: a plain quantity starts at zero, but a percentage line is fitted to its data.',
      expected: 'The y axis from 0, with the lines sitting in the upper half.',
      proposal: 'Let a theme state a *default* reading policy the author can override: `annotation.zeroBaseline: "always" | "bars" | "whenMeaningful"`, reported when the author departs from it.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Unemployment spiked twice in two decades',
        subtitle: 'Share of the US labor force without a job, 2000–2023',
      }),
      expectedSpec: titled(t, {
        data: { values: UNEMPLOYMENT },
        mark: { type: 'line', strokeWidth: 2.5, strokeCap: 'round', color: BLUE, point: { filled: true, size: 24, color: BLUE } },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2000, 2023] }, axis: { format: 'd', values: [2000, 2005, 2010, 2015, 2020], domain: true, domainColor: BASE, labelColor: INK } },
          y: { field: 'Unemployment (%)', type: 'quantitative', title: null, scale: { domain: [0, 10] }, axis: { values: [0, 2, 4, 6, 8, 10], domain: true, domainColor: BASE, labelColor: INK } },
        },
      }, { title: 'Unemployment spiked twice in two decades', subtitle: 'Share of the US labor force without a job, 2000–2023' }),
      observed: 'Flint fits the percentage axis to 2–10 (ticks every 1), so the 2020 spike looks like it reaches the top of the chart; expected starts at 0 with ticks 0–10 every 2. With 24 readings Flint also drops the vertex dots that `point.presence: full` asks for (it draws them on the 7-day chart), where the guide dots every reading.',
    },
    {
      id: 'sr-table',
      title: 'A screen-reader data table travels with every chart',
      kind: 'product-ui',
      severity: 'high',
      probe: 'accessible-table',
      rule: '“Provide a screen-reader accessible data table … using the class usa-sr-only … hide the visualization using the attribute aria-hidden="true"”; the table is described by the source line.',
      current: 'Flint emits a chart only. Nothing in the ThemeSpec or the chart spec asks for an equivalent table, an `aria-hidden` SVG or a text summary for assistive technology.',
      expected: 'A visually hidden `<table>` with a caption, one row per data point, next to an `aria-hidden` SVG.',
      proposal: '`accessibility: { dataTable: "visuallyHidden" | "toggle" | "none", hideGraphic: boolean }` in the theme, rendered by the host from the compiled data; the headline and deck become the table caption.',
    },
  ],
};

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(uswds, 'U.S. Census Bureau', ['source-link']);

export default uswds;
