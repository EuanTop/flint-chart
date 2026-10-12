/** A row's position along an axis, as a number: its value, a date's time, or a date string parsed. */
export function positionOf(value: unknown): number {
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    return Date.parse(String(value));
}

/** Whether a position falls inside a window, either way round. */
export function inWindow(position: number, window: readonly [unknown, unknown]): boolean {
    const [a, b] = [positionOf(window[0]), positionOf(window[1])];
    return position >= Math.min(a, b) && position <= Math.max(a, b);
}
