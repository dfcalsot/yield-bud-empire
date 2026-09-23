import React, { useEffect, useState } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { isThirsty } from './sim/engine';
import { Navbar } from './components/Navbar';
import { CultivationView } from './components/CultivationView';
import { PlanetView } from './components/planet/PlanetView';
import { ProfileView } from './components/profile/ProfileView';
import { LocalSavesBanner } from './components/profile/LocalSaves';
import { AuthGate } from './auth/AuthGate';
import { SeedBankView } from './components/SeedBankView';
import { GrowMarketView } from './components/GrowMarketView';
import { NutrientTablesView } from './components/NutrientTablesView';
import { ExtractionLabView } from './components/ExtractionLabView';
import { ForgeView } from './components/forge/ForgeView';
import { BreedingView } from './components/breeding/BreedingView';
import { GeneticsLabView } from './components/GeneticsLabView';
import { DispensaryV2PView } from './components/DispensaryV2PView';
import { TokenomicsView } from './components/TokenomicsView';
import { WhitepaperView } from './components/WhitepaperView';
import { WalletModal } from './components/wallet/WalletModal';
import { GiftChest } from './components/wallet/GiftChest';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { NotificationToast } from './components/NotificationToast';
import { TxToast } from './components/TxToast';
import { QuestProgressBar } from './components/QuestProgressBar';
import { Dock } from './components/Dock';
import { BriefcaseDrawer } from './components/bag/BriefcaseDrawer';
import { GuideChrono } from './components/guide/GuideChrono';
import { DiaryDrawer } from './components/diary/DiaryDrawer';
import { UpdateBanner, buildLabel } from './components/UpdateBanner';
import { WelcomeSheet } from './components/guide/WelcomeSheet';
import { ResourceBar } from './components/ResourceBar';
import { SubTabs } from './components/SubTabs';
import { ParticleField } from './components/game/GameUI';
import { NAV_GROUPS, TAB_ZONE, groupOfTab, type TabId } from './nav';
import { t, useLang } from './i18n';

function YieldBudEmpireApp() {
  const { indoorPlants, reportEvent } = useGame();
  const [currentTab, setCurrentTab] = useState<string>('cultivo');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [bagOpen, setBagOpen] = useState<boolean>(false);
  const [bagTab, setBagTab] = useState<string | undefined>(undefined);
  const [diaryOpen, setDiaryOpen] = useState<boolean>(false);

  // the tutorial counts when the briefcase is opened
  useEffect(() => { if (bagOpen) reportEvent('openbag'); }, [bagOpen, reportEvent]);

  // any component can ask App to open the briefcase (see ui/events.ts)
  useEffect(() => {
    const on = () => setBagOpen(true);
    const onDiary = () => setDiaryOpen(true);
    window.addEventListener('ybe:open-bag', on);
    window.addEventListener('ybe:open-diary', onDiary);
    return () => { window.removeEventListener('ybe:open-bag', on); window.removeEventListener('ybe:open-diary', onDiary); };
  }, []);

  // `I` opens / closes the briefcase (ignored while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'i' || e.key === 'I') setBagOpen((v) => !v);
      if (e.key === 'd' || e.key === 'D') setDiaryOpen((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // Remember the last sub-tab visited in each dock group
  const [lastTabByGroup, setLastTabByGroup] = useState<Record<string, string>>({});
  // shortcuts ("Contratar jardinero", "Tratamientos"…) open the market straight on that shelf
  const [marketCat, setMarketCat] = useState<string | undefined>(undefined);

  // tab title flags plants that need water (this is a real-time game: the player has to come back)
  useEffect(() => {
    const thirsty = indoorPlants.filter(isThirsty).length;
    document.title = t('{v0}Yield Bud Empire: El Multiverso Botánico Descentralizado', { v0: thirsty ? `(💧${thirsty}) ` : '' });
  }, [indoorPlants]);

  const goToTab = (tab: string) => {
    if (tab !== currentTab) { reportEvent('visit'); if (tab === 'planeta') reportEvent('planet'); }
    setMarketCat(undefined);
    setCurrentTab(tab);
    setLastTabByGroup((prev) => ({ ...prev, [groupOfTab(tab).id]: tab }));
  };

  const openMarket = (cat?: string) => {
    setCurrentTab('market');
    setLastTabByGroup((prev) => ({ ...prev, mercado: 'market' }));
    setMarketCat(cat);
  };

  const goToGroup = (groupId: string) => {
    const group = NAV_GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    if (group.tabs.includes(currentTab as never)) return;
    goToTab(lastTabByGroup[groupId] ?? group.tabs[0]);
  };

  return (
    <div
      className="relative z-10 min-h-screen text-neutral-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-neutral-950"
      style={{ ['--zone' as string]: TAB_ZONE[currentTab as TabId] ?? '#b8f35a' }}
    >
      <ParticleField />

      {/* Top HUD */}
      <Navbar 
        setCurrentTab={goToTab}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className={`flex-1 ${currentTab === 'cultivo' ? 'max-w-[1780px]' : 'max-w-7xl'} w-full mx-auto p-4 sm:p-6 md:p-8 pb-32 space-y-6`}>
        {/* Quest / level bar and the sub-sections of the active dock group share one row */}
        <div className="flex flex-wrap items-start gap-3">
          <SubTabs currentTab={currentTab} setCurrentTab={goToTab} />
          <div className="flex-1 min-w-[300px]">
            <QuestProgressBar />
          </div>
        </div>

        <LocalSavesBanner onOpenProfile={() => goToTab('perfil')} />

        {currentTab !== 'market' && currentTab !== 'tokenomica' && currentTab !== 'whitepaper' && currentTab !== 'cultivo' && <ResourceBar onOpenMarket={openMarket} />}

        {currentTab === 'cultivo' && <CultivationView onOpenMarket={openMarket} onOpenPlanet={() => goToTab('planeta')} />}
        {currentTab === 'perfil' && <ProfileView onOpenAccountModal={() => setIsProfileModalOpen(true)} />}
        {currentTab === 'planeta' && <PlanetView onOpenSeedBank={() => goToTab('semillas')} onOpenMarket={openMarket} />}
        {currentTab === 'semillas' && <SeedBankView onNavigateToCultivation={() => goToTab('cultivo')} />}
        {currentTab === 'market' && <GrowMarketView initialCat={marketCat} onOpenPlanet={() => goToTab('planeta')} onOpenBag={() => { setBagTab('plantilla'); setBagOpen(true); }} />}
        {currentTab === 'nutrientes' && <NutrientTablesView />}
        {currentTab === 'extraccion' && <ExtractionLabView />}
        {currentTab === 'forja' && <ForgeView />}
        {currentTab === 'cria' && <BreedingView />}
        {currentTab === 'genetica' && <GeneticsLabView />}
        {currentTab === 'dispensario' && <DispensaryV2PView />}
        {currentTab === 'tokenomica' && <TokenomicsView />}
        {currentTab === 'whitepaper' && <WhitepaperView />}
      </main>

      <UpdateBanner />
      <WelcomeSheet />
      <GuideChrono currentTab={currentTab} />
      <DiaryDrawer open={diaryOpen} onClose={() => setDiaryOpen(false)} />
      <BriefcaseDrawer open={bagOpen} onClose={() => setBagOpen(false)} initialTab={bagTab} onNavigate={(t) => (t.startsWith('market:') ? openMarket(t.slice(7)) : goToTab(t))} />

      {/* Global Toast Alerts */}
      <NotificationToast />
      <GiftChest />
      <TxToast />

      {/* Game wallet: in-game address, balances, and linked Solana / Ronin wallets */}
      <WalletModal isOpen={isWalletModalOpen} onClose={() => setIsWalletModalOpen(false)} />

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
        <span className="font-serif text-neutral-400">{t('Yield Bud Empire')}</span>{' '}{t('· Solana SPL & Anchor · Simulación agronómica educativa ·')}
        <button onClick={() => goToTab('whitepaper')} className="hover:text-emerald-300 transition cursor-pointer">{t('Libro Blanco')}</button> · <span title={t('Versión de este juego (si no coincide con la última, recarga con Ctrl+Shift+R)')}>{buildLabel()}</span>
      </footer>

      {/* Bottom dock */}
      <Dock currentTab={currentTab} onSelectGroup={goToGroup} bagOpen={bagOpen} onToggleBag={() => { setBagTab(undefined); setBagOpen((v) => !v); }} />
    </div>
  );
}

export default function App() {
  // al cambiar de idioma se vuelve a dibujar la interfaz entera (key); la partida vive en GameProvider y no se toca
  const lang = useLang();
  // the game only opens for a signed-in session (see server/ and SECURITY.md)
  return (
    <AuthGate>
      {() => (
        <GameProvider>
          <YieldBudEmpireApp key={lang} />
        </GameProvider>
      )}
    </AuthGate>
  );
}
