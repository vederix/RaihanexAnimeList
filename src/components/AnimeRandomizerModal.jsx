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
import { useGenres } from "../utils/genreService";
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

const FORMATS = [
  { label: "Semua Format", value: "" },
  { label: "TV Series", value: "TV" },
  { label: "Movie / Film", value: "MOVIE" },
  { label: "OVA / Special", value: "OVA" },
];

export default function AnimeRandomizerModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { genres: apiGenres, isLoading: isGenreLoading } = useGenres();

  // Prepend opsi "Semua" untuk dropdown genre
  const genreOptions = ["Semua", ...apiGenres];

  const [selectedGenre, setSelectedGenre] = useState("Semua");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinError, setSpinError] = useState(null);
  const [result, setResult] = useState(null);
  const [spinCount, setSpinCount] = useState(0);
  const [isAddedToWatchlist, setIsAddedToWatchlist] = useState(false);
  const [isAddingWatchlist, setIsAddingWatchlist] = useState(false);

  const spinTimeoutRef = useRef(null);

  const handleSpin = useCallback(async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setSpinError(null);
    setIsAddedToWatchlist(false);
    setResult(null);
    setSpinCount((prev) => prev + 1);

    try {
      // Ambil page acak antara 1 s/d 12
      const randomPage = Math.floor(Math.random() * 12) + 1;
      const genreVar = selectedGenre === "Semua" ? undefined : selectedGenre;
      const formatVar = selectedFormat || undefined;

      const { data, error } = await fetchAniList(RANDOM_QUERY, {
        page: randomPage,
        genre: genreVar,
        format: formatVar,
      });
      if (error) throw new Error(error);

      const list = data?.Page?.media || [];
      if (list.length === 0) {
        setSpinError("Tidak menemukan anime dengan filter ini. Coba genre atau format lain!");
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
      setSpinError("Gagal menghubungi server AniList. Silakan coba kembali.");
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
          anilist_id: result.id,
          title: result.title?.romaji || "Anime",
          image_url: result.coverImage?.large || "",
          status_tontonan: "Plan to Watch",
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

  // Helper untuk membersihkan tag HTML mentah seperti <i>, <br>, dll dari deskripsi AniList
  const cleanSynopsis = (text) => {
    if (!text) return "Tidak ada sinopsis singkat.";
    return text
      .replace(/<[^>]*>?/gm, "")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, "&")
      .trim();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-lg"></div>

      <div
        className="relative bg-[#0d0202] border border-red-500/40 rounded-3xl w-full max-w-2xl md:max-w-3xl overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.95)] max-h-[90vh] flex flex-col my-auto animate-scale-up z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-red-900/40 bg-[#120303] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-gradient-to-tr from-red-600 to-red-800 rounded-xl text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] flex-shrink-0">
              <FaDice className="text-lg animate-spin-slow" />
            </div>
            <div className="truncate">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2 leading-tight drop-shadow-md">
                GACHA ROULETTE
              </h3>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-gray-400 mt-0.5 truncate">
                Biarkan takdir memilihkan tontonanmu!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-red-950/80 hover:bg-red-600 border border-red-500/40 text-white transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] active:scale-95 cursor-pointer flex-shrink-0"
            aria-label="Tutup Modal"
            title="Tutup Modal"
          >
            <FaTimes size={13} />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-5 py-3 bg-[#080101] border-b border-red-900/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs flex-shrink-0">
          <div className="flex items-center gap-2 text-gray-300 font-bold text-[11px] sm:text-xs">
            <FaFilter className="text-red-500" />
            <span>Filter Gacha:</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 flex-1 sm:max-w-md">
            <div className="relative">
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                disabled={isSpinning || isGenreLoading}
                className="w-full bg-[#140404] text-white text-[11px] sm:text-xs font-semibold py-2 pl-3 pr-7 rounded-xl border border-red-900/50 focus:border-red-500 outline-none appearance-none cursor-pointer transition-colors shadow-inner"
              >
                {genreOptions.map((g) => (
                  <option key={g} value={g} className="bg-[#0a0202] text-white">
                    Genre: {g}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-red-400 text-[10px]">
                ▼
              </div>
            </div>

            <div className="relative">
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                disabled={isSpinning}
                className="w-full bg-[#140404] text-white text-[11px] sm:text-xs font-semibold py-2 pl-3 pr-7 rounded-xl border border-red-900/50 focus:border-red-500 outline-none appearance-none cursor-pointer transition-colors shadow-inner"
              >
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value} className="bg-[#0a0202] text-white">
                    {f.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-red-400 text-[10px]">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Konten Utama: Hasil Spin / Animasi Spinning (Locked with min-h-0 and flex-1) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#0d0202] to-[#080101]">
          {isSpinning ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4 animate-pulse">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-red-600 border-b-red-800 animate-spin-slow shadow-[0_0_20px_rgba(220,38,38,0.3)]"></div>
                <div className="absolute inset-2 rounded-full border-[3px] border-transparent border-l-amber-500 border-r-amber-600 animate-spin-reverse opacity-80"></div>
                <FaDice className="text-4xl sm:text-5xl text-white animate-bounce shadow-[0_0_15px_rgba(255,255,255,0.5)] rounded-xl" />
              </div>
              <div className="text-center mt-1">
                <p className="text-base sm:text-lg font-black text-white tracking-[0.2em] uppercase drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]">
                  Mengocok Takdir...
                </p>
                <p className="text-[10px] sm:text-[11px] font-bold tracking-widest text-gray-400 mt-1 uppercase">
                  Mencari rekomendasi anime terbaik
                </p>
              </div>
            </div>
          ) : result ? (
            <div className="w-full flex flex-col sm:flex-row gap-5 sm:gap-6 items-center sm:items-start animate-fade-in my-auto">
              {/* Cover Poster dengan Efek Glow Rarity */}
              <div className="relative flex-shrink-0 group">
                <div
                  className={`w-32 sm:w-44 md:w-48 aspect-[3/4] rounded-2xl overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.9)] border-2 ${
                    rarity ? rarity.border : "border-red-500/50"
                  } relative`}
                >
                  <img
                    src={result.coverImage?.extraLarge || result.coverImage?.large}
                    alt={result.title?.romaji}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0202] via-transparent to-transparent opacity-80"></div>

                  {/* Rating Badge */}
                  <div className="absolute bottom-2.5 left-2.5 bg-black/90 backdrop-blur-md border border-yellow-500/50 text-white px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-lg">
                    <FaStar className="text-yellow-400 text-xs" />
                    <span className="text-xs font-black mt-0.5">
                      {result.averageScore ? (result.averageScore / 10).toFixed(1) : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info Deskripsi Anime */}
              <div className="flex flex-col flex-1 text-center sm:text-left min-w-0 w-full">
                {/* Rarity Ribbon */}
                {rarity && (
                  <div
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r ${rarity.color} shadow-md mb-2.5 self-center sm:self-start`}
                  >
                    {rarity.label}
                  </div>
                )}

                <h2 className="text-lg sm:text-2xl font-black text-white leading-snug mb-2.5 line-clamp-2 drop-shadow-md">
                  {result.title?.romaji}
                </h2>

                {/* Metadata Pills */}
                <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start mb-3.5">
                  <span className="bg-red-950/80 text-red-300 border border-red-800/50 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest shadow-inner">
                    {result.format || "TV"}
                  </span>
                  <span className="bg-black/60 text-gray-300 border border-white/10 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest">
                    {result.episodes ? `${result.episodes} EPS` : "ONGOING"}
                  </span>
                  {result.seasonYear && (
                    <span className="bg-black/60 text-gray-300 border border-white/10 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest">
                      {result.seasonYear}
                    </span>
                  )}
                  {result.genres?.slice(0, 3).map((g) => (
                    <span
                      key={g}
                      className="bg-[#1a0505] text-gray-300 border border-red-900/50 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    >
                      {g}
                    </span>
                  ))}
                </div>

                {/* Sinopsis Singkat (Clean without raw HTML tags) */}
                <p className="text-xs text-gray-300 line-clamp-3 leading-relaxed mb-4 bg-[#120303] p-3.5 rounded-xl border border-red-900/30 font-medium shadow-inner">
                  {cleanSynopsis(result.description)}
                </p>

                {/* Action Buttons (Always 2 Columns Side-by-Side) */}
                <div className="grid grid-cols-2 gap-3 mt-auto">
                  <Link
                    to={`/anime/${result.id}`}
                    onClick={onClose}
                    className="btn-primary py-3 px-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                  >
                    Lihat Detail <FaExternalLinkAlt size={10} />
                  </Link>

                  <button
                    onClick={handleQuickWatchlist}
                    disabled={isAddingWatchlist || isAddedToWatchlist}
                    className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold border transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                      isAddedToWatchlist
                        ? "bg-green-900/40 text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                        : "bg-[#140404] hover:bg-[#1f0606] text-gray-200 hover:text-white border-red-900/40 hover:border-red-500/60"
                    }`}
                  >
                    {isAddedToWatchlist ? (
                      <>
                        <FaCheck size={12} /> Tersimpan
                      </>
                    ) : (
                      <>
                        <FaBookmark size={11} /> + Watchlist
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : spinError ? (
            <div className="flex flex-col items-center justify-center text-center p-6 animate-fade-in max-w-sm my-auto">
              <span className="text-4xl mb-3">🎲</span>
              <p className="text-white font-bold text-sm mb-2">{spinError}</p>
              <button
                onClick={handleSpin}
                className="btn-primary px-6 py-2.5 text-xs mt-3 flex items-center gap-2"
              >
                <FaRedo /> Coba Putar Ulang
              </button>
            </div>
          ) : null}
        </div>

        {/* Footer Modal: Tombol Tutup & Putar Lagi (Always Visible, Locked at Bottom) */}
        <div className="px-5 py-3.5 sm:py-4 border-t border-red-900/40 bg-[#120303] flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="btn-secondary px-4 sm:px-5 py-2.5 text-xs sm:text-sm flex items-center gap-1.5"
          >
            <FaTimes size={11} /> Tutup
          </button>

          <div className="flex items-center gap-3.5">
            <span className="text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">
              Spin ke-<strong>{spinCount}</strong>
            </span>

            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className="bg-gradient-to-r from-red-700 via-red-600 to-amber-600 hover:from-red-600 hover:to-amber-500 disabled:opacity-50 text-white font-black px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center gap-2 cursor-pointer active:scale-95 flex-shrink-0 border border-red-400/40"
            >
              <FaRedo className={isSpinning ? "animate-spin" : ""} size={12} />
              {isSpinning ? "MENGGULUNG..." : "PUTAR LAGI 🎲"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
