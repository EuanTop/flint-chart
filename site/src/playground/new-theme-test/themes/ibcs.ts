import type { ThemeSpec } from 'flint-chart';
import research from '../research/ibcs.json';
import { BROWSERS, EV_SHARE, MEDALS, flintInput } from '../probes';
import { houseConfig, W, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

// IBCS prescribes a notation, not a brand: no hex codes anywhere in the standard. The greys, the
// green/red pair and the highlight blue below are the values the common IBCS templates use.
const FONT = 'Arimo, Arial, Helvetica, sans-serif';
const AC = '#404040';
const PY = '#A6A6A6';
const GOOD = '#8CB400';
const BAD = '#FF0000';
const BLUE = '#0070C0';

const t: HouseTokens = {
  font: FONT,
  text: '#000000',
  muted: '#000000',
  grid: null,
  axis: '#000000',
  background: '#FFFFFF',
  palette: [AC, PY, '#D9D9D9'],
  highlight: BLUE,
  context: PY,
  titleSize: 14,
  subtitleSize: 11.5,
  subtitleColor: '#000000',
  labelSize: 11,
  sourceSize: 10.5,
  gridAxis: 'none',
  legendOrient: 'none',
};

const theme: ThemeSpec = {
  id: 'ibcs',
  label: 'IBCS (International Business Communication Standards)',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: '#000000', secondary: '#000000', muted: '#595959' },
    structure: { axis: '#000000', grid: '#D9D9D9', rule: '#000000', zero: '#000000' },
    series: {
      // Actual is the single ink. There is no categorical palette in IBCS: scenarios are told apart by
      // fill (solid, light, outlined, hatched) and categories by position, so this is a ladder of greys.
      single: AC,
      categorical: [AC, PY, '#7F7F7F', '#D9D9D9'],
      overflow: '#D9D9D9',
      sequential: { stops: ['#F2F2F2', '#BFBFBF', '#7F7F7F', '#404040', '#000000'], space: 'lab' },
      // Red and green belong to variances only, so a diverging ramp runs grey to the highlight blue.
      diverging: { stops: [AC, '#F2F2F2', BLUE], neutral: '#F2F2F2', space: 'lab' },
      status: { positive: GOOD, negative: BAD, neutral: PY },
      selection: { signed: 'status', statusUse: 'anySigned', partToWhole: 'categorical' },
    },
    accent: BLUE,
  },
  type: {
    headline: { family: FONT, size: 14, weight: 'bold', case: 'asIs', color: '#000000' },
    deck: { family: FONT, size: 11.5, weight: 'regular', color: '#000000' },
    axisLabel: { family: FONT, size: 11, color: '#000000' },
    axisTitle: { family: FONT, size: 11, color: '#000000' },
    keyLabel: { family: FONT, size: 11, color: '#000000' },
    valueLabel: { family: FONT, size: 11, color: '#000000' },
    annotation: { family: FONT, size: 10.5, color: '#000000' },
    footnote: { family: FONT, size: 10.5, color: '#000000' },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1, ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit', suppressWhenValuesPrinted: true },
    },
    grid: { measure: 'omit', category: 'omit' },
    frame: 'omit',
    baseline: 'full',
  },
  // A group's columns stand 2px apart, a column's width between groups (G1), as the medal specimen draws them.
  marks: { bandFraction: 0.67, strokeWeight: 2, cornerRadius: 0, group: { gap: '2px', spacing: 1 } },
  labels: { truncation: 'never' },
  // Scenario names are written beside the series, never in a key box.
  legend: { show: 'always', placement: ['seriesEnd', 'inline', 'top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'always', placement: 'outsideMark', inkMode: 'fixed' },
  annotation: {
    axisTitles: 'omit',
    unit: 'never',
    numberFormat: { precision: 'integer', thousands: 'separator' },
  },
  layout: { density: 'compact', titleBlock: { anchor: 'start', gap: 'tight', deckGap: 'tight' } },
};

// ---------------------------------------------------------------------------
// Shared notation: hatch patterns, the message + who/what/when title block.

/** SVG patterns for the expected panels' fills (`url(#…)`): forecast hatching, in grey and in the variance inks. */
const PATTERNS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'
  + `<pattern id="ibcs-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#ffffff"/><rect width="1.6" height="4" fill="${AC}"/></pattern>`
  + `<pattern id="ibcs-hatch-good" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#ffffff"/><rect width="1.8" height="4" fill="${GOOD}"/></pattern>`
  + `<pattern id="ibcs-hatch-bad" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#ffffff"/><rect width="1.8" height="4" fill="${BAD}"/></pattern>`
  + '</defs></svg>';

/** The IBCS title: a message sentence over a rule, then who / **what** in unit / when. */
function titleBlock(o: { message: string; who: string; what: string; unit: string; when: string }) {
  return PATTERNS
    + `<div style="font-family:${FONT};color:#000;margin:0 14px 2px">`
    + `<div style="font-size:14px;font-weight:700;line-height:1.25;padding-bottom:5px;border-bottom:1px solid #000">${o.message}</div>`
    + `<div style="font-size:11.5px;line-height:1.3;margin-top:5px">${o.who}<br><b>${o.what}</b> in ${o.unit}<br>${o.when}</div>`
    + '</div>';
}

const notes = (lines: [string, string][]) =>
  `<div style="font-family:${FONT};font-size:10.5px;line-height:1.3;color:#000;margin:2px 14px 8px">`
  + lines.map(([n, text]) => `<div style="margin-top:2px"><span style="display:inline-block;width:13px;height:13px;border:1px solid #000;border-radius:50%;text-align:center;font-size:9px;line-height:13px;margin-right:5px">${n}</span>${text}</div>`).join('')
  + '</div>';

const signedText = "(datum.v > 0 ? '+' : '') + format(datum.v, 'd')";

// ---------------------------------------------------------------------------
// Signature: Figure 20 — monthly PY / AC / FC with ΔPY and ΔPY% tiers.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CM_AC = [128, 147, 136, 139, 170, 193, 178, 189, 178, 179, 189, 211];
const CM_DPY = [13, 13, -5, -13, -4, 10, 26, 25, 6, -5, -12, 28];
const MARGIN = MONTHS.map((Month, i) => {
  const ac = CM_AC[i];
  const py = ac - CM_DPY[i];
  return { Month, Scenario: i < 9 ? 'AC' : 'FC', AC: ac, PY: py, dPY: CM_DPY[i], dPYpct: Math.round((CM_DPY[i] / py) * 100) };
});

const monthX = (axis: boolean) => ({
  field: 'Month', type: 'ordinal', sort: MONTHS, title: null,
  scale: { paddingInner: 0, paddingOuter: 0 },
  axis: axis ? { domain: true, domainColor: '#000', domainWidth: 1.5, ticks: false, labelAngle: 0, labelPadding: 5, labelColor: '#000', labelFontSize: 11 } : null,
});

/** The vertical rule between the last actual month and the first forecast month. */
const separator = (at: string, axis: unknown = null) => ({
  data: { values: [{}] },
  mark: { type: 'rule', color: '#000', strokeWidth: 0.8 },
  encoding: { x: { datum: at, type: 'ordinal', bandPosition: 0, title: null, axis } },
});

const tierLabel = (text: string, y = 0) => ({
  data: { values: [{}] },
  mark: { type: 'text', align: 'right', baseline: 'middle', clip: false, fontSize: 11, fontWeight: 'bold', text },
  encoding: { x: { value: -8 }, y: { datum: y, type: 'quantitative', axis: null } },
});

const zeroLine = (color = PY, width = 2) => ({
  data: { values: [{}] },
  mark: { type: 'rule', color, strokeWidth: width },
  encoding: { y: { datum: 0, type: 'quantitative', axis: null } },
});

const varianceInk = "datum.v < 0 ? '" + BAD + "' : '" + GOOD + "'";

/** A relative-variance tier: thin pins with square heads on a baseline. */
function pinTier(rows: Record<string, unknown>[], x: Record<string, unknown>, value: string, domain: [number, number], height: number, label: string, horizontal = false) {
  const pos = horizontal ? 'x' : 'y';
  const pos2 = horizontal ? 'x2' : 'y2';
  const cat = horizontal ? 'y' : 'x';
  const v = { field: 'v', type: 'quantitative', scale: { domain }, axis: null, title: null };
  return {
    ...(horizontal ? { width: height } : { height }),
    data: { values: rows },
    transform: [{ calculate: `datum['${value}']`, as: 'v' }, { calculate: varianceInk, as: 'ink' }],
    layer: [
      horizontal
        ? { data: { values: [{}] }, mark: { type: 'rule', color: PY, strokeWidth: 2 }, encoding: { x: { datum: 0, type: 'quantitative', scale: { domain }, axis: null } } }
        : { ...zeroLine(), encoding: { y: { datum: 0, type: 'quantitative', scale: { domain }, axis: null } } },
      { mark: { type: 'rule', strokeWidth: 2 }, encoding: { [cat]: x, [pos]: v, [pos2]: { datum: 0 }, color: { field: 'ink', type: 'nominal', scale: null, legend: null } } },
      { mark: { type: 'square', size: 34, filled: true, opacity: 1, color: '#000' }, encoding: { [cat]: x, [pos]: v } },
      {
        transform: [{ filter: 'datum.v >= 0' }],
        mark: horizontal ? { type: 'text', align: 'left', dx: 7, fontSize: 10.5 } : { type: 'text', baseline: 'bottom', dy: -6, fontSize: 10.5 },
        encoding: { [cat]: x, [pos]: v, text: { value: { expr: signedText } } },
      },
      {
        transform: [{ filter: 'datum.v < 0' }],
        mark: horizontal ? { type: 'text', align: 'right', dx: -7, fontSize: 10.5 } : { type: 'text', baseline: 'top', dy: 6, fontSize: 10.5 },
        encoding: { [cat]: x, [pos]: v, text: { value: { expr: signedText } } },
      },
      ...(horizontal ? [] : [tierLabel(label)]),
    ],
  };
}

function signatureExpected() {
  const x = monthX(false);
  const pctTier = { ...pinTier(MARGIN, x, 'dPYpct', [-16, 26], 62, 'ΔPY%'), width: W };
  pctTier.layer.push(separator('Oct') as never);
  const absTier = {
    width: W,
    height: 54,
    data: { values: MARGIN },
    transform: [
      { calculate: 'datum.dPY', as: 'v' },
      { calculate: `datum.Scenario === 'FC' ? (datum.v < 0 ? 'url(#ibcs-hatch-bad)' : 'url(#ibcs-hatch-good)') : (${varianceInk})`, as: 'fill' },
      { calculate: varianceInk, as: 'ink' },
    ],
    layer: [
      { mark: { type: 'bar', width: { band: 0.62 }, strokeWidth: 1 }, encoding: { x, y: { field: 'v', type: 'quantitative', scale: { domain: [-28, 44] }, axis: null }, y2: { datum: 0 }, color: { field: 'fill', type: 'nominal', scale: null, legend: null }, stroke: { field: 'ink', type: 'nominal', scale: null, legend: null } } },
      zeroLine(),
      { transform: [{ filter: 'datum.v >= 0' }], mark: { type: 'text', baseline: 'bottom', dy: -3, fontSize: 10.5 }, encoding: { x, y: { field: 'v', type: 'quantitative', axis: null }, text: { value: { expr: signedText } } } },
      { transform: [{ filter: 'datum.v < 0' }], mark: { type: 'text', baseline: 'top', dy: 3, fontSize: 10.5 }, encoding: { x, y: { field: 'v', type: 'quantitative', axis: null }, text: { value: { expr: signedText } } } },
      tierLabel('ΔPY'),
      separator('Oct'),
    ],
  };
  const y = { type: 'quantitative', scale: { domain: [0, 235] }, axis: null, title: null };
  const xb = monthX(true);
  const baseTier = {
    width: W,
    height: 150,
    data: { values: MARGIN },
    transform: [{ calculate: "datum.Scenario === 'FC' ? 'url(#ibcs-hatch)' : '" + AC + "'", as: 'fill' }],
    layer: [
      { mark: { type: 'bar', width: { band: 0.56 }, xOffset: -5, color: PY }, encoding: { x: xb, y: { field: 'PY', ...y } } },
      { mark: { type: 'bar', width: { band: 0.56 }, xOffset: 2, stroke: AC, strokeWidth: 1 }, encoding: { x: xb, y: { field: 'AC', ...y }, color: { field: 'fill', type: 'nominal', scale: null, legend: null } } },
      { mark: { type: 'text', baseline: 'bottom', dy: -3, xOffset: 2, fontSize: 10.5 }, encoding: { x: xb, y: { field: 'AC', ...y }, text: { field: 'AC', type: 'quantitative' } } },
      { transform: [{ filter: "datum.Month === 'Jan'" }], mark: { type: 'text', align: 'right', dx: -16, baseline: 'middle', fontSize: 11, fontWeight: 'bold', text: 'PY' }, encoding: { x: xb, y: { field: 'PY', ...y } } },
      { transform: [{ filter: "datum.Month === 'Dec'" }], mark: { type: 'text', align: 'left', dx: 14, dy: -10, fontSize: 12, text: '①' }, encoding: { x: xb, y: { field: 'AC', ...y } } },
      separator('Oct', xb.axis),
    ],
  };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 44, right: 24, top: 6, bottom: 6 } },
    spacing: 4,
    vconcat: [pctTier, absTier, baseTier],
    resolve: { scale: { x: 'shared' } },
  };
}

const marginLong = MARGIN.flatMap((row) => [
  { Month: row.Month, Scenario: 'PY', 'Contribution margin': row.PY },
  { Month: row.Month, Scenario: row.Scenario, 'Contribution margin': row.AC },
]);

// ---------------------------------------------------------------------------
// Scenario notation: PY / AC / PL quarterly columns, FC in Q4.

const QUARTERS = [
  { Quarter: 'Q1', PY: 26, AC: 30, PL: 28, Scenario: 'AC' },
  { Quarter: 'Q2', PY: 21, AC: 16, PL: 30, Scenario: 'AC' },
  { Quarter: 'Q3', PY: 41, AC: 49, PL: 37, Scenario: 'AC' },
  { Quarter: 'Q4', PY: 52, AC: 61, PL: 46, Scenario: 'FC' },
];
const quartersLong = QUARTERS.flatMap((q) => [
  { Quarter: q.Quarter, Scenario: 'PY', 'Net sales': q.PY },
  { Quarter: q.Quarter, Scenario: q.Scenario, 'Net sales': q.AC },
  { Quarter: q.Quarter, Scenario: 'PL', 'Net sales': q.PL },
]);

function scenarioExpected() {
  const x = { field: 'Quarter', type: 'ordinal', title: null, scale: { paddingInner: 0.3, paddingOuter: 0.35 }, axis: { domain: true, domainColor: '#000', domainWidth: 1.5, ticks: false, labelAngle: 0, labelPadding: 5, labelColor: '#000', labelFontSize: 12 } };
  const y = { type: 'quantitative', scale: { domain: [0, 68] }, axis: null, title: null };
  const band = { band: 0.62 };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 30, right: 30, top: 8, bottom: 6 } },
    width: W - 60,
    height: 180,
    data: { values: QUARTERS },
    transform: [{ calculate: "datum.Scenario === 'FC' ? 'url(#ibcs-hatch)' : '" + AC + "'", as: 'fill' }],
    layer: [
      { mark: { type: 'bar', width: band, xOffset: -8, color: PY }, encoding: { x, y: { field: 'PY', ...y } } },
      { mark: { type: 'bar', width: band, xOffset: 8, color: '#FFFFFF', stroke: AC, strokeWidth: 1.2 }, encoding: { x, y: { field: 'PL', ...y } } },
      { mark: { type: 'bar', width: band, stroke: AC, strokeWidth: 1 }, encoding: { x, y: { field: 'AC', ...y }, color: { field: 'fill', type: 'nominal', scale: null, legend: null } } },
      { mark: { type: 'text', baseline: 'bottom', dy: -3, fontSize: 12 }, encoding: { x, y: { field: 'AC', ...y }, text: { field: 'AC', type: 'quantitative' } } },
      { data: { values: [{}] }, mark: { type: 'rule', color: '#000', strokeWidth: 0.8 }, encoding: { x: { datum: 'Q4', type: 'ordinal', bandPosition: -0.18 }, y: { value: 30 }, y2: { value: 180 } } },
      // Scenario names written beside the columns, where a key would be.
      { transform: [{ filter: "datum.Quarter === 'Q1'" }], mark: { type: 'text', align: 'right', dx: -32, dy: 6, fontSize: 11.5, text: 'PY' }, encoding: { x, y: { field: 'PY', ...y } } },
      { transform: [{ filter: "datum.Quarter === 'Q1'" }], mark: { type: 'text', align: 'right', dx: -32, dy: -8, fontSize: 11.5, text: 'AC' }, encoding: { x, y: { field: 'AC', ...y } } },
      { transform: [{ filter: "datum.Quarter === 'Q4'" }], mark: { type: 'text', align: 'left', dx: 32, dy: 10, fontSize: 11.5, text: 'PL' }, encoding: { x, y: { field: 'PL', ...y } } },
      { transform: [{ filter: "datum.Quarter === 'Q4'" }], mark: { type: 'text', align: 'left', dx: 32, dy: -6, fontSize: 11.5, text: 'FC' }, encoding: { x, y: { field: 'AC', ...y } } },
    ],
  };
}

// ---------------------------------------------------------------------------
// Variance chart: Figure 23 — structure on the vertical axis, ΔPL and ΔPL% tiers.

const STORES = [
  ['Munich', 188, 34, 22], ['Dusseldorf', 131, 31, 31], ['Berlin', 211, 10, 5], ['Frankfurt', 79, 9, 13],
  ['Hamburg', 197, -4, -2], ['Bremen', 59, -29, -33], ['Bielefeld', 78, -31, -28], ['Cologne', 69, -97, -58],
].map(([Store, ac, d, pct]) => ({ Store: Store as string, AC: ac as number, PL: (ac as number) - (d as number), dPL: d as number, dPLpct: pct as number }));
const STORE_ORDER = STORES.map((row) => row.Store);

function varianceExpected() {
  const y = { field: 'Store', type: 'nominal', sort: STORE_ORDER, title: null, scale: { paddingInner: 0.28, paddingOuter: 0.2 } };
  const yAxis = { ...y, axis: { domain: false, ticks: false, labelColor: '#000', labelFontSize: 11, labelPadding: 6 } };
  const yHidden = { ...y, axis: null };
  const header = (text: string, x: number) => ({
    data: { values: [{}] },
    mark: { type: 'text', align: 'left', baseline: 'bottom', clip: false, fontSize: 11, fontWeight: 'bold', text },
    encoding: { x: { value: x }, y: { value: -4 } },
  });
  const base = {
    width: 170,
    height: 190,
    data: { values: STORES },
    layer: [
      { mark: { type: 'bar', height: { band: 0.62 }, yOffset: -4, color: '#FFFFFF', stroke: AC, strokeWidth: 1 }, encoding: { y: yAxis, x: { field: 'PL', type: 'quantitative', scale: { domain: [0, 240] }, axis: null } } },
      { mark: { type: 'bar', height: { band: 0.62 }, yOffset: 2, color: AC }, encoding: { y: yAxis, x: { field: 'AC', type: 'quantitative' } } },
      { mark: { type: 'text', align: 'left', dx: 4, yOffset: 2, fontSize: 10.5 }, encoding: { y: yAxis, x: { field: 'AC', type: 'quantitative' }, text: { field: 'AC', type: 'quantitative' } } },
      { data: { values: [{}] }, mark: { type: 'rule', color: '#000', strokeWidth: 1.5 }, encoding: { x: { datum: 0, type: 'quantitative' } } },
      header('AC  PL', 0),
    ],
  };
  const abs = {
    width: 120,
    height: 190,
    data: { values: STORES },
    transform: [{ calculate: 'datum.dPL', as: 'v' }, { calculate: varianceInk, as: 'ink' }],
    layer: [
      { mark: { type: 'bar', height: { band: 0.62 } }, encoding: { y: yHidden, x: { field: 'v', type: 'quantitative', scale: { domain: [-100, 40] }, axis: null }, x2: { datum: 0 }, color: { field: 'ink', type: 'nominal', scale: null, legend: null } } },
      { data: { values: [{}] }, mark: { type: 'rule', color: PY, strokeWidth: 2 }, encoding: { x: { datum: 0, type: 'quantitative' } } },
      { transform: [{ filter: 'datum.v >= 0' }], mark: { type: 'text', align: 'left', dx: 3, fontSize: 10.5 }, encoding: { y: yHidden, x: { field: 'v', type: 'quantitative' }, text: { value: { expr: signedText } } } },
      { transform: [{ filter: 'datum.v < 0' }], mark: { type: 'text', align: 'right', dx: -3, fontSize: 10.5 }, encoding: { y: yHidden, x: { field: 'v', type: 'quantitative' }, text: { value: { expr: signedText } } } },
      header('ΔPL', 72),
    ],
  };
  const pct = pinTier(STORES, yHidden, 'dPLpct', [-75, 45], 110, 'ΔPL%', true);
  (pct as { height?: number }).height = 190;
  pct.layer.push(header('ΔPL%', 66) as never);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 8, right: 22, top: 18, bottom: 6 } },
    spacing: 10,
    hconcat: [base, abs, pct],
    resolve: { scale: { y: 'shared' } },
  };
}

// ---------------------------------------------------------------------------
// Forecast: one series, actual months solid, forecast months hatched.

function forecastExpected() {
  const x = { ...monthX(true), scale: { paddingInner: 0.3, paddingOuter: 0.15 } };
  const y = { type: 'quantitative', scale: { domain: [0, 232] }, axis: null, title: null };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 10, right: 30, top: 8, bottom: 6 } },
    width: W,
    height: 170,
    data: { values: MARGIN },
    transform: [{ calculate: "datum.Scenario === 'FC' ? 'url(#ibcs-hatch)' : '" + AC + "'", as: 'fill' }],
    layer: [
      { mark: { type: 'bar', stroke: AC, strokeWidth: 1 }, encoding: { x, y: { field: 'AC', ...y }, color: { field: 'fill', type: 'nominal', scale: null, legend: null } } },
      { mark: { type: 'text', baseline: 'bottom', dy: -3, fontSize: 10.5 }, encoding: { x, y: { field: 'AC', ...y }, text: { field: 'AC', type: 'quantitative' } } },
      { data: { values: [{}] }, mark: { type: 'rule', color: '#000', strokeWidth: 0.8 }, encoding: { x: { datum: 'Oct', type: 'ordinal', bandPosition: -0.15 } } },
      { transform: [{ filter: "datum.Month === 'Jan' || datum.Month === 'Oct'" }], mark: { type: 'text', baseline: 'top', fontSize: 11, fontWeight: 'bold' }, encoding: { x, y: { value: -6 }, text: { field: 'Scenario' } } },
    ],
  };
}

// ---------------------------------------------------------------------------
// Polarity: a cost variance where a fall is good — green below zero.

const COSTS = [
  ['Personnel', 12], ['Material', -9], ['Energy', 6], ['Logistics', -4], ['Marketing', -7], ['IT', 3],
].map(([Cost, v]) => ({ 'Cost type': Cost as string, 'ΔPY': v as number }));

function polarityExpected() {
  const y = { field: 'Cost type', type: 'nominal', sort: null, title: null, axis: { domain: false, ticks: false, labelColor: '#000', labelFontSize: 11, labelPadding: 8 } };
  // Costs: more is bad. Colour reads the business impact, not the sign.
  const ink = `datum['ΔPY'] > 0 ? '${BAD}' : '${GOOD}'`;
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 10, right: 24, top: 18, bottom: 6 } },
    width: 250,
    height: 170,
    data: { values: COSTS },
    transform: [{ calculate: ink, as: 'ink' }, { calculate: "datum['ΔPY']", as: 'v' }],
    layer: [
      { mark: { type: 'bar', height: { band: 0.62 } }, encoding: { y, x: { field: 'v', type: 'quantitative', scale: { domain: [-14, 16] }, axis: null }, x2: { datum: 0 }, color: { field: 'ink', type: 'nominal', scale: null, legend: null } } },
      { data: { values: [{}] }, mark: { type: 'rule', color: PY, strokeWidth: 2 }, encoding: { x: { datum: 0, type: 'quantitative' } } },
      { transform: [{ filter: 'datum.v >= 0' }], mark: { type: 'text', align: 'left', dx: 3, fontSize: 10.5 }, encoding: { y, x: { field: 'v', type: 'quantitative' }, text: { value: { expr: signedText } } } },
      { transform: [{ filter: 'datum.v < 0' }], mark: { type: 'text', align: 'right', dx: -3, fontSize: 10.5 }, encoding: { y, x: { field: 'v', type: 'quantitative' }, text: { value: { expr: signedText } } } },
      { data: { values: [{}] }, mark: { type: 'text', align: 'center', baseline: 'bottom', clip: false, fontSize: 11, fontWeight: 'bold', text: 'ΔPY (↓)' }, encoding: { x: { datum: 0, type: 'quantitative' }, y: { value: -4 } } },
    ],
  };
}

// ---------------------------------------------------------------------------
// No pies: the share chart as sorted bars.

function barsInsteadOfPie() {
  const rows = BROWSERS.slice().sort((a, b) => b.Share - a.Share);
  const y = { field: 'Browser', type: 'nominal', sort: null, title: null, axis: { domain: false, ticks: false, labelColor: '#000', labelFontSize: 11, labelPadding: 8 } };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 10, right: 24, top: 8, bottom: 6 } },
    width: 260,
    height: 150,
    data: { values: rows },
    layer: [
      { mark: { type: 'bar', height: { band: 0.62 }, color: AC }, encoding: { y, x: { field: 'Share', type: 'quantitative', axis: null } } },
      { mark: { type: 'text', align: 'left', dx: 4, fontSize: 10.5 }, encoding: { y, x: { field: 'Share', type: 'quantitative' }, text: { field: 'Share', type: 'quantitative', format: '.0f' } } },
      { data: { values: [{}] }, mark: { type: 'rule', color: '#000', strokeWidth: 1.5 }, encoding: { x: { datum: 0, type: 'quantitative' } } },
    ],
  };
}

// ---------------------------------------------------------------------------
// Every column labelled — including dodged ones — and still no axis or grid.

const MEDAL_ORDER = ['Gold', 'Silver', 'Bronze'];

function labelledGroupsExpected() {
  const x = { field: 'Country', type: 'nominal', sort: null, title: null, scale: { paddingInner: 0.22 }, axis: { domain: true, domainColor: '#000', domainWidth: 1.5, ticks: false, labelAngle: 0, labelColor: '#000', labelFontSize: 11, labelPadding: 5, labelExpr: "datum.label === 'United States' ? 'USA' : datum.label" } };
  const xOffset = { field: 'Medal', sort: MEDAL_ORDER, scale: { paddingInner: 0.08 } };
  const y = { field: 'Count', type: 'quantitative', axis: null, title: null, scale: { domain: [0, 48] } };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 10, right: 10, top: 8, bottom: 6 } },
    width: W,
    height: 170,
    data: { values: MEDALS },
    encoding: { x, xOffset, y },
    layer: [
      { mark: { type: 'bar' }, encoding: { color: { field: 'Medal', type: 'nominal', sort: MEDAL_ORDER, scale: { domain: MEDAL_ORDER, range: [AC, PY, '#7F7F7F'] }, legend: { orient: 'top', direction: 'horizontal', title: null, symbolType: 'square', labelFontSize: 11, labelColor: '#000' } } } },
      { mark: { type: 'text', baseline: 'bottom', dy: -2, fontSize: 9.5 }, encoding: { text: { field: 'Count', type: 'quantitative' } } },
    ],
  };
}

// ---------------------------------------------------------------------------
// Series names in black, whatever grey the series takes.

const EV_NAMES = ['Norway', 'China', 'Germany', 'United States'];

function darkSeriesLabelsExpected() {
  const rows = EV_SHARE.filter((row) => EV_NAMES.includes(row.Country));
  const last = rows.filter((row) => row.Year === 2023);
  const color = { field: 'Country', type: 'nominal', scale: { domain: EV_NAMES, range: [AC, PY, '#7F7F7F', '#D9D9D9'] }, legend: null };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 10, right: 10, top: 8, bottom: 6 } },
    width: W - 70,
    height: 180,
    layer: [
      {
        data: { values: rows },
        mark: { type: 'line', strokeWidth: 2 },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, axis: { format: 'd', values: [2018, 2019, 2020, 2021, 2022, 2023], domain: true, domainColor: '#000', domainWidth: 1.5, ticks: false, grid: false, labelColor: '#000' } },
          y: { field: 'EV share (%)', type: 'quantitative', axis: null, title: null },
          color,
        },
      },
      {
        data: { values: last },
        mark: { type: 'text', align: 'left', dx: 6, fontSize: 11, color: '#000' },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'EV share (%)', type: 'quantitative' }, text: { field: 'label' } },
        transform: [{ calculate: "datum.Country + ' ' + format(datum['EV share (%)'], '.0f')", as: 'label' }],
      },
    ],
  };
}

const ibcs: StyleGuideTheme = {
  id: 'ibcs',
  org: 'IBCS — International Business Communication Standards (IBCS Association)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'IBCS is a **notation**, not a house style: the same scenario must look the same wherever it appears. Actual (AC) is solid dark grey, previous year (PY) a lighter solid grey, plan (PL) an outline with a white fill, forecast (FC) hatched; red and green appear only on variances, by business impact; there is no value axis and no gridline — every column carries its number. The standard names no hex codes, so this file uses the greys, green `#8CB400`, red `#FF0000` and highlight blue `#0070C0` common in IBCS templates, and Arimo (metric-compatible with Arial, the face in the specimens).',
    'Stated directly: the greyscale ink (AC as the single ink, a grey ladder in place of a categorical palette), status inks for signed values (`selection.signed: "status"`), no measure axis, no ticks, no gridlines (`grid.measure: "omit"`), a solid black category baseline, value labels always outside the mark with the axis dropped when values print, scenario names at the series end rather than in a key, units out of the axis (`axisTitles: "omit"`), integers, a compact layout with a start-anchored title block.',
    'Not stateable — and this is most of what makes a chart IBCS: the theme has no idea of a **scenario**. Colour is assigned by series *index*, so it cannot say "PL is hollow, FC is hatched" for whichever position those series take; fills can only be colours (no outline-only, no hatching); the chart types have no slot for the reference column drawn *behind and offset* from the actual one, nor for the stacked ΔPY / ΔPY% variance tiers with their pins; status colour follows the *sign* where IBCS reads the *business impact*; and the chart spec has no slots for the message line and the who / what / when title. The gaps below draw each of those as the standard asks.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look: a PY / AC / FC column chart with its variance tiers',
      kind: 'visual-quality',
      severity: 'high',
      observed: "Flint (left) draws 24 dodged columns with PY in the darkest grey and AC in the lighter one — the series index, not the scenario, picked the ink, so the notation is inverted. FC is a third series in a mid grey, its slot empty for Jan–Sep. With 24 dodged columns the value labels are dropped, so the value axis stays and a quiet grid comes back although the theme omits it. The message, entity, measure and period run together as headline plus a three-part deck with “; Contribution margin (mUSD)” appended. Expected (right) reproduces Figure 20: green/red pins with black square heads, ΔPY columns (hatched in colour for Oct–Dec), light PY behind dark AC, hatched FC, labels on every column, the Sep|Oct rule through all three tiers, “PY” at the left, ① with its note.",
      probe: 'signature',
      rule: 'Figure 20: a message sentence over a rule, then “Alpha Tools Corporation / Contribution margin (bold) in mUSD / 2019 PY, AC and FC”. Three tiers on one month axis: ΔPY% pins with square heads, ΔPY variance columns in green/red, and the base chart — light-grey PY columns offset behind dark AC columns, Oct–Dec forecast columns hatched, a value above every column, a thin rule between Sep and Oct, no value axis, no gridlines, numbered comments.',
      current: 'The nearest Flint chart is a Grouped Bar Chart with the scenario as the group. Colours come from the grey ladder by series order; PY sits beside AC instead of behind it; FC is a third, flat-grey series whose slot is empty for Jan–Sep and AC’s is empty for Oct–Dec; there is no variance tier, no separator, and the message and three-line title collapse into a headline and a deck.',
      expected: 'The specimen redrawn: pins, variance columns (hatched in colour for the forecast months), overlapping PY/AC columns, hatched FC, labels everywhere, the scenario name “PY” beside the first column, a circled comment marker with its note below.',
      proposal: 'A scenario role on the chart spec (`encodings.scenario` with values AC / PY / PL / FC / BU) and a theme block that binds each scenario to a fill treatment — `ink.scenario: { AC: { fill: "solid" }, PY: { fill: "solid", ink: "#A6A6A6" }, PL: { fill: "outline" }, FC: { fill: "hatch" } }` — plus an IBCS-style “variance chart” template that adds ΔPY / ΔPY% tiers on the shared category axis.',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: marginLong,
        semantic_types: { Month: 'Category', Scenario: 'Category', 'Contribution margin': { semanticType: 'Quantity', unit: 'mUSD' } },
        encodings: { x: 'Month', y: 'Contribution margin', group: 'Scenario' },
        title: 'The contribution margin in October will be 5 mUSD below the previous year',
        subtitle: 'Alpha Tools Corporation, contribution margin in mUSD, 2019 PY, AC and FC',
      }),
      expectedSpec: signatureExpected(),
      expectedFrame: {
        headerHtml: titleBlock({
          message: 'The contribution margin in October will be 5 mUSD below the previous year and in November 12 mUSD below, but we still expect 82 mUSD (+4%) more for 2019',
          who: 'Alpha Tools Corporation', what: 'Contribution margin', unit: 'mUSD', when: '2019 PY, AC and FC',
        }),
        footerHtml: notes([['1', '<b>December forecast</b> (211 mUSD) is 28 mUSD above 2018 because of a new project with Beta Corporation.']]),
      },
    },
    {
      id: 'scenario-notation',
      title: 'Scenarios are fills: AC solid, PY light, PL outlined, FC hatched',
      kind: 'expressiveness',
      severity: 'high',
      observed: "Flint dodges four scenarios side by side and keys them with a legend. The colour domain follows data order (PY, AC, PL, FC) while the dodge order is alphabetical (AC, PL, PY), so in each quarter AC is the light grey on the left and PY the darkest bar on the right — the reverse of IBCS. PL is a solid mid grey, FC a pale grey; no labels are printed, so the 0–80 value axis stays. Expected: PY behind-left, outlined PL behind-right, dark AC in front, Q4 hatched with “FC”, the Q3|Q4 rule, values on top, scenario names beside Q1 and Q4 — as in Figure 4.",
      probe: 'scenario-notation',
      rule: '“Titles are in place, plans are outlined, and forecasts are hatched, red and green are used only for variances.” The reference scenario is a column of the same width drawn behind the actual one and offset (PY to the left, PL to the right); the scenario names are written beside the first and last columns.',
      current: 'The closest statement is an index-ordered palette — AC dark, PY light — and the grouped template. The theme cannot bind a treatment to a *scenario* (it binds to the order the series arrive in), cannot ask for an outline-only fill (`marks.outline` outlines every mark, and a white palette entry would erase lines in other charts), has no hatched fill at all, and the grouped bar puts the three scenarios side by side rather than overlapping. PL becomes one more grey; FC another.',
      expected: 'Quarterly net sales: grey PY behind-left, outlined PL behind-right, dark AC in front, Q4 hatched as forecast with a thin rule before it, values above, “PY / AC” written left of Q1 and “PL / FC” right of Q4.',
      proposal: '`ink.scenario` (as in the signature) with `fill: "solid" | "outline" | "hatch"` and an ink per scenario, realised in Vega-Lite as a fill/stroke pair and an SVG pattern; and a `marks.reference: { arrangement: "overlap", offset: 0.25 }` so a reference series is drawn behind the main series instead of dodged beside it.',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: quartersLong,
        semantic_types: { Quarter: 'Category', Scenario: 'Category', 'Net sales': { semanticType: 'Quantity', unit: 'mEUR' } },
        encodings: { x: 'Quarter', y: 'Net sales', group: 'Scenario' },
        title: 'Net sales will end the year above plan',
        subtitle: 'Alpha Tools Corporation, net sales in mEUR, 2019 PY, AC, PL and FC',
      }),
      expectedSpec: scenarioExpected(),
      expectedFrame: {
        headerHtml: titleBlock({ message: 'Net sales will end the year 15 mEUR above plan', who: 'Alpha Tools Corporation', what: 'Net sales', unit: 'mEUR', when: '2019 PY, AC, PL and FC' }),
      },
    },
    {
      id: 'variance-tiers',
      title: 'Absolute and relative variances as their own tiers beside the base chart',
      kind: 'chart-spec',
      severity: 'high',
      observed: "Flint draws the ΔPL bars in the single dark grey: the house’s green/red status inks are not applied to a signed measure that has no colour field, although `selection.signed: \"status\"` is set. Labels print and the value axis is dropped as asked, but the labels are unsigned (“34”, “−4”), the category rule stands at the left edge instead of at zero, and Cologne’s “−97” runs into its row label. Expected: AC bars with PL outlines behind, a green/red ΔPL tier from a grey zero line with “+34 … −97”, and the ΔPL% pin tier — Figure 23 in miniature.",
      probe: 'variance-tiers',
      rule: 'Structure runs down the vertical axis. Beside the AC/PL bars sit a ΔPL tier — green/red bars of the same width and scale from a vertical baseline, signed labels — and a ΔPL% tier of thin “pins” with square heads. All tiers share the rows.',
      current: 'Flint has no variance chart. The closest is a Bar Chart of the absolute variance alone; `ink.series.selection.signed: "status"` is set, so the question is only whether the bars take the house green and red and whether the signed numbers print.',
      expected: 'Figure 23 redrawn for eight stores: AC bars with PL outlined behind, a ΔPL tier and a ΔPL% pin tier, bold tier headers.',
      proposal: 'A `Variance Chart` template (base + `variance` + `variancePercent` tiers on one shared category axis, base scale reused by the absolute tier) driven by the `scenario` role, so ΔPL / ΔPY are computed from the scenarios rather than precomputed; pins as a `marks.pin` geometry (`stemWidth`, `head: "square"`).',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: STORES.map((row) => ({ Store: row.Store, 'ΔPL': row.dPL })),
        semantic_types: { Store: 'Category', 'ΔPL': { semanticType: 'Quantity', unit: 'kUSD' } },
        encodings: { y: 'Store', x: 'ΔPL' },
        title: 'Munich grew most against plan; Cologne fell 97 kUSD short',
        subtitle: 'Gamma Department Stores Germany, frozen food, net sales in kUSD, 2019',
      }),
      expectedSpec: varianceExpected(),
      expectedFrame: {
        headerHtml: titleBlock({ message: 'Munich experienced the biggest absolute growth versus plan with +34 kUSD', who: 'Gamma Department Stores Germany, frozen food', what: 'Net sales', unit: 'kUSD', when: '2019' }),
      },
    },
    {
      id: 'forecast-hatching',
      title: 'Forecast months hatched, separated from actuals by a thin rule',
      kind: 'expressiveness',
      severity: 'high',
      observed: "Flint colours AC dark and FC light grey with an AC/FC key, prints values and drops the value axis — but there is no hatching and no Sep|Oct rule, so the forecast reads as a second series. The twelve month labels are also turned −45° although `labels.angle: \"horizontal\"` is set and three-letter months fit flat at this width. Expected: solid Jan–Sep, hatched Oct–Dec in outline plus stripes, the rule between, “AC”/“FC” over their periods, labels flat.",
      probe: 'forecast-style',
      rule: 'The same series switches notation where actuals end: Jan–Sep solid dark (AC), Oct–Dec hatched (FC — outline plus diagonal stripes in the actual colour), with a thin vertical line between Sep and Oct.',
      current: 'The only way to tell Flint the months differ is a colour field (`Scenario`), so AC and FC become two categorical inks from the grey ladder with a key; there is no hatch fill and no separator rule. Columns stay dark-and-light-grey — a forecast reads as just another series.',
      expected: 'One column series, solid then hatched, the rule between Sep and Oct, “AC” and “FC” written over their periods, values above every column and no axis.',
      proposal: 'Reuse `ink.scenario.FC: { fill: "hatch", pattern: { angle: 45, spacing: 4 } }`; when a scenario field changes value along a time axis, draw `furniture`-like `periodSeparator` at the boundary (`structure.scenarioBoundary: "rule"`).',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: MARGIN.map((row) => ({ Month: row.Month, Scenario: row.Scenario, 'Contribution margin': row.AC })),
        semantic_types: { Month: 'Category', Scenario: 'Category', 'Contribution margin': { semanticType: 'Quantity', unit: 'mUSD' } },
        encodings: { x: 'Month', y: 'Contribution margin', color: 'Scenario' },
        title: 'Contribution margin peaks in December',
        subtitle: 'Alpha Tools Corporation, contribution margin in mUSD, 2019 AC and FC',
      }),
      expectedSpec: forecastExpected(),
      expectedFrame: {
        headerHtml: titleBlock({ message: 'Contribution margin will peak at 211 mUSD in December', who: 'Alpha Tools Corporation', what: 'Contribution margin', unit: 'mUSD', when: '2019 AC and FC' }),
      },
    },
    {
      id: 'variance-polarity',
      title: 'Red is bad, green is good — by business impact, not by sign',
      kind: 'expressiveness',
      severity: 'medium',
      observed: "Flint draws every variance in the same dark grey (no status colour at all here), unsigned labels, the category rule at the left edge rather than at zero, and “−9” collides with “Material”. Even with status inks applied it would colour by sign — rising costs green. Expected: rises in red, falls in green, signed labels, a grey zero line and “ΔPY (↓)” naming the polarity.",
      probe: 'status-palette',
      rule: '“We underline the importance of variances with colour: Red is bad, green is good.” A cost that rises is a bad variance (red) although it is positive; a cost that falls is green. The tier header marks the polarity: “ΔPY (↓)”. Red and green appear nowhere else.',
      current: '`ink.series.status` and `selection.signed: "status"` colour by *sign*: positive takes the positive ink. Nothing in the theme or the chart spec says that, for this measure, less is better.',
      expected: 'Cost variances by type: increases red, decreases green, signed labels, polarity in the header.',
      proposal: 'A polarity on the measure — `semantic_types: { "ΔPY": { semanticType: "Quantity", polarity: "lowerIsBetter" } }` — and `ink.series.status` read as good/bad rather than positive/negative when one is stated.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: COSTS,
        semantic_types: { 'Cost type': 'Category', 'ΔPY': { semanticType: 'Quantity', unit: 'kUSD' } },
        encodings: { y: 'Cost type', x: 'ΔPY' },
        title: 'Personnel and energy costs rose; material costs fell',
        subtitle: 'Alpha Tools Corporation, cost variance vs previous year in kUSD, 2019',
      }),
      expectedSpec: polarityExpected(),
      expectedFrame: {
        headerHtml: titleBlock({ message: 'Personnel and energy costs rose; material costs fell', who: 'Alpha Tools Corporation', what: 'Costs', unit: 'kUSD', when: '2019 AC vs PY' }),
      },
    },
    {
      id: 'structured-title',
      title: 'A message sentence over a rule, then who / what / when',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'structured-title',
      rule: 'Every chart opens with a full-sentence message (the finding) at top-left, separated by a horizontal rule from a three-line title: line 1 the reporting unit (“Alpha Tools Corporation”), line 2 the measure in **bold** with its unit (“**Contribution margin** in mUSD”), line 3 the period and scenarios (“2019 PY, AC and FC”).',
      current: 'The chart spec has `title` and `subtitle` only, so the message becomes the headline and the three title lines are run together into one deck (see every current panel above). There is no rule between them, and no way to bold the measure inside the deck.',
      expected: 'See the header of every expected panel above.',
      proposal: '`chart_spec.message` plus `chart_spec.titleLines: { entity, measure, unit, period }`, realised as headline + rule + a three-line deck with `type.deckEmphasis` for the measure; `furniture: { kind: "messageRule" }` for the rule under the message.',
    },
    {
      id: 'no-pies',
      title: 'No pies, rings, gauges, radar or funnels',
      kind: 'expressiveness',
      severity: 'medium',
      observed: "Flint draws the pie as asked, in the grey ladder: Firefox and Others are two near-white slices that are hard to tell apart, with a dot-swatch key. Expected: the same shares as five sorted dark bars with their values and a black baseline, under the message and three-line title.",
      probe: 'chart-type-policy',
      rule: 'EX 2.1–2.5: avoid pie and ring charts, gauges, radar and funnel charts, spaghetti lines and traffic lights; “for many other chart types … there are usually more suitable alternatives based on columns, lines and bars.”',
      current: 'A theme can restyle a pie but has no say over whether one is drawn; under this theme Flint still draws the pie, in a grey ladder whose small slices are barely separable.',
      expected: 'The same shares as sorted horizontal bars with their values, no axis.',
      proposal: '`chartPolicy: { discouraged: ["Pie Chart", "Donut Chart", "Radar Chart", ...], substitute: { "Pie Chart": "Bar Chart" } }` — reported as a warning (or substituted when the caller allows), since only the chart spec decides the chart type.',
      flint: flintInput(theme, {
        chartType: 'Pie Chart',
        data: BROWSERS,
        semantic_types: { Browser: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Browser' },
        title: 'Chrome holds two thirds of desktop browsing',
        subtitle: 'Desktop browser market share in %, 2024',
      }),
      expectedSpec: barsInsteadOfPie(),
      expectedFrame: {
        headerHtml: titleBlock({ message: 'Chrome holds two thirds of desktop browsing', who: 'Worldwide desktop browsers', what: 'Market share', unit: '%', when: '2024' }),
      },
    },
    {
      id: 'comment-markers',
      title: 'Numbered comment markers and highlight ellipses',
      kind: 'chart-spec',
      severity: 'low',
      probe: 'annotation',
      rule: 'Circled numbers (①, ②) sit on the columns or labels they explain, with the numbered notes beside or below the chart; a (blue) ellipse circles a key value such as “+82” or “88%”.',
      current: 'No chart-spec slot for a note anchored to a datum, nor for an emphasis mark around a printed value.',
      expected: 'See the ① beside December in the signature panel and its note underneath.',
      proposal: '`chart_spec.annotations: [{ at: { Month: "Dec" }, marker: "number", text: "…" }]`, with `annotation.commentMarker: "circledNumber"` and `annotation.highlight: "ellipse"` in the theme, ink from `ink.accent`.',
    },
    {
      id: 'labels-replace-axis',
      addressed: { stage: 'L1', note: 'Measured as printed, the two-digit counts fit their 20px slots, so every column carries its value and the value axis and grid stay away (the grid came back only because the labels had been withheld).' },
      title: 'Every column carries its value, so there is never a value axis or a gridline',
      kind: 'realization',
      severity: 'medium',
      observed: "Confirmed: on the dodged medals chart Flint prints no values, keeps the 0–50 value axis and draws gridlines at every 10, although the theme says `grid.measure: \"omit\"` and `dataLabels.show: \"always\"` (the compiler’s `grid-restored` floor). The same happens on every line chart in the gallery. Expected: all fifteen counts printed above their columns at 9.5px, no axis, no grid.",
      probe: 'labels-replace-axis',
      rule: '“Replace grid lines & value axes with data labels”: every column and bar is labelled, dodged and overlapping ones included, at a small enough size to fit (IBCS is dense by design: small fonts, narrow gaps).',
      current: 'The theme says `dataLabels.show: "always"`, `grid.measure: "omit"` and `axis.measure.suppressWhenValuesPrinted`. On a single bar series Flint obeys (labels, no axis). On a dodged chart it decides the numbers do not fit, drops them, and then — because the ruler now draws nothing — deliberately restores a quiet grid (`grid-restored`) and keeps the value axis. Lines are never labelled.',
      expected: 'Fifteen labelled columns at 9.5px, no value axis, no gridlines, a black baseline.',
      proposal: 'Let `dataLabels.show: "always"` shrink the label (down to `type.minSize`) or abbreviate before giving up, and report the drop; only restore the grid when the house has not said `grid.measure: "omit"` explicitly — a stated omit should win over the floor, with the departure reported.',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: MEDALS,
        semantic_types: { Country: 'Country', Medal: 'Category', Count: 'Quantity' },
        encodings: { x: 'Country', y: 'Count', group: 'Medal' },
        title: 'The US and China shared the top of the medal table',
        subtitle: 'Paris 2024 Olympic Games, medals by type, 2024',
      }),
      expectedSpec: labelledGroupsExpected(),
      expectedFrame: {
        headerHtml: titleBlock({ message: 'The US and China shared the top of the medal table', who: 'Paris 2024 Olympic Games', what: 'Medals', unit: 'count', when: '2024' }),
      },
    },
    {
      id: 'series-text-ink',
      addressed: { stage: 'R4', note: 'Series names in a light grey are darkened to 3:1 against the plot.' },
      title: 'Series names printed in the series’ own light grey',
      kind: 'visual-quality',
      severity: 'medium',
      observed: "Flint writes “United States” in `#D9D9D9` at the end of its line — barely visible — and “China” in a mid grey that sits on its own line; the value axis and a restored grid remain because lines print no values. Expected: names and last values in black beside each line end, no value axis.",
      probe: 'series-text-ink',
      rule: 'Labels replace the legend and are written directly beside the series; text is black. Colour is not used to tell series apart, so the series inks are a ladder of greys.',
      current: 'With `legend.placement: ["seriesEnd", …]` Flint writes each series name at the line end in that series’ ink. The fourth grey of the ladder (`#D9D9D9`) is too light to read as text; there is no contrast floor and no `inkMode` for series labels.',
      expected: 'The same lines, names (and the last value) in black beside each end.',
      proposal: '`legend.labelInk: "text" | "matchSeries" | "matchSeriesWithContrast"`, defaulting to a contrast floor (≥ 4.5:1 against the plot) when the series ink is too light.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE.filter((row) => EV_NAMES.includes(row.Country)),
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway leads electric-car sales',
        subtitle: 'New cars sold that are electric, %, 2018–2023',
      }),
      expectedSpec: darkSeriesLabelsExpected(),
      expectedFrame: {
        headerHtml: titleBlock({ message: 'Norway leads electric-car sales', who: 'Norway, China, Germany and the United States', what: 'EV share', unit: '% of new cars', when: '2018–2023' }),
      },
    },
  ],
};

export default ibcs;
