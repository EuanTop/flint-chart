/**
 * The furniture of a frame that holds several charts, such as a board: the header pieces on its top
 * edge, above and beside its headline, and the rules below its heading and at its foot. They are
 * planned by the same rules a chart of the same theme plans its own, across the frame's width, so a
 * board draws the theme's branding once, where a chart would.
 */
import { planHeader, type HeaderPlan } from './header-plan';
import type { TextMeasurer } from './legend-layout';
import { closingRules, type ClosingRule } from './rule-plan';
import { tableTextMeasurer } from './text-width';
import { groundTheme } from './theme/ground';
import { resolveThemeSpec } from './theme/presets';
import type { ThemeSpec } from './theme/types';

export interface FrameFurniture {
    /** The pieces on the top edge, above and beside the headline, and the room they take. */
    header?: HeaderPlan;
    /** The rules below the heading (`edge: 'top'`) and at the foot (`edge: 'bottom'`). */
    rules: ClosingRule[];
}

/** The furniture a theme draws on a frame `width` px wide inside its margin, or none. */
export function planFrameFurniture(
    theme: ThemeSpec | string | undefined,
    width: number,
    measure: TextMeasurer = tableTextMeasurer,
): FrameFurniture | undefined {
    const resolved = resolveThemeSpec(theme);
    if (!resolved?.furniture?.length) return undefined;
    // The frame has no data of its own: its type is grounded as a titled chart of its width would be.
    const design = groundTheme(resolved, {
        chartType: 'Bar Chart',
        measureText: measure,
        markChannel: 'x',
        markTypes: ['bar'],
        channelSemantics: {},
        layout: { subplotWidth: width, subplotHeight: 0, xStep: 0, yStep: 0, stepPadding: 0, titleFontSize: 13, legendFontSize: 11 },
        table: [],
        canvasSize: { width, height: 0 },
        titled: true,
    });
    const header = planHeader({ design, block: width, measure, titleAnchor: 'start' });
    const rules = closingRules(design, width);
    if (!header && !rules.length) return undefined;
    return { ...(header ? { header } : {}), rules };
}
