// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Charts connected by the fields they share. The board holds one condition, a part per field in
 * the words filters use ({ in } or { range }). A selection on any chart sets the parts for the
 * fields its interaction selects by; every chart shows the condition on the fields its marks
 * carry; clearing on any chart clears it everywhere.
 *
 * Framework-free, so the server checks a link spec before anything mounts and the card runs it.
 */
import { validateChart, type ChartAssemblyInput, type ChartUpdate } from 'flint-chart';

/** One field's part of the board's condition. */
export type LinkPart = { in: unknown[] } | { range: [unknown, unknown] };

/** The board's condition: every part must hold. */
export type LinkCondition = Record<string, LinkPart>;

export interface LinkSpec {
  /** The fields the charts connect on. */
  fields: string[];
  /** Per chart: `send: false` keeps its selections to itself, `receive: false` keeps it as drawn. */
  charts?: Record<string, { send?: boolean; receive?: boolean }>;
}

/** One interaction on a chart that selects, and the connected fields its selection is about. */
export interface LinkGesture {
  preset: string;
  /** The connected fields the gesture selects by: a mark's fields, a group's field, an axis's field. */
  fields: string[];
  /** A hover selects only while the pointer stays; it links on a passing layer. */
  hover: boolean;
}

/** What one chart does in the link. */
export interface ChartLink {
  /** The connected fields a selection on this chart can be about. */
  sends: string[];
  /** The connected fields this chart's marks carry, which it emphasizes by. */
  receives: string[];
  /** The chart's selecting interactions, by interaction id. */
  gestures: Record<string, LinkGesture>;
  /** Why a field or a direction is left out. */
  notes: string[];
}

/** What one gesture selected: the parts it sets, from the chart and interaction it came from. */
export interface LinkSelection {
  source: string;
  interaction: string;
  parts: LinkCondition;
}

/** The id of the layer a link writes on every chart it emphasizes. */
export const LINK_LAYER = 'linked-selection';

const MUTED_OPACITY = 0.2;

interface InteractionEntry {
  type: string;
  id: string;
  options: Record<string, unknown>;
}

function interactions(input: ChartAssemblyInput): InteractionEntry[] {
  const entries = (input.interaction_spec as { interactions?: readonly unknown[] } | undefined)?.interactions ?? [];
  return entries.flatMap((entry) => {
    const record = (typeof entry === 'string' ? { type: entry } : entry) as { type?: unknown; id?: unknown; options?: unknown } | null;
    if (!record || typeof record.type !== 'string') return [];
    return [{ type: record.type, id: typeof record.id === 'string' ? record.id : record.type, options: (record.options ?? {}) as Record<string, unknown> }];
  });
}

function encodedField(input: ChartAssemblyInput, channel: string): string | undefined {
  const encoding = input.chart_spec.encodings?.[channel];
  if (typeof encoding === 'string') return encoding;
  const field = (encoding as { field?: unknown } | undefined)?.field;
  return typeof field === 'string' ? field : undefined;
}

const asList = (value: unknown): string[] => (typeof value === 'string' ? [value] : Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

/**
 * The fields an interaction's selection is about, before narrowing to the connected ones: a mark
 * is all its fields, a group its group field, an axis or a brush along it that axis's field.
 * Undefined for an interaction that does not select.
 */
function subject(entry: InteractionEntry, input: ChartAssemblyInput): { fields: string[] | 'marks'; hover: boolean } | undefined {
  const series = [encodedField(input, 'color'), encodedField(input, 'detail')].filter((field): field is string => !!field);
  switch (entry.type) {
    case 'click-highlight':
    case 'select':
    case 'lasso-select':
      return { fields: 'marks', hover: false };
    case 'click-group-focus':
      return { fields: asList(entry.options.groupBy).length > 0 ? asList(entry.options.groupBy) : series.slice(0, 1), hover: false };
    case 'hover-group-focus':
      return { fields: asList(entry.options.groupBy), hover: true };
    case 'brush-x':
      return { fields: asList(encodedField(input, 'x')), hover: false };
    case 'brush-y':
      return { fields: asList(encodedField(input, 'y')), hover: false };
    case 'axis-highlight': {
      const axes = entry.options.axis === 'x' || entry.options.axis === 'y' ? [entry.options.axis] : ['x', 'y'];
      return { fields: axes.flatMap((axis) => asList(encodedField(input, axis))), hover: entry.options.event === 'hover' };
    }
    default:
      return undefined;
  }
}

function sampleValue(input: ChartAssemblyInput, field: string): unknown {
  const rows = (input.data.values ?? []) as Record<string, unknown>[];
  return rows.find((row) => row != null && row[field] !== undefined && row[field] !== null)?.[field];
}

/** Whether the chart's marks carry the field, the way a link emphasizes them; the reason when they do not. */
function carries(input: ChartAssemblyInput, field: string): { ok: true } | { ok: false; reason: string } {
  const value = sampleValue(input, field);
  if (value === undefined) return { ok: false, reason: `no field ${field} in its data` };
  const probe = {
    id: 'link-probe',
    ops: [{ op: 'set-style', targets: [{ select: { key: { [field]: value } } }], value: { state: 'emphasized' } }],
  } as ChartUpdate;
  const op = validateChart(input, 'vegalite', { updates: [probe] }).updates?.[0]?.ops[0];
  return op && !op.ok ? { ok: false, reason: `its marks do not carry ${field}; encode it, on detail if nothing else shows it` } : { ok: true };
}

/** What each chart sends and receives under the spec, and why anything is left out. */
export function validateLinks(inputs: Record<string, ChartAssemblyInput>, spec: LinkSpec): Record<string, ChartLink> {
  const result: Record<string, ChartLink> = {};
  for (const [id, input] of Object.entries(inputs)) {
    const role = spec.charts?.[id] ?? {};
    const notes: string[] = [];
    const carried: string[] = [];
    for (const field of spec.fields) {
      const check = carries(input, field);
      if (check.ok) carried.push(field);
      else notes.push(`leaves out ${field}: ${check.reason}`);
    }
    const gestures: Record<string, LinkGesture> = {};
    if (role.send !== false) {
      for (const entry of interactions(input)) {
        const about = subject(entry, input);
        if (!about) continue;
        const fields = about.fields === 'marks' ? carried : about.fields.filter((field) => carried.includes(field));
        if (fields.length > 0) gestures[entry.id] = { preset: entry.type, fields, hover: about.hover };
        else if (about.fields !== 'marks') notes.push(`${entry.id} selects by ${about.fields.join(', ') || 'no field'}, which is not connected`);
      }
    }
    const sends = [...new Set(Object.values(gestures).flatMap((gesture) => gesture.fields))];
    if (role.send === false) notes.push('sends nothing (send: false)');
    else if (sends.length === 0 && carried.length > 0 && Object.keys(gestures).length === 0 && !notes.some((note) => note.includes('not connected'))) {
      notes.push('sends nothing: no interaction that selects; add one such as click-highlight or select');
    }
    if (role.receive === false) notes.push('receives nothing (receive: false)');
    result[id] = { sends, receives: role.receive === false ? [] : carried, gestures, notes };
  }
  for (const id of Object.keys(spec.charts ?? {})) {
    if (!(id in inputs)) result[id] = { sends: [], receives: [], gestures: {}, notes: [`no chart "${id}" on the board`] };
  }
  return result;
}

/** The distinct combinations of the fields among selected marks, from the marks or the rows behind them. */
export function selectionTuples(
  elements: readonly { value?: Record<string, unknown>; records?: readonly Record<string, unknown>[] }[],
  fields: readonly string[],
): Record<string, unknown>[] {
  const seen = new Map<string, Record<string, unknown>>();
  const add = (source: Record<string, unknown>) => {
    const tuple: Record<string, unknown> = {};
    for (const field of fields) {
      const value = source[field];
      if (value === undefined || value === null) return;
      tuple[field] = value;
    }
    seen.set(JSON.stringify(tuple), tuple);
  };
  for (const element of elements) {
    if (fields.every((field) => element.value?.[field] !== undefined)) add(element.value!);
    else for (const record of element.records ?? []) add(record);
  }
  return [...seen.values()];
}

const isBrush = (preset: string) => preset === 'brush-x' || preset === 'brush-y';

/**
 * The parts a gesture's selected marks set: a brush the span of each numeric or temporal field it
 * covers, any other gesture the values each field takes.
 */
export function selectionParts(
  elements: readonly { value?: Record<string, unknown>; records?: readonly Record<string, unknown>[] }[],
  gesture: LinkGesture,
): LinkCondition {
  const tuples = selectionTuples(elements, gesture.fields);
  const parts: LinkCondition = {};
  for (const field of gesture.fields) {
    const values = [...new Map(tuples.map((tuple) => [JSON.stringify(tuple[field]), tuple[field]])).values()];
    if (values.length === 0) continue;
    if (isBrush(gesture.preset) && values.every((value) => typeof value === 'number')) {
      const numbers = values as number[];
      parts[field] = { range: [Math.min(...numbers), Math.max(...numbers)] };
    } else {
      parts[field] = { in: values };
    }
  }
  return parts;
}

/** The fields of the condition a chart shows: those its marks carry. */
export function shownFields(link: ChartLink, condition: LinkCondition): string[] {
  return Object.keys(condition).filter((field) => link.receives.includes(field));
}

/** The layer each chart shows for the condition: emphasis on its marks that meet every part it can read. */
export function conditionUpdates(links: Record<string, ChartLink>, condition: LinkCondition): Map<string, ChartUpdate> {
  const result = new Map<string, ChartUpdate>();
  for (const [id, link] of Object.entries(links)) {
    const fields = shownFields(link, condition);
    if (fields.length === 0) continue;
    result.set(id, {
      id: LINK_LAYER,
      ops: [{
        op: 'set-style',
        targets: [{ select: { where: Object.fromEntries(fields.map((field) => [field, condition[field]])) } }],
        value: { state: 'emphasized', mutedOpacity: MUTED_OPACITY },
      }],
    } as ChartUpdate);
  }
  return result;
}

/** The link as the model reads it: what each chart sends, by which interaction, and receives, and what is left out. */
export function linkLines(links: Record<string, ChartLink>): string[] {
  return Object.entries(links).map(([id, link]) => {
    const sends = Object.entries(link.gestures).map(([gesture, info]) => `${info.fields.join(' + ')} by ${gesture}${info.hover ? ' (hover)' : ''}`);
    const parts = [
      sends.length > 0 ? `sends ${sends.join(', ')}` : '',
      link.receives.length > 0 ? `receives ${link.receives.join(', ')}` : '',
    ].filter(Boolean);
    const mark = link.sends.length === 0 && link.receives.length === 0 ? '✗' : '✓';
    return `${mark} ${id}: ${parts.join('; ') || 'not linked'}${link.notes.length > 0 ? `; ${link.notes.join('; ')}` : ''}`;
  });
}
