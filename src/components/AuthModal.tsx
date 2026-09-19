import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  User, 
  Lock, 
  Mail, 
  Sparkles, 
  Wallet, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  Users, 
  UserPlus, 
  LogIn,
  Sprout,
  Award,
  FlaskConical,
  Dna,
  X
} from 'lucide-react';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register' | 'web3';
}

const AVATAR_OPTIONS = ['👨‍🌾', '👩‍🔬', '🌱', '🧪', '⚡', '🧬', '👑', '🛸', '🪴', '🔥'];

const ROLE_OPTIONS = [
  'Master Grower',
  'Breeder Botánico',
  'Genetista Comercial',
  'Inversionista Web3',
  'Principiante Botánico'
] as const;

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialTab = 'login' }) => {
  const {
    currentUser,
    isAuthenticated,
    allUserProfiles,
    loginUser,
    registerUser,
    loginWithSolanaWallet,
    switchUserAccount,
    walletAddress,
    isWalletConnected,
    solanaNetwork
  } = useGame();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'web3'>(initialTab);
  
  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');

  // Register form state
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<UserProfile['role']>('Master Grower');
  const [regAvatar, setRegAvatar] = useState('👨‍🌾');
  const [regFacility, setRegFacility] = useState('Santuario Botánico');
  const [regBio, setRegBio] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim()) return;
    const ok = loginUser(loginIdentifier);
    if (ok) {
      onClose();
    }
  };

  const handleQuickSwitch = (userId: string) => {
    switchUserAccount(userId);
    onClose();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = registerUser({
      username: regUsername.trim().toLowerCase().replace(/\s+/g, '_'),
      displayName: regDisplayName.trim(),
      email: regEmail.trim().toLowerCase() || `${regUsername.trim()}@chronoflora.sol`,
      role: regRole,
      avatar: regAvatar,
      facilityName: regFacility.trim() || 'Mi Jardín Botánico',
      bio: regBio.trim() || 'Cultivador apasionado de genéticas botánicas en Solana.',
      experienceLevel: 1,
      preferredNetwork: solanaNetwork,
      walletAddress: isWalletConnected ? walletAddress : undefined
    });

    if (ok) {
      onClose();
    }
  };

  const handleWeb3Login = () => {
    const ok = loginWithSolanaWallet();
    if (ok) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-950">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                Acceso de Cultivador
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-md font-mono">
                  Multi-Usuario
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Cada usuario tiene sus plantas, semillas, equipos y tokens aislados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-1.5 bg-neutral-950 p-1.5 rounded-2xl border border-neutral-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`py-2 px-2.5 rounded-xl font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Ingresar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`py-2 px-2.5 rounded-xl font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Crear Cuenta</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('web3')}
            className={`py-2 px-2.5 rounded-xl font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'web3'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-purple-400" />
            <span>Solana 1-Click</span>
          </button>
        </div>

        {/* TAB 1: LOGIN */}
        {activeTab === 'login' && (
          <div className="space-y-4">
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                  <span>Usuario, Correo o Clave Pública Solana</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="ej. satoshi_grower o satoshi@chronoflora.sol"
                    className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Ingresar a Mi Cultivo</span>
              </button>
            </form>

            {/* Quick Demo Accounts Selection */}
            <div className="pt-2 border-t border-neutral-800 space-y-2">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                Cambio Rápido de Cuenta (Cuentas Demostrativas con datos separados)
              </span>

              <div className="grid grid-cols-1 gap-2">
                {allUserProfiles.map((user) => {
                  const isCurrent = currentUser?.id === user.id && isAuthenticated;
                  return (
                    <div
                      key={user.id}
                      onClick={() => handleQuickSwitch(user.id)}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-emerald-950/30 border-emerald-500/40 ring-1 ring-emerald-500/30'
                          : 'bg-neutral-950 hover:bg-neutral-850 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl p-1 bg-neutral-900 rounded-xl border border-neutral-800">{user.avatar}</span>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white truncate">{user.displayName}</span>
                            {isCurrent && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-semibold">
                                Activo
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-400 truncate">
                            @{user.username} • <span className="text-neutral-300 font-medium">{user.role}</span> (Nv. {user.experienceLevel || 1})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono text-neutral-500 hidden sm:inline truncate max-w-[90px]">
                          {user.facilityName}
                        </span>
                        <button
                          type="button"
                          className={`text-xs px-2 py-1 rounded-lg font-medium ${
                            isCurrent
                              ? 'bg-emerald-500 text-neutral-950 font-bold'
                              : 'bg-neutral-800 text-neutral-300 hover:bg-emerald-500/20 hover:text-emerald-300'
                          }`}
                        >
                          {isCurrent ? 'Actual' : 'Entrar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTER */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-neutral-300">Nombre de Cultivador</label>
                <input
                  type="text"
                  value={regDisplayName}
                  onChange={(e) => setRegDisplayName(e.target.value)}
                  placeholder="ej. Mateo Botánico"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-neutral-300">Nombre de Usuario (@handle)</label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="ej. mateo_grow"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-neutral-300">Correo Electrónico</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="mateo@ejemplo.com"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-neutral-300">Rol de Cultivo</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Avatar Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-neutral-300">Selecciona tu Avatar Botánico</label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setRegAvatar(av)}
                    className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center transition cursor-pointer ${
                      regAvatar === av
                        ? 'bg-emerald-500/20 border-2 border-emerald-400 scale-105'
                        : 'bg-neutral-950 border border-neutral-800 hover:bg-neutral-800'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-300">Nombre de tu Instalación de Cultivo</label>
              <input
                type="text"
                value={regFacility}
                onChange={(e) => setRegFacility(e.target.value)}
                placeholder="ej. Armario Biológico 120x120 o Invernadero Solana"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-300">Biografía / Enfoque de Cultivo</label>
              <textarea
                value={regBio}
                onChange={(e) => setRegBio(e.target.value)}
                placeholder="Describe tus metas genéticas o técnicas favoritas de cultivo..."
                rows={2}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Starter Gift Box */}
            <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-[11px] text-neutral-300">
                <strong className="text-emerald-300 font-semibold block">Paquete de Inicio Incluido:</strong>
                +500 $FLORA, +2.0 SOL de prueba, 2 semillas feminizadas y cuarto vegetativo equipado.
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrar e Iniciar mi Jardín</span>
            </button>
          </form>
        )}

        {/* TAB 3: WEB3 1-CLICK SOLANA LOGIN */}
        {activeTab === 'web3' && (
          <div className="space-y-4 py-2 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-500 p-0.5 shadow-xl shadow-purple-950 flex items-center justify-center">
              <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
                <Wallet className="w-7 h-7 text-purple-400" />
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Inicio de Sesión Criptográfico con Solana</h4>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Vincula tu clave pública de Solana (Mainnet, Devnet o Testnet). Tus datos y patentes quedarán firmados bajo tu dirección.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-left space-y-1.5">
              <span className="text-[10px] uppercase font-mono text-neutral-500 block">Billetera Activa Detectada:</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-emerald-400 truncate">
                  {walletAddress}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {solanaNetwork.toUpperCase()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleWeb3Login}
              className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              <span>Autenticar con mi Billetera Solana</span>
            </button>

            <p className="text-[10px] text-neutral-500">
              No requiere contraseña. Si es tu primera vez, se creará un perfil on-chain con 500 $FLORA de bienvenida.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
