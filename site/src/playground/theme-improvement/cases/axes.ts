/**
 * The axes and labels cases: category names fitted to their bands, what stands clear of what around
 * the plot, the rule at the foot, the deck, and a signed field on a one-way ramp. Each compares
 * against a snapshot of the code taken before the area began; every case stays in the theme matrix.
 */
import airbnb from '../../new-theme-test/themes/airbnb-visx';
import appleHig from '../../new-theme-test/themes/apple-hig';
import salesforce from '../../new-theme-test/themes/salesforce';
import aws from '../../new-theme-test/themes/aws-cloudscape';
import ebay from '../../new-theme-test/themes/ebay';
import gitlab from '../../new-theme-test/themes/gitlab';
import london from '../../new-theme-test/themes/london-city-intelligence';
import sprout from '../../new-theme-test/themes/sprout-social';
import visa from '../../new-theme-test/themes/visa';
import who from '../../new-theme-test/themes/who';
import bbc from '../../new-theme-test/themes/bbc';
import cfpb from '../../new-theme-test/themes/cfpb';
import economist from '../../new-theme-test/themes/economist';
import jil from '../../new-theme-test/themes/justice-innovation-lab';
import sunlight from '../../new-theme-test/themes/sunlight';
import type { ChartAssemblyInput } from 'flint-chart';
import { chart, gapChart, preview, type FixCase } from './colour';

const PEOPLE = [['India', 1428.6e6], ['China', 1410.7e6], ['United States', 339.9e6], ['Indonesia', 277.5e6], ['Pakistan', 240.5e6]]
  .map(([Country, People]) => ({ Country, People }));
const labelled = (input: ChartAssemblyInput): ChartAssemblyInput =>
  ({ ...input, chart_spec: { ...input.chart_spec, chartProperties: { showValueLabels: true } } } as ChartAssemblyInput);

/** Apple HIG's gap chart as the house was written before AX1: the value axis `opposite`. */
const appleOpposite: ChartAssemblyInput = (() => {
  const input = gapChart(appleHig, 'trailing-is-not-opposite');
  const theme = JSON.parse(JSON.stringify(input.theme_spec));
  theme.structure.axis.measure.placement = 'opposite';
  return { ...input, theme_spec: theme } as ChartAssemblyInput;
})();

export const AXES_CASES: FixCase[] = [
  // A1 — category names: measured as drawn, shrunk to the floor, widened, and only then turned.
  {
    id: 'a1-jil-medals', stage: 'a1', theme: 'Justice Innovation Lab', before: 'baseline',
    title: 'Names that fit flat stay flat',
    look: 'Before, the house’s flat labels were refused and turned −45° (“United States” was measured whole, though the layout had broken it onto two lines). After, the names are measured in their face, a little smaller than stated (15px, the floor is ¾ of it) and “United States” breaks over two lines.',
    input: gapChart(jil, 'horizontal-labels'),
  },
  {
    id: 'a1-cfpb-decades', stage: 'a1', theme: 'CFPB', before: 'baseline',
    title: 'Shrunk to the floor, then the bands widen, before the names turn',
    look: 'Nine decades on a 360px phone canvas. Before, “1880s” at 17px turned upright in 24px bands. After, the names shrink to 13px (the house’s floor) and the bands widen to hold them flat, within the stretch the chart allows.',
    input: gapChart(cfpb, 'flat-title-overlap'),
  },
  {
    id: 'a1-aws-months', stage: 'a1', theme: 'AWS Cloudscape', before: 'baseline',
    title: 'Twelve months across a heat map',
    look: 'Before, the month names turned −45°. After, they sit flat under their columns, set smaller, not below the floor.',
    input: gapChart(aws, 'signed-domain-on-sequential'),
  },
  {
    id: 'a1-economist-heatmap', stage: 'a1', theme: 'Economist', before: 'baseline',
    title: 'A heat map’s rows are never turned for its columns',
    look: 'Before, both axes turned −45°: the city names down y took the turn the month names along x were judged to need. After, the months sit flat, set a little smaller, and the cities read across.',
    input: preview('temp-heatmap', economist.theme),
  },
  {
    id: 'a1-facets-guard', stage: 'a1', theme: 'apple', before: 'baseline', expect: 'same',
    title: 'Guard: rulers in small multiples',
    look: 'A crowded continuous ruler still takes the size the layout fitted, so one panel’s “2020” does not run into the next panel’s “2000”. Only names in bands change in A1.',
    input: preview('oecd-facet-16', 'apple'),
  },
  {
    id: 'a1-unthemed-guard', stage: 'a1', theme: 'none', before: 'baseline', expect: 'same',
    title: 'Guard: no theme',
    look: 'A chart without a theme keeps the old estimate and its labels as they were.',
    input: preview('medals-grouped', undefined),
  },
  // A2 — what stands clear of what around the plot.
  {
    id: 'a2-cfpb-key-title', stage: 'a2', theme: 'CFPB', before: 'baseline',
    title: 'The key on its own row, then the flat title',
    look: 'Before, the flat “Anomaly (°C)” ran through the second key entry. After, the key stands clear of the title by the title’s own lift above the plot, its line and a gap — the guide’s two rows.',
    input: gapChart(cfpb, 'flat-title-overlap'),
  },
  {
    id: 'a2-bbc-corner', stage: 'a2', theme: 'BBC', before: 'baseline',
    title: 'The first year clears the lowest value',
    look: 'Before, the “2” at the foot of the ruler sat on “2000”. After, the year labels drop a few pixels, the least that clears it; every label stays on its tick.',
    input: gapChart(bbc, 'zero-line'),
  },
  // A3 — the rule at the foot.
  {
    id: 'a3-bbc-rule', stage: 'a3', theme: 'BBC', before: 'baseline',
    title: 'The footer rule runs under the whole graphic',
    look: 'Before, the rule began at the plot’s left edge and ran past its right, a guessed width. After, it runs from the headline’s left edge to the right margin.',
    input: gapChart(bbc, 'zero-line'),
  },
  {
    id: 'a3-datawrapper-rule', stage: 'a3', theme: 'datawrapper', before: 'baseline',
    title: 'The same in the Datawrapper preset',
    look: 'The grey rule under the chart now spans the graphic, the width of the title above it.',
    input: preview('population', 'datawrapper'),
  },
  {
    id: 'a3-sunlight-source', stage: 'a3', theme: 'Sunlight', before: 'baseline',
    title: 'Above a source line',
    look: 'The rule sits under the chart and above the source, which keeps the foot.',
    input: gapChart(sunlight, 'source-line'),
  },
  // A4 — a measure named once.
  {
    id: 'a4-bbc-deck', stage: 'a4', theme: 'BBC', before: 'baseline',
    title: 'The deck does not repeat what it says',
    look: 'Before: “US unemployment rate, 2000-2023; Unemployment (%)”. After, the deck stops at the author’s words: they name unemployment, and the top tick prints the %.',
    input: gapChart(bbc, 'zero-line'),
  },
  {
    id: 'a4-economist-guard', stage: 'a4', theme: 'economist', before: 'baseline', expect: 'same',
    title: 'Guard: a headline is not a deck',
    look: 'Where only the headline names the measure, the deck still states it — a headline is free to say something else.',
    input: preview('population', 'economist'),
  },
  // A5 — a signed field on a one-way ramp.
  {
    id: 'a5-aws-ramp', stage: 'a5', theme: 'AWS Cloudscape', before: 'baseline',
    title: 'The ramp spans the data',
    look: 'Before, temperatures (−9…34 °C) sat on a −34…34 domain, the house’s blue ramp painting them in its dark half. After, the ramp runs over the data’s own range: Moscow’s winter reads light, Delhi’s summer dark.',
    input: gapChart(aws, 'signed-domain-on-sequential'),
  },
  // A6 — numbers compacted as the house says, where the field may be.
  {
    id: 'a6-cfpb-k', stage: 'a6', theme: 'CFPB', before: 'baseline',
    title: 'A currency ruler in thousands',
    look: '`compact: { style: "upper", threshold: 1000 }` — the ticks read $2K, $4K … $8K, the currency sign kept, where they read $2,000 … $8,000.',
    input: gapChart(cfpb, 'thousands-k'),
  },
  {
    id: 'a6-ebay-k', stage: 'a6', theme: 'eBay', before: 'baseline',
    title: 'Lower-case k on the right-hand ruler',
    look: '`compact: { threshold: 1000 }` (`short` style) — $0, $10k … $60k.',
    input: gapChart(ebay, 'k-abbreviation'),
  },
  {
    id: 'a6-who-bn', stage: 'a6', theme: 'WHO', before: 'baseline',
    title: 'The house words: bn',
    look: '`compact: { style: "editorial" }` — one unit for the whole ruler, 0, 0.5bn, 1.0bn, 1.5bn, with the decimals the ticks need.',
    input: gapChart(who, 'number-suffix'),
  },
  {
    id: 'a6-visa-lower', stage: 'a6', theme: 'Visa', before: 'baseline',
    title: 'Each value its own unit, lower-case',
    look: '`compact: { style: "lower", per: "value" }` — labels 1.43b, 340m, 278m; the ruler 200m … 1.6b. Before, the labels printed raw integers and the ruler 1,400,000,000.',
    input: gapChart(visa, 'number-format'),
  },
  {
    id: 'a6-sprout-precision', stage: 'a6', theme: 'Sprout Social', before: 'baseline',
    title: 'The house’s two decimals, on the labels only',
    look: '`precision: "two"` with `compact: { per: "value" }` — 6.45B, 5.00B, 950.40M at the bar ends; the ruler keeps 1B, 2B.',
    input: gapChart(sprout, 'big-numbers'),
  },
  {
    id: 'a6-gitlab-value', stage: 'a6', theme: 'GitLab', before: 'baseline',
    title: 'Small values whole, large ones shortened',
    look: '`compact: { per: "value", threshold: 1000 }` — 0 … 800, then 1k, 1.2k.',
    input: gapChart(gitlab, 'k-format'),
  },
  {
    id: 'a6-london-millions', stage: 'a6', theme: 'London City Intelligence', before: 'baseline',
    title: 'A value already in millions is not compacted again',
    look: 'The field is `Population (m)`, so the suffix rule leaves it whole — and now groups it, 1,429 where it printed 1429.',
    input: gapChart(london, 'bar-labels'),
  },
  {
    id: 'a6-unthemed-billions', stage: 'a6', theme: 'none', before: 'baseline',
    title: 'B for billions, theme or not',
    look: 'd3’s suffix wrote a billion as SI’s G (1.43G). Labels that reach a billion print 1.43B; nothing else in an unthemed chart changes.',
    input: labelled(chart('Bar Chart', PEOPLE, { Country: 'Country', People: 'Quantity' }, { y: 'Country', x: 'People' }, undefined, 'Most populous countries, 2023')),
  },
  {
    id: 'a6-unthemed-guard', stage: 'a6', theme: 'none', before: 'baseline', expect: 'same',
    title: 'Guard: no theme, no billions',
    look: 'An unthemed chart whose numbers stay under a billion is unchanged.',
    input: preview('population', undefined),
  },
  // A7 — the baseline the theme states, wherever the chart puts the floor.
  {
    id: 'a7-bbc-floor', stage: 'a7', theme: 'BBC', before: 'baseline',
    title: 'The heavy baseline along a floor that is not zero',
    look: '`structure.baseline: "emphasised"` — the chart chose to start unemployment at 3, not zero; the house’s dark rule now runs along that floor, where it was a pale gridline.',
    input: gapChart(bbc, 'zero-line'),
  },
  {
    id: 'a7-datawrapper-line', stage: 'a7', theme: 'datawrapper', before: 'baseline',
    title: 'A quiet baseline at zero under a line',
    look: '`structure.baseline: "quiet"` — the zero gridline is drawn a step darker than the others.',
    input: preview('us-unemployment', 'datawrapper'),
  },
  {
    id: 'a7-mckinsey-zero', stage: 'a7', theme: 'mckinsey', before: 'baseline',
    title: 'Bars on both sides of zero stand on a rule at zero',
    look: '`structure.baseline: "full"` — the anomaly bars meet a rule at zero, not a gap above the axis.',
    input: preview('temp-anomaly', 'mckinsey'),
  },
  {
    id: 'a7-scatter-guard', stage: 'a7', theme: 'mckinsey', before: 'baseline', expect: 'same',
    title: 'Guard: a scatter stands on nothing',
    look: 'Two quantities, no base: no rule is added.',
    input: preview('auto-mpg', 'mckinsey'),
  },
  {
    id: 'a7-economist-guard', stage: 'a7', theme: 'economist', before: 'baseline', expect: 'same',
    title: 'Guard: the axis line is already the baseline',
    look: 'The Economist draws its category axis line in the baseline’s ink and weight; nothing is drawn twice.',
    input: preview('population', 'economist'),
  },
  // AX1 — an axis placed by the side it runs along, and styled by the side it is drawn on.
  {
    id: 'ax1-airbnb-sides', stage: 'ax1', theme: 'Airbnb (visx)', before: { strip: ['structure.axis.x', 'structure.axis.y'] },
    title: 'A dark 2px rule along the bottom, a grey 1px rule up the left',
    look: '`axis.x: { line: "full", lineWeight: 2, color: "#212529" }`, `axis.y: { line: "full", lineWeight: 1, color: "#ADB5BD" }` — on horizontal bars the 2px rule no longer moves to the left with the categories.',
    input: gapChart(airbnb, 'axis-by-side'),
  },
  {
    id: 'ax1-apple-trailing', stage: 'ax1', theme: 'Apple HIG', before: { input: appleOpposite },
    title: 'Trailing is a horizontal direction',
    look: '`measure.placement: "trailing"` — the value axis of horizontal bars stays at the bottom, where `opposite` had sent it to the top.',
    input: gapChart(appleHig, 'trailing-is-not-opposite'),
  },
  {
    id: 'ax1-apple-preset', stage: 'ax1', theme: 'apple', before: 'baseline',
    title: 'The Apple preset, on horizontal bars',
    look: 'The shipped preset now states `trailing`: the value labels run along the bottom.',
    input: preview('population', 'apple'),
  },
  {
    id: 'ax1-apple-columns-guard', stage: 'ax1', theme: 'apple', before: 'baseline', expect: 'same',
    title: 'Guard: on columns trailing is still the right-hand side',
    look: 'A vertical value axis stays on the trailing (right) side, as before.',
    input: preview('medals-grouped', 'apple'),
  },
  {
    id: 'ax1-salesforce-top', stage: 'ax1', theme: 'Salesforce', before: { strip: ['structure.axis.measure.placement'] },
    title: 'The value scale across the top of a bar chart',
    look: '`measure.placement: "top"` — horizontal bars take their scale on top; a line chart keeps its value axis on the left.',
    input: preview('population', salesforce.theme),
  },
  {
    id: 'ax1-salesforce-line-guard', stage: 'ax1', theme: 'Salesforce', before: { strip: ['structure.axis.measure.placement'] }, expect: 'same',
    title: 'Guard: a vertical value axis ignores “top”',
    look: '`top` applies only to an axis that runs horizontally.',
    input: preview('us-unemployment', salesforce.theme),
  },
];
