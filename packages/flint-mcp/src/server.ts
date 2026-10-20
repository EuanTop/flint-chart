// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RootsListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';

import { renderChart } from './render/index.js';
import type { RenderBackend } from './render/types.js';
import { compileChart } from './tools/compile.js';
import { installFlintTextMeasurer } from './render/fonts.js';
import { validateChart } from './tools/validate.js';
import { listChartTypes, listThemes, listInteractionPresets } from './tools/list.js';
import {
  buildAssemblyInputShape,
  toAssemblyInput,
  updatesShape,
  viewShape,
  SUPPORTED_BACKENDS,
  type SupportedBackend,
  type AssemblyInputArgs,
} from './tools/schemas.js';
import type { ChartAssemblyInput, ChartUpdate } from 'flint-chart';

import { VERSION } from './version.js';
import {
  BoardStore,
  boardChartShape,
  boardFieldsShape,
  dropArrangement,
  placeAddedChart,
  themeName,
  chartReport,
  viewReport,
  boardSnapshot,
  shownText,
  linkSpecShape,
  relink,
  mergeChartArgs,
  prepareChart,
  type Board,
  type BoardChartArgs,
  type ChartOutcome,
} from './board.js';
import { gridProblem } from './board-layout.js';
export { VERSION };

export const AGENT_SKILL_RESOURCE_URI = 'flint://agent-skill';
export const THEME_SKILL_RESOURCE_URI = 'flint://theme-skill';
export const INTERACTION_SKILL_RESOURCE_URI = 'flint://interaction-skill';
export const BOARD_SKILL_RESOURCE_URI = 'flint://board-skill';
const AGENT_SKILL_ASSET = new URL('../assets/flint-chart-author.SKILL.md', import.meta.url);
const THEME_SKILL_ASSET = new URL('../assets/flint-theme-author.SKILL.md', import.meta.url);
const INTERACTION_SKILL_ASSET = new URL('../assets/flint-interaction-author.SKILL.md', import.meta.url);
const BOARD_SKILL_ASSET = new URL('../assets/flint-board-author.SKILL.md', import.meta.url);

/** URI linking show to its bundled UI resource, the card that draws a chart or a board. */
export const VIEW_RESOURCE_URI = 'ui://flint-chart/view.html';
const VIEW_ASSET = new URL('../assets/flint-app.html', import.meta.url);

/** Shown when the UI bundle has not been built yet (e.g. during `test`). */
const VIEW_PLACEHOLDER = `<!DOCTYPE html><html><head><meta charset="utf-8">\
<title>Flint Chart</title></head><body style="font-family:Arial,sans-serif;color:#6b6b6b;\
padding:24px">Flint chart view UI is not built. Run <code>npm run build:ui</code> in \
packages/flint-mcp to generate it.</body></html>`;

const SKILL_ASSETS = {
  chart: AGENT_SKILL_ASSET,
  theme: THEME_SKILL_ASSET,
  interaction: INTERACTION_SKILL_ASSET,
  board: BOARD_SKILL_ASSET,
} as const;
export type SkillName = keyof typeof SKILL_ASSETS;
const SKILL_NAMES = Object.keys(SKILL_ASSETS) as [SkillName, ...SkillName[]];

function readSkill(name: SkillName): string {
  return readFileSync(SKILL_ASSETS[name], 'utf8');
}

const readAgentSkill = () => readSkill('chart');
const readThemeSkill = () => readSkill('theme');
const readInteractionSkill = () => readSkill('interaction');

/** Top-level `## ` headings of a skill, skipping fenced code blocks. */
function skillSections(text: string): { heading: string; start: number }[] {
  const sections: { heading: string; start: number }[] = [];
  let fenced = false;
  let offset = 0;
  for (const line of text.split('\n')) {
    if (line.startsWith('```')) fenced = !fenced;
    else if (!fenced && line.startsWith('## ')) sections.push({ heading: line.slice(3).trim(), start: offset });
    offset += line.length + 1;
  }
  return sections;
}

/** One `## ` section of a skill, from its heading up to the next `## ` heading. */
export function skillSection(text: string, heading: string): string {
  const sections = skillSections(text);
  const wanted = heading.replace(/^#+\s*/, '').trim().toLowerCase();
  const index = sections.findIndex((section) => section.heading.toLowerCase() === wanted);
  if (index < 0) {
    throw new Error(
      `No section "${heading}". Sections: ${sections.map((section) => `"${section.heading}"`).join(', ')}.`,
    );
  }
  return text.slice(sections[index].start, sections[index + 1]?.start ?? text.length).trimEnd() + '\n';
}

/** Read the bundled view HTML, tolerating a not-yet-built asset. */
function readViewHtml(): string {
  try {
    return readFileSync(VIEW_ASSET, 'utf8');
  } catch {
    return VIEW_PLACEHOLDER;
  }
}

export interface CreateServerOptions {
  /** Restrict which backends are exposed (default: all supported). */
  enabledBackends?: SupportedBackend[];
  /**
   * When true, reject local `data.url` file references and accept only inline
   * `data.values`. When unset the server trusts the host and reads any local
   * file the agent references.
   */
  disableFileReference?: boolean;
  /** Where charts and boards live; a server that is rebuilt per request passes one store so they outlive the request. */
  boards?: BoardStore;
}

type JsonContent = { content: { type: 'text'; text: string }[]; isError?: boolean };

function jsonResult(value: unknown): JsonContent {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

function errorResult(err: unknown): JsonContent {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

/**
 * Build a short instruction note telling the agent how to reference local data,
 * tailored to whether local file references are enabled.
 */
function dataAccessNote(options: CreateServerOptions): string {
  if (options.disableFileReference) {
    return (
      ' Local data: this server CANNOT read local files — do NOT set data.url. ' +
      'Provide every dataset inline via data.values (an array of row objects). ' +
      'Remote URLs are not fetched.'
    );
  }
  return (
    ' Local data: reference a local CSV/TSV/JSON file by path in data.url ' +
    '(a relative path is looked up in the client\'s project folders, then the ' +
    'server\'s working directory; an absolute path always works) or pass rows inline ' +
    'via data.values. For data you download or generate, create a folder in the ' +
    'current project (e.g. ./flint-data) and reference files from it. Remote ' +
    'URLs are not fetched.'
  );
}

/** Resolve and validate the set of enabled backends. */
export function resolveBackends(options: CreateServerOptions = {}): SupportedBackend[] {
  const requested = options.enabledBackends?.length
    ? options.enabledBackends
    : [...SUPPORTED_BACKENDS];
  const enabled = requested.filter((b): b is SupportedBackend =>
    (SUPPORTED_BACKENDS as readonly string[]).includes(b),
  );
  if (enabled.length === 0) {
    throw new Error(
      `no valid backends enabled; choose from: ${SUPPORTED_BACKENDS.join(', ')}`,
    );
  }
  return enabled;
}

/**
 * Build the Flint MCP server with chart tools, the bundled authoring skill, and
 * catalog resources. Rendering is fully in-process; no data leaves the host.
 */
export function createServer(options: CreateServerOptions = {}): McpServer {
  const backends = resolveBackends(options);
  const dataSourceOptions = {
    disableFileReference: options.disableFileReference,
  };
  // Build the tool input shape once so data.url is documented as disabled when
  // local file references are off (e.g. on a remote/hosted server).
  const assemblyInputShape = buildAssemblyInputShape(options.disableFileReference);
  const backendEnum = z
    .enum(backends as [SupportedBackend, ...SupportedBackend[]])
    .describe(`Rendering backend. One of: ${backends.join(', ')}.`);

  const server = new McpServer(
    { name: 'flint-chart-mcp', version: VERSION },
    {
      instructions:
        'Flint compiles one semantic chart spec (ChartAssemblyInput) into ' +
        'Vega-Lite, ECharts, or Chart.js. By DEFAULT, show a chart whenever the host ' +
        'supports MCP App UIs: build it with create_chart, fix what its report asks with ' +
        'update_chart, then call show once; the card draws the chart live with an editing panel. ' +
        'For several charts shown together (a dashboard, a comparison, an overview with its detail), ' +
        'call get_flint_skill with skill "board", build it with create_board, change it with add_chart, ' +
        'update_chart, remove_chart and update_board, then call show once. ' +
        'The editing panel is not ' +
        'interactivity: when the user asks for an interactive chart (hover, ' +
        'click, brush, zoom), add an interaction_spec. Fall back to render_chart for a static PNG/SVG artifact only ' +
        'when the host has no App UI support or the user explicitly wants a ' +
        'static image. Use compile_chart for the backend spec JSON, ' +
        'validate_chart to check a spec, and list_chart_types to discover chart ' +
        'types, their channels, and the interaction presets each supports for ' +
        'interaction_spec. Use list_interaction_presets for what each preset does, ' +
        'what it needs from the chart, and the options it accepts. ' +
        'Use list_themes to discover visual themes; ' +
        'prefer a preset id, and use an `extends` override only when the user ' +
        'asks to customize it. Before authoring chart specs, call ' +
        'get_flint_skill with skill "chart" (also the flint://agent-skill ' +
        'resource and the author_flint_chart prompt). ' +
        'When the user asks to create, translate, or substantially customize a ' +
        'ThemeSpec, call get_flint_skill with skill "theme". ' +
        'When the user asks for behaviour on a chart, names an intent such as ' +
        'explore or compare, adds behaviour to a chart that already exists, ' +
        'changes or reads a mounted chart from code or as an agent, passes ' +
        'updates to a tool, links charts, ' +
        'or needs an interaction no preset gives, call get_flint_skill with ' +
        'skill "interaction". Pass `section` with one "## " heading when you ' +
        'need only that part of a skill.' +
        dataAccessNote(options),
    },
  );

  let roots: Promise<string[]> | undefined;
  server.server.setNotificationHandler(RootsListChangedNotificationSchema, async () => {
    roots = undefined;
  });
  /** The client's project folders, where a relative data.url is looked up first. */
  const clientRoots = (): Promise<string[]> => {
    if (options.disableFileReference || !server.server.getClientCapabilities()?.roots) return Promise.resolve([]);
    roots ??= server.server
      .listRoots()
      .then((result) => result.roots.filter((root) => root.uri.startsWith('file:')).map((root) => fileURLToPath(root.uri)))
      .catch(() => []);
    return roots;
  };

  // --- render_chart -------------------------------------------------------
  server.registerTool(
    'render_chart',
    {
      title: 'Render chart',
      description:
        'Compile a Flint chart spec for a backend and render it to a STATIC image ' +
        '(PNG) or vector (SVG), returned inline. Rendering is local/in-process. ' +
        'The chartjs backend supports PNG only. Prefer create_chart and show instead ' +
        'when the host supports MCP App UIs; use render_chart for a static ' +
        'artifact or when no App UI is available.',
      inputSchema: {
        ...assemblyInputShape,
        backend: backendEnum,
        format: z
          .enum(['png', 'svg'])
          .optional()
          .describe('Output format. Default: png. chartjs supports png only.'),
        scale: z
          .number()
          .min(0.5)
          .max(4)
          .optional()
          .describe('Device scale for PNG raster (1 = design size, 2 = retina). Default: 1.'),
        background: z
          .string()
          .optional()
          .describe('Background color (CSS color). Default: #ffffff.'),
      },
    },
    async (args: any) => {
      try {
        const input = toAssemblyInput(args as AssemblyInputArgs);
        const res = await renderChart(input, args.backend as RenderBackend, {
          format: args.format,
          scale: args.scale,
          background: args.background,
          disableFileReference: dataSourceOptions.disableFileReference,
          roots: await clientRoots(),
        });
        const note =
          `${res.backend} · ${res.format} · ${res.width}×${res.height}px` +
          (res.warnings.length ? ` · ${res.warnings.length} warning(s)` : '');
        if (res.format === 'svg') {
          return {
            content: [
              { type: 'text' as const, text: res.svg as string },
              { type: 'text' as const, text: note },
            ],
          };
        }
        return {
          content: [
            { type: 'image' as const, data: res.base64 as string, mimeType: res.mimeType },
            { type: 'text' as const, text: note },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // --- compile_chart ------------------------------------------------------
  server.registerTool(
    'compile_chart',
    {
      title: 'Compile chart spec',
      description:
        'Compile a Flint chart spec to a backend-native spec object ' +
        '(Vega-Lite / ECharts / Chart.js) without rendering. Returns the spec ' +
        'JSON, assembly warnings, and the computed layout size.',
      inputSchema: { ...assemblyInputShape, backend: backendEnum },
    },
    async (args: any) => {
      try {
        const input = toAssemblyInput(args as AssemblyInputArgs);
        await installFlintTextMeasurer();
        return jsonResult(compileChart(input, args.backend as RenderBackend, { ...dataSourceOptions, roots: await clientRoots() }));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // --- validate_chart -----------------------------------------------------
  server.registerTool(
    'validate_chart',
    {
      title: 'Validate chart spec',
      description:
        'Validate a Flint chart spec for a backend without rendering. Reports ' +
        'whether it is valid, all warnings/errors, and the computed layout size. ' +
        'With an interaction_spec it also reports the entries the chart would drop. ' +
        'With updates it rejects a malformed layer and reports, op by op, whether ' +
        'each will apply (✓) or why not (✗), in the same report create_chart ' +
        'returns. create_chart runs the same checks and keeps nothing on an ' +
        'error, so do not call this before it; use it to check a spec in code or CI.',
      inputSchema: { ...assemblyInputShape, ...updatesShape, backend: backendEnum },
    },
    async (args: any) => {
      try {
        const { result, input } = validateChart(toAssemblyInput(args as AssemblyInputArgs), args.backend as RenderBackend, {
          ...dataSourceOptions,
          roots: await clientRoots(),
          updates: args.updates,
        });
        if (!result.valid || args.backend !== 'vegalite') return jsonResult(result);
        const report = chartReport(input, args.updates, result);
        return { content: [...jsonResult(result).content, { type: 'text' as const, text: report }] };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // --- list_chart_types ---------------------------------------------------
  server.registerTool(
    'list_chart_types',
    {
      title: 'List chart types',
      description:
        'List the available chart types, their encoding channels, and the ' +
        'interaction presets each supports in interaction_spec (Vega-Lite only), ' +
        'for a backend, or for all backends when none is given.',
      inputSchema: {
        backend: backendEnum.optional(),
      },
    },
    async (args: any) => {
      try {
        return jsonResult(listChartTypes(args?.backend as RenderBackend | undefined));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // --- list_interaction_presets ---------------------------------------------
  server.registerTool(
    'list_interaction_presets',
    {
      title: 'List interaction presets',
      description:
        'List the interaction presets for interaction_spec: what the reader does, ' +
        'what each needs from the chart, its reset gestures, and every option it ' +
        'accepts under `options`. Pass `chartType` for the presets a Vega-Lite ' +
        'chart type supports, or `type` for one preset. Which presets answer a ' +
        'request and how they combine is in get_flint_skill with skill ' +
        '"interaction", section "Add interactions to the chart".',
      inputSchema: {
        chartType: z.string().optional().describe('A Vega-Lite chart type name from list_chart_types.'),
        type: z.string().optional().describe('One preset type, for its options alone.'),
      },
    },
    async (args: any) => {
      try {
        return jsonResult(listInteractionPresets({ chartType: args?.chartType, type: args?.type }));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // --- get_flint_skill ----------------------------------------------------
  server.registerTool(
    'get_flint_skill',
    {
      title: 'Get Flint skill',
      description:
        'Return a bundled Flint skill as markdown. Read it before you write the ' +
        'matching spec: `chart` for a ChartAssemblyInput, `theme` for a ThemeSpec, ' +
        '`interaction` for an interaction_spec, ChartUpdate layers, reading a ' +
        'mounted chart, linking charts, or a bespoke interaction; `board` for a ' +
        'create_board call: headline, chart choice, layout, links. Pass `section` ' +
        'with one "## " heading to get only that part; an unknown section lists ' +
        'the headings. The same text is served as the flint://agent-skill, ' +
        'flint://theme-skill, flint://interaction-skill, and flint://board-skill resources.',
      inputSchema: {
        skill: z.enum(SKILL_NAMES).describe('Which skill: chart, theme, interaction, or board.'),
        section: z
          .string()
          .optional()
          .describe('One "## " heading of the skill, e.g. "Update the chart".'),
      },
      annotations: { readOnlyHint: true },
    },
    async (args: any) => {
      try {
        const text = readSkill(args.skill as SkillName);
        return { content: [{ type: 'text' as const, text: args.section ? skillSection(text, args.section) : text }] };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // --- list_themes --------------------------------------------------------
  server.registerTool(
    'list_themes',
    {
      title: 'List themes',
      description:
        'List Flint visual theme presets for `theme_spec` (for example, ' +
        '`theme_spec: "economist"`). Pass an `id` for preset-specific authoring ' +
        'guidance. To customize a preset, use an object with `extends` and a ' +
        'small set of overrides.',
      inputSchema: {
        id: z.string().optional(),
      },
    },
    async (args: any) => {
      try {
        return jsonResult(listThemes(args?.id as string | undefined));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // --- charts and boards: built off screen, drawn by show (MCP App) --------
  const boards = options.boards ?? new BoardStore();
  const boardChart = boardChartShape(assemblyInputShape);
  const boardFields = boardFieldsShape(assemblyInputShape.theme_spec);
  const validateBoardChart = async (input: ChartAssemblyInput, updates: ChartUpdate[] | undefined) =>
    validateChart(input, 'vegalite', { ...dataSourceOptions, roots: await clientRoots(), updates });
  /** A new board from create_board arguments: each chart checked, the ones with errors left off. */
  const buildBoard = async (args: any): Promise<{ board: Board; outcomes: ChartOutcome[] }> => {
    const board = boards.create('board', {
      title: args.title,
      subtitle: args.subtitle,
      source: args.source,
      theme_spec: args.theme_spec,
      columns: args.columns,
    });
    const outcomes: ChartOutcome[] = [];
    for (const chartArgs of args.charts as BoardChartArgs[]) {
      const { chart, outcome } = await prepareChart(chartArgs, validateBoardChart, board);
      outcomes.push(outcome);
      if (chart) board.charts.push(chart);
    }
    board.link_spec = args.link_spec;
    relink(board);
    return { board, outcomes };
  };
  /** An agent write: the next version, and the report the model judges it by. Nothing is on screen until show. */
  const boardWrite = (fn: (args: any) => Promise<{ board: Board; outcomes: ChartOutcome[]; notes?: (string | undefined)[] }>) =>
    async (args: any) => {
      try {
        const { board, outcomes, notes = [] } = await fn(args);
        relink(board);
        const said = notes.filter((note): note is string => note !== undefined);
        return { content: [{ type: 'text' as const, text: viewReport(board, outcomes, said) }] };
      } catch (err) {
        return errorResult(err);
      }
    };
  /** A reader write from the newest card; a card an agent write has passed changes nothing. */
  const readerWrite = (fn: (board: Board, args: any) => void) =>
    async (args: any) => {
      try {
        const board = boards.get(args.id);
        if (args.version !== board.version) {
          return {
            content: [{ type: 'text' as const, text: `Error: board ${board.id} is at version ${board.version}, not ${args.version}: change the newest card.` }],
            structuredContent: { version: board.version },
            isError: true,
          };
        }
        fn(board, args);
        return {
          content: [{ type: 'text' as const, text: `version ${board.version}` }],
          structuredContent: { version: board.version, board: boardSnapshot(board) },
        };
      } catch (err) {
        return errorResult(err);
      }
    };
  const cardOnly = { ui: { resourceUri: VIEW_RESOURCE_URI, visibility: ['app' as const] } };
  const viewId = z.string().describe('The id create_chart or create_board returned.');
  /** A board by id; a chart's id is refused with what to call instead. */
  const boardById = (id: string): Board => {
    const view = boards.get(id);
    if (view.kind === 'chart') {
      throw new Error(`${id} is a chart, not a board: change it with update_chart, or call create_board to show several charts together.`);
    }
    return view;
  };
  const cardVersion = z.number().describe('The board version the card shows; a newer board refuses the change.');

  server.registerTool(
    'create_chart',
    {
      title: 'Create chart',
      description:
        'Build one Flint chart. Nothing is on screen yet: the result is a report of the chart (its encodings, ' +
        'interactions, and each update op as applied ✓ or not and why ✗) and its id. Fix what the report asks ' +
        'with update_chart, then call show once; the card draws the chart live with an editing panel. ' +
        'The editing panel does not make the chart respond to the reader: for hover, click, brush, or zoom, ' +
        'pass interaction_spec (list_interaction_presets has the presets for each chart type). ' +
        'Pass updates to show the chart in a state (emphasis, a note, a range). In a later turn, change it ' +
        'with update_chart and call show again: a new card shows the new version and earlier cards stay as ' +
        'they were. An invalid spec or update layer is an error and keeps nothing. ' +
        'What the user then does on the chart reaches you with their next message.',
      inputSchema: { ...assemblyInputShape, ...updatesShape, ...viewShape },
    },
    boardWrite(async (args) => {
      const { chart, outcome, errors } = await prepareChart({ ...args, id: 'chart' } as BoardChartArgs, validateBoardChart, {});
      if (!chart) throw new Error(`Chart spec has errors: ${errors}. Nothing was kept; fix the spec and call create_chart again.`);
      const view = boards.create('chart');
      view.charts.push(chart);
      return { board: view, outcomes: [outcome] };
    }),
  );

  server.registerTool(
    'create_board',
    {
      title: 'Create board',
      description:
        'Build a board of several Flint charts: a dashboard, a comparison, ' +
        'an overview with its detail. The board has a headline, a deck and a source; each chart ' +
        'is a full chart spec with an id and a layout (span, height). link_spec connects the charts ' +
        'by the fields they share: ' +
        'a selection on one chart emphasizes the marks that share its values on the others. Nothing is on ' +
        'screen yet: fix what the report asks with add_chart, update_chart, remove_chart and update_board, ' +
        'then call show once. Use create_chart for a ' +
        'single chart. Before the first board, call get_flint_skill with skill "board". ' +
        'The result reports the layout, each chart (✓/✗ per update op), what each chart sends and receives, and a review ' +
        'of what the board should still fix; a chart with errors is left off the board.',
      inputSchema: {
        ...boardFields,
        charts: z.array(boardChart).describe('The charts, in reading order: KPI tiles first, then the lead chart, then the charts that explain it.'),
        link_spec: linkSpecShape.optional(),
      },
    },
    boardWrite(buildBoard),
  );

  server.registerTool(
    'add_chart',
    {
      title: 'Add chart to board',
      description: 'Add a chart to a board, at the end. An id already on the board is an error: use update_chart.',
      inputSchema: { id: viewId, chart: boardChart },
    },
    boardWrite(async (args) => {
      const board = boardById(args.id);
      if (board.charts.some((chart) => chart.id === args.chart.id)) {
        throw new Error(`Board ${board.id} already has a chart "${args.chart.id}"; call update_chart to change it.`);
      }
      const { chart, outcome } = await prepareChart(args.chart as BoardChartArgs, validateBoardChart, board);
      if (chart) {
        board.charts.push(chart);
        placeAddedChart(board, chart);
        boards.touch(board);
      }
      return { board, outcomes: [outcome] };
    }),
  );

  server.registerTool(
    'update_chart',
    {
      title: 'Update chart',
      description:
        'Change a chart, or one chart on a board. Pass only the fields to replace ' +
        '(chart_spec, data, interaction_spec, updates, layout, ...); each replaces the chart\'s field whole. ' +
        'A change with errors leaves the chart as it was. Nothing is on screen until show.',
      inputSchema: {
        id: viewId,
        chart_id: z.string().optional().describe('The chart on a board to change; a chart from create_chart needs none.'),
        ...boardChart.omit({ id: true }).partial().shape,
      },
    },
    boardWrite(async (args) => {
      const board = boards.get(args.id);
      const charts = board.charts.map((chart) => chart.id).join(', ');
      const chartId = args.chart_id ?? (board.kind === 'chart' ? board.charts[0].id : undefined);
      if (chartId === undefined) throw new Error(`Board ${board.id} holds several charts: pass chart_id (${charts}).`);
      const index = board.charts.findIndex((chart) => chart.id === chartId);
      if (index < 0) throw new Error(`Board ${board.id} has no chart "${chartId}"; its charts: ${charts}.`);
      const { chart, outcome } = await prepareChart(mergeChartArgs(board.charts[index], args), validateBoardChart, board);
      const notes: (string | undefined)[] = [];
      if (chart) {
        board.charts[index] = chart;
        if (args.layout !== undefined) notes.push(dropArrangement(board, `layout on ${chart.id}`));
        boards.touch(board);
      }
      return { board, outcomes: [outcome], notes };
    }),
  );

  server.registerTool(
    'remove_chart',
    {
      title: 'Remove chart from board',
      description: 'Take a chart off a board.',
      inputSchema: { id: viewId, chart_id: z.string() },
    },
    boardWrite(async (args) => {
      const board = boardById(args.id);
      board.charts = board.charts.filter((chart) => chart.id !== args.chart_id);
      if (board.link_spec?.charts?.[args.chart_id]) {
        const { [args.chart_id]: _gone, ...charts } = board.link_spec.charts;
        board.link_spec = { ...board.link_spec, charts };
      }
      if (board.grid) board.grid = board.grid.filter((item) => item.id !== args.chart_id);
      boards.touch(board);
      return { board, outcomes: [] };
    }),
  );

  server.registerTool(
    'update_board',
    {
      title: 'Update board',
      description: 'Change a board\'s title, subtitle, source, theme, columns, chart order, or link_spec. Each field given replaces the board\'s.',
      inputSchema: {
        id: viewId,
        ...boardFields,
        order: z.array(z.string()).optional().describe('Chart ids in the new reading order; charts left out keep their place at the end.'),
        link_spec: linkSpecShape.nullable().optional().describe('The fields the charts connect on; null unlinks them.'),
      },
    },
    boardWrite(async (args) => {
      const board = boardById(args.id);
      for (const key of ['title', 'subtitle', 'source', 'theme_spec', 'columns'] as const) {
        if (args[key] !== undefined) (board as any)[key] = args[key];
      }
      const themeNote = args.theme_spec !== undefined && board.reader_theme
        ? `The reader's theme (${themeName(board.reader_theme.theme)}) was replaced: theme_spec sets the board's theme again.`
        : undefined;
      if (args.theme_spec !== undefined) board.reader_theme = undefined;
      if (args.order) {
        const rank = (id: string) => {
          const at = (args.order as string[]).indexOf(id);
          return at < 0 ? Number.MAX_SAFE_INTEGER : at;
        };
        board.charts = [...board.charts].sort((a, b) => rank(a.id) - rank(b.id));
      }
      if (args.link_spec !== undefined) board.link_spec = args.link_spec ?? undefined;
      const notes = [args.columns !== undefined || args.order ? dropArrangement(board, args.order ? 'order' : 'columns') : undefined, themeNote];
      boards.touch(board);
      return { board, outcomes: [], notes };
    }),
  );

  registerAppTool(
    server,
    'show',
    {
      title: 'Show chart or board',
      description:
        'Put a chart or board on screen: a new card with its current version. Call it once a turn, after ' +
        'create_chart or create_board and any fixes; changes after it stay off screen until the next show. ' +
        'Earlier cards keep the version they showed.',
      inputSchema: { id: viewId },
      _meta: { ui: { resourceUri: VIEW_RESOURCE_URI } },
    },
    async (args: any) => {
      try {
        const board = boards.get(args.id);
        return {
          content: [{ type: 'text' as const, text: shownText(board) }],
          _meta: { flint: { board: boardSnapshot(board) } },
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  registerAppTool(
    server,
    'restore_board',
    {
      title: 'Restore board',
      description:
        'For the board card only: the board as this server holds it, given the board the card holds. ' +
        'A server that lost it, as after a restart, takes the card\'s back under its own id; a newer board stays.',
      inputSchema: {
        board: z.record(z.string(), z.any()).describe('The board as the card holds it, with its id.'),
      },
      _meta: cardOnly,
    },
    async (args: any) => {
      try {
        if (!args.board?.id || !Array.isArray(args.board.charts)) throw new Error('Nothing to restore: pass the board the card holds.');
        const board = boards.restore(args.board as Board);
        relink(board);
        return {
          content: [{ type: 'text' as const, text: `version ${board.version}` }],
          structuredContent: { version: board.version, board: boardSnapshot(board) },
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  registerAppTool(
    server,
    'set_board_theme',
    {
      title: 'Set board theme',
      description: 'For the board card only: the theme the reader picked for every chart, or reset to go back to the agent\'s.',
      inputSchema: {
        id: viewId,
        version: cardVersion,
        theme: z.union([z.string(), z.record(z.string(), z.any()), z.null()]).optional().describe('A preset id, a ThemeSpec, or null for Flint\'s default.'),
        reset: z.boolean().optional().describe('Go back to the agent\'s theme.'),
      },
      _meta: cardOnly,
    },
    readerWrite((board, args) => {
      board.reader_theme = args.reset ? undefined : { theme: args.theme ?? null };
    }),
  );

  registerAppTool(
    server,
    'set_board_layout',
    {
      title: 'Set board layout',
      description: 'For the board card only: the arrangement the reader made, as a place on a 12-column grid for every chart, or null to go back to the rows.',
      inputSchema: {
        id: viewId,
        version: cardVersion,
        grid: z.array(z.object({ id: z.string(), x: z.number(), y: z.number(), w: z.number(), h: z.number() })).nullable(),
      },
      _meta: cardOnly,
    },
    readerWrite((board, args) => {
      if (args.grid) {
        const problem = gridProblem(args.grid, board.charts.map((chart) => chart.id));
        if (problem) throw new Error(`The arrangement does not fit the board: ${problem}.`);
      }
      board.grid = args.grid ?? undefined;
    }),
  );

  registerAppResource(
    server,
    'view',
    VIEW_RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => ({
      contents: [
        {
          uri: VIEW_RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: readViewHtml(),
          _meta: { ui: { permissions: { clipboardWrite: {} } } },
        },
      ],
    }),
  );

  // --- chart-types resource (browsable catalog) ---------------------------
  server.registerResource(
    'chart-types',
    'flint://chart-types',
    {
      title: 'Flint chart types',
      description: 'Catalog of chart types and channels across all enabled backends.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(listChartTypes(), null, 2),
        },
      ],
    }),
  );

  // --- agent-skill resource + prompt -------------------------------------
  server.registerResource(
    'agent-skill',
    AGENT_SKILL_RESOURCE_URI,
    {
      title: 'Flint chart-author skill',
      description:
        'Bundled Flint authoring instructions for generating ChartAssemblyInput specs.',
      mimeType: 'text/markdown',
      annotations: { audience: ['assistant'], priority: 1 },
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: readAgentSkill(),
        },
      ],
    }),
  );

  server.registerPrompt(
    'author_flint_chart',
    {
      title: 'Author a Flint chart',
      description:
        'Load the Flint chart-author skill before generating, validating, compiling, or rendering Flint charts.',
    },
    async () => ({
      description: 'Use the bundled Flint chart-author skill to produce valid Flint specs.',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'resource' as const,
            resource: {
              uri: AGENT_SKILL_RESOURCE_URI,
              mimeType: 'text/markdown',
              text: readAgentSkill(),
            },
          },
        },
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              'Use these Flint instructions when creating chart specs. Generate ChartAssemblyInput ' +
              'inputs with chart_spec and semantic_types, validate before rendering when tools are available, ' +
              'and call the Flint MCP tools only after the spec follows the authoring contract.',
          },
        },
      ],
    }),
  );

  server.registerResource(
    'theme-skill',
    THEME_SKILL_RESOURCE_URI,
    {
      title: 'Flint theme-author skill',
      description: 'Bundled instructions for creating valid reusable Flint ThemeSpecs.',
      mimeType: 'text/markdown',
      annotations: { audience: ['assistant'], priority: 1 },
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: readThemeSkill(),
        },
      ],
    }),
  );

  server.registerPrompt(
    'author_flint_theme',
    {
      title: 'Author a Flint theme',
      description:
        'Load the Flint theme-author skill before creating, translating, refining, reviewing, or validating a ThemeSpec.',
    },
    async () => ({
      description: 'Use the bundled Flint theme-author skill to produce a valid ThemeSpec.',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'resource' as const,
            resource: {
              uri: THEME_SKILL_RESOURCE_URI,
              mimeType: 'text/markdown',
              text: readThemeSkill(),
            },
          },
        },
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              'Use these Flint instructions when creating or reviewing a ThemeSpec. ' +
              'Use list_themes when preset discovery or preset-specific guidance is needed. ' +
              'Return the bare reusable ThemeSpec and do not change chart semantics.',
          },
        },
      ],
    }),
  );

  server.registerResource(
    'interaction-skill',
    INTERACTION_SKILL_RESOURCE_URI,
    {
      title: 'Flint interaction-author skill',
      description:
        'Bundled instructions for behaviour on a chart: how an interaction works, presets as one valid interaction_spec, the ChartUpdate an application or an agent applies to a mounted chart, reading the chart state, linking charts, and bespoke interactions.',
      mimeType: 'text/markdown',
      annotations: { audience: ['assistant'], priority: 1 },
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: readInteractionSkill(),
        },
      ],
    }),
  );

  server.registerResource(
    'board-skill',
    BOARD_SKILL_RESOURCE_URI,
    {
      title: 'Flint board-author skill',
      description:
        'Bundled instructions for a board of several charts in one card: the headline, which charts, their layout, links between them, and refining the board from its report.',
      mimeType: 'text/markdown',
      annotations: { audience: ['assistant'], priority: 1 },
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: readSkill('board') }],
    }),
  );

  server.registerPrompt(
    'author_flint_interaction',
    {
      title: 'Author Flint interactions',
      description:
        'Load the Flint interaction-author skill before adding behaviour to a chart, changing or reading a mounted chart from outside, linking charts, or building a bespoke interaction.',
    },
    async () => ({
      description: 'Use the bundled Flint interaction-author skill to produce a valid interaction_spec, a ChartUpdate, or code against flint-chart/interactive.',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'resource' as const,
            resource: {
              uri: INTERACTION_SKILL_RESOURCE_URI,
              mimeType: 'text/markdown',
              text: readInteractionSkill(),
            },
          },
        },
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              'Use these Flint instructions for behaviour on a chart. ' +
              'For presets, use list_chart_types to confirm the ones the chart type supports, ' +
              'and return the bare interaction_spec without changing the chart spec. ' +
              'For a mounted chart, return one ChartUpdate; for code, write against flint-chart/interactive.',
          },
        },
      ],
    }),
  );

  return server;
}
