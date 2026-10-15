import type { ThemeSpec } from 'flint-chart';
import research from '../research/catalyst-california.json';
import { EV_SHARE, flintInput, footerProbe } from '../probes';
import { footerHtml, houseConfig, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

// The guide names no typeface; its examples and body are set in an Inter-like grotesque.
const FONT = 'Inter, Arial, sans-serif';
const PURPLE = '#3a207d';
const GREY = '#dedede';
const ORANGE = '#f25922';
const CANVAS = '#fafafa';
const LABEL = '#595959';

const t: HouseTokens = {
  font: FONT,
  text: '#000000',
  muted: LABEL,
  grid: '#e4e4e4',
  axis: null,
  background: CANVAS,
  palette: [PURPLE, '#7a7a7a', '#b5b5b5', GREY],
  highlight: PURPLE,
  context: GREY,
  titleSize: 20,
  titleWeight: 800,
  subtitleSize: 12,
  subtitleWeight: 'bold',
  subtitleColor: '#000000',
  labelSize: 11,
  sourceSize: 9,
  gridAxis: 'x',
};

const theme: ThemeSpec = {
  id: 'catalyst-california',
  label: 'Catalyst California',
  ink: {
    surface: { source: 'house', canvas: CANVAS },
    text: { primary: '#000000', secondary: '#000000', muted: LABEL, inverse: '#ffffff' },
    structure: { grid: '#e4e4e4', axis: '#bdbdbd', rule: '#bdbdbd' },
    series: {
      single: PURPLE,
      // "Start with a grayscale graph, then use color to emphasize": the one colour, then greys.
      categorical: [PURPLE, '#7a7a7a', '#b5b5b5', GREY],
      categoricalExtended: [PURPLE, '#7a7a7a', '#b5b5b5', GREY, '#4a4a4a', '#9a9a9a'],
      overflow: GREY,
      sequential: { stops: ['#ece8f6', '#c4b8e2', '#8f78c5', '#5c3fa0', PURPLE], space: 'lab' },
      diverging: { stops: [ORANGE, '#f9a983', '#f2f2f2', '#9a88c8', PURPLE], neutral: '#f2f2f2', space: 'lab' },
    },
    accent: ORANGE,
  },
  type: {
    headline: { family: FONT, size: 20, weight: 'bold', case: 'asIs', color: '#000000' },
    deck: { family: FONT, size: 12, weight: 'bold', color: '#000000' },
    axisLabel: { family: FONT, size: 11, color: LABEL },
    axisTitle: { family: FONT, size: 11, color: LABEL },
    keyLabel: { family: FONT, size: 11, color: '#000000' },
    valueLabel: { family: FONT, size: 11, weight: 'bold', color: PURPLE },
    annotation: { family: FONT, size: 11, color: '#000000' },
    footnote: { family: FONT, size: 9, color: LABEL },
  },
  structure: {
    axis: {
      measure: { line: 'omit', ticks: 'omit' },
      categorical: { line: 'omit', ticks: 'omit' },
    },
    grid: { measure: 'hairline', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'omit',
  },
  marks: { bandFraction: 0.55, cornerRadius: 0 },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['seriesEnd', 'inline', 'top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start', suppressWhenAxisNames: true },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'omit', unit: 'never' },
  layout: { titleBlock: { anchor: 'start', gap: 'tight', deckGap: 'tight' } },
};

const BIPOC = [['Black', 59], ['NHPI', 57], ['Latinx', 56], ['Asian', 53], ['AIAN', 42], ['Multiracial', 39], ['White', 35]]
  .map(([Race, Percent]) => ({ Race, Percent }));
const STOPS = [['Black', 40], ['AIAN', 12], ['NHPI', 12], ['Latinx', 8], ['White', 7], ['SWANA/SA', 2], ['Asian', 1], ['Multiracial', 1]]
  .map(([Race, Rate]) => ({ Race, Rate }));

const SIG_TITLE = 'BIPOC people do not feel LA City Council takes action on their needs compared to White people.';
const SIG_DECK = 'Percent of people by race who feel LA City Council does not take action on their needs';
const NOTES: [string, string][] = [
  ['', 'Survey Question: How well does LA City Council take action to respond to your needs? (n=380)'],
  ['', 'Race/ethnicity: AIAN=American Indian or Alaska Native, NHPI=Native Hawaiian or Pacific Islander. Rates for people who identified their racial group as MENA or Other are not displayed because the data is unstable.'],
  ['', 'Catalyst California’s calculations based on O.U.R. LA Coalition, “Representation in LA City” Survey, March 2023.'],
];
const STOPS_TITLE = 'SDPD disproportionately targets Black people as gang members';
const STOPS_LINES = ['SDPD disproportionately targets', 'Black people as gang members'];
const STOPS_DECK_LINES = ['People stopped for field interview cards per', '1k people of the same race'];
const STOPS_DECK = 'People stopped for field interview cards per 1k people of the same race';
const ABBREV = 'AIAN=American Indian/Alaska Native, SWANA/SA=Southwest Asian, North African/South Asian';

const config = () => {
  const c = houseConfig(t);
  return {
    ...c,
    title: { ...(c.title as object), lineHeight: 24, subtitlePadding: 6, offset: 12 },
    axis: { ...(c.axis as object), labelColor: LABEL, labelFontSize: 12 },
  };
};

/** Page 12 specimen: deep-purple horizontal bars sorted high to low, faint vertical gridlines, grey row labels, notes underneath. */
function signature() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config(),
    title: { text: ['BIPOC people do not feel LA City Council takes', 'action on their needs compared to White people.'], subtitle: ['Percent of people by race who feel LA City Council', 'does not take action on their needs'] },
    width: 500,
    height: 200,
    data: { values: BIPOC },
    mark: { type: 'bar', color: PURPLE, height: { band: 0.5 } },
    encoding: {
      y: { field: 'Race', type: 'nominal', sort: null, title: null, axis: { domain: false, ticks: false, labelPadding: 8 } },
      x: { field: 'Percent', type: 'quantitative', title: null, scale: { domain: [0, 60] }, axis: { values: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60], grid: true, domain: false, ticks: false } },
    },
  };
}

const stopsBars = (color: unknown, extra: Record<string, unknown>[] = []) => ({
  data: { values: STOPS },
  layer: [
    {
      mark: { type: 'bar', width: { band: 0.85 } },
      encoding: {
        x: { field: 'Race', type: 'nominal', sort: null, title: null, axis: { labelAngle: -45, labelAlign: 'right', domain: false, ticks: false, labelFontSize: 11 } },
        y: { field: 'Rate', type: 'quantitative', title: null, scale: { domain: [0, 40] }, axis: { values: [0, 10, 20, 30, 40], grid: true, gridColor: '#ececec', domain: false, ticks: false, labelFontSize: 11 } },
        color,
      },
    },
    ...extra,
  ],
});

const highlight = { condition: { test: "datum.Race === 'Black'", value: PURPLE }, value: GREY };

/** The measure written inside the plot, top right, instead of an axis title or a second deck. */
const measureInPlot = {
  data: { values: [{}] },
  mark: { type: 'text', align: 'center', baseline: 'top', fontSize: 10.5, lineHeight: 13, color: '#333333', font: FONT, text: ['Number of people stopped for', 'field interview cards per 1k people', 'of same race'] },
  encoding: { x: { value: 250 }, y: { value: 26 } },
};

function highlightExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config(),
    title: { text: STOPS_LINES, subtitle: STOPS_DECK_LINES },
    width: 360,
    height: 200,
    ...stopsBars(highlight),
  };
}

function measureExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config(),
    title: { text: STOPS_LINES },
    width: 360,
    height: 200,
    ...stopsBars(highlight, [measureInPlot]),
  };
}

/** The social graphic: a grey rounded takeaway panel beside the chart, key numbers in bold purple. */
function takeawayExpected() {
  const lines: { text: string; bold?: boolean; gap?: number }[] = [
    { text: 'SDPD interrogates' },
    { text: 'Black people for field' },
    { text: 'interview cards' },
    { text: '5 times more', bold: true },
    { text: 'than White', bold: true },
    { text: 'people.', bold: true },
    { text: 'Southeast San Diego', gap: 16 },
    { text: 'has the' },
    { text: 'second highest', bold: true },
    { text: 'rate', bold: true },
    { text: 'of field interview' },
    { text: 'card stops in the city' },
  ];
  let y = 16;
  const rows = lines.map((line) => {
    y += (line.gap ?? 0) + (line.bold ? 19 : 17);
    return { ...line, y };
  });
  const text = (bold: boolean) => ({
    transform: [{ filter: bold ? 'datum.bold' : '!datum.bold' }],
    mark: { type: 'text', align: 'left', baseline: 'alphabetic', font: FONT, fontSize: bold ? 15 : 13, fontWeight: bold ? 'bold' : 'normal', color: bold ? PURPLE : '#000000' },
    encoding: {
      x: { value: 14 },
      y: { field: 'y', type: 'quantitative', scale: { domain: [0, 260], range: [0, 260] }, axis: null },
      text: { field: 'text' },
    },
  });
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config(),
    title: { text: STOPS_LINES, subtitle: STOPS_DECK_LINES },
    hconcat: [
      { width: 170, height: 260, view: { fill: GREY, cornerRadius: 14, stroke: null }, data: { values: rows }, layer: [text(false), text(true)] },
      { width: 280, height: 260, ...stopsBars(highlight) },
    ],
    spacing: 16,
  };
}

/** The headline set in three weights, the key phrase large, bold and purple. */
const emphasisHeader = `<div style="font-family:${FONT};color:#000;margin:0 14px 10px;line-height:1.15">`
  + '<div style="font-size:21px;font-weight:400">SDPD disproportionately</div>'
  + `<div style="font-size:27px;font-weight:800;color:${PURPLE}">targets Black people</div>`
  + '<div style="font-size:21px;font-weight:400">as gang members</div></div>';

function emphasisExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config(),
    width: 360,
    height: 200,
    ...stopsBars(highlight),
  };
}

const EV = (EV_SHARE as { Year: number; Country: string; 'EV share (%)': number }[]);

/** Lines named at their ends, the names in an ink that reads on the canvas even when the line is the context grey. */
function endLabelExpected() {
  const countries = ['Norway', 'China', 'Germany', 'United States'];
  const inks = [PURPLE, '#7a7a7a', '#b5b5b5', GREY];
  const textInks = [PURPLE, '#595959', '#595959', '#595959'];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...config(), legend: { disable: true } },
    title: { text: ['Norway sells more electric cars', 'than anywhere else'], subtitle: 'Share of new cars sold that are electric, %' },
    width: 300,
    height: 210,
    layer: [
      {
        data: { values: EV },
        mark: { type: 'line', strokeWidth: 2 },
        encoding: {
          x: { field: 'Year', type: 'quantitative', axis: { format: 'd', values: [2018, 2020, 2022, 2023], title: null, grid: false }, scale: { domain: [2018, 2023] } },
          y: { field: 'EV share (%)', type: 'quantitative', axis: { title: null, grid: true, tickCount: 5 } },
          color: { field: 'Country', type: 'nominal', scale: { domain: countries, range: inks } },
        },
      },
      {
        data: { values: EV.filter((row) => row.Year === 2023) },
        mark: { type: 'text', align: 'left', dx: 6, fontSize: 11, font: FONT },
        encoding: {
          x: { field: 'Year', type: 'quantitative' },
          y: { field: 'EV share (%)', type: 'quantitative' },
          text: { field: 'Country' },
          color: { field: 'Country', type: 'nominal', scale: { domain: countries, range: textInks }, legend: null },
        },
      },
    ],
    resolve: { scale: { color: 'independent' } },
  };
}

/** Flint's own all-purple columns, with the deck in the bold the theme asks for. */
function deckExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config(),
    title: { text: STOPS_LINES, subtitle: STOPS_DECK_LINES },
    width: 260,
    height: 200,
    ...stopsBars({ value: PURPLE }),
  };
}

const stopsFlint = (title?: string, subtitle?: string) => flintInput(theme, {
  chartType: 'Bar Chart',
  data: STOPS,
  semantic_types: { Race: 'Category', Rate: { semanticType: 'Quantity', unit: 'per 1k' } },
  encodings: { x: 'Race', y: 'Rate' },
  title,
  subtitle,
});

const catalyst: StyleGuideTheme = {
  id: 'catalyst-california',
  org: 'Catalyst California',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch (no `extends`). The guide (September 2024) is about equity framing and process more than specification: it states no hex values, fonts or sizes. Everything here was measured from its own example charts — Catalyst deep purple `#3a207d` as the one colour, `#dedede` for the rest, black bold headline and bold deck, small grey row labels, faint gridlines parallel to the value axis only, no axis lines or ticks, no legend where labels can do the job, an off-white `#fafafa` canvas.',
    'Approximated: “start with a grayscale graph, then use color to emphasize” has no field, so the categorical set is the purple followed by three greys, and the ramps are built out of the purple (the guide has none). The font is Inter, which the guide’s examples resemble. Axis titles are `omit`, because the guide moves the measure into the deck or the plot.',
    'Not stated (see the gaps): which bar gets the purple, the headline’s key phrase in bold purple, the grey takeaway panel beside a social graphic, the measure written inside the plot, and the notes block (survey question, abbreviations, “Catalyst California’s calculations based on …”) that closes every figure.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Page 12 specimen: a two-line, bold, findings-based headline in people-first language; a smaller bold deck naming the measure; seven thick purple bars sorted high to low; small grey row labels; faint vertical gridlines every 5; no axis title, line or legend; a block of tiny grey notes underneath.',
      current: 'Flint draws the purple bars, faint value gridlines, no axis lines and the gridline rhythm of 5. The deck comes out regular rather than bold (see “The bold deck is drawn in regular weight”), `annotation.axisTitles: "omit"` adds the measure to a deck that already names it, and there is nowhere to put the notes.',
      expected: 'The page 12 chart redrawn.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: BIPOC,
        semantic_types: { Race: 'Category', Percent: { semanticType: 'Percentage', unit: '%' } },
        encodings: { y: 'Race', x: 'Percent' },
        title: SIG_TITLE,
        subtitle: SIG_DECK,
        baseSize: { width: 500, height: 220 },
      }),
      expectedSpec: signature(),
      expectedFrame: { footerHtml: footerHtml(t, NOTES, { size: 8.5, color: LABEL }) },
      observed: 'Close in shape: the same purple bars, grey row labels, faint vertical gridlines every 5 and no axis line. Flint’s deck is regular weight and ends “…; Percent (%)”, repeating the measure the deck already names; its bars are thicker than the specimen’s; and nothing closes the chart — the expected panel’s three lines of survey question, abbreviations and “Catalyst California’s calculations” have no place in Flint.',
    },
    {
      id: 'highlight-purple',
      title: 'Grey bars, one purple bar for the largest disparity',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'highlight',
      rule: '“Start with a grayscale graph, then use color to emphasize … we often emphasize the largest disparities”; page 13: the Black bar purple, every other bar `#dedede`.',
      current: 'No slot for the subject: every bar takes `ink.series.single` (purple), so nothing stands out.',
      expected: 'Black in purple, the seven other groups in light grey.',
      proposal: '`chart_spec.emphasis: { field: "Race", values: ["Black"] }` with `ink.series.emphasis` / `ink.series.context`; a house whose default is grey could also say `ink.series.single: context`.',
      flint: stopsFlint(STOPS_TITLE, STOPS_DECK),
      expectedSpec: highlightExpected(),
      observed: 'Flint: all eight columns deep purple, so Black’s 40 is only the tallest bar. Expected: Black purple, the rest `#dedede`, the disparity stands out immediately. Both turn the labels −45°, as the guide’s own example does.',
    },
    {
      id: 'headline-emphasis',
      title: 'The headline’s key phrase in bold purple',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'headline-emphasis',
      rule: 'Social graphics set the finding’s key phrase in a heavier weight and the highlight colour: “SDPD disproportionately / **targets Black people** / as gang members”.',
      current: 'The title is one string drawn in one `type.headline` style; neither spec can mark a span of it.',
      expected: 'Three lines, the middle one larger, extra bold and purple.',
      proposal: 'Allow a marked-up title (`title: "SDPD disproportionately **targets Black people** as gang members"`) and a `type.headlineEmphasis` role (weight, colour, size step) in the theme.',
      flint: stopsFlint(STOPS_TITLE),
      expectedSpec: emphasisExpected(),
      expectedFrame: { headerHtml: emphasisHeader, style: { background: CANVAS, paddingTop: '12px' } },
      observed: 'Flint: a two-line bold headline in one style, plus a deck it invents from the axis (“Rate (per 1k)”). Expected: three lines with “targets Black people” larger, extra-bold and purple.',
    },
    {
      id: 'takeaway-panel',
      title: 'A grey takeaway panel beside the chart',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'annotation',
      rule: 'The social graphic pairs the chart with a rounded light-grey (`#dedede`) panel of plain-language takeaways, key numbers in bold purple (“5 times more than White people”, “second highest rate”).',
      current: 'Neither spec has a slot for prose beside the plot; Flint draws the chart alone.',
      expected: 'Panel left, chart right, sharing the headline.',
      proposal: '`chart_spec.takeaways: [{ text, emphasis }]` and a theme block `annotation.takeawayPanel: { placement: "left" | "right" | "below", fill, radius }`.',
      flint: stopsFlint(STOPS_TITLE, STOPS_DECK),
      expectedSpec: takeawayExpected(),
      observed: 'Flint: the chart alone, with the measure appended to the deck. Expected: a rounded `#dedede` panel of takeaways at the left, “5 times more than White people” and “second highest rate” in bold purple, the grey-and-purple chart beside it.',
    },
    {
      id: 'measure-in-plot',
      title: 'The measure written inside the plot, not on an axis',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'axis-title-relocation',
      rule: 'Page 13: no axis titles; the measure (“Number of people stopped for field interview cards per 1k people of same race”) is a short centred text block in the empty upper part of the plot.',
      current: '`annotation.axisTitles` can keep a title on its axis or `omit` it to the deck; there is no third place. With no deck written, Flint invents one from the axis name.',
      expected: 'Headline alone above the chart; the measure as a text block in the plot’s empty top right.',
      proposal: '`annotation.axisTitlePlacement: "inPlot"` — placed in the largest empty region of the plot, which layout already measures for value labels.',
      flint: stopsFlint(STOPS_TITLE),
      expectedSpec: measureExpected(),
      observed: 'Flint writes “Rate (per 1k)” as a deck under the headline. Expected: no deck; the measure is a centred three-line note in the empty space above the short bars.',
    },
    {
      id: 'notes-block',
      title: 'Survey question, abbreviations and “Catalyst California’s calculations” under every chart',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: 'Below the chart, in small grey text: the survey question with n, notes on unstable estimates, definitions of AIAN/NHPI/SWANA, then “Catalyst California’s calculations based on …”; the guide also asks to name who the data leaves out.',
      current: 'The chart spec has no source or notes slot; `type.footnote` is stated but nothing draws it.',
      expected: 'Three lines of 9px grey notes under the plot.',
      proposal: '`chart_spec.notes[]` and `chart_spec.source`, drawn in `type.footnote` in that order.',
      ...footerProbe(theme, t, {
        footer: ['Rates are per 1,000 residents of each country.', 'Catalyst California’s calculations based on UN World Population Prospects 2022.'],
      }),
      observed: 'Flint ends at the x axis; its deck reads “Population, millions, 2023; Population (m)”. Expected: two lines of small grey notes under the plot, ending with “Catalyst California’s calculations based on …”.',
    },
    {
      id: 'deck-weight',
      addressed: { stage: 'T1', note: 'The deck’s stated weight is now written (`subtitleFontWeight`).' },
      title: 'The bold deck is drawn in regular weight',
      kind: 'realization',
      severity: 'medium',
      probe: 'type-weight-scale',
      rule: 'Under the headline, a smaller **bold** line states the measure (“Percent of people by race who …”); the two lines differ in size, not in weight.',
      current: 'Stated as `type.deck.weight: "bold"`. The Vega-Lite realisation copies the deck’s font, size, style and colour into the title config but never sets `subtitleFontWeight`, so every deck is regular.',
      expected: 'The same chart with the deck in bold.',
      proposal: 'Emit `subtitleFontWeight` from `type.deck.weight` alongside `subtitleFontStyle`.',
      flint: stopsFlint(STOPS_TITLE, STOPS_DECK),
      expectedSpec: deckExpected(),
      observed: 'The only difference between the panels is the deck: regular in Flint, bold in the expected panel (and Flint appends “; Rate (per 1k)”).',
    },
    {
      id: 'grey-label-ink',
      title: 'Labels in the context grey disappear on the canvas',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'label-ink-contrast',
      rule: 'Grey is for context, but every label must stay legible (“consider colours visible to people who are colour-blind”; plain, accessible text); in the guide’s grey charts the category labels stay dark grey whatever the bar ink.',
      current: 'With a grayscale-plus-one categorical set, Flint prints series-end labels and key entries in the series ink itself, so a series in `#dedede` gets a `#dedede` label on the `#fafafa` canvas (≈1.3:1). Gallery: “United States” on the EV chart, “Nuclear” on the area chart.',
      expected: 'Lines may be pale; their names are drawn in a text ink (here `#595959`) that clears 4.5:1.',
      proposal: 'Derive label ink from the series ink but clamp it to `ink.text.muted` (or darken in Lab) when it fails contrast against the surface; report the substitution.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway sells more electric cars than anywhere else',
        subtitle: 'Share of new cars sold that are electric, %',
      }),
      expectedSpec: endLabelExpected(),
      observed: 'Flint names each line at its end in its own ink: “United States” in `#dedede` is nearly invisible, “Germany” in `#b5b5b5` faint. Expected: the same pale lines, every name in `#595959` except the purple Norway.',
    },
    {
      id: 'download-static',
      title: 'Interactive charts offer a static download',
      kind: 'product-ui',
      severity: 'low',
      probe: 'card-container',
      rule: 'RACE COUNTS example: the interactive chart has a download button (top right) that saves a static version for social media, “because a static graph with plain text is more shareable”.',
      current: 'Flint renders the chart; any download control belongs to the host and the theme cannot ask for one.',
      expected: 'A small download icon at the chart’s top right edge.',
      proposal: 'A host-level `chrome.actions: ["download"]` the theme may default, outside the chart spec.',
    },
  ],
};

export default catalyst;
