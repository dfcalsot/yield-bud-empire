#!/usr/bin/env node
// Lista, por archivo, las tablas del módulo que tienen textos marcados con k('…') y qué campos los llevan
// (para envolverlas con localize(tabla, [campos])). Uso: TS5_DIR=… node scripts/i18n-tables.mjs src/sim/foo.ts
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const ts = createRequire(path.join(process.env.TS5_DIR || process.cwd(), 'x.js'))('typescript');
for (const file of process.argv.slice(2)) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    const exported = st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    for (const d of st.declarationList.declarations) {
      const fields = new Set(); let bare = 0;
      const v = (n) => {
        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'k') {
          const p = n.parent;
          if (ts.isPropertyAssignment(p)) fields.add(p.name.getText(sf).replace(/['"]/g, ''));
          else if (ts.isArrayLiteralExpression(p) && ts.isPropertyAssignment(p.parent)) fields.add(p.parent.name.getText(sf).replace(/['"]/g, ''));
          else bare++;
        }
        ts.forEachChild(n, v);
      };
      if (d.initializer) v(d.initializer);
      if (fields.size || bare) console.log(`${file}:${sf.getLineAndCharacterOfPosition(d.getStart(sf)).line + 1}  ${exported ? 'export ' : ''}${d.name.getText(sf)}  campos: [${[...fields].join(', ')}]${bare ? `  +${bare} sueltos` : ''}`);
    }
  }
}
