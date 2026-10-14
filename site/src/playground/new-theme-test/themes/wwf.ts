import type { ThemeSpec } from 'flint-chart';
import { logoImage, realLogo } from '../house-logos';
import research from '../research/wwf.json';
import { flintInput, groupedProbe, POPULATION } from '../probes';
import { houseConfig, titled, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

/** The WWF display face is proprietary; the guide names Arial (Narrow) Bold as its stand-in. */
const HEAD = "'WWF', 'Arial Narrow', 'Roboto Condensed', Arial, sans-serif";
const BODY = "'Open Sans', Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
/** One secondary hue (Aqua) and its tints, plus the GitHub palette’s dark aqua. */
const AQUA = '#009191';
const AQUA_DARK = '#007476';
const TINTS = [AQUA, '#66BDBD', AQUA_DARK, '#B1DFDC', '#33A7A7'];
const LIGHT_GREY = '#D9D6D6';

const t: HouseTokens = {
  font: BODY,
  titleFont: HEAD,
  text: '#000000',
  muted: '#000000',
  grid: null,
  axis: '#000000',
  background: '#FFFFFF',
  palette: TINTS,
  highlight: AQUA,
  context: LIGHT_GREY,
  titleSize: 24,
  titleWeight: 'bold',
  subtitleSize: 13,
  subtitleColor: '#000000',
  labelSize: 12,
  sourceSize: 10,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'wwf',
  label: 'WWF',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: '#000000', secondary: '#000000', muted: '#555555', inverse: '#FFFFFF' },
    structure: { axis: '#000000', rule: '#000000', zero: '#000000' },
    series: {
      single: AQUA,
      categorical: TINTS,
      overflow: LIGHT_GREY,
      sequential: { stops: ['#CCE9E9', '#66BDBD', AQUA, AQUA_DARK], space: 'lab' },
    },
    accent: AQUA,
  },
  type: {
    headline: { family: HEAD, size: 24, weight: 'bold', case: 'upper', color: '#000000' },
    deck: { family: BODY, size: 13, weight: 'regular', color: '#000000' },
    axisLabel: { family: HEAD, size: 13, color: '#000000' },
    axisTitle: { family: BODY, size: 11, color: '#000000' },
    keyLabel: { family: BODY, size: 12, color: '#000000' },
    valueLabel: { family: HEAD, size: 15, weight: 'bold', color: '#FFFFFF' },
    display: { family: HEAD, size: 56, weight: 'bold', color: '#000000' },
    footnote: { family: BODY, size: 10, color: '#555555' },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1, ticks: 'omit' },
      measure: { line: 'full', lineWeight: 1, ticks: 'full', tickLength: 'short', tickDirection: 'outward' },
    },
    grid: { measure: 'omit', category: 'omit' },
    frame: 'omit',
    baseline: 'full',
  },
  marks: { bandFraction: 0.86, strokeWeight: 2.5, cornerRadius: 0, outline: { presence: 'omit' } },
  geometry: { arc: { gap: 0 } },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['bottom'], direction: 'vertical', title: 'always', align: 'start' },
  dataLabels: { show: 'whenTheyFit', placement: 'atMark', inkMode: 'contrastWithMark' },
  annotation: { axisTitles: 'omit', unit: 'never', numberFormat: { thousands: 'separator' } },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' } },
  // The panda in the top-left corner of standalone graphics (F2): the real file from ../logos when present, else a placeholder.
  // The panda is portrait (about 2:3); the placeholder is a wide labelled box.
  furniture: [realLogo('wwf')
    ? { kind: 'image', at: 'aboveTitle', align: 'start', src: realLogo('wwf')!, width: 30, height: 44, alt: 'WWF' }
    : { kind: 'image', at: 'aboveTitle', align: 'start', ...logoImage('wwf', 'WWF logo', '#000000', 84, 28), width: 84, height: 28, alt: 'WWF' }],
};

/** Average decline in monitored wildlife populations since 1970 (Living Planet Report 2022, %). */
const LPI = [
  { Region: 'Latin America & Caribbean', Decline: 94 },
  { Region: 'Africa', Decline: 66 },
  { Region: 'Asia-Pacific', Decline: 55 },
  { Region: 'North America', Decline: 20 },
  { Region: 'Europe & Central Asia', Decline: 18 },
];
const LPI_TITLE = 'Wildlife has fallen fastest in Latin America';
const LPI_SUB = 'Average decline in monitored wildlife populations since 1970, %';
const LPR_SOURCE = '© WWF, Living Planet Report 2022';

/** Humanity’s Ecological Footprint by activities (Living Planet Report 2020, %). */
const FOOTPRINT = [
  { Activity: 'Food', Share: 29 },
  { Activity: 'Housing', Share: 25 },
  { Activity: 'Personal transportation', Share: 15 },
  { Activity: 'Goods', Share: 14 },
  { Activity: 'Services', Share: 17 },
];

/** The LPR “Key”: an italic heading over a black rule, then rectangle swatches, one per line. */
const keyHtml = (items: { label: string; color: string }[], o: { title?: string; font?: string } = {}) =>
  `<div style="margin:0 14px 10px;font-family:${o.font ?? BODY};color:#000;max-width:300px">`
  + (o.title ? `<div style="font-family:${SERIF};font-style:italic;font-weight:700;font-size:16px;line-height:1.25;margin-bottom:10px">${o.title}</div>` : '')
  + `<div style="font-family:${SERIF};font-style:italic;font-size:13px;padding-bottom:4px;border-bottom:1.5px solid #000;margin-bottom:8px">Key</div>`
  + items.map((item) => `<div style="display:flex;align-items:center;gap:10px;font-size:12.5px;margin:4px 0"><span style="display:inline-block;width:42px;height:16px;background:${item.color}"></span>${item.label}</div>`).join('')
  + '</div>';

const sourceHtml = (text: string) => `<div style="margin:2px 14px 10px;font-family:${BODY};font-size:10px;color:#555">${text}</div>`;

function wwfConfig(extra: Record<string, unknown> = {}) {
  const config = houseConfig(t);
  return {
    ...config,
    title: { ...(config.title as object), font: HEAD, fontSize: 24, fontWeight: 'bold', color: '#000000', subtitleFont: BODY, subtitleColor: '#000000', frame: 'bounds', lineHeight: 24 },
    axis: { ...(config.axis as object), labelFont: HEAD, labelFontSize: 13, labelColor: '#000000' },
    legend: { disable: true },
    ...extra,
  };
}

function signatureExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: wwfConfig(),
    title: { text: LPI_TITLE.toUpperCase(), subtitle: LPI_SUB },
    width: W - 60,
    height: H,
    data: { values: LPI },
    mark: { type: 'bar' },
    encoding: {
      x: { field: 'Region', type: 'nominal', sort: null, title: null, axis: { labels: false, domain: true, domainColor: '#000', ticks: false }, scale: { paddingInner: 0.12, paddingOuter: 0.25 } },
      y: { field: 'Decline', type: 'quantitative', title: null, scale: { domain: [0, 100] }, axis: { domain: true, domainColor: '#000', ticks: true, tickSize: 5, tickColor: '#000', values: [0, 20, 40, 60, 80, 100], grid: false } },
      color: { field: 'Region', type: 'nominal', sort: null, scale: { range: TINTS } },
    },
  };
}

function donutExpected() {
  const radius = 92;
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: wwfConfig(),
    width: 220,
    height: 210,
    data: { values: FOOTPRINT.map((row, i) => ({ ...row, i })) },
    encoding: {
      theta: { field: 'Share', type: 'quantitative', stack: true },
      order: { field: 'i', type: 'quantitative' },
      color: { field: 'Activity', type: 'nominal', sort: FOOTPRINT.map((row) => row.Activity), scale: { range: TINTS } },
    },
    layer: [
      { mark: { type: 'arc', outerRadius: radius, innerRadius: radius * 0.52, stroke: null } },
      {
        mark: { type: 'text', radius: radius * 0.76, font: HEAD, fontSize: 17, fontWeight: 'bold', color: '#FFFFFF' },
        encoding: { text: { field: 'label' }, color: { value: '#FFFFFF' } },
        transform: [{ calculate: "datum.Share + '%'", as: 'label' }],
      },
    ],
  };
}

function bigNumberExpected() {
  const rows = [{ part: 'Lost', v: 67, i: 0 }, { part: 'Remaining', v: 33, i: 1 }];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: wwfConfig(),
    title: { text: 'FRESHWATER WILDLIFE HAS FALLEN BY TWO-THIRDS', subtitle: 'Average decline in monitored freshwater populations since 1970' },
    width: W - 80,
    height: 200,
    layer: [
      {
        data: { values: rows },
        mark: { type: 'arc', outerRadius: 95, innerRadius: 72, stroke: null },
        encoding: {
          theta: { field: 'v', type: 'quantitative', stack: true },
          order: { field: 'i', type: 'quantitative' },
          color: { field: 'part', type: 'nominal', scale: { domain: ['Lost', 'Remaining'], range: [AQUA, LIGHT_GREY] } },
        },
      },
      {
        data: { values: [{}] },
        mark: { type: 'text', font: HEAD, fontSize: 58, fontWeight: 'bold', color: '#000000', text: '67', dx: -10, baseline: 'middle' },
      },
      {
        data: { values: [{}] },
        mark: { type: 'text', font: HEAD, fontSize: 30, fontWeight: 'bold', color: '#000000', text: '%', dx: 24, dy: 9, baseline: 'middle' },
      },
    ],
  };
}

function capsExpected() {
  const spec = titled(t, {
    data: { values: POPULATION },
    mark: { type: 'bar', color: AQUA },
    encoding: {
      y: { field: 'Country', type: 'nominal', sort: null, title: null, axis: { domain: true, domainColor: '#000', zindex: 1, labelFont: BODY } },
      x: { field: 'Population', type: 'quantitative', title: null, axis: { domain: true, domainColor: '#000', ticks: true, tickSize: 4, tickColor: '#000', grid: false, tickCount: 4 } },
    },
  }, { title: 'INDIA AND CHINA HOLD OVER A THIRD OF HUMANITY', subtitle: 'Population, millions, 2023' });
  const config = spec.config as Record<string, Record<string, unknown>>;
  config.title = { ...config.title, frame: 'bounds', font: HEAD, fontSize: 24, lineHeight: 24 };
  config.axis = { ...config.axis, labelFont: HEAD, labelFontSize: 13, labelColor: '#000' };
  return spec;
}

/** A placeholder for the panda logo (not the brand artwork): WWF’s black box, top-left above the headline. */
const pandaBox = `<div style="margin:6px 14px 0"><span style="display:inline-flex;align-items:flex-end;justify-content:center;width:38px;height:44px;background:#000;color:#fff;font:700 11px Arial, sans-serif;padding-bottom:4px;box-sizing:border-box">WWF</span></div>`;

function logoExpected() {
  const bars = {
    data: { values: POPULATION },
    mark: { type: 'bar', color: AQUA },
    encoding: {
      y: { field: 'Country', type: 'nominal', sort: null, title: null, axis: { domain: true, domainColor: '#000', zindex: 1 } },
      x: { field: 'Population', type: 'quantitative', title: null, axis: { domain: true, domainColor: '#000', ticks: true, tickSize: 4, tickColor: '#000', grid: false, tickCount: 4 } },
    },
  };
  const spec = titled(t, bars, {
    title: 'INDIA AND CHINA HOLD OVER A THIRD OF HUMANITY',
    subtitle: 'Population, millions, 2023',
    footer: ['Sourced from UN World Population Prospects 2022 · © WWF'],
  });
  const config = spec.config as Record<string, Record<string, unknown>>;
  config.title = { ...config.title, frame: 'bounds', font: HEAD, fontSize: 24, lineHeight: 24 };
  config.axis = { ...config.axis, labelFont: HEAD, labelFontSize: 13, labelColor: '#000' };
  return spec;
}

const wwf: StyleGuideTheme = {
  id: 'wwf',
  org: 'WWF (World Wide Fund for Nature) - brand guidelines: infographics, charts and maps',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch. The guide is a brand guide with short, qualitative chart advice, so much of the theme is read off its “Do” examples. Stated directly: black and white as the base; **one** secondary hue for the data — Aqua `#009191`, the teal of the guide’s single-colour-scheme example — with its tints and the darker aqua from WWF International’s palette, and light grey `#D9D6D6` for remainders; flat solid marks with no outline, gradient or rounding; no gridlines; a thin black value axis with small outward ticks and a black baseline; an upper-case bold condensed headline; Open Sans for the deck, legend and captions; white bold condensed value labels inside the marks; and a titled key under the chart, one entry per line.',
    'Approximated: the WWF display face is proprietary; every panel names it first and falls back to Arial Narrow Bold, which the guide itself names as the stand-in. Sizes are not specified anywhere; they were set by eye from the examples. The Living Planet Report sets chart titles and the “Key” heading in Georgia italic; the theme keeps the brand rule (WWF font for headings) and the expected panels show the LPR Key as published.',
    'Not stated (see gaps): the “Key” heading with its black rule, the single-value donut with a big centre number, the source/© line and the panda logo, the upper-case headline (stated but not drawn), and the rule that the one secondary colour is chosen per subject.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Single-colour-scheme “Do” example and the LPR chart conventions: a short upper-case bold condensed headline stating the fact; flat columns in one hue and its tints; a thin black y axis with small ticks at 0–100 in condensed numerals; a black baseline; no gridlines; a “Key” under the chart; the source stated.',
      current: 'Flint draws the columns in the aqua tints with the black axis and ticks the theme states. The headline stays in sentence case, the key takes the field name as its title, and there is no source.',
      expected: 'The guide’s example restyled with Living Planet Report data: headline in capitals, tinted columns with no x labels (the Key names them), the Key with its rule, the © line.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: LPI,
        semantic_types: { Region: 'Category', Decline: { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Region', y: 'Decline', color: 'Region' },
        title: LPI_TITLE,
        subtitle: LPI_SUB,
      }),
      expectedSpec: signatureExpected(),
      expectedFrame: { footerHtml: keyHtml(LPI.map((row, i) => ({ label: row.Region, color: TINTS[i] }))) + sourceHtml(LPR_SOURCE) },
      observed: 'Flint states more of the house than expected: aqua tints, a thin black y axis with ticks, no gridlines, and white bold condensed values inside the columns. It departs in five places: the headline is in sentence case; the key goes to the right, titled “Region”, though the theme lists only `bottom`; the x labels repeat the key and the longest is cut to “Latin America & …” despite `truncation: wrap`; the deck gains “; Decline (%)”; and there is no source line.',
    },
    {
      id: 'key-legend',
      title: 'A “Key” headed by a rule, one swatch per line, under the chart',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'legend-placement',
      rule: '“Make sure you add a clear legend.” The LPR example: the donut, then its title in bold italic, then an italic “Key” over a full-width black rule, then wide rectangular swatches with labels, one per line.',
      current: '`legend.title: "always"` writes the field name (“Activity”), not the word “Key”; there is no rule under the key title; swatches are small dots. The theme asks for a vertical key at the bottom-left (where Flint puts it instead is the next gap).',
      expected: 'The LPR donut with white percentages in the segments, its title and its Key below.',
      proposal: '`legend.heading: { text: "Key", rule: "below" }` and `legend.swatch: { shape: "rect", width, height }`; `layout.titleBlock.position: "bottom"` already exists for the caption-style title.',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: FOOTPRINT,
        semantic_types: { Activity: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Activity' },
        title: 'Humanity’s Ecological Footprint by activities',
      }),
      expectedSpec: donutExpected(),
      expectedFrame: { footerHtml: keyHtml(FOOTPRINT.map((row, i) => ({ label: row.Activity, color: TINTS[i] })), { title: 'Humanity’s Ecological Footprint by activities', font: SERIF }) + sourceHtml('© WWF, Living Planet Report 2020') },
      observed: 'Flint draws the donut as a thin ring with a key on the right titled “Activity” (small round swatches); its white value labels do not fit the ring — most are clipped to fragments (“1”, “%”) and only “14%” lands, in black, outside. Expected: a thick donut with white condensed percentages in every segment, the bold italic title under it, then “Key” over a black rule and wide rectangular swatches.',
    },
    {
      id: 'big-number-donut',
      title: 'A single-value donut: one arc against grey, the number in the middle',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'pie-rules',
      rule: 'Single-value donuts use one full-strength colour against light grey with a big bold condensed percentage in the centre (“67%”, the % smaller).',
      current: 'Two rows (the share and the rest) become two categories: two inks from the palette and a key. ThemeSpec has a `display` type role for big numbers but no way to say “the remainder is context grey” or “print the part in the hole”.',
      expected: 'An aqua arc for 67%, light grey for the rest, “67%” in heavy condensed type in the centre, no key.',
      proposal: '`marks.partToWhole: { remainder: "context", centreLabel: "display" }`, with the remainder named in the chart spec (`chart_spec.emphasis` on the part).',
      flint: flintInput(theme, {
        chartType: 'Donut Chart',
        data: [{ Part: 'Lost', Share: 67 }, { Part: 'Remaining', Share: 33 }],
        semantic_types: { Part: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Part' },
        title: 'Freshwater wildlife has fallen by two-thirds',
        subtitle: 'Average decline in monitored freshwater populations since 1970',
      }),
      expectedSpec: bigNumberExpected(),
      observed: 'Flint: a thin two-tone aqua ring with no number, and a key titled “Part” listing “Lost” and “Remaining”. Expected: one aqua arc against light grey and “67%” set huge in the hole — the number is the chart.',
    },
    {
      id: 'caps-headline',
      addressed: { stage: 'T3', note: 'The headline is set in capitals (`headline.case: "upper"`).' },
      title: 'Headlines in the WWF face, upper case',
      kind: 'realization',
      severity: 'high',
      probe: 'type-case',
      rule: '“WWF font must be upper case in headings”: short bold condensed headlines stating the fact (“RHINO POACHING INCREASES >9,300%”).',
      current: 'The theme states `type.headline: { family: "WWF, Arial Narrow…", weight: "bold", case: "upper" }`; the author writes the headline in sentence case.',
      expected: 'The headline in bold condensed capitals.',
      proposal: 'Realise `TypeRole.case` for the headline.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: 'Country', x: 'Population' },
        title: 'India and China hold over a third of humanity',
        subtitle: 'Population, millions, 2023',
      }),
      expectedSpec: capsExpected(),
      observed: 'Flint uses the condensed face but sets “India and China hold over a third of humanity” in sentence case over two lines: `case: "upper"` is ignored. Expected: the same words in capitals on one line.',
    },
    {
      id: 'source-and-logo',
      title: 'Source line and panda logo',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'brand-mark',
      rule: '“Reference your source”: “© WWF, Living Planet Report 2020”, “Sourced from …”. Standalone infographics carry the WWF panda logo in the top-left corner.',
      current: 'No chart-spec slot for a source; no furniture kind for a logo (the only kinds are rules and a tab).',
      expected: 'The logo top-left above the headline (a placeholder box stands in for the panda), the source line at the bottom.',
      proposal: '`chart_spec.source`; `furniture: { kind: "logo", svg | url, anchor: "topLeft", height }`.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: 'Country', x: 'Population' },
        title: 'INDIA AND CHINA HOLD OVER A THIRD OF HUMANITY',
        subtitle: 'Population, millions, 2023',
      }),
      expectedSpec: logoExpected(),
      expectedFrame: { headerHtml: pandaBox },
      observed: 'With the headline typed in capitals by hand Flint matches above the plot; it has nowhere to put the logo above the headline or the source/© line under the chart. The expected panel uses a black box as a stand-in for the panda.',
    },
    {
      id: 'key-placement-ignored',
      title: 'The key goes to the right although the theme only allows the bottom',
      kind: 'realization',
      severity: 'medium',
      probe: 'legend-placement',
      rule: 'The legend sits below the chart (the LPR Key); the brand examples never put it beside the plot.',
      current: 'The theme states `legend.placement: ["bottom"]`, `direction: "vertical"`, `align: "start"` — a single acceptable position.',
      expected: 'The key under the plot, left-aligned.',
      proposal: 'Treat the placement list as the set of allowed positions: if none fits, shrink or wrap the key in the last allowed one rather than move to a position the house did not list (and report the departure).',
      ...groupedProbe(theme, t, { palette: [AQUA, '#66BDBD', AQUA_DARK], title: 'THE US AND CHINA SHARED THE TOP OF THE MEDAL TABLE' }),
      observed: 'Flint puts the key to the right of the plot, titled “Medal”, though `bottom` is the only placement the theme allows; the gallery does the same for the stacked bars, the area chart and the pie (the line chart alone gets its key at the bottom). Expected: a short key under the plot.',
    },
    {
      id: 'subject-hue',
      title: 'The one secondary colour is chosen per subject',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'subject-palette',
      rule: '“The secondary colour must be relevant to the subject”; “avoid using more than two colours from the secondary palette in a single layout”; a full-strength colour must appear before any tint. Footprint charts are berry, freshwater teal, rhino poaching brown.',
      current: 'A ThemeSpec fixes one categorical list; this theme picks Aqua. A WWF layout about land use would need a second theme with the same rules and a different hue.',
      expected: 'One house, with the hue as a parameter and the tints derived from it.',
      proposal: '`ink.series.scheme: { hue: "#009191", tints: [1, 0.6, 0.3], allowSecond: true }` with the hue overridable per chart (`chart_spec.hue` or a theme parameter).',
    },
    {
      id: 'condensed-face',
      title: 'The WWF display face cannot be loaded',
      kind: 'visual-quality',
      severity: 'low',
      probe: 'font-source',
      rule: 'Headings, key numbers and infographic labels use the proprietary bold condensed WWF font; Arial (Narrow) Bold where it cannot be embedded.',
      current: 'ThemeSpec names a family but cannot ship or point to a font file; every panel here falls back to Arial Narrow, which only works because this machine has it.',
      expected: 'The WWF face where licensed, Arial Narrow Bold otherwise.',
      proposal: '`type.fonts: [{ family, src, weight }]` so a house can bring its face, with the fallback stated next to it.',
    },
  ],
};

export default wwf;
