/**
 * The case a type role asks for, applied wherever its text is measured and drawn: strings Flint
 * writes (titles) are cased here; labels the renderer draws from data are cased by an expression.
 */
export type TextCase = 'asIs' | 'upper' | 'lower' | 'title' | 'sentence';

/** Short words a title-cased phrase keeps lower-case except at its ends. */
const MINOR = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'vs', 'via']);

const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/**
 * `upper` and `lower` change every letter. `title` capitalises each word's first letter, keeps short
 * joining words lower-case inside the phrase, and leaves the rest of each word — acronyms, “iPhone” —
 * as written. `sentence` capitalises the first letter only and leaves the rest as written, so proper
 * nouns and acronyms survive.
 */
export function applyTextCase(text: string, textCase: TextCase | undefined): string {
    if (!text || !textCase || textCase === 'asIs') return text;
    if (textCase === 'upper') return text.toUpperCase();
    if (textCase === 'lower') return text.toLowerCase();
    if (textCase === 'sentence') return capitalise(text);
    const words = text.split(/(\s+)/);
    const last = words.length - 1;
    return words.map((w, i) => {
        if (!w.trim()) return w;
        if (i > 0 && i < last && MINOR.has(w.toLowerCase())) return w.toLowerCase();
        return capitalise(w);
    }).join('');
}

/**
 * A Vega expression that cases `expr`. Title case needs the words, which an expression cannot split
 * and rejoin: given the values it will see, it looks each up; anything else takes sentence case.
 */
export function textCaseExpr(expr: string, textCase: TextCase | undefined, values?: readonly string[]): string {
    if (!textCase || textCase === 'asIs') return expr;
    if (textCase === 'upper') return `upper(${expr})`;
    if (textCase === 'lower') return `lower(${expr})`;
    const sentence = `upper(substring(${expr}, 0, 1)) + substring(${expr}, 1)`;
    if (textCase === 'sentence' || !values?.length) return sentence;
    const known = [...new Set(values)];
    const index = `indexof(${JSON.stringify(known)}, ${expr})`;
    return `${index} < 0 ? ${sentence} : ${JSON.stringify(known.map((v) => applyTextCase(v, 'title')))}[${index}]`;
}

/**
 * Case the text of a label expression: a bare label, the fallback of a lookup Flint wrote
 * (`… < 0 ? datum.label : lines[i]`), whose looked-up lines were cased when they were measured, or
 * the names a thinned axis prints (`… >= 0 ? datum.label : ''`).
 */
export function caseLabelExpr(existing: string | undefined, textCase: TextCase | undefined, values?: readonly string[]): string | undefined {
    if (!textCase || textCase === 'asIs') return existing;
    if (!existing) return textCaseExpr('datum.label', textCase, values);
    if (existing.includes('< 0 ? datum.label :')) {
        return existing.replace('< 0 ? datum.label :', `< 0 ? (${textCaseExpr('datum.label', textCase, values)}) :`);
    }
    // Some names printed, the rest blank (a sequence thinned to round values).
    const kept = `>= 0 ? datum.label : ''`;
    if (existing.includes(kept)) return existing.replace(kept, `>= 0 ? (${textCaseExpr('datum.label', textCase, values)}) : ''`);
    return existing;
}
