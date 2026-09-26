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
// the Solana side of the bridge (Metaplex Core + web3.js), one self-contained file for the account service
await build({
  entryPoints: [path.join(root, 'server/chain-entry.ts')],
  outfile: path.join(root, 'server/gen/chain.mjs'),
  bundle: true, format: 'esm', platform: 'node', target: 'node20', logLevel: 'warning', legalComments: 'none',
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
console.log('server/gen/chain.mjs built');
// the Founder Pack payments (Solana Pay, USDC): reads the chain only
await build({
  entryPoints: [path.join(root, 'server/pay-entry.ts')],
  outfile: path.join(root, 'server/gen/pay.mjs'),
  bundle: true, format: 'esm', platform: 'node', target: 'node20', logLevel: 'warning', legalComments: 'none',
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
console.log('server/gen/pay.mjs built');
