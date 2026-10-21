import type { ThemeSpec } from 'flint-chart';
import research from '../research/unhcr.json';
import { BROWSERS, EV_SHARE, flintInput, pieProbe, withChartSource } from '../probes';
import { footerHtml, titled, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "Lato, 'Proxima Nova', Arial, sans-serif";
const BLUE = '#0072BC';
const YELLOW = '#FFC740';
const GREEN = '#32C189';
const CYAN = '#6CD8FD';
const RED = '#D25A45';
const PURPLE = '#A097E3';
const BROWN = '#7C3C36';
const GREY = '#BFBFBF';
/** UNHCR's population types keep their colours in every chart: the data's own annotation (R8). */
const POPULATION_TYPE = { semanticType: 'Category', colors: { Refugees: BLUE, IDPs: GREEN, 'Asylum-seekers': CYAN, Stateless: YELLOW, 'Venezuelans displaced abroad': RED, 'Other people in need of international protection': RED, 'Others of concern': GREY } };
/** The AAA text variant of each data colour, for labels written in a series' colour. */
const TEXT_INK: Record<string, string> = { [BLUE]: '#05568B', [GREEN]: '#1F5741', [CYAN]: '#0B5269', [YELLOW]: '#684D0B', [RED]: '#683229' };

const t: HouseTokens = {
  font: FONT,
  text: '#262626',
  muted: '#737373',
  grid: GREY,
  gridWidth: 0.67,
  axis: '#000000',
  background: '#FFFFFF',
  palette: [BLUE, YELLOW, GREEN, CYAN, RED, PURPLE],
  highlight: BLUE,
  context: GREY,
  titleSize: 16,
  titleWeight: 'bold',
  subtitleSize: 12,
  subtitleColor: '#262626',
  labelSize: 11,
  sourceSize: 9.5,
  lineWidth: 2,
};

const theme: ThemeSpec = {
  id: 'unhcr',
  label: 'UNHCR',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: '#262626', secondary: '#262626', muted: '#737373', inverse: '#FFFFFF' },
    structure: { grid: GREY, axis: '#000000', zero: '#000000', rule: BLUE },
    series: {
      single: BLUE,
      categorical: [BLUE, YELLOW, GREEN, CYAN, RED, PURPLE],
      categoricalExtended: [BLUE, YELLOW, GREEN, CYAN, RED, PURPLE, BROWN, GREY],
      overflow: GREY,
      sequential: { stops: ['#CDE3F1', '#8FC1E1', '#4F9ED0', '#0072BC', '#05568B', '#0B3754'], space: 'lab' },
      diverging: { stops: ['#0072BC', '#4F9ED0', '#8FC1E1', '#CDE3F1', '#F5F5F5', '#FEF1D1', '#FFC740', '#E4A202', '#B98405'], neutral: '#F5F5F5', space: 'lab' },
    },
    accent: BLUE,
  },
  type: {
    // “Figure 1” in 9pt UNHCR blue between the top bar and the title (F2).
    kicker: { family: FONT, size: 9, weight: 'regular', color: BLUE },
    headline: { family: FONT, size: 16, weight: 'bold', case: 'asIs', color: '#000000' },
    deck: { family: FONT, size: 12, weight: 'regular', color: '#262626' },
    axisLabel: { family: FONT, size: 11, color: '#262626' },
    axisTitle: { family: FONT, size: 11, weight: 'regular', color: '#737373' },
    keyLabel: { family: FONT, size: 11, color: '#262626' },
    valueLabel: { family: FONT, size: 11, color: '#262626' },
    footnote: { family: FONT, size: 9.5, color: '#737373' },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1, ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit', suppressWhenValuesPrinted: true },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'solid', weight: 0.67 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: { bandFraction: 0.72, strokeWeight: 2, cornerRadius: 0 },
  geometry: { line: { width: 2 }, point: { presence: 'omit' } },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['seriesEnd', 'top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start', suppressWhenAxisNames: true },
  dataLabels: { show: 'never', placement: 'outsideMark', inkMode: 'contrastWithMark' },
  annotation: {
    axisTitles: 'whenAmbiguous',
    axisTitlePlacement: 'flatAboveAxis',
    unitsInAxisTitle: true,
    numberFormat: { thousands: 'separator' },
  },
  layout: { titleBlock: { anchor: 'start', gap: 'normal', deckGap: 'tight' } },
  // The optional top bar: a 0.5pt UNHCR-blue rule on the canvas's top edge (F1).
  furniture: [{ kind: 'rule', at: 'canvasTop', frame: 'canvas', color: BLUE, height: 0.67 }],
  // The source line, as the guide sets it (S1); the chart gives the words.
  source: { credit: { text: '© UNHCR, The UN Refugee Agency', placement: 'nextLine' } },
};

const COPYRIGHT = '© UNHCR, The UN Refugee Agency';
const SOURCE = 'Source: UNHCR Refugee Data Finder';

/** Values read off the guide's own line-chart specimen (p21), millions. */
const REFUGEES = [17.4, 17.0, 17.8, 16.3, 15.7, 14.9, 13.4, 12.2, 11.7, 11.8, 12.1, 12.1, 10.6, 9.7, 9.6, 8.7, 9.9, 11.4, 10.5, 10.4, 10.5, 10.4, 10.5, 11.7, 14.4, 16.1, 17.2, 19.9, 20.4, 20.4, 20.7];
const IDPS = [0, 0, 0, 4.2, 5.4, 4.6, 5.1, 4.9, 5.1, 4.0, 6.0, 5.1, 4.8, 4.2, 5.5, 6.6, 12.8, 13.7, 14.4, 15.6, 14.7, 15.5, 17.7, 23.9, 32.3, 37.5, 36.6, 39.1, 41.4, 43.5, 48.6];
const DISPLACEMENT = [
  ...REFUGEES.map((v, i) => ({ Year: 1990 + i, 'Population type': 'Refugees', 'People (million)': v })),
  ...IDPS.map((v, i) => ({ Year: 1990 + i, 'Population type': 'IDPs', 'People (million)': v })),
];

/** The guide's bar-chart specimen (p23): people displaced across borders, 2020, millions. */
const ORIGIN = [
  ['Syria', 6.69], ['Venezuela', 4.03], ['Afghanistan', 2.6], ['South Sudan', 2.19], ['Myanmar', 1.1],
  ['DRC', 0.84], ['Somalia', 0.81], ['Sudan', 0.79], ['Central African Rep.', 0.64], ['Eritrea', 0.52],
].map(([Country, v]) => ({ Country: Country as string, 'People (million)': v as number }));
const ORIGIN_TITLE = 'People displaced across borders by country of origin | 2020';

/** Forcibly displaced people by population type, end-2020, millions (UNHCR Global Trends 2020). */
const POP_TYPES = [
  { 'Population type': 'IDPs', 'People (million)': 48.6 },
  { 'Population type': 'Refugees', 'People (million)': 20.7 },
  { 'Population type': 'Stateless', 'People (million)': 4.2 },
  { 'Population type': 'Asylum-seekers', 'People (million)': 4.1 },
  { 'Population type': 'Venezuelans displaced abroad', 'People (million)': 3.9 },
];
const TYPE_COLORS: Record<string, string> = { Refugees: BLUE, IDPs: GREEN, 'Asylum-seekers': CYAN, Stateless: YELLOW, 'Venezuelans displaced abroad': RED };

/** `titled`, with the headline in black as the guide's anatomy has it (the deck stays 85% black). */
function unhcrTitled(view: Record<string, unknown>, o: Parameters<typeof titled>[2]) {
  const spec = titled(t, view, o);
  const config = spec.config as { title: Record<string, unknown>; axis: Record<string, unknown> };
  config.title = { ...config.title, color: '#000000', subtitlePadding: 3, frame: 'bounds' };
  config.axis = { ...config.axis, labelColor: '#262626' };
  return spec;
}

/** The y-axis title laid flat at the top-left, above the labels, in 55% grey. */
const flatYTitle = (title: string) => ({
  title,
  titleAngle: 0,
  titleAlign: 'left',
  titleAnchor: 'end',
  titleBaseline: 'bottom',
  titleX: -28,
  titleY: -10,
  titleColor: '#737373',
  titleFontSize: 11,
  titleFontWeight: 'normal',
});

function signatureExpected() {
  const last = DISPLACEMENT.filter((row) => row.Year === 2020);
  return unhcrTitled({
    layer: [
      {
        data: { values: DISPLACEMENT },
        mark: { type: 'line', strokeWidth: 2 },
        encoding: {
          x: {
            field: 'Year', type: 'quantitative', scale: { domain: [1990, 2020], nice: false },
            axis: { format: 'd', values: [1990, 1995, 2000, 2005, 2010, 2015, 2020], title: null, ticks: true, tickSize: 4, tickColor: '#000', domain: true, domainColor: '#000' },
          },
          y: { field: 'People (million)', type: 'quantitative', scale: { domain: [0, 50] }, axis: { tickCount: 5, ...flatYTitle('Number of people (million)') } },
          color: { field: 'Population type', type: 'nominal', scale: { domain: ['Refugees', 'IDPs'], range: [BLUE, GREEN] }, legend: null },
        },
      },
      {
        data: { values: last },
        mark: { type: 'text', align: 'right', baseline: 'bottom', dy: -5, fontSize: 11, font: FONT },
        encoding: {
          x: { field: 'Year', type: 'quantitative' },
          y: { field: 'People (million)', type: 'quantitative' },
          text: { field: 'Population type' },
          color: { field: 'Population type', type: 'nominal', scale: { domain: ['Refugees', 'IDPs'], range: [TEXT_INK[BLUE], TEXT_INK[GREEN]] }, legend: null },
        },
      },
    ],
    resolve: { scale: { color: 'independent' } },
  }, { title: 'Number of refugees and IDPs of concern to UNHCR | 1990-2020', footer: [SOURCE, COPYRIGHT] });
}

const displacementFlint = (title: string) => flintInput(theme, {
  chartType: 'Line Chart',
  data: DISPLACEMENT,
  semantic_types: { Year: 'Year', 'Population type': POPULATION_TYPE, 'People (million)': { semanticType: 'Quantity', unit: 'million' } },
  encodings: { x: 'Year', y: 'People (million)', color: 'Population type' },
  title,
});

const originFlint = (chartProperties?: Record<string, unknown>, subtitle?: string) => flintInput(theme, {
  chartType: 'Bar Chart',
  data: ORIGIN,
  semantic_types: { Country: 'Country', 'People (million)': { semanticType: 'Quantity', unit: 'million' } },
  encodings: { y: 'Country', x: 'People (million)' },
  title: ORIGIN_TITLE,
  subtitle,
  chartProperties,
});

/** The guide's two bar specimens: gridlines and a value axis, or data labels and neither. */
function originExpected(labelled: boolean) {
  const bars = {
    mark: { type: 'bar', color: BLUE },
    encoding: {
      y: { field: 'Country', type: 'nominal', sort: null, title: null, axis: { domain: true, domainColor: '#000', domainWidth: 1, labelLimit: 120, zindex: 1 } },
      x: labelled
        ? { field: 'People (million)', type: 'quantitative', axis: null, scale: { domain: [0, 7.4] } }
        : {
          field: 'People (million)', type: 'quantitative', scale: { domain: [0, 7] },
          axis: { grid: true, domain: false, tickCount: 7, title: 'Number of people (million)', titleColor: '#737373', titleFontWeight: 'normal', titlePadding: 8 },
        },
    },
  };
  const view = labelled
    ? {
      data: { values: ORIGIN },
      layer: [
        bars,
        {
          mark: { type: 'text', align: 'left', dx: 3, fontSize: 10.5, color: '#262626', font: FONT },
          encoding: { y: { field: 'Country', type: 'nominal', sort: null }, x: { field: 'People (million)', type: 'quantitative' }, text: { field: 'People (million)', type: 'quantitative', format: '.2f' } },
        },
      ],
    }
    : { data: { values: ORIGIN }, ...bars };
  const spec = unhcrTitled(view, {
    title: ORIGIN_TITLE,
    subtitle: labelled ? 'Number of people (million)' : undefined,
    footer: [SOURCE, COPYRIGHT],
    height: 230,
  });
  const config = spec.config as Record<string, Record<string, unknown>>;
  config.axisX = { ...config.axisX, grid: !labelled };
  config.axisY = { ...config.axisY, grid: false };
  return spec;
}

const topBar = `<div style="margin:0 14px 0;height:0;border-top:1px solid ${BLUE}"></div>`
  + `<div style="margin:6px 14px 0;font-family:${FONT};font-size:12px;color:${BLUE}">Figure 1</div>`;

function typesExpected() {
  return unhcrTitled({
    data: { values: POP_TYPES },
    mark: { type: 'bar' },
    encoding: {
      y: { field: 'Population type', type: 'nominal', sort: null, title: null, axis: { domain: true, domainColor: '#000', labelLimit: 160, zindex: 1 } },
      x: { field: 'People (million)', type: 'quantitative', axis: { grid: true, domain: false, tickCount: 5, title: 'Number of people (million)', titleColor: '#737373' } },
      color: { field: 'Population type', type: 'nominal', scale: { domain: Object.keys(TYPE_COLORS), range: Object.values(TYPE_COLORS) }, legend: null },
    },
  }, { title: 'Forcibly displaced people worldwide | 2020', footer: [SOURCE, COPYRIGHT] });
}

const EV_NAMES = ['Norway', 'China', 'Germany', 'United States'];

function evExpected() {
  const last = EV_SHARE.filter((row) => row.Year === 2023);
  return unhcrTitled({
    layer: [
      {
        data: { values: EV_SHARE },
        mark: { type: 'line', strokeWidth: 2 },
        encoding: {
          x: { field: 'Year', type: 'quantitative', scale: { domain: [2018, 2023] }, axis: { format: 'd', values: [2018, 2020, 2022, 2023], title: null, domain: true, domainColor: '#000' } },
          y: { field: 'EV share (%)', type: 'quantitative', axis: { tickCount: 5, ...flatYTitle('Share of new cars sold (%)') } },
          color: { field: 'Country', type: 'nominal', scale: { domain: EV_NAMES, range: [BLUE, YELLOW, GREEN, CYAN] }, legend: null },
        },
      },
      {
        data: { values: last },
        mark: { type: 'text', align: 'left', dx: 5, fontSize: 11, font: FONT },
        encoding: {
          x: { field: 'Year', type: 'quantitative' },
          y: { field: 'EV share (%)', type: 'quantitative' },
          text: { field: 'Country' },
          color: { field: 'Country', type: 'nominal', scale: { domain: EV_NAMES, range: [TEXT_INK[BLUE], TEXT_INK[YELLOW], TEXT_INK[GREEN], TEXT_INK[CYAN]] }, legend: null },
        },
      },
    ],
    resolve: { scale: { color: 'independent' } },
  }, { title: 'Electric cars took off in Norway first | 2018-2023', footer: ['Source: IEA Global EV Outlook', COPYRIGHT], width: 300 });
}

/** Slices largest first from 12 o'clock, each named with its share just outside the rim. */
function pieExpected() {
  const rows = BROWSERS.slice().sort((a, b) => b.Share - a.Share);
  const total = rows.reduce((sum, row) => sum + row.Share, 0);
  const radius = 82;
  let cum = 0;
  const labels = rows.map((row) => {
    const mid = ((cum + row.Share / 2) / total) * 2 * Math.PI;
    cum += row.Share;
    return { ...row, lx: W / 2 + (radius + 8) * Math.sin(mid), ly: H / 2 - (radius + 8) * Math.cos(mid), right: Math.sin(mid) >= 0, label: `${row.Browser} ${row.Share}%` };
  });
  const text = (right: boolean) => ({
    data: { values: labels.filter((row) => row.right === right) },
    mark: { type: 'text', align: right ? 'left' : 'right', baseline: 'middle', fontSize: 11, font: FONT, color: '#262626' },
    encoding: { x: { field: 'lx', type: 'quantitative', scale: null }, y: { field: 'ly', type: 'quantitative', scale: null }, text: { field: 'label' } },
  });
  return unhcrTitled({
    layer: [
      {
        data: { values: rows },
        mark: { type: 'arc', outerRadius: radius, stroke: '#FFFFFF', strokeWidth: 1 },
        encoding: {
          theta: { field: 'Share', type: 'quantitative', stack: true },
          order: { field: 'Share', type: 'quantitative', sort: 'descending' },
          color: { field: 'Browser', type: 'nominal', sort: rows.map((row) => row.Browser), scale: { range: t.palette }, legend: null },
        },
      },
      text(true),
      text(false),
    ],
  }, { title: 'Chrome dominates desktop browsing | 2024', subtitle: 'Desktop browser market share (%)', footer: ['Source: StatCounter', COPYRIGHT] });
}

const unhcr: StyleGuideTheme = {
  id: 'unhcr',
  org: 'UNHCR, the UN Refugee Agency',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch. Stated directly: Lato everywhere; UNHCR blue `#0072BC` as the single-series ink and the head of the categorical set, followed by the guide’s recommended combination order (yellow, green, cyan, red, purple; brown and grey extend it); the blue sequential ramp and the blue–yellow diverging ramp centred on `#F5F5F5`; a 16px bold black sentence-case headline over a 12px regular deck in 85% black; 11px axis and key text in 85% black, axis titles in 55% grey; 0.5pt (≈0.67px) `#BFBFBF` gridlines on the value axis only; a black category baseline; no ticks; a top-left untitled key; and the y title laid flat above the axis.',
    'Approximated: print sizes (pt) were scaled by 1.333 for screen, as the guide allows. The guide’s “either gridlines and a value axis, or data labels” rule was stated as `structure.axis.measure.suppressWhenValuesPrinted`; line charts ask for `seriesEnd` direct labels first, then the top key. The 0.5pt blue “top bar” was stated as a `headerRule`.',
    'Not stated (see gaps): the two-line source and © footer, the optional blue “Figure 1” label, the fixed colour for each UNHCR population type, the AAA text variant used when a label is written in a series’ colour, and the top bar’s position above the figure number.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Line chart specimen (p21): bold black title with the period after a pipe; “Number of people (million)” flat at the top-left in 55% grey; light grey horizontal gridlines; black baseline with small ticks; ~2px lines, no markers, named at their ends in the darker AAA variant of their colour (IDPs green, Refugees blue); “Source:” and “© UNHCR, The UN Refugee Agency” in small grey type at the bottom-left.',
      current: 'Flint draws the title block, flat y title, gridlines and series-end labels from the theme. IDPs take the second categorical ink (yellow) because the theme cannot say IDPs are always green; there is no source or copyright line.',
      expected: 'The guide’s specimen redrawn with its data.',
      flint: displacementFlint('Number of refugees and IDPs of concern to UNHCR | 1990-2020'),
      expectedSpec: signatureExpected(),
      observed: 'Flint gets the bones right: flat “People (million)” title above the axis, light horizontal gridlines, black baseline, no markers, series named at their ends instead of a key. It differs in four places: IDPs are yellow, not green, and their end label is set in the yellow fill (hard to read on white); the 16px headline breaks onto two lines at 360px; the blue header rule sits between the title and the plot; and nothing closes the chart — no source or © line. The y title is the field name, since the theme cannot supply “Number of people”.',
    },
    {
      id: 'source-copyright',
      addressed: { stage: 'S1', note: '“Source: …” then “© UNHCR, The UN Refugee Agency” on the next line (`credit.placement: "nextLine"`). The optional Note line stays open.' },
      title: '“Source:” and “© UNHCR” lines under every chart',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: 'Bottom-left, 7pt 55% grey: an optional “Note:” line, then “Source: …”, then “© UNHCR, The UN Refugee Agency” (copyright recommended on web charts). The copyright line is the house’s only brand mark.',
      current: 'The chart spec has no source or note slot, and ThemeSpec has no fixed house line (the © line is the same on every chart, so it belongs in the theme, not the chart).',
      expected: 'The bar-chart specimen (p23) with its two footer lines.',
      proposal: '`chart_spec.source` / `chart_spec.notes[]` drawn in `type.footnote`; a theme-level `furniture: { kind: "credit", text: "© UNHCR, The UN Refugee Agency", anchor: "bottomLeft" }` appended after the source.',
      flint: originFlint(),
      expectedSpec: originExpected(false),
      observed: 'Flint draws the bar specimen closely — black category baseline, vertical gridlines only, labels right-aligned — and stops at the x-axis title. The expected panel’s two grey lines (“Source: UNHCR Refugee Data Finder”, “© UNHCR, The UN Refugee Agency”) have no counterpart. Flint’s blue header rule also appears under the title, which the specimen does not have.',
    },
    {
      id: 'labels-replace-axis',
      addressed: { stage: 'L6', note: '“People (million)” now sits in the deck under the headline, as the guide places it, rather than under the bars. The fixed decimals (2.60) stay open.' },
      title: 'Data labels or gridlines — never both',
      kind: 'realization',
      severity: 'medium',
      probe: 'labels-replace-axis',
      rule: '“We should never use axis labels/gridlines together with data labels.” The labelled specimen drops the value axis and its gridlines, prints two-decimal values just past each bar, and moves the unit to a grey line under the title.',
      current: 'The theme states `structure.axis.measure.suppressWhenValuesPrinted: true`; the chart turns labels on with `showTextLabels`.',
      expected: 'Labels at the bar ends, no value axis or gridlines, “Number of people (million)” under the title.',
      proposal: 'When the measure axis is suppressed, its title should move to the deck (the unit is still needed) and the measure grid should go with it.',
      flint: originFlint({ showTextLabels: true }),
      expectedSpec: originExpected(true),
      observed: 'Flint honours the rule better than expected: with labels on, the value axis and its gridlines are gone. Two things are left wrong: the axis title “People (million)” is still drawn, alone, under the bars with no axis to name, instead of moving up to the deck; and the labels drop trailing zeros (“2.6”, “1.1”) where the guide prints fixed decimals (2.60, 1.10).',
    },
    {
      id: 'population-type-colours',
      addressed: { stage: 'R8', note: 'The charts annotate the field with the population-type colours (`semantic_types[…].colors`) — a fact about the data, not the theme.' },
      title: 'Each UNHCR population type always has the same colour',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'semantic-category-colors',
      rule: '“Certain category groupings are consistently represented using specific, predefined colour palettes”: Refugees blue, IDPs green, Asylum-seekers cyan, Other people in need of international protection red, Stateless yellow, Others of concern grey; regions and gender have fixed colours too.',
      current: 'ThemeSpec only has an ordered `categorical` list, so colour follows the order the data happens to arrive in: here IDPs (the first row) take blue and Refugees take yellow.',
      expected: 'Refugees blue, IDPs green, Stateless yellow, Asylum-seekers cyan, Venezuelans displaced abroad red — whatever order the rows come in.',
      proposal: '`ink.series.byValue: { "Refugees": "#0072BC", "IDPs": "#32C189", … }` (or named vocabularies, `ink.series.vocabularies.populationType`) consulted before the indexed palette.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POP_TYPES,
        semantic_types: { 'Population type': POPULATION_TYPE, 'People (million)': { semanticType: 'Quantity', unit: 'million' } },
        encodings: { y: 'Population type', x: 'People (million)', color: 'Population type' },
        title: 'Forcibly displaced people worldwide | 2020',
      }),
      expectedSpec: typesExpected(),
      observed: 'Flint colours by row order: IDPs blue, Refugees yellow, Stateless green, Asylum-seekers cyan — three of five wrong against the guide’s fixed mapping. It also adds a colour key on the right that repeats the axis labels (`legend.suppressWhenAxisNames` is set, yet the key stays).',
    },
    {
      id: 'top-bar-figure',
      addressed: { stage: 'F1', note: 'The top bar is a rule on the canvas edge (F1); “Figure 1” is the chart’s `label`, set in `type.kicker` (F2).' },
      title: 'Blue top bar and “Figure 1” above the title',
      kind: 'realization',
      severity: 'low',
      probe: 'brand-rule',
      rule: 'Optional “Top bar”: a 0.5pt UNHCR-blue rule across the top of the figure, then an optional “Figure 1” in 9pt UNHCR blue, then the title.',
      current: 'Stated as `furniture: [{ kind: "headerRule", color: "#0072BC" }]`. Flint draws a header rule between the title block and the plot, not across the top; there is no slot for the figure number.',
      expected: 'A thin blue rule closing the top of the figure, “Figure 1” in blue under it, then the title block.',
      proposal: '`furniture.headerRule.edge: "chartTop" | "belowTitle"`, and `chart_spec.label` (“Figure 1”) with a `type.kicker` role.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: ORIGIN.slice(0, 6),
        semantic_types: { Country: 'Country', 'People (million)': { semanticType: 'Quantity', unit: 'million' } },
        encodings: { y: 'Country', x: 'People (million)' },
        title: ORIGIN_TITLE,
      }),
      expectedSpec: (() => {
        const rows = ORIGIN.slice(0, 6);
        const spec = unhcrTitled({
          data: { values: rows },
          mark: { type: 'bar', color: BLUE },
          encoding: {
            y: { field: 'Country', type: 'nominal', sort: null, title: null, axis: { domain: true, domainColor: '#000', zindex: 1 } },
            x: { field: 'People (million)', type: 'quantitative', axis: { grid: true, domain: false, tickCount: 7, title: 'Number of people (million)', titleColor: '#737373' } },
          },
        }, { title: ORIGIN_TITLE, height: 150 });
        return spec;
      })(),
      expectedFrame: { headerHtml: topBar },
      observed: 'Flint’s blue rule runs under the headline, across the plot width only; no “Figure 1”. The expected panel has the rule at the very top edge, “Figure 1” in blue beneath it, then the title.',
    },
    {
      id: 'series-text-ink',
      addressed: { stage: 'R4', note: 'Labels in a series’ colour use the stated darker variant (`categoricalText`).' },
      title: 'Labels written in a series’ colour use its darker AAA variant',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'series-text-ink',
      rule: 'Every data colour has an AAA-contrast text colour (blue `#05568B`, green `#1F5741`, cyan `#0B5269`, yellow `#684D0B` …) used when a label is set in the series’ colour, e.g. the “IDPs” and “Refugees” line-end labels.',
      current: 'ThemeSpec has one ink per series; a direct label in the series colour uses the fill colour itself, which for yellow `#FFC740` or cyan `#6CD8FD` on white fails contrast.',
      expected: 'Lines in blue, yellow, green and cyan; their end labels in `#05568B`, `#684D0B`, `#1F5741`, `#0B5269`, all legible on white.',
      proposal: '`ink.series.categoricalText: [...]` parallel to `categorical`, used by direct labels, end labels and value labels in `matchSeries` mode.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Electric cars took off in Norway first | 2018-2023',
      }),
      expectedSpec: evExpected(),
      observed: 'In Flint the “China” label is yellow on white and “United States” pale cyan — both barely legible; Norway and Germany are in their fill colours. The expected labels are the AAA variants (dark brown-yellow, dark teal), readable while still matching their lines. The same yellow “Gas” and “China” labels appear in the gallery’s area and line tiles.',
    },
    {
      id: 'pie-labels',
      title: 'Pie and donut slices labelled with their percentages',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'pie-rules',
      rule: 'Pies and donuts are accepted for part-to-whole; the guide’s examples label each slice with its name and percentage beside it rather than a key, and start with UNHCR blue for the largest slice.',
      current: 'Flint draws the pie with the house palette and a top key; nothing in ThemeSpec asks for labels beside the slices (`dataLabels.show` is `never` because bars and lines want axes, and it cannot vary by chart type except through `chartDefaults`).',
      expected: 'Slices sorted largest first from 12 o’clock, each named with its share outside the rim, no key.',
      proposal: 'A `variants` guard on `isPartToWhole` that may set `dataLabels` (it can today) plus a label placement `outsideRim` that names the category as well as the value.',
      flint: pieProbe(theme, t).flint,
      expectedSpec: pieExpected(),
      observed: 'Flint draws the pie with a top key and no labels on the slices; the expected panel names each slice with its share beside the rim, largest first from 12 o’clock, and needs no key.',
    },
    {
      id: 'footer-copyright-brand',
      title: 'No logo — the © line is the brand',
      kind: 'chart-spec',
      severity: 'low',
      probe: 'brand-mark',
      rule: 'No logo image on charts; brand attribution is the “© UNHCR, The UN Refugee Agency” line, recommended on every web chart.',
      current: 'No furniture kind carries fixed text; each chart would have to repeat the line in a source slot Flint does not have.',
      expected: 'The © line under the source on every chart (see the source gap).',
      proposal: 'A text furniture kind (`credit`) stated once in the theme.',
    },
  ],
};

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(unhcr, 'UNHCR Refugee Data Finder', ['source-copyright']);

export default unhcr;
