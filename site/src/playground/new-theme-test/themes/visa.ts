import type { ThemeSpec } from 'flint-chart';
import research from '../research/visa.json';
import { EV_SHARE, POPULATION, UNEMPLOYMENT, flintInput, groupedProbe, MEDALS } from '../probes';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Open Sans', Arial, sans-serif";
const BLUE = '#226092';
const TITLE_BLUE = '#003EA9';
const SUBTITLE = '#57587D';
const TEXT = '#222222';
const GREY = '#767676';
const GRID = '#c9c9c9';
const LIGHT = ['#7c99b1', '#cacae7', '#abb798', '#a19491', '#e7c0b8', '#624c48'];
const DARK = ['#226092', '#796aaf', '#829e46', '#7a6763', '#c18174', '#43312d'];
const TEXT_INK = ['#164d79', '#66589b', '#498329', '#6e5a55', '#954737', '#43312d'];

const t: HouseTokens = {
  font: FONT,
  text: TEXT,
  muted: GREY,
  grid: GRID,
  gridDash: [4, 3],
  gridWidth: 0.8,
  axis: GREY,
  background: '#ffffff',
  palette: LIGHT,
  highlight: BLUE,
  context: '#D7D7DE',
  titleSize: 24,
  titleWeight: 300,
  subtitleSize: 14,
  subtitleColor: SUBTITLE,
  labelSize: 12,
  lineWidth: 2,
  legendOrient: 'top',
};

const theme: ThemeSpec = {
  id: 'visa',
  label: 'Visa Chart Components',
  ink: {
    surface: { source: 'house', canvas: '#ffffff' },
    text: { primary: TEXT, secondary: GREY, muted: GREY, inverse: '#ffffff' },
    structure: { grid: GRID, axis: GREY, rule: '#5C5C5C', zero: GREY },
    series: {
      single: BLUE,
      categorical: LIGHT,
      overflow: '#D7D7DE',
      sequential: { stops: ['#f7fcfd', '#e3daec', '#cebadd', '#b59acc', '#977ebb', '#7367a5', '#554f87', '#423667', '#331d48'], space: 'lab' },
      diverging: { stops: ['#a50026', '#c7422a', '#df7232', '#f3a14b', '#ffcf7b', '#afdbf1', '#7ab7e5', '#5390d1', '#386bb6', '#2d4697'], space: 'lab' },
    },
    accent: TITLE_BLUE,
  },
  type: {
    headline: { family: FONT, size: 24, weight: 'light', color: TITLE_BLUE },
    deck: { family: FONT, size: 14, weight: 'regular', color: SUBTITLE },
    axisLabel: { family: FONT, size: 12, color: GREY },
    axisTitle: { family: FONT, size: 14, weight: 'regular', color: TEXT },
    keyLabel: { family: FONT, size: 14, color: TEXT },
    valueLabel: { family: FONT, size: 12, color: TEXT },
    footnote: { family: FONT, size: 12, color: GREY },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit' },
    },
    grid: { measure: 'full', category: 'omit', style: 'dashed', dash: [4, 3], weight: 0.8 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: {
    bandFraction: 0.8,
    cornerRadius: 0,
    strokeWeight: 2,
    interpolation: 'linear',
    point: { presence: 'full', size: 64, fill: 'solid' },
    outline: { presence: 'hairline', weight: 1, source: 'ink' },
    redundantEncoding: 'always',
    redundantChannels: ['texture', 'dash'],
    // Accessibility textures on by default: one diagonal hatch in the darker shade of each fill (R13).
    texture: { pattern: 'hatch', ink: 'darker' },
    reference: { presence: 'full', style: 'line', weight: 1, label: true },
  },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'always', placement: 'outsideMark', inkMode: 'fixed' },
  annotation: { axisTitles: 'always', axisTitlePlacement: 'rotated', numberFormat: { thousands: 'suffix', compact: { style: 'lower', per: 'value' } }, pointLabels: 'all' },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' }, bandStepFit: 1 },
};

/** The README bar specimen’s readings, April 2017 to March 2018. */
const MONTHS = [1.4, 6, 3.2, 2.2, 4.5, 3.8, 6.5, 7.5, 2.6, 2.3, 3.2, 8.5].map((m, i) => {
  const date = new Date(Date.UTC(2017, 3 + i, 1));
  const label = `${date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} ${String(date.getUTCFullYear()).slice(2)}`;
  return { Month: date.toISOString().slice(0, 7), label, Transactions: m * 1e6 };
});

/** houseConfig with the headline in Visa blue at a light weight. */
const cfg = (): Record<string, unknown> => {
  const base = houseConfig(t);
  return { ...base, title: { ...(base.title as object), color: TITLE_BLUE, fontWeight: 300 } };
};

const abbrev = (expr: string) => `replace(replace(format(${expr}, '.3~s'), 'G', 'b'), 'M', 'm')`;

const hatch = (id: string, fill: string, stroke: string, strokeOpacity = 1) =>
  `<pattern id="${id}" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(-45)">`
  + `<rect width="7" height="7" fill="${fill}"/><line x1="0" y1="0" x2="0" y2="7" stroke="${stroke}" stroke-opacity="${strokeOpacity}" stroke-width="1.5"/></pattern>`;
const defs = (patterns: string) => `<svg width="0" height="0" style="position:absolute"><defs>${patterns}</defs></svg>`;

const dataTableButton = `<div style="margin:0 14px 8px;display:inline-grid;grid-template-columns:7px 7px;gap:3px">${'<span style="width:7px;height:7px;border:1.5px solid #0051dc;border-radius:2px;box-sizing:border-box"></span>'.repeat(4)}</div>`;

const SIG_TITLE = 'Transactions rose to 8.5m in March';
const SIG_SUBTITLE = 'Monthly transactions, April 2017 – March 2018';

function signature() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...cfg(), axis: { ...(houseConfig(t).axis as object), titleColor: TEXT, titleFontSize: 14 } },
    title: { text: SIG_TITLE, subtitle: SIG_SUBTITLE },
    width: W,
    height: H,
    data: { values: MONTHS },
    encoding: {
      x: { field: 'label', type: 'ordinal', sort: null, title: 'Month', axis: { labelAngle: 0, labelExpr: 'split(datum.label, " ")', labelLineHeight: 13, domain: true, domainColor: GREY } },
      y: { field: 'Transactions', type: 'quantitative', title: 'Transactions', axis: { labelExpr: abbrev('datum.value'), tickCount: 8 } },
    },
    layer: [
      { mark: { type: 'bar', fill: 'url(#visa-hatch-single)', stroke: '#164d79', strokeWidth: 1, width: { band: 0.8 } } },
      {
        mark: { type: 'text', dy: -8, fontSize: 12, color: TEXT },
        encoding: { text: { field: 'lbl', type: 'nominal' } },
        transform: [{ calculate: abbrev('datum.Transactions'), as: 'lbl' }],
      },
    ],
  };
}

const POP_PEOPLE = POPULATION.map((row) => ({ Country: row.Country, Population: row.Population * 1e6 }));

function numberExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: cfg(),
    title: { text: 'India and China pass 1.4b people', subtitle: 'Population, 2023' },
    width: W,
    height: H,
    data: { values: POP_PEOPLE },
    encoding: {
      y: { field: 'Country', type: 'nominal', sort: null, title: null },
      x: { field: 'Population', type: 'quantitative', title: null, axis: { labelExpr: abbrev('datum.value'), tickCount: 4, grid: true, gridDash: [4, 3] } },
    },
    layer: [
      { mark: { type: 'bar', fill: BLUE, height: { band: 0.8 } } },
      {
        mark: { type: 'text', align: 'left', dx: 4, fontSize: 12, color: TEXT },
        encoding: { text: { field: 'lbl', type: 'nominal' } },
        transform: [{ calculate: abbrev('datum.Population'), as: 'lbl' }],
      },
    ],
  };
}

const MEDAL_ORDER = ['Gold', 'Silver', 'Bronze'];

function texturedGroups() {
  const rows = MEDALS.filter((row) => ['United States', 'China', 'Japan', 'Australia'].includes(row.Country));
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...cfg(), legend: { disable: true } },
    title: { text: 'The US and China shared the top of the medal table', subtitle: 'Paris 2024 Olympic medals by type' },
    width: W,
    height: H,
    data: { values: rows },
    layer: [
      {
        mark: { type: 'bar', strokeWidth: 1 },
        encoding: {
          x: { field: 'Country', type: 'nominal', sort: null, title: null, axis: { labelAngle: 0, domain: true, domainColor: GREY }, scale: { paddingInner: 0.2 } },
          xOffset: { field: 'Medal', sort: MEDAL_ORDER },
          y: { field: 'Count', type: 'quantitative', title: null },
          fill: { field: 'Medal', type: 'nominal', sort: MEDAL_ORDER, scale: { domain: MEDAL_ORDER, range: MEDAL_ORDER.map((_, i) => `url(#visa-hatch-${i})`) } },
          stroke: { field: 'Medal', type: 'nominal', sort: MEDAL_ORDER, scale: { domain: MEDAL_ORDER, range: DARK.slice(0, 3) } },
        },
      },
      {
        mark: { type: 'text', dy: -6, fontSize: 11 },
        encoding: {
          x: { field: 'Country', type: 'nominal', sort: null },
          xOffset: { field: 'Medal', sort: MEDAL_ORDER },
          y: { field: 'Count', type: 'quantitative' },
          text: { field: 'Count', type: 'quantitative' },
          color: { field: 'Medal', type: 'nominal', legend: null, scale: { domain: MEDAL_ORDER, range: TEXT_INK.slice(0, 3) } },
        },
      },
    ],
  };
}

/** The key, drawn in HTML so its swatches can use the same pattern fills. */
const medalKey = `<div style="display:flex;gap:14px;margin:0 14px;font-family:${FONT};font-size:14px;color:${TEXT}">`
  + MEDAL_ORDER.map((name, i) => `<span style="display:inline-flex;align-items:center;gap:6px"><svg width="14" height="14"><rect x="0.5" y="0.5" width="13" height="13" fill="url(#visa-hatch-${i})" stroke="${DARK[i]}"/></svg>${name}</span>`).join('')
  + '</div>';

const EV2 = ['Norway', 'China'];
const ev2 = EV_SHARE.filter((row) => EV2.includes(row.Country));

/** The line specimen: dark-variant strokes, dashes, light-filled dots, values above every point and names at the line ends, all in the text variant. */
function lineExpected() {
  const scale = (range: unknown[]) => ({ domain: EV2, range });
  const x = { field: 'Year', type: 'ordinal', title: null, axis: { labelAngle: 0, domain: true, domainColor: GREY } };
  const y = { field: 'EV share (%)', type: 'quantitative', title: 'Share of sales (%)', scale: { domain: [0, 100] }, axis: { tickCount: 5 } };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...cfg(),
      axis: { ...(houseConfig(t).axis as object), titleColor: TEXT, titleFontSize: 14 },
      axisY: { ...(houseConfig(t).axisY as object), domain: true, domainColor: GREY },
      legend: { ...(houseConfig(t).legend as object), symbolType: 'stroke', symbolStrokeWidth: 2.5, symbolSize: 300, labelFontSize: 14 },
    },
    title: { text: 'Electric cars took off in Norway', subtitle: 'Share of new cars sold that are electric' },
    width: W - 40,
    height: H,
    data: { values: ev2 },
    layer: [
      {
        mark: { type: 'line', strokeWidth: 2 },
        encoding: {
          x, y,
          color: { field: 'Country', type: 'nominal', scale: scale(DARK.slice(0, 2)) },
          strokeDash: { field: 'Country', type: 'nominal', scale: scale([[1, 0], [6, 4]]) },
        },
      },
      {
        mark: { type: 'point', filled: true, size: 70, strokeWidth: 1.5, opacity: 1 },
        encoding: {
          x, y,
          fill: { field: 'Country', type: 'nominal', legend: null, scale: scale(LIGHT.slice(0, 2)) },
          stroke: { field: 'Country', type: 'nominal', legend: null, scale: scale(DARK.slice(0, 2)) },
        },
      },
      {
        mark: { type: 'text', dy: -12, fontSize: 12 },
        encoding: {
          x, y,
          text: { field: 'EV share (%)', type: 'quantitative' },
          color: { field: 'Country', type: 'nominal', legend: null, scale: scale(TEXT_INK.slice(0, 2)) },
        },
      },
      {
        transform: [{ filter: 'datum.Year === 2023' }],
        mark: { type: 'text', align: 'left', dx: 12, fontSize: 13 },
        encoding: {
          x, y,
          text: { field: 'Country', type: 'nominal' },
          color: { field: 'Country', type: 'nominal', legend: null, scale: scale(TEXT_INK.slice(0, 2)) },
        },
      },
    ],
  };
}

/** Hover: a 2px dark stroke on the bar under the pointer, the rest dimmed; keyboard focus draws the same. */
function focusExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: cfg(),
    title: { text: SIG_TITLE, subtitle: SIG_SUBTITLE },
    width: W,
    height: H,
    data: { values: MONTHS },
    encoding: {
      x: { field: 'label', type: 'ordinal', sort: null, title: null, axis: { labelAngle: 0, labelExpr: 'split(datum.label, " ")', labelLineHeight: 13, domain: true, domainColor: GREY } },
      y: { field: 'Transactions', type: 'quantitative', title: null, axis: { labelExpr: abbrev('datum.value'), tickCount: 8 } },
    },
    layer: [
      {
        mark: { type: 'bar', fill: 'url(#visa-hatch-focus)', width: { band: 0.8 } },
        encoding: {
          opacity: { condition: { test: "datum.label === 'Nov 17'", value: 1 }, value: 0.35 },
          stroke: { condition: { test: "datum.label === 'Nov 17'", value: TEXT }, value: '#164d79' },
          strokeWidth: { condition: { test: "datum.label === 'Nov 17'", value: 2 }, value: 1 },
        },
      },
      {
        transform: [{ filter: "datum.label === 'Nov 17'" }, { calculate: abbrev('datum.Transactions'), as: 'lbl' }],
        mark: { type: 'text', dy: -8, fontSize: 12, fontWeight: 'bold', color: TEXT },
        encoding: { text: { field: 'lbl', type: 'nominal' } },
      },
    ],
  };
}

const EV3 = ['Norway', 'China', 'Germany'];
const ev3 = EV_SHARE.filter((row) => EV3.includes(row.Country));

/** The deck as the key: series names in the subtitle in each series’ text ink. */
function keywordExpected() {
  const scale = (range: unknown[]) => ({ domain: EV3, range });
  const x = { field: 'Year', type: 'ordinal', title: null, axis: { labelAngle: 0, domain: true, domainColor: GREY } };
  const y = { field: 'EV share (%)', type: 'quantitative', title: null, axis: { tickCount: 5 } };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...cfg(), legend: { disable: true } },
    width: W,
    height: H,
    data: { values: ev3 },
    layer: [
      { mark: { type: 'line', strokeWidth: 2 }, encoding: { x, y, color: { field: 'Country', type: 'nominal', scale: scale(DARK.slice(0, 3)) } } },
      {
        mark: { type: 'point', filled: true, size: 50, strokeWidth: 1.5, opacity: 1 },
        encoding: { x, y, fill: { field: 'Country', type: 'nominal', scale: scale(LIGHT.slice(0, 3)) }, stroke: { field: 'Country', type: 'nominal', scale: scale(DARK.slice(0, 3)) } },
      },
    ],
  };
}

const keyword = (name: string) => `<span style="color:${TEXT_INK[EV3.indexOf(name)]};font-weight:600">${name}</span>`;
const keywordHeader = `<div style="font-family:${FONT};margin:0 14px 6px"><div style="font-size:24px;font-weight:300;color:${TITLE_BLUE}">Electric cars took off</div>`
  + `<div style="font-size:14px;color:${SUBTITLE};margin-top:2px">${keyword('Norway')} is far ahead; ${keyword('China')} and ${keyword('Germany')} are catching up</div></div>`;

function tooltipExpected() {
  const point = UNEMPLOYMENT.find((row) => row.Year === 2020)!;
  const x = { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2000, 2023], nice: false }, axis: { format: 'd', values: [2000, 2005, 2010, 2015, 2020], domain: true, domainColor: GREY } };
  const y = { field: 'Unemployment (%)', type: 'quantitative', title: null, axis: { tickCount: 5 } };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: cfg(),
    title: 'Unemployment rate',
    width: W,
    height: H,
    layer: [
      { data: { values: UNEMPLOYMENT }, mark: { type: 'line', strokeWidth: 2, color: BLUE }, encoding: { x, y } },
      { data: { values: UNEMPLOYMENT }, mark: { type: 'point', filled: true, size: 30, fill: LIGHT[0], stroke: BLUE, strokeWidth: 1, opacity: 1 }, encoding: { x, y } },
      { data: { values: [point] }, mark: { type: 'point', filled: true, size: 70, fill: LIGHT[0], stroke: BLUE, strokeWidth: 3, opacity: 1 }, encoding: { x, y } },
    ],
  };
}

const tooltipHtml = `<div style="position:absolute;left:250px;top:60px;font-family:${FONT};background:#ffffff;border:1px solid #565656;border-radius:3px;padding:8px;min-width:80px;font-size:14px;font-weight:400;color:${TEXT};line-height:1.35">`
  + '<div>Year: <b>2020</b></div><div>Rate: <b>8.1%</b></div></div>';

const monthsFlint = (title: string, subtitle: string) => flintInput(theme, {
  chartType: 'Bar Chart',
  data: MONTHS.map(({ Month, Transactions }) => ({ Month, Transactions })),
  semantic_types: { Month: 'YearMonth', Transactions: 'Quantity' },
  encodings: { x: 'Month', y: 'Transactions' },
  title,
  subtitle,
});

const visa: StyleGuideTheme = {
  id: 'visa',
  org: 'Visa (Chart Components)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the open-source Visa Chart Components (default props, SCSS, colour and texture utilities); there is no prose style guide. Visa names no chart font; the README screenshots read as Open Sans, which is named here.',
    'Stated directly: the single blue #226092, the six-colour `categorical_light` palette, the purple sequential and red–blue diverging ramps, dashed 0.8px #c9c9c9 gridlines across the value axis only, 12px #767676 tick labels, no axis lines or ticks, square bars at 80% of the band, dots on lines, value labels on every mark with `k`/`m`/`b` suffixes, rotated axis titles, a top-left untitled key, and the headline in Visa blue with a grey-violet deck.',
    'Stated but not drawn: the default accessibility texture (`marks.redundantChannels: ["texture"]` is dropped as unrealizable) and value labels on lines. Not stated: the headline’s light weight, the paired light/dark/text variant of every hue, the data-table button, focus and hover states, and the tooltip box. See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      observed: 'Flint (left) gets the Visa-blue headline, grey-violet deck, dashed grid, square #226092 bars and the rotated title. It drops the hatch, prints no value labels at all (the month axis is temporal, not banded), labels ticks “10,000,000”, names months “April, July, October, 2018” where Visa writes “Apr 17” over two lines, and sets the headline at 400 where Visa’s is light. Expected adds the data-table button.',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'high',
      probe: 'signature',
      rule: 'README bar specimen: light-weight Visa-blue title and grey-violet subtitle; #226092 bars with a diagonal hatch and a darker outline; an abbreviated value (“1.4m”) above every bar; dashed light grey gridlines; “1m … 8m” ticks; rotated y title, x title centred below; “Apr 17” months on two lines; a blue data-table button bottom-left.',
      current: 'Flint draws the blue bars at 80% of the band, the dashed grid, the coloured headline and deck and the rotated axis title. It drops the hatch and the value labels.',
      expected: 'The README specimen with its own readings.',
      flint: monthsFlint(SIG_TITLE, SIG_SUBTITLE),
      expectedSpec: signature(),
      expectedFrame: { headerHtml: defs(hatch('visa-hatch-single', BLUE, '#ffffff', 0.35)), footerHtml: dataTableButton },
    },
    {
      id: 'pattern-fill',
      addressed: { stage: 'R13', note: 'Every filled mark is hatched in the darker shade of its ink and outlined in it (`marks.texture: { pattern: "hatch" }`). The value labels in each series’ text variant stay open.' },
      observed: 'Flint draws flat light fills with a thin dark outline and black value labels. Expected hatches each series in its dark variant, outlines it in the same ink and prints the values in the text variant.',
      title: 'Every filled mark carries a hatch texture by default',
      kind: 'realization',
      severity: 'high',
      probe: 'pattern-fill',
      rule: 'Accessibility textures are on by default (`hideTextures: false`): each fill gets a diagonal hatch “using the first color for the texture’s stroke”, plus a contrasting outline with at least 3:1 non-text contrast.',
      current: 'The theme states `marks.redundantChannels: ["texture"]` and an ink outline. Flint reports the texture as not realizable and drops it; the outline is drawn but in one structural ink for every series.',
      expected: 'Grouped medal bars, each series a light fill hatched and outlined in its dark variant, values above in the text variant.',
      proposal: 'Realise `texture` as Vega-Lite pattern fills (SVG `<pattern>` defs or Vega gradients), with `ink.series.texture: { angle, spacing, ink: "darkVariant" }`; let `marks.outline.source` take `"seriesDark"`.',
      flint: groupedProbe(theme, t).flint,
      expectedSpec: texturedGroups(),
      expectedFrame: { headerHtml: defs(MEDAL_ORDER.map((_, i) => hatch(`visa-hatch-${i}`, LIGHT[i], DARK[i], 0.8)).join('')), footerHtml: medalKey },
    },
    {
      id: 'number-format',
      addressed: { stage: 'A6', note: '`compact: { style: "lower", per: "value" }` — 1.43b, 340m at the bar ends, 0, 1b, 2b on the axis (A6).' },
      observed: 'Flint prints “1428600000” … “173000000” at the bar ends and ticks “0, 800,000,000, 1,600,000,000”. Expected: “1.43b”, “340m” … and “0, 500m, 1b, 1.5b”.',
      title: 'Values read “1.43b”, “340m” — on ticks and labels',
      kind: 'realization',
      severity: 'medium',
      probe: 'number-format',
      rule: 'Every number uses numeral.js `0[.][0][0]a`: up to two decimals and a lowercase k/m/b suffix (“8.5m”, “9.7b”), on the axis ticks as well as on the value labels.',
      current: '`annotation.numberFormat.thousands: "suffix"` is stated. Flint grounds it as d3 `~s` (SI prefixes: uppercase “M”, “G” for billions) for value labels only — and on this chart the labels come out as raw integers (“1428600000”) while the axis reads “800,000,000”.',
      expected: '“1.43b”, “340m”… at the bar ends and “0, 500m, 1b, 1.5b” on the axis.',
      proposal: 'Make `thousands: "suffix"` a financial suffix set (`k`, `m`/`M`, `b`/`B`, `t`) with `suffixCase`, and apply `numberFormat` to measure-axis ticks too.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POP_PEOPLE,
        semantic_types: { Country: 'Country', Population: 'Quantity' },
        encodings: { y: 'Country', x: 'Population' },
        title: 'India and China pass 1.4b people',
        subtitle: 'Population, 2023',
        chartProperties: { showTextLabels: true },
      }),
      expectedSpec: numberExpected(),
    },
    {
      id: 'series-ink-variants',
      addressed: { stage: 'R4', note: 'The text ink of each hue is stated as `categoricalText`; the light fill variant is not.' },
      observed: 'Flint strokes Norway dashed in #7c99b1 and China in #cacae7 — the China line nearly vanishes on white — with no value or end labels. Expected: dark strokes, light-filled outlined dots, a value over every point, names at the ends.',
      title: 'Each hue comes as light fill, dark stroke and text ink',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'series-ink-variants',
      rule: 'Every categorical hue has three tokens: `categorical_light` (#7c99b1, #cacae7, …) for fills, `categorical_dark` (#226092, #796aaf, …) for strokes and outlines, `categorical_text` (#164d79, #66589b, …) for labels in the series colour. Line specimen: dark strokes, a dash per series, dots filled light and outlined dark, a value over every point and the series name at the line end, in the text ink.',
      current: 'ThemeSpec has one ink per series. With the light palette as `categorical`, Flint strokes the lines in the fill tints (China in #cacae7, barely visible on white), and the dots and key take the same pale ink.',
      expected: 'The line specimen with the EV data.',
      proposal: '`ink.series.variants: { fill: [...], stroke: [...], text: [...] }` indexed with `categorical`, read by marks (fill vs stroke), outlines and `dataLabels.inkMode: "matchSeries"`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: ev2,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Electric cars took off in Norway',
        subtitle: 'Share of new cars sold that are electric',
      }),
      expectedSpec: lineExpected(),
    },
    {
      id: 'line-value-labels',
      title: 'Lines are labelled at every point and at their ends',
      kind: 'realization',
      severity: 'medium',
      probe: 'value-label-placement',
      rule: '`dataLabel: { visible: true, placement: "top" }` on lines too, with collision detection; `seriesLabel: { visible: true, placement: "right" }` names each line at its end, alongside the key.',
      current: 'The theme states `dataLabels.show: "always"` and `annotation.pointLabels: "all"`. Flint refuses value labels on any line (“its vertices are sampling points”) and draws no series-end names while a key is shown; on the monthly bar chart (a date axis, so not banded) it drops the bar labels too — see the signature.',
      expected: 'See the series-ink-variants panels: a value above every dot and “Norway”/“China” at the right ends.',
      proposal: 'Let `pointLabels: "all"` override the sampling-point guard when the line has few vertices (≤ 12 per series), and allow `legend.placement: ["top", "seriesEnd"]` to mean both.',
    },
    {
      id: 'in-text-legend',
      observed: 'Flint keeps a separate key above the plot and its deck is plain grey-violet (wrapped onto two lines). Expected colours Norway, China and Germany in the deck and needs no key.',
      title: 'Subtitle keywords coloured as the series',
      kind: 'chart-spec',
      severity: 'low',
      probe: 'in-text-legend',
      rule: '`subTitle.keywordsHighlight`: words in the subtitle take their series colour, so the deck doubles as the key.',
      current: 'Titles are plain strings: the chart spec cannot mark a word as naming a series, and the theme cannot colour it.',
      expected: '“Norway”, “China” and “Germany” in the subtitle in their text inks, standing in for the key.',
      proposal: '`chart_spec.subtitle` accepting `{ text, series }` spans, coloured from the series’ text ink.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: ev3,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Electric cars took off',
        subtitle: 'Norway is far ahead; China and Germany are catching up',
      }),
      expectedSpec: keywordExpected(),
      expectedFrame: { headerHtml: keywordHeader },
    },
    {
      id: 'focus-hover-state',
      observed: 'Flint shows the static chart — there is no state to show. Expected: November outlined 2px in #222 with its value in bold, every other bar at 35%, the data-table button below.',
      title: 'Hover and keyboard focus outline the bar and dim the rest',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'focus-hover-state',
      rule: 'Hover/click add a 2px stroke (3px on symbols); `hoverOpacity` dims the other marks; an accessibility controller gives full keyboard navigation with a visible focus indicator; a data-table button sits under every chart.',
      current: 'ThemeSpec has no hover, focus or selected states for marks — only the selection-boundary paint — and no slot for the data-table affordance.',
      expected: 'November focused: a 2px dark outline and its value in bold, every other bar at 35% opacity.',
      proposal: '`interaction.states: { hover: { strokeWidth, otherOpacity }, focus: { ring, offset } }` and `furniture: { kind: "dataTableToggle", anchor: "bottomLeft" }`.',
      flint: monthsFlint(SIG_TITLE, SIG_SUBTITLE),
      expectedSpec: focusExpected(),
      expectedFrame: { headerHtml: defs(hatch('visa-hatch-focus', BLUE, '#ffffff', 0.35)), footerHtml: dataTableButton },
    },
    {
      id: 'tooltip-style',
      observed: 'Left: Flint’s static line (its tick labels shrunk to about 8px). Right: the 1px #565656, 3px-radius box pinned beside the hovered 2020 dot.',
      title: 'Tooltip: white box, 1px #565656 border, 3px corners',
      kind: 'product-ui',
      severity: 'low',
      probe: 'tooltip-style',
      rule: 'Absolutely positioned white box, `1px solid #565656` border, 3px radius, 0.5rem padding, 14px/400 #222222 text, 80–300px wide.',
      current: '`interaction` carries a tooltip number format only; the box is the renderer’s default.',
      expected: 'The 2020 point hovered (3px outline) with Visa’s box pinned beside it.',
      proposal: '`interaction.tooltip: { surface, border, radius, padding, text }`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Unemployment rate',
      }),
      expectedSpec: tooltipExpected(),
      expectedFrame: { style: { position: 'relative' }, footerHtml: tooltipHtml },
    },
    {
      id: 'headline-light',
      addressed: { stage: 'T2', note: 'The headline is `weight: "light"` (300).' },
      title: 'Headline in a light weight',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'type-weight-scale',
      rule: 'The title renders large and light (300) in Visa blue, the subtitle smaller and regular.',
      current: '`TypeRole.weight` starts at `regular`; the lightest headline it can ask for is 400.',
      expected: 'A 300-weight headline.',
      proposal: 'Accept numeric weights (100–900), or add `light` to `TypeRole.weight`.',
    },
  ],
};

export default visa;
