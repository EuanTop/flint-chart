/**
 * The group cases: how a group of bars shares its step. Each fix adds the charts that show it; every
 * case stays in the theme matrix from then on.
 */
import cato from '../../new-theme-test/themes/cato';
import ibcs from '../../new-theme-test/themes/ibcs';
import liferay from '../../new-theme-test/themes/liferay';
import tractie from '../../new-theme-test/themes/tractie';
import { gapChart, preview, type FixCase } from './colour';

const GROUP_OFF = ['geometry.band.group', 'marks.group'];

export const GROUP_CASES: FixCase[] = [
  // G1 — the gap in a group, the space between groups.
  {
    id: 'g1-nyt-default', stage: 'g1', theme: 'nyt', before: 'baseline',
    title: 'A group’s bars no longer take the house’s gap between groups',
    look: 'Before, the bars in a group stood apart by the same 28% of a lane (1 − 0.72) the house leaves between groups. After, they are a twentieth of a bar apart, so each country reads as one cluster, and the space between countries is unchanged.',
    input: preview('medals-grouped', 'nyt'),
  },
  {
    id: 'g1-economist-horizontal', stage: 'g1', theme: 'economist', before: 'baseline',
    title: 'The same rule across horizontal groups',
    look: 'Men and Women sit close together in each group; the space between education levels is unchanged.',
    input: preview('earnings-education', 'economist'),
  },
  {
    id: 'g1-cato-touching', stage: 'g1', theme: 'Cato', before: { strip: GROUP_OFF },
    title: 'Columns in a group touch',
    look: '`group: { gap: 0 }` — the guide’s touching columns within each group, the groups keeping the 0.8 band fraction between them.',
    input: preview('medals-grouped', cato.theme),
  },
  {
    id: 'g1-liferay-wide', stage: 'g1', theme: 'Liferay', before: { strip: GROUP_OFF },
    title: 'Small gaps inside, a bar’s width between groups',
    look: '`group: { gap: 0.1, spacing: 1 }` — the quarters stand a full bar apart, the devices in each quarter a tenth of a bar.',
    input: preview('medals-grouped', liferay.theme),
  },
  {
    id: 'g1-tractie-px', stage: 'g1', theme: 'Tractie', before: { strip: GROUP_OFF },
    title: '2px between bars, 16px between groups',
    look: '`group: { gap: "2px", spacing: "16px" }` — gaps in pixels, the bars taking what is left of the step.',
    input: gapChart(tractie, 'grouped-spacing'),
  },
  {
    id: 'g1-ibcs-medals', stage: 'g1', theme: 'IBCS', before: { strip: GROUP_OFF },
    title: 'The medal specimen’s spacing',
    look: '`group: { gap: "2px", spacing: 1 }` — columns 2px apart, a column’s width between countries, as in the guide’s grouped medal chart.',
    input: gapChart(ibcs, 'labels-replace-axis'),
  },
  {
    id: 'g1-economist-single-guard', stage: 'g1', theme: 'economist', before: 'baseline', expect: 'same',
    title: 'Guard: a single series of bars',
    look: 'Without groups there is nothing to space; the bars keep the band fraction.',
    input: preview('population', 'economist'),
  },
  {
    id: 'g1-nyt-stacked-guard', stage: 'g1', theme: 'nyt', before: 'baseline', expect: 'same',
    title: 'Guard: stacked bars',
    look: 'A stack is one bar per band; the group rule does not touch it.',
    input: preview('electricity-stacked', 'nyt'),
  },
];
