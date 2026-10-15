import type { ThemeSpec } from 'flint-chart';
import research from '../research/finastra.json';
import { BROWSERS, flintInput, POPULATION } from '../probes';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = 'Roboto, sans-serif';
const VIOLET = '#694ED6';
const FUCHSIA = '#F04E98';
const CATEGORICAL = [VIOLET, FUCHSIA, '#ED8B00', '#FFD100', '#7FCDDE', '#E5E5E5'];
const LABEL_INK = ['#FFFFFF', '#000000', '#000000', '#000000', '#000000', '#000000'];
const NEUTRAL = '#E5E5E5';
const SEQ_VIOLET = ['#2A285C', '#3A327B', '#4A3B99', '#5945B8', VIOLET, '#8A72E0', '#AB96EB', '#CCB9F5', '#EDDDFF'];
const MEDIUM = 'rgba(0,0,0,0.54)';

const t: HouseTokens = {
  font: FONT,
  text: '#000000',
  muted: MEDIUM,
  grid: 'rgba(0,0,0,0.12)',
  axis: 'rgba(0,0,0,0.12)',
  background: '#FFFFFF',
  palette: CATEGORICAL,
  highlight: VIOLET,
  context: NEUTRAL,
  titleSize: 16,
  titleWeight: 500,
  subtitleSize: 14,
  labelSize: 12,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'finastra',
  label: 'Finastra FDS',
  ink: {
    surface: { source: 'host', canvas: '#FFFFFF' },
    text: { primary: '#000000', secondary: MEDIUM, muted: MEDIUM, inverse: '#FFFFFF' },
    structure: { grid: 'rgba(0,0,0,0.12)', axis: 'rgba(0,0,0,0.12)' },
    series: {
      single: VIOLET,
      categorical: CATEGORICAL,
      // The palette's closing grey belongs to the remainder (R8).
      roles: { other: NEUTRAL },
      categoricalExtended: [VIOLET, '#C137A2', '#E40046', '#56C271', '#FF8A3D', '#D2D755', '#F0B323', '#5BC1D7'],
      overflow: NEUTRAL,
      sequential: { stops: [...SEQ_VIOLET].reverse(), space: 'lab' },
      status: { positive: '#008744', negative: '#D60040', neutral: '#FF600A' },
      selection: { partToWhole: 'categorical', signed: 'status' },
    },
    accent: VIOLET,
  },
  type: {
    headline: { family: FONT, size: 16, weight: 'medium', color: '#000000' },
    deck: { family: FONT, size: 14, color: MEDIUM },
    axisLabel: { family: FONT, size: 12, color: MEDIUM },
    axisTitle: { family: FONT, size: 12, color: MEDIUM },
    keyLabel: { family: FONT, size: 12, weight: 'light', color: '#000000' },
    valueLabel: { family: FONT, size: 12, weight: 'light' },
    footnote: { family: FONT, size: 12, color: MEDIUM },
  },
  structure: {
    axis: {
      categorical: { line: 'hairline', ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit' },
    },
    grid: { measure: 'hairline', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'hairline',
  },
  marks: {
    bandFraction: 0.9,
    separator: { presence: 'full', width: 2, source: 'surface' },
    slice: { gap: 2, gapStyle: 'rule' },
  },
  geometry: { band: { fraction: 0.9 }, arc: { gap: 2, gapStyle: 'rule', order: 'data' } },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'center' },
  dataLabels: { show: 'always', placement: 'atMark', inkMode: 'contrastWithMark' },
  layout: { titleBlock: { anchor: 'start' } },
};

// ---------------------------------------------------------------------------
// ApexCharts donut, the FDS web component's first-class chart.
// ---------------------------------------------------------------------------

const PAYMENTS = [['Card', 38], ['Wire', 22], ['ACH', 18], ['Mobile', 12], ['Cheque', 6], ['Other', 4]].map(([Channel, Share]) => ({ Channel: Channel as string, Share: Share as number }));

interface DonutInk { palette: string[]; labels: string[]; surface: string; text: string }
const LIGHT: DonutInk = { palette: CATEGORICAL, labels: LABEL_INK, surface: '#FFFFFF', text: '#000000' };
const DARK: DonutInk = { palette: ['#917EE0', '#E453BF', '#ED8B00', '#FFD100', '#7FCDDE', '#5C5C5C'], labels: ['#000000', '#000000', '#000000', '#000000', '#000000', '#FFFFFF'], surface: '#242424', text: '#FFFFFF' };

/** Apex donut: 65% hole, white-stroked segments, % labels in 12px Roboto Light in each slot’s label ink, legend centred below. */
function donut(rows: { name: string; value: number }[], ink: DonutInk, o: { title?: string; colors?: string[]; labelInk?: string[] } = {}): Record<string, unknown> {
  const names = rows.map((r) => r.name);
  const colors = o.colors ?? ink.palette.slice(0, rows.length);
  const labels = o.labelInk ?? ink.labels.slice(0, rows.length);
  const total = rows.reduce((a, r) => a + r.value, 0);
  const values = rows.map((r, i) => ({ ...r, ink: labels[i], pct: `${((r.value / total) * 100).toFixed(1)}%` }));
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: {
      ...houseConfig({ ...t, background: ink.surface, text: ink.text }),
      legend: { ...(houseConfig(t).legend as object), orient: 'bottom', direction: 'horizontal', symbolType: 'circle', symbolSize: 110, labelFontSize: 12, labelFontWeight: 300, labelColor: ink.text, columnPadding: 8, symbolOffset: 0, labelOffset: 4 },
    },
    ...(o.title ? { title: { text: o.title, color: ink.text } } : {}),
    width: W,
    height: H,
    data: { values },
    encoding: {
      theta: { field: 'value', type: 'quantitative', stack: true },
      order: { field: 'value', type: 'quantitative', sort: 'descending' },
    },
    layer: [
      {
        mark: { type: 'arc', outerRadius: 96, innerRadius: 96 * 0.65, stroke: ink.surface, strokeWidth: 2 },
        encoding: { color: { field: 'name', type: 'nominal', sort: names, scale: { domain: names, range: colors }, legend: { title: null } } },
      },
      {
        mark: { type: 'text', radius: 96 * 0.825, fontSize: 12, fontWeight: 300, font: FONT },
        encoding: {
          text: { field: 'pct' },
          color: { field: 'ink', type: 'nominal', scale: null },
        },
      },
    ],
  };
}

const donutFlint = (rows: Record<string, unknown>[], field: string, title: string) => flintInput(theme, {
  chartType: 'Donut Chart',
  data: rows,
  semantic_types: { [field]: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
  encodings: { size: 'Share', color: field },
  title,
});

/** A bar filled with a linear gradient between two inks. */
const gradient = (from: string, to: string) => ({ gradient: 'linear', x1: 0, x2: 1, y1: 0, y2: 0, stops: [{ offset: 0, color: from }, { offset: 1, color: to }] });

function focusBars(): Record<string, unknown> {
  const focus = 'Nigeria';
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    title: { text: 'Nigeria is the most populous country in Africa', subtitle: 'Population, millions, 2023' },
    width: W,
    height: H,
    data: { values: POPULATION },
    encoding: {
      y: { field: 'Country', type: 'nominal', sort: POPULATION.map((r) => r.Country), title: null },
      x: { field: 'Population', type: 'quantitative', title: null, scale: { domain: [0, 1500], nice: false }, axis: { values: [0, 500, 1000, 1500] } },
    },
    layer: [
      { transform: [{ filter: `datum.Country !== '${focus}'` }], mark: { type: 'bar', color: NEUTRAL } },
      { transform: [{ filter: `datum.Country === '${focus}'` }], mark: { type: 'bar', color: gradient('#1379C4', VIOLET) } },
      {
        mark: { type: 'text', align: 'right', dx: -6, fontSize: 12, fontWeight: 300, font: FONT },
        encoding: {
          text: { field: 'Population', type: 'quantitative', format: ',.0f' },
          color: { condition: { test: `datum.Country === '${focus}'`, value: '#FFFFFF' }, value: '#000000' },
        },
      },
    ],
  };
}

const SETTLEMENT = [['Same day', 46], ['Next day', 31], ['2–3 days', 15], ['4+ days', 8]].map(([name, value]) => ({ name: name as string, value: value as number }));

/** ApexCharts monochrome: one status ink shaded toward light, intensity 0.65. */
function monochrome(base: string, n: number): string[] {
  const hex = base.replace('#', '');
  const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return Array.from({ length: n }, (_, i) => {
    const k = (i / Math.max(1, n - 1)) * 0.65;
    return `#${rgb.map((c) => Math.round(c + (255 - c) * k).toString(16).padStart(2, '0')).join('')}`;
  });
}
const GREEN_TINTS = monochrome('#008744', SETTLEMENT.length);

const finastra: StyleGuideTheme = {
  id: 'finastra',
  org: 'Finastra (FusionFabric.cloud / Finastra Design System, FDS)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'The guide itself is gone (design.fusionfabric.cloud no longer resolves and has no archive), so this house is built from the code that implemented it: the `@finastra/charts` ApexCharts web component and the FDS colour tokens in a public fork. No specimen images survive; the expected panels follow ApexCharts’ defaults as the FDS component configures them.',
    'Stated directly: Roboto; brand violet `#694ED6` for single series; the six-slot categorical palette ending in neutral grey; Finastra’s older eight-colour Plotly colorway as the extended set; the nine-step violet ramp; status inks from the three semantic palettes; transparent background (`surface.source: "host"`); white separators between segments; a bottom, centred, untitled legend; data labels on by default with contrast-switched ink.',
    'Not stated: the legend and labels are Roboto Light (300), which `TypeRole.weight` cannot name; the grey is reserved for the last slot (“other”) rather than whatever comes sixth; the focus palettes fill the subject with a gradient; semantic palettes are monochrome tints of one status ink; and FDS re-renders in a dark palette on `prefers-color-scheme`. Axis, grid and title rules were in the lost prose and are left near Material defaults.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall: the FDS donut',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Donut is a first-class FDS component: categorical slots violet, fuchsia, orange, yellow, aqua and a grey last slot; segments cut by a surface-coloured stroke; percentages in each segment in 12px Roboto Light, white on violet and black on the lighter slots; legend centred below, 12px Roboto Light, items 8px apart.',
      current: 'Flint draws the donut in the categorical order with surface-coloured cuts and a bottom, centred key. Its value labels follow its own placement and type weight.',
      expected: 'An ApexCharts-style donut of payments by channel with percentage labels inside every segment.',
      flint: donutFlint(PAYMENTS, 'Channel', 'Payments by channel'),
      expectedSpec: donut(PAYMENTS.map((r) => ({ name: r.Channel, value: r.Share })), LIGHT, { title: 'Payments by channel' }),
      observed: 'Flint (left) gets most of it: the six inks with grey on “Other”, white cuts between segments, percentages inside with white on violet and pink and black on the light slots, a centred key below. It differs in order and detail: wedges run alphabetically from twelve o’clock (ACH, Card, Cheque, Mobile, Other, Wire), so the violet Card slice is not first; labels are whole percents in regular weight; the key wraps to two rows under a large gap. Expected (right): Card first and Other closing the ring, one-decimal percentages in Roboto Light, one-row key with circles.',
    },
    {
      id: 'other-grey',
      addressed: { stage: 'R8', note: '“Other” takes the closing grey through `ink.series.roles.other`; the grey leaves the positional palette whenever “Other” is in the chart.' },
      title: 'The grey slot belongs to “Other”, not to the sixth series',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'per-category-ink',
      rule: 'The categorical palette ends with neutral grey `#E5E5E5` (“presumably for ‘other’”, per the component source): the remainder category is grey whatever its position.',
      current: 'ThemeSpec palettes are positional. With five browsers, “Other” takes the fifth ink (aqua `#7FCDDE`) and the grey is never used; with seven categories the grey would land on a real one. `overflow` greys only the tail past the palette.',
      expected: 'Chrome, Safari, Edge, Firefox in the first four slots; Other in grey.',
      proposal: '`ink.series.remainder: "#E5E5E5"` applied to a category the semantics mark as a remainder (“Other”, “Rest of world”), with the palette indexing only the named categories.',
      flint: donutFlint(BROWSERS, 'Browser', 'Desktop browser share'),
      expectedSpec: donut(BROWSERS.map((r) => ({ name: r.Browser, value: r.Share })), LIGHT, {
        title: 'Desktop browser share',
        colors: [VIOLET, FUCHSIA, '#ED8B00', '#FFD100', NEUTRAL],
      }),
      observed: 'Flint gives “Other” the fifth ink, aqua `#7FCDDE`, so it reads as a fifth browser; the grey is unused. Expected: Other in `#E5E5E5`, visibly a remainder.',
    },
    {
      id: 'focus-gradient',
      title: 'Focus palettes: the subject in a blue-to-violet gradient, the rest grey',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'gradient-fill',
      rule: '“Focus 1”: the highlighted data is filled with a gradient from `#1379C4` to `#694ED6`; everything else is neutral `#E5E5E5` (“Focus 2”: `#C34DD5` → `#F04E98`).',
      current: 'There is no emphasis slot in the chart spec, no context ink in the theme, and ThemeSpec inks are flat colours, so no gradient fill can be asked for. Every bar is violet.',
      expected: 'Nigeria filled blue→violet with a white label; every other bar grey with black labels.',
      proposal: '`chart_spec.emphasis` plus `ink.series.focus: { fill: { gradient: ["#1379C4", "#694ED6"] }, context: "#E5E5E5" }` — the ink type would accept a gradient object.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: 'Country', x: 'Population' },
        title: 'Nigeria is the most populous country in Africa',
        subtitle: 'Population, millions, 2023',
      }),
      expectedSpec: focusBars(),
      observed: 'Flint fills every bar violet and labels them all (white inside the long bars, black outside the short ones). Expected: every bar grey with black labels and Nigeria alone in a blue-to-violet gradient with a white label.',
    },
    {
      id: 'monochrome-semantic',
      title: 'Semantic palettes are tints of one status colour',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'monochrome-palette',
      rule: 'Semantic-1/2/3 are ApexCharts monochrome palettes of green `#008744`, red `#D60040` or orange `#FF600A`, shaded to light at intensity 0.65 — a breakdown of good outcomes is all green, of failures all red.',
      current: '`ink.series.status` names one ink per state; there is no way to ask for a categorical set derived from a status ink, and nothing in the chart spec says a breakdown is “all positive”. Flint uses the categorical palette.',
      expected: 'Settled payments by delay in four green tints, darkest for same-day.',
      proposal: '`ink.series.statusTints: { shadeTo: "light", intensity: 0.65 }` selected when the semantics mark a part-to-whole as a single status (or `chart_spec.palette: "positive"`).',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: SETTLEMENT.map((r) => ({ Settlement: r.name, Share: r.value })),
        semantic_types: { Settlement: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Settlement' },
        title: 'Settled payments by time to settle',
      }),
      expectedSpec: donut(SETTLEMENT, LIGHT, { title: 'Settled payments by time to settle', colors: GREEN_TINTS, labelInk: ['#FFFFFF', '#FFFFFF', '#000000', '#000000'] }),
      observed: 'Flint paints the four delay bands violet, pink, orange and yellow — a categorical reading of what is one positive outcome — and two labels are clipped (see the next gap). Expected: four greens from `#008744` to a pale tint, darkest for same-day.',
    },
    {
      id: 'dark-mode',
      title: 'Charts re-render in the dark FDS palette',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'dark-mode',
      rule: 'Charts follow `prefers-color-scheme`: dark surface `#242424`, primary `#917EE0`, secondary `#E453BF`, segment strokes in the dark surface colour.',
      current: '`ink.surface.source: "host"` lets the canvas follow the host, but the series and label inks cannot change with it; on a dark host Flint would keep `#694ED6` and the white separators.',
      expected: 'The donut on `#242424` with the lighter violet and pink, dark cuts and white legend text.',
      proposal: '`ink.modes: { dark: Partial<ThemeInk> }` resolved against the host’s colour scheme.',
      flint: donutFlint(PAYMENTS, 'Channel', 'Payments by channel'),
      expectedSpec: donut(PAYMENTS.map((r) => ({ name: r.Channel, value: r.Share })), DARK, { title: 'Payments by channel' }),
      observed: 'Flint renders the light donut with white cuts; nothing changes for a dark host. Expected: `#242424` ground, the lighter violet `#917EE0` and pink `#E453BF`, dark cuts and white key text.',
    },
    {
      id: 'slice-order',
      addressed: { stage: 'M4', note: '`geometry.arc.order: "data"` keeps the series order from 12 o’clock, the remainder last as the data has it.' },
      title: 'Slices keep the series order, the remainder last',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'pie-rules',
      rule: 'The FDS donut draws its series in the order given, clockwise from twelve o’clock, so the palette’s first ink takes the first (largest) category and the grey “Other” closes the ring.',
      current: 'ThemeSpec has no slice-order rule; Flint orders the wedges alphabetically, so “ACH” starts at twelve o’clock and “Other” lands between Mobile and Wire.',
      expected: 'Card, Wire, ACH, Mobile, Cheque, Other clockwise from the top.',
      proposal: '`geometry.arc.order: "data" | "descending" | "alphabetical"` and `geometry.arc.remainderLast: true`.',
      flint: donutFlint(PAYMENTS, 'Channel', 'Payments by channel'),
      expectedSpec: donut(PAYMENTS.map((r) => ({ name: r.Channel, value: r.Share })), LIGHT, { title: 'Payments by channel' }),
      observed: 'Flint’s ring starts at twelve o’clock with ACH (orange) and runs alphabetically; Other sits between Mobile and Wire. Expected: Card (violet) first, then Wire, ACH, Mobile, Cheque, and Other last.',
    },
    {
      id: 'ring-labels',
      addressed: { stage: 'L5', note: 'A ring thinner than its widest label sends the labels outside it, whole and in the plot’s ink; on a ring thick enough they sit on its middle. The guide’s black-on-orange is the separate contrast floor (`dataLabels.minContrast`, L4).' },
      title: 'Value labels wider than the ring spill into the hole',
      kind: 'realization',
      severity: 'medium',
      probe: 'value-label-placement',
      rule: 'Data labels sit inside each segment in the slot’s label ink (white on violet, black elsewhere) and must stay legible — the label-ink arrays exist for contrast.',
      current: 'With `dataLabels: { show: "always", inkMode: "contrastWithMark" }` Flint centres each percentage on the ring’s mid-radius and picks white or black for the segment. On a smaller donut the ring is thinner than “46%”, so the label runs into the hole — white text on the white canvas — and is cut to “46”.',
      expected: 'Every percentage inside its segment, or moved outside when the ring is too thin.',
      proposal: 'Measure the label against the ring thickness at its angle (as bars do with `insideMinValue`) and fall back to an outside label or a thicker ring.',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: SETTLEMENT.map((r) => ({ Settlement: r.name, Share: r.value })),
        semantic_types: { Settlement: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Settlement' },
        title: 'Settled payments by time to settle',
      }),
      expectedSpec: donut(SETTLEMENT, LIGHT, { title: 'Settled payments by time to settle' }),
      observed: 'Flint’s “46%” on the violet segment is cut to “46” and “31%” to “1%”: the white text runs off the ring onto the white hole. “15%” is drawn white on orange, where the guide’s label ink is black. Expected: every percentage whole, inside its segment, in the slot’s label ink.',
    },
    {
      id: 'light-weight',
      addressed: { stage: 'T2', note: 'Key and value labels are `weight: "light"` (300).' },
      title: 'Labels and legend in Roboto Light (300)',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'type-weight-scale',
      rule: '`dataLabels.style.fontWeight: 300`, legend `fontWeight: 300` — the light weight is what makes labels inside coloured segments read as quiet annotations.',
      current: '`TypeRole.weight` is `regular | medium | semibold | bold`; nothing lighter than 400 can be named, so `valueLabel` and `keyLabel` are set regular.',
      expected: 'Value labels and key in weight 300.',
      proposal: 'Accept numeric weights (100–900) or add `light` to `TypeRole.weight`.',
    },
  ],
};

export default finastra;
