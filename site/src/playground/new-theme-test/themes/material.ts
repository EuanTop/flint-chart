import type { ThemeSpec } from 'flint-chart';
import research from '../research/material.json';
import { ANOMALY, cardProbe, flintInput, groupedProbe } from '../probes';
import { houseConfig, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = 'Roboto, Arial, sans-serif';
const PURPLE = '#6200ee';
const CATEGORICAL = [PURPLE, '#eb3693', '#2381f1', '#ff7f29', '#00a3ad'];
const TITLE = '#414549';
const SUB = '#757575';
const TICK = '#616164';
const GRID = '#e8eaed';
const BASE = '#dadce0';
const DARK_TEXT = '#212121';
const PAGE = '#e5e5e5';

const t: HouseTokens = {
  font: FONT,
  text: TITLE,
  muted: TICK,
  grid: GRID,
  axis: BASE,
  background: '#ffffff',
  palette: CATEGORICAL,
  highlight: PURPLE,
  context: 'rgba(97,97,100,0.35)',
  titleSize: 18,
  titleWeight: 400,
  subtitleSize: 14,
  subtitleColor: SUB,
  labelSize: 12,
  yRight: true,
  lineWidth: 2,
  barCorner: 2,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'material',
  label: 'Material Design (M2) data visualization',
  ink: {
    surface: { source: 'house', canvas: '#ffffff' },
    text: { primary: TITLE, secondary: SUB, muted: TICK, inverse: '#ffffff' },
    structure: { grid: GRID, axis: BASE, rule: '#9e9e9e' },
    series: { single: PURPLE, categorical: CATEGORICAL, overflow: '#bdbdbd' },
    accent: PURPLE,
  },
  type: {
    headline: { family: FONT, size: 18, weight: 'regular', case: 'asIs', color: TITLE },
    deck: { family: FONT, size: 14, weight: 'regular', color: SUB },
    axisLabel: { family: FONT, size: 12, color: TICK },
    axisTitle: { family: FONT, size: 12, weight: 'regular', color: TICK },
    keyLabel: { family: FONT, size: 12, color: DARK_TEXT },
    valueLabel: { family: FONT, size: 12, color: DARK_TEXT },
    annotation: { family: FONT, size: 12, color: DARK_TEXT },
    display: { family: FONT, size: 22, weight: 'regular', color: TITLE },
    footnote: { family: FONT, size: 12, color: SUB },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 2, ticks: 'hairline', tickLength: 'short', tickDirection: 'outward', labelGap: 8 },
      measure: { line: 'omit', ticks: 'omit', placement: 'opposite', tickDensity: 'sparse', labelGap: 12 },
    },
    grid: { measure: 'hairline', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: { bandFraction: 0.4, strokeWeight: 2, cornerRadius: 2, interpolation: 'linear' },
  geometry: {
    band: { fraction: 0.4, cornerRadius: 2 },
    line: { width: 2, interpolation: 'linear' },
    point: { presence: 'omit' },
  },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['bottom', 'seriesEnd'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never' },
  annotation: { unit: 'lastTick', axisTitles: 'whenAmbiguous', axisTitlePlacement: 'flatAboveAxis', numberFormat: { thousands: 'separator' } },
  layout: { titleBlock: { anchor: 'start', gap: 'loose', deckGap: 'normal' }, bandStepFit: 1 },
  variants: [
    {
      when: { canvasWidth: { lt: 340 } },
      then: { legend: { placement: ['top'] } },
      because: '“On mobile, place the legend above the chart to keep it visible during interactions.”',
    },
  ],
};

const CARD = { background: '#ffffff', borderRadius: '4px', padding: '22px 22px 14px', boxShadow: `0 1px 3px rgba(0,0,0,0.25), 0 0 0 18px ${PAGE}`, margin: '18px' };

const head = (title: string, sub?: string, extra = '') => `<div style="font-family:${FONT};margin:0 0 10px">`
  + `<div style="font-size:18px;color:${TITLE};font-weight:400">${title}</div>`
  + (sub ? `<div style="font-size:14px;color:${SUB};margin-top:6px">${sub}</div>` : '') + extra + '</div>';

// ---------------------------------------------------------------------------
// “Customer feedback”: four purple quarters in a card.
// ---------------------------------------------------------------------------

const FEEDBACK = [['Q1', 20.3], ['Q2', 27.8], ['Q3', 33.4], ['Q4', 39.2]].map(([Quarter, v]) => ({ Quarter: Quarter as string, 'Positive comments': v as number }));

function feedbackSpec(): Record<string, unknown> {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 0, top: 6, right: 0, bottom: 4 } },
    width: 330,
    height: 210,
    data: { values: FEEDBACK },
    mark: { type: 'bar', color: PURPLE, cornerRadiusTopLeft: 2, cornerRadiusTopRight: 2, width: { band: 0.42 } },
    encoding: {
      x: { field: 'Quarter', type: 'nominal', title: null, axis: { labelAngle: 0, domain: true, domainColor: BASE, domainWidth: 2, ticks: false, labelColor: TICK, labelFontSize: 13, labelPadding: 10 } },
      y: {
        field: 'Positive comments', type: 'quantitative', title: null, scale: { domain: [0, 40] },
        axis: { orient: 'right', values: [0, 10, 20, 30, 40], labelExpr: "datum.value === 0 ? '0' : datum.value + '%'", labelColor: TICK, labelFontSize: 13, labelPadding: 14, gridColor: GRID },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// “Users in the last 30 days”: one series in purple over translucent grey context.
// ---------------------------------------------------------------------------

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const KNOTS: [number, number][] = [[1, 330], [6, 220], [9, 300], [12, 500], [15, 520], [18, 520], [21, 380], [25, 340], [28, 470], [31, 700]];
const base = (d: number) => {
  for (let i = 1; i < KNOTS.length; i++) {
    const [d0, v0] = KNOTS[i - 1];
    const [d1, v1] = KNOTS[i];
    if (d <= d1) return v0 + ((v1 - v0) * (d - d0)) / (d1 - d0);
  }
  return KNOTS[KNOTS.length - 1][1];
};
const USERS = (() => {
  const rnd = seeded(11);
  const rows: { Date: string; Site: string; Users: number }[] = [];
  const sites = ['Your site', ...Array.from({ length: 15 }, (_, i) => `Peer ${i + 1}`)];
  sites.forEach((site, k) => {
    const scale = k === 0 ? 1.18 : 0.78 + rnd() * 0.3;
    for (let d = 1; d <= 31; d++) {
      const v = base(d) * scale + (rnd() - 0.5) * 50;
      rows.push({ Date: `2019-08-${String(d).padStart(2, '0')}T00:00`, Site: site, Users: Math.round(Math.max(120, v)) });
    }
  });
  return rows;
})();

function usersSpec(): Record<string, unknown> {
  const x = {
    field: 'Date', type: 'temporal', title: null,
    axis: {
      values: [{ year: 2019, month: 8, date: 1 }, { year: 2019, month: 8, date: 15 }, { year: 2019, month: 8, date: 31 }],
      labelExpr: "date(datum.value) === 1 ? 'Aug 1, 2019' : timeFormat(datum.value, '%b %-d')",
      domain: true, domainColor: BASE, domainWidth: 2, ticks: true, tickColor: BASE, tickSize: 6, labelColor: TICK, labelFlush: true,
    },
  };
  const y = {
    field: 'Users', type: 'quantitative', scale: { domain: [0, 1000] }, title: 'Users',
    axis: { orient: 'right', values: [0, 250, 500, 750, 1000], format: ',d', labelColor: TICK, gridColor: GRID, titleAngle: 0, titleAlign: 'right', titleAnchor: 'end', titleY: -14, titleX: 34, titleColor: TICK, titleFontWeight: 'normal', titleFontSize: 12 },
  };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 0, top: 22, right: 4, bottom: 4 } },
    width: 330,
    height: 210,
    layer: [
      { data: { values: USERS.filter((r) => r.Site !== 'Your site') }, mark: { type: 'line', strokeWidth: 1.5, color: '#616164', opacity: 0.3 }, encoding: { x, y, detail: { field: 'Site' } } },
      { data: { values: USERS.filter((r) => r.Site === 'Your site') }, mark: { type: 'line', strokeWidth: 2, color: PURPLE }, encoding: { x, y } },
    ],
  };
}

// ---------------------------------------------------------------------------
// “Average temperature”: High/Low with a dashed threshold and a callout bubble.
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HIGH = [39, 42, 50, 62, 72, 80, 85, 84, 77, 66, 55, 44];
const LOW = [27, 29, 35, 45, 54, 64, 70, 69, 62, 51, 42, 33];
const TEMPS = MONTHS.flatMap((m, i) => [{ Month: i + 1, Series: 'High', 'Temperature (°F)': HIGH[i] }, { Month: i + 1, Series: 'Low', 'Temperature (°F)': LOW[i] }]);
const THRESHOLD = 55;

function temperatureSpec(o: { annotate?: boolean; hover?: number } = {}): Record<string, unknown> {
  const x = {
    field: 'Month', type: 'quantitative', title: null, scale: { domain: [1, 12], nice: false },
    axis: {
      values: [1, 3, 5, 7, 9, 11], labelExpr: `${JSON.stringify(MONTHS)}[datum.value - 1]`,
      domain: true, domainColor: BASE, domainWidth: 2, ticks: true, tickColor: BASE, tickSize: 6, labelColor: TICK, labelFontSize: 13, labelFlush: false,
    },
  };
  const y = {
    field: 'Temperature (°F)', type: 'quantitative', title: null, scale: { domain: [20, 100] },
    axis: { orient: 'right', values: [20, 40, 60, 80, 100], labelExpr: "datum.value === 100 ? '100°' : datum.label", labelColor: TICK, labelFontSize: 13, gridColor: GRID },
  };
  const color = { field: 'Series', type: 'nominal', scale: { domain: ['High', 'Low'], range: ['#ff5722', PURPLE] }, legend: null };
  const layers: Record<string, unknown>[] = [
    { data: { values: TEMPS }, mark: { type: 'line', strokeWidth: 2 }, encoding: { x, y, color } },
  ];
  if (o.annotate) {
    layers.push(
      { data: { values: [{ v: THRESHOLD }] }, mark: { type: 'rule', color: '#757575', strokeDash: [3, 4], strokeWidth: 1.5 }, encoding: { y: { field: 'v', type: 'quantitative' } } },
      { data: { values: [{}] }, mark: { type: 'rect', color: '#000000', opacity: 0.08, cornerRadius: 3, clip: false }, encoding: { x: { value: 28 }, x2: { value: 150 }, y: { value: 66 }, y2: { value: 112 } } },
      { data: { values: [{}] }, mark: { type: 'rect', color: '#ffffff', cornerRadius: 3, clip: false }, encoding: { x: { value: 26 }, x2: { value: 148 }, y: { value: 64 }, y2: { value: 110 } } },
      { data: { values: [{}] }, mark: { type: 'point', shape: 'triangle-down', filled: true, size: 70, color: '#ffffff', clip: false }, encoding: { x: { value: 80 }, y: { value: 113 } } },
      { data: { values: [{}] }, mark: { type: 'text', align: 'left', baseline: 'top', fontSize: 13, font: FONT, color: '#263238', lineHeight: 18, text: ['Required', 'housing temp'] }, encoding: { x: { value: 36 }, y: { value: 70 } } },
    );
  }
  if (o.hover !== undefined) {
    const m = o.hover;
    const at = TEMPS.filter((r) => r.Month === m);
    layers.push(
      { data: { values: [{ Month: m }] }, mark: { type: 'rule', color: '#9e9e9e', strokeDash: [2, 3] }, encoding: { x: { field: 'Month', type: 'quantitative' } } },
      { data: { values: at.filter((r) => r.Series === 'High') }, mark: { type: 'point', filled: true, size: 420, color: '#ff5722', opacity: 0.25 }, encoding: { x: { field: 'Month', type: 'quantitative' }, y: { field: 'Temperature (°F)', type: 'quantitative' } } },
      { data: { values: at.filter((r) => r.Series === 'High') }, mark: { type: 'point', filled: true, size: 110, fill: '#ffffff', stroke: '#ff5722', strokeWidth: 3 }, encoding: { x: { field: 'Month', type: 'quantitative' }, y: { field: 'Temperature (°F)', type: 'quantitative' } } },
      { data: { values: at.filter((r) => r.Series === 'Low') }, mark: { type: 'point', filled: true, size: 50, color: PURPLE }, encoding: { x: { field: 'Month', type: 'quantitative' }, y: { field: 'Temperature (°F)', type: 'quantitative' } } },
      { data: { values: [{}] }, mark: { type: 'rect', color: '#000000', opacity: 0.1, cornerRadius: 6, clip: false }, encoding: { x: { value: 108 }, x2: { value: 232 }, y: { value: -36 }, y2: { value: 4 } } },
      { data: { values: [{}] }, mark: { type: 'rect', color: '#ffffff', cornerRadius: 6, clip: false }, encoding: { x: { value: 106 }, x2: { value: 230 }, y: { value: -38 }, y2: { value: 2 } } },
      { data: { values: [{}] }, mark: { type: 'text', align: 'left', baseline: 'middle', fontSize: 14, font: FONT, color: SUB, text: MONTHS[m - 1] === 'Jul' ? 'July' : MONTHS[m - 1] }, encoding: { x: { value: 118 }, y: { value: -18 } } },
      { data: { values: [{}] }, mark: { type: 'text', align: 'left', baseline: 'middle', fontSize: 22, font: FONT, color: TITLE, text: `${HIGH[m - 1]}°F` }, encoding: { x: { value: 162 }, y: { value: -18 } } },
    );
  }
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 0, top: o.hover !== undefined ? 46 : 6, right: 0, bottom: 4 } },
    width: 330,
    height: 200,
    layer: layers,
  };
}

const lineKey = (items: [string, string][]) => `<div style="font-family:${FONT};display:flex;gap:28px;font-size:13px;color:${DARK_TEXT};margin:14px 0 2px">`
  + items.map(([name, color]) => `<span><span style="display:inline-block;width:16px;height:3px;background:${color};vertical-align:middle;margin-right:10px"></span>${name}</span>`).join('') + '</div>';

const tempsFlint = (title: string, subtitle: string) => flintInput(theme, {
  chartType: 'Line Chart',
  data: TEMPS.map((r) => ({ ...r, Month: MONTHS[r.Month - 1] })),
  semantic_types: { Month: 'Month', Series: 'Category', 'Temperature (°F)': { semanticType: 'Temperature', unit: '°F' } },
  encodings: { x: 'Month', y: 'Temperature (°F)', color: 'Series' },
  title,
  subtitle,
});

const material: StyleGuideTheme = {
  id: 'material',
  org: 'Google Material Design (M2) — Data visualization',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the M2 data-visualization page (read from its page-data JSON). The guide states a type scale but no colour tokens; the inks here are sampled from its own example images and flagged as such in the research. Stated directly: Roboto throughout with the guide’s scale (18 title, 14 subtitle, 12 axis and legend, 22 for the hero value as `type.display`), all regular weight; Material primary `#6200ee` for single series and the five sampled series inks; light horizontal gridlines only; the value axis on the right without a line; a 2px light-grey baseline with short ticks; narrow bars with 2px top corners; horizontal labels; a bottom, left-aligned, untitled key that moves to the top on narrow canvases (a `canvasWidth` variant under 340px, from the desktop/mobile rule — the breakpoint is a guess); the unit on the top tick only; a flat y title above the axis when one is needed.',
    'Approximated: the bar-to-gap ratio (“bar narrower than gap”) as a 0.4 band fraction; the sampled greys.',
    'Not stated: the white elevated card on a grey page, the translucent-grey context lines behind a purple highlight, the dashed threshold with a white callout bubble, and the hover state (dashed crosshair, haloed focus point, tooltip card above the chart with a 22pt value). See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall: “Customer feedback”',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'A white card with soft shadow on a grey page; 18pt Roboto Regular title and a 14pt grey subtitle top-left; four narrow purple bars with subtly rounded tops; light horizontal gridlines; values on the right with the unit on the top tick (0 … 40%); a light-grey baseline; quarters below.',
      current: 'Flint draws the purple bars, right-hand axis, light grid and unit-on-top-tick from the theme (with `layout.bandStepFit: 1` so four bars fill the card); the card is not part of a chart.',
      expected: 'The guide’s bar-rounded specimen.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: FEEDBACK,
        semantic_types: { Quarter: 'Quarter', 'Positive comments': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Quarter', y: 'Positive comments' },
        title: 'Customer feedback',
        subtitle: 'Positive comments',
      }),
      expectedSpec: feedbackSpec(),
      expectedFrame: { style: CARD, headerHtml: head('Customer feedback', 'Positive comments') },
      observed: 'Flint (left) is close: purple bars at a 0.4 band, light horizontal grid, right-hand values with the unit on the top tick only (“40%”), a light-grey baseline, title and subtitle top-left in regular weight. It differs in two places: no card or page around the chart, and a flat “Positive comments” axis title above the values that repeats the subtitle. Expected (right): the same chart inside a white elevated card on grey, no axis title.',
    },
    {
      id: 'card',
      title: 'Charts sit in an elevated white card',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'card-container',
      rule: 'Every example is a white card with rounded corners and a faint shadow on a light-grey page, the title and subtitle stacked at its top-left; dashboards compose several cards.',
      current: 'ThemeSpec has a canvas colour but no container: no elevation, radius or inset, and no notion of the page behind the chart. Flint draws the chart edge to edge on white.',
      expected: 'A 4px-radius white card with a 1dp shadow on `#e5e5e5`.',
      proposal: '`layout.container: { fill, radius, elevation, padding }` with `ink.surface.page` for what surrounds it.',
      ...cardProbe(theme, t, { style: CARD, header: 'Unemployment rate', meta: 'United States, 2000–2023', actions: false }),
      expectedFrame: { style: CARD, headerHtml: head('Unemployment rate', 'United States, 2000–2023') },
      observed: 'Flint draws the line chart bare on white, with “Unemployment (%)” above the right-hand axis and the y axis starting at 2. Expected: a white 4px-radius card with a soft shadow on `#e5e5e5`, title and subtitle inside it, axis from 0%.',
    },
    {
      id: 'highlight-greys',
      title: 'One series in purple, the rest as translucent greys',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'highlight',
      rule: '“Use a combination of color highlights and neutral colors to provide contrast and emphasis”: the specimen draws one purple line over ~15 translucent grey context lines, with no legend.',
      current: 'The chart spec cannot name the series that matters and the theme has no context ink. With 16 series Flint runs through the five inks, then the overflow grey, and keeps a 16-entry key.',
      expected: '“Your site” in purple on top; fifteen peers in 30% grey beneath it; no key.',
      proposal: '`chart_spec.emphasis: { field: "Site", values: ["Your site"] }` with `ink.series.context: { color, opacity }` in the theme, and the legend suppressed when the emphasis is named in the title.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: USERS,
        semantic_types: { Date: 'Date', Site: 'Category', Users: 'Count' },
        encodings: { x: 'Date', y: 'Users', color: 'Site' },
        title: 'Users in the last 30 days',
      }),
      expectedSpec: usersSpec(),
      expectedFrame: { headerHtml: head('Users in the last 30 days') },
      observed: 'Flint colours the first five sites purple, pink, blue, orange and teal and the other eleven in the overflow grey, with a 16-entry key beside the plot; “Your site” is just one of many. Expected: one purple line over fifteen 30% greys, no key — the purple line reads at once.',
    },
    {
      id: 'threshold-callout',
      title: 'A dashed threshold with a white callout bubble',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'annotation',
      rule: '“Annotations highlight data points, outliers and noteworthy content”: the specimen draws a dashed grey threshold line and a white, shadowed callout bubble with a pointer, labelled “Required housing temp”.',
      current: 'The chart spec has no annotation or reference-line slot, and the theme has no callout style; Flint draws the two lines only.',
      expected: 'A dashed grey line at 55° with a white shadowed bubble above it at the left.',
      proposal: '`chart_spec.annotations: [{ kind: "threshold", value: 55, label }]`, styled by `type.annotation` and a new `annotation.callout: { surface, radius, elevation, pointer }`.',
      flint: tempsFlint('Average temperature', 'in Fahrenheit'),
      expectedSpec: temperatureSpec({ annotate: true }),
      expectedFrame: { headerHtml: head('Average temperature', 'in Fahrenheit'), footerHtml: lineKey([['High', '#ff5722'], ['Low', PURPLE]]) },
      observed: 'Flint draws the High and Low lines only (High in purple, Low in pink — the categorical order), with “Temperature (°F)” above the axis. Expected: a dashed grey line at 55° and a white shadowed bubble with a pointer reading “Required housing temp”.',
    },
    {
      id: 'hover-tooltip',
      title: 'Hover: dashed crosshair, haloed focus point, tooltip card above',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'tooltip-style',
      rule: 'Progressive disclosure: hover (touch-and-hold on mobile) shows a dashed vertical crosshair with a dot on each series, the focused point as a hollow circle with a translucent halo, and a white rounded tooltip above the chart pairing a small grey label (“July”) with a 22pt value (“3,000k”).',
      current: 'ThemeSpec’s `interaction` covers a tooltip format and a selection boundary; it has no crosshair, focus-point halo, tooltip surface or placement, and `type.display` is not used by tooltips. Flint’s static chart shows none of it.',
      expected: 'July focused: dashed crosshair, haloed High point, Low dot, and a card above the plot reading “July 85°F”.',
      proposal: '`interaction.crosshair`, `interaction.focus: { point: "hollow", halo }`, `interaction.tooltip: { placement: "aboveChart", surface, elevation, valueRole: "display" }`.',
      flint: tempsFlint('Average temperature', 'in Fahrenheit'),
      expectedSpec: temperatureSpec({ hover: 7 }),
      expectedFrame: { headerHtml: head('Average temperature', 'in Fahrenheit'), footerHtml: lineKey([['High', '#ff5722'], ['Low', PURPLE]]) },
      observed: 'Flint shows the static chart. Expected: a dashed grey crosshair at July, the High point as a hollow orange ring in a peach halo, a purple dot on Low, and a white card above the plot pairing a grey “July” with a 22pt “85°F”.',
    },
    {
      id: 'units-in-subtitle',
      title: 'An axis title that restates the subtitle',
      kind: 'visual-quality',
      severity: 'low',
      probe: 'axis-title-relocation',
      rule: 'The y title is either a flat label above the right-hand axis (“Users”) or omitted, with the unit in the subtitle (“in Fahrenheit”) and on the top tick (“100°”).',
      current: 'With `axisTitles: "whenAmbiguous"` a bare number axis always earns a title, so Flint prints “Temperature (°F)” above the axis under a subtitle that already says “in Fahrenheit” (and “Positive comments” twice in the signature). It does place the title flat above the right-hand axis, as stated.',
      expected: 'No axis title; “in Fahrenheit” in the subtitle and the degree sign on the top tick.',
      proposal: 'Let the author mark the deck as naming the measure (`chart_spec.subtitleNamesMeasure`), so `whenAmbiguous` can stand down.',
      flint: tempsFlint('Average temperature', 'in Fahrenheit'),
      expectedSpec: temperatureSpec(),
      expectedFrame: { headerHtml: head('Average temperature', 'in Fahrenheit'), footerHtml: lineKey([['High', '#ff5722'], ['Low', PURPLE]]) },
      observed: 'Flint writes “Temperature (°F)” flat above the right axis, under a subtitle that already says “in Fahrenheit”, and prints bare ticks (20 … 100). Expected: no axis title, “100°” on the top tick only.',
    },
    {
      id: 'grouped-hairlines',
      title: 'Grouped bars thin to hairlines',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'bar-shape',
      rule: 'Bars are “moderately thin (bar narrower than gap)” with subtle rounded tops; bar charts carry four or fewer series.',
      current: 'The narrow-bar rule is stated as `geometry.band.fraction: 0.4`. Flint applies it to each bar inside a group as well as to the group, so three medals per country become slivers separated by gaps of their own width.',
      expected: 'Each country a tight group of three touching bars, groups narrower than the gaps between them.',
      proposal: 'Split the rule: `geometry.band.fraction` for the group’s share of its step, `geometry.band.innerFraction` (default 1) for bars within a group.',
      ...groupedProbe(theme, t, { palette: CATEGORICAL.slice(0, 3), padding: 0.45 }),
      observed: 'Flint’s medal bars are 3–4px slivers with gaps between the three bars of each country as wide as the bars themselves; the groups dissolve. The gallery’s medals tile shows the same. Expected: three touching bars per country, groups separated by wider gaps.',
    },
  ],
};

export default material;
