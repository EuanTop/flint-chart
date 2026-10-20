/**
 * The parenthetical a string ends with, as `/\(([^)]*)\)\s*$/` finds it: the leftmost `(` after
 * which no `)` comes before the closing one. Read with index scans, so a long run of brackets or
 * spaces in a title or field name costs linear time instead of a regular expression's backtracking.
 */
export function trailingParenthetical(text: string): { inner: string; before: string } | undefined {
    const trimmed = text.trimEnd();
    if (!trimmed.endsWith(')')) return undefined;
    const close = trimmed.length - 1;
    const open = trimmed.indexOf('(', trimmed.lastIndexOf(')', close - 1) + 1);
    if (open === -1 || open >= close) return undefined;
    return { inner: trimmed.slice(open + 1, close), before: trimmed.slice(0, open) };
}
