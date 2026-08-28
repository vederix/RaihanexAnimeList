import {
  FaStar,
  FaTrash,
  FaShareAlt,
  FaClock,
  FaTv,
  FaBookmark,
  FaPlay,
  FaCheck,
  FaPlus,
  FaMinus,
  FaLayerGroup,
  FaImage,
} from "react-icons/fa";

export default function AnimeTrackerCard({
  anime,
  isInWatchlist,
  watchlistStatus,
  userRating,
  episodesWatched,
  isProcessingWatchlist,
  onAddToWatchlist,
  onUpdateStatus,
  onUpdateRating,
  onUpdateEpisodes,
  onRemoveFromWatchlist,
  onShare,
  onShowShareCard,
  onShowCollectionModal,
}) {
  if (!anime) return null;

  return (
    <div className="flex flex-col gap-3">
      {isInWatchlist ? (
        <div className="glass-card p-4 shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-red-900/30 pb-2">
            <span className="text-xs font-black uppercase text-red-400 tracking-wider flex items-center gap-1.5">
              <FaCheck className="text-green-400" /> Di Watchlist
            </span>
            <button
              onClick={onRemoveFromWatchlist}
              disabled={isProcessingWatchlist}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Hapus dari Watchlist"
            >
              <FaTrash size={10} /> Hapus
            </button>
          </div>

          {/* Status Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              {watchlistStatus === "Watching" && (
                <FaPlay className="text-amber-400 text-[10px]" />
              )}
              {watchlistStatus === "Completed" && (
                <FaCheck className="text-emerald-400 text-[10px]" />
              )}
              {watchlistStatus === "Plan to Watch" && (
                <FaClock className="text-blue-400 text-[10px]" />
              )}
              Status Tontonan
            </label>
            <select
              value={watchlistStatus}
              onChange={(e) => onUpdateStatus(e.target.value)}
              className="w-full input-field px-3 py-2 text-xs font-semibold cursor-pointer"
            >
              <option value="Plan to Watch">Plan to Watch</option>
              <option value="Watching">Watching</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Rating Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <FaStar className="text-yellow-400 text-[10px]" /> Rating Pribadiku
            </label>
            <select
              value={userRating}
              onChange={(e) => onUpdateRating(parseInt(e.target.value, 10))}
              className="w-full input-field px-3 py-2 text-xs font-semibold cursor-pointer"
            >
              <option value="0">Belum Dinilai</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num} / 10 Bintang
                </option>
              ))}
            </select>
          </div>

          {/* Tracker Episode */}
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <FaTv className="text-blue-400 text-[10px]" /> Progress Episode
              </label>
              <span className="text-xs font-bold text-white bg-black/50 px-2 py-0.5 rounded-md border border-red-900/50">
                {episodesWatched} / {anime.episodes || "?"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateEpisodes(Math.max(0, episodesWatched - 1))}
                className="bg-black/60 hover:bg-red-900/40 text-gray-400 hover:text-white border border-red-900/50 rounded-lg p-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={episodesWatched <= 0}
              >
                <FaMinus size={10} />
              </button>

              <div className="flex-1 h-2 bg-black/60 rounded-full overflow-hidden border border-red-900/30">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
                  style={{
                    width: `${
                      anime.episodes
                        ? (episodesWatched / anime.episodes) * 100
                        : episodesWatched
                        ? 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>

              <button
                onClick={() => onUpdateEpisodes(episodesWatched + 1)}
                className="bg-black/60 hover:bg-green-900/40 text-gray-400 hover:text-white border border-green-900/50 rounded-lg p-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={Boolean(anime.episodes && episodesWatched >= anime.episodes)}
              >
                <FaPlus size={10} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={onAddToWatchlist}
          disabled={isProcessingWatchlist}
          className="w-full btn-primary py-3.5 px-4 rounded-xl flex items-center justify-center gap-2.5 text-sm font-bold shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all cursor-pointer disabled:opacity-50"
        >
          {isProcessingWatchlist ? (
            <span className="animate-pulse flex items-center gap-2">Memproses...</span>
          ) : (
            <>
              <FaBookmark className="text-sm shrink-0" />
              <span>Tambah ke Watchlist</span>
            </>
          )}
        </button>
      )}

      {/* Action Buttons: Share URL, Share Card, & Add to Collection */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onShare}
            className="btn-secondary py-2.5 px-3 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:border-red-500/50 transition-all cursor-pointer active:scale-95"
            title="Bagikan Tautan"
          >
            <FaShareAlt className="text-xs shrink-0" />
            <span>Tautan</span>
          </button>
          <button
            onClick={onShowShareCard}
            className="btn-secondary py-2.5 px-3 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:border-red-500/50 transition-all cursor-pointer active:scale-95"
            title="Buat Kartu Gambar"
          >
            <FaImage className="text-xs shrink-0" />
            <span>Kartu Visual</span>
          </button>
        </div>
        <button
          onClick={onShowCollectionModal}
          className="w-full btn-secondary py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 text-xs md:text-sm font-bold shadow-md hover:border-red-500/50 transition-all cursor-pointer active:scale-95"
        >
          <FaLayerGroup className="text-sm shrink-0" />
          <span>Tambahkan ke Koleksi</span>
        </button>
      </div>
    </div>
  );
}
