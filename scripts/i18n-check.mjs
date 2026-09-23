#!/usr/bin/env node
// Junta todos los textos traducibles del juego (t('…'), tr('…'), k('…')) y avisa cuáles no tienen inglés en src/i18n/en/*.json.
//   node scripts/i18n-check.mjs              falla (exit 1) si falta alguno
//   node scripts/i18n-check.mjs --missing    imprime los que faltan como JSON { "texto": "" } (para traducir)
//   node scripts/i18n-check.mjs --unused     lista traducciones que ya no se usan
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'dev' || e.name === 'i18n' ? [] : walk(path.join(d, e.name))) : /\.(tsx?|mjs)$/.test(e.name) ? [path.join(d, e.name)] : []));
const unq = (s, q) => s.replace(/\\(u\{?[0-9a-fA-F]+\}?|.)/g, (m, c) => (c[0] === 'u' ? String.fromCodePoint(parseInt(c.replace(/[u{}]/g, ''), 16)) : c === 'n' ? '\n' : c === 't' ? '\t' : c));

const keys = new Map();   // texto → primer lugar donde aparece
for (const f of walk(path.join(root, 'src'))) {
  const code = fs.readFileSync(f, 'utf8');
  const re = /(?<![\w.$])(?:t|tr|k)\(\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)")/g;
  let m;
  while ((m = re.exec(code))) {
    const s = m[1] !== undefined ? unq(m[1], "'") : unq(m[2], '"');
    if (!keys.has(s)) keys.set(s, `${path.relative(root, f)}:${code.slice(0, m.index).split('\n').length}`);
  }
}
const dictDir = path.join(root, 'src/i18n/en');
const dict = {};
for (const f of fs.readdirSync(dictDir).filter((x) => x.endsWith('.json'))) Object.assign(dict, JSON.parse(fs.readFileSync(path.join(dictDir, f), 'utf8')));

const missing = [...keys.keys()].filter((k) => !(k in dict));
// marcadores {x} que no coinciden entre español e inglés
// (el inglés puede omitir alguno, p. ej. la concordancia de un plural español, pero no inventar otros)
const varsOf = (x) => new Set([...x.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
const badVars = Object.entries(dict).filter(([es, en]) => keys.has(es) && [...varsOf(en)].some((v) => !varsOf(es).has(v)));

if (process.argv.includes('--missing')) { console.log(JSON.stringify(Object.fromEntries(missing.map((k) => [k, ''])), null, 1)); process.exit(0); }
if (process.argv.includes('--unused')) { for (const k of Object.keys(dict)) if (!keys.has(k)) console.log(k); process.exit(0); }
console.log(`i18n: ${keys.size} textos, ${keys.size - missing.length} con inglés, ${missing.length} sin traducir`);
for (const k of missing.slice(0, 30)) console.log(`  falta: ${keys.get(k)}  ${k.slice(0, 90)}`);
for (const [es, en] of badVars) console.log(`  marcadores que no existen en el español: "${es.slice(0, 60)}" → "${en.slice(0, 60)}"`);
process.exit(missing.length || badVars.length ? 1 : 0);
