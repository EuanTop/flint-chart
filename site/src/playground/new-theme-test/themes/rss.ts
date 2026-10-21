import type { ThemeSpec } from 'flint-chart';
import research from '../research/rss.json';
import { EV_SHARE, flintInput, footerProbe, highlightProbe, inTextLegendProbe, valueLabelProbe, withChartSource } from '../probes';
import { titled, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Source Sans 3', 'Source Sans Pro', sans-serif";
const BLACK = '#000000';
/** ggplot2's axis.text grey30, which theme_significance does not override. */
const TICK = '#4D4D4D';
/** theme_minimal's grid, grey92. */
const GRID = '#EBEBEB';
const GREEN = '#3FA535';
const YELLOW = '#F4C100';
const BLUE = '#009CC4';
const ORANGE = '#F07D00';
const RED = '#E41B12';
const SIGNIF = [GREEN, YELLOW, BLUE, ORANGE];
const SIGNIF_8 = ['#3FA535', '#20551B', '#F9DE7A', '#F4C100', '#009CC4', '#003E4E', '#F7BB7A', '#F07D00'];

const t: HouseTokens = {
  font: FONT,
  text: BLACK,
  muted: TICK,
  grid: GRID,
  gridAxis: 'both',
  axis: null,
  background: '#FFFFFF',
  palette: SIGNIF,
  highlight: '#7A9D7A',
  context: '#AFE1AF',
  titleSize: 18,
  titleWeight: 'bold',
  subtitleSize: 15,
  subtitleColor: BLACK,
  labelSize: 12,
  sourceSize: 13,
  lineWidth: 1.5,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'rss',
  label: 'Royal Statistical Society (Significance)',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: BLACK, secondary: TICK, muted: TICK, inverse: '#FFFFFF' },
    structure: { grid: GRID, axis: TICK, zero: '#B3B3B3' },
    series: {
      single: GREEN,
      categorical: SIGNIF,
      categoricalExtended: SIGNIF_8,
      overflow: '#B3B3B3',
      sequential: { stops: ['#B9DEB6', '#9BD095', '#7CC175', '#5DB355', '#3FA535', '#348A2C', '#2A7024', '#20551B', '#163B13'], space: 'lab' },
      diverging: { stops: [RED, '#EB5751', '#F29490', '#F9D1CF', '#FFFFFF', '#CCEBF3', '#88D0E3', '#43B6D3', BLUE], neutral: '#FFFFFF', space: 'lab', endpointsAgainstSurface: true },
      selection: { signed: 'diverging', partToWhole: 'categorical' },
    },
    accent: '#7A9D7A',
  },
  type: {
    headline: { family: FONT, size: 18, weight: 'bold', case: 'asIs', color: BLACK },
    deck: { family: FONT, size: 15, weight: 'regular', style: 'normal', color: BLACK },
    axisLabel: { family: FONT, size: 12, color: TICK },
    axisTitle: { family: FONT, size: 14, weight: 'regular', color: BLACK },
    keyLabel: { family: FONT, size: 12, color: BLACK },
    valueLabel: { family: FONT, size: 13, weight: 'bold', color: '#FFFFFF' },
    annotation: { family: FONT, size: 12, color: BLACK },
    footnote: { family: FONT, size: 13, color: BLACK },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit' },
      // "Remove the gridlines when bars carry their own values."
      measure: { line: 'omit', ticks: 'omit', suppressWhenValuesPrinted: true },
    },
    // theme_minimal: a fainter minor line halfway between the majors, both ways (GR2).
    grid: { measure: 'quiet', category: 'quiet', style: 'solid', weight: 1, zero: 'omit', minor: 'hairline' },
    frame: 'omit',
    baseline: 'omit',
  },
  marks: {
    bandFraction: 0.9,
    strokeWeight: 1.5,
    cornerRadius: 0,
    interpolation: 'linear',
    redundantEncoding: 'always',
    redundantChannels: ['shape'],
  },
  geometry: { band: { fraction: 0.9, cornerRadius: 0 }, line: { width: 1.5 }, point: { presence: 'omit', fill: 'solid' } },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['seriesEnd', 'bottom'], direction: 'horizontal', title: 'always', titlePosition: 'inline', align: 'center' },
  dataLabels: { show: 'never', placement: 'atMark', inkMode: 'contrastWithMark' },
  annotation: { axisTitles: 'always', axisTitlePlacement: 'rotated', unitsInAxisTitle: true, unit: 'never', numberFormat: { precision: 'integer' } },
  layout: { titleBlock: { anchor: 'start', gap: 'tight', deckGap: 'tight' }, density: 'normal' },
  // The source line, as the guide sets it (S1); the chart gives the words.
  source: {},
};

const EV_2023 = EV_SHARE.filter((row) => row.Year === 2023).map(({ Country, 'EV share (%)': v }) => ({ Country, 'EV share (%)': v }));
const SIG_TITLE = 'Norway Leads on Electric Cars';
const SIG_SUBTITLE = 'Nine in ten new cars sold in Norway in 2023 were electric.';

function signatureExpected() {
  const countries = EV_2023.map((row) => row.Country);
  return titled(t, {
    data: { values: EV_2023 },
    mark: { type: 'bar' },
    encoding: {
      x: { field: 'Country', type: 'nominal', sort: null, title: 'Country', scale: { paddingInner: 0.1, paddingOuter: 0.15 }, axis: { labelAngle: 0, grid: true, gridColor: GRID, titleColor: BLACK, titleFontSize: 14, labelColor: TICK, labelPadding: 4 } },
      y: { field: 'EV share (%)', type: 'quantitative', title: 'EV share (%)', axis: { titleColor: BLACK, titleFontSize: 14, labelPadding: 4, values: [0, 25, 50, 75, 100] }, scale: { domain: [0, 100] } },
      color: {
        field: 'Country', type: 'nominal', sort: countries, scale: { domain: countries, range: SIGNIF },
        legend: { orient: 'bottom', direction: 'horizontal', title: 'Country', titleOrient: 'left', titleFontWeight: 'normal', titleFontSize: 14, titleColor: BLACK, labelFontSize: 12, symbolType: 'square', symbolSize: 200, symbolStrokeWidth: 0, columnPadding: 14, offset: 10 },
      },
    },
  }, { title: SIG_TITLE, subtitle: SIG_SUBTITLE });
}

// Minor gridlines halfway between the majors, as theme_minimal draws them.
function withMinorGrid(spec: Record<string, unknown>) {
  // plot.title.position = "plot": the title starts at the plot's outer edge, not the panel's.
  const config = spec.config as Record<string, Record<string, unknown>>;
  spec.config = { ...config, title: { ...config.title, frame: 'bounds' } };
  const views = spec.vconcat as Record<string, unknown>[];
  const inner = views[0];
  const minor = { data: { values: [12.5, 37.5, 62.5, 87.5].map((v) => ({ v })) }, mark: { type: 'rule', color: '#F0F0F0', strokeWidth: 1 }, encoding: { y: { field: 'v', type: 'quantitative' } } };
  const { data, mark, encoding, ...rest } = inner as Record<string, unknown>;
  views[0] = { ...rest, layer: [minor, { data, mark, encoding }] };
  return spec;
}

const sigFlint = flintInput(theme, {
  chartType: 'Bar Chart',
  data: EV_2023,
  semantic_types: { Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
  encodings: { x: 'Country', y: 'EV share (%)', color: 'Country' },
  title: SIG_TITLE,
  subtitle: SIG_SUBTITLE,
});

/** The value-label probe, with the guide's bold white numbers at the bar ends. */
function boldInsideLabels() {
  const probe = valueLabelProbe(theme, t, { placement: 'inside', color: '#FFFFFF', hideAxis: true });
  const spec = probe.expectedSpec as { layer: Record<string, any>[]; config: Record<string, any> };
  const [bars, text] = spec.layer;
  return {
    ...probe,
    expectedSpec: {
      ...spec,
      config: { ...spec.config, axisY: { ...spec.config.axisY, grid: false }, axisX: { ...spec.config.axisX, grid: false } },
      layer: [{ ...bars, mark: { ...bars.mark, color: GREEN } }, { ...text, mark: { ...text.mark, fontWeight: 'bold', fontSize: 13 } }],
    },
  };
}

const rss: StyleGuideTheme = {
  id: 'rss',
  org: 'Royal Statistical Society — Best Practices for Data Visualisation',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from `theme_significance()` and `RSSPalettes` in the RSSthemes package, which the guide uses for its own figures. Stated directly: Source Sans 3 (the open successor of Source Sans Pro, loaded on the page) in black; a bold, left-aligned headline and a plain one-sentence deck; ggplot\'s grey30 tick labels at 12px (the guide\'s floor); no axis lines, ticks, frame or baseline; very light grey92 gridlines on both axes (theme_minimal); flat bars filling 90% of their band; the four Significance colours, the eight-colour `signif_qual2` as the extension, a green ramp and a red–white–blue diverging scale; a bottom, centred key with its title inline; series-end labels preferred for lines; shapes as well as colour for groups; bold white value labels, and the value axis dropped when the bars carry their own values (`suppressWhenValuesPrinted`).',
    'Approximated: sizes. theme_significance sets a 13pt base and lets ggplot scale the rest (title ×1.2, ticks ×0.8); the specimen PNG reads at roughly 18 / 15 / 12 / 14px for title, subtitle, ticks and axis titles, which is what is stated. The highlight pair (#7A9D7A on #AFE1AF) is stated as the accent only, since nothing can say which bar takes it.',
    'Not stated: the source caption (no slot); the minor gridlines; the one highlighted element; group names coloured in the deck in place of a key; ratio axes labelled “1/4”; ordered line styles for ordered groups (thickness or dash density stepping with the value — `marks.redundantChannels` can add a shape or dash, but not an ordered one). See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'theme_significance(): bold title left-aligned to the whole plot with a plain sentence beneath; Source Sans; wide flat bars in green, yellow, blue, orange; very light major and minor gridlines on both axes, no axis lines or ticks; a rotated y title and an x title below; the key centred in one row at the bottom with its title inline; a plain “Source: …” caption bottom-left.',
      current: 'Flint states and draws the face, the bold title on the plot’s outer edge, the palette, the light grid on both axes without axis lines or ticks, and the rotated y title. The key is listed as `seriesEnd`, then `bottom`, with an inline title. There is no source slot and no minor grid.',
      expected: 'The RSS `theme_significance()` demo, drawn with 2023 EV shares.',
      flint: sigFlint,
      expectedSpec: withMinorGrid(signatureExpected()),
      expectedFrame: { footerHtml: `<div style="margin:0 14px 10px;font-family:${FONT};font-size:13px;color:${BLACK}">Source: IEA Global EV Outlook 2024</div>` },
      observed: 'Very close in type, colour and grid: Flint’s title and deck start on the plot’s outer edge as `plot.title.position = "plot"` asks. Differences: the key is a right-hand column with “Country” stacked above it, not the centred bottom row with the title inline; there are no minor gridlines; the deck wraps at the narrower plot; no source caption. Expected (right): the demo’s layout — key row under the x title, then “Source: …” flush left.',
    },
    {
      id: 'highlight',
      title: 'Highlight one bar; keep the rest pale',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'highlight',
      rule: '“A better approach is to use colour to highlight a specific element of the data … which focuses the reader’s attention straight to the point”: all bars pale green #AFE1AF, the focus bar darker #7A9D7A.',
      current: 'Nothing in the chart spec can name the focus bar, and ThemeSpec has no emphasis / context pair; every bar takes `ink.series.single`.',
      expected: 'Sorted horizontal bars in pale green, Nigeria in the darker grey-green.',
      proposal: '`chart_spec.emphasis: { field, values }` plus `ink.series.emphasis` / `ink.series.context` (here #7A9D7A / #AFE1AF).',
      ...highlightProbe(theme, t),
      observed: 'Flint: eight bars in the full Significance green, nothing singled out, plus a “Country” title the guide’s version does not carry. Expected: pale #AFE1AF bars with Nigeria in #7A9D7A, as in the guide’s Maserati Bora example.',
    },
    {
      id: 'in-text-legend',
      title: 'Group names coloured in the subtitle instead of a key',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'in-text-legend',
      rule: 'The styled Tooth Growth example drops the key and writes the groups in bold, in their colours, inside the subtitle (“… by one of two delivery methods: **orange juice** or **ascorbic acid**.”).',
      current: 'Titles are plain strings; there is no way to mark words as series names, and the theme can only choose where a key goes (`seriesEnd`, then `bottom`).',
      expected: 'The headline names the series in their own colours, and there is no key.',
      proposal: 'Rich title runs that reference series (`title: ["Electric cars took off in ", { series: "Norway" }, …]`) plus `legend.placement: "inText"` that suppresses the key when every series is named.',
      ...inTextLegendProbe(theme, t, { n: 3 }),
      observed: 'Flint already drops the key here — it labels the three lines at their ends (`seriesEnd`) — so the reader is not lost; but the headline stays black and wraps onto two lines. Expected: “Norway”, “China” and “Germany” in bold green, yellow and blue inside the headline, no labels needed at the line ends.',
    },
    {
      id: 'labels-replace-axis',
      addressed: { stage: 'L6', note: 'With the ruler gone, its title moves into the deck — or goes, where the headline or deck already names the quantity — instead of floating under the bars (L6). The gridlines and the thousands separator stay open.' },
      title: 'Bold white values inside the bar ends; no value axis, no grid',
      kind: 'realization',
      severity: 'medium',
      probe: 'labels-replace-axis',
      rule: '“In bar charts, adding the values for each bar at, or near, the end of each bar” — bold white numbers inside the bar end, with the gridlines and value axis removed.',
      current: 'The chart asks for labels (`showTextLabels`); the theme states bold value labels in the contrasting ink at the mark (`inkMode: "contrastWithMark"`) and `structure.axis.measure.suppressWhenValuesPrinted: true`. Flint honours most of it — see observed — but leaves the gridlines and the measure title behind.',
      expected: 'Bold white numbers inside the bar ends, no value axis, no vertical gridlines.',
      proposal: 'When the measure axis is suppressed, drop its gridlines with it; honour `dataLabels.placement: "atMark"` as inside-end.',
      ...boldInsideLabels(),
      observed: 'Flint gets the bold white numbers inside the bar ends and removes the value ticks. It keeps the vertical gridlines and the “Population (m)” title floating under a ruler that is no longer there, prints “1429” without the thousands separator its other charts use, and drops Bangladesh’s label because it does not fit inside — with no outside fallback. Expected: the same bars, “1,429 … 173”, no gridlines, no axis title.',
    },
    {
      id: 'source-line',
      addressed: { stage: 'S1', note: 'The plain “Source:” caption at the bottom left.' },
      title: 'Plain “Source:” caption at the bottom left',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: '`plot.caption` left-aligned at plot level: “Source: name of data source”.',
      current: 'No chart-spec slot for a source; `type.footnote` is stated but nothing draws it.',
      expected: 'One plain caption line flush with the title’s left edge.',
      proposal: '`chart_spec.source`, drawn in `type.footnote` and aligned with the title block.',
      ...footerProbe(theme, t, { footer: ['Source: UN World Population Prospects 2022'] }),
      observed: 'Flint ends at the x-axis title; nothing names the data source. Expected: “Source: UN World Population Prospects 2022” in plain 13px black under the plot, on the title’s left edge.',
    },
    {
      id: 'legend-bottom',
      title: 'The key leaves the bottom row',
      kind: 'realization',
      severity: 'medium',
      probe: 'legend-placement',
      rule: '`legend.position = "bottom"`: one centred row under the plot, its title inline at the left (“x ■ A ■ B ■ C ■ D”); “Legends should not attract too much attention … placed in the margins of the figure”.',
      current: 'Stated as `legend: { placement: ["seriesEnd", "bottom"], titlePosition: "inline", align: "center" }`. Lines take series-end labels as asked, and grouped bars get the bottom row; but on a coloured column chart, a signed bar chart, a stacked bar and a scatter Flint puts the key on the right — a placement the house never listed — with its title stacked above.',
      expected: 'Every key that survives at the bottom, centred, title inline.',
      proposal: 'Treat `legend.placement` as the complete list of acceptable placements and report (rather than invent) a fallback; apply `titlePosition: "inline"` to every bottom key, including the pie\'s.',
      observed: 'Signature: “Country” key in a right-hand column with the title above. Gallery: right-hand keys on the anomaly, stacked-bar and Gapminder tiles; a bottom row only on the medals tile (inline “Medal ■ Gold …”, as the guide draws it) and on the pie, where the title sits above the row instead of beside it. The EV and stacked-area tiles label their series at the ends, as asked.',
    },
    {
      id: 'label-contrast',
      title: 'Series-end labels in pale palette inks are unreadable',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'value-label-placement',
      rule: '“Ensure good contrast between text and background”; direct labels are preferred to a key.',
      current: 'Series-end labels are drawn in their series’ ink. Past four series the theme reaches into `signif_qual2`, whose pale yellow #F9DE7A and pale orange #F7BB7A are fine as fills but not as text on white.',
      expected: 'End labels darkened to a readable tone of their series colour (or set in black beside a swatch).',
      proposal: 'Have `dataLabels.inkMode: "matchSeries"` (and series-end labels) check text contrast against the canvas and step the ink darker when it fails.',
      observed: 'Gallery, “World electricity generation by source”: “Hydro” and “Nuclear” are written in pale yellow on white and nearly vanish; “Wind & solar” in blue is fine.',
    },
    {
      id: 'label-angle',
      addressed: { stage: 'A1', note: 'No gallery tile turns its labels now (A1).' },
      title: 'Labels turned despite `labels.`',
      kind: 'realization',
      severity: 'medium',
      probe: 'label-angle',
      rule: 'Labels are horizontal (`theme_significance` never turns them; the guide prefers horizontal bars when names are long).',
      current: '`labels.` is stated, and grounding binds it to 0°, but the layout still turns crowded band labels.',
      expected: 'Flat labels, wrapped or thinned where they do not fit.',
      proposal: 'Make `labels.` a hard constraint in the label plan.',
      observed: 'Gallery: decades on the anomaly tile, country names on the stacked-bar tile (overlapping each other) and months on the heatmap are all at −45°.',
    },
    {
      id: 'minor-grid',
      addressed: { stage: 'GR2', note: '`grid.minor: "hairline"` — a fainter line halfway between each pair of majors, both ways (GR2).' },
      title: 'Minor gridlines between the majors',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'gridline-style',
      rule: 'theme_minimal draws major gridlines and fainter minor gridlines halfway between them, on both axes.',
      current: '`structure.grid` has one presence per role and one weight; there is no minor grid.',
      expected: 'See the signature’s expected panel: a fainter line between each pair of majors.',
      proposal: '`structure.grid.minor: Presence` (drawn at half the major weight, one per interval).',
    },
    {
      id: 'ratio-axis',
      title: 'Ratio axes symmetric around 1, labelled as fractions',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'number-format',
      rule: 'Relative changes go on a log axis symmetric around 1, with a reference line at 1 and tick labels “1/4, 1/2, 1, 2, 4” rather than 0.25 / 0.5.',
      current: '`annotation.numberFormat` covers precision, sign and thousands; there is no fraction format, and the zero/no-change rule (`structure.grid.zero`) only knows zero.',
      expected: 'A log ratio axis with fraction labels and a rule at 1.',
      proposal: '`annotation.numberFormat.ratio: "fraction"` and `structure.grid.reference: { at: "noChange" }` resolved from the measure (0 for differences, 1 for ratios).',
    },
  ],
};

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(rss, 'United Nations', ['source-line']);

export default rss;
