import React from 'react';
import { Sparkles, Ban } from 'lucide-react';

interface NoiseCancellationToggleProps {
  isEnabled: boolean;
  isSupported: boolean;
  onToggle: (forceValue?: boolean) => void;
  className?: string;
  compact?: boolean;
}

export const NoiseCancellationToggle: React.FC<NoiseCancellationToggleProps> = ({
  isEnabled,
  isSupported,
  onToggle,
  className = '',
  compact = false,
}) => {
  if (!isSupported) {
    if (compact) {
      return (
        <button
          type="button"
          disabled
          className={`p-2 rounded-xl bg-zinc-800/40 text-zinc-600 border border-transparent cursor-not-allowed opacity-50 ${className}`}
          title="Studio Noise Cancellation not supported in this browser"
          id="noise-cancel-toggle-unsupported-compact"
        >
          <Ban size={16} />
        </button>
      );
    }

    return (
      <div
        className={`flex items-center gap-3 p-3 bg-zinc-800/20 border border-zinc-800/40 rounded-xl opacity-60 ${className}`}
        id="noise-cancel-toggle-unsupported"
      >
        <div className="p-2 rounded-lg bg-zinc-900 text-zinc-600">
          <Ban size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-zinc-400 font-sans uppercase tracking-wider">Noise Cancellation</h4>
          <p className="text-[10px] text-zinc-600">Unsupported in this browser</p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onToggle()}
        className={`p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center ${
          isEnabled
            ? 'bg-[#FF7A33]/10 text-[#FF7A33] border-[#FF7A33]/30 hover:bg-[#FF7A33]/20 shadow-sm shadow-[#FF7A33]/5'
            : 'bg-zinc-800/40 text-zinc-400 border-[#23252C] hover:bg-zinc-800 hover:text-zinc-300'
        } ${className}`}
        title={isEnabled ? "Studio Noise Cancellation: ACTIVE" : "Studio Noise Cancellation: MUTED"}
        id="noise-cancel-toggle-compact"
      >
        <Sparkles size={16} className={isEnabled ? 'animate-pulse' : ''} />
      </button>
    );
  }

  return (
    <div
      className={`bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 flex items-center justify-between gap-4 transition-all hover:border-[#FF7A33]/20 ${className}`}
      id="noise-cancel-toggle-full"
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2.5 rounded-lg transition-all duration-300 ${
            isEnabled
              ? 'bg-[#FF7A33]/10 text-[#FF7A33] shadow-sm shadow-[#FF7A33]/5'
              : 'bg-zinc-800/40 text-zinc-500'
          }`}
        >
          <Sparkles size={16} className={isEnabled ? 'animate-pulse' : ''} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-zinc-200 font-sans uppercase tracking-wide">Studio Filter</h4>
            {isEnabled && (
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#4ADE80] animate-pulse"></span>
            )}
          </div>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-medium leading-relaxed">
            {isEnabled ? 'Isolating voice, cutting hum & fan static' : 'Bypassed (raw microphone feed)'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onToggle()}
        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all duration-200 uppercase tracking-wider ${
          isEnabled
            ? 'bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/25 hover:bg-[#4ADE80]/20'
            : 'bg-zinc-800 text-zinc-400 border-transparent hover:bg-zinc-700 hover:text-zinc-300'
        }`}
        id="btn-noise-cancel-toggle-action"
      >
        {isEnabled ? 'Active' : 'Muted'}
      </button>
    </div>
  );
};
