import type { ThemeSpec } from 'flint-chart';
import research from '../research/ebay.json';
import { cardProbe, flintInput, paletteCountProbe } from '../probes';
import { houseConfig, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Market Sans', Inter, Arial, sans-serif";
const BLUE = '#0968f6';
const NAVY = '#002a69';
const LIGHT = '#d3effe';
const TEAL_300 = '#8edfe5';
const TEAL_200 = '#d7f4f6';
const TEAL_600 = '#006f93';
const INK = '#191919';
const LEGEND = '#707070';
const GRID = '#e5e5e5';
const PAGE = '#f7f7f7';
/** The line-graph tokens: a separate set, not to be mixed with the bar/area set. */
const LINE = [BLUE, '#271a68', TEAL_600, '#de458e', '#a51359'];

const t: HouseTokens = {
  font: FONT,
  text: INK,
  muted: LEGEND,
  grid: GRID,
  axis: null,
  background: '#ffffff',
  palette: [BLUE, NAVY, LIGHT, TEAL_300, TEAL_200],
  highlight: BLUE,
  context: '#c7c7c7',
  titleSize: 18,
  titleWeight: 600,
  subtitleSize: 14,
  labelSize: 12,
  yRight: true,
  lineWidth: 2,
  barCorner: 2,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'ebay',
  label: 'eBay Evo (Playbook graphs)',
  ink: {
    surface: { source: 'house', canvas: '#ffffff' },
    text: { primary: INK, secondary: LEGEND, muted: LEGEND, inverse: '#ffffff' },
    structure: { grid: GRID, axis: INK, zero: GRID },
    series: {
      single: BLUE,
      // The bar/area/donut "chart" tokens, primary to quinary.
      categorical: [BLUE, NAVY, LIGHT, TEAL_300, TEAL_200],
      // Line graphs have their own tokens (R7).
      byMark: { line: { categorical: ['#0968f6', '#271a68', '#006f93', '#de458e', '#a51359'] } },
      overflow: '#c7c7c7',
      status: { positive: '#288034', negative: '#d50b0b', neutral: LEGEND },
      selection: { partToWhole: 'categorical', signed: 'status', statusUse: 'thresholdOnly' },
    },
    accent: BLUE,
  },
  type: {
    headline: { family: FONT, size: 18, weight: 'semibold', case: 'asIs', color: INK },
    deck: { family: FONT, size: 14, weight: 'regular', color: LEGEND },
    axisLabel: { family: FONT, size: 12, color: INK },
    axisTitle: { family: FONT, size: 12, color: INK },
    keyLabel: { family: FONT, size: 14, color: LEGEND },
    valueLabel: { family: FONT, size: 12, color: INK },
    footnote: { family: FONT, size: 12, color: LEGEND },
    display: { family: FONT, size: 30, weight: 'bold', color: INK },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit', labelGap: 6 },
      measure: { line: 'omit', ticks: 'omit', placement: 'opposite', tickDensity: 'normal' },
    },
    grid: { measure: 'full', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'quiet',
  },
  marks: {
    bandFraction: 0.55,
    cornerRadius: 2,
    strokeWeight: 2,
    separator: { presence: 'full', width: 2, source: 'surface' },
  },
  geometry: {
    band: { fraction: 0.55, cornerRadius: 2 },
    line: { width: 2 },
    arc: { gap: 2, gapStyle: 'rule' },
  },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never' },
  annotation: {
    axisTitles: 'omit',
    unit: 'everyTick',
    numberFormat: { thousands: 'suffix', precision: 'auto', compact: { threshold: 1000 } },
  },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' }, density: 'normal' },
};

// ---------------------------------------------------------------------------
// The specimen: twelve months of seller sales in three listing formats, stacked.
// Illustrative values read off the guide's anatomy image ($k).
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FORMATS = ['Buy It Now', 'Auctions', 'Best Offer'];
const STACKS: [number, number, number][] = [
  [8, 8, 7], [8, 22.5, 20], [5, 20, 21], [14, 19, 23], [16.5, 12, 21], [10, 14, 23.5],
  [21, 16, 19], [8, 14, 16.5], [16.5, 7.5, 17], [8, 12, 14], [19, 12, 17], [23, 12, 17],
];
const SALES = STACKS.flatMap((stack, i) => stack.map((v, j) => ({ Month: MONTHS[i], Format: FORMATS[j], Sales: v * 1000 })));

interface StackInk {
  bottom: string;
  middle: string;
  hatchFill: string;
  hatchStroke: string;
  gap: string;
  labels: string;
  grid: string;
  background: string;
}

const LIGHT_INK: StackInk = { bottom: NAVY, middle: BLUE, hatchFill: LIGHT, hatchStroke: BLUE, gap: '#ffffff', labels: INK, grid: GRID, background: '#ffffff' };

/**
 * The guide's stacked bars, drawn by hand: navy base, blue middle, and a light-blue top segment hatched
 * with blue diagonals inside a blue outline. Vega-Lite has no pattern fill, so the hatch is a set of rules
 * computed at 45° in pixel space and clipped to each segment.
 */
function stackedSpec(o: {
  stacks: [number, number, number][];
  labels: string[];
  ink?: StackInk;
  width?: number;
  height?: number;
  yMax?: number;
  barPx?: number;
  focus?: number;
  tooltip?: boolean;
  yLabelExpr?: string;
  yTicks?: number[];
}): Record<string, unknown> {
  const ink = o.ink ?? LIGHT_INK;
  const n = o.stacks.length;
  const width = o.width ?? 380;
  const height = o.height ?? 200;
  const yMax = o.yMax ?? 60000;
  const pxX = width / n;
  const pxY = height / yMax;
  const half = (o.barPx ?? 16) / 2 / pxX;
  const gap = 2 / pxY;
  const segs: { i: number; seg: number; x0: number; x1: number; y0: number; y1: number }[] = [];
  const hatch: { i: number; x: number; x2: number; y: number; y2: number }[] = [];
  o.stacks.forEach((stack, i) => {
    let base = 0;
    stack.forEach((v, seg) => {
      const y0 = base * 1000 + (seg > 0 ? gap : 0);
      const y1 = (base + v) * 1000;
      base += v;
      segs.push({ i, seg, x0: i - half, x1: i + half, y0, y1 });
      if (seg !== 2) return;
      // Pixel rectangle of the segment, inset by the outline.
      const u0 = (i - half) * pxX + 1.5;
      const u1 = (i + half) * pxX - 1.5;
      const v0 = y0 * pxY + 1.5;
      const v1 = y1 * pxY - 1.5;
      const step = 5 * Math.SQRT2;
      for (let c = u0 + v0 + step / 2; c < u1 + v1; c += step) {
        const ua = Math.max(u0, c - v1);
        const ub = Math.min(u1, c - v0);
        if (ub - ua < 0.5) continue;
        hatch.push({ i, x: ua / pxX, y: (c - ua) / pxY, x2: ub / pxX, y2: (c - ub) / pxY });
      }
    });
  });
  const ticks = o.yTicks ?? [0, 1, 2, 3, 4, 5, 6].map((k) => (k * yMax) / 6);
  const opacity = o.focus === undefined ? 1 : { condition: { test: `datum.i === ${o.focus}`, value: 1 }, value: 0.3 };
  const x = {
    field: 'x0', type: 'quantitative', title: null,
    scale: { domain: [-0.5, n - 0.5], nice: false, zero: false },
    // Month labels are a text layer: the page's label patch would otherwise thin them.
    axis: null,
  };
  const y = {
    field: 'y0', type: 'quantitative', title: null,
    scale: { domain: [0, yMax], nice: false },
    axis: {
      orient: 'right', values: ticks, labelExpr: o.yLabelExpr ?? "datum.value === 0 ? '$0' : '$' + format(datum.value / 1000, 'd') + 'k'",
      grid: true, gridColor: ink.grid, domain: false, ticks: false, labelColor: ink.labels, labelPadding: 10,
    },
  };
  const fadeEncoding = typeof opacity === 'number' ? {} : { opacity };
  const layers: Record<string, unknown>[] = [
    {
      data: { values: segs.filter((s) => s.seg < 2) },
      mark: { type: 'rect', cornerRadius: 2 },
      encoding: {
        x, x2: { field: 'x1' }, y, y2: { field: 'y1' },
        color: { field: 'seg', type: 'nominal', scale: { domain: [0, 1], range: [ink.bottom, ink.middle] }, legend: null },
        ...fadeEncoding,
      },
    },
    {
      data: { values: segs.filter((s) => s.seg === 2) },
      mark: { type: 'rect', cornerRadius: 2, fill: ink.hatchFill, stroke: ink.hatchStroke, strokeWidth: 1.2 },
      encoding: { x: { field: 'x0', type: 'quantitative' }, x2: { field: 'x1' }, y: { field: 'y0', type: 'quantitative' }, y2: { field: 'y1' }, ...fadeEncoding },
    },
    {
      data: { values: hatch },
      mark: { type: 'rule', color: ink.hatchStroke, strokeWidth: 1 },
      encoding: { x: { field: 'x', type: 'quantitative' }, x2: { field: 'x2' }, y: { field: 'y', type: 'quantitative' }, y2: { field: 'y2' }, ...fadeEncoding },
    },
  ];
  layers.push({
    data: { values: o.labels.map((label, i) => ({ i, label })) },
    mark: { type: 'text', baseline: 'top', fontSize: 12, font: FONT, color: ink.labels },
    encoding: { x: { field: 'i', type: 'quantitative' }, y: { value: height + 8 }, text: { field: 'label' } },
  });
  if (o.tooltip && o.focus !== undefined) {
    const i = o.focus;
    const stack = o.stacks[i];
    const top = stack.reduce((a, b) => a + b, 0) * 1000;
    const boxBottom = top + 4000;
    const boxTop = Math.min(yMax, boxBottom + 21000);
    const box = { x: i - 1.9, x2: i + 1.9, y: boxBottom, y2: boxTop };
    const rows = [
      { text: `Best Offer  $${stack[2]}k`, swatch: 'hatch', k: 0 },
      { text: `Auctions  $${stack[1]}k`, swatch: ink.middle, k: 1 },
      { text: `Buy It Now  $${stack[0]}k`, swatch: ink.bottom, k: 2 },
    ];
    layers.push(
      { data: { values: [box] }, mark: { type: 'rect', color: '#000000', opacity: 0.08, cornerRadius: 8, xOffset: 0, yOffset: 3, x2Offset: 0, y2Offset: 3 }, encoding: { x: { field: 'x', type: 'quantitative' }, x2: { field: 'x2' }, y: { field: 'y', type: 'quantitative' }, y2: { field: 'y2' } } },
      { data: { values: [box] }, mark: { type: 'rect', color: '#ffffff', stroke: '#e5e5e5', strokeWidth: 0.5, cornerRadius: 8 }, encoding: { x: { field: 'x', type: 'quantitative' }, x2: { field: 'x2' }, y: { field: 'y', type: 'quantitative' }, y2: { field: 'y2' } } },
      { data: { values: [box] }, mark: { type: 'text', align: 'left', baseline: 'top', dx: 10, dy: 8, fontSize: 12, fontWeight: 600, color: INK, text: `${o.labels[i]} 2024` }, encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'y2', type: 'quantitative' } } },
      ...rows.map((row) => ({
        data: { values: [box] },
        mark: { type: 'text', align: 'left', baseline: 'top', dx: 24, dy: 26 + row.k * 16, fontSize: 12, color: INK, text: row.text },
        encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'y2', type: 'quantitative' } },
      })),
      ...rows.map((row) => ({
        data: { values: [box] },
        mark: row.swatch === 'hatch'
          ? { type: 'square', size: 64, filled: true, fill: ink.hatchFill, stroke: ink.hatchStroke, strokeWidth: 1, xOffset: 15, yOffset: 33 + row.k * 16 }
          : { type: 'square', size: 64, filled: true, color: row.swatch, xOffset: 15, yOffset: 33 + row.k * 16 },
        encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'y2', type: 'quantitative' } },
      })),
    );
  }
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...houseConfig({ ...t, background: ink.background }),
      padding: { left: 0, right: 0, top: 8, bottom: 24 },
      axis: { ...(houseConfig(t).axis as object), labelColor: ink.labels, labelFontSize: 12, gridColor: ink.grid },
    },
    width,
    height,
    layer: layers,
  };
}

const ebayFont = `font-family:${FONT}`;

function cardHeader(title: string, o: { tabs?: string[]; active?: number; pill?: string; ink?: string; muted?: string; pillBorder?: string } = {}): string {
  const ink = o.ink ?? INK;
  const muted = o.muted ?? LEGEND;
  const pill = o.pill ?? 'Last 12 months';
  const tabs = o.tabs
    ? `<div style="display:flex;gap:22px;margin-top:14px;font-size:14px;color:${muted}">${o.tabs.map((tab, i) => (i === o.active
      ? `<span style="color:${ink};font-weight:700;border-bottom:2px solid ${ink};padding-bottom:4px">${tab}</span>`
      : `<span style="padding-bottom:4px">${tab}</span>`)).join('')}</div>`
    : '';
  return `<div style="${ebayFont};margin:0 0 4px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:16px">
      <div style="font-size:18px;font-weight:700;color:${ink}">${title}</div>
      <div style="border:1px solid ${o.pillBorder ?? '#8f8f8f'};border-radius:999px;padding:5px 14px;font-size:13px;color:${ink};white-space:nowrap">${pill} &#8964;</div>
    </div>${tabs}</div>`;
}

function keyHtml(o: { bottom?: string; middle?: string; hatchFill?: string; hatchStroke?: string; text?: string } = {}): string {
  const sw = (bg: string, extra = '') => `<span style="display:inline-block;width:11px;height:11px;border-radius:2px;background:${bg};${extra};vertical-align:-1px;margin-right:6px"></span>`;
  const hatch = `repeating-linear-gradient(135deg, ${o.hatchStroke ?? BLUE} 0 1px, ${o.hatchFill ?? LIGHT} 1px 4px)`;
  return `<div style="${ebayFont};display:flex;gap:18px;font-size:14px;color:${o.text ?? INK};margin:10px 0 0">`
    + `<span>${sw(o.bottom ?? NAVY)}Buy It Now</span><span>${sw(o.middle ?? BLUE)}Auctions</span>`
    + `<span>${sw(hatch, `box-shadow:inset 0 0 0 1px ${o.hatchStroke ?? BLUE}`)}Best Offer</span></div>`;
}

const CARD = { background: '#ffffff', borderRadius: '16px', padding: '18px 22px 16px', boxShadow: `0 0 0 16px ${PAGE}`, margin: '16px' };

const salesFlint = (title: string) => flintInput(theme, {
  chartType: 'Stacked Bar Chart',
  data: SALES,
  semantic_types: { Month: 'Month', Format: 'Category', Sales: { semanticType: 'Amount', unit: 'USD' } },
  encodings: { x: 'Month', y: 'Sales', color: 'Format' },
  title,
});

const ELECTRICITY: [string, [number, number, number]][] = [
  ['France', [8, 27, 65]], ['Germany', [45, 52, 3]], ['United States', [60, 22, 18]], ['China', [62, 33, 5]], ['Brazil', [9, 89, 2]],
];

const DARK_INK: StackInk = {
  bottom: BLUE, middle: '#84b4fb', hatchFill: '#0049b8', hatchStroke: '#4d93fc', gap: '#191919', labels: '#8f8f8f', grid: '#c7c7c7', background: '#191919',
};

const TOTALS = STACKS.map((stack, i) => ({ Month: MONTHS[i], Sales: stack.reduce((a, b) => a + b, 0) * 1000 }));

const totalsFlint = flintInput(theme, {
  chartType: 'Bar Chart',
  data: TOTALS,
  semantic_types: { Month: 'Month', Sales: { semanticType: 'Amount', unit: 'USD' } },
  encodings: { x: 'Month', y: 'Sales' },
  title: 'Total sales',
});

/** One series in primary blue: 16px bars, every other month labelled flat, $k ticks on the right. */
function totalsSpec(): Record<string, unknown> {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 0, right: 0, top: 8, bottom: 24 } },
    width: 340,
    height: 200,
    data: { values: TOTALS },
    encoding: {
      x: { field: 'Month', type: 'ordinal', sort: MONTHS, title: null, axis: { labels: false, domain: false, ticks: false } },
    },
    layer: [
      {
        mark: { type: 'bar', color: BLUE, width: 16, cornerRadiusEnd: 2 },
        encoding: {
          y: {
            field: 'Sales', type: 'quantitative', title: null, scale: { domain: [0, 60000] },
            axis: { orient: 'right', values: [0, 20000, 40000, 60000], labelExpr: "datum.value === 0 ? '$0' : '$' + format(datum.value / 1000, 'd') + 'k'", labelColor: INK, gridColor: GRID },
          },
        },
      },
      {
        // Every other month, flat: drawn as text so the page's label patch cannot re-thin them.
        transform: [{ filter: `indexof(${JSON.stringify(MONTHS.filter((_, i) => i % 2 === 0))}, datum.Month) >= 0` }],
        mark: { type: 'text', baseline: 'top', fontSize: 12, font: FONT, color: INK },
        encoding: { y: { value: 208 }, text: { field: 'Month' } },
      },
    ],
  };
}

const ebay: StyleGuideTheme = {
  id: 'ebay',
  org: 'eBay (Playbook / Evo design system)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the Playbook “Graphs” page and eBay Skin’s published Evo tokens (`evo-light.css`, `evo-core.css`). Stated directly: primary blue `#0968f6` as the single-series ink; the five “chart” tokens (blue, navy, indigo-200, teal-300, teal-200) as the categorical set; `#e5e5e5` horizontal gridlines only, no axis lines or ticks; the value axis on the right (`placement: opposite`); units on every tick with a k suffix and no axis titles; a bottom, left-aligned, untitled key; 2px corner radius on the value end of bars; white separators between stacked segments; horizontal labels only; no value labels (precise values live in the tooltip).',
    'Approximated: Market Sans is proprietary, so the panels fall back to Inter. Evo’s “bold” is weight 600, which maps to `semibold`. Type sizes are not stated on the graphs page; 18px titles, 14px key and 12px ticks come from Skin’s type scale and the anatomy image’s proportions. The 12–24px bar width becomes a `bandFraction` of 0.55, which only holds at one density.',
    'Not stated: the hatched light-blue third series, the separate line-graph palette, the rounded card with tabs and a pill drop-down, the hover fade to 30% with a shadowed tooltip above the period, the bottom-up key order and the dark-mode token set. Each is a gap below.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'high',
      probe: 'signature',
      rule: 'Anatomy: bold short title top-left, pill drop-down top-right, a tab row with the active tab underlined; narrow stacked bars (navy base, blue, hatched light blue) with 2px outer corners and white gaps; faint horizontal gridlines; $-abbreviated labels on the right; short-month x labels; the key under the chart at the left — all inside a white rounded card on a light-grey page.',
      current: 'Flint draws the stack with the categorical set in order (blue, navy, pale indigo with no outline), the value axis on the right and the key at the bottom. The card, tabs, drop-down and hatching have no field; the title is plain chart text.',
      expected: 'The guide’s anatomy specimen drawn with twelve months of illustrative seller sales.',
      flint: salesFlint('Total sales'),
      expectedSpec: stackedSpec({ stacks: STACKS, labels: MONTHS }),
      expectedFrame: {
        style: CARD,
        headerHtml: cardHeader('Total sales', { tabs: ['Sales', 'Orders', 'Page views', 'Conversion'], active: 0 }),
        footerHtml: keyHtml(),
      },
      observed: 'Flint (left) gets the right-hand axis, faint horizontal grid, 2px value-end corners, white segment gaps and a bottom-left key. Everything else departs: the first series (Buy It Now) is drawn in primary blue at the TOP of each stack and the pale `#d3effe` third series sits at the base with no outline or hatch, so the stack reads light-to-dark upside down; the month labels are turned −45° although the theme says horizontal; ticks print $10,000 … $60,000 instead of $10k; the deck “Sales ($)” is invented from the axis title; and there is no card, tab row or drop-down. Expected (right): navy base, blue middle, hatched top, flat months, $k ticks, all inside the rounded card.',
    },
    {
      id: 'hatched-tertiary',
      title: 'The third series is hatched light blue with a blue outline',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'pattern-fill',
      rule: 'Part-to-whole charts use shades of blue: the tertiary token is a light-blue background (`indigo-200 #d3effe`) with a blue-500 stroke, drawn as diagonal hatching inside a blue outline, so it is told apart by more than colour.',
      current: 'ThemeSpec inks are flat colours; there is no fill pattern, and no per-series stroke. Flint fills the third series flat `#d3effe`, which nearly disappears against the white card.',
      expected: 'Navy base, blue middle, the top segment hatched blue-on-light-blue with a blue outline.',
      proposal: 'Let a categorical entry be an object: `{ fill, stroke?, pattern?: "diagonal" | "dots", patternInk? }`, realised as an SVG pattern (Vega has none, so the compiler would layer hatch rules or emit a canvas pattern).',
      flint: flintInput(theme, {
        chartType: 'Stacked Bar Chart',
        data: ELECTRICITY.flatMap(([Country, v]) => ['Fossil', 'Renewables', 'Nuclear'].map((Source, j) => ({ Country, Source, Share: v[j] }))),
        semantic_types: { Country: 'Country', Source: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Country', y: 'Share', color: 'Source' },
        title: 'Generation mix',
      }),
      expectedSpec: stackedSpec({ stacks: ELECTRICITY.map(([, v]) => v), labels: ELECTRICITY.map(([c]) => c), yMax: 100000, barPx: 22, yTicks: [0, 25000, 50000, 75000, 100000], yLabelExpr: "format(datum.value / 1000, 'd') + '%'" }),
      expectedFrame: {
        headerHtml: `<div style="${ebayFont};font-size:18px;font-weight:700;color:${INK};margin:0 0 6px">Generation mix</div>`,
        footerHtml: keyHtml().replace('Buy It Now', 'Fossil').replace('Auctions', 'Renewables').replace('Best Offer', 'Nuclear'),
      },
      observed: 'Flint’s Nuclear segment is a flat `#d3effe` block with no edge: France’s 65% nuclear reads as empty space, and its key swatch is barely visible. Flint also puts the first key entry (Fossil, blue) at the top of the stack. Expected: the same segment hatched in blue inside a blue outline, unmistakable on white, with a hatched key swatch.',
    },
    {
      id: 'line-palette',
      addressed: { stage: 'R7', note: 'The line tokens are stated as `ink.series.byMark.line`.' },
      title: 'Line graphs take their own palette',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'per-mark-palette',
      rule: 'Line-graph tokens are a separate set — blue `#0968f6`, violet `#271a68`, teal `#006f93`, pink `#de458e`, dark pink `#a51359` — and “Don’t use colors intended for one chart type in another”.',
      current: 'ThemeSpec has one categorical list for every mark, and `variants` may not change `ink`. Lines therefore take the bar set, whose third and fifth entries are pale backgrounds meant to sit under a stroke or hatch.',
      expected: 'Four lines in blue, violet, teal and pink, all readable on white.',
      proposal: '`ink.series.byGeometry: { line: [...], band: [...] }` (or allow `ink.series` inside a variant guarded by `markChannel: position`).',
      ...paletteCountProbe(theme, t, { n: 4, palette: LINE.slice(0, 4), title: 'Norway leads electric-car sales' }),
      observed: 'Flint draws Germany in `#d3effe` — almost invisible on white — and the United States in pale teal-300; only Norway and China read. The deck also gains “; EV share (%)”. Expected: blue, violet, teal and pink, all at full strength.',
    },
    {
      id: 'card',
      title: 'Graphs live in a white rounded card with tabs and a pill drop-down',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'card-container',
      rule: 'Anatomy: 1 Title (bold, top-left, 1–2 words), 2 Tab set, 6 Controls (“tabs, quick filters or drop-downs … left aligned or right aligned”); the card is white with large rounded corners on a light-grey page.',
      current: 'Flint draws a chart, not a component: its title is chart text, and the theme has no container, no control slot and no corner radius for the canvas.',
      expected: 'A white 16px-radius card on `#f7f7f7`, bold title left, a “Last 24 years” pill right, chart below.',
      proposal: 'A `layout.container: { fill, radius, padding, elevation }` plus a host-rendered header slot (`chart_spec.controls`) that the compiler reserves room for.',
      ...cardProbe(theme, { ...t, titleSize: 18 }, { style: CARD, header: 'Unemployment', actions: false }),
      expectedFrame: { style: CARD, headerHtml: cardHeader('Unemployment', { pill: 'Last 24 years' }) },
      observed: 'Flint draws a bare chart: the title is chart text, the deck gains “; Unemployment (%)”, and the y axis runs 3–10% (the guide says start at 0). Expected: the chart sits in a white 16px-radius card on the grey page, title left and a pill drop-down right, axis from 0%.',
    },
    {
      id: 'hover-fade',
      title: 'Hover fades every other period to 30% and opens a tooltip above it',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'focus-hover-state',
      rule: '“This will open a tooltip above the selected time period and all other shapes on the graph fade to 30% opacity.” Tooltips sit above (never beside) the shapes, list every data set top segment first, and carry a soft drop shadow (`#00000026`).',
      current: 'ThemeSpec’s `interaction` block has only `tooltipFormat` and a selection boundary; there is no hover opacity for the rest of the chart, no tooltip placement or order, and no tooltip surface. Flint’s static chart shows neither.',
      expected: 'October at full strength, the other months at 30%, a white shadowed tooltip above October listing Best Offer, Auctions, Buy It Now.',
      proposal: '`interaction.hover: { others: { opacity: 0.3 }, scope: "category" }` and `interaction.tooltip: { placement: "above", order: "stackTopFirst", surface, radius, shadow }`.',
      flint: salesFlint('Total sales'),
      expectedSpec: stackedSpec({ stacks: STACKS, labels: MONTHS, focus: 9, tooltip: true }),
      expectedFrame: { headerHtml: `<div style="${ebayFont};font-size:18px;font-weight:700;color:${INK};margin:0 0 6px">Total sales</div>`, footerHtml: keyHtml() },
      observed: 'Flint’s panel is the static stack with nothing emphasised. Expected: October at full strength, every other month at 30%, and a white, softly shadowed tooltip above October listing the segments top first (Best Offer, Auctions, Buy It Now).',
    },
    {
      id: 'dark-mode',
      title: 'Evo publishes a dark token set for every data-viz role',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'dark-mode',
      rule: '`evo-dark.css` re-points every `--color-data-viz-*` token: chart secondary becomes blue-300, the hatched tertiary becomes blue-600 with a blue-400 stroke, labels neutral-500, legend neutral-300, tooltip shadow white at 15%.',
      current: 'A ThemeSpec is one set of inks; `ink.surface.source: "host"` can borrow the host background but not swap the series, grid and text inks with it. Flint keeps the light chart.',
      expected: 'The same chart on the dark card with the dark tokens.',
      proposal: '`ink.modes: { dark: Partial<ThemeInk> }`, selected by the host’s colour scheme.',
      flint: salesFlint('Total sales'),
      expectedSpec: stackedSpec({ stacks: STACKS, labels: MONTHS, ink: DARK_INK }),
      expectedFrame: {
        style: { ...CARD, background: '#191919', boxShadow: '0 0 0 16px #000000' },
        headerHtml: cardHeader('Total sales', { ink: '#f7f7f7', muted: '#8f8f8f', pillBorder: '#707070' }),
        footerHtml: keyHtml({ bottom: BLUE, middle: '#84b4fb', hatchFill: '#0049b8', hatchStroke: '#4d93fc', text: '#e5e5e5' }),
      },
      observed: 'Flint renders the light chart (white ground, navy/blue/pale stack) — the theme has no other mode. Expected: the dark card with Evo’s dark tokens — blue base, blue-300 middle, blue-600 hatch with a blue-400 stroke, grey labels. The published dark grid token (neutral-400, `#c7c7c7`) is brighter than the labels on black, which looks heavy; it is drawn as published.',
    },
    {
      id: 'bar-width-px',
      title: 'Bars are 12–24px wide with at least 8px between them',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'bar-shape',
      rule: '“Do maintain between 12px and 24px wide bars with a minimum of 8px padding between them”; on small screens show fewer bars rather than going denser.',
      current: 'ThemeSpec states bar width only as a fraction of the band (`geometry.band.fraction`), so the pixel width follows the category count: 12 months at 360px give ~16px bars, 31 days give ~6px. Nothing asks the layout to drop or aggregate periods instead.',
      expected: 'Bar width clamped to 12–24px; when the band would go below 20px the chart widens or shows fewer periods.',
      proposal: '`geometry.band.width: { min: 12, max: 24 }` and `geometry.band.minGap: 8`, with the layout treating a violated minimum as pressure (stretch, then thin the categories).',
    },
    {
      id: 'key-order',
      title: 'The key reads bottom-up; the tooltip top-down',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'legend-order',
      rule: '“The key under the graph should be in the opposite order since the key represents building the segments from the bottom up to the top”; the tooltip lists the top segment first.',
      current: 'ThemeSpec has no ordering rule for keys relative to the stack; Flint lists the key in domain order and leaves the tooltip to the renderer.',
      expected: 'Key: Buy It Now, Auctions, Best Offer (base first); tooltip: Best Offer, Auctions, Buy It Now.',
      proposal: '`legend.order: "stackBottomUp" | "stackTopDown" | "domain"`.',
      observed: 'In the signature and hatched panels Flint stacks the first key entry on top of each bar, so its key reads top-down — the reverse of what the guide asks.',
    },
    {
      id: 'labels-thinned-not-turned',
      addressed: { stage: 'A1', note: 'Never angled now: the twelve months sit flat, set at 9.5px (A1). Thinning to every other month at the stated size is not offered as a house option yet.' },
      title: 'Crowded axis labels are thinned or wrapped, never angled',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'label-angle-fallback',
      rule: '“Don’t place axis labels too closely together or angle the text”: keep at least 16px between labels; show every other label, or wrap to two lines.',
      current: 'The theme states `labels.`, but when a label plus Flint’s straight-label gap is wider than its band, grounding refuses the flat setting (`labels-straight-refused`) and turns the labels −45°. The only fallback it knows is rotation; ThemeSpec cannot ask for thinning instead.',
      expected: 'Twelve months with every other label printed flat under its bar.',
      proposal: '`labels.whenCrowded: "rotate" | "thin" | "wrap"` (eBay: thin, then wrap; never rotate).',
      flint: totalsFlint,
      expectedSpec: totalsSpec(),
      expectedFrame: { headerHtml: `<div style="${ebayFont};font-size:18px;font-weight:700;color:${INK};margin:0 0 6px">Total sales</div>` },
      observed: 'Flint turns all twelve month labels −45° under 360px of chart, despite `labels.`. Expected: Jan, Mar, May, Jul, Sep, Nov flat under their bars.',
    },
    {
      id: 'k-abbreviation',
      addressed: { stage: 'A6', note: '`compact: { threshold: 1000 }` — $0, $10k … $60k on the right (A6).' },
      title: 'Currency ticks abbreviate to $k',
      kind: 'realization',
      severity: 'medium',
      probe: 'number-format',
      rule: 'Currency symbol and k abbreviation on every tick — $0, $10k … $60k (anatomy callout 7); full figures with separators only in KPI cards ($2,683,141).',
      current: 'The theme states `annotation.numberFormat.thousands: "suffix"` and `unit: "everyTick"`. Flint reads the number format only for value labels; the axis takes the field’s currency semantics, so the ticks print $10,000 … $60,000.',
      expected: '$0, $20k, $40k, $60k on the right.',
      proposal: 'Let `annotation.numberFormat` govern measure-axis ticks too (or add `structure.axis.measure.format`), keeping the currency prefix from the semantics.',
      flint: totalsFlint,
      expectedSpec: totalsSpec(),
      expectedFrame: { headerHtml: `<div style="${ebayFont};font-size:18px;font-weight:700;color:${INK};margin:0 0 6px">Total sales</div>` },
      observed: 'Flint’s right-hand ticks read $0, $10,000 … $60,000 — seven wide labels that widen the gutter. Expected: $0, $20k, $40k, $60k.',
    },
  ],
};

export default ebay;
