import React, { useState } from 'react';
import { GameProvider } from './context/GameContext';
import { Navbar } from './components/Navbar';
import { CultivationView } from './components/CultivationView';
import { SeedBankView } from './components/SeedBankView';
import { GrowMarketView } from './components/GrowMarketView';
import { NutrientTablesView } from './components/NutrientTablesView';
import { ExtractionLabView } from './components/ExtractionLabView';
import { GeneticsLabView } from './components/GeneticsLabView';
import { DispensaryV2PView } from './components/DispensaryV2PView';
import { TokenomicsView } from './components/TokenomicsView';
import { WhitepaperView } from './components/WhitepaperView';
import { SolanaWalletModal } from './components/SolanaWalletModal';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { NotificationToast } from './components/NotificationToast';
import { QuestProgressBar } from './components/QuestProgressBar';
import { Sprout, Shield, Cpu, ExternalLink } from 'lucide-react';

function ChronoFloraApp() {
  const [currentTab, setCurrentTab] = useState<string>('cultivo');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-neutral-950">
      {/* Top Header & Navigation */}
      <Navbar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Gaming Quest & Level Progression Bar */}
        <QuestProgressBar />

        {currentTab === 'cultivo' && <CultivationView />}
        {currentTab === 'semillas' && <SeedBankView onNavigateToCultivation={() => setCurrentTab('cultivo')} />}
        {currentTab === 'market' && <GrowMarketView />}
        {currentTab === 'nutrientes' && <NutrientTablesView />}
        {currentTab === 'extraccion' && <ExtractionLabView />}
        {currentTab === 'genetica' && <GeneticsLabView />}
        {currentTab === 'dispensario' && <DispensaryV2PView />}
        {currentTab === 'tokenomica' && <TokenomicsView />}
        {currentTab === 'whitepaper' && <WhitepaperView />}
      </main>

      {/* Global Toast Alerts */}
      <NotificationToast />

      {/* Solana Wallet Modal with Mainnet/Devnet/Testnet & All Providers */}
      <SolanaWalletModal 
        isOpen={isWalletModalOpen} 
        onClose={() => setIsWalletModalOpen(false)}
        onOpenAuthModal={() => {
          setIsWalletModalOpen(false);
          setIsAuthModalOpen(true);
        }}
      />

      {/* User Login & Registration Modal (Data Isolation per User) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* User Profile & Account Settings Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenSwitchAccounts={() => {
          setIsProfileModalOpen(false);
          setIsAuthModalOpen(true);
        }}
        onOpenWalletModal={() => {
          setIsProfileModalOpen(false);
          setIsWalletModalOpen(true);
        }}
      />

      {/* Footer & Compliance Bar */}
      <footer className="mt-12 border-t border-neutral-900 bg-neutral-950/80 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <Sprout className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-neutral-300 font-serif">
              ChronoFlora: El Multiverso Botánico Descentralizado
            </span>
            <span>•</span>
            <span>Solana SPL Token & Anchor Program</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <button 
              onClick={() => setCurrentTab('whitepaper')}
              className="hover:text-neutral-300 transition cursor-pointer"
            >
              Libro Blanco v1.0
            </button>
            <span>•</span>
            <button 
              onClick={() => setCurrentTab('tokenomica')}
              className="hover:text-neutral-300 transition cursor-pointer"
            >
              Tokenómica $FLORA
            </button>
            <span>•</span>
            <button 
              onClick={() => setIsWalletModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
            >
              Solana Devnet Faucet
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-4 pt-4 border-t border-neutral-900/60 text-[11px] text-neutral-600 text-center leading-relaxed">
          Simulación agronómica digital enfocada en la ciencia de microclimas, fitoquímica botánica y economía deflacionaria on-chain. Todos los activos genéticos están asegurados en la red Solana.
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <ChronoFloraApp />
    </GameProvider>
  );
}
