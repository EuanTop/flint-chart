import type { ThemeSpec } from 'flint-chart';
import research from '../research/taso.json';
import { ANOMALY, flintInput, highlightProbe, inTextLegendProbe, withChartSource } from '../probes';
import { houseConfig, W, H as HEIGHT, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

/** Neuton and Barlow are open fonts but not loaded on this page; Georgia and Roboto stand in. */
const SERIF = "Neuton, Georgia, 'Times New Roman', serif";
const SANS = "Barlow, Roboto, Arial, sans-serif";
const PUTTY = '#EDEBE3';
const GRID = '#CECABC';
const SLATE = '#485866';
const ZERO = '#404040';
const LABEL = '#4D4D4D';
const BLUE = '#3b66bc';
/** The pale blue the social example gives every non-highlighted bar. */
const TINT = '#A8B6D4';
const PALETTE = [BLUE, '#07dbb3', '#f9466c', SLATE, '#e4e2d9'];

const t: HouseTokens = {
  font: SANS,
  titleFont: SERIF,
  text: '#000000',
  muted: LABEL,
  grid: GRID,
  gridWidth: 0.8,
  axis: SLATE,
  background: PUTTY,
  palette: PALETTE,
  highlight: BLUE,
  context: TINT,
  titleSize: 17,
  titleWeight: 'normal',
  subtitleSize: 12,
  subtitleColor: '#000000',
  labelSize: 10,
  sourceSize: 10,
  lineWidth: 1.5,
  legendOrient: 'none',
};

const theme: ThemeSpec = {
  id: 'taso',
  label: 'TASO',
  ink: {
    surface: { source: 'house', canvas: PUTTY, plot: PUTTY },
    text: { primary: '#000000', secondary: LABEL, muted: LABEL },
    structure: { axis: SLATE, grid: GRID, zero: ZERO },
    series: {
      single: BLUE,
      categorical: PALETTE,
      diverging: { stops: ['#f9466c', '#fea3ac', '#f1f1f1', '#9ea8d7', '#3b66bc'], neutral: '#f1f1f1', space: 'lab' },
      overflow: '#e4e2d9',
    },
    accent: BLUE,
  },
  type: {
    minSize: 9,
    headline: { family: SERIF, size: 17, weight: 'regular', case: 'asIs', color: '#000000' },
    deck: { family: SANS, size: 12, weight: 'regular', color: '#000000' },
    axisLabel: { family: SANS, size: 10, color: LABEL },
    axisTitle: { family: SANS, size: 9, weight: 'regular', color: '#000000' },
    keyLabel: { family: SANS, size: 10, weight: 'bold' },
    valueLabel: { family: SANS, size: 10, weight: 'bold' },
    annotation: { family: SANS, size: 11, weight: 'bold', color: ZERO },
    footnote: { family: SANS, size: 9, style: 'italic', color: '#000000' },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1.4, ticks: 'full', tickLength: 'long', tickDirection: 'outward', labelGap: 7 },
      measure: { line: 'omit', ticks: 'omit' },
    },
    grid: { measure: 'full', category: 'full', style: 'solid', weight: 0.8, zero: 'full' },
    frame: 'omit',
    baseline: 'full',
  },
  marks: { bandFraction: 0.9, strokeWeight: 1.5 },
  geometry: {
    line: { width: 1.5 },
    point: { presence: 'full', size: 20, fill: 'solid' },
    band: { fraction: 0.9, cornerRadius: 0 },
  },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['seriesEnd'], title: 'whenAmbiguous' },
  dataLabels: { show: 'never', placement: 'atMark', inkMode: 'contrastWithMark' },
  annotation: { axisTitles: 'whenAmbiguous', axisTitlePlacement: 'rotated', unit: 'never', numberFormat: { thousands: 'separator' } },
  layout: { titleBlock: { anchor: 'start', gap: 'normal', deckGap: 'tight' } },
  // The source line, as the guide sets it (S1); the chart gives the words.
  source: { credit: { text: 'TASO', placement: 'end', weight: 'bold' } },
};

// ---------------------------------------------------------------------------
// The social-media specimen: earnings premium by highest qualification.

const PATHWAYS = [
  ['Top third HE provider', 13700], ['Non-top third HE provider', 5850], ['FE at a HEI', 950], ['Level 6 FE', 5350],
  ['Level 5 FE', 7250], ['Level 4 FE', 4100], ['Level 3 Apprenticeship', 4100], ['Level 3 at KS5', 2800], ['Level 3 FE', 1950],
].map(([Qualification, Premium]) => ({ Qualification: Qualification as string, 'Earnings premium (£)': Premium as number }));

const SIG_TITLE = 'When we control for KS4 attainment and demographics, top third HE provider graduates earn the most by a large margin';
const SIG_DECK = 'Average earnings premium 16 years after KS4 (relative to no known qualification after KS4) by highest qualification';

const titleHtml = (html: string, deck: string) =>
  `<div style="margin:0 14px 10px;background:${PUTTY}">`
  + `<div style="font-family:${SERIF};font-size:21px;line-height:1.15;color:#000">${html}</div>`
  + `<div style="font-family:${SANS};font-size:13px;line-height:1.3;color:#000;margin-top:5px">${deck}</div></div>`;

const TASO_MARK = `<span style="font-family:${SANS};font-weight:800;font-size:26px;letter-spacing:1px;background:linear-gradient(90deg,#07dbb3,#07dbb3 55%,${BLUE});-webkit-background-clip:text;background-clip:text;color:transparent">TASO</span>`;

const captionHtml = (lines: string[], right = '') =>
  `<div style="display:flex;justify-content:space-between;align-items:flex-end;margin:6px 14px 8px;font-family:${SANS};font-style:italic;font-size:11px;color:#000">`
  + `<div>${lines.map((line, i) => `<div style="margin-top:${i ? 9 : 0}px">${line}</div>`).join('')}</div>${right}</div>`;

const PUTTY_FRAME = { background: PUTTY, padding: '14px 4px 6px' };

const config = () => ({
  ...houseConfig(t),
  axis: { ...(houseConfig(t).axis as object), labelColor: LABEL, labelFontSize: 11, gridColor: GRID, gridWidth: 0.8 },
});

const ORDER = PATHWAYS.map((row) => row.Qualification);

function signatureExpected(o: { report?: boolean } = {}) {
  const y = { field: 'Qualification', type: 'nominal', sort: ORDER, title: null, scale: { domain: ORDER, paddingInner: 0.1 }, axis: { domain: false, ticks: false, grid: true, gridColor: GRID, labelPadding: 6, labelFontSize: 11 } };
  const x = { field: 'Earnings premium (£)', type: 'quantitative', title: null, scale: { domain: [0, 15000], nice: false } };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config(),
    width: W,
    height: HEIGHT + 30,
    layer: [
      {
        data: { values: PATHWAYS },
        mark: { type: 'bar' },
        encoding: {
          y,
          x: { ...x, axis: { values: [0, 5000, 10000, 15000], format: '$,.0f', labelExpr: "replace(datum.label, '$', '£')", grid: true, domain: true, domainColor: SLATE, domainWidth: 1.4, ticks: true, tickColor: SLATE, tickSize: 9, tickWidth: 1.4, labelPadding: 4, labelFontSize: 11 } },
          color: o.report ? { value: '#6081C4' } : { condition: { test: `datum.Qualification === '${PATHWAYS[0].Qualification}'`, value: BLUE }, value: TINT },
        },
      },
      { data: { values: [{ v: 0 }] }, mark: { type: 'rule', color: '#000000', strokeWidth: 1.6 }, encoding: { x: { field: 'v', type: 'quantitative' } } },
      {
        data: { values: [{ x: 10300, y: 'Level 4 FE' }, { x: 12000, y: 'Level 6 FE' }, { x: 12100, y: 'Non-top third HE provider' }] },
        mark: { type: 'line', interpolate: 'basis', color: '#555555', strokeWidth: 1 },
        encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'y', type: 'nominal', sort: ORDER, scale: { domain: ORDER } }, order: { field: 'x' } },
      },
      {
        data: { values: [{ x: 12100, y: 'Non-top third HE provider' }] },
        mark: { type: 'point', shape: 'triangle-up', size: 40, filled: true, color: '#555555', yOffset: -6 },
        encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'y', type: 'nominal', sort: ORDER, scale: { domain: ORDER } } },
      },
      {
        data: { values: [{ x: 14900, y: 'Level 4 FE' }] },
        mark: { type: 'text', align: 'right', baseline: 'top', dy: 4, fontSize: 11.5, fontWeight: 'bold', color: '#404040', lineBreak: '\n', lineHeight: 14, text: 'Top third graduates earn almost £14,000 more\nthan those with no qualification beyond KS4' },
        encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'y', type: 'nominal', sort: ORDER, scale: { domain: ORDER } } },
      },
    ],
  };
}

const pathwaysFlint = (title: string, subtitle: string) => flintInput(theme, {
  chartType: 'Bar Chart',
  data: PATHWAYS,
  semantic_types: { Qualification: 'Category', 'Earnings premium (£)': { semanticType: 'Amount', unit: 'GBP' } },
  encodings: { y: 'Qualification', x: 'Earnings premium (£)' },
  title,
  subtitle,
  baseSize: { width: 380, height: 260 },
});

// ---------------------------------------------------------------------------
// The styling template: four columns, zero line plus a separate slate axis.

const TEMPLATE = [['Category 1', 10], ['Category 2', 20], ['Category 3', 30], ['Category 4', 20]].map(([Category, Value]) => ({ Category, Value }));

function templateExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...config(), title: { ...(houseConfig(t).title as object), fontWeight: 'normal', fontSize: 17, subtitleFontSize: 12, subtitleColor: '#000' } },
    title: { text: ['This is the title of the chart, it should be in Neuton,', 'no longer than two lines, and normally active'], subtitle: 'This is the subtitle, it should normally be a formal statistical subtitle' },
    width: W,
    height: HEIGHT,
    data: { values: TEMPLATE },
    layer: [
      {
        mark: { type: 'bar', color: BLUE, width: { band: 0.9 } },
        encoding: {
          x: { field: 'Category', type: 'nominal', title: 'Axis Title', axis: { labelAngle: 0, grid: true, gridColor: GRID, domain: true, domainColor: SLATE, domainWidth: 1.4, ticks: true, tickColor: SLATE, tickWidth: 1.4, tickSize: 11, offset: 7, labelFontSize: 11, titleFontSize: 10, titleColor: '#000', titleFontWeight: 'normal' } },
          y: { field: 'Value', type: 'quantitative', title: null, scale: { domain: [0, 32], nice: false }, axis: { values: [0, 10, 20, 30], grid: true, gridColor: GRID, domain: false, ticks: false, labelFontSize: 11 } },
        },
      },
      { data: { values: [{ v: 0 }] }, mark: { type: 'rule', color: ZERO, strokeWidth: 1 }, encoding: { y: { field: 'v', type: 'quantitative' } } },
    ],
  };
}

/** The shared probe lets Vega-Lite pick its own ticks; give the bars the house's sparser ruler. */
function withBarTicks<P extends { expectedSpec?: Record<string, unknown> }>(probe: P): P {
  const view = ((probe.expectedSpec?.vconcat ?? []) as { encoding?: Record<string, { axis?: Record<string, unknown> }> }[])[0];
  if (view?.encoding?.x) view.encoding.x.axis = { ...view.encoding.x.axis, values: [0, 500, 1000, 1500], format: ',.0f' };
  return probe;
}

const MIX_SOURCES = ['Coal', 'Gas', 'Hydro', 'Nuclear', 'Wind & solar', 'Other'];
const MIX = ([
  [1990, [4430, 1780, 2160, 2000, 10, 1580]],
  [2000, [5990, 2760, 2620, 2590, 80, 1310]],
  [2010, [8670, 4760, 3440, 2760, 380, 1520]],
  [2020, [9420, 6270, 4360, 2700, 2720, 1610]],
] as [number, number[]][]).flatMap(([Year, vals]) => MIX_SOURCES.map((Source, i) => ({ Year, Source, 'Generation (TWh)': vals[i] })));

/** The share area with every band in a visible ink and black names at the right edge. */
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
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...config(), legend: { disable: true }, title: { ...(houseConfig(t).title as object), fontWeight: 'normal' } },
    title: { text: 'Wind and solar appeared from nothing after 2010', subtitle: 'World electricity generation by source, share' },
    width: W - 60,
    height: HEIGHT,
    layer: [
      {
        data: { values: MIX },
        transform: [{ calculate: `indexof(${JSON.stringify(MIX_SOURCES)}, datum.Source)`, as: 'rank' }],
        mark: { type: 'area', stroke: PUTTY, strokeWidth: 0.8 },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [1990, 2020], nice: false }, axis: { values: [1990, 2000, 2010, 2020], format: 'd', grid: true, gridColor: GRID, domain: true, domainColor: SLATE, domainWidth: 1.4, ticks: true, tickColor: SLATE, tickSize: 9, labelFontSize: 10 } },
          y: { field: 'Generation (TWh)', type: 'quantitative', stack: 'normalize', title: null, axis: { format: '.0%', grid: true, gridColor: GRID, domain: false, ticks: false, labelFontSize: 10 } },
          color: { field: 'Source', type: 'nominal', scale: { domain: MIX_SOURCES, range: [BLUE, '#07dbb3', '#f9466c', SLATE, '#9ea8d7', '#b9b4a2'] } },
          order: { field: 'rank', type: 'quantitative', sort: 'descending' },
        },
      },
      {
        data: { values: labels },
        mark: { type: 'text', align: 'left', dx: 6, fontSize: 10, fontWeight: 'bold', color: '#000000' },
        encoding: { x: { datum: 2020, type: 'quantitative' }, y: { field: 'mid', type: 'quantitative' }, text: { field: 'Source' } },
      },
    ],
  };
}

const IN_TEXT = ['Norway', 'China', 'Germany'].map((name, i) => `<span style="color:${PALETTE[i]}">${name}</span>`);

const taso: StyleGuideTheme = {
  id: 'taso',
  org: 'TASO (Transforming Access and Student Outcomes in Higher Education)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the ggplot2 theme code printed in TASO’s technical guide. Sizes are ggplot points; the default report figure is 180mm (about 680px) wide, so pt is applied as px on Flint’s ~400px canvas, which keeps the guide’s hierarchy (title largest, subtitle second, everything else smaller).',
    'Stated directly: the putty `#EDEBE3` canvas and plot; black text, grey tick labels; thin solid `#CECABC` gridlines in both directions; no y axis line; a slate `#485866` x-axis line with long outward slate ticks; a separate `#404040` zero rule; peacock blue `#3b66bc` for one series and the brand order (blue, teal, pink, slate, light) for several — the guide’s count-specific palettes happen to be prefixes of one list, so one list is enough; the Likert diverging ramp; keys at the series ends in bold (`legend.placement: ["seriesEnd"]`); an italic footnote role; horizontal labels.',
    'Approximated: the faces. Neuton (serif headline) and Barlow (everything else) are open fonts but are not loaded here, so panels fall back to Georgia and Roboto. Not stated: the italic Source/Notes caption, the TASO logo, the pale-tint highlight and the coloured title words that replace a key, the arrow callout, and the report layout whose figure title sits outside the putty panel. See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'high',
      probe: 'signature',
      rule: 'Social version: putty background; a large black Neuton active title whose key phrase (“top third HE provider graduates”) is set in the highlight blue; a Barlow statistical subtitle; horizontal bars, the subject solid peacock blue and the rest a pale tint of it; grey category labels left of a black zero line; light vertical gridlines; a slate baseline with long ticks; a bold dark-grey callout with a thin curved arrow; an italic source bottom-left and the TASO logo bottom-right.',
      current: 'Flint draws the putty canvas, the serif title and sans deck, blue bars on light gridlines and an x title. Every bar is the same blue, the title is one colour, the slate line and its ticks are on the category (left) axis rather than the bottom, row labels wrap, and there is no zero line, callout, caption or logo.',
      expected: 'The guide’s social-media example, redrawn.',
      flint: pathwaysFlint('When we control for KS4 attainment and demographics, top third HE provider graduates earn the most by a large margin', SIG_DECK),
      expectedSpec: signatureExpected(),
      expectedFrame: {
        style: PUTTY_FRAME,
        headerHtml: titleHtml(`When we control for KS4 attainment and demographics, <span style="color:${BLUE}">top third HE provider graduates</span> earn the most by a large margin`, SIG_DECK),
        footerHtml: captionHtml(['Source: TASO (2024), Education pathways: Equality gaps in earnings and employment.'], TASO_MARK),
      },
      observed: 'Flint (left) is the right palette and canvas but reads as a different chart: uniform blue bars, slate ticks on the left axis, wrapped two-line row labels, an “Earnings premium (£)” x title, and the title on two even lines in one colour. Expected (right): the subject bar blue and the rest tinted, “top third HE provider graduates” in blue in the title, a black zero line at the left, slate baseline with ticks along the bottom, the bold arrow callout, the italic source and the TASO mark.',
    },
    {
      id: 'highlight-tint',
      title: 'The subject in full blue, the rest a pale tint of the same blue',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'highlight',
      rule: '“Highlight one category in full blue and show others as a pale tint”: context bars are not grey but a lighter version of the highlight hue.',
      current: 'The chart spec cannot name the highlighted category, and the theme has no context ink; every bar is the single-series blue.',
      expected: 'Nigeria in peacock blue, the other bars in the pale blue tint.',
      proposal: '`chart_spec.emphasis: { field, values }` with `ink.series.context: { mode: "tint", amount: 0.55 }` (a tint of the emphasis ink) or a fixed colour.',
      ...withBarTicks(highlightProbe(theme, t)),
      expectedFrame: { style: PUTTY_FRAME },
      observed: 'Flint: all eight bars in peacock blue, and the slate ticks appear on the country axis. Expected: Nigeria alone in blue, the others in the pale blue tint.',
    },
    {
      id: 'title-words-as-key',
      title: 'Key words in the title coloured to act as the key',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'in-text-legend',
      rule: '“By using ggtext::element_markdown, we can use markdown stylings to colour specific words in the chart to highlight a point” — the series names in the title take their series colours and there is no legend box.',
      current: 'Titles are plain strings; there is no markup and no link from a word to a series. With `legend.placement: ["seriesEnd"]` Flint names lines at their ends instead.',
      expected: 'Norway, China and Germany in the title in their line colours; no key.',
      proposal: 'Allow series references in titles (`"Electric cars took off in {Norway}, {China} and {Germany}"`), resolved to the series inks at compile time.',
      ...inTextLegendProbe(theme, t, { n: 3 }),
      expectedFrame: {
        style: PUTTY_FRAME,
        headerHtml: titleHtml(`Electric cars took off in ${IN_TEXT[0]}, ${IN_TEXT[1]} and ${IN_TEXT[2]}`, 'Share of new cars sold that are electric, %'),
      },
      observed: 'Flint (left) names the lines at their ends in bold series colours, which the guide also accepts, and prints the title in plain black serif. Expected (right) colours Norway, China and Germany in the title and drops the key. Flint also adds a rotated “EV share (%)” title, which the guide avoids.',
    },
    {
      id: 'zero-and-axis',
      title: 'A dark zero line and, just below it, a slate axis with long ticks',
      kind: 'realization',
      severity: 'medium',
      probe: 'zero-line',
      rule: 'The template draws `geom_hline(yintercept = 0, colour = "#404040")` on the bars’ baseline and, separately, the x-axis line in slate `#485866` (0.5 linewidth) with 0.3cm ticks, offset a few points below the zero line; gridlines run both ways in `#CECABC`.',
      current: 'Stated as `grid.zero: full` (ink `#404040`), a categorical axis line with long outward ticks in slate, and both grids on. When the domain starts at zero Flint draws one line where the guide draws two, and its “long” ticks are about half the guide’s 0.3cm. Because axis styling is bound to the axis’s *role*, a horizontal bar chart gets the slate line and ticks on its left (category) axis, while TASO always puts them on the bottom axis and lets the black zero line stand at the left.',
      expected: 'The guide’s styling template: zero line on the bars, slate axis and ticks a little below, light grid both ways, italic source and notes.',
      proposal: 'Draw the zero rule and the axis line as two rules when both are stated, with `structure.axis.categorical.offset` (px) to separate them.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: TEMPLATE,
        semantic_types: { Category: 'Category', Value: 'Quantity' },
        encodings: { x: { field: 'Category', title: 'Axis Title' }, y: 'Value' },
        title: 'This is the title of the chart, it should be in Neuton, no longer than two lines, and normally active',
        subtitle: 'This is the subtitle, it should normally be a formal statistical subtitle',
      }),
      expectedSpec: templateExpected(),
      expectedFrame: { style: PUTTY_FRAME, footerHtml: captionHtml(['Source: This is the source in italics', 'Notes: These are the notes in italics']) },
      observed: 'Flint draws one slate line at zero with short ticks (about 5px), plus a rotated “Value” y title the template omits and wrapped “Category / 1” labels; there is no separate zero line, no x title and no caption. Expected: dark zero line on the bars, the slate axis with ~11px ticks a few px below it, “Axis Title” centred, italic Source and Notes.',
    },
    {
      id: 'horizontal-text',
      addressed: { stage: 'A1', note: 'Names are measured in the face they are drawn in and kept flat: broken at a space, set smaller down to the floor (`type.minSize`, never below ¾ of the stated size), the bands widened — and only then turned (A1).' },
      title: 'Labels are turned although the theme says horizontal',
      kind: 'realization',
      severity: 'medium',
      probe: 'turned-row-labels',
      rule: '“Text should almost always be horizontal” — choose horizontal bars when category names are long, and never turn short labels.',
      current: 'The theme states `labels.` with `truncation: "wrap"`. Flint still turns the nine decade labels −45°.',
      expected: 'Nine decade labels (“1880s” …) set flat under their columns; they fit at 10px.',
      proposal: 'Treat `labels.angle: horizontal` as a constraint: wrap, thin or abbreviate before turning, and report when nothing fits.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: ANOMALY.map(({ Decade, 'Anomaly (°C)': v }) => ({ Decade, 'Anomaly (°C)': v })),
        semantic_types: { Decade: 'Category', 'Anomaly (°C)': { semanticType: 'Quantity', unit: '°C' } },
        encodings: { x: 'Decade', y: 'Anomaly (°C)' },
        title: 'The world has warmed every decade since the 1960s',
        subtitle: 'Temperature anomaly relative to 1951–1980, °C',
      }),
      expectedSpec: {
        $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
        config: { ...config(), title: { ...(houseConfig(t).title as object), fontWeight: 'normal' } },
        title: { text: 'The world has warmed every decade since the 1960s', subtitle: 'Temperature anomaly relative to 1951–1980, °C' },
        width: W,
        height: HEIGHT,
        data: { values: ANOMALY },
        layer: [
          {
            mark: { type: 'bar', color: BLUE, width: { band: 0.9 } },
            encoding: {
              x: { field: 'Decade', type: 'ordinal', title: null, axis: { labelAngle: 0, grid: true, gridColor: GRID, domain: true, domainColor: SLATE, domainWidth: 1.4, ticks: true, tickColor: SLATE, tickSize: 9, offset: 6, labelFontSize: 10 } },
              y: { field: 'Anomaly (°C)', type: 'quantitative', title: null, axis: { grid: true, gridColor: GRID, domain: false, ticks: false, labelFontSize: 10 } },
            },
          },
          { data: { values: [{ v: 0 }] }, mark: { type: 'rule', color: ZERO }, encoding: { y: { field: 'v', type: 'quantitative' } } },
        ],
      },
      expectedFrame: { style: PUTTY_FRAME },
      observed: 'Confirmed: Flint sets “1880s … 2020s” at −45° and adds a rotated “Anomaly (°C)” title; expected sets them flat under 36px columns, where they fit.',
    },
    {
      id: 'report-title',
      title: 'Report version: figure title outside the putty panel',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'figure-number',
      rule: 'In PDF reports the active title becomes “Figure 2: …” in bold blue serif *above and outside* the putty panel; inside the panel the formal statistical subtitle leads; the chart and its italic source and notes sit in the panel.',
      current: 'One title block, inside the canvas; no figure label; the canvas colour covers the title too.',
      expected: 'A blue bold serif figure title on the page, then the putty panel with the subtitle, bars and caption.',
      proposal: '`chart_spec.label` (“Figure 2”) and `layout.titleBlock.surface: "page" | "canvas"`, so a house can set its headline outside the chart’s surface.',
      flint: pathwaysFlint('Figure 2: When we control for KS4 attainment and demographics, top third HE provider graduates earn the most by a large margin', SIG_DECK),
      expectedSpec: { ...signatureExpected({ report: true }), layer: (signatureExpected({ report: true }).layer as object[]).slice(0, 2) },
      expectedFrame: {
        style: { background: PUTTY, padding: '0 0 4px' },
        headerHtml: `<div style="background:#ffffff;font-family:${SERIF};font-weight:700;font-size:19px;line-height:1.2;color:${BLUE};padding:0 6px 10px">Figure 2: When we control for KS4 attainment and demographics, top third HE provider graduates earn the most by a large margin</div>`
          + `<div style="padding:12px 14px 2px;font-family:${SANS};font-size:13px;line-height:1.3;color:#000">${SIG_DECK}</div>`,
        footerHtml: captionHtml(['Source: TASO-commissioned analysis of a large longitudinal dataset (NPD, ILR, HESA, LEO).', 'Note: Error bars show the 95% confidence intervals.']),
      },
      observed: 'Flint draws the “Figure 2: …” title in plain black serif inside the putty canvas. Expected: a bold blue serif figure title on white, above the putty panel that holds the subtitle, bars and italic source and note.',
    },
    {
      id: 'light-ink-on-putty',
      addressed: { stage: 'R5', note: 'The fifth brand colour gains an edge in a darker shade so it reads on the putty canvas.' },
      title: 'The fifth brand colour disappears into the putty canvas',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'palette-surface-contrast',
      rule: '“Foreground/background contrast must pass WCAG AA.” The five-colour palette ends in `#e4e2d9`, a putty tint the guide uses for the fifth group on a putty background.',
      current: 'Flint takes the stated order as given: the fifth series fills with `#e4e2d9` on `#EDEBE3` (about 1.05:1), and its series-end label is printed in the same ink, so both the band and its name vanish. The sixth series overflows to the same ink. ThemeSpec has no contrast floor between series inks and the canvas.',
      expected: 'Every band visible against putty; names in black beside the bands.',
      proposal: 'A grounding check `ink.series.minContrastWithSurface` (e.g. 1.5:1 for fills, 3:1 for text) that swaps or outlines failing inks and reports it; series-end labels fall back to text ink when their series ink fails.',
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
      expectedFrame: { style: PUTTY_FRAME },
      observed: 'Flint’s fifth band (“Wind & solar”, `#e4e2d9`) and sixth (“Other”, overflow `#e4e2d9`) are nearly invisible on putty, and their end labels in the same ink are unreadable. Expected: every band in a visible ink, names in bold black.',
    },
    {
      id: 'caption',
      addressed: { stage: 'S1', note: 'Italic “Source: …” bottom-left, aligned to the graphic’s edge, the TASO credit at the right. The notes line stays open.' },
      title: 'Italic “Source:” then “Notes:” at the bottom left, logo at the right',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: '“The caption should be in the bottom left of the chart. It should be in italics, and smaller than the rest of the text”: “Source: …”, a blank line, “Notes: …”, aligned to the edge of the whole graphic (`plot.caption.position = "plot"`); the TASO logo bottom-right on web and social versions.',
      current: 'No source or notes slot in the chart spec; `type.footnote` (italic, 9px) is stated but has nothing to draw; no furniture kind for a logo.',
      expected: 'See the zero-and-axis and signature panels: italic source and notes under the chart, the logo at the right.',
      proposal: '`chart_spec.source`, `chart_spec.notes[]`; `furniture: [{ kind: "logo", svg, anchor: "bottomRight", when: "web" }]`.',
    },
    {
      id: 'fonts',
      title: 'Neuton and Barlow are named but not delivered',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'font-source',
      rule: '“The fonts for the charts are Neuton for the header and Barlow for all other text.” Both are open (Google Fonts) faces.',
      current: '`TypeRole.family` names a family; whether it renders depends on the host having loaded it. On this page neither is loaded and both panels fall back to Georgia and Roboto, which are wider than Neuton and Barlow and change where titles wrap.',
      expected: 'The house faces, or a reported fallback.',
      proposal: '`type.fonts: [{ family: "Neuton", src: "https://fonts.googleapis.com/…", weight: [400, 700] }]` so a host can load them, and a report when a named family is not available at render time.',
    },
  ],
};

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(taso, 'HESA Student Record', ['caption']);

export default taso;
