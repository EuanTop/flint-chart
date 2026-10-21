/**
 * The value-label cases: each fix adds the charts that show it; every case stays in the theme matrix
 * from then on. Stages that change a default compare against the code from before the stage (the
 * `labels` snapshot for L1, then one per stage).
 */
import bbc from '../../new-theme-test/themes/bbc';
import cato from '../../new-theme-test/themes/cato';
import finastra from '../../new-theme-test/themes/finastra';
import ibcs from '../../new-theme-test/themes/ibcs';
import justice from '../../new-theme-test/themes/justice-innovation-lab';
import trafford from '../../new-theme-test/themes/trafford';
import unhcr from '../../new-theme-test/themes/unhcr';
import kraft from '../../new-theme-test/themes/kraft-heinz';
import wwf from '../../new-theme-test/themes/wwf';
import { gapChart, preview, type FixCase } from './colour';

/** The size the house galleries are drawn at, where the bands are tightest. */
const GALLERY_SIZE = { baseSize: { width: 320, height: 210 } };

export const LABEL_CASES: FixCase[] = [
  // L1 — measured as printed.
  {
    id: 'l1-bbc-inside', stage: 'l1', theme: 'BBC', before: 'baseline',
    title: 'Short bars keep their numbers inside',
    look: 'Before, the estimate judged 241, 224, 216 and 173 too wide for their bars, and moved them outside (where, in white, they vanished). Measured, each fits inside its bar, as the BBC guide prints them.',
    input: gapChart(bbc, 'value-label-placement'),
  },
  {
    id: 'l1-economist-population', stage: 'l1', theme: 'economist', before: 'baseline',
    title: 'The inside/outside split falls where the labels really stop fitting',
    look: 'Before, 224 and below went outside. After, 224, 216 and 173 sit inside; only 144 and 129, whose bars are shorter than their numbers, print past the end.',
    input: preview('population', 'economist'),
  },
  {
    id: 'l1-economist-bigmac', stage: 'l1', theme: 'economist', before: 'baseline',
    title: 'One-decimal prices all fit inside',
    look: 'Every price now sits inside its bar; before, the shortest bars printed theirs outside.',
    input: preview('big-mac', 'economist'),
  },
  {
    id: 'l1-datawrapper-medals', stage: 'l1', theme: 'datawrapper', before: 'baseline',
    title: 'Two-digit counts over grouped bars',
    look: 'The house prints values when they fit. Before, “44” was estimated wider than its 20px slot and every label was withheld; measured, they fit and are printed.',
    input: preview('medals-grouped', 'datawrapper'),
  },
  {
    id: 'l1-economist-anomaly', stage: 'l1', theme: 'economist', before: 'baseline',
    title: 'Signed decimals print where they fit',
    look: 'Before, “−0.27” was estimated too wide for the bars and the house printed nothing; after, each decade carries its value, below the bars that run down.',
    input: preview('temp-anomaly', 'economist'),
  },
  {
    id: 'l1-cartoon-pyramid', stage: 'l1', theme: 'cartoon', before: 'baseline',
    title: 'The room past each bar end is the label’s width',
    look: 'The room kept past the bar ends was 0.8 em a character; now it is the label as drawn, so the bars run longer and the numbers sit close to them.',
    input: preview('us-pyramid', 'cartoon'),
  },
  {
    id: 'l1-economist-line-guard', stage: 'l1', theme: 'economist', before: 'baseline', expect: 'same',
    title: 'Guard: a chart without value labels',
    look: 'Nothing about a line chart’s layout depends on value labels.',
    input: preview('ev-share', 'economist'),
  },

  // L2 — the room past a bar's end, in px.
  {
    id: 'l2-mckinsey-headroom', stage: 'l2', theme: 'mckinsey', before: 'baseline',
    title: 'Headroom is a line of text, not 15% of the range',
    look: 'The scale extends past the tallest column by the label’s line and its gap. Before, it extended by 15% of the range; the columns are now taller and the numbers still clear the top.',
    input: preview('medals-grouped', 'mckinsey'),
  },
  {
    id: 'l2-cartoon-held', stage: 'l2', theme: 'cartoon', before: 'baseline',
    title: 'The room for end labels comes out of the plot, not a wider canvas',
    look: 'Before, the chart grew 3 em wider to the right. After, the measured label width is kept clear inside the plot, and the canvas is the size asked for.',
    input: preview('population', 'cartoon'),
  },
  {
    id: 'l2-economist-overflow', stage: 'l2', theme: 'economist', before: 'baseline',
    title: 'Labels moved past short bars add no margin',
    look: '144 and 129 move past their short bars, far from the plot’s edge; before, the canvas still grew by two lines of text to the right.',
    input: preview('population', 'economist'),
  },
  {
    id: 'l2-trafford-outside', stage: 'l2', theme: 'Trafford', before: 'baseline',
    title: 'Bold values past the bar ends',
    look: 'The bold values sit in measured room inside the plot; the bars run longer.',
    input: gapChart(trafford, 'labelled-bars'),
  },
  {
    id: 'l2-economist-inside-guard', stage: 'l2', theme: 'economist', before: 'baseline', expect: 'same',
    title: 'Guard: every price inside its bar',
    look: 'Nothing is printed past a bar’s end, so nothing moves.',
    input: preview('big-mac', 'economist'),
  },

  // L3 — the band holds its label.
  {
    id: 'l3-ibcs-anomaly', stage: 'l3', theme: 'IBCS', before: 'baseline',
    title: 'Bands widen into the spare room so every value prints',
    look: 'IBCS prints every value and drops the value axis. Before, “−0.27” was wider than its 21px band, so the labels were withheld and a quiet grid came back. After, the bands widen to 30px inside the same canvas and each decade carries its value.',
    input: preview('temp-anomaly', ibcs.theme, GALLERY_SIZE),
  },
  {
    id: 'l3-cato-stack', stage: 'l3', theme: 'Cato', before: 'baseline',
    title: 'Stacked segments get bars wide enough for their numbers',
    look: 'The bars widen from 21px to 25px, enough for a two-digit share across each segment.',
    input: preview('electricity-stacked', cato.theme, GALLERY_SIZE),
  },
  {
    id: 'l3-nyt-full-guard', stage: 'l3', theme: 'nyt', before: 'baseline', expect: 'same',
    title: 'Guard: no room, no change — but a reason',
    look: 'The grouped medals would need wider bands than the canvas holds. The chart is drawn as before; the report now says how wide the bands would have to be. (The one difference shown is later: A1 measures “United States” in its face and finds it fits on one line.)',
    input: preview('medals-grouped', 'nyt'),
  },
  {
    id: 'l3-justice-revert-guard', stage: 'l3', theme: 'Justice Innovation Lab', before: 'baseline', expect: 'same',
    title: 'Guard: widening that would not be enough is undone',
    look: 'The label’s type grows with the plot, so even the widest band the canvas allows is too narrow. The bands are kept as they were rather than widened for labels that still cannot print.',
    input: gapChart(justice, 'axis-title-per-axis'),
  },

  // L4 — inside placement.
  {
    id: 'l4-wwf-moved-ink', stage: 'l4', theme: 'WWF', before: 'baseline',
    title: 'A label moved past its bar is printed in an ink the plot can show',
    look: 'WWF prints white numbers inside its teal bars. Before, 173, 144 and 129, moved past their short bars, stayed white on the white page and vanished; after, they print in black.',
    input: preview('population', wwf.theme, GALLERY_SIZE),
  },
  {
    id: 'l4-powerbi-moved-ink', stage: 'l4', theme: 'powerbi', before: 'baseline',
    title: 'Moved labels drop the per-series inside ink',
    look: 'On the dark Power BI ground the short negative bars’ values kept the dark ink chosen for inside their bars, and disappeared; after, they read on the plot.',
    input: preview('temp-anomaly', 'powerbi', GALLERY_SIZE),
  },
  {
    id: 'l4-justice-start', stage: 'l4', theme: 'Justice Innovation Lab', before: { strip: ['dataLabels.anchor', 'dataLabels.minContrast'] },
    title: 'Values flush at the bar’s base, reading as one column',
    look: 'With `dataLabels.anchor: "start"` every value sits at the start of its bar instead of zigzagging between inside and outside the value end.',
    input: gapChart(justice, 'labels-at-bar-start'),
  },
  {
    id: 'l4-justice-orange', stage: 'l4', theme: 'Justice Innovation Lab', before: { strip: ['dataLabels.anchor', 'dataLabels.minContrast'] },
    title: 'Black on orange, at the house’s 4.5:1',
    look: 'White on #db771a is 3.15:1 — enough for the default 3:1, not for the house’s `minContrast: 4.5`; the orange bars print black, the blue ones stay white.',
    input: gapChart(justice, 'label-ink-orange'),
  },
  {
    id: 'l4-economist-alike', stage: 'l4', theme: 'economist + fallback: allOutside', before: { strip: ['dataLabels.fallback'] },
    title: 'Every label past its bar, once one bar is too short',
    look: 'The Economist with `dataLabels.fallback: "allOutside"`: since Russia and Mexico cannot hold their numbers, every number moves past its bar’s end, in the plot’s ink, rather than two of them changing side.',
    input: { ...preview('population', 'economist'), theme_spec: { id: 'economist-alike', extends: 'economist', dataLabels: { fallback: 'allOutside' } } } as never,
  },
  {
    id: 'l4-bbc-guard', stage: 'l4', theme: 'BBC', before: 'baseline', expect: 'same',
    title: 'Guard: every label inside, nothing moved',
    look: 'With every bar holding its number there is nothing to move, so nothing changes.',
    input: gapChart(bbc, 'value-label-placement'),
  },

  // L5 — stacked segments and donut rings.
  {
    id: 'l5-finastra-ring', stage: 'l5', theme: 'Finastra', before: 'baseline',
    title: 'A ring thinner than its labels sends them outside',
    look: 'Before, “46%” and “31%” sat on the ring’s mid-line in white, ran into the hole and were cut to “46” and “1%”. The 23px ring cannot hold a 26px label, so every percentage now sits outside the ring, whole, in the plot’s ink.',
    input: gapChart(finastra, 'ring-labels'),
  },
  {
    id: 'l5-economist-donut', stage: 'l5', theme: 'economist', before: 'baseline',
    title: 'Labels in the middle of a ring that holds them',
    look: 'The ring is thick enough, so each label sits on its middle — before, at 72% of the outer radius, which on a wide hole is near the inner edge.',
    input: preview('mobile-donut', 'economist'),
  },
  {
    id: 'l5-nyt-likert', stage: 'l5', theme: 'nyt', before: 'baseline',
    title: 'A horizontal segment is judged by the label’s width, not its height',
    look: 'Along a horizontal stack a segment has to be as long as its number is wide. Scientists’ 4% segment is 16px, enough for “4”, so it now carries it; segments shorter than their own number still go without.',
    input: preview('trust-likert', 'nyt'),
  },

  // L6 — printed values replace the axis, title included.
  {
    id: 'l6-unhcr-deck', stage: 'l6', theme: 'UNHCR', before: 'baseline',
    title: 'The measure title moves up into the deck',
    look: 'With values printed the ruler goes; before, “People (million)” was left under the bars with nothing to name. It now sits in the deck under the headline, where the guide puts it.',
    input: gapChart(unhcr, 'labels-replace-axis'),
  },
  {
    id: 'l6-kraft-named', stage: 'l6', theme: 'Kraft Heinz', before: 'baseline',
    title: 'Already named in the deck, so it goes',
    look: 'The deck already says “Population, millions”, so the lone “Population” title under the bars is dropped rather than repeated.',
    input: gapChart(kraft, 'labels-or-gridlines'),
  },
  {
    id: 'l6-economist-guard', stage: 'l6', theme: 'economist', before: 'baseline', expect: 'same',
    title: 'Guard: a house that keeps its ruler keeps its title',
    look: 'The Economist prints values and keeps its value axis, so its title stays where it was.',
    input: preview('population', 'economist'),
  },
];
