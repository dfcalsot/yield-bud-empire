import React, { useEffect, useState } from 'react';
import { Bug, Briefcase, Grid3X3, Hammer, Layers, SlidersHorizontal, Sprout } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { GROW_ROOMS_CONFIG } from '../../data/initialData';
import { FacilityArt } from '../art/GameArt';
import { CarePanel } from '../CarePanel';
import { CannabisLeaf } from '../icons/CannabisIcons';
import { GaugeGroup } from '../hud/Gauges';
import { Nameplate, Orb } from '../hud/HudParts';
import { ResourceBar } from '../ResourceBar';
import { formatDuration, isThirsty } from '../../sim/engine';
import { progressOf, remainingMs } from '../../sim/facilities';
import { plantClocks, STAGE_DOT, STAGE_LABEL } from './plantInfo';
import { Droplets as DropletsIcon, FlaskConical as FlaskIcon, Zap as ZapIcon } from 'lucide-react';
import '../hud/hud.css';
import { t as tr } from '../../i18n';

/**
 * The two side rails of the Cultivo panel. Everything that used to be stacked above or floating inside the scene lives here as
 * tidy cards with the same frame: the plant's card, the installation and its build, the room, the resources and the room map on the
 * left; the tools, the instruments and the care panel on the right. The scene in the middle is left for the plant.
 */
const Card: React.FC<{ title: string; icon?: React.ReactNode; aside?: React.ReactNode; className?: string; children: React.ReactNode; tour?: string }> = ({ title, icon, aside, className = '', children, tour }) => (
  <section className={`gh-frame cv-card ${className}`} data-tour={tour}>
    <header className="cv-card-h">{icon}<h3>{title}</h3>{aside && <span className="ml-auto">{aside}</span>}</header>
    <div className="cv-card-b">{children}</div>
  </section>
);

interface LeftProps { onOpenFacility: () => void; onOpenMarket?: (cat?: string) => void; onOpenSeedModal: () => void }

export const LeftRail: React.FC<LeftProps> = ({ onOpenFacility, onOpenMarket, onOpenSeedModal }) => {
  const { activePlant, indoorPlants, selectedPlantIndex, selectPlant, getPlantEta, currentFacility, facilities, construction, currentRoom, switchGrowRoom, resources } = useGame();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!construction) return; const t = setInterval(() => setNow(Date.now()), 15000); setNow(Date.now()); return () => clearInterval(t); }, [construction]);
  const building = construction ? facilities.find((f) => f.id === construction.facilityId) : undefined;
  const thirsty = indoorPlants.filter(isThirsty).length;
  const ready = indoorPlants.filter((p) => p.stage === 'ready_harvest').length;

  return (
    <aside className="cv-rail cv-rail--l" aria-label={tr('Panel izquierdo del cultivo')}>
      {/* the plant */}
      {activePlant ? (
        <Nameplate
          name={activePlant.strain.name} stage={STAGE_LABEL[activePlant.stage]} stageColor={STAGE_DOT[activePlant.stage]} index={selectedPlantIndex + 1}
          thc={activePlant.strain.thcPercentage} health={activePlant.health} progress={activePlant.progressPercent} emblem={<CannabisLeaf className="w-6 h-6" />}
          clocks={plantClocks(activePlant, getPlantEta(activePlant))}
        />
      ) : (
        <Card title={tr('Sin cultivo')} icon={<Sprout className="w-4 h-4 text-emerald-300" />}>
          <p className="text-[11.5px] text-neutral-400 mb-2">{tr('Elige una genética de tu banco de semillas para empezar.')}</p>
          <button type="button" onClick={onOpenSeedModal} className="care-btn care-btn--gold w-full"><CannabisLeaf className="w-4 h-4" />{tr('Sembrar')}</button>
        </Card>
      )}

      {/* the installation */}
      <Card title={tr('Instalación')} icon={<Layers className="w-4 h-4 text-emerald-300" />} aside={<span className="font-mono text-[10px] text-emerald-300">Nv.{currentFacility.tier}</span>}>
        <button type="button" onClick={onOpenFacility} className="cv-facility" title={tr('Ver la escalera de instalaciones y las obras')}>
          <span className="cv-facility-art"><FacilityArt kind={currentFacility.id} slice className="w-full h-full" label={tr(currentFacility.name)} /></span>
          <span className="min-w-0 text-left">
            <span className="block text-[12.5px] font-bold text-white leading-tight truncate">{tr(currentFacility.name).split(' (')[0]}</span>
            <span className="block text-[10px] font-mono text-neutral-400">{tr('{length} {v1} · +{v2}% ritmo', { length: indoorPlants.length, v1: indoorPlants.length === 1 ? tr('planta') : 'plantas', v2: Math.round((currentFacility.environmentBonus - 1) * 100) })}</span>
          </span>
        </button>
        {construction && building && (
          <button type="button" onClick={onOpenFacility} className="cv-build" data-testid="build-badge" title={tr('Obra en marcha · toca para verla o acelerarla')}>
            <Hammer className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="flex justify-between gap-2 text-[11px] text-amber-100"><span className="truncate">{tr(building.name).split(' (')[0]}</span><b className="font-mono text-amber-300">{formatDuration(remainingMs(construction, now) / 1000)}</b></span>
              <span className="block h-1.5 mt-1 rounded-full bg-white/10 overflow-hidden"><i className="block h-full rounded-full bg-amber-400" style={{ width: `${progressOf(construction, now) * 100}%` }} /></span>
            </span>
          </button>
        )}
      </Card>

      {/* the room */}
      <Card title={tr('Cuarto')} icon={<CannabisLeaf className="w-4 h-4 text-emerald-300" />}>
        <div className="space-y-1.5" role="radiogroup" aria-label={tr('Cuarto de cultivo')}>
          {GROW_ROOMS_CONFIG.map((r) => (
            <button key={r.id} type="button" role="radio" aria-checked={r.id === currentRoom} onClick={() => switchGrowRoom(r.id)} className={`cv-room ${r.id === currentRoom ? 'is-on' : ''}`}>
              <span className="text-[11.5px] font-bold text-white truncate">{tr(r.name)}</span>
              <span className="text-[9.5px] font-mono text-neutral-400">{tr('{targetTempC}°C · {targetRhPercent}% HR · {recommendedLightSchedule}', { targetTempC: r.targetTempC, targetRhPercent: r.targetRhPercent, recommendedLightSchedule: r.recommendedLightSchedule })}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* resources */}
      <Card title={tr('Recursos')} icon={<DropletsIcon className="w-4 h-4 text-sky-300" />} aside={<span className="font-mono text-[9.5px] text-neutral-500">{tr('{v0} kWh/día', { v0: resources.kwhPerDay.toFixed(1) })}</span>}>
        <div className="gh-orbs justify-around mb-2.5" data-tour="orbs">
          <Orb kind="water" label={tr('Agua')} value={`${Math.round(resources.water)} L`} fill={resources.water / 300} icon={<DropletsIcon className="w-5 h-5" />} low={resources.water < 20} onClick={() => onOpenMarket?.('water')} title={tr('Agua en el tanque · toca para comprar')} />
          <Orb kind="nutrient" label={tr('Abono')} value={`${Math.round(resources.nutrient)} ml`} fill={resources.nutrient / 1000} icon={<FlaskIcon className="w-5 h-5" />} low={resources.nutrient < 60} onClick={() => onOpenMarket?.('nutrient')} title={tr('Abono · toca para comprar')} />
          <Orb kind="energy" label={tr('Energía')} value={`${resources.energy.toFixed(0)} kWh`} fill={resources.energy / 100} icon={<ZapIcon className="w-5 h-5" />} low={Number.isFinite(resources.energyDays) && resources.energyDays < 0.5} onClick={() => onOpenMarket?.('energy')} title={tr('Electricidad · toca para comprar')} />
        </div>
        <ResourceBar onOpenMarket={(c) => onOpenMarket?.(c)} stacked />
      </Card>

      {/* the room map */}
      <Card title={tr('Sala')} icon={<Grid3X3 className="w-4 h-4 text-teal-300" />} aside={<span className="font-mono text-[10px] text-neutral-400">{thirsty ? `💧${thirsty} ` : ''}{ready ? `🌾${ready}` : ''}</span>}>
        <div className="grid grid-cols-10 gap-[4px]" title={tr('Mapa de la sala: toca una planta para verla')}>
          {indoorPlants.slice(0, 30).map((p, i) => (
            <button key={p.id ?? i} type="button" onClick={() => selectPlant(i)} aria-label={tr('Planta {v0}', { v0: i + 1 })} className="aspect-square rounded-[3px] cursor-pointer transition"
              style={{ background: STAGE_DOT[p.stage], opacity: p.health < 50 ? 0.55 : 1,
                outline: i === selectedPlantIndex ? '2px solid #fff' : p.pest ? '1.5px solid #f472b6' : isThirsty(p) ? '1.5px solid #22d3ee' : p.stage === 'ready_harvest' ? '1px solid #fbbf24' : 'none', outlineOffset: 1,
                boxShadow: i === selectedPlantIndex ? '0 0 8px #fff' : undefined }} />
          ))}
        </div>
      </Card>
    </aside>
  );
};

interface RightProps {
  onShowRoom: () => void; onOpenPanel: () => void; onOpenPlanet?: () => void; onOpenMarket?: (cat?: string) => void;
  careOpen: boolean; setCareOpen: (v: boolean | ((x: boolean) => boolean)) => void;
}

export const RightRail: React.FC<RightProps> = ({ onShowRoom, onOpenPanel, onOpenPlanet, onOpenMarket, careOpen, setCareOpen }) => {
  const { activePlant, indoorPlants, rawFlowerGrams, trimGrams, care, co2Ppm, reportEvent } = useGame();
  const thirstyCount = indoorPlants.filter(isThirsty).length;
  const tools = [
    { key: 'room', label: tr('Sala'), icon: <Grid3X3 className="w-5 h-5" />, color: '#5eead4', onClick: onShowRoom, badge: thirstyCount || undefined, badgeColor: '#22d3ee', title: tr('Ver todas las plantas de la sala') },
    { key: 'panel', label: tr('Panel'), icon: <SlidersHorizontal className="w-5 h-5" />, color: '#22d3ee', onClick: onOpenPanel, title: tr('Panel completo de instrumentos') },
    ...(onOpenPlanet ? [{ key: 'planet', label: tr('Parcelas'), icon: <Layers className="w-5 h-5" />, color: '#38bdf8', onClick: onOpenPlanet, title: tr('Tus parcelas en el Planeta'), badge: undefined as number | string | undefined, badgeColor: undefined as string | undefined, tour: undefined as string | undefined }] : []),
    { key: 'care', label: tr('Cuidado'), icon: <Bug className="w-5 h-5" />, color: '#f472b6', onClick: () => setCareOpen((v) => !v), badge: care.males > 0 ? '♂' : undefined, badgeColor: '#38bdf8', title: tr('Plagas, machos, limpieza y jardinero') },
  ];
  return (
    <aside className="cv-rail cv-rail--r" aria-label={tr('Panel derecho del cultivo')}>
      <Card title={tr('Herramientas')} icon={<Briefcase className="w-4 h-4 text-lime-300" />}>
        <div className="grid grid-cols-3 gap-1.5">
          {tools.map((t) => (
            <button key={t.key} type="button" onClick={t.onClick} title={t.title ?? t.label} data-tour={t.tour} className="gh-tool !w-auto" style={{ ['--tc' as string]: t.color }}>
              {t.icon}<span>{tr(t.label)}</span>
              {!!t.badge && <b className="gh-tool-badge" style={{ ['--bc' as string]: t.badgeColor }}>{t.badge}</b>}
            </button>
          ))}
        </div>
        <div className="gh-loot !mt-2.5 !p-0 !border-0 !bg-transparent !shadow-none">
          <div><small>{tr('FLOR')}</small><b className="text-lime-300">{rawFlowerGrams} g</b></div><span className="w-px bg-white/15" />
          <div><small>{tr('TRIM')}</small><b className="text-amber-300">{trimGrams} g</b></div>
        </div>
      </Card>

      {careOpen && <CarePanel onClose={() => setCareOpen(false)} onOpenMarket={() => { setCareOpen(false); onOpenMarket?.(); }} />}

      {activePlant && (
        <Card title={tr('Instrumentos')} icon={<SlidersHorizontal className="w-4 h-4 text-cyan-300" />} tour="gauges">
          <div className="space-y-1.5">
            <GaugeGroup title={tr('Clima')} onOpen={() => reportEvent('gauges')} items={[
              { label: tr('Temp'), value: activePlant.temperatureC, display: `${activePlant.temperatureC}°C`, min: 15, max: 35, okMin: 22, okMax: 28 },
              { label: tr('Humedad'), value: activePlant.relativeHumidity, display: `${activePlant.relativeHumidity}%`, min: 20, max: 90, okMin: 40, okMax: 65 },
              { label: 'VPD', value: activePlant.vpdKpa, display: `${activePlant.vpdKpa} kPa`, min: 0, max: 2.5, okMin: 0.8, okMax: 1.4 },
            ]} />
            <GaugeGroup title={tr('Raíz')} onOpen={() => reportEvent('gauges')} items={[
              { label: tr('Sustrato'), value: activePlant.soilMoisture, display: `${activePlant.soilMoisture}%`, min: 0, max: 100, okMin: 40, okMax: 85 },
              { label: 'pH', value: activePlant.phLevel, display: `${activePlant.phLevel}`, min: 5, max: 8, okMin: 5.8, okMax: 6.5 },
              { label: 'EC', value: activePlant.ecLevel, display: `${activePlant.ecLevel} mS`, min: 0, max: 4, okMin: 1, okMax: 2.4 },
            ]} />
            <GaugeGroup title={tr('Luz y aire')} onOpen={() => reportEvent('gauges')} items={[
              { label: 'PPFD', value: activePlant.ppfdLightIntensity, display: `${activePlant.ppfdLightIntensity}`, min: 0, max: 1200, okMin: 400, okMax: 1000 },
              { label: 'CO₂', value: co2Ppm, display: `${co2Ppm}`, min: 300, max: 1600, okMin: 700, okMax: 1400 },
            ]} />
          </div>
        </Card>
      )}
    </aside>
  );
};
