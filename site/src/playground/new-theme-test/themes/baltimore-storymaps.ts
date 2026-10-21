import type { ThemeSpec } from 'flint-chart';
import research from '../research/baltimore-storymaps.json';
import { ANOMALY, flintInput, footerProbe, highlightProbe, PROJECTION, withChartSource } from '../probes';
import { houseConfig, titled, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const BODY_FONT = 'Roboto, Arial, sans-serif';
const LABEL_FONT = "'Roboto Condensed', Roboto, Arial, sans-serif";
const TITLE_FONT = 'Montserrat, Roboto, Arial, sans-serif';
const NAVY = '#2C4379';
const SOURCE_GREY = '#605E5C';
const GRID = '#C8C8C8';

const t: HouseTokens = {
  font: BODY_FONT,
  titleFont: TITLE_FONT,
  text: '#000000',
  muted: '#3F3F3F',
  grid: GRID,
  gridDash: [1, 3],
  axis: null,
  background: '#FFFFFF',
  palette: [NAVY, '#B0423C', '#4199B3', '#000000', '#E3A520'],
  highlight: '#E37820',
  context: '#C0C0C0',
  titleSize: 18,
  titleWeight: 'normal',
  subtitleSize: 14,
  subtitleColor: '#000000',
  labelSize: 12,
  sourceSize: 14,
};

const theme: ThemeSpec = {
  id: 'baltimore-storymaps',
  label: 'City of Baltimore (Data Viz Style Guide)',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF', panel: '#F0F0F0' },
    text: { primary: '#000000', secondary: '#000000', muted: SOURCE_GREY },
    structure: { grid: GRID, axis: '#C0C0C0', rule: '#808080' },
    series: {
      // One desaturated brand ink for a single series; the named palette is “a starting point”, not an order.
      single: NAVY,
      categorical: [NAVY, '#B0423C', '#4199B3', '#000000', '#E3A520'],
      categoricalExtended: [NAVY, '#B0423C', '#4199B3', '#000000', '#E3A520', '#654F82', '#788A7E', '#BD631A', '#00838C', '#8A846A'],
      overflow: '#C0C0C0',
      sequential: { stops: ['#f8bb39', '#a16d00', '#512700'], space: 'lab' },
      diverging: { stops: ['#e3a520', '#F0F0F0', '#405681'], neutral: '#F0F0F0', space: 'lab' },
      status: { positive: '#2BB673', negative: '#E35700', neutral: '#C0C0C0' },
    },
    accent: '#E37820',
  },
  type: {
    // Header/chart title in Montserrat (the 2023 embed) — set light in the specimens; the schema stops at regular.
    headline: { family: TITLE_FONT, size: 18, weight: 'light', color: '#000000' },
    deck: { family: BODY_FONT, size: 14, weight: 'regular', color: '#000000' },
    axisLabel: { family: LABEL_FONT, size: 12, weight: 'regular', color: '#000000' },
    axisTitle: { family: BODY_FONT, size: 13, weight: 'medium', color: '#000000' },
    keyLabel: { family: LABEL_FONT, size: 12, color: '#000000' },
    valueLabel: { family: BODY_FONT, size: 12, color: '#3F3F3F' },
    annotation: { family: BODY_FONT, size: 14, color: '#000000' },
    footnote: { family: BODY_FONT, size: 14, color: SOURCE_GREY },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit' },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'dotted', dash: [1, 3], weight: 1 },
    frame: 'omit',
    baseline: 'omit',
  },
  // “The width of the bars should be about twice the width of the space between the bars.”
  marks: { bandFraction: 0.67, strokeWeight: 2 },
  geometry: { line: { width: 2 }, band: { fraction: 0.67 } },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['seriesEnd', 'top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'whenTheyFit', placement: 'outsideMark', inkMode: 'contrastWithMark' },
  annotation: {
    unit: 'never',
    axisTitles: 'always',
    axisTitlePlacement: 'rotated',
    numberFormat: { thousands: 'separator' },
  },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' } },
  // The source line, as the guide sets it (S1); the chart gives the words.
  source: { align: 'end', leadInWeight: 'medium' },
};

/** The guide's own “good” bar chart: vacant building notices by neighbourhood. */
const NOTICES = [
  ['BROADWAY EAST', 993], ['CARROLLTON RIDGE', 779], ['SANDTOWN-WINCHESTER', 770], ['HARLEM PARK', 608], ['OLIVER', 512],
  ['CENTRAL PARK HEIGHTS', 511], ['COLDSTREAM HOMESTEAD MONTEBELLO', 408], ['EAST BALTIMORE MIDWAY', 390], ['MIDTOWN-EDMONDSON', 372], ['UPTON', 366],
].map(([Neighborhood, Notices]) => ({ Neighborhood: Neighborhood as string, 'Number of Notices': Notices as number }));

const SIG_TITLE = 'Neighborhoods with the Most Vacant Building Notices';

const sourceHtml = (source: string) =>
  `<div style="text-align:right;margin:2px 14px 8px;font-family:${BODY_FONT};font-size:14px;color:${SOURCE_GREY}"><span style="font-weight:500">Source:</span> ${source}</div>`;

function signature() {
  const spec = titled(t, {
    data: { values: NOTICES },
    encoding: {
      y: {
        field: 'Neighborhood', type: 'nominal', sort: null, title: 'Neighborhood',
        axis: { labelLimit: 190, labelColor: '#37474F', labelFont: LABEL_FONT, labelFontSize: 12, titleFont: BODY_FONT, titleFontSize: 13, titleFontWeight: 500, titleColor: '#000', titlePadding: 10 },
      },
      x: {
        field: 'Number of Notices', type: 'quantitative', scale: { domain: [0, 1000] },
        axis: { values: [0, 200, 400, 600, 800, 1000], format: ',d', grid: true, labelColor: '#5F5F5F', titleFontSize: 13, titleFontWeight: 500, titleColor: '#000', titleFont: BODY_FONT },
      },
    },
    layer: [
      { mark: { type: 'bar', color: '#1B3270' } },
      {
        transform: [{ filter: 'datum["Number of Notices"] < 900' }],
        mark: { type: 'text', align: 'left', dx: 5, fontSize: 11, color: '#5F5F5F', font: BODY_FONT },
        encoding: { text: { field: 'Number of Notices', type: 'quantitative', format: ',d' } },
      },
      {
        transform: [{ filter: 'datum["Number of Notices"] >= 900' }],
        mark: { type: 'text', align: 'right', dx: -5, fontSize: 11, fontWeight: 'bold', color: '#FFFFFF', font: BODY_FONT },
        encoding: { text: { field: 'Number of Notices', type: 'quantitative', format: ',d' } },
      },
    ],
  }, { title: SIG_TITLE, width: 250, height: 260 });
  // Anchor the title to the whole block (labels included), as the specimen does, not to the plot.
  return { ...spec, config: { ...(spec.config as object), title: { ...((spec.config as { title: object }).title), frame: 'bounds' } } };
}

/** US life expectancy at birth, CDC/NCHS. */
const LIFE = [[2000, 76.8], [2005, 77.6], [2010, 78.7], [2015, 78.7], [2019, 78.8], [2020, 77.0], [2021, 76.4], [2022, 77.5]]
  .map(([Year, v]) => ({ Year, 'Life expectancy': v }));

/** Dissolved-oxygen style reference: a dashed threshold and a paragraph beside the chart. */
const OXYGEN = [[2004, 0.4, 10.5], [2006, 0.7, 12.9], [2008, 0.4, 13.6], [2010, 0.8, 14.7], [2012, 2.7, 14.1], [2014, 6.3, 11.9], [2015, 12.8, 12.8], [2017, 11.1, 11.1]]
  .flatMap(([Year, min, max]) => [{ Year: String(Year), Reading: 'Min', 'Dissolved oxygen (mg/l)': min }, { Year: String(Year), Reading: 'Max', 'Dissolved oxygen (mg/l)': max }]);

function annotated() {
  const chart = {
    width: 280,
    height: 200,
    layer: [
      {
        data: { values: OXYGEN },
        mark: { type: 'bar' },
        encoding: {
          x: { field: 'Year', type: 'ordinal', title: 'Year', axis: { labelAngle: 0, titleFontWeight: 500, titleColor: '#000' } },
          xOffset: { field: 'Reading', sort: ['Min', 'Max'] },
          y: { field: 'Dissolved oxygen (mg/l)', type: 'quantitative', title: 'Min and Max', axis: { values: [0, 5, 10, 15], titleFontWeight: 500, titleColor: '#000' } },
          color: { field: 'Reading', type: 'nominal', sort: ['Min', 'Max'], scale: { range: ['#7AAFC2', '#1B5B70'] }, legend: { orient: 'top', direction: 'horizontal', symbolType: 'circle', offset: 4, labelFontSize: 11 } },
        },
      },
      {
        data: { values: [{ v: 5 }] },
        mark: { type: 'rule', color: '#8C8C8C', strokeDash: [4, 3], strokeWidth: 2 },
        encoding: { y: { field: 'v', type: 'quantitative' } },
      },
    ],
  };
  const note = {
    width: 170,
    height: 200,
    data: { values: [{}] },
    layer: [
      {
        mark: {
          type: 'text', align: 'left', baseline: 'top', font: BODY_FONT, fontSize: 11, lineHeight: 14, color: '#000',
          text: ['As dissolved oxygen in water', 'drops below 5.0 mg/l, aquatic', 'life is put under stress.'],
        },
        encoding: { x: { value: 0 }, y: { value: 24 } },
      },
      {
        mark: {
          type: 'text', align: 'left', baseline: 'top', font: BODY_FONT, fontSize: 11, lineHeight: 14, color: '#000',
          text: ['The variation in dissolved', 'oxygen at the Linwood Ave', 'station decreased between', '2004 and 2017.'],
        },
        encoding: { x: { value: 0 }, y: { value: 76 } },
      },
    ],
  };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: { text: 'Dissolved Oxygen Linwood Ave Station' },
    hconcat: [chart, note],
    spacing: 18,
  };
}

/** The shared population probes leave the value axis to Vega-Lite, which crowds “1,400 1,600”; give it the guide's even steps. */
function evenPopulationAxis<T extends { expectedSpec?: Record<string, unknown> }>(probe: T): T {
  const views = (probe.expectedSpec?.vconcat ?? []) as { encoding?: { x?: { axis?: Record<string, unknown> } } }[];
  const x = views[0]?.encoding?.x;
  if (x) x.axis = { ...(x.axis ?? {}), values: [0, 500, 1000, 1500], format: ',d' };
  return probe;
}

/** One bar per year: observed to 2023, projected after (the shared series repeats 2023 in both). */
const PROJECTED_BARS = PROJECTION.filter((row) => (row.Year % 2 === 1 || row.Year === 2030) && !(row.Year === 2023 && row.Series === 'Projected'));

const ANOMALY_ROWS = ANOMALY.map(({ Decade, 'Anomaly (°C)': v }) => ({ Decade, 'Anomaly (°C)': v }));

const baltimore: StyleGuideTheme = {
  id: 'baltimore-storymaps',
  org: 'City of Baltimore (CitiStat Data Viz Style Guide)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'A municipal analysts’ guide for Power BI/Tableau dashboards, published as an ArcGIS StoryMap with a fonts doc and a colour sheet. Built from scratch.',
    'Stated directly: Montserrat titles, Roboto body, Roboto Condensed axis and key labels (not loaded on this page, so they fall back to Roboto), the guide’s pt sizes converted to px (12pt title → 18px, 10pt axis titles → 13px medium, 9pt labels → 12px, 11pt source → 14px `#605E5C`); black text; one navy ink for single series with grey `#C0C0C0` as the overflow and context ink; dotted light-grey gridlines on the value axis only, no axis lines or ticks; bars twice as wide as their gaps (`bandFraction: 0.67`); horizontal labels only; axis titles kept, y rotated; direct labels at line ends first; value labels outside bar ends; thousands separators; the brown→gold sequential and gold↔slate diverging ramps from the guide’s palette links.',
    'The colour sheet is a named local palette (Old Bay, Ravens Purple, Crab Mustard…) that the guide says is “a starting point for building your own color scales”, not a sequence; the categorical order here is a pick from it (navy, red, harbor blue, black, golden grass) after the guide’s own four-line example. Not stated: the light title weight, the right-aligned source, greyscale-plus-highlight, lighter projection bars, the two-thirds rule for line ranges and annotation paragraphs (see the gaps).',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'The guide’s “good” bar chart: thin Montserrat title top-left; bars sorted highest to lowest, one navy, about twice as thick as the gaps; category labels right-aligned against the bars, long names truncated with “…”; small grey value labels past each bar end (white and bold inside the longest bar); faint dotted vertical gridlines; no axis lines; axis titles “Number of Notices” and rotated “Neighborhood”; “Source:” right-aligned, grey, under the chart.',
      current: 'Flint is asked for the same chart, sorted by value, with the house theme.',
      expected: 'The specimen re-drawn: navy bars, dotted verticals, the axis titles, grey labels outside and the top label inside, the right-aligned source.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: NOTICES,
        semantic_types: { Neighborhood: 'Category', 'Number of Notices': 'Count' },
        encodings: { y: { field: 'Neighborhood', sortBy: 'x', sortOrder: 'descending' }, x: 'Number of Notices' },
        title: SIG_TITLE,
        baseSize: { width: 360, height: 280 },
      }),
      expectedSpec: signature(),
      expectedFrame: { footerHtml: sourceHtml('www.openbaltimore.gov') },
      observed: 'Flint comes very close: Montserrat title top-left, navy bars ranked by value at two-to-one bar/gap, faint dotted vertical gridlines, no axis lines, the long name truncated with “…”, values at the bar ends, “Number of Notices” below and a rotated “Neighborhood”. What differs: no source line; the value labels are near-black rather than small and grey, and 993 is printed past the end of the longest bar instead of reversed out in white inside it; the axis titles are heavier than the specimen’s.',
    },
    {
      id: 'source-line',
      addressed: { stage: 'S1', note: '`chart_spec.source` drawn as the house says: `source: { align: "end", leadInWeight: "medium" }` in the footnote role.' },
      title: 'Source line right-aligned, “Source:” in medium weight',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: '“Source: www.openbaltimore.gov — Roboto, medium title and regular for text, 11pt, right-aligned, #605E5C.”',
      current: 'The chart spec has no source slot; `type.footnote` is stated (14px `#605E5C`) but nothing draws it, and no field says the footer runs right-aligned.',
      expected: 'The source on its own line under the chart, flush right.',
      proposal: '`chart_spec.source`, drawn in `type.footnote`, with `layout.footer: { align: "end", leadIn: { text: "Source:", weight: "medium" } }`.',
      ...evenPopulationAxis(footerProbe(theme, t, { footer: ['Source: UN World Population Prospects'], footerAlign: 'end' })),
      observed: 'Flint (left) closes on the x-axis title “Population”; nothing names where the numbers come from. Expected (right): “Source: UN World Population Prospects” flush right under the plot in the grey footnote role. Flint otherwise matches the house here — Montserrat headline, Roboto deck, navy bars, dotted verticals, values at the bar ends.',
    },
    {
      id: 'greyscale-highlight',
      title: 'Start in greyscale; colour only what matters',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'highlight',
      rule: '“Start by using grayscale and only highlight important information with color”; “all the bars in a single chart should be the same color and shade … highlight one or two purposefully”.',
      current: 'Every bar takes `ink.series.single` (navy); neither the theme nor the chart spec can name the bar the story is about, so there is no grey field for it to stand out from.',
      expected: 'Nigeria in Zest orange `#E37820`, the other bars in Light Gray Accent `#C0C0C0`.',
      proposal: '`chart_spec.emphasis: { field, values }` with `ink.series.emphasis` / `ink.series.context` in the theme.',
      ...evenPopulationAxis(highlightProbe(theme, t)),
      observed: 'Flint: all eight bars navy, so the headline’s subject is not picked out. Expected: Nigeria in orange against a field of light grey — the guide’s greyscale-first approach.',
    },
    {
      id: 'line-range',
      title: 'A line fills two-thirds of the plot height',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'measure-domain',
      rule: '“Choose minimum and maximum values for the y axis so that the fever line takes up about two-thirds of the entire range”; use a zero baseline only when that lands near zero. Bar charts always start at zero.',
      current: 'Flint starts the y axis of this line at zero, so US life expectancy (76.4–78.8 years) is a flat line along the top of a 0–80 axis. The theme cannot state a domain policy, and the chart-spec zero baseline is a data-reading decision a theme may not change.',
      expected: 'The y axis from 75.5 to 79.5, the line occupying the middle two-thirds, its 2020–21 dip legible.',
      proposal: 'A theme-level preference for non-length marks: `structure.axis.measure.domain: { lines: "fitData", fill: 0.67, zeroWhenWithin: 0.15 }`, leaving bars on zero.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: LIFE,
        semantic_types: { Year: 'Year', 'Life expectancy': { semanticType: 'Duration', unit: 'years' } },
        encodings: { x: 'Year', y: 'Life expectancy' },
        title: 'Life Expectancy Fell Two Years Running',
      }),
      expectedSpec: titled(t, {
        data: { values: LIFE },
        mark: { type: 'line', strokeWidth: 2, color: NAVY },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: 'Year', axis: { format: 'd', values: [2000, 2005, 2010, 2015, 2020], titleFontWeight: 500, titleColor: '#000' }, scale: { domain: [2000, 2022] } },
          y: { field: 'Life expectancy', type: 'quantitative', title: 'Years', scale: { domain: [75.5, 79.5], zero: false }, axis: { values: [76, 77, 78, 79], titleFontWeight: 500, titleColor: '#000' } },
        },
      }, { title: 'Life Expectancy Fell Two Years Running' }),
      observed: 'Flint: a 0–80 axis with the line pressed flat against the top; the 2020–21 fall of more than two years is a barely visible kink. Expected: a 75.5–79.5 axis where the line spans two-thirds of the height and the dip reads at once.',
    },
    {
      id: 'no-rotated-labels',
      addressed: { stage: 'A1', note: 'Names are measured in the face they are drawn in and kept flat: broken at a space, set smaller down to the floor (`type.minSize`, never below ¾ of the stated size), the bands widened — and only then turned (A1).' },
      title: 'Category labels are turned although the theme says horizontal',
      kind: 'realization',
      severity: 'medium',
      probe: 'label-angle',
      rule: '“Avoid axes labels that are turned on a 45 or 90 degree angle and choose a horizontal bar instead.”',
      current: 'The theme states `labels.`. Flint lays the nine decades out at its default band step — a plot about 210px wide in a 360px canvas, ~23px per band, too narrow for “1880s” — and then turns the labels −45° rather than widening the bands into the room it has, wrapping, or swapping the axes. In the gallery the electricity-mix countries are turned 90° and the heatmap’s months too.',
      expected: 'Decades written flat under their columns; where names truly do not fit, the chart turned into horizontal bars rather than its labels turned.',
      proposal: 'Treat `labels.` as a constraint on the label plan: first widen the bands up to the canvas (as `layout.bandStepFit` would), then wrap or abbreviate, then swap to a horizontal bar — never rotate — and report each step.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: ANOMALY_ROWS,
        semantic_types: { Decade: 'Category', 'Anomaly (°C)': { semanticType: 'Quantity', unit: '°C' } },
        encodings: { x: 'Decade', y: 'Anomaly (°C)' },
        title: 'The World Has Warmed Since the 1960s',
      }),
      observed: 'Flint (left): a narrow plot with the nine decade labels turned −45° and crowded together under it. Expected (right): the same columns across the full width with every decade written flat beneath its bar.',
      expectedSpec: titled(t, {
        data: { values: ANOMALY_ROWS },
        mark: { type: 'bar', color: NAVY },
        encoding: {
          x: { field: 'Decade', type: 'ordinal', title: 'Decade', axis: { labelAngle: 0, titleFontWeight: 500, titleColor: '#000' }, scale: { paddingInner: 0.33 } },
          y: { field: 'Anomaly (°C)', type: 'quantitative', title: 'Anomaly (°C)', axis: { titleFontWeight: 500, titleColor: '#000' } },
        },
      }, { title: 'The World Has Warmed Since the 1960s' }),
    },
    {
      id: 'projection-bars',
      title: 'Projections are lighter-shaded bars of the same colour',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'forecast-style',
      rule: '“A lighter-shaded bar can be used to distinguish projections and estimates.”',
      current: 'Told that some rows are “Projected”, Flint can only treat the series field as a category and give it the second categorical ink — a different hue, plus a key — because ThemeSpec has no notion of an estimate.',
      expected: 'Observed years in navy, projected years in a light tint of the same navy, with a small label rather than a key.',
      proposal: 'Mark estimated rows in `semantic_types` (a status such as `estimate`) and let the theme state `annotation.forecast: { style: "lighter", tint: 0.45 }`.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: PROJECTED_BARS,
        semantic_types: { Year: 'Year', Series: 'Category', 'Capacity (GW)': 'Quantity' },
        encodings: { x: 'Year', y: 'Capacity (GW)', color: 'Series' },
        title: 'Renewable Capacity Is Set to Double by 2030',
      }),
      expectedSpec: titled(t, {
        data: { values: PROJECTED_BARS },
        layer: [
          {
            mark: { type: 'bar' },
            encoding: {
              x: { field: 'Year', type: 'ordinal', title: 'Year', axis: { labelAngle: 0, titleFontWeight: 500, titleColor: '#000' } },
              y: { field: 'Capacity (GW)', type: 'quantitative', title: 'Capacity (GW)', axis: { format: ',d', titleFontWeight: 500, titleColor: '#000' } },
              color: { field: 'Series', type: 'nominal', scale: { domain: ['Observed', 'Projected'], range: [NAVY, '#A9B6D3'] }, legend: null },
            },
          },
          {
            data: { values: [{ Year: 2027, v: 4500 }] },
            mark: { type: 'text', align: 'center', baseline: 'bottom', fontSize: 11, color: '#5F5F5F', text: 'Projected' },
            encoding: { x: { field: 'Year', type: 'ordinal' }, y: { field: 'v', type: 'quantitative' } },
          },
        ],
      }, { title: 'Renewable Capacity Is Set to Double by 2030' }),
      observed: 'Flint: observed years navy, projected years brick red with a two-entry key, so the forecast reads as a second variable rather than as the same measure, less certain; the year labels are also turned −45° against `labels.angle: horizontal`. Expected: one navy for the record, a pale navy tint for the projection and a quiet “Projected” label.',
    },
    {
      id: 'annotation-paragraph',
      title: 'A takeaway paragraph beside the chart, a dashed threshold line in it',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'annotation',
      rule: 'Annotations summarise the main takeaway: an 11pt Roboto paragraph placed to the right of the chart, and a dashed grey reference line at the threshold it discusses (5.0 mg/l).',
      current: 'The chart spec has no slot for a reference value or for explanatory text; `type.annotation` can be stated but nothing places it. Flint draws the grouped columns with the rotated axis titles the theme asks for.',
      expected: 'Light and dark teal columns, a dashed grey rule at 5, and the explanatory paragraph to the right.',
      proposal: '`chart_spec.annotations: [{ kind: "reference", value: 5, label }, { kind: "note", text, anchor: "beside" }]`, drawn with `type.annotation` and `marks.reference`.',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: OXYGEN,
        semantic_types: { Year: 'Category', Reading: 'Category', 'Dissolved oxygen (mg/l)': 'Quantity' },
        encodings: { x: 'Year', y: 'Dissolved oxygen (mg/l)', group: 'Reading' },
        title: 'Dissolved Oxygen Linwood Ave Station',
      }),
      expectedSpec: annotated(),
      observed: 'Flint draws the grouped columns, legend top-left and rotated “Dissolved oxygen (mg/l)” title, but Min and Max come out navy and red — two unrelated hues for two readings of one measure — and there is no threshold line and no takeaway text. Expected: light and dark teal, the dashed grey rule at 5 and the paragraph to the right.',
    },
    {
      id: 'light-title',
      addressed: { stage: 'T2', note: 'The headline is `weight: "light"` (300).' },
      title: 'Titles are set light, not bold',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'type-weight-scale',
      rule: 'The specimens set titles in thin Montserrat (Light) top-left; the hierarchy comes from size and darkness, not weight. Header 24pt, chart title 12pt.',
      current: '`TypeRole.weight` starts at `regular`; a light (300) headline cannot be asked for. (This page also loads Montserrat only at 400–700.)',
      expected: 'A large, light title.',
      proposal: 'Accept numeric weights 100–900 in `TypeRole.weight`.',
    },
    {
      id: 'treemap-over-pie',
      title: 'Treemaps instead of pies and doughnuts',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'chart-type-policy',
      rule: '“Tree maps are preferred over pie and donut charts”: largest block top-left, 6–10 categories, percentages inside blocks. Also: no 3D, no multi-coloured single-series bars, no more than five lines.',
      current: 'A theme cannot state which chart types the house prefers or discourages; the gallery’s pie is drawn as asked.',
      expected: 'A pie request answered with a treemap, or at least a report that the house discourages it.',
      proposal: '`chartPolicy: { discouraged: { "Pie Chart": "Treemap" }, maxSeries: { line: 5 } }`, surfaced in `_theme.report`.',
    },
  ],
};

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(baltimore, 'www.openbaltimore.gov', ['source-line']);

export default baltimore;
