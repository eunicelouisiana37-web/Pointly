import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AnnotationTool,
  BrushColor,
  CanvasBackground,
  WebcamFrame,
  VideoFilter,
  CaptureMode,
  Recording,
  AppState,
  WebcamFrameStyle,
  WebcamBgEffect,
  WebcamReplaceType,
  WebcamPerformanceMode
} from './types';
import { LandingPage } from './components/LandingPage';
import { WorkspaceCanvas } from './components/WorkspaceCanvas';
import { DeviceSelectors } from './components/DeviceSelectors';
import { PrivacyCard } from './components/PrivacyCard';
import { VideoLibrary } from './components/VideoLibrary';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { PostRecordingModal } from './components/PostRecordingModal';
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal';
import { AlertCircle, HelpCircle as HelpIcon, Info, Laptop, Keyboard, Sun, Moon } from 'lucide-react';
import { getAllRecordings, saveRecording, deleteRecording, updateRecordingName, initDB, DBRecording } from './lib/db';
import { 
  Video, 
  Tv, 
  Sparkles, 
  ShieldCheck, 
  Circle, 
  Pause, 
  Play, 
  Square, 
  Paintbrush, 
  MousePointer, 
  Zap, 
  Eraser, 
  ArrowRight, 
  SquareDot, 
  Layers,
  FileMinus,
  HelpCircle,
  HardDrive,
  Type
} from 'lucide-react';

export default function App() {
  // --- STATE DECLARATIONS ---
  const [currentView, setCurrentView] = useState<'landing' | 'studio'>('landing');
  const [recordings, setRecordings] = useState<DBRecording[]>([]);
  const [selectedPlayerRecording, setSelectedPlayerRecording] = useState<DBRecording | null>(null);
  const [postRecordingBlob, setPostRecordingBlob] = useState<Blob | null>(null);
  const [postRecordingDuration, setPostRecordingDuration] = useState<number>(0);

  // Recorder Configurations
  const [captureMode, setCaptureMode] = useState<CaptureMode>('studio');
  const [recordingState, setRecordingState] = useState<'idle' | 'countdown' | 'recording' | 'paused'>('idle');
  const [countdownVal, setCountdownVal] = useState(3);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedResolution, setSelectedResolution] = useState<'720p' | '1080p' | '4k'>('1080p');
  const [selectedFps, setSelectedFps] = useState<30 | 60>(60);
  const [systemAudioActive, setSystemAudioActive] = useState(false);
  const [countdownDuration, setCountdownDuration] = useState<0 | 3 | 5 | 10>(3);
  const [noiseCancellationActive, setNoiseCancellationActive] = useState(true);

  // Application Visual Theme
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('pointly-theme');
    return (stored === 'light' || stored === 'dark') ? stored : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('pointly-theme', theme);
  }, [theme]);

  // IndexedDB Storage Quotas & Live Monitoring
  const [storageUsage, setStorageUsage] = useState<number>(0);
  const [storageQuota, setStorageQuota] = useState<number>(1024 * 1024 * 1024 * 2); // Fallback to 2 GB until estimated

  // Canvas Settings (Easel)
  const [currentTool, setCurrentTool] = useState<AnnotationTool>('brush');
  const [brushColor, setBrushColor] = useState<BrushColor>('amber');
  const [brushWidth, setBrushWidth] = useState(6);
  const [canvasBg, setCanvasBg] = useState<CanvasBackground>('charcoal');
  const [bgImageUrl, setBgImageUrl] = useState<string | undefined>(undefined);

  // Feed/Webcam hardware
  const [microphoneActive, setMicrophoneActive] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const [selectedMicId, setSelectedMicId] = useState('');
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [webcamFrame, setWebcamFrame] = useState<WebcamFrame>('circle');
  const [videoFilter, setVideoFilter] = useState<VideoFilter>('none');
  const [webcamFrameStyle, setWebcamFrameStyle] = useState<WebcamFrameStyle>('clean');
  const [webcamBgEffect, setWebcamBgEffect] = useState<WebcamBgEffect>('none');
  const [webcamReplaceType, setWebcamReplaceType] = useState<WebcamReplaceType>('color');
  const [webcamReplaceColor, setWebcamReplaceColor] = useState('#10b981'); // emerald
  const [webcamReplaceImageUrl, setWebcamReplaceImageUrl] = useState<string>('');
  const [webcamMirrored, setWebcamMirrored] = useState(true);
  const [webcamPerfMode, setWebcamPerfMode] = useState<WebcamPerformanceMode>('high-quality');

  // Phase 6 System Diagnostic and Keyboard states
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [browserNotice, setBrowserNotice] = useState<{
    type: 'safari' | 'mobile' | 'error';
    title: string;
    message: string;
  } | null>(null);

  // Media Streams reference
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [canvasStream, setCanvasStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  // Trigger global compatibility assessment on mount
  useEffect(() => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const supportsDisplayMedia = typeof navigator.mediaDevices !== 'undefined' && typeof navigator.mediaDevices.getDisplayMedia === 'function';

    if (isMobileDevice) {
      setBrowserNotice({
        type: 'mobile',
        title: 'Desktop Optimized Experience',
        message: 'Pointly screen capture engine is desktop-only. For the full presentation with drawing whiteboard easel and screen sharing, please log in on a desktop browser.',
      });
    } else if (isSafari) {
      setBrowserNotice({
        type: 'safari',
        title: 'Safari Compatibility Warning',
        message: 'Safari provides partial HTML5 screen stream sharing. If stream resolution drops or authorization fails, we suggest modern Google Chrome, Microsoft Edge, or Mozilla Firefox for a zero-lag experience.',
      });
    } else if (!supportsDisplayMedia) {
      setBrowserNotice({
        type: 'error',
        title: 'Screen Capture API Unavailable',
        message: 'Your current browser container does not support getDisplayMedia APIs. Please make sure you are not in an isolated sandbox or incognito frame with disabled device rules.',
      });
    }
  }, []);

  // Global Keyboard Shortcuts Effect for '?'' and 'Esc' keys
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Direct pass if inside typing inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key;

      if (key === '?') {
        e.preventDefault();
        setIsShortcutsHelpOpen(prev => !prev);
      } else if (key === 'Escape' || key === 'Esc') {
        setIsShortcutsHelpOpen(false);
        setBrowserNotice(null);
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts);
    };
  }, []);

  // Recorder instances
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rawAudioStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // --- INITIALIZATION & RECOVERY ---
  useEffect(() => {
    const initApp = async () => {
      try {
        await initDB();
        await refreshRecordingsList();
      } catch (err) {
        console.error('Failed to initialize local IndexedDB database:', err);
      }
    };
    initApp();

    return () => {
      // Stream closures
      cleanupStreams();
    };
  }, []);

  const updateStorageEstimate = async () => {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        setStorageUsage(estimate.usage ?? 0);
        setStorageQuota(estimate.quota ?? (1024 * 1024 * 1024 * 2));
      } catch (err) {
        console.warn('Could not read navigator storage estimates:', err);
      }
    }
  };

  // Keep storage estimates synchronized with any database state change
  useEffect(() => {
    updateStorageEstimate();
  }, [recordings]);

  const refreshRecordingsList = async () => {
    try {
      const recs = await getAllRecordings();
      setRecordings(recs);
    } catch (e) {
      console.error('Failed to list recordings:', e);
    }
  };

  const cleanupStreams = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    if (audioStream) {
      audioStream.getTracks().forEach((t) => t.stop());
      setAudioStream(null);
    }
    if (rawAudioStreamRef.current) {
      rawAudioStreamRef.current.getTracks().forEach((t) => t.stop());
      rawAudioStreamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const applyNoiseCancellation = (rawStream: MediaStream, forceNoiseCancellation?: boolean): MediaStream => {
    const isEnabled = forceNoiseCancellation !== undefined ? forceNoiseCancellation : noiseCancellationActive;
    if (!isEnabled) {
      return rawStream;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return rawStream;

      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(rawStream);

      // Stage 1: Highpass filter (cuts low frequencies like fan hums, background air vibration below 85Hz)
      const hpFilter = ctx.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.setValueAtTime(85, ctx.currentTime);

      // Stage 2: Notch filter at 60Hz and 50Hz (cancels power line electricity hum)
      const notch50 = ctx.createBiquadFilter();
      notch50.type = 'notch';
      notch50.frequency.setValueAtTime(50, ctx.currentTime);
      notch50.Q.setValueAtTime(12, ctx.currentTime);

      const notch60 = ctx.createBiquadFilter();
      notch60.type = 'notch';
      notch60.frequency.setValueAtTime(60, ctx.currentTime);
      notch60.Q.setValueAtTime(12, ctx.currentTime);

      // Stage 3: Dynamic Noise Gate compressor
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-38, ctx.currentTime); // quiet background noise gets heavily attenuated
      compressor.knee.setValueAtTime(10, ctx.currentTime);
      compressor.ratio.setValueAtTime(15, ctx.currentTime);
      compressor.attack.setValueAtTime(0.002, ctx.currentTime);
      compressor.release.setValueAtTime(0.20, ctx.currentTime);

      // Chain connections: Source -> HPF -> Notch 50 -> Notch 60 -> Compressor -> Destination
      source.connect(hpFilter);
      hpFilter.connect(notch50);
      notch50.connect(notch60);
      notch60.connect(compressor);

      const dest = ctx.createMediaStreamDestination();
      compressor.connect(dest);

      return dest.stream;
    } catch (e) {
      console.warn('Web Audio Studio Noise Gate could not be initialized:', e);
      return rawStream;
    }
  };

  // --- MICROPHONE ACQUISITION ---
  const activateMicrophone = async (deviceId?: string, forceNoiseCancellation?: boolean) => {
    deactivateMicrophone();

    try {
      // Hardware-level DSP constraints
      const useNoiseCancel = forceNoiseCancellation !== undefined ? forceNoiseCancellation : noiseCancellationActive;
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: useNoiseCancel,
        noiseSuppression: useNoiseCancel,
        autoGainControl: useNoiseCancel,
      };
      if (deviceId) {
        audioConstraints.deviceId = { exact: deviceId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });

      rawAudioStreamRef.current = stream;

      // Software active noise cancelling and static filter
      const finalStream = applyNoiseCancellation(stream, useNoiseCancel);

      setAudioStream(finalStream);
      setMicrophoneActive(true);
      if (stream.getTracks()[0] && !deviceId) {
        setSelectedMicId(stream.getTracks()[0].getSettings().deviceId || '');
      }
      return finalStream;
    } catch (err) {
      console.warn('Microphone permission or link failed:', err);
      setMicrophoneActive(false);
      setAudioStream(null);
      return null;
    }
  };

  const deactivateMicrophone = () => {
    if (audioStream) {
      audioStream.getTracks().forEach((t) => t.stop());
      setAudioStream(null);
    }
    if (rawAudioStreamRef.current) {
      rawAudioStreamRef.current.getTracks().forEach((t) => t.stop());
      rawAudioStreamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setMicrophoneActive(false);
  };

  // --- WEBCAM CAMERA ACQUISITION ---
  const activateWebcam = async (deviceId?: string) => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : { width: 480, height: 480 },
        audio: false,
      });
      setCameraStream(stream);
      setWebcamActive(true);
      if (stream.getVideoTracks()[0] && !deviceId) {
        setSelectedCameraId(stream.getVideoTracks()[0].getSettings().deviceId || '');
      }
      return stream;
    } catch (err) {
      console.warn('Camera elements capture or permission denied:', err);
      setWebcamActive(false);
      setCameraStream(null);
      return null;
    }
  };

  const deactivateWebcam = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setWebcamActive(false);
  };

  // --- EFFECT HANDLERS FOR HOT PLUGS ---
  const handleMicToggle = async () => {
    if (microphoneActive) {
      deactivateMicrophone();
    } else {
      await activateMicrophone(selectedMicId);
    }
  };

  const handleCameraToggle = async () => {
    if (webcamActive) {
      deactivateWebcam();
    } else {
      await activateWebcam(selectedCameraId);
    }
  };

  const handleMicChange = async (id: string) => {
    setSelectedMicId(id);
    if (microphoneActive) {
      await activateMicrophone(id);
    }
  };

  const handleNoiseCancellationToggle = async (active: boolean) => {
    setNoiseCancellationActive(active);
    if (microphoneActive) {
      await activateMicrophone(selectedMicId, active);
    }
  };

  const handleCameraChange = async (id: string) => {
    setSelectedCameraId(id);
    if (webcamActive) {
      await activateWebcam(id);
    }
  };

  const handleCustomImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBgImageUrl(reader.result);
        setCanvasBg('image');
      }
    };
    reader.readAsDataURL(file);
  };

  // --- CANVAS STREAM LINK ---
  const handleCanvasStreamReady = useCallback((stream: MediaStream) => {
    setCanvasStream(stream);
  }, []);

  // --- RECORDER RUNTIME MANAGEMENT ---
  const startRecordingFlow = () => {
    if (recordingState !== 'idle') return;

    if (countdownDuration === 0) {
      executeStart();
      return;
    }

    // Trigger Countdown sequences
    setRecordingState('countdown');
    setCountdownVal(countdownDuration);

    const countdownInterval = setInterval(() => {
      setCountdownVal((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          executeStart();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const executeStart = async () => {
    recordedChunksRef.current = [];
    setElapsedSeconds(0);

    let recordedStream: MediaStream;

    try {
      if (captureMode === 'studio') {
        // Mode 1: Baked whiteboard presentation canvas recording
        if (!canvasStream) {
          throw new Error('Canvas recording feed is not linked or active.');
        }

        const videoTrack = canvasStream.getVideoTracks()[0];
        if (!videoTrack) {
          throw new Error('No active video capture tracks found on presentation canvas.');
        }

        let audioTrack: MediaStreamTrack | null = null;
        if (microphoneActive) {
          let actStream = audioStream;
          if (!actStream) {
            actStream = await activateMicrophone(selectedMicId);
          }
          if (actStream) {
            audioTrack = actStream.getAudioTracks()[0] || null;
          }
        }

        const compositeTracks: MediaStreamTrack[] = [videoTrack];
        if (audioTrack) {
          compositeTracks.push(audioTrack);
        }

        recordedStream = new MediaStream(compositeTracks);
      } else {
        // Mode 2: Standard desktop browser/screen share recording with custom constraints
        const idealWidth = selectedResolution === '720p' ? 1280 : selectedResolution === '1080p' ? 1920 : 3840;
        const idealHeight = selectedResolution === '720p' ? 720 : selectedResolution === '1080p' ? 1080 : 2160;

        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: idealWidth },
            height: { ideal: idealHeight },
            frameRate: { ideal: selectedFps },
          },
          audio: systemAudioActive ? true : false,
        });

        const videoTrack = displayStream.getVideoTracks()[0];
        
        // Setup listener when user stops screen share from browser banner
        videoTrack.onended = () => {
          stopRecording();
        };

        const compositeTracks: MediaStreamTrack[] = [videoTrack];

        // Combine system audio track if captured page/tab contains audio
        const systemAudioTracks = displayStream.getAudioTracks();
        if (systemAudioActive && systemAudioTracks.length > 0) {
          compositeTracks.push(systemAudioTracks[0]);
        }

        // Combine microphone stream if enabled
        if (microphoneActive) {
          let actStream = audioStream;
          if (!actStream) {
            actStream = await activateMicrophone(selectedMicId);
          }
          if (actStream) {
            const micTrack = actStream.getAudioTracks()[0];
            if (micTrack) {
              compositeTracks.push(micTrack);
            }
          }
        }

        recordedStream = new MediaStream(compositeTracks);
      }

      // Configure MediaRecorder with popular container compatibility options
      let options = { mimeType: 'video/webm;codecs=vp9,opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm;codecs=vp8,opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: 'video/webm' };
        }
      }

      const recorder = new MediaRecorder(recordedStream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const finalBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const durationSecs = elapsedSeconds;

        if (finalBlob.size > 0) {
          setPostRecordingBlob(finalBlob);
          setPostRecordingDuration(durationSecs || 1);
        }

        // Reset recorder state
        setRecordingState('idle');
        setElapsedSeconds(0);
        recordedChunksRef.current = [];
      };

      // Collect slice chunks every 1 second
      recorder.start(1000);
      setRecordingState('recording');

      // Boot timer clock
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Recording initialization failed:', err);
      const errName = err?.name || '';
      let alertTitle = 'Screen Capture Cancelled';
      let alertMsg = 'The recording authorization request was denied or cancelled by the user.';
      
      if (errName === 'NotAllowedError') {
        alertTitle = 'Permission Access Denied';
        alertMsg = 'Pointly was not granted access to capture your desktop/tabs. Please click "Studio Workspace" or "Start" and allow screen recording permissions in the browser prompt.';
      } else if (errName === 'NotFoundError') {
        alertTitle = 'No Camera or Screen Detected';
        alertMsg = 'Your system reported no active screens, tabs, or media streams available for capture. Check your display cables and try again.';
      }

      setBrowserNotice({
        type: 'error',
        title: alertTitle,
        message: alertMsg,
      });
      setRecordingState('idle');
    }
  };

  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recordingState === 'recording') {
      recorder.pause();
      setRecordingState('paused');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const resumeRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recordingState === 'paused') {
      recorder.resume();
      setRecordingState('recording');
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && (recordingState === 'recording' || recordingState === 'paused')) {
      recorder.stop();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const handleSaveToLibrary = async (name: string, blob: Blob, duration: number) => {
    try {
      // TODO: Use @google/genai SDK on server-side to generate smart titles, tags, and automated transcripts.
      // Groundwork capability MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API in metadata.json is prepared for this upcoming AI integration.
      await saveRecording({
        id: crypto.randomUUID(),
        name,
        duration: duration || 1,
        size: blob.size,
        createdAt: Date.now(),
        mode: captureMode,
        videoBlob: blob,
      });
      await refreshRecordingsList();
    } catch (err) {
      console.error('Failed to save to local offline library:', err);
    }
  };

  // --- ITEM ACTIONS (DELETE, RENAME, DIRECT PURGE) ---
  const handleItemDelete = async (id: string) => {
    try {
      await deleteRecording(id);
      await refreshRecordingsList();
    } catch (e) {
      console.error('Delete item failed from DB:', e);
    }
  };

  const handleItemRename = async (id: string, newName: string) => {
    try {
      await updateRecordingName(id, newName);
      await refreshRecordingsList();
    } catch (e) {
      console.error('Rename item failed on DB:', e);
    }
  };

  const handleFullPurge = async () => {
    try {
      // Delete everything from IndexedDB
      const all = await getAllRecordings();
      for (const rec of all) {
        await deleteRecording(rec.id);
      }
      await refreshRecordingsList();
    } catch (e) {
      console.warn('Wipe operations failed:', e);
    }
  };

  // --- METRIC UTILITIES ---
  const formatTimeClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number, decimals = 1): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className={`min-h-screen relative flex flex-col pb-16 transition-colors duration-150 ${theme === 'light' ? 'light-theme bg-[#FAFBFD]' : 'bg-[#15161A]'} text-[#F4F1EA] noise-bg`} id="pointly-main-studio">
      
      {/* 1. TOP NAV HEADER */}
      <header className="h-20 border-b border-[#8A8780]/20 bg-[#15161A]/90 backdrop-blur-md sticky top-0 z-40 px-6 sm:px-10 flex items-center justify-between" id="app-header">
        <div 
          className="flex items-center gap-3 cursor-pointer select-none group"
          onClick={() => setCurrentView('landing')}
          id="header-logo-container"
        >
          <div className="w-8 h-8 bg-[#FF7A33] rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
          <span className="text-2xl font-bold tracking-tight text-[#F4F1EA] flex items-center gap-2" style={{ fontFamily: "Georgia, serif" }}>
            Pointly.
            <span className="text-[9px] bg-[#FF7A33]/15 border border-[#FF7A33]/30 text-[#FF7A33] font-mono px-2 py-0.5 rounded-full tracking-widest font-normal uppercase" style={{ fontFamily: "var(--font-mono)" }}>
              BETA
            </span>
          </span>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          {currentView === 'landing' ? (
            <button 
              onClick={() => setCurrentView('studio')}
              className="bg-[#FF7A33] hover:bg-[#ff8c4d] text-white px-5 py-2 rounded-full text-sm font-semibold transition cursor-pointer"
              id="header-cta-studio"
            >
              Studio Workspace
            </button>
          ) : (
            <button 
              onClick={() => setCurrentView('landing')}
              className="text-[#8A8780] hover:text-[#F4F1EA] text-sm font-medium transition cursor-pointer"
              id="header-cta-landing"
            >
              &larr; Return to Home
            </button>
          )}
          <div className="h-6 w-px bg-[#8A8780]/30 hidden md:block"></div>
          
          {/* Visual Theme Toggle */}
          <button
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C1E24] border border-white/10 hover:border-[#FF7A33]/40 hover:bg-zinc-800 transition cursor-pointer text-xs font-semibold text-zinc-300"
            title={theme === 'dark' ? 'Switch to Clean Light Theme' : 'Switch to Sophisticated Dark Theme'}
            id="theme-toggle-button"
          >
            {theme === 'dark' ? (
              <>
                <Sun size={13} className="text-[#FF7A33]" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={13} className="text-[#FF7A33]" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>

          <div className="h-6 w-px bg-[#8A8780]/30 hidden md:block"></div>
          <button
            onClick={() => setIsShortcutsHelpOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C1E24] border border-white/10 hover:border-[#FF7A33]/40 hover:bg-zinc-800 transition cursor-pointer text-xs font-semibold text-zinc-300"
            title="Keyboard Shortcuts Guide (Press '?')"
            id="header-kb-help-btn"
          >
            <Keyboard size={13} className="text-[#FF7A33]" />
            <span className="hidden sm:inline">Shortcuts</span>
            <span className="bg-zinc-900 border border-white/5 text-[9px] px-1 rounded font-mono font-bold text-[#FF7A33]">?</span>
          </button>
          <div className="h-6 w-px bg-[#8A8780]/30 hidden md:block"></div>
          <div className="flex items-center gap-1.5 bg-[#4ADE80]/10 px-3 py-1.5 rounded-full border border-[#4ADE80]/30">
            <div className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full"></div>
            <span className="text-[#4ADE80] text-xs font-medium">Privacy Shield Active</span>
          </div>
          <div className="h-6 w-px bg-[#8A8780]/30 hidden lg:block"></div>
          <div className="hidden lg:flex flex-col items-start w-52" id="indexeddb-storage-monitor">
            <div className="flex items-center justify-between w-full text-[10px] font-mono tracking-wider text-[#8A8780] font-bold uppercase">
              <span className="flex items-center gap-1">
                <HardDrive size={11} className="text-[#FF7A33]" />
                Sandbox Storage
              </span>
              <span>{((storageUsage / storageQuota) * 100).toFixed(2)}%</span>
            </div>
            {/* Premium miniature visual progress bar */}
            <div className="w-full h-1.5 bg-[#23252C] rounded-full overflow-hidden mt-1 border border-white/5 relative" title={`Exact browser-allocated sandbox space: ${formatBytes(storageUsage)} used of ${formatBytes(storageQuota)}`}>
              <div 
                className="h-full bg-gradient-to-r from-[#FF7A33] to-[#ff985f] rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(1, (storageUsage / storageQuota) * 100))}%` }}
              ></div>
            </div>
            <div className="flex justify-between w-full text-[9px] font-mono text-zinc-400 mt-0.5">
              <span>{formatBytes(storageUsage)} used</span>
              <span>limit {formatBytes(storageQuota)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* SYSTEM DIAGNOSTICS & SYSTEM NOTICES BANNER */}
      {browserNotice && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5 w-full animate-fade-in" id="system-diagnostic-banner">
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 shadow-md relative overflow-hidden transition-all duration-300 ${
            browserNotice.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              : browserNotice.type === 'mobile'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-[#FF7A33]/15 border-[#FF7A33]/30 text-zinc-200'
          }`}>
            <div className={`p-1.5 rounded-lg shrink-0 ${
              browserNotice.type === 'error'
                ? 'bg-rose-500/20 text-rose-400'
                : browserNotice.type === 'mobile'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-[#FF7A33]/20 text-[#FF7A33]'
            }`}>
              {browserNotice.type === 'error' ? (
                <AlertCircle size={18} />
              ) : browserNotice.type === 'mobile' ? (
                <Laptop size={18} />
              ) : (
                <Info size={18} />
              )}
            </div>

            <div className="space-y-1 pr-8">
              <h4 className="text-xs font-semibold uppercase tracking-wider font-mono">
                {browserNotice.title}
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans font-medium">
                {browserNotice.message}
              </p>
            </div>

            <button
              onClick={() => setBrowserNotice(null)}
              className="absolute top-3.5 right-3.5 text-zinc-400 hover:text-zinc-100 p-1 hover:bg-white/5 rounded-md transition"
              aria-label="Dismiss message"
              id="dismiss-browser-notice"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 2. DYNAMIC COUNTDOWN INTERMEDIARY FRAME */}
      {recordingState === 'countdown' && (
        <div className="fixed inset-0 bg-[#090A0C]/94 z-50 flex flex-col items-center justify-center" id="countdown-modal-layer">
          <div className="text-center space-y-4 animate-bounce">
            <span className="font-display font-black text-8xl text-[#FF7A33] block tracking-tighter">
              {countdownVal}
            </span>
            <p className="text-sm font-mono tracking-widest text-zinc-500 uppercase">Prepare Presentation Studio...</p>
          </div>
        </div>
      )}

      {currentView === 'landing' ? (
        <LandingPage 
          onStartRecording={() => setCurrentView('studio')} 
          recordingsCount={recordings.length} 
        />
      ) : (
        <>
          {/* 3. MAIN WORKSPACE CONTAINER */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex-1 flex flex-col gap-8 w-full" id="studio-workspace">
        
        {/* ROW-1: RECORDING CONTROLLER HUB */}
        <section className="bg-[#1C1E24] border border-[#23252C] rounded-2xl p-6 shadow-xl" id="recorder-dashboard">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-xl">
              <h2 className="font-display font-semibold text-zinc-100 text-sm tracking-wide">CHOOSE CAPTURE PATTERN</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Choose <strong className="text-[#FF7A33]">Presenter Studio</strong> to sketch marks, pointers, and custom camera overlays onto preloaded presentation backdrops. 
                Choose <strong className="text-[#4ADE80]">Desktop Capture</strong> to record your full external dashboard screen.
              </p>

              {/* Source toggle Buttons */}
              <div className="flex items-center gap-3 pt-3.5" id="source-selections">
                <button
                  onClick={() => setCaptureMode('studio')}
                  disabled={recordingState !== 'idle'}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                    captureMode === 'studio'
                      ? 'bg-[#FF7A33] text-[#F4F1EA] shadow-lg shadow-[#FF7A33]/25'
                      : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800'
                  } disabled:opacity-40`}
                  id="tab-studio-mode"
                >
                  <Sparkles size={14} />
                  Presenter Studio (In-App)
                </button>

                <button
                  onClick={() => setCaptureMode('screen')}
                  disabled={recordingState !== 'idle'}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                    captureMode === 'screen'
                      ? 'bg-[#FF7A33] text-[#F4F1EA] shadow-lg shadow-[#FF7A33]/25'
                      : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800'
                  } disabled:opacity-40`}
                  id="tab-screen-mode"
                >
                  <Tv size={14} />
                  Desktop Screen Capture
                </button>
              </div>

              {/* 2. PRE-RECORDING CONFIGURATION PANEL */}
              <div className="pt-5 border-t border-[#23252C] mt-5 space-y-4" id="pre-recording-configs">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#FF7A33] font-bold block">
                  Studio Capture Quality & Sync Settings
                </span>
                <div className="grid grid-cols-2 gap-4">
                  {/* Resolution Selector */}
                  <div className="space-y-1">
                    <label className="text-zinc-400 text-[11px] font-medium block">Resolution</label>
                    <select
                      value={selectedResolution}
                      onChange={(e) => setSelectedResolution(e.target.value as any)}
                      disabled={recordingState !== 'idle'}
                      className="w-full bg-[#15161A] text-zinc-300 border border-[#23252C] rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#FF7A33]/50 font-mono transition"
                      id="select-resolution"
                    >
                      <option value="720p">720p HD (1280x720)</option>
                      <option value="1080p">1080p Full HD</option>
                      <option value="4k">4K Ultra HD</option>
                    </select>
                  </div>

                  {/* Frame Rate Selector */}
                  <div className="space-y-1">
                    <label className="text-zinc-400 text-[11px] font-medium block">Frame Rate</label>
                    <select
                      value={selectedFps}
                      onChange={(e) => setSelectedFps(Number(e.target.value) as any)}
                      disabled={recordingState !== 'idle'}
                      className="w-full bg-[#15161A] text-zinc-300 border border-[#23252C] rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#FF7A33]/50 font-mono transition"
                      id="select-fps"
                    >
                      <option value={30}>30 FPS (Standard)</option>
                      <option value={60}>60 FPS (Super Smooth)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Countdown Timer Selector */}
                  <div className="space-y-1">
                    <label className="text-zinc-400 text-[11px] font-medium block">Countdown Delay</label>
                    <select
                      value={countdownDuration}
                      onChange={(e) => setCountdownDuration(Number(e.target.value) as any)}
                      disabled={recordingState !== 'idle'}
                      className="w-full bg-[#15161A] text-zinc-300 border border-[#23252C] rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#FF7A33]/50 font-mono transition"
                      id="select-countdown-duration"
                    >
                      <option value={0}>Off (Immediate)</option>
                      <option value={3}>3 Seconds</option>
                      <option value={5}>5 Seconds</option>
                      <option value={10}>10 Seconds</option>
                    </select>
                  </div>

                  {/* System Audio Toggle */}
                  <div className="space-y-1 flex flex-col justify-end">
                    <label className="text-zinc-400 text-[11px] font-medium pb-1.5 flex items-center justify-between" id="label-system-audio">
                      <span>System Audio</span>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">Desktop only</span>
                    </label>
                    <button
                      onClick={() => setSystemAudioActive(!systemAudioActive)}
                      disabled={recordingState !== 'idle'}
                      className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition border ${
                        systemAudioActive
                          ? 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30'
                          : 'bg-zinc-800/40 text-zinc-500 border-[#23252C] hover:bg-zinc-800'
                      } disabled:opacity-40`}
                      id="toggle-system-audio"
                    >
                      {systemAudioActive ? 'Enabled' : 'Muted'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  {/* Dynamic Hardware Shortcut links */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 block">Webcam Feed status</span>
                    <button
                      onClick={handleCameraToggle}
                      className={`w-full flex items-center justify-between py-1.5 px-3 rounded-xl text-xs font-medium border ${
                        webcamActive
                          ? 'bg-[#FF7A33]/10 text-[#FF7A33] border-[#FF7A33]/30'
                          : 'bg-zinc-800/40 text-zinc-500 border-[#23252C] hover:bg-zinc-800'
                      }`}
                      id="pre-req-btn-webcam"
                    >
                      <span>Webcam Overlay</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-black/40 rounded-full font-mono">{webcamActive ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 block">Microphone Live status</span>
                    <button
                      onClick={handleMicToggle}
                      className={`w-full flex items-center justify-between py-1.5 px-3 rounded-xl text-xs font-medium border ${
                        microphoneActive
                          ? 'bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/30'
                          : 'bg-zinc-800/40 text-zinc-500 border-[#23252C] hover:bg-zinc-800'
                      }`}
                      id="pre-req-btn-mic"
                    >
                      <span>Mic Track Sync</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-black/40 rounded-full font-mono">{microphoneActive ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE HUD TIMERS & TRIGGER SWITCHES */}
            <div className="bg-[#15161A] p-4.5 border border-white/5 rounded-2xl w-full lg:w-96 flex flex-col justify-center gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-wider text-zinc-500 font-bold uppercase">Recording State:</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  recordingState === 'recording' ? 'bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/20 animate-pulse' :
                  recordingState === 'paused' ? 'bg-amber-500/15 text-[#FF7A33] border border-amber-500/10' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {recordingState}
                </span>
              </div>

              {/* HUD Chrono & Stats indicators */}
              <div className="flex items-baseline justify-between border-b border-[#23252C] pb-3">
                <span className="font-display font-black text-3xl tracking-tight text-white font-mono">
                  {formatTimeClock(elapsedSeconds)}
                </span>
                
                {recordingState !== 'idle' && (
                  <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                    <HardDrive size={10} className="text-[#FF7A33]" />
                    Real-time frame write active
                  </span>
                )}
              </div>

              {/* Recording Action Switches */}
              <div className="flex items-center gap-2.5">
                {recordingState === 'idle' ? (
                  <button
                    onClick={startRecordingFlow}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#FF7A33] hover:bg-[#E35E17] text-[#F4F1EA] font-semibold text-xs py-3 px-4 rounded-xl transition shadow-lg active:scale-95"
                    id="btn-start-rec"
                  >
                    <Circle size={12} className="fill-[#F4F1EA]" />
                    Record {captureMode === 'studio' ? 'Presenter' : 'Screen'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 w-full" id="rec-runtime-triggers">
                    {recordingState === 'recording' ? (
                      <button
                        onClick={pauseRecording}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs py-2.5 px-3 rounded-lg border border-white/5 transition"
                        title="Pause recording feed"
                        id="btn-pause-rec"
                      >
                        <Pause size={12} />
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={resumeRecording}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-green-950/20 hover:bg-green-950/40 border border-green-500/15 text-green-400 font-semibold text-xs py-2.5 px-3 rounded-lg transition"
                        title="Resume recording"
                        id="btn-resume-rec"
                      >
                        <Play size={12} />
                        Resume
                      </button>
                    )}

                    <button
                      onClick={stopRecording}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 text-red-400 font-semibold text-xs py-2.5 px-3 rounded-lg transition"
                      title="Finish and save file"
                      id="btn-stop-rec"
                    >
                      <Square size={12} className="fill-current" />
                      Stop
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ROW-2: DRAWING CONSOLE DOCK & CANVAS WORKSPACE */}
        <section className={`transition duration-500 ${captureMode === 'studio' ? 'block' : 'opacity-25 pointer-events-none'}`} id="easel-studio-container">
          <div className="flex flex-col gap-6">
            
            {/* Whiteboard Options and Pen Dock */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 bg-[#1C1E24] border border-[#23252C] rounded-2xl p-5 shadow-xl" id="drawing-tools-dock">
              {/* Brush Tools Buttons group */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold">DRAWING BRUSHES:</span>
                
                <div className="flex flex-wrap items-center gap-1 bg-[#15161A] p-1 border border-white/5 rounded-xl" id="annotation-group">
                  {([
                    { id: 'brush', label: 'Easel Pen', icon: Paintbrush },
                    { id: 'highlighter', label: 'Highlighter', icon: Paintbrush },
                    { id: 'laser', label: 'Laser Pointer', icon: Zap },
                    { id: 'spotlight', label: 'Spotlight HUD', icon: MousePointer },
                    { id: 'arrow', label: 'Arrow Pointer', icon: ArrowRight },
                    { id: 'rect', label: 'Rectangle Box', icon: SquareDot },
                    { id: 'circle', label: 'Circle Mark', icon: Circle },
                    { id: 'text', label: 'Text Tool', icon: Type },
                    { id: 'eraser', label: 'Erase Marks', icon: Eraser },
                  ] as { id: AnnotationTool; label: string; icon: any }[]).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setCurrentTool(t.id)}
                      className={`p-2 rounded-lg transition flex items-center gap-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF7A33]/50 focus:ring-offset-1 focus:ring-offset-[#1C1E24] cursor-pointer ${
                        currentTool === t.id
                          ? 'bg-[#FF7A33]/15 text-[#FF7A33] border border-[#FF7A33]/25 font-bold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                      }`}
                      title={`${t.label} (Shortcut: press tool key)`}
                      aria-label={t.label}
                      aria-pressed={currentTool === t.id}
                      id={`tool-btn-${t.id}`}
                    >
                      <t.icon size={13} className={t.id === 'highlighter' ? 'opacity-85 scale-y-90 rotate-45' : ''} />
                      <span className="hidden xl:inline">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color parameters and Pen Width controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                
                {/* Stroking Colors Palette */}
                {currentTool !== 'eraser' && currentTool !== 'spotlight' && currentTool !== 'laser' && (
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold">Colors:</span>
                    <div className="flex items-center gap-1.5 bg-[#15161A] p-1 border border-white/5 rounded-full" id="color-palette">
                      {(['amber', 'green', 'white', 'blue'] as BrushColor[]).map((c) => (
                        <button
                          key={c}
                          onClick={() => setBrushColor(c)}
                          className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-[#FF7A33] focus:ring-offset-1 focus:ring-offset-[#1C1E24] cursor-pointer ${
                            c === 'amber' ? 'bg-[#FF7A33] border-amber-600/30' :
                            c === 'green' ? 'bg-[#4ADE80] border-green-600/30' :
                            c === 'white' ? 'bg-[#F4F1EA] border-zinc-300/30' : 'bg-[#38BDF8] border-sky-600/30'
                          } ${
                            brushColor === c
                              ? 'ring-2 ring-offset-2 ring-offset-[#1C1E24] ring-[#FF7A33] scale-110'
                              : 'scale-90 opacity-70 hover:opacity-100 hover:scale-100'
                          }`}
                          title={`Select ${c} brush color`}
                          aria-label={`Select ${c} brush color`}
                          aria-pressed={brushColor === c}
                          id={`color-btn-${c}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Line weights width */}
                {currentTool !== 'eraser' && currentTool !== 'spotlight' && currentTool !== 'laser' && (
                  <div className="flex items-center gap-3 bg-[#15161A] px-3.5 py-1.5 border border-white/5 rounded-xl w-full sm:w-auto" id="brush-weight-box">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold whitespace-nowrap">Weight:</span>
                    <input
                      type="range"
                      min={2}
                      max={18}
                      step={1}
                      value={brushWidth}
                      onChange={(e) => setBrushWidth(parseInt(e.target.value))}
                      className="w-24 accent-[#FF7A33] h-1.5 cursor-pointer bg-zinc-800 rounded-lg appearance-none"
                      id="range-brush-weight"
                    />
                    <span className="text-xs font-mono font-bold text-zinc-300 w-5">{brushWidth}px</span>
                  </div>
                )}
              </div>
            </div>

            {/* Core Interactive Presentation Canvas */}
            <WorkspaceCanvas
              currentTool={currentTool}
              brushColor={brushColor}
              brushWidth={brushWidth}
              canvasBg={canvasBg}
              bgImageUrl={bgImageUrl}
              webcamActive={webcamActive}
              webcamFrame={webcamFrame}
              videoFilter={videoFilter}
              webcamStream={cameraStream}
              onCanvasStreamReady={handleCanvasStreamReady}
              isRecording={recordingState === 'recording' && captureMode === 'studio'}
              selectedFps={selectedFps}
              onToolChange={setCurrentTool}
              onColorChange={setBrushColor}
              onWeightChange={setBrushWidth}
              onTogglePause={() => {
                if (recordingState === 'recording') {
                  pauseRecording();
                } else if (recordingState === 'paused') {
                  resumeRecording();
                }
              }}
              onStopRecording={() => {
                if (recordingState === 'recording' || recordingState === 'paused') {
                  stopRecording();
                }
              }}
              webcamFrameStyle={webcamFrameStyle}
              webcamBgEffect={webcamBgEffect}
              webcamReplaceType={webcamReplaceType}
              webcamReplaceColor={webcamReplaceColor}
              webcamReplaceImageUrl={webcamReplaceImageUrl}
              webcamMirrored={webcamMirrored}
              webcamPerfMode={webcamPerfMode}
            />
          </div>
        </section>

        {/* Explain warning banner when Screen Record is chosen */}
        {captureMode === 'screen' && (
          <div className="bg-[#FF7A33]/5 border border-[#FF7A33]/25 p-5 rounded-2xl flex items-start gap-4 max-w-7xl w-full mx-auto" id="screen-share-instructions">
            <HelpCircle className="text-[#FF7A33] shrink-0 mt-0.5" size={20} />
            <div className="space-y-1">
              <h4 className="font-display font-semibold text-[#FF7A33] text-xs">SCREEN RECORDING INFORMATION</h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Due to standard sandbox constraints inside modern web browsers, drawing directly over external systems (like Slack or your local terminal editor) is restricted. 
                Move slide illustrations or template mockups directly into the <strong className="text-[#FF7A33]">Presenter Studio</strong> to sketch live over your tutorial flows!
              </p>
            </div>
          </div>
        )}

        {/* ROW-3: DEVICE HARDWARE AND AUDIO MIX PANEL */}
        <section id="device-hardware-dashboard">
          <DeviceSelectors
            microphoneActive={microphoneActive}
            toggleMic={handleMicToggle}
            webcamActive={webcamActive}
            toggleCamera={handleCameraToggle}
            selectedMicId={selectedMicId}
            onMicIdChange={handleMicChange}
            selectedCameraId={selectedCameraId}
            onCameraIdChange={handleCameraChange}
            canvasBg={canvasBg}
            onCanvasBgChange={setCanvasBg}
            onCustomImageUpload={handleCustomImageUpload}
            webcamFrame={webcamFrame}
            onWebcamFrameChange={setWebcamFrame}
            videoFilter={videoFilter}
            onVideoFilterChange={setVideoFilter}
            audioStream={audioStream}
            noiseCancellationActive={noiseCancellationActive}
            onNoiseCancellationToggle={handleNoiseCancellationToggle}
            webcamFrameStyle={webcamFrameStyle}
            onWebcamFrameStyleChange={setWebcamFrameStyle}
            webcamBgEffect={webcamBgEffect}
            onWebcamBgEffectChange={setWebcamBgEffect}
            webcamReplaceType={webcamReplaceType}
            onWebcamReplaceTypeChange={setWebcamReplaceType}
            webcamReplaceColor={webcamReplaceColor}
            onWebcamReplaceColorChange={setWebcamReplaceColor}
            webcamReplaceImageUrl={webcamReplaceImageUrl}
            onWebcamReplaceImageUrlChange={setWebcamReplaceImageUrl}
            webcamMirrored={webcamMirrored}
            onWebcamMirroredChange={setWebcamMirrored}
            webcamPerfMode={webcamPerfMode}
            onWebcamPerfModeChange={setWebcamPerfMode}
          />
        </section>

        {/* ROW-4: THE PRIVACY CARD DISPLAY */}
        <section id="privacy-card-pane">
          <PrivacyCard
            onPurgeAll={handleFullPurge}
            recordingsCount={recordings.length}
          />
        </section>

        {/* ROW-5: LOCAL VIDEO LIBRARY ARCHIVE GALLERY */}
        <section className="space-y-4" id="video-archive-pane">
          <div className="flex items-center justify-between border-b border-[#23252C] pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF7A33]"></div>
              <h3 className="font-display font-semibold text-zinc-100 tracking-wide text-sm">YOUR RECORDED VIDEOS</h3>
            </div>
            
            <span className="text-[10px] font-mono text-[#8A8780] bg-[#1C1E24] border border-white/5 rounded px-2 py-0.5 uppercase tracking-wide">
              {recordings.length} Recordings Saved
            </span>
          </div>

          <VideoLibrary
            recordings={recordings}
            onDelete={handleItemDelete}
            onRename={handleItemRename}
            onSelectPlayer={setSelectedPlayerRecording}
          />
        </section>

      </main>

          {/* FOOTER BAR OUTLINING DECENTRALIZED CREATION */}
          <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-[#23252C] text-center" id="studio-footer">
            <p className="text-[10px] font-mono tracking-tight text-zinc-500 uppercase leading-normal">
              Pointly client engine • Built for custom presentation guides and walkthroughs • 100% sandboxed
            </p>
            <p className="text-xs text-zinc-400 mt-2 font-sans">
              Pointly Built by Emmanuel Eleweke
            </p>
          </footer>
        </>
      )}

      {/* 4. MODAL POP-UP PLAYER ENVELOPE */}
      {selectedPlayerRecording && (
        <VideoPlayerModal
          recording={selectedPlayerRecording}
          onClose={() => setSelectedPlayerRecording(null)}
        />
      )}

      {/* 5. POST-RECORDING WORKBENCH MODAL */}
      {postRecordingBlob && (
        <PostRecordingModal
          videoBlob={postRecordingBlob}
          recordingDuration={postRecordingDuration}
          captureMode={captureMode}
          onClose={() => setPostRecordingBlob(null)}
          onSaveToLibrary={handleSaveToLibrary}
        />
      )}

      {/* 6. KEYBOARD SHORTCUTS REFERENCE OVERLAY */}
      {isShortcutsHelpOpen && (
        <ShortcutsHelpModal
          onClose={() => setIsShortcutsHelpOpen(false)}
        />
      )}
    </div>
  );
}
