import { FacilityArt, WhitepaperHeroArt } from './art/GameArt';
import React, { useState } from 'react';
import { 
  FileText, 
  Layers, 
  Cpu, 
  Flame, 
  Compass, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Download,
  Copy,
  Check
} from 'lucide-react';
import { t } from '../i18n';

export const WhitepaperView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('resumen');
  const [copied, setCopied] = useState(false);

  const sections = [
    { id: 'resumen', title: t('1. Resumen Ejecutivo'), icon: Sparkles },
    { id: 'bucle', title: t('2. Bucle de Jugabilidad'), icon: Layers },
    { id: 'tokenomica', title: t('3. Tokenómica $FLORA'), icon: Flame },
    { id: 'solana', title: t('3.2 Arquitectura Solana'), icon: Cpu },
    { id: 'visual', title: t('4. Identidad Tecnológica'), icon: ShieldCheck },
    { id: 'roadmap', title: t('5. Hoja de Ruta (Roadmap)'), icon: Compass },
    { id: 'conclusion', title: t('6. Conclusión'), icon: CheckCircle2 }
  ];

  const roadmapPhases = [
    {
      phase: t('Fase 1: Génesis y Cimientos'),
      quarter: t('Trimestre 1 - Trimestre 2'),
      status: 'completado',
      milestones: [
        t('Finalización de conceptos y pruebas de estrés de la tokenómica deflacionaria'),
        t('Desarrollo de contratos inteligentes principales en Solana Devnet (Programas Anchor)'),
        t('Creación de prototipos visuales asistidos por IA (interfaz, cepas, entornos)')
      ]
    },
    {
      phase: t('Fase 2: Alfa Cerrada y Lanzamiento F2P'),
      quarter: t('Trimestre 3 - Trimestre 4'),
      status: 'en_progreso',
      milestones: [
        t('Lanzamiento del Cultivador Casero basado en Web (nivel F2P accesible)'),
        t('Integración con la Red Principal de Solana para servicios de tokens y quema programada'),
        t('Airdrops de cepas de semillas impulsados por la comunidad y pruebas iniciales de estrés')
      ]
    },
    {
      phase: t('Fase 3: Expansión y Laboratorios de Procesamiento'),
      quarter: t('Año 2 - Trimestre 1'),
      status: 'proximo',
      milestones: [
        t('Introducción de laboratorios de extracción y mecánicas de química avanzada (Live Rosin, Rotovap)'),
        t('Despliegue de sistemas de gremios (Cooperativas Agrícolas Descentralizadas)'),
        t('Lanzamiento del mercado descentralizado para genéticas de semillas con patentes on-chain')
      ]
    },
    {
      phase: t('Fase 4: Multiverso y Puentes de E-Commerce'),
      quarter: t('Año 2 - Trimestre 2+'),
      status: 'proximo',
      milestones: [
        t('Integración de escaparates virtuales con redes de comercio electrónico asociadas (Puente V2P)'),
        t('Puentes de liquidez multicadena y lanzamiento de la aplicación móvil ampliada'),
        t('Competiciones globales de marcas botánicas y colaboraciones de mercancía física con chip NFC')
      ]
    }
  ];

  const handleCopySummary = () => {
    navigator.clipboard.writeText(
      t('Yield Bud Empire: El Multiverso Botánico Descentralizado. Libro Blanco y Modelo Económico v1.0 construido en Solana.')
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Document Hero Card */}
      <div className="hud-panel relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 z-0">
          <WhitepaperHeroArt className="w-full h-full opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent"></div>
        </div>

        <div className="relative z-10 p-6 sm:p-10 space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-semibold">
              {t('DOCUMENTO OFICIAL v1.0')}
            </span>
            <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono text-xs">
              {t('SOLANA BLOCKCHAIN')}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-serif">
            {t('Yield Bud Empire: El Multiverso Botánico Descentralizado')}
          </h1>
          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
            {t('Libro Blanco y Modelo Económico de simulación botánica de alta precisión, microclimas interactivos, extracción comercial y tokenómica deflacionaria autosostenible en la red Solana.')}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t('Copiado') : t('Copiar Resumen')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Reader Layout: Sidebar Section Index + Content Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Index Sidebar (4 Cols) */}
        <div className="hud-panel lg:col-span-4 p-4 space-y-2 sticky top-24">
          <span className="text-xs font-mono uppercase text-neutral-400 px-3 py-1 block">
            {t('Índice del Libro Blanco')}
          </span>
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isSelected = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
                  isSelected
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-neutral-500'}`} />
                  <span>{t(sec.title)}</span>
                </div>
                <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            );
          })}
        </div>

        {/* Content Pane (8 Cols) */}
        <div className="hud-panel lg:col-span-8 p-6 sm:p-8 space-y-6 text-neutral-300 text-sm leading-relaxed">
          {/* Section 1: Resumen */}
          {activeSection === 'resumen' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h2 className="text-2xl font-bold text-white font-serif border-b border-neutral-800 pb-3">
                {t('1. Resumen Ejecutivo')}
              </h2>
              <p>
                <strong>{t('Yield Bud Empire')}</strong>{' '}{t('es un videojuego de simulación de próxima generación, accesible desde navegador y dispositivos móviles, construido sobre la')}{' '}<strong>{t('blockchain de Solana')}</strong>{t('. Fusiona la simulación agrícola inmersiva —específicamente enfocada en el cultivo de cannabis y cáñamo prémium— con un modelo económico')}{' '}<strong>{t('deflacionario, estricto y sostenible')}</strong>.
              </p>
              <p>
                {t('Comenzando como cultivadores independientes bajo un modelo totalmente gratuito (')}<em>{t('Free-to-Play')}</em>{' '}{t('o F2P), los jugadores evolucionan desde una configuración casera básica hasta convertirse en maestros cultivadores. Gestionan microclimas, cruces genéticos, procesamiento comercial y la creación de marcas virtuales globales.')}
              </p>
              <div className="p-4 rounded-xl bg-neutral-950 border border-emerald-500/30 text-xs space-y-2">
                <span className="font-bold text-emerald-400 uppercase font-mono block">
                  {t('Propuesta de Valor Única (V2P):')}
                </span>
                <p className="text-neutral-400">
                  {t('Al integrar marcos de utilidad del mundo real, lógica de trazabilidad y puentes directos hacia futuros mercados de comercio electrónico virtual-físico (V2P), Yield Bud Empire establece una economía digital autosuficiente respaldada por bienes tangibles.')}
                </p>
              </div>
            </div>
          )}

          {/* Section 2: Bucle de Jugabilidad */}
          {activeSection === 'bucle' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <h2 className="text-2xl font-bold text-white font-serif border-b border-neutral-800 pb-3">
                {t('2. Bucle de Jugabilidad y Progresión')}
              </h2>
              <p>
                {t('Yield Bud Empire utiliza una combinación equilibrada de estrategia tipo')}{' '}<em>{t('idle')}</em>{' '}{t('y microgestión activa, inspirada en los simuladores móviles y de gestión agrícola de mayor éxito.')}
              </p>

              {/* Interactive Gameplay Flow Diagram */}
              <div className="bg-neutral-950 p-4 sm:p-6 rounded-2xl border border-neutral-800 space-y-4">
                <span className="text-xs font-mono uppercase text-neutral-400 block text-center">
                  {t('Diagrama del Bucle Económico y de Cultivo')}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold block">{t('ETAPA 1')}</span>
                    <h4 className="text-xs font-bold text-white">{t('Kit de Inicio F2P')}</h4>
                    <p className="text-[10px] text-neutral-400">{t('Carpa casera, LED 150W y semillas fundacionales gratuitas.')}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold block">{t('ETAPA 2')}</span>
                    <h4 className="text-xs font-bold text-white">{t('Gestión de Clima')}</h4>
                    <p className="text-[10px] text-neutral-400">{t('Riego, N-P-K, cálculo de VPD, luz PPFD y fotoperiodos.')}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                    <span className="text-[10px] font-mono text-amber-400 font-bold block">{t('ETAPA 3')}</span>
                    <h4 className="text-xs font-bold text-white">{t('Extracción')}</h4>
                    <p className="text-[10px] text-neutral-400">{t('Prensado Live Rosin, curado criogénico y terpenos puros.')}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                    <span className="text-[10px] font-mono text-purple-400 font-bold block">{t('ETAPA 4')}</span>
                    <h4 className="text-xs font-bold text-white">{t('Imperio V2P')}</h4>
                    <p className="text-[10px] text-neutral-400">{t('Creación de marca, dispensario virtual y canjes físicos.')}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="text-base font-bold text-white">{t('2.1 La Entrada F2P (El Cultivador Casero)')}</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-neutral-400">
                  <li><strong>{t('El Kit de Inicio:')}</strong>{' '}{t('Cada nuevo jugador recibe un paquete inicial digital gratuito: carpa interior básica, iluminación LED estándar y semillas de genética fundacional.')}</li>
                  <li><strong>{t('Participación Activa:')}</strong>{' '}{t('Los jugadores monitorean humedad de sustrato, temperatura y ciclos de luz a través de un panel de control intuitivo.')}</li>
                </ul>

                <h3 className="text-base font-bold text-white pt-2">{t('2.2 Escalado Industrial y Procesamiento')}</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-neutral-400">
                  <li><strong>{t('Evolución de Laboratorio:')}</strong>{' '}{t('Se actualizan carpas a invernaderos comerciales y laboratorios grado farmacéutico.')}</li>
                  <li><strong>{t('Mecánicas de Extracción:')}</strong>{' '}{t('La flor cruda se refina en aceites, resinas (rosins sin solventes) y aislados aromáticos, incrementando su valor.')}</li>
                </ul>

                <h3 className="text-base font-bold text-white pt-2">{t('2.3 Creación de Marca y el Multiverso')}</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-neutral-400">
                  <li><strong>{t('Genéticas Personalizadas:')}</strong>{' '}{t('Cruce de parentales para generar fenotipos únicos con perfiles aromáticos registrados on-chain.')}</li>
                  <li><strong>{t('Escaparates Virtuales:')}</strong>{' '}{t('Lanzamiento de marcas distintivas y dispensarios que comercian bienes en el multiverso.')}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Section 3: Tokenómica */}
          {activeSection === 'tokenomica' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h2 className="text-2xl font-bold text-white font-serif border-b border-neutral-800 pb-3">
                {t('3. Tokenómica Deflacionaria ($FLORA)')}
              </h2>
              <p>
                {t('Para combatir los fallos hiperinflacionarios observados históricamente en los proyectos GameFi convencionales, Yield Bud Empire implementa un motor económico de circuito cerrado impulsado por')}{' '}<strong>{t('sumideros (sinks) de tokens obligatorios y agresivos')}</strong>.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs font-mono">
                    <Flame className="w-4 h-4" />{' '}{t('Mecanismo 1')}
                  </div>
                  <h4 className="text-sm font-bold text-white">{t('Aceleración y Mejoras')}</h4>
                  <p className="text-xs text-neutral-400">
                    {t('Los jugadores queman tokens $FLORA para omitir tiempos de espera biológicos o adquirir infraestructura industrial avanzada.')}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs font-mono">
                    <Flame className="w-4 h-4" />{' '}{t('Mecanismo 2')}
                  </div>
                  <h4 className="text-sm font-bold text-white">{t('Desgaste y Deterioro')}</h4>
                  <p className="text-xs text-neutral-400">
                    {t('La maquinaria de prensado, iluminación y extracción sufre coeficientes de depreciación física. Repararla quema $FLORA permanentemente.')}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs font-mono">
                    <Flame className="w-4 h-4" />{' '}{t('Mecanismo 3')}
                  </div>
                  <h4 className="text-sm font-bold text-white">{t('Patentes Genómicas')}</h4>
                  <p className="text-xs text-neutral-400">
                    {t('Registrar cepas de semillas exclusivas y marcas comerciales on-chain requiere una tarifa de quema de tokens no reembolsable.')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 3.2: Arquitectura Solana */}
          {activeSection === 'solana' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h2 className="text-2xl font-bold text-white font-serif border-b border-neutral-800 pb-3">
                {t('3.2 Ventajas de la Arquitectura de Solana')}
              </h2>
              <p>
                {t('Yield Bud Empire aprovecha la arquitectura ultra-escalable de Solana para hacer viables mecánicas complejas que en otras redes resultarían prohibitivas en costo o latencia.')}
              </p>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <h4 className="text-sm font-bold text-emerald-400">{t('Liquidación Instantánea (Sub-segundo)')}</h4>
                  <p className="text-xs text-neutral-400">
                    {t('El alto rendimiento de Solana (bloques de 400ms) garantiza que las microtransacciones (ciclos de riego, comercio en dispensario, desgaste de piezas) se ejecuten al instante con comisiones inferiores a $0.00025.')}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <h4 className="text-sm font-bold text-purple-400">{t('Inventario Criptográfico On-Chain')}</h4>
                  <p className="text-xs text-neutral-400">
                    {t('Títulos de instalaciones, semillas raras y patentes genómicas se aseguran criptográficamente en Solana mediante programas personalizados desarrollados en el marco')}{' '}<strong>{t('Anchor')}</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Identidad Tecnológica */}
          {activeSection === 'visual' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h2 className="text-2xl font-bold text-white font-serif border-b border-neutral-800 pb-3">
                {t('4. Identidad Visual y Tecnológica')}
              </h2>
              <p>
                {t('Yield Bud Empire aprovecha tuberías avanzadas de generación por IA para la producción de activos dinámicos, garantizando una alta fidelidad visual en los clientes web sin inflar los tamaños de descarga.')}
              </p>

              <div className="rounded-2xl overflow-hidden border border-neutral-800">
                <FacilityArt kind="greenhouse_commercial" slice className="w-full h-64" label={t('Invernadero automatizado de Yield Bud Empire')} />
                <div className="p-3 bg-neutral-950 text-[11px] text-neutral-400 text-center font-mono">
                  {t('Render conceptual: Sala de cultivo automatizada e industrial dentro del multiverso de Yield Bud Empire.')}
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Roadmap */}
          {activeSection === 'roadmap' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <h2 className="text-2xl font-bold text-white font-serif border-b border-neutral-800 pb-3">
                {t('5. Hoja de Ruta Estratégica (Roadmap)')}
              </h2>

              <div className="space-y-4">
                {roadmapPhases.map((phase, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-white">{phase.phase}</h4>
                        <span className="text-[11px] text-neutral-400 font-mono">{phase.quarter}</span>
                      </div>
                      <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full uppercase font-semibold ${
                        phase.status === 'completado' 
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' 
                          : (phase.status === 'en_progreso' 
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse' 
                            : 'bg-neutral-800 text-neutral-400')
                      }`}>
                        {phase.status === 'completado' ? t('Completado') : (phase.status === 'en_progreso' ? t('En Progreso') : t('Próximamente'))}
                      </span>
                    </div>

                    <ul className="space-y-1.5 text-xs text-neutral-400 pl-2">
                      {phase.milestones.map((m, mIdx) => (
                        <li key={mIdx} className="flex items-start gap-2">
                          <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                            phase.status === 'completado' ? 'text-emerald-400' : 'text-neutral-600'
                          }`} />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 6: Conclusión */}
          {activeSection === 'conclusion' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h2 className="text-2xl font-bold text-white font-serif border-b border-neutral-800 pb-3">
                {t('6. Conclusión')}
              </h2>
              <p>
                <strong>{t('Yield Bud Empire')}</strong>{' '}{t('redefine los juegos en blockchain al anclar una jugabilidad divertida y accesible a un modelo deflacionario matemáticamente sólido. Al estructurar la simulación en torno a una forma de arte agrícola universalmente reconocida —el cultivo de cannabis y cáñamo— y respaldarla de forma segura en Solana, el proyecto fusiona los juegos casuales, los activos digitales y la utilidad del mundo real de manera fluida.')}
              </p>
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-300 font-mono">
                {t('✓ Listo para el multiverso botánico. Comienza ahora tu viaje F2P como cultivador novato.')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
