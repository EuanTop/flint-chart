import type { ThemeSpec } from 'flint-chart';
import research from '../research/apple-hig.json';
import { ANOMALY, EV_SHARE, flintInput, groupedProbe, POPULATION, UNEMPLOYMENT } from '../probes';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif";
const DISPLAY = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif";
const BLUE = '#007AFF';
/** tertiaryLabel on white, as measured in the anatomy specimen. */
const TICK_LABEL = '#C5C5C7';
/** systemGray5: the solid horizontal grid line. */
const GRID = '#E5E5EA';
/** The dashed vertical grid line and its tick. */
const VGRID = '#D1D1D6';
/** Swift Charts' automatic series order (observed; Apple does not document it). */
const SYSTEM = [BLUE, '#34C759', '#FF9500', '#AF52DE', '#FF3B30', '#32ADE6', '#FFCC00'];

const t: HouseTokens = {
  font: FONT,
  titleFont: DISPLAY,
  text: '#000000',
  muted: TICK_LABEL,
  grid: GRID,
  axis: null,
  background: '#FFFFFF',
  palette: SYSTEM,
  highlight: BLUE,
  titleSize: 17,
  titleWeight: 600,
  subtitleSize: 15,
  subtitleColor: '#000000',
  labelSize: 12,
  yRight: true,
  lineWidth: 2,
  barCorner: 3,
  legendOrient: 'bottom',
};

/**
 * The shipped `apple` preset, corrected against the HIG pages and their specimens. Arrays replace
 * the preset's, so the preset's one variant (a symbol per series) is restated beside the new one.
 */
const theme: ThemeSpec = {
  extends: 'apple',
  id: 'apple-hig',
  label: 'Apple HIG (charts)',
  ink: {
    text: { primary: '#000000', secondary: '#8A8A8E', muted: TICK_LABEL },
    structure: { grid: GRID, axis: VGRID, zero: GRID, rule: VGRID },
    series: {
      single: BLUE,
      categorical: SYSTEM,
      categoricalExtended: [...SYSTEM, '#5856D6', '#FF2D55', '#00C7BE', '#A2845E', '#30B0C7'],
    },
    accent: BLUE,
  },
  type: {
    headline: { family: DISPLAY, size: 17, weight: 'semibold', color: '#000000' },
    deck: { family: FONT, size: 15, weight: 'regular', color: '#000000' },
    axisLabel: { family: FONT, size: 12, color: TICK_LABEL },
    keyLabel: { family: FONT, size: 12, color: '#8A8A8E' },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'hairline', tickLength: 'short', tickDirection: 'outward', labelGap: 4 },
      // “Shift the Y axis to the trailing side”: a vertical value axis on the right, a horizontal one at the bottom (AX1).
      measure: { line: 'omit', ticks: 'omit', labelGap: 8, placement: 'trailing', tickDensity: 'sparse' },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'solid', weight: 1, zero: 'omit' },
    frame: 'omit',
    baseline: 'quiet',
  },
  marks: { bandFraction: 0.62 },
  // A blue-to-transparent gradient under the line, as in Stocks (R12).
  geometry: { band: { cornerRadius: 3 }, line: { wash: 'fade', washOpacity: 0.3 }, area: { fill: 'fade' } },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start', suppressWhenAxisNames: true },
  variants: [
    {
      when: { seriesCount: { gte: 2 } },
      then: { geometry: { point: { presence: 'full', size: 30 } } },
      because: 'colour is never the only cue: each series on a line carries its own symbol (Health blood pressure)',
    },
    {
      when: { hasBandedAxis: false },
      // The anatomy's dashed verticals, a shade darker than the solid horizontals (GR2).
      then: { structure: { grid: { category: { presence: 'quiet', style: 'dashed', color: VGRID } } } },
      because: 'a continuous x axis carries a grid line at every tick, the label on its trailing side (charts anatomy)',
    },
  ],
};

/* ------------------------------------------------------------------ data */

const STEP_VALUES = [3, 5, 11, 15, 30, 46, 65, 83, 93, 79, 55, 39, 20, 9];
const STEPS = STEP_VALUES.map((Steps, i) => {
  const start = 9.5 + i * 0.25;
  const hh = Math.floor(start);
  const mm = Math.round((start - hh) * 60);
  return { Time: `2024-06-03T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`, Steps, start };
});
const STEPS_FLINT = STEPS.map(({ Time, Steps }) => ({ Time, Steps }));

const SIG_TITLE = 'Most of Your Steps Came Before Noon';
const SIG_SUB = 'Steps per 15 minutes, this morning.';

/** Rain intensity for the next hour, one bar a minute: the Weather widget's specimen. */
const RAIN = Array.from({ length: 60 }, (_, m) => ({ Minute: m, Intensity: Math.round((0.86 - m * 0.0035 + (m % 3 === 0 ? 0.01 : 0)) * 100) / 100 }));

/* ------------------------------------------------------------- expected */

const base = (extra: Record<string, unknown> = {}) => ({
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  config: { ...houseConfig(t), ...extra },
});

/** The charts-anatomy specimen: hours on x with dashed grid lines, labels on their trailing side. */
function signatureExpected() {
  return {
    ...base(),
    title: { text: SIG_TITLE, subtitle: SIG_SUB },
    width: W,
    height: H,
    data: { values: STEPS.map((r) => ({ ...r, x0: r.start + 0.045, x1: r.start + 0.205 })) },
    mark: { type: 'bar', color: BLUE, cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
    encoding: {
      x: {
        field: 'x0', type: 'quantitative', title: null, scale: { domain: [9, 12.95], nice: false, zero: false },
        axis: {
          values: [9, 10, 11, 12], labelExpr: "datum.value == 12 ? '12 PM' : '' + datum.value",
          labelAlign: 'left', labelOffset: 3, labelPadding: 2, labelColor: TICK_LABEL, labelFontSize: 13,
          grid: true, gridDash: [2, 2], gridColor: VGRID, ticks: true, tickSize: 7, tickDash: [2, 2], tickColor: VGRID, domain: false,
        },
      },
      x2: { field: 'x1' },
      y: {
        field: 'Steps', type: 'quantitative', title: null, scale: { domain: [0, 100] },
        axis: { orient: 'right', values: [0, 50, 100], grid: true, gridColor: GRID, labelColor: TICK_LABEL, labelFontSize: 13, labelPadding: 8 },
      },
      y2: { datum: 0 },
    },
  };
}

/** Grid both ways on a continuous axis: solid horizontals, dashed verticals, label after its line. */
function gridExpected() {
  const names = ['Norway', 'China', 'Germany', 'United States'];
  return {
    ...base(),
    title: { text: 'Norway Leads Electric-Car Sales', subtitle: 'Share of new cars sold that are electric, %.' },
    width: W,
    height: H,
    data: { values: EV_SHARE },
    mark: { type: 'line', strokeWidth: 2, point: { filled: true, size: 30 } },
    encoding: {
      x: {
        field: 'Year', type: 'quantitative', title: null, scale: { domain: [2018, 2023.6], nice: false, zero: false },
        axis: {
          values: [2018, 2019, 2020, 2021, 2022, 2023], format: 'd', labelAlign: 'left', labelOffset: 3, labelPadding: 2,
          grid: true, gridDash: [2, 2], gridColor: VGRID, ticks: true, tickSize: 6, tickDash: [2, 2], tickColor: VGRID, domain: false,
        },
      },
      y: { field: 'EV share (%)', type: 'quantitative', title: null, axis: { orient: 'right', values: [0, 25, 50, 75, 100], gridColor: GRID } },
      color: { field: 'Country', type: 'nominal', scale: { domain: names, range: SYSTEM }, legend: { symbolType: 'circle', orient: 'bottom', direction: 'horizontal', labelColor: '#8A8A8E' } },
      shape: { field: 'Country', type: 'nominal', scale: { domain: names, range: ['circle', 'square', 'triangle-up', 'diamond'] }, legend: null },
    },
  };
}

/** The Stocks specimen: accent line over an accent-to-clear gradient. */
function gradientExpected() {
  return {
    ...base(),
    title: { text: 'Unemployment Spiked Twice', subtitle: 'US unemployment rate, %.' },
    width: W,
    height: H,
    data: { values: UNEMPLOYMENT },
    mark: {
      type: 'area',
      line: { color: BLUE, strokeWidth: 2 },
      color: { gradient: 'linear', x1: 0, y1: 0, x2: 0, y2: 1, stops: [{ offset: 0, color: 'rgba(0,122,255,0.45)' }, { offset: 1, color: 'rgba(0,122,255,0.02)' }] },
    },
    encoding: {
      x: {
        field: 'Year', type: 'quantitative', title: null, scale: { domain: [2000, 2023], nice: false, zero: false },
        axis: { values: [2000, 2005, 2010, 2015, 2020], format: 'd', labelAlign: 'left', labelOffset: 3, grid: true, gridColor: GRID, ticks: false, domain: false },
      },
      y: { field: 'Unemployment (%)', type: 'quantitative', title: null, axis: { orient: 'right', values: [0, 5, 10] } },
    },
  };
}

/** The Weather widget: a dark rounded platter, white title and subtitle, a minute-by-minute strip. */
function cardExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig({ ...t, background: 'transparent' }), padding: { left: 4, right: 4, top: 2, bottom: 2 } },
    width: W - 20,
    height: 64,
    data: { values: RAIN },
    layer: [
      {
        mark: { type: 'bar', color: '#B3EAFA', cornerRadiusTopLeft: 1.5, cornerRadiusTopRight: 1.5, width: 3 },
        encoding: {
          x: {
            field: 'Minute', type: 'quantitative', title: null, scale: { domain: [-0.5, 59.5], nice: false, zero: false },
            axis: {
              values: [0, 10, 20, 30, 40, 50], labelExpr: "datum.value == 0 ? 'Now' : datum.value + 'm'",
              labelFontWeight: { condition: { test: 'datum.value == 0', value: 'bold' }, value: 'normal' },
              labelColor: '#A0A8B5', labelFontSize: 14, labelAlign: 'left', labelOffset: -2, labelPadding: 6,
              ticks: true, tickSize: 4, tickColor: '#5B6B78', domain: false, grid: false,
            },
          },
          y: { field: 'Intensity', type: 'quantitative', title: null, axis: null, scale: { domain: [0, 1.1] } },
        },
      },
      {
        data: { values: [{ v: 0.92 }, { v: 1.08 }] },
        mark: { type: 'rule', color: '#7D8C99', strokeDash: [2, 3], strokeWidth: 1 },
        encoding: { y: { field: 'v', type: 'quantitative' } },
      },
    ],
  };
}

/** Scrubbing: the selection rule spans the plot and a value header sits above it. */
function scrubExpected() {
  const peak = UNEMPLOYMENT.find((row) => row.Year === 2020)!;
  return {
    ...base({ title: { ...(houseConfig(t).title as object), offset: 50 } }),
    title: { text: 'Unemployment Spiked Twice', subtitle: 'US unemployment rate, %.' },
    width: W,
    height: H,
    layer: [
      {
        data: { values: UNEMPLOYMENT },
        mark: { type: 'line', strokeWidth: 2, color: BLUE },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2000, 2023], nice: false, zero: false }, axis: { values: [2000, 2005, 2010, 2015, 2020], format: 'd', labelAlign: 'left', labelOffset: 3, ticks: false, domain: false } },
          y: { field: 'Unemployment (%)', type: 'quantitative', title: null, scale: { domain: [0, 12] }, axis: { orient: 'right', values: [0, 5, 10] } },
        },
      },
      { data: { values: [peak] }, mark: { type: 'rule', color: '#8A8A8E', strokeWidth: 1, y: -6, y2: H }, encoding: { x: { field: 'Year', type: 'quantitative' } } },
      { data: { values: [peak] }, mark: { type: 'point', filled: true, size: 70, color: BLUE, stroke: '#FFFFFF', strokeWidth: 2 }, encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'Unemployment (%)', type: 'quantitative' } } },
      { data: { values: [peak] }, mark: { type: 'rect', color: '#F2F2F7', cornerRadius: 6, xOffset: -44, x2Offset: 40, y: -40, y2: -6 }, encoding: { x: { field: 'Year', type: 'quantitative' }, x2: { field: 'Year' } } },
      { data: { values: [peak] }, mark: { type: 'text', align: 'center', baseline: 'top', dx: -2, y: -36, fontSize: 10, color: '#8A8A8E', text: '2020 AVERAGE' }, encoding: { x: { field: 'Year', type: 'quantitative' } } },
      { data: { values: [peak] }, mark: { type: 'text', align: 'center', baseline: 'top', dx: -2, y: -24, fontSize: 15, fontWeight: 600, color: '#000000', text: '8.1%' }, encoding: { x: { field: 'Year', type: 'quantitative' } } },
    ],
  };
}

/** Horizontal bars as Swift Charts draws them: value axis along the bottom, names on the leading side. */
function horizontalExpected() {
  return {
    ...base({ axisY: { grid: false, domain: false } }),
    title: { text: 'India and China Hold over a Third of Humanity', subtitle: 'Population, millions, 2023.' },
    width: W,
    height: H,
    data: { values: POPULATION },
    mark: { type: 'bar', color: BLUE, cornerRadiusEnd: 3 },
    encoding: {
      y: { field: 'Country', type: 'nominal', sort: null, title: null, axis: { orient: 'left', labelColor: '#8A8A8E', ticks: false, domain: false } },
      x: {
        field: 'Population', type: 'quantitative', title: null,
        axis: { orient: 'bottom', values: [0, 500, 1000, 1500], format: ',.0f', grid: true, gridColor: GRID, labelAlign: 'left', labelOffset: 3, domain: false, ticks: true, tickSize: 6, tickDash: [2, 2], tickColor: VGRID },
      },
    },
  };
}

const DECADES = ANOMALY.map(({ Decade, 'Anomaly (°C)': v }) => ({ Decade, 'Anomaly (°C)': v }));

function decadesExpected() {
  return {
    ...base(),
    title: { text: 'The 2020s Ran a Degree Warm', subtitle: 'Temperature anomaly vs 1951–1980, °C.' },
    width: 300,
    height: H,
    data: { values: DECADES },
    mark: { type: 'bar', color: BLUE, cornerRadiusEnd: 3 },
    encoding: {
      x: { field: 'Decade', type: 'ordinal', title: null, sort: null, axis: { labelAngle: 0, labelExpr: "indexof(['1880s', '1920s', '1960s', '2000s', '2020s'], datum.value) >= 0 ? datum.label : ''", ticks: false, domain: false } },
      y: { field: 'Anomaly (°C)', type: 'quantitative', title: null, axis: { orient: 'right', values: [-0.5, 0, 0.5, 1], gridColor: GRID } },
    },
  };
}

/** A plain line with five familiar year labels at the house size. */
function plainLineExpected() {
  return {
    ...base(),
    title: { text: 'Unemployment Spiked Twice', subtitle: 'US unemployment rate, %.' },
    width: W,
    height: H,
    data: { values: UNEMPLOYMENT },
    mark: { type: 'line', strokeWidth: 2, color: BLUE },
    encoding: {
      x: {
        field: 'Year', type: 'quantitative', title: null, scale: { domain: [2000, 2023], nice: false, zero: false },
        axis: { values: [2000, 2005, 2010, 2015, 2020], format: 'd', labelAlign: 'left', labelOffset: 3, grid: true, gridDash: [2, 2], gridColor: VGRID, ticks: true, tickSize: 6, tickDash: [2, 2], tickColor: VGRID, domain: false },
      },
      y: { field: 'Unemployment (%)', type: 'quantitative', title: null, scale: { domain: [0, 12] }, axis: { orient: 'right', values: [0, 5, 10] } },
    },
  };
}

const groupedCircles = () => {
  const probe = groupedProbe(theme, t, { palette: SYSTEM, padding: 0.3, title: 'The US and China Shared the Top of the Medal Table' });
  const spec = probe.expectedSpec as { config: { legend: Record<string, unknown> } };
  spec.config = { ...spec.config, legend: { ...spec.config.legend, symbolType: 'circle', orient: 'bottom', labelColor: '#8A8A8E', symbolSize: 70 } };
  return probe;
};

/* --------------------------------------------------------------- house */

const signatureFlint = (spec: ThemeSpec) => flintInput(spec, {
  chartType: 'Bar Chart',
  data: STEPS_FLINT,
  semantic_types: { Time: 'DateTime', Steps: 'Count' },
  encodings: { x: 'Time', y: 'Steps' },
  title: SIG_TITLE,
  subtitle: SIG_SUB,
});

const apple: StyleGuideTheme = {
  id: 'apple-hig',
  org: 'Apple Human Interface Guidelines: Charts',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Flint ships an `apple` preset, so this house starts from it (`extends: "apple"`) and corrects it against the HIG Charts and Charting data pages and their three specimens (charts anatomy, Stocks line, Weather widget). The HIG is qualitative — it names no hex or size — so values come from the specimens (tick labels measure `#C5C5C7`, tertiaryLabel; horizontal grid ≈ systemGray5 `#E5E5EA`) and from iOS text styles (Headline 17 semibold, Subheadline 15).',
    'Corrections to the preset: the seventh system colour (yellow `#FFCC00`) restored to the series order; tick labels lightened from secondary to tertiary grey; the deck set in primary ink as in Weather, instead of the preset’s grey; short dashed-looking ticks under a continuous x axis, and a vertical grid there (`variants` on `hasBandedAxis: false`); the key moved to bottom-leading (`align: start`); bars a little wider (0.62) with a 3px top radius. Kept from the preset: trailing value axis, no axis lines, units in the title (`axisTitles: omit`), one symbol per series, separators between contiguous fills.',
    'Not statable: dashed verticals beside solid horizontals (one `grid.style`), tick labels on the trailing side of their grid line, circular key swatches, the gradient fill under a line, the widget platter, the scrubbing indicator. SF Pro is named; on macOS `-apple-system` resolves to it, elsewhere it falls back to Helvetica/Arial.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      observed: "Flint (left): blue columns, trailing 0–100 axis in pale grey, light horizontal grid — the house reads at a glance. But the time axis is banded: labels are centred under bars and the first one is a full date cut off (“Jun 3, 2024 1…”), there are no vertical hour lines, and the deck gains “; Steps”. Expected (right): dashed hour lines with “9 10 11 12 PM” on their trailing side and three familiar values 0/50/100.",
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Charts anatomy: system-blue columns with slightly rounded tops; value axis on the trailing side with three familiar values (0, 50, 100) in a very light grey; solid light horizontal grid lines; dashed vertical grid lines at each hour, continued below the plot as a short tick, with the hour label on the trailing side of its line; no axis lines. A headline and a plain-language subtitle above.',
      current: 'Flint draws the blue columns, the trailing axis and the light horizontal grid. The time axis is banded, so there is no vertical grid line at the hour, the tick sits under a bar centre, and labels are centred on the tick. The preset itself drew no x ticks and darker labels; both are corrected here.',
      expected: 'The anatomy specimen with this morning’s steps: hour lines dashed, “9 10 11 12 PM” hung from them, bars sitting between the lines.',
      flint: signatureFlint(theme),
      expectedSpec: signatureExpected(),
    },
    {
      id: 'shipped-preset',
      observed: "Plain preset (left): grey deck with “; Steps” appended, darker #8A8A8E tick labels, no ticks under x, six values on the y axis. The corrected house (signature gap, left) is closer: black deck, tertiary-grey labels. Neither draws the hour grid.",
      title: 'What the shipped preset gets wrong against the guide',
      kind: 'visual-quality',
      severity: 'low',
      probe: 'preset-drift',
      rule: 'The same anatomy specimen; the HIG asks for light label colours so the data stays prominent, and Swift Charts cycles seven system colours.',
      current: 'Left panel: the plain `apple` preset (no corrections) on the same data. It names six series colours (no yellow), sets tick labels in secondary grey `#8A8A8E`, a grey deck, no ticks under x, a 0.6 band and a 4px corner, and centres the key at the bottom.',
      expected: 'Tertiary-grey labels, primary-ink deck, a tick per x reading, seven-colour order, bottom-leading key.',
      proposal: 'Fold the corrections in this file back into `presets/apple.ts`: `type.axisLabel.color` tertiaryLabel, `type.deck.color` primary, `categorical` + `#FFCC00`, categorical ticks `hairline`, `legend.align: "start"`.',
      flint: signatureFlint({ extends: 'apple' }),
      expectedSpec: signatureExpected(),
    },
    {
      id: 'grid-dashed-verticals',
      addressed: { stage: 'GR2', note: '`category: { presence: "quiet", style: "dashed", color: "#D1D1D6" }` on continuous x — dashed verticals a shade darker than the solid horizontals (GR2). The label on the trailing side of its line and the line continuing as the tick stay open.' },
      observed: "Flint (left) does draw a vertical grid on the continuous year axis now, but solid, with labels centred on the lines and a key in square-ish symbols ordered China/Germany/Norway/US (alphabetical, not by the lines). Expected (right): dashed verticals, labels after their line, circles and shapes per series.",
      title: 'Dashed vertical grid lines, each labelled on its trailing side',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'gridline-style',
      rule: 'Anatomy: solid light-grey horizontal grid lines and dashed light-grey vertical grid lines at x ticks, each vertical continued below the baseline as the tick that anchors its label — and “display the label for each vertical grid line on its trailing side.”',
      current: '`structure.grid.style` is one value for both directions, so the vertical grid this theme turns on for continuous axes is solid like the horizontal one (the preset turned it off altogether). No field says where a tick label stands relative to its tick, so Flint centres each year under its line.',
      expected: 'Horizontal lines solid systemGray5; vertical lines dashed and a shade darker, running on into the tick; each year left-aligned just after its line.',
      proposal: '`structure.grid.category: { presence, style, dash }` beside the measure grid, a `ticks: "gridContinuation"` option, and `structure.axis.categorical.labelAnchor: "center" | "trailing" | "leading"` (realised as `labelAlign: left` + a small `labelOffset`, mirrored for right-to-left).',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway Leads Electric-Car Sales',
        subtitle: 'Share of new cars sold that are electric, %.',
      }),
      expectedSpec: gridExpected(),
    },
    {
      id: 'gradient-area',
      addressed: { stage: 'R12', note: 'The gradient under a line is `geometry.line.wash: "fade"`, and an area fades the same way (`geometry.area.fill: "fade"`).' },
      observed: "Flint fills the area with an opaque block of system blue that buries the grid; the expected panel’s line sits over a blue that fades to nothing at the baseline, as in the Stocks specimen.",
      title: 'An accent-to-clear gradient under the line',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'gradient-fill',
      rule: 'Stocks: a thin system-blue line with a vertical blue-to-transparent gradient beneath it; the y axis trailing, vertical grid lines at each year.',
      current: '`geometry.area` has `opacity` and `edge` only, so an area is one flat tint. The preset states no area treatment at all.',
      expected: 'The line in full accent, the fill fading from ~45% at the line to nothing at the baseline.',
      proposal: '`geometry.area.fill: { kind: "gradient", from: 0.45, to: 0 }` (opacity stops along the value axis, in the series ink).',
      flint: flintInput(theme, {
        chartType: 'Area Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Unemployment Spiked Twice',
        subtitle: 'US unemployment rate, %.',
      }),
      expectedSpec: gradientExpected(),
    },
    {
      id: 'widget-platter',
      observed: "Flint draws sixty blue bars on white with 0–60 tick labels shrunk to unreadable size and “; X: Minute; Y: Intensity” appended to the subtitle. Expected: the slate platter, white title block, cyan strip under two dotted guides, bold “Now”.",
      title: 'A chart inside a widget platter',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'card-container',
      rule: 'Weather: a dark slate rounded platter; bold white “Heavy Rain Forecasted”, regular white “Heavy rain in the next hour.”; a dense strip of thin light-cyan bars under two dotted guide lines; “Now” bold, then “10m … 50m” in grey, each on the trailing side of its tick; no value axis. “Align the leading edge of a chart with the leading edge of other views.”',
      current: 'ThemeSpec describes a chart on a canvas: there is no container (corner radius, inset, platter colour), no way to put a single chart on a dark surface without restating every ink, and no way to make one tick label (“Now”) bold.',
      expected: 'The widget: platter, title block, minute strip, “Now”.',
      proposal: '`layout.container: { fill, radius, inset }` with `ink.surface.panel` as its fill and an inverse text set; a `labels.emphasis: "first"` (or semantic “now”) for the anchor tick.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: RAIN,
        semantic_types: { Minute: 'Quantity', Intensity: 'Quantity' },
        encodings: { x: 'Minute', y: 'Intensity' },
        title: 'Heavy Rain Forecasted',
        subtitle: 'Heavy rain in the next hour.',
      }),
      expectedSpec: cardExpected(),
      expectedFrame: {
        style: { background: '#334959', borderRadius: '18px', padding: '14px 12px 10px' },
        headerHtml: `<div style="font-family:${DISPLAY};font-size:19px;font-weight:700;color:#fff;margin:0 4px 4px">Heavy Rain Forecasted</div>`
          + `<div style="font-family:${FONT};font-size:15px;color:#fff;margin:0 4px 10px">Heavy rain in the next hour.</div>`,
      },
    },
    {
      id: 'scrub-indicator',
      observed: "Flint shows the plain line (with tiny shrunken tick labels); nothing marks a selected reading. Expected: a grey rule through 2020, a ringed point, and a rounded “2020 AVERAGE 8.1%” read-out above the plot.",
      title: 'Scrubbing reveals values under a vertical indicator',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'focus-hover-state',
      rule: '“Consider expanding the hit target to include the entire plot area, letting people scrub across the area to reveal various values” — a vertical selection rule with the value read out above the plot (Stocks, Health).',
      current: 'ThemeSpec’s `interaction` block paints a selection boundary and a tooltip format; it has no selection-indicator rule, no header read-out, and no notion that the hit target is the whole plot. Flint’s tooltip is the renderer’s hover box on the nearest mark.',
      expected: 'A full-height grey rule at the scrubbed year, a ringed point on the line, the value in a rounded grey header above the plot.',
      proposal: '`interaction.scrub: { indicator: { ink, width }, readout: "header" | "tooltip", hitTarget: "plot" }`, realised with a nearest-x selection over the plot.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Unemployment Spiked Twice',
        subtitle: 'US unemployment rate, %.',
      }),
      expectedSpec: scrubExpected(),
    },
    {
      id: 'legend-circles',
      observed: "Flint’s key is at the bottom-left as stated, with square swatches; the headline wraps onto two lines although the expected panel fits it on one at the same width, and “; Count” is appended to the deck. Expected: circles.",
      title: 'A bottom-leading key with circular symbols',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'legend-swatch',
      rule: 'Swift Charts’ default key sits under the plot at the leading edge, one small circle per series, labels in secondary grey.',
      current: '`legend.swatch` accepts only `"auto"`, which draws a square for bars; this theme moves the key to the leading edge (`align: start`), which the preset had centred.',
      expected: 'Circles, leading-aligned under the plot.',
      proposal: '`legend.swatch: "auto" | "circle" | "square" | "line" | "mark"`.',
      ...groupedCircles(),
    },
    {
      id: 'trailing-is-not-opposite',
      addressed: { stage: 'AX1', note: '`measure.placement: "trailing"` — a vertical value axis moves right, a horizontal one stays at the bottom; the shipped preset states it too (AX1).' },
      observed: "Confirmed: Flint puts the 0–1,500 value labels along the top of the horizontal bars. Expected keeps them at the bottom with the names on the leading side.",
      title: 'Horizontal bars get their value axis along the top',
      kind: 'realization',
      severity: 'medium',
      probe: 'axis-placement',
      rule: '“Consider shifting the Y axis to the trailing side of the chart” — trailing is a horizontal direction: the vertical axis moves right; a horizontal value axis stays at the bottom.',
      current: 'The preset states `structure.axis.measure.placement: "opposite"`, bound by role. On a horizontal bar chart the measure is on x, so “opposite” sends the value axis to the top edge, above the first bar — not what the HIG or Swift Charts does.',
      expected: 'Value labels along the bottom, country names on the leading side.',
      proposal: 'Split placement by direction rather than role: `structure.axis.vertical.placement: "trailing"` / `horizontal.placement: "bottom"`, or let `placement` take `"trailing"` and resolve it only for a vertical axis.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: 'Country', x: 'Population' },
        title: 'India and China Hold over a Third of Humanity',
        subtitle: 'Population, millions, 2023.',
      }),
      expectedSpec: horizontalExpected(),
    },
    {
      id: 'decade-labels-collide',
      addressed: { stage: 'A1', note: 'Names are measured in the face they are drawn in and kept flat: broken at a space, set smaller down to the floor (`type.minSize`, never below ¾ of the stated size), the bands widened — and only then turned (A1).' },
      observed: "Confirmed: “1880s1900s1920s…2020s” runs together as one string under the bars, in tertiary grey. Expected labels every other decade.",
      title: 'Horizontal-only labels run into one another',
      kind: 'realization',
      severity: 'medium',
      probe: 'label-collision',
      rule: '“Keep vertical-axis labels as short as possible” and prefer familiar sequences; labels are never turned (`labels.` in the preset).',
      current: 'With angle forbidden, Flint keeps every one of the nine decade labels at full size on a narrow chart; “1880s1900s1920s…” prints as one run of text. Nothing thins, abbreviates or wraps them.',
      expected: 'Every other decade labelled, the rest left to their bars.',
      proposal: 'When `labels.` refuses rotation, the label plan should thin to every n-th band (or abbreviate “’80s”) and report it.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: DECADES,
        semantic_types: { Decade: 'Category', 'Anomaly (°C)': { semanticType: 'Quantity', unit: '°C' } },
        encodings: { x: 'Decade', y: 'Anomaly (°C)' },
        title: 'The 2020s Ran a Degree Warm',
        subtitle: 'Temperature anomaly vs 1951–1980, °C.',
        baseSize: { width: 320, height: 210 },
      }),
      expectedSpec: decadesExpected(),
    },
    {
      id: 'tick-labels-shrink',
      observed: "Flint’s year labels (2000, 2002 … 2022) and y labels (2 … 10) are about half the stated size and hard to read; expected shows five years and 0/5/10 at 12px.",
      title: 'Tick labels shrink below the minimum size',
      kind: 'realization',
      severity: 'medium',
      probe: 'label-shrink',
      rule: 'Use Dynamic Type text styles (Caption) so labels stay legible; prefer a few familiar values (“0, 5, 10”). The preset states `type.minSize: 11`.',
      current: 'On the 24-year line, Flint labels every second year and the 12-step y axis, and to fit them shrinks the tick labels to about 7px — below the theme’s own `minSize` of 11 and below `axisLabel.size` 12. `tickDensity: "sparse"` on the measure axis did not thin the y ticks either. The same happens on the one-minute strip in the widget gap.',
      expected: 'Five year labels and three values at 12px.',
      proposal: 'Treat `type.minSize` as a floor in the label plan: thin the ticks (every 5 years; 0/5/10) before shrinking type, and report when even thinning cannot fit.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Unemployment Spiked Twice',
        subtitle: 'US unemployment rate, %.',
      }),
      expectedSpec: plainLineExpected(),
    },
  ],
};

export default apple;
