import type { ThemeSpec } from 'flint-chart';
import research from '../research/opower.json';
import { flintInput, POPULATION } from '../probes';
import { titled, houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const YOU = '#107CB2';
const SUCCESS = '#8DC63F';
const ALERT = '#D8400F';
const DARKEST = '#1D1D1D';
const QUIET = '#666666';
const MEDIUM_GRAY = '#C1C1C1';
const LIGHT_GRAY = '#E1E1E1';
/** $primary-color-light: a 30% tint of the "you" colour, the area-chart fill. */
const YOU_LIGHT = '#B7D7E8';

const t: HouseTokens = {
  font: FONT,
  text: DARKEST,
  muted: QUIET,
  grid: LIGHT_GRAY,
  axis: null,
  background: '#FFFFFF',
  palette: [YOU, SUCCESS, ALERT, '#990099', '#F9E500'],
  highlight: YOU,
  context: MEDIUM_GRAY,
  titleSize: 20,
  titleWeight: 'bold',
  subtitleSize: 16,
  subtitleColor: DARKEST,
  labelSize: 14,
  sourceSize: 12,
  lineWidth: 3,
};

const theme: ThemeSpec = {
  id: 'opower',
  label: 'Opower (Opattern)',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: DARKEST, secondary: QUIET, muted: QUIET, inverse: '#FFFFFF' },
    structure: { grid: LIGHT_GRAY, axis: MEDIUM_GRAY, zero: LIGHT_GRAY },
    series: {
      single: YOU,
      // Opattern names colours, not a chart palette: primary ("you"), success, alert, weather, attention.
      categorical: [YOU, SUCCESS, ALERT, '#990099', '#F9E500'],
      overflow: MEDIUM_GRAY,
      sequential: { stops: ['#CFE5F0', YOU_LIGHT, YOU], space: 'lab' },
      status: { positive: SUCCESS, negative: ALERT, neutral: MEDIUM_GRAY },
      selection: { signed: 'status', statusUse: 'anySigned' },
    },
    accent: YOU,
  },
  type: {
    headline: { family: FONT, size: 20, weight: 'bold', case: 'asIs', color: DARKEST },
    deck: { family: FONT, size: 16, weight: 'regular', color: DARKEST },
    axisLabel: { family: FONT, size: 14, weight: 'regular', color: QUIET },
    axisTitle: { family: FONT, size: 14, weight: 'regular', color: QUIET },
    keyLabel: { family: FONT, size: 14, color: DARKEST },
    valueLabel: { family: FONT, size: 14, weight: 'regular', color: DARKEST },
    footnote: { family: FONT, size: 12, color: QUIET },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit' },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'omit',
  },
  marks: { bandFraction: 0.6, strokeWeight: 3, strokeJoin: 'miter', interpolation: 'linear', cornerRadius: 0 },
  geometry: {
    line: { width: 3, interpolation: 'linear' },
    point: { presence: 'omit' },
    area: { opacity: 0.3, edge: 'full', edgeWidth: 3, interpolation: 'linear' },
    band: { fraction: 0.6, cornerRadius: 0 },
    // Biggest first from 12 o'clock (M4).
    arc: { gap: 0, order: 'largestFirst' },
  },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['right', 'top'], direction: 'vertical', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'omit', unit: 'everyTick', numberFormat: { precision: 'auto', thousands: 'separator' } },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' }, density: 'airy' },
};

// The guide's own specimen values (column-chart-1.png, read off the image): monthly cost, Aug–Jul.
const MONTHLY = [
  ['Aug', 32.7], ['Sep', 35.8], ['Oct', 15.4], ['Nov', 18.7], ['Dec', 33.5], ['Jan', 23.0],
  ['Feb', 27.0], ['Mar', 21.5], ['Apr', 30.2], ['May', 27.4], ['Jun', 16.7], ['Jul', 35.8],
].map(([Month, Cost]) => ({ Month: Month as string, Cost: Cost as number }));

const dollarAxis = { labelExpr: "datum.value === 0 ? '0' : '$' + datum.label", values: [0, 10, 20, 30, 40] };

function signatureExpected() {
  return titled(t, {
    data: { values: MONTHLY },
    mark: { type: 'bar', color: YOU },
    encoding: {
      x: { field: 'Month', type: 'nominal', sort: null, title: null, scale: { paddingInner: 0.4, paddingOuter: 0.1 }, axis: { labelAngle: 0, labelPadding: 10 } },
      y: { field: 'Cost', type: 'quantitative', title: null, scale: { domain: [0, 40] }, axis: { ...dollarAxis, labelPadding: 14 } },
    },
  }, {
    title: 'Your monthly energy cost',
    subtitle: 'You spent the most in September and July. Aug 2023 – Jul 2024.',
  });
}

// "You" against comparison groups: the colour is given by who the row is, not by its position.
const NEIGHBOURS = [
  { Who: 'You', kWh: 640 },
  { Who: 'Efficient neighbors', kWh: 480 },
  { Who: 'All neighbors', kWh: 910 },
];
const WHO_COLOURS = { You: YOU, 'Efficient neighbors': SUCCESS, 'All neighbors': MEDIUM_GRAY };

function youExpected() {
  return titled(t, {
    data: { values: NEIGHBOURS },
    encoding: {
      y: { field: 'Who', type: 'nominal', sort: null, title: null, axis: { labelColor: DARKEST, labelPadding: 10 } },
      x: { field: 'kWh', type: 'quantitative', title: null, axis: null, scale: { domain: [0, 1050] } },
    },
    layer: [
      {
        mark: { type: 'bar', height: 28 },
        encoding: {
          color: { field: 'Who', type: 'nominal', legend: null, scale: { domain: Object.keys(WHO_COLOURS), range: Object.values(WHO_COLOURS) } },
        },
      },
      {
        mark: { type: 'text', align: 'left', dx: 8, fontSize: 14, color: DARKEST },
        encoding: { text: { field: 'kWh', type: 'quantitative', format: ',' } },
      },
    ],
  }, {
    title: 'You compared to your neighbors',
    subtitle: 'You used 30% less than the average home near you.',
    height: 150,
  });
}

// Change against the same month a year earlier: using more is the bad direction.
const CHANGE = [
  ['Aug', 18], ['Sep', -12], ['Oct', -24], ['Nov', -9], ['Dec', 31], ['Jan', -15],
  ['Feb', -20], ['Mar', 6], ['Apr', -11], ['May', -17], ['Jun', 9], ['Jul', -6],
].map(([Month, change]) => ({ Month: Month as string, 'Change (kWh)': change as number }));

function polarityExpected() {
  return titled(t, {
    data: { values: CHANGE },
    mark: { type: 'bar' },
    encoding: {
      x: { field: 'Month', type: 'nominal', sort: null, title: null, scale: { paddingInner: 0.4 }, axis: { labelAngle: 0, labelPadding: 8 } },
      y: {
        field: 'Change (kWh)', type: 'quantitative', title: null,
        axis: { values: [-30, -15, 0, 15, 30], labelExpr: "datum.value > 0 ? '+' + datum.label : datum.label", labelPadding: 12 },
      },
      color: { condition: { test: "datum['Change (kWh)'] > 0", value: ALERT }, value: SUCCESS },
    },
  }, {
    title: 'Your use compared to last year',
    subtitle: 'You used less than last year in 8 of 12 months. Change in electricity use, kWh.',
  });
}

// The area specimen's hourly readings (area-chart-1.png), one per hour.
const HOURLY = [0.06, 0.06, 0.23, 0.06, 0.07, 0.06, 0.07, 0.13, 0.23, 0.19, 0.22, 0.31, 0.06, 0.2, 0.79, 0.29, 0.14, 0.21, 0.17, 0.27, 0.14, 0.24, 0.3, 0.1]
  .map((kWh, Hour) => ({ Hour, 'Energy use (kWh)': kWh }));
const HOUR_LABEL = "datum.value === 0 ? '12am' : datum.value === 12 ? 'Noon' : datum.value === 23 ? '11pm' : datum.value < 12 ? datum.value + 'am' : (datum.value - 12) + 'pm'";

function unitExpected() {
  return titled(t, {
    layer: [
      {
        data: { values: HOURLY },
        mark: { type: 'area', color: YOU_LIGHT, opacity: 1, line: { color: YOU, strokeWidth: 3, strokeJoin: 'miter' } },
        encoding: {
          x: { field: 'Hour', type: 'quantitative', title: null, scale: { domain: [0, 23], nice: false }, axis: { values: [0, 6, 12, 18, 23], labelExpr: HOUR_LABEL, labelPadding: 10, grid: false } },
          y: {
            field: 'Energy use (kWh)', type: 'quantitative', title: null, scale: { domain: [0, 1] },
            axis: { values: [0, 0.25, 0.5, 0.75, 1], labelExpr: "datum.value === 0 ? '0' : datum.value === 1 ? '1.00 kWh' : format(datum.value, '.2f')", labelPadding: 10 },
          },
        },
      },
      {
        data: { values: [{ Hour: 0, g: '☾' }, { Hour: 12, g: '☼' }, { Hour: 23, g: '☾' }] },
        mark: { type: 'text', fontSize: 15, color: QUIET, dy: 42 },
        encoding: { x: { field: 'Hour', type: 'quantitative' }, y: { value: H }, text: { field: 'g' } },
      },
    ],
  }, {
    title: 'Your energy use yesterday',
    subtitle: 'Your use peaked at 2pm, when your air conditioner was running.',
  });
}

// A cost breakdown: the guide's pie specimen ("Cooling $120 / Uncategorized ----") with every end use filled in.
const BREAKDOWN = [
  { Use: 'Heating', Cost: 310 },
  { Use: 'Water heating', Cost: 150 },
  { Use: 'Appliances', Cost: 130 },
  { Use: 'Cooling', Cost: 120 },
  { Use: 'Uncategorized', Cost: 80 },
  { Use: 'Lighting', Cost: 70 },
];
const PIE_ORDER = ['Heating', 'Water heating', 'Appliances', 'Cooling', 'Lighting', 'Uncategorized'];
const PIE_COLOURS = [YOU, '#44506F', '#5B9BC4', '#8CA0BD', YOU_LIGHT, MEDIUM_GRAY];

function pieExpected() {
  const rows = PIE_ORDER.map((use, i) => ({ ...BREAKDOWN.find((r) => r.Use === use)!, order: i }));
  const domain = { domain: PIE_ORDER, range: PIE_COLOURS };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), legend: { disable: true } },
    title: { text: 'Where your money goes', subtitle: 'Heating accounts for 36% of your energy cost.' },
    hconcat: [
      {
        width: 190,
        height: 210,
        data: { values: rows },
        layer: [
          {
            mark: { type: 'arc', outerRadius: 92, stroke: null, strokeWidth: 0 },
            encoding: {
              theta: { field: 'Cost', type: 'quantitative', stack: true },
              order: { field: 'order', type: 'quantitative' },
              color: { field: 'Use', type: 'nominal', scale: domain },
            },
          },
        ],
      },
      {
        width: 190,
        height: 210,
        data: { values: rows },
        layer: [
          { mark: { type: 'square', size: 150, opacity: 1 }, encoding: { x: { value: 6 }, y: { field: 'order', type: 'ordinal', axis: null, scale: { paddingOuter: 2.2 } }, color: { field: 'Use', type: 'nominal', scale: domain } } },
          { mark: { type: 'text', align: 'left', fontSize: 14, color: DARKEST }, encoding: { x: { value: 24 }, y: { field: 'order', type: 'ordinal' }, text: { field: 'Use' } } },
          { mark: { type: 'text', align: 'right', fontSize: 14, color: DARKEST }, encoding: { x: { value: 186 }, y: { field: 'order', type: 'ordinal' }, text: { condition: { test: "datum.Use === 'Uncategorized'", value: '----' }, field: 'Cost', type: 'quantitative', format: '$,.0f' } } },
        ],
      },
    ],
    spacing: 30,
  };
}

const pieCaption = `<div style="width:190px;margin:-6px 14px 10px;text-align:center;font-family:${FONT};font-size:14px;color:${QUIET}">Jan 1, 2023 - Dec 31, 2023</div>`;

// The daily specimen (column-chart-2.png): 30 days of cost, the month starting on a Monday.
const DAILY = [10.9, 9.5, 11.7, 10.6, 10.9, 8.7, 10.0, 9.2, 6.9, 10.0, 8.0, 8.7, 7.5, 12.6, 8.7, 8.3, 9.7, 9.2, 5.7, 10.7, 9.5, 5.4, 6.9, 5.0, 6.2, 6.4, 9.2, 8.0, 5.4, 4.0]
  .map((Cost, i) => ({ Date: `2024-04-${String(i + 1).padStart(2, '0')}`, Day: i + 1, Cost }));

function dailyExpected() {
  return titled(t, {
    data: { values: DAILY },
    mark: { type: 'bar', color: YOU },
    encoding: {
      x: {
        field: 'Day', type: 'ordinal', title: null, scale: { paddingInner: 0.2 },
        axis: { values: [1, 8, 15, 22, 29], labelExpr: "['Mon', datum.label]", labelAngle: 0, labelAlign: 'left', labelPadding: 10, labelLineHeight: 18 },
      },
      y: { field: 'Cost', type: 'quantitative', title: null, scale: { domain: [0, 16] }, axis: { values: [0, 4, 8, 12, 16], labelExpr: "datum.value === 0 ? '0' : '$' + datum.label", labelPadding: 14 } },
    },
  }, {
    title: 'Your daily energy cost',
    subtitle: 'Your cost fell through April as the weather warmed.',
  });
}

function transposedExpected() {
  return titled(t, {
    data: { values: POPULATION },
    mark: { type: 'bar', color: YOU },
    encoding: {
      y: { field: 'Country', type: 'nominal', sort: null, title: null, scale: { paddingInner: 0.4 }, axis: { labelPadding: 10 } },
      x: { field: 'Population', type: 'quantitative', title: null, axis: { grid: false, values: [0, 500, 1000, 1500], labelPadding: 8 } },
    },
  }, {
    title: 'The most populous countries',
    subtitle: 'Population, millions, 2023',
  });
}

const opower: StyleGuideTheme = {
  id: 'opower',
  org: 'Opower (Oracle Utilities) — Opattern',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch. Stated directly: the Helvetica Neue stack; 20px bold sentence-case heading over a 16px regular insight sentence (the guide pairs every chart with one); 14px quiet-grey (#666666) axis labels; light #E1E1E1 horizontal gridlines only, no axis lines, no ticks, no frame; flat square-cornered columns at about 60% of the band; 3px straight lines; the area fill as a 30% tint under a 3px edge; plain pies with no slice borders; a right-hand, untitled key; horizontal labels; no axis titles (`annotation.axisTitles: "omit"`) with the unit on the ticks.',
    'Approximated: Opattern has no categorical chart palette — it names five colours that each *mean* something (primary = the user, success = efficient, alert = undesirable, weather, attention). They are stated as `categorical` in that order only because the schema needs a list; the guide never asks for them to be handed out by position. The gridline ink is not given; the examples show something close to `$light-gray` #E1E1E1.',
    'Not stated: the meaning of the colours. The "you" colour belongs to whichever row is the user, green to efficient behaviour and red-orange to waste — and for energy a *rise* is the bad direction. The ThemeSpec can only hand out inks by position or by sign. Neither the per-unit tick rule ("$" on every tick, "kWh" on the top tick only, a bare "0"), the weekday-over-day date ticks, nor the pie legend\'s value column has a field. See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Flat solid primary-blue columns with square tops, about 60% of the band; light horizontal gridlines only, no axis lines or ticks; grey 14px labels; "$" on every y tick and a bare "0"; three-letter months; a sentence-case heading with a one-sentence insight.',
      current: 'Flint draws the blue columns, the light grid and the grey labels from the theme. With the cost declared in USD, `annotation.unit: "everyTick"` writes the dollar sign on every tick — but with a decimal (“$40.0”) and on the zero too; the measure name is also appended to the deck by `axisTitles: "omit"`, restating the unit the ticks now carry.',
      expected: 'The guide\'s monthly-cost specimen (column-chart-1.png), with its heading and insight.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: MONTHLY,
        semantic_types: { Month: 'Month', Cost: { semanticType: 'Amount', unit: 'USD' } },
        encodings: { x: 'Month', y: 'Cost' },
        title: 'Your monthly energy cost',
        subtitle: 'You spent the most in September and July. Aug 2023 – Jul 2024.',
      }),
      expectedSpec: signatureExpected(),
      observed: 'Flint (left) re-sorts the months into calendar order, Jan–Dec, although the rows run Aug–Jul — the billing year the chart is about is lost, so the September/July peaks no longer sit at its two ends. The month names are turned −90° despite `labels.`. Ticks read “$0.0 … $40.0” and the deck gains “; Cost ($)”. Expected (right): Aug–Jul, flat three-letter months, “0, $10 … $40”, the insight sentence on one line. Colour, column width, gridlines and the missing axis lines agree.',
    },
    {
      id: 'you-colour',
      title: 'The user\'s own data is always the "you" colour',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'highlight',
      rule: '“Use the primary color for data points that represent the user (it’s the “you” color).” Efficient behaviour is green; comparison groups are neutral grey.',
      current: 'Colour is handed out by position in `ink.series.categorical` (the data order here). Nothing in the chart spec can say which row *is* the user, and nothing in the theme can name a “self” or a “comparison” ink, so the third row gets the third named colour — the alert red-orange.',
      expected: '"You" in primary blue, "Efficient neighbors" in success green, "All neighbors" in grey — whatever order the rows come in.',
      proposal: 'A semantic emphasis slot in the chart spec (`chart_spec.emphasis: { field: "Who", values: ["You"], role: "self" }`) and named roles in the theme (`ink.series.roles: { self, benchmark, context }`), so a house can bind meaning to ink rather than order.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: NEIGHBOURS,
        semantic_types: { Who: 'Category', kWh: { semanticType: 'Quantity', unit: 'kWh' } },
        encodings: { y: 'Who', x: 'kWh', color: 'Who' },
        title: 'You compared to your neighbors',
        subtitle: 'You used 30% less than the average home near you.',
      }),
      expectedSpec: youExpected(),
      observed: '“You” happens to get blue only because it is the first row; “All neighbors” — the neutral benchmark — is painted in the alert red-orange the guide reserves for waste, and a key repeats the three names the axis already prints. Expected: blue / green / grey by meaning, no key, values at the bar ends. Flint also appends “; kWh (kWh)” to the deck.',
    },
    {
      id: 'status-polarity',
      title: 'Green is efficient, red-orange is waste — and more energy is worse',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'status-polarity',
      rule: '"In a chart, the success color represents efficiency … the alert color draws emphasis to unusual or undesirable data points." Don\'t use the alert colour when the user has no control.',
      current: 'The theme states `status.positive` (green), `status.negative` (red-orange) and `selection.signed: "status"`. Two things stand in the way: status only recolours an existing colour field, so a single-series signed bar chart is not coloured by sign at all; and where it is, status is bound to the sign — a rise is “positive”. For energy a rise is the undesirable direction, and there is no field to say so.',
      expected: 'Months where the user used more than last year in red-orange, months with savings in green.',
      proposal: 'Let the measure carry its polarity (`semantic_types: { "Change (kWh)": { semanticType: "Quantity", polarity: "lowerIsBetter" } }`) and have `status` read good/bad, not plus/minus.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: CHANGE,
        semantic_types: { Month: 'Month', 'Change (kWh)': { semanticType: 'Quantity', unit: 'kWh' } },
        encodings: { x: 'Month', y: 'Change (kWh)' },
        title: 'Your use compared to last year',
        subtitle: 'You used less than last year in 8 of 12 months. Change in electricity use, kWh.',
      }),
      expectedSpec: polarityExpected(),
      observed: 'Flint draws every bar in the “you” blue — signed, but uncoloured — and re-sorts the months Jan–Dec with labels turned −90°. Expected: increases (Aug, Dec, Mar, Jun) in red-orange, savings in green, “+15 / +30” on the ticks, Aug–Jul order.',
    },
    {
      id: 'unit-placement',
      title: 'Units on the ticks: "$" on every tick, "kWh" on the top one, a bare "0"',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'unit-placement',
      rule: 'No axis title; the unit is written on the tick labels — "$40 … $10, 0" for money, "1.00 kWh, 0.75, 0.50, 0.25, 0" for energy. The baseline is always a bare "0".',
      current: '`annotation.unit` takes one placement for the whole house (`everyTick`, which suits money), and it only ever applies to units Flint recognises as tick units — currencies and a short suffix list. “kWh” is not on it, so it is never written on a tick: it goes to the deck as “Energy use (kWh)” instead. There is no way to ask for the unit on the top tick only, or for a bare zero. The area shows how `geometry.area` (30% fill, 3px edge) is realised.',
      expected: 'The hourly area specimen: "1.00 kWh" on the top tick only, two-decimal ticks below, a bare "0"; 12am / 6am / Noon / 6pm / 11pm.',
      proposal: '`annotation.unit` keyed by unit kind (`{ currency: "everyTick", physical: "lastTick" }`) plus `annotation.unitOnZero: false`.',
      flint: flintInput(theme, {
        chartType: 'Area Chart',
        data: HOURLY,
        semantic_types: { Hour: 'Hour', 'Energy use (kWh)': { semanticType: 'Quantity', unit: 'kWh' } },
        encodings: { x: 'Hour', y: 'Energy use (kWh)' },
        title: 'Your energy use yesterday',
        subtitle: 'Your use peaked at 2pm, when your air conditioner was running.',
      }),
      expectedSpec: unitExpected(),
      observed: 'Flint: bare ticks 0–0.8 with one decimal, the unit moved into the deck; the 3px blue edge the theme states (`area.edge: "full"`, `edgeWidth: 3`) is not drawn — only the pale fill; vertical gridlines appear on the hour axis although `grid.category` is `omit` (the hour is treated as a second measure); x ticks are bare hours “0, 5, 10”. Expected: “1.00 kWh” on the top tick only, “0.75 / 0.50 / 0.25”, bare “0”; the 3px line over the tint; 12am / 6am / Noon / 6pm / 11pm with the moon/sun marks.',
    },
    {
      id: 'pie-rules',
      addressed: { stage: 'M4', note: '`geometry.arc.order: "largestFirst"` runs the slices biggest first from 12 o’clock. The residual’s grey and values in the key stay open.' },
      title: 'Pie: biggest first from 12 o\'clock, grey "Uncategorized" last, values in the key',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'pie-rules',
      rule: '"Show 7 slices max, biggest one first. Align the main piece so it starts at 12 o\'clock." Missing data is a light-grey "Uncategorized" slice. The key sits to the right with a value column ("Cooling $120"); a grey date range sits under the pie.',
      current: 'Flint draws the pie with a right-hand key. The residual slice takes the next categorical ink by position, the sixth slice is folded into an “Others” wedge because the house names five inks, the key has no value column, and there is no slot for the date caption.',
      expected: 'Slices largest-first clockwise from 12 o\'clock, "Uncategorized" grey and last whatever its size, a key with values, the period beneath.',
      proposal: '`legend.values: "beside"` for part-to-whole keys; `ink.series.residual` for "Other / Uncategorized" (and a semantic marker for residual categories); a `chart_spec.period` or caption slot.',
      flint: flintInput(theme, {
        chartType: 'Pie Chart',
        data: BREAKDOWN,
        semantic_types: { Use: 'Category', Cost: { semanticType: 'Amount', unit: 'USD' } },
        encodings: { size: 'Cost', color: 'Use' },
        title: 'Where your money goes',
        subtitle: 'Heating accounts for 36% of your energy cost.',
      }),
      expectedSpec: pieExpected(),
      observed: 'Flint: “Uncategorized” takes the yellow attention colour and a real end use (Lighting) is folded into “Others (1)” in grey — the opposite of the guide, which keeps every use and greys only the unknown. Appliances is painted in the alert red-orange. Heating is laid counter-clockwise from 12 o’clock, so the main piece ends rather than starts at 12. Round key swatches, no values. Expected: blue family by size from 12 o’clock clockwise, grey “Uncategorized” last, square swatches with “$310 … ----”, the period under the pie.',
      expectedFrame: { footerHtml: pieCaption },
    },
    {
      id: 'date-label-format',
      title: 'Daily axes: weekday over day number, on Mondays only',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'date-label-format',
      rule: 'Daily charts label each week\'s Monday as "Mon" over the day number ("Mon / 1, 8, 15, 22, 29"); months are three letters; labels are never angled.',
      current: 'No ThemeSpec field governs temporal tick text or which weekday anchors a tick; Flint picks its own date format and spacing for 30 daily columns.',
      expected: 'The daily-cost specimen: 30 narrow columns, two-line "Mon / n" ticks under each Monday.',
      proposal: '`annotation.dateLabels: { day: ["weekdayShort", "dayOfMonth"], anchor: "monday", stacked: true }`.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: DAILY.map(({ Date, Cost }) => ({ Date, Cost })),
        semantic_types: { Date: 'Date', Cost: { semanticType: 'Amount', unit: 'USD' } },
        encodings: { x: 'Date', y: 'Cost' },
        title: 'Your daily energy cost',
        subtitle: 'Your cost fell through April as the weather warmed.',
      }),
      expectedSpec: dailyExpected(),
      observed: 'Flint labels every other day “April 2024, 3, 5 … 29” at −45°, and shrinks both axes to about 7px — half the 14px the theme states — to fit 30 columns into the width; ticks read “$0.0 … $15.0”. Expected: 14px “Mon / 1 … Mon / 29” under each Monday, “$4 … $16”, a bare 0.',
    },
    {
      id: 'chart-type-policy',
      title: 'Count limits that switch or refuse a chart',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'chart-type-policy',
      rule: 'At most 30 columns; at most 4 lines and at least 5 time points; at most 7 pie slices; no donuts; if labels would have to be angled, use horizontal bars instead; if more than 2 of 10 bars are missing, don\'t make a bar chart.',
      current: 'There is no field for a maximum series, category or slice count, or a minimum number of time points; Flint draws a 40-column or 6-line chart as readily as a 12-column one (and folds a sixth pie slice into "Others" by its own rule, not the house\'s).',
      expected: 'The theme reports (or the recommender honours) the house limits: a 40-column request is flagged, crowded column labels become a horizontal bar chart.',
      proposal: '`chartPolicy: { maxCategories: { band: 30, arc: 7 }, maxSeries: { line: 4 }, minPoints: { line: 5 }, onCrowdedLabels: "transpose" }` as reported guidance, not silent rewrites.',
    },
  ],
};

export default opower;
