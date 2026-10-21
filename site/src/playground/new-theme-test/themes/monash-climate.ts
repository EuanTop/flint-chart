import type { ThemeSpec } from 'flint-chart';
import research from '../research/monash-climate.json';
import { EV_SHARE, flintInput, inTextLegendProbe, signedProbe } from '../probes';
import { footerHtml, houseConfig, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

// Helvetica per Monash branding; Arimo/Arial where Helvetica is not installed.
const FONT = "Helvetica, 'Helvetica Neue', Arimo, Arial, sans-serif";
const GREEN = '#61c3a5';
const POINT = '#c9c9cc';
const PANEL = '#f4f4f4';
const TICK = '#7d7d7d';

const t: HouseTokens = {
  font: FONT,
  text: '#000000',
  muted: TICK,
  grid: '#d9d9d9',
  axis: null,
  background: PANEL,
  palette: [GREEN, '#2f6097', '#c06632', '#7e2276', '#563286'],
  highlight: GREEN,
  context: POINT,
  titleSize: 15,
  titleWeight: 'bold',
  titleAnchor: 'middle',
  subtitleSize: 12,
  labelSize: 10,
  sourceSize: 10,
  lineWidth: 2,
};

const theme: ThemeSpec = {
  id: 'monash-climate',
  label: 'Monash Climate Change Communication Research Hub',
  ink: {
    // The report says “a solid, white background”; its printed figures sit on a #f4f4f4 panel, which the specimens show.
    surface: { source: 'house', canvas: PANEL },
    text: { primary: '#000000', secondary: '#000000', muted: TICK },
    structure: { grid: '#d9d9d9', axis: '#d9d9d9', rule: '#9a9a9a' },
    series: {
      single: GREEN,
      // No categorical palette is given: contrasting hues from the guide's own ramps, avoiding the red/green,
      // light-blue/purple and yellow pairs it rules out.
      categorical: [GREEN, '#2f6097', '#c06632', '#7e2276', '#563286'],
      categoricalExtended: [GREEN, '#2f6097', '#c06632', '#7e2276', '#563286', '#954c22', '#357477'],
      overflow: POINT,
      // “Use varied intensity (brightness rather than hue)”: the guide's orange row, light to dark.
      sequential: { stops: ['#efd8bf', '#dfb18d', '#c06632', '#be612f', '#954c22'], space: 'lab' },
      // Cold blue to warm red, the guide's temperature association.
      diverging: { stops: ['#2f6097', '#83a5c6', '#f2f2f2', '#e49788', '#b52b36'], neutral: '#f2f2f2', space: 'lab' },
      status: { positive: '#25b683', negative: '#b52b36', neutral: POINT },
    },
    accent: GREEN,
  },
  type: {
    headline: { family: FONT, size: 15, weight: 'bold', case: 'asIs', color: '#000000' },
    deck: { family: FONT, size: 12, color: '#000000' },
    axisLabel: { family: FONT, size: 10, color: TICK },
    axisTitle: { family: FONT, size: 12, weight: 'regular', color: '#000000' },
    keyLabel: { family: FONT, size: 12, color: '#000000' },
    valueLabel: { family: FONT, size: 11, color: '#000000' },
    annotation: { family: FONT, size: 11, color: '#000000' },
    footnote: { family: FONT, size: 10, style: 'italic', color: '#000000' },
  },
  structure: {
    axis: {
      measure: { line: 'omit', ticks: 'omit', tickDensity: 'sparse' },
      categorical: { line: 'omit', ticks: 'omit' },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'omit',
  },
  marks: { strokeWeight: 3, bandFraction: 0.7 },
  geometry: { point: { size: 22, fill: 'solid' }, line: { width: 3 } },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['seriesEnd', 'inline', 'top'], title: 'whenAmbiguous', direction: 'horizontal', align: 'center' },
  dataLabels: { show: 'never' },
  annotation: { unit: 'everyTick', axisTitles: 'always', axisTitlePlacement: 'rotated' },
  layout: { titleBlock: { anchor: 'middle', gap: 'normal' } },
};

// Tree coverage and urban heating by Melbourne local government area, read off Figure 6.
const LGAS = [
  ['Melbourne', 5.6, 9.2], ['Port Phillip', 6.1, 10.7], ['Yarra', 6.3, 8.0], ['Maribyrnong', 7.2, 9.3],
  ['Moreland', 8.1, 9.4], ['Darebin', 9.6, 10.8], ['Stonnington', 10.0, 9.6], ['Glen Eira', 10.5, 9.2],
  ['Hobsons Bay', 11.0, 7.9], ['Moonee Valley', 12.6, 8.5], ['Bayside', 13.6, 7.4], ['Brimbank', 14.1, 9.9],
  ['Kingston', 15.0, 8.3], ['Boroondara', 16.6, 7.4], ['Monash', 17.1, 8.3], ['Whitehorse', 18.0, 7.5],
  ['Banyule', 18.6, 7.9], ['Manningham', 19.1, 7.6], ['Frankston', 20.0, 4.9], ['Maroondah', 20.9, 7.0],
  ['Knox', 21.1, 8.2], ['Casey', 23.0, 7.3], ['Mornington Peninsula', 25.1, 7.0], ['Nillumbik', 26.0, 8.0],
  ['Yarra Ranges', 28.0, 5.9],
].map(([LGA, tree, heat]) => ({ LGA, 'Tree coverage': tree, 'Urban heating': heat }));

const SIG_TITLE = 'Tree coverage reduces urban heating effect';

const axisX = (title: string | null, unit: string, values: number[]) => ({
  title, titleFontSize: 12, titleColor: '#000', titleFontWeight: 'normal', titlePadding: 8,
  values, labelExpr: `datum.value + '${unit}'`, labelColor: TICK, labelFontSize: 10, domain: false, ticks: false, grid: false,
});
const axisY = (title: string | null, unit: string, values: number[]) => ({
  title, titleFontSize: 12, titleColor: '#000', titleFontWeight: 'normal', titlePadding: 10,
  values, labelExpr: `datum.value + '${unit}'`, labelColor: TICK, labelFontSize: 10, domain: false, ticks: false, grid: true, gridColor: '#d9d9d9',
});

/** Figure 6: grey unconnected dots, one thick turquoise trend, units on every tick, tree icons anchoring the ends of x. */
function signature(icons = true, tooltip = false, flintInks = false) {
  const scaleX = { domain: [5, 30], nice: false };
  const scaleY = { domain: [4, 12], nice: false };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), title: { ...(houseConfig(t).title as object), frame: 'group', anchor: 'middle', offset: 18 } },
    title: SIG_TITLE,
    width: 400,
    height: 250,
    data: { values: LGAS },
    layer: [
      {
        mark: { type: 'circle', size: 22, color: flintInks ? GREEN : POINT, opacity: 1 },
        encoding: {
          x: { field: 'Tree coverage', type: 'quantitative', scale: scaleX, axis: axisX('Tree coverage', '%', [5, 10, 15, 20, 25, 30]) },
          y: { field: 'Urban heating', type: 'quantitative', scale: scaleY, axis: axisY('Urban heating', '°C', [4, 6, 8, 10, 12]) },
        },
      },
      {
        transform: [{ regression: 'Urban heating', on: 'Tree coverage', extent: [5, 30] }],
        mark: { type: 'line', strokeWidth: flintInks ? 3 : 5, color: GREEN, strokeCap: 'butt' },
        encoding: { x: { field: 'Tree coverage', type: 'quantitative', scale: scaleX }, y: { field: 'Urban heating', type: 'quantitative', scale: scaleY } },
      },
      ...(icons ? [
        {
          data: { values: [{ x: 6.2, y: 4.15, s: 20, g: '🌳' }, { x: 26.5, y: 4.15, s: 30, g: '🌳' }, { x: 28.2, y: 4.15, s: 42, g: '🌳' }, { x: 29.6, y: 4.15, s: 26, g: '🌳' }] },
          mark: { type: 'text', baseline: 'bottom', align: 'center', opacity: 0.9 },
          encoding: {
            x: { field: 'x', type: 'quantitative', scale: scaleX },
            y: { field: 'y', type: 'quantitative', scale: scaleY },
            text: { field: 'g' },
            size: { field: 's', type: 'quantitative', scale: null, legend: null },
          },
        },
      ] : []),
      ...(tooltip ? rolloverLayers(scaleX, scaleY) : []),
    ],
  };
}

/** Figure 10's rollover, pinned open on Maroondah: white box, thin grey outline, bold place name. */
function rolloverLayers(scaleX: Record<string, unknown>, scaleY: Record<string, unknown>) {
  const at = { x: 20.9, y: 7.0 };
  const box = { x: 20.9, y: 7.0, x2: 27.6, y2: 5.25 };
  const lines = [
    { text: 'Maroondah', dy: 0, bold: true },
    { text: 'Tree Coverage: 20.91%', dy: 1, bold: false },
    { text: 'UH: 7.03°C', dy: 2, bold: false },
  ];
  return [
    {
      data: { values: [at] },
      mark: { type: 'circle', size: 60, color: '#ffffff', stroke: '#7d7d7d', strokeWidth: 1.5 },
      encoding: { x: { field: 'x', type: 'quantitative', scale: scaleX }, y: { field: 'y', type: 'quantitative', scale: scaleY } },
    },
    {
      data: { values: [box] },
      mark: { type: 'rect', fill: '#ffffff', stroke: '#9a9a9a', strokeWidth: 1, xOffset: 6, x2Offset: 6, yOffset: 6, y2Offset: 6 },
      encoding: {
        x: { field: 'x', type: 'quantitative', scale: scaleX }, x2: { field: 'x2' },
        y: { field: 'y', type: 'quantitative', scale: scaleY }, y2: { field: 'y2' },
      },
    },
    ...lines.map((line) => ({
      data: { values: [{ ...at, text: line.text }] },
      mark: { type: 'text', align: 'left', baseline: 'top', dx: 12, dy: 12 + line.dy * 14, fontSize: 11, font: FONT, color: '#000', fontWeight: line.bold ? 'bold' : 'normal' },
      encoding: { x: { field: 'x', type: 'quantitative', scale: scaleX }, y: { field: 'y', type: 'quantitative', scale: scaleY }, text: { field: 'text' } },
    })),
  ];
}

const caption = (n: number, text: string) => `<div style="font-family:${FONT};font-size:10px;margin:6px 14px 4px;color:#000">`
  + `<span style="letter-spacing:1.5px">FIGURE ${n}.</span> <i>${text}</i></div>`;

const regressionFlint = (title?: string) => flintInput(theme, {
  chartType: 'Regression',
  data: LGAS,
  semantic_types: {
    LGA: 'Category',
    'Tree coverage': { semanticType: 'Percentage', unit: '%' },
    'Urban heating': { semanticType: 'Temperature', unit: '°C' },
  },
  encodings: { x: 'Tree coverage', y: 'Urban heating' },
  title,
  baseSize: { width: 400, height: 250 },
});

/** One green line carrying the message, the rest thin grey context, named at their ends. */
function emphasisExpected() {
  const rows = EV_SHARE;
  const x = { field: 'Year', type: 'quantitative', scale: { domain: [2018, 2023] }, axis: { values: [2018, 2020, 2022, 2023], format: 'd', title: null, domain: false, ticks: false, labelColor: TICK, labelFontSize: 10 } };
  const y = { field: 'EV share (%)', type: 'quantitative', scale: { domain: [0, 100] }, axis: { values: [0, 25, 50, 75, 100], labelExpr: "datum.value + '%'", title: null, domain: false, ticks: false, labelColor: TICK, labelFontSize: 10 } };
  const last = rows.filter((row) => row.Year === 2023);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: { text: 'Norway shows what is possible', subtitle: 'Share of new cars sold that are electric' },
    width: 340,
    height: 210,
    layer: [
      {
        data: { values: rows.filter((row) => row.Country !== 'Norway') },
        mark: { type: 'line', strokeWidth: 1.5, color: POINT },
        encoding: { x, y, detail: { field: 'Country' } },
      },
      {
        data: { values: rows.filter((row) => row.Country === 'Norway') },
        mark: { type: 'line', strokeWidth: 5, color: GREEN, strokeCap: 'round' },
        encoding: { x, y },
      },
      {
        data: { values: last },
        mark: { type: 'text', align: 'left', dx: 7, fontSize: 11, font: FONT },
        encoding: {
          x: { field: 'Year', type: 'quantitative' },
          y: { field: 'EV share (%)', type: 'quantitative' },
          text: { field: 'Country' },
          color: { condition: { test: "datum.Country === 'Norway'", value: '#2e8c70' }, value: '#8a8a8a' },
          fontWeight: { condition: { test: "datum.Country === 'Norway'", value: 'bold' }, value: 'normal' },
        },
      },
    ],
  };
}

/** The in-text legend probe, its header set on the house's grey panel and centred like the house headline. */
function titleLegend() {
  const probe = inTextLegendProbe(theme, { ...t, titleSize: 14 }, { n: 3 });
  const header = (probe.expectedFrame?.headerHtml ?? '').replace(/margin:0 14px/g, 'text-align:center;margin:0 14px');
  return { ...probe, expectedFrame: { headerHtml: header, style: { background: PANEL, paddingTop: '14px' } } };
}

const monash: StyleGuideTheme = {
  id: 'monash-climate',
  org: 'Monash Climate Change Communication Research Hub',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch (no `extends`). The guide (Painter et al., April 2021) is a short research report: rules on pp. 5–6 and a worked case study. Stated directly: Helvetica; a bold, sentence-case, centred headline that states the finding; grey tick labels with the unit on every tick (`annotation.unit: "everyTick"`); short plain-language axis titles kept on their axes; thin horizontal gridlines only, no axis lines, no ticks, few increments; no legend where a direct label can do (`seriesEnd`, then inline); turquoise-green `#61c3a5` as the single ink; magnitude in the lightness of one hue (the orange row of the guide’s warm ramps); cold blue to warm red for diverging.',
    'Approximated: the guide gives no categorical palette, only pairs to avoid (red/black, light blue/purple, yellow-green/grey, brown/green, red/green, yellow/green) and “no yellow in non-focus elements”, so the set is built from its own ramps and avoids them. The canvas is the light-grey `#f4f4f4` panel the printed figures sit on, although the text says white.',
    'Not stated (see the gaps): grey context data under one coloured message mark, a legend written into the title as coloured words, warm-for-heat colour semantics, tree icons anchoring the axis ends, the rollover tooltip and the “FIGURE n.” caption.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Figures 5–6: bold centred finding as the headline; small light-grey unconnected dots; one thick turquoise trend line as the only colour; thin horizontal gridlines, no axis lines or ticks; units on every tick (5%…30%, 4°C…12°C); rotated “Urban heating” and centred “Tree coverage” titles; y range cut to the data; tree icons at the low and high ends of x; “FIGURE 6.” caption beneath.',
      current: 'Flint’s Regression draws the dots and the fit in the house ink, on the grey panel with horizontal gridlines and the centred bold headline.',
      expected: 'Figure 6 redrawn on the same 25 local government areas.',
      flint: regressionFlint(SIG_TITLE),
      expectedSpec: signature(true),
      expectedFrame: { footerHtml: caption(6, 'Graph design depicting the effect of tree coverage on urban heat (icons coloured)') },
      observed: 'Flint gets a lot right: grey panel, centred bold headline, units on every tick (4°C…10°C, 0%…30%), rotated “Urban heating”, no axis lines or ticks. It differs where the message lives: the dots are the same turquoise as the fit, so the trend line does not stand out; the fit is about 3px rather than the specimen’s thick ~5px stroke; vertical gridlines are drawn; x runs from 0% though the data start at 5%. No icons and no “FIGURE 6.” caption.',
    },
    {
      id: 'context-grey',
      title: 'Grey context, one colour for the message',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'highlight',
      rule: '“The trend line is the primary coloured item … Grey was used for all the scatter points”; generally, use colour sparingly to highlight the key message and leave the rest grey.',
      current: 'ThemeSpec has one ink per series and no role for context: a scatter’s dots and its fit take the same `single` ink, and four lines take four categorical hues with nothing saying which carries the message.',
      expected: 'Norway as a thick turquoise line, the other countries thin grey, each named at its end; no key.',
      proposal: '`ink.series.context` for observations under a summary mark (and for non-emphasised series), with `chart_spec.emphasis` naming the series that carries the message.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway shows what is possible',
        subtitle: 'Share of new cars sold that are electric',
      }),
      expectedSpec: emphasisExpected(),
      observed: 'Flint: four lines in four hues (turquoise, blue, orange, plum), each named at its end in its colour, plus x and y titles. Expected: Norway alone in thick turquoise, the other three thin grey with grey names — the story reads in one glance.',
    },
    {
      id: 'title-legend',
      title: 'Legend embedded in the title as coloured words',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'in-text-legend',
      rule: '“Avoid legends if direct labels are possible · Try to embed the legend into the chart title with color coding.”',
      current: '`legend.placement` lists positions around or on the plot, not in the headline. Flint honours the guide’s first choice (`seriesEnd` direct labels), so this only bites where direct labels cannot be placed and Flint falls back to a key.',
      expected: 'The series names in the headline, each in its line colour; no key.',
      proposal: 'A `legend.placement: "title"` value that colours series names found in the headline, with the key as fallback when a name is missing.',
      ...titleLegend(),
      observed: 'Flint draws no key: it names each line at its end in its colour — the guide’s preferred option — while the headline stays black. Expected: the three country names coloured inside the headline, no labels on the lines.',
    },
    {
      id: 'scatter-vertical-grid',
      addressed: { stage: 'GR1', note: 'The vertical gridlines are gone, and x now fits the data (5%) rather than running from 0, which the restored grid had forced (GR1).' },
      title: 'Vertical gridlines come back on the scatter',
      kind: 'realization',
      severity: 'medium',
      probe: 'gridline-style',
      rule: '“Remove vertical grid-lines” (Appendix C); thin horizontal gridlines only.',
      current: 'Stated as `structure.grid: { measure: "quiet", category: "omit" }` — by the schema’s own definition the rule a house that “rules only horizontally” writes. On the Regression chart Flint still draws a vertical gridline at every x tick, and extends x to 0% although the data start at 5%.',
      expected: 'Flint’s own dots and line, with horizontal gridlines only and x cut to the data range.',
      proposal: 'On a scatter/regression the measure grid is the one across y; `category: "omit"` should drop the x grid there, as it does on bars.',
      flint: regressionFlint(SIG_TITLE),
      expectedSpec: signature(false, false, true),
      observed: 'Same dots and line on both sides; Flint adds a vertical gridline at every 5% and starts x at 0%, leaving an empty band at the left. Expected: horizontal lines only, x from 5% to 30%.',
    },
    {
      id: 'warm-cold',
      title: 'Warm colours for heat, blue for cold',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'per-mark-palette',
      rule: '“Consider color association: high temperature — warm colours (eg. red); low temperature — blue colours”; traffic-light semantics where relevant.',
      current: '`ink.series.status` is good/bad (`positive` here is the guide’s green). A temperature anomaly is signed, but warmer is not “positive” in that sense; the theme cannot say that a temperature measure takes the warm/cold pair.',
      expected: 'Warming decades red, cooling decades blue.',
      proposal: 'Semantic colour roles keyed on the measure’s semantic type: `ink.series.byMeaning: { Temperature: { above: "#b52b36", below: "#2f6097" } }`, chosen before `status`.',
      ...signedProbe(theme, t, { positive: '#b52b36', negative: '#3771a9' }),
      observed: 'Flint draws every decade turquoise (the single ink), cooling and warming alike; in the gallery the coloured version of this chart puts “Above average” in blue and “Below average” in turquoise — the opposite of the guide’s association. Expected: warm red above zero, blue below.',
    },
    {
      id: 'rollover',
      title: 'Rollover: white box, bold place name, values with units',
      kind: 'product-ui',
      severity: 'low',
      probe: 'tooltip-style',
      rule: 'Figure 10: a rollover on a data point opens a white rectangular box with a thin grey outline — the place name in bold, then “Tree Coverage: 20.91%” and “UH: 7.03°C”.',
      current: 'ThemeSpec has `interaction.tooltipFormat` only; the tooltip’s box, outline and type are the host’s.',
      expected: 'A square-cornered white box, thin grey border, bold first line.',
      proposal: '`interaction.tooltip: { fill, border, radius, titleWeight }` realised as Vega tooltip theme CSS.',
      flint: regressionFlint(SIG_TITLE),
      expectedSpec: signature(false, true),
      observed: 'Flint shows a static chart (its tooltip, when hovered, is the host’s default style). Expected: Figure 10’s box pinned on Maroondah — white, thin grey outline, bold name, two value lines with units.',
    },
    {
      id: 'icon-anchors',
      title: 'Pictorial anchors at the ends of the x axis',
      kind: 'chart-spec',
      severity: 'low',
      probe: 'annotation',
      rule: 'Familiar icons — a small tree at the low end of tree coverage, a large cluster at the high end — sit inside the plot at the ends of x, greyscale or light green so they never compete with the trend.',
      current: 'Neither spec can place a pictogram at a data position; Flint draws none.',
      expected: 'See the signature’s expected panel: a small tree at 5%, a cluster at 25–30%.',
      proposal: '`chart_spec.annotations: [{ kind: "icon", at: { x }, src, size }]`, with the theme deciding their ink (`annotation.iconInk: "context"`).',
    },
    {
      id: 'figure-caption',
      title: '“FIGURE n.” caption with an italic description',
      kind: 'chart-spec',
      severity: 'low',
      probe: 'figure-number',
      rule: 'Report figures are captioned below: “FIGURE 6.” in letter-spaced capitals, then an italic one-line description.',
      current: 'No figure-number or caption slot in the chart spec.',
      expected: 'See the signature’s expected panel.',
      proposal: '`chart_spec.label` + `chart_spec.caption`, with `type.figureLabel` (case, tracking) and caption placement in the theme.',
    },
    {
      id: 'avoid-pairs',
      title: 'Colour pairs to avoid, and no yellow in non-focus elements',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'count-palette',
      rule: 'Avoid red/black, light blue/purple, yellow-green/light grey, brown/green (typical vision) and yellow/green, red/green (colour blindness); avoid yellow in backgrounds or non-focus aspects; avoid very bright and very dim colours.',
      current: 'A palette is an ordered list; nothing says which inks may not sit next to each other, so a fallback or extended ink can still produce a forbidden pair.',
      expected: 'The compiler skips an ink that would make a forbidden pair with one already on the chart.',
      proposal: '`ink.series.avoidPairs: [["#d73642", "#3a783c"], …]` checked at grounding, reported when it forces a skip.',
    },
  ],
};

export default monash;
