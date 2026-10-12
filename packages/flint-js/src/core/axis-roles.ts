/** What is known about the field on one positional axis. */
export interface AxisFieldFacts {
    /** Whether a field is on the axis. */
    present: boolean;
    type?: string;
    /** The template lays the axis out in bands even when its field is quantitative (a binned axis). */
    banded?: boolean;
}

/**
 * Which positional axes carry measures and which one carries categories. A banded axis carries
 * identity even when its field is quantitative, so banding wins over the encoding type. With two
 * measures (a scatter) there is no category axis; with two discrete axes (a heat map) the last
 * one, y, takes the category role.
 */
export function axisRoles(axes: Record<'x' | 'y', AxisFieldFacts>): {
    measureChannels: Array<'x' | 'y'>;
    categoricalChannel?: 'x' | 'y';
} {
    const measureChannels: Array<'x' | 'y'> = [];
    let categoricalChannel: 'x' | 'y' | undefined;
    for (const channel of ['x', 'y'] as const) {
        const axis = axes[channel];
        if (!axis.present) continue;
        if (axis.type === 'quantitative' && !axis.banded) measureChannels.push(channel);
        else categoricalChannel = channel;
    }
    if (measureChannels.length === 2) categoricalChannel = undefined;
    return { measureChannels, categoricalChannel };
}
