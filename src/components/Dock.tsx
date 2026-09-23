import React from 'react';
import { Briefcase } from 'lucide-react';
import { NAV_GROUPS, NAV_TABS, groupOfTab } from '../nav';
import { useBagCount } from './bag/BriefcaseDrawer';
import { t } from '../i18n';

interface DockProps {
  currentTab: string;
  onSelectGroup: (groupId: string) => void;
  /** the briefcase lives in the dock: always at hand, with a count of what is inside */
  bagOpen?: boolean;
  onToggleBag?: () => void;
}

/** Bottom game-style dock: the primary sections, and the briefcase at the end. */
export const Dock: React.FC<DockProps> = ({ currentTab, onSelectGroup, bagOpen = false, onToggleBag }) => {
  const activeGroup = groupOfTab(currentTab);
  const bagCount = useBagCount();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none">
      <nav
        aria-label={t('Navegación principal')}
        className="pointer-events-auto flex items-end gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-2xl bg-neutral-950/85 backdrop-blur-xl border border-emerald-400/25 shadow-[0_0_30px_-6px_rgba(52,211,153,0.35),0_10px_40px_rgba(0,0,0,0.6)]"
       data-tour="dock">
        {NAV_GROUPS.map((group) => {
          const Icon = group.icon;
          const isActive = group.id === activeGroup.id;
          return (
            <button
              key={group.id}
              data-tour={`dock-${group.id}`}
              onClick={() => onSelectGroup(group.id)}
              aria-current={isActive ? 'page' : undefined}
              title={group.tabs.map((id) => t(NAV_TABS[id].label)).join(' · ')}
              className={`dock-item group relative flex flex-col items-center justify-center gap-1 w-[62px] sm:w-[84px] py-1.5 rounded-xl cursor-pointer transition-all duration-200 ${
                isActive
                  ? 'dock-item-active text-emerald-200 -translate-y-1.5'
                  : 'text-neutral-400 hover:text-emerald-200 hover:-translate-y-0.5'
              }`}
            >
              <span
                className={`relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl border transition ${
                  isActive
                    ? 'bg-emerald-400/15 border-emerald-300/60 shadow-[0_0_18px_rgba(52,211,153,0.55)]'
                    : 'bg-neutral-900/70 border-neutral-700/70 group-hover:border-emerald-400/40'
                }`}
              >
                <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${isActive ? 'drop-shadow-[0_0_6px_rgba(110,231,183,0.9)]' : ''}`} />
              </span>
              <span className="text-[9px] sm:text-[11px] font-semibold tracking-normal sm:tracking-wide uppercase leading-none">
                {t(group.label)}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 h-0.5 w-8 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.9)]" />
              )}
            </button>
          );
        })}
        {onToggleBag && (
          <>
            <span aria-hidden className="self-stretch w-px my-2 bg-white/10" />
            <button
              type="button"
              data-tour="bag"
              data-testid="dock-bag"
              onClick={onToggleBag}
              aria-label={t('Abrir el maletín (tecla I)')}
              aria-pressed={bagOpen}
              title={t('Maletín · inventario y materiales (I)')}
              className={`dock-item group relative flex flex-col items-center justify-center gap-1 w-[62px] sm:w-[84px] py-1.5 rounded-xl cursor-pointer transition-all duration-200 ${bagOpen ? 'text-amber-200 -translate-y-1.5' : 'text-amber-300/80 hover:text-amber-200 hover:-translate-y-0.5'}`}
            >
              <span className={`relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl border transition ${bagOpen ? 'bg-amber-400/20 border-amber-300/70 shadow-[0_0_18px_rgba(251,191,36,0.55)]' : 'bg-amber-950/30 border-amber-400/35 group-hover:border-amber-300/70'}`}>
                <Briefcase className="w-6 h-6 sm:w-7 sm:h-7" />
                <span className="absolute -top-1.5 -right-1.5 min-w-[1.1rem] px-1 rounded-full bg-amber-300 text-neutral-950 text-[9px] font-black leading-[1.1rem] text-center font-mono" data-testid="dock-bag-count">{bagCount > 99 ? '99+' : bagCount}</span>
              </span>
              <span className="text-[9px] sm:text-[11px] font-semibold tracking-normal sm:tracking-wide uppercase leading-none">{t('Maletín')}</span>
              {bagOpen && <span className="absolute -bottom-1 h-0.5 w-8 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />}
            </button>
          </>
        )}
      </nav>
    </div>
  );
};
