import React from 'react';
import { MessageSquare, FolderTree, Search, Settings as SettingsIcon, Activity } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const navs = [
    { id: 'chat', label: 'Chats', icon: <MessageSquare size={18} /> },
    { id: 'vault', label: 'Vault', icon: <FolderTree size={18} /> },
    { id: 'search', label: 'Search', icon: <Search size={18} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} /> },
    { id: 'diagnostics', label: 'Diagnostics', icon: <Activity size={18} /> },
  ];

  return (
    <aside className="w-64 bg-[#1A1B1E] border-r border-[#2A2B2F] flex flex-col">
      <div className="p-4 pt-6 flex-1 space-y-2">
        <p className="text-[10px] uppercase font-semibold text-[#8E9299] px-2 mb-2 tracking-wider">Intelligence</p>
        {navs.map(nav => (
          <button
            key={nav.id}
            onClick={() => setActiveTab(nav.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === nav.id 
                ? 'bg-[#2A2B2F] text-white' 
                : 'text-[#8E9299] hover:bg-[#202124] hover:text-[#E0E0E0]'
            }`}
          >
            {nav.icon}
            {nav.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
