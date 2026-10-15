import type { ThemeSpec } from 'flint-chart';
import research from '../research/cmu.json';
import { BROWSERS, flintInput, GAPMINDER, highlightProbe, signedProbe } from '../probes';
import { houseConfig, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

// Helvetica outside Tableau (Tableau Sans inside it); Arimo/Arial where Helvetica is missing.
const FONT = "Helvetica, 'Helvetica Neue', Arimo, Arial, sans-serif";
const CMU_RED = '#c41230';
const DARK_GRAY = '#4d5051';
const SKY = '#007bc0';
const PEERS = [DARK_GRAY, '#6e6e6e', '#919191', '#b6b6b6', '#dddddd'];
// pt × 4/3, from the web page's table.
const PX = { title: 20, deck: 17, axis: 16, value: 15, note: 16 };

const t: HouseTokens = {
  font: FONT,
  text: '#000000',
  muted: '#3c3c3c',
  grid: '#e1e1e1',
  axis: null,
  background: '#ffffff',
  palette: [CMU_RED, DARK_GRAY, '#1f4c4c', SKY, '#182c4b', '#941120'],
  highlight: CMU_RED,
  context: DARK_GRAY,
  titleSize: PX.title,
  titleWeight: 'bold',
  subtitleSize: PX.deck,
  subtitleColor: '#000000',
  labelSize: PX.axis,
  sourceSize: 12,
  lineWidth: 2.5,
};

const theme: ThemeSpec = {
  id: 'cmu',
  label: 'Carnegie Mellon University',
  ink: {
    surface: { source: 'house', canvas: '#ffffff' },
    text: { primary: '#000000', secondary: '#000000', muted: '#3c3c3c', inverse: '#ffffff' },
    structure: { grid: '#e1e1e1', axis: '#bdbdbd', rule: '#bdbdbd' },
    series: {
      // One colour for every bar; red is kept for CMU itself, so the single ink is Highlands Sky Blue.
      single: SKY,
      // Categorical Core (CMU Red, Dark Gray), then Categorical Secondary.
      categorical: [CMU_RED, DARK_GRAY, '#1f4c4c', SKY, '#182c4b', '#941120'],
      categoricalExtended: [CMU_RED, DARK_GRAY, '#1f4c4c', SKY, '#182c4b', '#941120', '#fdb515', '#719f94', '#a89e82'],
      overflow: '#b6b6b6',
      sequential: { stops: ['#e1eef7', '#9fcbe6', '#5aa5d4', SKY, '#00568a'], space: 'lab' },
      diverging: { stops: [SKY, '#8daacf', '#dddddd', '#e4aa79', '#d87800'], neutral: '#dddddd', space: 'lab' },
      // The PDF's sentiment scale: navy positive, Skibo red negative.
      status: { positive: '#043673', negative: '#941120', neutral: '#f1f1f1' },
      selection: { signed: 'status', statusUse: 'anySigned' },
    },
    accent: CMU_RED,
  },
  type: {
    headline: { family: FONT, size: PX.title, weight: 'bold', color: '#000000' },
    deck: { family: FONT, size: PX.deck, weight: 'regular', color: '#000000' },
    axisLabel: { family: FONT, size: PX.axis, weight: 'regular', color: '#3c3c3c' },
    axisTitle: { family: FONT, size: PX.axis, weight: 'regular', color: '#3c3c3c' },
    keyLabel: { family: FONT, size: PX.axis, color: '#000000' },
    valueLabel: { family: FONT, size: PX.value, weight: 'regular' },
    annotation: { family: FONT, size: PX.note, color: '#000000' },
    footnote: { family: FONT, size: PX.note, color: '#3c3c3c' },
  },
  structure: {
    axis: {
      measure: { line: 'omit', ticks: 'omit', tickLabels: 'sparse' },
      categorical: { line: 'omit', ticks: 'omit' },
    },
    grid: { measure: 'hairline', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'omit',
  },
  marks: { bandFraction: 0.75, strokeWeight: 2.5 },
  geometry: { point: { presence: 'full', size: 40, fill: 'solid' }, line: { width: 2.5 } },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['seriesEnd', 'inline', 'top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'center' },
  dataLabels: { show: 'whenTheyFit', placement: 'atMark', inkMode: 'contrastWithMark' },
  annotation: { axisTitles: 'whenAmbiguous', numberFormat: { thousands: 'separator', precision: 'auto' } },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' } },
};

// The PDF's “CMU Highlight Against Peers” specimen, read off the chart.
const PEER_NAMES = ['CMU', 'Peer1', 'Peer2', 'Peer3', 'Peer4'];
const APPLICATIONS = ([
  ['Jan', [4000, 2500, 3500, 4600, 1200]],
  ['Feb', [3200, 1700, 1200, 3200, 1500]],
  ['Mar', [2200, 1200, 2300, 2700, 1500]],
] as const).flatMap(([Month, values]) => PEER_NAMES.map((Institution, i) => ({ Month, Institution, Applications: values[i] })));

const SIG_TITLE = 'CMU led its peers in February';
const SIG_DECK = 'Applications received by month';

/** The specimen: CMU red, the peers in a dark-to-light grey ladder, a centred key with round swatches, comma-grouped values, no axis lines. */
function signature() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...houseConfig(t),
      legend: { orient: 'top', direction: 'horizontal', title: null, symbolType: 'circle', symbolSize: 180, labelFontSize: PX.axis, labelFont: FONT, labelColor: '#000', columnPadding: 18, offset: 14 },
    },
    title: { text: SIG_TITLE, subtitle: SIG_DECK },
    width: 440,
    height: 220,
    data: { values: APPLICATIONS },
    mark: { type: 'bar' },
    encoding: {
      x: { field: 'Month', type: 'nominal', sort: ['Jan', 'Feb', 'Mar'], scale: { paddingInner: 0.12 }, axis: { title: null, labelAngle: 0, domain: false, ticks: false, labelFontSize: PX.axis, labelColor: '#000' } },
      xOffset: { field: 'Institution', sort: PEER_NAMES, scale: { paddingInner: 0.06 } },
      y: { field: 'Applications', type: 'quantitative', scale: { domain: [0, 5000] }, axis: { title: null, values: [0, 1000, 2000, 3000, 4000, 5000], labelExpr: "format(datum.value, ',')", domain: false, ticks: false, grid: true, gridColor: '#d9d9d9', labelFontSize: PX.axis, labelColor: '#000' } },
      color: { field: 'Institution', type: 'nominal', sort: PEER_NAMES, scale: { domain: PEER_NAMES, range: [CMU_RED, ...PEERS] } },
    },
  };
}

/** Two or three slices at most: the long tail folded into one wedge. */
function fewSlices() {
  const rows = [{ Browser: 'Chrome', Share: 65 }, { Browser: 'Safari', Share: 12 }, { Browser: 'All others', Share: 23 }];
  const order = rows.map((row) => row.Browser);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), legend: { disable: true } },
    title: { text: 'Chrome dominates desktop browsing', subtitle: 'Desktop browser market share, %, 2024' },
    width: 360,
    height: 230,
    data: { values: rows },
    encoding: {
      theta: { field: 'Share', type: 'quantitative', stack: true },
      order: { field: 'Share', type: 'quantitative', sort: 'descending' },
      color: { field: 'Browser', type: 'nominal', sort: order, scale: { domain: order, range: [SKY, DARK_GRAY, '#b6b6b6'] } },
    },
    layer: [
      { mark: { type: 'arc', outerRadius: 100, stroke: '#ffffff', strokeWidth: 1.5 } },
      {
        mark: { type: 'text', radius: 62, fontSize: PX.value, font: FONT, lineHeight: 17 },
        encoding: {
          text: { field: 'label' },
          color: { condition: { test: "datum.Browser === 'All others'", value: '#000000' }, value: '#ffffff' },
        },
        transform: [{ calculate: "[datum.Browser, datum.Share + '%']", as: 'label' }],
      },
    ],
  };
}

/** Scatter plots read from zero on both axes. */
function scatterZero() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig({ ...t, labelSize: 13 }),
    title: { text: 'Richer countries live longer', subtitle: 'Life expectancy, years, by GDP per person, $, 2018' },
    width: 380,
    height: 240,
    data: { values: GAPMINDER },
    mark: { type: 'circle', size: 60, color: SKY, opacity: 0.9 },
    encoding: {
      x: { field: 'GDP per capita', type: 'quantitative', scale: { domain: [0, 120000], zero: true }, axis: { title: null, labelExpr: "format(datum.value, ',')", tickCount: 4, domain: false, ticks: false } },
      y: { field: 'Life expectancy', type: 'quantitative', scale: { domain: [0, 90], zero: true }, axis: { title: null, values: [0, 30, 60, 90], domain: false, ticks: false } },
    },
  };
}

const cmu: StyleGuideTheme = {
  id: 'cmu',
  org: 'Carnegie Mellon University',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch (no `extends`) from the brand site’s data-visualisation page and its Power BI colour-palette PDF. Stated directly: Helvetica; the web page’s type table converted from points (title 15pt bold = 20px, subtitle 13pt = 17px, axis labels 12pt = 16px, data labels 11pt = 15px, notes 12pt = 16px); Categorical Core (CMU Red `#c41230`, Dark Gray `#4d5051`) followed by Categorical Secondary; a single-hue Highlands Sky Blue sequential ramp; the PDF’s blue–grey–orange divergent scale; the PDF’s sentiment scale as status inks (navy positive, Skibo red negative) chosen for signed data; thin light-grey gridlines on the value axis only, no axis lines, no ticks, thinned tick labels; round markers on lines (the PDF’s line examples); direct labels in preference to a key; white value labels over brand colours; comma thousands.',
    'Approximated: the single colour for “one colour for all categories” is not named, so it is Highlands Sky Blue (red stays reserved for CMU). The guide gives two type systems (web page vs Power BI PDF); the web page wins.',
    'Not stated (see the gaps): CMU red against a ladder of greys for peers, the subject of a comparison, the 2–3 slice limit on pies, and the audience rule that internal or financial charts avoid red altogether.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'high',
      probe: 'signature',
      rule: '“CMU Highlight Against Peers”: grouped columns by month, CMU in red `#c41330`, peers stepping from `#4d5051` to `#b6b6b6`; key centred above the plot with round swatches; thin light-grey horizontal gridlines; comma-grouped y labels 0–5,000; no axis lines or titles.',
      current: 'Flint colours the five institutions from the categorical list, so after CMU red and dark grey the peers turn dark green, sky blue and navy — five unrelated hues instead of one colour and a grey ladder.',
      expected: 'The PDF specimen, with a findings headline and deck added per the web page.',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: APPLICATIONS,
        semantic_types: { Month: 'Month', Institution: 'Category', Applications: 'Quantity' },
        encodings: { x: { field: 'Month', sort: ['Jan', 'Feb', 'Mar'] }, y: 'Applications', group: 'Institution' },
        title: SIG_TITLE,
        subtitle: SIG_DECK,
        baseSize: { width: 440, height: 240 },
      }),
      expectedSpec: signature(),
      observed: 'Flint (left): CMU red and Peer1 dark grey are right, then Peer2 dark green, Peer3 sky blue, Peer4 navy — Peer3 in bright blue is the bar the eye goes to, not CMU. It also adds a rotated “Applications” y title, square swatches and near-invisible gridlines. Expected (right): CMU red against a dark-to-light grey ladder, round swatches centred above, comma-grouped 0–5,000 labels.',
    },
    {
      id: 'highlight-cmu',
      title: 'CMU in red, every other value in dark grey',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'highlight',
      rule: '“When comparing CMU to other institutions … use CMU Red to represent CMU. Use Dark Gray to represent all other values.”',
      current: 'The chart spec cannot say which category is the subject, and the theme has no emphasis/context pair; bars take `ink.series.single`.',
      expected: 'The subject in CMU red, the rest dark grey `#4d5051`.',
      proposal: '`chart_spec.emphasis: { field, values }` with `ink.series.emphasis` / `ink.series.context`, and `ink.series.contextLadder` for several context series (the peer greys).',
      ...highlightProbe(theme, { ...t, labelSize: 13 }),
      observed: 'Flint: every bar Highlands Sky Blue with white value labels inside the long bars; Nigeria is not distinguished. Expected: Nigeria in CMU red, the rest dark grey.',
    },
    {
      id: 'sentiment',
      addressed: { stage: 'R2', note: 'A single signed series takes the sentiment inks by sign.' },
      title: 'Signed values in the sentiment inks: navy up, Skibo red down',
      kind: 'realization',
      severity: 'medium',
      probe: 'per-mark-palette',
      rule: 'PDF Sentiment scale, positive to negative: `#043673` navy, `#cdd7e3`, `#f1f1f1`, `#eacfd2`, `#941120` Skibo red.',
      current: 'Stated as `ink.series.status` with `selection.signed: "status"` and `statusUse: "anySigned"`; Flint still draws the signed bars in `ink.series.single`.',
      expected: 'Decades above the baseline in navy, below in Skibo red.',
      proposal: 'Honour `selection.signed: "status"` whenever the measure crosses zero: colour each mark by its sign from `status.positive` / `status.negative`, and report when the template cannot.',
      ...signedProbe(theme, { ...t, labelSize: 13 }, { positive: '#043673', negative: '#941120' }),
      observed: 'Not drawn: Flint paints every decade in the single sky blue, below-zero bars included, and turns the decade labels 90°. Expected: navy above zero, Skibo red below. The status inks and `selection.signed` are ignored for a signed bar chart.',
    },
    {
      id: 'pie-slices',
      title: 'Pies and donuts limited to two or three slices',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'pie-rules',
      rule: 'Pie & donut: “Best when limited to 2-3 slices”; for comparing percentages a stacked bar is preferred.',
      current: 'ThemeSpec cannot cap a part-to-whole chart’s slices; Flint draws all five browsers.',
      expected: 'Chrome, Safari and everything else folded into one slice.',
      proposal: '`chartDefaults["Pie Chart"].maxSlices: 3` folding the tail into “All others” (a chart-spec transform the house can default), or a report recommending a stacked bar.',
      flint: flintInput(theme, {
        chartType: 'Pie Chart',
        data: BROWSERS,
        semantic_types: { Browser: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Browser' },
        title: 'Chrome dominates desktop browsing',
        subtitle: 'Desktop browser market share, %, 2024',
      }),
      expectedSpec: fewSlices(),
      observed: 'Flint draws all five slices, the two smallest (5%, 6%) as slivers, and paints Chrome in CMU red — the ink the guide reserves for CMU itself, because the categorical list leads with it. Expected: three slices, white labels inside, red not used.',
    },
    {
      id: 'scatter-zero',
      title: 'Scatter plots start both axes at zero',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'zero-baseline',
      rule: 'Scatter plots: “Use a baseline of zero for the x-axis and y-axis”; bars always start at zero.',
      current: 'Zero is a data-reading decision, so `chartDefaults` refuses it by design (“a control that changes how the data is read … is reported and dropped”); Flint fits a scatter’s axes to the data.',
      expected: 'Both axes from zero: the life-expectancy cloud sits in the top half of the plot.',
      proposal: 'Allow a house to state an axis-origin policy as a reading rule rather than a chart control: `structure.axis.measure.origin: "zero" | "data"`, overridable by the chart spec and reported when it compresses the data.',
      flint: flintInput(theme, {
        chartType: 'Scatter Plot',
        data: GAPMINDER,
        semantic_types: { 'GDP per capita': 'Quantity', 'Life expectancy': 'Quantity', 'Population (M)': 'Quantity', Continent: 'Category' },
        encodings: { x: 'GDP per capita', y: 'Life expectancy' },
        title: 'Richer countries live longer',
        subtitle: 'Life expectancy, years, by GDP per person, $, 2018',
      }),
      expectedSpec: scatterZero(),
      observed: 'Flint starts x at 0 (GDP) but fits y to 50–85, so life expectancy looks like it varies by a factor of 1.7; it also draws vertical gridlines although `grid.category` is `omit`. Expected: both axes from zero, horizontal gridlines only.',
    },
    {
      id: 'round-swatches',
      title: 'Round key swatches',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'legend-swatch',
      rule: 'When a key is unavoidable (the peers example), it sits centred above the plot with circular swatches.',
      current: '`legend.align: "center"` places the key; `legend.swatch` only accepts `auto`, which Flint draws as a square for bars.',
      expected: 'Circles, as in the signature’s expected panel.',
      proposal: '`legend.swatch: "auto" | "square" | "circle" | "line"`.',
    },
    {
      id: 'audience-red',
      title: 'No red for internal audiences or financial data',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'count-palette',
      rule: '“If your visualization is directed to an internal audience, use a color from the secondary palette rather than red”; avoid red for financial data.',
      current: 'One categorical list, led by CMU Red; nothing in the theme or chart spec knows the audience or that the measure is money.',
      expected: 'The same chart, red swapped for a secondary colour when the audience is internal or the measure is currency.',
      proposal: 'A variant guard on audience (a host-supplied context flag) and on the measure’s semantic type (`when: { measureType: "Amount" }`) whose `then` may re-order `ink.series` — today variants may not touch `ink`.',
    },
  ],
};

export default cmu;
