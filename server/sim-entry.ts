// Entry point of the bundle the account service shares with the game: the pure modules (money, facilities, staff, lands, avatars)
// and the few data tables the server needs. Built into server/gen/sim.mjs by scripts/build-server-sim.mjs.
export * as economy from '../src/sim/economy';
export * as facilities from '../src/sim/facilities';
export * as staff from '../src/sim/staff';
export * as avatars from '../src/sim/avatars';
export * as terroir from '../src/sim/terroir';
export * as lands from '../src/sim/lands';
export { INITIAL_FACILITIES, INITIAL_QUESTS } from '../src/data/initialData';
export * as products from '../src/sim/products';
