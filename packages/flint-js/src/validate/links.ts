// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { ChartAssemblyInput } from '../core/types';
import type { ChartUpdate } from '../core/interaction-contracts';
import { drawsAsTable } from '../vegalite/templates';
import type { ChartLink, LinkGesture, LinkSpec } from '../interactive/link';
import { validateChart } from './index';

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
        else if (drawsAsTable(input.chart_spec.chartType)) notes.push('sends nothing: a Table does not send selections');
        else if (sends.length === 0 && carried.length > 0 && Object.keys(gestures).length === 0 && !notes.some((note) => note.includes('not connected'))) {
            notes.push('sends nothing: no interaction that selects; add one such as click-highlight or select');
        }
        if (role.receive === false) notes.push('receives nothing (receive: false)');
        result[id] = { sends, receives: role.receive === false ? [] : carried, gestures, notes };
    }
    for (const id of Object.keys(spec.charts ?? {})) {
        if (!(id in inputs)) result[id] = { sends: [], receives: [], gestures: {}, notes: [`no chart "${id}" among the linked charts`] };
    }
    return result;
}
