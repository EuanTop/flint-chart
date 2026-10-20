// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Flint MCP App: the card a `show` call opens.
 *
 * The call's result hands the card one version of a chart or a board, which the
 * card keeps: a chart draws as the chart card, a board as the board card.
 */
import type { McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { useApp } from '@modelcontextprotocol/ext-apps/react';
import { useEffect, useRef, useState } from 'react';

import { BoardView, type Board } from './BoardView';
import { ChartView } from './ChartView';

declare const __FLINT_MCP_VERSION__: string;

/** How long the card waits for its result before it says it cannot be redrawn here. */
const RESULT_WAIT_MS = 6000;
const NOT_REDRAWN =
  'This cannot be redrawn here: the call that showed it did not reach this card again, as can happen when a conversation is reopened. Ask Claude to show it again.';

export function FlintApp() {
  const [shown, setShown] = useState<Board | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();
  const shownSeen = useRef(false);
  shownSeen.current = shown !== null;

  const { app, error } = useApp({
    appInfo: { name: 'Flint', version: __FLINT_MCP_VERSION__ },
    capabilities: {},
    autoResize: true,
    onAppCreated: (app) => {
      app.onteardown = async () => ({});
      app.onerror = (err) => console.error(err);
      app.onhostcontextchanged = (params) => setHostContext((prev) => ({ ...prev, ...params }));
      app.ontoolresult = (result) => {
        const { _meta, content } = result as { _meta?: { flint?: { board?: Board } }; content?: { type: string; text?: string }[] };
        if (result.isError) {
          setFailed(content?.find((part) => part.type === 'text')?.text ?? '');
          return;
        }
        const next = _meta?.flint?.board;
        if (next) {
          setFailed(null);
          setShown(next);
        }
      };
    },
  });

  useEffect(() => {
    if (app) setHostContext(app.getHostContext());
  }, [app]);

  // A reopened conversation may not hand the card its result again; the card then says so instead of waiting.
  useEffect(() => {
    if (!app) return;
    const handle = window.setTimeout(() => {
      if (!shownSeen.current) setFailed((reason) => reason ?? NOT_REDRAWN);
    }, RESULT_WAIT_MS);
    return () => window.clearTimeout(handle);
  }, [app]);

  if (error) {
    return (
      <div className="status">
        <strong>App error:</strong> {error.message}
      </div>
    );
  }
  if (!app) return <div className="status">Connecting…</div>;
  if (failed !== null) {
    return (
      <div className="status">
        <strong>Not drawn</strong>
        {failed && <div className="status-reason">{failed}</div>}
      </div>
    );
  }
  if (!shown) return <div className="status">Waiting for the chart…</div>;
  return shown.kind === 'chart'
    ? <ChartView app={app} shown={shown} hostContext={hostContext} />
    : <BoardView app={app} initial={shown} hostContext={hostContext} />;
}
