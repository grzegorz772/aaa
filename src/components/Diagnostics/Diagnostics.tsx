import React, { useState, useEffect } from 'react';
import { Activity, Monitor, Cpu } from 'lucide-react';

export function Diagnostics({ gpuStatus }: { gpuStatus: boolean }) {
  const [adapterInfo, setAdapterInfo] = useState<any>(null);

  useEffect(() => {
    async function getGpuInfo() {
      if ((navigator as any).gpu) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          if (adapter) {
            const info: any = {};
            // requestAdapterInfo is standardizing, try fallback if undefined
            if (typeof adapter.requestAdapterInfo === 'function') {
               const adapterInfo = await adapter.requestAdapterInfo();
               info.vendor = adapterInfo.vendor;
               info.architecture = adapterInfo.architecture;
               info.device = adapterInfo.device;
               info.description = adapterInfo.description;
            } else if ((adapter as any).name) {
               info.name = (adapter as any).name;
            }
            
            info.isFallbackAdapter = adapter.isFallbackAdapter;
            
            // Features
            const features = [];
            for (const feat of adapter.features.values()) {
              features.push(feat);
            }
            info.features = features;

            // Limits
            const limits: any = {};
            // @ts-ignore
            for (const key in adapter.limits) {
               // @ts-ignore
               limits[key] = adapter.limits[key];
            }
            info.limits = limits;

            setAdapterInfo(info);
          }
        } catch (e) {
           console.error("Could not fetch adapter info", e);
        }
      }
    }
    getGpuInfo();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <h2 className="text-2xl font-light text-[#E0E0E0] flex items-center gap-3">
        <Activity className="text-indigo-400" />
        Diagnostics
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1A1B1E] border border-[#2A2B2F] rounded-xl p-6">
           <h3 className="text-sm font-medium text-[#8E9299] mb-4 flex items-center gap-2 uppercase tracking-wider">
             <Monitor size={16} /> WebGPU Status
           </h3>
           <div className="flex items-center gap-3 mb-6">
             <div className={`w-3 h-3 rounded-full ${gpuStatus ? 'bg-green-500' : 'bg-red-500'}`} />
             <span className="text-lg font-medium text-[#E0E0E0]">
               {gpuStatus ? 'Supported & Available' : 'Unsupported'}
             </span>
           </div>
           
           {!gpuStatus && (
             <p className="text-sm text-red-400 p-4 bg-red-900/20 rounded-lg">
               WebGPU is not available in your browser. This application requires WebGPU to run AI models locally. 
               Please use a compatible browser like Chrome, Edge, or Brave, and ensure hardware acceleration is enabled.
             </p>
           )}
        </div>

        {adapterInfo && (
          <div className="bg-[#1A1B1E] border border-[#2A2B2F] rounded-xl p-6">
             <h3 className="text-sm font-medium text-[#8E9299] mb-4 flex items-center gap-2 uppercase tracking-wider">
               <Cpu size={16} /> Adapter Info
             </h3>
             <div className="space-y-2 text-sm">
               {adapterInfo.vendor && <div className="flex justify-between"><span className="text-[#8E9299]">Vendor:</span> <span className="text-[#E0E0E0]">{adapterInfo.vendor}</span></div>}
               {adapterInfo.architecture && <div className="flex justify-between"><span className="text-[#8E9299]">Architecture:</span> <span className="text-[#E0E0E0]">{adapterInfo.architecture}</span></div>}
               {adapterInfo.description && <div className="flex justify-between"><span className="text-[#8E9299]">Description:</span> <span className="text-[#E0E0E0]">{adapterInfo.description}</span></div>}
               <div className="flex justify-between"><span className="text-[#8E9299]">Fallback Adapter:</span> <span className="text-[#E0E0E0]">{adapterInfo.isFallbackAdapter ? 'Yes' : 'No'}</span></div>
             </div>
          </div>
        )}
      </div>

      {adapterInfo?.limits && (
        <div className="bg-[#1A1B1E] border border-[#2A2B2F] rounded-xl p-6">
          <h3 className="text-sm font-medium text-[#8E9299] mb-4 uppercase tracking-wider">WebGPU Limits</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 text-xs font-mono">
            {Object.entries(adapterInfo.limits).map(([key, val]) => (
              <div key={key} className="flex justify-between border-b border-[#2A2B2F] py-1">
                <span className="text-[#8E9299] truncate pr-4">{key}</span>
                <span className="text-[#E0E0E0]">{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
