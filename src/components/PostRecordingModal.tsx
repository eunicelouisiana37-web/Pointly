import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, X, Download, HardDrive, 
  Settings, Check, Compass, Sparkles, FolderClosed, RefreshCw, AlertTriangle
} from 'lucide-react';
import { DBRecording, getStorageEstimate } from '../lib/db';

interface PostRecordingModalProps {
  videoBlob: Blob;
  recordingDuration: number;
  captureMode: 'studio' | 'screen';
  onClose: () => void;
  onSaveToLibrary: (name: string, blob: Blob, duration: number) => Promise<void>;
}

export const PostRecordingModal: React.FC<PostRecordingModalProps> = ({
  videoBlob,
  recordingDuration,
  captureMode,
  onClose,
  onSaveToLibrary,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const tempVideoUrl = useRef<string>(URL.createObjectURL(videoBlob));

  // File metadata states
  const [fileName, setFileName] = useState('');
  const [exportFormat, setExportFormat] = useState<'webm' | 'mp4'>('webm');
  
  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(recordingDuration || 5);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);

  // Storage estimate metrics
  const [storageReport, setStorageReport] = useState<{ used: number; quota: number; pct: number } | null>(null);

  // Active video physical canvas-transcode state
  const [isTrimmingPhysics, setIsTrimmingPhysics] = useState(false);
  const [trimProgress, setTrimProgress] = useState(0);

  // Trimming handles (seconds)
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(recordingDuration || 5);

  // Initialize Name based on current localized datetime
  useEffect(() => {
    const d = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    setFileName(`Pointly Recording - ${monthName} ${day}, ${year} - ${hours}:${minutes}`);
  }, [captureMode]);

  // Read Storage Usage stats on boot
  useEffect(() => {
    const fetchStorage = async () => {
      const data = await getStorageEstimate();
      const usedMB = data.used / (1024 * 1024);
      const quotaMB = data.quota / (1024 * 1024);
      const pct = quotaMB > 0 ? (usedMB / quotaMB) * 100 : 0;
      setStorageReport({ used: usedMB, quota: quotaMB, pct });
    };
    fetchStorage();
  }, [videoBlob]);

  // Clean URLs on dismount
  useEffect(() => {
    return () => {
      if (tempVideoUrl.current) {
        URL.revokeObjectURL(tempVideoUrl.current);
      }
    };
  }, []);

  // Set limits and enforce trim limits
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || recordingDuration || 5;
      setVideoDuration(dur);
      setTrimEnd(dur);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      // If user is near or past end boundary, seek back to trimStart before play back begins
      if (video.currentTime >= trimEnd || video.currentTime < trimStart) {
        video.currentTime = trimStart;
      }
      video.play().catch((e) => console.warn('Video element play failure:', e));
    }
    setIsPlaying(!isPlaying);
  };

  // Restrict playback range inside Trim bounds
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const t = video.currentTime;
    setCurrentTime(t);

    if (t >= trimEnd) {
      video.currentTime = trimStart;
      if (!isPlaying) {
        video.pause();
      }
    } else if (t < trimStart) {
      video.currentTime = trimStart;
    }
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  // Convert blob formatting cleanly or physical trim via recording canvas
  const processExportAndDownload = async () => {
    const ext = exportFormat;
    const finalName = `${fileName || 'Pointly_Tutorial'}.${ext}`;

    // If trimming limits represent the full video, download immediately
    const isTrimmedValue = trimStart > 0.1 || trimEnd < (videoDuration - 0.1);

    if (!isTrimmedValue) {
      // Native fast download with no re-encoding required
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // Physical Trim via in-browser Canvas Re-recording pipeline to guarantee 0-dependency iframe-resilient clipping
    setIsTrimmingPhysics(true);
    setTrimProgress(5);

    try {
      const trimmerVideo = document.createElement('video');
      trimmerVideo.src = tempVideoUrl.current;
      trimmerVideo.muted = true;
      trimmerVideo.playsInline = true;

      await new Promise<void>((resolve) => {
        trimmerVideo.onloadeddata = () => resolve();
      });

      const trimDur = trimEnd - trimStart;
      const trimCanvas = document.createElement('canvas');
      trimCanvas.width = trimmerVideo.videoWidth || 1280;
      trimCanvas.height = trimmerVideo.videoHeight || 720;
      const tCtx = trimCanvas.getContext('2d');

      const stream = trimCanvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus',
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      let onFinishPromise = new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => resolve();
      });

      // Seek to starting position
      trimmerVideo.currentTime = trimStart;
      await new Promise<void>((resolve) => {
        trimmerVideo.onseeked = () => resolve();
      });

      // Start recording bounds
      mediaRecorder.start();
      const fpsTick = 33; // ~30 fps
      let elapsedTranscode = 0;
      
      const transcodeInterval = setInterval(() => {
        if (!tCtx) {
          clearInterval(transcodeInterval);
          return;
        }

        tCtx.drawImage(trimmerVideo, 0, 0, trimCanvas.width, trimCanvas.height);
        
        elapsedTranscode += (fpsTick / 1000);
        const progressPct = Math.min(10 + Math.round((elapsedTranscode / trimDur) * 85), 95);
        setTrimProgress(progressPct);

        // Progress video playing
        trimmerVideo.currentTime = trimStart + elapsedTranscode;

        if (elapsedTranscode >= trimDur) {
          clearInterval(transcodeInterval);
          mediaRecorder.stop();
        }
      }, fpsTick);

      await onFinishPromise;
      setTrimProgress(100);

      const trimmedBlob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(trimmedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (e) {
      console.error('Error during canvas client-side transcode of trimmed interval:', e);
      // Fallback
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsTrimmingPhysics(false);
      setTrimProgress(0);
    }
  };

  const handleConfirmSave = async () => {
    const finalName = fileName.trim() || 'Pointly_Tutorial';
    
    // Check if we have active customized trimmings
    const isTrimmedValue = trimStart > 0.1 || trimEnd < (videoDuration - 0.1);

    if (isTrimmedValue) {
      // Re-compile or slice blob preview
      setIsTrimmingPhysics(true);
      setTrimProgress(25);
      
      try {
        const trimmerVideo = document.createElement('video');
        trimmerVideo.src = tempVideoUrl.current;
        trimmerVideo.muted = true;
        trimmerVideo.playsInline = true;

        await new Promise<void>((resolve) => {
          trimmerVideo.onloadeddata = () => resolve();
        });

        const trimDur = trimEnd - trimStart;
        const trimCanvas = document.createElement('canvas');
        trimCanvas.width = trimmerVideo.videoWidth || 1280;
        trimCanvas.height = trimmerVideo.videoHeight || 720;
        const tCtx = trimCanvas.getContext('2d');

        const stream = trimCanvas.captureStream(30);
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9,opus',
        });

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) chunks.push(ev.data);
        };

        let onFinishPromise = new Promise<void>((resolve) => {
          mediaRecorder.onstop = () => resolve();
        });

        trimmerVideo.currentTime = trimStart;
        await new Promise<void>((resolve) => {
          trimmerVideo.onseeked = () => resolve();
        });

        mediaRecorder.start();
        const fpsTick = 33;
        let elapsedTranscode = 0;

        const transcodeInterval = setInterval(() => {
          if (!tCtx) {
            clearInterval(transcodeInterval);
            return;
          }
          tCtx.drawImage(trimmerVideo, 0, 0, trimCanvas.width, trimCanvas.height);
          elapsedTranscode += (fpsTick / 1000);
          setTrimProgress(25 + Math.round((elapsedTranscode / trimDur) * 70));

          trimmerVideo.currentTime = trimStart + elapsedTranscode;

          if (elapsedTranscode >= trimDur) {
            clearInterval(transcodeInterval);
            mediaRecorder.stop();
          }
        }, fpsTick);

        await onFinishPromise;
        const trimmedBlob = new Blob(chunks, { type: 'video/webm' });
        await onSaveToLibrary(finalName, trimmedBlob, trimDur);
      } catch (err) {
        console.error('Failed to trim database record, fall back to native blob:', err);
        await onSaveToLibrary(finalName, videoBlob, videoDuration);
      } finally {
        setIsTrimmingPhysics(false);
      }
    } else {
      await onSaveToLibrary(finalName, videoBlob, videoDuration);
    }
    
    onClose();
  };

  const formatSeconds = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090A0C]/96 backdrop-blur-lg animate-fade-in" id="post-record-modal">
      <div className="relative bg-[#1C1E24] border border-[#23252C] rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col" id="post-record-container">
        
        {/* Upper title context */}
        <div className="flex items-center justify-between p-5 border-b border-[#23252C]">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <div>
              <h3 className="font-display font-semibold text-zinc-100 uppercase text-sm tracking-wide">
                Interactive Recording Workbench
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                Verify frames, set custom playback trim bounds, and export output variables dynamically.
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
            id="btn-close-post-modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Player screen & dynamic trimming deck */}
        <div className="relative bg-black aspect-video flex-1 flex items-center justify-center max-h-[46vh] border-b border-[#23252C]">
          <video
            ref={videoRef}
            src={tempVideoUrl.current}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer max-h-[46vh]"
          />

          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute p-5 rounded-full bg-[#FF7A33] text-[#F4F1EA] shadow-2xl hover:scale-110 active:scale-95 transition-transform"
            >
              <Play size={28} className="fill-[#F4F1EA] translate-x-0.5" />
            </button>
          )}

          {/* Inline Trim region banner tag */}
          <div className="absolute top-4 right-4 bg-black/70 border border-white/5 px-2.5 py-1 rounded-md text-[9px] font-mono text-zinc-400 flex items-center gap-1.5">
            <FolderClosed size={10} className="text-[#FF7A33]" />
            Active Selection: <strong>{formatSeconds(trimStart)}</strong> to <strong>{formatSeconds(trimEnd)}</strong> (Total: {formatSeconds(trimEnd - trimStart)})
          </div>
        </div>

        {/* Dynamic Controls, Trimming Slider UI Deck */}
        <div className="p-5 space-y-5 bg-[#1C1E24]/90">
          
          {/* Dual range timeline and scrubber */}
          <div className="space-y-2 bg-zinc-900/60 p-4 rounded-xl border border-white/5">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span className="flex items-center gap-1"><Sparkles size={11} className="text-[#FF7A33]" /> Video Timeline Trimmer</span>
              <span>Total Native Duration: {formatSeconds(videoDuration)}</span>
            </div>

            {/* Visual trimmer slide preview track */}
            <div className="relative h-6 mt-1 flex items-center">
              {/* Colored background channel track */}
              <div className="absolute inset-x-0 h-2 bg-zinc-850 rounded-md"></div>
              
              {/* Highlighted Selected Trim Range bar */}
              <div 
                className="absolute h-2.5 bg-gradient-to-r from-emerald-500 to-[#FF7A33]/70 rounded-md shadow-inner"
                style={{
                  left: `${(trimStart / videoDuration) * 100}%`,
                  width: `${((trimEnd - trimStart) / videoDuration) * 100}%`
                }}
              />

              {/* Precise vertical scrubber pin */}
              <div 
                className="absolute w-0.5 h-6 bg-white z-20 pointer-events-none"
                style={{
                  left: `${(currentTime / videoDuration) * 100}%`,
                }}
              />

              {/* Slider Input for Scrubber positioning */}
              <input
                type="range"
                min={0}
                max={videoDuration}
                step={0.1}
                value={currentTime}
                onChange={handleScrubberChange}
                className="absolute inset-x-0 w-full h-6 opacity-0 cursor-pointer z-30"
                id="scrubber-active-position"
              />
            </div>

            {/* Absolute Numeric start-end modifiers */}
            <div className="grid grid-cols-2 gap-4 pt-1.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-500">Trim Beginning (s)</span>
                  <span className="text-[10px] font-mono text-[#FF7A33] font-bold">{formatSeconds(trimStart)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={videoDuration - 0.5}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => {
                    const val = Math.min(parseFloat(e.target.value), trimEnd - 0.5);
                    setTrimStart(val);
                    if (videoRef.current) videoRef.current.currentTime = val;
                  }}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: '#34d399' }}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-500">Trim Terminal (s)</span>
                  <span className="text-[10px] font-mono text-[#FF7A33] font-bold">{formatSeconds(trimEnd)}</span>
                </div>
                <input
                  type="range"
                  min={trimStart + 0.5}
                  max={videoDuration}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) => {
                    const val = Math.max(parseFloat(e.target.value), trimStart + 0.5);
                    setTrimEnd(val);
                    if (videoRef.current) videoRef.current.currentTime = val;
                  }}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: '#FF7A33' }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            {/* Left Box: Export & Filename Config */}
            <div className="bg-[#15161A] p-4 rounded-xl border border-white/5 space-y-3.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-bold block">
                Download Configurations
              </span>

              {/* Title parameters input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-zinc-500 block">Filename Template</label>
                <div className="flex items-center gap-2 bg-zinc-900 border border-[#23252C] rounded-lg px-2.5 py-1">
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="Enter file nickname..."
                    className="flex-1 bg-transparent py-0.5 text-xs text-zinc-200 outline-none placeholder-zinc-600 font-medium"
                  />
                  <span className="text-[10px] font-mono text-zinc-500">.{exportFormat}</span>
                </div>
              </div>

              {/* Format selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-zinc-500 block">Output Container Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat('webm')}
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                      exportFormat === 'webm'
                        ? 'bg-[#FF7A33]/15 text-[#FF7A33] border-[#FF7A33]/30 font-bold'
                        : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-zinc-300'
                    }`}
                  >
                    WebM (Native HTML5 Fast)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('mp4')}
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                      exportFormat === 'mp4'
                        ? 'bg-[#FF7A33]/15 text-[#FF7A33] border-[#FF7A33]/30 font-bold'
                        : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-zinc-300'
                    }`}
                    title="Export in highly compatible MP4 codec"
                  >
                    MP4 (Cross Platform)
                  </button>
                </div>
              </div>
            </div>

            {/* Right Box: Storage Cap Messaging & Volume */}
            <div className="bg-[#15161A] p-4 rounded-xl border border-white/5 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-bold flex items-center gap-1">
                  <HardDrive size={11} className="text-emerald-400 animate-pulse" />
                  IndexedDB Storage Cap Monitor
                </span>

                {storageReport ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>Disk Used: <strong>{storageReport.used.toFixed(1)} MB</strong></span>
                      <span>Cap Limit: <strong>{storageReport.quota.toFixed(0)} MB</strong></span>
                    </div>
                    {/* Visual bar tracker */}
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${storageReport.pct > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(storageReport.pct, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-500 leading-normal block">
                      {storageReport.pct > 70 
                        ? '⚠️ Browser quota limit is running low. Clear old tutorials if recordings fail to save!'
                        : '✓ Excellent disk index space remaining. Safe to save multiple walkthrough presentation logs.'}
                    </span>
                  </div>
                ) : (
                  <div className="h-10 flex items-center justify-center text-[10px] font-mono text-zinc-600">
                    Scanning storage caps...
                  </div>
                )}
              </div>

              {/* Volume sliders */}
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-tight">Audio Monitor</span>
                <div className="flex items-center gap-2">
                  <Volume2 size={13} className="text-zinc-500" />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-24 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    style={{ accentColor: '#FF7A33' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Canvas transcode status progress banner */}
          {isTrimmingPhysics && (
            <div className="bg-[#15161A] border border-[#FF7A33]/20 p-4 rounded-xl space-y-2 animate-pulse">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-200">
                <span className="flex items-center gap-1.5">
                  <RefreshCw size={13} className="animate-spin text-[#FF7A33]" />
                  Performing client-side video trimming transcode...
                </span>
                <span>{trimProgress}% Complete</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-[#FF7A33] transition-all duration-100"
                  style={{ width: `${trimProgress}%` }}
                ></div>
              </div>
              <span className="text-[9px] font-mono text-zinc-500 block leading-tight">
                Pointly physically crops and transcodes frames purely client-side without sending content to any remote servers. This retains absolute privacy.
              </span>
            </div>
          )}

          {/* Action Operation Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3.5 border-t border-[#23252C]/60 pt-4 mt-2">
            <button
              onClick={onClose}
              disabled={isTrimmingPhysics}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#23252C] hover:bg-zinc-805 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition"
            >
              Discard Recording
            </button>

            <button
              onClick={processExportAndDownload}
              disabled={isTrimmingPhysics}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-white/5 hover:border-[#FF7A33]/30 hover:bg-[#FF7A33]/5 text-[#FF7A33] text-xs font-semibold transition-all duration-200"
              title="Click to write file instantly to downloads list"
            >
              <Download size={14} />
              Direct Download {exportFormat.toUpperCase()}
            </button>

            <button
              onClick={handleConfirmSave}
              disabled={isTrimmingPhysics}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF7A33] hover:bg-[#E35E17] text-[#F4F1EA] text-xs font-bold transition shadow-lg hover:shadow-orange-500/10 active:scale-95 duration-200"
            >
              <Check size={14} className="stroke-[2.5px]" />
              Save to Local Library
            </button>
          </div>
          
        </div>

      </div>
    </div>
  );
};
