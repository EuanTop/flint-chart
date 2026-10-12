/**
 * Escape characters that Vega-Lite interprets as field-access path syntax.
 *
 * In Vega-Lite a `field` string like `"a.b"` is parsed as a nested accessor
 * (`datum.a.b`), and `"a[0]"` as array indexing. Column names that literally
 * contain `.`, `[`, or `]` (e.g. `"Oranges, Navel, per lb."`) must therefore be
 * escaped with a backslash so the renderer resolves the flat key instead of an
 * undefined nested path (which silently produces empty marks).
 *
 * Only the `field` accessor string needs escaping — direct JS data access via
 * `row[fieldName]` continues to use the raw, unescaped name.
 */
export const escapeVlFieldName = (name: string): string =>
    name.replace(/[.[\]]/g, (ch) => `\\${ch}`);
