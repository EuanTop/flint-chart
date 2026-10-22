// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { ChartLink } from 'flint-chart';
import { boardColumns, boardRows, gridLines, layoutLines } from './board-layout.js';
import { boardReview, type Board, type ChartOutcome } from './board.js';

/**
 * What validate_chart, validate_board and show tell the model about a spec: only what it should act
 * on or tell the user. The spec itself is not repeated; the drawn card's context reports what is on screen.
 */

/** What the model reads once a chart or board is on screen. */
export function shownText(board: Pick<Board, 'kind'>): string {
  return `The ${board.kind === 'chart' ? 'chart' : 'board'} is on screen in a new card. What the reader does on it reaches you with their next message. ` +
    'To change it, change the spec and call show again: a new card shows it, and earlier cards stay as they were.';
}

const TO_FIX = 'Nothing is on screen: fix what this report lists, then call show with the same spec.';
const CLEAN = 'Nothing to fix: call show with this spec.';

/** A chart or board as the model reads it after validate_chart, validate_board or show. */
export function viewReport(board: Board, outcomes: readonly ChartOutcome[], notes: readonly string[] = [], shown = false): string {
  const body = board.kind === 'board' ? boardBody(board, outcomes, notes) : [...notes, ...outcomes.flatMap((outcome) => outcome.findings)].map(bullet);
  const info = board.kind === 'board' ? linkNotes(board) : [];
  const next = shown ? shownText(board) : body.length > 0 ? TO_FIX : CLEAN;
  if (board.kind === 'chart') return [next, ...body].join('\n');
  const head = `Board${board.title ? ` "${board.title}"` : ''}: ${board.charts.length} chart${board.charts.length === 1 ? '' : 's'} (${board.charts.map((chart) => chart.id).join(', ') || 'none'}).`;
  const rest = [...body, ...info];
  return [head, next, ...(board.charts.length > 0 ? [layoutLine(board)] : []), ...(rest.length > 0 ? ['', ...rest] : [])].join('\n');
}

/** The board's findings: each chart's, a finding several charts share said once, then links and review. */
function boardBody(board: Board, outcomes: readonly ChartOutcome[], notes: readonly string[]): string[] {
  const lines = notes.map(bullet);
  const charts = new Map<string, string[]>();
  for (const outcome of outcomes) {
    for (const finding of outcome.findings) charts.set(finding, [...(charts.get(finding) ?? []), outcome.id]);
  }
  const groups = new Map<string, string[]>();
  for (const [finding, ids] of charts) groups.set(ids.join(', '), [...(groups.get(ids.join(', ')) ?? []), finding]);
  for (const [ids, findings] of groups) lines.push(`${ids}:`, ...findings.map(bullet));
  const unlinked = Object.entries(board.link_spec ? board.linked ?? {} : {}).filter(([, link]) => isUnlinked(link));
  if (unlinked.length > 0) {
    lines.push(`Links (${board.link_spec!.fields.join(', ')}):`, ...unlinked.map(([id, link]) => bullet(`✗ ${id}: not linked${link.notes.length > 0 ? `; ${link.notes.join('; ')}` : ''}`)));
  }
  const review = boardReview(board);
  if (review.length > 0) lines.push('Review:', ...review.map(bullet));
  return lines;
}

function bullet(text: string): string {
  return `- ${text}`;
}

/** The board's layout in one line: its rows as the card draws them, or the reader's grid. */
function layoutLine(board: Board): string {
  if (board.grid) return `Layout: the reader's grid; keep passing it, or leave it out for rows. ${gridLines(board.grid).map(unbullet).join('; ')}.`;
  const charts = board.charts.map((chart) => ({ id: chart.id, chartType: chart.input.chart_spec.chartType, layout: chart.layout }));
  return `Layout: ${layoutLines(boardRows(charts, boardColumns(charts, board.columns))).map(unbullet).join('; ')}.`;
}

function unbullet(line: string): string {
  return line.replace(/^- /, '');
}

function isUnlinked(link: ChartLink): boolean {
  return link.sends.length === 0 && link.receives.length === 0;
}

/**
 * What linked charts leave out of the link: a field they do not carry, a selection they cannot send.
 * Not something to fix unless the user asked for that connection.
 */
function linkNotes(board: Board): string[] {
  if (!board.link_spec || !board.linked) return [];
  const notes = Object.entries(board.linked).filter(([, link]) => !isUnlinked(link) && link.notes.length > 0);
  if (notes.length === 0) return [];
  return [
    `Link notes (${board.link_spec.fields.join(', ')}); change nothing unless the user asked for that connection:`,
    ...notes.map(([id, link]) => bullet(`${id}: ${link.notes.join('; ')}`)),
  ];
}
