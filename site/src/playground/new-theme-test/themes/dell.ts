import type { ThemeSpec } from 'flint-chart';
import research from '../research/dell.json';
import { cardProbe, flintInput, POPULATION } from '../probes';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "Roboto, 'Helvetica Neue', Arial, sans-serif";
const TEXT = '#0e0e0e';
const GREY = '#636363';
const GRID = '#e1e1e1';
const PAGE = '#f5f6f7';
const CAT04 = ['#002a58', '#a64600', '#0ea0a9', '#7f234f'];
const CAT12 = ['#1282d6', '#a64600', '#0ea0a9', '#a8396f', '#002a58', '#c96100', '#044e52', '#cb548d', '#0063b8', '#7d2e00', '#0b7c84', '#7f234f'];
const CAT20 = ['#1282d6', '#a64600', '#0ea0a9', '#a8396f', '#002a58', '#b85200', '#044e52', '#ba467d', '#00468b', '#c96100', '#076369', '#cb548d', '#0063b8', '#7d2e00', '#0b7c84', '#511230', '#0672cb', '#4f1a00', '#0d8e97', '#7f234f'];
/** DDS's rounded-square legend marker. */
const ROUNDED_SQUARE = 'M -1 -0.6 Q -1 -1 -0.6 -1 L 0.6 -1 Q 1 -1 1 -0.6 L 1 0.6 Q 1 1 0.6 1 L -0.6 1 Q -1 1 -1 0.6 Z';

const t: HouseTokens = {
  font: FONT,
  text: TEXT,
  muted: GREY,
  grid: GRID,
  axis: GREY,
  background: '#ffffff',
  palette: CAT12,
  titleSize: 20,
  titleWeight: 'normal',
  subtitleSize: 14,
  subtitleColor: GREY,
  labelSize: 12,
  gridAxis: 'both',
  lineWidth: 2,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'dell',
  label: 'Dell Design System',
  ink: {
    surface: { source: 'house', canvas: '#ffffff' },
    text: { primary: TEXT, secondary: GREY, muted: GREY, inverse: '#ffffff' },
    structure: { grid: GRID, axis: GREY, rule: GREY },
    series: {
      single: CAT12[0],
      // categorical04 for up to four series, categorical12 past that: grounding picks the smallest set that covers the count.
      categorical: CAT04,
      categoricalExtended: CAT12,
      // categorical20 for thirteen to twenty series: not categorical12 extended (R6).
      categoricalByCount: { 20: CAT20 },
      status: { positive: '#5d8c00', negative: '#bb2a33', neutral: '#e6ac28' },
      selection: { statusUse: 'thresholdOnly' },
    },
    accent: '#0672cb',
  },
  type: {
    headline: { family: FONT, size: 20, weight: 'regular', case: 'asIs', color: TEXT },
    deck: { family: FONT, size: 14, weight: 'regular', color: GREY },
    axisLabel: { family: FONT, size: 12, color: GREY },
    axisTitle: { family: FONT, size: 14, weight: 'regular', color: TEXT },
    keyLabel: { family: FONT, size: 14, color: GREY },
    valueLabel: { family: FONT, size: 12, weight: 'regular', color: TEXT },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1, ticks: 'omit', labelGap: 8 },
      measure: { line: 'full', lineWeight: 1, ticks: 'omit', labelGap: 8 },
    },
    grid: { measure: 'full', category: 'full', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: {
    // "Spacing between bars … should be half of the bar width."
    bandFraction: 2 / 3,
    strokeWeight: 2,
    cornerRadius: 0,
    point: { presence: 'full', size: 50, fill: 'solid' },
  },
  geometry: {
    line: { width: 2, interpolation: 'linear' },
    point: { presence: 'full', size: 50, fill: 'solid' },
    band: { fraction: 2 / 3, cornerRadius: 0 },
  },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['right', 'bottom'], direction: 'vertical', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'whenTheyFit', placement: 'outsideMark', inkMode: 'fixed' },
  annotation: { axisTitles: 'always', axisTitlePlacement: 'rotated', axisTitleGap: 12, unitsInAxisTitle: true },
  // The plot area spans the container (the layout template), so sparse bands widen to fill it.
  layout: { titleBlock: { anchor: 'start', gap: 'loose' }, bandStepFit: 1 },
  variants: [
    {
      when: { canvasWidth: { lt: 480 } },
      then: { legend: { placement: ['bottom'], direction: 'horizontal', align: 'start' } },
      because: 'On tablet and mobile widths the legend moves below the x-axis title.',
    },
  ],
};

/** The DDS card: white, a light border, a small radius, 24px padding, on the grey page. */
const CARD = { background: '#ffffff', border: `1px solid ${GRID}`, borderRadius: '4px', padding: '24px', margin: '12px', boxShadow: `0 0 0 12px ${PAGE}` };
const cardHeader = (title: string, subtitle?: string) => `<div style="font-family:${FONT};margin-bottom:32px"><div style="font-size:20px;font-weight:400;color:${TEXT};line-height:1.2">${title}</div>`
  + (subtitle ? `<div style="font-size:14px;color:${GREY};margin-top:6px">${subtitle}</div>` : '') + '</div>';

const MONTHS = ['January', 'February', 'March', 'April'];
const SALES = [['Latitude', [8.2, 24.6, 16.4, 32.8]], ['XPS', [15.8, 20.2, 11.3, 15.8]]].flatMap(([Product, v]) => MONTHS.map((Month, i) => ({ Month, Product: Product as string, 'Total sales': (v as number[])[i] })));

const dellLegend = { symbolType: ROUNDED_SQUARE, symbolSize: 200, symbolStrokeWidth: 0, labelFontSize: 14, labelColor: GREY, labelFont: FONT, columnPadding: 28, orient: 'bottom', direction: 'horizontal', offset: 24, title: null };

function salesExpected(o: { hover?: string; cursor?: string; legend?: 'bottom' | 'right' } = {}) {
  const base = houseConfig(t);
  const x = { field: 'Month', type: 'ordinal', sort: MONTHS, title: '2022', scale: { type: 'point', padding: 0 }, axis: { labelAngle: 0, grid: true, domain: true, domainColor: GREY, titleColor: TEXT, titleFontSize: 14, titlePadding: 16, labelFlush: false } };
  const y = { field: 'Total sales', type: 'quantitative', title: 'Total sales', scale: { domain: [0, 40] }, axis: { values: [0, 10, 20, 30, 40], domain: true, domainColor: GREY, titleColor: TEXT, titleFontSize: 14, titlePadding: 14 } };
  const legend = o.legend === 'right' ? { ...dellLegend, orient: 'right', direction: 'vertical', offset: 24 } : dellLegend;
  const color = { field: 'Product', type: 'nominal', scale: { domain: ['Latitude', 'XPS'], range: CAT04 }, legend: o.hover ? { ...legend, encode: { symbols: { update: { opacity: { signal: `datum.value === '${o.hover}' ? 1 : 0.3` } } }, labels: { update: { opacity: { signal: `datum.value === '${o.hover}' ? 1 : 0.3` } } } } } : legend };
  const dim = (on: boolean) => (o.hover ? (on ? 1 : 0.25) : 1);
  const series = (p: string) => [
    { data: { values: SALES.filter((r) => r.Product === p) }, mark: { type: 'line', strokeWidth: 2, opacity: dim(o.hover === p) }, encoding: { x, y, color } },
    { data: { values: SALES.filter((r) => r.Product === p) }, mark: { type: 'circle', size: 70, opacity: dim(o.hover === p) }, encoding: { x, y, color } },
  ];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...base,
      padding: { left: 0, right: 8, top: 6, bottom: 0 },
      axis: { ...(base.axis as object), labelFontSize: 12, labelColor: GREY, labelPadding: 8, gridColor: GRID, ticks: false },
      axisY: { grid: true, domain: true },
      axisX: { grid: true },
    },
    width: o.legend === 'right' ? W - 30 : W - 40,
    height: H,
    layer: [
      ...(o.cursor ? [{ data: { values: [{ Month: o.cursor }] }, mark: { type: 'rule', color: GREY, strokeWidth: 1, strokeDash: [4, 3] }, encoding: { x: { field: 'Month', type: 'ordinal', sort: MONTHS } } }] : []),
      ...series('XPS'),
      ...series('Latitude'),
    ],
  };
}

const salesFlint = (title: string, subtitle?: string, width?: number) => flintInput(theme, {
  chartType: 'Line Chart',
  data: SALES,
  semantic_types: { Month: 'Month', Product: 'Category', 'Total sales': 'Quantity' },
  encodings: { x: 'Month', y: 'Total sales', color: 'Product' },
  title,
  subtitle,
  ...(width ? { baseSize: { width, height: H } } : {}),
});

/** The DDS tooltip: every series at the cursor, in legend order, on a white card with a shadow. */
function tooltipHtml(month: string) {
  const rows = ['Latitude', 'XPS'].map((p, i) => {
    const v = SALES.find((r) => r.Product === p && r.Month === month)!['Total sales'];
    return `<div style="display:flex;align-items:center;gap:8px;margin-top:6px"><span style="width:12px;height:12px;border-radius:3px;background:${CAT04[i]}"></span><span style="flex:1;color:${GREY}">${p}</span><span style="color:${TEXT};margin-left:16px">${v}</span></div>`;
  }).join('');
  return `<div style="position:absolute;z-index:3;left:250px;top:150px;width:150px;background:#fff;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.18);padding:10px 12px;font-family:${FONT};font-size:13px">`
    + `<div style="color:${TEXT};font-weight:500">${month} 2022</div>${rows}</div>`;
}

// ── Simple bar: one colour, ascending, labels 8px off the bar, bold on focus ─
const ASC = POPULATION.slice().sort((a, b) => a.Population - b.Population).slice(0, 6);
function barExpected(focus?: string) {
  const base = houseConfig(t);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...base, padding: { left: 0, right: 8, top: 14, bottom: 0 }, axis: { ...(base.axis as object), labelFontSize: 12, labelColor: GREY, gridColor: GRID, ticks: false, titleColor: TEXT, titleFontSize: 14 }, axisY: { grid: true, domain: true }, axisX: { grid: false } },
    width: W - 30,
    height: H,
    data: { values: ASC },
    encoding: {
      x: { field: 'Country', type: 'nominal', sort: null, title: 'Country', scale: { paddingInner: 1 / 3, paddingOuter: 0.15 }, axis: { labelAngle: 0, domain: true, domainColor: GREY, labelExpr: "split(datum.label, ' ')" } },
      y: { field: 'Population', type: 'quantitative', title: 'Population (millions)', scale: { domain: [0, 400] }, axis: { values: [0, 100, 200, 300, 400], domain: true, domainColor: GREY } },
    },
    layer: [
      { mark: { type: 'bar', color: CAT12[0] }, encoding: focus ? { opacity: { condition: { test: `datum.Country === '${focus}'`, value: 1 }, value: 1 }, stroke: { condition: { test: `datum.Country === '${focus}'`, value: '#002a58' }, value: null }, strokeWidth: { value: 2 } } : {} },
      { mark: { type: 'text', dy: -8, baseline: 'bottom', fontSize: 12, color: TEXT, font: FONT }, encoding: { text: { field: 'Population', format: ',.0f' }, fontWeight: focus ? { condition: { test: `datum.Country === '${focus}'`, value: 'bold' }, value: 'normal' } : { value: 'normal' } } },
    ],
  };
}

const dell: StyleGuideTheme = {
  id: 'dell',
  org: 'Dell Technologies (Dell Design System, DDS data visualization)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the DDS chart-customization, bar and line chart pages and the data-visualization Storybook tokens. Roboto, the library’s face, is loaded here.',
    'Stated directly: the count-specific palettes — `categorical04` (navy, burnt orange, teal, berry) as `categorical` and `categorical12` (opening with blue-500) as `categoricalExtended`, so grounding takes the four-colour set for up to four series and the twelve-colour set beyond, exactly as DDS asks; blue-500 for single-series bars; the stoplight condition colours as `status`, restricted to thresholds; #0e0e0e / #636363 text, #e1e1e1 gridlines both ways and #636363 axis lines forming an L, no ticks; a regular-weight 20px title with a grey 14px subtitle; rotated y title and centred x title in near-black; bars filling two thirds of their step (gap = half a bar); 2px lines with filled circle markers; horizontal labels; value labels outside the bar; the legend at the right, moving below under 480px through a `canvasWidth` variant.',
    'Approximated: type sizes (the guide names none) are read off the specimens as 20/14/12px.',
    'Not stated: the card container and its 24/32px padding template, the multi-series cursor tooltip, legend isolate/mute and bold-on-focus labels, and the third (20-colour) palette tier — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'The “Building a chart — Do” specimen: a white card with a thin border on the grey page; a large regular-weight title and grey subtitle at its top-left, 32px above the plot; gridlines in both directions; a thin dark-grey L of axes; navy and burnt-orange lines with filled circle markers; a rotated near-black “Total sales” and a centred “2022” under the months; a bottom-left legend with rounded-square swatches.',
      current: 'Flint states the palette (categorical04 for two series), both gridlines, the L axes, the markers, the regular-weight title and grey deck, the rotated y title. It cannot draw the card, and it has no x-title text other than the field name.',
      expected: 'The specimen redrawn on its own data.',
      flint: salesFlint('Total laptop sales', 'Comparing Latitude and XPS'),
      expectedSpec: salesExpected(),
      observed: 'Flint is close: navy and burnt-orange lines with filled dots, gridlines both ways, a dark-grey L of axes, a large regular-weight title with a grey deck, a rotated “Total sales”. Differences: no card or grey page; the x title is the field name “Month” where the guide writes the period “2022”; the y axis runs 0–35 in fives rather than 0–40 in tens; and the legend has dots rather than rounded squares.',
      expectedFrame: { style: CARD, headerHtml: cardHeader('Total laptop sales', 'Comparing Latitude and XPS') },
    },
    {
      id: 'card-container',
      title: 'The card template: 24px padding, 32px from header to plot',
      kind: 'product-ui',
      severity: 'high',
      probe: 'card-container',
      rule: '“All charts in the data visualization library sit within a container and follow the same template for padding”: 24px on every side, 32px between the header (title, subtitle, optional actions) and the plot, 24px between the plot and a right-hand legend.',
      current: 'ThemeSpec has no container: no border, radius, padding or page colour, and `layout.titleBlock.gap` is a word (`tight | normal | loose`), not the 32px the template fixes.',
      expected: 'The chart inside the DDS card on the grey page, the header at its top.',
      proposal: '`layout.container: { padding: 24, border: "structure.grid", radius: 4, page: "#f5f6f7" }` and px values for `titleBlock.gap` and the legend offset.',
      ...cardProbe(theme, t, { style: CARD, header: 'Unemployment rate', meta: 'United States, 2000–2023', actions: false }),
      observed: 'Flint: title, deck and chart straight on the page; nothing marks the chart as a component. Expected: the bordered white card on the grey page with the header inside. On this 24-year series Flint also shrinks the tick labels to about 9px and labels every second year, below the 12px the theme states.',
    },
    {
      id: 'legend-swatch',
      title: 'Legend markers are rounded squares, whatever the mark',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'legend-swatch',
      rule: 'Legend markers are small rounded squares in the series colour, for lines as for bars; the legend sits at the right of the plot on desktop widths, 24px from it, and moves below the x-axis title on tablet and mobile.',
      current: '`legend.swatch` accepts only `"auto"`, which picks the swatch from the mark: a line chart gets dots. Placement is stated as `["right", "bottom"]` with a `canvasWidth < 480` variant that switches to `bottom`.',
      expected: 'The specimen at a 640px desktop width: legend in a column at the right with rounded-square markers.',
      proposal: '`legend.swatch: "auto" | "square" | "roundedSquare" | "line" | "dot"` with an optional `swatchRadius`.',
      flint: salesFlint('Total laptop sales', 'Comparing Latitude and XPS', 640),
      expectedSpec: salesExpected({ legend: 'right' }),
      observed: 'At 640px Flint puts the legend at the right as stated, top-aligned with the plot — placement is honoured. The markers are dots, not rounded squares; and the type has scaled up (title ~24px, tick labels ~14px) with the wider canvas, where DDS keeps one size.',
      expectedFrame: { style: CARD, headerHtml: cardHeader('Total laptop sales', 'Comparing Latitude and XPS') },
    },
    {
      id: 'cursor-tooltip',
      title: 'One tooltip for every series at the cursor, in legend order',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'tooltip-style',
      rule: '“Content in the tooltip displays the order of the series in the legend, regardless of the order of points within the plot area”: a vertical cursor line, all series’ values for that x in one tooltip; open on hover or keyboard focus, dismissible, never timing out.',
      current: 'ThemeSpec’s `interaction` has only a tooltip number format; Flint’s tooltip is per mark, so hovering one line shows one series.',
      expected: 'March hovered: a dashed cursor line and a white tooltip listing Latitude then XPS with rounded-square swatches.',
      proposal: '`interaction.tooltip: { group: "byX", order: "legend", cursor: "rule", persist: "untilDismissed" }`.',
      flint: salesFlint('Total laptop sales'),
      expectedSpec: salesExpected({ cursor: 'March' }),
      expectedFrame: { style: { ...CARD, position: 'relative' }, headerHtml: cardHeader('Total laptop sales') + tooltipHtml('March') },
      observed: 'Flint’s static chart has no cursor or grouped tooltip from the theme. Expected: dashed cursor at March and one white tooltip listing Latitude 16.4 then XPS 11.3 in legend order, though XPS’s point is the one nearer the cursor.',
    },
    {
      id: 'legend-isolate',
      title: 'Hovering a legend marker mutes every other series',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'focus-hover-state',
      rule: '“Hovering over a data series marker in the legend will isolate its related series in the plot area. All other plotted series will show as muted.” Clicking isolates it; the hidden series’ legend markers become unfilled.',
      current: 'No ThemeSpec field describes what happens to the other series on hover; the chart Flint compiles is static.',
      expected: 'XPS hovered in the legend: its line and markers at full ink, Latitude and its legend entry muted.',
      proposal: '`interaction.focus: { trigger: ["legendHover", "markHover"], others: { opacity: 0.25 }, isolateOnClick: true }`.',
      flint: salesFlint('Total laptop sales'),
      expectedSpec: salesExpected({ hover: 'XPS' }),
      expectedFrame: { style: CARD, headerHtml: cardHeader('Total laptop sales') },
      observed: 'Flint draws both series at full strength. Expected: XPS at full ink, Latitude’s line, dots and legend entry faded to a pale grey-blue.',
    },
    {
      id: 'bar-labels',
      title: 'Simple bars: one colour, ascending, value labels above, bold on focus',
      kind: 'product-ui',
      severity: 'low',
      probe: 'value-label-placement',
      rule: '“Use the same color for all bars”; order ascending from the left (or ranked); value labels in the plot, horizontal, 8px from the bar; “During hover or focus states, bar label text is bolded.”',
      current: 'The static rules are stated (`series.single`, `dataLabels.placement: outsideMark`, `labels.angle: horizontal`, band fraction ⅔); the order is the chart spec’s; nothing in ThemeSpec can make a focused bar’s label bold.',
      expected: 'Six countries ascending, labels 8px above each bar, Nigeria focused: outline and bold label.',
      proposal: '`interaction.focus.valueLabel: { weight: "bold" }` alongside a focus ring for the mark (`interaction.focus.ring`).',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: ASC,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { x: { field: 'Country', sortBy: 'y', sortOrder: 'ascending' }, y: 'Population' },
        chartProperties: { showTextLabels: true },
      }),
      expectedSpec: barExpected('Nigeria'),
      observed: 'With `layout.bandStepFit: 1` Flint’s static chart matches the guide closely: one blue, ascending order (from the chart spec), labels just above each bar, flat labels with “United States” wrapped — though it truncates “Banglad…” where the expected chart has room for the full name. The focus state (outline and bold 224) cannot be stated.',
    },
    {
      id: 'palette-20',
      addressed: { stage: 'R6', note: 'categorical20 is stated as `categoricalByCount[20]`, reached past twelve series.' },
      title: 'A third palette tier at twenty series',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'count-palette',
      rule: 'Three count-specific sequences that “should not be reordered at implementation”: categorical04, categorical12, and categorical20 — which is not categorical12 extended: from its sixth entry it interleaves different steps (#b85200, #ba467d, #00468b …).',
      current: 'ThemeSpec has two tiers, `categorical` and `categoricalExtended`, which carry categorical04 and categorical12 exactly. A chart with 13–20 series cannot reach categorical20; it falls to `overflow` or gives up the house set.',
      expected: `Thirteen to twenty series coloured ${CAT20.slice(0, 6).join(', ')} …`,
      proposal: '`ink.series.categoricalByCount: { 4: [...], 12: [...], 20: [...] }` replacing the fixed two tiers.',
    },
  ],
};

export default dell;
