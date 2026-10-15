// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * The shapes a chart takes on its own: a plot of no bands starts at its base and stretches, under
 * pressure, by up to its stretch on each side, so its width-to-height ratio runs from the base's
 * with the full height stretch to the base's with the full width stretch. A chart whose area —
 * its plot with the labels it cannot drop — lands in that range reads as one of its own kind,
 * however its bands sized it. Past it, it is as far off as the ratio to the nearer end.
 */

/** A range of width-to-height ratios. */
export interface AspectRange {
    lo: number;
    hi: number;
}

/** The least spread either side of the base's ratio, so a host that allows no stretch still allows some shape. */
export const NATURAL_MIN_SPREAD = 1.25;

/** How much wider than the natural range the fallback is, where the natural one cannot be reached readably. */
export const FALLBACK_WIDEN = 1.5;

/**
 * The ratios a chart of this base takes on its own. `centre` and `spread` override the base's
 * ratio and the stretch-derived spread.
 */
export function naturalAspectRange(
    base: { width: number; height: number },
    stretch: { x: number; y: number },
    override: { centre?: number; spread?: number } = {},
): AspectRange {
    const centre = override.centre && override.centre > 0 ? override.centre : base.width / Math.max(1, base.height);
    if (override.spread && override.spread >= 1) return { lo: centre / override.spread, hi: centre * override.spread };
    return {
        lo: centre / Math.max(NATURAL_MIN_SPREAD, stretch.y),
        hi: centre * Math.max(NATURAL_MIN_SPREAD, stretch.x),
    };
}

/** The range widened by a factor at each end. */
export function widenRange(range: AspectRange, factor: number): AspectRange {
    return { lo: range.lo / factor, hi: range.hi * factor };
}

/**
 * How far a shape lies outside a range, as a ratio: 1 where they meet, above 1 by how much too
 * wide, below 1 by how much too tall.
 */
export function shapeDivergence(shape: AspectRange, range: AspectRange): number {
    if (shape.lo > range.hi) return shape.lo / range.hi;
    if (shape.hi < range.lo) return shape.hi / range.lo;
    return 1;
}
