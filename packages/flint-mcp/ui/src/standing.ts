// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { App } from '@modelcontextprotocol/ext-apps';
import { useEffect, useState } from 'react';

/** Whether the card saves the reader's changes: the newest version does; a passed or offline one does not. */
export type Standing = 'newest' | 'passed' | 'offline';

export const STANDING_NOTE: Record<Exclude<Standing, 'newest'>, string> = {
  passed: 'An earlier version: the newest is further down the conversation.',
  offline: 'Not live: showing it as it was drawn.',
};

/**
 * The card hands what it shows to the server once: one that restarted takes it back, one past it
 * says so, and one that holds it returns it, with what the reader saved since, to `onHeld`.
 */
export function useStanding<T extends { version: number }>(app: App, shown: T, onHeld?: (held: T) => void) {
  const [standing, setStanding] = useState<Standing>('newest');
  useEffect(() => {
    if (!app.getHostCapabilities()?.serverTools) {
      setStanding('offline');
      return;
    }
    let stopped = false;
    app.callServerTool({ name: 'restore_board', arguments: { board: shown } }).then(
      (result) => {
        if (stopped) return;
        const held = (result.structuredContent as { board?: T } | undefined)?.board;
        if (result.isError || !held) setStanding('offline');
        else if (held.version > shown.version) setStanding('passed');
        else onHeld?.(held);
      },
      () => {
        if (!stopped) setStanding('offline');
      },
    );
    return () => {
      stopped = true;
    };
    // `onHeld` is read once, with the board it answers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, shown]);
  return [standing, setStanding] as const;
}
