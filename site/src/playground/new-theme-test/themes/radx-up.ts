import type { ThemeSpec } from 'flint-chart';
import research from '../research/radx-up.json';
import { flintInput, highlightProbe, MEDALS, POPULATION, withChartSource } from '../probes';
import { titled, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Trebuchet MS', 'Fira Sans', 'Lucida Grande', sans-serif";
const INK = '#484D57';
const DUKE = '#00539B';
const UNC = '#4B9CD3';
const EGGPLANT = '#510C5D';
const TEAL = '#14A9A2';
const DARK_GRAY = '#484D57';
const ORANGE = '#F47E28';
const GRID = '#E5EDF5';
const BRAND = [DUKE, UNC, EGGPLANT, TEAL, DARK_GRAY];

const t: HouseTokens = {
  font: FONT,
  text: INK,
  muted: INK,
  grid: GRID,
  axis: INK,
  background: '#FFFFFF',
  palette: BRAND,
  highlight: ORANGE,
  context: DUKE,
  titleSize: 18,
  titleWeight: 'normal',
  subtitleSize: 12,
  subtitleColor: INK,
  labelSize: 10,
  sourceSize: 9,
};

const theme: ThemeSpec = {
  id: 'radx-up',
  label: 'RADx-UP',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: INK, secondary: INK, muted: INK, inverse: '#FFFFFF' },
    structure: { grid: GRID, axis: INK, zero: INK },
    series: {
      single: DUKE,
      categorical: BRAND,
      // The five main colours, then their first tints in the same order, then orange (the guide's highlight).
      categoricalExtended: [...BRAND, '#3275AF', '#6EAFDB', '#733C7D', '#42BAB4', '#6C7078'],
      overflow: '#B5B7BB',
      sequential: { stops: ['#E5EDF5', '#CCDCEB', '#99BAD7', '#6697C3', '#3275AF', DUKE], space: 'lab', endpointsAgainstSurface: true },
      status: { positive: '#9DC858', neutral: '#DEC500', negative: '#CD3B44' },
      // Ordered subcategories take Duke Blue tints, darkest first; the gridline tint is left out (R10).
      ordinal: { stops: [DUKE, '#3275AF', '#6697C3', '#99BAD7'], space: 'lab' },
      selection: { signed: 'categorical', statusUse: 'thresholdOnly', ordered: 'ramp' },
    },
    accent: ORANGE,
  },
  type: {
    // An optional figure number above the title, regular, ALL CAPS (F2).
    kicker: { family: FONT, size: 11, weight: 'regular', case: 'upper', color: INK },
    headline: { family: FONT, size: 18, weight: 'regular', case: 'asIs', color: INK },
    deck: { family: FONT, size: 12, weight: 'regular', color: INK },
    axisLabel: { family: FONT, size: 10, weight: 'regular', color: INK },
    axisTitle: { family: FONT, size: 10, weight: 'bold', style: 'italic', case: 'upper', color: INK },
    keyLabel: { family: FONT, size: 10, color: INK },
    valueLabel: { family: FONT, size: 11, weight: 'regular', color: INK },
    annotation: { family: FONT, size: 11, color: INK },
    footnote: { family: FONT, size: 9, color: INK },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1, ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit' },
    },
    grid: { measure: 'full', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: {
    // "The width between bars is no more than 35% of a bar's width": 1 / 1.3 of the step.
    bandFraction: 0.77,
    strokeWeight: 2,
    interpolation: 'linear',
    cornerRadius: 0,
    redundantEncoding: 'always',
    redundantChannels: ['shape'],
  },
  geometry: {
    band: { fraction: 0.77, cornerRadius: 0 },
    line: { width: 2, interpolation: 'linear' },
    point: { presence: 'full', size: 36 },
  },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['top'], direction: 'horizontal', title: 'always', titlePosition: 'inline', align: 'start' },
  dataLabels: { show: 'always', placement: 'outsideMark', inkMode: 'fixed' },
  annotation: { axisTitles: 'always', axisTitlePlacement: 'rotated', unitsInAxisTitle: true, unit: 'never' },
  layout: { titleBlock: { anchor: 'start', gap: 'normal', deckGap: 'tight' } },
  // The source line, as the guide sets it (S1); the chart gives the words.
  source: {},
};

const TOP5 = POPULATION.slice(0, 5);
const SIG_TITLE = 'India and China are the most populous countries';
const SIG_SUBTITLE = 'Population of the five most populous countries in 2023, in millions';

const legendRow = (title: string) => ({
  orient: 'top',
  direction: 'horizontal',
  title,
  titleOrient: 'left',
  titleFontWeight: 'normal',
  titleFontSize: 10,
  titleColor: INK,
  titleFont: FONT,
  labelFontSize: 10,
  labelColor: INK,
  symbolType: 'square',
  symbolSize: 60,
  columnPadding: 10,
  offset: 14,
});

const axisTitleStyle = { titleFont: FONT, titleFontSize: 10, titleFontWeight: 'bold', titleFontStyle: 'italic', titleColor: INK };

function signatureExpected() {
  const spec = titled(t, {
    data: { values: TOP5 },
    encoding: {
      x: {
        field: 'Country', type: 'nominal', sort: null, scale: { paddingInner: 0.23, paddingOuter: 0.4 },
        axis: { labelAngle: 0, title: 'COUNTRY', titleAnchor: 'start', titleAlign: 'left', titlePadding: 8, domainColor: INK, domain: true, ...axisTitleStyle },
      },
      y: {
        field: 'Population', type: 'quantitative', scale: { domain: [0, 1600] },
        axis: { title: 'POPULATION (MILLIONS)', titleAnchor: 'end', titleAlign: 'right', titlePadding: 10, labelAlign: 'left', labelPadding: 30, tickCount: 4, ...axisTitleStyle },
      },
    },
    layer: [
      { mark: { type: 'bar' }, encoding: { color: { field: 'Country', type: 'nominal', sort: null, scale: { range: BRAND }, legend: legendRow('Country:') } } },
      { mark: { type: 'text', baseline: 'bottom', dy: -4, fontSize: 11, color: INK }, encoding: { text: { field: 'Population', type: 'quantitative', format: ',.0f' } } },
    ],
  }, { title: SIG_TITLE, subtitle: SIG_SUBTITLE });
  return { ...spec, config: { ...(spec.config as object), title: { ...((spec.config as Record<string, unknown>).title as object), subtitlePadding: 2 } } };
}

const logo = `<span style="font-family:${FONT};font-weight:700;font-size:15px;letter-spacing:0.3px;color:${INK}">RAD<span style="display:inline-block;background:${UNC};color:#fff;padding:0 2px;margin:0 1px;font-size:12px">x</span>UP<span style="color:${TEAL};font-size:15px"> ⇧</span></span>`;

const sourceFooter = (source: string, notes: string) =>
  `<div style="display:flex;justify-content:space-between;align-items:last baseline;gap:16px;margin:0 14px 8px;font-family:${FONT};color:${INK}">`
  + `<div style="font-size:9px;line-height:11px"><div>Source: ${source}</div><div style="margin-top:3px">Notes: ${notes}</div></div>`
  + `<div style="line-height:11px">${logo}</div></div>`;

const SIG_FOOTER = sourceFooter('United Nations, World Population Prospects 2022.', 'Mid-year estimates for 2023.');

// Example 5 — Clustered Bar Chart: horizontal clusters, the x title flush left under the axis, the y title rotated at the top.
const MEDAL_ROWS = MEDALS.filter((row) => ['United States', 'China', 'Japan'].includes(row.Country));
const MEDAL_ORDER = ['Gold', 'Silver', 'Bronze'];

function clusteredExpected(palette: string[], legendTitle: string) {
  return titled(t, {
    data: { values: MEDAL_ROWS },
    mark: { type: 'bar' },
    encoding: {
      y: {
        field: 'Country', type: 'nominal', sort: ['United States', 'China', 'Japan'], scale: { paddingInner: 0.3 },
        axis: { title: 'COUNTRY', titleAnchor: 'start', titleAlign: 'right', titlePadding: 8, domain: true, domainColor: INK, labelPadding: 6, ...axisTitleStyle },
      },
      yOffset: { field: 'Medal', sort: MEDAL_ORDER, scale: { paddingInner: 0.08 } },
      x: {
        field: 'Count', type: 'quantitative',
        axis: { title: 'MEDALS WON (COUNT)', titleAnchor: 'start', titleAlign: 'left', titlePadding: 8, grid: true, ...axisTitleStyle },
      },
      color: { field: 'Medal', type: 'nominal', sort: MEDAL_ORDER, scale: { domain: MEDAL_ORDER, range: palette }, legend: legendRow(legendTitle) },
    },
  }, { title: 'The United States won the most medals', subtitle: 'Medals won at the Paris 2024 Olympic Games, by type', height: 230 });
}

const clusteredFlint = (title: string) => flintInput(theme, {
  chartType: 'Grouped Bar Chart',
  data: MEDAL_ROWS,
  semantic_types: { Country: 'Country', Medal: { semanticType: 'Category', sortOrder: MEDAL_ORDER }, Count: 'Count' },
  encodings: { y: 'Country', x: 'Count', group: 'Medal' },
  title,
  subtitle: 'Medals won at the Paris 2024 Olympic Games, by type',
});

// 2020 Census, race alone or in combination categories as published (share of the US population, %).
const RACE = [
  { Race: 'White alone', Share: 61.6 },
  { Race: 'Black alone', Share: 12.4 },
  { Race: 'Two or more races', Share: 10.2 },
  { Race: 'Some other race alone', Share: 8.4 },
  { Race: 'Asian alone', Share: 6.0 },
  { Race: 'American Indian/Alaska Native', Share: 1.1 },
  { Race: 'Native Hawaiian/Pacific Islander', Share: 0.2 },
];
const RACE_ORDER = RACE.filter((r) => r.Race !== 'Some other race alone').map((r) => r.Race).concat('Some other race alone');

function otherLastExpected() {
  return titled(t, {
    data: { values: RACE },
    encoding: {
      y: { field: 'Race', type: 'nominal', sort: RACE_ORDER, title: null, scale: { paddingInner: 0.33 }, axis: { domain: true, domainColor: INK, labelLimit: 200 } },
      x: { field: 'Share', type: 'quantitative', scale: { domain: [0, 70] }, axis: { title: 'SHARE OF POPULATION (%)', titleAnchor: 'start', titleAlign: 'left', grid: true, ...axisTitleStyle } },
    },
    layer: [
      { mark: { type: 'bar', color: DUKE } },
      { mark: { type: 'text', align: 'left', dx: 4, fontSize: 11, color: INK }, encoding: { text: { field: 'Share', type: 'quantitative', format: '.1f' } } },
    ],
  }, { title: 'Six in ten Americans identify as White alone', subtitle: 'Race of the US population, 2020 Census, %', height: 200 });
}

const radx: StyleGuideTheme = {
  id: 'radx-up',
  org: 'RADx-UP (NIH) — Data Visualization Style Guide',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch. Stated directly: Trebuchet MS throughout (a system font on Mac and Windows, which is why the guide chose it over the Benton Sans brand face; Fira Sans is the page fallback), every piece of text in #484D57; an 18px regular sentence-case title and 12px subtitle, left-aligned; 10px axis labels; 10px bold-italic ALL-CAPS axis titles (`type.axisTitle` has weight, style and case) with the unit in the title; 11px direct labels outside the bar ends; 9px footnote; pale-blue #E5EDF5 1px gridlines across the measure only; a 1px #484D57 baseline and no value-axis line or ticks; bars filling 77% of their step (a gap no more than 35% of the bar); the five brand colours in the guide\'s order; Duke Blue tints as the ordinal ramp; green / marigold / red indicator colours; orange as the accent; markers on lines.',
    'Approximated: the key is stated as a top, left-aligned row with an inline title — the closest the schema comes to “Legend Title: ■ Label ■ Label”. The extended palette (main colours, then their first tints) is our ordering; the guide gives the tints for maps and gradients, not as a categorical continuation.',
    'Not stated: the source/notes block and the RADx-UP logo sharing its last baseline (no chart-spec slot, no furniture kind); the axis titles\' alignment — flush left under the x axis, at the top of the y axis; one highlighted bar in orange; “Unknown / Other” always last; the optional ALL-CAPS figure number. See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'The format-specification page: Trebuchet MS in #484D57; 18pt title and 12pt subtitle top-left; a “Legend Title: ■ Label …” row above the plot; wide columns in Duke Blue, UNC Blue, Eggplant, CCPH Teal, Dark Gray with 11pt values above them; pale-blue gridlines and a dark 1pt baseline; bold-italic caps axis titles, the x one flush left, the y one at the top; Source/Notes at the bottom left with the logo on the same baseline at the bottom right.',
      current: 'Flint draws the type, colours, grid, baseline and value labels from the theme, and a top key with its title. It has no source, notes or logo, and no field for where an axis title is anchored along its axis.',
      expected: 'The format-spec column chart (p.98) drawn with the five most populous countries.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: TOP5,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'millions' } },
        encodings: { x: 'Country', y: 'Population', color: 'Country' },
        title: SIG_TITLE,
        subtitle: SIG_SUBTITLE,
      }),
      expectedSpec: signatureExpected(),
      expectedFrame: { footerHtml: SIG_FOOTER },
      observed: 'Flint (left) gets the face, ink, colours, gridlines, baseline and 11px values right. It differs in four places: the key falls back to the right of the plot as a titled column (“Country” in bold above the entries) instead of the top row the theme lists as its only placement; the axis titles are bold but neither italic nor capitalised (“Population (millions)”, “Country”); both are centred on their axes; the y ruler runs to 2,000 above the tallest bar. The 18px headline wraps onto two lines in the 360px canvas. No source, notes or logo. Expected (right): “Country: ■ India …” row above the plot, “POPULATION (MILLIONS)” at the top of the y axis, “COUNTRY” flush left, left-aligned y labels, Source/Notes with the wordmark on the Notes baseline.',
    },
    {
      id: 'axis-title-alignment',
      title: 'Axis titles flush left under x, at the top of y',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'axis-title-alignment',
      rule: '“Axis titles — Font: Trebuchet MS Italic; Font weight: Bold; Font size: 10 pt; X-axis align: left; Y-axis align: right or top”, ALL CAPS with the unit in parentheses.',
      current: '`type.axisTitle` states bold, italic, upper case and 10px, and `annotation.axisTitlePlacement: "rotated"` keeps the y title rotated. Nothing says where along its axis a title sits; Flint centres both.',
      expected: 'Example 5 (Clustered Bar Chart): “MEDALS WON (COUNT)” starting at the left end of the x axis, the rotated “COUNTRY” reading up from the top of the y axis.',
      proposal: '`annotation.axisTitleAlign: { x: "start" | "center" | "end", y: "start" | "center" | "end" }` (realised as Vega-Lite `titleAnchor` / `titleAlign`).',
      flint: clusteredFlint('The United States won the most medals'),
      expectedSpec: clusteredExpected(BRAND, 'Medal:'),
      observed: 'Flint centres “Country” and “Count” on their axes (and writes them in mixed case, upright). Expected: “MEDALS WON (COUNT)” starts at the left end of the x axis and “COUNTRY” reads up to the top of the y axis, as on p.28. The clusters, gaps, top key row and pale grid otherwise agree; Flint adds value labels, which the guide prefers too.',
    },
    {
      id: 'axis-title-type',
      addressed: { stage: 'T3', note: 'Axis titles are bold italic capitals: the italic since T1, the case since T3.' },
      title: 'Axis titles lose their italic and their capitals',
      kind: 'realization',
      severity: 'medium',
      probe: 'type-case',
      rule: 'Axis titles are Trebuchet MS Bold Italic 10pt, ALL CAPS, unit in parentheses: “Y-AXIS TITLE (UNIT)”.',
      current: 'Stated as `type.axisTitle: { weight: "bold", style: "italic", case: "upper" }`. Grounding keeps the weight and the italic, but the Vega-Lite realisation writes no `titleFontStyle` for axes, and `TypeRole.case` is not read anywhere — so the title is drawn bold, upright and in the field’s own case.',
      expected: '“POPULATION (MILLIONS)”, “COUNTRY” in bold italic capitals.',
      proposal: 'Realise `axisTitle.style` as `titleFontStyle`, and `case` as a text transform on every role that states it (headline, deck, axis titles, key title).',
      observed: 'In the signature and clustered-bar panels and in every gallery tile the axis titles read “Population (millions)”, “Count”, “Country”, “Anomaly (°C)” — bold, upright, mixed case.',
    },
    {
      id: 'legend-row',
      title: 'The “Legend Title:” row falls back to the right',
      kind: 'realization',
      severity: 'medium',
      probe: 'legend-placement',
      rule: 'The key sits above the plot, under the subtitle, as one left-aligned row starting with the title in regular weight: “Legend Title: ■ Label ■ Label …”.',
      current: 'Stated as `legend: { placement: ["top"], title: "always", titlePosition: "inline", align: "start" }`. The top row is drawn when it fits; when it does not, Flint moves the key to the right although the house listed no other placement. The title is set in bold, without the colon.',
      expected: 'A top row in every case — wrapping onto a second row if needed — with “Country:” in regular weight.',
      proposal: 'Honour a one-item `legend.placement` list as a constraint (wrap the row, or report a departure); add `legend.titleSuffix: ":"` and a `type.keyTitle` role.',
      observed: 'Signature: five countries do not fit one 360px row, so the key becomes a right-hand column with “Country” stacked above it. In the clustered bars and the gallery’s medal, EV and pie tiles the row is drawn inline at the top, titled “Medal”, “Country”, “Browser” in bold.',
    },
    {
      id: 'source-line',
      addressed: { stage: 'S1', note: '“Source: …” bottom-left in the footnote role. The Notes line and the logo on its baseline stay open.' },
      title: 'Source and Notes block, logo on its last baseline',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: 'Source is required: bottom-left, 9pt on 11pt leading, “Source: …” then “Notes: …” with 3px extra space above; “Baseline of logotype aligns with baseline of last line of Source/Notes”.',
      current: 'No chart-spec slot for a source or notes; `type.footnote` (9px) is stated but nothing draws it. No furniture kind for a logo, nor a way to align it to a text baseline.',
      expected: 'See the footer of the signature’s expected chart: two 9px lines at the left, the RADx-UP wordmark at the right sitting on the Notes line (placeholder artwork, not the brand logo).',
      proposal: '`chart_spec.source` / `chart_spec.notes[]` drawn in `type.footnote`; `furniture: { kind: "logo", src, anchor: "bottomRight", align: "lastFootnoteBaseline" }`.',
    },
    {
      id: 'highlight-orange',
      title: 'One bar highlighted in orange',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'highlight',
      rule: '“Need a highlight color? Use #F47E28 Orange or one of its Tints.” The rest stay in the default colour.',
      current: '`ink.accent` is orange, but nothing in the chart spec can name the bar the story is about, so every bar is Duke Blue.',
      expected: 'Nigeria in orange, the other bars Duke Blue.',
      proposal: '`chart_spec.emphasis: { field, values }` with `ink.series.emphasis` (defaulting to `ink.accent`).',
      ...highlightProbe(theme, t),
      observed: 'Flint: eight Duke Blue bars, nothing marks Nigeria; the headline names a country the chart cannot point to. Expected: Nigeria in orange #F47E28 among Duke Blue bars.',
    },
    {
      id: 'other-last',
      title: '“Other”, “Unknown” and “Missing” always go last',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'residual-last',
      rule: '“Unknown, missing, not applicable, and other categories or subcategories are generally best positioned last (right-most or bottom-most)”; otherwise sort nominal categories by value.',
      current: 'The chart sorts the bars by value (`sortBy: "x"`). Neither the theme nor the semantic types can mark a category as residual, so “Some other race alone” sorts by its size into the middle.',
      expected: 'Bars by value, “Some other race alone” moved to the bottom.',
      proposal: 'A residual marker on the field (`semantic_types: { Race: { semanticType: "Category", residual: ["Some other race alone"] } }`, also detecting “Other / Unknown / N/A”) and a theme rule `labels.residualCategory: "last"`, honoured by any sort.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: RACE,
        semantic_types: { Race: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { y: { field: 'Race', sortBy: 'x', sortOrder: 'descending' }, x: 'Share' },
        title: 'Six in ten Americans identify as White alone',
        subtitle: 'Race of the US population, 2020 Census, %',
      }),
      expectedSpec: otherLastExpected(),
      observed: 'Flint sorts the seven bars by value correctly (the value labels did not cost the sort here), so “Some other race alone” sits fourth, between “Two or more races” and “Asian alone”. Expected: the same ranking with “Some other race alone” at the bottom. Flint also prints “6” where its neighbours read “6.0”-style decimals (“8.4”, “1.1”).',
    },
    {
      id: 'ordinal-ramp',
      addressed: { stage: 'R10', note: 'The house asks for ordered series to take a ramp (`selection.ordered: "ramp"`) and states the Duke Blue tints, darkest first, as `ink.series.ordinal`.' },
      title: 'Ordinal subcategories in Duke Blue tints',
      kind: 'realization',
      severity: 'low',
      probe: 'ordinal-series-ramp',
      rule: '“When the subcategory is nominal use distinct colors for subcategories. When the subcategory is ordinal use blue color gradients for subcategories.” (the “Alternate color scheme” on p.28).',
      current: 'Flint has a rule for ordered series — an `ordinal` series samples the `sequential` ramp — and the theme states the Duke Blue tints as that ramp. But a Category field with a declared `sortOrder` (Gold, Silver, Bronze) is not treated as ordinal for colour, so the grouped bars take the nominal brand set.',
      expected: 'Gold, Silver, Bronze in dark-to-light Duke Blue tints.',
      proposal: 'Let a declared `sortOrder` (or an `ordinal: true` flag on the semantic annotation) make the series ordinal for colour; then sample the ramp from its dark end, skipping stops that sit on the gridline or canvas ink (#E5EDF5 is the grid colour here).',
      flint: clusteredFlint('The United States won the most medals'),
      expectedSpec: clusteredExpected([DUKE, '#6697C3', '#B3CBE2'], 'Medal:'),
      observed: 'Flint: Gold in Duke Blue, Silver in UNC Blue, Bronze in Eggplant — the nominal set, although the order was declared. Expected: Duke Blue → mid tint → pale tint, the “alternate colour scheme” for ordinal subcategories.',
    },
    {
      id: 'figure-number',
      addressed: { stage: 'F2', note: 'The chart’s `label` is set above the title in `type.kicker` (ALL CAPS).' },
      title: 'Figure number in ALL CAPS above the title',
      kind: 'chart-spec',
      severity: 'low',
      probe: 'figure-number',
      rule: 'An optional figure number above the title, regular weight, ALL CAPS (“FIGURE 1”).',
      current: 'No chart-spec slot for a figure label, and no type role for it.',
      expected: 'A small caps “FIGURE 1” line in #484D57, then the 18pt title.',
      proposal: '`chart_spec.label` (“Figure 1”) drawn in a `type.kicker` role.',
    },
    {
      id: 'wrapped-title-indent',
      title: 'Wrapped headlines leave the left edge',
      kind: 'visual-quality',
      severity: 'low',
      probe: 'title-wrapping',
      rule: 'Title and subtitle are left-aligned at the top-left of the chart, on the same edge as the y-axis title and the source.',
      current: '`layout.titleBlock.anchor: "start"` is stated. Single-line headlines start at the chart edge; in several gallery tiles a headline that wraps onto two lines starts further right, over the plot.',
      expected: 'Every headline, wrapped or not, flush with the chart’s left edge.',
      proposal: 'Anchor wrapped headlines to the same frame as single-line ones (the chart bounds, not the plot group).',
      observed: 'Gallery: “Global temperature anomaly / by decade”, “Electricity generation mix / by country”, “World electricity generation by / source” and “Gapminder — life expectancy / vs income” start 25–45px in from the y-axis title, while “Most populous countries” and “US unemployment rate” sit on the edge. The decade labels in the anomaly tile are also turned −45° despite `labels.`.',
    },
  ],
};

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(radx, 'RADx-UP Coordination and Data Collection Center', ['source-line']);

export default radx;
