import React, { useState, useEffect } from 'react';
import { AppSettings } from '../../types';
import { obsidianService } from '../../services/obsidian';
import { storage } from '../../storage/indexedDB';
import { localAIEngine } from '../../services/localAI/webllm';
import { Loader2, Database, Brain, Trash2, PowerOff } from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
  onCheckObsidian: () => Promise<any>;
}

export function Settings({ settings, onUpdateSettings, onCheckObsidian }: SettingsProps) {
  const [url, setUrl] = useState(settings.obsidianApiUrl);
  const [key, setKey] = useState(settings.obsidianApiKey);
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState(settings.selectedModelId);
  const [aiProvider, setAiProvider] = useState<'webgpu' | 'gemini'>(settings.aiProvider || 'webgpu');
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || '');
  const [geminiModel, setGeminiModel] = useState(settings.geminiModel || 'gemini-3.6-flash');
  const [isChecking, setIsChecking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ connected?: boolean; message?: string } | null>(null);
  const [engineState, setEngineState] = useState(localAIEngine.getState());

  useEffect(() => {
    localAIEngine.getAvailableModels().then(setModels);
    
    const interval = setInterval(() => {
      setEngineState(localAIEngine.getState());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  async function handleProviderChange(provider: 'webgpu' | 'gemini') {
    setAiProvider(provider);
    const s = { ...settings, aiProvider: provider };
    await storage.saveSettings(s);
    onUpdateSettings(s);
  }

  async function handleSaveGeminiSettings() {
    const s: AppSettings = { ...settings, geminiApiKey, geminiModel, aiProvider: 'gemini' as const };
    await storage.saveSettings(s);
    onUpdateSettings(s);
  }

  async function handleSaveObsidian() {
    const s = { ...settings, obsidianApiUrl: url, obsidianApiKey: key };
    obsidianService.updateConfig(s);
    await storage.saveSettings(s);
    onUpdateSettings(s);
    
    setIsChecking(true);
    setConnectionStatus(null);
    const result = await onCheckObsidian();
    if (result) {
      setConnectionStatus(result);
    }
    setIsChecking(false);
  }

  async function handleSelectModel(modelId: string) {
    setSelectedModel(modelId);
    const s = { ...settings, selectedModelId: modelId };
    await storage.saveSettings(s);
    onUpdateSettings(s);
  }

  async function handleLoadModel() {
    if (!selectedModel) return;
    try {
      await localAIEngine.loadModel(selectedModel);
    } catch (e) {
      console.error(e);
      alert("Failed to load model. Check console for details.");
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-12">
      <section>
        <h2 className="text-xl font-medium text-[#E0E0E0] mb-6 flex items-center gap-2">
          <Brain className="text-indigo-400" /> AI Provider & Model
        </h2>
        
        {/* Provider Switch Tabs */}
        <div className="flex bg-[#1A1B1E] border border-[#2A2B2F] p-1 rounded-xl mb-6">
          <button
            onClick={() => handleProviderChange('webgpu')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              aiProvider === 'webgpu'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-[#8E9299] hover:text-[#E0E0E0]'
            }`}
          >
            WebGPU Local AI (In-Browser)
          </button>
          <button
            onClick={() => handleProviderChange('gemini')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              aiProvider === 'gemini'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-[#8E9299] hover:text-[#E0E0E0]'
            }`}
          >
            Google Gemini API (Cloud)
          </button>
        </div>

        {aiProvider === 'webgpu' ? (
          <div className="bg-[#1A1B1E] border border-[#2A2B2F] rounded-xl p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#8E9299] mb-2">Current Local Model</label>
              <select
                value={selectedModel}
                onChange={e => handleSelectModel(e.target.value)}
                className="w-full bg-[#151619] border border-[#2A2B2F] rounded-lg px-4 py-2.5 text-sm text-[#E0E0E0] focus:outline-none focus:border-indigo-500/50 transition-colors"
              >
                {models.map(m => (
                  <option key={m.model_id} value={m.model_id}>
                    {m.model_id} ({(m.vram_required_MB / 1024).toFixed(1)} GB VRAM req)
                  </option>
                ))}
              </select>
              <p className="text-xs text-yellow-600 mt-2">Larger models require more GPU memory. 3B-4B models are recommended.</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#202124] rounded-lg border border-[#2A2B2F]">
              <div>
                <div className="text-sm font-medium text-[#E0E0E0]">Engine Status</div>
                <div className="text-xs text-[#8E9299] mt-1 capitalize">
                  {engineState.status} {engineState.progressText && `- ${engineState.progressText}`}
                </div>
                {engineState.status === 'loading' && (
                  <div className="w-full bg-[#2A2B2F] h-1.5 rounded-full mt-3 overflow-hidden">
                     <div className="bg-indigo-500 h-full transition-all duration-300" style={{width: `${engineState.progress * 100}%`}}></div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {engineState.status === 'offline' || engineState.status === 'error' ? (
                  <button onClick={handleLoadModel} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
                    Load Model
                  </button>
                ) : (
                  <button onClick={() => localAIEngine.unloadModel()} className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    <PowerOff size={14} /> Unload
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#1A1B1E] border border-[#2A2B2F] rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#8E9299] mb-2">Google Gemini API Key</label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={e => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-[#151619] border border-[#2A2B2F] rounded-lg px-4 py-2.5 text-sm text-[#E0E0E0] focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
              <p className="text-xs text-[#8E9299] mt-1.5">Enter your Google Gemini API key to enable fast cloud inference with full tool support.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8E9299] mb-2">Gemini Model</label>
              <select
                value={geminiModel}
                onChange={e => setGeminiModel(e.target.value)}
                className="w-full bg-[#151619] border border-[#2A2B2F] rounded-lg px-4 py-2.5 text-sm text-[#E0E0E0] focus:outline-none focus:border-indigo-500/50 transition-colors"
              >
                <option value="gemini-3.6-flash">gemini-3.6-flash (Fast & Intelligent)</option>
                <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Advanced Reasoning)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra Fast)</option>
              </select>
            </div>
            <div className="pt-2">
              <button 
                onClick={handleSaveGeminiSettings}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Save Gemini Configuration
              </button>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-medium text-[#E0E0E0] mb-6 flex items-center gap-2">
          <Database className="text-green-500" /> Obsidian Local REST API
        </h2>
        <div className="bg-[#1A1B1E] border border-[#2A2B2F] rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#8E9299] mb-2">API URL</label>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://127.0.0.1:27124"
              className="w-full bg-[#151619] border border-[#2A2B2F] rounded-lg px-4 py-2.5 text-sm text-[#E0E0E0] focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#8E9299] mb-2">API Key</label>
            <input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-[#151619] border border-[#2A2B2F] rounded-lg px-4 py-2.5 text-sm text-[#E0E0E0] focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <div className="pt-2 flex flex-col gap-3">
            <button 
              onClick={handleSaveObsidian}
              disabled={isChecking}
              className="px-4 py-2 bg-[#202124] border border-[#3A3B3F] hover:bg-[#2A2B2F] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 self-start"
            >
              {isChecking && <Loader2 size={14} className="animate-spin" />}
              Save & Check Connection
            </button>

            {connectionStatus && (
              <div
                className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
                  connectionStatus.connected
                    ? 'bg-green-950/30 border-green-800/50 text-green-300'
                    : 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                }`}
              >
                <div className="font-semibold mb-1">
                  {connectionStatus.connected ? '✓ Connected' : '⚠ Connection Info'}
                </div>
                {connectionStatus.message}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
