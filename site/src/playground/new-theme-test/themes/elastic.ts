import type { ThemeSpec } from 'flint-chart';
import research from '../research/elastic.json';
import { EV_SHARE, flintInput, highlightProbe } from '../probes';
import { houseConfig, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = 'Inter, BlinkMacSystemFont, Helvetica, Arial, sans-serif';
const PALETTE = ['#16C5C0', '#A6EDEA', '#61A2FF', '#BFDBFF', '#EE72A6', '#FFC7DB', '#F6726A', '#FFC9C2', '#EAAE01', '#FCD883'];
const TEAL = '#16C5C0';
const GRID = '#E3E8F2';
const SUBDUED = '#516381';
const PARAGRAPH = '#1D2A3E';
const HEADING = '#111C2C';
const CROSSHAIR = '#0B64DD';

const t: HouseTokens = {
  font: FONT,
  text: PARAGRAPH,
  muted: SUBDUED,
  grid: GRID,
  axis: GRID,
  background: '#FFFFFF',
  palette: PALETTE,
  highlight: TEAL,
  context: '#CAD3E2',
  titleSize: 14,
  titleWeight: 600,
  subtitleSize: 12,
  labelSize: 10,
  gridAxis: 'both',
  lineWidth: 1.5,
  legendOrient: 'right',
};

const theme: ThemeSpec = {
  id: 'elastic',
  label: 'Elastic Charts (Borealis)',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: PARAGRAPH, secondary: SUBDUED, muted: SUBDUED, inverse: '#FFFFFF' },
    structure: { grid: GRID, axis: GRID, rule: '#CAD3E2' },
    series: {
      single: TEAL,
      categorical: PALETTE,
      overflow: '#CAD3E2',
      sequential: { stops: ['#F1F6FF', '#A3CBFF', '#61A2FF'], space: 'lab' },
      diverging: { stops: ['#61A2FF', '#F6F9FC', '#EAAE01'], neutral: '#F6F9FC', space: 'lab' },
      status: { positive: '#24C292', negative: '#F6726A', neutral: '#37B8DC' },
    },
    accent: CROSSHAIR,
  },
  type: {
    headline: { family: FONT, size: 14, weight: 'semibold', case: 'asIs', color: HEADING },
    deck: { family: FONT, size: 12, color: SUBDUED },
    axisLabel: { family: FONT, size: 10, color: SUBDUED },
    axisTitle: { family: FONT, size: 12, weight: 'bold', color: PARAGRAPH },
    keyLabel: { family: FONT, size: 12, color: PARAGRAPH },
    valueLabel: { family: FONT, size: 10, color: PARAGRAPH },
    footnote: { family: FONT, size: 10, color: SUBDUED },
  },
  structure: {
    axis: {
      categorical: { line: 'hairline', lineWeight: 1, ticks: 'omit', labelGap: 10 },
      measure: { line: 'hairline', lineWeight: 1, ticks: 'omit', labelGap: 10 },
    },
    grid: { measure: 'full', category: 'full', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'hairline',
  },
  marks: {
    bandFraction: 0.75,
    strokeWeight: 1.5,
    fillOpacity: 0.2,
    separator: { presence: 'hairline', width: 1, source: 'surface' },
  },
  geometry: {
    line: { width: 1.5, interpolation: 'linear' },
    // Hollow points only where readings stand 20px apart (`pointVisibilityMinDistance`, M5).
    point: { presence: 'full', size: 28, fill: 'hollow', density: 'sparse' },
    area: { opacity: 0.2, edge: 'full', edgeWidth: 1.5 },
    band: { fraction: 0.75, cornerRadius: 0 },
    arc: { gap: 1, gapStyle: 'rule' },
  },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['right', 'top'], direction: 'vertical', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never', placement: 'atMark' },
  annotation: { axisTitles: 'always', axisTitlePlacement: 'rotated', unit: 'everyTick' },
  layout: { density: 'compact', titleBlock: { anchor: 'start', gap: 'tight' } },
  interaction: { selectionBoundary: { color: CROSSHAIR, width: 1 } },
};

// ---------------------------------------------------------------------------
// The specimen: an hour of one-minute system load, 11:00–11:59, three windows.
// Illustrative values in the shape of the elastic-charts baselines (seeded, deterministic).
// ---------------------------------------------------------------------------

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const LOAD = (() => {
  const rnd = seeded(7);
  const spikes: Record<number, number> = { 10: 18, 11: 12, 24: 14, 25: 9, 37: 23, 38: 15, 58: 15 };
  const rows: { Time: string; Window: string; Load: number }[] = [];
  let five = 10;
  let fifteen = 10.3;
  for (let m = 0; m < 60; m++) {
    const one = Math.max(4, 10 + (rnd() - 0.5) * 7 + (spikes[m] ?? 0));
    five = five + (one - five) * 0.28;
    fifteen = fifteen + (one - fifteen) * 0.08;
    const time = `2019-03-01T11:${String(m).padStart(2, '0')}:00`;
    rows.push({ Time: time, Window: '1m', Load: +one.toFixed(2) });
    rows.push({ Time: time, Window: '5m', Load: +five.toFixed(2) });
    rows.push({ Time: time, Window: '15m', Load: +fifteen.toFixed(2) });
  }
  return rows;
})();
const WINDOWS = ['1m', '5m', '15m'];
const LAST = Object.fromEntries(WINDOWS.map((w) => [w, LOAD.filter((r) => r.Window === w).slice(-1)[0].Load]));

const loadFlint = (title?: string) => flintInput(theme, {
  chartType: 'Line Chart',
  data: LOAD,
  semantic_types: { Time: 'DateTime', Window: 'Category', Load: { semanticType: 'Percentage', unit: '%' } },
  encodings: { x: 'Time', y: 'Load', color: 'Window' },
  ...(title ? { title } : {}),
  baseSize: { width: 440, height: 220 },
});

interface Ink { text: string; muted: string; grid: string; background: string; palette: string[] }
const LIGHT: Ink = { text: PARAGRAPH, muted: SUBDUED, grid: GRID, background: '#FFFFFF', palette: PALETTE };
const DARK: Ink = { text: '#CAD3E2', muted: '#8E9FBC', grid: '#2B394F', background: '#111C2C', palette: PALETTE };

const PW = 300;
const PH = 220;

/** Two-level time axis: HH:MM just right of each gridline, the date once on a second row. */
const timeX = (ink: Ink) => ({
  field: 'Time', type: 'temporal', title: 'timestamp per 1 minute',
  scale: { domain: [{ year: 2019, month: 3, date: 1, hours: 11 }, { year: 2019, month: 3, date: 1, hours: 11, minutes: 59 }] },
  axis: {
    format: '%H:%M', values: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((minutes) => ({ year: 2019, month: 3, date: 1, hours: 11, minutes })), labelAlign: 'left', labelPadding: 4, labelOffset: 0, labelFlush: false,
    titleFontWeight: 'bold', titleFontSize: 12, titleColor: ink.text, titlePadding: 22, labelColor: ink.muted, gridColor: ink.grid, domainColor: ink.grid,
  },
});

const loadY = (ink: Ink, max = 35) => ({
  field: 'Load', type: 'quantitative', title: 'System Load', scale: { domain: [0, max] },
  axis: {
    labelExpr: "datum.value + '%'", titleFontWeight: 'bold', titleFontSize: 12, titleColor: ink.text, titlePadding: 10,
    labelColor: ink.muted, gridColor: ink.grid, domain: true, domainColor: ink.grid, tickCount: 7,
  },
});

/** Right-hand legend rows: circle, series name, current value right-aligned. Drawn as marks, since a VL legend has no value column. */
function legendRows(ink: Ink, rows: { name: string; color: string; value: string; opacity?: number }[]) {
  const values = rows.map((row, i) => ({ ...row, y: 8 + i * 20 }));
  return [
    { data: { values }, mark: { type: 'circle', size: 64, clip: false }, encoding: { x: { value: PW + 20 }, y: { field: 'y', type: 'quantitative', scale: null }, color: { field: 'color', type: 'nominal', scale: null, legend: null }, opacity: { field: 'opacity', type: 'quantitative', scale: null } } },
    { data: { values }, mark: { type: 'text', align: 'left', baseline: 'middle', fontSize: 12, font: FONT, color: ink.text, clip: false }, encoding: { x: { value: PW + 32 }, y: { field: 'y', type: 'quantitative', scale: null }, text: { field: 'name' } } },
    { data: { values }, mark: { type: 'text', align: 'right', baseline: 'middle', fontSize: 12, font: FONT, color: ink.text, clip: false }, encoding: { x: { value: PW + 118 }, y: { field: 'y', type: 'quantitative', scale: null }, text: { field: 'value' } } },
  ];
}

const dateRow = (ink: Ink) => ({
  data: { values: [{}] },
  mark: { type: 'text', align: 'left', baseline: 'top', fontSize: 10, font: FONT, color: ink.muted, text: 'March 1, 2019', clip: false },
  encoding: { x: { value: 4 }, y: { value: PH + 17 } },
});

function loadLines(ink: Ink, o: { focus?: string; crosshair?: string; only?: string[] } = {}): Record<string, unknown> {
  const colors = { '1m': ink.palette[0], '5m': ink.palette[1], '15m': ink.palette[2] };
  const opacity = o.focus ? { condition: { test: `datum.Window === '${o.focus}'`, value: 1 }, value: 0.25 } : { value: 1 };
  const width = o.focus ? { condition: { test: `datum.Window === '${o.focus}'`, value: 2.5 }, value: 1 } : { value: 1.5 };
  const layers: Record<string, unknown>[] = [];
  if (o.crosshair) {
    const at = o.crosshair;
    const until = at.replace(/:(\d\d):00$/, (_, mm) => `:${String(Number(mm) + 1).padStart(2, '0')}:00`);
    layers.push(
      { data: { values: [{ from: at, to: until }] }, mark: { type: 'rect', color: 'rgba(23,80,186,0.06)' }, encoding: { x: { field: 'from', type: 'temporal' }, x2: { field: 'to' } } },
      { data: { values: [{ Time: at }] }, mark: { type: 'rule', color: CROSSHAIR, strokeDash: [4, 4], strokeWidth: 1 }, encoding: { x: { field: 'Time', type: 'temporal' } } },
    );
  }
  layers.push({
    data: { values: o.only ? LOAD.filter((r) => o.only!.includes(r.Window)) : LOAD },
    mark: { type: 'line', interpolate: 'linear' },
    encoding: {
      x: timeX(ink), y: loadY(ink),
      color: { field: 'Window', type: 'nominal', scale: { domain: WINDOWS, range: [colors['1m'], colors['5m'], colors['15m']] }, legend: null },
      opacity, strokeWidth: width,
    },
  });
  if (o.crosshair) {
    const rows = LOAD.filter((r) => r.Time === o.crosshair);
    layers.push(
      { data: { values: rows }, mark: { type: 'point', filled: true, fill: ink.background, strokeWidth: 1.5, size: 28 }, encoding: { x: { field: 'Time', type: 'temporal' }, y: { field: 'Load', type: 'quantitative' }, stroke: { field: 'Window', type: 'nominal', scale: { domain: WINDOWS, range: [colors['1m'], colors['5m'], colors['15m']] }, legend: null } } },
      { data: { values: [{}] }, mark: { type: 'rect', color: '#000000', opacity: 0.06, cornerRadius: 4, clip: false }, encoding: { x: { value: 72 }, x2: { value: 180 }, y: { value: 8 }, y2: { value: 86 } } },
      { data: { values: [{}] }, mark: { type: 'rect', color: '#FFFFFF', stroke: GRID, cornerRadius: 4, clip: false }, encoding: { x: { value: 70 }, x2: { value: 178 }, y: { value: 6 }, y2: { value: 84 } } },
      { data: { values: [{}] }, mark: { type: 'text', align: 'left', baseline: 'top', fontSize: 11, fontWeight: 'bold', font: FONT, color: HEADING, text: 'March 1, 2019 11:38' }, encoding: { x: { value: 78 }, y: { value: 13 } } },
      ...rows.map((row, i) => ({ data: { values: [row] }, mark: { type: 'text', align: 'left', baseline: 'top', fontSize: 11, font: FONT, color: PARAGRAPH, text: `●  ${row.Window}` }, encoding: { x: { value: 78 }, y: { value: 33 + i * 16 }, color: { value: [colors['1m'], colors['5m'], colors['15m']][i] } } })),
      ...rows.map((row, i) => ({ data: { values: [row] }, mark: { type: 'text', align: 'right', baseline: 'top', fontSize: 11, font: FONT, color: PARAGRAPH, text: `${row.Load.toFixed(0)}%` }, encoding: { x: { value: 170 }, y: { value: 33 + i * 16 } } })),
    );
  }
  layers.push(dateRow(ink));
  if (!o.only) layers.push(...legendRows(ink, WINDOWS.map((w, i) => ({ name: w, color: [colors['1m'], colors['5m'], colors['15m']][i], value: `${Math.round(LAST[w])}%`, opacity: o.focus && o.focus !== w ? 0.25 : 1 }))));
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig({ ...t, text: ink.text, muted: ink.muted, grid: ink.grid, axis: ink.grid, background: ink.background }), padding: { left: 4, top: 6, right: o.only ? 10 : 124, bottom: 6 } },
    width: o.only ? PW + 110 : PW,
    height: PH,
    layer: layers,
  };
}

/** The stacked-area specimen: each window a 1.5px line over a 20% wash, stacked. */
function stackedArea(): Record<string, unknown> {
  const order = ['15m', '5m', '1m'];
  const colors = [PALETTE[0], PALETTE[1], PALETTE[2]];
  const enc = {
    x: timeX(LIGHT),
    y: { ...loadY(LIGHT, 60), aggregate: 'sum', stack: 'zero', axis: { ...loadY(LIGHT, 60).axis, labelExpr: "format(datum.value, '.2f')" } },
    color: { field: 'Window', type: 'nominal', scale: { domain: order, range: colors }, legend: null },
    order: { field: 'rank', type: 'quantitative' },
  };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 4, top: 6, right: 124, bottom: 6 } },
    width: PW,
    height: PH,
    layer: [
      {
        data: { values: LOAD },
        transform: [{ calculate: `indexof(${JSON.stringify(order)}, datum.Window)`, as: 'rank' }],
        layer: [
          { mark: { type: 'area', opacity: 0.2 }, encoding: enc },
          { mark: { type: 'line', strokeWidth: 1.5 }, encoding: enc },
        ],
      },
      dateRow(LIGHT),
      ...legendRows(LIGHT, order.map((w, i) => ({ name: w, color: colors[i], value: LAST[w].toFixed(2), opacity: 1 }))),
    ],
  };
}

/** EV share lines with Elastic's 'auto' points: hollow, 3px radius, shown because the readings are far apart. */
function evPoints(): Record<string, unknown> {
  const names = ['Norway', 'China', 'Germany'];
  const rows = EV_SHARE.filter((r) => names.includes(r.Country));
  const enc = {
    x: { field: 'Year', type: 'quantitative', title: 'Year', axis: { format: 'd', values: [2018, 2019, 2020, 2021, 2022, 2023], titleFontWeight: 'bold', titleFontSize: 12, titleColor: PARAGRAPH } },
    y: { field: 'EV share (%)', type: 'quantitative', title: 'EV share', axis: { labelExpr: "datum.value + '%'", titleFontWeight: 'bold', titleFontSize: 12, titleColor: PARAGRAPH, domain: true, domainColor: GRID } },
    color: { field: 'Country', type: 'nominal', scale: { domain: names, range: PALETTE.slice(0, 3) }, legend: null },
  };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 4, top: 6, right: 124, bottom: 6 } },
    width: PW,
    height: PH,
    data: { values: rows },
    layer: [
      { mark: { type: 'line', strokeWidth: 1.5 }, encoding: enc },
      { mark: { type: 'point', filled: true, fill: '#FFFFFF', strokeWidth: 1.5, size: 28, opacity: 1 }, encoding: { x: enc.x, y: enc.y, stroke: enc.color } },
      ...legendRows(LIGHT, names.map((n, i) => ({ name: n, color: PALETTE[i], value: `${rows.find((r) => r.Country === n && r.Year === 2023)!['EV share (%)']}%`, opacity: 1 }))),
    ],
  };
}

const elastic: StyleGuideTheme = {
  id: 'elastic',
  org: 'Elastic (EUI + Elastic Charts)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the elastic-charts `LIGHT_THEME` (Borealis) source and EUI’s vis-colour tokens. Stated directly: Inter; the ten-colour colour-blind palette in strong/light pairs with `#16C5C0` as the single-series ink; full 1px `#E3E8F2` gridlines in both directions with axis lines in the same tone and no ticks; 10px `#516381` tick labels and 12px bold axis titles with a rotated y title; 1.5px unsmoothed lines; 20% area washes under a 1.5px edge; 75% bar fill; a right-hand, untitled, vertical key; Borealis cool/complementary ramps and status inks.',
    'Approximated: the `auto` point rule (hollow 3px points only when readings are ≥20px apart) has to pick one side, so points are off — the dense time series is Kibana’s normal case. Chart titles normally belong to the Kibana panel, so the headline role is only a fallback (14px semibold).',
    'Not stated: the two-level time axis with labels beside their gridline, the legend’s current-value column, the crosshair/hover dimming, the dark Borealis theme, and the zero chart margins. See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'The elastic-charts baseline: no chart title (the Kibana panel carries it); thin unsmoothed lines in teal, light teal and blue; full light grid in both directions; small blue-grey ticks; a rotated bold “System Load” title; a two-level time axis (11:00 … 11:55, then “March 1, 2019”); a right legend with circle swatches, names and current values.',
      current: 'Flint draws the lines, both grids and a right-hand key from the theme. The time axis is one level, labels centred under ticks, and the key has no values.',
      expected: 'The `line-chart/multiple-with-axis-and-legend` baseline, redrawn with an hour of illustrative load data.',
      flint: loadFlint(),
      expectedSpec: loadLines(LIGHT),
      observed: 'Flint (left) matches the light grid in both directions, the 10px blue-grey ticks with % on each, the thin teal/light-teal/blue lines and a right-hand key. It differs on the axis and the key: one row of time labels every 15 minutes, the date folded into the first (“Mar 1, 2019 11 AM”) and each label centred on its gridline; an x title “Time”; stroke swatches with names only. Expected (right): 11:00, 11:10 … starting just right of each gridline, “March 1, 2019” once below, and a key of circles with the current value.',
    },
    {
      id: 'two-level-time',
      title: 'A two-level time axis, labels beside their gridline',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'date-label-format',
      rule: '“Labels that describe passage of time … are always positioned right next to the gridlines”; “Our axes are based on a two-levels organization” — fine buckets (11:00, 11:05) on the first row, the date context once on a second row.',
      current: 'ThemeSpec has no field for temporal label anchoring or a context row; Flint lets the renderer centre one row of labels on each tick and chooses its own date format.',
      expected: 'HH:MM left-aligned just right of each 5-minute gridline, “March 1, 2019” once beneath the first.',
      proposal: '`structure.axis.categorical.temporalLabels: { anchor: "afterGridline" | "centred", contextRow: true }`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: LOAD.filter((r) => r.Window === '1m'),
        semantic_types: { Time: 'DateTime', Load: { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Time', y: 'Load' },
        baseSize: { width: 440, height: 220 },
      }),
      expectedSpec: loadLines(LIGHT, { only: ['1m'] }),
      observed: 'Flint: “Mar 1, 2019 11 AM”, 11:15, 11:30, 11:45, each centred under its gridline. Expected: 11:00, 11:10 … 11:50 starting just right of the gridlines, with “March 1, 2019” on a second row under the first.',
    },
    {
      id: 'area-edge',
      addressed: { stage: 'M1', note: '`geometry.area.edge` is drawn as a line along the top of each area, stacked bands included, in the area’s own ink (M1).' },
      title: 'Stacked areas lose their 1.5px edge line',
      kind: 'realization',
      severity: 'medium',
      probe: 'area-edge',
      rule: '`areaSeriesStyle: { area: { opacity: 0.2 }, line: { strokeWidth: 1.5 } }` — each series is a solid 1.5px line over a 20% wash of its colour, so the shape of every series reads even in the pale pairs.',
      current: 'The theme states `geometry.area: { opacity: 0.2, edge: "full", edgeWidth: 1.5 }`. Flint draws the 20% washes but no edge line on a stacked area, so the series boundaries are only a change of tint.',
      expected: 'The `area-chart/stacked` baseline: three 1.5px lines over their washes, 15m at the base.',
      proposal: 'Realise `geometry.area.edge` on stacked areas too (a line layer stacked with the same offset).',
      flint: flintInput(theme, {
        chartType: 'Area Chart',
        data: LOAD,
        semantic_types: { Time: 'DateTime', Window: 'Category', Load: 'Quantity' },
        encodings: { x: 'Time', y: 'Load', color: 'Window' },
        baseSize: { width: 440, height: 220 },
      }),
      expectedSpec: stackedArea(),
      observed: 'Flint draws three 20% washes with no line on top; the 5m wash is almost white and the boundaries are guesswork. The gallery’s “World electricity generation” tile shows the same: six pale washes, no edges, barely legible. Expected: each series traced by its 1.5px line — the 1m spikes read clearly.',
    },
    {
      id: 'legend-values',
      title: 'The legend carries each series’ current value',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'legend-swatch',
      rule: 'Legend on the right, circle swatches, one line per series: name, then the current/last value right-aligned (“1m 10%”).',
      current: 'ThemeSpec’s legend states placement, direction and title but not a value column or swatch shape; Flint’s key is names only, with Vega-Lite’s default swatch for the mark (a stroke for lines).',
      expected: 'Circle swatches, names, last values in a right-aligned column.',
      proposal: '`legend.values: "none" | "last" | "current"` and `legend.swatch: "circle" | "square" | "mark"`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE.filter((r) => ['Norway', 'China', 'Germany'].includes(r.Country)),
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        baseSize: { width: 440, height: 220 },
      }),
      expectedSpec: evPoints(),
      observed: 'Flint’s key: stroke swatches and names only. Expected: circle swatches with the 2023 values (93%, 38%, 25%) in a right-aligned column.',
    },
    {
      id: 'auto-points',
      addressed: { stage: 'M5', note: '`geometry.point.density: "sparse"` draws the hollow points only where readings stand 20px apart, so dense series stay bare.' },
      title: 'Hollow points appear only when readings are ≥20px apart',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'point-visibility',
      rule: '`point: { visible: "auto", fill: backgroundBasePlain, radius: 3 }`, `pointVisibilityMinDistance: 20` — white-filled 3px points with a 1.5px series stroke on sparse lines, none on dense ones.',
      current: '`geometry.point.presence` is one Presence for every line. This theme picks `omit` (dense time series are Kibana’s normal case), so the six-year EV chart loses its points too; picking `full` would bead every minute of the load chart. The hollow fill cannot be stated either: `geometry.point.fill` is shared by line vertices and scatter dots, and a first draft with `fill: "hollow"` hollowed the gallery’s bubbles, which Elastic draws filled.',
      expected: 'Hollow points at each year on the EV lines (and none on the per-minute load lines in the signature).',
      proposal: '`geometry.point.presence: "auto"` with `geometry.point.minSpacing: 20` (px between readings).',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE.filter((r) => ['Norway', 'China', 'Germany'].includes(r.Country)),
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        baseSize: { width: 440, height: 220 },
      }),
      expectedSpec: evPoints(),
      observed: 'Flint draws the six-year lines with no points. Expected: white-filled points with a 1.5px series stroke at each year.',
    },
    {
      id: 'crosshair',
      title: 'Hover: dashed blue crosshair, focused line 2.5px, others at 25%',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'focus-hover-state',
      rule: 'Crosshair line dashed [4,4] 1px `#0B64DD` over a faint blue band on the hovered bucket; the tooltip lists every series; hovering a legend item thickens its line to 2.5px and dims the others to 25% opacity.',
      current: 'ThemeSpec’s `interaction` has a selection boundary and a tooltip format only — no crosshair, no focus stroke, no dimmed opacity. Flint’s static chart shows none of it.',
      expected: '1m focused at 11:38: dashed crosshair, hollow points on each series, a white tooltip with all three values, 5m and 15m dimmed in the lines and the key.',
      proposal: '`interaction.crosshair: { stroke, dash, band }`, `interaction.focus: { strokeWidth: 2.5, othersOpacity: 0.25 }`.',
      flint: loadFlint(),
      expectedSpec: loadLines(LIGHT, { focus: '1m', crosshair: '2019-03-01T11:38:00' }),
      observed: 'Flint shows the static chart. Expected: a dashed blue crosshair at 11:38 with hollow points on each series, a white tooltip listing 1m 23%, 5m 18%, 15m 14%, the 1m line thickened and 5m/15m dimmed to 25% in the plot and the key.',
    },
    {
      id: 'dark-mode',
      title: 'Borealis ships a dark theme alongside the light one',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'dark-mode',
      rule: '`DARK_THEME`: background blueGrey140 `#111C2C`, gridlines blueGrey120 `#2B394F`, text `#CAD3E2`; Kibana switches with the user’s colour mode.',
      current: 'One ThemeSpec is one set of inks; there is no dark counterpart to switch to. Flint keeps the white chart.',
      expected: 'The same chart on `#111C2C` with the dark grid and text.',
      proposal: '`ink.modes: { dark: Partial<ThemeInk> }`, chosen by the host’s colour scheme.',
      flint: loadFlint(),
      expectedSpec: loadLines(DARK),
      expectedFrame: { style: { background: '#111C2C' } },
      observed: 'Flint keeps the white chart. Expected: the same lines on `#111C2C` with the `#2B394F` grid and `#CAD3E2` text; the pale teal 5m line reads better on dark than on white.',
    },
    {
      id: 'accent-on-neutral',
      title: 'One accent for what you are looking for, neutral for the rest',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'highlight',
      rule: '“Use a neutral color for generic elements and an accent one for the things that you are looking for.”',
      current: 'The chart spec cannot name the item being looked for, and the theme has no context ink; every bar takes the single-series teal.',
      expected: 'Nigeria in teal `#16C5C0`, the rest in vis grey `#CAD3E2`.',
      proposal: '`chart_spec.emphasis: { field, values }` with `ink.series.context` (Elastic: euiColorVisGrey0).',
      ...highlightProbe(theme, { ...t, legendOrient: 'top' }),
      observed: 'Flint fills every bar teal and adds “Country”/“Population” axis titles with “m” on each tick. Expected: Nigeria alone in teal, every other bar in `#CAD3E2`.',
    },
    {
      id: 'zero-margins',
      title: 'Zero chart margins: the plot runs to the panel edge',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'layout-padding',
      rule: '`DEFAULT_CHART_MARGINS = { left: 0, right: 0, top: 0, bottom: 0 }` and zero paddings — the panel supplies the air.',
      current: '`layout.density` is a three-step ordinal (`compact` is the tightest); it cannot say zero, and Flint keeps its own padding around the canvas.',
      expected: 'Axis labels flush with the panel edge.',
      proposal: '`layout.margin: number | { top, right, bottom, left }` in px.',
    },
  ],
};

export default elastic;
