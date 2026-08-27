const SkeletonCard = () => {
  return (
    <div className="glass-card overflow-hidden rounded-2xl flex flex-col h-full relative group border border-red-900/30 shadow-lg">
      {/* Iridescent Crimson Shimmer Overlay */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-red-500/15 to-transparent animate-skeleton-shimmer z-20 pointer-events-none"></div>
      
      {/* Image placeholder */}
      <div className="relative aspect-[3/4] bg-gradient-to-b from-[#120303] to-[#080101] overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <div className="w-12 h-12 rounded-full border-2 border-red-900/40 animate-pulse"></div>
        </div>
      </div>

      {/* Text placeholders */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-grow justify-between bg-gradient-to-b from-[#0e0303]/90 to-[#070101]/95 border-t border-red-900/30 relative z-10">
        <div className="space-y-2">
          <div className="h-3.5 bg-red-950/60 rounded-md w-11/12 animate-pulse"></div>
          <div className="h-3 bg-red-950/40 rounded-md w-3/5 animate-pulse"></div>
        </div>

        <div className="flex justify-between items-center mt-4 pt-2.5 border-t border-red-900/20">
          <div className="h-3 bg-red-950/50 rounded-md w-1/4 animate-pulse"></div>
          <div className="h-3 bg-red-950/30 rounded-md w-1/5 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;
