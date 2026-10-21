// Read by validation, which loads with the library's main entry: it must not import Vega.
import type { ChartOverlaySpec } from '../../../core/interaction-contracts';

export type OverlayChannel = 'x' | 'x2' | 'y' | 'y2';

/** The channels an overlay projects, or undefined when its mark cannot be drawn from them. */
export function overlayChannels(spec: ChartOverlaySpec): readonly OverlayChannel[] | undefined {
    const has = (channel: OverlayChannel): boolean => !!spec.encodings[channel];
    if (spec.mark !== 'rule' && spec.mark !== 'rect') return has('x') && has('y') ? ['x', 'y'] : undefined;
    if (has('x') && has('y') && has('x2') && has('y2')) return ['x', 'y', 'x2', 'y2'];
    const span = (start: OverlayChannel, end: OverlayChannel): OverlayChannel[] | undefined =>
        spec.mark === 'rect'
            ? (has(start) && has(end) ? [start, end] : undefined)
            : (has(start) && !has(end) ? [start] : undefined);
    if (!has('y') && !has('y2')) return span('x', 'x2');
    if (!has('x') && !has('x2')) return span('y', 'y2');
    return undefined;
}
