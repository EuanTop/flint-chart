/**
 * JSON for people to read and edit: pretty-printed, but any object or array whose one-line form
 * fits the line stays on one line (`{ "size": 14, "weight": "bold" }`), and a long run of plain
 * values — a palette, a list of steps — fills its lines rather than taking one line each.
 */
export function compactJson(value: unknown, maxWidth = 100, indent = 2): string {
  const pad = (level: number) => ' '.repeat(level * indent);
  const primitive = (v: unknown) => v === null || typeof v !== 'object';

  const inline = (v: unknown): string => {
    if (primitive(v)) return JSON.stringify(v) ?? 'null';
    if (Array.isArray(v)) return v.length ? `[${v.map(inline).join(', ')}]` : '[]';
    const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined);
    return entries.length ? `{ ${entries.map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(', ')} }` : '{}';
  };

  const format = (v: unknown, level: number, lead: number): string => {
    if (primitive(v)) return JSON.stringify(v) ?? 'null';
    const one = inline(v);
    // The one-line form, its key before it and a trailing comma after it, within the line.
    if (pad(level).length + lead + one.length + 1 <= maxWidth) return one;
    if (Array.isArray(v)) {
      if (v.every(primitive)) {
        // Plain values fill their lines.
        const lines: string[] = [];
        let line = '';
        for (const item of v.map((x) => JSON.stringify(x) ?? 'null')) {
          const next = line ? `${line}, ${item}` : item;
          if (line && pad(level + 1).length + next.length + 1 > maxWidth) {
            lines.push(line);
            line = item;
          } else line = next;
        }
        if (line) lines.push(line);
        return `[\n${lines.map((l) => pad(level + 1) + l).join(',\n')}\n${pad(level)}]`;
      }
      return `[\n${v.map((x) => pad(level + 1) + format(x, level + 1, 0)).join(',\n')}\n${pad(level)}]`;
    }
    const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined);
    return `{\n${entries.map(([k, x]) => {
      const key = `${JSON.stringify(k)}: `;
      return pad(level + 1) + key + format(x, level + 1, key.length);
    }).join(',\n')}\n${pad(level)}}`;
  };

  return format(value, 0, 0);
}
