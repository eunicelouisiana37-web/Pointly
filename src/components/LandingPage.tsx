import React, { useEffect, useState } from 'react';
import { 
  Tv, 
  Video, 
  Paintbrush, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Sliders, 
  Download, 
  History, 
  PauseCircle, 
  ArrowRight, 
  Play, 
  CheckCircle,
  ExternalLink,
  ShieldAlert,
  Mic,
  Camera
} from 'lucide-react';

interface LandingPageProps {
  onStartRecording: () => void;
  recordingsCount: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartRecording, recordingsCount }) => {
  // Animated stats
  const [fpsVal, setFpsVal] = useState(0);
  const [secVal, setSecVal] = useState(0);
  const [privacyVal, setPrivacyVal] = useState(0);

  useEffect(() => {
    // Elegant staggered start of counter values
    const fpsTimer = setInterval(() => {
      setFpsVal((prev) => {
        if (prev >= 60) {
          clearInterval(fpsTimer);
          return 60;
        }
        return prev + 2;
      });
    }, 20);

    const secTimer = setInterval(() => {
      setSecVal((prev) => {
        if (prev >= 100) {
          clearInterval(secTimer);
          return 100;
        }
        return prev + 5;
      });
    }, 30);

    const privacyTimer = setInterval(() => {
      setPrivacyVal((prev) => {
        if (prev >= 100) {
          clearInterval(privacyTimer);
          return 100;
        }
        return prev + 4;
      });
    }, 25);

    return () => {
      clearInterval(fpsTimer);
      clearInterval(secTimer);
      clearInterval(privacyTimer);
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col w-full bg-[#15161A] text-[#F4F1EA] overflow-x-hidden" id="pointly-landing-page">
      
      {/* HERO SECTION */}
      <section className="relative px-6 py-20 md:py-32 flex flex-col items-center text-center max-w-5xl mx-auto z-10" id="hero-heading-block">
        
        {/* Soft background glow decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FF7A33]/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        
        {/* Anti-Slop Premium Badge */}
        <div className="inline-flex items-center gap-2 bg-[#FF7A33]/10 border border-[#FF7A33]/30 px-4 py-1.5 rounded-full mb-8 animate-fade-in" id="hero-badge">
          <Sparkles size={14} className="text-[#FF7A33]" />
          <span className="text-[#FF7A33] text-xs font-semibold tracking-wider uppercase font-mono">100% Client-Side Engine</span>
        </div>

        {/* Georgia display fonts */}
        <h1 
          className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-8 font-serif"
          style={{ fontFamily: "Georgia, serif" }}
          id="hero-tagline"
        >
          Elegant Screen Recordings, <br className="hidden sm:inline" />
          <span className="text-[#FF7A33] italic font-normal">crafted entirely</span> in your browser.
        </h1>

        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl leading-relaxed mb-12 font-sans" id="hero-paragraph">
          Design beautiful walkthroughs, annotate presentations live, and capture your screen or easel, with zero accounts, zero tracking, and absolutely no data ever leaving your machine.
        </p>

        {/* CTA Elements */}
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center w-full sm:w-auto" id="hero-cta-buttons">
          <button 
            onClick={onStartRecording}
            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-[#FF7A33] hover:bg-[#ff8c4d] text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl shadow-[#FF7A33]/15 transition-all hover:scale-[1.02] cursor-pointer"
            id="cta-start-recording"
          >
            <Play size={20} className="fill-white text-white" />
            <span>Launch Presentation Studio</span>
            <ArrowRight size={18} />
          </button>
          
          <button 
            onClick={() => {
              const el = document.getElementById('features-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 border border-[#8A8780]/30 hover:bg-[#8A8780]/15 text-[#F4F1EA] px-8 py-4 rounded-full font-medium text-lg transition-all"
            id="cta-secondary-features"
          >
            <span>Explore Capabilities</span>
          </button>
        </div>

        {/* Recordings short highlight count if present */}
        {recordingsCount > 0 && (
          <div className="mt-6 flex items-center gap-2 text-xs font-mono text-[#8A8780]" id="vault-highlight">
            <div className="w-2 h-2 rounded-full bg-[#4ADE80]"></div>
            <span>You have <strong className="text-[#F4F1EA]">{recordingsCount} recordings</strong> saved safely in your local vault.</span>
          </div>
        )}
      </section>

      {/* STATS COUNT ROW */}
      <section className="border-t border-b border-[#8A8780]/20 bg-[#1e1f24]/30 py-10 px-6" id="stats-dashboard-row">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 md:divide-x md:divide-[#8A8780]/15">
          <div className="text-center md:px-4" id="stat-col-resolution">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#8A8780] block mb-2 font-mono">Max Resolution</span>
            <span className="text-3xl md:text-4xl font-bold font-mono tracking-tight text-[#F4F1EA]">
              4K <span className="text-sm font-sans font-medium text-zinc-400">UHD</span>
            </span>
          </div>

          <div className="text-center md:px-4" id="stat-col-fps">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#8A8780] block mb-2 font-mono">Capture Frame-Rate</span>
            <span className="text-3xl md:text-4xl font-bold font-mono tracking-tight text-[#FF7A33]">
              {fpsVal} <span className="text-sm font-sans font-medium text-zinc-400">FPS</span>
            </span>
          </div>

          <div className="text-center md:px-4" id="stat-col-privacy">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#8A8780] block mb-2 font-mono">Sandbox Privacy</span>
            <span className="text-3xl md:text-4xl font-bold font-mono tracking-tight text-[#4ADE80]">
              {privacyVal}% <span className="text-sm font-sans font-medium text-zinc-400">Secure</span>
            </span>
          </div>

          <div className="text-center md:px-4" id="stat-col-upload">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#8A8780] block mb-2 font-mono">Data Upload Latency</span>
            <span className="text-3xl md:text-4xl font-bold font-mono tracking-tight text-[#F4F1EA]">
              0.0 <span className="text-sm font-sans font-medium text-zinc-400">ms</span>
            </span>
          </div>
        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section className="py-24 px-6 max-w-6xl mx-auto w-full" id="features-section">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#FF7A33] mb-3 block">High Precision Suite</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight font-serif" style={{ fontFamily: "Georgia, serif" }}>
            The browser tools you need. <br />Without the privacy compromises.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="features-grid-items">
          {/* Feature 1 */}
          <div className="bg-[#1e1f24] border border-[#8A8780]/15 rounded-2xl p-6 transition hover:border-[#FF7A33]/30 flex flex-col h-full" id="feat-screen-capture">
            <div className="w-10 h-10 bg-[#FF7A33]/10 border border-[#FF7A33]/20 text-[#FF7A33] rounded-xl flex items-center justify-center mb-6">
              <Tv size={20} />
            </div>
            <h3 className="text-base font-bold text-[#F4F1EA] mb-2 font-serif" style={{ fontFamily: "Georgia, serif" }}>Dual Recording Modes</h3>
            <p className="text-zinc-400 text-sm leading-relaxed flex-1">
              Toggle gracefully between Presenter Studio (with preloaded background templates) and standard Desktop Screen/Application capture.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-[#1e1f24] border border-[#8A8780]/15 rounded-2xl p-6 transition hover:border-[#FF7A33]/30 flex flex-col h-full" id="feat-webcam">
            <div className="w-10 h-10 bg-[#FF7A33]/10 border border-[#FF7A33]/20 text-[#FF7A33] rounded-xl flex items-center justify-center mb-6">
              <Camera size={20} />
            </div>
            <h3 className="text-base font-bold text-[#F4F1EA] mb-2 font-serif" style={{ fontFamily: "Georgia, serif" }}>Webcam Custom Overlay</h3>
            <p className="text-zinc-400 text-sm leading-relaxed flex-1">
              Embed beautiful presenter frames (circle or standard rectangle) with luxury filters like monochrome, warm glow, and high-contrast saturation.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-[#1e1f24] border border-[#8A8780]/15 rounded-2xl p-6 transition hover:border-[#FF7A33]/30 flex flex-col h-full" id="feat-annotations">
            <div className="w-10 h-10 bg-[#FF7A33]/10 border border-[#FF7A33]/20 text-[#FF7A33] rounded-xl flex items-center justify-center mb-6">
              <Paintbrush size={20} />
            </div>
            <h3 className="text-base font-bold text-[#F4F1EA] mb-2 font-serif" style={{ fontFamily: "Georgia, serif" }}>Easel Brush & Pointer Tools</h3>
            <p className="text-zinc-400 text-sm leading-relaxed flex-1">
              Mark, highlight, spotlight, and illustrate points live. Eraser, brush sizing, and customized amber, emerald, and indigo colors are built key-level.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-[#1e1f24] border border-[#8A8780]/15 rounded-2xl p-6 transition hover:border-[#FF7A33]/30 flex flex-col h-full" id="feat-audio">
            <div className="w-10 h-10 bg-[#FF7A33]/10 border border-[#FF7A33]/20 text-[#FF7A33] rounded-xl flex items-center justify-center mb-6">
              <Mic size={20} />
            </div>
            <h3 className="text-base font-bold text-[#F4F1EA] mb-2 font-serif" style={{ fontFamily: "Georgia, serif" }}>Audio Control & Quality</h3>
            <p className="text-zinc-400 text-sm leading-relaxed flex-1">
              Dynamic microphone stream hot-plugging. Toggle narration audio independently on or off with clean real-time status indication.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-[#1e1f24] border border-[#8A8780]/15 rounded-2xl p-6 transition hover:border-[#FF7A33]/30 flex flex-col h-full" id="feat-quality">
            <div className="w-10 h-10 bg-[#FF7A33]/10 border border-[#FF7A33]/20 text-[#FF7A33] rounded-xl flex items-center justify-center mb-6">
              <Sliders size={20} />
            </div>
            <h3 className="text-base font-bold text-[#F4F1EA] mb-2 font-serif" style={{ fontFamily: "Georgia, serif" }}>Canvas Customization</h3>
            <p className="text-zinc-400 text-sm leading-relaxed flex-1">
              Change background colors or upload custom graphics instantly. Great for importing PDF notes, workflow templates, or code snippets before presenting.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-[#1e1f24] border border-[#8A8780]/15 rounded-2xl p-6 transition hover:border-[#FF7A33]/30 flex flex-col h-full" id="feat-pause">
            <div className="w-10 h-10 bg-[#FF7A33]/10 border border-[#FF7A33]/20 text-[#FF7A33] rounded-xl flex items-center justify-center mb-6">
              <PauseCircle size={20} />
            </div>
            <h3 className="text-base font-bold text-[#F4F1EA] mb-2 font-serif" style={{ fontFamily: "Georgia, serif" }}>Fluid Record controls</h3>
            <p className="text-zinc-400 text-sm leading-relaxed flex-1">
              Pause and resume smoothly without resetting your canvas markings or webcam feed. Clean countdown timer prevents jagged starts.
            </p>
          </div>

          {/* Feature 7 */}
          <div className="bg-[#1e1f24] border border-[#8A8780]/15 rounded-2xl p-6 transition hover:border-[#FF7A33]/30 flex flex-col h-full" id="feat-download">
            <div className="w-10 h-10 bg-[#FF7A33]/10 border border-[#FF7A33]/20 text-[#FF7A33] rounded-xl flex items-center justify-center mb-6">
              <Download size={20} />
            </div>
            <h3 className="text-base font-bold text-[#F4F1EA] mb-2 font-serif" style={{ fontFamily: "Georgia, serif" }}>Instant Local Downloads</h3>
            <p className="text-zinc-400 text-sm leading-relaxed flex-1">
              Save recordings in industry-standard formats locally in your browser. Generates zero wait times, no queuing, and no rendering limits.
            </p>
          </div>

          {/* Feature 8 */}
          <div className="bg-[#1e1f24] border border-[#8A8780]/15 rounded-2xl p-6 transition hover:border-[#FF7A33]/30 flex flex-col h-full" id="feat-history">
            <div className="w-10 h-10 bg-[#FF7A33]/10 border border-[#FF7A33]/20 text-[#FF7A33] rounded-xl flex items-center justify-center mb-6">
              <History size={20} />
            </div>
            <h3 className="text-base font-bold text-[#F4F1EA] mb-2 font-serif" style={{ fontFamily: "Georgia, serif" }}>Local Vault Sandbox</h3>
            <p className="text-zinc-400 text-sm leading-relaxed flex-1">
              Safe storage of your video catalogs directly inside the browser storage (IndexedDB). Search, rename, preview, and purge with absolute authority.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="py-24 border-t border-[#8A8780]/20 bg-[#1e1f24]/20 px-6" id="about-timeline">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#FF7A33] mb-3 block">Seamless Iteration</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight font-serif" style={{ fontFamily: "Georgia, serif" }}>How Pointly Operates</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative" id="timeline-steps">
            {/* Step 1 */}
            <div className="relative group" id="step-configure">
              <div className="absolute top-4 left-0 h-0.5 bg-[#8A8780]/10 w-full group-hover:bg-[#FF7A33]/20 hidden lg:block -z-10"></div>
              <div className="w-10 h-10 rounded-full bg-[#15161A] border-2 border-[#FF7A33] flex items-center justify-center font-bold text-[#FF7A33] mb-6">
                1
              </div>
              <h3 className="text-base font-semibold text-[#F4F1EA] mb-2 font-serif" style={{ fontFamily: "Georgia, serif" }}>Configure</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Connect external microphones, cameras, select canvas backgrounds or drop reference layouts.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative group" id="step-capture">
              <div className="absolute top-4 left-0 h-0.5 bg-[#8A8780]/10 w-full group-hover:bg-[#FF7A33]/20 hidden lg:block -z-10"></div>
              <div className="w-10 h-10 rounded-full bg-[#15161A] border-2 border-[#FF7A33]/30 group-hover:border-[#FF7A33] flex items-center justify-center font-bold text-zinc-400 group-hover:text-[#FF7A33] mb-6 transition">
                2
              </div>
              <h3 className="text-base font-semibold text-[#F4F1EA] mb-2 font-serif" style={{ fontFamily: "Georgia, serif" }}>Capture</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Start recording with a clean, lag-free countdown to prepare your workspace posture.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative group" id="step-annotate">
              <div className="absolute top-4 left-0 h-0.5 bg-[#8A8780]/10 w-full group-hover:bg-[#FF7A33]/20 hidden lg:block -z-10"></div>
              <div className="w-10 h-10 rounded-full bg-[#15161A] border-2 border-[#FF7A33]/30 group-hover:border-[#FF7A33] flex items-center justify-center font-bold text-zinc-400 group-hover:text-[#FF7A33] mb-6 transition">
                3
              </div>
              <h3 className="text-base font-semibold text-[#F4F1EA] mb-2 font-serif" style={{ fontFamily: "Georgia, serif" }}>Annotate & Control</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Draw shapes, highlight margins, control webcam sizes and layouts on the fly as you present.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative group" id="step-download">
              <div className="w-10 h-10 rounded-full bg-[#15161A] border-2 border-[#FF7A33]/30 group-hover:border-[#FF7A33] flex items-center justify-center font-bold text-zinc-400 group-hover:text-[#FF7A33] mb-6 transition">
                4
              </div>
              <h3 className="text-base font-semibold text-[#F4F1EA] mb-2 font-serif" style={{ fontFamily: "Georgia, serif" }}>Download</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Check preview, save files directly on local disks, or rename catalogs inside your permanent library.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRIVACY SHIELD HIGHLIGHT SECTION */}
      <section className="py-24 px-6 max-w-4xl mx-auto w-full text-center" id="privacy-section">
        <div className="bg-gradient-to-tr from-[#1C1E24] to-[#23252C] border-2 border-[#e3a034]/20 rounded-3xl p-10 md:p-14 relative overflow-hidden shadow-2xl">
          {/* Subtle decoration */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#4ADE80]/5 rounded-full blur-3xl"></div>
          
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full border border-[#4ADE80]/30 flex items-center justify-center bg-[#4ADE80]/5">
              <ShieldCheck className="w-8 h-8 text-[#4ADE80]" />
            </div>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 font-serif" style={{ fontFamily: "Georgia, serif" }}>
            The Pointly Privacy Promise
          </h2>
          <p className="text-zinc-400 text-base max-w-xl mx-auto mb-10">
            We built Pointly with the ironclad rule that your presentations belong strictly to you. No logins, no telemetry, no leaks, and absolute decentralization.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left max-w-2xl mx-auto mb-10">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#4ADE80] mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm text-[#F4F1EA]">Zero Cloud Storage Uploads</h4>
                <p className="text-xs text-zinc-400 mt-1">Videos are generated and stored exclusively in your browser&apos;s sandboxed system.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#4ADE80] mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm text-[#F4F1EA]">Self-Contained Local DB</h4>
                <p className="text-xs text-zinc-400 mt-1">Our IndexedDB vault preserves your library strictly on your device.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#4ADE80] mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm text-[#F4F1EA]">No Analytics or Ad Trackers</h4>
                <p className="text-xs text-zinc-400 mt-1">We never log user action coordinates, clicks, or system telemetry logs.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#4ADE80] mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm text-[#F4F1EA]">True Accountless Operation</h4>
                <p className="text-xs text-zinc-400 mt-1">Access 100% of Pointly features without having to register or authenticate.</p>
              </div>
            </div>
          </div>

          <button 
            onClick={onStartRecording}
            className="inline-flex items-center gap-3 bg-[#FF7A33] hover:bg-[#ff8c4d] text-white px-8 py-4 rounded-full font-bold shadow-lg transition-transform hover:scale-[1.01]"
            id="privacy-start-recording"
          >
            <span>Open Sandbox Workspace</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* FOOTER LANDING */}
      <footer className="border-t border-[#8A8780]/20 bg-[#0F1012] py-14 px-6" id="landing-footer">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#FF7A33] rounded-lg flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
            </div>
            <span className="text-xl font-bold tracking-tight text-[#F4F1EA]" style={{ fontFamily: "Georgia, serif" }}>Pointly.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-[#8A8780] text-sm font-sans" id="footer-links">
            <button onClick={onStartRecording} className="hover:text-[#F4F1EA] transition">Launch Studio</button>
            <a href="#features-section" className="hover:text-[#F4F1EA] transition">Features</a>
            <a href="#about-timeline" className="hover:text-[#F4F1EA] transition">Workflows</a>
            <a href="#privacy-section" className="hover:text-[#F4F1EA] transition">Privacy Promise</a>
          </div>

          <div className="text-center md:text-right">
            <p className="text-[10px] font-mono tracking-wider text-[#8A8780] uppercase">
              DECENTRALIZED BROWSER RECORDER &amp; EASEL
            </p>
            <p className="text-[9px] text-[#8A8780]/50 font-mono mt-1">
              &copy; {new Date().getFullYear()} Pointly Engine. 100% Secure.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
};
