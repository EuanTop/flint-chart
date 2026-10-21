import type { ThemeSpec } from 'flint-chart';
import { logoImage } from '../house-logos';
import research from '../research/sunlight.json';
import { EV_SHARE, MEDALS, POPULATION, UNEMPLOYMENT, flintInput, withChartSource } from '../probes';
import { houseConfig, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FRANKLIN = "'ITC Franklin Gothic Std', 'Libre Franklin', 'Franklin Gothic Medium', Arial, sans-serif";
const GEORGIA = "Georgia, 'Times New Roman', serif";
const BG_LIGHT = '#F5F3F2';
const BG_DARK = '#EFECEA';
const BG_ACCENT = '#E5E2E0';
const LINE_GREY = '#C0C0BB';
const DASH_GREY = '#CDCDC9';
const TEXT = '#635F5D';
const TEXT_LIGHT = '#8E8883';
const MAIN = ['#E3BA22', '#E6842A', '#137B80', '#8E6C8A', '#978F80'];

const t: HouseTokens = {
  font: FRANKLIN,
  text: TEXT,
  muted: TEXT,
  grid: '#FFFFFF',
  gridAxis: 'both',
  axis: null,
  background: BG_DARK,
  palette: MAIN,
  context: BG_ACCENT,
  titleSize: 20,
  titleWeight: 'normal',
  subtitleSize: 12,
  subtitleStyle: 'italic',
  subtitleColor: TEXT_LIGHT,
  labelSize: 12,
  sourceSize: 8,
  lineWidth: 2,
  legendOrient: 'right',
};

const theme: ThemeSpec = {
  id: 'sunlight',
  label: 'Sunlight Foundation',
  ink: {
    surface: { source: 'house', canvas: BG_LIGHT, plot: BG_DARK },
    text: { primary: TEXT, secondary: TEXT_LIGHT, muted: TEXT_LIGHT, inverse: '#FFFFFF' },
    structure: { grid: '#FFFFFF', axis: '#FFFFFF', rule: LINE_GREY, frame: LINE_GREY, connector: LINE_GREY },
    series: {
      single: MAIN[0],
      categorical: MAIN,
      // Each main colour's light and dark "subset" shades, after the five main colours.
      categoricalExtended: [...MAIN, '#F2DA57', '#F6B656', '#42A5B3', '#B396AD', '#C1BAA9', '#BD8F22', '#BA5F06', '#005D6E', '#684664', '#7C715E'],
      overflow: BG_ACCENT,
      sequential: { stops: ['#F1E8AE', '#F2DA57', '#E3BA22', '#BD8F22', '#936B00'], space: 'lab' },
      diverging: { stops: ['#BD2D28', '#C37A73', '#C8C6C6', '#75A999', '#0F8C79'], neutral: '#C8C6C6', space: 'lab' },
      status: { positive: '#0F8C79', negative: '#BD2D28', neutral: '#C8C6C6' },
    },
    accent: MAIN[0],
  },
  type: {
    headline: { family: FRANKLIN, size: 20, weight: 'regular', color: TEXT },
    deck: { family: GEORGIA, size: 12, style: 'italic', color: TEXT_LIGHT },
    axisLabel: { family: FRANKLIN, size: 12, weight: 'semibold', color: TEXT },
    axisTitle: { family: FRANKLIN, size: 12, weight: 'regular', color: TEXT },
    keyLabel: { family: FRANKLIN, size: 10, color: TEXT },
    valueLabel: { family: FRANKLIN, size: 10, color: TEXT_LIGHT },
    annotation: { family: GEORGIA, size: 10, style: 'italic', color: TEXT },
    footnote: { family: GEORGIA, size: 8, style: 'italic', color: TEXT_LIGHT },
  },
  structure: {
    axis: {
      categorical: { line: 'quiet', lineWeight: 1, ticks: 'omit', labelGap: 5 },
      measure: { line: 'quiet', lineWeight: 1, ticks: 'omit', labelGap: 5 },
    },
    grid: { measure: 'full', category: 'full', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'omit',
  },
  marks: {
    strokeWeight: 2,
    separator: { presence: 'full', width: 1, source: 'surface' },
    reference: { presence: 'full', style: 'dashed', weight: 1, label: true },
  },
  geometry: { line: { width: 2 }, arc: { gap: 1, gapStyle: 'rule' } },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['inside', 'right'], direction: 'vertical', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never', inkMode: 'fixed' },
  annotation: { axisTitles: 'always', axisTitlePlacement: 'rotated', axisTitleGap: 22, unit: 'everyTick', numberFormat: { thousands: 'separator' } },
  furniture: [
    { kind: 'footerRule', anchor: 'bottomLeft', color: DASH_GREY, height: 1 },
    { kind: 'headerRule', anchor: 'topLeft', color: '#FFFFFF', height: 1 },
    // The logo top right, across from the title, 100px wide (F3): the real file from ../logos when present, else a placeholder.
    { kind: 'image', at: 'besideTitle', align: 'end', ...logoImage('sunlight', 'Sunlight logo', TEXT_LIGHT, 100, 24), width: 100, height: 24, href: 'https://sunlightfoundation.com', alt: 'Sunlight Foundation' },
  ],
  layout: { density: 'airy', targetWidth: 650, titleBlock: { anchor: 'start', gap: 'loose' } },
  // The source line, as the guide sets it (S1); the chart gives the words.
  source: { leadInWeight: 'bold', leadInStyle: 'normal' },
};

const logo = `<div style="display:flex;align-items:center;gap:6px;flex:none">`
  + `<div style="position:relative;width:30px;height:28px"><span style="position:absolute;left:0;top:7px;width:21px;height:21px;border-radius:50%;background:#E3BA22;opacity:.85"></span><span style="position:absolute;left:9px;top:0;width:19px;height:19px;border-radius:50%;background:#F2DA57;opacity:.85"></span></div>`
  + `<div style="font-family:${FRANKLIN};line-height:1;color:${TEXT_LIGHT};letter-spacing:.3px"><div style="font-weight:700;font-size:15px;color:#7A7470">SUNLIGHT</div><div style="font-size:14px">FOUNDATION</div></div></div>`;

/** The title band: Franklin title with one Demi word, Georgia italic deck, logo top-right, a white rule under it. */
const band = (before: string, emphasis: string, deck: string, withLogo = true) =>
  `<div style="background:${BG_LIGHT};border-bottom:1px solid #FFFFFF;padding:14px 22px 14px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px">`
  + `<div><div style="font-family:${FRANKLIN};font-size:20px;color:${TEXT}">${before} <b style="font-weight:700">${emphasis}</b></div>`
  + `<div style="font-family:${GEORGIA};font-style:italic;font-size:12px;color:${TEXT_LIGHT};margin-top:6px">${deck}</div></div>`
  + `${withLogo ? logo : ''}</div>`;

/** The source strip: a 1px 4/4 dashed rule, then Georgia 8px, bold "Source:" and italic text. */
const strip = (source: string) =>
  `<div style="background:${BG_ACCENT};border-top:1px dashed ${DASH_GREY};padding:7px 22px;font-family:${GEORGIA};font-size:8px;color:${TEXT_LIGHT}"><b>Source:</b> <i>${source}</i></div>`;

const frame = { background: BG_DARK, border: `1px solid ${BG_ACCENT}` };

const config = (extra: Record<string, unknown> = {}) => {
  const base = houseConfig(t) as Record<string, any>;
  return {
    ...base,
    padding: { left: 22, right: 22, top: 18, bottom: 14 },
    axis: { ...base.axis, labelFontWeight: 600, labelPadding: 5, titleFontWeight: 'normal', titleColor: TEXT, titlePadding: 14, domain: false },
    axisY: { ...base.axisY, titleAngle: -90 },
    legend: {
      ...base.legend,
      orient: 'right',
      direction: 'vertical',
      fillColor: BG_ACCENT,
      strokeColor: LINE_GREY,
      padding: 10,
      labelFontSize: 10,
      labelColor: TEXT,
      rowPadding: 8,
      offset: 16,
    },
    ...extra,
  };
};

const vl = (spec: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  config: config(extra),
  ...spec,
});

const SIG_ROWS = EV_SHARE.filter((row) => row.Country === 'Norway' || row.Country === 'China');

function signature() {
  const color = { field: 'Country', type: 'nominal', scale: { domain: ['Norway', 'China'], range: MAIN.slice(0, 2) }, legend: { symbolType: 'stroke', symbolStrokeWidth: 2, symbolSize: 160 } };
  const x = { field: 'Year', type: 'quantitative', title: 'Year', scale: { domain: [2018, 2023], nice: false }, axis: { format: 'd', values: [2018, 2020, 2022, 2023], titlePadding: 14 } };
  const y = { field: 'EV share (%)', type: 'quantitative', title: 'Share of new cars sold', scale: { domain: [0, 100] }, axis: { values: [0, 25, 50, 75, 100], labelExpr: "datum.value === 0 ? '0' : datum.label + '%'", titlePadding: 14 } };
  return vl({
    width: 380,
    height: 210,
    layer: [
      { data: { values: SIG_ROWS }, mark: { type: 'line', strokeWidth: 2 }, encoding: { x, y, color } },
      {
        data: { values: SIG_ROWS.filter((row) => row.Year !== 2022) },
        mark: { type: 'point', filled: true, size: 22, opacity: 1 },
        encoding: { x, y, color: { ...color, legend: null } },
      },
      {
        data: { values: SIG_ROWS.filter((row) => row.Year !== 2022) },
        mark: { type: 'text', dy: -9, fontSize: 10, color: TEXT_LIGHT, font: FRANKLIN },
        encoding: { x, y, text: { field: 'EV share (%)', type: 'quantitative', format: 'd' } },
        transform: [],
      },
    ],
  });
}

const popRows = POPULATION.slice(0, 5);
const popFlint = () => flintInput(theme, {
  chartType: 'Bar Chart',
  data: popRows,
  semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
  encodings: { x: 'Country', y: 'Population' },
  title: 'Two countries dwarf the rest',
  subtitle: 'Population of the five most populous countries, 2023, in millions.',
  baseSize: { width: 520, height: 340 },
});

const popColumns = () => vl({
  width: 380,
  height: 200,
  data: { values: popRows },
  mark: { type: 'bar', color: MAIN[0] },
  encoding: {
    x: { field: 'Country', type: 'nominal', sort: null, title: 'Country', axis: { labelAngle: 0, grid: true, bandPosition: 0.5, gridColor: '#FFFFFF' }, scale: { paddingInner: 0.45 } },
    y: { field: 'Population', type: 'quantitative', title: 'Millions of people', axis: { values: [0, 500, 1000, 1500], labelExpr: "datum.value === 0 ? '0' : datum.label + ' m'" } },
  },
});

const MEDAL_ROWS = MEDALS.filter((row) => ['United States', 'China', 'Japan', 'Australia'].includes(row.Country));

const sunlight: StyleGuideTheme = {
  id: 'sunlight',
  org: 'Sunlight Foundation',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the 2014 Sunlight Foundation data-visualisation style guide PDF (13 pages, values stated in px and hex).',
    'Stated directly: the warm panel (`ink.surface.canvas` #F5F3F2 for the title band, `plot` #EFECEA, measured from the specimen) with 1px white gridlines in both directions and white axis lines; Franklin Gothic labels in #635F5D, Demi (semibold) tick labels, Book axis titles rotated and centred 22px off the labels; a Georgia italic #8E8883 deck; 2px lines; the five main colours, their subset shades as the extended set, the yellow sequential and con→pro diverging scales; dashed 1px Line Grey reference lines; white slice separators; the key on the right; units on every tick; the white rule under the title band (`furniture: headerRule`) and a rule above the source strip (`footerRule`, solid — furniture has no dash).',
    'Approximated: ITC Franklin Gothic is proprietary and condensed; the panels fall back to Libre Franklin (not condensed) and Georgia. Not stated: the one Demi word in the title, the logo top-right, the source strip, the key box’s fill and border, speech-bubble callouts, and party colours — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'A warm grey panel: title band with “Title of the chart” (“chart” in Demi) and a Georgia italic deck, logo top-right, a white rule; a slightly darker plot with white gridlines both ways and no dark axes; bold grey tick labels with units, rotated y title, centred x title; 2px lines with small dots and light value labels at key points; a key box at the right; a dashed rule and darker strip with “Source:” in Georgia bold and the source in italic.',
      current: 'Flint draws the panel colours, white grid, Franklin/Georgia type, units on ticks, rotated axis titles and both rules from the theme. The title cannot carry its bold word, there is no logo or source strip, and the key is not boxed.',
      expected: 'The guide’s “Line Graph (political)” specimen with the EV data.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: SIG_ROWS,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway’s electric lead',
        subtitle: 'Share of new cars sold that are fully or partly electric, 2018–2023.',
        baseSize: { width: 560, height: 360 },
      }),
      expectedSpec: signature(),
      expectedFrame: { style: frame, headerHtml: band('Norway’s electric', 'lead', 'Share of new cars sold that are fully or partly electric, 2018–2023.'), footerHtml: strip('www.iea.org/reports/global-ev-outlook-2024') },
      observed: 'Flint (left) reproduces the two-tone panel, the white gridlines in both directions, Franklin and Georgia type, rotated axis titles and a grey rule at the foot. Its key sits inside the plot on top of the Norway line; tick labels are regular weight rather than Demi; the title has no bold word, no logo and no source strip; the y axis is ruled every 10 points with the unit in the title rather than on the ticks; there are no dots or value labels at key points.',
    },
    {
      id: 'brand-mark',
      addressed: { stage: 'F3', note: 'The logo sits beside the headline at its end (`at: "besideTitle"`); the headline is fitted to the width left. The real logo is used from the local logos folder when present, else a placeholder.' },
      title: 'Logo top-right, opposite the title',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'brand-mark',
      rule: '“Where to put the logo (top right across from the title)”: the Sunlight Foundation mark, 100px wide, 22px from the right edge, level with the headline.',
      current: '`ThemeFurniture.kind` is `mastheadTab | footerRule | headerRule`; there is no logo, so the title band carries only the headline and deck.',
      expected: 'The yellow-circles SUNLIGHT FOUNDATION mark in the title band’s top-right corner.',
      proposal: '`furniture: [{ kind: "logo", src | svg, anchor: "topRight", width: 100, inset: 22 }]`, with the title block’s width reduced to clear it.',
      flint: popFlint(),
      expectedSpec: popColumns(),
      expectedFrame: { style: frame, headerHtml: band('Two countries', 'dwarf the rest', 'Population of the five most populous countries, 2023, in millions.') },
      observed: 'Flint’s title band carries only headline and deck; the top-right corner is empty. Expected: the yellow-circles SUNLIGHT FOUNDATION mark level with the headline.',
    },
    {
      id: 'source-line',
      addressed: { stage: 'S1', note: '“Source:” in Georgia bold, the source in Georgia italic, under the house’s footer rule. The rule’s dash and the darker band behind the strip stay open (a dashed `source.rule` could replace the footer rule).' },
      title: 'Source strip: a darker band under a dashed rule',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: 'Every graphic ends with a source strip: a 1px 4pt-dash/4pt-gap #CDCDC9 rule, then a darker band with “Source:” in Georgia bold and the source in Georgia italic, 8px, #8E8883, left-aligned and vertically centred.',
      current: 'The chart spec has no source slot. The theme states the rule as `footerRule` #CDCDC9, but furniture has no dash and no band fill, so Flint draws a plain solid line with nothing under it.',
      expected: 'Dashed rule, then a #E5E2E0 strip with “Source:” in Georgia bold and “population.un.org/wpp” in italic.',
      proposal: '`chart_spec.source` drawn with `type.footnote`; `ThemeFurniture` gains `dash` and a `band: { fill, height }` so a footer can be a strip, and `annotation.sourceLabel: { text: "Source:", weight: "bold" }`.',
      flint: popFlint(),
      expectedSpec: popColumns(),
      expectedFrame: { style: frame, headerHtml: band('Two countries', 'dwarf the rest', 'Population of the five most populous countries, 2023, in millions.'), footerHtml: strip('population.un.org/wpp') },
      observed: 'Flint draws a solid #CDCDC9 line under the x-axis title, spanning the plot only, with nothing beneath it. Expected: the dashed rule across the panel and a darker strip with the Georgia source.',
    },
    {
      id: 'legend-box',
      title: 'The key is a filled, bordered box',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'legend-box',
      rule: '“Possible key: Fill: Background dark Accent (#E5E2E0), Line: Line Grey (#C0C0BB)”: a box at the right with square swatches (short lines for line charts) and Franklin Book 10px labels.',
      current: 'ThemeSpec places the key (`legend.placement: ["inside", "right"]`, vertical, untitled) but has no field for a key container — no fill, border or padding.',
      expected: 'The medal key in a #E5E2E0 box with a #C0C0BB border, to the right of the grouped columns.',
      proposal: '`legend.container: { fill, stroke, strokeWidth, padding, cornerRadius }` (Vega-Lite’s `fillColor` / `strokeColor` / `padding`).',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: MEDAL_ROWS,
        semantic_types: { Country: 'Country', Medal: 'Category', Count: 'Quantity' },
        encodings: { x: 'Country', y: 'Count', group: 'Medal' },
        title: 'Medals at Paris 2024',
        subtitle: 'Medals won by the four leading nations, by type.',
        baseSize: { width: 560, height: 340 },
      }),
      expectedSpec: vl({
        width: 360,
        height: 200,
        data: { values: MEDAL_ROWS },
        mark: { type: 'bar' },
        encoding: {
          x: { field: 'Country', type: 'nominal', sort: null, title: 'Country', axis: { labelAngle: 0, grid: true, bandPosition: 0.5 }, scale: { paddingInner: 0.3 } },
          xOffset: { field: 'Medal', sort: ['Gold', 'Silver', 'Bronze'] },
          y: { field: 'Count', type: 'quantitative', title: 'Medals', axis: { values: [0, 10, 20, 30, 40] } },
          color: { field: 'Medal', type: 'nominal', sort: ['Gold', 'Silver', 'Bronze'], scale: { range: MAIN.slice(0, 3) } },
        },
      }),
      expectedFrame: { style: frame, headerHtml: band('Medals at', 'Paris 2024', 'Medals won by the four leading nations, by type.', false) },
      observed: 'Flint seats the key in the plot’s top-right corner, unboxed, with 10px labels; on this chart the corner happens to be clear. Expected: the key in a #E5E2E0 box with a #C0C0BB border beside the plot.',
    },
    {
      id: 'annotation',
      title: 'Speech-bubble callouts and a dashed reference line',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'annotation',
      rule: '“Possible label: Fill: White (#FFF), Line: Line Grey (#C0C0BB)” — a callout box with a pointer, Georgia italic 10px #635F5D; “Possible line: 1px 4pt dash 4pt gap Line Grey” for an average or threshold, labelled with its own callout.',
      current: 'The theme states `marks.reference: { style: "dashed", weight: 1 }` and the Georgia italic `type.annotation`, but the chart spec has no slot for a reference value or a callout, so Flint draws neither.',
      expected: 'A dashed average line with a boxed label, and a white speech bubble pointing at the 2020 spike.',
      proposal: '`chart_spec.annotations: [{ at, text }]` and `chart_spec.references: [{ value, label }]`; a theme `annotation.callout: { fill, stroke, pointer: true }` for how they are boxed.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Two jobless spikes',
        subtitle: 'U.S. unemployment rate, annual average, 2000–2023.',
        baseSize: { width: 560, height: 340 },
      }),
      expectedSpec: vl({
        width: 400,
        height: 210,
        layer: [
          {
            data: { values: UNEMPLOYMENT },
            mark: { type: 'line', strokeWidth: 2, color: MAIN[0] },
            encoding: {
              x: { field: 'Year', type: 'quantitative', title: 'Year', scale: { domain: [2000, 2023], nice: false }, axis: { format: 'd', values: [2000, 2005, 2010, 2015, 2020] } },
              y: { field: 'Unemployment (%)', type: 'quantitative', title: 'Unemployment rate', scale: { domain: [0, 12] }, axis: { values: [0, 3, 6, 9, 12], labelExpr: "datum.value === 0 ? '0' : datum.label + '%'" } },
            },
          },
          { data: { values: [{ v: 5.77 }] }, mark: { type: 'rule', color: LINE_GREY, strokeWidth: 1, strokeDash: [4, 4] }, encoding: { y: { field: 'v', type: 'quantitative' } } },
          ...callout({ x: 2000.6, y: 5.77, lines: ['Average, 2000–23: 5.8%'], width: 128, height: 20, dy: -34, pointer: false }),
          ...callout({ x: 2020, y: 8.1, lines: ['Pandemic: the rate', 'more than doubled'], width: 104, height: 32, dy: -50, pointer: true, dx: -88 }),
        ],
      }),
      expectedFrame: { style: frame, headerHtml: band('Two jobless', 'spikes', 'U.S. unemployment rate, annual average, 2000–2023.', false) },
      observed: 'Flint draws the bare line on a 3–10 scale. Expected: a dashed Line Grey average with a white boxed label, and a white speech bubble with a pointer at the 2020 spike, in Georgia italic.',
    },
    {
      id: 'axis-label-weight',
      addressed: { stage: 'T1', note: 'The axis labels’ stated weight is now written (`labelFontWeight`).' },
      title: 'Demi tick labels are drawn in the regular weight',
      kind: 'realization',
      severity: 'medium',
      probe: 'type-weight-scale',
      rule: 'Axis labels are “ITC Franklin Gothic Std Demi 12px #635F5D” — the bold category and value labels (“30 units”, “Monday”, “2000”) are a large part of the house look.',
      current: 'Stated as `type.axisLabel: { weight: "semibold" }`. The axis realizer passes the label font, colour and padding to Vega-Lite but no `labelFontWeight`, so every tick label prints in the regular weight (the title weight is passed; the label weight is not).',
      expected: 'Semibold tick and category labels in #635F5D.',
      proposal: 'Carry `type.axisLabel.weight` / `style` into `axis.labelFontWeight` / `labelFontStyle` (the key labels have the same omission).',
      flint: popFlint(),
      expectedSpec: popColumns(),
      observed: 'Flint’s tick and category labels (“India”, “1,400 m”) are regular weight; the expected labels are semibold. Flint also turns “United States” onto two lines where the expected fits it on one.',
    },
    {
      id: 'legend-overlap',
      addressed: { stage: 'LG1', note: 'The key keeps the inside corner only where the marks leave it free; on a rising line, a pie or a full stack it takes the next placement, `right`, outside the plot (LG1).' },
      title: 'An inside key is laid over the data',
      kind: 'realization',
      severity: 'medium',
      probe: 'legend-placement',
      rule: 'The key sits at the right of the plot in its own box, clear of the lines and bars it keys (both specimens).',
      current: 'With `legend.placement: ["inside", "right"]` Flint seats the key in the plot’s top-right corner without testing what is drawn there; on a rising line chart that is exactly where the lines end.',
      expected: 'The key moved to the next placement (`right`, outside the plot) when the inside corner is occupied.',
      proposal: 'Treat `inside` as conditional: check the corner against the marks’ extent (as the series-end planner already measures label room) and fall back down the ranked list when it collides.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Electric cars, four markets',
        subtitle: 'Share of new cars sold that are fully or partly electric, 2018–2023.',
        baseSize: { width: 560, height: 340 },
      }),
      expectedSpec: vl({
        width: 360,
        height: 200,
        data: { values: EV_SHARE },
        mark: { type: 'line', strokeWidth: 2 },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: 'Year', scale: { domain: [2018, 2023], nice: false }, axis: { format: 'd', values: [2018, 2020, 2022, 2023] } },
          y: { field: 'EV share (%)', type: 'quantitative', title: 'Share of new cars sold', scale: { domain: [0, 100] }, axis: { values: [0, 25, 50, 75, 100], labelExpr: "datum.value === 0 ? '0' : datum.label + '%'" } },
          color: { field: 'Country', type: 'nominal', sort: ['Norway', 'China', 'Germany', 'United States'], scale: { range: MAIN.slice(0, 4) }, legend: { symbolType: 'stroke', symbolStrokeWidth: 2, symbolSize: 160 } },
        },
      }),
      expectedFrame: { style: frame, headerHtml: band('Electric cars,', 'four markets', 'Share of new cars sold that are fully or partly electric, 2018–2023.', false) },
      observed: 'Flint draws the four-country key in the plot’s top-right corner directly over the end of the Norway line, which runs through the “Norway” entry. The same happens across the gallery: the key covers bars in the anomaly and electricity-mix tiles, the area in the generation tile, dots in the Gapminder tile, the pie’s edge, and the heatmap’s gradient key is laid over the cells. Expected: the key boxed outside the plot on the right.',
    },
    {
      id: 'title-emphasis',
      title: 'One word of the title in Demi',
      kind: 'chart-spec',
      severity: 'low',
      probe: 'title-emphasis',
      rule: 'Titles are ITC Franklin Gothic Book Condensed 20px “with Demi Condensed emphasis”: “Title of the chart”, the last word in Demi.',
      current: 'The headline is one string drawn in one `type.headline` weight; neither the chart spec nor the theme can mark a run inside it.',
      expected: 'The key word set in the heavier weight — see the signature panel.',
      proposal: 'Allow light inline markup in `chart_spec.title` (`**chart**`) and a theme `type.headlineEmphasis: TypeRole` for it.',
    },
    {
      id: 'subset-shades',
      title: 'Sub-groups take the light and dark shades of their parent colour',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'per-mark-palette',
      rule: 'Grouped or stacked sub-categories use the main colour’s “subset” shades — Honey Crisp in light mustard stacked on Granny Smith in mustard; Clementine light orange on Navel orange.',
      current: 'The categorical set is flat: a second level of grouping takes the next hue in the list rather than a shade of its parent.',
      expected: 'Two-level colour: hue by group, lightness by sub-group.',
      proposal: '`ink.series.subsets: { [mainInk]: [light, dark] }` used when a colour field nests inside a group field.',
    },
    {
      id: 'axis-from-zero',
      title: 'Bars and lines start at 0',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'axis-from-zero',
      rule: '“Starts at 0” is annotated on both the bar and the line specimens; only scatter plots may alter or break the y axis.',
      current: 'Whether the measure scale reaches zero is decided by the chart template; ThemeSpec has no field for it and `chartDefaults` drops zero-baseline keys. Flint starts the unemployment line at 3 (see the annotation gap’s current panel).',
      expected: 'Line and bar charts read from a zero floor; scatter plots free.',
      proposal: '`structure.axis.measure.floor: "zero" | "data"` as a house default, overridable by the chart spec and guarded by a variant for scatter plots.',
      observed: 'In the annotation gap the Flint line runs 3–10 against the expected 0–12; the bar charts do start at zero.',
    },
  ],
};

/** A Sunlight callout: a white box with a Line Grey border (and a pointer), Georgia italic 10px. */
function callout(o: { x: number; y: number; lines: string[]; width: number; height: number; dy: number; dx?: number; pointer: boolean }) {
  const dx = o.dx ?? 0;
  const at = { data: { values: [{ x: o.x, y: o.y }] } };
  const xy = { x: { field: 'x', type: 'quantitative' }, y: { field: 'y', type: 'quantitative' } };
  return [
    {
      ...at,
      mark: { type: 'rect', fill: '#FFFFFF', stroke: LINE_GREY, strokeWidth: 1, xOffset: dx, x2Offset: dx + o.width, yOffset: o.dy, y2Offset: o.dy + o.height },
      encoding: { ...xy, x2: { field: 'x' }, y2: { field: 'y' } },
    },
    ...(o.pointer ? [{
      ...at,
      mark: { type: 'point', shape: 'triangle-down', filled: true, fill: '#FFFFFF', stroke: LINE_GREY, strokeWidth: 1, size: 70, yOffset: o.dy + o.height + 3 },
      encoding: xy,
    }, {
      ...at,
      mark: { type: 'rule', color: '#FFFFFF', strokeWidth: 2, xOffset: -6, x2Offset: 6, yOffset: o.dy + o.height, y2Offset: o.dy + o.height },
      encoding: { ...xy, x2: { field: 'x' }, y2: { field: 'y' } },
    }] : []),
    {
      ...at,
      mark: { type: 'text', align: 'left', baseline: 'top', font: GEORGIA, fontStyle: 'italic', fontSize: 10, color: TEXT, lineHeight: 12, text: o.lines, xOffset: dx + 6, yOffset: o.dy + 4 },
      encoding: xy,
    },
  ];
}

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(sunlight, 'U.S. Census Bureau', ['source-line']);

export default sunlight;
