import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Loader2, WifiOff } from 'lucide-react';
import type {
  Strain, GrowFacility, MachineEquipment, PlantInGrow, ProcessedProduct, LabRunSpec, OwnedPlot, RegionId, GenomicPatent, VirtualBrand,
  SolanaTransaction, TechniqueId, V2pRedemptionItem, GameQuest, SeedBankItem, GrowSupplyItem, NutrientBrand, GrowRoomId, MotherFatherPlant,
  SolanaNetwork, UserProfile,
} from '../types';
import { INITIAL_FACILITIES, NUTRIENT_BRANDS_DATABASE } from '../data/initialData';
import { SOLANA_NETWORKS, connectBrowserWallet, generateSolanaKeypair, fetchLiveSolBalance, requestSolanaAirdrop, signSolanaMessage } from '../utils/solana';
import { playWaterSound, playHarvestChime, playBurnSound, playClickSound, playLevelUpSound, playQuestCompleteSound, playGoldenDripSound, isSoundEnabled, setSoundEnabled } from '../utils/audio';
import type { Materials } from '../sim/forge';
import { etaSeconds, maleCount, pestCount, plotEtaSeconds, powerDraw } from '../sim/engine';
import { plotOffer, type PlotOffer } from '../sim/terroir';
import type { AvatarDesign, ChestId, OwnedAvatar, PityMap } from '../sim/avatars';
import { DESIGN_BY_ID } from '../sim/avatars';
import { burnRateOfSale, saleRevenue, type Depth } from '../sim/economy';
import type { Construction } from '../sim/facilities';
import type { MissionEvent, MissionState } from '../sim/missions';
import { STAFF_ROLES, isActive as staffIsActive, wageOf, type Candidate, type Mods, type StaffChestId, type StaffNft, type StaffPity, type StaffRole } from '../sim/staff';
import type { NpcKind } from '../components/npc/Npc';
import type { TutorialState } from '../sim/tutorial';
import type { MediumId, Mix, StageId } from '../sim/nutrition';
import { CATALOG_BY_ID, USE, equipStatsOf, gardenerLevelOf, garbageOf, ownsStation, stockOf, type EquipStats, type OwnedAsset } from '../economy/catalog';
import { type ListingView, type Snapshot } from '../economy/ledger';
import { mintAddressFor } from '../utils/nft';
import {
  applyAction, advance, deriveEnv, GameError, NeedsServer, SERVER_ONLY, XP_NEEDED, rankTitleOf, facilityOfTier,
  machinesOf, questsOf, seedBankOf, strainsOf, suppliesOf, v2pItemsOf, type Effect, type GameState, type ToastKind,
  type BreedingJob, type BreedingLogEntry,
} from '../core';
import { fetchGame, postAction, postProfile, predictCtx, extOfSnapshot, modsOf, newIdem, refusalText, type ActionAnswer, type GameAnswer } from '../core/predict';
import { logoutServer } from '../auth/api';
import type { ServerAccount } from '../auth/AuthGate';
import { BALANCE } from '../sim/balance';
import { t as tr, useLang } from '../i18n';
export { calculateVpd } from '../sim/engine';
export type { BreedingJob, BreedingLogEntry };

export interface ForgeJob { id: string; recipeId: string; qty: number; startedAt: number; endsAt: number }

/** a nutrient solution to apply: the recipe (water, litres, doses) and where; the server measures it itself */
export interface FertigationInput { mix: Mix; stage: StageId; medium: MediumId; label: string; scope: 'one' | 'all'; brandName?: string }

interface GameContextType {
  // Wallet / Solana & Networks (this session's connection; the game wallet itself is the server's)
  walletAddress: string;
  isWalletConnected: boolean;
  solanaNetwork: SolanaNetwork;
  setSolanaNetwork: (net: SolanaNetwork) => void;
  connectedWalletType: string;
  connectWallet: () => void;
  connectSpecificWallet: (providerType: 'phantom' | 'solflare' | 'backpack' | 'injected' | 'virtual') => Promise<boolean>;
  generateVirtualKeypair: () => { publicKey: string; secretKeyHex: string };
  signAuthMessageTest: () => Promise<boolean>;
  refreshLiveBalance: () => Promise<number>;
  disconnectWallet: () => void;
  floraBalance: number;
  solBalance: number;
  totalFloraBurned: number;
  burnStats: { speedUp: number; repairs: number; patents: number; v2p: number };
  transactions: SolanaTransaction[];
  requestAirdrop: () => void;
  /** the game runs on the server (always true once the game is open) */
  ledgerOn: boolean;
  myListings: ListingView[];
  gifts: Snapshot['gifts'];
  openGift: (giftId: number) => Promise<{ amount: number; note: string } | null>;
  p2pInfo: Snapshot['p2p'];
  listNft: (ref: { nftId?: string; designId?: string }, price: number) => Promise<boolean>;
  cancelListing: (listingId: number) => Promise<boolean>;
  buyListing: (listingId: number) => Promise<ListingView | null>;
  claimDaily: () => Promise<void>;
  faucetAt: number;
  quoteSale: (productId: string) => { gross: number; fee: number; net: number; ratio: number } | null;

  // the signed-in account (profile kept by the server)
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  logoutUser: () => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;

  facilities: GrowFacility[];
  currentFacility: GrowFacility;
  upgradeFacility: (facilityId: string) => Promise<void>;
  construction: Construction | null;
  speedUpConstruction: () => Promise<boolean>;

  staff: StaffNft[];
  staffAssign: Partial<Record<StaffRole, string>>;
  staffPity: StaffPity;
  staffMods: Mods;
  shopPrice: (flora: number) => number;
  staffIn: (role: StaffRole) => { staff: StaffNft; working: boolean } | null;
  hireCandidate: (c: Candidate) => Promise<StaffNft | null>;
  openStaffChest: (id: StaffChestId) => Promise<StaffNft | null>;
  assignStaff: (role: StaffRole, staffId: string | null) => Promise<void>;
  rankUpStaff: (staffId: string) => Promise<boolean>;
  staffWagesPerDay: number;
  strains: Strain[];
  activePlant: PlantInGrow | null;
  indoorPlants: PlantInGrow[];
  selectedPlantIndex: number;
  selectPlant: (index: number) => void;
  waterAllPlants: () => void;
  feedAllPlants: () => void;
  harvestAllReadyPlants: () => void;
  speedUpIndoorRoom: () => boolean;
  trainIndoorCanopy: () => void;
  plantNewSeed: (strain: Strain) => void;
  waterPlant: () => void;
  feedNutrients: () => void;
  setTemperature: (temp: number) => void;
  setHumidity: (rh: number) => void;
  setPpfd: (ppfd: number) => void;
  setLightSchedule: (schedule: '18/6' | '12/12' | '24/0') => void;
  trainPlant: (technique: TechniqueId) => boolean;
  speedUpGrowth: () => boolean;
  harvestPlant: () => void;

  rawFlowerGrams: number;
  trimGrams: number;
  materials: Materials;
  forgeJobs: ForgeJob[];
  forgeCraft: (recipeId: string, qty: number) => boolean;
  breedingJobs: BreedingJob[];
  breedingLog: BreedingLogEntry[];
  crossBreed: (motherId: string, fatherId: string, name: string, useReagent: boolean) => boolean;
  processedProducts: ProcessedProduct[];
  machines: MachineEquipment[];
  processRawFlower: (type: 'cured_flower' | 'live_rosin' | 'full_spec_oil' | 'pure_terpenes', gramsInput: number) => boolean;
  runLabProcess: (spec: LabRunSpec) => ProcessedProduct | null;
  getPlantEta: (plant: PlantInGrow) => number;
  certifyProduct: (productId: string, feeFlora?: number) => ProcessedProduct | null;
  repairMachine: (machineId: string) => boolean;

  patents: GenomicPatent[];
  breedStrains: (parentA: Strain, parentB: Strain, name: string) => Strain | null;
  registerPatent: (strain: Strain) => boolean;

  seedBank: SeedBankItem[];
  seedInventory: { [seedId: string]: number };
  buySeed: (seedId: string, currency?: 'FLORA' | 'SOL') => boolean;
  plantFromSeedBank: (seedId: string) => boolean;
  suppliesMarket: GrowSupplyItem[];
  buySupply: (supplyId: string, currency?: 'FLORA' | 'SOL') => boolean;

  assets: OwnedAsset[];
  equipStats: EquipStats;
  resources: { water: number; nutrient: number; energy: number; kwhPerDay: number; solarKwhPerDay: number; energyDays: number };
  buyAsset: (catalogId: string, currency?: 'FLORA' | 'SOL', qty?: number) => boolean;
  setAssetEquipped: (assetId: string, equipped: boolean) => void;
  repairAsset: (assetId: string) => boolean;
  ownsStation: (stationId: string) => boolean;

  missions: MissionState;
  /** moments only the interface sees (a tab, the bag, the planet, the gauges); the rest the server counts itself */
  reportEvent: (event: MissionEvent, n?: number) => void;
  claimStoryMission: (id: string) => string | null;
  claimErrandMission: (npc: NpcKind) => string | null;
  tutorial: TutorialState;
  startTutorial: () => void;
  claimTutorialStep: () => string | null;
  skipTutorialStep: () => void;
  patchTutorial: (p: Partial<Pick<TutorialState, 'dismissed' | 'minimized'>>) => void;
  care: { rating: number; cleanReadyInHours: number; pests: number; plotPests: number; males: number; plotMales: number; pollinated: number; garbage: number; gardenerLevel: 0 | 1 | 2; gardenerDays: number };
  treatPests: (scope: 'selected' | 'all', plotId?: string) => void;
  cleanRoom: () => boolean;
  recycleGarbage: () => void;

  plots: OwnedPlot[];
  plotsForSale: (region: RegionId) => { offers: PlotOffer[]; left: number };
  buyPlot: (offerId: string, currency?: 'FLORA' | 'SOL') => Promise<boolean>;
  plantPlot: (plotId: string, seedId: string, count?: number) => boolean;
  waterPlot: (plotId: string, all?: boolean) => void;
  feedPlot: (plotId: string) => void;
  harvestPlot: (plotId: string) => void;
  plotEta: (plot: OwnedPlot, plant: PlantInGrow) => number;
  removeMales: (plotId?: string) => void;
  avatars: OwnedAvatar[];
  chestPity: PityMap;
  showNotification: (message: string, type: 'success' | 'burn' | 'info') => void;
  openChest: (id: ChestId, currency?: 'FLORA' | 'SOL') => Promise<{ design: AvatarDesign; isNew: boolean; refund: number; owned: OwnedAvatar } | null>;
  equipAvatar: (designId: string | null) => void;
  keepMaleAsFather: (plotId: string, slot: number) => void;

  nutrientBrands: NutrientBrand[];
  selectedNutrientBrand: string;
  setSelectedNutrientBrand: (brandId: string) => void;
  applyNutrientStage: (stageIndex: number) => void;
  applyFertigation: (f: FertigationInput) => boolean;
  /** XP for a correct answer in the symptom quiz (once per symptom) and for a solved lab challenge (the server checks the mix) */
  quizCorrect: (symptomId: string) => void;
  claimChallenge: (challengeId: string, mix: Mix) => boolean;
  /** a UFO waved at on the planet: XP three times a day (returns the XP, 0 when none is left today) */
  ufoCaught: () => number;

  currentRoom: GrowRoomId;
  switchGrowRoom: (roomId: GrowRoomId) => void;
  co2Ppm: number;
  setCo2Ppm: (ppm: number) => void;
  autoWaterActive: boolean;
  toggleAutoWater: () => void;
  autoClimateActive: boolean;
  toggleAutoClimate: () => void;
  calibrateMeter: (meterType: 'ph' | 'ec' | 'par' | 'lux') => void;

  mothersFathers: MotherFatherPlant[];
  saveCurrentPlantAsMotherOrFather: (role: 'Madre (Esquejes / Clones)' | 'Padre (Donante de Polen)') => boolean;
  takeCloneFromMother: (motherId: string) => boolean;
  collectPollenFromFather: (fatherId: string) => number;
  hybridizeParents: (motherId: string, fatherId: string, newStrainName: string) => Strain | null;

  brand: VirtualBrand;
  updateBrand: (name: string, tagline: string) => void;
  sellProduct: (productId: string) => void;
  v2pItems: V2pRedemptionItem[];
  redeemV2p: (item: V2pRedemptionItem, shippingDetails: { name: string; country: string }) => boolean;
  redeemedV2pList: { item: V2pRedemptionItem; timestamp: number; txSig: string; recipient: string }[];

  playerLevel: number;
  playerXp: number;
  xpNeeded: number;
  rankTitle: string;
  quests: GameQuest[];
  claimQuestReward: (questId: string) => void;
  executeManualRosinPress: (yieldBonus: number, quality: number, isCritical: boolean) => void;

  soundEnabled: boolean;
  toggleSound: () => void;

  notification: { message: string; type: 'success' | 'burn' | 'info' } | null;
  clearNotification: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const UI_EVENTS = new Set<MissionEvent>(['visit', 'planet', 'openbag', 'gauges']);
const POLL_MS = 30_000;
const SFX: Record<string, () => void> = {
  water: playWaterSound, harvest: playHarvestChime, burn: playBurnSound, click: playClickSound, levelup: playLevelUpSound, quest: playQuestCompleteSound, golden: playGoldenDripSound,
};

interface View { state: GameState; snap: Snapshot }
interface Pending { idem: string; type: string; params: Record<string, unknown>; predicted: boolean; resolve: (a: ActionAnswer) => void }

/**
 * The game as the browser sees it: the server's last answer, plus the actions it hasn't answered yet replayed on top (prediction).
 * Nothing of the game is stored in the browser. Needs the connection: without it, a notice and automatic retries.
 */
export const GameProvider: React.FC<{ account: ServerAccount | null; children: React.ReactNode }> = ({ account, children }) => {
  useLang();
  const [boot, setBoot] = useState<'loading' | 'ready' | 'down'>('loading');
  const [online, setOnline] = useState(true);
  const [, setVersion] = useState(0);
  const viewRef = useRef<View | null>(null);
  const baseRef = useRef<View | null>(null);
  const offsetRef = useRef(0);                               // server clock − this clock
  const queueRef = useRef<Pending[]>([]);
  const busyRef = useRef(false);
  const nowSrv = () => Date.now() + offsetRef.current;
  const render = () => setVersion((v) => v + 1);

  // --- UI-only state (preferences of this screen, never part of the game) ---
  const [selectedPlantIndex, setSelectedPlantIndex] = useState(0);
  const [selectedNutrientBrand, setSelectedNutrientBrand] = useState<string>('advanced_nutrients');
  const [sound, setSound] = useState(isSoundEnabled());
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'burn' | 'info' } | null>(null);
  const showNotification = useCallback((message: string, type: 'success' | 'burn' | 'info') => setNotification({ message, type }), []);
  const clearNotification = () => setNotification(null);
  const [solanaNetwork, setSolanaNetworkState] = useState<SolanaNetwork>('devnet');
  const [connectedWalletType, setConnectedWalletType] = useState<string>(tr('Phantom'));
  const [activeProviderInstance, setActiveProviderInstance] = useState<unknown>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  const playFx = useCallback((fx?: Effect[]) => {
    for (const f of fx ?? []) {
      if (f.t === 'toast') setNotification({ message: f.m, type: f.k });
      else if (f.t === 'sfx') SFX[f.s]?.();
      else if (f.t === 'confetti') confetti(f.o as confetti.Options);
    }
  }, []);

  /** the server's answer is the truth: adopt it and replay what it hasn't answered yet */
  const rebase = useCallback(() => {
    const base = baseRef.current;
    if (!base) return;
    let state = base.state;
    const snap = clone(base.snap);
    for (const it of queueRef.current) {
      if (!it.predicted) continue;
      try { state = applyAction(state, it.type, it.params, predictCtx(snap, nowSrv(), it.idem), { quiet: true }).state; } catch { /* the server will say */ }
    }
    viewRef.current = { state, snap };
    render();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const adopt = useCallback((a: GameAnswer) => {
    offsetRef.current = a.serverNow - Date.now();
    const prev = baseRef.current?.snap;
    baseRef.current = { state: a.state, snap: a.snapshot };
    // a build that finished on the server
    if (prev?.construction && !a.snapshot.construction && a.snapshot.tier > prev.tier) {
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.55 } });
      setNotification({ message: tr('¡Obra terminada! Tu nueva instalación ya está lista.'), type: 'success' });
    }
  }, []);

  const pump = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    let wait = 1000;
    try {
      while (queueRef.current.length) {
        const it = queueRef.current[0];
        const a = await postAction(it.type, it.params, it.idem);
        if (!a.ok && (a.status === 0 || a.status >= 500 || a.status === 429)) {
          // no connection: the same action (same key) is retried, it never applies twice
          setOnline(false);
          await new Promise((r) => setTimeout(r, wait));
          wait = Math.min(15_000, wait * 2);
          continue;
        }
        wait = 1000;
        setOnline(true);
        queueRef.current.shift();
        if (a.ok) {
          adopt(a);
          playFx(a.tickFx);
          if (!it.predicted) playFx(a.fx);
        } else {
          if (a.status === 401) { window.location.reload(); return; }
          // the server said no: its reason, and the screen goes back to its state
          setNotification({ message: refusalText(a), type: (a.kind as ToastKind) ?? 'info' });
        }
        it.resolve(a);
        rebase();
      }
    } finally { busyRef.current = false; }
  }, [adopt, playFx, rebase]);

  const enqueue = useCallback((type: string, params: Record<string, unknown>, predicted: boolean, idem = newIdem()) => new Promise<ActionAnswer>((resolve) => {
    queueRef.current.push({ idem, type, params, predicted, resolve });
    void pump();
  }), [pump]);

  /**
   * Run an action: predicted here at once (same core as the server) and sent. Returns the predicted result, or `refused` with the
   * reason already shown. Actions the browser can't predict are sent and their answer awaited (see `send`).
   */
  const act = useCallback((type: string, params: Record<string, unknown> = {}): { ok: boolean; result: unknown } => {
    const view = viewRef.current;
    if (!view) return { ok: false, result: null };
    const idem = newIdem();
    try {
      const snap = clone(view.snap);
      const out = applyAction(view.state, type, params, predictCtx(snap, nowSrv(), idem));
      viewRef.current = { state: out.state, snap };
      render();
      playFx(out.fx);
      void enqueue(type, params, true, idem);
      return { ok: true, result: out.result };
    } catch (e) {
      if (e instanceof GameError) {
        setNotification({ message: e.text ?? refusalText({ error: e.code }), type: e.kind });
        return { ok: false, result: null };
      }
      if (!(e instanceof NeedsServer)) console.error(e);
      void enqueue(type, params, false, idem);
      return { ok: true, result: null };
    }
  }, [enqueue, playFx]); // eslint-disable-line react-hooks/exhaustive-deps

  /** an action only the server can do (it needs its tables or dice): sent and awaited; its answer shows what happened */
  const send = useCallback(async <T,>(type: string, params: Record<string, unknown> = {}): Promise<T | null> => {
    const a = await enqueue(type, params, false);
    return a.ok ? (a.result as T) : null;
  }, [enqueue]);

  // first load, then a poll (the world keeps going on the server: plagues, deliveries, other devices)
  const poll = useCallback(async () => {
    if (queueRef.current.length) return;
    const a = await fetchGame();
    if ('error' in a) {
      if (a.status === 401) { window.location.reload(); return; }
      setOnline(false);
      if (!baseRef.current) setBoot('down');
      return;
    }
    if (queueRef.current.length) return;           // an action went out meanwhile: its answer is newer
    setOnline(true);
    adopt(a);
    playFx(a.fx);
    rebase();
    setBoot('ready');
  }, [adopt, playFx, rebase]);

  useEffect(() => {
    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    const onVisible = () => { if (!document.hidden) void poll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [poll]);
  // retry the first load while the server is unreachable
  useEffect(() => {
    if (boot !== 'down') return;
    const id = window.setInterval(() => void poll(), 5000);
    return () => window.clearInterval(id);
  }, [boot, poll]);

  // the screen animates the world between answers (display only: the server's next answer replaces it)
  useEffect(() => {
    const id = window.setInterval(() => {
      const v = viewRef.current;
      if (!v) return;
      try { viewRef.current = { state: advance(v.state, predictCtx(clone(v.snap), nowSrv(), 'view'), { quiet: true }).state, snap: v.snap }; render(); } catch { /* next answer */ }
    }, BALANCE.liveTickSeconds * 1000);
    return () => window.clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // a timer ends (forge, chamber cross, build): ask the server, it delivers
  const view = viewRef.current;
  const nextDue = useMemo(() => {
    if (!view) return 0;
    const ends = [...(view.snap.forgeJobs ?? []).map((j) => j.endsAt), ...view.state.breedingJobs.map((j) => j.endsAt), view.snap.construction?.endsAt ?? 0].filter((x) => x > 0);
    return ends.length ? Math.min(...ends) : 0;
  }, [view]);
  useEffect(() => {
    if (!nextDue) return;
    const t = window.setTimeout(() => void poll(), Math.min(2_000_000_000, Math.max(1500, nextDue - nowSrv() + 1500)));
    return () => window.clearTimeout(t);
  }, [nextDue, poll]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!view) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#04090a] p-6 text-center">
        {boot === 'down' ? (
          <div className="max-w-sm space-y-3">
            <WifiOff className="w-8 h-8 text-amber-300 mx-auto" />
            <h1 className="font-serif text-xl font-black text-white">{tr('Sin conexión, reintentando…')}</h1>
            <p className="text-sm text-neutral-400">{tr('Tu partida vive en el servidor y está a salvo. En cuanto vuelva la conexión, el juego abre solo.')}</p>
          </div>
        ) : <Loader2 className="w-6 h-6 animate-spin text-emerald-300" />}
      </div>
    );
  }

  return (
    <GameView
      view={view} account={account} online={online} act={act} send={send} nowSrv={nowSrv}
      ui={{ selectedPlantIndex, setSelectedPlantIndex, selectedNutrientBrand, setSelectedNutrientBrand, sound, setSound, notification, showNotification, clearNotification }}
      wallet={{ solanaNetwork, setSolanaNetworkState, connectedWalletType, setConnectedWalletType, activeProviderInstance, setActiveProviderInstance, walletAddress, setWalletAddress, isWalletConnected, setIsWalletConnected }}
      onProfile={async (u) => {
        const a = await postProfile(u as Record<string, unknown>);
        if (a.ok) { adopt(a); rebase(); } else setNotification({ message: refusalText(a), type: 'info' });
        return a.ok;
      }}
    >
      {children}
    </GameView>
  );
};

interface GameViewProps {
  view: View;
  account: ServerAccount | null;
  online: boolean;
  act: (type: string, params?: Record<string, unknown>) => { ok: boolean; result: unknown };
  send: <T>(type: string, params?: Record<string, unknown>) => Promise<T | null>;
  nowSrv: () => number;
  onProfile: (u: Partial<UserProfile>) => Promise<boolean>;
  ui: {
    selectedPlantIndex: number; setSelectedPlantIndex: (n: number) => void; selectedNutrientBrand: string; setSelectedNutrientBrand: (b: string) => void;
    sound: boolean; setSound: (b: boolean) => void; notification: GameContextType['notification']; showNotification: GameContextType['showNotification']; clearNotification: () => void;
  };
  wallet: {
    solanaNetwork: SolanaNetwork; setSolanaNetworkState: (n: SolanaNetwork) => void; connectedWalletType: string; setConnectedWalletType: (s: string) => void;
    activeProviderInstance: unknown; setActiveProviderInstance: (p: unknown) => void; walletAddress: string; setWalletAddress: (s: string) => void;
    isWalletConnected: boolean; setIsWalletConnected: (b: boolean) => void;
  };
  children: React.ReactNode;
}

/** everything the screens read, derived from the view (the server's state + the predictions on top) */
const GameView: React.FC<GameViewProps> = ({ view, account, online, act, send, nowSrv, onProfile, ui, wallet, children }) => {
  const { state: s, snap } = view;
  const now = nowSrv();
  const { showNotification } = ui;
  const ext = useMemo(() => extOfSnapshot(snap, now), [snap]); // eslint-disable-line react-hooks/exhaustive-deps
  const staffMods = useMemo(() => modsOf(snap, now), [snap]); // eslint-disable-line react-hooks/exhaustive-deps
  const strains = useMemo(() => strainsOf(s), [s.customStrains, s.patentMarks]); // eslint-disable-line react-hooks/exhaustive-deps
  const seedBank = useMemo(() => seedBankOf(s), [s.customSeeds]); // eslint-disable-line react-hooks/exhaustive-deps
  const machines = useMemo(() => machinesOf(s), [s.machines]); // eslint-disable-line react-hooks/exhaustive-deps
  const quests = useMemo(() => questsOf(s), [s.quests]); // eslint-disable-line react-hooks/exhaustive-deps
  const suppliesMarket = useMemo(() => suppliesOf(s), [s.installedSupplies]); // eslint-disable-line react-hooks/exhaustive-deps
  const v2pItems = useMemo(() => v2pItemsOf(s), [s.v2pStock]); // eslint-disable-line react-hooks/exhaustive-deps
  const facilities = useMemo(() => INITIAL_FACILITIES.map((f) => ({ ...f, unlocked: f.unlocked || snap.unlocked.includes(f.id) })), [snap.unlocked]);
  const currentFacility = useMemo(() => ({ ...facilityOfTier(snap.tier), unlocked: true }), [snap.tier]);
  const plots: OwnedPlot[] = useMemo(() => snap.plots.map((sp) => ({ ...sp, region: sp.region as RegionId, plants: s.plotPlants[sp.id] ?? [] })), [snap.plots, s.plotPlants]);
  const avatars: OwnedAvatar[] = useMemo(() => snap.avatars.map((a) => ({ ...a, mint: mintAddressFor(`av-${a.designId}`) })), [snap.avatars]);
  const equipStats = useMemo(() => equipStatsOf(s.assets), [s.assets]);
  const simEnv = useMemo(() => deriveEnv(s, ext), [s, ext]);
  const indoorPlants = s.indoorPlants;
  const selectedPlantIndex = Math.min(ui.selectedPlantIndex, Math.max(0, indoorPlants.length - 1));
  const activePlant = indoorPlants[selectedPlantIndex] || indoorPlants[0] || null;
  const idx = selectedPlantIndex;
  const inv = snap.inventory ?? { flower: 0, trim: 0, materials: {}, products: {} };
  const ok = (r: { ok: boolean }) => r.ok;

  const currentUser: UserProfile | null = useMemo(() => account ? {
    id: `srv-${account.id}`, username: account.username, email: account.email ?? '', displayName: s.profile.displayName, avatar: s.profile.avatar,
    avatarImage: s.profile.avatarImage, avatarNft: s.profile.avatarNft, bio: s.profile.bio, role: s.profile.role, createdAt: account.createdAt,
    experienceLevel: s.playerLevel, facilityName: s.profile.facilityName, walletAddress: wallet.walletAddress || undefined, preferredNetwork: wallet.solanaNetwork,
  } : null, [account, s.profile, s.playerLevel, wallet.walletAddress, wallet.solanaNetwork]);

  /* ── Solana wallet connection (this session only) ── */
  const setSolanaNetwork = (network: SolanaNetwork) => { wallet.setSolanaNetworkState(network); showNotification(tr('Red Solana cambiada a: {name}', { name: SOLANA_NETWORKS[network].name }), 'info'); };
  const connectSpecificWallet = async (providerType: 'phantom' | 'solflare' | 'backpack' | 'injected' | 'virtual'): Promise<boolean> => {
    try {
      if (providerType === 'virtual') {
        const kp = generateSolanaKeypair();
        wallet.setWalletAddress(kp.publicKey); wallet.setConnectedWalletType(tr('Virtual Keypair')); wallet.setIsWalletConnected(true); wallet.setActiveProviderInstance(null);
        showNotification(tr('Billetera Virtual Solana generada: {v0}...{v1}', { v0: kp.publicKey.slice(0, 4), v1: kp.publicKey.slice(-4) }), 'success');
        return true;
      }
      const res = await connectBrowserWallet(providerType);
      wallet.setWalletAddress(res.publicKey); wallet.setConnectedWalletType(res.providerName); wallet.setActiveProviderInstance(res.provider); wallet.setIsWalletConnected(true);
      showNotification(tr('Billetera {providerName} conectada: {v1}...{v2}', { providerName: res.providerName, v1: res.publicKey.slice(0, 4), v2: res.publicKey.slice(-4) }), 'success');
      return true;
    } catch (err) {
      showNotification((err as Error).message || tr('Error al conectar billetera'), 'burn');
      return false;
    }
  };
  const generateVirtualKeypair = () => {
    const kp = generateSolanaKeypair();
    wallet.setWalletAddress(kp.publicKey); wallet.setConnectedWalletType(tr('Virtual Keypair')); wallet.setIsWalletConnected(true);
    showNotification(tr('Nueva clave Solana Ed25519 generada: {v0}...', { v0: kp.publicKey.slice(0, 6) }), 'success');
    return { publicKey: kp.publicKey, secretKeyHex: kp.secretKeyHex };
  };
  const signAuthMessageTest = async (): Promise<boolean> => {
    try {
      const msg = `Yield Bud Empire Botanical Web3 Auth | Cultivador: ${currentUser?.displayName || 'Anónimo'} | Red: ${wallet.solanaNetwork} | Timestamp: ${Date.now()}`;   // lo que se firma: no se traduce
      const res = await signSolanaMessage(wallet.activeProviderInstance as never, msg);
      showNotification(tr('¡Firma criptográfica verificada con éxito! Hash: {v0}...', { v0: res.signature.slice(0, 10) }), 'success');
      return true;
    } catch (err) {
      showNotification(tr('Firma cancelada: {v0}', { v0: (err as Error).message || tr('Error') }), 'burn');
      return false;
    }
  };
  /** the live SOL of the connected wallet (shown only; the game's SOL is the server's) */
  const refreshLiveBalance = async (): Promise<number> => {
    if (!wallet.walletAddress) return s.solBalance;
    try { return await fetchLiveSolBalance(wallet.walletAddress, wallet.solanaNetwork); } catch { return s.solBalance; }
  };
  const requestAirdrop = async () => {
    const netConfig = SOLANA_NETWORKS[wallet.solanaNetwork];
    if (wallet.solanaNetwork === 'mainnet-beta') { showNotification(tr('Mainnet: no hay airdrop. El $FLORA se gana cultivando y vendiendo; hay un reclamo diario en la barra superior.'), 'info'); return; }
    try {
      showNotification(tr('Solicitando 1.0 SOL de prueba en {name}...', { name: netConfig.name }), 'info');
      await requestSolanaAirdrop(wallet.walletAddress, wallet.solanaNetwork, 1.0);
      showNotification(tr('Llegó SOL de prueba a tu billetera en {badgeLabel}. El $FLORA del juego no cambia.', { badgeLabel: netConfig.badgeLabel }), 'success');
    } catch (err) {
      showNotification(tr('No se pudo pedir el airdrop de {badgeLabel}: {v1}. Inténtalo más tarde.', { badgeLabel: netConfig.badgeLabel, v1: (err as Error)?.message || tr('la red no respondió') }), 'info');
    }
  };
  const connectWallet = () => { void connectSpecificWallet('injected'); };
  const disconnectWallet = () => { wallet.setIsWalletConnected(false); wallet.setConnectedWalletType(tr('Ninguna')); showNotification(tr('Billetera Solana desconectada'), 'info'); };

  /* ── account ── */
  const logoutUser = () => { void logoutServer().finally(() => window.location.reload()); };
  const updateUserProfile = (updates: Partial<UserProfile>) => {
    const u: Record<string, unknown> = {};
    for (const k of ['displayName', 'avatar', 'avatarImage', 'avatarNft', 'bio', 'facilityName', 'role'] as const) if (k in updates) u[k] = updates[k] ?? null;
    void onProfile(u).then((done) => { if (done) showNotification(tr('Perfil de cultivador actualizado con éxito.'), 'success'); });
  };

  /* ── derived numbers ── */
  const careInfo = {
    rating: Math.round(s.care.rating),
    cleanReadyInHours: Math.max(0, USE.cleanCooldownHours - (now - s.care.lastCleanAt) / 3600000),
    pests: pestCount(indoorPlants),
    plotPests: plots.reduce((n, pl) => n + pestCount(pl.plants), 0),
    males: maleCount(indoorPlants),
    plotMales: plots.reduce((n, pl) => n + maleCount(pl.plants), 0),
    pollinated: indoorPlants.filter((p) => p.pollinated).length + plots.reduce((n, pl) => n + pl.plants.filter((p) => p.pollinated).length, 0),
    garbage: garbageOf(s.assets).length,
    gardenerLevel: gardenerLevelOf(s.assets),
    gardenerDays: stockOf(s.assets, 'service'),
  };
  const resources = (() => {
    const { kwhPerDay, solarKwhPerDay } = powerDraw(equipStats, indoorPlants[0], { autoClimate: simEnv.autoClimate, autoWater: simEnv.autoWater });
    const energy = stockOf(s.assets, 'energy');
    const net = kwhPerDay - solarKwhPerDay;
    return { water: stockOf(s.assets, 'water'), nutrient: stockOf(s.assets, 'nutrient'), energy, kwhPerDay, solarKwhPerDay, energyDays: net <= 0.001 ? Infinity : energy / net };
  })();
  const staffIn = (role: StaffRole) => {
    const st = snap.staff.find((x) => x.id === snap.staffAssign[role]);
    return st ? { staff: st, working: staffIsActive(st, now) } : null;
  };
  const staffWagesPerDay = STAFF_ROLES.reduce((sum, r) => { const st = snap.staff.find((x) => x.id === snap.staffAssign[r]); return sum + (st ? wageOf(st) : 0); }, 0);
  const shopPrice = (flora: number) => Math.round(flora * (1 - staffMods.shopDiscount));
  const plotsForSale = (region: RegionId): { offers: PlotOffer[]; left: number } => {
    const o = snap.offers?.[region];
    return o ? { offers: o.ids.map((id) => plotOffer(region, Number(id.split('-').pop()))), left: o.left } : { offers: [], left: 0 };
  };
  const quoteSale = (productId: string) => {
    const prod = s.products.find((p) => p.id === productId);
    if (!prod) return null;
    const per = prod.marketValueFlora / Math.max(0.01, prod.quantityGrams);
    const sale = saleRevenue(per, prod.quantityGrams, snap.depth as Depth, now);
    const gross = Math.round(sale.revenue * (1 + staffMods.sellBonus));
    const fee = Math.max(1, Math.round(gross * burnRateOfSale(snap.tier)));
    return { gross, fee, net: gross - fee, ratio: prod.marketValueFlora > 0 ? gross / prod.marketValueFlora : 1 };
  };

  /* ── server-only actions (awaited) ── */
  const openChest = async (id: ChestId, currency: 'FLORA' | 'SOL' = 'FLORA') => {
    const r = await send<{ designId: string; isNew: boolean; refund: number; owned: { designId: string; count: number; firstAt: number; serial: number } }>('openChest', { chestId: id, currency });
    if (!r) return null;
    const design = DESIGN_BY_ID[r.designId];
    return { design, isNew: r.isNew, refund: r.refund, owned: { ...r.owned, mint: mintAddressFor(`av-${design.id}`) } };
  };

  const value: GameContextType = {
    walletAddress: wallet.walletAddress, isWalletConnected: wallet.isWalletConnected, solanaNetwork: wallet.solanaNetwork, setSolanaNetwork,
    connectedWalletType: wallet.connectedWalletType, connectWallet, connectSpecificWallet, generateVirtualKeypair, signAuthMessageTest, refreshLiveBalance, disconnectWallet,
    floraBalance: snap.flora, solBalance: s.solBalance, totalFloraBurned: s.totalFloraBurned, burnStats: s.burnStats, transactions: s.transactions, requestAirdrop,
    ledgerOn: online, myListings: snap.listings ?? [], gifts: snap.gifts ?? [], p2pInfo: snap.p2p,
    openGift: (giftId) => send('openGift', { giftId }),
    listNft: async (ref, price) => (await send('listNft', { ...ref, price })) !== null,
    cancelListing: async (listingId) => (await send('cancelListing', { listingId })) !== null,
    buyListing: async (listingId) => {
      const r = await send<{ kind: ListingView['kind']; nftId: string; price: number; fee: number; data: Record<string, unknown> }>('buyListing', { listingId });
      return r ? { id: listingId, nftId: r.nftId, kind: r.kind, rarity: '', price: r.price, createdAt: 0, sellerId: 0, data: r.data } : null;
    },
    claimDaily: async () => { await send('claimDaily'); },
    faucetAt: snap.faucetAt, quoteSale,

    currentUser, isAuthenticated: true, logoutUser, updateUserProfile,

    facilities, currentFacility,
    upgradeFacility: async (facilityId) => { await send('upgradeFacility', { facilityId }); },
    construction: snap.construction,
    speedUpConstruction: async () => (await send('speedUpConstruction')) !== null,
    staff: snap.staff, staffAssign: snap.staffAssign, staffPity: snap.staffPity, staffMods, shopPrice, staffIn,
    hireCandidate: (c) => send<StaffNft>('hireCandidate', { candidateId: c.id }),
    openStaffChest: (id) => send<StaffNft>('openStaffChest', { chestId: id }),
    assignStaff: async (role, staffId) => { await send('assignStaff', { role, staffId }); },
    rankUpStaff: async (staffId) => (await send('rankUpStaff', { staffId })) !== null,
    staffWagesPerDay,
    strains, activePlant, indoorPlants, selectedPlantIndex,
    selectPlant: (i) => { if (i >= 0 && i < indoorPlants.length) ui.setSelectedPlantIndex(i); },
    waterAllPlants: () => { act('waterAllPlants'); },
    feedAllPlants: () => { act('feedAllPlants'); },
    harvestAllReadyPlants: () => { act('harvestAllReadyPlants'); },
    speedUpIndoorRoom: () => ok(act('speedUpIndoorRoom')),
    trainIndoorCanopy: () => { act('trainIndoorCanopy'); },
    plantNewSeed: (strain) => { act('plantNewSeed', { idx, strainId: strain.id }); },
    waterPlant: () => { act('waterPlant', { idx }); },
    feedNutrients: () => { act('feedNutrients', { idx }); },
    setTemperature: (temp) => { act('setTemperature', { idx, temp }); },
    setHumidity: (rh) => { act('setHumidity', { idx, rh }); },
    setPpfd: (ppfd) => { act('setPpfd', { ppfd }); },
    setLightSchedule: (schedule) => { act('setLightSchedule', { schedule }); },
    trainPlant: (technique) => ok(act('trainPlant', { idx, technique })),
    speedUpGrowth: () => ok(act('speedUpGrowth', { idx })),
    harvestPlant: () => { act('harvestPlant', { idx }); },

    rawFlowerGrams: inv.flower, trimGrams: inv.trim, materials: inv.materials as Materials, forgeJobs: snap.forgeJobs ?? [],
    forgeCraft: (recipeId, qty) => ok(act('forgeCraft', { recipeId, qty })),
    breedingJobs: s.breedingJobs, breedingLog: s.breedingLog,
    crossBreed: (motherId, fatherId, name, useReagent) => ok(act('crossBreed', { motherId, fatherId, name, useReagent })),
    processedProducts: s.products, machines,
    processRawFlower: (type, grams) => ok(act('processRawFlower', { type, grams })),
    runLabProcess: (spec) => act('runLabProcess', { recipeId: spec.recipeId, grams: spec.grams }).result as ProcessedProduct | null,
    getPlantEta: (plant) => etaSeconds(plant, simEnv),
    certifyProduct: (productId) => act('certifyProduct', { productId }).result as ProcessedProduct | null,
    repairMachine: (machineId) => ok(act('repairMachine', { machineId })),

    patents: s.patents,
    breedStrains: (a, b, name) => act('breedStrains', { parentAId: a.id, parentBId: b.id, name }).result as Strain | null,
    registerPatent: (strain) => ok(act('registerPatent', { strainId: strain.id, wallet: wallet.walletAddress })),

    seedBank, seedInventory: s.seedInventory,
    buySeed: (seedId, currency = 'FLORA') => ok(act('buySeed', { seedId, currency })),
    plantFromSeedBank: (seedId) => ok(act('plantFromSeedBank', { idx, seedId })),
    suppliesMarket,
    buySupply: (supplyId, currency = 'FLORA') => ok(act('buySupply', { supplyId, currency, idx })),

    assets: s.assets, equipStats, resources,
    buyAsset: (catalogId, currency = 'FLORA', qty = 1) => ok(act('buyAsset', { catalogId, currency, qty })),
    setAssetEquipped: (assetId, equipped) => { act('setAssetEquipped', { assetId, equipped }); },
    repairAsset: (assetId) => ok(act('repairAsset', { assetId })),
    ownsStation: (stationId) => ownsStation(s.assets, stationId),

    missions: s.missions,
    reportEvent: (event) => { if (UI_EVENTS.has(event)) act('reportEvent', { event }); },
    claimStoryMission: (id) => act('claimStoryMission', { id }).result as string | null,
    claimErrandMission: (npc) => act('claimErrandMission', { npc }).result as string | null,
    tutorial: s.tutorial,
    startTutorial: () => { act('startTutorial'); },
    claimTutorialStep: () => act('claimTutorialStep').result as string | null,
    skipTutorialStep: () => { act('skipTutorialStep'); },
    patchTutorial: (p) => { act('patchTutorial', p); },
    care: careInfo,
    treatPests: (scope, plotId) => { act('treatPests', { scope, idx, plotId }); },
    cleanRoom: () => ok(act('cleanRoom')),
    recycleGarbage: () => { act('recycleGarbage'); },

    plots, plotsForSale,
    buyPlot: async (offerId, currency = 'FLORA') => (await send('buyPlot', { offerId, currency })) !== null,
    plantPlot: (plotId, seedId, count) => ok(act('plantPlot', { plotId, seedId, count, brand: ui.selectedNutrientBrand })),
    waterPlot: (plotId, all = false) => { act('waterPlot', { plotId, all }); },
    feedPlot: (plotId) => { act('feedPlot', { plotId }); },
    harvestPlot: (plotId) => { act('harvestPlot', { plotId }); },
    plotEta: (plot, plant) => plotEtaSeconds(plant, plot.region, plot.ratings),
    removeMales: (plotId) => { act('removeMales', { plotId }); },
    avatars, chestPity: snap.avatarPity, showNotification, openChest,
    equipAvatar: (designId) => { act('equipAvatar', { designId }); },
    keepMaleAsFather: (plotId, slot) => { act('keepMaleAsFather', { plotId, slot }); },

    nutrientBrands: NUTRIENT_BRANDS_DATABASE, selectedNutrientBrand: ui.selectedNutrientBrand, setSelectedNutrientBrand: ui.setSelectedNutrientBrand,
    applyNutrientStage: (stageIndex) => { act('applyNutrientStage', { idx, brandId: ui.selectedNutrientBrand, stageIndex }); },
    applyFertigation: (f) => ok(act('applyFertigation', { idx, scope: f.scope, mix: f.mix, stage: f.stage, medium: f.medium, label: f.label, brandName: f.brandName })),
    quizCorrect: (symptomId) => { act('quizXp', { symptomId, answer: symptomId }); },
    claimChallenge: (challengeId, mix) => ok(act('challengeXp', { challengeId, mix })),
    ufoCaught: () => (act('ufoCaught').result as number | null) ?? 0,

    currentRoom: s.currentRoom,
    switchGrowRoom: (roomId) => { act('switchGrowRoom', { idx, roomId }); },
    co2Ppm: s.co2Ppm,
    setCo2Ppm: (ppm) => { act('setCo2Ppm', { idx, ppm }); },
    autoWaterActive: s.autoWaterActive, toggleAutoWater: () => { act('toggleAutoWater'); },
    autoClimateActive: s.autoClimateActive, toggleAutoClimate: () => { act('toggleAutoClimate'); },
    calibrateMeter: (meter) => { act('calibrateMeter', { meter }); },

    mothersFathers: s.mothersFathers,
    saveCurrentPlantAsMotherOrFather: (role) => ok(act('saveCurrentPlantAsMotherOrFather', { idx, role })),
    takeCloneFromMother: (motherId) => ok(act('takeCloneFromMother', { motherId, idx })),
    collectPollenFromFather: (fatherId) => (act('collectPollenFromFather', { fatherId }).result as number | null) ?? 0,
    hybridizeParents: (motherId, fatherId, name) => act('hybridizeParents', { motherId, fatherId, name }).result as Strain | null,

    brand: s.brand,
    updateBrand: (name, tagline) => { act('updateBrand', { name, tagline }); },
    sellProduct: (productId) => { act('sellProduct', { productId }); },
    v2pItems,
    redeemV2p: (item, d) => ok(act('redeemV2p', { itemId: item.id, name: d.name, country: d.country })),
    redeemedV2pList: s.redeemed,

    playerLevel: s.playerLevel, playerXp: s.playerXp, xpNeeded: XP_NEEDED(s.playerLevel), rankTitle: rankTitleOf(s.playerLevel), quests,
    claimQuestReward: (questId) => { void send('claimQuestReward', { questId }); },
    executeManualRosinPress: (yieldBonus, _quality, isCritical) => { if (yieldBonus > 0) act('executeManualRosinPress', { result: isCritical ? 'critical' : 'good' }); },

    soundEnabled: ui.sound,
    toggleSound: () => { const next = !ui.sound; ui.setSound(next); setSoundEnabled(next); },
    notification: ui.notification, clearNotification: ui.clearNotification,
  };

  // the functions keep their identity between renders (screens use them in effects), and always call the latest version
  const latest = useRef(value); latest.current = value;
  const stable = useRef<Record<string, (...a: unknown[]) => unknown>>({});
  const out = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(value)) {
    out[k] = typeof v === 'function' ? (stable.current[k] ??= (...a: unknown[]) => ((latest.current as unknown as Record<string, (...x: unknown[]) => unknown>)[k])(...a)) : v;
  }

  return (
    <GameContext.Provider value={out as unknown as GameContextType}>
      {children}
      {!online && (
        <div role="status" className="fixed top-2 left-1/2 -translate-x-1/2 z-[500] px-3 py-1.5 rounded-full bg-amber-400/95 text-neutral-950 text-xs font-bold shadow-lg flex items-center gap-1.5">
          <WifiOff className="w-3.5 h-3.5" /> {tr('Sin conexión, reintentando…')}
        </div>
      )}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};

/** The hire working in a role (or assigned but unpaid), for the characters' portraits. Safe outside the provider (returns null). */
export const useAssignedStaff = (role: StaffRole): { staff: StaffNft; working: boolean } | null => {
  const c = useContext(GameContext);
  return c ? c.staffIn(role) : null;
};

export { CATALOG_BY_ID };
