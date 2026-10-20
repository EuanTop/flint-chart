# Linked charts: one selection the whole board shares

Status: in `flint-js`. `linkCharts` and the shared functions are in `flint-chart/interactive`
(`src/interactive/link.ts`), `validateLinks` in `flint-chart/validate`, `useLinkedCharts` in
`flint-chart/react`. The MCP board checks links with `validateLinks` and keeps its own runtime in
the card.

## Problem

Today a host links charts by hand. The connected-views application demo
(`site/src/playground/release-examples/application-demos-connected.tsx`) reads each chart's
`onChange`, maps the selection to keys in its own code, and `dispatch`es an
`externalInteraction` on the other chart. The MCP board first shipped the same idea as data:
`{ from, to, field }` pairs.

Pairs do not scale or compose:

- A board of n charts needs up to n(n−1) directed pairs, and a missing one reads as a bug.
- Nothing defines what a chart shows when two charts hold a selection, so the reader has to track
  which chart holds which and clear them one by one.
- Each pair re-solves echo (a write that routes back to its source) and reset.

## Model

The board holds **one condition**, a part per field, in the words filters already use:

```
region in [Asia]  AND  month from 2025-03 to 2025-06
```

- **A gesture sets the parts for the fields it is about.** The interaction decides: a click on a
  mark (`click-highlight`, `select`, `lasso-select`) sets every connected field the mark carries;
  a group focus its group field (`groupBy`, else the chart's series field); a brush its axis field,
  as a range; an axis highlight that axis's field. A part on a field the condition already holds
  replaces it; a new field joins with AND.
- **Every chart shows the condition** on the fields its marks carry, the chart the gesture came
  from included, through one `set-style` layer (`linked-selection`) with a single
  `{ select: { where } }` target. A chart that carries none of the condition's fields stays as
  drawn. The source drops its own emphasis once its parts join the condition, so every chart
  shows the same thing.
- **A reset anywhere clears it everywhere.** A click on nothing, Escape or a double-click on any
  chart, or the selection chip, empties the condition.
- **Hover previews.** A hover interaction (`hover-group-focus`, `axis-highlight` with
  `event: "hover"`) shows its part over the condition while the pointer stays. Only committed
  selections reach an agent's context.
- **Charts join as far as they can,** the way presets are admitted: a chart *receives* a field
  when its marks carry it (the update validator decides); it *sends* through each selecting
  interaction whose subject includes a connected field; `charts.<id>.send: false` /
  `receive: false` set a chart apart. What is left out is reported, never fatal in a spec.

The condition is runtime state held by the host, never in a spec. The spec says only which fields
connect and how charts take part, which is behaviour, like `interaction_spec`.

```json
"link_spec": { "fields": ["region", "month"], "charts": { "trend": { "receive": false } } }
```

## What it rests on in flint-js

- **`where` targets** (`core/target-selector.ts`, committed separately). `set-style` takes
  `{ select: { where: { field: { in: [...] } | { range: [low, high] } } } }`; a key and a where
  compile to one predicate, so they match by one rule. This is what lets the condition be a single
  target: no list of every combination, and ranges that cover values the data does not hold.
- **Reset reports.** A reader's reset gesture now reaches `onChange` as a commit with
  `reset: 'click-none' | 'escape' | 'double-click'`, even when the chart held nothing to reset. A
  host that shows a selection of its own, as the board does once a chart's emphasis has joined
  the condition, hears the reader ask to clear.

## One definition, three forms

The link spec is plain data, so it is both the code options and the spec, as a preset is both a
factory and a `{ type, options }` entry.

| Form | Use |
|---|---|
| `validateLinks(inputs, spec)` | Checks charts before mounting: what each sends, by which interaction, and receives, and why a field is left out. The MCP server reports it. |
| `linkCharts(charts, spec, { links? })` | Plain JS over mounted charts, each `{ input, surface }`: `onChange` in, the condition layer out through `applyUpdate`. Returns `{ ready, links, condition, onCondition, select, clear, destroy }`; `links` holds each chart's notes; `select(parts)` sets parts from the host (a table row, a filter control) as a chart's selection would, `null` letting a field go. |
| `useLinkedCharts(inputs, spec)` | React: holds the condition and gives each `<FlintChart>` its `onChange`, `onRender` and `updates` through `chart(id)`, and `select`/`clear` for the host. Survives remounts, because `<FlintChart>` re-applies `updates`. |

All three share framework-free functions: `selectionParts(elements, gesture)` reads a gesture
into parts, and `conditionUpdates(links, condition)` gives each chart its layer.

## Scope

In: emphasis, sets and ranges, one shared condition, hover preview.

Out, by Flint's contract: filtering and re-aggregation. The host owns the data and Flint computes
no statistics; a host that wants a cross-filter recomputes its rows and writes them with
`set-data`. Charts connect on a field only where both carry it; Flint does not join datasets to
learn which countries make a region.

Known approximation: a selection of several marks becomes one part per field, so two fields that
vary apart admit combinations no selected mark had (Asia in March and Europe in June also admit
Asia in June). Where one field determines the other (country → region) nothing changes.

## Change size

| Piece | Where | Size |
|---|---|---|
| `where` targets | update language, validator, runtime, docs, skill | done |
| Reset reports | `ChartChange.reset`, runtime, change filter | done |
| `linkCharts`, shared functions | `flint-chart/interactive` | done |
| `validateLinks` | `flint-chart/validate`, loaded by `linkCharts` on first use | done |
| `useLinkedCharts` | `flint-chart/react` | done |
| MCP board on the core module | `flint-mcp` | imports done; the card still runs its own condition (chips, implied parts) |

## Alternatives considered

- **Pairs, or field sugar expanded into pairs.** Stays MCP-only and leaves combination, echo and
  clearing to each pair.
- **Links inside each chart's `interaction_spec`** with charts finding each other through a shared
  group. Declarative, but it needs hidden coupling between separately mounted charts, and a
  chart's spec would start to describe other charts.
- **One selection per chart, each chart showing the others' (crossfilter's "exclude own").** The
  reader then tracks which chart holds what and clears each; with emphasis rather than filtering
  there is nothing to exclude a chart's own selection for, since dimmed marks stay clickable.
- **Shared data with aggregating clients** (crossfilter, Mosaic). The most powerful, and it turns
  Flint into a data engine.

## Open questions

1. Adding to a part instead of replacing it (shift-click to add Europe to Asia).
2. Re-reading a `where` target when the data or the viewport changes; today every target resolves
   once when it is applied, as keys do.
