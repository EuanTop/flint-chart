import type { ThemeSpec } from 'flint-chart';
import research from '../research/aviva.json';
import { flintInput } from '../probes';
import { houseConfig, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Source Sans 3', 'Source Sans Pro', Arial, sans-serif";
const BLUE = '#1a61bd';
const SEGMENTS = [BLUE, '#a9b2c6', '#5a8ccc', '#c2c8d5', '#7988a9'];
const BLANK = '#cccccc';
const BODY = '#444444';
const HEADING = '#5c596d';
const INK = '#191919';

const t: HouseTokens = {
  font: FONT,
  text: INK,
  muted: BODY,
  grid: null,
  axis: null,
  background: '#ffffff',
  palette: SEGMENTS,
  highlight: BLUE,
  context: BLANK,
  titleSize: 24,
  titleWeight: 'normal',
  subtitleSize: 16,
  subtitleColor: BODY,
  labelSize: 16,
  sourceSize: 14,
  legendOrient: 'right',
};

const theme: ThemeSpec = {
  id: 'aviva',
  label: 'Aviva (ION)',
  ink: {
    surface: { source: 'house', canvas: '#ffffff' },
    text: { primary: INK, secondary: BODY, muted: HEADING },
    structure: { grid: '#ececec', axis: BLANK, rule: BLANK },
    series: {
      single: BLUE,
      // Five inks, in a fixed order, and no more: the guide caps a pie at five segments.
      categorical: SEGMENTS,
      selection: { partToWhole: 'categorical' },
    },
    accent: BLUE,
  },
  type: {
    headline: { family: FONT, size: 24, weight: 'semibold', case: 'asIs', color: INK },
    deck: { family: FONT, size: 16, weight: 'regular', color: BODY },
    axisLabel: { family: FONT, size: 16, color: BODY },
    axisTitle: { family: FONT, size: 16, color: BODY },
    keyLabel: { family: FONT, size: 16, color: INK },
    valueLabel: { family: FONT, size: 16, weight: 'semibold', color: INK },
    footnote: { family: FONT, size: 14, color: BODY },
    display: { family: FONT, size: 42, weight: 'semibold', color: HEADING },
  },
  structure: {
    axis: { categorical: { line: 'omit', ticks: 'omit' }, measure: { line: 'omit', ticks: 'omit' } },
    grid: { measure: 'omit', category: 'omit' },
    frame: 'omit',
    baseline: 'omit',
  },
  marks: {
    // “A 3px divider between each of the doughnut segments”, in the white of the page.
    separator: { presence: 'full', width: 3, source: 'surface' },
    slice: { gap: 3, gapStyle: 'rule' },
  },
  // Segment 1 starts at 12 o'clock, in the data's order (M4).
  geometry: { arc: { gap: 3, gapStyle: 'rule', order: 'data' } },
  legend: { show: 'always', placement: ['right', 'bottom'], direction: 'vertical', title: 'whenAmbiguous', align: 'start' },
  // “No labels on the segments; the key carries labels and values.”
  dataLabels: { show: 'never' },
  annotation: { numberFormat: { thousands: 'separator', precision: 'integer' } },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' } },
  // ION's ring is thick: the hole is ~70% of the radius. `innerRadius` is in px, so this holds only near
  // Flint's default 60px outer radius (see the `donut-hole-px` gap).
  chartDefaults: { 'Donut Chart': { innerRadius: 42 } },
};

/** The guide's multi-segment doughnut example, re-keyed: a pension's yearly costs. */
const COSTS = [
  { Cost: 'Investment costs', Amount: 82000 },
  { Cost: 'Liquidity instruments', Amount: 41000 },
  { Cost: 'Property', Amount: 40000 },
  { Cost: 'Bonds', Amount: 39000 },
  { Cost: 'Cash', Amount: 38000 },
];

const gbp = (n: number) => `£${n.toLocaleString('en-GB')}`;

/** A doughnut or pie drawn as ION draws it: fixed order clockwise from 12, 3px white dividers, no labels. */
function ring(rows: Record<string, unknown>[], field: string, value: string, o: { size: number; inner: number; palette?: string[] }) {
  const domain = rows.map((row) => row[field] as string);
  return {
    width: o.size,
    height: o.size,
    data: { values: rows.map((row, i) => ({ ...row, _i: i })) },
    mark: { type: 'arc', outerRadius: o.size / 2 - 2, innerRadius: o.inner, stroke: '#ffffff', strokeWidth: 3 },
    encoding: {
      theta: { field: value, type: 'quantitative', stack: true },
      order: { field: '_i', type: 'quantitative' },
      color: { field, type: 'nominal', scale: { domain, range: o.palette ?? SEGMENTS }, legend: null },
    },
  };
}

/** The ION key lock-up: optional title, 20px circular swatches, value in semibold then label. */
function key(rows: { label: string; value: string }[], o: { title?: string; width?: number; labelX?: number; palette?: string[] } = {}) {
  const width = o.width ?? 250;
  const labelX = o.labelX ?? 100;
  const values = rows.map((row, i) => ({ ...row, i }));
  const rowY = (i: number) => (o.title ? 58 : 14) + i * 34;
  return {
    width,
    height: rowY(rows.length - 1) + 20,
    data: { values },
    layer: [
      ...(o.title ? [{
        data: { values: [{}] },
        mark: { type: 'text', align: 'left', baseline: 'top', font: FONT, fontSize: 24, color: INK, text: o.title },
        encoding: { x: { value: 0 }, y: { value: 0 } },
      }] : []),
      {
        mark: { type: 'circle', size: 314, opacity: 1 },
        encoding: {
          x: { value: 10 },
          y: { field: 'i', type: 'quantitative', scale: { domain: [0, Math.max(1, rows.length - 1)], range: [rowY(0), rowY(Math.max(1, rows.length - 1))] }, axis: null },
          color: { field: 'label', type: 'nominal', scale: { domain: rows.map((row) => row.label), range: o.palette ?? SEGMENTS }, legend: null },
        },
      },
      {
        mark: { type: 'text', align: 'left', baseline: 'middle', font: FONT, fontSize: 16, fontWeight: 600, color: INK },
        encoding: { x: { value: 30 }, y: { field: 'i', type: 'quantitative' }, text: { field: 'value' } },
      },
      {
        mark: { type: 'text', align: 'left', baseline: 'middle', font: FONT, fontSize: 16, color: INK },
        encoding: { x: { value: labelX }, y: { field: 'i', type: 'quantitative' }, text: { field: 'label' } },
      },
    ],
  };
}

const vl = (spec: Record<string, unknown>, config: Record<string, unknown> = {}) => ({
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  config: { ...houseConfig(t), ...config },
  ...spec,
});

function signature() {
  return vl({
    hconcat: [
      ring(COSTS, 'Cost', 'Amount', { size: 220, inner: 76 }),
      key(COSTS.map((row) => ({ label: row.Cost, value: gbp(row.Amount) })), { title: 'Standard data group', width: 270, labelX: 100 }),
    ],
    spacing: 36,
  });
}

/** Seven browsers: the guide's ceiling is five, so the tail folds into the fifth segment. */
const BROWSERS7 = [
  { Browser: 'Chrome', Share: 65 },
  { Browser: 'Safari', Share: 12 },
  { Browser: 'Edge', Share: 8 },
  { Browser: 'Firefox', Share: 6 },
  { Browser: 'Opera', Share: 3 },
  { Browser: 'Samsung Internet', Share: 3 },
  { Browser: 'Other', Share: 3 },
];
const BROWSERS5 = [...BROWSERS7.slice(0, 4), { Browser: 'All others', Share: 9 }];

/** A pension fund's asset mix, in the order the fund reports it — not alphabetical. */
const POT = [
  { Asset: 'Shares', Share: 55 },
  { Asset: 'Bonds', Share: 20 },
  { Asset: 'Property', Share: 12 },
  { Asset: 'Cash', Share: 8 },
  { Asset: 'Other', Share: 5 },
];

const SINGLE = [
  { Answer: 'prefer standard doughnuts', Share: 75 },
  { Answer: 'other', Share: 25 },
];

function singleDoughnut() {
  return vl({
    width: 220,
    height: 220,
    layer: [
      {
        data: { values: SINGLE.map((row, i) => ({ ...row, _i: i })) },
        mark: { type: 'arc', outerRadius: 108, innerRadius: 78, stroke: '#ffffff', strokeWidth: 3 },
        encoding: {
          theta: { field: 'Share', type: 'quantitative', stack: true },
          order: { field: '_i', type: 'quantitative' },
          color: { field: 'Answer', type: 'nominal', scale: { domain: SINGLE.map((row) => row.Answer), range: [BLUE, BLANK] }, legend: null },
        },
      },
      {
        data: { values: [{}] },
        mark: { type: 'text', font: FONT, fontSize: 42, fontWeight: 600, color: HEADING, text: '75%', baseline: 'alphabetic' },
        encoding: { x: { value: 110 }, y: { value: 112 } },
      },
      {
        data: { values: [{}] },
        mark: { type: 'text', font: FONT, fontSize: 16, color: BODY, text: ['prefer standard', 'doughnuts'], lineHeight: 22, baseline: 'top' },
        encoding: { x: { value: 110 }, y: { value: 120 } },
      },
    ],
  });
}

/** ION's horizontal value bar: a 12px #ececec track in a white, #CCC-outlined card, dotted half-way mark. */
function valueBar() {
  const W = 420;
  const filled = 0.7;
  return vl({
    width: W,
    height: 84,
    layer: [
      { data: { values: [{}] }, mark: { type: 'text', align: 'left', baseline: 'bottom', font: FONT, fontSize: 16, color: BODY, text: 'Pension pot today' }, encoding: { x: { value: 0 }, y: { value: 22 } } },
      { data: { values: [{}] }, mark: { type: 'text', align: 'right', baseline: 'bottom', font: FONT, fontSize: 16, fontWeight: 600, color: BODY, text: '£70,000' }, encoding: { x: { value: W }, y: { value: 22 } } },
      { data: { values: [{}] }, mark: { type: 'rect', color: '#ececec', cornerRadius: 5 }, encoding: { x: { value: 0 }, x2: { value: W }, y: { value: 36 }, y2: { value: 48 } } },
      { data: { values: [{}] }, mark: { type: 'rect', color: '#3b8427', cornerRadius: 5 }, encoding: { x: { value: 0 }, x2: { value: W * filled }, y: { value: 36 }, y2: { value: 48 } } },
      { data: { values: [{}] }, mark: { type: 'rule', color: BLANK, strokeDash: [2, 2], strokeWidth: 1.5 }, encoding: { x: { value: W / 2 }, y: { value: 27 }, y2: { value: 57 } } },
      { data: { values: [{}] }, mark: { type: 'text', align: 'left', baseline: 'top', font: FONT, fontSize: 16, color: BODY, text: '£0' }, encoding: { x: { value: 0 }, y: { value: 60 } } },
      { data: { values: [{}] }, mark: { type: 'text', align: 'center', baseline: 'top', font: FONT, fontSize: 16, color: BODY, text: 'Halfway' }, encoding: { x: { value: W / 2 }, y: { value: 60 } } },
      { data: { values: [{}] }, mark: { type: 'text', align: 'right', baseline: 'top', font: FONT, fontSize: 16, color: BODY, text: 'Goal £100,000' }, encoding: { x: { value: W }, y: { value: 60 } } },
    ],
  }, { padding: 0 });
}

const statusBadge = `<div style="display:flex;justify-content:space-between;align-items:center;font-family:${FONT};margin:0 0 12px">`
  + `<span style="font-size:20px;font-weight:600;color:${INK}">Your retirement goal</span>`
  + `<span style="font-size:14px;font-weight:600;color:#ffffff;background:#3b8427;border-radius:3px;padding:2px 8px">On track</span></div>`;

const aviva: StyleGuideTheme = {
  id: 'aviva',
  org: 'Aviva (ION Design System)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'ION is a customer-website design system, not a data-graphics guide: it has a pie, a doughnut and a horizontal “value bar”, and nothing cartesian. The theme is built from scratch around those three.',
    'Stated directly: Source Sans (the page loads Source Sans 3, the open successor of Source Sans Pro); the five segment inks in their mandatory order — Aviva blue `#1a61bd`, then `#a9b2c6`, `#5a8ccc`, `#c2c8d5`, `#7988a9` — with no extended set, because a pie may never hold more than five; a 3px white rule between segments (`marks.slice`, `geometry.arc`); no labels on segments; a key on the right, falling back below; body grey `#444` and heading grey `#5c596d`; `£` values with thousands separators; a thick ring by default for doughnuts (`chartDefaults`).',
    'Not stated: the key that carries the *value* in semibold before the label with 20px round swatches; the five-segment ceiling as a rule rather than a palette length; the single-value doughnut with its `#ccc` remainder and 42px centre figure; the value bar as a card; the clockwise reveal. Headlines in the proprietary AvivaCurve fall back to Source Sans.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall: a ring with a key lock-up',
      kind: 'visual-quality',
      severity: 'high',
      probe: 'signature',
      rule: 'Thick doughnut, five segments clockwise from 12 o’clock in the fixed order, 3px white dividers, no labels on the ring; beside it the key lock-up: an optional regular-weight title (“Standard data group”) and one row per segment — a 20px round swatch, the value in semibold, then the label in regular.',
      current: 'Flint draws the ring in the five house inks with white dividers. The title goes above the chart as a headline, the key is a plain list of names with small swatches, and the amounts appear nowhere — the theme has no way to put a value in the key, and `dataLabels: never` (the guide’s rule) leaves the numbers off the ring as well.',
      expected: 'The guide’s multi-segment doughnut example: ring on the left, the titled key with “£82,000 Investment costs” rows on the right.',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: COSTS,
        semantic_types: { Cost: 'Category', Amount: { semanticType: 'Amount', unit: '£' } },
        encodings: { size: 'Amount', color: 'Cost' },
        title: 'Standard data group',
      }),
      expectedSpec: signature(),
      observed: 'Flint (left): ring in the five house inks with white dividers, key on the right with small round swatches and names only; the headline “Standard data group” is set bold above the whole chart rather than as the key’s title; the ring is only ~120px across in a 360px canvas (a 50px margin is kept for slice labels the theme turned off); and the wedges run Bonds, Cash, Investment costs… clockwise from 12, so Aviva blue sits at the bottom instead of starting at 12 o’clock. Expected (right): a 220px ring with blue first from 12, and the key with “£82,000 Investment costs” rows under a regular-weight title.',
    },
    {
      id: 'key-values',
      title: 'The key carries each value, in semibold, before its label',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'legend-swatch',
      rule: '“All multi-segment pie charts must be accompanied by a legend (key); this contains the labels and values.” Value first in semibold, then the label in regular; 20px circular swatches; variants with the label indented to a fixed column, reversed (label then value) or right-aligned.',
      current: 'A Flint legend lists category names only. `ThemeLegend` has no field for what an entry says (`swatch` accepts only `auto`), `keyLabel` is one type role so a semibold value and a regular label cannot share an entry, and the swatch shape and size are the renderer’s.',
      expected: 'One row per segment: round 20px swatch, “£82,000” in semibold, “Investment costs” in regular (see the signature panel).',
      proposal: '`legend.entry: { content: ["value", "label"], valueRole: "valueLabel", align: "fixedColumn" | "afterValue" }` and `legend.swatch: { shape: "circle" | "square" | "roundedSquare" | "line", size }`.',
    },
    {
      id: 'max-five',
      title: 'Never more than five segments',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'pie-rules',
      rule: '“The chart can show a minimum of 2 and a maximum of 5 segments”, each in its fixed colour.',
      current: 'The theme can only state a palette of five. A seven-browser pie is more than the palette names and the theme gives no overflow ink, so Flint gives up on the house set rather than fold the tail; ThemeSpec has no ceiling on the number of wedges.',
      expected: 'Four largest browsers in the first four inks, the remaining three summed into a fifth “All others” segment in the fifth ink.',
      proposal: '`marks.slice.maxCount: 5` (or a part-to-whole `variants` guard on `categoryCount`) that folds the smallest into the last ink, distinct from `overflow`, which adds a sixth slice in a sixth colour.',
      flint: flintInput(theme, {
        chartType: 'Pie Chart',
        data: BROWSERS7,
        semantic_types: { Browser: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Browser' },
        title: 'Desktop browser share, 2024',
      }),
      expectedSpec: vl({
        title: { text: 'Desktop browser share, 2024' },
        hconcat: [
          ring(BROWSERS5, 'Browser', 'Share', { size: 200, inner: 0 }),
          key(BROWSERS5.map((row) => ({ label: row.Browser, value: `${row.Share}%` })), { width: 200, labelX: 70 }),
        ],
        spacing: 30,
      }),
      observed: 'Flint draws all seven wedges and abandons the house palette entirely: Chrome in steel blue, Safari orange, Edge red, then teal, green, yellow and mauve — the renderer’s default categorical scheme, with nothing of Aviva left. Expected keeps five wedges in the five ION inks, the tail summed into “All others”.',
    },
    {
      id: 'single-value',
      title: 'Single-value doughnut: a #ccc remainder and the figure in the hole',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'donut-centre-value',
      rule: 'A single-segment doughnut fills its share in the accent (default `#1a61bd`) over a blank remainder that “should always be #ccc”; the value sits inside as an h1 semibold (≈42px) in `#5c596d`, a 16px `#444` label beneath, centred; no key.',
      current: 'Flint sees two categories and colours the remainder with the second segment ink (`#a9b2c6`) as if it were data, adds a key for “other”, and has nothing to put in the hole: `type.display` exists but no chart places it inside a ring.',
      expected: 'Three-quarters of the ring in Aviva blue, the rest flat `#ccc`, “75%” large and semibold in the centre with “prefer standard doughnuts” beneath.',
      proposal: 'A part-to-whole role for the remainder — `ink.series.remainder` (here `#ccc`) applied when a chart marks one row as “rest” (`chart_spec` `remainder` or a `Gauge`-like single-value ring template) — and a centre-figure slot that reads `type.display`.',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: SINGLE,
        semantic_types: { Answer: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Answer' },
      }),
      expectedSpec: singleDoughnut(),
      observed: 'Flint: a ring three-quarters blue and one quarter `#a9b2c6` (the second data ink, not the `#ccc` blank), an empty hole, and a two-entry key naming “other” as if it were a category. Expected: the `#ccc` remainder, “75%” in 42px semibold grey and the label beneath, no key.',
    },
    {
      id: 'value-bar-card',
      title: 'The horizontal value bar is a rounded track inside a card',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'card-container',
      rule: '“Component container: #FFF, outline #CCC, rounded corner radius 5px … 12px height. Background mask: #ececec”, the coverage fill in a status colour, a dotted `#CCC` half-way mark 30px high, labels 10px above and below aligned to the edges.',
      current: 'The nearest Flint chart is a bullet: a bar on an axis with a target tick, under a headline. The theme cannot state a container, a full-width track behind the bar, rounded track ends or a dotted mark of its own.',
      expected: 'A white card with a `#CCC` outline and 5px corners holding a title and status badge, the 12px grey track with a green fill to 70%, a dotted mark at half-way, and edge-aligned labels.',
      proposal: 'A `surface.panel` card (`{ fill, outline, radius, padding }`) in ThemeSpec, and a progress/value-bar template whose track takes `ink.structure.rule` and `geometry.band.cornerRadius` at both ends.',
      flint: flintInput(theme, {
        chartType: 'Bullet Chart',
        data: [{ Goal: 'Pension pot', Value: 70000, Target: 50000 }],
        semantic_types: { Goal: 'Category', Value: { semanticType: 'Amount', unit: '£' }, Target: { semanticType: 'Amount', unit: '£' } },
        encodings: { y: 'Goal', x: 'Value', goal: 'Target' },
        title: 'Your retirement goal',
        baseSize: { width: 420, height: 120 },
      }),
      expectedSpec: valueBar(),
      expectedFrame: {
        style: { background: '#ffffff', border: '1px solid #cccccc', borderRadius: '5px', padding: '20px' },
        headerHtml: statusBadge,
      },
      observed: 'Flint draws an analytical bullet chart: a grey-blue bar labelled “Meets target” on a 0–70,000 axis with a black target tick at 50,000, a two-entry key and a “Value (£)” axis title — a measuring instrument, not ION’s progress card. Expected: the outlined card, title and green “On track” badge, the 12px rounded track filled to 70% with a dotted half-way mark, and edge-aligned labels.',
    },
    {
      id: 'donut-hole-px',
      title: 'A doughnut hole stated larger than the ring turns it inside out',
      kind: 'realization',
      severity: 'medium',
      probe: 'donut-thickness',
      rule: 'ION’s doughnut is a thick ring whose hole is about 70% of its radius, at every one of its three sizes (240, 253, 280px).',
      current: 'The only way to state the hole is `chartDefaults["Donut Chart"].innerRadius`, which is in px, while the outer radius is chosen by Flint’s layout (60px here, because it keeps a 50px margin for slice labels the theme has switched off). Stating 70 — the guide’s proportion read as a number — gives an inner radius larger than the outer one, and Flint draws an inverted hairline ring with no report.',
      expected: 'A ring 30% of its radius thick, whatever radius the layout settles on.',
      proposal: 'Express the hole as a fraction of the radius (`geometry.arc.innerRadius: 0.7`), clamp any px value below the computed outer radius and report it, and drop the label margin when `dataLabels.show` is `never`.',
      flint: flintInput({ ...theme, chartDefaults: { 'Donut Chart': { innerRadius: 70 } } }, {
        chartType: 'Donut Chart',
        data: COSTS,
        semantic_types: { Cost: 'Category', Amount: { semanticType: 'Amount', unit: '£' } },
        encodings: { size: 'Amount', color: 'Cost' },
      }),
      expectedSpec: vl({
        hconcat: [
          ring(COSTS, 'Cost', 'Amount', { size: 200, inner: 69 }),
          key(COSTS.map((row) => ({ label: row.Cost, value: gbp(row.Amount) })), { width: 250, labelX: 100 }),
        ],
        spacing: 30,
      }),
      observed: 'With `innerRadius: 70` Flint emits `innerRadius 70, outerRadius 60`: a thin ring drawn between 60 and 70px — the hole is wider than the doughnut. No warning is reported. (The theme itself states 42, which gives a ring only at Flint’s default 60px radius.)',
    },
    {
      id: 'wedge-order',
      addressed: { stage: 'M4', note: '`geometry.arc.order: "data"` stacks the wedges in the data’s order, so segment 1 starts at 12 o’clock.' },
      title: 'Wedges are stacked alphabetically, so segment 1 does not start at 12 o’clock',
      kind: 'realization',
      severity: 'high',
      probe: 'pie-rules',
      rule: '“Each of the five potential segments will have a specific colour which must always be placed in the same order”: segment 1 in Aviva blue from 12 o’clock, then clockwise in data order, the key in the same order.',
      current: 'The pie template’s default `sortSlices: "none"` promises data order, and the colour scale (with `sort: null`) and the key do follow it. But no `order` channel is emitted, so Vega-Lite stacks the wedges by the colour field’s own sort — alphabetically. Wedge order and key order disagree, and the first segment lands wherever the alphabet puts it.',
      expected: 'Shares in Aviva blue from 12 o’clock, then Bonds, Property, Cash, Other clockwise — the order of the data and of the key.',
      proposal: 'When `sortSlices` is `none`, emit `order: { field: <row index> }` (or sort the stack by the colour domain as given) so wedges follow the data, and let a theme state `marks.slice.start: "twelve"` and `direction: "clockwise"`.',
      flint: flintInput(theme, {
        chartType: 'Pie Chart',
        data: POT,
        semantic_types: { Asset: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Asset' },
      }),
      expectedSpec: vl({
        hconcat: [
          ring(POT, 'Asset', 'Share', { size: 200, inner: 0 }),
          key(POT.map((row) => ({ label: row.Asset, value: `${row.Share}%` })), { width: 180, labelX: 70 }),
        ],
        spacing: 30,
      }),
    },
    {
      id: 'reveal',
      title: 'Segments draw in clockwise the first time the chart is seen',
      kind: 'product-ui',
      severity: 'low',
      probe: 'entry-animation',
      rule: '“When a chart is revealed for the first time within the viewport it will animate clockwise its data set”; the centre number of a single doughnut counts up to its value.',
      current: 'Flint compiles a static spec; there is no notion of an entry transition in ThemeSpec or the compiled chart.',
      expected: 'Wedges sweep from 12 o’clock on first reveal; the figure counts up.',
      proposal: '`interaction.entry: { kind: "sweep" | "grow" | "none", trigger: "inViewport", durationMs }`, realised by the host renderer.',
    },
    {
      id: 'chart-types',
      title: 'Only pies, doughnuts and value bars exist',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'chart-type-policy',
      rule: 'ION’s “Tables, charts and data” section lists pie, doughnut, horizontal value bar, data group and table — no bar, line or scatter component; pies and doughnuts only on white backgrounds.',
      current: 'A theme cannot say which chart types a house offers; the gallery below draws bars, lines and a heatmap in Aviva’s inks although the house has no such charts.',
      expected: 'A house that lists its chart types lets a host steer authors to them (or warn).',
      proposal: '`chartPolicy: { allowed: [...], discouraged: [...] }` reported in `_theme.report` when violated.',
    },
  ],
  gallery: ['browser-pie', 'mobile-donut', 'renewable-bullet', 'renewable-kpi', 'population', 'medals-grouped', 'electricity-stacked', 'ev-share'],
};

export default aviva;
