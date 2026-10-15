import type { ThemeSpec } from 'flint-chart';
import research from '../research/minnpost.json';
import { MEDALS, UNEMPLOYMENT, flintInput, tooltipProbe, withChartSource } from '../probes';
import { houseConfig, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const OPEN = "'Open Sans', Helvetica, Arial, 'Lucida Grande', sans-serif";
const MONT = "Montserrat, 'Open Sans', Helvetica, Arial, sans-serif";
const BLUES = ['#0D57A0', '#0793AB', '#55CBDD'];
const DARK = '#676767';
const LIGHT = '#BCBCBC';
const TICK_TEXT = '#666666';
const CREDIT = '#ABABAB';

const t: HouseTokens = {
  font: OPEN,
  titleFont: MONT,
  text: '#282828',
  muted: TICK_TEXT,
  grid: LIGHT,
  gridDash: [1, 3],
  axis: LIGHT,
  background: '#FFFFFF',
  palette: BLUES,
  highlight: '#801019',
  context: LIGHT,
  titleSize: 20,
  titleWeight: 'bold',
  subtitleSize: 14,
  subtitleColor: '#404040',
  labelSize: 12,
  sourceSize: 14,
  lineWidth: 4,
  legendOrient: 'top',
};

const theme: ThemeSpec = {
  id: 'minnpost',
  label: 'MinnPost (minnpost-styles)',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: '#282828', secondary: DARK, muted: CREDIT, inverse: '#FFFFFF' },
    structure: { grid: LIGHT, axis: LIGHT },
    series: {
      single: BLUES[0],
      categorical: BLUES,
      // Minor parties and “Other” take the grey (R8); the party colours are the chart's.
      roles: { other: '#7A7A7A' },
      // The 'colors-data' starting set, cut at the guide's limit of seven groups.
      categoricalExtended: [...BLUES, '#1D8C47', '#FF6633', '#FBD341', '#55307E'],
      sequential: { stops: ['#FFFFFF', '#0D57A0'], space: 'lab' },
      diverging: { stops: ['#C83D2D', '#FFFFFF', '#0D57A0'], neutral: '#FFFFFF', space: 'lab' },
      status: { positive: '#469B61', negative: '#C83D2D' },
    },
    accent: '#801019',
  },
  type: {
    headline: { family: MONT, size: 20, weight: 'bold', color: '#282828' },
    deck: { family: OPEN, size: 14, color: '#404040' },
    axisLabel: { family: OPEN, size: 12, color: TICK_TEXT },
    axisTitle: { family: OPEN, size: 12, weight: 'bold', color: DARK },
    keyLabel: { family: OPEN, size: 14, weight: 'bold', color: DARK },
    valueLabel: { family: OPEN, size: 12, color: DARK },
    footnote: { family: OPEN, size: 14, color: CREDIT },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1, ticks: 'full', tickDirection: 'outward', tickLength: 'medium' },
      measure: { line: 'omit', ticks: 'omit' },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'dotted', dash: [1, 3], weight: 1 },
    frame: 'omit',
    baseline: 'quiet',
  },
  marks: { strokeWeight: 4, strokeJoin: 'round', strokeCap: 'round' },
  // `minPointLength: 3` — a near-zero bar still shows as a 3px stub (M6).
  geometry: { line: { width: 4, join: 'round', cap: 'round' }, point: { presence: 'omit', size: 79 }, band: { minLength: 3 } },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'center' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'whenAmbiguous', axisTitlePlacement: 'rotated', axisTitleGap: 20, numberFormat: { thousands: 'suffix' } },
  layout: { titleBlock: { anchor: 'start', gap: 'loose' }, targetWidth: 640 },
  compileDefaults: { baseSize: { width: 640, height: 320 } },
  // The source line, as the guide sets it (S1); the chart gives the words.
  source: { leadIn: '', rule: { width: 1, color: CREDIT } },
};

/** The component label and caption MinnPost sets in HTML above the chart (Highcharts' own title is off). */
const componentHeader = (label: string, caption: string) =>
  `<div style="margin:2px 14px 6px">`
  + `<div style="font-family:${MONT};font-weight:700;font-size:20px;color:#282828;line-height:1.25">${label}</div>`
  + `<div style="font-family:${OPEN};font-size:13.6px;color:#404040;margin-top:4px">${caption}</div></div>`;

/** The .credit/.footnote line: small light-grey text under a 1px #ABABAB rule. */
const credit = (text: string) =>
  `<div style="margin:6px 14px 8px;padding-top:5px;border-top:1px solid ${CREDIT};font-family:${OPEN};font-size:13.6px;color:${CREDIT}">${text}</div>`;

const vl = (spec: Record<string, unknown>, extraConfig: Record<string, unknown> = {}) => ({
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  config: { ...houseConfig(t), ...extraConfig },
  ...spec,
});

/** The Highcharts line specimen: a 4px line, dotted horizontal grid, a thin x axis with ticks, a rotated bold y title. */
function highchartsLine(width = 460, height = 230) {
  return vl({
    width,
    height,
    data: { values: UNEMPLOYMENT },
    mark: { type: 'line', strokeWidth: 4, strokeJoin: 'round', strokeCap: 'round', color: BLUES[0] },
    encoding: {
      x: {
        field: 'Year', type: 'quantitative', title: null, scale: { domain: [2000, 2023], nice: false },
        axis: { format: 'd', values: [2000, 2005, 2010, 2015, 2020], domain: true, domainColor: LIGHT, ticks: true, tickColor: LIGHT, tickSize: 8, labelColor: TICK_TEXT, grid: false },
      },
      y: {
        field: 'Unemployment (%)', type: 'quantitative', scale: { domain: [0, 10] },
        axis: { values: [0, 2, 4, 6, 8, 10], labelExpr: "datum.label + '%'", title: 'Rate (%)', titleFontWeight: 'bold', titleColor: DARK, titlePadding: 20, gridDash: [1, 3], gridColor: LIGHT, labelColor: TICK_TEXT },
      },
    },
  });
}

const unemploymentFlint = (title: string, subtitle: string) => flintInput(theme, {
  chartType: 'Line Chart',
  data: UNEMPLOYMENT,
  semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
  encodings: { x: 'Year', y: 'Unemployment (%)' },
  title,
  subtitle,
  baseSize: { width: 520, height: 330 },
});

const MEDAL_ROWS = MEDALS.filter((row) => ['United States', 'China', 'Japan', 'Australia'].includes(row.Country) && row.Medal !== 'Bronze');

/** chart-2: a top-centred, borderless key with rounded swatches and bold dark-grey 14px labels, 30px above the plot. */
function keyedBars() {
  return vl({
    width: 420,
    height: 220,
    data: { values: MEDAL_ROWS },
    mark: { type: 'bar' },
    encoding: {
      y: { field: 'Country', type: 'nominal', sort: null, title: null, axis: { domain: true, domainColor: LIGHT, ticks: true, tickColor: LIGHT, tickSize: 8, labelColor: TICK_TEXT, grid: false }, scale: { paddingInner: 0.3 } },
      yOffset: { field: 'Medal', sort: ['Gold', 'Silver'] },
      x: { field: 'Count', type: 'quantitative', axis: { title: 'Medals (no.)', titleFontWeight: 'bold', titleColor: DARK, grid: true, gridDash: [1, 3], gridColor: LIGHT, labelColor: TICK_TEXT, domain: false } },
      color: {
        field: 'Medal', type: 'nominal', sort: ['Gold', 'Silver'], scale: { range: BLUES },
        legend: { orient: 'top', direction: 'horizontal', title: null, symbolType: 'M-1,-0.6 a0.4,0.4 0 0 1 0.4,-0.4 h1.2 a0.4,0.4 0 0 1 0.4,0.4 v1.2 a0.4,0.4 0 0 1 -0.4,0.4 h-1.2 a0.4,0.4 0 0 1 -0.4,-0.4 z', symbolSize: 220, labelFontSize: 14, labelFontWeight: 'bold', labelColor: DARK, columnPadding: 20, offset: 30 },
      },
    },
  }, { legend: { orient: 'top' } });
}

/** Minnesota House of Representatives after the 2022 election: 70 DFL, 64 Republican. */
const HOUSE_SEATS = [
  { Party: 'DFL', Seats: 70 },
  { Party: 'Republican', Seats: 64 },
];

const partyFlint = () => flintInput(theme, {
  chartType: 'Bar Chart',
  data: HOUSE_SEATS,
  semantic_types: { Party: { semanticType: 'Category', colors: { DFL: '#0793AB', Republican: '#A1000F', Independence: '#FF781F', Green: '#07AB20', Libertarian: '#7A7A7A' } }, Seats: 'Quantity' },
  encodings: { x: 'Party', y: 'Seats', color: 'Party' },
  title: 'DFL holds a narrow House majority',
  subtitle: 'Minnesota House seats after the 2022 election.',
  baseSize: { width: 420, height: 300 },
});

const partyBars = (range: string[]) => vl({
  width: 300,
  height: 200,
  data: { values: HOUSE_SEATS },
  mark: { type: 'bar' },
  encoding: {
    x: { field: 'Party', type: 'nominal', title: null, axis: { labelAngle: 0, domain: true, domainColor: LIGHT, ticks: true, tickColor: LIGHT, tickSize: 8, labelColor: TICK_TEXT }, scale: { paddingInner: 0.4 } },
    y: { field: 'Seats', type: 'quantitative', axis: { title: 'Seats (no.)', titleFontWeight: 'bold', titleColor: DARK, gridDash: [1, 3], gridColor: LIGHT, labelColor: TICK_TEXT } },
    color: { field: 'Party', type: 'nominal', scale: { domain: ['DFL', 'Republican'], range }, legend: null },
  },
});

const minnpost: StyleGuideTheme = {
  id: 'minnpost',
  org: 'MinnPost',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from minnpost-styles: the Highcharts defaults in `js/highcharts.js` and the SCSS variables. The kit is a newsroom’s Highcharts setup, so most of its rules are renderer settings with a direct ThemeSpec field.',
    'Stated directly: Open Sans throughout with a Montserrat headline; the three default blues (#0D57A0, #0793AB, #55CBDD) and the seven-colour starting set as the extended palette; dotted horizontal gridlines only; a thin #BCBCBC x axis with outward ticks and no y axis line; a rotated bold #676767 y title only where the numbers need naming (`axisTitles: whenAmbiguous`), 20px from the labels; 4px lines with round joins and no markers; a top-centred, untitled key in bold 14px #676767; k abbreviations; status green/red; and the 640×320 article chart (`compileDefaults.baseSize`).',
    'Approximated: the code gives tick labels #BCBCBC, but the live style-guide demos render them #666666, which is what the theme uses. Not stated: the component label and caption are HTML above the chart, the credit line under it, the party colours, the hover state and `minPointLength` — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'No in-chart title: a bold Montserrat component label and a short caption above in HTML; a 4px line without markers; dotted light-grey horizontal gridlines; a thin grey x axis with tick marks; a rotated bold “Units (un)” y title; small grey Open Sans tick labels; the credit in light grey under a hairline.',
      current: 'Flint draws the title block, the 4px line, the dotted grid and the x axis with ticks from the theme. It has no credit line.',
      expected: 'The live Highcharts line demo applied to US unemployment.',
      flint: unemploymentFlint('Unemployment spiked twice in two decades', 'U.S. unemployment rate, annual average, 2000–2023.'),
      expectedSpec: highchartsLine(),
      expectedFrame: {
        headerHtml: componentHeader('Unemployment spiked twice in two decades', 'U.S. unemployment rate, annual average, 2000–2023.'),
        footerHtml: credit('Source: Bureau of Labor Statistics'),
      },
      observed: 'Flint (left) gets the Montserrat headline, the Open Sans caption, the 4px blue line and the dotted horizontal grid, with a bold rotated “Unemployment (%)” title. It starts the y scale at 3 against the house’s zero floor (the “3” then sits against the “2000” label), labels every second year (twelve labels against five), and draws the stated `tickLength: medium` ticks as stubs barely below the axis line. It stops without a credit. Expected (right): 0–10% scale, years every five, 8px ticks, the light-grey credit under a hairline.',
    },
    {
      id: 'key-label-weight',
      addressed: { stage: 'T1', note: 'The key labels’ stated weight is now written (legend `labelFontWeight`).' },
      title: 'Bold key labels are drawn regular',
      kind: 'realization',
      severity: 'medium',
      probe: 'type-weight-scale',
      rule: '`legend: { verticalAlign: "top", margin: 30, borderWidth: 0, itemDistance: 20, itemStyle: styleLabelLarge }` — bold 14px #676767 labels, the key centred over the plot.',
      current: 'Stated as `type.keyLabel: { size: 14, weight: "bold", color: #676767 }` with `legend.placement: ["top"]`, `align: "center"`. The legend realizer passes the key label’s font, size and colour to Vega-Lite but never its weight (no `labelFontWeight`), so the house’s bold key prints regular.',
      expected: 'Two grouped series keyed in bold dark-grey 14px labels, centred, 30px above the bars.',
      proposal: 'Carry `fontWeight` (and `fontStyle`) from `type.keyLabel` into `legend.labelFontWeight` / `labelFontStyle`; add `legend.gap` and `legend.itemGap` in px for the 30px / 20px spacings.',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: MEDAL_ROWS,
        semantic_types: { Country: 'Country', Medal: 'Category', Count: 'Quantity' },
        encodings: { y: 'Country', x: 'Count', group: 'Medal' },
        title: 'Gold and silver medals, Paris 2024',
        baseSize: { width: 500, height: 320 },
      }),
      expectedSpec: keyedBars(),
      expectedFrame: { headerHtml: componentHeader('Gold and silver medals, Paris 2024', '') },
      observed: 'Flint centres a square-swatch key above the bars, but its labels are regular weight and smaller than the 14px bold the house states; there is also no 30px gap above the plot. Expected: bold dark-grey “Gold”/“Silver” with rounded swatches.',
    },
    {
      id: 'legend-swatch',
      title: 'Rounded-rectangle key swatches',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'legend-swatch',
      rule: 'Highcharts keys bars with a small rounded rectangle and scatter series with the series’ own marker symbol (circle, diamond).',
      current: '`legend.swatch` only accepts `auto`; Flint keys bars with square swatches and cannot round them or switch to the series marker.',
      expected: 'Rounded swatches, as in the key-label panel’s expected chart.',
      proposal: '`legend.swatch: { shape: "square" | "circle" | "line" | "seriesMarker", cornerRadius }`.',
    },
    {
      id: 'fixed-category-colors',
      addressed: { stage: 'R8', note: 'The chart annotates Party with the party colours (`semantic_types.Party.colors`); the theme keeps the grey for “Other” (`ink.series.roles.other`).' },
      title: 'Party colours are fixed to the party, not the position',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'fixed-category-colors',
      rule: 'Political colours are named per party in `_variables.scss`: DFL/D #0793AB, GOP/R #A1000F, Independence #FF781F, Green #07AB20, minor parties #7A7A7A.',
      current: 'ThemeSpec colours by position in `ink.series.categorical`; it cannot bind an ink to a category value, so Republicans take whichever blue comes second.',
      expected: 'DFL in teal-blue, Republicans in dark red.',
      proposal: '`ink.series.byValue: { DFL: "#0793AB", Republican: "#A1000F", … }` (or a named `ink.series.vocabularies.party`) consulted before the positional palette.',
      flint: partyFlint(),
      expectedSpec: partyBars(['#0793AB', '#A1000F']),
      expectedFrame: { headerHtml: componentHeader('DFL holds a narrow House majority', 'Minnesota House seats after the 2022 election.') },
      observed: 'Flint colours DFL dark blue and Republicans teal-blue — the colour the guide reserves for the DFL — and adds a key. Expected: DFL #0793AB, Republicans #A1000F, no key.',
    },
    {
      id: 'axis-from-zero',
      title: 'The y axis always starts at zero',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'axis-from-zero',
      rule: '`yAxis: { min: 0 }` is a house default: every MinnPost chart, line charts included, reads from a zero floor.',
      current: 'Whether a scale includes zero is a reading decision the chart template makes; ThemeSpec has no field for it and `chartDefaults` reports and drops zero-baseline keys. Flint lets this line chart’s y scale start at 3 (at the gallery’s smaller size the same data starts at 0).',
      expected: 'The same line read from a 0% floor, the dotted grid every 2 points.',
      proposal: 'Allow a house-level `structure.axis.measure.floor: "zero" | "data"` as a default the chart spec can override — a style rule many newsrooms state, distinct from a data transform.',
      flint: unemploymentFlint('Unemployment spiked twice in two decades', 'U.S. unemployment rate, annual average, 2000–2023.'),
      expectedSpec: highchartsLine(),
      expectedFrame: { headerHtml: componentHeader('Unemployment spiked twice in two decades', 'U.S. unemployment rate, annual average, 2000–2023.') },
      observed: 'Flint’s y axis runs 3–10, so the 2010 peak reads as two and a half times the 2000 level; the expected line sits on a 0% floor.',
    },
    {
      id: 'source-line',
      addressed: { stage: 'S1', note: 'The credit line in light grey under a 1px hairline (`source.rule`), with no lead-in.' },
      title: 'Credit line under a hairline, in light grey',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'source-line',
      rule: '`.credit` / `.footnote`: 0.85em #ABABAB text under the chart, the footnote with a 1px #ABABAB top border; Highcharts credits are switched off.',
      current: 'The chart spec has no source or credit slot; `type.footnote` is stated but nothing draws it.',
      expected: 'The chart closed by a hairline and “Source: Minnesota Legislative Reference Library” in light grey.',
      proposal: '`chart_spec.source` / `chart_spec.notes[]` drawn in `type.footnote`, with `layout.footer.rule: "hairline"`.',
      flint: partyFlint(),
      expectedSpec: partyBars(['#0793AB', '#A1000F']),
      expectedFrame: {
        headerHtml: componentHeader('DFL holds a narrow House majority', 'Minnesota House seats after the 2022 election.'),
        footerHtml: credit('Source: Minnesota Legislative Reference Library'),
      },
      observed: 'Flint ends the chart after the x labels. Expected: a 1px #ABABAB rule and the credit line in light grey under it.',
    },
    {
      id: 'hover-state',
      title: 'Hover: the line thickens and shows a white-filled marker; bold-name tooltip',
      kind: 'product-ui',
      severity: 'low',
      probe: 'tooltip-style',
      rule: 'Lines thicken from 4px to 5px on hover and show their markers as white circles with a 2px series-colour outline; the tooltip is Open Sans 12px #676767, “<strong>Series</strong>: value” with a thousands separator.',
      current: '`interaction` carries a tooltip format string and selection paint only; there is no hover state for marks, no marker style on hover and no tooltip template with a bold series name.',
      expected: 'The 2020 reading pinned as if hovered: marker, rule and a light tooltip with the bold series name.',
      proposal: '`interaction.hover: { lineWidthDelta: 1, marker: { fill: "surface", outline: 2 } }`, `interaction.tooltip: { template: "**{series}**: {value}", font, fill, border: "series" }`.',
      ...tooltipProbe(theme, t, { fill: '#F7F7F7', text: DARK, border: BLUES[0], radius: 3 }),
      observed: 'Flint’s static panel has no hover state to show; the line is drawn at 4px with no markers. Expected: the 2020 point marked with a rule and a light tooltip naming the series in bold.',
    },
    {
      id: 'min-point-length',
      addressed: { stage: 'M6', note: '`geometry.band.minLength: 3` draws a 3px stub at the baseline for every non-zero bar shorter than that; zero stays empty, and a stacked bar is left alone.' },
      title: 'Bars keep a 3px minimum length',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'bar-shape',
      rule: '`minPointLength: 3` — a bar or column whose value is tiny is still drawn 3px long so it reads as present, not missing.',
      current: '`marks.minSize` is an area for sized marks; nothing guarantees a bar a visible length, so a near-zero bar disappears into the baseline.',
      expected: 'A 3px stub for every non-zero bar.',
      proposal: '`geometry.band.minLength: 3` (px), realised as a floor on the bar’s pixel extent.',
    },
  ],
};

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(minnpost, 'Minnesota Department of Health', ['source-line']);

export default minnpost;
