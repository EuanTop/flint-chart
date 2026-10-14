/** Every improvement area's cases, by area id. A case stays in the theme matrix once added. */
import { COLOUR_CASES, type FixCase } from './colour';
import { TYPE_CASES } from './type';
import { FURNITURE_CASES } from './furniture';
import { LABEL_CASES } from './labels';
import { GROUP_CASES } from './groups';
import { MARK_CASES } from './marks';
import { FOOTER_CASES } from './footer';
import { AXES_CASES } from './axes';
import { GRID_CASES } from './grid';
import { LEGEND_CASES } from './legend';

export type { FixCase } from './colour';
export { stripInput, stripTheme } from './colour';
export const AREA_CASES: Record<string, FixCase[]> = { colour: COLOUR_CASES, type: TYPE_CASES, furniture: FURNITURE_CASES, labels: LABEL_CASES, groups: GROUP_CASES, marks: MARK_CASES, footer: FOOTER_CASES, axes: AXES_CASES, grid: GRID_CASES, legend: LEGEND_CASES };
