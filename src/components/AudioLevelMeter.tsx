import React, { useEffect, useRef, useState } from 'react';

interface AudioLevelMeterProps {
  stream: MediaStream | null;
  active: boolean;
}

export const AudioLevelMeter: React.FC<AudioLevelMeterProps> = ({ stream, active }) => {
  const [level, setLevel] = useState(0);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!active || !stream) {
      setLevel(0);
      return;
    }

    try {
      // Create lazy web audio context to adhere to sandbox auto-plays
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioContext = new AudioCtx();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64; // Smaller for speed & low overhead
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        // Normalize: mic inputs typically map well within 0-90 average
        const percentage = Math.min(100, Math.round((average / 120) * 100));
        setLevel(percentage);

        animationRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      console.warn('Web Audio level analyzer failed to initialize:', err);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stream, active]);

  if (!active) return null;

  return (
    <div className="flex flex-col gap-1.5 w-full bg-[#15161A] p-2.5 rounded-xl border border-white/5 mt-2" id="audio-level-display">
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
        <span>Mic Stream Level</span>
        <span>{level}%</span>
      </div>
      <div className="h-1.5 bg-zinc-800/80 rounded-full overflow-hidden flex" id="meter-container">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 via-[#FF7A33] to-red-500 rounded-full transition-all duration-75"
          style={{ width: `${level}%` }}
          id="meter-progress-fill"
        ></div>
      </div>
    </div>
  );
};
