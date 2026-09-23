import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Wallet, 
  Sparkles, 
  ExternalLink, 
  Copy, 
  Check, 
  Coins, 
  RefreshCw, 
  LogOut, 
  Cpu,
  ShieldCheck,
  Globe,
  Flame,
  CheckCircle2,
  Key,
  ChevronRight,
  AlertCircle,
  Radio
} from 'lucide-react';
import { SolanaNetwork } from '../types';
import { SOLANA_NETWORKS, detectSolanaProviders } from '../utils/solana';
import { t } from '../i18n';

interface SolanaWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuthModal?: () => void;
}

export const SolanaWalletModal: React.FC<SolanaWalletModalProps> = ({ 
  isOpen, 
  onClose,
  onOpenAuthModal 
}) => {
  const {
    walletAddress,
    isWalletConnected,
    solanaNetwork,
    setSolanaNetwork,
    connectedWalletType,
    connectSpecificWallet,
    generateVirtualKeypair,
    signAuthMessageTest,
    refreshLiveBalance,
    disconnectWallet,
    floraBalance,
    solBalance,
    requestAirdrop,
    loginWithSolanaWallet,
    currentUser
  } = useGame();

  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [generatedSecretKey, setGeneratedSecretKey] = useState<string | null>(null);

  const providers = detectSolanaProviders();
  const currentNetworkConfig = SOLANA_NETWORKS[solanaNetwork];

  useEffect(() => {
    if (isOpen && isWalletConnected) {
      refreshLiveBalance();
    }
  }, [isOpen, isWalletConnected, solanaNetwork, refreshLiveBalance]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    await refreshLiveBalance();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleAirdrop = async () => {
    setIsAirdropping(true);
    await requestAirdrop();
    setIsAirdropping(false);
  };

  const handleSignTest = async () => {
    setIsSigning(true);
    await signAuthMessageTest();
    setIsSigning(false);
  };

  const handleGenerateVirtual = () => {
    const kp = generateVirtualKeypair();
    setGeneratedSecretKey(kp.secretKeyHex);
  };

  const handleWeb3LoginClick = () => {
    loginWithSolanaWallet();
    onClose();
  };

  const explorerUrl = `https://explorer.solana.com/address/${walletAddress}${currentNetworkConfig.explorerCluster}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="hud-panel max-w-lg w-full p-5 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 via-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-purple-950">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2 font-serif tracking-wide">
                {t('Conexión Solana Web3')}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono text-white ${currentNetworkConfig.badgeColor}`}>
                  {currentNetworkConfig.badgeLabel}
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                {t('Soporte para Red Oficial (Mainnet), Devnet, Testnet y cualquier wallet')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* NETWORK SWITCHER TABS (Mainnet Oficial, Devnet, Testnet) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              {t('Seleccionar Red Solana:')}
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {t('RPC: {name}', { name: currentNetworkConfig.name })}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 bg-neutral-950 p-1.5 rounded-2xl border border-neutral-800">
            {(['mainnet-beta', 'devnet', 'testnet'] as SolanaNetwork[]).map((netKey) => {
              const cfg = SOLANA_NETWORKS[netKey];
              const isSelected = solanaNetwork === netKey;
              return (
                <button
                  key={netKey}
                  type="button"
                  onClick={() => setSolanaNetwork(netKey)}
                  className={`py-2 px-2 rounded-xl text-xs font-medium transition cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
                    isSelected
                      ? `${cfg.badgeColor} text-white font-bold shadow-md shadow-emerald-950/40`
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : cfg.badgeColor}`}></span>
                    <span className="truncate">{cfg.badgeLabel}</span>
                  </div>
                  <span className="text-[9px] opacity-80 font-mono">
                    {cfg.isOfficial ? t('Oficial ($)') : t('Pruebas')}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-neutral-400 px-1 italic">
            {t(currentNetworkConfig.description)}
          </p>
        </div>

        {isWalletConnected ? (
          /* CONNECTED STATE */
          <div className="space-y-4">
            {/* Public Address Card */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono text-neutral-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {t('Billetera Conectada ({connectedWalletType})', { connectedWalletType })}
                </span>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono transition"
                >
                  <span>{t('Explorer')}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center justify-between gap-2 bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800">
                <span className="font-mono text-xs text-neutral-200 truncate">
                  {walletAddress}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition cursor-pointer shrink-0"
                  title={t('Copiar clave pública')}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Balances Display */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase">{t('Saldo SOL ({badgeLabel})', { badgeLabel: currentNetworkConfig.badgeLabel })}</span>
                  <button
                    onClick={handleRefreshBalance}
                    disabled={isRefreshing}
                    className="text-neutral-400 hover:text-white p-0.5 cursor-pointer disabled:opacity-50"
                    title={t('Actualizar saldo desde RPC')}
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
                  </button>
                </div>
                <span className="text-lg font-bold text-purple-400 font-mono block">
                  {solBalance.toFixed(3)} SOL
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">{t('Gas de red para firmas')}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase block">{t('Saldo $FLORA')}</span>
                <span className="text-lg font-bold text-emerald-400 font-mono block">
                  {floraBalance.toLocaleString()} $FLORA
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">{t('Token Botánico SPL')}</span>
              </div>
            </div>

            {/* Faucet Claim / Airdrop (Active on Devnet & Testnet) */}
            {solanaNetwork !== 'mainnet-beta' ? (
              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('Faucet de Fondos {badgeLabel}', { badgeLabel: currentNetworkConfig.badgeLabel })}
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    {t('Solicita 1.0 SOL y +500 $FLORA de prueba para acelerar cultivos y patentar genéticas.')}
                  </p>
                </div>

                <button
                  onClick={handleAirdrop}
                  disabled={isAirdropping}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAirdropping ? 'animate-spin' : ''}`} />
                  <span>{isAirdropping ? t('Solicitando...') : t('+1 SOL & +500 FLORA')}</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-[11px] text-amber-200">
                  {t('Estás en')}{' '}<strong>{t('Solana Mainnet Oficial')}</strong>{t('. Tus transacciones e identificadores interactúan con la red principal.')}
                </p>
              </div>
            )}

            {/* Cryptographic Verification Test & Link to User Profile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleSignTest}
                disabled={isSigning}
                className="py-2.5 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 text-neutral-200 text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>{isSigning ? t('Firmando...') : t('Firmar Mensaje Auth')}</span>
              </button>

              <button
                type="button"
                onClick={handleWeb3LoginClick}
                className="py-2.5 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5 text-purple-400" />
                <span>{t('Ingresar con esta Wallet')}</span>
              </button>
            </div>

            {/* If Virtual Keypair: Reveal private key toggle */}
            {connectedWalletType === 'Virtual Keypair' && (
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono text-amber-400 flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    {t('Clave Secreta Ed25519 (Billetera de Laboratorio)')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer"
                  >
                    {showSecretKey ? t('Ocultar') : t('Ver Clave Privada')}
                  </button>
                </div>

                {showSecretKey && (
                  <div className="p-2 bg-neutral-900 rounded-lg font-mono text-[10px] text-amber-300 break-all select-all">
                    {generatedSecretKey || t('Keypair cargada en memoria segura de sesión.')}
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-2 flex justify-between items-center text-xs font-mono border-t border-neutral-800">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${currentNetworkConfig.badgeColor}`}></span>
                {t('Solana {badgeLabel} Activo', { badgeLabel: currentNetworkConfig.badgeLabel })}
              </span>
              <button
                onClick={disconnectWallet}
                className="text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('Desconectar')}</span>
              </button>
            </div>
          </div>
        ) : (
          /* DISCONNECTED STATE: SHOW WALLET PROVIDERS */
          <div className="space-y-4">
            <p className="text-xs text-neutral-400">
              {t('Conecta tu billetera Solana preferida (Phantom, Solflare, Backpack o cualquier extensión compatible) o genera una billetera virtual instantánea para interactuar con la red.')}
            </p>

            <div className="space-y-2">
              {providers.map((p) => {
                return (
                  <div
                    key={p.id}
                    onClick={() => connectSpecificWallet(p.id)}
                    className="p-3 rounded-2xl bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 transition cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-purple-400 group-hover:text-emerald-400 transition">
                        {p.id === 'virtual' ? <Key className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                            {t(p.name)}
                          </h4>
                          {p.isDetected && p.id !== 'virtual' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {t('Detectada')}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 leading-tight">
                          {t(p.description)}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition shrink-0" />
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-center text-neutral-500 text-[11px] font-mono">
              {t('La conexión es no-custodial. Las claves privadas nunca salen de tu dispositivo o extensión.')}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
