import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseNoiseCancellationOptions {
  highPassFrequency?: number; // cuts fan/desk rumble below frequency (e.g. 100 Hz)
  lowPassFrequency?: number;  // cuts harsh hiss/whine above frequency (e.g. 8000 Hz)
  enableCompressor?: boolean;  // evens out voice volume / dynamic noise gate
  outputGain?: number;        // master output volume gain (e.g. 1.0)
  initialEnabled?: boolean;   // initial activation status
  microphoneActive?: boolean; // is microphone active in App UI state
  selectedMicId?: string;     // selected microphone device ID
}

export interface UseNoiseCancellationResult {
  isEnabled: boolean;
  isSupported: boolean;
  toggle: (forceValue?: boolean) => void;
  applyNoiseFilter: (rawStream: MediaStream) => MediaStream;
  buildRecordingStream: (screenStream: MediaStream) => Promise<{ stream: MediaStream; cleanup: () => void }>;
  isInitializing: boolean;
  error: Error | null;
  // Advanced control states and setters to support live UI monitoring
  gateThreshold: number;
  setGateThreshold: (val: number) => void;
  lowPassActive: boolean;
  setLowPassActive: (active: boolean) => void;
  audioMonitorActive: boolean;
  setAudioMonitorActive: (active: boolean) => void;
}

export function useNoiseCancellation(options: UseNoiseCancellationOptions = {}): UseNoiseCancellationResult {
  const {
    highPassFrequency = 100,
    lowPassFrequency = 8000,
    enableCompressor = true,
    outputGain = 1.0,
    initialEnabled = true,
  } = options;

  // Keep a reference to the latest options to avoid dependency array stale closures
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('pointly-noise-cancellation-enabled');
    return stored !== null ? stored === 'true' : initialEnabled;
  });

  const [isSupported] = useState<boolean>(() => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    return !!AudioCtx;
  });

  const [isInitializing] = useState<boolean>(false);
  const [error] = useState<Error | null>(null);

  // Advanced UI controls
  const [gateThreshold, setGateThresholdState] = useState<number>(() => {
    const stored = localStorage.getItem('pointly-noise-gate-threshold');
    return stored ? parseFloat(stored) : -42;
  });

  const [lowPassActive, setLowPassActiveState] = useState<boolean>(() => {
    const stored = localStorage.getItem('pointly-noise-lowpass');
    return stored !== 'false';
  });

  const [audioMonitorActive, setAudioMonitorActiveState] = useState<boolean>(false);

  // Audio Context & Node References for live preview
  const audioCtxRef = useRef<AudioContext | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
  const lowPassNodeRef = useRef<BiquadFilterNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Toggle active state
  const toggle = useCallback((forceValue?: boolean) => {
    setIsEnabled(prev => {
      const next = forceValue !== undefined ? forceValue : !prev;
      localStorage.setItem('pointly-noise-cancellation-enabled', String(next));
      return next;
    });
  }, []);

  // Update dynamic values in local storage
  const setGateThreshold = useCallback((val: number) => {
    setGateThresholdState(val);
    localStorage.setItem('pointly-noise-gate-threshold', String(val));
    if (compressorNodeRef.current && audioCtxRef.current) {
      try {
        compressorNodeRef.current.threshold.setValueAtTime(val, audioCtxRef.current.currentTime);
      } catch (e) {
        console.warn('Could not set gate threshold in real-time:', e);
      }
    }
  }, []);

  const setLowPassActive = useCallback((active: boolean) => {
    setLowPassActiveState(active);
    localStorage.setItem('pointly-noise-lowpass', String(active));
    if (lowPassNodeRef.current && audioCtxRef.current) {
      try {
        const freq = active ? lowPassFrequency : 20000;
        lowPassNodeRef.current.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
      } catch (e) {
        console.warn('Could not set lowpass active in real-time:', e);
      }
    }
  }, [lowPassFrequency]);

  const setAudioMonitorActive = useCallback((active: boolean) => {
    setAudioMonitorActiveState(active);
    if (compressorNodeRef.current && audioCtxRef.current) {
      try {
        if (active) {
          compressorNodeRef.current.connect(audioCtxRef.current.destination);
        } else {
          try {
            compressorNodeRef.current.disconnect(audioCtxRef.current.destination);
          } catch (e) {
            // Already disconnected
          }
        }
      } catch (e) {
        console.warn('Could not toggle audio monitor loopback in real-time:', e);
      }
    }
  }, []);

  // Clean up live preview AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Real-time outputGain node modifier when option changes
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      try {
        gainNodeRef.current.gain.setValueAtTime(outputGain, audioCtxRef.current.currentTime);
      } catch (e) {
        console.warn('Could not set output gain:', e);
      }
    }
  }, [outputGain]);

  // Main stream-builder function that registers DSP chain for live preview (microphone stream)
  const applyNoiseFilter = useCallback((rawStream: MediaStream): MediaStream => {
    if (!isEnabled || !isSupported) {
      return rawStream;
    }

    try {
      // Close existing AudioContext before building a new one
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      compressorNodeRef.current = null;
      lowPassNodeRef.current = null;
      gainNodeRef.current = null;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(rawStream);

      // Stage 1: Highpass filter (cuts low frequencies like desk rumble/fan hum below highPassFrequency)
      const hpFilter = ctx.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.setValueAtTime(highPassFrequency, ctx.currentTime);

      // Stage 2: Notch filters to eliminate specific electrical hums (50Hz / 60Hz power grid hums)
      const notch50 = ctx.createBiquadFilter();
      notch50.type = 'notch';
      notch50.frequency.setValueAtTime(50, ctx.currentTime);
      notch50.Q.setValueAtTime(12, ctx.currentTime);

      const notch60 = ctx.createBiquadFilter();
      notch60.type = 'notch';
      notch60.frequency.setValueAtTime(60, ctx.currentTime);
      notch60.Q.setValueAtTime(12, ctx.currentTime);

      // Stage 3: Lowpass filter (cuts off severe high laptop fan whines & hissing)
      const lpFilter = ctx.createBiquadFilter();
      lpFilter.type = 'lowpass';
      const initialLpFreq = lowPassActive ? lowPassFrequency : 20000;
      lpFilter.frequency.setValueAtTime(initialLpFreq, ctx.currentTime);
      lowPassNodeRef.current = lpFilter;

      // Stage 4: Dynamic compressor / Noise Gate
      let lastNode: AudioNode = lpFilter;

      if (enableCompressor) {
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(gateThreshold, ctx.currentTime);
        compressor.knee.setValueAtTime(8, ctx.currentTime);
        compressor.ratio.setValueAtTime(18, ctx.currentTime);
        compressor.attack.setValueAtTime(0.003, ctx.currentTime);
        compressor.release.setValueAtTime(0.25, ctx.currentTime);
        compressorNodeRef.current = compressor;

        // Connect notch60 to lpFilter, and lpFilter to compressor
        notch60.connect(lpFilter);
        lpFilter.connect(compressor);

        lastNode = compressor;
      } else {
        notch60.connect(lpFilter);
      }

      // Stage 5: Output Gain control node
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(outputGain, ctx.currentTime);
      gainNodeRef.current = gainNode;

      lastNode.connect(gainNode);

      // Connect loopback to speakers/headphones if monitor loopback is active
      if (audioMonitorActive) {
        lastNode.connect(ctx.destination);
      }

      // Final media stream destination
      const dest = ctx.createMediaStreamDestination();
      gainNode.connect(dest);

      return dest.stream;
    } catch (e) {
      console.warn('Advanced useNoiseCancellation failed to construct Web Audio graph:', e);
      return rawStream;
    }
  }, [
    isEnabled,
    isSupported,
    highPassFrequency,
    lowPassFrequency,
    enableCompressor,
    outputGain,
    gateThreshold,
    lowPassActive,
    audioMonitorActive,
  ]);

  // Main stream-builder function that captures microphone, applies the DSP chain, and blends with screenStream
  const buildRecordingStream = useCallback(async (screenStream: MediaStream): Promise<{ stream: MediaStream; cleanup: () => void }> => {
    const isMicActive = optionsRef.current.microphoneActive;
    const micId = optionsRef.current.selectedMicId;

    if (!isMicActive) {
      // No microphone requested, return screen stream directly with a no-op cleanup
      return {
        stream: screenStream,
        cleanup: () => {
          screenStream.getTracks().forEach((t) => t.stop());
        },
      };
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: micId ? { exact: micId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      const rawMicStream = await navigator.mediaDevices.getUserMedia(constraints);
      let processedMicStream: MediaStream = rawMicStream;
      let recAudioCtx: AudioContext | null = null;

      if (isEnabled && isSupported) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        recAudioCtx = new AudioCtx();
        const source = recAudioCtx.createMediaStreamSource(rawMicStream);

        // Stage 1: Highpass
        const hpFilter = recAudioCtx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.setValueAtTime(highPassFrequency, recAudioCtx.currentTime);

        // Stage 2: Notch filters
        const notch50 = recAudioCtx.createBiquadFilter();
        notch50.type = 'notch';
        notch50.frequency.setValueAtTime(50, recAudioCtx.currentTime);
        notch50.Q.setValueAtTime(12, recAudioCtx.currentTime);

        const notch60 = recAudioCtx.createBiquadFilter();
        notch60.type = 'notch';
        notch60.frequency.setValueAtTime(60, recAudioCtx.currentTime);
        notch60.Q.setValueAtTime(12, recAudioCtx.currentTime);

        // Stage 3: Lowpass
        const lpFilter = recAudioCtx.createBiquadFilter();
        lpFilter.type = 'lowpass';
        const lpFreq = lowPassActive ? lowPassFrequency : 20000;
        lpFilter.frequency.setValueAtTime(lpFreq, recAudioCtx.currentTime);

        let lastNode: AudioNode = lpFilter;

        if (enableCompressor) {
          const compressor = recAudioCtx.createDynamicsCompressor();
          compressor.threshold.setValueAtTime(gateThreshold, recAudioCtx.currentTime);
          compressor.knee.setValueAtTime(8, recAudioCtx.currentTime);
          compressor.ratio.setValueAtTime(18, recAudioCtx.currentTime);
          compressor.attack.setValueAtTime(0.003, recAudioCtx.currentTime);
          compressor.release.setValueAtTime(0.25, recAudioCtx.currentTime);

          source.connect(hpFilter);
          hpFilter.connect(notch50);
          notch50.connect(notch60);
          notch60.connect(lpFilter);
          lpFilter.connect(compressor);

          lastNode = compressor;
        } else {
          source.connect(hpFilter);
          hpFilter.connect(notch50);
          notch50.connect(notch60);
          notch60.connect(lpFilter);
        }

        // Stage 5: Output Gain
        const gainNode = recAudioCtx.createGain();
        gainNode.gain.setValueAtTime(outputGain, recAudioCtx.currentTime);
        lastNode.connect(gainNode);

        // Loopback monitoring (if requested)
        if (audioMonitorActive) {
          lastNode.connect(recAudioCtx.destination);
        }

        const dest = recAudioCtx.createMediaStreamDestination();
        gainNode.connect(dest);

        processedMicStream = dest.stream;
      }

      // Combine tracks: screenStream's video + screenStream's system audio (if any) + clean mic audio track
      const compositeTracks: MediaStreamTrack[] = [
        ...screenStream.getVideoTracks(),
        ...screenStream.getAudioTracks(),
      ];

      const micTrack = processedMicStream.getAudioTracks()[0];
      if (micTrack) {
        compositeTracks.push(micTrack);
      }

      const combinedStream = new MediaStream(compositeTracks);

      const cleanup = () => {
        // Stop screenStream track(s)
        screenStream.getTracks().forEach((t) => t.stop());
        // Stop raw microphone tracks
        rawMicStream.getTracks().forEach((t) => t.stop());
        // Stop any composite tracks
        combinedStream.getTracks().forEach((t) => t.stop());
        // Close recording's Web Audio context if initialized
        if (recAudioCtx && recAudioCtx.state !== 'closed') {
          recAudioCtx.close().catch(() => {});
        }
      };

      return {
        stream: combinedStream,
        cleanup,
      };
    } catch (err) {
      console.error('Failed to build clean recording stream:', err);
      // Fallback: return screenStream with a simple cleanup
      return {
        stream: screenStream,
        cleanup: () => {
          screenStream.getTracks().forEach((t) => t.stop());
        },
      };
    }
  }, [
    isEnabled,
    isSupported,
    highPassFrequency,
    lowPassFrequency,
    enableCompressor,
    outputGain,
    gateThreshold,
    lowPassActive,
    audioMonitorActive,
  ]);

  return {
    isEnabled,
    isSupported,
    toggle,
    applyNoiseFilter,
    buildRecordingStream,
    isInitializing,
    error,
    gateThreshold,
    setGateThreshold,
    lowPassActive,
    setLowPassActive,
    audioMonitorActive,
    setAudioMonitorActive,
  };
}
