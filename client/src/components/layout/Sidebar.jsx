import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext.jsx';
import { translations } from '../../utils/translations.js';
import { ownerTabs } from '../../sidebarConfig.js';
import { LogOut, Briefcase, Store, Clock, ChevronDown } from 'lucide-react';



export function SidebarMenu({ activeTab, setActiveTab, setSearchTerm, activeShop, t, isMobile = false, onCloseMobile }) {
  const allowed = activeShop?.allowedTabs || [];
  const allowedTabsList = ownerTabs.filter(tab => {
    if (tab.id === 'dashboard') return true;
    return allowed.includes(tab.id);
  });

  // Group tabs dynamically by their tab.group property
  const tabGroups = {};
  allowedTabsList.forEach(tab => {
    const grp = tab.group || 'General';
    if (!tabGroups[grp]) tabGroups[grp] = [];
    tabGroups[grp].push(tab);
  });

  // State to track collapsed/expanded status of groups
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Automatically expand the group containing the active tab when activeTab changes
  useEffect(() => {
    const activeTabObj = ownerTabs.find(tab => tab.id === activeTab);
    if (activeTabObj?.group) {
      setCollapsedGroups(prev => ({
        ...prev,
        [activeTabObj.group]: false // Expand it
      }));
    }
  }, [activeTab]);

  return (
    <div className={`space-y-3 ${isMobile ? '' : 'flex-1'}`}>
      {Object.entries(tabGroups).map(([groupName, tabs]) => {
        const isCollapsed = collapsedGroups[groupName];
        return (
          <div key={groupName} className="space-y-1">
            {/* Group Title / Collapse Button */}
            <button
              type="button"
              onClick={() => toggleGroup(groupName)}
              className="w-full flex items-center justify-between px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 font-mono transition-colors focus:outline-none"
            >
              <span>{groupName}</span>
              <ChevronDown
                size={11}
                className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                  isCollapsed ? '-rotate-90' : 'rotate-0'
                }`}
              />
            </button>

            {/* Group Nav Items */}
            {!isCollapsed && (
              <div className="space-y-0.5">
                {tabs.map(tab => {
                  const TabIcon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      id={`sidebar-tab-${tab.id}`}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSearchTerm('');
                        if (isMobile && onCloseMobile) onCloseMobile();
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all group sidebar-tab-btn cursor-pointer ${isActive
                        ? 'bg-[#0F172A] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                        }`}
                    >
                      <TabIcon
                        size={14}
                        className={isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-600'}
                      />
                      <span className="truncate">{t[tab.id] || tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Sidebar({ activeTab, setActiveTab, setSearchTerm }) {
  const { activeShop, terminateSessionLogout } = useContext(AppContext);
  const activeLang = activeShop?.language || 'gu';
  const t = translations[activeLang] || translations.en;

  return (
    <aside className="hidden md:flex w-64 lg:w-72 xl:w-80 bg-white border-r border-slate-200 flex-col overflow-hidden shrink-0 shadow-sm">
      {/* Owner Tabs Navigation */}
      <div className="flex-1 p-3.5 overflow-y-auto">
        <SidebarMenu
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setSearchTerm={setSearchTerm}
          activeShop={activeShop}
          t={t}
          isMobile={false}
        />
      </div>

      {/* Trial Expiry Countdown Widget */}
      {activeShop?.plan === 'trial' && (
        <div className="mx-3 my-2.5 p-3.5 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border border-blue-100 rounded-2xl shadow-xs space-y-2.5 sidebar-trial-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-blue-600 animate-pulse" />
              <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Free Trial</span>
            </div>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-full font-mono">
              {(() => {
                const expires = activeShop?.subscriptionExpiresAt;
                if (!expires) return '15d left';
                const left = Math.ceil((new Date(expires) - new Date()) / (1000 * 60 * 60 * 24));
                const days = left > 0 ? left : 0;
                return `${days}d left`;
              })()}
            </span>
          </div>
          
          {/* Progress bar */}
          {(() => {
            const expires = activeShop?.subscriptionExpiresAt;
            if (!expires) return null;
            const left = Math.ceil((new Date(expires) - new Date()) / (1000 * 60 * 60 * 24));
            const daysLeft = left > 0 ? left : 0;
            const daysUsed = Math.max(0, Math.min(15, 15 - daysLeft));
            const percent = Math.round((daysUsed / 15) * 100);
            return (
              <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${percent}%` }}
                />
              </div>
            );
          })()}

          <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
            Access all features of the Professional plan free during your trial.
          </p>

          <button
            onClick={() => {
              setActiveTab('user_settings');
              if (setSearchTerm) setSearchTerm('');
            }}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer"
          >
            Upgrade Now
          </button>
        </div>
      )}

      {/* Logout Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60">
        <button
          id="sidebar-logout-btn"
          onClick={terminateSessionLogout}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all font-bold py-2 rounded-xl text-xs sidebar-logout-btn"
        >
          <LogOut size={13} /> {t.closeSession}
        </button>
      </div>
    </aside>
  );
}
