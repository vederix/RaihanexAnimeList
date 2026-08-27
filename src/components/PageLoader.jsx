const PageLoader = () => {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-4 relative z-10 animate-fade-in">
      {/* Top glowing progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-black z-50 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-red-600 via-red-400 to-red-600 animate-pulse w-full"></div>
      </div>

      <div className="relative flex flex-col items-center gap-6">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.8)]"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
          </div>
        </div>

        <p className="text-red-300 font-bold text-sm tracking-widest uppercase animate-pulse">
          Memuat Halaman...
        </p>
      </div>
    </div>
  );
};

export default PageLoader;
