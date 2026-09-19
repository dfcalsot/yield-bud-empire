import React from 'react';
import { NAV_GROUPS, NAV_TABS, groupOfTab } from '../nav';

interface DockProps {
  currentTab: string;
  onSelectGroup: (groupId: string) => void;
}

/** Bottom game-style dock: the five primary sections. */
export const Dock: React.FC<DockProps> = ({ currentTab, onSelectGroup }) => {
  const activeGroup = groupOfTab(currentTab);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none">
      <nav
        aria-label="Navegación principal"
        className="pointer-events-auto flex items-end gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-2xl bg-neutral-950/85 backdrop-blur-xl border border-emerald-400/25 shadow-[0_0_30px_-6px_rgba(52,211,153,0.35),0_10px_40px_rgba(0,0,0,0.6)]"
      >
        {NAV_GROUPS.map((group) => {
          const Icon = group.icon;
          const isActive = group.id === activeGroup.id;
          return (
            <button
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              aria-current={isActive ? 'page' : undefined}
              title={group.tabs.map((t) => NAV_TABS[t].label).join(' · ')}
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
                {group.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 h-0.5 w-8 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.9)]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
