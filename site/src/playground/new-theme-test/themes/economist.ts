import type { ThemeSpec } from 'flint-chart';
import research from '../research/economist.json';
import { flintInput, footerProbe, forecastProbe, highlightProbe, scatterProbe, UNEMPLOYMENT, withChartSource } from '../probes';
import { titled, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const RED = '#E3120B';

const t: HouseTokens = {
  font: "'Econ Sans Cnd', 'Helvetica Neue', Arial, sans-serif",
  titleFont: "'Econ Sans', 'Helvetica Neue', Arial, sans-serif",
  text: '#0C0C0C',
  muted: '#3F5661',
  grid: '#B7C6CF',
  axis: '#0C0C0C',
  background: '#FFFFFF',
  palette: ['#006BA2', '#3EBCD2', '#EBB434', '#379A8B', '#DB444B', '#9A607F'],
  highlight: '#3EBCD2',
  context: '#006BA2',
  titleSize: 17,
  subtitleSize: 14,
  subtitleColor: '#0C0C0C',
  labelSize: 12,
  sourceSize: 11,
  yRight: true,
  lineWidth: 2,
};

/** The guide's web chart: the shipped preset, with the web palette order and the top rule. */
const theme: ThemeSpec = {
  extends: 'economist',
  id: 'economist-guide',
  label: 'The Economist (2017 guide)',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: '#0C0C0C', secondary: '#3F5661', muted: '#758D99' },
    structure: { grid: '#B7C6CF', axis: '#0C0C0C', zero: '#0C0C0C' },
    series: {
      categorical: t.palette,
      categoricalExtended: [...t.palette, '#B4BA39', '#D1B07C', '#758D99'],
      // Scatter and bubble charts start with cyan and dark red (R7).
      byMark: { point: { categorical: ['#3EBCD2', '#DB444B', '#EBB434', '#006BA2', '#379A8B', '#9A607F'] } },
      overflow: '#758D99',
      sequential: { stops: ['#98DAFF', '#7BBFFC', '#5DA4DF', '#3D89C3', '#1270A8', '#00588D'], space: 'lab' },
    },
    accent: RED,
  },
  type: {
    headline: { family: t.titleFont, size: 17, weight: 'bold', color: '#0C0C0C' },
    deck: { family: t.font, size: 14, color: '#0C0C0C' },
    axisLabel: { family: t.font, size: 12 },
  },
  annotation: { unit: 'never' },
  furniture: [
    // The tab on the canvas's top edge, flush with the headline (F1). The current web charts no longer
    // draw the thin red line along that edge.
    { kind: 'tab', at: 'canvasTop', frame: 'content', align: 'start', color: RED, width: 26, height: 9 },
  ],
  // The source line, as the guide sets it (S1); the chart gives the words.
  source: { leadIn: 'Source:' },
};

/** The signature web chart, drawn the way the guide's page 7 specimen is. */
function signatureExpected() {
  const years = UNEMPLOYMENT;
  return {
    ...titled({ ...t }, {
      data: { values: years },
      mark: { type: 'line', strokeWidth: 2, color: t.palette[0] },
      encoding: {
        x: {
          field: 'Year', type: 'quantitative', title: null, scale: { domain: [2000, 2023], nice: false },
          axis: {
            values: [2000, 2005, 2010, 2015, 2020, 2023], domain: true, domainColor: t.axis, ticks: true, tickSize: 5, tickColor: t.axis,
            labelExpr: "datum.value % 100 === 0 || datum.value === 2000 ? format(datum.value, 'd') : slice(format(datum.value, 'd'), 2)",
          },
        },
        y: {
          field: 'Unemployment (%)', type: 'quantitative', title: null, scale: { domain: [0, 10] },
          axis: { orient: 'right', labelAlign: 'right', labelBaseline: 'bottom', labelPadding: -2, labelOffset: -2, tickCount: 5, gridColor: t.grid ?? undefined },
        },
      },
    }, {
      title: 'Twice bitten',
      subtitle: 'United States, unemployment rate, %',
      footer: ['Source: Bureau of Labor Statistics'],
      footerRight: '*Annual average',
    }),
  };
}

const signatureFlint = () => flintInput(theme, {
  chartType: 'Line Chart',
  data: UNEMPLOYMENT,
  semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
  encodings: { x: 'Year', y: 'Unemployment (%)' },
  title: 'Twice bitten',
  subtitle: 'United States, unemployment rate, %',
});

const topRule = `<div style="position:relative;height:12px;margin:0 14px"><div style="position:absolute;top:0;left:0;right:0;height:1px;background:${RED}"></div><div style="position:absolute;top:0;left:0;width:26px;height:9px;background:${RED}"></div></div>`;

const economist: StyleGuideTheme = {
  id: 'economist',
  org: 'The Economist',
  research: research as ResearchRecord,
  theme,
  notes: [
    "Flint ships an `economist` preset, so this house starts from it and corrects it against the 2017 PDF: the web palette order (dark blue, cyan, yellow, green, red, purple — the preset had a darker red and a different purple), a white web background instead of the host's surface, and the guide's type sizes (17px bold headline, 14px regular subtitle).",
    "The preset already states most of the house: right-hand value axis (`structure.axis.measure.placement: opposite`), horizontal measure grid only, black baseline, units in the deck (`annotation.axisTitles: omit`), key on top or at the series ends, the red tab.",
    "The older web charts' thin red rule across the top would be a rule on the canvas's top edge (`at: canvasTop`); the current charts draw only the tab on that edge, so the house does too. The guide's Econ Sans faces are proprietary, so every panel falls back to Helvetica/Arial.",
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Thin red rule across the top with the red tab at its left; bold headline, regular subtitle with units; y labels right-aligned at the right edge, sitting on top of their gridlines; x baseline in black with ticks hanging below; years abbreviated after the first; source bottom-left, footnote bottom-right.',
      current: 'Flint draws the red tab, the right-hand axis and units in the deck. Its y labels sit outside the plot beside each gridline (vertically centred on it), years print in full, and there is no source line.',
      expected: 'Labels inside the plot, above each gridline at the right edge, so the gridlines run the full width under them; the source line and footnote close the chart.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Twice bitten',
        subtitle: 'United States, unemployment rate, %',
      }),
      expectedSpec: signatureExpected(),
      expectedFrame: { headerHtml: topRule },
      observed: 'Flint (left): tab and headline right, but the thin red rule sits under the deck; y labels outside the plot with % on each; x labels every two years in full; no ticks hanging from the baseline; no source. Expected (right): rule across the top, labels on the gridlines, “2000 05 10 15 20 23”, source and footnote.',
    },
    {
      id: 'labels-on-gridlines',
      title: 'Value labels sit on top of their gridlines, inside the plot',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'axis-label-on-gridline',
      rule: '“Y-axis labels sit just above the gridlines at the right edge … no y-axis line and no y tick marks — gridlines extend under the labels.”',
      current: 'ThemeSpec can put the axis on the right (`placement: opposite`) and drop its line and ticks, but it has no word for where a label stands relative to its gridline. Flint centres each label on its line, outside the plot.',
      expected: 'Each label right-aligned at the plot edge with its baseline on the gridline, the gridline running beneath it.',
      proposal: '`structure.axis.measure.labelPosition: "besideTick" | "aboveGridline"` — realised in Vega-Lite as `labelAlign: right`, `labelBaseline: bottom`, a negative `labelPadding`.',
      flint: signatureFlint(),
      expectedSpec: signatureExpected(),
      expectedFrame: { headerHtml: topRule },
      observed: 'Same pair as the signature card. Flint (left): the value labels stand outside the plot on the right, each centred on its gridline. Expected (right): each label sits on top of its gridline at the right edge, inside the plot, the gridline running under it.',
    },
    {
      id: 'year-abbreviation',
      title: 'Years abbreviated to two digits after the first',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'date-label-format',
      rule: '“1985 90 95 2000 05 10 16” — years shortened after the first label and spelled out again at a century change.',
      current: 'No ThemeSpec field governs temporal tick text; Flint prints every year in full.',
      expected: 'First year and century years in full, the rest as two digits.',
      proposal: '`annotation.dateLabels: { abbreviateRepeated: true }` (a house rule about date ticks, not a d3 format string).',
      flint: signatureFlint(),
      expectedSpec: signatureExpected(),
      expectedFrame: { headerHtml: topRule },
      observed: 'Same pair as the signature card. Flint (left): 2000 2002 … 2022 in full. Expected (right): 2000 05 10 15 20 23.',
    },
    {
      id: 'source-line',
      addressed: { stage: 'S1', note: '“Source:” bottom-left in the footnote role. The footnote explanations at the right stay open.' },
      title: 'Source line bottom-left, footnote bottom-right',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: 'Every chart closes with “Source:”/“Sources:” in light 6.5pt at 75% black, bottom-left, with footnote explanations (*, †) right-aligned on the same line.',
      current: 'The chart spec has `title` and `subtitle` only, so there is nowhere to write a source; `type.footnote` exists in ThemeSpec but nothing draws it.',
      expected: 'A footer line under the block: source at the left, footnote at the right, in the footnote type role.',
      proposal: 'Add `chart_spec.source` and `chart_spec.notes[]`; realise them with `type.footnote` and a new `layout.footer: { align, noteAlign }` in the theme.',
      ...footerProbe(theme, t, {
        footer: ['Source: UN World Population Prospects'],
        footerRight: '*Estimates',
      }),
    },
    {
      id: 'highlight',
      title: 'One bar picked out in cyan against dark blue',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'highlight',
      rule: 'Single-series bar charts are dark blue; the bar the story is about is cyan (guide p13).',
      current: 'Neither the theme nor the chart spec can mark one category as the subject; every bar takes `ink.series.single`.',
      expected: 'Nigeria in cyan, the other bars in the house dark blue.',
      proposal: '`chart_spec.emphasis: { field, values }` with the theme stating `ink.series.emphasis` / `ink.series.context`.',
      ...highlightProbe(theme, t),
    },
    {
      id: 'forecast-band',
      title: 'Forecast periods as a grey band labelled FORECAST',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'forecast-style',
      rule: 'Forecast/estimate periods are a grey shaded vertical band labelled “FORECAST” in light uppercase; the line itself stays solid.',
      current: 'Flint has no notion of a forecast period: the projected series is told apart with a dash and a key, as any series would be.',
      expected: 'One continuous line, the projected years under a pale grey band with an uppercase label.',
      proposal: 'A semantic marker for estimated/forecast rows (`semantic_types` status) plus `annotation.forecast: { style: "band" | "dash" | "lighter", label }` in the theme.',
      ...forecastProbe(theme, { ...t, context: '#B7C6CF' }, { band: true, dash: [], projectedColor: t.palette[0], label: false }),
    },
    {
      id: 'scatter-order',
      addressed: { stage: 'R7', note: 'The scatter order is stated as `ink.series.byMark.point`; the half-opaque dots are not a colour rule and stay open.' },
      title: 'Scatter plots use their own colour order and half-opaque dots',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'per-mark-palette',
      rule: 'Scatter/bubble colour order is cyan, dark red, yellow, dark blue, teal, mauve; dots are 4px at 50% opacity, highlighted dots at 100%.',
      current: 'ThemeSpec has one categorical sequence for every mark, and `geometry.point` has no opacity, so the scatter takes the bar order at full opacity.',
      expected: 'Scatter series start with cyan and dark red, dots half transparent so overlaps read.',
      proposal: 'Allow `geometry.point.palette` (or a `variants` entry keyed on `markChannel: position` that may carry `ink.series`) and `geometry.point.opacity`.',
      ...scatterProbe(theme, t, { palette: ['#3EBCD2', '#DB444B', '#EBB434', '#006BA2', '#379A8B'], opacity: 0.5, size: 40 }),
    },
    {
      id: 'top-rule',
      addressed: { stage: 'F1', note: 'A rule can sit on the canvas top edge (`at: "canvasTop"`, `frame: "canvas"`) with the tab hanging from it. The house now draws the tab alone on that edge: the current Economist web charts no longer carry the thin line.' },
      title: 'The red header rule is drawn under the deck, not across the top',
      kind: 'realization',
      severity: 'medium',
      probe: 'brand-rule',
      rule: 'Web charts carry a thin red line across the entire top edge, with the thicker tab at its left end.',
      current: 'Stated as `furniture: [{ kind: "headerRule" }, { kind: "mastheadTab" }]`. The tab draws at the top-left, but the header rule is placed between the title block and the plot — a rule under the headline, not a rule closing the top of the chart.',
      expected: 'A 1px red rule the width of the chart block at its very top, the 26×9px tab hanging from its left end, then the headline.',
      proposal: '`furniture.headerRule` needs an anchor: `edge: "chartTop" | "belowTitle"` (both exist in houses — the Economist rules the top, several reports rule under the title).',
      observed: 'In every gallery tile the red line sits under the deck and above the plot, and spans only the plot width; the tab floats alone above the headline.',
      flint: signatureFlint(),
      expectedSpec: signatureExpected(),
      expectedFrame: { headerHtml: topRule },
    },
    {
      id: 'measure-restated',
      addressed: { stage: 'A4', note: 'The deck no longer appends a title its author’s deck already names, unit included (A4).' },
      title: 'The deck repeats the measure the author already named',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'axis-title-relocation',
      rule: 'No y-axis title: the subtitle states measure and units (“Ten-year government-bond yields, %”); tick labels are bare numbers.',
      current: '`annotation.axisTitles: "omit"` appends the axis title to the deck unconditionally, so “United States, unemployment rate, %” becomes “…, %; Unemployment (%)”. The shipped preset also sets `unit: "everyTick"`, which prints % on every tick against the guide; this theme corrects that to `never`.',
      expected: 'The deck as written; bare tick numbers.',
      proposal: 'Let the author mark the deck as already naming the measure (`chart_spec.subtitleNamesMeasure` or a `{measure}` placeholder in the subtitle), rather than guessing from prose.',
      observed: 'Every gallery tile carries a duplicated measure in the deck (“EV share (%)” under a title that already says “(%)”).',
      flint: signatureFlint(),
      expectedSpec: signatureExpected(),
      expectedFrame: { headerHtml: topRule },
    },
    {
      id: 'sort-lost-with-labels',
      title: 'A value sort is dropped once the theme adds value labels',
      kind: 'realization',
      severity: 'high',
      probe: 'sort-lost-with-labels',
      rule: 'Bar charts of categories are ranked by value (the guide’s horizontal bar examples).',
      current: 'With `y: { field: "Country", sortBy: "x", sortOrder: "descending" }` and a theme whose `dataLabels.show` is `whenTheyFit`, Flint writes `sort: "-x"` into the bar layer and the label layer. Vega-Lite cannot union two `sum`-sorted domains, warns “Dropping sort property”, and the bars fall back to alphabetical order. Without a theme the same chart sorts.',
      expected: 'Bars ranked by value with or without value labels.',
      proposal: 'Emit the sort once on the shared (outer) encoding, or with `op: "max"` so unioned domains keep it.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: [['Bangladesh', 173], ['Brazil', 216], ['China', 1426], ['India', 1429], ['Nigeria', 224], ['United States', 340]].map(([Country, Population]) => ({ Country, Population })),
        semantic_types: { Country: 'Country', Population: 'Quantity' },
        encodings: { y: { field: 'Country', sortBy: 'x', sortOrder: 'descending' }, x: 'Population' },
        title: 'Ranked by value, or not',
        subtitle: 'Population, millions, 2023',
      }),
      observed: 'Bangladesh at the top, United States at the bottom: alphabetical, not ranked.',
      expectedSpec: titled(t, {
        data: { values: [['India', 1429], ['China', 1426], ['United States', 340], ['Nigeria', 224], ['Brazil', 216], ['Bangladesh', 173]].map(([Country, Population]) => ({ Country, Population })) },
        encoding: { y: { field: 'Country', type: 'nominal', sort: null, title: null }, x: { field: 'Population', type: 'quantitative', title: null, axis: { orient: 'top' } } },
        layer: [
          { mark: { type: 'bar', color: t.palette[0] } },
          { mark: { type: 'text', align: 'right', dx: -4, color: '#ffffff', fontSize: 11 }, encoding: { text: { field: 'Population', type: 'quantitative', format: ',' } } },
        ],
      }, { title: 'Ranked by value, or not', subtitle: 'Population, millions, 2023' }),
    },
    {
      id: 'heatmap-row-labels',
      addressed: { stage: 'A1', note: 'The city names are never turned for the month names (A1), and the months sit flat a little smaller.' },
      title: 'Heatmap row names are turned diagonally',
      kind: 'realization',
      severity: 'medium',
      probe: 'turned-row-labels',
      rule: 'Labels are horizontal wherever they fit (the guide never turns category names on a vertical axis).',
      current: 'In the heatmap tile the city names on the y axis are drawn at −45°, as if they were crowded x labels; the month labels on x are turned too, although three-letter months fit their bands.',
      expected: 'City names horizontal, right-aligned beside their rows; months horizontal under their columns.',
      proposal: 'The label plan should never turn y-axis band labels (they are read left to right already), and should measure x band labels before turning them.',
      observed: 'Seen in the gallery’s “Average monthly temperature by city” tile under this theme.',
    },
  ],
};

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(economist, 'Bureau of Labor Statistics', ['source-line']);

export default economist;

