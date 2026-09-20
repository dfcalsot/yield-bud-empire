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
import { TxToast } from './components/TxToast';
import { QuestProgressBar } from './components/QuestProgressBar';
import { Dock } from './components/Dock';
import { SubTabs } from './components/SubTabs';
import { ParticleField } from './components/game/GameUI';
import { NAV_GROUPS, groupOfTab } from './nav';

function ChronoFloraApp() {
  const [currentTab, setCurrentTab] = useState<string>('cultivo');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  // Remember the last sub-tab visited in each dock group
  const [lastTabByGroup, setLastTabByGroup] = useState<Record<string, string>>({});

  const goToTab = (tab: string) => {
    setCurrentTab(tab);
    setLastTabByGroup((prev) => ({ ...prev, [groupOfTab(tab).id]: tab }));
  };

  const goToGroup = (groupId: string) => {
    const group = NAV_GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    if (group.tabs.includes(currentTab as never)) return;
    goToTab(lastTabByGroup[groupId] ?? group.tabs[0]);
  };

  return (
    <div className="relative z-10 min-h-screen text-neutral-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-neutral-950">
      <ParticleField />

      {/* Top HUD */}
      <Navbar 
        setCurrentTab={goToTab}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 pb-32 space-y-6">
        {/* Quest / level bar and the sub-sections of the active dock group share one row */}
        <div className="flex flex-wrap items-start gap-3">
          <SubTabs currentTab={currentTab} setCurrentTab={goToTab} />
          <div className="flex-1 min-w-[300px]">
            <QuestProgressBar />
          </div>
        </div>

        {currentTab === 'cultivo' && <CultivationView />}
        {currentTab === 'semillas' && <SeedBankView onNavigateToCultivation={() => goToTab('cultivo')} />}
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
      <TxToast />

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

      {/* Footer */}
      <footer className="mb-24 px-4 text-center text-[11px] text-neutral-600">
        <span className="font-serif text-neutral-400">ChronoFlora</span> · Solana SPL &amp; Anchor · Simulación agronómica educativa ·{' '}
        <button onClick={() => goToTab('whitepaper')} className="hover:text-emerald-300 transition cursor-pointer">Libro Blanco</button>
      </footer>

      {/* Bottom dock */}
      <Dock currentTab={currentTab} onSelectGroup={goToGroup} />
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
