import { describe, expect, it } from 'vitest';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

/**
 * The renderers are optional peer dependencies: `npm install flint-chart` alone must be able to load
 * the library's entries and compile a spec. Only the interactive surfaces may import a renderer when
 * they load, and the package keeps them as separate files that the static entries load on demand.
 */
const PEERS = ['vega', 'vega-lite', 'vega-tooltip', 'echarts', 'chart.js', 'plotly.js', 'plotly.js-dist-min', 'react'];
/** Separate files in the package (tsup externals), loaded only when called. */
const ON_DEMAND = ['../vegalite/interactive', '../echarts/interactive', '../chartjs/interactive', '../plotly/interactive', '../validate/links'];
const STATIC_ENTRIES = ['index', 'core/index', 'vegalite/index', 'echarts/index', 'chartjs/index', 'plotly/index', 'excel/index',
    'image-charts/index', 'validate/index', 'interactive/index', 'render/index', 'test-data/index', 'gallery/index'];
const root = fileURLToPath(new URL('..', import.meta.url));
const isPeer = (path: string) => PEERS.some((peer) => path === peer || path.startsWith(`${peer}/`));

describe('optional renderer peers', () => {
    it.each(STATIC_ENTRIES)('flint-chart/%s loads without any renderer installed', async (entry) => {
        const result = await build({
            absWorkingDir: root,
            entryPoints: [`src/${entry}.ts`],
            bundle: true,
            write: false,
            metafile: true,
            format: 'esm',
            platform: 'node',
            logLevel: 'silent',
            external: [...PEERS, ...PEERS.map((peer) => `${peer}/*`), ...ON_DEMAND],
        });
        const loaded = Object.entries(result.metafile.inputs).flatMap(([file, input]) => input.imports
            .filter((imported) => imported.kind === 'import-statement' && isPeer(imported.path))
            .map((imported) => `${imported.path} from ${file}`));
        expect(loaded).toEqual([]);
    }, 60_000);
});
