import type { ThemeSpec } from 'flint-chart';
import research from '../research/usaid-oha.json';
import { EV_SHARE, flintInput, highlightProbe, POPULATION, UNEMPLOYMENT, withChartSource } from '../probes';
import { houseConfig, titled, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Source Sans 3', 'Source Sans Pro', Arial, sans-serif";
const MIDNIGHT = '#15478A';
const VIKING = '#5BB5D5';
const SLATE = '#8C8C91';
const GREY30K = '#BCBEC0';
const NERO = '#202020';
const MATTERHORN = '#505050';
const SUVA = '#909090';
const GRID = '#D3D3D3';
const CORE = [MIDNIGHT, VIKING, SLATE, '#E14BA1', '#3B5BBE', '#F9C555', '#419164', '#876EC4', '#F36428'];

const t: HouseTokens = {
  font: FONT,
  text: NERO,
  muted: MATTERHORN,
  grid: GRID,
  gridWidth: 0.5,
  axis: null,
  background: '#FFFFFF',
  palette: CORE,
  highlight: MIDNIGHT,
  context: GREY30K,
  titleSize: 17,
  titleWeight: 'bold',
  subtitleSize: 14,
  subtitleColor: NERO,
  labelSize: 12,
  sourceSize: 11,
  lineWidth: 2,
  legendOrient: 'top',
};

const theme: ThemeSpec = {
  id: 'usaid-oha',
  label: 'USAID OHA (glitr si_style)',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: NERO, secondary: MATTERHORN, muted: SUVA, inverse: '#FFFFFF' },
    structure: { grid: GRID, axis: GRID, rule: MATTERHORN, zero: GRID },
    series: {
      single: MIDNIGHT,
      categorical: CORE,
      overflow: GREY30K,
      sequential: { stops: ['#D0DAE8', '#8AA3C5', '#7391B9', '#446CA1', '#15478A'], space: 'lab' },
    },
    accent: MIDNIGHT,
  },
  type: {
    headline: { family: FONT, size: 17, weight: 'bold', case: 'upper', color: NERO },
    deck: { family: FONT, size: 14, weight: 'regular', style: 'normal', case: 'asIs', color: NERO },
    axisLabel: { family: FONT, size: 12, color: MATTERHORN },
    axisTitle: { family: FONT, size: 12, color: MATTERHORN },
    keyLabel: { family: FONT, size: 13, color: MATTERHORN },
    valueLabel: { family: FONT, size: 11, color: MATTERHORN },
    annotation: { family: FONT, size: 12, weight: 'regular', color: MATTERHORN },
    footnote: { family: FONT, size: 11, color: SUVA },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit', suppressWhenValuesPrinted: true },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'solid', weight: 0.5 },
    frame: 'omit',
    baseline: 'omit',
  },
  marks: { bandFraction: 0.9, strokeWeight: 2, cornerRadius: 0 },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['seriesEnd', 'top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never', placement: 'outsideMark', inkMode: 'fixed' },
  annotation: { axisTitles: 'omit', unit: 'never', numberFormat: { thousands: 'separator', precision: 'auto' } },
  layout: { titleBlock: { anchor: 'start', gap: 'tight', deckGap: 'tight' } },
  compileDefaults: { baseSize: { width: 640, height: 360 } },
  // The source line, as the guide sets it (S1); the chart gives the words.
  source: { align: 'end' },
};

const upper = (text: string) => text.toUpperCase();

/** `titled`, with the title and caption anchored to the whole plot (the leftmost y label), as `plot.title.position = "plot"`. */
function ohaTitled(view: Record<string, unknown>, o: Parameters<typeof titled>[2]) {
  const spec = titled(t, view, { footerColor: SUVA, ...o });
  const config = spec.config as Record<string, Record<string, unknown>>;
  config.title = { ...config.title, frame: 'bounds', color: NERO, subtitlePadding: 2, offset: 8 };
  config.axis = { ...config.axis, labelColor: MATTERHORN };
  return spec;
}

/** glitr’s `hts` dummy data, read off the si_style reference images: all tests and positive tests by PSNU. */
const HTS = ([
  ['Sagittarius', 66500, 3800], ['Libra', 64600, 2450], ['Eridanus', 36600, 1600], ['Corvus', 24500, 1300],
  ['Capricornus', 22000, 2000], ['Ursa Major', 14400, 1800], ['Auriga', 12000, 1250], ['Cepheus', 9600, 900],
  ['Ophiuchus', 9600, 750], ['Virgo', 2600, 300], ['Leo', 2000, 450], ['Serpens', 1100, 200], ['Boötes', 1000, 450],
] as [string, number, number][]).map(([PSNU, tests, positive]) => ({ PSNU, tests, positive }));
const SIG_TITLE = 'Sagittarius and Libra ran half of all HIV tests';
const SIG_SUB = 'Positive tests out of all HIV tests by PSNU, FY50Q1';
const SIG_SOURCE = 'Source: glitr package `hts` dummy data | Ref Id: 9f3c21';

function signatureExpected() {
  const y = { field: 'PSNU', type: 'nominal', sort: null, title: null, scale: { paddingInner: 0.08 }, axis: { labelPadding: 4 } };
  return ohaTitled({
    data: { values: HTS },
    layer: [
      { mark: { type: 'bar', color: GREY30K }, encoding: { y, x: { field: 'tests', type: 'quantitative', title: null, scale: { domain: [0, 67000], nice: false }, axis: { grid: true, format: ',.0f', values: [0, 20000, 40000, 60000], domain: false } } } },
      { mark: { type: 'bar', color: MIDNIGHT }, encoding: { y, x: { field: 'positive', type: 'quantitative' } } },
    ],
  }, { title: upper(SIG_TITLE), subtitle: SIG_SUB, footer: [SIG_SOURCE], footerAlign: 'end', height: 250 });
}

const populationTitle = 'India and China hold over a third of humanity';

function populationExpected(o: { title: string; footer?: string[] }) {
  return ohaTitled({
    data: { values: POPULATION },
    mark: { type: 'bar', color: MIDNIGHT },
    encoding: {
      y: { field: 'Country', type: 'nominal', sort: null, title: null, scale: { paddingInner: 0.12 } },
      x: { field: 'Population', type: 'quantitative', title: null, axis: { grid: true, format: ',.0f', tickCount: 4 } },
    },
  }, { title: o.title, subtitle: 'Population in millions, 2023', footer: o.footer, footerAlign: 'end' });
}

const populationFlint = (title: string) => flintInput(theme, {
  chartType: 'Bar Chart',
  data: POPULATION,
  semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
  encodings: { y: 'Country', x: 'Population' },
  title,
  subtitle: 'Population in millions, 2023',
});

/** A thin grey curved arrow from a sentence to the reading it explains, as the guide’s “swoopy” arrows. */
function annotationExpected() {
  const curve = [
    { Year: 2014.2, v: 10.6, o: 0 },
    { Year: 2018.2, v: 10.4, o: 1 },
    { Year: 2019.75, v: 8.6, o: 2 },
  ];
  return ohaTitled({
    layer: [
      {
        data: { values: UNEMPLOYMENT },
        mark: { type: 'line', strokeWidth: 2, color: MIDNIGHT },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2000, 2023], nice: false }, axis: { format: 'd', values: [2000, 2005, 2010, 2015, 2020], grid: false } },
          y: { field: 'Unemployment (%)', type: 'quantitative', title: null, scale: { domain: [0, 12] }, axis: { values: [0, 4, 8, 12], labelExpr: "datum.label + '%'" } },
        },
      },
      {
        data: { values: curve },
        mark: { type: 'line', interpolate: 'basis', strokeWidth: 0.8, color: SUVA },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'v', type: 'quantitative' }, order: { field: 'o' } },
      },
      {
        data: { values: [curve[2]] },
        mark: { type: 'point', shape: 'triangle-down', filled: true, size: 22, color: SUVA, angle: 25 },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'v', type: 'quantitative' } },
      },
      {
        data: { values: [{ Year: 2014, v: 11.4 }] },
        mark: { type: 'text', align: 'right', baseline: 'middle', fontSize: 12, font: FONT, fontWeight: 300, color: MATTERHORN, lineHeight: 14, text: ['Unemployment more than doubled in', '2020 as the pandemic closed businesses.'] },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'v', type: 'quantitative' } },
      },
    ],
  }, { title: upper('Unemployment spiked twice in two decades'), subtitle: 'US unemployment rate, %', footer: ['Source: US Bureau of Labor Statistics | Ref Id: 4b7d10'], footerAlign: 'end' });
}

const ELECTRICITY = (() => {
  const by: Record<string, Record<string, number>> = { France: { Nuclear: 65, Renewables: 27, Fossil: 8 }, Germany: { Renewables: 52, Fossil: 45, Nuclear: 3 }, 'United States': { Fossil: 60, Nuclear: 18, Renewables: 22 }, China: { Fossil: 62, Renewables: 33, Nuclear: 5 }, Brazil: { Renewables: 89, Fossil: 9, Nuclear: 2 } };
  return Object.entries(by).flatMap(([Country, mix]) => Object.entries(mix).map(([Source, Share]) => ({ Country, Source, Share })));
})();

function horizontalLabelsExpected() {
  return ohaTitled({
    data: { values: ELECTRICITY },
    mark: { type: 'bar' },
    encoding: {
      x: { field: 'Country', type: 'nominal', title: null, sort: ['Brazil', 'Germany', 'China', 'France', 'United States'], scale: { paddingInner: 0.15 }, axis: { labelAngle: 0, labelExpr: "split(datum.label, ' ')", labelLineHeight: 13 } },
      y: { field: 'Share', type: 'quantitative', title: null, axis: { values: [0, 25, 50, 75, 100], labelExpr: "datum.label + '%'" } },
      color: { field: 'Source', type: 'nominal', scale: { domain: ['Renewables', 'Nuclear', 'Fossil'], range: [MIDNIGHT, VIKING, SLATE] } },
      order: { field: 'Source', sort: 'descending' },
    },
  }, { title: upper('Brazil runs almost entirely on renewables'), subtitle: 'Electricity generation by source, % of total, 2023', width: 280, height: 190 });
}

function inTextLegendExpected() {
  const rows = EV_SHARE.filter((row) => row.Country === 'Norway' || row.Country === 'China');
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), legend: { disable: true }, axis: { ...(houseConfig(t).axis as object), labelColor: MATTERHORN } },
    width: W,
    height: H,
    data: { values: rows },
    mark: { type: 'line', strokeWidth: 2.5 },
    encoding: {
      x: { field: 'Year', type: 'quantitative', title: null, axis: { format: 'd', values: [2018, 2020, 2022, 2023], grid: false } },
      y: { field: 'EV share (%)', type: 'quantitative', title: null, axis: { values: [0, 25, 50, 75, 100], labelExpr: "datum.label + '%'" } },
      color: { field: 'Country', type: 'nominal', scale: { domain: ['Norway', 'China'], range: [MIDNIGHT, VIKING] } },
    },
  };
}

const word = (text: string, color: string) => `<span style="color:${color};font-weight:600">${text}</span>`;
const inTextHeader = `<div style="margin:0 14px;font-family:${FONT};color:${NERO}">`
  + `<div style="font-size:${t.titleSize}px;font-weight:700">NORWAY’S LEAD IN ELECTRIC CARS IS NARROWING</div>`
  + `<div style="font-size:${t.subtitleSize}px;margin-top:2px">Share of new cars sold that are electric in ${word('Norway', MIDNIGHT)} and ${word('China', VIKING)}</div></div>`;

const usaid: StyleGuideTheme = {
  id: 'usaid-oha',
  org: 'USAID Office of HIV/AIDS (OHA) Strategic Information',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the 2024 OHA style guide and the values in its R implementation (glitr `si_style`). Stated directly: Source Sans 3; Midnight Blue `#15478A` as the single-series ink and the nine OHA core colours in glitr order; Nero `#202020` titles, Matterhorn `#505050` axis and annotation text, Suva Gray `#909090` captions; thin `#D3D3D3` gridlines on the value axis only (`si_style_xgrid` / `si_style_ygrid`); no axis lines and no ticks; no axis titles (the subtitle carries the measure); comma thousands; a top-left untitled key with series-end labels preferred; always-horizontal labels; and the 16:9 slide canvas as `compileDefaults.baseSize`.',
    'Stated, but see whether it is drawn: the headline’s ALL CAPS (`type.headline.case: "upper"`) and `labels.`. Approximated: glitr sizes are ggplot points; they were set for a 360px panel (17px title, 14px subtitle, 12px axis text, 11px caption).',
    'Not stated (see gaps): the source caption in the lower-right corner with its “| Ref Id:” code, an integrated legend written as coloured words in the subtitle, grey-out of everything but the focus series, and thin unboxed sentence annotations joined to the data by curved arrows.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'glitr `si_style_xgrid` reference: an ALL-CAPS bold takeaway title and a plain subtitle, flush with the leftmost y label; bars sorted by value; grey (`#BCBEC0`) totals with the Midnight Blue achieved bars laid over them from zero; thin vertical gridlines only; comma thousands; no ticks or axis lines; the grey source caption at the bottom right.',
      current: 'The overlay is drawn as a stacked bar (positives + the rest), which Flint can do. The theme asks for an upper-case headline; there is no source slot.',
      expected: 'The reference chart redrawn with its dummy data.',
      flint: flintInput(theme, {
        chartType: 'Stacked Bar Chart',
        data: HTS.flatMap(({ PSNU, tests, positive }) => [
          { PSNU, Result: 'Positive', Tests: positive },
          { PSNU, Result: 'Negative', Tests: tests - positive },
        ]),
        semantic_types: { PSNU: 'Category', Result: 'Category', Tests: 'Quantity' },
        encodings: { y: { field: 'PSNU', sortBy: 'x', sortOrder: 'descending' }, x: 'Tests', color: 'Result' },
        title: SIG_TITLE,
        subtitle: SIG_SUB,
      }),
      expectedSpec: signatureExpected(),
      observed: 'Flint sorts the PSNUs by total and keeps the theme’s greys, vertical gridlines and absent ticks, but the look is not OHA’s: the headline is in sentence case despite `case: "upper"`; the remainder is drawn in Viking blue rather than grey context, so the chart reads as two equal categories with a key on top instead of “blue out of grey”; the deck gains “; Tests”; the 16:9 `compileDefaults` canvas is overridden by the caller’s 360px; and there is no caption at the bottom right.',
    },
    {
      id: 'caps-title',
      addressed: { stage: 'T3', note: 'The headline is set in capitals (`headline.case: "upper"`).' },
      title: 'The takeaway title is set in capitals',
      kind: 'realization',
      severity: 'high',
      probe: 'type-case',
      rule: '“Should be written in all upper case letters. Left-aligned on the plot with the left most y-axis label.” The title states the finding, not the measure.',
      current: 'The theme states `type.headline.case: "upper"`; the author writes the title in sentence case, as everywhere else.',
      expected: 'INDIA AND CHINA HOLD OVER A THIRD OF HUMANITY, bold, flush with the country labels.',
      proposal: 'Realise `TypeRole.case` (`text-transform` at render, or upper-case the string at assembly) for the headline, and for every other role that states it.',
      flint: populationFlint(populationTitle),
      expectedSpec: populationExpected({ title: upper(populationTitle) }),
      observed: 'Flint draws “India and China hold over a third of humanity” in sentence case: `type.headline.case` is accepted by the schema but never applied. The title is otherwise right — bold Nero, flush left with the country labels. The deck also gains “; Population (m)”.',
    },
    {
      id: 'caption-bottom-right',
      addressed: { stage: 'S1', note: 'The source caption right-aligned in Suva grey, the reference id written in the chart’s source.' },
      title: 'Source caption in the lower right, with a reference id',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: 'Caption “located in the lower right-hand corner of the visual in a light shade of gray” (Suva Gray `#909090`, 9pt), right-aligned: “Source: <data source (date)> | Ref Id: <code id>”, plus any notes and caveats.',
      current: 'No chart-spec slot for a source, notes or a reference id; `type.footnote` is stated but nothing draws it.',
      expected: 'The caption right-aligned under the plot.',
      proposal: '`chart_spec.source`, `chart_spec.notes[]`, `chart_spec.refId`; `layout.footer: { align: "end" }` in the theme.',
      flint: populationFlint(upper(populationTitle)),
      expectedSpec: populationExpected({ title: upper(populationTitle), footer: ['Source: UN World Population Prospects (2023) | Ref Id: 7c1e9b'] }),
      observed: 'With the title typed in capitals by hand, Flint matches the expected chart above the plot; below it there is nothing, where the guide puts “Source: … | Ref Id: …” in light grey at the bottom right.',
    },
    {
      id: 'focus-grey',
      title: 'One focus series in OHA blue, everything else grey',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'highlight',
      rule: '“Use it to highlight the most important groups — gray out the rest or mute the colors”: the focus in one OHA colour, context in grey30k `#BCBEC0`.',
      current: 'Neither spec can name the focus category; every bar takes Midnight Blue.',
      expected: 'Nigeria in Midnight Blue, the other bars grey.',
      proposal: '`chart_spec.emphasis: { field, values }` + `ink.series.emphasis` / `ink.series.context` in the theme.',
      ...highlightProbe(theme, t, { title: 'NIGERIA IS THE MOST POPULOUS COUNTRY IN AFRICA', subtitle: 'Population in millions, 2023' }),
      observed: 'Flint: eight Midnight Blue bars. Expected: Nigeria alone in Midnight Blue, the rest grey30k — the chart now answers its title. Flint also breaks the 17px title onto two lines and appends “; Population (m)” to the deck.',
    },
    {
      id: 'legend-in-subtitle',
      title: 'The legend written into the subtitle',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'in-text-legend',
      rule: '“Where possible, incorporate into direct labeling … or graph title/subtitle, e.g. coloring the elements in the title the same color as the category.” The subtitle “can provide … an integrated legend”.',
      current: 'ThemeSpec offers `seriesEnd` and the edge keys; it has no placement that colours the series names inside the deck, and the chart spec’s subtitle is plain text.',
      expected: 'No key; “Norway” and “China” in the subtitle set in their line colours.',
      proposal: '`legend.placement: "inText"` that colours `{series}` tokens the author leaves in the subtitle (or matches series names in it).',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE.filter((row) => row.Country === 'Norway' || row.Country === 'China'),
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'NORWAY’S LEAD IN ELECTRIC CARS IS NARROWING',
        subtitle: 'Share of new cars sold that are electric in Norway and China',
      }),
      expectedSpec: inTextLegendExpected(),
      expectedFrame: { headerHtml: inTextHeader },
      observed: 'Flint already avoids a key — the lines are named at their ends in Midnight and Viking — which the guide also accepts. What it cannot do is the guide’s preferred form: the subtitle carries the legend, with “Norway” and “China” coloured as their lines; Flint’s subtitle is plain and gains “; EV share (%)”.',
    },
    {
      id: 'swoopy-annotation',
      title: 'Thin sentence annotations with curved arrows',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'annotation',
      rule: '“Annotations are a thin stroke, not boxed. And should be complete sentences … Use swoopy arrows to connect annotation to data.” Matterhorn text, 9–10pt, light weight; thin grey curved arrow.',
      current: 'The chart spec has no annotation slot; `type.annotation` can be stated but has nothing to style.',
      expected: 'A two-line light grey sentence to the left of the 2020 spike, a thin curved arrow pointing at it.',
      proposal: '`chart_spec.annotations: [{ at: { Year: 2020 }, text }]`, styled by `type.annotation` and a theme `annotation.connector: { shape: "curved" | "straight" | "elbow", weight, ink }`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'UNEMPLOYMENT SPIKED TWICE IN TWO DECADES',
        subtitle: 'US unemployment rate, %',
      }),
      expectedSpec: annotationExpected(),
      observed: 'Flint draws the line alone (and starts the y axis at 3, with ticks every year in tiny type). Expected: a light two-line sentence over the 2010s with a thin grey curved arrow landing on the 2020 spike, and the caption bottom right.',
    },
    {
      id: 'horizontal-labels',
      addressed: { stage: 'A1', note: 'Names are measured in the face they are drawn in and kept flat: broken at a space, set smaller down to the floor (`type.minSize`, never below ¾ of the stated size), the bands widened — and only then turned (A1).' },
      title: 'Axis text is always horizontal',
      kind: 'realization',
      severity: 'medium',
      probe: 'turned-row-labels',
      rule: '“Text should always, always, always be horizontal as opposed to vertical or at a 45 degree angle.”',
      current: 'The theme states `labels.` and `labels.truncation: "wrap"`; the chart is a stacked column of five countries on a narrow canvas.',
      expected: 'Country names horizontal, “United States” wrapped onto two lines.',
      proposal: 'When the house says `horizontal`, treat it as a constraint: wrap, abbreviate or thin labels, or switch to horizontal bars — never turn them.',
      flint: flintInput(theme, {
        chartType: 'Stacked Bar Chart',
        data: ELECTRICITY,
        semantic_types: { Country: 'Country', Source: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Country', y: 'Share', color: 'Source' },
        title: 'Brazil runs almost entirely on renewables',
        subtitle: 'Electricity generation by source, % of total, 2023',
        baseSize: { width: 280, height: 190 },
      }),
      expectedSpec: horizontalLabelsExpected(),
      observed: 'Flint turns all five country names 45° although the theme says `labels.angle: horizontal` and `truncation: wrap`; it also moves the key to the right of the plot, not to the top the theme lists. The gallery shows the same turn on the decade and month axes. Expected: horizontal names, “United States” wrapped, bars ranked by renewables share, key on top.',
    },
  ],
};

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(usaid, 'PEPFAR MER (FY2023 Q4) | Ref Id: 7b3c', ['caption-bottom-right']);

export default usaid;
