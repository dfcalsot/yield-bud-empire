import {
  CAPS, EMPTY_STAFF_PITY, MAX_RANK, RARITIES, STAFF_CHESTS, STAFF_ROLES, ROLE_INFO, effectsOf, hireFromBoard, isActive, jobBoard, lookFor, makeStaff, mulberry, modifiersOf,
  nameFor, normalizeAssignments, normalizeRoster, rankUpCost, rollStaff, settleWages, wageOf, type StatId, type StaffNft,
} from '../src/sim/staff';

let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) failed++; };
const T0 = Date.UTC(2026, 8, 21, 10), DAY = 86400000;
const mk = (role: (typeof STAFF_ROLES)[number], rarity: (typeof RARITIES)[number], rank = 1, seed = 1) => makeStaff(`s-${role}-${rarity}-${rank}-${seed}`, role, rarity, seed, T0, rank);

// ── effects grow with rarity and rank, and never pass the cap
for (const role of STAFF_ROLES) {
  const stat = ROLE_INFO[role].stat as StatId;
  const byRarity = RARITIES.map((r) => (effectsOf(mk(role, r, 3)) as Record<string, number>)[stat]);
  ok(`${role}: más rareza → más efecto`, byRarity.every((v, i) => i === 0 || v >= byRarity[i - 1]), `(${byRarity.map((v) => v.toFixed(3)).join(' < ')})`);
  const byRank = [1, 2, 3, 4, 5].map((k) => (effectsOf(mk(role, 'epic', k)) as Record<string, number>)[stat]);
  ok(`${role}: más rango → más efecto`, byRank.every((v, i) => i === 0 || v >= byRank[i - 1]));
  const top = (effectsOf(mk(role, 'legendary', MAX_RANK)) as Record<string, number>)[stat];
  ok(`${role}: el mejor NUNCA pasa el tope`, top <= CAPS[stat] + 1e-9, `(${top} ≤ ${CAPS[stat]})`);
}

// ── a full roster of the best hires still respects every cap
const dream: StaffNft[] = STAFF_ROLES.map((r, i) => makeStaff(`d${i}`, r, 'legendary', 100 + i, T0, MAX_RANK));
const all = modifiersOf(dream);
ok('plantilla de ensueño: ningún tope se supera', (Object.keys(all) as StatId[]).every((k) => all[k] <= CAPS[k] + 1e-9), JSON.stringify(Object.fromEntries(Object.entries(all).map(([k, v]) => [k, +v.toFixed(3)]))));
const dup = modifiersOf([...dream, ...dream, ...dream]);
ok('apilar copias tampoco pasa los topes', (Object.keys(dup) as StatId[]).every((k) => dup[k] <= CAPS[k] + 1e-9));
ok('sin plantilla no hay bonos', Object.values(modifiersOf([])).every((v) => v === 0));
ok('el genetista siempre da al menos 1 semilla extra', (effectsOf(mk('geneticist', 'common', 1)) as Record<string, number>).seedBonus >= 1);
ok('los comunes no traen rasgos, los legendarios traen los tres', mk('farmer', 'common').traits.length === 0 && mk('farmer', 'legendary').traits.length === 3);

// ── the wage is a sink that grows with quality
ok('el sueldo sube con rareza y rango', RARITIES.every((r, i) => i === 0 || wageOf({ rarity: r, rank: 1 }) > wageOf({ rarity: RARITIES[i - 1], rank: 1 })) && wageOf({ rarity: 'epic', rank: 5 }) > wageOf({ rarity: 'epic', rank: 1 }));
ok('subir de rango cuesta y se encarece; en el tope no hay más', rankUpCost({ rarity: 'rare', rank: 1 })! < rankUpCost({ rarity: 'rare', rank: 2 })! && rankUpCost({ rarity: 'rare', rank: MAX_RANK }) === null);

// ── paying wages: one day at a time, only for the assigned, never in debt
const a = mk('foreman', 'rare'), b = mk('merchant', 'rare'), c = mk('scientist', 'epic');
let st = settleWages([a, b, c], [a.id, c.id], 1000, T0);
ok('solo se paga a los asignados', st.spent === wageOf(a) + wageOf(c) && st.roster.find((s) => s.id === b.id)!.paidThrough === 0);
ok('pagado = activo el día siguiente, no después', isActive(st.roster[0], T0 + DAY - 1) && !isActive(st.roster[0], T0 + DAY));
const again = settleWages(st.roster, [a.id, c.id], 1000, T0 + 3600_000);
ok('no se cobra dos veces el mismo día', again.spent === 0);
const poor = settleWages([a, c], [a.id, c.id], wageOf(a), T0);
ok('sin saldo, el que no se puede pagar deja de trabajar (sin deuda)', poor.spent === wageOf(a) && poor.unpaid.length === 1 && !isActive(poor.roster[1], T0));
ok('estando ausente no se acumulan cobros', settleWages(st.roster, [a.id, c.id], 1000, T0 + 10 * DAY).spent === wageOf(a) + wageOf(c));
ok('solo los activos aportan bonos', modifiersOf(st.roster.filter((s) => isActive(s, T0 + 2 * DAY))).roomYield === 0);

// ── job board and chests are deterministic / guaranteed
ok('la bolsa de trabajo es determinista por día', JSON.stringify(jobBoard(20000)) === JSON.stringify(jobBoard(20000)) && JSON.stringify(jobBoard(20000)) !== JSON.stringify(jobBoard(20001)));
ok('la bolsa solo ofrece comunes y raros', Array.from({ length: 200 }, (_, d) => jobBoard(d)).flat().every((x) => x.rarity === 'common' || x.rarity === 'rare'));
const board = jobBoard(20000)[0];
ok('contratar de la bolsa da el mismo perfil', hireFromBoard(board, T0).role === board.role && hireFromBoard(board, T0).rarity === board.rarity);
const rng = mulberry(42);
let pity = EMPTY_STAFF_PITY.recruit, sinceLeg = 0, maxGap = 0, legends = 0, epicPlus = 0;
const N = 4000;
for (let i = 0; i < N; i++) { const r = rollStaff(STAFF_CHESTS.recruit, pity, i, T0, rng); pity = r.pity; sinceLeg++; if (r.staff.rarity === 'legendary') { legends++; maxGap = Math.max(maxGap, sinceLeg); sinceLeg = 0; } if (r.staff.rarity === 'epic' || r.staff.rarity === 'legendary') epicPlus++; }
ok(`garantía: un legendario como mucho cada ${STAFF_CHESTS.recruit.legendEvery} cofres`, maxGap <= STAFF_CHESTS.recruit.legendEvery, `(máx ${maxGap})`);
ok('el cofre normal no regala: épicos+ ≤ 25 %', epicPlus / N <= 0.25, `(${(epicPlus / N * 100).toFixed(1)} %, legendarios ${(legends / N * 100).toFixed(1)} %)`);
const hp = mulberry(7); let hpPity = EMPTY_STAFF_PITY.headhunter; let commons = 0;
for (let i = 0; i < 500; i++) { const r = rollStaff(STAFF_CHESTS.headhunter, hpPity, i, T0, hp); hpPity = r.pity; if (r.staff.rarity === 'common') commons++; }
ok('el cazatalentos nunca da comunes', commons === 0);

// ── looks, names and saves
ok('nombre y aspecto estables', nameFor(5) === nameFor(5) && JSON.stringify(lookFor(5)) === JSON.stringify(lookFor(5)) && nameFor(5) !== nameFor(6));
ok('la variación visual está acotada', Array.from({ length: 300 }, (_, i) => lookFor(i)).every((l) => Math.abs(l.hue) <= 38 && l.sat >= 0.85 && l.sat <= 1.2));
ok('normalizeRoster descarta basura', normalizeRoster([a, { id: 3 }, null, { ...b, rank: 99 }]).length === 2 && normalizeRoster([{ ...b, rank: 99 }])[0].rank === MAX_RANK && normalizeRoster('x').length === 0);
ok('asignación: un rol solo acepta a alguien de ese rol', JSON.stringify(normalizeAssignments({ foreman: b.id, merchant: b.id, zz: 1 }, [a, b])) === JSON.stringify({ merchant: b.id }));

console.log(failed === 0 ? '\nALL OK' : `\n${failed} FAILED`);
process.exit(failed ? 1 : 0);
