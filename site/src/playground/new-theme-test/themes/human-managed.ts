import type { ThemeSpec } from 'flint-chart';
import research from '../research/human-managed.json';
import { cardProbe, EV_SHARE, flintInput, footerProbe, highlightProbe, UNEMPLOYMENT, withChartSource } from '../probes';
import { footerHtml, houseConfig, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

// Sofia Pro is proprietary; Poppins (loaded on the page) is the nearest geometric sans.
const FONT = "'Sofia Pro', Poppins, 'Nunito Sans', sans-serif";

const NAVY = '#022334';
const GREY = '#706C61';
const GRID = '#D8D8D8';
const SMOKE = '#F5F5F5';
const NULL = '#ADADAD';
const BLUE_GREY = '#81919A';
const GREEN = '#42B24F';
const YELLOW = '#F9C80E';

/** Card width 684px with 24px padding on each side. */
const CARD_W = 684;
const PLOT_W = CARD_W - 48 - 120;

const t: HouseTokens = {
  font: FONT,
  text: NAVY,
  muted: GREY,
  grid: GRID,
  axis: GREY,
  background: SMOKE,
  palette: ['#8ED195', YELLOW, GREEN, BLUE_GREY, '#00B0F0', '#711EFF', '#AB2346'],
  highlight: GREEN,
  context: BLUE_GREY,
  titleSize: 24,
  titleWeight: 'bold',
  subtitleSize: 16,
  subtitleColor: NAVY,
  labelSize: 14,
  sourceSize: 12,
  gridAxis: 'both',
  legendOrient: 'none',
};

const theme: ThemeSpec = {
  id: 'human-managed',
  label: 'Human Managed',
  ink: {
    surface: { source: 'house', canvas: SMOKE, plot: SMOKE },
    text: { primary: NAVY, secondary: GREY, muted: NULL },
    structure: { axis: GREY, grid: GRID },
    series: {
      single: '#8ED195',
      // The three-group combination (yellow, green, blue-grey); its prefixes are the guide's two-group set too.
      categorical: [YELLOW, GREEN, BLUE_GREY, '#00B0F0', '#711EFF', '#AB2346'],
      sequential: { stops: ['#C6E8CA', '#A1D9A7', '#7BC984', '#55BA61', GREEN, '#286B2F'], space: 'lab' },
    },
    accent: '#00B0F0',
  },
  type: {
    headline: { family: FONT, size: 24, weight: 'bold', case: 'title', color: NAVY },
    deck: { family: FONT, size: 16, weight: 'regular', case: 'sentence', color: NAVY },
    // The guide sets axis titles and labels in Sofia Pro Light.
    axisTitle: { family: FONT, size: 14, weight: 'light', case: 'sentence', color: GREY },
    axisLabel: { family: FONT, size: 14, weight: 'light', case: 'sentence', color: GREY },
    keyLabel: { family: FONT, size: 14, weight: 'semibold', case: 'sentence', color: NAVY },
    valueLabel: { family: FONT, size: 14, weight: 'regular', color: NAVY },
    annotation: { family: FONT, size: 14, color: NAVY },
    footnote: { family: FONT, size: 12, color: NAVY },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1, ticks: 'omit', labelGap: 8 },
      measure: { line: 'omit', ticks: 'omit', labelGap: 5 },
    },
    grid: { measure: 'quiet', category: 'quiet', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: { cornerRadius: 0, bandFraction: 0.5 },
  labels: { truncation: 'wrap' },
  // Direct labels instead of a legend.
  legend: { show: 'always', placement: ['seriesEnd', 'inline', 'right'], title: 'whenAmbiguous' },
  dataLabels: { show: 'whenTheyFit', placement: 'atMark', inkMode: 'contrastWithMark' },
  annotation: { axisTitles: 'always', axisTitlePlacement: 'flatAboveAxis', unitsInAxisTitle: true, axisTitleGap: 12 },
  layout: { density: 'airy', titleBlock: { anchor: 'start', gap: 'loose', deckGap: 'normal' }, bandStepFit: 1 },
  compileDefaults: { baseSize: { width: CARD_W - 48, height: 320 } },
  // The source line, as the guide sets it (S1); the chart gives the words.
  source: { leadInWeight: 'bold' },
};

// ---------------------------------------------------------------------------
// Signature: the basic template — a stacked bar with values inside and names beside it.

const QUARTERS = ['Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023'];
const TIERS = ['Hot storage', 'Warm storage', 'Cold storage'];
const STORE: Record<string, number[]> = {
  'Hot storage': [4.68, 4.92, 5.31, 5.77],
  'Warm storage': [4.41, 4.55, 4.6, 4.83],
  'Cold storage': [2.16, 2.48, 2.95, 3.4],
};
const STORAGE = QUARTERS.flatMap((Quarter, i) => TIERS.map((Tier) => ({ Quarter, Tier, 'Data stored (mil GB)': STORE[Tier][i] })));
const TIER_INK = [YELLOW, GREEN, BLUE_GREY];

const header = (title: string, subtitle: string) =>
  `<div style="font-family:${FONT};color:${NAVY};margin:0 0 0 0">`
  + `<div style="font-size:24px;font-weight:700;line-height:1.2">${title}</div>`
  + `<div style="font-size:16px;margin-top:10px">${subtitle}</div></div>`;

const CARD = { background: SMOKE, padding: '24px', width: `${CARD_W}px`, boxSizing: 'border-box' };

/** The y title flat above the axis, units in brackets, Light grey. */
const yTitleLayer = (text: string) => ({
  data: { values: [{}] },
  mark: { type: 'text', text, align: 'left', baseline: 'bottom', font: FONT, fontSize: 14, fontWeight: 300, color: GREY, clip: false },
  encoding: { x: { value: -36 }, y: { value: -24 } },
});

function signatureExpected() {
  const x = {
    field: 'Quarter', type: 'nominal', sort: QUARTERS, scale: { paddingInner: 0.55, paddingOuter: 0.3 },
    axis: { title: 'Quarter (2023)', titleFont: FONT, titleFontSize: 14, titleFontWeight: 300, titleColor: GREY, titlePadding: 24, labelExpr: "replace(datum.label, ' 2023', '')", labelFontSize: 14, labelFontWeight: 300, labelColor: GREY, labelPadding: 8, domain: true, domainColor: GREY, ticks: false, grid: true, gridColor: GRID, labelAngle: 0, bandPosition: 0.5 },
  };
  const y = {
    field: 'Data stored (mil GB)', type: 'quantitative', stack: true, scale: { domain: [0, 15] },
    axis: { title: null, values: [0, 5, 10, 15], labelFontSize: 14, labelFontWeight: 300, labelColor: GREY, labelAlign: 'left', labelBaseline: 'bottom', labelPadding: 36, labelOffset: -2, domain: false, ticks: false, grid: true, gridColor: GRID },
  };
  const order = { field: 'stackOrder', type: 'quantitative', sort: 'descending' };
  const transform = [{ calculate: `indexof(${JSON.stringify(TIERS)}, datum.Tier)`, as: 'stackOrder' }];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 0, right: 0, top: 40, bottom: 0 }, view: { stroke: null } },
    width: PLOT_W,
    height: 230,
    data: { values: STORAGE },
    transform,
    layer: [
      { mark: { type: 'bar' }, encoding: { x, y, order, color: { field: 'Tier', type: 'nominal', scale: { domain: TIERS, range: TIER_INK }, legend: null } } },
      {
        mark: { type: 'text', font: FONT, fontSize: 14, color: NAVY },
        encoding: { x: { field: 'Quarter', type: 'nominal', sort: QUARTERS }, y: { field: 'Data stored (mil GB)', type: 'quantitative', stack: true, bandPosition: 0.5 }, order, text: { field: 'Data stored (mil GB)', type: 'quantitative', format: '.2f' } },
      },
      {
        transform: [{ filter: "datum.Quarter === 'Q4 2023'" }],
        mark: { type: 'text', align: 'left', dx: 34, font: FONT, fontSize: 14, fontWeight: 600, color: NAVY },
        encoding: { x: { field: 'Quarter', type: 'nominal', sort: QUARTERS }, y: { field: 'Data stored (mil GB)', type: 'quantitative', stack: true, bandPosition: 0.5 }, order, text: { field: 'Tier' } },
      },
      yTitleLayer('Data stored (mil GB)'),
    ],
  };
}

const sourceNote = footerHtml(t, [['Source:', 'HM Works storage telemetry (illustrative).'], ['Note:', 'Cold storage includes archived logs older than 90 days.']], { color: NAVY, size: 12, margin: '20px 0 0' });

// ---------------------------------------------------------------------------
// The y title: flat above the axis, units in brackets.

function yTitleExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 0, right: 8, top: 40, bottom: 4 } },
    width: 400,
    height: 200,
    data: { values: UNEMPLOYMENT },
    layer: [
      {
        mark: { type: 'line', strokeWidth: 2.5, color: '#8ED195' },
        encoding: {
          x: { field: 'Year', type: 'quantitative', axis: { title: 'Year', titleFontWeight: 300, titleColor: GREY, titleFontSize: 14, titlePadding: 24, format: 'd', labelFontSize: 14, labelFontWeight: 300, labelColor: GREY, domain: true, domainColor: GREY, ticks: false, grid: true, gridColor: GRID, tickCount: 5 } },
          y: { field: 'Unemployment (%)', type: 'quantitative', axis: { title: null, labelFontSize: 14, labelFontWeight: 300, labelColor: GREY, labelAlign: 'left', labelPadding: 36, labelBaseline: 'bottom', labelOffset: -2, domain: false, ticks: false, grid: true, gridColor: GRID, tickCount: 5 } },
        },
      },
      yTitleLayer('Unemployment rate (%)'),
    ],
  };
}

// ---------------------------------------------------------------------------
// Null data in grey: a missing month is shown, not dropped.

const ALERTS = [
  ['Jan', 312], ['Feb', 288], ['Mar', 341], ['Apr', null], ['May', 296], ['Jun', 254],
].map(([Month, v]) => ({ Month: Month as string, 'Alerts triaged': v as number | null }));

function nullExpected() {
  const x = { field: 'Month', type: 'nominal', sort: ALERTS.map((row) => row.Month), scale: { paddingInner: 0.4 }, axis: { title: 'Month (2024)', titleFontWeight: 300, titleColor: GREY, titleFontSize: 14, titlePadding: 24, labelFontSize: 14, labelFontWeight: 300, labelColor: GREY, domain: true, domainColor: GREY, ticks: false, labelAngle: 0 } };
  const y = { field: 'v', type: 'quantitative', scale: { domain: [0, 400] }, axis: { title: null, values: [0, 100, 200, 300, 400], labelFontSize: 14, labelFontWeight: 300, labelColor: GREY, labelAlign: 'left', labelPadding: 36, labelBaseline: 'bottom', labelOffset: -2, domain: false, ticks: false, grid: true, gridColor: GRID } };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 0, right: 8, top: 40, bottom: 4 } },
    width: 400,
    height: 200,
    data: { values: ALERTS },
    transform: [{ calculate: "datum['Alerts triaged'] === null ? 400 : datum['Alerts triaged']", as: 'v' }, { calculate: "datum['Alerts triaged'] === null", as: 'missing' }],
    layer: [
      { transform: [{ filter: '!datum.missing' }], mark: { type: 'bar', color: '#8ED195' }, encoding: { x, y } },
      { transform: [{ filter: 'datum.missing' }], mark: { type: 'bar', color: NULL, opacity: 0.35 }, encoding: { x, y } },
      { transform: [{ filter: '!datum.missing' }], mark: { type: 'text', baseline: 'top', dy: 8, font: FONT, fontSize: 14, color: NAVY }, encoding: { x, y, text: { field: 'v', type: 'quantitative' } } },
      { transform: [{ filter: 'datum.missing' }], mark: { type: 'text', baseline: 'middle', font: FONT, fontSize: 12, color: NAVY, angle: 0 }, encoding: { x, y: { datum: 200, type: 'quantitative' }, text: { value: 'No data' } } },
      yTitleLayer('Alerts triaged (count)'),
    ],
  };
}

// ---------------------------------------------------------------------------
// Direct labels in Deep blue Semibold, whatever the series ink.

const EV3 = ['Norway', 'China', 'Germany'];
const EV_INK = [YELLOW, GREEN, BLUE_GREY];

function directLabelsExpected() {
  const rows = EV_SHARE.filter((row) => EV3.includes(row.Country));
  const last = rows.filter((row) => row.Year === 2023);
  const axisCommon = { labelFontSize: 14, labelFontWeight: 300, labelColor: GREY, domain: false, ticks: false, grid: true, gridColor: GRID };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 0, right: 8, top: 40, bottom: 4 } },
    width: 360,
    height: 200,
    layer: [
      {
        data: { values: rows },
        mark: { type: 'line', strokeWidth: 2.5 },
        encoding: {
          x: { field: 'Year', type: 'quantitative', axis: { ...axisCommon, domain: true, domainColor: GREY, format: 'd', values: [2018, 2019, 2020, 2021, 2022, 2023], title: 'Year', titleFontWeight: 300, titleColor: GREY, titleFontSize: 14, titlePadding: 24 } },
          y: { field: 'EV share (%)', type: 'quantitative', axis: { ...axisCommon, title: null, labelAlign: 'left', labelPadding: 36, labelBaseline: 'bottom', labelOffset: -2, values: [0, 25, 50, 75, 100] } },
          color: { field: 'Country', type: 'nominal', scale: { domain: EV3, range: EV_INK }, legend: null },
        },
      },
      {
        data: { values: last },
        mark: { type: 'text', align: 'left', dx: 8, font: FONT, fontSize: 14, fontWeight: 600, color: NAVY },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'EV share (%)', type: 'quantitative' }, text: { field: 'Country' } },
      },
      yTitleLayer('EV share of new cars (%)'),
    ],
  };
}

const hm: StyleGuideTheme = {
  id: 'human-managed',
  org: 'Human Managed — Data Viz Style Guide (Figma \'Data viz system\')',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the Figma “Data viz system” file (beta). Sofia Pro is proprietary; Poppins, the closest geometric face loaded on this page, stands in, and the Light (300) weight the guide asks for axis text renders as Poppins Light in the expected panels.',
    'Stated directly: the White smoke `#F5F5F5` ground, Deep blue `#022334` for headline, deck, values and direct labels, Medium Gray `#706C61` for axis titles and labels, Light Gray `#D8D8D8` gridlines in both directions with no tick marks and no y-axis line; a 24px bold title-case headline over a 16px deck; Green 40% `#8ED195` as the single-series ink and the yellow / green / blue-grey three-group combination as the categorical order (its prefixes are also the guide’s yellow + green two-group pair); a flat y title above the axis with the unit in brackets; direct labels in place of a key; values on the mark only where contrast allows; a 636px default plot (the 684px card less its 24px padding).',
    'Not stated: the card itself (684px, 24px padding, 48px from deck to plot), the Light weight, sentence case for everything but the title, the bold “Source:” / “Note:” footer, emphasis green against comparison blue-grey, and grey for null data. See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look: the basic template',
      kind: 'visual-quality',
      severity: 'high',
      observed: "Flint gets the smoke ground, the bold title and deck, the flat “Data stored (mil GB)” title and values inside the segments (white on green and blue-grey, navy on yellow). It differs in the key — a square-swatch legend at the right, where the guide writes the names in Semibold beside the last bar — in the y labels (right-aligned beside their gridlines, not left-aligned on top of them), the missing vertical gridlines, and the missing Source/Note footer; the deck breaks onto two lines. (Before `bandStepFit: 1` the plot was squeezed and the “Q1 2023” labels overlapped.)",
      probe: 'signature',
      rule: 'A 684px White smoke card with 24px padding; a 24px bold title-case title and a 16px sentence-case deck 24px below it; 48px down to a flat “Y Axis Title (Units)” in Light grey at the top-left; y labels left-aligned, sitting 5px above their gridlines; gridlines both ways; stacked bars in yellow / green / blue-grey with the value inside each segment and the category name in Semibold beside the last bar; x labels 8px below the axis and a centred x title 24px lower; “Source:” and “Note:” in bold at the bottom-left.',
      current: 'Flint draws the stacked bars on the smoke ground with the house type and grid. It cannot draw the card padding or the bold Source/Note footer; see how it places the key, the values and the y title.',
      expected: 'The template’s stacked bar applied to four quarters of storage data.',
      flint: flintInput(theme, {
        chartType: 'Stacked Bar Chart',
        data: STORAGE,
        semantic_types: { Quarter: 'Category', Tier: 'Category', 'Data stored (mil GB)': 'Quantity' },
        encodings: { x: 'Quarter', y: 'Data stored (mil GB)', color: 'Tier' },
        title: 'Hot Storage Keeps Growing',
        subtitle: 'Hot storage grew 23% in 2023 while warm storage stayed flat',
        baseSize: { width: PLOT_W, height: 230 },
      }),
      expectedSpec: signatureExpected(),
      expectedFrame: {
        style: CARD,
        headerHtml: header('Hot Storage Keeps Growing', 'Hot storage grew 23% in 2023 while warm storage stayed flat') + '<div style="height:24px"></div>',
        footerHtml: sourceNote,
      },
    },
    {
      id: 'card',
      title: 'A 684px card with 24px padding and a 48px gap above the plot',
      kind: 'expressiveness',
      severity: 'medium',
      observed: "Flint fills its canvas with smoke and stacks the title, deck and a flat “Unemployment (%)” title, but the tick labels shrink to ~9px — Flint reports `labels-shrunk`: “the axis is crowded … the house’s 15.5px would not stand” — on a 5-tick value axis; the y axis starts at 3. Expected: the smoke card with 24px padding, 14px labels, the axis from 0%.",
      probe: 'card-container',
      rule: '“684px standard width, height is flexible”, White smoke background, no border; 24px around the title and deck, 48px from the deck to the chart, 24px from the tick labels to the x title.',
      current: 'The theme can paint the canvas smoke and set a default plot size (`compileDefaults.baseSize`), and `layout.titleBlock.gap: "loose"` is the nearest word for the 48px gap. There is no padding field, so the chart sits on Flint’s own padding, and no fixed outer width.',
      expected: 'The unemployment chart inside the smoke card with the guide’s padding and gaps.',
      proposal: '`layout.padding: 24`, `layout.titleBlock.gap: 48` (px as well as words), `layout.outerWidth: 684`.',
      ...cardProbe(theme, t, { style: { background: SMOKE, padding: '24px' }, header: 'Unemployment Rate', meta: 'United States, 2000–2023', actions: false }),
    },
    {
      id: 'y-title',
      title: 'Y title flat at the top-left, units in brackets, Light grey',
      kind: 'visual-quality',
      severity: 'medium',
      observed: "Flint flattens “Unemployment (%)” above the axis as asked, but sets it larger than the 9px tick labels it shrank, and keeps the labels right-aligned beside their gridlines. Expected: “Unemployment rate (%)” in Light grey at the left edge, the labels left-aligned on their gridlines.",
      probe: 'axis-title-relocation',
      rule: '“Y Axis Title (Units) — Sofia Pro light, 14px. Show units in parenthesis”: horizontal, at the top-left of the plot, starting at the same left edge as the y labels; labels left-aligned, 5px above their gridlines.',
      current: 'Stated as `annotation.axisTitlePlacement: "flatAboveAxis"` with `unitsInAxisTitle: true`. Flint writes the title from the field name and its unit; the weight can only be regular, and the y labels stay right-aligned beside their gridlines.',
      expected: 'The unemployment line with “Unemployment rate (%)” flat above the left edge and left-aligned labels resting on the gridlines.',
      proposal: '`structure.axis.measure.labelPosition: "aboveGridline"` with `labelAlign: "blockEdge"`, and numeric weights in `TypeRole.weight` (300).',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Unemployment Spiked Twice in Two Decades',
        baseSize: { width: 400, height: 200 },
      }),
      expectedSpec: yTitleExpected(),
      expectedFrame: { style: CARD, headerHtml: header('Unemployment Spiked Twice in Two Decades', 'The pandemic peak was shorter than the 2010 one') + '<div style="height:12px"></div>' },
    },
    {
      id: 'source-note',
      addressed: { stage: 'S1', note: '“Source:” bold at the bottom left. The Note line and the card stay open.' },
      title: '“Source:” and “Note:” in bold at the bottom-left of the card',
      kind: 'chart-spec',
      severity: 'high',
      observed: "Flint draws the population bars with values and a flat “Country” title, and nothing under the chart. Expected: the bars with “Source:” and “Note:” lines in navy, the lead words bold.",
      probe: 'source-line',
      rule: 'Inside the card, bottom-left: “Source: If applicable.” and “Note: What the audience may wish to be aware of.” — Sofia Pro Regular 12px in Deep blue, the lead words bold.',
      current: 'The chart spec has no source or note slot, so nothing closes the chart.',
      expected: 'The population chart with a bold-led Source and Note under it.',
      proposal: '`chart_spec.source` / `chart_spec.notes[]` rendered with `type.footnote`, plus `annotation.sourceLabel: { text: "Source:", weight: "bold" }`.',
      ...footerProbe(theme, t, { title: 'India and China Hold Over a Third of Humanity', footer: [] }),
      expectedFrame: { style: { background: SMOKE }, footerHtml: footerHtml(t, [['Source:', 'UN World Population Prospects 2022.'], ['Note:', 'Mid-year estimates.']], { color: NAVY, size: 12 }) },
    },
    {
      id: 'emphasis',
      title: 'Green for emphasis, blue-grey for comparison',
      kind: 'chart-spec',
      severity: 'medium',
      observed: "Flint draws every bar in Green 40% with the values printed inside. Expected: Nigeria in Green, the others in Blue-Gray.",
      probe: 'highlight',
      rule: '“TWO GROUPS: Blue-Gray #81919A for comparison; Green #42B24F for emphasis”; de-emphasised data in Blue-Gray.',
      current: 'There is no way to name the emphasised category; every bar takes the single-series Green 40%.',
      expected: 'Nigeria in Green, every other country in Blue-Gray.',
      proposal: '`chart_spec.emphasis` with `ink.series.emphasis` / `ink.series.context` in the theme.',
      ...highlightProbe(theme, t, { title: 'Nigeria Is the Most Populous Country in Africa' }),
    },
    {
      id: 'null-data',
      title: 'Missing values drawn in grey, not dropped',
      kind: 'expressiveness',
      severity: 'medium',
      observed: "Flint leaves April’s slot empty with no mark and no note, shrinks the y labels to ~9px, and truncates “May” to “M…” although the column is wide enough. Expected: April as a pale grey placeholder labelled “No data”.",
      probe: 'missing-data',
      rule: '“NULL DATA Gray #ADADAD” — a category with no value is still shown, in the null-data grey, so its absence is visible.',
      current: 'No ink for missing values; Flint leaves the slot empty (or drops the row), so April looks like a gap in the axis rather than a known absence.',
      expected: 'April as a pale grey placeholder column labelled “No data”.',
      proposal: '`ink.series.missing: "#ADADAD"` with `marks.missing: "placeholder" | "gap" | "omit"`.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: ALERTS,
        semantic_types: { Month: 'Category', 'Alerts triaged': 'Quantity' },
        encodings: { x: 'Month', y: 'Alerts triaged' },
        title: 'Alerts Triaged per Month',
        baseSize: { width: 400, height: 200 },
      }),
      expectedSpec: nullExpected(),
      expectedFrame: { style: CARD, headerHtml: header('Alerts Triaged per Month', 'April’s count is missing after a collector outage') + '<div style="height:12px"></div>' },
    },
    {
      id: 'direct-label-ink',
      title: 'Direct labels in Deep blue Semibold, not in the series colour',
      kind: 'visual-quality',
      severity: 'medium',
      observed: "Flint labels the line ends in the line colours: “Norway” in yellow is barely legible on the smoke ground, “China” in green and “Germany” in blue-grey. Expected: all three names in Deep blue Semibold.",
      probe: 'series-text-ink',
      rule: 'Direct labels replace the legend: “Directly labeled categories — Semibold, 14px, HM deep blue #022334”; text over or beside chart elements only where it passes AA contrast.',
      current: 'With `legend.placement: ["seriesEnd", …]` Flint writes each name at the line end in that line’s ink; the house yellow `#F9C80E` on White smoke is unreadable, and there is no field that makes a series label take `text.primary` instead.',
      expected: 'Three lines with their names in Deep blue Semibold at the line ends.',
      proposal: '`legend.labelInk: "text" | "matchSeries"` (and `legend.labelWeight`), defaulting to a contrast floor against the canvas.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE.filter((row) => EV3.includes(row.Country)),
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway Leads Electric-Car Sales',
        baseSize: { width: 360, height: 200 },
      }),
      expectedSpec: directLabelsExpected(),
      expectedFrame: { style: CARD, headerHtml: header('Norway Leads Electric-Car Sales', 'China overtook Germany in 2022') + '<div style="height:12px"></div>' },
    },
    {
      id: 'light-weight-sentence-case',
      addressed: { stage: 'T3', note: 'Light axis text (T2), and the new `case: "sentence"` on every role but the title (T3).' },
      title: 'Light axis text; sentence case everywhere but the title',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'type-weight-scale',
      rule: 'Axis titles and labels in Sofia Pro Light; directly labelled categories Semibold. “Title case for Title; Sentence case for all other rows.”',
      current: '`TypeRole.weight` stops at `regular` at the light end, so axis text is drawn at 400; `TypeRole.case` has `title`, `upper`, `lower` and `asIs`, but no `sentence`, so deck and labels cannot be normalised.',
      expected: 'Axis text at 300; deck, labels and notes in sentence case.',
      proposal: 'Numeric weights (100–900) in `TypeRole.weight`; `case: "sentence"`.',
    },
  ],
};

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(hm, 'Internal storage logs', ['source-note']);

export default hm;
