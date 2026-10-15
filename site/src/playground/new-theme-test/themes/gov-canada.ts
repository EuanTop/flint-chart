import type { ThemeSpec } from 'flint-chart';
import research from '../research/gov-canada.json';
import { ANOMALY, flintInput } from '../probes';
import { houseConfig, W, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

// Rubik (titles, axes) is not loaded on this page and falls back to Nunito Sans, which is the guide's body face.
const RUBIK = "Rubik, 'Nunito Sans', Calibri, sans-serif";
const NUNITO = "'Nunito Sans', Calibri, sans-serif";

const INK = '#252525';
const GRID = '#E0E0E0';
const AXIS = '#96A8B2';
const MINT = '#55C0A3';
const SLATE = '#477C8E';
const SERIES = [SLATE, '#ADE18D', '#43BDBC'];

const t: HouseTokens = {
  font: RUBIK,
  text: INK,
  muted: INK,
  grid: GRID,
  gridDash: [5, 5],
  axis: AXIS,
  background: '#FFFFFF',
  palette: SERIES,
  titleSize: 24,
  titleWeight: 'normal',
  titleAnchor: 'middle',
  labelSize: 13,
  lineWidth: 2,
  legendOrient: 'right',
};

const theme: ThemeSpec = {
  id: 'gov-canada',
  label: 'Government of Canada — Aurora',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: INK, secondary: INK, muted: '#4C4C4C', inverse: '#FFFFFF' },
    structure: { axis: AXIS, grid: GRID, zero: AXIS },
    series: {
      single: MINT,
      // No prescribed palette — “any colour … so long as it meets contrast requirements”; these are the guide’s own examples.
      categorical: SERIES,
      categoricalExtended: [...SERIES, '#002D42', '#137991', '#92CC6F', '#FEC04F'],
      sequential: { stops: ['#E3EBEE', '#6DD2DA', '#15A3A6', '#137991', '#002D42'], space: 'lab' },
      status: { positive: '#2B542C', negative: '#923534' },
    },
    accent: SLATE,
  },
  type: {
    // The guide's Heading 2 (28pt) and Heading 4 (21pt) are page headings; its chart templates set them smaller.
    headline: { family: RUBIK, size: 24, weight: 'regular', case: 'title', color: INK },
    deck: { family: NUNITO, size: 14, color: INK },
    axisLabel: { family: RUBIK, size: 13, color: INK },
    axisTitle: { family: RUBIK, size: 14, weight: 'regular', color: INK },
    keyLabel: { family: NUNITO, size: 14, color: INK },
    valueLabel: { family: RUBIK, size: 13, color: INK },
    footnote: { family: NUNITO, size: 12, color: INK },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 2.5, ticks: 'omit', labelGap: 8 },
      measure: { line: 'full', lineWeight: 2.5, ticks: 'omit', labelGap: 8 },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'dashed', dash: [5, 5], weight: 1 },
    frame: 'omit',
    baseline: 'full',
  },
  // Bars twice as wide as the gap between them; never rounded.
  marks: { bandFraction: 0.67, cornerRadius: 0, strokeWeight: 2, interpolation: 'linear', redundantEncoding: 'always', redundantChannels: ['shape'] },
  geometry: {
    line: { width: 2, interpolation: 'linear' },
    point: { presence: 'full', size: 70, vertexSize: 50, fill: 'hollow', outlineWidth: 2 },
    area: { opacity: 0.15, edge: 'full', edgeWidth: 2 },
    band: { fraction: 0.67, cornerRadius: 0 },
  },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['right', 'bottom'], direction: 'vertical', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'always', placement: 'outsideMark', inkMode: 'fixed' },
  annotation: { axisTitles: 'always', axisTitlePlacement: 'rotated', unitsInAxisTitle: true, numberFormat: { thousands: 'suffix', compact: { style: 'lower', types: ['Amount'], threshold: 1000 } } },
  // Let the columns fill the width rather than keep a fixed band step.
  layout: { titleBlock: { anchor: 'middle', gap: 'normal' }, bandStepFit: 1 },
  variants: [
    {
      when: { markChannel: 'position' },
      then: { structure: { grid: { measure: 'quiet', category: 'quiet', style: 'dashed', dash: [5, 5] } } },
      because: 'Line and area graphs rule both directions (“lightening grids”); column graphs rule only across the value axis.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Shared axis styling from the templates: heavy blue-grey axes, dashed grid, titles on both axes.

const axisX = (title: string, extra: Record<string, unknown> = {}) => ({
  title, domain: true, domainColor: AXIS, domainWidth: 2.5, ticks: false, grid: false, labelAngle: 0,
  labelFont: RUBIK, labelFontSize: 13, labelColor: INK, labelPadding: 8,
  titleFont: RUBIK, titleFontSize: 14, titleFontWeight: 'normal', titleColor: INK, titlePadding: 18, ...extra,
});
const axisY = (title: string, extra: Record<string, unknown> = {}) => ({
  title, domain: true, domainColor: AXIS, domainWidth: 2.5, ticks: false, grid: true, gridColor: GRID, gridDash: [5, 5],
  labelFont: RUBIK, labelFontSize: 13, labelColor: INK, labelPadding: 8,
  titleFont: RUBIK, titleFontSize: 14, titleFontWeight: 'normal', titleColor: INK, titlePadding: 12, ...extra,
});
const centredTitle = (text: string) => ({ text, anchor: 'middle', font: RUBIK, fontSize: 24, fontWeight: 'normal', color: INK, offset: 14 });

// ---------------------------------------------------------------------------
// Signature: the column graph template.

const PROVINCES = [
  ['ON', 15.6], ['QC', 8.9], ['BC', 5.5], ['AB', 4.7], ['MB', 1.5], ['SK', 1.2], ['NS', 1.1],
].map(([Province, v]) => ({ Province: Province as string, 'Population (millions)': v as number }));

function columnsExpected() {
  const x = { field: 'Province', type: 'nominal', sort: null, axis: axisX('Province'), scale: { paddingInner: 0.33, paddingOuter: 0.3 } };
  const y = { field: 'Population (millions)', type: 'quantitative', scale: { domain: [0, 18] }, axis: axisY('Population (millions)', { values: [0, 3, 6, 9, 12, 15, 18] }) };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: centredTitle('Population of the Largest Provinces'),
    width: W,
    height: 200,
    data: { values: PROVINCES },
    encoding: { x, y },
    layer: [
      { mark: { type: 'bar', color: MINT } },
      { mark: { type: 'text', baseline: 'bottom', dy: -4, font: RUBIK, fontSize: 13, color: INK }, encoding: { text: { field: 'Population (millions)', type: 'quantitative', format: '.1f' } } },
    ],
  };
}

const provincesFlint = () => flintInput(theme, {
  chartType: 'Bar Chart',
  data: PROVINCES,
  semantic_types: { Province: 'Category', 'Population (millions)': 'Quantity' },
  encodings: { x: 'Province', y: 'Population (millions)' },
  title: 'Population of the Largest Provinces',
});

// ---------------------------------------------------------------------------
// Negative bars: the same colour at 60% opacity.

function negativeExpected() {
  const x = { field: 'Decade', type: 'ordinal', axis: axisX('Decade', { labelAngle: -45, labelAlign: 'right' }), scale: { paddingInner: 0.33 } };
  const y = { field: 'Anomaly (°C)', type: 'quantitative', scale: { domain: [-0.4, 1.2] }, axis: axisY('Temperature anomaly (°C)', { values: [-0.4, 0, 0.4, 0.8, 1.2] }) };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: centredTitle('Global Temperature Anomaly by Decade'),
    width: W,
    height: 200,
    data: { values: ANOMALY },
    encoding: { x, y },
    layer: [
      { mark: { type: 'bar', color: SLATE }, encoding: { opacity: { condition: { test: "datum['Anomaly (°C)'] < 0", value: 0.6 }, value: 1 } } },
      { transform: [{ filter: "datum['Anomaly (°C)'] >= 0" }], mark: { type: 'text', baseline: 'bottom', dy: -3, fontSize: 11, color: INK }, encoding: { text: { field: 'Anomaly (°C)', type: 'quantitative', format: '.2f' } } },
      { transform: [{ filter: "datum['Anomaly (°C)'] < 0" }], mark: { type: 'text', baseline: 'top', dy: 3, fontSize: 11, color: INK }, encoding: { text: { field: 'Anomaly (°C)', type: 'quantitative', format: '.2f' } } },
    ],
  };
}

// ---------------------------------------------------------------------------
// Run chart: three series told apart by hollow marker shape as well as colour.

const DAYS = ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'];
const CHANNELS = ['Online', 'Phone', 'In person'];
const SHAPES = ['triangle-up', 'square', 'circle'];
const RUNS: Record<string, number[]> = {
  Online: [40, 40, 30, 10, 15, 15, 24],
  Phone: [30, 20, 25, 10, 30, 30, 30],
  'In person': [20, 30, 20, 20, 40, 40, 30],
};
const REQUESTS = DAYS.flatMap((Day, i) => CHANNELS.map((Channel) => ({ Day, Channel, 'Requests (thousands)': RUNS[Channel][i] })));

function runExpected(o: { tooltip?: boolean } = {}) {
  const x = { field: 'Day', type: 'ordinal', sort: DAYS, axis: axisX('Day of the week', { grid: true, gridColor: GRID, gridDash: [5, 5] }) };
  const y = { field: 'Requests (thousands)', type: 'quantitative', scale: { domain: [0, 50] }, axis: axisY('Requests (thousands)', { values: [0, 10, 20, 30, 40, 50] }) };
  const yAt = { datum: 40, type: 'quantitative', scale: y.scale, axis: y.axis };
  const color = { field: 'Channel', type: 'nominal', scale: { domain: CHANNELS, range: SERIES }, legend: null };
  const layers: Record<string, unknown>[] = [
    { mark: { type: 'line', strokeWidth: 2 }, encoding: { x, y, color } },
    {
      mark: { type: 'point', filled: false, fill: '#FFFFFF', size: 110, strokeWidth: 2, opacity: 1 },
      encoding: { x, y, color, shape: { field: 'Channel', type: 'nominal', scale: { domain: CHANNELS, range: SHAPES }, legend: null } },
    },
  ];
  if (o.tooltip) {
    const at = { x: { datum: 'Tues', type: 'ordinal' }, y: yAt };
    layers.push(
      { data: { values: [{}] }, mark: { type: 'rect', color: '#4C4C4C', cornerRadius: 2, xOffset: 16, x2Offset: 78, yOffset: -11, y2Offset: 11 }, encoding: { ...at, x2: { datum: 'Tues' }, y2: { datum: 40 } } },
      { data: { values: [{}] }, mark: { type: 'point', shape: 'triangle-left', filled: true, color: '#4C4C4C', size: 60, xOffset: 13, opacity: 1 }, encoding: at },
      { data: { values: [{}] }, mark: { type: 'text', align: 'left', dx: 22, fontSize: 11, color: '#FFFFFF', font: NUNITO, text: '(40, Tues)' }, encoding: at },
    );
  }
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: centredTitle('Service Requests by Channel'),
    width: W,
    height: 200,
    data: { values: REQUESTS },
    layer: layers,
  };
}

const runFlint = () => flintInput(theme, {
  chartType: 'Line Chart',
  data: REQUESTS,
  semantic_types: { Day: 'Category', Channel: 'Category', 'Requests (thousands)': 'Quantity' },
  encodings: { x: 'Day', y: 'Requests (thousands)', color: 'Channel' },
  title: 'Service Requests by Channel',
});

const marker = (shape: string, color: string) => {
  const glyph = shape === 'triangle-up'
    ? `<path d="M15 3 L21 13 L9 13 Z" fill="#fff" stroke="${color}" stroke-width="2"/>`
    : shape === 'square'
      ? `<rect x="10" y="3.5" width="10" height="10" fill="#fff" stroke="${color}" stroke-width="2"/>`
      : `<circle cx="15" cy="8.5" r="5" fill="#fff" stroke="${color}" stroke-width="2"/>`;
  return `<svg width="30" height="17" viewBox="0 0 30 17"><line x1="0" y1="8.5" x2="30" y2="8.5" stroke="${color}" stroke-width="2"/>${glyph}</svg>`;
};

const legendCard = `<div style="margin:6px 14px 12px;padding:16px 20px;background:#fff;border-radius:4px;box-shadow:0 0 5px rgba(0,0,0,0.15);font-family:${NUNITO};color:${INK}">`
  + '<div style="font-size:18px;margin-bottom:8px">Legend</div>'
  + `<div style="display:flex;gap:28px;font-size:16px;align-items:center">${CHANNELS.map((c, i) => `<span style="display:flex;align-items:center;gap:10px">${marker(SHAPES[i], SERIES[i])}${c}</span>`).join('')}</div></div>`;

// ---------------------------------------------------------------------------
// The raw data table that must accompany every chart.

const dataTable = `<div style="margin:10px 14px 12px;font-family:${NUNITO};color:${INK}">`
  + `<div style="font-family:${RUBIK};font-size:18px;font-weight:500;letter-spacing:0.5px;margin-bottom:8px">Population of the Largest Provinces</div>`
  + '<table style="border-collapse:collapse;width:100%;font-size:13px">'
  + `<thead><tr><th style="text-align:left;padding:6px 10px;border-bottom:2px solid ${AXIS}">Province</th><th style="text-align:right;padding:6px 10px;border-bottom:2px solid ${AXIS}">Population (millions)</th></tr></thead><tbody>`
  + PROVINCES.map((row, i) => `<tr style="background:${i % 2 ? '#F2F5F6' : '#fff'}"><td style="padding:5px 10px;border-bottom:1px solid ${AXIS}">${row.Province}</td><td style="text-align:right;padding:5px 10px;border-bottom:1px solid ${AXIS}">${row['Population (millions)'].toFixed(1)}</td></tr>`).join('')
  + '</tbody></table></div>';

// ---------------------------------------------------------------------------
// Area: the line's colour at 15% opacity, hollow markers, both grids.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const VISITS = [20, 25.3, 22.2, 26.4, 24.4, 10.5, 25, 35.2, 31, 26.4, 16, 30.4].map((v, i) => ({ Month: MONTHS[i], 'Visits (thousands)': v }));

function areaExpected() {
  const x = { field: 'Month', type: 'ordinal', sort: MONTHS, scale: { padding: 0 }, axis: axisX('Month', { grid: true, gridColor: GRID, gridDash: [5, 5] }) };
  const y = { field: 'Visits (thousands)', type: 'quantitative', scale: { domain: [0, 40] }, axis: axisY('Visits (thousands)', { values: [0, 10, 20, 30, 40] }) };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: centredTitle('Monthly Visits to the Service Portal'),
    width: W,
    height: 190,
    data: { values: VISITS },
    encoding: { x, y },
    layer: [
      { mark: { type: 'area', color: SLATE, opacity: 0.15 } },
      { mark: { type: 'line', color: SLATE, strokeWidth: 2 } },
      { mark: { type: 'point', filled: false, fill: '#fff', color: SLATE, size: 30, strokeWidth: 2, opacity: 1 } },
    ],
  };
}

const canada: StyleGuideTheme = {
  id: 'gov-canada',
  org: 'Government of Canada — Aurora Design System (GCcollab / GCTools) data visualization',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the Aurora data pages (design.gccollab.ca) and their template images. Rubik is not loaded on this page, so titles and axes fall back to Nunito Sans — the guide’s own body and legend face. The guide prescribes no palette (“any colour … so long as it meets contrast requirements”), so the series inks are the ones its templates use: mint `#55c0a3` for a single series, then slate `#477c8e`, light green `#ade18d`, teal `#43bdbc`.',
    'Stated directly: a centred, title-case regular title; both axes always titled with the unit in the title; heavy `#96A8B2` axis lines with no ticks; light `#E0E0E0` dashed gridlines — across the value axis for columns and in both directions for lines and areas (a `variants` entry on `markChannel: "position"`); bars twice as wide as their gaps with square tops; value labels beside every bar; 2px straight lines with hollow markers and a redundant shape per series; area fill at 15%; the key at the side. Type sizes follow the templates (24px title, 14px axis titles); the guide’s 28pt / 21pt are its page headings.',
    'Not stated: negative bars as the same colour at 60% opacity; the legend as a white shadowed card titled “Legend”; the raw data table that must accompany every chart; the dark tooltip with its pointer; lowercase money abbreviations (`$1.2k`). See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look: the column graph template',
      kind: 'visual-quality',
      severity: 'medium',
      observed: "Close: with `bandStepFit: 1` and `line: \"full\"` Flint draws a centred title, mint columns with values above, dashed horizontal gridlines, heavy blue-grey axes and both axis titles. It ends the axis at 20 rather than 18 and sets the x title tight under the labels. (With the default band step, and with `line: \"emphasised\"`, Flint had squeezed the seven columns into 150px, truncated “ON” and “MB” to “O…”/“…”, dropped every value label and drawn the axes in near-black.)",
      probe: 'signature',
      rule: 'A centred title-case title; flat mint columns twice as wide as the gaps between them; a value beside every column; light dashed horizontal gridlines; heavy blue-grey y and x axis lines, no tick marks; a rotated y title and a centred x title, both always present, with the unit in the y title; the value axis running one increment past the data.',
      current: 'The theme states all of this except the extra increment. See whether Flint centres the title, keeps both titles while printing values, and draws the axes heavy.',
      expected: 'Seven provinces as the template draws them.',
      flint: provincesFlint(),
      expectedSpec: columnsExpected(),
    },
    {
      id: 'negative-opacity',
      title: 'Negative bars: the same colour at 60% opacity',
      kind: 'expressiveness',
      severity: 'high',
      observed: "Flint draws every decade in the same mint at full strength, prints no values (the labels do not fit its narrow bands), turns the decades −45° and breaks the title onto two lines. Expected: slate bars with the three cool decades at 60% opacity, values above and below, the axis titled “Temperature anomaly (°C)”.",
      probe: 'per-mark-palette',
      rule: '“Negative bars should use the same colour but at 60% opacity.” One colour per variable — the sign is shown by the lighter tint and the bar’s direction, not by a second hue.',
      current: 'ThemeSpec can colour signed values by `status` inks, by `diverging` or by `categorical`, all of which change the hue. There is no way to say “same ink, lower opacity below zero”.',
      expected: 'Decade anomalies in slate, the three cool decades at 60%, values above and below the bars.',
      proposal: '`ink.series.selection.signed: "opacity"` with `marks.negativeOpacity: 0.6` (or `status.negative: { sameAsPositive: true, opacity: 0.6 }`).',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: ANOMALY.map(({ Decade, 'Anomaly (°C)': v }) => ({ Decade, 'Anomaly (°C)': v })),
        semantic_types: { Decade: 'Category', 'Anomaly (°C)': { semanticType: 'Quantity', unit: '°C' } },
        encodings: { x: 'Decade', y: 'Anomaly (°C)' },
        title: 'Global Temperature Anomaly by Decade',
      }),
      expectedSpec: negativeExpected(),
    },
    {
      id: 'marker-shapes',
      title: 'Each line carries its own hollow marker shape',
      kind: 'realization',
      severity: 'high',
      observed: "Flint puts the shapes in the key (circle, square, triangle — assigned alphabetically, not in series order) but not on the lines: the vertex points compile as unfilled marks with a white stroke, so each reading shows only as a small white break in the line. It also re-sorts the days as “Mon, Wed, Fri, Sat, Sun, Tues, Thurs” — the guide’s own abbreviations Tues/Thurs are not recognised as weekdays and fall to the end. Expected: Mon–Sun in order with hollow triangles, squares and circles in the series colours.",
      probe: 'redundant-encoding',
      rule: '“Using different shapes for data points will also help distinguish multiple variables”: series 1 hollow triangles, series 2 hollow squares, series 3 hollow circles, white-filled with a 2px outline in the series colour; never more than three lines.',
      current: 'The theme asks for a dot at every reading (`geometry.point.presence: "full"`, `fill: "hollow"`) and for shape as a redundant channel (`marks.redundantEncoding: "always"`, `redundantChannels: ["shape"]`). The question is whether Flint draws them.',
      expected: 'Three channels Mon–Sun with hollow triangles, squares and circles.',
      proposal: 'Realise `redundantChannels: ["shape"]` on line charts as a point layer with a `shape` scale (triangle, square, circle…), and let a theme name the shape order (`marks.shapes: ["triangle-up", "square", "circle"]`).',
      flint: runFlint(),
      expectedSpec: runExpected(),
    },
    {
      id: 'legend-card',
      title: 'The key is a white card titled “Legend”, with line-and-marker swatches',
      kind: 'expressiveness',
      severity: 'medium',
      observed: "Flint’s key is a plain list at the right with marker-only swatches. Expected: a white, rounded, softly shadowed card under the chart titled “Legend”, each entry a short line through its hollow marker.",
      probe: 'legend-swatch',
      rule: 'Legend card: a white rectangle, 4px radius, a drop shadow at 15% opacity and 5px blur, 20×16px padding; “Legend” in Nunito Sans 18px; items 16px, each with a short line through the series’ hollow marker. At the side by default, at the bottom with a secondary axis; never for a single series.',
      current: 'ThemeSpec has `legend.placement`, `direction`, `title` and `swatch: "auto"` only — no container, no fixed title text, no line-plus-marker swatch.',
      expected: 'The run chart with its key as the guide’s bottom-aligned card.',
      proposal: '`legend.container: { surface, radius, shadow, padding }`, `legend.heading: "Legend"`, `legend.swatch: "lineWithMarker"`.',
      flint: runFlint(),
      expectedSpec: runExpected(),
      expectedFrame: { footerHtml: legendCard },
    },
    {
      id: 'data-table',
      title: 'Every chart comes with its raw data table',
      kind: 'chart-spec',
      severity: 'medium',
      observed: "Flint draws the chart alone. Expected: the same columns followed by the striped table with a 2px header rule and 1px row rules in #96a8b2.",
      probe: 'data-table',
      rule: '“A simple data table, or other ways of viewing the raw data, should be available somewhere on the page.” Tables: Heading 3 title, a 2px `#96a8b2` rule under the header, 1px row rules, striped rows `#F2F5F6`.',
      current: 'Flint emits a chart; there is no slot asking for the table alternative and no table styling in the theme.',
      expected: 'The column chart with the table of its values underneath.',
      proposal: '`chart_spec.dataTable: "below" | "toggle"` with a `table` block in the theme (header rule, row rule, stripe), emitted as accessible HTML beside the SVG.',
      flint: provincesFlint(),
      expectedSpec: columnsExpected(),
      expectedFrame: { footerHtml: dataTable },
    },
    {
      id: 'area-fill',
      title: 'Area at 15% of the line colour, hollow dots, grid both ways',
      kind: 'realization',
      severity: 'low',
      observed: "Flint fills the area at 15% but in the single-series mint, with no edge line (`area.edge: \"full\"` is not drawn), no markers and no vertical gridlines, and turns the months −45°. In the gallery the stacked electricity area at 15% is washed out to near-invisible bands. Expected: the slate line over a 15% slate fill, small hollow circles, dashed gridlines both ways, flat month labels.",
      probe: 'area-edge',
      rule: '“Area graphs should be filled in with the same colour as the line, but at 15% opacity”; the line keeps small hollow markers; dashed gridlines in both directions.',
      current: 'Stated as `geometry.area: { opacity: 0.15, edge: "full" }`, hollow points and a both-ways grid variant for position marks.',
      expected: 'The guide’s area template with twelve months.',
      flint: flintInput(theme, {
        chartType: 'Area Chart',
        data: VISITS,
        semantic_types: { Month: 'Category', 'Visits (thousands)': 'Quantity' },
        encodings: { x: 'Month', y: 'Visits (thousands)' },
        title: 'Monthly Visits to the Service Portal',
      }),
      expectedSpec: areaExpected(),
    },
    {
      id: 'dark-tooltip',
      title: 'Tooltip: a small dark label with a pointer, “(value, category)”',
      kind: 'product-ui',
      severity: 'low',
      observed: "No hover state in the static Flint panel (and the same mis-sorted days and missing markers as above). Expected: the small #4c4c4c label “(40, Tues)” with its left-pointing notch beside Online’s Tuesday triangle.",
      probe: 'tooltip-style',
      rule: 'Tooltips only when necessary; the template’s is a small dark-grey (`#4c4c4c`) box with white text “(40, Tues)” and a left-pointing notch beside the hovered marker.',
      current: 'Only `interaction.tooltipFormat`; Flint’s tooltip is Vega’s default light box listing field names and values.',
      expected: 'The run chart with the tooltip pinned beside Online’s Tuesday triangle.',
      proposal: '`interaction.tooltip: { surface: "#4c4c4c", text: "#fff", pointer: true, template: "({y}, {x})" }`.',
      flint: runFlint(),
      expectedSpec: runExpected({ tooltip: true }),
    },
    {
      id: 'money-abbreviations',
      addressed: { stage: 'A6', note: '`compact: { style: "lower", types: ["Amount"], threshold: 1000 }` — lower-case k / m / b, on currency only (A6).' },
      title: 'Money abbreviated with lowercase suffixes: $1.2k, $3.4m, $6.2b',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'number-format',
      rule: '“Standard money abbreviations $1.2k, $3.4m, $6.2b”; avoid abbreviations otherwise; round-number increments; days abbreviated Mon, Tues, Wed, Thurs.',
      current: '`annotation.numberFormat.thousands: "suffix"` picks SI suffixes (`k`, `M`, `G`) — capital M and G for millions and billions, and no currency-specific rule.',
      expected: 'Lowercase `k / m / b` on currency only.',
      proposal: '`annotation.numberFormat.suffixes: { thousand: "k", million: "m", billion: "b" }`, applied when the semantic type is a currency.',
    },
  ],
};

export default canada;
