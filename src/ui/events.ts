/** Tiny UI bus so any component can open a drawer owned by App without prop-drilling. */
export type UiEvent = 'ybe:open-bag' | 'ybe:open-diary' | 'ybe:open-guide';
export const emitUi = (e: UiEvent) => window.dispatchEvent(new Event(e));
export const openBag = () => emitUi('ybe:open-bag');
export const openDiary = () => emitUi('ybe:open-diary');
export const openGuide = () => emitUi('ybe:open-guide');
