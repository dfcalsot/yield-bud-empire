/** The empire seats reuse the hydroponic art, each with its own tint (a hue shift) so the three read as different places. */
const SEATS: Record<string, string> = {
  hydro_complex: 'hue-rotate(35deg) saturate(1.15)',
  grow_campus: 'hue-rotate(105deg) saturate(1.2)',
  empire_seat: 'hue-rotate(205deg) saturate(1.35) brightness(1.05)',
};
/** which base illustration a facility uses */
export const artBase = (id: string): string => (SEATS[id] ? 'lab_pharma_hydro' : id);
/** the CSS filter that tells a seat apart (undefined for the original four) */
export const artFilter = (id: string): string | undefined => SEATS[id];
