// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * A selection as short chips, one per field the reader acted on: `Country: 7`, `Region: Asia`,
 * `Month: 2025-03–2025-06`. The board card and the chart card show them in their bars.
 */
import type { ChartAssemblyInput } from 'flint-chart';

import type { LinkPart } from 'flint-chart/interactive';

/** The most chips a bar shows before it folds the rest into "+N". */
const MAX_CHIPS = 3;

/**
 * A selected value as the data writes it: a time the chart read from a date string prints as that
 * date, and a time the chart read from a year number prints as that year.
 */
export function valueText(value: unknown, input: ChartAssemblyInput | undefined, field: string): string {
  const sample = ((input?.data.values ?? []) as Record<string, unknown>[]).find((row) => row?.[field] != null)?.[field];
  if (typeof value === 'number' && typeof sample === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, sample.length <= 7 ? 7 : 10);
  }
  if (typeof value === 'number' && input?.semantic_types?.[field] === 'Year' && Math.abs(value) >= 1e5) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return String(date.getUTCFullYear());
  }
  return String(value);
}

/**
 * The fields of one selection that another of its fields determines in the chart's rows, as each
 * country lies in one region: each maps to the field that implies it. Of two fields that determine
 * each other, the first stays shown.
 */
export function impliedParts(fields: readonly string[], rows: readonly Record<string, unknown>[]): Record<string, string> {
  const determines = (a: string, b: string) => {
    const seen = new Map<string, string>();
    for (const row of rows) {
      const key = JSON.stringify(row?.[a]);
      const value = JSON.stringify(row?.[b]);
      if (seen.has(key) && seen.get(key) !== value) return false;
      seen.set(key, value);
    }
    return rows.length > 0;
  };
  const implied: Record<string, string> = {};
  for (const b of fields) {
    const by = fields.find((a) => a !== b && !(a in implied) && determines(a, b) && (!determines(b, a) || fields.indexOf(a) < fields.indexOf(b)));
    if (by) implied[b] = by;
  }
  return implied;
}

/** A part as a short chip: `Country: 7`, `Region: Asia`, `Month: 2025-03–2025-06`. */
export function chipText(field: string, part: LinkPart, input: ChartAssemblyInput | undefined): string {
  const named = input?.field_display_names?.[field] ?? field;
  const label = named.charAt(0).toUpperCase() + named.slice(1);
  if ('range' in part) return `${label}: ${valueText(part.range[0], input, field)}–${valueText(part.range[1], input, field)}`;
  return `${label}: ${part.in.length === 1 ? valueText(part.in[0], input, field) : part.in.length}`;
}

/** A part as the reader and the model read it, dates as the data writes them. */
export function partText(field: string, part: LinkPart, input: ChartAssemblyInput | undefined): string {
  const named = (value: unknown) => valueText(value, input, field);
  if ('range' in part) return `${field} from ${named(part.range[0])} to ${named(part.range[1])}`;
  const listed = part.in.slice(0, 8).map(named).join(', ');
  return `${field} ${part.in.length === 1 ? listed : `in ${listed}${part.in.length > 8 ? `, and ${part.in.length - 8} more` : ''}`}`;
}

export interface SelectionChip {
  field: string;
  /** What the chip shows. */
  label: string;
  /** The whole part, on hover. */
  full: string;
}

/**
 * The chips of a selection. With `onRemove` each chip lets its part go, and a Clear lets them all
 * go once there are two; without it one × clears the selection.
 */
export function SelectionChips(props: {
  chips: readonly SelectionChip[];
  onRemove?: (field: string) => void;
  onClear: () => void;
}) {
  const { chips, onRemove, onClear } = props;
  if (chips.length === 0) return null;
  const shown = chips.slice(0, MAX_CHIPS);
  const more = chips.slice(MAX_CHIPS);
  return (
    <div className="board-selection" role="status" aria-label="Selection">
      {shown.map((chip) => (
        <span className={onRemove ? 'board-chip board-chip-removable' : 'board-chip'} key={chip.field} title={chip.full}>
          <span className="board-chip-text">{chip.label}</span>
          {onRemove && (
            <button type="button" className="board-chip-clear" aria-label={`Remove ${chip.full}`} onClick={() => onRemove(chip.field)}>×</button>
          )}
        </span>
      ))}
      {more.length > 0 && (
        <span className="board-chip board-chip-more" title={more.map((chip) => chip.full).join('\n')}>+{more.length}</span>
      )}
      {onRemove ? (
        chips.length > 1 && <button type="button" className="board-selection-clear-all" onClick={onClear}>Clear</button>
      ) : (
        <button type="button" className="board-chip-clear" aria-label="Clear the selection" title="Clear the selection" onClick={onClear}>×</button>
      )}
    </div>
  );
}
