/**
 * Dates along a banded axis, named the way a calendar names them. A row of months as written
 * (`2025-07`, `2025-08`, …) repeats its year on every band; the calendar names each month and
 * states the year once, on a second line, where the row opens and where a new year begins
 * (`Jul` over `2025`, `Aug`, …, `Jan` over `2026`). Days read the same way (`Dec 31` over `2024`).
 *
 * The names as written stand wherever they fit; the calendar form is taken only where they would
 * have to turn, wrap or be cut, and its lines are narrower.
 */
import { snapshotTime } from './decisions';
import { textWidth } from './text-width';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The calendar names for dates in the order the axis draws them, a line or two each, or undefined
 * where they have none: values that are not all dates, years, or times of day. Where the axis does
 * not run in time order, every name states its year.
 */
export function calendarLabels(values: readonly string[]): string[][] | undefined {
    if (values.length < 2) return undefined;
    const times: number[] = [];
    for (const value of values) {
        const time = snapshotTime(value);
        if (time === undefined) return undefined;
        times.push(time);
    }
    const dates = times.map((time) => new Date(time));
    const midnight = dates.every((d) => d.getUTCHours() === 0 && d.getUTCMinutes() === 0
        && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0);
    if (!midnight) return undefined;
    const monthly = dates.every((d) => d.getUTCDate() === 1);
    if (monthly && dates.every((d) => d.getUTCMonth() === 0)) return undefined;
    const chronological = times.every((time, i) => i === 0 || time > times[i - 1]);
    return dates.map((d, i) => {
        const year = d.getUTCFullYear();
        const opensYear = !chronological || i === 0 || dates[i - 1].getUTCFullYear() !== year;
        const month = MONTHS[d.getUTCMonth()];
        const name = monthly ? month : `${month} ${d.getUTCDate()}`;
        return opensYear ? [name, String(year)] : [name];
    });
}

/** The widest line of each name. */
export function widestLines(names: readonly string[][], widthOf: (text: string) => number): number {
    return Math.max(0, ...names.flatMap((lines) => lines.map(widthOf)));
}

/**
 * For a renderer that sets its own band names (ECharts, Chart.js): the calendar names where the
 * names as written would not stand flat in their bands and the calendar's lines do; undefined
 * where the names as written stay.
 */
export function crowdedCalendarLabels(values: readonly string[], band: number, fontSize: number): string[][] | undefined {
    if (!(band > 0) || !(fontSize > 0)) return undefined;
    const calendar = calendarLabels(values);
    if (!calendar) return undefined;
    const widthOf = (text: string) => textWidth(text, fontSize);
    const gap = Math.max(6, fontSize / 2);
    if (Math.max(0, ...values.map(widthOf)) + gap <= band) return undefined;
    return widestLines(calendar, widthOf) + gap <= band ? calendar : undefined;
}
