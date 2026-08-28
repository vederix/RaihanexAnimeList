import { memo } from "react";
import { Link } from "react-router-dom";
import { FaStar, FaTrash } from "react-icons/fa";

const AnimeCard = memo(({ anime, onDelete }) => {
  if (!anime) return null;

  const score = anime.averageScore
    ? (anime.averageScore / 10).toFixed(1)
    : "N/A";

  const title = anime.title?.romaji || anime.title?.english || "Judul Anime";
  const cover = anime.coverImage?.large || anime.coverImage?.medium || "";

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(anime.id);
    }
  };

  return (
    <Link to={`/anime/${anime.id}`} className="group cursor-pointer block h-full select-none">
      <div className="bg-gradient-to-b from-[#180505] to-[#0d0202] border border-red-900/35 hover:border-red-500/60 shadow-lg hover:shadow-[0_10px_25px_rgba(220,38,38,0.25)] rounded-2xl overflow-hidden flex flex-col h-full relative transition-all duration-300 transform hover:-translate-y-1.5 will-change-transform">
        {/* Sweeping Gloss Shine Reflection */}
        <div className="absolute inset-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden">
          <div className="w-[150%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
        </div>

        {/* Cover Image Container with Zero-CLS Aspect Ratio */}
        <div className="relative aspect-[3/4] overflow-hidden bg-[#0a0202]">
          <img
            src={cover}
            alt={title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-105 transition-transform duration-500 ease-out"
          />

          {/* Cinematic Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0202] via-[#0a0202]/30 to-transparent opacity-80 group-hover:opacity-50 transition-opacity duration-300"></div>

          {/* Delete Action Button (Optional) */}
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className="absolute top-2.5 left-2.5 bg-red-600/85 hover:bg-red-500 text-white p-2 rounded-xl transition-all border border-red-400/40 z-30 shadow-[0_0_12px_rgba(220,38,38,0.6)] hover:scale-110 active:scale-90 cursor-pointer backdrop-blur-md"
              title="Hapus dari Watchlist"
            >
              <FaTrash size={11} />
            </button>
          )}

          {/* Floating Rating Badge */}
          <div className="absolute top-2.5 right-2.5 bg-black/80 border border-red-500/30 text-white px-2 py-0.5 rounded-lg flex items-center gap-1.5 shadow-md z-10">
            <FaStar className="text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.6)]" size={10} />
            <span className="text-[10px] font-extrabold mt-0.5 tracking-tight">{score}</span>
          </div>
        </div>

        {/* Card Body Information */}
        <div className="p-3 sm:p-4 flex flex-col flex-grow justify-between bg-gradient-to-b from-[#110303] to-[#080101] border-t border-red-900/30 relative z-10">
          <div>
            <h3 className="font-bold text-gray-100 line-clamp-2 text-xs sm:text-sm leading-snug group-hover:text-red-400 transition-colors duration-200">
              {title}
            </h3>
          </div>

          <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-red-900/25">
            <span className="text-red-400/90 text-[10px] font-extrabold uppercase tracking-wider bg-red-950/60 px-2 py-0.5 rounded-md border border-red-500/20">
              {anime.format || "TV"}
            </span>
            <span className="text-gray-500 text-[10px] font-semibold">
              {anime.seasonYear || "?"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
});

AnimeCard.displayName = "AnimeCard";

export default AnimeCard;
