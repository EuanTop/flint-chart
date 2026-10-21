import { resampleStops, type AuthoredColorScale } from '../core/color-controls';
import { getPaletteForScheme } from './colormap';

/**
 * The author's colour controls, laid over the visual maps the template and defaults chose: they win.
 * A scheme name ECharts has no palette for leaves the palette as chosen; stops always apply.
 */
export function applyAuthoredColorScaleEC(option: any, ctl: AuthoredColorScale): void {
    const maps = Array.isArray(option?.visualMap) ? option.visualMap : option?.visualMap ? [option.visualMap] : [];
    for (const vm of maps) {
        const current = vm.inRange?.color;
        if (!Array.isArray(current)) continue;
        let colors: string[] = ctl.stops
            ?? (ctl.scheme ? getPaletteForScheme(ctl.scheme as any) : undefined)
            ?? current;
        if (ctl.bins !== undefined && ctl.bins > 0) {
            vm.type = 'piecewise';
            vm.splitNumber = ctl.bins;
            delete vm.calculable;
            colors = resampleStops(colors, ctl.bins);
        } else if (ctl.bins === 0 && vm.type === 'piecewise') {
            vm.type = 'continuous';
            delete vm.splitNumber;
        }
        if (ctl.reverse) colors = [...colors].reverse();
        vm.inRange = { ...vm.inRange, color: colors };
        if (ctl.domain) {
            vm.min = ctl.domain[0];
            vm.max = ctl.domain[1];
        }
    }
}
