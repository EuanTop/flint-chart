/**
 * The legend cases: where a house's key sits. Each fix adds the charts that show it; every case stays
 * in the theme matrix from then on.
 */
import sunlight from '../../new-theme-test/themes/sunlight';
import { gapChart, preview, type FixCase } from './colour';

export const LEGEND_CASES: FixCase[] = [
  // LG1 — a key inside the plot gives way where the marks fill its corner.
  {
    id: 'lg1-sunlight-lines', stage: 'lg1', theme: 'Sunlight Foundation', before: 'baseline',
    title: 'A rising line chart: the key leaves the corner the lines end in',
    look: '`legend.placement: ["inside", "right"]` — the lines reach the top-right corner, so the key takes the next placement, `right`, outside the plot.',
    input: gapChart(sunlight, 'legend-overlap'),
  },
  {
    id: 'lg1-sunlight-pie', stage: 'lg1', theme: 'Sunlight Foundation', before: 'baseline',
    title: 'A pie fills its plot: the key moves beside it',
    look: 'A pie or donut fills its square, so a key in its corner would sit on the wedges; it moves right unless the plot is wide enough to leave it beside the pie.',
    input: preview('browser-pie', sunlight.theme),
  },
  {
    id: 'lg1-sunlight-bars-guard', stage: 'lg1', theme: 'Sunlight Foundation', before: 'baseline', expect: 'same',
    title: 'Guard: a free corner keeps the key inside',
    look: 'France’s bars stop short of the corner, so the key stays inside, where the house wants it.',
    input: preview('medals-grouped', sunlight.theme),
  },
];
