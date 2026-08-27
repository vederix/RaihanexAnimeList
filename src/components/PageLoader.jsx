const PageLoader = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 relative z-10 animate-fade-in">
      {/* Top glowing laser progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-black z-50 overflow-hidden shadow-[0_0_15px_rgba(239,68,68,0.8)]">
        <div className="h-full bg-gradient-to-r from-red-800 via-red-500 to-red-400 animate-skeleton-shimmer w-[200%]"></div>
      </div>

      <div className="relative flex flex-col items-center gap-6 glass-panel px-10 py-12 rounded-3xl border border-red-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-scale-up">
        <div className="relative flex items-center justify-center w-20 h-20">
          {/* Outer Glowing Ring */}
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-red-500 border-b-red-700 animate-spin-slow shadow-[0_0_25px_rgba(239,68,68,0.4)]"></div>
          {/* Inner Counter-Rotating Ring */}
          <div className="absolute inset-2.5 rounded-full border-[2.5px] border-transparent border-l-red-400 border-r-red-600 animate-spin-reverse opacity-90"></div>
          {/* Core Pulsing Energy Core */}
          <div className="w-3.5 h-3.5 bg-red-500 rounded-full animate-ping shadow-[0_0_15px_rgba(239,68,68,1)]"></div>
          <div className="absolute w-2 h-2 bg-white rounded-full"></div>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <p className="text-red-400 font-extrabold text-xs tracking-[0.25em] uppercase animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">
            Memuat Data
          </p>
          <div className="flex gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
