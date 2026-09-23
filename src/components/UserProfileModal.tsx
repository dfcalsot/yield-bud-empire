import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  User, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  Wallet, 
  Award, 
  Flame, 
  Dna, 
  X, 
  Check, 
  ExternalLink,
  Cpu,
  Sparkles,
  Users
} from 'lucide-react';
import { SOLANA_NETWORKS } from '../utils/solana';
import { t } from '../i18n';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSwitchAccounts: () => void;
  onOpenWalletModal: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenSwitchAccounts,
  onOpenWalletModal
}) => {
  const {
    currentUser,
    playerLevel,
    playerXp,
    xpNeeded,
    rankTitle,
    floraBalance,
    solBalance,
    totalFloraBurned,
    patents,
    walletAddress,
    isWalletConnected,
    solanaNetwork,
    updateUserProfile,
    logoutUser
  } = useGame();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [facilityName, setFacilityName] = useState(currentUser?.facilityName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');

  if (!isOpen || !currentUser) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      displayName: displayName.trim(),
      facilityName: facilityName.trim(),
      bio: bio.trim()
    });
    setIsEditing(false);
  };

  const handleLogout = () => {
    logoutUser();
    onClose();
  };

  const netConfig = SOLANA_NETWORKS[solanaNetwork];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="hud-panel max-w-md w-full p-5 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-serif tracking-wide">{t('Perfil de Cultivador')}</h3>
              <p className="text-[10px] text-neutral-400 font-mono">{t('Datos y estado personal aislados')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card Header */}
        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-3.5">
          <div className="hud-panel text-4xl p-2 shrink-0">
            {currentUser.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white truncate">{currentUser.displayName}</h4>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-semibold shrink-0">
                {t(currentUser.role)}
              </span>
            </div>
            <p className="text-xs text-neutral-400 truncate">@{currentUser.username}</p>
            <p className="text-[11px] text-neutral-500 font-mono truncate">{currentUser.facilityName}</p>
          </div>
        </div>

        {/* Progress & Stats */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
            <span className="text-[10px] text-neutral-500 uppercase font-mono block">{t('Rango & Nivel')}</span>
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Nv. {playerLevel} • {rankTitle}</span>
            </div>
            <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-amber-400 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round((playerXp / (xpNeeded || 1)) * 100))}%` }}
              ></div>
            </div>
            <span className="text-[9px] text-neutral-400 font-mono block text-right">{playerXp} / {xpNeeded} XP</span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
            <span className="text-[10px] text-neutral-500 uppercase font-mono block">{t('Patentes & Quema')}</span>
            <div className="flex items-center gap-1 text-emerald-400 font-bold">
              <Dna className="w-3.5 h-3.5" />
              <span>{t('{length} Registradas', { length: patents.length })}</span>
            </div>
            <div className="flex items-center gap-1 text-amber-400 font-mono text-[11px]">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>{totalFloraBurned.toLocaleString()} $FLORA</span>
            </div>
          </div>
        </div>

        {/* Edit or View Profile Bio */}
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-300">{t('Nombre Visible')}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-300">{t('Instalación de Cultivo')}</label>
              <input
                type="text"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-300">{t('Biografía')}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-1.5 bg-emerald-500 text-neutral-950 font-bold text-xs rounded-lg hover:bg-emerald-400 transition cursor-pointer shadow-[0_0_16px_-4px_rgba(52,211,153,0.6)]"
              >
                {t('Guardar Cambios')}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 bg-neutral-800 text-neutral-300 text-xs rounded-lg hover:bg-neutral-700 transition cursor-pointer"
              >
                {t('Cancelar')}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono text-neutral-500">{t('Biografía & Notas')}</span>
              <button
                onClick={() => setIsEditing(true)}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 transition cursor-pointer font-medium"
              >
                {t('Editar Perfil')}
              </button>
            </div>
            <p className="text-xs text-neutral-300 italic leading-relaxed">
              "{currentUser.bio || t('Sin biografía establecida.')}"
            </p>
          </div>
        )}

        {/* Linked Wallet & Solana Network */}
        <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] uppercase font-mono text-neutral-500 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-purple-400" />
              {t('Billetera Vinculada')}
            </span>
            <button
              onClick={onOpenWalletModal}
              className="text-[10px] text-purple-400 hover:text-purple-300 font-mono underline cursor-pointer"
            >
              {t('Configurar Red & Wallets')}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-neutral-200 truncate">
              {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}` : t('No conectada')}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono text-white ${netConfig.badgeColor}`}>
              {netConfig.badgeLabel}
            </span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-1 gap-2 border-t border-neutral-800">
          <button
            onClick={onOpenSwitchAccounts}
            className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 hover:text-white font-medium text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('Cambiar de Usuario')}</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-2 bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 text-red-400 hover:text-red-300 font-medium text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('Salir')}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
