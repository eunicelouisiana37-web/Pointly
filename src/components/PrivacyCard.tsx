import React, { useEffect, useState } from 'react';
import { Shield, HardDrive, RefreshCw, EyeOff, ServerCrash, CheckCircle } from 'lucide-react';
import { getStorageEstimate } from '../lib/db';

interface PrivacyCardProps {
  onPurgeAll: () => void;
  recordingsCount: number;
}

export const PrivacyCard: React.FC<PrivacyCardProps> = ({ onPurgeAll, recordingsCount }) => {
  const [estimate, setEstimate] = useState({ used: 0, quota: 1024 * 1024 * 500 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchEstimate = async () => {
    setIsRefreshing(true);
    try {
      const est = await getStorageEstimate();
      setEstimate(est);
    } catch (e) {
      console.warn('Could not read estimates:', e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  useEffect(() => {
    fetchEstimate();
  }, [recordingsCount]);

  const bytesToMB = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1);
  };

  const usedMB = bytesToMB(estimate.used);
  const quotaMB = bytesToMB(estimate.quota);
  const percentUsed = Math.min(100, Math.max(0.5, (estimate.used / estimate.quota) * 100));

  return (
    <div className="bg-[#1C1E24] border border-[#23252C] rounded-2xl p-6 relative overflow-hidden group shadow-xl" id="privacy-shield-container">
      {/* Visual background gradient accents */}
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#FF7A33]/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>
      
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#FF7A33]/10 border border-[#FF7A33]/20 text-[#FF7A33]" id="icon-shield-wrapper">
              <Shield size={20} className="stroke-[2px]" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm tracking-wide text-zinc-100 flex items-center gap-2">
                POINTLY LOCAL SHIELD
                <span className="text-[9px] bg-green-500/15 border border-green-400/30 text-[#4ADE80] font-mono px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  Active
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Your recordings are physically sandboxed in your browser storage.</p>
            </div>
          </div>

          <button
            onClick={fetchEstimate}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Refresh storage quota analytics"
            id="btn-refresh-privacy-stats"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-b border-[#23252C] py-4">
          <div className="bg-[#15161A]/60 border border-white/5 rounded-xl p-3 flex items-start gap-2.5">
            <EyeOff size={16} className="text-[#FF7A33] mt-0.5" />
            <div>
              <span className="block text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Cloud Footprint</span>
              <span className="text-xs font-semibold text-zinc-200 mt-1 block">0 Bytes Transmitted</span>
            </div>
          </div>

          <div className="bg-[#15161A]/60 border border-white/5 rounded-xl p-3 flex items-start gap-2.5">
            <ServerCrash size={16} className="text-[#4ADE80] mt-0.5" />
            <div>
              <span className="block text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Database Link</span>
              <span className="text-xs font-semibold text-zinc-200 mt-1 block">Decentralized / Client</span>
            </div>
          </div>

          <div className="bg-[#15161A]/60 border border-white/5 rounded-xl p-3 flex items-start gap-2.5">
            <CheckCircle size={16} className="text-[#38BDF8] mt-0.5" />
            <div>
              <span className="block text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Security Rule</span>
              <span className="text-xs font-semibold text-zinc-200 mt-1 block">Explicit Local Save Only</span>
            </div>
          </div>
        </div>

        {/* Local Storage Estimation bar */}
        <div className="space-y-2" id="storage-estimate-section">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500 flex items-center gap-1.5">
              <HardDrive size={12} />
              IndexedDB Storage Load:
            </span>
            <span className="text-zinc-300">
              {usedMB} MB / <span className="text-zinc-500">{quotaMB} MB quota</span>
            </span>
          </div>

          <div className="w-full bg-[#15161A] rounded-full h-2 overflow-hidden border border-white/5">
            <div
              className="bg-[#FF7A33] h-full rounded-full transition-all duration-500"
              style={{ width: `${percentUsed}%` }}
            ></div>
          </div>

          <p className="text-[10px] leading-relaxed text-zinc-500">
            Chrome allocations allocate up to 50% of available disk space to temporary pools. 
            Purging or deleting clips removes video Blobs permanently, restoring browser space instantly.
          </p>
        </div>

        {/* Purge / Clear all button */}
        {recordingsCount > 0 && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                if (confirm('Are you absolutely sure you want to permanently delete ALL recordings? This action CANNOT be undone and completely wipes your local database library.')) {
                  onPurgeAll();
                }
              }}
              className="text-xs font-semibold text-red-500 hover:text-red-400 bg-red-950/20 hover:bg-red-950/40 border border-red-500/10 hover:border-red-500/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              id="btn-purge-library"
            >
              Wipe Local Database
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
