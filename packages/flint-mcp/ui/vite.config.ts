// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import type { Plugin } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(resolve(root, '../package.json'), 'utf8')) as {
  version: string;
};

/**
 * The view mounts every chart on Vega-Lite, but flint-chart's mount loads each backend's interactive
 * surface on demand, and a single-file build inlines all of them: Plotly alone is 4.7 MB. The view is
 * sent as one MCP message, which stdio clients cap at 10 MB, so the surfaces it never mounts are
 * replaced with stubs that say so if they are ever reached.
 */
const UNUSED_SURFACES: Record<string, string> = {
  plotly: 'createPlotlyInteractiveRenderer',
  echarts: 'createEChartsInteractiveRenderer',
  chartjs: 'createChartjsInteractiveRenderer',
};
function vegaLiteOnly(): Plugin {
  const prefix = '\0flint-unused-surface:';
  return {
    name: 'flint-vega-lite-only',
    enforce: 'pre',
    resolveId(source, importer) {
      const match = /^\.\.\/(plotly|echarts|chartjs)\/interactive(?:\.js)?$/.exec(source);
      if (!match || !importer || !/flint-js[\\/](dist|src)[\\/]/.test(importer)) return null;
      return prefix + match[1];
    },
    load(id) {
      if (!id.startsWith(prefix)) return null;
      const backend = id.slice(prefix.length);
      return `export function ${UNUSED_SURFACES[backend]}() { throw new Error('The Flint MCP view renders charts with Vega-Lite; the ${backend} surface is not bundled.'); }`;
    },
  };
}

// Bundle the entire app (React + Flint + Vega) into one self-contained HTML so
// the MCP App resource needs no network access and renders fully client-side.
export default defineConfig({
  root,
  plugins: [vegaLiteOnly(), react(), viteSingleFile()],
  define: {
    __FLINT_MCP_VERSION__: JSON.stringify(packageJson.version),
  },
  // The ext-apps React hooks (useApp) and the app share one React instance.
  // Without deduping, the bundle pulls in a second React copy whose hook
  // dispatcher is never set, so useState() throws at runtime.
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  build: {
    outDir: resolve(root, '../assets'),
    emptyOutDir: false,
    cssMinify: true,
    minify: true,
    rollupOptions: {
      input: resolve(root, 'flint-app.html'),
    },
  },
});
