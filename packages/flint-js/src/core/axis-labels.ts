import type { LayoutDeclaration, LayoutResult } from './types';
import type { ThemeLabels } from './theme/types';

/** Space two straight names keep between them so they never read as one, in px. */
export const STRAIGHT_LABEL_GAP = 6;

/** Flint's own tick-label size; a fitted size under it means the labels did not fit at the size Flint wanted. */
export const BASE_LABEL_FONT_SIZE = 10;

/** The tick labels one axis draws. */
export interface AxisLabelPlan {
    fontSize: number;
    /** The face the labels are set in; undefined leaves the renderer's. */
    font?: string;
    /** Widest a label may run, in px; 0 means no limit. */
    limit?: number;
    /** Space kept between two neighbouring labels, in px. */
    separation?: number;
    /** Line height of two-line band labels. */
    lineHeight?: number;
    /** Rotation in degrees, and how a turned label anchors to its tick. */
    angle?: number;
    align?: string;
    baseline?: string;
    /** The theme's size, where crowded labels keep the smaller fitted size instead. */
    crowdedFrom?: number;
    /** The theme asked for straight labels that would run into each other, so they stay turned. */
    straightRefused?: boolean;
}

/** What a theme states about tick labels. */
export interface AxisLabelTheme {
    fontSize: number;
    /** The theme never truncates labels. */
    noLimit: boolean;
    angle: ThemeLabels['angle'];
    font?: string;
}

/** What the plan knows about the data along each axis. */
export interface AxisLabelFacts {
    /** Whether a field is on the axis. */
    present: Record<'x' | 'y', boolean>;
    /** The names along x, when x carries categories. */
    xCategories?: {
        /** Whether the names are nominal or ordinal values rather than numbers or dates. */
        named: boolean;
        distinct: number;
        /** The widest name at the theme's label size, in px. */
        widest: number;
        /** The width each name gets on the drawn axis. */
        band: number;
    };
}

/**
 * The tick labels of each axis, from the label sizing the layout fitted and the theme. Numbers
 * keep a gap of 0.6 em between labels so two never read as one; bands are spaced by their scale
 * and keep none. A theme's size holds unless the layout had to shrink the labels to fit their
 * bands. A theme's angle holds unless straight names would run into each other: the widest name
 * as measured, plus the gap two names keep, wider than the band. Names too wide for their band,
 * a theme's straight ones refused, turn −45°, the least that reads, or upright where the band is
 * narrower than a turned line (its height times √2), unless the layout turned them already; names set straight drop the
 * anchoring of a turn the layout fitted.
 */
export function planAxisLabels(
    layout: LayoutResult,
    declaration: LayoutDeclaration,
    theme: AxisLabelTheme | undefined,
    facts: AxisLabelFacts = { present: { x: false, y: false } },
): Record<'x' | 'y', AxisLabelPlan> {
    const plan = (channel: 'x' | 'y'): AxisLabelPlan => {
        const sizing = channel === 'x' ? layout.xLabel : layout.yLabel;
        const discrete = (channel === 'x' ? layout.xNominalCount : layout.yNominalCount) > 0;
        const wrapped = Boolean(sizing.labelLines && sizing.labelValues);
        const fitted = sizing.fontSize;
        const fittedLimit = channel === 'x' || wrapped ? sizing.labelLimit : undefined;
        const fittedLineHeight = wrapped ? sizing.labelLineHeight : undefined;
        const fittedAngle = sizing.labelAngle === undefined || (channel === 'y' && !wrapped) ? {}
            : { angle: sizing.labelAngle, align: sizing.labelAlign, baseline: sizing.labelBaseline };
        if (!theme) {
            return {
                fontSize: fitted,
                ...(fittedLimit !== undefined ? { limit: fittedLimit } : {}),
                ...(discrete ? {} : { separation: Math.round(fitted * 0.6) }),
                ...(fittedLineHeight !== undefined ? { lineHeight: fittedLineHeight } : {}),
                ...fittedAngle,
            };
        }
        const resolved = declaration.resolvedTypes?.[channel];
        const banded = discrete || resolved === 'nominal' || resolved === 'ordinal';
        const separation = !banded ? Math.round(theme.fontSize * 0.6)
            : discrete ? undefined : Math.round(fitted * 0.6);
        const crowded = (fitted < BASE_LABEL_FONT_SIZE || (channel === 'y' && wrapped && Boolean(fittedLineHeight)))
            && theme.fontSize > fitted;
        const fontSize = crowded ? fitted : theme.fontSize;
        const twoLines = wrapped && Boolean(fittedLineHeight) && (fittedLimit ?? 0) > 0;
        const limit = twoLines ? fittedLimit : theme.noLimit ? 0 : fittedLimit;
        const lineHeight = twoLines ? Math.ceil(fontSize * 1.2) : fittedLineHeight;

        let angle: Pick<AxisLabelPlan, 'angle' | 'align' | 'baseline'> = fittedAngle;
        let straightRefused = false;
        if (facts.present[channel]) {
            const categories = facts.xCategories;
            const choice = channel === 'x'
                ? themeLabelAngle(theme.angle, categories && { banded: categories.named, widest: categories.widest }, layout.xStep)
                : { angle: theme.angle === 'horizontal' ? 0 : undefined };
            const asked = choice.angle;
            // Turned −45° a name takes its line height over √2 of the band; narrower, only an upright name clears its neighbour.
            const diagonal = !categories || !(categories.band > 0) || categories.band >= Math.ceil(fontSize * 1.2 * Math.SQRT2);
            const turned = diagonal ? { angle: -45, align: 'right', baseline: 'top' } : { angle: -90, align: 'right', baseline: 'middle' };
            if (asked !== undefined) {
                const straight = channel !== 'x' || asked !== 0 || !banded || !categories || categories.distinct === 0
                    || !(categories.band > 0) || categories.widest + STRAIGHT_LABEL_GAP <= categories.band;
                if (straight) angle = asked === 0 && fittedAngle.angle !== 0 ? { angle: 0 } : { ...fittedAngle, angle: asked };
                else {
                    straightRefused = true;
                    if (fittedAngle.angle === undefined) angle = turned;
                }
            } else if (banded && fittedAngle.angle === undefined && categories && categories.distinct > 0 && categories.band > 0
                && categories.widest + STRAIGHT_LABEL_GAP > categories.band) {
                // Names too wide for their band, straight asked or not: turned the least that reads.
                straightRefused = 'reason' in choice && choice.reason === 'too-wide';
                angle = turned;
            }
        }
        return {
            fontSize,
            ...(theme.font !== undefined ? { font: theme.font } : {}),
            ...(limit !== undefined ? { limit } : {}),
            ...(separation !== undefined ? { separation } : {}),
            ...(lineHeight !== undefined ? { lineHeight } : {}),
            ...angle,
            ...(crowded ? { crowdedFrom: theme.fontSize } : {}),
            ...(straightRefused ? { straightRefused } : {}),
        };
    };
    return { x: plan('x'), y: plan('y') };
}

/**
 * The x label angle a theme asks for. "Flat" is a preference and "legible" is not: where the
 * band is narrower than the widest category name and the gap two names keep, a flat angle goes
 * back to the layout. The reverse holds too: a name that fits its band at the theme's label size
 * reads straight. `widest` is the widest name as the renderer measures it, in px.
 */
export function themeLabelAngle(
    policy: ThemeLabels['angle'],
    category: { banded: boolean; widest: number } | undefined,
    step: number,
): { angle: number | undefined; reason?: 'too-wide' | 'fits'; needed: number; step: number } {
    const angle = policy === 'rotated' ? -45 : policy === 'horizontal' ? 0 : undefined;
    if (!category) return { angle, needed: 0, step };
    const { banded, widest } = category;
    const needed = widest + STRAIGHT_LABEL_GAP;
    const fits = widest > 0 && step > 0 && needed <= step;
    if (angle === 0 && !fits && widest > 0 && step > 0) return { angle: undefined, reason: 'too-wide', needed, step };
    if (angle === undefined && fits && banded && policy !== 'rotated') return { angle: 0, reason: 'fits', needed, step };
    return { angle, needed, step };
}
