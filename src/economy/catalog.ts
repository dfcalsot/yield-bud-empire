import type { Rarity } from '../components/game/GameUI';
import type { PestKind } from '../types';
import { k, localize } from '../i18n/core';

/**
 * Catalogue of everything the player buys. Every purchase mints an NFT (simulated Devnet):
 *  - equipment: lamps, air conditioners, irrigation, CO₂, meters, solar panels — durable, wear down, repair by burning $FLORA
 *  - consumable: water, nutrients, electricity — lots whose `remaining` is spent as you play
 *  - license: one-off unlock of a lab station
 * All numbers live here so the economy can be tuned in one place.
 */

export type AssetCategory = 'lamp' | 'ac' | 'irrigation' | 'co2' | 'meter' | 'solar' | 'nutrient' | 'water' | 'energy' | 'pest' | 'service' | 'license';
export type AssetKind = 'equipment' | 'consumable' | 'license';

export interface CatalogItem {
  id: string;
  category: AssetCategory;
  kind: AssetKind;
  name: string;
  brand: string;
  tier: 1 | 2 | 3 | 4;
  priceFlora: number;
  priceSol: number;
  description: string;
  specs: Array<{ label: string; value: string }>;
  // equipment effects
  watts?: number;          // lamp draw at full power (whole room)
  maxPpfd?: number;        // lamp ceiling
  acKw?: number;           // AC electrical draw when cooling
  pumpKw?: number;         // irrigation pump draw
  autoWater?: boolean;     // enables the automatic drip
  waterEff?: number;       // litres per plant per automatic watering
  solarKw?: number;        // peak solar generation
  co2Ppm?: number;         // CO₂ the system holds the room at
  wearPerDay?: number;     // durability % lost per day of use
  // consumables
  amount?: number;
  unit?: 'L' | 'ml' | 'kWh' | 'días';
  treats?: PestKind[];     // plagues this product cures
  guardHours?: number;     // protection after treating
  gardener?: 1 | 2;        // contract level: 1 waters + feeds, 2 also treats plagues
  feedBonus?: number;      // growth bonus while the plants are fed with this nutrient
  // licenses
  stationId?: string;
}

const flora = (n: number) => `${n} $FLORA`;

export const CATALOG: CatalogItem[] = localize<CatalogItem[]>([
  /* ── Lámparas ── */
  { id: 'lamp_led600', category: 'lamp', kind: 'equipment', name: k('Panel LED Starter 600 W'), brand: 'YieldLight', tier: 1, priceFlora: 120, priceSol: 0.12, watts: 600, maxPpfd: 480, wearPerDay: 1.0,
    description: k('Panel LED de espectro completo para la carpa casera. Eficiente y sin complicaciones.'),
    specs: [{ label: k('Potencia'), value: '600 W' }, { label: k('PPFD máx.'), value: k('480 µmol/m²s') }, { label: k('Desgaste'), value: k('1 %/día') }] },
  { id: 'lamp_bar1200', category: 'lamp', kind: 'equipment', name: k('Barra LED Quantum 1 200 W'), brand: 'Samsung LM301H', tier: 2, priceFlora: 340, priceSol: 0.34, watts: 1200, maxPpfd: 820, wearPerDay: 0.9,
    description: k('Barras multi-espectro con diodos LM301H EVO y rojo profundo 660 nm.'),
    specs: [{ label: k('Potencia'), value: '1 200 W' }, { label: k('PPFD máx.'), value: k('820 µmol/m²s') }, { label: k('Desgaste'), value: k('0.9 %/día') }] },
  { id: 'lamp_board2400', category: 'lamp', kind: 'equipment', name: k('Quantum Board Pro 2 400 W + Far-Red'), brand: 'Arachne Grow', tier: 3, priceFlora: 780, priceSol: 0.78, watts: 2400, maxPpfd: 1150, wearPerDay: 0.8,
    description: k('Matriz de alta densidad con far-red 730 nm y UV: rendimiento de resina superior.'),
    specs: [{ label: k('Potencia'), value: '2 400 W' }, { label: k('PPFD máx.'), value: k('1 150 µmol/m²s') }, { label: k('Desgaste'), value: k('0.8 %/día') }] },
  { id: 'lamp_matrix4000', category: 'lamp', kind: 'equipment', name: k('Matriz Full-Spectrum Industrial 4 000 W'), brand: 'Yield Labs', tier: 4, priceFlora: 1600, priceSol: 1.6, watts: 4000, maxPpfd: 1400, wearPerDay: 0.7,
    description: k('La lámpara de los maestros cultivadores: PPFD extremo con óptica de haz uniforme.'),
    specs: [{ label: k('Potencia'), value: '4 000 W' }, { label: k('PPFD máx.'), value: k('1 400 µmol/m²s') }, { label: k('Desgaste'), value: k('0.7 %/día') }] },

  /* ── Aires acondicionados ── */
  { id: 'ac_split9', category: 'ac', kind: 'equipment', name: k('Mini-Split 9 000 BTU'), brand: 'Frigus', tier: 2, priceFlora: 420, priceSol: 0.42, acKw: 0.9, wearPerDay: 1.2,
    description: k('Climatización estable de temperatura y humedad. Activa el control climático autónomo.'),
    specs: [{ label: k('Capacidad'), value: k('9 000 BTU') }, { label: k('Consumo'), value: '0.9 kW' }, { label: k('Desgaste'), value: k('1.2 %/día') }] },
  { id: 'ac_split18', category: 'ac', kind: 'equipment', name: k('Mini-Split Inverter 18 000 BTU'), brand: 'Frigus Pro', tier: 3, priceFlora: 850, priceSol: 0.85, acKw: 1.6, wearPerDay: 1.0,
    description: k('Compresor inverter silencioso y eficiente para salas de cultivo grandes.'),
    specs: [{ label: k('Capacidad'), value: k('18 000 BTU') }, { label: k('Consumo'), value: '1.6 kW' }, { label: k('Desgaste'), value: k('1 %/día') }] },
  { id: 'ac_chiller36', category: 'ac', kind: 'equipment', name: k('Enfriadora Industrial 36 000 BTU'), brand: 'Polar Industrial', tier: 4, priceFlora: 1700, priceSol: 1.7, acKw: 3.0, wearPerDay: 0.9,
    description: k('Planta enfriadora para invernaderos industriales con deshumidificación integrada.'),
    specs: [{ label: k('Capacidad'), value: k('36 000 BTU') }, { label: k('Consumo'), value: '3 kW' }, { label: k('Desgaste'), value: k('0.9 %/día') }] },

  /* ── Riego ── */
  { id: 'irr_autopot', category: 'irrigation', kind: 'equipment', name: k('GravityPot Gravitacional (sin bomba)'), brand: 'GravityPot SmartValve', tier: 2, priceFlora: 220, priceSol: 0.22, autoWater: true, waterEff: 0.55, pumpKw: 0, wearPerDay: 0.6,
    description: k('Riega solo cuando el sustrato lo pide, sin electricidad. Consume algo más de agua.'),
    specs: [{ label: k('Riego'), value: k('Automático') }, { label: k('Consumo eléctrico'), value: '0 kW' }, { label: k('Agua'), value: k('0.55 L/planta') }] },
  { id: 'irr_drip', category: 'irrigation', kind: 'equipment', name: k('Goteo Presurizado con Bomba 24 V'), brand: 'Netafim', tier: 2, priceFlora: 260, priceSol: 0.26, autoWater: true, waterEff: 0.45, pumpKw: 0.04, wearPerDay: 0.9,
    description: k('Goteo por emisores con bomba y temporizador: riego uniforme en toda la sala.'),
    specs: [{ label: k('Riego'), value: k('Automático') }, { label: k('Consumo'), value: '0.04 kW' }, { label: k('Agua'), value: k('0.45 L/planta') }] },
  { id: 'irr_hydro', category: 'irrigation', kind: 'equipment', name: k('Hidroponía NFT Recirculante'), brand: 'Yield Hydro', tier: 3, priceFlora: 640, priceSol: 0.64, autoWater: true, waterEff: 0.25, pumpKw: 0.08, wearPerDay: 0.8,
    description: k('Recircula la solución nutritiva: ahorra casi la mitad del agua.'),
    specs: [{ label: k('Riego'), value: k('Automático') }, { label: k('Consumo'), value: '0.08 kW' }, { label: k('Agua'), value: k('0.25 L/planta') }] },

  /* ── CO₂ ── */
  { id: 'co2_mycelium', category: 'co2', kind: 'equipment', name: k('Bolsas de CO₂ de Micelio (x2)'), brand: 'MycoBreath', tier: 1, priceFlora: 60, priceSol: 0.06, co2Ppm: 900, wearPerDay: 0.5,
    description: k('Emisión pasiva de CO₂ por micelio: +18 % de crecimiento sin electricidad.'),
    specs: [{ label: 'CO₂', value: '900 ppm' }, { label: k('Consumo'), value: '0 kW' }] },
  { id: 'co2_tank', category: 'co2', kind: 'equipment', name: k('Sistema de CO₂ Presurizado + Sensor NDIR'), brand: 'YieldGas', tier: 3, priceFlora: 280, priceSol: 0.28, co2Ppm: 1200, wearPerDay: 0.7,
    description: k('Botella, regulador y sensor infrarrojo: mantiene 1 200 ppm y acelera la fotosíntesis un 35 %.'),
    specs: [{ label: 'CO₂', value: '1 200 ppm' }, { label: k('Sensor'), value: 'NDIR' }] },

  /* ── Medidores ── */
  { id: 'meter_ph', category: 'meter', kind: 'equipment', name: k('Sonda de pH Digital'), brand: 'AquaLab', tier: 1, priceFlora: 45, priceSol: 0.05, wearPerDay: 0.3, description: k('Calibración 4.01 / 7.01, precisión ±0.01 pH.'), specs: [{ label: k('Precisión'), value: k('±0.01 pH') }] },
  { id: 'meter_ec', category: 'meter', kind: 'equipment', name: k('Electroconductímetro EC/PPM'), brand: 'AquaLab', tier: 1, priceFlora: 45, priceSol: 0.05, wearPerDay: 0.3, description: k('Mide la fuerza de la solución nutritiva.'), specs: [{ label: k('Rango'), value: k('0–5 mS/cm') }] },
  { id: 'meter_par', category: 'meter', kind: 'equipment', name: k('Sensor Cuántico PAR'), brand: 'Quanta', tier: 2, priceFlora: 140, priceSol: 0.14, wearPerDay: 0.2, description: k('Lectura precisa de PPFD sobre el dosel.'), specs: [{ label: k('Rango'), value: k('0–2 500 µmol') }] },

  /* ── Paneles solares (generan electricidad) ── */
  { id: 'solar_400', category: 'solar', kind: 'equipment', name: k('Panel Solar 400 W'), brand: 'SunSol', tier: 2, priceFlora: 500, priceSol: 0.5, solarKw: 0.4, wearPerDay: 0.1,
    description: k('Genera electricidad cada día (≈1.6 kWh) y baja tu factura.'),
    specs: [{ label: k('Pico'), value: '0.4 kW' }, { label: k('Generación'), value: k('≈1.6 kWh/día') }] },
  { id: 'solar_1200', category: 'solar', kind: 'equipment', name: k('Campo Solar 1 200 W'), brand: 'SunSol Pro', tier: 3, priceFlora: 1350, priceSol: 1.35, solarKw: 1.2, wearPerDay: 0.1,
    description: k('Tres módulos con inversor: ≈4.8 kWh al día de energía gratuita.'),
    specs: [{ label: k('Pico'), value: '1.2 kW' }, { label: k('Generación'), value: k('≈4.8 kWh/día') }] },

  /* ── Nutrientes ── */
  { id: 'nut_biobizz', category: 'nutrient', kind: 'consumable', name: k('TerraViva Terra-Grow 250 ml'), brand: 'TerraViva', tier: 1, priceFlora: 35, priceSol: 0.04, amount: 250, unit: 'ml', feedBonus: 1.0,
    description: k('Fertilizante orgánico base para vegetativo y floración.'), specs: [{ label: k('Contenido'), value: '250 ml' }, { label: k('Bonus'), value: 'x1.00' }] },
  { id: 'nut_canna', category: 'nutrient', kind: 'consumable', name: k('Kanopia Terra 500 ml'), brand: 'Kanopia', tier: 2, priceFlora: 80, priceSol: 0.08, amount: 500, unit: 'ml', feedBonus: 1.03,
    description: k('Línea mineral para tierra con quelatos estables.'), specs: [{ label: k('Contenido'), value: '500 ml' }, { label: k('Bonus'), value: 'x1.03' }] },
  { id: 'nut_advanced', category: 'nutrient', kind: 'consumable', name: k('NutriPro pH Master 500 ml'), brand: 'NutriPro Labs', tier: 3, priceFlora: 190, priceSol: 0.19, amount: 500, unit: 'ml', feedBonus: 1.06,
    description: k('Fórmula autoajustable de pH con estimulantes de resina.'), specs: [{ label: k('Contenido'), value: '500 ml' }, { label: k('Bonus'), value: 'x1.06' }] },
  { id: 'nut_athena', category: 'nutrient', kind: 'consumable', name: k('Atlas Pro Line 1 L'), brand: 'Atlas', tier: 4, priceFlora: 430, priceSol: 0.43, amount: 1000, unit: 'ml', feedBonus: 1.1,
    description: k('La línea profesional de los concursos: máxima densidad de cogollo.'), specs: [{ label: k('Contenido'), value: '1 000 ml' }, { label: k('Bonus'), value: 'x1.10' }] },

  /* ── Agua ── */
  { id: 'water_50', category: 'water', kind: 'consumable', name: k('Bidón de Agua Osmosis 50 L'), brand: 'AquaPura', tier: 1, priceFlora: 20, priceSol: 0.02, amount: 50, unit: 'L', description: k('Agua de ósmosis inversa lista para riego.'), specs: [{ label: k('Contenido'), value: '50 L' }] },
  { id: 'water_200', category: 'water', kind: 'consumable', name: k('Tanque de Agua 200 L'), brand: 'AquaPura', tier: 2, priceFlora: 70, priceSol: 0.07, amount: 200, unit: 'L', description: k('Reserva para una semana de riego de sala.'), specs: [{ label: k('Contenido'), value: '200 L' }] },
  { id: 'water_1000', category: 'water', kind: 'consumable', name: k('Cisterna IBC 1 000 L'), brand: 'AquaPura Industrial', tier: 3, priceFlora: 300, priceSol: 0.3, amount: 1000, unit: 'L', description: k('Cisterna industrial: el mejor precio por litro.'), specs: [{ label: k('Contenido'), value: '1 000 L' }] },

  /* ── Electricidad ── */
  { id: 'energy_20', category: 'energy', kind: 'consumable', name: k('Bono de Energía 20 kWh'), brand: 'Red Solana', tier: 1, priceFlora: 60, priceSol: 0.06, amount: 20, unit: 'kWh', description: k('Crédito eléctrico para lámparas, aire acondicionado y bombas.'), specs: [{ label: k('Crédito'), value: '20 kWh' }] },
  { id: 'energy_100', category: 'energy', kind: 'consumable', name: k('Bono de Energía 100 kWh'), brand: 'Red Solana', tier: 2, priceFlora: 270, priceSol: 0.27, amount: 100, unit: 'kWh', description: k('Paquete de una semana con descuento.'), specs: [{ label: k('Crédito'), value: '100 kWh' }] },
  { id: 'energy_500', category: 'energy', kind: 'consumable', name: k('Bono de Energía 500 kWh'), brand: 'Red Solana', tier: 3, priceFlora: 1200, priceSol: 1.2, amount: 500, unit: 'kWh', description: k('Contrato industrial mensual.'), specs: [{ label: k('Crédito'), value: '500 kWh' }] },

  /* ── Control de plagas ── */
  { id: 'pest_neem', category: 'pest', kind: 'consumable', name: k('Aceite de Neem 250 ml'), brand: 'Dr. Verde', tier: 1, priceFlora: 30, priceSol: 0.03, amount: 250, unit: 'ml', treats: ['mites'], guardHours: 48,
    description: k('Elimina ácaros y trips y protege a la planta 48 h. Se aplica en toda la sala.'), specs: [{ label: k('Contenido'), value: '250 ml' }, { label: k('Trata'), value: k('Ácaros') }, { label: k('Protección'), value: '48 h' }] },
  { id: 'pest_bacillus', category: 'pest', kind: 'consumable', name: k('Fungicida Bacillus 250 ml'), brand: 'BioShield', tier: 2, priceFlora: 55, priceSol: 0.06, amount: 250, unit: 'ml', treats: ['mold'], guardHours: 72,
    description: k('Fungicida biológico contra el moho y el oídio. Protege 72 h.'), specs: [{ label: k('Contenido'), value: '250 ml' }, { label: k('Trata'), value: k('Moho') }, { label: k('Protección'), value: '72 h' }] },
  { id: 'pest_tricho', category: 'pest', kind: 'consumable', name: k('Trichoderma Radicular 250 ml'), brand: 'RootGuard', tier: 2, priceFlora: 55, priceSol: 0.06, amount: 250, unit: 'ml', treats: ['rot'], guardHours: 72,
    description: k('Hongos beneficiosos que desplazan a los patógenos de la raíz. Protege 72 h.'), specs: [{ label: k('Contenido'), value: '250 ml' }, { label: k('Trata'), value: k('Pudrición de raíz') }, { label: k('Protección'), value: '72 h' }] },
  { id: 'pest_shield', category: 'pest', kind: 'consumable', name: k('Bio-Shield Total 500 ml'), brand: 'Yield Labs', tier: 3, priceFlora: 150, priceSol: 0.15, amount: 500, unit: 'ml', treats: ['mites', 'mold', 'rot'], guardHours: 96,
    description: k('Amplio espectro: cura ácaros, moho y pudrición. Protege 96 h.'), specs: [{ label: k('Contenido'), value: '500 ml' }, { label: k('Trata'), value: k('Las 3 plagas') }, { label: k('Protección'), value: '96 h' }] },

  /* ── Servicios de vivero (modo vivero: jardineros contratados) ── */
  { id: 'svc_apprentice_7', category: 'service', kind: 'consumable', name: k('Jardinero Aprendiz · 7 días'), brand: 'Vivero de Flor', tier: 2, priceFlora: 90, priceSol: 0.09, amount: 7, unit: 'días', gardener: 1,
    description: k('Cuida tus plantas mientras no estás, en la sala y en tus parcelas: riega cuando la tierra baja del 45 % y abona cuando la solución se agota. Usa el agua y el abono de tu almacén: si se acaban, deja de trabajar. No cosecha, no siembra, no trata plagas ni quita machos.'), specs: [{ label: k('Duración'), value: k('7 días') }, { label: k('Hace'), value: k('Riega y abona') }, { label: k('Usa'), value: k('Tu agua y tu abono') }, { label: k('No hace'), value: k('Cosechar, sembrar, plagas, machos') }] },
  { id: 'svc_master_7', category: 'service', kind: 'consumable', name: k('Jardinero Maestro · 7 días'), brand: 'Vivero de Flor', tier: 3, priceFlora: 260, priceSol: 0.26, amount: 7, unit: 'días', gardener: 2,
    description: k('Todo lo del aprendiz, y además trata las plagas con los tratamientos de tu almacén y cuida la higiene: la calificación de la sala casi no baja. Trabaja en la sala y en tus parcelas. No cosecha, no siembra, no quita machos ni recicla la basura.'), specs: [{ label: k('Duración'), value: k('7 días') }, { label: k('Hace'), value: k('Riega, abona y trata plagas') }, { label: k('Usa'), value: k('Tu agua, abono y tratamientos') }, { label: k('No hace'), value: k('Cosechar, sembrar, machos, basura') }] },
  { id: 'svc_master_30', category: 'service', kind: 'consumable', name: k('Jardinero Maestro · 30 días'), brand: 'Vivero de Flor', tier: 4, priceFlora: 900, priceSol: 0.9, amount: 30, unit: 'días', gardener: 2,
    description: k('El jardinero maestro por un mes, al mejor precio por día: riega, abona y trata plagas con lo de tu almacén, y la calificación de la sala casi no baja. No cosecha, no siembra, no quita machos ni recicla la basura.'), specs: [{ label: k('Duración'), value: k('30 días') }, { label: k('Hace'), value: k('Riega, abona y trata plagas') }, { label: k('Usa'), value: k('Tu agua, abono y tratamientos') }, { label: k('No hace'), value: k('Cosechar, sembrar, machos, basura') }] },

  /* ── Licencias de estaciones del laboratorio ── */
  { id: 'lic_rosin', category: 'license', kind: 'license', name: k('Licencia Prensa de Rosin'), brand: 'Yield Labs', tier: 1, priceFlora: 0, priceSol: 0, stationId: 'rosin', description: k('Incluida en el Kit de Inicio F2P.'), specs: [{ label: k('Estación'), value: k('Prensa de Rosin') }] },
  { id: 'lic_kief', category: 'license', kind: 'license', name: k('Licencia Tamizadora de Kief'), brand: 'Yield Labs', tier: 1, priceFlora: 0, priceSol: 0, stationId: 'kief', description: k('Incluida en el Kit de Inicio F2P.'), specs: [{ label: k('Estación'), value: k('Tamizadora de Kief') }] },
  { id: 'lic_roller', category: 'license', kind: 'license', name: k('Licencia Enrolladora de Puros'), brand: 'Yield Labs', tier: 2, priceFlora: 120, priceSol: 0.12, stationId: 'roller', description: k('Desbloquea pre-rolls y puros premium.'), specs: [{ label: k('Estación'), value: k('Enrolladora') }] },
  { id: 'lic_bubble', category: 'license', kind: 'license', name: k('Licencia Lavadora Bubble Hash'), brand: 'Yield Labs', tier: 2, priceFlora: 150, priceSol: 0.15, stationId: 'bubble', description: k('Desbloquea la extracción con agua y hielo.'), specs: [{ label: k('Estación'), value: k('Lavadora Bubble Hash') }] },
  { id: 'lic_terpsoup', category: 'license', kind: 'license', name: k('Licencia Sopa de Terpenos'), brand: 'Yield Labs', tier: 3, priceFlora: 300, priceSol: 0.3, stationId: 'terpsoup', description: k('Desbloquea el reactor de sauce y diamantes de THCa.'), specs: [{ label: k('Estación'), value: k('Reactor de Terpenos') }] },
  { id: 'lic_rotavap', category: 'license', kind: 'license', name: k('Licencia Rotavapor (RSO · Aceites · Gomitas)'), brand: 'Yield Labs', tier: 3, priceFlora: 400, priceSol: 0.4, stationId: 'rotavap', description: k('Desbloquea la destilación al vacío y las gomitas.'), specs: [{ label: k('Estación'), value: k('Rotavapor') }] },
  { id: 'lic_forge', category: 'license', kind: 'license', name: k('Forja de materiales'), brand: 'Yield Labs', tier: 2, priceFlora: 250, priceSol: 0.25, stationId: 'forge', description: k('Yunque, telar y horno: fabrica materiales y derivados con lo que la planta deja atrás.'), specs: [{ label: k('Estación'), value: k('Forja') }, { label: k('Consumo'), value: k('0,8 kWh por trabajo') }] },
  { id: 'lic_breeding', category: 'license', kind: 'license', name: k('Cámara de cría'), brand: 'Yield Labs', tier: 3, priceFlora: 450, priceSol: 0.45, stationId: 'breeding', description: k('Recinto de clima estable y aislado del polen ajeno: cruza genéticas con control real de generación y linaje.'), specs: [{ label: k('Estación'), value: k('Cámara de cría') }, { label: k('Consumo'), value: k('1,1 kWh por cruce') }, { label: k('Requiere'), value: k('Instalación de nivel 3+') }] },
  { id: 'lic_hplc', category: 'license', kind: 'license', name: k('Licencia Cromatógrafo HPLC'), brand: 'Yield Labs', tier: 4, priceFlora: 500, priceSol: 0.5, stationId: 'hplc', description: k('Desbloquea el análisis de cannabinoides y los COA.'), specs: [{ label: k('Estación'), value: k('Cromatógrafo HPLC') }] },
], ['name', 'description', 'label', 'value']);

export const CATALOG_BY_ID: Record<string, CatalogItem> = Object.fromEntries(CATALOG.map((c) => [c.id, c]));

export const CATEGORY_LABEL: Record<AssetCategory, string> = localize<Record<AssetCategory, string>>({
  lamp: k('Lámparas'), ac: k('Aires acondicionados'), irrigation: k('Riego'), co2: 'CO₂', meter: k('Medidores'), solar: k('Energía solar'),
  nutrient: k('Nutrientes'), water: k('Agua'), energy: k('Electricidad'), pest: k('Control de plagas'), service: k('Servicios de vivero'), license: k('Licencias de laboratorio'),
}, ['lamp', 'ac', 'irrigation', 'meter', 'solar', 'nutrient', 'water', 'energy', 'pest', 'service', 'license']);

export const RARITY_BY_TIER: Record<number, Rarity> = { 1: 'common', 2: 'rare', 3: 'epic', 4: 'legendary' };

/* ─────────────── owned assets ─────────────── */

export interface OwnedAsset {
  id: string;
  catalogId: string;
  mintedAt: number;
  /** consumables: units left (L / ml / kWh) */
  remaining?: number;
  /** equipment: 0–100, wears with use, repaired by burning $FLORA */
  durability?: number;
  equipped?: boolean;
  /** true when it came from the starter kit */
  starter?: boolean;
}

export const newAsset = (catalogId: string, opts: { starter?: boolean; equipped?: boolean } = {}): OwnedAsset => {
  const item = CATALOG_BY_ID[catalogId];
  return {
    id: `nft-${catalogId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    catalogId,
    mintedAt: Date.now(),
    remaining: item.kind === 'consumable' ? item.amount : undefined,
    durability: item.kind === 'equipment' ? 100 : undefined,
    equipped: opts.equipped,
    starter: opts.starter,
  };
};

/** What every new player receives (Libro Blanco 2.1: "El Kit de Inicio"). */
export const STARTER_KIT: Array<{ catalogId: string; equipped?: boolean; amount?: number }> = [
  { catalogId: 'lamp_led600', equipped: true },
  { catalogId: 'lic_rosin' },
  { catalogId: 'lic_kief' },
  { catalogId: 'water_200' },
  { catalogId: 'nut_canna' },
  { catalogId: 'energy_100', amount: 60 },   // 60 kWh: a full first cycle for the starter lamp
  { catalogId: 'pest_neem' },
  { catalogId: 'pest_bacillus' },
  { catalogId: 'pest_tricho' },
];

/** A small treatment kit (also granted once to saves from before plagues existed). */
export const starterPestKit = (): OwnedAsset[] => ['pest_neem', 'pest_bacillus', 'pest_tricho'].map((id) => newAsset(id, { starter: true }));

/** Fresh copy of the starter kit (a `amount` override sets the lot size, e.g. a partial energy bond). */
export const starterAssets = (): OwnedAsset[] =>
  STARTER_KIT.map((k) => ({ ...newAsset(k.catalogId, { starter: true, equipped: k.equipped }), ...(k.amount !== undefined ? { remaining: k.amount } : {}) }));

export type ResourceKind = 'water' | 'nutrient' | 'energy' | 'service';
const RESOURCE_CATEGORY: Record<ResourceKind, AssetCategory> = { water: 'water', nutrient: 'nutrient', energy: 'energy', service: 'service' };

export const stockOf = (assets: OwnedAsset[], kind: ResourceKind): number =>
  assets.reduce((sum, a) => (CATALOG_BY_ID[a.catalogId]?.category === RESOURCE_CATEGORY[kind] ? sum + (a.remaining ?? 0) : sum), 0);

/** Spend `amount` of a resource across lots (oldest first). Returns null when there is not enough. */
export const spendResource = (assets: OwnedAsset[], kind: ResourceKind, amount: number): OwnedAsset[] | null => {
  if (stockOf(assets, kind) + 1e-9 < amount) return null;
  let left = amount;
  const cat = RESOURCE_CATEGORY[kind];
  const out = assets
    .slice()
    .sort((a, b) => a.mintedAt - b.mintedAt)
    .map((a) => {
      if (left <= 0 || CATALOG_BY_ID[a.catalogId]?.category !== cat) return a;
      const take = Math.min(a.remaining ?? 0, left);
      left -= take;
      return { ...a, remaining: Number(((a.remaining ?? 0) - take).toFixed(4)) };
    });
  return out;
};

/** Best feeding bonus among the nutrient lots that still have product. */
export const bestFeedBonus = (assets: OwnedAsset[]): number =>
  assets.reduce((best, a) => {
    const it = CATALOG_BY_ID[a.catalogId];
    return it?.category === 'nutrient' && (a.remaining ?? 0) > 0 ? Math.max(best, it.feedBonus ?? 1) : best;
  }, 1);

/** Equipment that is installed AND not broken. */
const working = (assets: OwnedAsset[], category: AssetCategory) =>
  assets.filter((a) => a.equipped && CATALOG_BY_ID[a.catalogId]?.category === category && (a.durability ?? 100) > 0);

export interface EquipStats {
  lampWatts: number;
  lampMaxPpfd: number;
  acKw: number;
  pumpKw: number;
  autoWater: boolean;
  waterPerPlantAuto: number;
  solarKw: number;
  co2Ppm: number;
  hasAc: boolean;
}

/** Collapse the installed NFTs into the numbers the simulation needs. Worn gear (<20 %) draws 15 % more. */
export function equipStatsOf(assets: OwnedAsset[]): EquipStats {
  const lamp = working(assets, 'lamp')[0];
  const ac = working(assets, 'ac')[0];
  const irr = working(assets, 'irrigation')[0];
  const co2 = working(assets, 'co2').map((a) => CATALOG_BY_ID[a.catalogId].co2Ppm ?? 0).reduce((m, v) => Math.max(m, v), 0);
  const solarKw = working(assets, 'solar').reduce((s, a) => s + (CATALOG_BY_ID[a.catalogId].solarKw ?? 0), 0);
  const worn = (a?: OwnedAsset) => ((a?.durability ?? 100) < 20 ? 1.15 : 1);
  const lampItem = lamp ? CATALOG_BY_ID[lamp.catalogId] : undefined;
  const acItem = ac ? CATALOG_BY_ID[ac.catalogId] : undefined;
  const irrItem = irr ? CATALOG_BY_ID[irr.catalogId] : undefined;
  return {
    lampWatts: (lampItem?.watts ?? 0) * worn(lamp),
    lampMaxPpfd: (lampItem?.maxPpfd ?? 0) * ((lamp?.durability ?? 100) < 20 ? 0.9 : 1),
    acKw: (acItem?.acKw ?? 0) * worn(ac),
    pumpKw: irrItem?.pumpKw ?? 0,
    autoWater: !!irrItem?.autoWater,
    waterPerPlantAuto: irrItem?.waterEff ?? 0.5,
    solarKw,
    co2Ppm: co2,
    hasAc: !!acItem,
  };
}

export const ownsStation = (assets: OwnedAsset[], stationId: string): boolean =>
  assets.some((a) => CATALOG_BY_ID[a.catalogId]?.kind === 'license' && CATALOG_BY_ID[a.catalogId].stationId === stationId);

/** Price to repair a worn item (burns $FLORA): proportional to what is missing. */
export const repairCostOf = (asset: OwnedAsset): number => {
  const it = CATALOG_BY_ID[asset.catalogId];
  if (!it || asset.durability === undefined) return 0;
  return Math.max(5, Math.round(it.priceFlora * 0.35 * ((100 - asset.durability) / 100)));
};

/** Consumption constants shared by actions and the UI. */
/* ─────────────── plague treatments, gardener contracts and garbage ─────────────── */

const PEST_KINDS: PestKind[] = ['mites', 'mold', 'rot'];

/** ml of treatment available per plague (broad-spectrum lots count for every kind they cure). */
export const pestStock = (assets: OwnedAsset[]): Record<PestKind, number> => {
  const out: Record<PestKind, number> = { mites: 0, mold: 0, rot: 0 };
  for (const a of assets) {
    const it = CATALOG_BY_ID[a.catalogId];
    if (it?.category === 'pest') for (const k of it.treats ?? []) out[k] += a.remaining ?? 0;
  }
  return out;
};

/** Spend up to `ml` of treatment for one plague (single-purpose lots first). Returns what was really spent. */
export const spendPest = (assets: OwnedAsset[], kind: PestKind, ml: number): { assets: OwnedAsset[]; spent: number; guardHours: number } => {
  let left = ml;
  let guard = 0;
  const order = assets
    .filter((a) => CATALOG_BY_ID[a.catalogId]?.category === 'pest' && CATALOG_BY_ID[a.catalogId].treats?.includes(kind) && (a.remaining ?? 0) > 0)
    .sort((a, b) => (CATALOG_BY_ID[a.catalogId].treats!.length - CATALOG_BY_ID[b.catalogId].treats!.length) || a.mintedAt - b.mintedAt);
  const take = new Map<string, number>();
  for (const a of order) {
    if (left <= 0) break;
    const t = Math.min(a.remaining ?? 0, left);
    take.set(a.id, t);
    left -= t;
    guard = Math.max(guard, CATALOG_BY_ID[a.catalogId].guardHours ?? 0);
  }
  return {
    assets: assets.map((a) => (take.has(a.id) ? { ...a, remaining: Number(((a.remaining ?? 0) - take.get(a.id)!).toFixed(4)) } : a)),
    spent: ml - left,
    guardHours: guard,
  };
};

/** 0 = no contract, 1 = apprentice (water + feed), 2 = master (also plagues + keeps the room clean). */
export const gardenerLevelOf = (assets: OwnedAsset[]): 0 | 1 | 2 =>
  assets.reduce<0 | 1 | 2>((lvl, a) => {
    const it = CATALOG_BY_ID[a.catalogId];
    return it?.category === 'service' && (a.remaining ?? 0) > 0 ? (Math.max(lvl, it.gardener ?? 0) as 0 | 1 | 2) : lvl;
  }, 0);

/** Empty bottles and broken gear pile up as garbage (each one drags the gardener rating down until recycled). */
export const garbageOf = (assets: OwnedAsset[]): OwnedAsset[] =>
  assets.filter((a) => {
    const it = CATALOG_BY_ID[a.catalogId];
    if (!it) return false;
    if (it.kind === 'consumable') return (a.remaining ?? 0) <= 0.0001;
    if (it.kind === 'equipment') return (a.durability ?? 100) <= 0;
    return false;
  });

export const USE = {
  pestPerPlant: 8,            // ml of treatment per plant
  cleanCooldownHours: 4,      // real hours between "clean the room" actions
  cleanGain: 30,              // rating points a cleaning gives
  recycleGain: 3,             // rating points per recycled item
  ratingDecayPerDay: 5,       // rating lost per day of neglect
  garbageDecayPerDay: 1.5,    // extra per piece of garbage per day
  marketFee: 0.025,           // share of every dispensary sale that is burned (HashKings: 2.5 %)
  waterPerPlantManual: 0.5,   // L per watering
  nutrientPerPlant: 3,        // ml per feeding
  labKwhPerCycle: { rosin: 0.6, bubble: 0.5, terpsoup: 1.4, kief: 0.4, roller: 0.5, rotavap: 2.0, hplc: 0.8, forge: 0.8, breeding: 1.1 } as Record<string, number>,
};
