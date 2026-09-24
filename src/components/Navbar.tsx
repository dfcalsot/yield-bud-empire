import { EmpireBadge } from './empire/EmpireBadge';
import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  Flame,
  Volume2,
  VolumeX,
  Sparkles,
  Wallet,
  Cpu,
  Award,
  User,
  Settings2,
} from 'lucide-react';
import { CannabisLeaf, LeafCoin } from './icons/CannabisIcons';
import { Avatar } from './profile/AvatarArt';
import { SOLANA_NETWORKS } from '../utils/solana';
import { YieldMark } from './brand/YieldLogo';
import { YieldBudWordmark } from './brand/YieldBudWordmark';
import { LangSwitch } from '../i18n/LangSwitch';
import { ECON, claimStatus } from '../sim/economy';
import { t, t as tr } from '../i18n';

interface NavbarProps {
  setCurrentTab: (tab: string) => void;
  onOpenWalletModal: () => void;
  onOpenAuthModal: () => void;
  onOpenProfileModal: () => void;
}

/** Top HUD: identity, balances and wallet. Section navigation lives in the bottom Dock. */
export const Navbar: React.FC<NavbarProps> = ({
  setCurrentTab,
  onOpenWalletModal,
  onOpenAuthModal,
  onOpenProfileModal
}) => {
  const { 
    floraBalance, 
    solBalance, 
    totalFloraBurned, 
    soundEnabled, 
    toggleSound, 
    claimDaily,
    faucetAt,
    walletAddress,
    isWalletConnected,
    solanaNetwork,
    playerLevel,
    empire,
    rankTitle,
    currentUser,
    isAuthenticated
  } = useGame();

  const netConfig = SOLANA_NETWORKS[solanaNetwork];
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setTick(Date.now()), 30000); return () => clearInterval(t); }, []);
  const claim = claimStatus(faucetAt, tick);

  // idioma y sonido: en pantallas chicas van juntos en un menú de ajustes para no amontonar la barra
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!settingsOpen) return;
    const close = (e: PointerEvent) => { if (!settingsRef.current?.contains(e.target as Node)) setSettingsOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [settingsOpen]);
  const soundBtn = (
    <button
      onClick={toggleSound}
      aria-label={soundEnabled ? t('Silenciar audio') : t('Activar audio')}
      title={soundEnabled ? t('Silenciar audio') : t('Activar audio')}
      className="grid place-items-center w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
    >
      {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
    </button>
  );

  return (
    <header className="sticky top-0 z-50 bg-neutral-950/85 backdrop-blur-xl border-b border-emerald-400/15">
      {/* Franja de red: siempre una sola fila; los datos secundarios aparecen solo si hay espacio */}
      <div className="bg-neutral-900/90 px-3 sm:px-6 h-8 border-b border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400 gap-3 whitespace-nowrap overflow-hidden">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenWalletModal}
            className="flex items-center gap-1.5 font-medium hover:text-white transition cursor-pointer text-left min-w-0"
            title={t('Wallet del juego: tus $FLORA, NFT y billeteras vinculadas')}
          >
            <span className={`w-2 h-2 shrink-0 rounded-full ${netConfig.badgeColor} animate-pulse`}></span>
            <span className="text-white font-semibold truncate">{tr(netConfig.name)}</span>
            <span className="hidden sm:inline text-[10px] px-1.5 rounded bg-neutral-800 text-neutral-300 font-mono">{netConfig.badgeLabel}</span>
          </button>
          <span className="hidden lg:flex items-center gap-1 text-neutral-500">
            <Cpu className="w-3.5 h-3.5" />
            {t('Tiempo de bloque:')}{' '}<strong className="text-neutral-300 font-mono">392ms</strong>
          </span>
          <span className="hidden xl:inline text-neutral-500">
            {t('Tarifa de red promedio:')}{' '}<strong className="text-emerald-400 font-mono">0.000005 SOL</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-amber-300" title={t('Total Quemado:')}>
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline text-neutral-400">{t('Total Quemado:')}</span>
            <strong className="font-mono text-amber-400 font-bold">{totalFloraBurned.toLocaleString()}<span className="hidden sm:inline"> $FLORA</span></strong>
          </div>
          <button
            onClick={claimDaily}
            title={claim.ok ? t('Reclamo diario de $FLORA (+{dailyClaim}): una vez cada 24 h', { dailyClaim: ECON.dailyClaim }) : t('Ya reclamaste hoy')}
            className={`flex items-center gap-1 text-[11px] border px-2 h-6 rounded-md transition cursor-pointer font-medium ${claim.ok ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-neutral-800/60 text-neutral-400 border-neutral-700'}`}
          >
            <Sparkles className="w-3 h-3" />
            <span className="sm:hidden">{claim.ok ? `+${ECON.dailyClaim}` : t('{v0} h', { v0: Math.ceil(claim.leftMs / 3600_000) })}</span>
            <span className="hidden sm:inline">{claim.ok ? t('Reclamo diario +{dailyClaim}', { dailyClaim: ECON.dailyClaim }) : t('Reclamo en {v0} h {v1} min', { v0: Math.floor(claim.leftMs / 3600_000), v1: Math.ceil((claim.leftMs % 3600_000) / 60_000) })}</span>
          </button>
        </div>
      </div>

      {/* Barra principal */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Logo: el nombre completo solo cuando hay ancho de sobra */}
        <div onClick={() => setCurrentTab('cultivo')} className="flex items-center cursor-pointer select-none shrink-0" title={tr('Yield Bud Empire')}>
          <YieldMark size={42} animated className="lg:hidden shrink-0" />
          <YieldBudWordmark className="hidden lg:flex shrink-0" />
        </div>

        <div className="flex items-center gap-2 min-w-0">
          {/* Saldos y nivel: una sola cápsula, cada dato en una línea */}
          <div className="flex items-center h-10 rounded-xl border border-emerald-500/25 bg-neutral-900/70 divide-x divide-neutral-800 text-sm font-mono whitespace-nowrap min-w-0">
            <div className="flex items-center gap-1.5 px-2.5 text-emerald-300" title={t('Saldo de $FLORA')}>
              <LeafCoin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">{floraBalance.toLocaleString()}</span>
              <span className="hidden sm:inline text-[10px] text-emerald-500/80 font-semibold">$FLORA</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 text-neutral-200" title={t('Saldo de SOL')}>
              <span className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 grid place-items-center text-[9px] font-bold text-white shrink-0">S</span>
              <span className="font-semibold">{solBalance.toFixed(2)}</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 px-2.5 text-amber-300" title={t('Rango: {rankTitle}', { rankTitle })}>
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-bold">{t('Nv.')} {playerLevel}</span>
            </div>
            {empire && <div className="hidden md:flex items-center h-full"><EmpireBadge rank={empire.rank} compact onClick={() => setCurrentTab('perfil')} /></div>}
          </div>

          {/* Idioma y sonido: a la vista en pantallas anchas, en un menú en las chicas */}
          <div className="hidden lg:flex items-center gap-2">
            <LangSwitch signedIn className="shrink-0" />
            {soundBtn}
          </div>
          <div ref={settingsRef} className="relative lg:hidden">
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              aria-expanded={settingsOpen}
              aria-label={t('Ajustes: idioma y sonido')}
              title={t('Ajustes: idioma y sonido')}
              className={`grid place-items-center w-9 h-9 rounded-lg border transition cursor-pointer ${settingsOpen ? 'bg-neutral-800 border-emerald-500/40 text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'}`}
            >
              <Settings2 className="w-4 h-4" />
            </button>
            {settingsOpen && (
              <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-white/10 bg-neutral-950/95 backdrop-blur-xl p-3 space-y-3 shadow-2xl">
                <div className="flex items-center justify-between gap-2 text-xs text-neutral-300"><span>{t('Idioma')}</span><LangSwitch signedIn /></div>
                <div className="flex items-center justify-between gap-2 text-xs text-neutral-300"><span>{t('Sonido')}</span>{soundBtn}</div>
              </div>
            )}
          </div>

          {/* Perfil: el nombre solo en pantallas anchas */}
          {isAuthenticated && currentUser ? (
            <button
              onClick={() => setCurrentTab('perfil')}
              title={t('Perfil: {displayName} (@{username}) - {role}', { displayName: currentUser.displayName, username: currentUser.username, role: t(currentUser.role) })}
              className="flex items-center gap-2 h-10 bg-neutral-900 hover:bg-neutral-800 border border-emerald-500/30 px-1.5 xl:pr-3 rounded-xl text-neutral-200 transition cursor-pointer shrink-0"
            >
              <Avatar profile={currentUser} size={28} />
              <div className="hidden xl:block text-left">
                <span className="text-xs font-bold text-white block leading-tight truncate max-w-[110px]">{currentUser.displayName}</span>
                <span className="text-[10px] text-emerald-400 font-mono block leading-none">{t(currentUser.role).split(' ')[0]}</span>
              </div>
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 h-10 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs px-3 rounded-xl text-emerald-300 font-medium transition cursor-pointer shrink-0"
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('Ingresar')}</span>
            </button>
          )}

          {/* Wallet: la dirección solo en pantallas anchas */}
          <button
            onClick={onOpenWalletModal}
            className="flex items-center gap-1.5 h-10 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs px-2.5 rounded-xl text-neutral-300 hover:text-white transition cursor-pointer font-mono shrink-0"
            title={t('Wallet del juego: vincula Solana o Ronin')}
            aria-label={t('Wallet del juego: vincula Solana o Ronin')}
          >
            <Wallet className="w-4 h-4 text-purple-400" />
            <span className="hidden xl:inline">{isWalletConnected ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}` : t('Wallet')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
