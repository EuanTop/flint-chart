# Layout Plan

How Flint separates the decisions that lay a chart out from the code that writes a backend spec,
and how a mounted chart lays itself out again when its rows or its visible window change.

> Status: built for Vega-Lite single-view and faceted charts (§10). The sizing rules the planner
> runs are described in [Auto Layout Algorithm](design-stretch-model.md); the compile stages are
> introduced in [Architecture](architecture.md).

## Table of Contents

- [§1 Overview](#1-overview)
- [§2 Why a plan](#2-why-a-plan)
- [§3 Stages](#3-stages)
- [§4 What the plan decides](#4-what-the-plan-decides)
- [§5 Templates in the plan](#5-templates-in-the-plan)
- [§6 Theme in the plan](#6-theme-in-the-plan)
- [§7 Backends](#7-backends)
- [§8 Sessions, pins and live layout](#8-sessions-pins-and-live-layout)
- [§9 Checks](#9-checks)
- [§10 Milestones](#10-milestones)
- [§11 Cost](#11-cost)
- [§12 Open items](#12-open-items)
- [§13 Decision record](#13-decision-record)
- [Appendix: where each decision is made](#appendix-where-each-decision-is-made)

---

# §1 Overview

A Flint compile answers two kinds of question. **What does the data say**: field types, formats,
sort orders, counts. **How does the chart fit its size**: plot size, band step, label angle, where
the keys and title go, how much room they take. The layout plan gives each kind its own stage, so
either can be computed again without the other.

```
analyze(input)            → Analysis      data and spec only
plan(analysis, context)   → LayoutPlan    size, rows in view, theme, backend profile, pins
emit(plan, analysis)      → backend spec
```

| Term | Meaning |
|---|---|
| **Analysis** | Everything a compile learns from the data and the chart spec. It never depends on size or theme. |
| **Layout plan** | Every decision that takes room or depends on the available size, in one backend-neutral object. |
| **Layout planner** | The module that makes the plan (`core/plan.ts`). |
| **Emit** | Translation of the plan into a backend spec, plus styling. It makes no layout decision. |
| **Structure** | What a chart draws, by meaning, as its template states it before the plan (§5). |
| **Furniture** | What a chart draws around its plot that takes room: tick labels, axis titles, keys, title, facet headers. |
| **Pin** | A decision handed to the planner as a fixed value, by the author or by a mounted chart holding what it drew. |
| **Departure** | Where a chart differs from what its theme or author stated, reported with a reason (§6). |
| **Move / fix** | A move relocates a decision and leaves every drawn chart identical; a fix changes output on purpose. |

# §2 Why a plan

Before the plan, the Vega-Lite compile ran as one function whose phases leaked into each other:

- Phase 1 sized the plot with placeholders (Vega-Lite's default fonts, a fixed facet padding,
  guessed margins such as a 30 px title block), and the theme's fonts and title arrived later, so a
  themed chart could exceed its `canvasSize` and its tick count read a plot the title later shrank.
- The theme decided room after the plot was sized: tick counts, legend placement and wrap, value
  labels, title wrapping and padding, reading the emitted Vega-Lite spec for facts about the chart.
- Every runtime change ran the whole compile: a zoom window, a filter, a resize. Live layout planned
  each window against a plot it did not draw, up to 7% narrower than the mounted one.
- The plot size a host could read was Phase 1's, which a banded axis, widened band labels and a
  fitted title all changed after the fact.

The plan makes one place decide each of these, with real values, once per rows-in-view.

# §3 Stages

`assembleVegaLite` is four calls; each stage is a pure function of its inputs and never edits an
earlier stage's output.

| Stage | Function | Inputs | Output |
|---|---|---|---|
| prepare | `prepareVegaLite` | the input spec, theme presets | template, chart properties, theme |
| analyze | `analyzeChart` (`core/analyze.ts`) | rows, chart spec | `ChartAnalysis` |
| plan | `planLayout` (`core/plan.ts`) | analysis, `PlanContext` | `LayoutPlan` |
| emit | `emitVegaLite` (`vegalite/assemble.ts`) | plan, analysis, theme style | Vega-Lite spec |

**Analyze.** A type pre-pass (`resolveChannelTypes`) infers each channel's type so encoding
overrides can apply, then one semantics pass resolves the shaped encodings. The analysis holds
whole-data facts (types, formats, zero, domain constraints, sort orders) and keeps a reference to
the converted rows; `shapeRows` shapes rows a host supplies. Facts that read the data's span
(`temporalFormat`, `zero`, domain constraints, a diverging midpoint) stay at their whole-data
values, so a window keeps the chart's format.

**Plan.** `planLayout(analysis, context)` makes every layout decision (§4). Its context:

| Input | Field |
|---|---|
| Size | `size.baseSize`, `size.canvasSize` |
| Rows in view | `rows`: all rows, or what a window or filter leaves |
| Theme | `theme`, grounded in the plan into `DesignDecisions` (§6) |
| Backend profile | `profile`: defaults, fallbacks, band padding, text measurer, spacing (§7) |
| Pins | `pins`: plot, title, reserve, axis labels (§8) |

The plan runs in two parts: what it settles before the plot (options, facet grid, overflow
truncation), then `planAroundPlot`, which lays out the plot and decides everything that sits on or
around it. Where a band step fits the room the canvas leaves, `planAroundPlot` runs twice (§4.8).

**Emit.** `buildVegaLite` is the template stage: the template instantiates its skeleton at the
plan's sizes. Emit then writes the plan's decisions, runs theme realization for style, and writes
the key layout. Realization receives the plan's decisions and does not change them.

# §4 What the plan decides

`LayoutPlan` holds each decision with the facts it was made from. Each keeps the method it had
before it moved into the plan; a fix corrects its inputs (§13).

## §4.1 Plot and steps

- **Plot** (`plan.plot`): a banded axis spans its step times its bands (plus a band for a
  truncation placeholder), shaped as the template declares (`bandAxes`: plain, nested, or a point
  scale with an inset); the theme's bar fill comes from `resolveBandFraction`. A template that sizes
  itself decides its plot in `planPlot` (pie, rose, radar, map, faceted violin, calendar). A composite
  chart's plot is one panel's.
- **Steps** come from `computeLayout` (the sizing model of [Auto Layout Algorithm](design-stretch-model.md)),
  with two-line band labels planned in the plan (`planBandLabels`). The layout reports which steps
  it fitted to the room (`xStepFitted`, `yStepFitted`).
- **Banded continuous spans** (`plan.bandSpans`): a banded quantitative or temporal axis spans its
  data and half a band past each end, so the edge bands show whole.

## §4.2 Axes

- **Tick labels** (`plan.axisLabels`, `core/axis-labels.ts`): size, face, limit, separation, line
  height and angle per axis, from the fitted label sizing, the theme's preferences and plan facts.
  The theme's size holds unless the layout had to shrink labels to fit their bands (`crowdedFrom`).
  One measured rule decides whether category names read straight: the widest name as the renderer
  measures it, plus a 6 px gap, against the band. Names too wide turn −45°, or upright where the
  band is narrower than a turned line, unless the layout fitted an angle; a theme's straight request
  that cannot stand is refused (`straightRefused`). A template that labels an axis itself states
  its decisions (`LayoutDeclaration.axisLabels`) and the plan holds them as pinned.
- **Axis titles** (`plan.axisTitles`): the template's own, else the title its encoding carries,
  only where the axis shows that encoding's field.
- **Domains and extents** (`plan.domains`, `core/measure-domain.ts`): Flint's semantic domain rule
  (constraints judged against stacked totals, the zero floor, a stack's clean top) and the values
  each measure axis must show; zero follows a baseline the template states.
- **Ruler** (`plan.rulers`, `core/ruler.ts`): a themed single-view measure axis's domain and tick
  values. The step is the 1, 2 or 5 step nearest the theme's tick spacing on the drawn axis, kept
  apart by the measured labels; gridded free ends round to the step, ungridded ones as the backend
  rounds. Axes the template rules, aggregates, bins, log scales, composites, live layouts and
  unthemed charts keep the backend's ruler.

## §4.3 Title

`planTitle` (`core/title-plan.ts`) fits a single-view chart's headline and deck to its block: set
down a size, or broken over even lines whose extra height comes out of the plot. The deck is the
author's plus the axis titles a theme moves there.

## §4.4 Keys and series names

- **Where series are named** (`planLegendPlacement`, `core/series-end.ts`): a theme's series-end
  names stand only on runs with an end, a series that is not the category axis, an open run and a
  free margin, dodged apart within a line; otherwise the theme's next ranked placement. A chart that
  prints its own end labels keeps them (`legend.ownNames`).
- **Which keys show** (`planLegend`, `core/legend-plan.ts`): titles a theme drops, round samples for
  a key to values, the colour fold ("Others (N)", across the whole chart), each key's entries.
- **Key layout** (`planKeyLayout`, `core/legend-layout.ts`): each key's edge, columns, label and
  title wrapping, and how keys sharing an edge stand, searched by cost. Keys are measured as Vega
  sets them. The theme's ranked placements are cheap; an edge it did not rank costs more than an
  extra row of keys. A theme's `arrangement`, `titlePosition` and `align` are preferences priced the
  same way; they give way only where keys would overflow, with a departure reported. The plan owns
  the gap between keys (1.5 label sizes, or for `spread` the room the keys leave) and the anchor;
  keys in a row share its middle.

## §4.5 Value labels

`planValueLabels` (`core/value-label-plan.ts`): the measure printed or why none is, the form (cells,
along slices, centred in segments, at mark ends), inside or past the end, the smallest segment that
keeps its label, and the headroom or inset labels past bar ends need. Segments are bands that hold
several rows (`segmentedBands`), the same fact the domain reads.

## §4.6 Marks

- **Category order** (`plan.orders`): the author's order, else the field's own; a template's stated
  order replaces a data order or, where fixed, any order.
- **Size range** (`plan.sizes`): the theme's range for quantities, its smallest area a floor, else
  a fair share of the canvas per row.
- **Dots** (`plan.pointSize`, `plan.points`): a theme's dot size, shrunk where the dots would ink more
  than 12% of the panel they are drawn in; the scale opens by the drawn dot's outer radius on the
  axes of dots nothing anchors.

## §4.7 Facets

`planFurniture` (`core/furniture-plan.ts`): the gap between panels, binned quantitative facets,
whether a wrapped facet's panels take their own y scale, and a flat y title's lift and the room it
adds.

## §4.8 Room kept for the furniture

Where a banded axis fits its steps to the room (a theme's `bandStepFit` with a `canvasSize` past the
base size), the room is the canvas less the furniture. The plan lays the plot out with no room kept,
measures the furniture it decided (`measureReserve`, `core/furniture-reserve.ts`: widest tick label,
turned axis titles, side and stacked keys, series-end names, headline and deck's first lines, a flat
y title, column facet headers), and lays the plot out again with that room kept, no more than 40% of
the canvas. One pass: a narrower step that turns labels is not measured again. The result is
`plan.reserve`, pinned on every replan.

# §5 Templates in the plan

The theme's room decisions need to know what a chart draws before the template builds it. Templates
therefore describe their chart by meaning (`ChartStructure`, `core/structure.ts`): marks; per axis
its type, fields (two for a range), a derived measure or grouping, a baseline, an extent, whether it
rounds, whether the template rules it (`ownScale`), a fitted curve, a reversed run, a category order;
the series colour tells apart; stacking intent; keys; and the titles the template sets. A default
reads the skeleton; a template whose `instantiate` builds something else writes `structure`, sharing
its conditions with `instantiate` through one function.

Decisions a template makes about its own layout are stated through its declaration
(`declareLayoutMode`): band shapes, axis flags, parameter overrides, and tick labels it sets itself.

`tests/chart-structure.test.ts` compares each template's stated structure with the facts read from
what it built, over every generated test case in no theme and each preset, so a template's two halves
cannot drift.

# §6 Theme in the plan

**Principle.** What takes no room is style, and the theme decides it: ink, faces, weights, rules,
mark shapes. What takes room is layout, and the theme states preferences the planner decides within:
key placement and arrangement, label angle and size, band step, value labels, title placement. The
planner holds a preference unless the chart cannot carry it, and reports the departure. Precedence:
author pins, then what the theme marks as fixed, then the theme's preferences, then the planner's
defaults.

**Where the theme runs.** Grounding (`groundTheme`, `core/theme/ground.ts`, shared with Plotly) runs
in the plan on the structure and the author's title, and returns `DesignDecisions` as `plan.design`.
The planner reads the theme's layout values from it. Realization (`realizeThemeVegaLite`,
`vegalite/theme.ts`) writes styling and translates the plan's decisions it receives; it decides no
room. Theme chart defaults may set only how a chart looks: a key the analysis reads is reported and
dropped.

**Reports.** `_theme.report` lists departures only: where a chart differs from what its theme or
author stated, or where a stated option cannot apply to this chart. Each entry has the ThemeSpec path
it concerns, a stable `code` (`labels-straight-refused`, `dots-shrunk`, `keys-arrangement-gave-way`),
and a message saying why. A setting applied as stated is not reported. Tests read codes, not wording.
The theme's full decisions are attached as `_theme.decisions` only when asked
(`options.themeDecisions`); tooling can read the whole plan from a session.

# §7 Backends

The planner takes a backend profile (`BackendLayoutProfile`):

| Entry | Vega-Lite |
|---|---|
| `defaults`, `fallbacks` | label 10 / title 11 px, no band-step fit, facet padding and gap |
| `nestedBandPadding` | 0.2 inner and outer |
| `spellField` | escapes `.`, `[` and `]` in field names |
| `measureText` | the width table in a browser (`TEXT_WIDTHS`, generated from Chrome's canvas by `npm run gen:text-widths`), Vega's 0.8 em estimate in Node |
| `spacing` | Vega's axis, legend and title defaults: tick 5, label padding 2, title padding 4, key offset 18, title offset 4, deck padding 3 |

Only Vega-Lite consumes the plan. ECharts, Chart.js and Plotly call `computeLayout` and make their own
layout decisions; Plotly shares theme grounding. Nothing in the plan is Vega-Lite specific, so each
backend joins with an emitter of its own (§12).

# §8 Sessions, pins and live layout

`openVegaLiteSession(input, { pins })` keeps a mounted chart's analysis and plan and returns
`replan(change)`. A change of rows (`{ keep }`, `{ rows }`, or `{ window: { x } }` for the rows an x
window holds) plans the same analysis for those rows into the chart's frame and holds:

| Pin | Held by |
|---|---|
| `plot` | a window into the data (`pinPlot`): the plot box, not the steps, so replanning all rows into its own plot is a fixed point |
| `title` | every replan: the mounted title fit |
| `reserve` | every replan: the room kept for the furniture, so the rows in view do not move the steps through it |
| `axisLabels` | an author or host holding a label size or angle; the plan's crowding and refusal no longer apply to what was pinned |

A change of size (`{ size }`) plans the whole chart again for the new room: the frame, title fit and
room kept are planned anew, and later changes of rows plan into that frame.

Live layout plans each zoom window from the whole-data analysis with the plot pinned
(`replan({ window, pinPlot })` through `liveLayoutPlanner`); filters replan with `replan({ rows })`.
`surface.layout.plot` reports the planned plot on charts that draw one plot at that size, follows a
filter's replan and a resize, and is undefined on composite charts, charts with a category rail, and
where a later stage changed the plot.

**Resize in place.** A chart mounted for a room (`availableSize`; React `fit="relayout"`) binds its
layout values to one signal (`bindLiveValues`): each axis, title, key, header, scale and mark property
that holds a layout value becomes a read of that signal, and value signals carry what an expression
would otherwise embed (temporal tick planner inputs, the zoom margin). `surface.relayout(size)`
replans at the new size, shapes the next Vega spec as the mount did, and compares it with the mounted
one (`liveValuesChange`): where the two differ only in bound values, signal values and the view size,
it pushes them and runs Vega's enter set (Vega encodes key labels on enter only); otherwise it resolves
false and the host remounts. A push keeps selections, filters, zoom and updates. React tries
`relayout` first and remounts on false.

# §9 Checks

- **Structure drift** (`tests/chart-structure.test.ts`, §5).
- **Honour** (`tests/plan-honour.test.ts`): `vegaLiteHonour` plans and emits a chart and reads every
  decision back from the spec (each view's tick labels, ruler and zero, orders and size ranges, facet
  gap and scales, a flat y title's lift, series-end names, each key's edge and columns, value labels,
  the fitted title, the plot), Vega's defaults standing for what the spec leaves unstated. Over every
  generated case it expects no departure outside a list of decisions composites still make
  themselves; an entry that stops departing fails too. Cross-checked once against Vega's scenegraph.
- **Purity**: a session's replan of all rows gives the compiled spec, and A → B → A gives A; a
  replan at a size gives a fresh compile at that size (all 5,352 corpus resizes, shrinking and
  growing, facets included), and a window gives the rows it keeps.
- **Live values** (`tests/live-values.test.ts`): a pushed resize draws what a fresh compile at that
  size draws, compared as SVG. Over the corpus at ±25%, 3,931 pushes draw the same, 44 with the canvas
  1 px wider from Vega's incremental bounds. In a browser, after a pushed resize a click selects
  through the new scales, a zoom carries on, a filter's steps and plot match a fresh mount, and a
  host note stands where a fresh mount puts it.
- **Comparison page** (local tooling): every chart × theme case compiled and rendered against a
  baseline commit. A move must render identically; a fix is reviewed case by case on its Fix cases.

# §10 Milestones

| # | Milestone | Status |
|---|---|---|
| 1 | Comparison page and baseline | done (local tooling) |
| 2 | `analyze` stage, one semantics pass | done |
| 3 | Plan stage; planned plot equals drawn plot; `surface.layout` | done for single-view charts |
| 4 | Resize through `replan` | done: in place where the chart keeps its parts (55% of corpus resizes at ±25%), remount otherwise |
| 5 | Theme room decisions in the planner | done: labels, title, keys, value labels, ruler, facets, dots, room kept |
| 6 | Live layout on `replan` | done |
| 7 | Filters on `replan` | done; a filter pushes the steps, not labels and ticks |
| 8 | Composite charts: a plan for their views | next |
| 9 | Planner review: coverage, faithfulness, cost | cost done (§11); coverage and faithfulness after 8 |

# §11 Cost

Compiling the comparison corpus (11,157 cases) in a browser took 1.6 ms a chart before the plan,
3.9 ms with the theme's room decisions and measured text in it, and 1.17 ms after a profile of the
planner by stage. Three hot spots made the difference, each fixed as a move (every compile
unchanged):

| Hot spot | Share before | Fix |
|---|---|---|
| The spacing ruler built and measured the labels of every 1, 2 and 5 step down to a thousandth of the span | 30% | steps tried nearest the desired one first; the first that passes is the answer |
| Text width: a regular expression per character and a font-stack parse per call | 22% | code-point ranges, the family resolved once per measurer, widths kept per text |
| The key planner fitted each key at every edge and re-wrapped every label for each column count | 27% | opposite edges share one fit; wraps and their costs kept per width and line count |

Now no stage dominates: placing keys 13%, theme grounding 13%, analysis 20%. A mounted chart for a
room costs 0.17 ms more to bind its live values; a relayout costs 1.5 ms (replan 0.84, Vega-Lite
compile 0.57, compare 0.08), against a remount that also parses the Vega spec and mounts the
interactions again.

# §12 Open items

| Item | Revisit when |
|---|---|
| Composite views lay out their own panels (Bar Table, Sparkline, pyramid, KPI, violin, radar); their titles and keys are fitted after the plan; radar spoke labels keep no room | milestone 8 |
| Resizes that remount: a part appears or goes (a label angle, a key's direction or columns, rows an overflow drops), or a number emitted inside an expression changes (value-label thresholds, temporal label sets, facet column counts); 45% of corpus resizes at ±25% | emit states those as values a signal can carry |
| A filter pushes only the steps; its replan's ticks, domains and labels could push through the same binding with the data source's rows left out of the comparison | a filter that needs its labels re-planned |
| Live values are bound only on charts mounted for a room | a host that resizes a chart mounted without one |
| ECharts, Chart.js and Plotly on the plan | each backend gets an emitter that reads it |
| Per-kind key options (`legend.valueKeys`) | a theme needs a key to values placed apart from its series key |
| One pass of measuring room kept; width under-kept by a median 5 px | a case where it matters |
| Node renders measure text with Vega's 0.8 em estimate while a rasterizer draws real glyphs | a fix that switches the Node renderer and the estimates together |
| The temporal tick planner measures with a canvas or 0.8 em | the same fix |
| Live ticks on narrow windows plan one tick more or fewer than a fresh compile (10 of 64 checks) | the live tick planner clips to the data extent |
| Live layout binds only the y label size | a live chart whose y labels change between windows |
| A step near the midpoint of two candidates is decided by d3's threshold | a fix that breaks near-ties by wasted room |
| Fixed ends no 1, 2 or 5 step lands on (latitude ±90) | a fix that tries 2.5 and 3 steps |
| Analysis cache across charts; memory a kept analysis adds | measured need |
| Update scheduler; hysteresis near thresholds; author pin syntax; `set-data` opt-in | a live mode that needs them |
| Surface chrome, notes, radial and treemap labels in the plan | the composite view model |
| ECharts reads a pixel `labelLimit` as characters; ECharts `getComponent` on quick destroy; Chart.js README on `responsive` | separate fixes |

# §13 Decision record

Each decision kept its method when it moved into the plan; fixes corrected inputs. The record below
gives the reason for each choice and what it changed.

**Stages and sessions**

- One semantics pass after a type pre-pass: the preliminary pass did the full work twice (a 7,200-row
  line chart 53 → 44 ms).
- Live layout faithful to `plan(analysis, { window })`, not to a fresh compile of the window: a window
  keeps whole-data facts and the mounted plot.
- A pinned plot holds the box, not the steps: deriving steps from the box made labels jump when a zoom
  returned to the full range.
- Resize pushes the replanned values in place where the chart keeps its parts. The setters are
  generated from the compiled spec, not a hand table: the values a resize changes run across axis,
  title, key, header, scale and mark properties, and size alone serves 1.5% of resizes. The comparison
  with the next spec decides push or remount, so a value the binding misses remounts rather than
  drawing wrong.
- Values an expression embedded became value signals (temporal tick inputs, the zoom margin), so a
  zoomed chart keeps its zoom through a resize.
- The planner's cost is fixed by search order and kept results, never by a cheaper rule: each fix
  is a move, so the corpus compiles the same.

**Templates**

- Templates describe structure, checked against what they build: the alternatives were a second plan
  phase after `instantiate`, splitting every template, or measuring the emitted spec, each either
  Vega-Lite specific or too large. The check is what makes stated facts safe.
- Structure by meaning, not by Vega-Lite's view of it: value labels stay off computed measures, a
  candlestick no longer titles its axis with its layers' fields (107 renders).
- Declared band shapes rather than emitted padding: every span exact without reproducing Vega-Lite's
  per-mark defaults.
- Templates state baselines, extents, orders and their own tick labels: a template's own method is the
  reference, and the plan reads it instead of contradicting it (the calendar's month initials were
  anchored for a −90° turn they never took; 48 renders).

**Ownership**

- One owner per decision: the plan owns a decision only where it can state a value the backend must
  follow; nothing is half-owned.
- The plan owns the ruler whole (domain, step, values): Vega drew the theme's spacing within 10% on
  24% of themed axes from a tick-count hint (1,245 renders; spacing median 1.11 → 0.93 of the target).
- The plan stays cheap: it decides from aggregates and simple rules and never simulates the backend; a
  backend fact comes from its profile.
- Theme style without room is the theme's; room is the planner's within the theme's preferences
  (§6). Ranked edges, arrangement and title position are preferences with costs, not hard lists: seven
  of eleven presets name a single edge, so a tall key would otherwise have nowhere to go.
- The theme states intent, the planner computes pixels: key alignment rather than a gap.

**Fixes to inputs**

- A stack is a band holding several rows, not a colour on bars: grouped percentages stop clipping,
  heatmaps stop squeezing (128 renders); value labels follow the same fact (22).
- Text measured as the renderer measures it (108 renders); keys measured from their labels, so keys
  that fit share a row.
- Room kept measured from what the plan decided, replacing fixed margins that charged a key on
  presence alone (2,379 compiles; steps median +3 px).
- One straight-label rule instead of two estimates; names too wide turn −45° or upright by the band
  (968 axes leave Vega-Lite's upright default).
- Dots sized against the plot they are drawn in, not the layout's subplot (132 renders).
- Realization's decisions after the plan moved into it: the theme's size range, value-label headroom
  on shared scales, whether a chart prints its own end labels.
- Reports list departures only: confirmations were most entries and the duplicate decisions most of
  the bytes.

# Appendix: where each decision is made

| Decision | Where |
|---|---|
| Types and semantics | `analyzeChart`, `core/analyze.ts` |
| Overflow truncation, facet grid | `filterOverflow`, `computeChannelBudgets`, before the plot |
| Plot size and steps | `computeLayout`, `core/compute-layout.ts`; `planPlot`; band shapes |
| Room kept for the furniture | `measureReserve`, `core/furniture-reserve.ts` |
| Tick labels and angles | `planAxisLabels`, `core/axis-labels.ts` |
| Axis titles | `axisTitles`, `core/structure.ts` |
| Domains, extents, band spans | `measureDomain`, `measureExtent`, `continuousBandSpan`, `core/measure-domain.ts` |
| Ruler | `spacingRuler`, `core/ruler.ts` |
| Title fit | `planTitle`, `core/title-plan.ts` |
| Series naming | `planLegendPlacement`, `core/series-end.ts` |
| Keys and key layout | `planLegend`, `core/legend-plan.ts`; `planKeyLayout`, `core/legend-layout.ts` |
| Value labels | `planValueLabels`, `core/value-label-plan.ts` |
| Orders and size ranges | `categoryOrder`, `sizeRange`, `core/channel-decisions.ts` |
| Dots | `planPointSize`, `pointPadding`, `core/plan.ts` |
| Facets and a flat y title | `planFurniture`, `core/furniture-plan.ts` |
| Theme grounding | `groundTheme`, `core/theme/ground.ts`, in the plan |
| Styling | `realizeThemeVegaLite`, `vegalite/theme.ts` |
| Temporal ticks | the plan's labels, written in emit; planned again where a later stage changed the plot |
