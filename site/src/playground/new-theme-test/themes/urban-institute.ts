import type { ThemeSpec } from 'flint-chart';
import research from '../research/urban-institute.json';
import { EV_SHARE, flintInput, highlightProbe, paletteCountProbe, valueLabelProbe, withChartSource } from '../probes';
import { footerHtml, houseConfig, W, H as HEIGHT, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = 'Lato, Arial, sans-serif';
const CYAN = '#1696D2';
const YELLOW = '#FDBF11';

const t: HouseTokens = {
  font: FONT,
  text: '#000000',
  muted: '#000000',
  grid: '#DEDDDD',
  axis: '#000000',
  background: '#FFFFFF',
  palette: [CYAN, '#000000', '#D2D2D2', YELLOW, '#EC008B', '#55B748'],
  highlight: YELLOW,
  context: CYAN,
  titleSize: 20,
  titleWeight: 900,
  subtitleSize: 16,
  subtitleStyle: 'italic',
  subtitleColor: '#000000',
  labelSize: 12,
  sourceSize: 11,
};

const theme: ThemeSpec = {
  id: 'urban-institute',
  label: 'Urban Institute',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: '#000000', secondary: '#000000', muted: '#5C5859' },
    structure: { grid: '#DEDDDD', axis: '#000000' },
    series: {
      single: CYAN,
      // The guide's per-count sets agree up to five groups: cyan, black, grey, yellow, magenta.
      categorical: [CYAN, '#000000', '#D2D2D2', YELLOW, '#EC008B', '#55B748'],
      // Six groups take green before magenta (R6).
      categoricalByCount: { 6: [CYAN, '#000000', '#D2D2D2', YELLOW, '#55B748', '#EC008B'] },
      categoricalExtended: [CYAN, '#000000', '#D2D2D2', YELLOW, '#EC008B', '#55B748', '#5C5859', '#DB2B27'],
      sequential: { stops: ['#CFE8F3', '#A2D4EC', '#73BFE2', '#46ABDB', '#1696D2', '#12719E', '#0A4C6A', '#062635'], space: 'lab' },
      diverging: { stops: ['#CA5800', '#FDBF11', '#FDD870', '#FFF2CF', '#CFE8F3', '#73BFE2', '#1696D2', '#0A4C6A'], neutral: '#FFF2CF', space: 'lab' },
    },
    accent: YELLOW,
  },
  type: {
    // FIGURE 1 in ALL CAPS Lato Regular 11px, #0A4B69 (F2).
    kicker: { family: FONT, size: 11, weight: 'regular', case: 'upper', color: '#0A4B69' },
    headline: { family: FONT, size: 20, weight: 'black', case: 'title', color: '#000000' },
    deck: { family: FONT, size: 16, style: 'italic', color: '#000000' },
    axisLabel: { family: FONT, size: 12, color: '#000000' },
    axisTitle: { family: FONT, size: 12, style: 'italic', weight: 'regular', color: '#000000' },
    keyLabel: { family: FONT, size: 14 },
    valueLabel: { family: FONT, size: 12 },
    footnote: { family: FONT, size: 11 },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1, ticks: 'full', tickDirection: 'outward' },
      measure: { line: 'omit', ticks: 'omit' },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: { bandFraction: 0.67, strokeWeight: 2 },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'always', axisTitlePlacement: 'flatAboveAxis' },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' } },
  // The source line, as the guide sets it (S1); the chart gives the words.
  source: { leadInWeight: 'bold', credit: { text: 'URBAN · INSTITUTE', placement: 'end', weight: 'bold' } },
};

const SIGNATURE_TITLE = 'Electric Car Sales Rose Fastest in Norway';
const SIGNATURE_SUBTITLE = 'Share of new cars sold that are electric, 2018–23';

function signature() {
  const rows = EV_SHARE.filter((row) => row.Country === 'Norway' || row.Country === 'China');
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), legend: { ...(houseConfig(t).legend as object), labelFontSize: 14, symbolType: 'stroke', symbolStrokeWidth: 3, symbolSize: 120, offset: 30 } },
    title: { text: SIGNATURE_TITLE, subtitle: SIGNATURE_SUBTITLE },
    width: W,
    height: HEIGHT,
    data: { values: rows },
    mark: { type: 'line', strokeWidth: 2.5 },
    encoding: {
      x: {
        field: 'Year', type: 'quantitative', scale: { domain: [2018, 2023] },
        axis: { format: 'd', values: [2018, 2019, 2020, 2021, 2022, 2023], ticks: true, tickSize: 5, tickColor: '#000', title: 'Year', titleFontStyle: 'italic', titleFontSize: 12, titleColor: '#000' },
      },
      y: {
        field: 'EV share (%)', type: 'quantitative',
        axis: {
          labelAlign: 'left', labelPadding: 26, labelColor: '#000', labelExpr: "datum.label + '%'",
          title: 'Share of sales', titleAngle: 0, titleAlign: 'left', titleAnchor: 'end', titleX: -26, titleY: -12,
          titleFontStyle: 'italic', titleFontSize: 12, titleColor: '#000',
        },
      },
      color: { field: 'Country', type: 'nominal', sort: ['Norway', 'China'], scale: { range: [CYAN, '#000000'] } },
    },
  };
}

const tagline = `<span style="font-family:${FONT};font-weight:700;font-size:9px;letter-spacing:3px"><span style="color:${CYAN}">URBAN</span> · INSTITUTE</span>`;

const urban: StyleGuideTheme = {
  id: 'urban-institute',
  org: 'Urban Institute',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch, without `extends`, to see how much of the house the schema states on its own.',
    'Stated directly: Lato throughout; a 20px headline in title case and a 16px italic deck; cyan as the single-series ink; the per-count palette order the guide gives up to five groups (cyan, black, grey, yellow, magenta); horizontal `#DEDDDD` 1px gridlines only; a black x-axis line with outward ticks; no y-axis line or ticks; a top-left, untitled, horizontal key; and flat axis titles above the axis.',
    'Not stated: the headline weight. The guide asks for Lato Black (900), and `TypeRole.weight` stops at `bold`. Everything else listed under the gaps below.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Every element left-aligned to one edge — title, deck, key, y-axis title, y tick labels, source and notes; key swatches are short lines for line charts; italic axis titles, the y one flat above the labels; “Source:”/“Notes:” in bold at the bottom left; the URBAN · INSTITUTE tagline at the bottom right.',
      current: 'Flint left-aligns the title block and the key, and flattens the y title above the axis. Its y tick labels are right-aligned against the plot, so they do not share the title’s left edge; there is no source, notes or tagline.',
      expected: 'The guide’s 2024 web layout specimen applied to the EV chart.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE.filter((row) => row.Country === 'Norway' || row.Country === 'China'),
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: SIGNATURE_TITLE,
        subtitle: SIGNATURE_SUBTITLE,
      }),
      expectedSpec: signature(),
      expectedFrame: {
        footerHtml: footerHtml(t, [['Source:', 'IEA Global EV Outlook.'], ['Notes:', 'Battery-electric and plug-in hybrid cars.']], { right: tagline, color: '#000' }),
      },
      observed: 'Flint matches more than expected: left-aligned title block, italic deck, line swatches in the key, flat “EV share (%)” title above the axis, black x baseline with outward ticks. It differs in three places: tick labels hug the plot instead of the left edge, the 20px headline is broken onto two lines to stay inside the 360px canvas (the guide sets the canvas at 760px and never breaks a short title), and nothing closes the chart — no source, notes or tagline. The flat y title also floats about 25px above the top gridline, detached from the axis it names.',
    },
    {
      id: 'tick-labels-left-edge',
      title: 'Y tick labels left-aligned to the chart’s left edge',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'axis-label-alignment',
      rule: '“Left-align all elements”: in the layout specimen the y tick labels start at the same x as the title and the source.',
      current: 'ThemeSpec has no field for tick-label alignment; Flint right-aligns y labels against the plot, the renderer’s default.',
      expected: 'Labels flush left at the block edge, the gridlines starting after the widest label.',
      proposal: '`structure.axis.measure.labelAlign: "towardPlot" | "blockEdge"`.',
    },
    {
      id: 'source-notes',
      addressed: { stage: 'S1', note: '“Source:” bold at the bottom left, the URBAN · INSTITUTE tagline at the right. The Notes line stays open.' },
      title: '“Source:” and “Notes:” lines with bold lead-ins, tagline at the right',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: 'Source required on every figure: bottom-left, 11px, “Source:” then “Notes:” on the next line with the lead words bold; the URBAN · INSTITUTE tagline bottom-right on web charts.',
      current: 'No chart-spec slot for a source or notes; no furniture kind for a wordmark or tagline.',
      expected: 'See the footer under the signature panel’s expected chart.',
      proposal: '`chart_spec.source` / `chart_spec.notes[]`, rendered with `type.footnote` and a theme rule for the lead-in (`annotation.sourceLabel: { text: "Source:", weight: "bold" }`); a `furniture: { kind: "wordmark", text | svg, anchor }`.',
    },
    {
      id: 'highlight-yellow',
      title: 'One bar highlighted in yellow',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'highlight',
      rule: 'Cyan is the default single-series colour; highlight one category in yellow #FDBF11 (or black for an “Overall” bar).',
      current: 'No way to name the highlighted category; every bar is cyan.',
      expected: 'Nigeria in yellow, the rest cyan.',
      proposal: '`chart_spec.emphasis` + `ink.series.emphasis` / `ink.series.context`.',
      ...highlightProbe(theme, t),
    },
    {
      id: 'labels-replace-axis',
      title: 'Directly labelled bars drop the value axis and its gridlines',
      kind: 'realization',
      severity: 'medium',
      probe: 'labels-replace-axis',
      rule: '“When bars have data labels, omit y-axis labels and gridlines”; labels sit just outside the bar ends.',
      current: 'The chart asks for labels (`showTextLabels`); the theme can state `structure.axis.measure.suppressWhenValuesPrinted` but does not here, because the house rule is conditional on the labels — see whether the axis and grid remain.',
      expected: 'Labels at the bar ends, no value axis, no gridlines.',
      observed: 'Flint prints the labels at the bar ends but keeps the value axis (0–1,500) and its “Population” title under them, and adds a “Country” title over the categories; the numbers are said twice.',
      ...valueLabelProbe(theme, t, { placement: 'outside', hideAxis: true }),
    },
    {
      id: 'count-palette',
      addressed: { stage: 'R6', note: 'The six-group order (green before magenta) is stated as `categoricalByCount[6]`.' },
      title: 'The palette depends on how many groups there are',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'count-palette',
      rule: '2 groups: cyan + black; 3: cyan, black, grey; 4: + yellow; 5: + magenta; 6: cyan, black, grey, yellow, **green**, magenta — green enters before magenta only at six.',
      current: 'One ordered list; the sixth series takes whatever is sixth. Up to five groups the guide’s sets happen to be prefixes of one list, so this theme matches; at six it cannot.',
      expected: 'Two-group charts in cyan and black, as Flint already draws.',
      proposal: '`ink.series.categoricalByCount: { 2: [...], 3: [...], 6: [...] }` (IBM Carbon, Urban and several others publish count-specific sets).',
      ...paletteCountProbe(theme, t, { n: 2, palette: [CYAN, '#000000'] }),
    },
    {
      id: 'figure-number',
      addressed: { stage: 'F2', note: 'The chart’s `label` is set above the title in `type.kicker` (ALL CAPS, #0A4B69).' },
      title: 'Figure number above the title',
      kind: 'chart-spec',
      severity: 'low',
      probe: 'figure-number',
      rule: 'Optional figure number above the title in ALL CAPS Lato Regular 11px, #0A4B69 (“FIGURE 1”).',
      current: 'No slot for a figure label; the only text above the plot is the headline and deck.',
      expected: 'A small caps “FIGURE 1” line in dark blue, then the headline.',
      proposal: '`chart_spec.label` (“Figure 1”) with `type.kicker` in the theme — the same slot newsrooms use for a kicker.',
    },
    {
      id: 'headline-black',
      addressed: { stage: 'T2', note: 'The headline is `weight: "black"` (900).' },
      title: 'Headline weight is Lato Black (900)',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'type-weight-scale',
      rule: 'Title in Lato Black, 20px, title case.',
      current: '`TypeRole.weight` is `regular | medium | semibold | bold`; the heaviest it can ask for is 700.',
      expected: 'A 900-weight headline.',
      proposal: 'Accept numeric weights (100–900) in `TypeRole.weight`.',
    },
  ],
};

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(urban, 'Urban Institute analysis of Census data', ['source-notes']);

export default urban;

