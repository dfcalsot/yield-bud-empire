#!/usr/bin/env node
// Envuelve en t('…') los textos visibles en español de los archivos que se le pasan (codemod de una sola vez por archivo).
//   node scripts/i18n-wrap.mjs src/components/Foo.tsx [...]        aplica y muestra un resumen
//   node scripts/i18n-wrap.mjs --dry src/components/Foo.tsx         solo informa
// Qué toca: texto JSX (con sus {variables} como marcadores), atributos visibles (title, placeholder, aria-label, alt, label…),
// y strings / template literals en lenguaje natural DENTRO de funciones (en el nivel del módulo se evaluarían antes de
// saber el idioma: esos solo se informan). Nunca toca imports, claves, comparaciones, tipos, className ni valores de
// propiedades que no sean de interfaz (type, id, kind…: se usan en la lógica). Lo que no envuelve y parece texto se informa.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
// necesita la API de compilador de TypeScript 5 (la 7 del proyecto no la trae): TS5_DIR=<carpeta con typescript@5 instalado>
const ts = createRequire(path.join(process.env.TS5_DIR || process.cwd(), 'x.js'))('typescript');

const args = process.argv.slice(2);
const dry = args.includes('--dry');
// --mark: los textos del nivel del módulo (tablas de datos) se marcan con k('…') (no cambia nada; se traducen con t() al mostrarlos)
// --all-props: en tablas de mensajes, cualquier propiedad con texto cuenta como interfaz (no solo title/text/label…)
const mark = args.includes('--mark');
const allProps = args.includes('--all-props');
const files = args.filter((a) => !a.startsWith('--'));

const UI_PROPS = new Set(['title', 'text', 'label', 'desc', 'description', 'hint', 'message', 'msg', 'body', 'subtitle', 'sub', 'tip', 'tips', 'note', 'say', 'cta',
  'placeholder', 'tooltip', 'detail', 'details', 'reason', 'summary', 'help', 'caption', 'heading', 'button', 'action', 'lead', 'intro', 'goal', 'hintText', 'short',
  'long', 'blurb', 'info', 'warning', 'error', 'success', 'empty', 'question', 'answer', 'line', 'lines', 'tagline', 'headline', 'effect', 'why', 'how', 'what', 'unit', 'verb', 'statusText', 'badge', 'name', 'cause', 'cure', 'role', 'fix', 'ask', 'look', 'confirm', 'brief', 'thanks', 'place', 'headline', 'advice', 'tipText', 'feedback', 'warn', 'alert', 'notice', 'caption', 'subtitle', 'eyebrow', 'kicker', 'footnote', 'explain', 'explanation', 'story', 'quote']);
// valores que nunca se traducen (nombres propios de marcas, símbolos químicos, claves de lógica)
const NEVER_PROPS = new Set(['brand', 'element', 'symbol', 'id', 'key', 'type', 'kind', 'rarity', 'tier', 'category', 'slug', 'icon', 'emoji', 'color', 'region', 'room', 'stage', 'status', 'difficulty', 'lineage', 'strain', 'strainName', 'origin', 'breeder', 'seedType', 'shop', 'npc', 'tab', 'tour', 'event', 'mood']);
const NON_UI_ATTRS = new Set(['className', 'class', 'id', 'key', 'href', 'src', 'type', 'name', 'role', 'style', 'variant', 'kind', 'mood', 'size', 'd', 'fill', 'stroke',
  'viewBox', 'transform', 'points', 'rel', 'target', 'method', 'autoComplete', 'inputMode', 'pattern', 'lang', 'dir', 'htmlFor', 'value', 'defaultValue', 'data-testid',
  'strokeLinecap', 'strokeLinejoin', 'fillRule', 'clipRule', 'mask', 'filter', 'preserveAspectRatio', 'xmlns', 'gradientUnits', 'maskUnits', 'textAnchor', 'dominantBaseline',
  'fontFamily', 'fontWeight', 'as', 'icon', 'tone', 'color', 'accent', 'zone', 'tab', 'group', 'mode', 'position', 'align', 'side', 'loading', 'decoding', 'crossOrigin', 'sizes', 'srcSet', 'media']);
const NON_UI_CALLS = /^(console\.\w+|localStorage\.\w+|sessionStorage\.\w+|fetch|document\.\w+|window\.\w+|\w+\.querySelector(All)?|new URL|URLSearchParams|setCurrentTab|intent|post|audit|require|import|t|RegExp|new RegExp|Symbol|\w+\.startsWith|\w+\.endsWith|\w+\.includes|\w+\.split|\w+\.replace|\w+\.indexOf|\w+\.match|\w+\.test|\w+\.setAttribute|\w+\.getItem|\w+\.setItem|\w+\.removeItem|\w+\.addEventListener|\w+\.removeEventListener|mintAddressFor|generate\w+|hash\w*|sha\w*|playSound|play\w*Sound)$/;

const hasWordChars = (s) => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}/.test(s);
const KEEP = /^[\s\d.,:;%+\-–—·•/|()×x$#@*!?¡¿"'“”«»→←↑↓⚡✓✗…]*(\$?FLORA|SOL|NFTs?|XP|LVL|VPD|PPFD|EC|pH|CO₂|CO2|ppm|kPa|THC|CBD|DLI|PAR|RH|LED|HPS|UV|IR|N|P|K|g|kg|ml|mL|L|h|min|s|d|ms|°C|lx|lux|W|kW|kWh|Lv|Nv|Nv\.|ID|USD|CR|ES|EN|OK|v\d+|[A-Z]\d*)?[\s\d.,:;%+\-–—·•/|()×x$#@*!?¡¿"'“”«»→←↑↓⚡✓✗…]*$/;
/** un texto que alguien va a leer (no una clase CSS, un id ni una ruta) */
function natural(s, jsx = false) {
  const v = s.replace(/\{\w+\}/g, ' ').trim();
  // una sola palabra: es texto solo si empieza con mayúscula seguida de minúsculas, o lleva acentos/¿¡ (no ids, métodos ni códigos);
  // en texto JSX también cuentan las palabras en MAYÚSCULAS (rótulos como NIVEL)
  if (!/\s/.test(v) && !/^[A-ZÁÉÍÓÚÑ¿¡][a-záéíóúüñ]/.test(v) && !/[áéíóúüñ¿¡]/i.test(v) && !(jsx && /^[A-ZÁÉÍÓÚÑ]{3,}$/.test(v))) return false;
  if (!v || !hasWordChars(v) || KEEP.test(v)) return false;
  if (/^(https?:|mailto:|\/|\.\/|#[\w-]+$|data:)/.test(v)) return false;
  if (/^[\w.-]+@[\w.-]+$/.test(v)) return false;
  const tokens = v.split(/\s+/);
  const classy = tokens.every((tk) => /^[!a-z0-9:_\-[\]/.#%()&>,'"=]+$/.test(tk)) && tokens.some((tk) => /[-:[\]]/.test(tk));
  if (classy) return false;
  if (/^[a-z][a-zA-Z0-9]*$/.test(v)) return false;                       // camelCase / clave suelta
  if (/^[a-z0-9_]+(\.[a-z0-9_]+)+$/i.test(v)) return false;             // a.b.c
  if (/^[A-Z0-9_]+$/.test(v) && v.length <= 3) return false;
  if (/^[a-z]+(_[a-z0-9]+)+$/.test(v)) return false;                    // snake_case
  if (/^[a-z]+(-[a-z0-9]+)+$/.test(v)) return false;                    // kebab-case
  return true;
}

const quote = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '')}'`;
const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", middot: '·', hellip: '…', mdash: '—', ndash: '–', rarr: '→', larr: '←', times: '×', deg: '°' };
const decode = (s) => s.replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e] ?? m));
/** cómo JSX junta el texto: las líneas se recortan y se unen con un espacio */
function jsxText(raw) {
  const lines = raw.split(/\r?\n/);
  if (lines.length === 1) return decode(raw);
  const out = lines.map((l, i) => (i === 0 ? l.replace(/\s+$/, '') : i === lines.length - 1 ? l.replace(/^\s+/, '') : l.trim())).filter((l) => l.length);
  return decode(out.join(' '));
}

function nameFor(expr, used, i) {
  let n = null;
  if (ts.isIdentifier(expr)) n = expr.text;
  else if (ts.isPropertyAccessExpression(expr)) n = expr.name.text;
  else if (ts.isNonNullExpression(expr) && ts.isIdentifier(expr.expression)) n = expr.expression.text;
  if (!n || n === 't' || n === 'tr' || used.has(n) || !/^[A-Za-z_]\w*$/.test(n)) n = `v${i}`;
  while (used.has(n)) n = `${n}_`;
  used.add(n);
  return n;
}
const varsObj = (pairs, sf) => (pairs.length ? `, { ${pairs.map(([n, e]) => (ts.isIdentifier(e) && e.text === n ? n : `${n}: ${e.getText(sf)}`)).join(', ')} }` : '');

let FN = 't';
function isTCall(node) { return node && ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ['t', 'tr', 'k'].includes(node.expression.text); }
function insideFunction(node) {
  for (let p = node.parent; p; p = p.parent) if (ts.isFunctionLike(p)) return true;
  return false;
}
function calleeText(call, sf) { const e = call.expression; return ts.isNewExpression(call) ? `new ${e.getText(sf)}` : e.getText(sf); }

/** why a literal must NOT be translated (or null if it can) */
function blocked(node, sf) {
  const p = node.parent;
  if (!p) return 'raíz';
  if (isTCall(p)) return 'ya-t';
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isExternalModuleReference(p)) return 'import';
  if (ts.isLiteralTypeNode(p)) return 'tipo';
  if ((ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p) || ts.isMethodDeclaration(p) || ts.isPropertySignature(p)) && p.name === node) return 'clave';
  if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return 'índice';
  if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.InKeyword].includes(p.operatorToken.kind)) return 'comparación';
  if (ts.isCaseClause(p)) return 'case';
  if (ts.isTaggedTemplateExpression(p)) return 'tagged';
  for (let a = p; a; a = a.parent) {
    if (ts.isJsxAttribute(a)) { const n = a.name.getText(sf); if (NON_UI_ATTRS.has(n) || n.startsWith('on') === false && /^(data-|aria-(?!label|description|valuetext))/.test(n)) return `attr:${n}`; break; }
    if (ts.isTypeNode(a)) return 'tipo';
    if (ts.isFunctionLike(a) || ts.isJsxElement(a) || ts.isJsxSelfClosingElement(a)) break;
  }
  if (ts.isPropertyAssignment(p)) {
    const k = p.name.getText(sf).replace(/['"]/g, '');
    if (NEVER_PROPS.has(k)) return `prop:${k}`;
    // --all-props solo abre las tablas del módulo (datos que se marcan con k); dentro de funciones sigue la lista de interfaz
    if (!UI_PROPS.has(k) && !(allProps && !insideFunction(node))) return `prop:${k}`;
  }
  if (ts.isCallExpression(p) || ts.isNewExpression(p)) { const c = calleeText(p, sf); if (NON_UI_CALLS.test(c)) return `llamada:${c}`; }
  if (ts.isArrayLiteralExpression(p) && ts.isCallExpression(p.parent) && /\.(includes|indexOf)$/.test(p.parent.expression.getText(sf))) return 'lista-lógica';
  return null;
}

function processFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  // si el archivo ya usa una variable local `t` (un temporizador, una técnica…), la traducción se llama `tr`
  FN = /(\b(const|let|var)\s+(\[[^\]]*\bt\b|\{[^}]*\bt\b|t\b))|(\(\s*t\s*[,)=:])|(,\s*t\s*[,)=:])|(\bt\s*=>)/.test(code) ? 'tr' : 't';
  const report = [];
  let wrapped = 0;
  for (let pass = 0; pass < 8; pass++) {
    const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const edits = [];
    const cands = new Set();
    const markCands = new Set();
    const skipped = [];

    const literalCandidate = (node) => {
      const text = ts.isTemplateExpression(node) ? node.head.text + node.templateSpans.map((s) => '{x}' + s.literal.text).join('') : node.text;
      if (!natural(text)) return false;
      const why = blocked(node, sf);
      if (why) { if (why !== 'ya-t' && why !== 'import' && why !== 'tipo' && why !== 'clave' && !why.startsWith('attr:className')) skipped.push([node, why]); return false; }
      if (!insideFunction(node)) { if (mark && !ts.isTemplateExpression(node)) { markCands.add(node); return false; } skipped.push([node, 'nivel-módulo']); return false; }
      return true;
    };

    // 1. candidates: literals and JSX runs
    const jsxRuns = [];
    const visit = (node) => {
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) && !ts.isJsxAttribute(node.parent)) {
        if (literalCandidate(node)) cands.add(node);
      }
      if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
        const n = node.name.getText(sf);
        if (!NON_UI_ATTRS.has(n) && !n.startsWith('data-') && natural(node.initializer.text) && !(n.startsWith('aria-') && !/^aria-(label|description|valuetext|roledescription)$/.test(n))) cands.add(node);
      }
      if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
        const tag = ts.isJsxElement(node) ? node.openingElement.tagName.getText(sf) : '';
        if (!['style', 'script', 'code', 'pre'].includes(tag)) {
          let run = [];
          const flush = () => {
            if (run.some((c) => ts.isJsxText(c) && natural(jsxText(c.text), true))) jsxRuns.push(run);
            run = [];
          };
          for (const c of node.children) {
            if (ts.isJsxText(c)) run.push(c);
            else if (ts.isJsxExpression(c) && c.expression && !containsJsx(c.expression) && !isTCall(c.expression) && !ts.isStringLiteral(c.expression)) run.push(c);
            else if (ts.isJsxExpression(c) && c.expression && ts.isStringLiteral(c.expression) && /^\s+$/.test(c.expression.text)) run.push(c);
            else flush();
          }
          flush();
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    for (const r of jsxRuns) cands.add(r);

    // only innermost candidates this pass (the outer ones get the inner t() in their text next pass)
    const span = (c) => (Array.isArray(c) ? [c[0].getStart(sf), c[c.length - 1].end] : [c.getStart(sf), c.end]);
    const list = [...cands];
    const inner = list.filter((c) => { const [a, b] = span(c); return !list.some((o) => o !== c && (() => { const [x, y] = span(o); return x >= a && y <= b && (x > a || y < b); })()); });

    for (const c of markCands) edits.push([c.getStart(sf), c.end, `k(${quote(c.text)})`]);
    for (const c of inner) {
      if (Array.isArray(c)) {
        // JSX run → {t('texto {a} texto', { a })}
        const used = new Set(); const pairs = []; let key = ''; let i = 0;
        for (const ch of c) {
          if (ts.isJsxText(ch)) key += jsxText(ch.text);
          else if (ts.isStringLiteral(ch.expression)) key += ch.expression.text;
          else { const n = nameFor(ch.expression, used, i++); pairs.push([n, ch.expression]); key += `{${n}}`; }
        }
        const lead = key.match(/^\s*/)[0], trail = key.match(/\s*$/)[0];
        const firstRaw = ts.isJsxText(c[0]) ? c[0].text : '', lastRaw = ts.isJsxText(c[c.length - 1]) ? c[c.length - 1].text : '';
        const k = key.trim();
        if (!natural(k.replace(/\{\w+\}/g, ''), true)) continue;
        const pre = lead && !/\n/.test(firstRaw.slice(0, firstRaw.length - firstRaw.trimStart().length)) ? "{' '}" : '';
        const post = trail && !/\n/.test(lastRaw.slice(lastRaw.trimEnd().length)) ? "{' '}" : '';
        const [a, b] = span(c);
        // keep the original surrounding newlines/indentation of the first/last text
        const startWs = ts.isJsxText(c[0]) ? (firstRaw.match(/^\s*/)[0].includes('\n') ? firstRaw.match(/^\s*/)[0] : '') : '';
        const endWs = ts.isJsxText(c[c.length - 1]) ? (lastRaw.match(/\s*$/)[0].includes('\n') ? lastRaw.match(/\s*$/)[0] : '') : '';
        const a2 = ts.isJsxText(c[0]) ? c[0].pos : a;
        edits.push([a2, b, `${startWs}${pre}{t(${quote(k)}${varsObj(pairs, sf)})}${post}${endWs}`]);
      } else if (ts.isJsxAttribute(c)) {
        edits.push([c.initializer.getStart(sf), c.initializer.end, `{${FN}(${quote(c.initializer.text)})}`]);
      } else if (ts.isTemplateExpression(c)) {
        const used = new Set(); const pairs = []; let key = c.head.text; let i = 0;
        for (const s of c.templateSpans) { const n = nameFor(s.expression, used, i++); pairs.push([n, s.expression]); key += `{${n}}${s.literal.text}`; }
        edits.push([c.getStart(sf), c.end, `${FN}(${quote(key)}${varsObj(pairs, sf)})`]);
      } else {
        edits.push([c.getStart(sf), c.end, `${FN}(${quote(c.text)})`]);
      }
    }
    if (pass === 0 || edits.length === 0) {
      // report what looks like text but was left alone (only once, from the first pass)
      if (pass === 0) for (const [n, why] of skipped) {
        const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
        report.push(`${path.relative(process.cwd(), file)}:${line + 1}  [${why}]  ${n.getText(sf).slice(0, 110).replace(/\s+/g, ' ')}`);
      }
    }
    if (!edits.length) break;
    edits.sort((x, y) => y[0] - x[0]);
    for (const [a, b, txt] of edits) code = code.slice(0, a) + txt + code.slice(b);
    wrapped += edits.length;
  }
  if (wrapped && !dry) {
    const need = ['t', 'tr', 'k'].filter((f) => new RegExp(`\\b${f}\\('`).test(code)).map((f) => (f === 'tr' ? 't as tr' : f));
    if (!/import \{[^}]*\} from ['"][./]*i18n(\/core)?['"]/.test(code)) {
      // la simulación, los datos y la economía también los usa el servidor: importan la parte sin React
      const core = /src\/(sim|data|economy|utils)\//.test(path.resolve(file).replace(/\\/g, '/'));
      const rel = path.relative(path.dirname(file), path.resolve(core ? 'src/i18n/core' : 'src/i18n')).replace(/\\/g, '/');
      const spec = rel.startsWith('.') ? rel : `./${rel}`;
      const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
      const imports = sf.statements.filter((s) => ts.isImportDeclaration(s));
      const at = imports.length ? imports[imports.length - 1].end : 0;
      code = code.slice(0, at) + `\nimport { ${need.join(', ')} } from '${spec}';` + code.slice(at);
    } else {
      code = code.replace(/import \{([^}]*)\} from (['"][./]*i18n(?:\/core)?['"])/, (m, names, from) => { const have = names.split(',').map((x) => x.trim()).filter(Boolean); for (const f of need) if (!have.includes(f)) have.push(f); return `import { ${have.join(', ')} } from ${from}`; });
    }
    fs.writeFileSync(file, code);
  }
  return { wrapped, report };
}

function containsJsx(node) {
  let found = false;
  const v = (n) => { if (found) return; if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n)) { found = true; return; } ts.forEachChild(n, v); };
  v(node);
  return found;
}

let total = 0;
const allReport = [];
for (const f of files) {
  const { wrapped, report } = processFile(f);
  total += wrapped;
  allReport.push(...report);
  console.log(`${dry ? '(prueba) ' : ''}${f}: ${wrapped} textos`);
}
if (allReport.length) { console.log(`\nSin envolver (revisar a mano):`); for (const l of allReport) console.log('  ' + l); }
console.log(`\nTotal: ${total}`);
