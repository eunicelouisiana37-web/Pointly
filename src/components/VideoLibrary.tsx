import React, { useState } from 'react';
import { DBRecording } from '../lib/db';
import { 
  Play, 
  Download, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Calendar, 
  Clock, 
  HardDrive, 
  Video, 
  ListChecks, 
  Loader2 
} from 'lucide-react';
import JSZip from 'jszip';

interface VideoLibraryProps {
  recordings: DBRecording[];
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onSelectPlayer: (rec: DBRecording) => void;
}

export const VideoLibrary: React.FC<VideoLibraryProps> = ({
  recordings,
  onDelete,
  onRename,
  onSelectPlayer,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  // Bulk selection state variables
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleStartEdit = (rec: DBRecording) => {
    setEditingId(rec.id);
    setEditName(rec.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      onRename(id, editName.trim());
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const formatDuration = (secs: number) => {
    if (isNaN(secs) || secs === Infinity) return '00:00';
    const rounded = Math.round(secs);
    const m = Math.floor(rounded / 60);
    const s = rounded % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = 1;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Selection toggle logic
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedIds([]);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === recordings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(recordings.map((r) => r.id));
    }
  };

  const handleToggleSelectCard = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const getDownloadName = (name: string, blob?: Blob) => {
    let ext = '.webm';
    if (blob && blob.type) {
      if (blob.type.includes('mp4')) ext = '.mp4';
      else if (blob.type.includes('ogg')) ext = '.ogg';
      else if (blob.type.includes('webm')) ext = '.webm';
    }
    return name.toLowerCase().endsWith(ext) ? name : `${name}${ext}`;
  };

  // Bulk ZIP export using JSZip package
  const handleBulkExportZip = async () => {
    if (selectedIds.length === 0) return;
    setIsExporting(true);
    setExportProgress(0);

    try {
      const zip = new JSZip();
      const selectedRecordings = recordings.filter((r) => selectedIds.includes(r.id));
      const nameCounters: Record<string, number> = {};

      for (const rec of selectedRecordings) {
        let baseName = rec.name;
        
        // Determine correct extension based on mime type
        let ext = '.webm';
        if (rec.videoBlob && rec.videoBlob.type) {
          if (rec.videoBlob.type.includes('mp4')) ext = '.mp4';
          else if (rec.videoBlob.type.includes('ogg')) ext = '.ogg';
          else if (rec.videoBlob.type.includes('webm')) ext = '.webm';
        }

        // Ensure proper extension is consistently present
        if (!baseName.toLowerCase().endsWith(ext)) {
          baseName += ext;
        }

        // Prevent exact name collisions within the single zip
        if (nameCounters[baseName] !== undefined) {
          nameCounters[baseName]++;
          const index = nameCounters[baseName];
          const dotIndex = baseName.lastIndexOf('.');
          const namePart = baseName.slice(0, dotIndex);
          const extPart = baseName.slice(dotIndex);
          baseName = `${namePart}_(${index})${extPart}`;
        } else {
          nameCounters[baseName] = 0;
        }

        // Add binary Blob files directly to the root Zip folder
        zip.file(baseName, rec.videoBlob);
      }

      // Generate the compressed zip stream with progressive feedback reporting
      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        setExportProgress(Math.round(metadata.percent));
      });

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      
      const dateString = new Date().toLocaleDateString().replace(/\//g, '-');
      link.download = `Pointly_Recordings_Export_${dateString}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP generation package failure:', err);
      alert('Encountered an internal error building ZIP archive. Try again or select fewer entries.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // Bulk Delete implementation
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmMessage = `Are you sure you want to permanently delete all ${selectedIds.length} chosen recordings? This purges the storage allocation on your current device.`;
    if (confirm(confirmMessage)) {
      for (const id of selectedIds) {
        onDelete(id);
      }
      setSelectedIds([]);
      setIsSelectMode(false);
    }
  };

  if (recordings.length === 0) {
    return (
      <div className="bg-[#1C1E24]/40 border border-[#23252C] rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-4 shadow-inner" id="library-empty-state">
        <div className="p-4 rounded-full bg-zinc-900 border border-white/5 text-zinc-600 shadow-xl" id="empty-state-visual-icon">
          <Video size={40} className="stroke-[1.5px]" />
        </div>
        <div className="max-w-md">
          <h4 className="font-display font-medium text-zinc-300 text-sm tracking-wide">NO RECORDINGS CREATED YET</h4>
          <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
            Recordings you capture are kept explicitly in browser client IndexedDB memory. Use the Presenter Canvas above or external Screen Recording to capture your first walkthrough tutorial!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="video-library-wrapper">
      
      {/* Search & Bulk Options header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#1C1E24]/80 border border-[#23252C] p-4 rounded-2xl shadow-md" id="library-header-controls">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FF7A33]/15 flex items-center justify-center text-[#FF7A33]">
            <ListChecks size={16} />
          </div>
          <div>
            <h3 className="font-display font-semibold text-zinc-200 text-xs sm:text-sm uppercase tracking-wider">
              Local Offline Library
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5" id="library-count-text">
              Secure client disk sandbox • {recordings.length} {recordings.length === 1 ? 'recording' : 'recordings'} stored
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!isSelectMode ? (
            <button
              onClick={toggleSelectMode}
              className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-[#FF7A33]/40 text-xs font-semibold text-zinc-300 rounded-xl cursor-pointer hover:bg-zinc-800 transition flex items-center gap-1.5"
              id="library-enter-bulk-btn"
            >
              <ListChecks size={13} className="text-[#FF7A33]" />
              Bulk Manage
            </button>
          ) : (
            <>
              <button
                onClick={handleToggleSelectAll}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-805 text-xs font-semibold text-zinc-400 hover:text-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-800 transition"
                id="library-select-all-btn"
              >
                {selectedIds.length === recordings.length ? 'Deselect All' : 'Select All'}
              </button>

              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.length === 0}
                className={`px-3 py-1.5 border text-xs font-semibold rounded-xl cursor-pointer transition flex items-center gap-1.5 ${
                  selectedIds.length === 0
                    ? 'border-transparent text-zinc-600 bg-zinc-900/40 cursor-not-allowed'
                    : 'bg-red-950/20 border-red-500/20 text-red-100 hover:bg-red-950/55'
                }`}
                id="library-bulk-delete-btn"
              >
                <Trash2 size={13} />
                Delete ({selectedIds.length})
              </button>

              <button
                onClick={handleBulkExportZip}
                disabled={selectedIds.length === 0 || isExporting}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl cursor-pointer transition flex items-center gap-1.5 ${
                  selectedIds.length === 0 || isExporting
                    ? 'bg-zinc-900/60 border border-zinc-800/20 text-zinc-650 cursor-not-allowed'
                    : 'bg-[#FF7A33] border border-[#FF7A33]/20 text-[#F4F1EA] hover:bg-[#FF7A33]/90 shadow-lg'
                }`}
                id="library-bulk-zip-btn"
              >
                {isExporting ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-white" />
                    <span>Zipping {exportProgress}%</span>
                  </>
                ) : (
                  <>
                    <Download size={13} />
                    <span>Download ZIP ({selectedIds.length})</span>
                  </>
                )}
              </button>

              <button
                onClick={toggleSelectMode}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800/80 hover:bg-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition rounded-xl cursor-pointer"
                id="library-exit-bulk-btn"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Video Recordings Grid Column Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="video-library-grid">
        {recordings.map((rec) => {
          const isEditing = editingId === rec.id;
          const isSelected = selectedIds.includes(rec.id);

          return (
            <div
              key={rec.id}
              className={`group relative bg-[#1C1E24] border rounded-2xl overflow-hidden flex flex-col shadow-lg transition duration-300 ${
                isSelectMode && isSelected
                  ? 'border-[#FF7A33] bg-[#1C1E24]/90 ring-1 ring-[#FF7A33]/25 shadow-md shadow-[#FF7A33]/5'
                  : 'border-[#23252C] hover:border-[#FF7A33]/40'
              }`}
              id={`recording-card-${rec.id}`}
            >
              {/* Thumbnail Box overlay clickable to toggle selection or open video player modal */}
              <div 
                className="relative aspect-video bg-[#090A0C] flex items-center justify-center cursor-pointer overflow-hidden border-b border-[#23252C]"
                onClick={() => {
                  if (isSelectMode) {
                    handleToggleSelectCard(rec.id);
                  } else {
                    onSelectPlayer(rec);
                  }
                }}
                id={`thumbnail-trigger-${rec.id}`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                
                {/* Regular play badge/visual pointer */}
                {!isSelectMode && (
                  <div className="text-[#FF7A33] opacity-75 group-hover:opacity-100 group-hover:scale-110 transition duration-300 flex flex-col items-center gap-1.5 z-20">
                    <div className="p-3.5 rounded-full bg-[#15161A]/90 border border-white/5 group-hover:bg-[#FF7A33] group-hover:text-[#F4F1EA] transition duration-300 shadow-xl">
                      <Play size={18} className="fill-current" />
                    </div>
                  </div>
                )}

                {/* Multitoggle selection indicator */}
                {isSelectMode && (
                  <div 
                    className={`absolute top-3 right-3 z-30 p-1 rounded-full border transition duration-200 ${
                      isSelected
                        ? 'bg-[#FF7A33] border-[#FF7A33] text-[#F4F1EA] scale-110'
                        : 'bg-black/60 border-zinc-500 text-transparent hover:border-zinc-300'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelectCard(rec.id);
                    }}
                  >
                    <Check size={12} className="stroke-[3.5px]" />
                  </div>
                )}

                {/* Tag describing recording feed source */}
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/60 border border-white/5 text-[8px] font-mono font-bold uppercase text-zinc-400 tracking-wider z-20">
                  {rec.mode === 'studio' ? 'Presenter Studio' : 'Desktop Feed'}
                </div>

                {/* Recording Duration Time Tag */}
                <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/80 border border-white/5 text-[10px] font-mono text-zinc-300 tracking-tight flex items-center gap-1 z-20">
                  <Clock size={10} className="text-[#FF7A33]" />
                  {formatDuration(rec.duration)}
                </div>
              </div>

              {/* Title, tags and item statistics info */}
              <div 
                className="p-5 flex-1 flex flex-col justify-between gap-4"
                onClick={() => {
                  if (isSelectMode && !isEditing) {
                    handleToggleSelectCard(rec.id);
                  }
                }}
              >
                <div className="space-y-1.5">
                  {isEditing ? (
                    <div className="flex items-center gap-2" id={`rename-form-${rec.id}`} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-[#15161A] border border-[#FF7A33] rounded px-2.5 py-1 text-xs text-zinc-200 outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(rec.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(rec.id)}
                        className="p-1 rounded bg-[#4ADE80]/15 border border-[#4ADE80]/30 text-[#4ADE80] hover:bg-[#4ADE80]/30 transition"
                        id="save-rename-indicator"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 rounded bg-red-950/20 border border-red-500/10 text-red-400 hover:bg-zinc-800 transition"
                        id="cancel-rename-indicator"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <h4 
                        className="font-display font-semibold text-sm text-zinc-200 uppercase tracking-tight truncate max-w-[80%] hover:text-[#FF7A33] cursor-pointer"
                        onClick={(e) => {
                          if (!isSelectMode) {
                            e.stopPropagation();
                            onSelectPlayer(rec);
                          }
                        }}
                      >
                        {rec.name}
                      </h4>
                      
                      {!isSelectMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(rec);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition duration-200 cursor-pointer"
                          title="Rename recording"
                          id={`btn-edit-name-${rec.id}`}
                        >
                          <Edit3 size={11} />
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3.5 text-[10px] text-zinc-500 font-mono pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {formatDate(rec.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive size={11} />
                      {formatSize(rec.size)}
                    </span>
                  </div>
                </div>

                {/* Card footer control menu toggled on mode selection */}
                <div className="flex items-center justify-between border-t border-[#23252C]/70 pt-4 mt-1">
                  {isSelectMode ? (
                    <div className="w-full flex items-center justify-between text-[9px] font-mono select-none">
                      <span className={`flex items-center gap-1 ${isSelected ? 'text-[#FF7A33] font-bold' : 'text-zinc-500'}`}>
                        {isSelected ? '● MARKED FOR ZIP' : '○ CLICK CARD TO SELECT'}
                      </span>
                      <span className="text-zinc-600">
                        ID: {rec.id.slice(0, 8)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onSelectPlayer(rec)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5 hover:bg-[#FF7A33]/10 hover:text-[#FF7A33] text-xs font-semibold text-zinc-400 transition cursor-pointer font-sans"
                        id={`action-play-${rec.id}`}
                      >
                        Play Video
                      </button>

                      <div className="flex items-center gap-2">
                        <a
                          href={rec.videoUrl}
                          download={getDownloadName(rec.name, rec.videoBlob)}
                          className="p-1.5 rounded bg-[#1C1E24] border border-[#23252C] hover:border-[#FF7A33]/30 text-zinc-400 hover:text-[#FF7A33] transition"
                          title="Download webm video"
                          id={`action-export-${rec.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={13} />
                        </a>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to permanently delete "${rec.name}"? This removes the video Blob from your device's storage.`)) {
                              onDelete(rec.id);
                            }
                          }}
                          className="p-1.5 rounded bg-zinc-900/40 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 border border-transparent hover:border-red-500/10 transition cursor-pointer"
                          title="Delete recording file"
                          id={`action-delete-${rec.id}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
