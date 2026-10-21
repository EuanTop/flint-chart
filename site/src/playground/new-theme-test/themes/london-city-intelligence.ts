import type { ThemeSpec } from 'flint-chart';

type TypeRole = NonNullable<NonNullable<ThemeSpec['type']>['headline']>;
import research from '../research/london-city-intelligence.json';
import { EV_SHARE, flintInput, POPULATION, PROJECTION, UNEMPLOYMENT, valueLabelProbe, withChartSource } from '../probes';
import { houseConfig, W, H as HEIGHT, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

/** The guide never names its face; its specimens are set in a neutral grotesque. */
const FONT = "'Helvetica Neue', Arimo, Arial, sans-serif";
const HEAD = '#353d42';
const BODY = '#666666';
const GRID = '#d8d8d8';
const BLUE = '#6da7de';
const CONTEXT = '#cccccc';
const CATEGORICAL = ['#6da7de', '#9e0059', '#dee000', '#d82222', '#5ea15d', '#943fa6', '#63c5b5', '#ff38ba', '#eb861e', '#ee266d'];

const t: HouseTokens = {
  font: FONT,
  text: HEAD,
  muted: BODY,
  grid: GRID,
  axis: BODY,
  background: '#ffffff',
  palette: CATEGORICAL,
  highlight: BLUE,
  context: CONTEXT,
  titleSize: 18,
  titleWeight: 700,
  subtitleSize: 14,
  subtitleColor: HEAD,
  labelSize: 12,
  sourceSize: 12,
  lineWidth: 4,
  legendOrient: 'top-left',
};

/** Type roles for one surface: headline and labelled data in `head`, everything else in `body`. */
function typeRoles(head: string, body: string): Record<string, TypeRole> {
  return {
    headline: { family: FONT, size: 18, weight: 'bold', case: 'asIs', color: head },
    deck: { family: FONT, size: 14, weight: 'regular', color: head },
    axisLabel: { family: FONT, size: 12, color: body },
    axisTitle: { family: FONT, size: 12, weight: 'regular', color: body },
    keyLabel: { family: FONT, size: 12, color: body },
    valueLabel: { family: FONT, size: 12, color: head },
    annotation: { family: FONT, size: 12, color: head },
    footnote: { family: FONT, size: 12, color: body },
  };
}

const theme: ThemeSpec = {
  id: 'london-city-intelligence',
  label: 'GLA City Intelligence',
  ink: {
    surface: { source: 'house', canvas: '#ffffff' },
    text: { primary: HEAD, secondary: BODY, muted: BODY },
    structure: { axis: BODY, grid: GRID, zero: BODY },
    series: {
      single: BLUE,
      categorical: CATEGORICAL.slice(0, 5),
      categoricalExtended: CATEGORICAL,
      overflow: CONTEXT,
      sequential: { stops: ['#dbe5f1', '#6da7de', '#252c35'], space: 'lab' },
      diverging: { stops: ['#8e2724', '#af2828', '#eeeeee', '#3681bf', '#2e5174'], neutral: '#eeeeee', space: 'lab' },
    },
    accent: BLUE,
  },
  type: { ...typeRoles(HEAD, BODY), minSize: 10 },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 2, ticks: 'omit', tickLabels: 'sparse' },
      measure: { line: 'omit', ticks: 'omit', tickDensity: 'sparse' },
    },
    grid: { measure: 'full', category: 'omit', style: 'solid', weight: 1, zero: 'full' },
    frame: 'omit',
    baseline: 'full',
  },
  marks: { strokeWeight: 4, strokeCap: 'round', bandFraction: 0.8 },
  geometry: {
    line: { width: 4, cap: 'round', join: 'round' },
    point: { presence: 'omit', fill: 'hollow', size: 60, outlineWidth: 2 },
    band: { fraction: 0.8, cornerRadius: 0 },
    arc: { gap: 2, gapStyle: 'rule' },
  },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['seriesEnd', 'top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'whenTheyFit', placement: 'atMark', inkMode: 'contrastWithMark' },
  annotation: {
    axisTitles: 'omit',
    unit: 'everyTick',
    numberFormat: { thousands: 'suffix', precision: 'auto' },
    pointEmphasis: 'endpoints',
    pointLabels: 'never',
  },
  layout: { density: 'airy', titleBlock: { anchor: 'start', gap: 'normal' } },
  variants: [
    {
      when: { seriesCount: { gte: 2 } },
      then: { geometry: { line: { width: 2 } } },
      because: '4pt is the highlight line; context lines, and charts of several equal series, step down to 2pt.',
    },
  ],
  // The source line, as the guide sets it (S1); the chart gives the words.
  source: { credit: { text: 'CITY INTELLIGENCE', placement: 'end', weight: 'bold' } },
};

/** The inverse theme the guide prints beside every light specimen. */
const darkTheme: ThemeSpec = {
  ...theme,
  id: 'london-city-intelligence-dark',
  label: 'GLA City Intelligence (dark)',
  ink: {
    ...theme.ink,
    surface: { source: 'house', canvas: '#353d42' },
    text: { primary: '#ffffff', secondary: '#ffffff', muted: '#ffffff' },
    structure: { axis: '#ffffff', grid: '#4e5254', zero: '#ffffff' },
    series: { ...theme.ink!.series, overflow: '#ffffff', diverging: { stops: ['#8e2724', '#af2828', '#333333', '#3681bf', '#2e5174'], neutral: '#333333', space: 'lab' } },
  },
  type: { ...typeRoles('#ffffff', '#ffffff'), minSize: 10 },
};

// ---------------------------------------------------------------------------
// London's population, 1801–2050 (census years; GLA projections after 2018).

const OBSERVED: [number, number][] = [
  [1801, 1.1], [1811, 1.4], [1821, 1.6], [1831, 1.9], [1841, 2.2], [1851, 2.7], [1861, 3.2], [1871, 3.9], [1881, 4.7],
  [1891, 5.6], [1901, 6.5], [1911, 7.2], [1921, 7.4], [1931, 8.1], [1939, 8.6], [1951, 8.2], [1961, 8.0], [1971, 7.5],
  [1981, 6.6], [1991, 6.8], [2001, 7.3], [2011, 8.2], [2018, 8.9],
];
const PROJECTED: [number, number][] = [[2018, 8.9], [2031, 10.0], [2041, 10.5], [2050, 10.9]];
const LONDON = [
  ...OBSERVED.map(([Year, v]) => ({ Year, Series: 'Observed', 'Population (m)': v })),
  ...PROJECTED.map(([Year, v]) => ({ Year, Series: 'Projected', 'Population (m)': v })),
];
const KEY_POINTS = [
  { Year: 1801, v: 1.1, label: '', align: 'left' },
  { Year: 1939, v: 8.6, label: 'Previous peak\n1939: 8.6m', align: 'right' },
  { Year: 2018, v: 8.9, label: 'New peak\n2018: 8.9m', align: 'right' },
  { Year: 2041, v: 10.5, label: '2041: 10.5m', align: 'right' },
  { Year: 2050, v: 10.9, label: '', align: 'right' },
];
const SIG_TITLE = 'London’s population is bigger than ever and still growing';
const SIG_DECK = 'With approximately 8.9m residents, London is set to grow to approximately 10.5m inhabitants by 2041';

interface Surface { bg: string; head: string; body: string; grid: string; base: string; context: string; band: string }
const LIGHT: Surface = { bg: '#ffffff', head: HEAD, body: BODY, grid: GRID, base: BODY, context: CONTEXT, band: 'rgba(0,0,0,0.04)' };
const DARK: Surface = { bg: '#353d42', head: '#ffffff', body: '#ffffff', grid: '#4e5254', base: '#ffffff', context: '#ffffff', band: 'rgba(255,255,255,0.06)' };

/** Y labels left-aligned on top of their gridlines, inside a gutter the gridlines run through. */
const onGridline = (s: Surface, extra: Record<string, unknown> = {}) => ({
  orient: 'left', domain: false, ticks: false, grid: true, gridColor: s.grid, gridWidth: 1,
  labelAlign: 'left', labelBaseline: 'bottom', labelPadding: -2, labelOffset: -2, labelColor: s.body, labelFontSize: 12, labelOverlap: false,
  ...extra,
});

const configFor = (s: Surface) => ({
  ...houseConfig({ ...t, text: s.head, muted: s.body, grid: s.grid, background: s.bg }),
  title: { ...(houseConfig(t).title as object), color: s.head, subtitleColor: s.head, subtitleFontSize: 14, fontSize: 18 },
});

/** The population specimen (guide p29), on either surface. */
function londonExpected(s: Surface) {
  const x = (field = 'Year') => ({ field, type: 'quantitative', title: null, scale: { domain: [1765, 2054], nice: false } });
  const yAxis = onGridline(s, { values: [0, 2, 4, 6, 8, 10, 12], labelExpr: "datum.value === 0 ? '0' : datum.value + 'm'" });
  const y = (field = 'Population (m)') => ({ field, type: 'quantitative', title: null, scale: { domain: [0, 12] }, axis: yAxis });
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: configFor(s),
    title: { text: SIG_TITLE, subtitle: ['With approximately 8.9m residents, London is set to grow', 'to approximately 10.5m inhabitants by 2041'] },
    width: W + 30,
    height: HEIGHT + 30,
    layer: [
      {
        data: { values: [{ from: 2018, to: 2054 }] },
        mark: { type: 'rect', color: s.band },
        encoding: { x: x('from'), x2: { field: 'to' } },
      },
      {
        data: { values: [{ v: 0 }] },
        mark: { type: 'rule', color: s.base, strokeWidth: 2 },
        encoding: { y: y('v') },
      },
      {
        data: { values: KEY_POINTS.slice(0, 4) },
        mark: { type: 'rule', color: s.body, strokeWidth: 1, strokeDash: [1, 2.5] },
        encoding: { x: { ...x('Year'), axis: { values: [1801, 1939, 2018, 2041], domain: false, ticks: false, labelColor: s.body, labelFontSize: 12, grid: false, labelPadding: 6, format: 'd' } }, y: y('v'), y2: { datum: 0 } },
      },
      {
        data: { values: LONDON.filter((row) => row.Series === 'Observed') },
        mark: { type: 'line', strokeWidth: 3.5, color: BLUE, strokeCap: 'round', strokeJoin: 'round' },
        encoding: { x: x(), y: y() },
      },
      {
        data: { values: LONDON.filter((row) => row.Series === 'Projected') },
        mark: { type: 'line', strokeWidth: 3.5, color: BLUE, strokeCap: 'round', strokeDash: [0.1, 7] },
        encoding: { x: x(), y: y() },
      },
      {
        data: { values: KEY_POINTS },
        mark: { type: 'point', filled: true, fill: s.bg, stroke: s.bg === '#ffffff' ? BLUE : '#ffffff', strokeWidth: 2.2, size: 55, opacity: 1 },
        encoding: { x: x(), y: y('v') },
      },
      {
        data: { values: KEY_POINTS.filter((p) => p.label && p.Year !== 2041) },
        mark: { type: 'text', align: 'right', baseline: 'bottom', dx: -5, dy: -6, fontSize: 11, lineBreak: '\n', color: s.head, lineHeight: 13 },
        encoding: { x: x(), y: y('v'), text: { field: 'label' } },
      },
      {
        data: { values: KEY_POINTS.filter((p) => p.Year === 2041) },
        mark: { type: 'text', align: 'right', baseline: 'top', dx: -6, dy: 6, fontSize: 11, color: s.head },
        encoding: { x: x(), y: y('v'), text: { field: 'label' } },
      },
      {
        data: { values: [{ Year: 2019, v: 12 }] },
        mark: { type: 'text', align: 'left', baseline: 'top', dx: 2, dy: 3, fontSize: 11, color: s.body, text: 'Projected' },
        encoding: { x: x(), y: y('v') },
      },
    ],
  };
}

const wordmark = (color: string) => `<span style="font-family:${FONT};font-size:13px;letter-spacing:0.2px;color:${color}"><b>CITY</b> INTELLIGENCE</span>`;
const sourceFooter = (s: Surface, source: string) =>
  `<div style="display:flex;justify-content:space-between;align-items:flex-end;margin:2px 14px 8px;font-family:${FONT};font-size:12px;color:${s.body}">`
  + `<div>Source: ${source}</div>${wordmark(s.head)}</div>`;

const londonFlint = (th: ThemeSpec) => flintInput(th, {
  chartType: 'Line Chart',
  data: LONDON,
  semantic_types: { Year: 'Year', Series: 'Category', 'Population (m)': { semanticType: 'Quantity', unit: 'm' } },
  encodings: { x: 'Year', y: 'Population (m)', strokeDash: 'Series' },
  title: SIG_TITLE,
  subtitle: SIG_DECK,
  baseSize: { width: 400, height: 260 },
});

// ---------------------------------------------------------------------------
// Smaller specimens for single rules.

const unemploymentFlint = (title: string) => flintInput(theme, {
  chartType: 'Line Chart',
  data: UNEMPLOYMENT,
  semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
  encodings: { x: 'Year', y: 'Unemployment (%)' },
  title,
  subtitle: 'US unemployment rate, 2000–2023',
});

function unemploymentExpected(title: string, o: { zero: boolean }) {
  const x = { field: 'Year', type: 'quantitative', title: null, scale: { domain: [1997, 2023], nice: false } };
  const yDomain = o.zero ? [0, 10] : [3, 10];
  const values = o.zero ? [0, 2, 4, 6, 8, 10] : [3, 4, 5, 6, 7, 8, 9, 10];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: configFor(LIGHT),
    title: { text: title, subtitle: 'US unemployment rate, 2000–2023' },
    width: W,
    height: HEIGHT,
    layer: [
      {
        data: { values: UNEMPLOYMENT },
        mark: { type: 'line', strokeWidth: 3.5, color: BLUE, strokeCap: 'round', strokeJoin: 'round' },
        encoding: {
          x: { ...x, axis: { values: [2000, 2009, 2020], format: 'd', domain: false, ticks: false, grid: false, labelColor: BODY } },
          y: { field: 'Unemployment (%)', type: 'quantitative', title: null, scale: { domain: yDomain, nice: false }, axis: onGridline(LIGHT, { values: o.zero ? values : [4, 6, 8, 10], labelExpr: "datum.label + '%'" }) },
        },
      },
      ...(o.zero ? [{
        data: { values: [{ v: 0 }] },
        mark: { type: 'rule', color: BODY, strokeWidth: 2 },
        encoding: { y: { field: 'v', type: 'quantitative', scale: { domain: yDomain, nice: false } } },
      }] : []),
      {
        data: { values: [UNEMPLOYMENT[0], UNEMPLOYMENT[UNEMPLOYMENT.length - 1]] },
        mark: { type: 'point', filled: true, fill: '#ffffff', stroke: BLUE, strokeWidth: 2.2, size: 50, opacity: 1 },
        encoding: { x, y: { field: 'Unemployment (%)', type: 'quantitative', scale: { domain: yDomain, nice: false } } },
      },
    ],
  };
}

const EV_NAMES = ['Norway', 'China', 'Germany', 'United States'];

function highlightExpected() {
  const x = { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2016.4, 2023], nice: false } };
  const y = { field: 'EV share (%)', type: 'quantitative', title: null, scale: { domain: [0, 100] } };
  const last = EV_SHARE.filter((row) => row.Year === 2023);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: configFor(LIGHT),
    title: { text: 'China’s electric-car sales took off after 2020', subtitle: 'Share of new cars sold that are electric' },
    width: W - 40,
    height: HEIGHT,
    layer: [
      {
        data: { values: EV_SHARE.filter((row) => row.Country !== 'China') },
        mark: { type: 'line', strokeWidth: 2, color: CONTEXT },
        encoding: {
          x: { ...x, axis: { values: [2018, 2020, 2022, 2023], format: 'd', domain: false, ticks: false, grid: false, labelColor: BODY } },
          y: { ...y, axis: onGridline(LIGHT, { values: [0, 25, 50, 75, 100], labelExpr: "datum.label + '%'" }) },
          detail: { field: 'Country' },
        },
      },
      {
        data: { values: [{ v: 0 }] },
        mark: { type: 'rule', color: BODY, strokeWidth: 2 },
        encoding: { y: { ...y, field: 'v' } },
      },
      {
        data: { values: EV_SHARE.filter((row) => row.Country === 'China') },
        mark: { type: 'line', strokeWidth: 3.5, color: BLUE, strokeCap: 'round' },
        encoding: { x, y },
      },
      {
        data: { values: last },
        mark: { type: 'text', align: 'left', dx: 6, fontSize: 11 },
        encoding: {
          x, y, text: { field: 'Country' },
          color: { condition: { test: "datum.Country === 'China'", value: BLUE }, value: BODY },
          fontWeight: { condition: { test: "datum.Country === 'China'", value: 'bold' }, value: 'normal' },
        },
      },
    ],
  };
}

function forecastExpected() {
  const x = (field = 'Year') => ({ field, type: 'quantitative', title: null, scale: { domain: [2012, 2030], nice: false } });
  const y = (field = 'Capacity (GW)') => ({ field, type: 'quantitative', title: null, scale: { domain: [0, 6000] } });
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: configFor(LIGHT),
    title: { text: 'Renewable capacity is set to more than double by 2030', subtitle: 'Global renewable capacity, gigawatts' },
    width: W,
    height: HEIGHT,
    layer: [
      { data: { values: [{ from: 2023, to: 2030 }] }, mark: { type: 'rect', color: 'rgba(0,0,0,0.04)' }, encoding: { x: x('from'), x2: { field: 'to' } } },
      { data: { values: [{ Year: 2023, v: 6000 }] }, mark: { type: 'text', align: 'left', baseline: 'top', dx: 4, dy: 3, fontSize: 11, color: BODY, text: 'Projected' }, encoding: { x: x('Year'), y: y('v') } },
      { data: { values: [{ v: 0 }] }, mark: { type: 'rule', color: BODY, strokeWidth: 2 }, encoding: { y: y('v') } },
      {
        data: { values: PROJECTION.filter((row) => row.Series === 'Observed') },
        mark: { type: 'line', strokeWidth: 3.5, color: BLUE, strokeCap: 'round' },
        encoding: {
          x: { ...x(), axis: { values: [2015, 2023, 2030], format: 'd', domain: false, ticks: false, grid: false, labelColor: BODY } },
          y: { ...y(), axis: onGridline(LIGHT, { values: [0, 2000, 4000, 6000], labelExpr: "datum.value === 0 ? '0' : format(datum.value, ',') + (datum.value === 6000 ? ' GW' : '')" }) },
        },
      },
      {
        data: { values: PROJECTION.filter((row) => row.Series === 'Projected') },
        mark: { type: 'line', strokeWidth: 3.5, color: BLUE, strokeCap: 'round', strokeDash: [0.1, 7] },
        encoding: { x: x(), y: y() },
      },
      {
        data: { values: [PROJECTION[0], PROJECTION[PROJECTION.length - 1]] },
        mark: { type: 'point', filled: true, fill: '#ffffff', stroke: BLUE, strokeWidth: 2.2, size: 50, opacity: 1 },
        encoding: { x: x(), y: y() },
      },
    ],
  };
}

function barsExpected() {
  const rows = POPULATION.slice(0, 6);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: configFor(LIGHT),
    title: { text: 'India and China hold over a third of humanity', subtitle: 'Population, 2023' },
    width: W - 60,
    height: HEIGHT - 20,
    data: { values: rows },
    encoding: {
      y: { field: 'Country', type: 'nominal', sort: null, title: null, axis: { domain: true, domainColor: BODY, domainWidth: 1, ticks: false, labelColor: BODY, labelFontSize: 12, labelAlign: 'left', labelPadding: 110 } },
      x: { field: 'Population', type: 'quantitative', title: null, scale: { domain: [0, 1500] }, axis: { orient: 'top', values: [0, 500, 1000, 1500], labelExpr: "datum.value === 1500 ? '1,500 (m)' : format(datum.value, ',')", grid: true, gridColor: GRID, domain: false, ticks: false, labelColor: BODY, labelFlush: false } },
    },
    layer: [
      { mark: { type: 'bar', color: BLUE, height: { band: 0.8 } } },
      { mark: { type: 'text', align: 'right', dx: -5, fontSize: 12, color: '#ffffff' }, encoding: { text: { field: 'Population', type: 'quantitative', format: ',.0f' } } },
    ],
  };
}

const MIX_SOURCES = ['Coal', 'Gas', 'Hydro', 'Nuclear', 'Wind & solar', 'Other'];
const MIX = ([
  [1990, [4430, 1780, 2160, 2000, 10, 1580]],
  [2000, [5990, 2760, 2620, 2590, 80, 1310]],
  [2010, [8670, 4760, 3440, 2760, 380, 1520]],
  [2020, [9420, 6270, 4360, 2700, 2720, 1610]],
] as [number, number[]][]).flatMap(([Year, vals]) => MIX_SOURCES.map((Source, i) => ({ Year, Source, 'Generation (TWh)': vals[i] })));

/** The share area with its names at the right edge in the headline ink. */
function mixExpected() {
  const last = MIX.filter((row) => row.Year === 2020);
  const total = last.reduce((sum, row) => sum + row['Generation (TWh)'], 0);
  let below = 0;
  const labels = last.map((row) => {
    const share = row['Generation (TWh)'] / total;
    const mid = 1 - (below + share / 2);
    below += share;
    return { Source: row.Source, mid };
  });
  const order = { field: 'rank', type: 'quantitative', sort: 'descending' };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...configFor(LIGHT), legend: { disable: true } },
    title: { text: 'Wind and solar appeared from nothing after 2010', subtitle: 'World electricity generation by source, share' },
    width: W - 50,
    height: HEIGHT,
    layer: [
      {
        data: { values: MIX },
        transform: [{ calculate: `indexof(${JSON.stringify(MIX_SOURCES)}, datum.Source)`, as: 'rank' }],
        mark: { type: 'area', stroke: '#ffffff', strokeWidth: 0.8 },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [1984, 2020], nice: false }, axis: { values: [1990, 2000, 2010, 2020], format: 'd', domain: false, ticks: false, grid: false, labelColor: BODY } },
          y: { field: 'Generation (TWh)', type: 'quantitative', stack: 'normalize', title: null, axis: onGridline(LIGHT, { values: [0, 0.25, 0.5, 0.75, 1], format: '.0%', gridColor: GRID }) },
          color: { field: 'Source', type: 'nominal', scale: { domain: MIX_SOURCES, range: CATEGORICAL.slice(0, 6) } },
          order,
        },
      },
      {
        data: { values: labels },
        mark: { type: 'text', align: 'left', dx: 6, fontSize: 11, color: HEAD },
        encoding: { x: { datum: 2020, type: 'quantitative' }, y: { field: 'mid', type: 'quantitative' }, text: { field: 'Source' } },
      },
    ],
  };
}

const london: StyleGuideTheme = {
  id: 'london-city-intelligence',
  org: 'Greater London Authority – City Intelligence',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the 2019 *City Intelligence Data Design* guide and the `gglaplot` R theme that implements it. The guide gives sizes in pt and its specimen charts are about 410pt wide, so pt is applied as px on Flint’s ~400px canvas, which keeps the guide’s proportions: an 18px bold `#353d42` headline, a 14px deck, all other chart text 12px `#666666`.',
    'Stated directly: the ten-colour categorical order (core five, then the rest as the extended set), blue sequential and red–blue diverging ramps; horizontal `#d8d8d8` gridlines only, about five of them (`tickDensity: sparse`); no y axis line or ticks; a 2px `#666666` baseline and zero rule; a 4px highlight line stepping down to 2px when several series share the chart (a `seriesCount` variant); hollow end markers (`pointEmphasis: endpoints`, `fill: hollow`); keys at the series ends or top-left without a title; units carried on every tick (“12m”, “60%”) instead of axis titles. The typeface is not named in the guide; the theme uses Helvetica Neue with Arimo as the open fallback.',
    'Not stated: the house’s most recognisable habit — y labels left-aligned *on top of* their gridlines — has no field; nor do the source line and the CITY INTELLIGENCE wordmark, the single thematic colour against grey context, the projected-period band, the key-point labels with dotted drop lines, or the inverse dark theme as a mode of the same house. See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'high',
      probe: 'signature',
      rule: '“Say what you see” headline in 18pt bold `#353d42`, a 14pt deck; y labels (0, 2m … 12m) left-aligned above light gridlines; a strong 2pt baseline at zero; one 4pt blue line turning dotted for the projection, the projected years shaded; hollow circles on key points with two-line labels and dotted drop lines; only the key dates on the x axis; “Source:” bottom-left and the CITY INTELLIGENCE wordmark bottom-right.',
      current: 'Flint draws the headline and deck, the blue line with a dashed projection, light gridlines and the strong baseline. It adds a titled “Series” key (Observed / Projected) at the right, prints “12 m” with a space on every tick beside (not on) the gridlines, labels evenly spaced years, and has no key-point labels, band, source or wordmark.',
      expected: 'The guide’s population specimen (p29), on the light surface.',
      flint: londonFlint(theme),
      expectedSpec: londonExpected(LIGHT),
      expectedFrame: { footerHtml: sourceFooter(LIGHT, 'London Measured Report (Sep 2018)') },
      observed: 'Flint (left) is close in colour and weight, but the “Series / Observed / Projected” key with a title takes the right side, the headline wraps to two lines at 400px, y labels read “12 m … 0 m” beside the gridlines, and the deck ends “; Population (m)”. Expected (right) has labels sitting on the gridlines, hollow key points with “Previous peak / 1939: 8.6m” labels and dotted drops, a shaded “Projected” band, key dates only on x, and the source and CITY INTELLIGENCE wordmark.',
    },
    {
      id: 'labels-on-gridlines',
      title: 'Y labels sit left-aligned on top of their gridlines',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'axis-label-on-gridline',
      rule: '`axis.text.y hjust = 0, vjust = -0.5` with `axis.ticks.length.y = y_label_length`: each y label starts at the chart’s left edge and sits just above its gridline, which runs on under it; no y axis line, no ticks.',
      current: 'ThemeSpec can drop the y line and ticks but has no word for where a label stands relative to its gridline; Flint right-aligns labels beside the plot, vertically centred on each line, and the gridlines stop at the plot edge.',
      expected: 'Labels flush left above each gridline, the gridlines running the full width beneath them.',
      proposal: '`structure.axis.measure.labelPosition: "besideTick" | "aboveGridline"` with `labelAlign: "blockEdge"`; realised as `labelAlign: left`, `labelBaseline: bottom`, a negative `labelPadding` and a left gutter in the x range.',
      flint: unemploymentFlint('Unemployment spiked twice in two decades'),
      expectedSpec: unemploymentExpected('Unemployment spiked twice in two decades', { zero: true }),
      observed: 'Flint’s labels (“10% … 2%”) are 9px, right-aligned against the plot and centred on each line; the deck gains “; Unemployment (%)”. Expected: 12px labels flush left, each sitting on its gridline, the lines running under them, hollow end points, and only key years on x.',
    },
    {
      id: 'source-wordmark',
      addressed: { stage: 'S1', note: '“Source: …” bottom-left, CITY INTELLIGENCE at the right in bold (`credit.placement: "end"`).' },
      title: '“Source:” bottom-left, CITY INTELLIGENCE bottom-right',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: 'Every chart closes with “Source: London Measured Report (Sep 2018)” in 12pt `#666666` at the bottom left; presentation charts add the CITY INTELLIGENCE wordmark (CITY in bold) at the bottom right.',
      current: 'No chart-spec slot for a source and no furniture kind for a wordmark.',
      expected: 'The source line and the wordmark on one row under the chart.',
      proposal: '`chart_spec.source`; `furniture: [{ kind: "wordmark", text: "CITY INTELLIGENCE", boldPrefix: "CITY", anchor: "bottomRight" }]` (or an SVG).',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION.slice(0, 6),
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: 'Country', x: 'Population' },
        title: 'India and China hold over a third of humanity',
        subtitle: 'Population, 2023',
      }),
      expectedSpec: barsExpected(),
      expectedFrame: { footerHtml: sourceFooter(LIGHT, 'UN World Population Prospects (2022)') },
      observed: 'Flint draws the labelled bars well, but closes with an axis instead of a source line, and the deck gains “; Population (m)”. Expected: “Source: UN World Population Prospects (2022)” bottom-left and CITY INTELLIGENCE bottom-right.',
    },
    {
      id: 'highlight',
      title: 'One thematic colour against grey context',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'highlight',
      rule: '“Try and use a single colour to highlight your data, and grey/white for contextual / comparison data”: the subject at 4pt in blue, every other series 2pt `#cccccc`, each named at its end.',
      current: 'The chart spec cannot say which series is the subject, so Flint gives each country its own categorical colour at the multi-series weight.',
      expected: 'China in a heavy blue line, the other three thin grey lines, names at the line ends with China’s in blue.',
      proposal: '`chart_spec.emphasis: { field: "Country", values: ["China"] }`, with `ink.series.context` and `geometry.line.contextWidth` in the theme.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'China’s electric-car sales took off after 2020',
        subtitle: 'Share of new cars sold that are electric',
      }),
      expectedSpec: highlightExpected(),
      observed: 'Flint gives each country its own categorical colour — Norway blue, China dark pink, Germany yellow (hard to read on white), United States red — with names at the line ends. Expected: China alone in a heavy blue line and blue label, the rest thin grey.',
    },
    {
      id: 'baseline-only-at-zero',
      title: 'No strong baseline when the axis does not start at zero',
      kind: 'realization',
      severity: 'medium',
      probe: 'zero-line',
      rule: '“We have NOT started the Y-axis at zero. To highlight this, we have removed the strong baseline.”',
      current: 'The theme states a 2px `#666666` categorical axis line and `grid.zero: full`. Flint fits the percentage line to 2–10% and still draws the strong 2px line along the bottom of the plot, at 2%, where a reader takes it for zero.',
      expected: 'Light gridlines only; nothing that reads as zero at 3%.',
      proposal: 'Treat the strong base rule as the zero rule: draw it only where zero is in the domain, and fall back to an ordinary gridline otherwise (`structure.baseline: "atZeroOnly"`).',
      flint: unemploymentFlint('Unemployment has not been this low since the 1960s'),
      expectedSpec: unemploymentExpected('Unemployment has not been this low since the 1960s', { zero: false }),
      observed: 'Confirmed: Flint’s axis runs 2–10% and the heavy 2px grey baseline sits at 2%. Expected: no strong line; the lowest gridline is as light as the rest.',
    },
    {
      id: 'projected-band',
      title: 'Projections: dotted line plus a shaded, labelled period',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'forecast-style',
      rule: '“Projections differentiated through line style and a highlighted future date range”: the same colour dotted, the projected years shaded at 4% black and labelled “Projected” at the top left of the band.',
      current: 'Flint treats the projection as a second series told apart by dash, with a titled “Series” key at the right (although `legend.title: "omit"`); there is no band and no label, and the theme has no notion of a forecast period.',
      expected: 'One blue line turning dotted at 2023, the 2023–30 range shaded and labelled.',
      proposal: '`annotation.forecast: { style: "dash" | "band" | "both", bandInk, label: "Projected" }`, triggered by a status semantic on the series field.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: PROJECTION,
        semantic_types: { Year: 'Year', Series: 'Category', 'Capacity (GW)': 'Quantity' },
        encodings: { x: 'Year', y: 'Capacity (GW)', strokeDash: 'Series' },
        title: 'Renewable capacity is set to more than double by 2030',
        subtitle: 'Global renewable capacity, gigawatts',
      }),
      expectedSpec: forecastExpected(),
      observed: 'Flint: one blue line, dashed after 2023, with a titled “Series” key at the right and no band. Expected: the line turns dotted at 2023 under a pale band labelled “Projected”, end points hollow, unit on the top tick only (“6,000 GW”).',
    },
    {
      id: 'dark-theme',
      title: 'The inverse theme is the same house, not a second one',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'dark-mode',
      rule: 'Every spec page shows a light and a dark version side by side: `#353d42` (or `#121516` in apps) background, white headline and text, `#4e5254` grid, a white baseline, white context data, the projection band at 4% white.',
      current: 'ThemeSpec has one set of inks. The dark version has to be written as a second theme (here, a copy with every ink swapped), and nothing ties the two together or lets a host switch between them.',
      expected: 'The guide’s dark specimen (p29).',
      proposal: '`ink.modes: { dark: { surface, text, structure, series.context } }` with the host choosing the mode; context ink flips from grey to white, not to a lighter grey.',
      flint: londonFlint(darkTheme),
      expectedSpec: londonExpected(DARK),
      expectedFrame: { style: { background: '#353d42' }, footerHtml: sourceFooter(DARK, 'London Measured Report (Sep 2018)') },
      observed: 'The hand-swapped dark theme works in Flint: white text, dark-grey gridlines and a white baseline on `#353d42`. The differences are the same as on the light surface (titled key, labels beside gridlines, no band or key points). The point is the authoring cost: a second full ink block to say “the same house, inverse”.',
    },
    {
      id: 'bar-labels',
      title: 'Bar values drop the thousands separator the axis uses',
      kind: 'realization',
      severity: 'medium',
      probe: 'number-format',
      rule: '“Label bars with value directly if possible”; numbers carry comma thousands (“£1,000”) and short units (“2m”, “8.9m”), the same way wherever they appear. On horizontal bars the scale (“0 20 40 60 80 (Years)”) runs along the top and names sit flush left.',
      current: '`dataLabels: whenTheyFit, atMark, contrastWithMark` works: white values inside the bar ends, dark ones outside where a bar is too short. But the labels print “1429” while the axis prints “1,000 m”: the value-label format ignores `numberFormat.thousands`, and the axis repeats the unit, with a space, on every tick.',
      expected: '“1,429” inside the bar, the scale on top with its unit once (“1,500 (m)”), names flush left.',
      proposal: 'Derive the value-label format from the same `annotation.numberFormat` as the axis; add `annotation.unitSpacing: "none" | "space"`; and let `structure.axis.measure.placement` be keyed by orientation so horizontal bars can take the top.',
      ...valueLabelProbe(theme, t, { placement: 'inside', color: '#ffffff' }),
      expectedSpec: barsExpected(),
      observed: 'Flint prints white “1429” and “1426” inside the long bars and grey “173” outside the short one — no thousands separator — while its axis reads “0 m, 500 m, 1,000 m, 1,500 m” along the bottom. Expected: “1,429” inside, the scale on top with the unit once (“1,500 (m)”), names flush left.',
    },
    {
      id: 'label-contrast',
      title: 'Series-end labels in yellow are unreadable on white',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'legend-placement',
      rule: 'Direct labels are set in `#353d42` (the “12pt #353D42” of the spec page), and the accessibility notes warn against yellow on white; the series colour stays on the mark.',
      current: 'With `legend.placement: ["seriesEnd", …]` Flint writes each name in its series colour, so the third categorical ink, yellow `#dee000`, prints “Hydro” at about 1.3:1 against white. ThemeSpec has no field for the ink of an end label separately from the series ink.',
      expected: 'End labels in the headline ink, each beside its band.',
      proposal: '`legend.seriesEndInk: "series" | "text" | "seriesIfContrast"` — the last darkens or swaps to text ink when the series colour misses 3:1.',
      flint: flintInput(theme, {
        chartType: 'Area Chart',
        data: MIX,
        semantic_types: { Year: 'Year', Source: 'Category', 'Generation (TWh)': 'Quantity' },
        encodings: { x: 'Year', y: 'Generation (TWh)', color: 'Source' },
        chartProperties: { stackMode: 'normalize' },
        title: 'Wind and solar appeared from nothing after 2010',
        subtitle: 'World electricity generation by source, share',
      }),
      expectedSpec: mixExpected(),
      observed: 'Flint writes “Hydro” in yellow `#dee000` beside the yellow band — barely legible — and every other name in its band colour. Expected: all names in `#353d42`. The same yellow-on-white labels appear in the gallery’s EV-share line tile (“Germany”).',
    },
    {
      id: 'key-points',
      title: 'Hollow markers and two-line labels on key points only',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'annotation',
      rule: '“Only use dots & marks on important data points • First & last values • Interesting events”: hollow circles, a two-line label (12pt name, 10pt “date: value”), a 1pt dotted drop line to a key date that is the only label on the x axis.',
      current: '`pointEmphasis: endpoints` covers first and last; there is no way to name an interesting event (“Previous peak, 1939”), no drop line, and no way to put only the key dates on the axis.',
      expected: 'See the signature panel: 1939, 2018 and 2041 marked, labelled and dropped to the axis.',
      proposal: '`chart_spec.annotations: [{ x: 1939, label: "Previous peak" }]` drawn per `type.annotation` and a theme rule `annotation.keyPoints: { marker: "hollow", dropLine: "dotted", axisLabels: "keyOnly" }`.',
    },
  ],
};

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(london, 'London Measured Report (Sep 2018)', ['source-wordmark']);

export default london;
