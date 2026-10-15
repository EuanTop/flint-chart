import type { ThemeSpec } from 'flint-chart';
import research from '../research/mayo-clinic.json';
import { cardProbe, flintInput, highlightProbe } from '../probes';
import { PREVIEW_CASES } from '../../../shared/preview-cases';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "Roboto, 'Helvetica Neue Light', 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
/** rgba(0,0,0,.87), rgba(0,0,0,.6) and rgba(0,0,0,.12) flattened onto white. */
const TEXT = '#212121';
const TEXT_2 = '#666666';
const BORDER = '#E0E0E0';
const PRIMARY = '#2196F3';
const MAYO_BLUE = '#0057B8';
const GROUND = '#FAFAFA';
/** Ultima's blue 50–900: the primary palette the guide asks charts to stay inside. */
const BLUES = ['#F4FAFE', '#CAE6FC', '#A0D2FA', '#75BEF8', '#4BAAF5', '#2196F3', '#1C80CF', '#1769AA', '#125386', '#0D3C61'];
const STATUS = { success: '#689F38', warning: '#FBC02D', danger: '#D32F2F' };
/** Tag pairs (background / text), one per value. */
const TAGS = {
  green: ['#C8E6C9', '#256029'],
  blue: ['#B3E5FC', '#23547B'],
  yellow: ['#FEEDAF', '#8A5340'],
  orange: ['#FFD8B2', '#805B36'],
  red: ['#FFCDD2', '#C63737'],
  purple: ['#ECCFFF', '#694382'],
};

const t: HouseTokens = {
  font: FONT,
  text: TEXT,
  muted: TEXT_2,
  grid: BORDER,
  axis: BORDER,
  background: '#FFFFFF',
  palette: [PRIMARY, '#0D3C61', '#75BEF8', '#1769AA', '#CAE6FC'],
  highlight: PRIMARY,
  context: '#CAE6FC',
  titleSize: 17.5,
  titleWeight: 600,
  subtitleSize: 14,
  labelSize: 12,
};

const theme: ThemeSpec = {
  id: 'mayo-clinic',
  label: 'Mayo Clinic GBS (Ultima)',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF', panel: GROUND },
    text: { primary: TEXT, secondary: TEXT_2, muted: TEXT_2, inverse: '#FFFFFF' },
    structure: { grid: BORDER, axis: BORDER, frame: BORDER, rule: BORDER },
    series: {
      single: PRIMARY,
      // “Refrain from using palettes other than the primary palette”: series are told apart by tint.
      categorical: [PRIMARY, '#0D3C61', '#75BEF8', '#1769AA', '#CAE6FC'],
      sequential: { stops: BLUES, space: 'lab' },
      status: { positive: STATUS.success, negative: STATUS.danger, neutral: STATUS.warning },
    },
    accent: PRIMARY,
  },
  type: {
    // Card title: text-xl (1.25rem of a 14px root) at 600; table/block titles go to 700.
    headline: { family: FONT, size: 17.5, weight: 'semibold', color: TEXT },
    deck: { family: FONT, size: 14, weight: 'regular', color: TEXT_2 },
    axisLabel: { family: FONT, size: 12.25, weight: 'regular', color: TEXT_2 },
    axisTitle: { family: FONT, size: 12.25, weight: 'regular', color: TEXT_2 },
    keyLabel: { family: FONT, size: 12.25, color: TEXT_2 },
    // “Lighter weights and shades for labels and heavier weights/shades for associated values.”
    valueLabel: { family: FONT, size: 14, weight: 'medium', color: TEXT },
    footnote: { family: FONT, size: 10.5, color: TEXT_2 },
  },
  structure: {
    axis: {
      categorical: { line: 'quiet', ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit', tickDensity: 'sparse' },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'quiet',
  },
  marks: { strokeWeight: 2, cornerRadius: 0 },
  geometry: { band: { cornerRadius: 0 } },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  annotation: { axisTitles: 'whenAmbiguous', numberFormat: { thousands: 'separator' } },
  layout: { density: 'compact', titleBlock: { anchor: 'start', gap: 'tight' } },
};

// ---------------------------------------------------------------------------
// Illustrative data: a genomics lab's operational numbers (the guide has no charts to re-key).
// ---------------------------------------------------------------------------

const ASSAYS = [['Exome', 1240], ['Whole genome', 860], ['Targeted panel', 610], ['RNA-seq', 420], ['Methylation', 230], ['Single-cell', 120]].map(([Assay, Samples]) => ({ Assay, Samples }));
const QC = [['Pass', 812, 'success'], ['Review', 96, 'warning'], ['Fail', 41, 'danger']].map(([Outcome, Samples, Status]) => ({ Outcome, Samples, Status }));
const VARIANTS = [
  ['Benign', 540, 'green'], ['Likely benign', 310, 'blue'], ['Uncertain significance', 220, 'yellow'],
  ['Likely pathogenic', 85, 'orange'], ['Pathogenic', 60, 'red'],
].map(([Classification, Variants, Tag]) => ({ Classification, Variants, Tag }));

const config = (extra: Record<string, unknown> = {}) => {
  const base = houseConfig(t);
  return {
    ...base,
    title: { ...(base.title as object), fontWeight: 600, fontSize: 17.5, color: TEXT, offset: 10 },
    axis: { ...(base.axis as object), labelColor: TEXT_2, labelFontSize: 12.25, domainColor: BORDER, gridColor: BORDER },
    axisY: { grid: false, domain: false },
    axisX: { grid: true, domain: false },
    ...extra,
  };
};

const topBar = `<div style="display:flex;align-items:center;height:44px;background:${MAYO_BLUE};color:#fff;font-family:${FONT};margin:-12px -12px 14px">`
  + '<div style="width:22px;height:22px;border-radius:50%;background:#2196F3;margin:0 14px 0 10px;display:flex;align-items:center;justify-content:center;font-size:13px">›</div>'
  + '<div style="width:18px;height:20px;border:1.5px solid #fff;border-radius:0 0 9px 9px;margin-right:8px"></div>'
  + '<div style="font-size:9.5px;line-height:1.15;font-weight:500;margin-right:16px">Mayo Clinic<br>Laboratories</div>'
  + '<div style="align-self:stretch;width:1px;background:rgba(0,0,0,0.15);margin-right:16px"></div>'
  + '<div style="font-size:17px;font-weight:700">WorkBench</div></div>';

const blockTitle = (title: string, filter: string) =>
  `<div style="display:flex;justify-content:space-between;align-items:center;margin:0 14px 2px;font-family:${FONT}">`
  + `<div style="font-size:17.5px;font-weight:700;color:${TEXT};line-height:1.5">${title}</div>`
  + `<div style="font-size:12.25px;color:${TEXT};border:1px solid ${BORDER};border-radius:3px;padding:4px 8px">${filter} ▾</div></div>`;

/** The chart as a GBS app would show it: Mayo-blue top bar, a white card on the ground, primary blue bars. */
function signature() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config(),
    width: W,
    height: H - 20,
    data: { values: ASSAYS },
    mark: { type: 'bar', color: PRIMARY },
    encoding: {
      y: { field: 'Assay', type: 'nominal', sort: null, title: null, scale: { paddingInner: 0.3 } },
      x: { field: 'Samples', type: 'quantitative', title: 'Samples', axis: { tickCount: 4, titleColor: TEXT_2, titleFontWeight: 'normal' } },
    },
  };
}

/** Status inks: success green, warning amber, danger red. */
function statusBars() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config({ axisX: { grid: false, domain: true, domainColor: BORDER }, axisY: { grid: true, domain: false } }),
    title: { text: 'Sample QC outcomes', subtitle: 'Last 30 days, samples' },
    width: W,
    height: H,
    data: { values: QC },
    mark: { type: 'bar' },
    encoding: {
      x: { field: 'Outcome', type: 'nominal', sort: null, title: null, axis: { labelAngle: 0 }, scale: { paddingInner: 0.4 } },
      y: { field: 'Samples', type: 'quantitative', title: null, axis: { tickCount: 4 } },
      color: { field: 'Status', type: 'nominal', scale: { domain: ['success', 'warning', 'danger'], range: [STATUS.success, STATUS.warning, STATUS.danger] }, legend: null },
    },
  };
}

/** Tag pairs: each value a pastel fill with its value written in the same hue, dark. */
function pairedBars() {
  const keys = Object.keys(TAGS) as (keyof typeof TAGS)[];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config(),
    title: { text: 'Variant classifications', subtitle: 'Reported variants, 2024' },
    width: W,
    height: H,
    data: { values: VARIANTS },
    encoding: {
      y: { field: 'Classification', type: 'nominal', sort: null, title: null, scale: { paddingInner: 0.2 } },
      x: { field: 'Variants', type: 'quantitative', title: null, axis: null },
    },
    layer: [
      { mark: { type: 'bar' }, encoding: { color: { field: 'Tag', type: 'nominal', scale: { domain: keys, range: keys.map((k) => TAGS[k][0]) }, legend: null } } },
      {
        mark: { type: 'text', align: 'left', dx: 6, fontSize: 14, fontWeight: 500, font: FONT },
        encoding: { text: { field: 'Variants', type: 'quantitative', format: ',' }, color: { field: 'Tag', type: 'nominal', scale: { domain: keys, range: keys.map((k) => TAGS[k][1]) }, legend: null } },
      },
    ],
    resolve: { scale: { color: 'independent' } },
  };
}

const MIX = (PREVIEW_CASES.find((c) => c.id === 'electricity-mix-area')?.data ?? []) as Record<string, unknown>[];
const MIX_SOURCES = ['Coal', 'Gas', 'Hydro', 'Nuclear', 'Wind & solar', 'Other'];

/** Six series inside the primary palette: alternating dark and light tints of the one blue. */
function sixTints() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config({ axisX: { grid: false, domain: true, domainColor: BORDER }, axisY: { grid: true }, legend: { ...(houseConfig(t).legend as object), orient: 'top', columns: 3, symbolType: 'square', labelColor: TEXT_2 } }),
    title: { text: 'World electricity by source', subtitle: 'Share of generation, 1990–2020' },
    width: W,
    height: H - 30,
    data: { values: MIX },
    mark: { type: 'area', stroke: '#FFFFFF', strokeWidth: 0.5 },
    encoding: {
      x: { field: 'Year', type: 'quantitative', title: null, axis: { format: 'd', values: [1990, 2000, 2010, 2020] } },
      y: { field: 'Generation (TWh)', type: 'quantitative', title: null, stack: 'normalize', axis: { values: [0, 0.5, 1], format: '.0%' } },
      color: { field: 'Source', type: 'nominal', sort: MIX_SOURCES, scale: { domain: MIX_SOURCES, range: ['#0D3C61', '#2196F3', '#125386', '#75BEF8', '#1769AA', '#CAE6FC'] } },
      order: { field: 'i', type: 'quantitative' },
    },
    transform: [{ calculate: `indexof(${JSON.stringify(MIX_SOURCES)}, datum.Source)`, as: 'i' }],
  };
}

const appCard = { background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 1px rgba(0,0,0,0.14)', borderRadius: 4, padding: '12px 12px 6px', border: `12px solid ${GROUND}`, borderTop: '0' };

const mayo: StyleGuideTheme = {
  id: 'mayo-clinic',
  org: 'Mayo Clinic – Genomic and Bioinformatic Services (GBS) UI style guide',
  research: research as ResearchRecord,
  theme,
  notes: [
    '**This guide has no chart guidance at all.** It is an application UI style guide (PrimeNG / Ultima) for GBS web apps — foundations, buttons, tags, tables, dialogs — and never mentions a chart, axis, legend or plot. Every decision below is the app’s own token or principle carried over to a chart that would live inside those apps; none of it is a chart rule the guide states, and each gap says so.',
    'Carried over from the app: Roboto throughout; 87% / 60% black text (flattened to `#212121` / `#666666`) and the 12% black border (`#E0E0E0`) as the gridline and axis ink; the primary blue `#2196F3` as the single-series ink and the Ultima blue 50–900 as the sequential ramp; the guide’s “Minimal palette — refrain from using palettes other than the primary palette”, read as a categorical set of primary tints; success / danger / warning as the status inks; square corners (“we do NOT recommend … pills”); the dense layout the guide asks for (`layout.density: compact`); card titles at 1.25rem / 600; and labels lighter than values (`valueLabel` at 500 in primary text).',
    'Implied but not stateable: the Mayo-blue `#0057B8` top bar that carries the identity, the white card on the `#FAFAFA` ground with a title and a filter on its right, a third status (warning) that has no slot, the tag pairs (pastel fill, dark text of the same hue), and the “only what matters stands out” emphasis rule — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall (inferred — the guide shows no chart)',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'No chart specimen exists. Inferred from the app guide: the chart sits in a white card on the `#FAFAFA` ground under the Mayo-blue top bar (white shield, “Mayo Clinic Laboratories”, the app name in bold white Roboto); the block title is left-aligned, bold, with a filter dropdown on its right; content in Roboto, 60% black labels, 12% black rules, one primary blue.',
      current: 'Flint draws the bars with the house theme and the block title as its headline; the top bar, card and filter are application chrome it cannot draw.',
      expected: 'A GBS WorkBench card: top bar, block title with filter, compact primary-blue bars.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: ASSAYS,
        semantic_types: { Assay: 'Category', Samples: 'Count' },
        encodings: { y: 'Assay', x: 'Samples' },
        title: 'Samples processed by assay',
      }),
      expectedSpec: signature(),
      expectedFrame: { style: appCard, headerHtml: topBar + blockTitle('Samples processed by assay', 'Last 30 days') },
      observed: 'The chart itself is close to what the app tokens imply: Roboto, a semibold 17.5px title, grey labels, 12% black rules on the measure only, square primary-blue bars, compact spacing. Flint keeps a “Samples” axis title (the theme says `whenAmbiguous`, and a bare count is ambiguous). Everything that makes it a Mayo GBS view — the blue top bar, the card on the grey ground, the filter on the title row — is outside what a chart theme can carry.',
    },
    {
      id: 'minimal-emphasis',
      title: '“When everything stands out, nothing stands out”',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'highlight',
      rule: 'App principle carried to charts: only primary actions, errors and navigation targets stand out; everything else takes lighter shades. In a chart that is one item in the primary blue and the rest in a light primary tint.',
      current: 'Neither the chart spec nor the theme can name the item that matters, so every bar is primary blue — the opposite of the principle.',
      expected: 'Nigeria in `#2196F3`, the other bars in the light tint `#CAE6FC`.',
      proposal: '`chart_spec.emphasis: { field, values }` with `ink.series.emphasis` / `ink.series.context` in the theme.',
      ...highlightProbe(theme, t),
      observed: 'Flint: eight primary-blue bars of equal weight, with a “Population” axis title. Expected: Nigeria alone in primary blue, the rest in the pale tint — the guide’s “nothing else stands out”.',
    },
    {
      id: 'warning-status',
      title: 'Three statuses — success, warning, danger — but only two status slots',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'status-colors',
      rule: '“There are 3 general statuses: Success, Warning and Danger” — `#689F38`, `#FBC02D` (also used for “medium”), `#D32F2F`, each with a light-background / dark-text message variant.',
      current: '`ink.series.status` has `positive`, `negative` and `neutral`, and grounding uses it only for signed measures. The theme parks warning in `neutral`, but a chart whose categories are statuses (Pass / Review / Fail) is coloured with the categorical blues: nothing maps a category to a status.',
      expected: 'Pass in success green, Review in warning amber, Fail in danger red.',
      proposal: 'Name statuses openly (`ink.series.status: { success, warning, danger, info }`) and let the chart spec bind a field’s values to them (`encodings.color.status: { Pass: "success", Review: "warning", Fail: "danger" }`).',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: QC.map(({ Outcome, Samples }) => ({ Outcome, Samples })),
        semantic_types: { Outcome: 'Category', Samples: 'Count' },
        encodings: { x: 'Outcome', y: 'Samples', color: 'Outcome' },
        title: 'Sample QC outcomes',
        subtitle: 'Last 30 days, samples',
      }),
      expectedSpec: statusBars(),
      observed: 'Flint colours Pass, Review and Fail with the first three categorical blues (primary, navy, light blue) and adds a key; nothing reads as success / warning / danger. Expected: green, amber and red, no key needed.',
    },
    {
      id: 'tag-pairs',
      title: 'Category colours come in pairs: a pastel fill and a dark ink of the same hue',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'paired-ink',
      rule: 'Tags use fixed pairs — `#C8E6C9`/`#256029`, `#B3E5FC`/`#23547B`, `#FEEDAF`/`#8A5340`, `#FFD8B2`/`#805B36`, `#FFCDD2`/`#C63737`, `#ECCFFF`/`#694382` — one per value, square-cornered, text only; “prefer lighter shades to reduce noise”; values in a heavier weight than labels.',
      current: '`ink.series.categorical` is one ink per series. `dataLabels.inkMode` can match the series colour or contrast with the mark, but cannot name a second, darker ink paired with each fill.',
      expected: 'Each classification as a pastel bar with its count written beside it in the paired dark ink, at medium weight.',
      proposal: '`ink.series.categoricalPairs: [{ fill, ink }, …]` with `dataLabels.inkMode: "paired"`, so a light fill can carry legible text of its own hue.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: VARIANTS.map(({ Classification, Variants }) => ({ Classification, Variants })),
        semantic_types: { Classification: 'Category', Variants: 'Count' },
        encodings: { y: 'Classification', x: 'Variants', color: 'Classification' },
        title: 'Variant classifications',
        subtitle: 'Reported variants, 2024',
        chartProperties: { showTextLabels: true },
      }),
      expectedSpec: pairedBars(),
      observed: 'Flint fills each bar with a different blue tint, adds a key that repeats the axis, wraps the long names, and writes every count in bold near-black. Expected: pastel fills from the tag pairs with each count in its own dark partner ink at medium weight — legible text of the same hue on a quiet fill.',
    },
    {
      id: 'card',
      title: 'A white card on the `#FAFAFA` ground, title left, filter right',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'card-container',
      rule: 'Content sits in white cards (shadow-1) on the `#FAFAFA` ground; block titles are left-aligned, bold, line-height 1.5, with an optional filter dropdown on the right; spacing in 0.25rem steps, tighter for related items.',
      current: 'A theme has one canvas and no container: Flint draws on white with its own title block, no card edge, no ground and no place for a filter control.',
      expected: 'The unemployment line in a shadow-1 card on the ground, with its title and a filter at the top right.',
      proposal: '`layout.container: { kind: "card", surface, ground, shadow, radius, padding }` and a header slot for host controls (`chart_spec.headerActions`).',
      ...cardProbe(theme, t, {
        style: { ...appCard, borderTop: `12px solid ${GROUND}`, padding: '10px 12px 6px' },
        header: `<span style="font-weight:700;font-size:16px">Unemployment rate</span>`,
        meta: 'United States, 2000–2023',
        actions: true,
      }),
      observed: 'Flint’s chart sits directly on the page with a rotated “Unemployment (%)” axis title; the expected one is in a shadow-1 white card on the `#FAFAFA` ground with the title and an actions control on one row.',
    },
    {
      id: 'palette-exhausted',
      addressed: { stage: 'R1', note: 'The primary palette stays; series past it share a house grey, not Tableau colours.' },
      title: 'Past five series the primary palette is replaced by Tableau colours',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'count-palette',
      rule: '“Refrain from using palettes other than the primary palette”; for qualitative colour “limit the number of colours, prefer lighter shades to reduce noise”.',
      current: 'The theme names five primary tints and no `categoricalExtended` or `overflow`. With six series grounding marks the palette exhausted and stops imposing it, so Vega-Lite’s default scheme takes over: the six-source area is blue, orange, red, teal, green and yellow — the very “other palettes” the guide forbids.',
      expected: 'Six tints of the primary blue, dark and light alternating so neighbours stay apart.',
      proposal: 'Never hand an exhausted house palette to the renderer’s scheme: extend it from the house’s own ramp (`sequential` sampled categorically) or fold the tail into an overflow grey, and report it.',
      flint: flintInput(theme, {
        chartType: 'Area Chart',
        data: MIX,
        semantic_types: { Year: 'Year', Source: 'Category', 'Generation (TWh)': 'Quantity' },
        encodings: { x: 'Year', y: 'Generation (TWh)', color: 'Source' },
        chartProperties: { stackMode: 'normalize' },
        title: 'World electricity by source',
        subtitle: 'Share of generation, 1990–2020',
      }),
      expectedSpec: sixTints(),
      observed: 'Flint’s area is Tableau blue, orange, red, teal, green and yellow with a rotated “Generation (TWh)” axis title — no trace of the primary palette. The expected panel stays in six blues, dark and light alternating, which is the most this guide’s “minimal palette” allows.',
    },
    {
      id: 'top-bar',
      title: 'The Mayo identity lives in the app’s top bar, not in the chart',
      kind: 'product-ui',
      severity: 'low',
      probe: 'brand-mark',
      rule: '“All applications use the ‘Mayo blue’ color (#0057B8) for the top bar”, with the white-only shield and the app name in bold white; the logo appears nowhere else.',
      current: 'Correctly, nothing in the chart carries the brand; but an exported chart (a PNG in a report) then has no Mayo identity at all, and `furniture` has no band-with-wordmark kind that could carry one on export only.',
      expected: 'Inside the app: no mark on the chart (see the signature). On export: a thin Mayo-blue band with the white shield and app name.',
      proposal: '`furniture: { kind: "band", anchor: "top", color: "#0057B8", content: { wordmark, text }, when: "export" }`.',
      observed: 'No panel: the top bar is drawn in the signature’s expected frame. No gallery tile carries any Mayo identity.',
    },
    {
      id: 'hover-focus',
      title: 'Hover and focus states use 4% black and 16% primary',
      kind: 'product-ui',
      severity: 'low',
      probe: 'focus-hover-state',
      rule: 'Row hover turns `rgba(0,0,0,.04)`; focus uses the primary colour at 16%; tooltips are preferred over help text and keep PrimeNG’s default positions.',
      current: 'ThemeSpec’s `interaction` block has `tooltipFormat` and selection-boundary paint only: no hover fill for a band or row, and no focus ring colour.',
      expected: 'A hovered bar’s row tinted 4% black; keyboard focus ringed in `#2196F3` at 16%.',
      proposal: '`interaction.hover: { rowFill: "rgba(0,0,0,0.04)" }` and `interaction.focus: { color: "#2196F3", opacity: 0.16 }`.',
    },
  ],
};

export default mayo;
