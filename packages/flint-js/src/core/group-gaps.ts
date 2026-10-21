/**
 * How a group of bars shares its step (G1): the gap between the bars in a group, the space between
 * groups, and so the bars' width. Both gaps are stated against the bar they sit beside — a share of
 * its width, or px — so a house says "the bars in a group touch" or "a bar's width between groups"
 * and the bar takes what is left:
 *
 *     step = k·bar + (k − 1)·gap + spacing
 *
 * where `k` is the number of bars in a group. The layout plan and every renderer read the same
 * answer from here, so the plot planned for the groups is the plot the groups are drawn in.
 */

/** A gap: a share of a bar's width (`0.1`), or pixels (`"2px"`). */
export type GapSize = number | `${number}px`;

export interface GroupSpacing {
    /** Between the bars in a group; unset is the default hairline (`DEFAULT_GROUP_GAP`, at least 1px). */
    gap?: GapSize;
    /** Between groups; unset keeps the house's `bandFraction` of the group step. */
    spacing?: GapSize;
}

/** The gap in a group a house gets when it states none: a twentieth of a bar's width, never under 1px. */
export const DEFAULT_GROUP_GAP = 0.05;
/** The least a default gap is, px: enough to see two bars as two. */
const MIN_DEFAULT_GAP_PX = 1;
/**
 * Where the house leaves the space between groups to its band fraction, the groups still have to read
 * as groups: at least half a bar apart, and at least three times the gap inside a group.
 */
const MIN_SPACING_BARS = 0.5;
const MIN_SPACING_GAPS = 3;

export interface GroupPadding {
    /** The group band's inner padding: the space between groups over the group step. */
    inner: number;
    /** The lane band's inner padding: the gap between bars over a bar and its gap. */
    lane: number;
    /** A bar's width, px, where the step is known. */
    bar?: number;
}

/** A gap as `{ px, share }`: one of them is zero. */
function parts(size: GapSize | undefined): { px: number; share: number } {
    if (size === undefined) return { px: 0, share: 0 };
    if (typeof size === 'number') return { px: 0, share: Math.max(0, size) };
    const px = Number.parseFloat(size);
    return { px: Number.isFinite(px) ? Math.max(0, px) : 0, share: 0 };
}

/** Whether a gap is stated as a share or in px, for a step that is not known yet. */
export function isGapSize(value: unknown): value is GapSize {
    return (typeof value === 'number' && Number.isFinite(value) && value >= 0)
        || (typeof value === 'string' && /^\d+(\.\d+)?px$/.test(value));
}

/**
 * The paddings a group of `lanes` bars takes in a step of `step` px. Without a step, px gaps are
 * read as a share of a 20px bar (the layout's base band), which only matters to callers that size
 * nothing.
 */
export function groupPadding(group: GroupSpacing, bandFraction: number, lanes: number, step?: number): GroupPadding {
    const k = Math.max(1, Math.round(lanes));
    const known = step !== undefined && step > 0;
    const S = known ? step! : 1;
    const pxOf = (px: number) => (known ? px : px / 20);
    let gap = parts(group.gap ?? DEFAULT_GROUP_GAP);
    let bar: number;
    let spacingPx: number;
    const solve = (spacingShare: number, spacingPxFixed: number) =>
        (S - (k - 1) * pxOf(gap.px) - spacingPxFixed) / (k + (k - 1) * gap.share + spacingShare);
    if (group.spacing === undefined) {
        // The group fills the house's band fraction of its step, as a single bar would.
        const inner = clamp(1 - bandFraction, 0, 0.9);
        const content = S * (1 - inner);
        const fill = () => (content - (k - 1) * pxOf(gap.px)) / (k + (k - 1) * gap.share);
        bar = fill();
        // The default gap is never thinner than a hairline.
        if (group.gap === undefined && known && gap.share * bar < MIN_DEFAULT_GAP_PX) {
            gap = { px: MIN_DEFAULT_GAP_PX, share: 0 };
            bar = fill();
        }
        spacingPx = S * inner;
        // A wide band fraction would leave the groups barely further apart than their bars: the
        // space between groups grows to half a bar (or three gaps), taken from the bars.
        if (k > 1) {
            const gapPx = pxOf(gap.px) + gap.share * bar;
            const floor = Math.max(MIN_SPACING_BARS * bar, MIN_SPACING_GAPS * gapPx);
            if (spacingPx < floor) {
                const byBars = solve(MIN_SPACING_BARS, 0);
                const byGaps = solve(MIN_SPACING_GAPS * gap.share, MIN_SPACING_GAPS * pxOf(gap.px));
                bar = Math.min(byBars, byGaps);
                spacingPx = S - k * bar - (k - 1) * (pxOf(gap.px) + gap.share * bar);
            }
        }
    } else {
        const spacing = parts(group.spacing);
        bar = (S - (k - 1) * pxOf(gap.px) - pxOf(spacing.px)) / (k + (k - 1) * gap.share + spacing.share);
        spacingPx = pxOf(spacing.px) + spacing.share * bar;
    }
    if (!(bar > 0)) {
        // The gaps the house asks for leave no room for the bars: the bars keep a third of the step.
        bar = S / (3 * k);
        spacingPx = Math.min(spacingPx, S / 3);
    }
    const gapPx = k > 1 ? pxOf(gap.px) + gap.share * bar : 0;
    return {
        inner: clamp(spacingPx / S, 0, 0.9),
        lane: clamp(gapPx / (bar + gapPx), 0, 0.9),
        ...(known ? { bar } : {}),
    };
}

function clamp(value: number, low: number, high: number): number {
    return Math.max(low, Math.min(high, value));
}
