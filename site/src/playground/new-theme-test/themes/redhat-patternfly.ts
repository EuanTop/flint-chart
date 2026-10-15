import type { ThemeSpec } from 'flint-chart';
import research from '../research/redhat-patternfly.json';
import { cardProbe, flintInput, groupedProbe, MEDALS, tooltipProbe, UNEMPLOYMENT } from '../probes';
import { houseConfig, titled, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Red Hat Text', RedHatText, 'Noto Sans', Helvetica, Arial, sans-serif";
const TITLE_FONT = "'Red Hat Display', RedHatDisplay, 'Noto Sans', Helvetica, Arial, sans-serif";
const TEXT = '#1F1F1F';
const TICK_TEXT = '#383838';
const MUTED = '#707070';
const LINE = '#E0E0E0';

// Hue families, shades 100 → 500.
const BLUE = ['#92C5F9', '#4394E5', '#0066CC', '#004D99', '#003366'];
const GREEN = ['#AFDC8F', '#87BB62', '#63993D', '#3D7317', '#204D00'];
const TEAL = ['#9AD8D8', '#63BDBD', '#37A3A3', '#147878', '#004D4D'];
const PURPLE = ['#B6A6E9', '#876FD4', '#5E40BE', '#3D2785', '#21134D'];
const YELLOW = ['#FFE072', '#FFCC17', '#DCA614', '#B98412', '#96640F'];
const ORANGE = ['#F8AE54', '#F5921B', '#CA6C0F', '#9E4A06', '#732E00'];
const RED_ORANGE = ['#F89B78', '#F4784A', '#F0561D', '#B1380B', '#731F00'];
/** Within a family: base (300) → lightest (100) → darkest (500) → 200 → 400. */
const familyOrder = (f: string[]) => [f[2], f[0], f[4], f[1], f[3]];

/** The react-charts default, `multi-color-unordered`, ColorScale 100–1200. */
const MULTI_UNORDERED = ['#0066CC', '#DCA614', '#63993D', '#5E40BE', '#CA6C0F', '#37A3A3', '#C7C7C7', '#92C5F9', '#96640F', '#AFDC8F', '#21134D', '#F8AE54'];

const t: HouseTokens = {
  font: FONT,
  titleFont: TITLE_FONT,
  text: TEXT,
  muted: TICK_TEXT,
  grid: null,
  axis: LINE,
  background: '#FFFFFF',
  palette: MULTI_UNORDERED,
  highlight: BLUE[2],
  context: '#C7C7C7',
  titleSize: 18,
  titleWeight: 500,
  subtitleSize: 14,
  subtitleColor: MUTED,
  labelSize: 12,
  sourceSize: 12,
  lineWidth: 2,
  legendOrient: 'right',
};

const theme: ThemeSpec = {
  id: 'redhat-patternfly',
  label: 'Red Hat PatternFly',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: TEXT, secondary: TICK_TEXT, muted: MUTED, inverse: LINE },
    structure: { axis: LINE, grid: LINE, frame: LINE, rule: '#C7C7C7' },
    series: {
      single: BLUE[2],
      categorical: MULTI_UNORDERED.slice(0, 6),
      categoricalExtended: MULTI_UNORDERED,
      overflow: '#C7C7C7',
      sequential: { stops: BLUE, space: 'lab' },
      // Blue means success and red-orange failure; red-orange is reserved for that.
      status: { positive: BLUE[2], negative: RED_ORANGE[2], neutral: '#C7C7C7' },
      selection: { signed: 'categorical', statusUse: 'thresholdOnly', partToWhole: 'categorical' },
    },
    accent: BLUE[2],
  },
  type: {
    headline: { family: TITLE_FONT, size: 18, weight: 'medium', color: TEXT },
    deck: { family: FONT, size: 14, color: MUTED },
    axisLabel: { family: FONT, size: 12, color: TICK_TEXT },
    axisTitle: { family: FONT, size: 14, weight: 'regular', color: TEXT },
    keyLabel: { family: FONT, size: 14, color: TEXT },
    valueLabel: { family: FONT, size: 12, color: TEXT },
    display: { family: TITLE_FONT, size: 22, weight: 'medium', color: TEXT },
  },
  structure: {
    axis: {
      // Victory's 5px tick is the schema's `long` (short = 2px, medium = 3px, long = 5px).
      categorical: { line: 'full', lineWeight: 1, ticks: 'full', tickLength: 'long', tickDirection: 'outward' },
      measure: { line: 'full', lineWeight: 1, ticks: 'full', tickLength: 'long', tickDirection: 'outward' },
    },
    // Gridlines are off by default (Victory showGrid=false); when on, 1px #e0e0e0.
    grid: { measure: 'omit', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: {
    bandFraction: 0.3,
    strokeWeight: 2,
    strokeCap: 'round',
    strokeJoin: 'round',
    interpolation: 'linear',
    cornerRadius: 0,
    separator: { presence: 'hairline', width: 1, source: 'surface' },
    slice: { gap: 3, gapStyle: 'rule' },
  },
  geometry: {
    band: { fraction: 0.3, cornerRadius: 0 },
    line: { width: 2, cap: 'round', join: 'round' },
    point: { presence: 'omit', size: 28 },
    area: { opacity: 0.3, edge: 'full', edgeWidth: 2 },
    arc: { gap: 3, gapStyle: 'rule' },
  },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['right', 'bottom'], direction: 'vertical', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'always', axisTitlePlacement: 'rotated', unitsInAxisTitle: true },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' }, density: 'airy', bandStepFit: 1 },
};

// The guide's vertical bar specimen (vertical-bar-chart.png), values read off the image.
const SALES = [
  ['RHEL', 49], ['EAP', 25], ['OpenShift', 62], ['Fuse', 44], ['AMQ', 34], ['CloudForms', 55],
].map(([Product, Sales]) => ({ Product: Product as string, Sales: Sales as number }));

const pfAxis = { domain: true, domainColor: LINE, ticks: true, tickColor: LINE, tickSize: 5, labelColor: TICK_TEXT, labelFontSize: 12, titleColor: TEXT, titleFontSize: 14, titleFontWeight: 'normal', labelPadding: 4 };

function signatureExpected() {
  return titled(t, {
    data: { values: SALES },
    mark: { type: 'bar', color: BLUE[2], width: 14 },
    encoding: {
      x: { field: 'Product', type: 'nominal', sort: null, title: 'Product', axis: { ...pfAxis, labelAngle: 0, titlePadding: 14 } },
      y: { field: 'Sales', type: 'quantitative', title: 'Sales', scale: { domain: [0, 100] }, axis: { ...pfAxis, values: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], grid: false, domain: true, titlePadding: 14 } },
    },
  }, { title: 'Sales by product', height: 220 });
}

const GOLD = MEDALS.filter((row) => row.Medal === 'Gold' && ['United States', 'China', 'Japan'].includes(row.Country));

function thinBarExpected() {
  return titled(t, {
    data: { values: GOLD },
    mark: { type: 'bar', color: BLUE[2], width: 10 },
    encoding: {
      x: { field: 'Country', type: 'nominal', sort: null, title: 'Country', axis: { ...pfAxis, labelAngle: 0, titlePadding: 12 } },
      y: { field: 'Count', type: 'quantitative', title: 'Gold medals', axis: { ...pfAxis, grid: false, titlePadding: 12 } },
    },
  }, { title: 'Gold medals, Paris 2024' });
}

// PatternFly's own donut example: "100 Pets".
const PETS = [{ Pet: 'Cats', Count: 35 }, { Pet: 'Dogs', Count: 55 }, { Pet: 'Birds', Count: 10 }];
const PET_COLOURS = MULTI_UNORDERED.slice(0, 3);

function donutExpected() {
  const domain = { domain: PETS.map((p) => p.Pet), range: PET_COLOURS };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), legend: { disable: true }, title: { ...(houseConfig(t).title as object), font: TITLE_FONT, fontWeight: 500 } },
    title: { text: 'Pets adopted this year' },
    hconcat: [
      {
        width: 200,
        height: 200,
        data: { values: PETS },
        layer: [
          {
            mark: { type: 'arc', innerRadius: 72, outerRadius: 92, stroke: '#FFFFFF', strokeWidth: 3 },
            encoding: { theta: { field: 'Count', type: 'quantitative', stack: true }, color: { field: 'Pet', type: 'nominal', sort: null, scale: domain } },
          },
          { data: { values: [{}] }, mark: { type: 'text', text: '100', font: TITLE_FONT, fontSize: 24, fontWeight: 500, color: TEXT, dy: -8 }, encoding: { x: { value: 100 }, y: { value: 100 } } },
          { data: { values: [{}] }, mark: { type: 'text', text: 'Pets', font: FONT, fontSize: 14, color: MUTED, dy: 14 }, encoding: { x: { value: 100 }, y: { value: 100 } } },
        ],
      },
      {
        width: 110,
        height: 200,
        data: { values: PETS.map((p, i) => ({ ...p, i })) },
        layer: [
          { mark: { type: 'square', size: 120, opacity: 1 }, encoding: { x: { value: 6 }, y: { field: 'i', type: 'ordinal', axis: null, scale: { paddingOuter: 3 } }, color: { field: 'Pet', type: 'nominal', scale: domain } } },
          { mark: { type: 'text', align: 'left', fontSize: 14, color: TEXT }, encoding: { x: { value: 20 }, y: { field: 'i', type: 'ordinal' }, text: { field: 'label' } }, transform: [{ calculate: "datum.Pet + ': ' + datum.Count", as: 'label' }] },
        ],
      },
    ],
    spacing: 16,
  };
}

// Test results: success is hatched so the failures stand out.
const SUITES = [
  { Suite: 'Unit', Passed: 96 },
  { Suite: 'Integration', Passed: 88 },
  { Suite: 'End-to-end', Passed: 71 },
];
const RESULTS = SUITES.flatMap(({ Suite, Passed }) => [
  { Suite, Result: 'Passed', 'Share (%)': Passed },
  { Suite, Result: 'Failed', 'Share (%)': 100 - Passed },
]);

function patternExpected() {
  const rows = SUITES.map((s, i) => ({ ...s, i, lo: 2 - i + 0.2, hi: 2 - i + 0.8 }));
  const hatch = rows.flatMap((r) => {
    const lines: Record<string, number>[] = [];
    for (let x = 0; x + 2.6 <= r.Passed; x += 2.2) lines.push({ x, x2: x + 2.6, y: r.hi, y2: r.lo });
    return lines;
  });
  const y = { field: 'lo', type: 'quantitative', title: null, scale: { domain: [-0.1, 3] }, axis: { ...pfAxis, values: [0.5, 1.5, 2.5], labelExpr: "['End-to-end', 'Integration', 'Unit'][floor(datum.value)]", grid: false, ticks: false, domain: true } };
  const x = { field: 'from', type: 'quantitative', title: 'Share of test runs (%)', scale: { domain: [0, 100] }, axis: { ...pfAxis, grid: false, titlePadding: 10 } };
  return titled(t, {
    layer: [
      {
        data: { values: rows },
        transform: [{ calculate: '0', as: 'from' }],
        mark: { type: 'rect', fill: '#FFFFFF', stroke: BLUE[2], strokeWidth: 1 },
        encoding: { x, x2: { field: 'Passed' }, y, y2: { field: 'hi' } },
      },
      {
        data: { values: hatch },
        mark: { type: 'rule', color: BLUE[2], strokeWidth: 1.2, clip: true },
        encoding: { x: { field: 'x', type: 'quantitative' }, x2: { field: 'x2' }, y: { field: 'y', type: 'quantitative' }, y2: { field: 'y2' } },
      },
      {
        data: { values: rows },
        transform: [{ calculate: 'datum.Passed', as: 'from' }],
        mark: { type: 'rect', color: RED_ORANGE[2] },
        encoding: { x: { field: 'from', type: 'quantitative' }, x2: { datum: 100 }, y: { field: 'lo', type: 'quantitative' }, y2: { field: 'hi' } },
      },
      {
        data: { values: [{ v: 0, label: 'Passed', c: BLUE[2] }, { v: 1, label: 'Failed', c: RED_ORANGE[2] }] },
        mark: { type: 'text', align: 'left', fontSize: 14, color: TEXT, dx: 14 },
        encoding: { x: { value: 0 }, y: { value: -16 }, xOffset: { field: 'v', type: 'quantitative', scale: { domain: [0, 1], range: [0, 90] } }, text: { field: 'label' } },
      },
      {
        data: { values: [{ v: 0, c: 'p' }, { v: 1, c: 'f' }] },
        mark: { type: 'square', size: 110, opacity: 1 },
        encoding: {
          x: { value: 4 }, y: { value: -16 },
          xOffset: { field: 'v', type: 'quantitative', scale: { domain: [0, 1], range: [0, 90] } },
          fill: { field: 'c', type: 'nominal', scale: { domain: ['p', 'f'], range: ['#FFFFFF', RED_ORANGE[2]] }, legend: null },
          stroke: { field: 'c', type: 'nominal', scale: { domain: ['p', 'f'], range: [BLUE[2], RED_ORANGE[2]] }, legend: null },
        },
      },
    ],
  }, { title: 'End-to-end tests fail most often', height: 180 });
}

/** The shared tooltip probe, with the flyout opened to the left of the 2020 peak, wide enough for its text, and a pointer. */
function pfTooltip() {
  const probe = tooltipProbe(theme, t, { fill: '#1F1F1F', text: LINE, radius: 6 });
  const spec = probe.expectedSpec as { layer: Record<string, unknown>[] };
  const [line, rule, point, box, when, value] = spec.layer as Record<string, any>[];
  const anchor = box.encoding;
  const flyout = { ...box, mark: { ...box.mark, xOffset: -178, x2Offset: -16, yOffset: -36, y2Offset: 6 } };
  const pointer = { data: box.data, mark: { type: 'point', shape: 'triangle-right', filled: true, size: 90, color: '#1F1F1F', opacity: 1, xOffset: -13, yOffset: -15 }, encoding: { x: anchor.x, y: anchor.y } };
  const shift = (layer: Record<string, any>) => ({ ...layer, mark: { ...layer.mark, dx: -168, font: FONT } });
  return { ...probe, expectedSpec: { ...spec, layer: [line, rule, point, flyout, pointer, shift(when), shift(value)] } };
}

function areaExpected() {
  return titled(t, {
    data: { values: UNEMPLOYMENT },
    mark: { type: 'area', color: BLUE[2], opacity: 0.3, line: { color: BLUE[2], strokeWidth: 2, strokeCap: 'round', strokeJoin: 'round', opacity: 1 } },
    encoding: {
      x: { field: 'Year', type: 'quantitative', title: 'Year', scale: { domain: [2000, 2023], nice: false }, axis: { ...pfAxis, format: 'd', values: [2000, 2005, 2010, 2015, 2020], grid: false, titlePadding: 10 } },
      y: { field: 'Unemployment (%)', type: 'quantitative', title: 'Unemployment (%)', axis: { ...pfAxis, grid: false, domain: true, titlePadding: 10 } },
    },
  }, { title: 'Unemployment rate' });
}

const cardStyle = {
  background: '#FFFFFF',
  boxShadow: '0 0.25rem 0.5rem rgba(41, 41, 41, 0.12)',
  border: `1px solid ${LINE}`,
  borderRadius: 6,
  padding: '18px 18px 10px',
  margin: 10,
};

const patternfly: StyleGuideTheme = {
  id: 'redhat-patternfly',
  org: 'Red Hat — PatternFly',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the v6 chart tokens. Stated directly: light-grey #E0E0E0 1px axis lines with 5px outward ticks on both axes (the guide recommends y ticks), no gridlines by default, 12px #383838 tick labels, 14px key labels, a right-hand untitled key; thin flat bars (`bandFraction: 0.3`, the specimen\'s share of the band) with square corners and a 1px separator between stacked segments; 2px round-capped lines; areas at 30% opacity with a 2px edge; 3px gaps between donut segments; the `multi-color-unordered` default palette, extended to its first twelve; the blue family as the sequential ramp; blue for success and red-orange for failure as status inks.',
    'Approximated: Red Hat Text and Red Hat Display are open-licence but not loaded on this page, so every panel falls back to Noto Sans. Title, subtitle and axis-title sizes are not stated by the guide; the chart font-size tokens (12 / 14 / 18 / 22) are used. The bar width is a fixed 10px in Victory, which the schema can only approximate as a fraction of the band.',
    'Not stated: the colour logic (one hue family per group, each family read base → lightest → darkest → 200 → 400), pattern fills on the de-emphasised portion, the dark tooltip flyout, the card the chart lives in, the donut\'s centre total, and the interactive legend. See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Thin solid blue bars (about 30% of the band) with square tops; a light-grey L of axis lines with short grey ticks on both axes; no gridlines; 12px dark-grey tick labels evenly spaced; a rotated y title on the left and the x title centred below, outside the labels; the title left-aligned above.',
      current: 'Every one of these is stated in the theme: axis lines and 5px ticks `full` in #E0E0E0, grid `omit`, `bandFraction: 0.3`, `bandStepFit: 1` so the bands spread over the axis (without it Flint packed the six bars into a third of the canvas), titles `always` and `rotated`. The labels may turn (`labels.`).',
      expected: 'The guide\'s vertical bar specimen (Sales by product).',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: SALES,
        semantic_types: { Product: 'Category', Sales: 'Quantity' },
        encodings: { x: 'Product', y: 'Sales' },
        title: 'Sales by product',
      }),
      expectedSpec: signatureExpected(),
      observed: 'Close. Thin blue bars at about 30% of their band, the light grey L of axis lines with short ticks, no grid, rotated “Sales” and centred “Product”. Differences: Flint turns all six product names −45° because “CloudForms” does not fit its 60px band (the specimen is drawn at 450px, where they all sit flat); its ruler stops at 60 instead of running to 100 in tens. Both panels fall back to Noto Sans for Red Hat Text/Display. Without `bandStepFit: 1` the first render squeezed the plot to about 150px of the 360px canvas.',
    },
    {
      id: 'bar-width',
      title: 'Bars are a fixed 10px, not a share of the band',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'bar-shape',
      rule: '`barWidth: 10` (chart_bar_Width), “All bars should be the same width, and the spacing between them should be equal” — a bar is 10px whatever the number of categories.',
      current: '`geometry.band.fraction` / `marks.bandFraction` is relative to the band, so a three-bar chart gets bars three times as fat as a ten-bar one, and a grouped chart splits the fraction between the bars of a group. There is no absolute width.',
      expected: 'Three 10px columns standing alone in wide bands.',
      proposal: '`geometry.band.width: 10` (px), with `fraction` as the cap when the band is narrower than that.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: GOLD,
        semantic_types: { Country: 'Country', Count: 'Count' },
        encodings: { x: 'Country', y: 'Count' },
        title: 'Gold medals, Paris 2024',
      }),
      expectedSpec: thinBarExpected(),
      observed: 'Flint: three bars about 30px wide (30% of a 105px band). Expected: three 10px columns standing in wide equal gaps, as Victory draws them at any count. The opposite failure shows in the grouped panel below and the gallery’s medals tile: three bars sharing 30% of a band come out about 2px wide each — hairlines, not bars.',
    },
    {
      id: 'hue-family-order',
      title: 'Grouped series take shades of one hue family',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'hue-family-order',
      rule: '“The chart palette begins with the base hue, then uses the lightest, darkest, second lightest, and second darkest hues.” Grouped variables get one family per group, families in the order blue, green, teal, purple, yellow, orange, red-orange, black.',
      current: 'ThemeSpec has flat lists (`categorical`, `categoricalExtended`) and ramps; it cannot say “a family, read in this order” or “one family per group”. Flint hands the medals the first three unordered inks.',
      expected: 'Gold, Silver, Bronze as base / lightest / darkest purple, as in the guide\'s “Magnitude” bar-chart thumbnail.',
      proposal: '`ink.series.families: { blue: [...5], green: [...] }` with `ink.series.familyOrder: [2, 0, 4, 1, 3]` and `selection.grouped: "familyPerGroup"`, so a series nested in a group takes a shade of its group\'s hue.',
      ...groupedProbe(theme, { ...t, barCorner: 0 }, { palette: familyOrder(PURPLE), padding: 0.35 }),
      observed: 'Flint: Gold blue, Silver yellow, Bronze green — three unrelated families — and each bar a 2px sliver (see bar width). Expected: base #5E40BE, lightest #B6A6E9, darkest #21134D, the purple trio of the guide’s “Magnitude” thumbnail, as solid grouped columns.',
    },
    {
      id: 'tooltip-style',
      title: 'Dark tooltip flyout with a pointer',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'tooltip-style',
      rule: 'Tooltips are dark flyouts (#1F1F1F) with light text (#E0E0E0), corner radius 6, padding 8, a 10px pointer, “Name: value”.',
      current: 'ThemeSpec has only `interaction.tooltipFormat`; the tooltip\'s fill, text, radius and pointer are left to the host\'s default (a light Vega tooltip).',
      expected: 'A near-black rounded flyout over the hovered point, light text.',
      proposal: '`interaction.tooltip: { fill, text, radius, padding, pointer }`, realised through the vega-tooltip theme.',
      ...pfTooltip(),
      observed: 'Flint’s panel is static and shows no tooltip at all; hovering in the live page opens the default light Vega tooltip. Expected: the near-black rounded flyout with a pointer, “2020 / ● Unemployment 8.1%” in #E0E0E0 over the 2020 point. Flint’s tick labels on this line chart are shrunk to about 9px, below the 12px the theme states.',
    },
    {
      id: 'card',
      title: 'The chart lives in a card whose header is the title',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'card-container',
      rule: '“If a chart lives in a card, the title of that chart will be placed on the header of that card instead of the chart.” Cards are white with a soft shadow on a light-grey page.',
      current: 'The title block is drawn inside the chart; ThemeSpec has no card container, header or elevation.',
      expected: 'A white card with a soft shadow; the title and context in the card header; the chart below with no title of its own.',
      proposal: '`layout.container: { kind: "card", padding, radius, elevation, titleInHeader: true }`, realised by the host rather than in Vega-Lite.',
      ...cardProbe(theme, t, { style: cardStyle, header: 'Unemployment rate', meta: 'United States, 2000–2023', actions: true }),
      observed: 'Flint draws the title and deck inside a bare chart on the page. Expected: the same line in a white, softly shadowed card, its header carrying the title and context with a kebab menu, and no title inside the chart.',
    },
    {
      id: 'donut-centre',
      title: 'Donut: total in the centre, values in the key',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'pie-rules',
      rule: 'Donuts carry a big centre label with the total and a grey subtitle (“100 / Pets”); 3px between segments; at most six categories; a legend is required and each item reports its value (“Cats: 35”).',
      current: 'Flint draws the donut with the 3px gap (`geometry.arc.gap`) and a right-hand key. Nothing in the theme asks for the centre total or for values in the key.',
      expected: 'PatternFly\'s basic donut example.',
      proposal: '`annotation.partToWhole: { centre: "total" | "none", centreLabel: "unit" }` using `type.display`, and `legend.values: "inline"`.',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: PETS,
        semantic_types: { Pet: 'Category', Count: 'Count' },
        encodings: { size: 'Count', color: 'Pet' },
        title: 'Pets adopted this year',
      }),
      expectedSpec: donutExpected(),
      observed: 'Flint: the ring with clean 3px gaps and a right-hand key, but an empty centre and round swatches with names only. Expected: “100” large with grey “Pets” beneath in the hole; square swatches with “Cats: 35 / Dogs: 55 / Birds: 10”.',
    },
    {
      id: 'pattern-success',
      title: 'Hatch the de-emphasised portion so failure stands out',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'pattern-fill',
      rule: 'Blue means success, red-orange means failure. “Only use patterns for a single chart portion or type of portion … Do not use patterns for every section of a chart.” Patterns are also the accessibility fix where red-orange and green meet.',
      current: 'No pattern fill in ThemeSpec, and no way to say which category is “success” and which “failure”: the stacked bars take the first two unordered inks (blue and yellow) in data order.',
      expected: 'Passed hatched in blue, Failed solid red-orange.',
      proposal: '`ink.series.status` keyed to declared outcome values (`semantic_types: { Result: { semanticType: "Status", positive: ["Passed"], negative: ["Failed"] } }`) and `marks.pattern: { apply: "positive", style: "diagonal" }`.',
      flint: flintInput(theme, {
        chartType: 'Stacked Bar Chart',
        data: RESULTS,
        semantic_types: { Suite: 'Category', Result: 'Status', 'Share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { y: 'Suite', x: 'Share (%)', color: 'Result' },
        title: 'End-to-end tests fail most often',
      }),
      expectedSpec: patternExpected(),
      observed: 'Flint: Passed solid blue, Failed yellow — the failure reads as the quieter colour and nothing is patterned. Expected: Passed as a blue diagonal hatch on white, Failed solid red-orange, so the eye goes to the failures.',
    },
    {
      id: 'area-edge',
      addressed: { stage: 'M1', note: '`geometry.area.edge` is drawn as a line along the top of each area, stacked bands included, in the area’s own ink (M1).' },
      title: 'The area\'s 2px top line is not drawn',
      kind: 'realization',
      severity: 'medium',
      probe: 'area-edge',
      rule: 'Areas are filled at 30% opacity of the series colour “with a 2px stroke on top” (`--pf-v6-chart-area--Opacity: 30%; --pf-v6-chart-area--stroke--Width: 2`).',
      current: 'Stated as `geometry.area: { opacity: 0.3, edge: "full", edgeWidth: 2 }`. Flint applies the opacity but draws no edge line on the area.',
      expected: 'A pale 30% blue fill with a solid 2px #0066CC line along its top.',
      proposal: 'Realise `geometry.area.edge` as a line layer (or Vega-Lite `line: true` on the area mark) in the series colour at `edgeWidth`.',
      flint: flintInput(theme, {
        chartType: 'Area Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Unemployment rate',
      }),
      expectedSpec: areaExpected(),
      observed: 'Flint: the 30% blue wash with no line on top, so the series reads as a soft shape with no edge. Expected: the same wash under a 2px #0066CC line. The same missing edge shows on the gallery’s stacked area tile and on the Opower house’s 3px-edge area.',
    },
    {
      id: 'heatmap-row-labels',
      addressed: { stage: 'A1', note: 'The row names are never turned for the column names (A1), and the months sit flat.' },
      title: 'Heatmap row names turned diagonally',
      kind: 'realization',
      severity: 'low',
      probe: 'turned-row-labels',
      rule: 'Tick labels are 12px #383838, laid out evenly along the axis; nothing in the guide turns category names on a vertical axis.',
      current: 'In the heatmap gallery tile the city names on the y axis are drawn at −45°, as if they were crowded x labels.',
      expected: 'City names horizontal, right-aligned beside their rows.',
      proposal: 'Never turn y-axis band labels; they already read left to right.',
      observed: 'Gallery, “Average monthly temperature by city”: Singapore … Moscow slanted −45° beside the rows, overlapping each other; the months on x are turned too.',
    },
    {
      id: 'interactive-legend',
      title: 'Interactive legend: hover dims the rest, click hides with an eye-slash',
      kind: 'product-ui',
      severity: 'low',
      probe: 'focus-hover-state',
      rule: '“When a user hovers over a legend label, all other labels and series lower their opacity”; clicking hides the series and replaces its swatch with an eye-slash icon.',
      current: 'Flint offers `legend-toggle` and hover-focus presets in its interaction spec, but ThemeSpec cannot state the house\'s dim opacity or the disabled-swatch icon, so the look of those states is Flint\'s, not PatternFly\'s.',
      expected: 'Other series at reduced opacity on hover; a hidden series\' swatch replaced by an eye-slash glyph and its label greyed.',
      proposal: '`interaction.focus: { dimOpacity }` and `interaction.legendToggle: { hiddenSwatch: "eyeSlash", hiddenLabelInk }`.',
    },
  ],
};

export default patternfly;
