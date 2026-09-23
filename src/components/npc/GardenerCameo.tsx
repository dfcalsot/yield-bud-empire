import React, { useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { isHungry, isThirsty } from '../../sim/engine';
import { Npc, useNpc } from './Npc';
import { t } from '../../i18n';

/**
 * Tomás on the cultivation stage while a gardener contract is active: he works next to the plants (the watering can
 * tips, the pot sways), comments on what he is doing and reacts when a plague shows up.
 */
export const GardenerCameo: React.FC = () => {
  const { care, indoorPlants, resources } = useGame();
  const npc = useNpc(t('Tomás al habla, jefe. Cuido la sala mientras usted descansa. Me quedan {v0} días de contrato.', { v0: care.gardenerDays.toFixed(1) }));

  const thirsty = indoorPlants.filter(isThirsty).length;
  const hungry = indoorPlants.filter(isHungry).length;
  const master = care.gardenerLevel >= 2;
  npc.tips.current = () => [
    ...(care.pests === 0 ? [master ? t('🧴 Sala impecable, jefe. Todo bajo control.') : t('Todo tranquilo por aquí. Sin plagas a la vista.')] : []),
    ...(care.pests > 0 ? [master ? t('🐛 {pests} planta{v1} con plaga: ya las estoy tratando.', { pests: care.pests, v1: care.pests > 1 ? 's' : '' }) : t('🐛 {pests} con plaga… Con el contrato de maestro yo las trataría, jefe.', { pests: care.pests })] : []),
    ...(thirsty > 0 ? [t('💧 Voy regando las {thirsty} que tienen sed.', { thirsty })] : [t('💧 Todas bien regadas por ahora.')]),
    ...(hungry > 0 ? [t('🧪 Toca abonar a {hungry}. Déjeme eso a mí.', { hungry })] : []),
    t('Me quedan {v0} días de contrato.', { v0: care.gardenerDays.toFixed(1) }),
    ...(resources.water < 15 ? [t('Se está acabando el agua del tanque, jefe. Compre más en el mercado.')] : []),
    ...(resources.nutrient < 60 ? [t('El abono está bajo. ¡Sin abono no puedo hacer milagros!')] : []),
  ];

  // he notices a new plague right away
  const prevPests = useRef(care.pests);
  useEffect(() => {
    if (care.pests > prevPests.current) npc.speak(t('¡Ay, jefe! Apareció plaga en {v0} planta{v1}.', { v0: care.pests - prevPests.current, v1: care.pests - prevPests.current > 1 ? 's' : '' }), 'sad');
    else if (care.pests === 0 && prevPests.current > 0) npc.speak(t('¡Plaga controlada! Bicho fuera, jefe.'), 'happy');
    prevPests.current = care.pests;
  }, [care.pests]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="absolute z-20 hidden md:flex flex-col items-start pointer-events-none left-[13.5rem] bottom-[5.4rem]" aria-label={t('Tomás, tu jardinero')}>
      <div key={npc.say.text} className="cameo-chip">{t(npc.say.text)}</div>
      <Npc kind="farmer" bare text="" mood={npc.say.mood === 'idle' ? 'busy' : npc.say.mood} moodKey={npc.say.key} />
    </div>
  );
};
