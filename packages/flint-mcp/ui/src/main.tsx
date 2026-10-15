// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { BoardApp } from './BoardApp';
import { FlintApp } from './FlintApp';
import './styles.css';

declare global {
  interface Window {
    __FLINT_VIEW__?: string;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.__FLINT_VIEW__ === 'board' ? <BoardApp /> : <FlintApp />}
  </StrictMode>,
);
