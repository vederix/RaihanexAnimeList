import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  FaDice,
  FaTimes,
  FaRedo,
  FaStar,
  FaBookmark,
  FaCheck,
  FaExternalLinkAlt,
  FaFilter,
} from "react-icons/fa";
import { fetchAniList } from "../utils/anilist";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const RANDOM_QUERY = `
  query ($page: Int, $genre: String, $format: MediaFormat) {
    Page(page: $page, perPage: 20) {
      media(type: ANIME, genre: $genre, format: $format, sort: SCORE_DESC) {
        id
        title { romaji english }
        coverImage { large extraLarge }
        bannerImage
        averageScore
        format
        episodes
        genres
        status
        seasonYear
        description(asHtml: false)
      }
    }
  }
`;

const GENRES = [
  "Semua",
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Supernatural",
  "Thriller",
];

const FORMATS = [
  { label: "Semua Format", value: "" },
  { label: "TV Series", value: "TV" },
  { label: "Movie / Film", value: "MOVIE" },
  { label: "OVA / Special", value: "OVA" },
];

export default function AnimeRandomizerModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [selectedGenre, setSelectedGenre] = useState("Semua");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [spinCount, setSpinCount] = useState(0);
  const [isAddedToWatchlist, setIsAddedToWatchlist] = useState(false);
  const [isAddingWatchlist, setIsAddingWatchlist] = useState(false);

  const spinTimeoutRef = useRef(null);

  const handleSpin = useCallback(async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setIsAddedToWatchlist(false);
    setResult(null);
    setSpinCount((prev) => prev + 1);

    try {
      // Ambil page acak antara 1 s/d 12
      const randomPage = Math.floor(Math.random() * 12) + 1;
      const genreVar = selectedGenre === "Semua" ? undefined : selectedGenre;
      const formatVar = selectedFormat || undefined;

      const data = await fetchAniList(RANDOM_QUERY, {
        page: randomPage,
        genre: genreVar,
        format: formatVar,
      });

      const list = data?.Page?.media || [];
      if (list.length === 0) {
        toast.error("Tidak menemukan anime dengan filter ini. Coba genre lain!");
        setIsSpinning(false);
        return;
      }

      // Pilih 1 acak dari 20 item
      const randomIndex = Math.floor(Math.random() * list.length);
      const chosen = list[randomIndex];

      // Beri jeda animasi gacha spin 1.2 detik
      spinTimeoutRef.current = setTimeout(() => {
        setResult(chosen);
        setIsSpinning(false);
      }, 1200);
    } catch (err) {
      console.error("Gacha spin error:", err);
      toast.error("Gagal memutar roulette anime.");
      setIsSpinning(false);
    }
  }, [isSpinning, selectedGenre, selectedFormat]);

  useEffect(() => {
    if (isOpen && !result) {
      handleSpin();
    }
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, [isOpen, result, handleSpin]);

  const handleQuickWatchlist = async () => {
    if (!user) {
      return toast.error("Silakan login dulu untuk menambahkan ke Watchlist!");
    }
    if (!result) return;

    setIsAddingWatchlist(true);
    try {
      const { error } = await supabase.from("watchlist").upsert([
        {
          user_id: user.id,
          mal_id: result.id,
          anime_id: result.id,
          title: result.title?.romaji || "Anime",
          image_url: result.coverImage?.large || "",
          status_tontonan: "Plan to Watch",
          status: "Plan to Watch",
          episodes_watched: 0,
          total_episodes: result.episodes || 0,
          score: result.averageScore || 0,
        },
      ]);

      if (error) throw error;
      setIsAddedToWatchlist(true);
      toast.success(`"${result.title?.romaji}" disimpan ke Watchlist! ✨`);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menambahkan ke Watchlist.");
    } finally {
      setIsAddingWatchlist(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Tentukan Grade / Rarity Kartu
  const getRarityBadge = (score) => {
    if (score >= 85) {
      return {
        label: "💎 SSR / MASTERPIECE",
        color: "from-amber-400 via-yellow-300 to-amber-500 text-black shadow-amber-500/50",
        border: "border-amber-400",
      };
    }
    if (score >= 75) {
      return {
        label: "🔥 SR / HIGHLY RECOMMENDED",
        color: "from-red-600 to-rose-700 text-white shadow-red-500/50",
        border: "border-red-500",
      };
    }
    return {
      label: "✨ POPULAR CHOICE",
      color: "from-blue-600 to-indigo-700 text-white shadow-blue-500/50",
      border: "border-blue-500",
    };
  };

  const rarity = result?.averageScore ? getRarityBadge(result.averageScore) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-[#180505] via-[#0d0202] to-black border border-red-900/60 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_25px_70px_rgba(220,38,38,0.3)] relative max-h-[88vh] sm:max-h-[90vh] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-red-900/40 flex items-center justify-between gap-3 bg-gradient-to-r from-red-950/40 via-black to-black">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-gradient-to-tr from-red-600 to-red-800 rounded-xl text-white shadow-lg shadow-red-600/40 flex-shrink-0">
              <FaDice className="text-lg sm:text-xl animate-spin-slow" />
            </div>
            <div className="truncate">
              <h3 className="text-base sm:text-xl font-black text-white tracking-tight flex items-center gap-2 leading-tight">
                GACHA ROULETTE
              </h3>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">
                Biarkan takdir memilihkan untukmu!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-red-950/80 hover:bg-red-600 border border-red-500/40 text-white transition-all shadow-lg active:scale-90 cursor-pointer flex-shrink-0"
            aria-label="Tutup Modal"
            title="Tutup Modal"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-5 py-3 bg-black/40 border-b border-red-900/20 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-gray-400 font-bold">
            <FaFilter className="text-red-500" /> Filter:
          </div>

          <select
            value={selectedGenre}
            onChange={(e) => {
              setSelectedGenre(e.target.value);
            }}
            disabled={isSpinning}
            className="bg-[#1a0505] text-gray-200 border border-red-900/40 rounded-xl px-3 py-1.5 focus:outline-none focus:border-red-500 font-medium"
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>
                Genre: {g}
              </option>
            ))}
          </select>

          <select
            value={selectedFormat}
            onChange={(e) => {
              setSelectedFormat(e.target.value);
            }}
            disabled={isSpinning}
            className="bg-[#1a0505] text-gray-200 border border-red-900/40 rounded-xl px-3 py-1.5 focus:outline-none focus:border-red-500 font-medium"
          >
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Konten Utama: Hasil Spin / Animasi Spinning */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center min-h-[380px]">
          {isSpinning ? (
            <div className="flex flex-col items-center justify-center py-12 gap-5 animate-pulse">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-red-600 border-t-transparent animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-4 border-amber-500 border-b-transparent animate-spin-reverse"></div>
                <FaDice className="text-5xl text-white animate-bounce" />
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-white tracking-widest uppercase">
                  Mengocok Takdir Anime...
                </p>
                <p className="text-xs text-gray-400 mt-1">Mencari rekomendasi anime terbaik untukmu</p>
              </div>
            </div>
          ) : result ? (
            <div className="w-full flex flex-col md:flex-row gap-6 items-center md:items-start animate-scale-up">
              {/* Cover Poster dengan Efek Glow Rarity */}
              <div className="relative flex-shrink-0 group">
                <div
                  className={`w-44 sm:w-52 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 ${
                    rarity ? rarity.border : "border-red-500"
                  } relative`}
                >
                  <img
                    src={result.coverImage?.extraLarge || result.coverImage?.large}
                    alt={result.title?.romaji}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>

                  {/* Rating Badge */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-yellow-500/50">
                    <FaStar className="text-yellow-400 text-xs" />
                    <span className="text-white font-black text-xs">
                      {result.averageScore ? (result.averageScore / 10).toFixed(1) : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info Deskripsi Anime */}
              <div className="flex flex-col flex-1 text-center md:text-left min-w-0">
                {/* Rarity Ribbon */}
                {rarity && (
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r ${rarity.color} shadow-lg mb-2.5 self-center md:self-start`}
                  >
                    {rarity.label}
                  </div>
                )}

                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight mb-2 line-clamp-2">
                  {result.title?.romaji}
                </h2>

                <div className="flex flex-wrap gap-1.5 justify-center md:justify-start mb-3">
                  <span className="bg-red-950/60 text-red-400 border border-red-800/40 px-2 py-0.5 rounded-md text-[10px] font-bold">
                    {result.format || "TV"}
                  </span>
                  <span className="bg-white/5 text-gray-300 border border-white/10 px-2 py-0.5 rounded-md text-[10px] font-bold">
                    {result.episodes ? `${result.episodes} Episode` : "Ongoing"}
                  </span>
                  {result.seasonYear && (
                    <span className="bg-white/5 text-gray-300 border border-white/10 px-2 py-0.5 rounded-md text-[10px] font-bold">
                      {result.seasonYear}
                    </span>
                  )}
                </div>

                {/* Genre Pills */}
                <div className="flex flex-wrap gap-1 justify-center md:justify-start mb-4">
                  {result.genres?.slice(0, 4).map((g) => (
                    <span
                      key={g}
                      className="bg-black/50 text-gray-400 border border-red-900/30 px-2 py-0.5 rounded-full text-[10px]"
                    >
                      {g}
                    </span>
                  ))}
                </div>

                {/* Sinopsis Singkat */}
                <p className="text-xs text-gray-300 line-clamp-3 leading-relaxed mb-6 bg-white/5 p-3 rounded-xl border border-white/5">
                  {result.description || "Tidak ada sinopsis singkat."}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5 mt-auto">
                  <Link
                    to={`/anime/${result.id}`}
                    onClick={onClose}
                    className="flex-1 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-black py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
                  >
                    Lihat Detail Lengkap <FaExternalLinkAlt size={10} />
                  </Link>

                  <button
                    onClick={handleQuickWatchlist}
                    disabled={isAddingWatchlist || isAddedToWatchlist}
                    className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isAddedToWatchlist
                        ? "bg-green-600/30 text-green-400 border-green-500/50"
                        : "bg-black/60 hover:bg-white/10 text-gray-300 hover:text-white border-white/20"
                    }`}
                  >
                    {isAddedToWatchlist ? (
                      <>
                        <FaCheck /> Di Watchlist
                      </>
                    ) : (
                      <>
                        <FaBookmark /> Simpan
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Modal: Tombol Tutup & Putar Lagi */}
        <div className="p-3.5 sm:p-4 border-t border-red-900/40 bg-black/80 backdrop-blur-md flex items-center justify-between gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white border border-white/15 transition-all flex items-center gap-2 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <FaTimes size={12} /> Tutup
          </button>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-500 hidden sm:inline">
              Spin ke-<strong>{spinCount}</strong>
            </span>

            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className="bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 disabled:opacity-50 text-white font-black px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(234,179,8,0.4)] flex items-center gap-2 cursor-pointer active:scale-95 flex-shrink-0"
            >
              <FaRedo className={isSpinning ? "animate-spin" : ""} />
              {isSpinning ? "Mengocok..." : "Putar Lagi 🎲"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
