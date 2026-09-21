// Bundles the pure game modules for Node 20 (which cannot import TypeScript): node scripts/build-server-sim.mjs → server/gen/sim.mjs
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await build({
  entryPoints: [path.join(root, 'server/sim-entry.ts')],
  outfile: path.join(root, 'server/gen/sim.mjs'),
  bundle: true, format: 'esm', platform: 'node', target: 'node20', logLevel: 'warning', legalComments: 'none',
});
console.log('server/gen/sim.mjs built');
