import { resampleStops, type AuthoredColorScale } from '../core/color-controls';

/** A stepped colour scale: each of the colours holds flat across its own bin. */
function steppedScale(colors: string[]): [number, string][] {
    const n = colors.length;
    return colors.flatMap((c, i) => [[i / n, c], [(i + 1) / n, c]] as [number, string][]);
}

/**
 * The author's colour controls, laid over the colour scales of the heatmap-like traces: they win.
 * Named schemes go through as Plotly colour-scale names; stops and bins become an explicit scale.
 */
export function applyAuthoredColorScalePlotly(figure: any, ctl: AuthoredColorScale): void {
    for (const trace of figure?.data ?? []) {
        if (trace?.colorscale === undefined && trace?.z === undefined) continue;
        if (ctl.stops) {
            const colors = ctl.bins ? resampleStops(ctl.stops, ctl.bins) : ctl.stops;
            trace.colorscale = ctl.bins ? steppedScale(colors) : colors.map((c, i) => [i / (colors.length - 1), c]);
        } else if (ctl.scheme) {
            trace.colorscale = ctl.scheme;
        } else if (ctl.bins && Array.isArray(trace.colorscale)) {
            trace.colorscale = steppedScale(resampleStops(trace.colorscale.map((stop: [number, string]) => stop[1]), ctl.bins));
        }
        if (ctl.reverse !== undefined) trace.reversescale = ctl.reverse;
        if (ctl.domain) {
            trace.zmin = ctl.domain[0];
            trace.zmax = ctl.domain[1];
            delete trace.zmid;
        }
    }
}
