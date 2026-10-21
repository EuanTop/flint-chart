import type { ThemeSpec } from 'flint-chart';
import research from '../research/trafford.json';
import { flintInput, paletteCountProbe, POPULATION, valueLabelProbe, withChartSource } from '../probes';
import { houseConfig, titled, W, H as HEIGHT, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const ROBOTO = 'Roboto, Arial, sans-serif';
const OPEN = "'Open Sans', Arial, sans-serif";
const GREY = '#757575';
const CAPTION = '#212121';
const ORANGE = '#FC6721';
const GOLD = '#E7B800';
/** ColorBrewer Set2, which the companion names for every multi-category fill. */
const SET2 = ['#66C2A5', '#FC8D62', '#8DA0CB', '#E78AC3', '#A6D854', '#FFD92F', '#E5C494', '#B3B3B3'];

const t: HouseTokens = {
  font: OPEN,
  titleFont: ROBOTO,
  text: GREY,
  muted: GREY,
  grid: GREY,
  gridDash: [1, 3],
  gridWidth: 0.8,
  axis: null,
  background: '#ffffff',
  palette: [ORANGE, GOLD, ...SET2],
  titleSize: 16,
  titleWeight: 'normal',
  subtitleSize: 13,
  subtitleColor: GREY,
  labelSize: 13,
  sourceSize: 13,
  lineWidth: 2,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'trafford',
  label: 'Trafford Data Lab',
  ink: {
    surface: { source: 'host' },
    text: { primary: GREY, secondary: GREY, muted: GREY },
    structure: { grid: GREY, axis: '#FFFFFF' },
    series: {
      single: ORANGE,
      categorical: SET2,
      // Two series are orange and gold; three or more take Set2 (R6).
      categoricalByCount: { 2: [ORANGE, '#E7B800'] },
      sequential: { stops: ['#feedde', '#fdbe85', '#fd8d3c', '#e6550d', '#a63603'], space: 'lab' },
      diverging: { stops: ['#DE2D26', '#f7f7f7', '#31A354'], neutral: '#f7f7f7', space: 'lab' },
      status: { positive: '#31A354', negative: '#DE2D26' },
    },
    accent: ORANGE,
  },
  type: {
    headline: { family: ROBOTO, size: 16, weight: 'regular', case: 'asIs', color: GREY },
    deck: { family: ROBOTO, size: 13, weight: 'regular', color: GREY },
    axisLabel: { family: OPEN, size: 13, color: GREY },
    axisTitle: { family: OPEN, size: 14, weight: 'regular', color: GREY },
    keyLabel: { family: OPEN, size: 13, color: GREY },
    valueLabel: { family: OPEN, size: 12, weight: 'bold', color: GREY },
    footnote: { family: ROBOTO, size: 13, color: CAPTION },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit', tickLabels: 'observed' },
      measure: { line: 'omit', ticks: 'omit', tickDensity: 'sparse', suppressWhenValuesPrinted: true },
    },
    grid: { measure: 'full', category: 'omit', style: 'dotted', dash: [1, 3], weight: 0.8 },
    frame: 'omit',
    baseline: 'omit',
  },
  marks: { bandFraction: 0.9, strokeWeight: 2 },
  geometry: {
    line: { width: 2 },
    point: { presence: 'full', size: 28, fill: 'solid' },
    band: { fraction: 0.9, opacity: 0.8, cornerRadius: 0 },
    area: { opacity: 0.4 },
  },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'center', suppressWhenAxisNames: true },
  dataLabels: { show: 'never', placement: 'outsideMark', inkMode: 'fixed' },
  annotation: { axisTitles: 'whenAmbiguous', axisTitlePlacement: 'rotated', unit: 'never', numberFormat: { thousands: 'separator' } },
  layout: { density: 'airy', titleBlock: { anchor: 'start', gap: 'normal' } },
  // The source line, as the guide sets it (S1); the chart gives the words.
  source: { align: 'end', credit: { text: '@traffordDataLab' } },
};

// ---------------------------------------------------------------------------
// Gapminder specimens from the ggplot2 companion.

const YEARS = [1952, 1957, 1962, 1967, 1972, 1977, 1982, 1987, 1992, 1997, 2002, 2007];
const ARGENTINA = [62.5, 64.4, 65.1, 65.6, 67.1, 68.5, 69.9, 70.8, 71.9, 73.3, 74.3, 75.3];
const ITALY = [65.9, 67.8, 69.2, 71.1, 72.2, 73.5, 75.0, 76.4, 77.4, 78.8, 80.2, 80.5];
const LIFE = [
  ...YEARS.map((Year, i) => ({ Year, Country: 'Argentina', 'Age (years)': ARGENTINA[i] })),
  ...YEARS.map((Year, i) => ({ Year, Country: 'Italy', 'Age (years)': ITALY[i] })),
];
const EGYPT_GDP = [1419, 1459, 1693, 1815, 2024, 2786, 3504, 3886, 3795, 4173, 4755, 5581];
const EGYPT = YEARS.map((Year, i) => ({ Year: String(Year), 'GDP per capita ($)': EGYPT_GDP[i] }));

const SIG_TITLE = 'Life expectancy in Argentina and Italy, 1952-2007';
const CAPTION_TEXT = 'Source: Gapminder.org  |  @traffordDataLab';

const caption = (text = CAPTION_TEXT) =>
  `<div style="text-align:right;margin:6px 14px 8px;font-family:${ROBOTO};font-size:13px;color:${CAPTION};white-space:pre">${text}</div>`;

/** The ggplot y title: rotated, justified to the top end of the axis (`hjust = 1`). */
const topTitle = (title: string) => ({ title, titleAnchor: 'end', titleAlign: 'right', titleAngle: -90, titleColor: GREY, titleFont: OPEN, titleFontSize: 14, titleFontWeight: 'normal', titlePadding: 8 });

const dotted = { gridColor: GREY, gridDash: [1, 3], gridWidth: 0.8 };

function signatureExpected() {
  const x = { field: 'Year', type: 'quantitative', title: null, scale: { domain: [1950, 2009], nice: false }, axis: { values: YEARS, format: 'd', grid: false, domain: false, ticks: false, labelColor: GREY, labelPadding: 8 } };
  const y = { field: 'Age (years)', type: 'quantitative', scale: { domain: [0, 82], nice: false }, axis: { values: [0, 20, 40, 60, 80], grid: true, domain: false, ticks: false, ...dotted, ...topTitle('Age (years)') } };
  const color = { field: 'Country', type: 'nominal', scale: { domain: ['Argentina', 'Italy'], range: [ORANGE, GOLD] } };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), title: { ...(houseConfig(t).title as object), fontWeight: 'normal', offset: 18 }, axis: { ...(houseConfig(t).axis as object), labelFontSize: 11 } },
    title: { text: SIG_TITLE },
    width: W + 20,
    height: HEIGHT,
    data: { values: LIFE },
    mark: { type: 'line', strokeWidth: 2, point: { filled: true, size: 28 } },
    encoding: {
      x, y,
      color: { ...color, legend: { orient: 'bottom', direction: 'horizontal', title: null, symbolType: 'stroke', symbolStrokeWidth: 2, labelFontSize: 12, labelColor: GREY, offset: 18 } },
    },
  };
}

function egyptExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), title: { ...(houseConfig(t).title as object), fontWeight: 'normal' }, axis: { ...(houseConfig(t).axis as object), labelFontSize: 11 } },
    title: { text: 'GDP per capita in Egypt, 1952-2007' },
    width: W,
    height: HEIGHT,
    data: { values: EGYPT },
    mark: { type: 'bar', color: ORANGE, opacity: 0.8 },
    encoding: {
      x: { field: 'Year', type: 'ordinal', title: null, scale: { paddingInner: 0.1, paddingOuter: 0.05 }, axis: { labelAngle: 0, domain: false, ticks: false, labelColor: GREY } },
      y: { field: 'GDP per capita ($)', type: 'quantitative', scale: { nice: false, domain: [0, 5800] }, axis: { values: [0, 1000, 2000, 3000, 4000, 5000], format: '$,.0f', grid: true, domain: false, ticks: false, ...dotted, ...topTitle('GDP per capita ($)') } },
    },
  };
}

const lifeFlint = () => flintInput(theme, {
  chartType: 'Line Chart',
  data: LIFE,
  semantic_types: { Year: 'Year', Country: 'Country', 'Age (years)': { semanticType: 'Quantity', unit: 'years' } },
  encodings: { x: 'Year', y: 'Age (years)', color: 'Country' },
  title: SIG_TITLE,
  baseSize: { width: 380, height: 240 },
});

const labelled = valueLabelProbe(theme, t, { placement: 'outside', color: GREY, hideAxis: true });
for (const layer of ((labelled.expectedSpec?.layer ?? []) as { mark?: Record<string, unknown> }[])) {
  if (layer.mark?.type === 'text') Object.assign(layer.mark, { fontWeight: 'bold', dx: 3 });
  if (layer.mark?.type === 'bar') Object.assign(layer.mark, { color: ORANGE, opacity: 0.8 });
}
if (labelled.expectedSpec) {
  const enc = labelled.expectedSpec.encoding as Record<string, Record<string, unknown>>;
  enc.y = { ...enc.y, axis: { domain: false, ticks: false, labelColor: GREY } };
  labelled.expectedSpec.config = { ...houseConfig(t), title: { ...(houseConfig(t).title as object), fontWeight: 'normal' } };
}

const trafford: StyleGuideTheme = {
  id: 'trafford',
  org: 'Trafford Data Lab',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the Lab’s `theme_lab()` ggplot2 source and its two graphics companions. Sizes are ggplot points, applied here as px on the same ~400px canvas the companion’s 7-inch figures scale to (Roboto 16px heading, Open Sans 13px labels).',
    'Stated directly: everything in mid-grey `#757575` except the dark `#212121` caption; dotted `#757575` gridlines across the value axis only; no axis lines, ticks, baseline or frame; a transparent surface; Lab orange `#FC6721` for one series with bars at 80% opacity and narrow gaps; ColorBrewer Set2 for categories; a plain-weight grey heading (the companion leaves the bold `title` empty and writes the heading as the subtitle, so the theme’s headline is regular, not bold); Roboto for heading, legend and caption, Open Sans for axes; a titleless key at the bottom; rotated y titles; bold grey value labels and no value axis when bars carry their numbers (`suppressWhenValuesPrinted`).',
    'Not stated: the caption — the one dark element, “Source: … | @traffordDataLab”, right-aligned under every chart — has no slot. Nor can the theme say that a two-series chart uses orange and gold rather than the first two Set2 inks, or push a rotated y title to the top end of its axis. See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'A plain grey Roboto heading stating measure, place and years; orange `#FC6721` and gold `#E7B800` lines with a dot at every reading; dotted grey horizontal gridlines and nothing else — no axis lines, no ticks; a rotated “Age (years)” title at the top end of the y axis; a titleless key centred at the bottom; “Source: Gapminder.org | @traffordDataLab” right-aligned in near-black.',
      current: 'Flint draws the grey plain heading, dotted gridlines, no axis lines or ticks, dots on every reading and a centred bottom key without a title. The two lines take the first two Set2 inks (teal and salmon), the y title is centred along the axis, the key shows dots rather than line samples, and there is no caption.',
      expected: 'The companion’s multiple-line specimen.',
      flint: lifeFlint(),
      expectedSpec: signatureExpected(),
      expectedFrame: { footerHtml: caption() },
      observed: 'Very close in structure: same grey plain heading, dotted horizontal grid, no axis lines, dots on every year, bottom key. The visible differences are the teal/salmon pair instead of orange/gold, the y title centred instead of pushed to the top, dot swatches instead of line samples, x ticks every 10 years rather than at each observation, and no caption.',
    },
    {
      id: 'caption',
      addressed: { stage: 'S1', note: '“Source: … | @traffordDataLab” right-aligned (`align: "end"`, an inline credit).' },
      title: 'Caption bottom-right: “Source: … | @traffordDataLab”',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: 'Every chart carries `caption = "Source: Gapminder.org | @traffordDataLab"`, right-aligned (`hjust = 1`), 10pt, `#212121` — the only dark text on the chart, and the Lab’s only branding.',
      current: 'No source slot in the chart spec; `type.footnote` (Roboto, `#212121`) is stated but nothing draws it.',
      expected: 'The caption at the bottom right, darker than everything else.',
      proposal: '`chart_spec.source` plus a theme `annotation.sourceLine: { align: "end", suffix: " | @traffordDataLab" }` so the handle is house furniture, not author text.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: 'Country', x: 'Population' },
        title: 'Population of the most populous countries, 2023',
      }),
      expectedSpec: titled({ ...t, titleWeight: 'normal' }, {
        data: { values: POPULATION },
        mark: { type: 'bar', color: ORANGE, opacity: 0.8 },
        encoding: {
          y: { field: 'Country', type: 'nominal', sort: null, title: null, axis: { domain: false, ticks: false } },
          x: { field: 'Population', type: 'quantitative', title: 'Population (millions)', axis: { grid: true, domain: false, ticks: false, format: ',.0f', values: [0, 500, 1000, 1500], ...dotted, titleFont: OPEN, titleFontSize: 14, titleAnchor: 'end', titleColor: GREY } },
        },
      }, { title: 'Population of the most populous countries, 2023', footer: ['Source: UN World Population Prospects  |  @traffordDataLab'], footerAlign: 'end', footerColor: CAPTION }),
      observed: 'Flint’s bar chart ends at the “Population” axis title; nothing names the source or the Lab. Expected: “Source: UN World Population Prospects | @traffordDataLab” right-aligned in near-black, the darkest text on the chart.',
    },
    {
      id: 'two-series-palette',
      addressed: { stage: 'R6', note: 'Orange and gold are stated as `categoricalByCount[2]`; Set2 stays the general order.' },
      title: 'Two series are orange and gold, not the first two Set2 inks',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'count-palette',
      rule: 'One series in Lab orange `#FC6721`; two series in orange and gold `#E7B800` (the line examples); three or more categories in ColorBrewer Set2.',
      current: 'ThemeSpec has one ordered categorical list. Starting it with orange and gold would put them in front of every Set2 chart; starting it with Set2 gives a two-line chart teal and salmon.',
      expected: 'Norway in orange, China in gold.',
      proposal: '`ink.series.categoricalByCount: { 2: ["#FC6721", "#E7B800"], default: Set2 }`.',
      ...paletteCountProbe(theme, { ...t, titleWeight: 'normal' }, { n: 2, palette: [ORANGE, GOLD] }),
      observed: 'Flint: Norway teal `#66C2A5`, China salmon `#FC8D62`; it also adds a rotated “EV share (%)” title. Expected: Norway orange, China gold.',
    },
    {
      id: 'y-title-top',
      title: 'Rotated y title pushed to the top end of the axis',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'axis-title-relocation',
      rule: '`axis.title = element_text(… hjust = 1)`: the y title stays rotated but is justified to the top of the axis, where the reader’s eye enters the chart.',
      current: '`axisTitlePlacement` offers rotated, flat-above-axis or inline; a rotated title is always centred along the axis.',
      expected: '“GDP per capita ($)” rotated, its end level with the top of the plot.',
      proposal: '`annotation.axisTitleAnchor: "start" | "center" | "end"`, realised as Vega-Lite `titleAnchor` / `titleAlign`.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: EGYPT,
        semantic_types: { Year: 'Category', 'GDP per capita ($)': { semanticType: 'Amount', unit: 'USD' } },
        encodings: { x: 'Year', y: 'GDP per capita ($)' },
        title: 'GDP per capita in Egypt, 1952-2007',
      }),
      expectedSpec: egyptExpected(),
      expectedFrame: { footerHtml: caption() },
      observed: 'Flint centres the rotated “GDP per capita ($)” along the axis and turns the year labels −45° although they would fit flat at this width. Expected: the title’s end level with the top of the plot, years horizontal, the caption bottom-right.',
    },
    {
      id: 'labelled-bars',
      addressed: { stage: 'L6', note: 'With the ruler gone, its title moves into the deck — or goes, where the headline or deck already names the quantity — instead of floating under the bars (L6).' },
      title: 'Labelled bars: bold grey values, no value axis',
      kind: 'realization',
      severity: 'medium',
      probe: 'labels-replace-axis',
      rule: 'The interactive companion’s labelled bar chart prints each value in bold `#757575` just past the bar end (`dx: 3`) and draws no value axis or gridlines.',
      current: 'The theme states `structure.axis.measure.suppressWhenValuesPrinted: true` and a bold grey `valueLabel`; the chart asks for labels with `showTextLabels`. Flint drops the value axis and its gridlines and prints bold grey values — but leaves the axis *title* (“Population”) floating under the bars, naming an axis that is no longer there.',
      expected: 'Values in bold grey at the bar ends; no value axis, no gridlines, no stray title (the deck names the measure).',
      proposal: 'Suppressing an axis should suppress its title too, or move the title into the deck as `axisTitles: "omit"` does.',
      ...labelled,
      observed: 'Flint gets most of it: no value axis, no gridlines, bold grey values just past the bars. A lone “Population” title still sits under the chart where the axis was. Expected has no title there.',
    },
    {
      id: 'bar-opacity',
      addressed: { stage: 'M2', note: '`band.opacity: 0.8` is drawn on the bars’ fill.' },
      title: 'Bars at 80% opacity',
      kind: 'realization',
      severity: 'low',
      probe: 'bar-shape',
      rule: '`geom_col(fill = "#fc6721", alpha = 0.8)` — every single-series bar in the companion is the Lab orange at 80%, which is what gives the charts their softer orange.',
      current: 'Stated as `geometry.band.opacity: 0.8`. Flint draws the bars at full opacity, a hotter orange than every chart in the companion.',
      expected: 'Columns in `#FC6721` at 80% opacity, reading as a lighter orange on white.',
      proposal: 'Realise `geometry.band.opacity` as the bar mark’s `fillOpacity` (it is applied to areas through `geometry.area.opacity`).',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: EGYPT,
        semantic_types: { Year: 'Category', 'GDP per capita ($)': { semanticType: 'Amount', unit: 'USD' } },
        encodings: { x: 'Year', y: 'GDP per capita ($)' },
        title: 'GDP per capita in Egypt, 1952-2007',
        baseSize: { width: 360, height: 180 },
      }),
      expectedSpec: { ...egyptExpected(), height: 180 },
      observed: 'Flint’s bars are solid `#FC6721` (full opacity); the expected bars are the same orange at 80%, visibly softer. Flint also shrinks the axis labels to ~8px on this short chart and turns the years −45°.',
    },
    {
      id: 'line-key',
      title: 'Line keys show a line with its dot',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'legend-swatch',
      rule: 'In the multiple-line specimen each key entry is a short line with the series’ dot on it, matching how the series is drawn; bar keys are filled squares.',
      current: '`legend.swatch` only accepts `auto`; Flint keys every series with a filled dot, whether the series is a line or a scatter.',
      expected: 'A line-and-dot sample per series, as in the signature’s expected panel.',
      proposal: '`legend.swatch: "auto" | "mark" | "dot" | "square" | "line" | "lineWithPoint"`, where `mark` draws a sample of the series’ own geometry.',
    },
  ],
};

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(trafford, 'Gapminder.org', ['caption']);

export default trafford;
