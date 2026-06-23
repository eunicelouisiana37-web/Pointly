import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Camera, CameraOff, Sparkles, LayoutGrid, Image as ImageIcon, Circle, Sun, HelpCircle, Eye, RefreshCw, Layers, ShieldCheck, SlidersHorizontal, Headphones } from 'lucide-react';
import { CanvasBackground, WebcamFrame, VideoFilter, WebcamFrameStyle, WebcamBgEffect, WebcamReplaceType, WebcamPerformanceMode } from '../types';
import { AudioLevelMeter } from './AudioLevelMeter';
import { NoiseCancellationToggle } from './NoiseCancellationToggle';

interface DeviceSelectorsProps {
  microphoneActive: boolean;
  toggleMic: () => void;
  webcamActive: boolean;
  toggleCamera: () => void;

  selectedMicId: string;
  onMicIdChange: (id: string) => void;
  selectedCameraId: string;
  onCameraIdChange: (id: string) => void;

  canvasBg: CanvasBackground;
  onCanvasBgChange: (bg: CanvasBackground) => void;
  onCustomImageUpload: (file: File) => void;

  webcamFrame: WebcamFrame;
  onWebcamFrameChange: (frame: WebcamFrame) => void;
  videoFilter: VideoFilter;
  onVideoFilterChange: (filter: VideoFilter) => void;
  
  audioStream: MediaStream | null;
  noiseCancellationActive: boolean;
  onNoiseCancellationToggle: (active: boolean) => void;
  noiseGateThreshold: number;
  onThresholdChange: (val: number) => void;
  noiseLowPassActive: boolean;
  onLowPassToggle: (active: boolean) => void;
  audioMonitorActive: boolean;
  onAudioMonitorToggle: (active: boolean) => void;

  // Phase 4 Webcam effects props
  webcamFrameStyle: WebcamFrameStyle;
  onWebcamFrameStyleChange: (style: WebcamFrameStyle) => void;
  webcamBgEffect: WebcamBgEffect;
  onWebcamBgEffectChange: (effect: WebcamBgEffect) => void;
  webcamReplaceType: WebcamReplaceType;
  onWebcamReplaceTypeChange: (type: WebcamReplaceType) => void;
  webcamReplaceColor: string;
  onWebcamReplaceColorChange: (color: string) => void;
  webcamReplaceImageUrl: string;
  onWebcamReplaceImageUrlChange: (url: string) => void;
  webcamMirrored: boolean;
  onWebcamMirroredChange: (mirrored: boolean) => void;
  webcamPerfMode: WebcamPerformanceMode;
  onWebcamPerfModeChange: (mode: WebcamPerformanceMode) => void;
}

export const DeviceSelectors: React.FC<DeviceSelectorsProps> = ({
  microphoneActive,
  toggleMic,
  webcamActive,
  toggleCamera,
  selectedMicId,
  onMicIdChange,
  selectedCameraId,
  onCameraIdChange,
  canvasBg,
  onCanvasBgChange,
  onCustomImageUpload,
  webcamFrame,
  onWebcamFrameChange,
  videoFilter,
  onVideoFilterChange,
  audioStream,
  noiseCancellationActive,
  onNoiseCancellationToggle,
  noiseGateThreshold,
  onThresholdChange,
  noiseLowPassActive,
  onLowPassToggle,
  audioMonitorActive,
  onAudioMonitorToggle,

  // New Phase 4 properties destructured
  webcamFrameStyle,
  onWebcamFrameStyleChange,
  webcamBgEffect,
  onWebcamBgEffectChange,
  webcamReplaceType,
  onWebcamReplaceTypeChange,
  webcamReplaceColor,
  onWebcamReplaceColorChange,
  webcamReplaceImageUrl,
  onWebcamReplaceImageUrlChange,
  webcamMirrored,
  onWebcamMirroredChange,
  webcamPerfMode,
  onWebcamPerfModeChange,
}) => {
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);

  // Enumerate active devices on component mount or when user grants permissions (indicated by microphoneActive / webcamActive returning true)
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        // Enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audios = devices.filter((d) => d.kind === 'audioinput');
        const videos = devices.filter((d) => d.kind === 'videoinput');
        
        setMics(audios);
        setCameras(videos);
      } catch (err) {
        console.warn('Unable to populate media hardware logs:', err);
      }
    };

    fetchDevices();

    // Re-trigger if device changes
    navigator.mediaDevices.addEventListener('devicechange', fetchDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', fetchDevices);
    };
  }, [microphoneActive, webcamActive]);

  // Revoke previous object URL on change or on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (webcamReplaceImageUrl && webcamReplaceImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(webcamReplaceImageUrl);
      }
    };
  }, [webcamReplaceImageUrl]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCustomImageUpload(file);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="device-controls-sections">
      {/* 1. Media Feed Settings Panel */}
      <div className="bg-[#1C1E24] border border-[#23252C] rounded-2xl p-6 shadow-xl flex flex-col gap-5">
        <h3 className="font-display font-semibold text-sm tracking-wide text-zinc-100 flex items-center gap-2">
          <Camera size={16} className="text-[#FF7A33]" />
          INPUT HARDWARE & EFFECTS
        </h3>

        {/* Microphone hardware selections */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 font-sans">
              <Mic size={14} className={microphoneActive ? 'text-[#4ADE80]' : 'text-zinc-600'} />
              Microphone Track Input
            </span>
            <button
              onClick={toggleMic}
              className={`text-xs px-2.5 py-1.5 font-bold rounded-lg transition duration-200 ${
                microphoneActive
                  ? 'bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30 hover:bg-[#4ADE80]/25'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
              id="btn-toggle-mic"
            >
              {microphoneActive ? 'Mic Active' : 'Mic Mute'}
            </button>
          </div>

          <select
            value={selectedMicId}
            onChange={(e) => onMicIdChange(e.target.value)}
            disabled={!microphoneActive}
            className="w-full bg-[#15161A] text-zinc-300 border border-[#23252C] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-3 py-2 text-xs outline-none focus:border-[#FF7A33]/50 font-mono transition"
            id="select-mic-input"
          >
            {mics.length === 0 ? (
              <option value="">Default Microphone</option>
            ) : (
              mics.map((m, idx) => (
                <option key={m.deviceId || idx} value={m.deviceId}>
                  {m.label || `Microphone Input ${idx + 1}`}
                </option>
              ))
            )}
          </select>
          <AudioLevelMeter stream={audioStream} active={microphoneActive} />

          {/* Studio Noise Canceller controls */}
          <div className="bg-[#1C1D24] border border-[#2B2D38] rounded-xl p-3 mt-2 space-y-3">
            <NoiseCancellationToggle
              isEnabled={noiseCancellationActive}
              isSupported={true}
              onToggle={onNoiseCancellationToggle}
              className="bg-zinc-950/20 border-zinc-800/40"
            />

            {noiseCancellationActive && (
              <div className="space-y-3 pt-1 border-t border-[#23252C]">
                {/* Manual Threshold Sliders */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-zinc-400 flex items-center gap-1 text-[10.5px]">
                      <SlidersHorizontal size={11} className="text-[#FF7A33]" />
                      Gate Threshold
                    </span>
                    <span className="text-[#FF7A33] font-semibold">{noiseGateThreshold} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="-20"
                    step="1"
                    value={noiseGateThreshold}
                    onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
                    className="w-full h-1 bg-[#15161A] rounded-lg appearance-none cursor-pointer accent-[#FF7A33]"
                    title="Lower thresholds allow subtle speech but let background hums leak. Higher thresholds block loud system/laptop fan whines."
                  />
                  <div className="text-[9px] text-zinc-500 leading-relaxed font-sans">
                    {noiseGateThreshold < -48 ? (
                      <span>Sensitive mode: Good for silent rooms. Quiet fan noise may leak.</span>
                    ) : noiseGateThreshold > -35 ? (
                      <span>Aggressive mode: Forces silence over heavy fan blares & static buzzes.</span>
                    ) : (
                      <span>Optimized mode: Perfectly isolates continuous laptop whine & room reflection.</span>
                    )}
                  </div>
                </div>

                {/* Sub Options (Fan Lowpass Filter & Headphones Feedback Loopback) */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {/* Option 1: High Frequency Lowpass Whine Filter */}
                  <button
                    type="button"
                    onClick={() => onLowPassToggle(!noiseLowPassActive)}
                    className={`flex flex-col items-start p-2 rounded-lg border text-left transition duration-150 ${
                      noiseLowPassActive
                        ? 'bg-[#FF7A33]/5 border-[#FF7A33]/30 text-zinc-300'
                        : 'bg-[#15161A] border-[#23252C] text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    <span className="text-[10px] font-bold flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${noiseLowPassActive ? 'bg-[#FF7A33]' : 'bg-transparent border border-zinc-600'}`}></span>
                      Anti-Hiss (8.5kHz)
                    </span>
                    <span className="text-[8.5px] mt-0.5 leading-snug">
                      {noiseLowPassActive ? 'Eliminating high laptop fan screech' : 'Full speaker range (bypass)'}
                    </span>
                  </button>

                  {/* Option 2: Live Headphone Loopback Monitor */}
                  <button
                    type="button"
                    onClick={() => onAudioMonitorToggle(!audioMonitorActive)}
                    className={`flex flex-col items-start p-2 rounded-lg border text-left transition duration-150 ${
                      audioMonitorActive
                        ? 'bg-[#4ADE80]/5 border-[#4ADE80]/30 text-[#4ADE80]'
                        : 'bg-[#15161A] border-[#23252C] text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    <span className="text-[10px] font-bold flex items-center gap-1">
                      <Headphones size={11} className={audioMonitorActive ? 'text-[#4ADE80]' : 'text-zinc-500'} />
                      Feedback Monitor
                    </span>
                    <span className="text-[8.5px] mt-0.5 leading-snug">
                      {audioMonitorActive ? 'Routing isolated audio' : 'Click to hear filtered speech'}
                    </span>
                  </button>
                </div>

                {audioMonitorActive && (
                  <div className="text-[9px] text-[#4ADE80] bg-[#4ADE80]/5 border border-[#4ADE80]/20 rounded-lg p-2 leading-relaxed flex items-start gap-1 font-sans">
                    <span className="font-bold">⚠️ Notice:</span>
                    <span>Use headphones or turn down speaker volume to prevent severe feedback loops. Loopback captures you real-time.</span>
                  </div>
                )}

                <div className="text-[10px] text-zinc-400 bg-[#15161A] border border-[#23252C] rounded-lg p-2 leading-relaxed">
                  <div className="font-semibold text-[#4ADE80] mb-1 flex items-center gap-1">
                    <ShieldCheck size={11} /> Advanced Software Shield Active:
                  </div>
                  Adaptive 85Hz cut, power electrical grounding notch, dynamic gate compression, and custom spectral anti-whine isolators running in browser memory.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cámara Hardware Selector */}
        <div className="space-y-3.5 border-t border-[#23252C] pt-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 font-sans">
              <Camera size={14} className={webcamActive ? 'text-[#FF7A33]' : 'text-zinc-600'} />
              Draggable Camera Feed
            </span>
            <button
              onClick={toggleCamera}
              className={`text-xs px-2.5 py-1.5 font-bold rounded-lg transition duration-200 ${
                webcamActive
                  ? 'bg-[#FF7A33]/15 text-[#FF7A33] border border-[#FF7A33]/30 hover:bg-[#FF7A33]/25'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
              id="btn-toggle-camera"
            >
              {webcamActive ? 'Camera ON' : 'Camera OFF'}
            </button>
          </div>

          <select
            value={selectedCameraId}
            onChange={(e) => onCameraIdChange(e.target.value)}
            disabled={!webcamActive}
            className="w-full bg-[#15161A] text-zinc-300 border border-[#23252C] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-3 py-2 text-xs outline-none focus:border-[#FF7A33]/50 font-mono transition"
            id="select-camera-input"
          >
            {cameras.length === 0 ? (
              <option value="">Default Webcam</option>
            ) : (
              cameras.map((c, idx) => (
                <option key={c.deviceId || idx} value={c.deviceId}>
                  {c.label || `Camera Element ${idx + 1}`}
                </option>
              ))
            )}
          </select>
          <p className="text-[10px] text-zinc-500 italic font-mono px-1">
            * Real device names populate once the microphone or webcam is activated for the first time.
          </p>
        </div>

        {/* Camera PIP formatting (Filters and Shapes) */}
        {webcamActive && (
          <div className="space-y-4 border-t border-[#23252C] pt-4" id="cam-effects-group">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold block">Camera Shape</span>
                <div className="grid grid-cols-3 gap-1 bg-[#15161A] p-0.5 border border-white/5 rounded-xl">
                  {(['circle', 'squircle', 'square'] as WebcamFrame[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => onWebcamFrameChange(f)}
                      className={`py-1 rounded-lg text-[10px] capitalize font-medium transition ${
                        webcamFrame === f
                          ? 'bg-[#FF7A33]/15 text-[#FF7A33] border border-[#FF7A33]/10 font-semibold'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                      id={`btn-frame-${f}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold block">Video Filters</span>
                <select
                  value={videoFilter}
                  onChange={(e) => onVideoFilterChange(e.target.value as VideoFilter)}
                  className="w-full bg-[#15161A] border border-[#23252C] text-zinc-300 bg-none rounded-xl px-2.5 py-1 text-[10px] outline-none font-mono tracking-tight h-[26px]"
                  id="select-video-filter"
                >
                  <option value="none" className="bg-[#15161A]">Natural Feed</option>
                  <option value="amber-glow" className="bg-[#15161A]">Amber Glow</option>
                  <option value="bw" className="bg-[#15161A]">Classic B&W</option>
                  <option value="cyberpunk" className="bg-[#15161A]">Cyberpunk</option>
                  <option value="warm" className="bg-[#15161A]">Warm Vintage</option>
                </select>
              </div>
            </div>

            {/* Frame Styles and Mirroring Toggle */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold block">Frame Style Preset</span>
                <div className="grid grid-cols-3 gap-1 bg-[#15161A] p-0.5 border border-white/5 rounded-xl">
                  {([
                    { id: 'clean', label: 'Clean' },
                    { id: 'rounded', label: 'Glow' },
                    { id: 'none', label: 'None' }
                  ] as { id: WebcamFrameStyle; label: string }[]).map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => onWebcamFrameStyleChange(style.id)}
                      className={`py-1 rounded-lg text-[10px] font-medium transition ${
                        webcamFrameStyle === style.id
                          ? 'bg-[#FF7A33]/15 text-[#FF7A33] border border-[#FF7A33]/10 font-semibold'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                      id={`btn-frame-style-${style.id}`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold block">Mirror Video</span>
                <button
                  type="button"
                  onClick={() => onWebcamMirroredChange(!webcamMirrored)}
                  className={`w-full py-1 rounded-lg text-[10px] font-semibold transition border flex items-center justify-center gap-1.5 ${
                    webcamMirrored
                      ? 'bg-zinc-800 text-zinc-200 border-[#FF7A33]/30 hover:bg-[#71717a]'
                      : 'bg-[#15161A] text-zinc-500 border-white/5 hover:bg-zinc-800'
                  }`}
                  id="btn-toggle-mirror"
                >
                  <RefreshCw size={11} className={webcamMirrored ? "animate-spin-slow text-[#FF7A33]" : ""} />
                  {webcamMirrored ? 'Mirrored (Flipped)' : 'Normal View'}
                </button>
              </div>
            </div>

            {/* AI Body Segmentation Background Effects */}
            <div className="space-y-2.5 border-t border-[#23252C]/40 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-bold flex items-center gap-1">
                  <Sparkles size={11} className="text-[#FF7A33]" />
                  AI Segmentation Backdrop
                </span>
                
                {/* Performance / low power Mode badge toggle */}
                <button
                  type="button"
                  onClick={() => onWebcamPerfModeChange(webcamPerfMode === 'high-quality' ? 'low-power' : 'high-quality')}
                  className={`text-[8px] font-mono px-2 py-0.5 rounded-full border transition-all ${
                    webcamPerfMode === 'high-quality'
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20 hover:bg-emerald-900/40'
                      : 'bg-amber-950/40 text-amber-500 border-amber-500/20 hover:bg-amber-900/40'
                  }`}
                  title="Toggle segmentation detail & frame-rate processing"
                  id="btn-toggle-perf-mode"
                >
                  {webcamPerfMode === 'high-quality' ? 'High Precision' : 'Power Saver'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1 bg-[#15161A] p-0.5 border border-white/5 rounded-xl">
                {([
                  { id: 'none', label: 'No Effects' },
                  { id: 'blur', label: 'Blur Background' },
                  { id: 'replace', label: 'Replace Backdrop' }
                ] as { id: WebcamBgEffect; label: string }[]).map((effect) => (
                  <button
                    key={effect.id}
                    type="button"
                    onClick={() => onWebcamBgEffectChange(effect.id)}
                    className={`py-1 rounded-lg text-[9px] font-semibold transition ${
                      webcamBgEffect === effect.id
                        ? 'bg-[#FF7A33]/15 text-[#FF7A33] border border-[#FF7A33]/10 font-bold'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    id={`btn-bg-effect-${effect.id}`}
                  >
                    {effect.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Replaced Backdrop details (Colors / Images) */}
            {webcamBgEffect === 'replace' && (
              <div className="bg-[#15161A]/60 border border-white/5 rounded-xl p-3 space-y-3 animate-fade-in" id="panel-replace-backdrop">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-400 cursor-pointer">
                    <input
                      type="radio"
                      name="replace-type"
                      checked={webcamReplaceType === 'color'}
                      onChange={() => onWebcamReplaceTypeChange('color')}
                      className="accent-[#FF7A33] scale-90"
                    />
                    Solid Color
                  </label>
                  <label className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-400 cursor-pointer">
                    <input
                      type="radio"
                      name="replace-type"
                      checked={webcamReplaceType === 'image'}
                      onChange={() => onWebcamReplaceTypeChange('image')}
                      className="accent-[#FF7A33] scale-90"
                    />
                    Custom Image
                  </label>
                </div>

                {webcamReplaceType === 'color' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { hex: '#10b981', label: 'Chroma Green' },
                        { hex: '#0f172a', label: 'Slate Void' },
                        { hex: '#3b82f6', label: 'Studio Blue' },
                        { hex: '#f59e0b', label: 'Warm Amber' },
                        { hex: '#ec4899', label: 'Magenta Key' }
                      ].map((pal) => (
                        <button
                          key={pal.hex}
                          type="button"
                          onClick={() => onWebcamReplaceColorChange(pal.hex)}
                          className={`w-5 h-5 rounded-full border transition-all ${
                            webcamReplaceColor === pal.hex
                              ? 'ring-2 ring-[#FF7A33] border-white scale-110'
                              : 'border-white/10 hover:scale-105'
                          }`}
                          style={{ backgroundColor: pal.hex }}
                          title={pal.label}
                        />
                      ))}
                      <div className="relative w-5 h-5 rounded-full border border-white/10 overflow-hidden bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 hover:scale-105 transition-all">
                        <input
                          type="color"
                          value={webcamReplaceColor}
                          onChange={(e) => onWebcamReplaceColorChange(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          title="Custom Color Picker"
                        />
                      </div>
                    </div>
                    <span className="text-[8px] font-mono text-zinc-500 block">
                      Active Chroma Color: <strong style={{ color: webcamReplaceColor }}>{webcamReplaceColor}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const fileInput = document.getElementById('webcam-image-file-input');
                          if (fileInput) fileInput.click();
                        }}
                        className="px-2 py-1 bg-zinc-800 text-zinc-300 text-[9px] font-mono hover:bg-zinc-700/80 rounded-lg border border-white/5 flex items-center gap-1"
                        id="btn-upload-vbg"
                      >
                        <ImageIcon size={11} />
                        Upload Backdrop
                      </button>
                      <input
                        type="file"
                        id="webcam-image-file-input"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            onWebcamReplaceImageUrlChange(url);
                          }
                        }}
                        className="hidden"
                      />
                    </div>
                    {webcamReplaceImageUrl ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={webcamReplaceImageUrl}
                          alt="Custom Backdrop"
                          className="w-12 h-8 rounded border border-white/10 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[8px] font-mono text-emerald-400">Backdrop loaded. Ready!</span>
                      </div>
                    ) : (
                      <span className="text-[8px] font-mono text-zinc-500">No custom background image uploaded. Using solid fallback.</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Interactive white-board background layout panel */}
      <div className="bg-[#1C1E24] border border-[#23252C] rounded-2xl p-6 shadow-xl flex flex-col gap-4">
        <h3 className="font-display font-semibold text-sm tracking-wide text-zinc-100 flex items-center gap-2">
          <LayoutGrid size={16} className="text-[#FF7A33]" />
          CANVAS SCENE & WORKSPACE
        </h3>
        
        <p className="text-xs text-zinc-500 leading-relaxed font-sans mt-0.5">
          Select or drag a presentation layout backdrop onto the recorder stage. Preload wireframes, drawings, or your slides.
        </p>

        {/* List of default canvas styles */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 mt-2" id="canvas-bg-grid">
          {([
            { id: 'charcoal', label: 'Solid Charcoal', style: 'bg-[#15161A] border-zinc-800' },
            { id: 'grid', label: 'Technical Grid', style: 'bg-[#1C1E24] border-zinc-800 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:10px_10px]' },
            { id: 'dots', label: 'Dot Matrix', style: 'bg-[#15161A] border-zinc-800 bg-[radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:10px_10px]' },
            { id: 'light-slate', label: 'Blueprint Slate', style: 'bg-[#ECECEC] border-zinc-300 text-zinc-800' },
          ] as { id: CanvasBackground; label: string; style: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => onCanvasBgChange(tab.id)}
              className={`h-16 rounded-xl border flex flex-col justify-end p-2.5 text-left text-[10px] font-semibold tracking-wide capitalize transition relative overflow-hidden ${tab.style} ${
                canvasBg === tab.id
                  ? 'border-[#FF7A33] ring-1 ring-[#FF7A33]/30 text-zinc-200'
                  : 'hover:border-zinc-700 text-zinc-400'
              }`}
              id={`canvas-bg-button-${tab.id}`}
            >
              <span className="z-10 bg-black/60 font-mono text-[9px] px-1 py-0.5 rounded text-white">{tab.label}</span>
            </button>
          ))}

          {/* Picture Backdrop button */}
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer z-20"
              id="file-bg-loader"
            />
            <button
              type="button"
              className={`w-full h-16 rounded-xl border border-dashed flex flex-col items-center justify-center p-2.5 text-center text-[10px] font-semibold tracking-wide transition relative ${
                canvasBg === 'image'
                  ? 'border-[#FF7A33] text-[#FF7A33] bg-[#FF7A33]/5'
                  : 'border-zinc-800 hover:border-zinc-700 text-zinc-400'
              }`}
              id="btn-upload-image-backdrop"
            >
              <ImageIcon size={18} className="text-[#FF7A33] mb-1" />
              <span>Import Slide</span>
            </button>
          </div>
        </div>

        {/* Tip text summarizing layout constraints */}
        <div className="mt-4 p-3.5 rounded-xl bg-[#15161A] border border-white/5 flex items-start gap-2.5 text-[10px] text-zinc-500 leading-relaxed font-mono">
          <HelpCircle size={14} className="text-[#38BDF8] shrink-0 mt-0.5" />
          <span>
            Pointly records the presentation canvas and mixes mic audio client-side. To capture a walk-through, 
            simply load slide graphics or screenshots of your work directly into the Presenter Canvas stage.
          </span>
        </div>
      </div>
    </div>
  );
};
