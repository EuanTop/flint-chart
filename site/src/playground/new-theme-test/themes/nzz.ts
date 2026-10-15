import type { ThemeSpec } from 'flint-chart';
import research from '../research/nzz.json';
import { PREVIEW_CASES } from '../../../shared/preview-cases';
import { EV_SHARE, flintInput, footerProbe, forecastProbe, highlightProbe, UNEMPLOYMENT, withChartSource } from '../probes';
import { houseConfig, titled, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const SERIF = "'NZZ Serif', Merriweather, Georgia, serif";
const SANS = "'NZZ Sans', 'GT America', 'Libre Franklin', system-ui, sans-serif";
const NACHT = '#374e8e';
const AQUAMARIN = '#4fbbae';
const MANDARINE = '#df7c18';
const PALETTE = [NACHT, AQUAMARIN, MANDARINE, '#ac004f', '#1b87aa', '#e3b13e', '#ce4631'];
/** The predefined light shade (“-1”) of each palette colour, for context data when one series is highlighted. */
const TINTS = ['#a1aecc', '#abd1cb', '#e5ba9b', '#de9dab', '#9ec1d0', '#e0cba3', '#e6aa9e'];
const GRID = '#E6E6E6';
const BASELINE = '#707070';
const GRAY_DARK = '#333333';
const GRAY_MEDIUM = '#707070';

const t: HouseTokens = {
  font: SANS,
  titleFont: SERIF,
  text: '#000000',
  muted: GRAY_MEDIUM,
  grid: GRID,
  axis: BASELINE,
  background: '#FFFFFF',
  palette: PALETTE,
  highlight: NACHT,
  context: TINTS[0],
  titleSize: 20,
  titleWeight: 700,
  subtitleSize: 14,
  subtitleColor: GRAY_DARK,
  labelSize: 14,
  sourceSize: 12,
  lineWidth: 2,
  legendOrient: 'top',
};

const theme: ThemeSpec = {
  id: 'nzz',
  label: 'Neue Zürcher Zeitung (NZZ Visuals)',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: '#000000', secondary: GRAY_DARK, muted: GRAY_MEDIUM, inverse: '#FFFFFF' },
    structure: { grid: GRID, axis: BASELINE },
    series: {
      single: NACHT,
      categorical: PALETTE,
      overflow: '#d1ccce',
      sequential: { stops: ['#cad8d4', '#a7c5c3', '#84b0b6', '#6899ab', '#5082a1', '#3f6998', '#374d8e'], space: 'lab' },
      diverging: { stops: ['#8e2a1b', '#ce4732', '#cc8e82', '#c7c7c7', '#949eb5', '#6276a6', '#374e8d'], neutral: '#c7c7c7', space: 'lab' },
    },
    accent: NACHT,
  },
  type: {
    headline: { family: SERIF, size: 20, weight: 'bold', case: 'asIs', color: '#000000' },
    deck: { family: SANS, size: 14, weight: 'regular', color: GRAY_DARK },
    axisLabel: { family: SANS, size: 14, color: GRAY_MEDIUM },
    axisTitle: { family: SANS, size: 14, color: GRAY_MEDIUM },
    keyLabel: { family: SANS, size: 14, color: GRAY_DARK },
    valueLabel: { family: SANS, size: 14 },
    annotation: { family: SANS, size: 14, color: GRAY_DARK },
    footnote: { family: SANS, size: 12, color: GRAY_MEDIUM },
  },
  structure: {
    axis: {
      categorical: { line: 'full', ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit', labelGap: 8 },
    },
    grid: { measure: 'full', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: { bandFraction: 0.7, strokeWeight: 2, point: { presence: 'omit' } },
  geometry: { line: { width: 2 }, point: { fill: 'solid' } },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never' },
  annotation: {
    unit: 'never',
    axisTitles: 'omit',
    numberFormat: { thousands: 'none' },
    pointEmphasis: 'endpoints',
    pointLabels: 'endpoints',
  },
  layout: { titleBlock: { anchor: 'start', gap: 'normal', deckGap: 'tight' } },
  // The source line, as the guide sets it (S1); the chart gives the words.
  source: { leadIn: 'Quelle:', credit: { text: 'Grafik: nzz.', separator: ' – ' } },
};

const INTERNET = (PREVIEW_CASES.find((c) => c.id === 'internet-users')?.data ?? []) as { Year: number; 'Internet users (%)': number }[];

const SIG_TITLE = 'Immer mehr Menschen sind online';
const SIG_SUBTITLE = 'Anteil der Weltbevölkerung, der das Internet nutzt, in Prozent';

/** The Q card: white, a soft shadow, the content inset. */
const CARD = { background: '#FFFFFF', boxShadow: '0 1px 5px rgba(0,0,0,0.16)', borderRadius: '2px', padding: '10px 4px 6px' };

const source = (who: string) =>
  `<div style="margin:4px 14px 6px;font-family:${SANS};font-size:12px;color:${GRAY_MEDIUM}">Quelle: <span style="text-decoration:underline;color:#2a3cc2">${who}</span> – Grafik: nzz.</div>`;

/** A line card like the guide’s “Stetig mehr Strassen”: endpoint dots and values in the line colour, two-digit middle years. */
function signature() {
  const first = INTERNET[0];
  const last = INTERNET[INTERNET.length - 1];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: { text: SIG_TITLE, subtitle: SIG_SUBTITLE },
    width: W,
    height: H,
    layer: [
      {
        data: { values: INTERNET },
        mark: { type: 'line', strokeWidth: 2, color: NACHT },
        encoding: {
          x: {
            field: 'Year', type: 'quantitative', title: null, scale: { domain: [1995, 2023], nice: false },
            axis: {
              values: [1995, 2000, 2005, 2010, 2015, 2023], domain: true, domainColor: BASELINE, labelFlush: true,
              labelExpr: "datum.value === 1995 || datum.value === 2000 || datum.value === 2023 ? format(datum.value, 'd') : slice(format(datum.value, 'd'), 2)",
            },
          },
          y: { field: 'Internet users (%)', type: 'quantitative', title: null, scale: { domain: [0, 80] }, axis: { tickCount: 5, labelPadding: 8 } },
        },
      },
      {
        data: { values: [first, last] },
        mark: { type: 'point', filled: true, size: 36, color: NACHT, opacity: 1 },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'Internet users (%)', type: 'quantitative' } },
      },
      {
        data: { values: [{ ...first, align: 'left', dy: -12 }] },
        mark: { type: 'text', align: 'left', dx: 2, dy: -12, fontSize: 14, color: NACHT, font: SANS },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'Internet users (%)', type: 'quantitative' }, text: { field: 'Internet users (%)' } },
      },
      {
        data: { values: [last] },
        mark: { type: 'text', align: 'right', dx: 0, dy: -12, fontSize: 14, color: NACHT, font: SANS },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'Internet users (%)', type: 'quantitative' }, text: { field: 'Internet users (%)' } },
      },
    ],
  };
}

const EV_THREE = EV_SHARE.filter((row) => ['Norway', 'China', 'Germany'].includes(row.Country));

/** Line keys drawn as short strokes at 45°, left-aligned with the title. */
function strokeKey() {
  const config = houseConfig(t);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...config,
      legend: {
        ...(config.legend as object), orient: 'top', symbolType: 'M-0.7,0.7L0.7,-0.7', symbolStrokeWidth: 2, symbolSize: 120,
        labelFontSize: 14, labelColor: GRAY_DARK, columnPadding: 16, offset: 12,
      },
    },
    title: { text: 'Norway leads electric-car sales', subtitle: 'Share of new cars sold that are electric, in percent' },
    width: W,
    height: H,
    data: { values: EV_THREE },
    mark: { type: 'line', strokeWidth: 2 },
    encoding: {
      x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2018, 2023] }, axis: { values: [2018, 2023], format: 'd', domainColor: BASELINE, labelFlush: true } },
      y: { field: 'EV share (%)', type: 'quantitative', title: null, axis: { tickCount: 5, labelPadding: 8 } },
      color: { field: 'Country', type: 'nominal', scale: { domain: ['Norway', 'China', 'Germany'], range: [NACHT, AQUAMARIN, MANDARINE] } },
    },
  };
}

const PEAK = UNEMPLOYMENT.filter((row) => row.Year >= 2016);

/** A callout joined to its column by a thin leader with a rounded corner, ending in a hollow dot. */
function callout() {
  const corner = [
    { x: 2018.5, y: 11 },
    { x: 2019.75, y: 11 },
    { x: 2019.875, y: 10.92 },
    { x: 2019.967, y: 10.7 },
    { x: 2020, y: 10.4 },
    { x: 2020, y: 8.1 },
  ].map((p, i) => ({ ...p, i }));
  return titled(t, {
    layer: [
      {
        data: { values: PEAK },
        mark: { type: 'bar', color: NACHT, width: 30 },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2015.4, 2023.6], nice: false }, axis: { values: PEAK.map((row) => row.Year), format: 'd', domainColor: BASELINE, grid: false } },
          y: { field: 'Unemployment (%)', type: 'quantitative', title: null, scale: { domain: [0, 12] }, axis: { tickCount: 6, labelPadding: 8 } },
        },
      },
      {
        data: { values: corner },
        mark: { type: 'line', color: '#000000', strokeWidth: 1, interpolate: 'linear' },
        encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'y', type: 'quantitative' }, order: { field: 'i' } },
      },
      {
        data: { values: [{ x: 2020, y: 8.1 }] },
        mark: { type: 'point', filled: true, fill: '#FFFFFF', stroke: '#000000', strokeWidth: 1, size: 30, opacity: 1 },
        encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'y', type: 'quantitative' } },
      },
      {
        data: { values: [{ x: 2018.5, y: 11, text: 'Pandemic: the highest rate since 2012' }] },
        mark: { type: 'text', align: 'right', baseline: 'middle', dx: -4, fontSize: 13, color: '#000000', font: SANS },
        encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'y', type: 'quantitative' }, text: { field: 'text' } },
      },
    ],
  }, { title: 'Unemployment jumped in 2020, then fell back', subtitle: 'US unemployment rate, in percent' });
}

/** The same line in German formatting: decimal comma through Vega’s locale. */
function germanNumbers() {
  const ends = [UNEMPLOYMENT[0], UNEMPLOYMENT[UNEMPLOYMENT.length - 1]];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), locale: { number: { decimal: ',', thousands: '\u2009', grouping: [3], currency: ['', '\u00a0CHF'] } } },
    title: { text: 'Arbeitslosigkeit in den USA wieder tief', subtitle: 'Arbeitslosenquote, in Prozent' },
    width: W,
    height: H,
    layer: [
      {
        data: { values: UNEMPLOYMENT },
        mark: { type: 'line', strokeWidth: 2, color: NACHT },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2000, 2023], nice: false }, axis: { values: [2000, 2005, 2010, 2015, 2023], labelExpr: "datum.value === 2000 || datum.value === 2023 ? format(datum.value, 'd') : slice(format(datum.value, 'd'), 2)", domainColor: BASELINE, labelFlush: true } },
          y: { field: 'Unemployment (%)', type: 'quantitative', title: null, scale: { domain: [0, 10] }, axis: { tickCount: 5, labelPadding: 8 } },
        },
      },
      {
        data: { values: ends },
        mark: { type: 'point', filled: true, size: 36, color: NACHT, opacity: 1 },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'Unemployment (%)', type: 'quantitative' } },
      },
      {
        data: { values: ends },
        mark: { type: 'text', dy: 14, fontSize: 14, color: NACHT, font: SANS },
        encoding: {
          x: { field: 'Year', type: 'quantitative' }, y: { field: 'Unemployment (%)', type: 'quantitative' },
          text: { field: 'Unemployment (%)', type: 'quantitative', format: '.1~f' },
        },
      },
    ],
  };
}

/** End values in the colour of their line, the colliding pair pulled apart. */
function endpointInk() {
  const ends = EV_THREE.filter((row) => row.Year === 2018 || row.Year === 2023);
  const place = (row: (typeof ends)[number]) => {
    if (row.Year === 2018) return row.Country === 'Norway' ? { align: 'right', dx: -6, dy: 0 } : { align: 'right', dx: -6, dy: row.Country === 'China' ? -6 : 7 };
    return { align: 'center', dx: 0, dy: row.Country === 'Germany' ? 14 : -12 };
  };
  const color = { field: 'Country', type: 'nominal', scale: { domain: ['Norway', 'China', 'Germany'], range: [NACHT, AQUAMARIN, MANDARINE] } };
  const config = houseConfig(t);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...config,
      legend: { ...(config.legend as object), orient: 'top', symbolType: 'M-0.7,0.7L0.7,-0.7', symbolStrokeWidth: 2, symbolSize: 120, labelFontSize: 14, labelColor: GRAY_DARK, columnPadding: 16, offset: 12 },
    },
    title: { text: 'Norway leads electric-car sales', subtitle: 'Share of new cars sold that are electric, in percent' },
    width: W,
    height: H,
    layer: [
      {
        data: { values: EV_THREE },
        mark: { type: 'line', strokeWidth: 2 },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2017.7, 2023.3], nice: false }, axis: { values: [2018, 2023], format: 'd', domainColor: BASELINE } },
          y: { field: 'EV share (%)', type: 'quantitative', title: null, scale: { domain: [0, 100] }, axis: { tickCount: 5, labelPadding: 8 } },
          color,
        },
      },
      {
        data: { values: ends },
        mark: { type: 'point', filled: true, size: 30, opacity: 1 },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'EV share (%)', type: 'quantitative' }, color },
      },
      ...ends.map((row) => ({
        data: { values: [row] },
        mark: { type: 'text', baseline: 'middle', fontSize: 14, font: SANS, ...place(row) },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'EV share (%)', type: 'quantitative' }, text: { field: 'EV share (%)' }, color },
      })),
    ],
  };
}

const nzz: StyleGuideTheme = {
  id: 'nzz',
  org: 'Neue Zürcher Zeitung (NZZ)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch. Stated directly: a bold serif headline (NZZ Serif, falling back to Merriweather) over a 14px sans subtitle in `#333333`; 14px grey `#707070` axis labels; the seven Q colours in their fixed order, Nacht `#374e8e` first and as the single-series ink, with the 7-step Nacht sequential and the Sugo↔Nacht diverging scale; horizontal light gridlines only, a darker grey baseline and no y-axis line or ticks; the key left-aligned directly above the plot, untitled; no axis titles (units live in the subtitle, `axisTitles: omit`); start and end values written on lines (`pointEmphasis` / `pointLabels: endpoints`); no thousands separator, as in the guide’s examples.',
    'Approximated: the NZZ Sans and NZZ Serif faces are proprietary — Libre Franklin stands in for the sans (close to GT America, its predecessor) and Merriweather for the serif. The guide gives no hex for gridlines; `#E6E6E6` is read off its examples. The signature panel is in German, as the house publishes.',
    'Not stateable: the key’s swatch shape per mark (circles for areas, 45° strokes for lines), highlighting with each colour’s predefined light shade, the “Quelle: … – Grafik: nzz.” line, two-digit years, the rounded leader, dotted forecasts, German number formatting and the Q card — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'A Q card (white, softly shadowed — the page hosts it, the theme cannot state it): bold serif headline stating the finding, sans subtitle with measure and unit; light horizontal gridlines with right-aligned grey labels and a darker baseline; start and end of the line marked with dots and their values in the line colour; middle years shortened to two digits (“1970 78 86 94 2002 10 2017”); “Quelle: … – Grafik: nzz.” bottom-left.',
      current: 'The theme states the type, colours, grid, baseline, the untitled key above the plot, no axis titles and endpoint labels. The source line, the two-digit years and the card have no field.',
      expected: 'The guide’s “Stetig mehr Strassen” card applied to world internet use, 1995–2023.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: INTERNET,
        semantic_types: { Year: 'Year', 'Internet users (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Internet users (%)' },
        title: SIG_TITLE,
        subtitle: SIG_SUBTITLE,
      }),
      expectedSpec: signature(),
      expectedFrame: { style: CARD, footerHtml: source('ITU') },
      observed: 'Flint (left) comes close: serif headline, grey sans deck, light horizontal grid, grey baseline, dots and values at both ends. It differs in the deck, which gains “; Internet users (%)” in English; the end values, printed in black rather than Nacht; the years, printed in full every five; and the missing card and “Quelle: ITU – Grafik: nzz.”. Expected (right): 1995, 2000, 05, 10, 15, 2023; values in the line colour; source line inside the card.',
    },
    {
      id: 'stroke-key',
      title: 'Key swatches: 45° strokes for lines, circles for areas',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'legend-swatch',
      rule: '“Legends for basic charts are constructed with circles and lines at a 45 degree angle” — a filled circle keys a bar or area, a short diagonal stroke (solid or dotted) keys a line.',
      current: '`legend.swatch` only accepts `auto`. Flint picks the symbol itself — a filled circle for lines, a square for bars — and cannot be asked for a diagonal stroke.',
      expected: 'Norway, China and Germany keyed by short 45° strokes in their line colours, left-aligned above the plot.',
      proposal: '`legend.swatch: { line: "diagonalStroke" | "stroke", fill: "circle" | "square" }` — the swatch per mark family, realised as a custom `symbolType` path.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_THREE,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway leads electric-car sales',
        subtitle: 'Share of new cars sold that are electric, in percent',
      }),
      expectedSpec: strokeKey(),
      observed: 'Flint (left): the key is left-aligned above the plot, as stated, but each line is keyed by a filled circle — the swatch NZZ reserves for bars and areas. Expected (right): short 45° strokes in the line colours.',
    },
    {
      id: 'highlight-tint',
      title: 'Highlight in the full colour, context in its light shade',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'highlight',
      rule: '“Give the secondary data points a lighter shade … Do not use a lesser transparent shade of a color and allow grid lines to show through.” Each Q colour has a predefined light shade (Nacht `#374e8e` → `#a1aecc`, Aquamarin → `#abd1cb` …).',
      current: 'Nothing names the highlighted category, and the theme has no paired light shade per colour; every bar is Nacht.',
      expected: 'Nigeria in Nacht, every other bar in Nacht’s light shade `#a1aecc` — opaque, not faded.',
      proposal: '`chart_spec.emphasis: { field, values }` plus `ink.series.contextTints` (an array parallel to `categorical`) so the context takes the light shade *of its own series colour*, not a shared grey.',
      ...highlightProbe(theme, t, { focus: 'Nigeria', title: 'Nigeria is the most populous country in Africa', subtitle: 'Population in millions, 2023' }),
      observed: 'Flint (left): all eight bars in full Nacht; the value axis also reads “1,000 · 1,500” although `thousands: none` is stated. Expected (right): Nigeria in full Nacht, the others in the opaque light shade `#a1aecc`.',
    },
    {
      id: 'source-line',
      addressed: { stage: 'S1', note: '“Quelle: … – Grafik: nzz.” bottom-left (`leadIn: "Quelle:"`, an inline credit after an en dash).' },
      title: '“Quelle: … – Grafik: nzz.” at the bottom left',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: 'Online: “Quelle: <linked source> – Grafik: nzz.” in small grey bottom-left; print: “QUELLE: …” in capitals left and “NZZ Visuals/nzz.” right.',
      current: 'The chart spec has no source slot and no link; nothing draws `type.footnote` (12px grey here).',
      expected: 'A 12px grey source line with the source underlined as a link and the graphics credit after a dash.',
      proposal: '`chart_spec.source: { text, url }` and `chart_spec.credit`, with a theme template `annotation.sourceLine: "Quelle: {source} – Grafik: {credit}"`.',
      ...footerProbe(theme, t, { title: 'India and China hold over a third of humanity', subtitle: 'Population in millions, 2023', footer: [] }),
      expectedFrame: { footerHtml: source('UN World Population Prospects') },
      observed: 'Flint (left): no source; the deck ends “; Population (m)”. Expected (right): “Quelle: UN World Population Prospects – Grafik: nzz.” in 12px grey with the source underlined.',
    },
    {
      id: 'callout',
      title: 'Callouts on a thin leader with a rounded corner and a dot',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'annotation',
      rule: '“Use a curved corner (not straight) when space allows”; short text aligned consistently to its leader; a dot marks the exact data point.',
      current: 'The chart spec has no annotation slot, and the theme no leader style.',
      expected: 'One sentence above the columns, a 1px leader running right then turning down through a rounded corner to a hollow dot on the 2020 column.',
      proposal: '`chart_spec.annotations[]` with a theme `annotation.leader: { corner: "rounded" | "square", weight, ink, endpoint: "dot" | "none" }`.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: PEAK,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Unemployment jumped in 2020, then fell back',
        subtitle: 'US unemployment rate, in percent',
      }),
      expectedSpec: callout(),
      observed: 'Flint (left): plain Nacht columns; the years are labelled every other one and turned 45°, though eight four-digit years fit flat. Expected (right): the sentence above the columns, its leader turning down through a rounded corner to a hollow dot on the 2020 column, all years flat.',
    },
    {
      id: 'forecast-dotted',
      title: 'Forecasts as a dotted continuation of the line',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'forecast-style',
      rule: '“Use dotted lines for prognosis” in line charts and hatched areas for prognosis in bar charts — hatching is reserved for forecasts.',
      current: 'Flint has no notion of a forecast: the projected rows are a second series, told apart by Flint’s default dash and a key.',
      expected: 'One Nacht line, solid to 2023 and dotted after, labelled in place.',
      proposal: 'A forecast/estimate status in `semantic_types` and `annotation.forecast: { line: "dotted" | "dashed", bar: "hatched" }` in the theme.',
      ...forecastProbe(theme, t, { dash: [1.5, 3], projectedColor: NACHT }),
      observed: 'Flint (left): the projection is dashed rather than dotted, and the dash is keyed by a titled “Series” legend at the right of the plot — against `legend.placement: ["top"]` and `title: "omit"`, which the colour keys on this page do obey. Expected (right): one Nacht line, dotted after 2023, labelled in place.',
    },
    {
      id: 'two-digit-years',
      title: 'Middle years shortened to two digits, or only first and last',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'date-label-format',
      rule: '“Remove year labels when several years are displayed and the focus of the graphic is the trend” (first and last only); otherwise abbreviate the years between: 1970, 78, 86, 94, 2002, 10, 2017.',
      current: 'No ThemeSpec field governs date tick text; `structure.axis.categorical.tickLabels: "endpoints"` could cut to the two ends but cannot shorten the middle ones, and the theme cannot know when the trend is the point.',
      expected: 'See the signature panel: 1995, 2000, 05, 10, 15, 2023.',
      proposal: '`annotation.dateLabels: { abbreviateRepeated: "twoDigit" }` (shared with the Economist and the Dallas Morning News).',
    },
    {
      id: 'german-numbers',
      title: 'German number formatting: decimal comma, no separator in four digits',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'number-format',
      rule: 'German formatting with a decimal comma (“3,6”), tabular lining figures, four-digit numbers without a separator as in the guide’s examples (“1500”, “1855”), large numbers reduced with the unit in the subtitle (“in Tausend”).',
      current: '`annotation.numberFormat` states precision, sign, thousands and ordinals but no locale, so Flint formats with d3’s en-US default (“3.6”). `thousands: "none"` is stated here and is not honoured on axes either: the population bars read “1,000 · 1,500”.',
      expected: 'The end value written “3,6”, in the line colour.',
      proposal: '`annotation.numberFormat.locale: "de-CH"` (decimal and group marks, minimum digits before grouping), realised through Vega’s `config.locale`; honour `thousands: "none"` in axis formats.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Arbeitslosigkeit in den USA wieder tief',
        subtitle: 'Arbeitslosenquote, in Prozent',
      }),
      expectedSpec: germanNumbers(),
      observed: 'Flint (left): “3.6” at the end and en-US formatting throughout; the y ticks are also shrunk to ~8px and the axis cut at 3. Expected (right): “3,6” in Nacht and a zero-based axis at 14px.',
    },
    {
      id: 'endpoint-ink',
      addressed: { stage: 'R4', note: 'Values written in the line’s colour are darkened in its hue where it reads under 3:1.' },
      title: 'Start and end values are written in the line’s colour',
      kind: 'realization',
      severity: 'medium',
      probe: 'series-text-ink',
      rule: 'Line charts mark start and end with a dot and write the values beside it “in the series colour” (the guide’s “Stetig mehr Strassen”: 651 and 1855 in blue).',
      current: 'Stated as `annotation.pointEmphasis: "endpoints"` with `pointLabels: "endpoints"`. Flint draws the dots and the values, but writes every value in the primary text ink (`fill: #000000`), and does not move labels that collide: China’s 4 and Germany’s 2 at 2018 print on top of each other.',
      expected: 'Each end value in its series colour, nudged apart where two start at the same height.',
      proposal: 'Point labels should take `inkMode: matchSeries` (the `dataLabels.inkMode` vocabulary exists, but `pointLabels` does not read it), and run through the same collision pass as series-end labels.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_THREE,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway leads electric-car sales',
        subtitle: 'Share of new cars sold that are electric, in percent',
      }),
      expectedSpec: endpointInk(),
      observed: 'Flint (left): 49, 93, 38, 25 in black, and China’s 4 and Germany’s 2 printed over each other at 2018. Expected (right): every value in its line’s colour, the 2018 pair set apart.',
    },
    {
      id: 'measure-restated',
      addressed: { stage: 'A4', note: 'The deck no longer appends a title its author’s deck already names, unit included (A4).' },
      title: 'The subtitle repeats the measure it already names',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'axis-title-relocation',
      rule: 'No axis titles: the subtitle names measure and unit (“Länge des Nationalstrassennetzes in Kilometern”, “in Tausend”).',
      current: '`annotation.axisTitles: "omit"` appends the axis title to the deck whatever the deck says, so “… in Prozent” becomes “… in Prozent; Internet users (%)” — and in English, in the field’s own name.',
      expected: 'The deck as written.',
      proposal: 'Let the author mark the deck as already naming the measure (`chart_spec.subtitleNamesMeasure`), or append only when the deck is empty.',
      observed: 'Every Flint panel on this page ends its deck with “; <field name>”: “; Internet users (%)”, “; Population (m)”, “; EV share (%)”, “; Capacity (GW)”.',
    },
  ],
};

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(nzz, 'UNO', ['source-line']);

export default nzz;
