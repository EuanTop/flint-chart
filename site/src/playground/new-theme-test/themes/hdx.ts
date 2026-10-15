import type { ThemeSpec } from 'flint-chart';
import research from '../research/hdx.json';
import { flintInput, paletteCountProbe, POPULATION } from '../probes';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Source Sans 3', 'Source Sans Pro', sans-serif";
const SAPPHIRE = '#007CE0';
const MINT = '#1EBFB3';
const TOMATO = '#F2645A';
const TITLE_INK = '#333333';
const GREY = '#888888';
const GRID = '#EEEEEE';

const t: HouseTokens = {
  font: FONT,
  text: TITLE_INK,
  muted: GREY,
  grid: GRID,
  axis: null,
  background: '#FFFFFF',
  palette: [MINT, SAPPHIRE, TOMATO, '#78D9D1', '#F7A29C', '#66B0EC'],
  highlight: TOMATO,
  context: '#FCE0DE',
  titleSize: 17,
  titleWeight: 'bold',
  subtitleSize: 12,
  subtitleColor: GREY,
  labelSize: 11,
  sourceSize: 12,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'hdx',
  label: 'Humanitarian Data Exchange',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: TITLE_INK, secondary: GREY, muted: GREY, inverse: '#FFFFFF' },
    structure: { grid: GRID, axis: '#CCCCCC', zero: '#CCCCCC' },
    series: {
      single: SAPPHIRE,
      // The legacy discrete scale for two and three series: mint, sapphire, then tomato only when an odd count needs it.
      categorical: [MINT, SAPPHIRE, TOMATO, '#78D9D1', '#F7A29C', '#66B0EC'],
      // Four series reorder: sapphire leads (R6).
      categoricalByCount: { 4: [SAPPHIRE, MINT, TOMATO, '#78D9D1'] },
      categoricalExtended: [MINT, SAPPHIRE, TOMATO, '#78D9D1', '#F7A29C', '#66B0EC', '#C25048', '#0063B3', '#18998F', '#FCE0DE', '#CCE5F9', '#D2F2F0'],
      overflow: '#CCCCCC',
      sequential: { stops: ['#CCE5F9', '#66B0EC', '#007CE0', '#0063B3'], space: 'lab' },
      status: { positive: MINT, negative: TOMATO, neutral: '#CCCCCC' },
    },
    accent: TOMATO,
  },
  type: {
    headline: { family: FONT, size: 17, weight: 'bold', case: 'asIs', color: TITLE_INK },
    deck: { family: FONT, size: 12, weight: 'regular', color: GREY },
    axisLabel: { family: FONT, size: 11, color: GREY },
    axisTitle: { family: FONT, size: 12, color: GREY },
    keyLabel: { family: FONT, size: 11, color: GREY },
    valueLabel: { family: FONT, size: 11, color: TITLE_INK },
    footnote: { family: FONT, size: 11, color: GREY },
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
  marks: { bandFraction: 0.6, strokeWeight: 2, cornerRadius: 0 },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'center' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'omit', unit: 'never', numberFormat: { thousands: 'suffix', compact: { style: 'upper', per: 'value', threshold: 1000 } } },
  layout: { titleBlock: { anchor: 'start', gap: 'tight', deckGap: 'tight' } },
};

/** Weekly global confirmed COVID-19 cases, read off the guide’s own specimen (WHO data, week starting). */
const WEEKLY = [
  0, 0.1, 1, 14, 20, 15, 8, 6, 10, 28, 105, 260, 430, 540, 560, 545, 555, 575, 600, 650, 680, 760,
  830, 870, 960, 1040, 1230, 1380, 1520, 1630, 1790, 1820, 1830, 1810, 1780, 1860, 1860, 1990, 2010,
].map((k, i) => {
  const d = new Date(Date.UTC(2020, 0, 6 + i * 7));
  return { Week: d.toISOString().slice(0, 10), Cases: Math.round(k * 1000) };
});
const SIG_TITLE = 'Monthly global COVID-19 confirmed cases in 2020';
const RED_TITLE = 'Monthly global COVID-19 number of cases surpasses two million';

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** The HDX title block: bold headline, then the “DATA | date | source” strip with DATA in HDX blue. */
const header = (title: string, date: string, source: string) =>
  `<div style="margin:0 14px 0;font-family:${FONT}">`
  + `<div style="font-size:${t.titleSize}px;font-weight:700;color:${TITLE_INK};line-height:1.25">${escape(title)}</div>`
  + `<div style="font-size:12px;color:${GREY};margin-top:3px"><span style="color:${SAPPHIRE}">DATA</span> | ${escape(date)} | ${escape(source)}</div></div>`;

/** A chart with no title of its own (the header carries it), in the HDX axis style. */
function bare(view: Record<string, unknown>, o: { width?: number; height?: number } = {}) {
  const config = houseConfig(t);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...config, padding: { left: 14, right: 14, top: 10, bottom: 10 }, axis: { ...(config.axis as object), labelColor: GREY, labelPadding: 4 } },
    width: o.width ?? W,
    height: o.height ?? H,
    ...view,
  };
}

/** 0.0, 500K, 1.0M, 1.5M: gghdx `label_number_hdx`. */
const HDX_NUMBER = "datum.value === 0 ? '0.0' : datum.value < 1e6 ? format(datum.value / 1e3, 'd') + 'K' : format(datum.value / 1e6, '.1f') + 'M'";
const MONTH_UPPER = "toDate(datum.value + 'T00:00:00Z') && utcdate(toDate(datum.value + 'T00:00:00Z')) <= 7 ? upper(utcFormat(toDate(datum.value + 'T00:00:00Z'), '%b')) : ''";

function weeklyExpected(color: unknown) {
  return bare({
    data: { values: WEEKLY },
    mark: { type: 'bar' },
    encoding: {
      x: { field: 'Week', type: 'ordinal', title: null, scale: { paddingInner: 0.35, paddingOuter: 0.1 }, axis: { labelAngle: 0, labelExpr: MONTH_UPPER, labelOverlap: false, domain: false } },
      y: { field: 'Cases', type: 'quantitative', title: null, scale: { domain: [0, 2.1e6], nice: false }, axis: { values: [0, 5e5, 1e6, 1.5e6, 2e6], labelExpr: HDX_NUMBER } },
      color,
    },
  });
}

const weeklyFlint = (title: string) => flintInput(theme, {
  chartType: 'Bar Chart',
  data: WEEKLY,
  semantic_types: { Week: 'Date', Cases: 'Quantity' },
  encodings: { x: 'Week', y: 'Cases' },
  title,
  subtitle: 'DATA | 28 SEP 2020 | World Health Organization',
});

/** The same weeks summed by month: the date-label probe. */
const MONTHLY = (() => {
  const sums = new Map<string, number>();
  for (const row of WEEKLY) sums.set(row.Week.slice(0, 7), (sums.get(row.Week.slice(0, 7)) ?? 0) + row.Cases);
  // September is only two weeks into the specimen, so the full months stop at August.
  return [...sums].filter(([month]) => month < '2020-09').map(([month, Cases]) => ({ Month: `${month}-01`, Cases }));
})();

const populationExpected = () => bare({
  data: { values: POPULATION },
  mark: { type: 'bar', color: SAPPHIRE },
  encoding: {
    y: { field: 'Country', type: 'nominal', sort: null, title: null, scale: { paddingInner: 0.4 } },
    x: { field: 'Population', type: 'quantitative', title: null, axis: { grid: true, tickCount: 4, labelExpr: "datum.value === 0 ? '0' : datum.value < 1000 ? datum.value + 'M' : format(datum.value / 1e3, '.1f') + 'B'" }, scale: { domain: [0, 1500] } },
  },
}, { height: 200 });

const hdx: StyleGuideTheme = {
  id: 'hdx',
  org: 'Humanitarian Data Exchange (UN OCHA Centre for Humanitarian Data)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the guide-era (“legacy”) values, which OCHA’s own gghdx package implements and whose two reference images come from the original guide. Stated directly: Source Sans 3; HDX sapphire `#007CE0` as the single-series ink; the legacy discrete order for small counts (mint, sapphire, then tomato) with the light and dark ramp steps behind it up to twelve; the sapphire sequential ramp; a bold `#333333` headline; `#888888` grey for the deck, axis text and key; `#EEEEEE` horizontal gridlines only; no axis lines and no ticks; narrow (60%) bars; a centred key at the bottom; and K/M suffixes (`numberFormat.thousands: suffix`).',
    'Approximated: gghdx sizes are relative to a 10pt base; they were set for a ~360px web widget (17px headline, 12px strip, 11px ticks), matching the reference images. The 2025 redesign (Merriweather titles, Roboto body, primary `#1862D8`) is recorded in the research but not mapped.',
    'Not stated (see gaps): the “DATA | date | source” strip under the headline with DATA in HDX blue, the pale-tint-plus-full-hue highlight, uppercase month labels, the count-specific palette (sapphire leads from four series up), and the HDX number words (500K, 1.0M).',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Reference chart from the original guide: bold dark-grey headline over two lines; directly under it “DATA | 28 SEP 2020 | World Health Organization” with DATA in HDX blue; narrow sapphire columns with clear gaps, one per week; light `#EEEEEE` horizontal gridlines; grey y labels 0.0, 500K, 1.0M, 1.5M, 2.0M with no axis line or ticks; uppercase month labels JAN … SEP; no key, no border.',
      current: 'Flint draws the headline, grey deck, light gridlines and sapphire bars without axis lines. The strip is plain grey text (DATA cannot be blue), month labels are in mixed case, and the y labels follow the field’s own format, not the house’s K/M words.',
      expected: 'The guide’s specimen with its data.',
      flint: weeklyFlint(SIG_TITLE),
      expectedSpec: weeklyExpected({ value: SAPPHIRE }),
      expectedFrame: { headerHtml: header(SIG_TITLE, '28 SEP 2020', 'World Health Organization') },
      observed: 'Flint has the HDX palette and greys right — sapphire columns, light gridlines, no axis lines or ticks, bold dark headline — but the chart reads differently: the 39 weekly columns push the plot wide, so the type shrinks; the x labels are full month names (“February”, “September”) turned −45° with “Jan 6, 2020” first, although the theme states `labels.angle: horizontal`; the y ticks print 500,000 … 2,500,000; and the deck reads “DATA | 28 SEP 2020 | World Health Organization; Cases” in one grey.',
    },
    {
      id: 'data-strip',
      title: 'The “DATA | date | source” strip sits under the headline',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: 'Source and date go directly under the title, above the plot: “DATA | 28 SEP 2020 | World Health Organization”, the word DATA in HDX blue, the rest in `#888888` with pipes between; the date in upper-case `DD MON YYYY`. There is no footer.',
      current: 'The chart spec has no source or date slot, so the strip can only be typed into `subtitle`, where it is one grey string: the blue DATA lead-in, the pipe layout and the date format are lost, and the deck can no longer carry a real subtitle.',
      expected: 'A source line in the deck position with its own structure: a blue “DATA” label, the date, the organisation.',
      proposal: '`chart_spec.source: { name, date }` plus `annotation.source: { position: "underTitle" | "footer", label: "DATA", labelInk: "accent", separator: " | ", dateFormat: "%d %b %Y", case: "upper" }`.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: 'Country', x: 'Population' },
        title: 'India and China hold over a third of humanity',
        subtitle: 'DATA | 2023 | UN World Population Prospects',
      }),
      expectedSpec: populationExpected(),
      expectedFrame: { headerHtml: header('India and China hold over a third of humanity', '2023', 'UN World Population Prospects') },
      observed: 'Flint sets the strip as the deck in grey with “; Population (m)” appended by `axisTitles: omit`, so the source line now also carries an axis title. Expected: DATA in HDX blue, the date and source after it, nothing appended; the axis in HDX words (500M, 1.0B).',
    },
    {
      id: 'tint-highlight',
      title: 'Highlight: the ramp’s ultra-light tint for context, its full hue for the subject',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'highlight',
      rule: 'The second reference chart turns every column the ultra-light tomato tint `#FCE0DE` and the final week full tomato `#F2645A`; the headline states the finding (“… surpasses two million”). Context and emphasis come from one ramp, not from a grey.',
      current: 'Nothing in the chart spec names the subject bar, and ThemeSpec has no emphasis/context pair; every column stays sapphire.',
      expected: 'Pale pink columns, the last one tomato red.',
      proposal: '`chart_spec.emphasis: { field, values }`, with the theme stating `ink.series.emphasis: "#F2645A"` and `ink.series.context: "#FCE0DE"` (or `context: "tintOfEmphasis"`).',
      flint: weeklyFlint(RED_TITLE),
      expectedSpec: weeklyExpected({ condition: { test: `datum.Week === '${WEEKLY[WEEKLY.length - 1].Week}'`, value: TOMATO }, value: '#FCE0DE' }),
      expectedFrame: { headerHtml: header(RED_TITLE, '28 SEP 2020', 'World Health Organization') },
      observed: 'Flint: every column sapphire, so the headline’s finding (the last week passes two million) has no visual anchor. Expected: all columns pale `#FCE0DE`, the final one solid tomato — the guide’s second reference image.',
    },
    {
      id: 'upper-months',
      title: 'Month labels in capitals: JAN, FEB, MAR',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'date-label-format',
      rule: 'Axis months are upper-case three-letter abbreviations in grey (`toupper(strftime(x, "%b"))`); dates in the strip are `28 SEP 2020`.',
      current: 'There is no date-label rule in ThemeSpec. `type.axisLabel.case: "upper"` exists but would capitalise country names as well (and is not realised: see the USAID house), so Flint prints “Jan”, “Feb”.',
      expected: 'JAN … AUG under the columns, ticks as 2.0M … 10.0M.',
      proposal: '`annotation.dateLabels: { month: "short", case: "upper" }` — case on the date role, not on every axis label.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: MONTHLY,
        semantic_types: { Month: 'YearMonth', Cases: 'Quantity' },
        encodings: { x: 'Month', y: 'Cases' },
        title: 'COVID-19 cases rose every month to August',
        subtitle: 'DATA | 28 SEP 2020 | World Health Organization',
      }),
      expectedSpec: bare({
        data: { values: MONTHLY },
        mark: { type: 'bar', color: SAPPHIRE },
        encoding: {
          x: { field: 'Month', type: 'ordinal', title: null, scale: { paddingInner: 0.4 }, axis: { labelAngle: 0, labelExpr: "upper(utcFormat(toDate(datum.value + 'T00:00:00Z'), '%b'))" } },
          y: { field: 'Cases', type: 'quantitative', title: null, axis: { tickCount: 4, labelExpr: HDX_NUMBER } },
        },
      }),
      expectedFrame: { headerHtml: header('COVID-19 cases rose every month to August', '28 SEP 2020', 'World Health Organization') },
      observed: 'Flint prints “2020, Feb, Mar … Aug” — the first month is replaced by the year, the rest are mixed case — and the y axis runs 0 … 10,000,000. Expected: JAN … AUG in capitals, ticks in M.',
    },
    {
      id: 'count-palette',
      addressed: { stage: 'R6', note: 'The four-series order (sapphire first) is stated as `categoricalByCount[4]`.' },
      title: 'The palette depends on the number of series',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'count-palette',
      rule: '`hdx_pal_discrete` (legacy): one series mint; two mint + sapphire; three adds tomato (“only when necessary for odd # of colors”); four is sapphire, mint, tomato, mint-light — the order changes with the count.',
      current: 'ThemeSpec has one ordered list (`categorical`, then `categoricalExtended`). This theme states the two- and three-series order, so four series come out mint, sapphire, tomato, mint-light instead of sapphire first.',
      expected: 'Four lines in sapphire, mint, tomato and mint-light.',
      proposal: '`ink.series.categoricalByCount: { 1: [...], 2: [...], 3: [...], 4: [...] }`.',
      ...paletteCountProbe(theme, t, { n: 4, palette: [SAPPHIRE, MINT, TOMATO, '#78D9D1'] }),
      observed: 'Flint’s four lines are mint (Norway), sapphire, tomato and mint-light — the three-series order extended. The guide’s four-series set leads with sapphire (Norway blue, China mint). Flint also puts the key under the plot, centred, as the theme asks.',
    },
    {
      id: 'number-words',
      addressed: { stage: 'A6', note: '`compact: { style: "upper", per: "value", threshold: 1000 }` — 0, 500K, 1M, 1.5M (A6); the guide’s fixed one decimal (1.0M) on ticks is not drawn.' },
      title: 'Numbers as 500K and 1.0M',
      kind: 'realization',
      severity: 'medium',
      probe: 'number-format',
      rule: '`label_number_hdx`: ≥1,000 → X.YK, ≥10,000 → XYK, ≥100,000 → XYZK, then the same for M and B, upper-case; tick labels keep one decimal for millions (1.0M, 1.5M, 2.0M).',
      current: 'The theme states `annotation.numberFormat.thousands: "suffix"`, but Flint applies it to value labels only (as d3 `~s`, which would also write 1.5M as “1.5M” and 2,000 as “2k”, lower case); measure-axis ticks keep the field’s grouped format, 500,000 … 2,500,000.',
      expected: '0.0, 500K, 1.0M, 1.5M, 2.0M, as on the signature’s expected panel.',
      proposal: 'Apply `numberFormat` to measure-axis ticks, and let it name its suffixes (`{ 1e3: "K", 1e6: "M", 1e9: "B" }`) and a tick precision rule (`tickPrecision: "uniform"`).',
    },
  ],
};

export default hdx;
