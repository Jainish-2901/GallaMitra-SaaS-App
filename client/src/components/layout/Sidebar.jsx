import React from 'react';
import { useContext } from 'react';
import { AppContext } from '../../context/AppContext.jsx';
import { translations } from '../../utils/translations.js';
import { ownerTabs } from '../../sidebarConfig.js';
import { LogOut, Briefcase, Store } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, setSearchTerm }) {
  const { activeShop, terminateSessionLogout } = useContext(AppContext);
  const activeLang = activeShop?.language || 'gu';
  const t = translations[activeLang] || translations.en;

  return (
    <aside className="hidden md:flex w-72 lg:w-80 bg-white border-r border-slate-200 flex-col overflow-hidden shrink-0 shadow-sm">

      {/* Owner Tabs Navigation */}
      <div className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {(() => {
          const allowed = activeShop?.allowedTabs || [];
          const allowedTabsList = ownerTabs.filter(tab => {
            if (tab.id === 'dashboard') return true;
            return allowed.includes(tab.id);
          });
          return (
            <>
              {allowedTabsList.map(tab => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`sidebar-tab-${tab.id}`}
                    onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all group ${isActive
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <TabIcon
                      size={15}
                      className={isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-600'}
                    />
                    <span className="truncate">{t[tab.id] || tab.label}</span>
                  </button>
                );
              })}
            </>
          );
        })()}
      </div>

      {/* Logout Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60">
        <button
          id="sidebar-logout-btn"
          onClick={terminateSessionLogout}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all font-bold py-2 rounded-xl text-xs"
        >
          <LogOut size={13} /> {t.closeSession}
        </button>
      </div>
    </aside>
  );
}
