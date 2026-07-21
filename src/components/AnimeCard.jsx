import { Link } from "react-router-dom";
import { FaStar, FaTrash } from "react-icons/fa"; // Tambahkan import FaTrash

// Tambahkan parameter onDelete di sini
const AnimeCard = ({ anime, onDelete }) => {
  const score = anime.averageScore
    ? (anime.averageScore / 10).toFixed(1)
    : "N/A";

  // Fungsi khusus untuk menangani klik tombol hapus
  const handleDeleteClick = (e) => {
    e.preventDefault(); // SANGAT PENTING: Mencegah browser pindah ke halaman detail saat tombol diklik
    if (onDelete) {
      onDelete(anime.id);
    }
  };

  return (
    <Link to={`/anime/${anime.id}`} className="group cursor-pointer">
      <div className="bg-slate-800/40 rounded-2xl overflow-hidden border border-slate-700/50 hover:border-red-500 transition-all duration-300 relative hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(220,38,38,0.15)] flex flex-col h-full">
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={anime.coverImage.large}
            alt={anime.title.romaji || anime.title.english}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80"></div>

          {/* FITUR BARU: Tombol Hapus (Hanya render jika ada fungsi onDelete yang dikirimkan) */}
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className="absolute top-3 left-3 bg-red-600/80 hover:bg-red-500 backdrop-blur-md text-white p-2 rounded-lg transition-all border border-red-400/50 z-10 shadow-lg hover:scale-110"
              title="Hapus dari Watchlist"
            >
              <FaTrash size={12} />
            </button>
          )}

          {/* Badge Rating di Kanan Atas */}
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border border-white/10">
            <FaStar className="text-yellow-400" /> {score}
          </div>
        </div>

        <div className="p-4 flex flex-col flex-grow justify-between bg-slate-900/80">
          <div>
            <h3 className="font-bold text-gray-100 line-clamp-2 text-base leading-snug group-hover:text-red-400 transition-colors">
              {anime.title.romaji || anime.title.english}
            </h3>
          </div>

          <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-700/50">
            <span className="text-gray-400 text-xs font-medium bg-slate-800 px-2 py-1 rounded">
              {anime.format || "ANIME"}
            </span>
            <span className="text-gray-500 text-xs font-medium">
              {anime.seasonYear || "?"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default AnimeCard;
