import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  BarChart3, 
  Flame, 
  TrendingDown, 
  Cpu, 
  ShieldCheck, 
  Layers, 
  ArrowUpRight, 
  Sliders, 
  Activity, 
  Coins,
  Lock,
  ExternalLink
} from 'lucide-react';
import { t } from '../i18n';

export const TokenomicsView: React.FC = () => {
  const {
    totalFloraBurned,
    burnStats,
    transactions,
    floraBalance
  } = useGame();

  // Interactive Deflationary Model Simulator
  const [simulatedDau, setSimulatedDau] = useState<number>(25000);
  const [simulatedWearBurnRate, setSimulatedWearBurnRate] = useState<number>(18); // $FLORA burned per user per day

  const INITIAL_MAX_SUPPLY = 100000000; // 100M $FLORA
  const currentCirculating = INITIAL_MAX_SUPPLY - totalFloraBurned;
  const burnPercentage = ((totalFloraBurned / INITIAL_MAX_SUPPLY) * 100).toFixed(4);

  // Calculate simulated 12-month burn projection
  const dailyNetworkBurn = simulatedDau * simulatedWearBurnRate;
  const monthlyNetworkBurn = dailyNetworkBurn * 30;
  const annualNetworkBurn = dailyNetworkBurn * 365;
  const projectedSupply1Year = Math.max(0, currentCirculating - annualNetworkBurn);

  // Generate 12 data points for the dynamic SVG chart
  const chartPoints = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const projectedSupply = Math.max(10000000, currentCirculating - (monthlyNetworkBurn * month));
    return {
      month: `M${month}`,
      supply: projectedSupply,
      burnedCum: monthlyNetworkBurn * month
    };
  });

  const maxSupplyInChart = INITIAL_MAX_SUPPLY;
  const minSupplyInChart = Math.min(...chartPoints.map(p => p.supply));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="hud-panel p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono">
              {t('Modelo Económico Deflacionario $FLORA v1.0')}
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              {t('Moneda del juego · no sale del juego')}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2 font-serif">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            {t('Tokenómica Sostenible & Mecanismos de Quema')}
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            {t('A diferencia de los juegos GameFi inflacionarios tradicionales, Yield Bud Empire integra sumideros obligatorios de circuito cerrado para garantizar la apreciación y escasez del token.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-neutral-950 border border-amber-500/30 px-4 py-2 rounded-xl text-center">
            <span className="text-[10px] text-amber-400 uppercase font-mono block flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-amber-500" />{' '}{t('Total Quemado')}
            </span>
            <span className="text-lg font-bold text-amber-400 font-mono">
              {totalFloraBurned.toLocaleString()} $FLORA
            </span>
          </div>
        </div>
      </div>

      {/* 4 Core Pillars of Deflation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sink 1: Speedup */}
        <div className="hud-panel p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-emerald-400 font-semibold">{t('Sumidero 1')}</span>
            <Flame className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-white">{t('Aceleración de Cultivo')}</h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {t('Omitir tiempos de espera biológicos e inducir fotoperiodos cuánticos quema permanentemente 25 $FLORA por ciclo.')}
          </p>
          <div className="pt-2 border-t border-neutral-800 flex justify-between items-baseline">
            <span className="text-[11px] text-neutral-500 font-mono">{t('Total Quemado:')}</span>
            <span className="text-xs font-mono text-emerald-300 font-bold">{burnStats.speedUp.toLocaleString()} $FLORA</span>
          </div>
        </div>

        {/* Sink 2: Repairs */}
        <div className="hud-panel p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-amber-400 font-semibold">{t('Sumidero 2')}</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-sm font-bold text-white">{t('Desgaste de Maquinaria')}</h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {t('Las prensas térmicas y rotavapores pierden eficiencia con el uso. Reparar equipos destruye tokens de circulación activa.')}
          </p>
          <div className="pt-2 border-t border-neutral-800 flex justify-between items-baseline">
            <span className="text-[11px] text-neutral-500 font-mono">{t('Total Quemado:')}</span>
            <span className="text-xs font-mono text-amber-300 font-bold">{burnStats.repairs.toLocaleString()} $FLORA</span>
          </div>
        </div>

        {/* Sink 3: Patents */}
        <div className="hud-panel p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-purple-400 font-semibold">{t('Sumidero 3')}</span>
            <Flame className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="text-sm font-bold text-white">{t('Patentes Genómicas')}</h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {t('Registrar cepas exclusivas como patente del juego requiere una tarifa de quema de 250 $FLORA no reembolsable.')}
          </p>
          <div className="pt-2 border-t border-neutral-800 flex justify-between items-baseline">
            <span className="text-[11px] text-neutral-500 font-mono">{t('Total Quemado:')}</span>
            <span className="text-xs font-mono text-purple-300 font-bold">{burnStats.patents.toLocaleString()} $FLORA</span>
          </div>
        </div>

        {/* Sink 4: V2P Redemption */}
        <div className="hud-panel p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-400 font-semibold">{t('Sumidero 4')}</span>
            <Flame className="w-4 h-4 text-cyan-400" />
          </div>
          <h3 className="text-sm font-bold text-white">{t('Canje de Bienes Físicos (V2P)')}</h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {t('Cada canje por terpenos botánicos o ropa de cáñamo destruye tokens en proporción directa con el costo del bien físico.')}
          </p>
          <div className="pt-2 border-t border-neutral-800 flex justify-between items-baseline">
            <span className="text-[11px] text-neutral-500 font-mono">{t('Total Quemado:')}</span>
            <span className="text-xs font-mono text-cyan-300 font-bold">{burnStats.v2p.toLocaleString()} $FLORA</span>
          </div>
        </div>
      </div>

      {/* Interactive Deflationary Simulation Engine */}
      <div className="hud-panel p-5 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white font-mono uppercase">
                {t('Simulador Dinámico de Deflación Multiverso')}
              </h3>
              <p className="text-xs text-neutral-400">
                {t('Ajusta las variables de adopción para modelar la contracción del suministro circulante a 12 meses.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-neutral-500 block text-[10px]">{t('QUEMA DIARIA ESTIMADA')}</span>
              <span className="text-amber-400 font-bold">{t('{v0} $FLORA / día', { v0: dailyNetworkBurn.toLocaleString() })}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px]">{t('QUEMA ANUAL PROYECTADA')}</span>
              <span className="text-emerald-400 font-bold">{t('{v0} $FLORA / año', { v0: annualNetworkBurn.toLocaleString() })}</span>
            </div>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-300 font-medium">{t('Jugadores Activos Diarios (DAU):')}</span>
              <span className="font-mono text-emerald-400 font-bold">{t('{v0} jugadores', { v0: simulatedDau.toLocaleString() })}</span>
            </div>
            <input
              type="range"
              min={1000}
              max={150000}
              step={1000}
              value={simulatedDau}
              onChange={(e) => setSimulatedDau(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-2 bg-neutral-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
              <span>{t('1,000 (Fase Alfa)')}</span>
              <span>{t('50,000 (Lanzamiento)')}</span>
              <span>{t('150,000+ (Expansión Global)')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-300 font-medium">{t('Tasa de Quema Diaria por Jugador (Reparaciones + Aceleración):')}</span>
              <span className="font-mono text-amber-400 font-bold">{t('{simulatedWearBurnRate} $FLORA / usuario', { simulatedWearBurnRate })}</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={simulatedWearBurnRate}
              onChange={(e) => setSimulatedWearBurnRate(parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-neutral-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
              <span>{t('5 $FLORA (Casual)')}</span>
              <span>{t('20 $FLORA (Estándar)')}</span>
              <span>{t('50 $FLORA (Cultivador Industrial)')}</span>
            </div>
          </div>
        </div>

        {/* Dynamic SVG Deflation Curve Chart */}
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-300 font-semibold font-mono flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              {t('Curva de Contracción del Suministro Circulante (Mes 1 a Mes 12)')}
            </span>
            <span className="text-[11px] font-mono text-neutral-500">
              {t('Suministro Inicial: 100,000,000 $FLORA')}
            </span>
          </div>

          {/* SVG Chart visualization */}
          <div className="h-48 w-full pt-2">
            <svg viewBox="0 0 700 160" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="0" y1="20" x2="700" y2="20" stroke="#262626" strokeDasharray="4 4" />
              <line x1="0" y1="70" x2="700" y2="70" stroke="#262626" strokeDasharray="4 4" />
              <line x1="0" y1="120" x2="700" y2="120" stroke="#262626" strokeDasharray="4 4" />

              {/* Data points mapping */}
              {(() => {
                const range = maxSupplyInChart - minSupplyInChart || 1;
                const points = chartPoints.map((p, index) => {
                  const x = (index / (chartPoints.length - 1)) * 680 + 10;
                  const normalized = (p.supply - minSupplyInChart) / range;
                  const y = 130 - normalized * 100;
                  return { x, y, p };
                });

                const pathString = points.reduce((acc, pt, idx) => {
                  return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
                }, '');

                const areaString = `${pathString} L ${points[points.length - 1].x} 150 L ${points[0].x} 150 Z`;

                return (
                  <>
                    <path d={areaString} fill="url(#burnGrad)" />
                    <path d={pathString} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
                    {points.map((pt, idx) => (
                      <g key={idx}>
                        <circle cx={pt.x} cy={pt.y} r="4" fill="#10b981" stroke="#052e16" strokeWidth="2" />
                        <text x={pt.x} y="155" textAnchor="middle" fill="#737373" fontSize="10" fontFamily="monospace">
                          {pt.p.month}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>

          <div className="flex flex-wrap justify-between text-xs font-mono text-neutral-400 pt-2 border-t border-neutral-900">
            <span>{t('Suministro Proyectado en Mes 12:')}{' '}<strong className="text-emerald-400 font-bold">{projectedSupply1Year.toLocaleString()} $FLORA</strong></span>
            <span>{t('Contracción de Suministro:')}{' '}<strong className="text-amber-400 font-bold">-{(100 - (projectedSupply1Year / INITIAL_MAX_SUPPLY) * 100).toFixed(2)}%</strong></span>
          </div>
        </div>
      </div>

      {/* Solana Simulated On-Chain Transaction Stream */}
      <div className="hud-panel p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              {t('Registro de transacciones y quemas del juego')}
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('Libro mayor del servidor')}
          </span>
        </div>

        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs font-mono"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.2 rounded font-bold ${
                    tx.type.includes('BURN')
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {t(tx.type)}
                  </span>
                  <span className="text-neutral-400 truncate max-w-xs">{tx.memo}</span>
                </div>
                <div className="text-[10px] text-neutral-500 flex items-center gap-3">
                  <span>{t('Slot: #{blockSlot}', { blockSlot: tx.blockSlot })}</span>
                  <span className="truncate max-w-[200px]">{t('Sig: {signature}', { signature: tx.signature })}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className={`text-xs font-bold ${
                  tx.type.includes('BURN') ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {tx.type.includes('BURN') ? `-${tx.amountFlora}` : `+${tx.amountFlora}`} $FLORA
                </span>
                <span className="text-[10px] text-neutral-500 block">{t('Tarifa: ~0.000005 SOL')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
