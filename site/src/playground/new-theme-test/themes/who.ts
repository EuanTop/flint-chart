import type { ThemeSpec } from 'flint-chart';
import research from '../research/who.json';
import { EV_SHARE, flintInput } from '../probes';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Noto Sans', sans-serif";
const BRAND = '#008dc9';
const CATEGORY = ['#f4a81d', '#f26829', '#bd53bd', '#6363c0', '#008dc9', '#40bf73'];
/** category/text/0-5: the AAA text variant of each category colour. */
const CATEGORY_TEXT = ['#754d06', '#9a3709', '#8e2f8e', '#4b4baf', '#245993', '#1d6339'];
const WEAKER = '#595959';
const WEAKEST = '#cccccc';
const CONTEXT = '#d9dae2';
const SELECTION = '#1a1a1a';

const t: HouseTokens = {
  font: FONT,
  text: '#000000',
  muted: WEAKER,
  grid: WEAKEST,
  gridDash: [2, 2],
  axis: '#c4c4cc',
  background: '#ffffff',
  palette: CATEGORY,
  highlight: BRAND,
  context: CONTEXT,
  titleSize: 18,
  titleWeight: 'bold',
  subtitleSize: 16,
  subtitleColor: WEAKER,
  labelSize: 12,
  sourceSize: 12,
  lineWidth: 2,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'who',
  label: 'WHO Data Design Language',
  ink: {
    surface: { source: 'house', canvas: '#ffffff', panel: '#f7f7f7' },
    text: { primary: '#000000', secondary: WEAKER, muted: WEAKER, inverse: '#ffffff' },
    structure: { grid: WEAKEST, axis: WEAKER, zero: '#b2b2b2', rule: WEAKEST, frame: WEAKEST },
    series: {
      single: BRAND,
      categorical: CATEGORY,
      overflow: '#cccccc',
      sequential: { stops: ['#d7e6f3', '#75b6d6', '#0582bb', '#0f2d5b'], space: 'lab' },
      diverging: { stops: ['#ee8f00', '#ebc26f', '#d6dae5', '#6fbedf', '#1c4e94'], neutral: '#d6dae5', space: 'lab' },
    },
    accent: '#ffcb01',
  },
  type: {
    headline: { family: FONT, size: 18, weight: 'bold', case: 'asIs', color: '#000000' },
    deck: { family: FONT, size: 16, weight: 'regular', color: WEAKER },
    axisLabel: { family: FONT, size: 12, color: WEAKER },
    axisTitle: { family: FONT, size: 12, color: WEAKER },
    keyLabel: { family: FONT, size: 12, color: WEAKER },
    valueLabel: { family: FONT, size: 12, color: '#000000' },
    annotation: { family: FONT, size: 12, color: '#000000' },
    footnote: { family: FONT, size: 12, color: WEAKER },
  },
  structure: {
    axis: {
      categorical: { line: 'full', ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit', tickDensity: 'sparse' },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'dotted', dash: [2, 2], weight: 1, zero: 'emphasised' },
    frame: 'omit',
    baseline: 'emphasised',
  },
  marks: { bandFraction: 0.67, strokeWeight: 2, cornerRadius: 0 },
  geometry: { line: { width: 2 }, point: { presence: 'full', vertexSize: 20, fill: 'solid' } },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['seriesEnd', 'bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'center' },
  dataLabels: { show: 'whenTheyFit', placement: 'outsideMark', inkMode: 'matchSeries' },
  annotation: {
    axisTitles: 'omit',
    unit: 'everyTick',
    numberFormat: { thousands: 'suffix', precision: 'auto', compact: { style: 'editorial' } },
    pointEmphasis: 'endpoints',
    pointLabels: 'endpoints',
  },
  layout: { titleBlock: { anchor: 'start', gap: 'normal', deckGap: 'tight' } },
  furniture: [{ kind: 'headerRule', color: WEAKEST, height: 1 }],
  interaction: { selectionBoundary: { color: SELECTION, width: 2, opacity: 1 } },
  variants: [
    {
      when: { isTemporal: true, hasBandedAxis: false },
      then: { structure: { grid: { category: 'quiet' } } },
      because: 'Line charts over years rule a dotted vertical line at every year tick as well.',
    },
  ],
};

const card = { border: `1px solid ${WEAKEST}`, borderRadius: '6px', background: '#ffffff', padding: '0', overflow: 'hidden' };

/** The container header: bold title, weaker subtitle, then a full-width divider. */
const cardHeader = (title: string, subtitle: string) =>
  `<div style="padding:14px 18px 10px;font-family:${FONT}">`
  + `<div style="font-size:${t.titleSize}px;font-weight:700;color:#000;line-height:1.25">${title}</div>`
  + `<div style="font-size:${t.subtitleSize}px;color:${WEAKER};margin-top:2px">${subtitle}</div></div>`
  + `<div style="border-top:1px solid ${WEAKEST}"></div>`;

/** The container footer: a divider, then a centred legend of line and box swatches. */
const cardFooter = (items: { label: string; swatch: string }[]) =>
  `<div style="border-top:1px solid ${WEAKEST};padding:12px 18px;display:flex;justify-content:center;gap:22px;font-family:${FONT};font-size:12px;color:${WEAKER}">`
  + items.map((item) => `<span style="display:inline-flex;align-items:center;gap:6px">${item.swatch}${item.label}</span>`).join('')
  + '</div>';

const lineSwatch = (color: string, dash = false) => `<span style="display:inline-block;width:18px;border-top:2.5px ${dash ? 'dotted' : 'solid'} ${color}"></span>`;
const boxSwatch = (fill: string, stroke: string) => `<span style="display:inline-block;width:18px;height:12px;background:${fill};border-top:1px solid ${stroke};border-bottom:1px solid ${stroke}"></span>`;

/** A chart that sits inside the card: no title of its own, house axes, no outer padding beyond the card's. */
function cardChart(view: Record<string, unknown>, o: { width?: number; height?: number } = {}) {
  const config = houseConfig(t);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...config,
      padding: { left: 16, right: 18, top: 16, bottom: 12 },
      axis: { ...(config.axis as object), labelColor: WEAKER, labelFontSize: 12, gridDash: [2, 2] },
    },
    width: o.width ?? W,
    height: o.height ?? H,
    ...view,
  };
}

/** Year ticks the WHO way: first, last and selected years in full, the others as ’20. */
const yearLabel = (keep: number[]) =>
  `indexof([${keep.join(',')}], datum.value) >= 0 ? format(datum.value, 'd') : '’' + slice(format(datum.value, 'd'), 2)`;

/** People with health-emergency protection, worldwide, estimated 2019, projected to 2025 (read off the guide’s specimen). */
const PROTECTION = [[2019, 0.33], [2020, 0.49], [2021, 0.65], [2022, 0.79], [2023, 0.92], [2024, 1.11], [2025, 1.3]]
  .map(([Year, bn]) => ({ Year, People: Math.round(bn * 1e9) }));

function signatureExpected() {
  const sel = PROTECTION.find((row) => row.Year === 2023)!;
  const purple = CATEGORY[3];
  return cardChart({
    layer: [
      {
        data: { values: [{ from: 2022.65, to: 2023.35 }] },
        mark: { type: 'rect', color: '#eceef1' },
        encoding: { x: { field: 'from', type: 'quantitative', scale: { domain: [2019, 2025], nice: false, zero: false } }, x2: { field: 'to' } },
      },
      {
        data: { values: PROTECTION },
        mark: { type: 'line', strokeWidth: 2, strokeDash: [3, 3], color: purple, point: { filled: true, size: 28, color: purple } },
        encoding: {
          x: {
            field: 'Year', type: 'quantitative', scale: { domain: [2019, 2025], nice: false }, title: null,
            axis: {
              values: [2019, 2020, 2022, 2023, 2024, 2025], grid: true, gridDash: [2, 2], gridColor: WEAKEST, domain: true, domainColor: '#c4c4cc', domainWidth: 1.5,
              labelExpr: yearLabel([2019, 2023, 2025]),
              labelFontWeight: { condition: { test: 'datum.value === 2023', value: 'bold' }, value: 'normal' },
              labelColor: { condition: { test: 'datum.value === 2023', value: '#000000' }, value: WEAKER },
            },
          },
          y: {
            field: 'People', type: 'quantitative', scale: { domain: [0, 1.5e9] }, title: null,
            axis: { values: [0, 0.5e9, 1e9, 1.5e9], labelExpr: "datum.value === 0 ? '0' : format(datum.value / 1e9, '.1f') + 'bn'" },
          },
        },
      },
      {
        data: { values: [sel] },
        mark: { type: 'rule', strokeDash: [1, 2], color: '#000000', strokeWidth: 1 },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'People', type: 'quantitative' }, y2: { datum: 0 } },
      },
      {
        data: { values: [{ v: 1e9 }] },
        mark: { type: 'rule', color: SELECTION, strokeWidth: 1.5 },
        encoding: { y: { field: 'v', type: 'quantitative' } },
      },
      {
        data: { values: [{ v: 1e9, x: 2019 }] },
        mark: { type: 'text', align: 'left', baseline: 'bottom', dx: 3, dy: -3, fontSize: 12, font: FONT, color: '#000000', text: 'Target (1.0bn)' },
        encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'v', type: 'quantitative' } },
      },
      {
        data: { values: [sel] },
        mark: { type: 'text', align: 'left', dx: 6, dy: 6, fontSize: 12, font: FONT, fontStyle: 'italic', color: CATEGORY_TEXT[3], text: '0.9bn' },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'People', type: 'quantitative' } },
      },
    ],
  });
}

/** Estimate of current tobacco use prevalence, Austria (%), with bounds; 2020 and 2025 are projections. */
const TOBACCO = [
  { Year: '2000', Prevalence: 49.7, low: 37.2, high: 62.6, Status: 'Estimated' },
  { Year: '2005', Prevalence: 41.0, low: 32.5, high: 49.6, Status: 'Estimated' },
  { Year: '2010', Prevalence: 34.3, low: 27.9, high: 41.1, Status: 'Estimated' },
  { Year: '2015', Prevalence: 28.4, low: 23.9, high: 33.4, Status: 'Estimated' },
  { Year: '2020', Prevalence: 24.0, low: 18.5, high: 29.5, Status: 'Projected' },
  { Year: '2025', Prevalence: 19.6, low: 14.5, high: 24.6, Status: 'Projected' },
];
const TOBACCO_TITLE = 'Estimate of current tobacco use prevalence (%)';
const TOBACCO_SUB = 'Austria, selected years 2000-2025';

const tobaccoFlint = (encodings: Record<string, unknown>, title = TOBACCO_TITLE) => flintInput(theme, {
  chartType: 'Bar Chart',
  data: TOBACCO.map(({ Year, Prevalence, Status }) => ({ Year, Prevalence, Status })),
  semantic_types: { Year: 'Year', Prevalence: { semanticType: 'Percentage', unit: '%' }, Status: 'Category' },
  encodings,
  title,
  subtitle: TOBACCO_SUB,
});

/** Hard-stopped diagonal stripes: the hatch WHO uses for projected filled marks. */
function hatch(color: string, stripes = 9) {
  const stops: { offset: number; color: string }[] = [];
  for (let i = 0; i < stripes; i += 1) {
    const a = i / stripes;
    const b = (i + 0.5) / stripes;
    stops.push({ offset: a, color }, { offset: b, color }, { offset: b, color: '#ffffff' }, { offset: (i + 1) / stripes, color: '#ffffff' });
  }
  return { gradient: 'linear', x1: 0, y1: 0, x2: 1, y2: 0.25, stops };
}

const columnsBase = {
  x: { field: 'Year', type: 'ordinal', title: null, axis: { labelAngle: 0, domain: true, domainColor: '#c4c4cc', domainWidth: 1.5, zindex: 1 }, scale: { paddingInner: 0.33, paddingOuter: 0.3 } },
  y: { field: 'Prevalence', type: 'quantitative', title: null, scale: { domain: [0, 60] }, axis: { values: [0, 20, 40, 60], labelExpr: "datum.value === 0 ? '0' : datum.label + '%'" } },
};

function projectedExpected() {
  return cardChart({
    data: { values: TOBACCO },
    encoding: columnsBase,
    layer: [
      { transform: [{ filter: "datum.Status === 'Estimated'" }], mark: { type: 'bar', color: BRAND } },
      { transform: [{ filter: "datum.Status === 'Projected'" }], mark: { type: 'bar', fill: hatch(BRAND), stroke: BRAND, strokeWidth: 1.5 } },
      {
        mark: { type: 'text', baseline: 'bottom', dy: -4, fontSize: 12, font: FONT, color: CATEGORY_TEXT[4] },
        transform: [{ calculate: "format(datum.Prevalence, '.1f') + '%'", as: 'label' }],
        encoding: {
          text: { field: 'label' },
          fontStyle: { condition: { test: "datum.Status === 'Projected'", value: 'italic' }, value: 'normal' },
        },
      },
    ],
  });
}

function focusExpected() {
  const selected = ['2010', '2015', '2025'];
  const blues: Record<string, string> = { 2010: '#0a84bb', 2015: '#4499c8', 2025: '#75b6d6' };
  return cardChart({
    data: { values: TOBACCO },
    encoding: {
      ...columnsBase,
      x: {
        ...columnsBase.x,
        axis: {
          ...columnsBase.x.axis,
          labelExpr: `indexof(${JSON.stringify(selected)}, datum.value) >= 0 ? datum.label : ''`,
          labelFontWeight: { condition: { test: "datum.value !== '2015'", value: 'bold' }, value: 'normal' },
          labelColor: '#000000',
        },
      },
      y: { ...columnsBase.y, axis: null },
    },
    layer: [
      {
        mark: { type: 'bar' },
        encoding: {
          color: { condition: { test: `indexof(${JSON.stringify(selected)}, datum.Year) >= 0`, field: 'Year', type: 'nominal', scale: { domain: Object.keys(blues), range: Object.values(blues) }, legend: null }, value: CONTEXT },
          stroke: { condition: { test: `indexof(${JSON.stringify(selected)}, datum.Year) >= 0`, value: SELECTION }, value: null },
          strokeWidth: { value: 2 },
        },
      },
      {
        transform: [{ filter: `indexof(${JSON.stringify(selected)}, datum.Year) >= 0` }, { calculate: "format(datum.Prevalence, '.1f') + '%'", as: 'label' }],
        mark: { type: 'text', baseline: 'bottom', dy: -6, fontSize: 12, font: FONT, color: '#000000' },
        encoding: {
          text: { field: 'label' },
          fontWeight: { condition: { test: "datum.Year !== '2015'", value: 'bold' }, value: 'normal' },
        },
      },
    ],
  });
}

function uncertaintyExpected() {
  return cardChart({
    data: { values: TOBACCO },
    encoding: { ...columnsBase, y: { ...columnsBase.y, scale: { domain: [0, 65] } } },
    layer: [
      { mark: { type: 'bar', color: '#cfe8f4' }, encoding: { y: { field: 'low', type: 'quantitative' }, y2: { field: 'high' } } },
      ...(['low', 'high'] as const).map((field) => ({
        mark: { type: 'tick', color: BRAND, thickness: 1, bandSize: 0 },
        encoding: {
          y: { field, type: 'quantitative' },
          strokeDash: { condition: { test: "datum.Status === 'Projected'", value: [1.5, 1.5] }, value: [] },
        },
      })),
      {
        mark: { type: 'tick', color: BRAND, thickness: 2.5 },
        encoding: { strokeDash: { condition: { test: "datum.Status === 'Projected'", value: [3, 2] }, value: [] } },
      },
      ...(['low', 'Prevalence', 'high'] as const).map((field) => ({
        transform: [{ filter: "datum.Year === '2025'" }, { calculate: `format(datum['${field}'], '.1f') + '%'`, as: 'label' }],
        mark: { type: 'text', baseline: field === 'low' ? 'top' : 'bottom', dy: field === 'low' ? 4 : -3, fontSize: 12, font: FONT, fontStyle: 'italic', color: CATEGORY_TEXT[4] },
        encoding: { y: { field, type: 'quantitative' }, text: { field: 'label' } },
      })),
    ],
  }, { height: 200 });
}

const EV_NAMES = ['Norway', 'China', 'Germany', 'United States'];

function evExpected() {
  const last = EV_SHARE.filter((row) => row.Year === 2023);
  const color = (range: string[]) => ({ field: 'Country', type: 'nominal', scale: { domain: EV_NAMES, range }, legend: null });
  return cardChart({
    layer: [
      {
        data: { values: EV_SHARE },
        mark: { type: 'line', strokeWidth: 2, point: { filled: true, size: 20 } },
        encoding: {
          x: { field: 'Year', type: 'quantitative', scale: { domain: [2018, 2023] }, title: null, axis: { values: [2018, 2020, 2022, 2023], labelExpr: yearLabel([2018, 2023]), grid: true, domain: true, domainColor: '#c4c4cc', domainWidth: 1.5 } },
          y: { field: 'EV share (%)', type: 'quantitative', title: null, axis: { values: [0, 50, 100], labelExpr: "datum.value === 0 ? '0' : datum.label + '%'" } },
          color: color(CATEGORY.slice(0, 4)),
        },
      },
      {
        data: { values: last },
        mark: { type: 'text', align: 'left', dx: 7, fontSize: 12, font: FONT },
        encoding: {
          x: { field: 'Year', type: 'quantitative' },
          y: { field: 'EV share (%)', type: 'quantitative' },
          text: { field: 'Country' },
          color: color(CATEGORY_TEXT.slice(0, 4)),
        },
      },
    ],
    resolve: { scale: { color: 'independent' } },
  }, { width: 300 });
}

const who: StyleGuideTheme = {
  id: 'who',
  org: 'World Health Organization (GHO / WHO Data Design Language)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch. Stated directly: Noto Sans throughout; only two text levels (`#000000` base, `#595959` weaker); WHO brand blue `#008dc9` as the single-series ink and the six equally salient category colours in their published order, with `#cccccc` for “other”; the brand sequential ramp and the orange–blue diverging ramp centred on `#d6dae5`; the author accent `#ffcb01`; dotted `#cccccc` gridlines with an emphasised solid zero line; no y-axis line or ticks; 3–6 ticks (`tickDensity: sparse`); no axis titles, units on every tick; a centred key at the bottom when the series cannot be labelled where they end; and the header divider as a `headerRule`.',
    'Approximated: the DDL has three fixed type scales chosen by container width; at the 360px canvas used here the **small** set applies (18px bold title, 16px weaker subtitle, 12px ticks), and that is what the theme states. Vertical dotted gridlines at year ticks are a `variants` entry on `isTemporal`. The `#1a1a1a` selection outline went into `interaction.selectionBoundary`.',
    'Not stated (see gaps): the card container itself (border, header and footer bands, the `#f7f7f7` page behind), hatching and italic labels for projected values, the grey-out of non-selected items with bold labels on the selected ones, the AAA text colour paired with each category, the abbreviated year ticks, the responsive type scale, and the dark theme.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'high',
      probe: 'signature',
      rule: 'Typography specimen: a white card with a thin grey rounded border; bold black title and weaker grey subtitle (“Worldwide, estimated 2019, projected to 2025”) above a full-width divider; dotted grey gridlines both ways; 0/0.5bn/1.0bn/1.5bn ticks; years shortened to ’20, ’22 between full first, selected and last years; a dashed (projected) line with small dots; the selected year in bold under a grey focus band, its value in italic in the category’s text colour; a solid black target line labelled “Target (1.0bn)”.',
      current: 'Flint draws the title block, the divider (as a header rule) and dotted gridlines from the theme. Nothing marks the series as projected, there is no target or focus, and no card.',
      expected: 'The guide’s specimen, redrawn inside its card.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: PROTECTION,
        semantic_types: { Year: 'Year', People: 'Quantity' },
        encodings: { x: 'Year', y: 'People' },
        title: 'Health emergencies protection',
        subtitle: 'Worldwide, estimated 2019, projected to 2025',
      }),
      expectedSpec: signatureExpected(),
      expectedFrame: { style: card, headerHtml: cardHeader('Health emergencies protection', 'Worldwide, estimated 2019, projected to 2025') },
      observed: 'Flint draws the title block, a grey rule under it, dotted gridlines both ways (the `isTemporal` variant) and a dot at every year. The rest is missing: no card; the rule spans the plot, not the card; the y axis prints 1,500,000,000 instead of 1.5bn; every year is in full; the deck gains “; People” from `axisTitles: omit`; the line is solid; and there is no target line, focus band or italic projected label — none of which the theme or chart spec can ask for.',
    },
    {
      id: 'card-container',
      title: 'Every chart sits in a card with header and footer bands',
      kind: 'product-ui',
      severity: 'high',
      probe: 'card-container',
      rule: 'Chart container: thin light-grey rounded border on white, on a `#f7f7f7` page; the header (title + subtitle) is separated from the plot by a full-width rule; an optional footer band, under another rule, holds the centred key (line swatches, solid for mean and dotted for projected, a box for bounds).',
      current: 'ThemeSpec has `ink.surface.panel` and a `headerRule`, but no container: Flint draws the rule only under the title block, at plot width, and the key floats under the plot with no band of its own. Nothing draws the border or the footer band.',
      expected: 'The uncertainty specimen in its card: header band, divider, plot, divider, centred key.',
      proposal: '`layout.container: { border, radius, padding, header: { rule }, footer: { rule, holds: ["legend", "source"] } }` — a design-system container the compiler lays out, rather than furniture drawn inside the plot.',
      flint: tobaccoFlint({ x: 'Year', y: 'Prevalence', color: 'Status' }),
      expectedSpec: uncertaintyExpected(),
      expectedFrame: {
        style: card,
        headerHtml: cardHeader(TOBACCO_TITLE, TOBACCO_SUB),
        footerHtml: cardFooter([
          { label: 'mean value', swatch: lineSwatch(BRAND) },
          { label: 'projected', swatch: lineSwatch(BRAND, true) },
          { label: 'higher and lower bound', swatch: boxSwatch('#d6ecf6', BRAND) },
        ]),
      },
      observed: 'Flint: no border, no header band — just a short grey rule under the deck — and the key sits loose under the plot. Colouring by Status turns the columns yellow and orange (the first two category inks), not WHO blue. Expected: the card, a full-width divider under the header, bounds boxes with dotted projected edges, and a footer band with a centred key of line and box swatches.',
    },
    {
      id: 'projected-hatch',
      title: 'Projected values are hatched, dotted, and labelled in italics',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'forecast-style',
      rule: '“Projected values are indicated through hatching for filled areas and dashed lines … Data labels for projected values are shown in italics.”',
      current: 'ThemeSpec has no notion of a value’s status. The only way to tell projected rows apart is to colour by a `Status` field, which Flint treats as two ordinary series: a second category colour and a key.',
      expected: 'One colour; estimated columns solid, projected columns hatched in the same blue, their labels italic.',
      proposal: 'A row-status semantic (`semantic_types: { Status: { semanticType: "ValueStatus" } }` or `chart_spec.status`) plus `marks.status: { projected: { fill: "hatch", line: "dotted", label: "italic" }, estimated: … }` in the theme.',
      flint: tobaccoFlint({ x: 'Year', y: 'Prevalence', color: 'Status' }),
      expectedSpec: projectedExpected(),
      expectedFrame: { style: card, headerHtml: cardHeader(TOBACCO_TITLE, TOBACCO_SUB) },
      observed: 'Flint can only show the projection as a second series: 2000–2015 yellow, 2020–2025 orange, with a key — it reads as two categories, not one measure in two states. Expected: one blue, the two projected columns hatched with an outline, their labels italic.',
    },
    {
      id: 'focus-grey-out',
      title: 'Selected items keep colour, bold labels and an outline; the rest go grey',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'highlight',
      rule: '“Explicit, inline value annotation is supplied in all charts and is tied to the selection state of entities.” When items are selected, non-selected ones turn a uniform low-contrast colour; selected ones get a `#1a1a1a` outline, a bold value label and a bold axis label.',
      current: 'The chart spec has no selection or emphasis; ThemeSpec can colour a selection boundary but not the grey-out, the bold label or the label-only-the-selected rule. Every column is brand blue and unlabelled.',
      expected: 'Columns 2010, 2015 and 2025 in blues with black outlines and labels above (bold where selected, regular where hovered); the other columns `#d9dae2`; only the selected years named on the axis.',
      proposal: '`chart_spec.emphasis: { field, values }` (or an interaction state) with `ink.series.context`, `marks.emphasis: { outline, labelWeight: "bold" }` and `dataLabels.show: "emphasisOnly"` in the theme.',
      flint: tobaccoFlint({ x: 'Year', y: 'Prevalence' }),
      expectedSpec: focusExpected(),
      expectedFrame: { style: card, headerHtml: cardHeader(TOBACCO_TITLE, TOBACCO_SUB) },
      observed: 'Flint draws six identical blue columns with no labels; the y ticks are about 8px against the 12px the theme states (the compiled spec scales `axisLabel.size` down on this six-column chart). Expected: three selected columns in blues with black outlines and value labels (bold for selected, regular for the hovered 2015), the others pale grey-lavender, only the selected years named.',
    },
    {
      id: 'series-text-ink',
      title: 'Each category colour has its own AAA text colour',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'series-text-ink',
      rule: '“For each category color in use, a dedicated text color in the same color tone and AAA background contrast is available”: `#754d06` for yellow `#f4a81d`, `#9a3709` for orange, `#8e2f8e` for magenta, `#4b4baf` for purple …',
      current: 'ThemeSpec has one ink per series; Flint writes series-end labels in the fill colour, so the first category (yellow `#f4a81d`) is set in yellow on white.',
      expected: 'Lines in the category colours, their labels in the matching text colours.',
      proposal: '`ink.series.categoricalText` parallel to `categorical`, read wherever a label takes a series’ colour.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Electric-car share of new sales (%)',
        subtitle: 'Selected countries, 2018-2023',
      }),
      expectedSpec: evExpected(),
      expectedFrame: { style: card, headerHtml: cardHeader('Electric-car share of new sales (%)', 'Selected countries, 2018-2023') },
      observed: 'Flint labels each line at its end in the fill colour: “Norway” yellow on white is the hardest to read, the first category in the house order. The expected labels use the paired text colours (`#754d06`, `#9a3709`, `#8e2f8e`, `#4b4baf`) and stay legible. Expected also abbreviates ’20 and ’22.',
    },
    {
      id: 'year-abbreviation',
      title: 'Intermediate years shortened to ’20, selected year in bold',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'date-label-format',
      rule: 'Year ticks: first, last and selected years in full, the others abbreviated with an apostrophe (’20, ’22); the selected year’s tick is bold.',
      current: 'No ThemeSpec field governs temporal tick text or a selected tick’s weight; Flint prints every year in full.',
      expected: 'As in the signature panel: 2019, ’20, ’22, **2023**, ’24, 2025.',
      proposal: '`annotation.dateLabels: { abbreviateRepeated: "apostrophe" }`; a selected-tick weight under the emphasis proposal.',
    },
    {
      id: 'number-suffix',
      addressed: { stage: 'A6', note: '`compact: { style: "editorial" }` — 0, 0.5bn, 1.0bn, 1.5bn (A6).' },
      title: 'Large numbers as 1.5bn and 425k, thousands with a thin space',
      kind: 'realization',
      severity: 'medium',
      probe: 'number-format',
      rule: 'Numbers are localised and carry only warranted significant figures: “425k”, “1.5bn”, “67 000” (space as the thousands separator in English).',
      current: 'The theme states `annotation.numberFormat.thousands: "suffix"`, which should at least abbreviate; even when it does, d3’s SI suffixes (k, M, G) are not the house words (k, bn), and no field names the thin-space separator.',
      expected: '0, 0.5bn, 1.0bn, 1.5bn on the y axis.',
      proposal: '`annotation.numberFormat.suffixes: { 1e3: "k", 1e6: "m", 1e9: "bn" }` and `separator: "thin-space"` (or a locale id).',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: PROTECTION,
        semantic_types: { Year: 'Year', People: 'Quantity' },
        encodings: { x: 'Year', y: 'People' },
        title: 'People protected from health emergencies',
        subtitle: 'Worldwide, 2019-2025',
      }),
      expectedSpec: cardChart({
        data: { values: PROTECTION },
        mark: { type: 'line', strokeWidth: 2, color: BRAND, point: { filled: true, size: 20, color: BRAND } },
        encoding: {
          x: { field: 'Year', type: 'quantitative', scale: { domain: [2019, 2025], nice: false }, title: null, axis: { values: [2019, 2021, 2023, 2025], format: 'd', domain: true, domainColor: '#c4c4cc', domainWidth: 1.5 } },
          y: { field: 'People', type: 'quantitative', scale: { domain: [0, 1.5e9] }, title: null, axis: { values: [0, 0.5e9, 1e9, 1.5e9], labelExpr: "datum.value === 0 ? '0' : format(datum.value / 1e9, '.1f') + 'bn'" } },
        },
      }),
      expectedFrame: { style: card, headerHtml: cardHeader('People protected from health emergencies', 'Worldwide, 2019-2025') },
      observed: 'The axis prints 0 / 500,000,000 / 1,000,000,000 / 1,500,000,000: `numberFormat.thousands: "suffix"` reaches value labels only (compiled as d3 `.3~s`, which writes 1.30G, not 1.3bn), never the axis, whose format comes from the field semantics (`,.12~g`).',
    },
    {
      id: 'type-scale-by-size',
      title: 'A fixed type scale per container size',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'type-weight-scale',
      rule: 'Three size sets by container width — large 54/22/20/18/16/14px, medium 38/22/20/18/16/14, small 28/20/18/16/14/12 — and every role is a step on the set (title = xl, subtitle = l, ticks = s).',
      current: '`type` roles are fixed px, and `variants` may not change `ink` or `type`, so a house cannot say “at small widths the title is 18px, at large 20px”. This theme states the small set only — and Flint then rescales it on its own: on the six-column tobacco charts the compiled spec sets the 12px tick labels to 8px and the 18px headline to 15.5px.',
      expected: 'Title 20px / subtitle 18px / ticks 14px in a large container, 18/16/12 in a small one.',
      proposal: 'Allow `type` in `variants` guarded by `canvasWidth`, or let `TypeRole.size` name a step (`"xl"`) resolved against `type.scale: { small: [...], large: [...] }`.',
    },
    {
      id: 'dark-theme',
      title: 'A full dark theme from the same tokens',
      kind: 'product-ui',
      severity: 'low',
      probe: 'dark-mode',
      rule: 'Every token (background, text, category colours, gridlines, selection) has a dark-theme value; hero charts sit on dark navy.',
      current: 'A ThemeSpec holds one ink set; a dark version is a second, hand-maintained theme with nothing tying the two together.',
      expected: 'One house, two appearances.',
      proposal: '`ink.dark: { … }` overrides selected by the host’s colour scheme.',
    },
  ],
};

export default who;
