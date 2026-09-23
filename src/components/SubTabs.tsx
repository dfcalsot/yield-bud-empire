import React from 'react';
import { NAV_TABS, groupOfTab } from '../nav';
import { t } from '../i18n';

interface SubTabsProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

/** Segmented switch between the tabs of the active dock group (hidden for single-tab groups). */
export const SubTabs: React.FC<SubTabsProps> = ({ currentTab, setCurrentTab }) => {
  const group = groupOfTab(currentTab);
  if (group.tabs.length < 2) return null;

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-900/70 border border-emerald-400/15 w-fit max-w-full overflow-x-auto scrollbar-none">
      {group.tabs.map((id) => {
        const tab = NAV_TABS[id];
        const Icon = tab.icon;
        const isActive = id === currentTab;
        return (
          <button
            key={id}
            data-tour={`subtab-${id}`}
            onClick={() => setCurrentTab(id)}
            className={`flex items-center gap-2 whitespace-nowrap px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition cursor-pointer ${
              isActive
                ? 'bg-emerald-400/15 text-emerald-200 border border-emerald-300/40 shadow-[0_0_14px_rgba(52,211,153,0.3)]'
                : 'text-neutral-400 hover:text-emerald-200 border border-transparent'
            }`}
          >
            <Icon className="w-4 h-4" />
            {t(tab.label)}
          </button>
        );
      })}
    </div>
  );
};
