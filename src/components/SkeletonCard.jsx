const SkeletonCard = () => {
  return (
    // Efek animate-pulse membuat seluruh kartu ini berkedip halus
    <div className="bg-[#1a0505]/40 rounded-2xl overflow-hidden border border-red-900/20 animate-pulse flex flex-col h-full shadow-[0_0_15px_rgba(153,27,27,0.05)]">
      {/* Kotak placeholder untuk Gambar */}
      <div className="relative aspect-[3/4] bg-red-950/30"></div>

      {/* Kotak placeholder untuk Teks */}
      <div className="p-4 flex flex-col flex-grow justify-between bg-black/40">
        <div>
          <div className="h-5 bg-red-900/30 rounded w-full mb-2.5"></div>
          <div className="h-5 bg-red-900/30 rounded w-2/3"></div>
        </div>

        <div className="flex justify-between items-center mt-4 pt-3 border-t border-red-900/30">
          <div className="h-4 bg-red-900/30 rounded w-1/4"></div>
          <div className="h-4 bg-red-900/30 rounded w-1/4"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;
