import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar/Sidebar';
import { ChatUI } from './Chat/ChatUI';
import { VaultExplorer } from './VaultExplorer/VaultExplorer';
import { SearchUI } from './Search/SearchUI';
import { Settings } from './Settings/Settings';
import { Diagnostics } from './Diagnostics/Diagnostics';
import { localAIEngine } from '../services/localAI/webllm';
import { obsidianService } from '../services/obsidian';
import { storage } from '../storage/indexedDB';
import { AppSettings } from '../types';

export function AppLayout() {
  const [activeTab, setActiveTab] = useState<'chat' | 'vault' | 'search' | 'settings' | 'diagnostics'>('chat');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  
  const [aiStatus, setAiStatus] = useState<string>('offline');
  const [obsidianStatus, setObsidianStatus] = useState<boolean>(false);
  const [gpuStatus, setGpuStatus] = useState<boolean>(false);

  useEffect(() => {
    // Check GPU
    if ((navigator as any).gpu) {
      setGpuStatus(true);
    }

    storage.getSettings().then(s => {
      setSettings(s);
      obsidianService.updateConfig(s);
      obsidianService.checkConnection().then(setObsidianStatus);
    });

    localAIEngine.setListener((state) => {
      setAiStatus(state.status === 'ready' ? `ready (${state.currentModel})` : state.status);
    });
  }, []);

  if (!settings) return <div className="h-screen w-screen bg-[#151619] text-[#E0E0E0] flex items-center justify-center">Loading...</div>;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#151619] text-[#E0E0E0] font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-[#2A2B2F] flex items-center justify-between px-6 bg-[#1A1B1E]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">O</div>
            <h1 className="text-sm font-bold tracking-wider uppercase">Obsidian Local AI</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1 bg-[#202124] border border-[#2A2B2F] rounded-full text-xs font-bold uppercase tracking-tight ${gpuStatus ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${gpuStatus ? 'bg-green-500' : 'bg-red-500'}`} />
              WebGPU: {gpuStatus ? 'Active' : 'Offline'}
            </div>
            {settings.aiProvider === 'gemini' ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#202124] border border-[#2A2B2F] rounded-full text-xs font-bold uppercase tracking-tight text-indigo-400">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                Gemini API: {settings.geminiModel || 'gemini-3.6-flash'}
              </div>
            ) : (
              <div className={`flex items-center gap-1.5 px-3 py-1 bg-[#202124] border border-[#2A2B2F] rounded-full text-xs font-bold uppercase tracking-tight ${aiStatus.includes('ready') ? 'text-indigo-400' : 'text-yellow-400'}`}>
                <div className={`w-2 h-2 rounded-full ${aiStatus.includes('ready') ? 'bg-indigo-500' : 'bg-yellow-500'}`} />
                AI: {aiStatus.includes('ready') ? `${settings.selectedModelId} loaded` : aiStatus}
              </div>
            )}
            <div className={`flex items-center gap-1.5 px-3 py-1 bg-[#202124] border border-[#2A2B2F] rounded-full text-xs font-bold uppercase tracking-tight ${obsidianStatus ? 'text-[#8E9299]' : 'text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${obsidianStatus ? 'bg-green-500' : 'bg-red-500'}`} />
              Obsidian: {obsidianStatus ? 'Connected' : 'Offline'}
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto relative">
          {activeTab === 'chat' && <ChatUI />}
          {activeTab === 'vault' && <VaultExplorer />}
          {activeTab === 'search' && <SearchUI />}
          {activeTab === 'settings' && <Settings settings={settings} onUpdateSettings={setSettings} onCheckObsidian={() => obsidianService.checkConnection().then(setObsidianStatus)} />}
          {activeTab === 'diagnostics' && <Diagnostics gpuStatus={gpuStatus} />}
        </div>
      </main>
    </div>
  );
}
