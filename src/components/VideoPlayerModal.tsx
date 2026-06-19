import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, X, Download, RotateCcw, Calendar, HardDrive } from 'lucide-react';
import { DBRecording } from '../lib/db';

interface VideoPlayerModalProps {
  recording: DBRecording | null;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ recording, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    // Reset video player parameters on target shift
    setIsPlaying(false);
    setCurrentTime(0);
    setPlaybackSpeed(1);
  }, [recording]);

  if (!recording) return null;

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch((e) => console.error('Video playback failed:', e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || recording.duration || 0);
    }
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    video.muted = nextMuted;
    if (nextMuted) {
      video.volume = 0;
    } else {
      video.volume = volume === 0 ? 0.8 : volume;
      setVolume(volume === 0 ? 0.8 : volume);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const bytesToMB = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090A0C]/92 backdrop-blur-md" id="player-modal-backdrop">
      <div 
        className="relative bg-[#1C1E24] border border-[#23252C] rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        id="player-modal-container"
      >
        {/* Header section */}
        <div className="flex items-center justify-between p-5 border-b border-[#23252C]">
          <div>
            <h3 className="font-display font-semibold text-base text-zinc-100 uppercase tracking-tight truncate max-w-md sm:max-w-xl">
              {recording.name}
            </h3>
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-500 font-mono">
              <span className="flex items-center gap-1">
                <Calendar size={11} className="text-[#FF7A33]" />
                {new Date(recording.createdAt).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <HardDrive size={11} className="text-[#4ADE80]" />
                {bytesToMB(recording.size)} MB
              </span>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            id="btn-close-player"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Screen & Controls container */}
        <div className="relative bg-black aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            src={recording.videoUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
            className="w-full h-full max-h-[60vh] object-contain cursor-pointer"
            id="playback-video-node"
          />

          {/* Quick-play centered overlay indicator */}
          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute p-5 rounded-full bg-[#FF7A33] text-[#F4F1EA] shadow-xl hover:scale-110 active:scale-95 transition-transform"
              id="btn-center-play"
            >
              <Play size={28} className="fill-[#F4F1EA] translate-x-0.5" />
            </button>
          )}
        </div>

        {/* Bottom controls panel */}
        <div className="p-5 bg-[#1C1E24]/90 border-t border-[#23252C] flex flex-col gap-4">
          {/* Custom seeker row */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-400 w-10 text-right">
              {formatTime(currentTime)}
            </span>
            
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleScrubberChange}
              className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer hover:bg-zinc-700 transition"
              id="player-scrubber-timeline"
            />
            
            <span className="text-xs font-mono text-zinc-400 w-10 text-left">
              {formatTime(duration)}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Play/Pause & Volume controls */}
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button
                onClick={togglePlay}
                className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-[#FF7A33] transition-colors"
                id="btn-play-pause-toggle"
              >
                {isPlaying ? <Pause size={18} className="fill-[#FF7A33]" /> : <Play size={18} className="fill-[#FF7A33] translate-x-0.5" />}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
                  id="btn-player-mute-toggle"
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: '#FF7A33' }}
                  id="player-volume-slider"
                />
              </div>
            </div>

            {/* Playback speed selector */}
            <div className="flex items-center gap-1 bg-[#15161A] p-1 border border-white/5 rounded-xl text-xs font-mono w-full sm:w-auto justify-center">
              <span className="px-2.5 text-zinc-500 uppercase tracking-wider text-[9px] font-bold">Speed:</span>
              {([0.5, 1, 1.25, 1.5, 2] as const).map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-2 py-1 rounded-lg font-medium transition ${
                    playbackSpeed === speed
                      ? 'bg-[#FF7A33]/15 text-[#FF7A33] border border-[#FF7A33]/20'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  id={`btn-speed-${speed}`}
                >
                  {speed === 1 ? 'Normal' : `${speed}x`}
                </button>
              ))}
            </div>

            {/* Direct hard drive downloader trigger */}
            <a
              href={recording.videoUrl}
              download={getDownloadName(recording.name, recording.videoBlob)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF7A33] hover:bg-[#E35E17] text-[#F4F1EA] text-xs font-semibold transition-all shadow-lg active:scale-95 w-full sm:w-auto"
              id="anchor-download-file"
            >
              <Download size={14} />
              Export Video File
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
