import type { ThemeSpec } from 'flint-chart';
import research from '../research/metlife.json';
import { BROWSERS, cardProbe, flintInput, MEDALS } from '../probes';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

// MetLife Circular is proprietary; Poppins (loaded on this page) stands in as the nearest geometric face.
const HEAD = "'MetLife Circular', 'Circular Std', Poppins, 'Noto Sans', Arial, sans-serif";
const BODY = "'Noto Sans', Arial, sans-serif";
const BLACK = '#000000';
const CHARCOAL = '#333333';
const DOTS = '#A7A8AA';
const BLUE = '#0090DA';
const GREEN = '#A4CE4E';
const PURPLE = '#5F259F';
/** Palette 2 (Extended), datapoints 1–15 in the order the guide prescribes. */
const EXTENDED = ['#0090DA', '#333333', '#00ACA0', '#DB0A5B', '#F2F2F2', '#007ABC', '#A4CE4E', '#6E6E6E', '#FFC600', '#5F259F', '#A7A8AA', '#0061A0', '#BADDF5', '#528320', '#D42123'];

const t: HouseTokens = {
  font: BODY,
  titleFont: HEAD,
  text: BLACK,
  muted: CHARCOAL,
  grid: DOTS,
  gridDash: [1.5, 3],
  axis: CHARCOAL,
  background: '#FFFFFF',
  palette: [BLUE, GREEN, PURPLE, '#A7A8AA', '#00ACA0', '#FFC600'],
  highlight: BLUE,
  context: '#A7A8AA',
  titleSize: 20,
  titleWeight: 500,
  subtitleSize: 13,
  labelSize: 11,
  lineWidth: 2,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'metlife',
  label: 'MetLife',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: BLACK, secondary: CHARCOAL, muted: '#6E6E6E', inverse: '#FFFFFF' },
    structure: { axis: CHARCOAL, grid: DOTS, rule: '#D9D9D9' },
    series: {
      single: BLUE,
      categorical: EXTENDED.slice(0, 6),
      categoricalExtended: EXTENDED,
    },
    accent: BLUE,
  },
  type: {
    headline: { family: HEAD, size: 20, weight: 'medium', case: 'title', color: BLACK },
    deck: { family: BODY, size: 13, color: CHARCOAL },
    axisLabel: { family: BODY, size: 11, color: CHARCOAL },
    axisTitle: { family: BODY, size: 11, color: CHARCOAL },
    keyLabel: { family: BODY, size: 11, color: CHARCOAL },
    valueLabel: { family: HEAD, size: 16, color: BLACK },
    annotation: { family: BODY, size: 11, color: CHARCOAL },
    footnote: { family: BODY, size: 11, color: CHARCOAL },
    display: { family: HEAD, size: 40, weight: 'bold', color: BLACK },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1, ticks: 'full', tickLength: 'short', tickDirection: 'outward' },
      measure: { line: 'full', lineWeight: 1, ticks: 'omit' },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'dotted', dash: [1.5, 3], weight: 1 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: { strokeWeight: 2, cornerRadius: 0, point: { presence: 'omit' }, slice: { gap: 0 } },
  geometry: { line: { width: 2 }, point: { presence: 'omit' }, band: { cornerRadius: 0 }, arc: { gap: 0 } },
  // “Horizontal bar lists: label above each bar”: names above where, beside, they would wrap or be cut.
  labels: { truncation: 'wrap', rowNames: 'auto' },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'center' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'omit', unit: 'everyTick', numberFormat: { thousands: 'separator' } },
  layout: { titleBlock: { anchor: 'start' } },
  variants: [
    {
      when: { markChannel: 'length', hasBandedAxis: true },
      then: {
        dataLabels: { show: 'whenTheyFit', placement: 'outsideMark' },
        structure: { axis: { measure: { line: 'omit', ticks: 'omit', suppressWhenValuesPrinted: true } }, grid: { measure: 'omit' } },
      },
      because: 'The bar-list specimen prints a large value at the end of every bar and drops the value axis and its rules.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Data re-keyed by eye from the guide's specimens (Complex-chart-2, Bar-chart-example-1, Pie-donut-example-1).
// ---------------------------------------------------------------------------

const MONTHS = ['2019-04', '2019-05', '2019-06', '2019-07', '2019-08', '2019-09', '2019-10', '2019-11', '2019-12', '2020-01', '2020-02', '2020-03'];
const ACCOUNT = [22, 20, 18, 18.5, 19, 25, 21, 26, 28.5, 35.5, 33.5, 38];
const PREMIUM = [4, 6, 8, 9, 10, 15.5, 13, 13, 9, 21, 15.5, 22.5];
const PERFORMANCE = MONTHS.flatMap((m, i) => [
  { Month: `${m}-01`, Series: 'Account Value', Value: ACCOUNT[i] * 1000 },
  { Month: `${m}-01`, Series: 'Premium', Value: PREMIUM[i] * 1000 },
]);

const PROGRAMMES = ['Annual medical check-up and cancer screening', 'Gym subsidies or sponsored sports activities', 'Nutrition and weight-loss programmes'];
const AGES = ['Aged 18–30', 'Aged 31–50', 'Over 50'];
const BENEFITS = ([[54, 32, 36], [57, 38, 34], [55, 35, 28]] as number[][])
  .flatMap((row, a) => row.map((Share, p) => ({ Age: AGES[a], Programme: PROGRAMMES[p], Share })));

const FUNDS = [['Conservative Fund', 50], ['Preferred Securities', 15], ['Global Equity', 13], ['Balanced Fund', 9], ['Global Bond', 7], ['Money Market', 6]].map(([Fund, Share]) => ({ Fund, Share }));
const FUND_INKS = ['#0061A0', '#007ABC', '#0090DA', '#A4CE4E', '#5F259F', '#FFC600'];

const config = (extra: Record<string, unknown> = {}) => {
  const base = houseConfig(t);
  return {
    ...base,
    title: { ...(base.title as object), font: HEAD, fontWeight: 500, fontSize: 20, color: BLACK },
    axis: { ...(base.axis as object), labelColor: CHARCOAL, labelFontSize: 11, domainColor: CHARCOAL, gridDash: [1.5, 3], gridColor: DOTS },
    legend: { ...(base.legend as object), orient: 'bottom', direction: 'horizontal', symbolType: 'square', symbolSize: 100, labelColor: CHARCOAL, labelFontSize: 11, columnPadding: 24 },
    ...extra,
  };
};

const ruleThenTitle = (title: string) =>
  `<div style="display:flex;align-items:center;gap:12px;margin:14px 18px 2px;font-family:${HEAD};font-size:20px;font-weight:500;color:${BLACK}">`
  + `<span style="display:inline-block;width:46px;height:2px;background:linear-gradient(90deg,${BLUE},${GREEN})"></span>${title}</div>`
  + `<div style="display:flex;align-items:center;gap:26px;margin:16px 18px 0;font-family:${BODY};font-size:12px;color:${BLACK};letter-spacing:0.3px">HISTORICAL PERFORMANCE:`
  + `<span style="font-weight:700;color:${BLUE};border-bottom:2px solid ${BLUE};padding:0 14px 4px">1 yr</span><span style="font-weight:700">3 yr</span><span style="font-weight:700">5 yr</span></div>`;

/** A key drawn by hand: Vega-Lite keys a line with a hollow or stroked symbol, the specimen with a filled square. */
const filledKey = (items: [string, string][], y: number, x0: number, step: number, shape: string, size: number) =>
  items.flatMap(([label, color], i) => [
    { data: { values: [{}] }, mark: { type: 'point', shape, filled: true, size, color, opacity: 1, clip: false }, encoding: { x: { value: x0 + i * step }, y: { value: y } } },
    { data: { values: [{}] }, mark: { type: 'text', align: 'left', baseline: 'middle', font: BODY, fontSize: 11, color: CHARCOAL, text: label, clip: false }, encoding: { x: { value: x0 + i * step + 9 }, y: { value: y } } },
  ]);

/** Complex-chart-2: blue and green lines, dotted rules, $ on every tick, thin dark axes, square key below. */
function signature() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...config(), padding: { left: 14, right: 14, top: 14, bottom: 40 } },
    width: W,
    height: H,
    layer: [
      {
        data: { values: PERFORMANCE },
        mark: { type: 'line', strokeWidth: 2 },
        encoding: {
          x: {
            field: 'Month', type: 'temporal', title: null, scale: { type: 'utc', domain: ['2019-04-01', '2020-03-01'] },
            axis: { values: ['2019-07-01', '2019-11-01', '2020-03-01'], format: '%b %Y', domain: true, ticks: true, tickSize: 4, tickColor: CHARCOAL, labelColor: BLACK, labelFontWeight: 600, grid: false },
          },
          y: {
            field: 'Value', type: 'quantitative', title: null, scale: { domain: [0, 50000] },
            axis: { values: [10000, 20000, 30000, 40000, 50000], format: '$,.0f', domain: true, domainColor: CHARCOAL, grid: true, gridDash: [1.5, 3] },
          },
          color: { field: 'Series', type: 'nominal', sort: ['Account Value', 'Premium'], scale: { range: [BLUE, GREEN] }, legend: null },
        },
      },
      ...filledKey([['Account Value', BLUE], ['Premium', GREEN]], H + 40, W / 2 - 80, 110, 'square', 70),
    ],
  };
}

/** Bar-chart-example-1: label above, bar on a full-length grey track, large % to the right, key row top-left. */
function barList() {
  const rows = BENEFITS.map((row, i) => ({ ...row, i }));
  const track = 300;
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...config(), view: { stroke: null }, legend: { ...(config().legend as object), orient: 'top', offset: 6 } },
    data: { values: rows },
    facet: {
      row: {
        field: 'i', type: 'ordinal', title: null,
        header: { labelExpr: `${JSON.stringify(rows.map((r) => r.Programme))}[datum.value]`, labelAngle: 0, labelAnchor: 'start', labelAlign: 'left', labelOrient: 'top', labelPadding: 3, labelFontSize: 11, labelColor: BLACK, labelFont: BODY },
      },
    },
    spacing: 6,
    spec: {
      width: track + 50,
      height: 12,
      layer: [
        { mark: { type: 'rule', color: '#C8C8C8', strokeWidth: 1 }, encoding: { x: { datum: 0, type: 'quantitative', scale: { domain: [0, 100] }, axis: null }, x2: { datum: 100 }, y: { value: 12 } } },
        {
          mark: { type: 'bar', height: 10, yOffset: 1 },
          encoding: {
            x: { field: 'Share', type: 'quantitative', scale: { domain: [0, 100], range: [0, track] }, axis: null },
            color: { field: 'Age', type: 'nominal', sort: AGES, scale: { domain: AGES, range: [BLUE, PURPLE, '#77787B'] } },
          },
        },
        { mark: { type: 'text', align: 'left', baseline: 'middle', font: HEAD, fontSize: 17, color: BLACK }, encoding: { x: { value: track + 8 }, y: { value: 6 }, text: { field: 'label' } }, transform: [{ calculate: "datum.Share + '%'", as: 'label' }] },
      ],
    },
    resolve: { scale: { x: 'shared' } },
  };
}

/** Pie-donut-example-1: no cuts, segments from 12 o'clock, “Total 100%” in the hole. */
function donut() {
  const order = FUNDS.map((row) => row.Fund);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...config(), legend: { ...(config().legend as object), orient: 'right', direction: 'vertical', offset: 24 } },
    title: { text: 'Current Allocation' },
    width: 220,
    height: H,
    layer: [
      {
        data: { values: FUNDS.map((row, i) => ({ ...row, i })) },
        mark: { type: 'arc', innerRadius: 62, outerRadius: 92, stroke: null },
        encoding: {
          theta: { field: 'Share', type: 'quantitative', stack: true },
          order: { field: 'i', type: 'quantitative' },
          color: { field: 'Fund', type: 'nominal', sort: order, scale: { domain: order, range: FUND_INKS } },
        },
      },
      { data: { values: [{}] }, mark: { type: 'text', text: 'Total', font: HEAD, fontSize: 15, color: CHARCOAL, dy: -12 } },
      { data: { values: [{}] }, mark: { type: 'text', text: '100%', font: HEAD, fontSize: 24, color: CHARCOAL, dy: 12 } },
    ],
  };
}

/** The guide's order with the light ink dropped on a light surface. */
const LIGHT_SURFACE_ORDER = EXTENDED.filter((c) => c !== '#F2F2F2');

function lightSurfacePie() {
  const rows = BROWSERS.slice().sort((a, b) => b.Share - a.Share);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...config(), legend: { ...(config().legend as object), orient: 'right', direction: 'vertical' } },
    title: { text: 'Chrome dominates desktop browsing', subtitle: 'Desktop browser market share, %, 2024' },
    width: W,
    height: H,
    data: { values: rows },
    mark: { type: 'arc', outerRadius: 85, stroke: null },
    encoding: {
      theta: { field: 'Share', type: 'quantitative', stack: true },
      order: { field: 'Share', type: 'quantitative', sort: 'descending' },
      color: { field: 'Browser', type: 'nominal', sort: rows.map((r) => r.Browser), scale: { range: LIGHT_SURFACE_ORDER } },
    },
  };
}

/** A key figure: an uppercase label, then the number large and bold in the display face. */
function keyNumber() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...config(), view: { stroke: null } },
    width: W,
    height: 110,
    data: { values: [{}] },
    layer: [
      { mark: { type: 'text', align: 'left', baseline: 'top', font: BODY, fontSize: 13, color: BLACK, text: 'TOTAL ACCOUNT VALUE:', letterSpacing: 0.3 }, encoding: { x: { value: 0 }, y: { value: 0 } } },
      { mark: { type: 'text', align: 'left', baseline: 'top', font: HEAD, fontSize: 40, fontWeight: 'bold', color: BLACK, text: '$38,752.11' }, encoding: { x: { value: 0 }, y: { value: 22 } } },
      { mark: { type: 'text', align: 'left', baseline: 'top', font: BODY, fontSize: 12, color: BLACK, text: 'as of 28/02/2020' }, encoding: { x: { value: 2 }, y: { value: 74 } } },
    ],
  };
}

const card = { background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.18)', borderRadius: 0, padding: '2px 4px 8px' };

const metlife: StyleGuideTheme = {
  id: 'metlife',
  org: 'MetLife Global Design System',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the Data Visualization page of design.metlife.com (read in full). The per-chart “Design specs” are Adobe XD links that could not be read, so axis, gridline and type sizes are measured off the guide’s three specimen screenshots, not taken from a spec.',
    'Stated directly: the extended palette in its prescribed datapoint order (`#0090DA`, `#333333`, `#00ACA0`, `#DB0A5B`, `#F2F2F2`, …) with the first six as the core set; MetLife blue as the single-series ink; black as the anchoring text colour; two faces — MetLife Circular for headlines, key numbers and printed values, Noto Sans for labels, keys and source; dotted light-grey horizontal rules; thin dark x and y axis lines with short ticks under the dates; `$` and thousands separators on every tick; 2px lines without markers; a square-swatch key centred under the plot; no gaps between donut segments. A `variants` entry on banded length marks prints a value at each bar end and drops the value axis, as the bar-list specimen does.',
    'Approximated: MetLife Circular is proprietary and falls back to Poppins (named after it in the stack); sizes and the `#A7A8AA` dotted rule are measured from screenshots.',
    'Not stateable: the guide’s own specimens do not follow its written colour order (they reach for blue + green, or blue + purple + grey); `#F2F2F2` sits fifth in the order and vanishes on white; the card with its blue→green gradient rule; the grey track under the bars (the names above them are `labels.rowNames`); “Total 100%” in the donut; and the uppercase label over a big key figure — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Complex-chart-2: the chart sits in a white card whose title (“Your Performance”, MetLife Circular) is preceded by a short blue→green rule; an uppercase “HISTORICAL PERFORMANCE:” label with 1 yr / 3 yr / 5 yr tabs; two 2px lines, blue Account Value and green Premium, no markers; dotted light-grey rules; `$10,000`…`$50,000` at the left; thin dark x and y axis lines; “Jul 2019 / Nov 2019 / Mar 2020” with small ticks; a square-swatch key centred below.',
      current: 'Flint draws the same twelve months with the house theme and the title “Your Performance”. The card, the gradient rule and the tabs are product UI outside the chart.',
      expected: 'The specimen’s card and chart, re-keyed.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: PERFORMANCE,
        semantic_types: { Month: 'YearMonth', Series: 'Category', Value: { semanticType: 'Amount', unit: '$' } },
        encodings: { x: 'Month', y: 'Value', color: 'Series' },
        title: 'Your Performance',
      }),
      expectedSpec: signature(),
      expectedFrame: { style: card, headerHtml: ruleThenTitle('Your Performance') },
      observed: 'Flint keeps the bones — dotted light-grey rules, thin dark axes with ticks under the months, 2px lines without markers, a key centred below — but the second series is charcoal `#333333` (the written order) where the specimen is green; the ticks read 0…40,000 with “Value ($)” manufactured as a deck instead of `$10,000`…`$50,000` (the same `unit: everyTick` that prints % on percentages leaves `$` off); every month is labelled (“Apr May Jun … 2020 Feb Mar”) instead of three “Mon YYYY” labels; the key shows line samples, not squares; and there is no card, rule or tab row.',
    },
    {
      id: 'specimen-colours',
      title: 'The written colour order and the specimens disagree',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'count-palette',
      rule: '“Use colors from the pallet in provided order as they have enough contrast ratio between them” — blue, charcoal, teal, raspberry, light grey, … Yet the guide’s own two-series line uses blue + green (datapoints 1 and 7) and its three-group bar list blue + purple + grey (1, 10, 8 or 11): the Basic palette’s brand hues, not the extended order.',
      current: 'The theme follows the written rule, so Flint colours three groups blue, charcoal `#333333`, teal. No field can say “for 2 series use 1 + 7; for 3 use 1 + 10 + 11”.',
      expected: 'Three groups in blue, purple and grey, as the specimen shows them.',
      proposal: '`ink.series.categoricalByCount: { 2: ["#0090DA", "#A4CE4E"], 3: ["#0090DA", "#5F259F", "#A7A8AA"] }`, falling back to the ordered list beyond the counts a house has drawn.',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: MEDALS.filter((row) => ['United States', 'China', 'Japan', 'Australia'].includes(row.Country)),
        semantic_types: { Country: 'Country', Medal: 'Category', Count: 'Quantity' },
        encodings: { x: 'Country', y: 'Count', group: 'Medal' },
        title: 'The US and China shared the top of the medal table',
        subtitle: 'Paris 2024 Olympic medals by type',
      }),
      expectedSpec: {
        $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
        config: { ...config(), legend: { ...(config().legend as object), orient: 'top' } },
        title: { text: 'The US and China shared the top of the medal table', subtitle: 'Paris 2024 Olympic medals by type' },
        width: W,
        height: H,
        data: { values: MEDALS.filter((row) => ['United States', 'China', 'Japan', 'Australia'].includes(row.Country)) },
        mark: { type: 'bar' },
        encoding: {
          x: { field: 'Country', type: 'nominal', sort: null, title: null, axis: { labelAngle: 0, ticks: true, tickSize: 4 }, scale: { paddingInner: 0.3 } },
          xOffset: { field: 'Medal', sort: ['Gold', 'Silver', 'Bronze'] },
          y: { field: 'Count', type: 'quantitative', title: null, axis: { domain: true, tickCount: 5 } },
          color: { field: 'Medal', type: 'nominal', sort: ['Gold', 'Silver', 'Bronze'], scale: { range: [BLUE, PURPLE, '#A7A8AA'] } },
        },
      },
      observed: 'Flint: blue, charcoal and teal — correct for the written order, and nothing like the specimens, which pair blue with purple and grey (or green). The headline also wraps to two lines in Circular’s fallback at 20px.',
    },
    {
      id: 'light-ink-on-light',
      addressed: { stage: 'R5', note: 'The near-white fifth colour keeps its fill and gains a darker edge.' },
      title: 'The fifth colour is near-white and vanishes on a white card',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'surface-swap',
      rule: 'Palette 2 places `#F2F2F2` fifth; the guide notes that black/white (and `#333333`/`#F2F2F2`) “swap depending on light/dark background”, and charts must sit on white or light cards.',
      current: 'A categorical list is one fixed sequence: there is no way to mark an entry as “dark-surface only”. On white, the fifth series is painted `#F2F2F2` — the “Other” slice of a five-slice pie is invisible against the card.',
      expected: 'On a light surface the light ink is skipped: the fifth slice takes the next colour in the order (`#007ABC`).',
      proposal: 'Let a palette entry carry a surface condition (`{ color: "#F2F2F2", on: "dark" }`), or let `ink.series` be given per surface (`ink.series.onDark`), with grounding choosing by contrast against `surface.canvas`.',
      flint: flintInput(theme, {
        chartType: 'Pie Chart',
        data: BROWSERS,
        semantic_types: { Browser: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Browser' },
        title: 'Chrome dominates desktop browsing',
        subtitle: 'Desktop browser market share, %, 2024',
      }),
      expectedSpec: lightSurfacePie(),
      observed: 'Flint paints “Other” `#F2F2F2`: a near-white wedge on a white page, readable only by the gap it leaves. The gallery’s six-source area shows the same thing — “Wind & solar” is an invisible band — and the Global Bond segment of the donut below is lost the same way.',
    },
    {
      id: 'bar-list',
      title: 'Bar lists: label above, bar on a grey track, a big number at the end',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'labels-above-bars',
      rule: 'Bar-chart-example-1: each item’s label sits above its bar; the bar runs along a thin light-grey track drawn to the full length; a large black percentage sits to the right of the track; no axes, no rules; a row of square swatches top-left names the groups.',
      current: 'The banded-length variant prints values outside the bars and drops the value axis, but ThemeSpec has no word for “category label above its bar”, no track behind a bar, and no way to align every value at the track’s end rather than at each bar’s tip.',
      expected: 'Nine items in three age groups, each label above a blue / purple / grey bar on a grey track, the percentage large at the right.',
      proposal: '`labels.categoryPlacement: "aboveMark"`, `marks.track: { presence, ink }` for bars, and `dataLabels.placement: "column"` aligned at the track end (`column` exists but is laid against the longest bar).',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: BENEFITS,
        semantic_types: { Programme: 'Category', Age: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { y: 'Programme', x: 'Share', group: 'Age' },
        baseSize: { width: W, height: 300 },
      }),
      expectedSpec: barList(),
      observed: 'The variant works as far as it goes: Flint drops the value axis and its rules and prints each value at the bar’s tip in the Circular stand-in. But the programmes are wrapped to the left of the bars instead of sitting above them, the bars are grouped by programme rather than listed by age group, there is no grey track, the values follow each bar’s tip instead of aligning at the track’s end, the colours are blue/charcoal/teal, and the key sits below instead of top-left.',
    },
    {
      id: 'donut-total',
      title: 'Donuts print the total in the hole, with no cuts between segments',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'pie-rules',
      rule: 'Pie-donut-example-1: segments start at 12 o’clock and run clockwise with no gaps; “Total 100%” is set in the hole in MetLife Circular; the empty state is a solid light-grey ring reading “Total 0%”.',
      current: 'No gap is stated (`geometry.arc.gap: 0`). There is no chart-spec slot for a figure in the hole and no theme role for it, so the hole is empty; there is no empty-state treatment.',
      expected: 'Six funds in blues, green, purple and yellow round a “Total 100%” centre.',
      proposal: '`chart_spec.centerLabel: { text, value }` set in `type.display` (scaled to the hole); `marks.emptyState: { ink }` for a donut with no data.',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: FUNDS,
        semantic_types: { Fund: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Fund' },
        title: 'Current Allocation',
      }),
      expectedSpec: donut(),
      observed: 'Flint draws the donut without cuts, as stated, but the hole is empty, the key uses circles, Global Bond takes the near-white fifth colour, and the segments run alphabetically from 12 o’clock (Balanced Fund first) rather than in the data’s order.',
    },
    {
      id: 'card-rule',
      title: 'The card title is led by a short blue→green gradient rule',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'brand-rule',
      rule: 'Charts live in white cards with a soft shadow on a light-grey page; every card title is preceded by a short horizontal rule that runs from MetLife blue to green.',
      current: '`furniture` offers `headerRule`, `footerRule` and `mastheadTab` in one flat colour; nothing sits inline before the headline, and there is no gradient ink. The card itself is outside the chart.',
      expected: 'A shadowed white card, the 46px blue→green rule, then the title.',
      proposal: '`furniture: { kind: "titleLead", width, height, ink: { gradient: ["#0090DA", "#A4CE4E"] } }`, and gradient values allowed wherever furniture takes a colour.',
      ...cardProbe(theme, t, {
        style: { ...card, padding: '10px 14px 10px' },
        header: `<span style="display:inline-block;width:46px;height:2px;margin-right:12px;vertical-align:middle;background:linear-gradient(90deg,${BLUE},${GREEN})"></span><span style="font-family:${HEAD};font-weight:500;font-size:18px">Unemployment Rate</span>`,
        meta: 'United States, 2000–2023',
        actions: false,
      }),
      observed: 'Flint’s panel is the bare chart with its title block (and “; Unemployment (%)” appended to the deck); the card, its shadow and the gradient rule have nowhere to come from. The expected card shows the 46px blue→green rule leading the Circular title.',
    },
    {
      id: 'key-number',
      title: 'A key figure: uppercase label over a big bold number',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'type-case',
      rule: '“Enlarging numbers by themselves can be an interesting way to represent data”: “TOTAL ACCOUNT VALUE:” in uppercase Noto Sans, then “$38,752.11” very large and bold in MetLife Circular, then “as of 28/02/2020”.',
      current: '`type.display` states the big number’s face, size and weight. The label above it is not a headline, and `TypeRole.case: "upper"` on the headline would uppercase every chart title. There is no role for a KPI’s label or its “as of” line.',
      expected: 'The specimen’s key-value block.',
      proposal: 'Add `type.displayLabel` (with `case`) and `type.displayNote` roles for the KPI card’s label and footnote.',
      flint: flintInput(theme, {
        chartType: 'KPI Card',
        data: [{ Metric: 'Total account value', Value: 38752.11 }],
        semantic_types: { Metric: 'Category', Value: { semanticType: 'Amount', unit: '$' } },
        encodings: { metric: 'Metric', value: 'Value' },
        baseSize: { width: W, height: 120 },
      }),
      expectedSpec: keyNumber(),
      observed: 'Flint’s KPI card centres a sentence-case “Total account value” over a very large bold “38,752.11” inside a rounded bordered tile — and drops the `$` the semantic type carries. The expected block is left-aligned: uppercase label, “$38,752.11” in Circular bold, “as of” note beneath.',
    },
  ],
};

export default metlife;
