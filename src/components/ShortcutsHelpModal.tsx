import React from 'react';
import { X, Keyboard, HelpCircle, Zap, Shield, HelpCircle as HelpIcon } from 'lucide-react';

interface ShortcutsHelpModalProps {
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ onClose }) => {
  const shortcutGroups = [
    {
      title: 'Active Drawing Annotation Tools',
      items: [
        { keys: ['P'], desc: 'Select Pen / Brush tool for manual canvas sketching' },
        { keys: ['A'], desc: 'Select Pointer Arrow tool to highlight areas' },
        { keys: ['T'], desc: 'Select Interactive Text label insertion' },
        { keys: ['E'], desc: 'Select Eraser to clear custom canvas strokes' },
        { keys: ['Ctrl', 'Z'], desc: 'Undo the last rendered markup stroke' },
      ],
    },
    {
      title: 'Recorder Live Control Keys',
      items: [
        { keys: ['Spacebar'], desc: 'Toggle pause / resume stream recording state' },
        { keys: ['S'], desc: 'Stop recording and open export workbench (from recording views)' },
      ],
    },
    {
      title: 'Platform Navigation Shortcuts',
      items: [
        { keys: ['?'], desc: 'Toggle this keyboard shortcuts helper console' },
        { keys: ['Esc'], desc: 'Dismiss active full-screen modal screens' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090A0C]/90 backdrop-blur-md animate-fade-in" id="shortcuts-help-overlay">
      <div className="relative bg-[#1C1E24] border border-[#23252C] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6" id="shortcuts-help-container">
        
        {/* Header context */}
        <div className="flex items-center justify-between border-b border-[#23252C] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF7A33]/10 border border-[#FF7A33]/20 flex items-center justify-center text-[#FF7A33]">
              <Keyboard size={18} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-zinc-100 text-sm uppercase tracking-wider">
                Keyboard Shortcuts Guide
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                Optimize your workflow speed like a presentation professional.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
            id="close-shortcuts-modal"
            aria-label="Close shortcuts guide"
          >
            <X size={16} />
          </button>
        </div>

        {/* Shortcuts catalog */}
        <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-1">
          {shortcutGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-bold block">
                {group.title}
              </span>

              <div className="space-y-1.5">
                {group.items.map((item, iIdx) => (
                  <div 
                    key={iIdx} 
                    className="flex justify-between items-center bg-zinc-900/60 border border-white/5 p-2 rounded-xl text-xs text-zinc-300 hover:bg-zinc-850 hover:border-[#FF7A33]/20 transition"
                  >
                    <span className="text-zinc-400 pr-4 font-medium">{item.desc}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, kIdx) => (
                        <kbd 
                          key={kIdx} 
                          className="px-2 py-0.5 rounded bg-zinc-800 border border-[#23252C] shadow-sm font-mono text-[9px] text-[#FF7A33] font-bold"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Tip block */}
        <div className="flex gap-2.5 bg-[#FF7A33]/5 border border-[#FF7A33]/15 p-3 rounded-xl text-[10px] font-mono leading-normal text-zinc-400">
          <Zap size={14} className="text-[#FF7A33] shrink-0" />
          <span>
            Shortcut triggers are deactivated while editing labels or properties to prevent typing interference. Pressing <kbd className="text-[#FF7A33] font-bold">Esc</kbd> clears any active typing selections.
          </span>
        </div>

        {/* Close Button footer bar */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 border border-[#23252C] hover:bg-zinc-805 hover:text-zinc-200 text-zinc-400 transition rounded-xl text-xs font-semibold"
          >
            Acknowledge Shortcuts
          </button>
        </div>

      </div>
    </div>
  );
};
