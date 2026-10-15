import type { ThemeSpec } from 'flint-chart';
import research from '../research/orange.json';
import { ANOMALY, EV_SHARE, UNEMPLOYMENT, flintInput, highlightProbe } from '../probes';
import { PREVIEW_CASES } from '../../../shared/preview-cases';
import { houseConfig, titled, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const VIOLET = '#8d60cd';
const ORANGE = '#f16e00';
const NEUTRAL = '#666666';
const GRID = '#cccccc';
const PALETTE = ['#5b2f98', '#3ba06e', '#b20077', '#a38200', '#0073b2', '#8d60cd', '#2e7b54', '#e50099', '#665100', '#009bf0'];
const DARK_PALETTE = ['#a885d8', '#50be87', '#ff80d4', '#d6aa00', '#79c7ec', '#8d60cd', '#9bdaba', '#ff4dc3', '#ffd266', '#1fa2e0'];

const t: HouseTokens = {
  font: FONT,
  text: '#000000',
  muted: '#000000',
  grid: GRID,
  axis: GRID,
  background: '#ffffff',
  palette: PALETTE,
  highlight: ORANGE,
  context: NEUTRAL,
  titleSize: 18,
  titleWeight: 'bold',
  subtitleSize: 14,
  subtitleColor: '#000000',
  labelSize: 14,
  lineWidth: 2,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'orange',
  label: 'Orange (ODS Charts)',
  ink: {
    surface: { source: 'house', canvas: '#ffffff' },
    text: { primary: '#000000', secondary: '#000000', muted: NEUTRAL, inverse: '#ffffff' },
    structure: { grid: GRID, axis: GRID, rule: GRID, zero: GRID },
    series: {
      single: VIOLET,
      categorical: PALETTE.slice(0, 5),
      categoricalExtended: PALETTE,
      overflow: NEUTRAL,
      sequential: { stops: ['#d2ecf9', '#a5daf3', '#79c7ec', '#4ab4e6', '#1fa2e0', '#1982b3', '#136186', '#0c415a', '#06202d'], space: 'lab' },
      status: { positive: '#228722', negative: '#cd3c14', neutral: NEUTRAL },
    },
    accent: ORANGE,
  },
  type: {
    headline: { family: FONT, size: 18, weight: 'bold', case: 'asIs', color: '#000000' },
    deck: { family: FONT, size: 14, weight: 'regular', color: '#000000' },
    axisLabel: { family: FONT, size: 14, weight: 'regular', color: '#000000' },
    axisTitle: { family: FONT, size: 14, color: '#000000' },
    keyLabel: { family: FONT, size: 14, weight: 'regular', color: '#000000' },
    valueLabel: { family: FONT, size: 14, weight: 'regular', color: '#000000' },
    display: { family: FONT, size: 40, weight: 'bold', color: '#000000' },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 2, ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit' },
    },
    grid: { measure: 'full', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: {
    bandFraction: 0.58,
    cornerRadius: 0,
    strokeWeight: 2,
    interpolation: 'linear',
    point: { presence: 'omit' },
    separator: { presence: 'hairline', width: 1, source: 'surface' },
    slice: { gap: 1, gapStyle: 'rule' },
  },
  labels: { truncation: 'never' },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never' },
  annotation: { axisTitles: 'omit', unit: 'never' },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' }, bandStepFit: 1 },
};

/** The guide's vertical bar specimen, A–F. */
const TEAMS = [['A', 36], ['B', 28], ['C', 48], ['D', 40], ['E', 22], ['F', 44]].map(([Team, Units]) => ({ Team, Units }));
const SIG_TITLE = 'How many units did each team sell?';
const SIG_SUBTITLE = 'Team C sold the most, 48 units';

function signature() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: { text: SIG_TITLE, subtitle: SIG_SUBTITLE },
    width: W,
    height: H,
    layer: [
      {
        data: { values: TEAMS },
        mark: { type: 'bar', color: VIOLET, width: { band: 0.58 } },
        encoding: {
          x: { field: 'Team', type: 'nominal', title: null, axis: { labelAngle: 0, domain: false, labelPadding: 10 } },
          y: { field: 'Units', type: 'quantitative', title: null, scale: { domain: [0, 50] }, axis: { values: [0, 10, 20, 30, 40, 50], labelPadding: 10 } },
        },
      },
      { data: { values: [{ v: 0 }] }, mark: { type: 'rule', color: GRID, strokeWidth: 2.5 }, encoding: { y: { field: 'v', type: 'quantitative' } } },
    ],
  };
}

/** The legends page specimen: stacked horizontal bars, white seams, outlined square keys below at the plot’s left edge. */
const ACCOUNTS = [
  ['Account A', 34, 20, 24], ['Account B', 32, 18, 22], ['Account C', 42, 25, 29], ['Account D', 36, 20, 20],
].flatMap(([Account, ...v]) => (v as number[]).map((Value, i) => ({ Account, Dataset: `Dataset ${i + 1}`, Value })));

function legendExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...houseConfig(t),
      legend: { ...(houseConfig(t).legend as object), orient: 'bottom', direction: 'horizontal', symbolType: 'square', symbolSize: 144, symbolStrokeColor: '#000000', symbolStrokeWidth: 1, labelFontSize: 14, columnPadding: 18, offset: 16 },
    },
    title: { text: 'How are sales split across accounts?', subtitle: 'Account C has the highest total' },
    width: W - 60,
    height: H,
    data: { values: ACCOUNTS },
    layer: [
      {
        mark: { type: 'bar', stroke: '#ffffff', strokeWidth: 1.5, height: { band: 0.55 } },
        encoding: {
          y: { field: 'Account', type: 'nominal', sort: 'descending', title: null, axis: { labelPadding: 14, domain: false } },
          x: { field: 'Value', type: 'quantitative', title: null, scale: { domain: [0, 100] }, axis: { values: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], grid: true, labelFontSize: 12 } },
          color: { field: 'Dataset', type: 'nominal', scale: { range: PALETTE } },
        },
      },
      { data: { values: [{ v: 0 }] }, mark: { type: 'rule', color: GRID, strokeWidth: 2.5 }, encoding: { x: { field: 'v', type: 'quantitative' } } },
    ],
  };
}

/** French formats: a space before %, a comma for the decimal point. */
const RECENT = UNEMPLOYMENT.filter((row) => row.Year >= 2018);

function numberExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: { text: 'What was the unemployment rate each year?', subtitle: 'It spiked to 8,1 % in 2020' },
    width: W,
    height: H,
    data: { values: RECENT },
    layer: [
      {
        mark: { type: 'bar', color: VIOLET, width: { band: 0.58 } },
        encoding: {
          x: { field: 'Year', type: 'ordinal', title: null, axis: { labelAngle: 0, domain: false, labelPadding: 10 } },
          y: { field: 'Unemployment (%)', type: 'quantitative', title: null, scale: { domain: [0, 10] }, axis: { values: [0, 2, 4, 6, 8, 10], labelExpr: "datum.value + ' %'", labelPadding: 10 } },
        },
      },
      {
        mark: { type: 'text', dy: -10, fontSize: 14, color: '#000000' },
        encoding: {
          x: { field: 'Year', type: 'ordinal' },
          y: { field: 'Unemployment (%)', type: 'quantitative' },
          text: { field: 'label', type: 'nominal' },
        },
        transform: [{ calculate: "replace(format(datum['Unemployment (%)'], '.1f'), '.', ',') + ' %'", as: 'label' }],
      },
      { data: { values: [{ v: 0 }] }, mark: { type: 'rule', color: GRID, strokeWidth: 2.5 }, encoding: { y: { field: 'v', type: 'quantitative' } } },
    ],
  };
}

const evRows = (names: string[]) => EV_SHARE.filter((row) => names.includes(row.Country));
const EV3 = ['Norway', 'China', 'Germany'];

function darkExpected() {
  const dark: HouseTokens = { ...t, background: '#141414', text: '#ffffff', muted: '#ffffff', grid: '#666666', axis: '#666666', palette: DARK_PALETTE, subtitleColor: '#ffffff' };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(dark), legend: { disable: true } },
    title: { text: 'Which countries sell the most electric cars?', subtitle: 'Norway, by far' },
    width: W,
    height: H,
    data: { values: evRows(EV3) },
    mark: { type: 'line', strokeWidth: 2 },
    encoding: {
      x: { field: 'Year', type: 'ordinal', title: null, axis: { labelAngle: 0, domain: true, domainWidth: 2, labelPadding: 10 } },
      y: { field: 'EV share (%)', type: 'quantitative', title: null, axis: { values: [0, 20, 40, 60, 80, 100], labelPadding: 10 } },
      color: { field: 'Country', type: 'nominal', scale: { domain: EV3, range: DARK_PALETTE } },
    },
  };
}

/** The ODS popover: light card with a 10px arrow and the key’s square swatch. */
function popoverExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: { text: 'What was the unemployment rate each year?', subtitle: 'United States, 2018–2023' },
    width: W,
    height: H,
    data: { values: RECENT },
    layer: [
      {
        mark: { type: 'bar', width: { band: 0.58 } },
        encoding: {
          x: { field: 'Year', type: 'ordinal', title: null, axis: { labelAngle: 0, domain: false, labelPadding: 10 } },
          y: { field: 'Unemployment (%)', type: 'quantitative', title: null, scale: { domain: [0, 10] }, axis: { values: [0, 2, 4, 6, 8, 10], labelPadding: 10 } },
          color: { condition: { test: 'datum.Year === 2020', value: VIOLET }, value: '#bba2e0' },
        },
      },
      { data: { values: [{ v: 0 }] }, mark: { type: 'rule', color: GRID, strokeWidth: 2.5 }, encoding: { y: { field: 'v', type: 'quantitative' } } },
    ],
  };
}

const popoverHtml = `<div style="position:absolute;left:228px;top:88px;font-family:${FONT};color:#000;background:#ffffff;border:1px solid ${GRID};padding:8px 12px;box-shadow:0 2px 6px rgba(0,0,0,0.12)">`
  + '<div style="font-size:14px;font-weight:700;margin-bottom:4px">2020</div>'
  + `<div style="display:flex;align-items:center;gap:6px;font-size:14px"><span style="display:inline-block;width:12px;height:12px;background:${VIOLET};outline:1px solid #000;outline-offset:-1px"></span>Unemployment 8,1 %</div>`
  + `<div style="position:absolute;left:-10px;top:20px;width:0;height:0;border-top:10px solid transparent;border-bottom:10px solid transparent;border-right:10px solid ${GRID}"></div>`
  + '<div style="position:absolute;left:-8px;top:21px;width:0;height:0;border-top:9px solid transparent;border-bottom:9px solid transparent;border-right:9px solid #ffffff"></div>'
  + '</div>';

const darkKey = `<div style="display:flex;gap:16px;padding:0 14px 12px;font-family:${FONT};font-size:14px;color:#ffffff">`
  + EV3.map((name, i) => `<span style="display:inline-flex;align-items:center;gap:6px"><span style="display:inline-block;width:12px;height:12px;background:${DARK_PALETTE[i]};outline:1px solid #ffffff;outline-offset:-1px"></span>${name}</span>`).join('')
  + '</div>';

const unemploymentBars = (title: string, subtitle: string, chartProperties?: Record<string, unknown>, th: ThemeSpec = theme) => flintInput(th, {
  chartType: 'Bar Chart',
  data: RECENT.map((row) => ({ ...row, Year: String(row.Year) })),
  semantic_types: { Year: 'Category', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
  encodings: { x: 'Year', y: 'Unemployment (%)' },
  title,
  subtitle,
  chartProperties,
});

const MIX = PREVIEW_CASES.find((c) => c.id === 'electricity-mix-area')!;
const SOURCES = ['Coal', 'Gas', 'Hydro', 'Nuclear', 'Wind & solar', 'Other'];

function mixExpected() {
  return titled({ ...t, legendOrient: 'bottom' }, {
    data: { values: MIX.data },
    mark: { type: 'area', stroke: '#ffffff', strokeWidth: 1 },
    encoding: {
      x: { field: 'Year', type: 'quantitative', title: null, scale: { nice: false }, axis: { format: 'd', values: [1990, 2000, 2010, 2020], domain: true, domainColor: GRID, domainWidth: 2, labelFontSize: 12 } },
      y: { field: 'Generation (TWh)', type: 'quantitative', stack: 'normalize', title: null, axis: { format: '.0%', tickCount: 5, labelFontSize: 12 } },
      color: { field: 'Source', type: 'nominal', sort: SOURCES, scale: { domain: SOURCES, range: PALETTE }, legend: { orient: 'bottom', direction: 'horizontal', columns: 3, symbolType: 'square', symbolSize: 120, symbolStrokeColor: '#000000', symbolStrokeWidth: 1, labelFontSize: 12 } },
      order: { field: 'Source', sort: 'descending' },
    },
  }, { title: 'Which sources make the world’s electricity?', subtitle: 'Coal still leads', width: 270, height: 150 });
}

function decadesExpected() {
  return titled(t, {
    data: { values: ANOMALY },
    layer: [
      {
        mark: { type: 'bar', width: { band: 0.58 } },
        encoding: {
          x: { field: 'Decade', type: 'ordinal', title: null, axis: { labelAngle: 0, labelFontSize: 14, values: ['1880s', '1920s', '1960s', '2000s', '2020s'] } },
          y: { field: 'Anomaly (°C)', type: 'quantitative', title: null, axis: { values: [-0.5, 0, 0.5, 1], labelFontSize: 14 } },
          color: { field: 'Direction', type: 'nominal', scale: { domain: ['Below average', 'Above average'], range: [PALETTE[0], PALETTE[1]] }, legend: null },
        },
      },
      { data: { values: [{ v: 0 }] }, mark: { type: 'rule', color: GRID, strokeWidth: 2.5 }, encoding: { y: { field: 'v', type: 'quantitative' } } },
    ],
  }, { title: 'Has the world warmed?', subtitle: 'Every decade since the 1960s', width: 270, height: 150 });
}

const orange: StyleGuideTheme = {
  id: 'orange',
  org: 'Orange (ODS Charts)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the Orange Design System data-display pages and the ODS Charts (ECharts) theme source. Helvetica Neue is named with a Helvetica/Arial fallback; the guide gives no headline or deck sizes, so 18px bold and 14px regular are a reading of the specimens.',
    'Stated directly: black 14px labels; #cccccc gridlines across the value axis only; the category axis line in the same grey at 2px, no ticks anywhere; flat square-cornered bars at about 58% of the band; 2px straight lines without markers; white seams between stacked segments and pie slices; the OUDS tiers 1–5 as `categorical` with 6–10 as `categoricalExtended`; the blue sequential ramp; the functional greens and reds; an untitled key below the plot from the left.',
    'Approximated: the single-series violet. The guide’s “single” palette is itself ordered (#5b2f98, #8d60cd, #2e7b54, …) and its bar specimens use #8d60cd while the line specimen uses #5b2f98; `single` takes one ink, so the bars win. Not stated: the orange-on-grey highlight, outlined square keys, French number formats, the dark-mode token pairs, the popover, and the extra axis increment above the data — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      observed: 'Flint (left) matches the specimen closely: violet bars across the width, #cccccc rules every 10, a heavier grey baseline, black 14px labels, the question title and the insight deck. Only the deck differs — “Team C sold the most, 48 units; Units” — because the axis title is appended although the house omits it.',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Bar specimen: violet flat bars at ~58% of the band; light grey #cccccc gridlines every 10 across the value axis; a heavier grey baseline at 0; no ticks, no y-axis line; 14px black Helvetica Neue labels, y right-aligned and centred on the gridlines; title as a question, subtitle as the insight, both sentence case.',
      current: 'Flint states the violet, the band, the grey grid and the 2px grey baseline, the black labels and the question/insight title block.',
      expected: 'The guide’s bar specimen (teams A–F) under a question title.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: TEAMS,
        semantic_types: { Team: 'Category', Units: 'Quantity' },
        encodings: { x: 'Team', y: 'Units' },
        title: SIG_TITLE,
        subtitle: SIG_SUBTITLE,
      }),
      expectedSpec: signature(),
    },
    {
      id: 'highlight',
      observed: 'Flint draws all eight bars violet and appends “; Population (m)” to the deck; the expected panel has Nigeria alone in orange against #666666 bars.',
      title: 'One bar in Orange orange, the rest neutral grey',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'highlight',
      rule: '“To make the highlighted information stand out, always pair it with color.chart.neutral for less important data”: highlight #f16e00, everything else #666666. Orange is not in the categorical palette.',
      current: 'The theme can name `accent: #f16e00`, but neither it nor the chart spec can say which category is the subject; every bar takes the single violet.',
      expected: 'Nigeria in #f16e00, the other bars in #666666.',
      proposal: '`chart_spec.emphasis: { field, values }` with `ink.series.emphasis` / `ink.series.context` in the theme.',
      ...highlightProbe(theme, { ...t, palette: [VIOLET] }, { title: 'Which is the most populous country in Africa?', subtitle: 'Nigeria, with 224 million people' }),
    },
    {
      id: 'legend-swatch',
      observed: 'Flint puts an untitled key below the plot from the left, as stated, but its swatches are small squares with no outline, it lists Account A at the top (the specimen reads D down to A), and the deck gains “; Value”. Expected: 12px squares outlined in black; the white seams match.',
      title: 'Square keys with a black outline, below the plot at its left edge',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'legend-swatch',
      rule: '“Coloured squares are used in legends … a black or white outline is used to surround each coloured square”; legends sit below the chart, left-aligned with the plot; up to two lines of items.',
      current: 'Placement (`bottom`, `align: start`) and an untitled key are stated. ThemeSpec has no field for the swatch’s shape, size or outline (`legend.swatch` only accepts `auto`).',
      expected: 'The legends-page specimen: stacked accounts with white seams, the key under the plot with 12px squares outlined in black.',
      proposal: '`legend.swatch: { shape: "square" | "circle" | "line" | "auto", size, outline: { ink: "contrast" | colour, width } }`.',
      flint: flintInput(theme, {
        chartType: 'Stacked Bar Chart',
        data: ACCOUNTS,
        semantic_types: { Account: 'Category', Dataset: 'Category', Value: 'Quantity' },
        encodings: { y: 'Account', x: 'Value', color: 'Dataset' },
        title: 'How are sales split across accounts?',
        subtitle: 'Account C has the highest total',
      }),
      expectedSpec: legendExpected(),
    },
    {
      id: 'number-format',
      observed: 'Flint prints “8.1” above the 2020 bar (no unit, decimal point) and “8%” on the axis; expected “8,1 %” and “8 %”.',
      title: 'French number formats: “8,1 %”',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'number-format',
      rule: '“Include a space between the value and the % symbol”, decimal comma (“29,99 €”), K/M/B/T for large numbers (“12 K€”), dates DD/MM/YYYY.',
      current: '`annotation.numberFormat` offers precision, sign, thousands style and ordinals, but no locale: no decimal separator, no space between number and unit. Flint prints “8.1%”.',
      expected: 'Value labels “3,9 %” … “8,1 %” and tick labels “0 %” … “10 %”.',
      proposal: '`annotation.numberFormat.locale: "fr-FR"` (decimal, group, currency, unit spacing) or explicit `{ decimal: ",", unitSpace: true }`, applied to ticks, labels and tooltips alike.',
      flint: unemploymentBars('What was the unemployment rate each year?', 'It spiked to 8,1 % in 2020', { showTextLabels: true }, { ...theme, dataLabels: { show: 'always', placement: 'outsideMark' }, annotation: { ...theme.annotation, unit: 'everyTick' } }),
      expectedSpec: numberExpected(),
    },
    {
      id: 'dark-mode',
      observed: 'Flint draws the light tiers on white. Expected: the dark tiers (#a885d8, #50be87, #ff80d4) on #141414 with white text, #666666 rules and white-outlined square keys.',
      title: 'Every chart colour is a light/dark token pair',
      kind: 'product-ui',
      severity: 'high',
      probe: 'dark-mode',
      rule: 'Each OUDS token has a light and a dark value (tier 1 #5b2f98 → #a885d8, tier 2 #3ba06e → #50be87, …); dark backgrounds #141414 or #000000, gridlines #666666, segment borders #141414; sequential ramps invert (“lower values are darker and higher values are lighter”). ODS Charts switches mode with a theme observer.',
      current: 'One ThemeSpec holds one set of inks and `variants` may not vary `ink`, so a dark Orange is a second theme with nothing linking the pair or flipping the ramp.',
      expected: 'The same EV chart on #141414 with the dark tiers and white text.',
      proposal: '`ink.modes.dark` (paired tokens per ink) plus `sequential.invertInDark: true`, selected by a `colorScheme` compile option.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: evRows(EV3),
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Which countries sell the most electric cars?',
        subtitle: 'Norway, by far',
      }),
      expectedSpec: darkExpected(),
      expectedFrame: { style: { background: '#141414' }, footerHtml: darkKey },
    },
    {
      id: 'tooltip-style',
      observed: 'No styling to compare on the left — Flint has nothing to state it with. Expected: the arrowed white popover with an outlined square swatch beside the 2020 bar, its neighbours lightened.',
      title: 'The popover: arrowed card that doubles as the key',
      kind: 'product-ui',
      severity: 'low',
      probe: 'tooltip-style',
      rule: 'Tooltips (ODS “popover”) are HTML/CSS cards with a 10px arrow, light/dark aware, using the legend’s outlined square swatches; they can stand in for a legend on hover. Clicking a legend item toggles its series (off = 0.25 opacity).',
      current: '`interaction` holds a tooltip number format and the selection-boundary paint; the tooltip is the renderer’s default box and the key is static.',
      expected: 'Hovering 2020: the bar stays violet while its neighbours lighten, and a white popover with an arrow and a square swatch reads “Unemployment 8,1 %”.',
      proposal: '`interaction.tooltip: { surface, border, arrow: 10, swatch: "legend" }` and `interaction.legendToggle: { offOpacity: 0.25 }`.',
      flint: unemploymentBars('What was the unemployment rate each year?', 'United States, 2018–2023'),
      expectedSpec: popoverExpected(),
      expectedFrame: { style: { position: 'relative' }, footerHtml: popoverHtml },
    },
    {
      id: 'label-angle',
      addressed: { stage: 'A1', note: 'Names are measured in the face they are drawn in and kept flat: broken at a space, set smaller down to the floor (`type.minSize`, never below ¾ of the stated size), the bands widened — and only then turned (A1).' },
      observed: 'Flint (left) slants all nine decades −45° (and appends “; Anomaly (°C)” to the deck). Expected keeps the 14px labels flat on every other decade.',
      title: 'Labels are slanted although the guide forbids it',
      kind: 'realization',
      severity: 'medium',
      probe: 'turned-labels',
      rule: '“Don’t slant labels as it makes them difficult to read”: rotate the chart (horizontal bars) for long labels, or “skip labels in regular intervals”.',
      current: 'The theme states `labels.`. At a dashboard-tile width (320px) Flint still turns the nine decade labels −45°, rather than skipping every other one.',
      expected: 'Horizontal 14px labels on every other decade.',
      proposal: 'Treat `labels.` as a constraint: thin to a regular interval (`tickLabels: "sparse"`) or report that the chart should rotate, but never slant.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: ANOMALY,
        semantic_types: { Decade: 'Category', 'Anomaly (°C)': { semanticType: 'Quantity', unit: '°C' }, Direction: 'Category' },
        encodings: { x: 'Decade', y: 'Anomaly (°C)', color: 'Direction' },
        title: 'Has the world warmed?',
        subtitle: 'Every decade since the 1960s',
        baseSize: { width: 320, height: 210 },
      }),
      expectedSpec: decadesExpected(),
    },
    {
      id: 'legend-placement',
      observed: 'Flint (left) moves the six-item key to the right edge in a single column, with circular swatches, narrowing the plot; expected keeps it below in two rows of three, with outlined squares.',
      title: 'The key moves to the right although only “bottom” is allowed',
      kind: 'realization',
      severity: 'medium',
      probe: 'legend-placement',
      rule: 'The default legend sits below the chart, left-aligned with the plot, in up to two lines of items.',
      current: 'The theme states `legend.placement: ["bottom"]`, a one-item list of acceptable positions. On the six-source area chart at tile width Flint puts the key at the right, in one column, shrinking the plot.',
      expected: 'The key below the plot in rows of three, outlined squares, the plot keeping the full width.',
      proposal: 'Honour a single-position `placement` list (wrap the key into rows, up to the house’s line limit), and report when it truly cannot fit; add `legend.maxRows: 2`.',
      flint: flintInput(theme, {
        chartType: 'Area Chart',
        data: MIX.data,
        semantic_types: MIX.semantic_types,
        encodings: MIX.encodings,
        chartProperties: MIX.chartProperties,
        title: 'Which sources make the world’s electricity?',
        subtitle: 'Coal still leads',
        baseSize: { width: 320, height: 210 },
      }),
      expectedSpec: mixExpected(),
    },
    {
      id: 'extra-increment',
      title: 'The value axis runs one increment past the data',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'axis-headroom',
      rule: '“Always include an additional increment greater than the dataset.” Increments are round numbers.',
      current: 'The scale domain is the renderer’s `nice` rounding of the data maximum; when the maximum lands on a round step (50) the axis stops there, and ThemeSpec cannot ask for headroom.',
      expected: 'A maximum of 50 gives an axis to 60.',
      proposal: '`structure.axis.measure.headroom: "none" | "nice" | "oneStep"` — a presentation rule, since the zero baseline and the data stay as they are.',
    },
    {
      id: 'date-format',
      title: 'Dates as DD/MM/YYYY, months “Jan 2021”, quarters “Q1”',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'date-label-format',
      rule: 'Date format is DD/MM/YYYY; 24-hour “07:00”; days “Mon”; months “Jan”; specific months “Jan 2021”; quarters Q1–Q4.',
      current: 'No ThemeSpec field governs date text; Flint picks the renderer’s US-style multi-format ticks.',
      expected: 'Day-first dates and three-letter months.',
      proposal: '`annotation.dateFormat: { day: "%d/%m/%Y", month: "%b %Y", quarter: "Q%q" }` or a locale shared with `numberFormat`.',
    },
  ],
};

export default orange;
