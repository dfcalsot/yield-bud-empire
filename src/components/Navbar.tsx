import React from 'react';
import { useGame } from '../context/GameContext';
import { 
  Flame, 
  Coins, 
  Sprout, 
  FlaskConical, 
  Dna, 
  Store, 
  BarChart3, 
  FileText, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Wallet, 
  Cpu,
  Award,
  ShoppingBag,
  Layers,
  User,
  Globe
} from 'lucide-react';
import { SOLANA_NETWORKS } from '../utils/solana';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenWalletModal: () => void;
  onOpenAuthModal: () => void;
  onOpenProfileModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentTab, 
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
    requestAirdrop,
    walletAddress,
    isWalletConnected,
    solanaNetwork,
    playerLevel,
    rankTitle,
    currentUser,
    isAuthenticated
  } = useGame();

  const netConfig = SOLANA_NETWORKS[solanaNetwork];

  const navItems = [
    { id: 'cultivo', label: 'Cultivo', icon: Sprout },
    { id: 'semillas', label: 'Semillas', icon: Layers },
    { id: 'market', label: 'Market', icon: ShoppingBag },
    { id: 'nutrientes', label: 'Nutrición', icon: FlaskConical },
    { id: 'extraccion', label: 'Extracción', icon: Sparkles },
    { id: 'genetica', label: 'Genética', icon: Dna },
    { id: 'dispensario', label: 'Dispensario', icon: Store },
    { id: 'tokenomica', label: 'Tokenómica', icon: BarChart3 },
    { id: 'whitepaper', label: 'Libro Blanco', icon: FileText }
  ];

  return (
    <header className="sticky top-0 z-50 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800">
      {/* Top micro-bar with Solana Network Stats & Burn Banner */}
      <div className="bg-neutral-900/90 px-3 sm:px-6 py-1 border-b border-neutral-800/80 flex flex-wrap items-center justify-between text-xs text-neutral-400 gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenWalletModal}
            className="flex items-center gap-1.5 font-medium hover:text-white transition cursor-pointer text-left"
            title="Haz clic para cambiar entre Solana Mainnet Oficial, Devnet y Testnet"
          >
            <span className={`w-2 h-2 rounded-full ${netConfig.badgeColor} animate-pulse`}></span>
            <span className="text-white font-semibold">{netConfig.name}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 font-mono">
              {netConfig.badgeLabel}
            </span>
          </button>
          <span className="hidden md:inline text-neutral-600">|</span>
          <span className="hidden md:flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-neutral-500" />
            Tiempo de bloque: <strong className="text-neutral-300 font-mono">392ms</strong>
          </span>
          <span className="hidden lg:inline text-neutral-600">|</span>
          <span className="hidden lg:inline text-neutral-400">
            Tarifa de red promedio: <strong className="text-emerald-400 font-mono">0.000005 SOL</strong>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-neutral-950/80 px-2.5 py-0.5 rounded-full border border-amber-500/20 text-amber-300">
            <Flame className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
            <span>Total Quemado:</span>
            <strong className="font-mono text-amber-400 font-bold">{totalFloraBurned.toLocaleString()} $FLORA</strong>
          </div>

          <button
            onClick={requestAirdrop}
            title="Reclamar fondos de prueba del faucet para acelerar cultivos y reparar máquinas"
            className="flex items-center gap-1 text-[11px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded transition cursor-pointer font-medium"
          >
            <Sparkles className="w-3 h-3" />
            <span>+500 Faucet</span>
          </button>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Logo & Identity */}
        <div
          onClick={() => setCurrentTab('cultivo')}
          className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-800 to-neutral-950 p-0.5 shadow-lg shadow-emerald-950/50 flex items-center justify-center border border-emerald-500/30 group-hover:border-emerald-400 transition">
            <div className="w-full h-full bg-neutral-950/80 rounded-[10px] flex items-center justify-center">
              <Sprout className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-white font-serif">
                CHRONO<span className="text-emerald-400">FLORA</span>
              </span>
              <span className="hidden md:inline text-[10px] uppercase font-mono px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 text-neutral-300 rounded">
                Solana
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 hidden xl:block">
              Multiverso Botánico Descentralizado
            </p>
          </div>
        </div>

        {/* User Balances & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {/* FLORA Balance */}
          <div className="flex items-center gap-1.5 bg-emerald-950/30 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-emerald-300">
            <Coins className="w-4 h-4 text-emerald-400" />
            <div className="text-right">
              <span className="text-[10px] text-emerald-500 block leading-none font-semibold">BALANCE</span>
              <span className="font-mono text-sm font-bold leading-tight">{floraBalance.toLocaleString()} $FLORA</span>
            </div>
          </div>

          {/* SOL Balance */}
          <div className="hidden md:flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-lg text-neutral-300">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-[9px] font-bold text-white">
              S
            </div>
            <div className="text-right">
              <span className="text-[10px] text-neutral-400 block leading-none font-semibold">SOL</span>
              <span className="font-mono text-xs font-semibold leading-tight">{solBalance.toFixed(2)} SOL</span>
            </div>
          </div>

          {/* Cultivator Level */}
          <div className="hidden lg:flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-lg text-neutral-300" title={`Rango: ${rankTitle}`}>
            <Award className="w-4 h-4 text-amber-400" />
            <div className="text-right">
              <span className="text-[10px] text-neutral-400 block leading-none font-semibold">NIVEL</span>
              <span className="font-mono text-xs font-bold text-amber-300 leading-tight">Nv. {playerLevel}</span>
            </div>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label={soundEnabled ? "Silenciar audio" : "Activar audio"}
            className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* User Account / Profile Button */}
          {isAuthenticated && currentUser ? (
            <button
              onClick={onOpenProfileModal}
              title={`Perfil: ${currentUser.displayName} (@${currentUser.username}) - ${currentUser.role}`}
              className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-850 border border-emerald-500/30 px-2 sm:px-2.5 py-1.5 rounded-lg text-neutral-200 transition cursor-pointer"
            >
              <span className="text-base leading-none">{currentUser.avatar}</span>
              <div className="hidden lg:block text-left">
                <span className="text-xs font-bold text-white block leading-tight truncate max-w-[85px]">
                  {currentUser.displayName}
                </span>
                <span className="text-[9px] text-emerald-400 font-mono block leading-none">
                  {currentUser.role.split(' ')[0]}
                </span>
              </div>
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs px-2 sm:px-2.5 py-1.5 rounded-lg text-emerald-300 font-medium transition cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ingresar</span>
            </button>
          )}

          {/* Solana Wallet Button with Network Tag */}
          <button
            onClick={onOpenWalletModal}
            className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs px-2 sm:px-2.5 py-1.5 rounded-lg text-neutral-300 hover:text-white transition cursor-pointer font-mono"
            title={`Billetera Solana en ${netConfig.name}`}
          >
            <Wallet className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden lg:inline text-[9px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono">
              {netConfig.badgeLabel}
            </span>
            <span className="hidden lg:inline">
              {isWalletConnected ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : 'Wallet'}
            </span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs: own row on every screen size, scrolls sideways if it ever runs out of room */}
      <nav className="border-t border-neutral-800/60 bg-neutral-900/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-1.5 flex overflow-x-auto gap-1 lg:justify-center scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-2 whitespace-nowrap shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-neutral-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
