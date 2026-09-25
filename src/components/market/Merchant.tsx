import React from 'react';
import { Npc, type Mood } from '../npc/Npc';

export type { Mood };

/** "Flor", the market keeper (now one of the cast — see npc/Npc.tsx). */
export const Merchant: React.FC<{ text: string; mood: Mood; moodKey: number }> = ({ text, mood, moodKey }) => (
  <Npc kind="merchant" text={text} mood={mood} moodKey={moodKey} />
);
