import { useState, useEffect } from "react";
import {
  FaMusic,
  FaPlay,
  FaHeart,
  FaRegHeart,
  FaExternalLinkAlt,
  FaTimes,
  FaCompactDisc,
} from "react-icons/fa";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

// Cache in-memory agar tidak memanggil API berulang-ulang
const themeCache = new Map();

export default function ThemeSongsPlayer({ idMal, animeId, animeTitle }) {
  const { user } = useAuth();
  const [openings, setOpenings] = useState([]);
  const [endings, setEndings] = useState([]);
  const [activeTab, setActiveTab] = useState("op"); // 'op' | 'ed'
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState(null);
  const [favoriteSongs, setFavoriteSongs] = useState(new Set());
  const [isProcessingFav, setIsProcessingFav] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s safety timeout

    async function fetchThemes() {
      if (!idMal) {
        if (isMounted) {
          // Default fallback songs
          setOpenings([`Opening Theme (OP) - ${animeTitle || "Anime"}`]);
          setEndings([`Ending Theme (ED) - ${animeTitle || "Anime"}`]);
          setIsLoading(false);
        }
        return;
      }

      // 1. Cek Cache
      if (themeCache.has(idMal)) {
        const cached = themeCache.get(idMal);
        if (isMounted) {
          setOpenings(cached.openings);
          setEndings(cached.endings);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${idMal}/themes`, {
          signal: controller.signal,
        });

        if (res.ok) {
          const json = await res.json();
          const ops = json?.data?.openings || [];
          const eds = json?.data?.endings || [];

          const finalOps =
            ops.length > 0
              ? ops
              : [`Official Opening Theme - ${animeTitle || "Anime"}`];
          const finalEds =
            eds.length > 0
              ? eds
              : [`Official Ending Theme - ${animeTitle || "Anime"}`];

          themeCache.set(idMal, { openings: finalOps, endings: finalEds });

          if (isMounted) {
            setOpenings(finalOps);
            setEndings(finalEds);
          }
        } else {
          // Jikan API sedang timeout/504 -> Gunakan fallback cerdas
          const fallbackOps = [`Official Opening Theme - ${animeTitle || "Anime"}`];
          const fallbackEds = [`Official Ending Theme - ${animeTitle || "Anime"}`];
          themeCache.set(idMal, { openings: fallbackOps, endings: fallbackEds });

          if (isMounted) {
            setOpenings(fallbackOps);
            setEndings(fallbackEds);
          }
        }
      } catch {
        // Silent fallback jika network timeout / offline
        const fallbackOps = [`Official Opening Theme - ${animeTitle || "Anime"}`];
        const fallbackEds = [`Official Ending Theme - ${animeTitle || "Anime"}`];
        themeCache.set(idMal, { openings: fallbackOps, endings: fallbackEds });

        if (isMounted) {
          setOpenings(fallbackOps);
          setEndings(fallbackEds);
        }
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) setIsLoading(false);
      }
    }

    async function fetchUserFavorites() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("favorite_themes")
          .select("theme_title")
          .eq("user_id", user.id)
          .eq("anime_id", animeId);

        if (!error && data && isMounted) {
          setFavoriteSongs(new Set(data.map((item) => item.theme_title)));
        }
      } catch {
        // Fallback silent
      }
    }

    fetchThemes();
    fetchUserFavorites();

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [idMal, animeId, animeTitle, user]);

  const cleanSongTitle = (raw) => {
    return raw.replace(/^\d+:\s*/, "").replace(/^"|"$/g, "");
  };

  const handleToggleFavorite = async (rawTitle, type) => {
    if (!user) {
      return toast.error("Masuk akun terlebih dahulu untuk menyimpan lagu favorit!");
    }

    const cleanTitle = cleanSongTitle(rawTitle);
    const isFav = favoriteSongs.has(cleanTitle);

    setIsProcessingFav(true);
    try {
      if (isFav) {
        const { error } = await supabase
          .from("favorite_themes")
          .delete()
          .eq("user_id", user.id)
          .eq("anime_id", animeId)
          .eq("theme_title", cleanTitle);

        if (error) throw error;
        setFavoriteSongs((prev) => {
          const next = new Set(prev);
          next.delete(cleanTitle);
          return next;
        });
        toast.success("Lagu dihapus dari favorit.");
      } else {
        const { error } = await supabase.from("favorite_themes").insert([
          {
            user_id: user.id,
            anime_id: animeId,
            anime_title: animeTitle || "Anime",
            theme_type: type,
            theme_title: cleanTitle,
          },
        ]);

        if (error) throw error;
        setFavoriteSongs((prev) => {
          const next = new Set(prev);
          next.add(cleanTitle);
          return next;
        });
        toast.success("Lagu ditambahkan ke favorit! 🎵");
      }
    } catch {
      toast.error("Gagal memperbarui lagu favorit.");
    } finally {
      setIsProcessingFav(false);
    }
  };

  const currentList = activeTab === "op" ? openings : endings;

  return (
    <div className="mt-12 bg-gradient-to-br from-[#120303]/90 via-[#0a0202]/90 to-black/90 backdrop-blur-2xl border border-red-900/40 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
      {/* Background Vinyl Glowing Effect */}
      <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-red-900/30 pb-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-red-900/30 p-3.5 rounded-2xl border border-red-500/30 shadow-inner flex items-center justify-center text-red-500">
            <FaMusic className="text-2xl animate-pulse" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Soundtrack & Lagu Tema
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 font-medium">
              Koleksi lagu pembuka (OP) dan penutup (ED) resmi.
            </p>
          </div>
        </div>

        {/* Tab Switcher OP / ED */}
        <div className="flex bg-black/60 p-1.5 rounded-2xl border border-red-900/40 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("op")}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "op"
                ? "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.6)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <FaCompactDisc className={activeTab === "op" ? "animate-spin" : ""} />
            Opening ({openings.length})
          </button>
          <button
            onClick={() => setActiveTab("ed")}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "ed"
                ? "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.6)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <FaCompactDisc className={activeTab === "ed" ? "animate-spin" : ""} />
            Ending ({endings.length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
          <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold">Memuat daftar lagu...</span>
        </div>
      ) : currentList.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm italic bg-black/30 rounded-2xl border border-red-900/20">
          Tidak ada data lagu {activeTab === "op" ? "Opening" : "Ending"} yang tersedia.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {currentList.map((rawSong, idx) => {
            const cleanTitle = cleanSongTitle(rawSong);
            const isFav = favoriteSongs.has(cleanTitle);

            return (
              <div
                key={idx}
                className="bg-black/50 hover:bg-red-950/30 border border-red-900/30 hover:border-red-500/50 rounded-2xl p-4 transition-all duration-300 flex items-center justify-between gap-3 group shadow-md"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-red-950/60 border border-red-800/40 flex items-center justify-center flex-shrink-0 text-red-400 group-hover:scale-105 group-hover:bg-red-600 group-hover:text-white transition-all shadow-inner font-black text-xs">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-xs sm:text-sm font-bold truncate group-hover:text-red-300 transition-colors">
                      {cleanTitle}
                    </p>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black">
                      {activeTab === "op" ? `Opening #${idx + 1}` : `Ending #${idx + 1}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Tombol Putar / Cari di YouTube */}
                  <button
                    onClick={() =>
                      setSelectedSong({
                        title: cleanTitle,
                        query: `${animeTitle || "Anime"} ${cleanTitle}`,
                      })
                    }
                    className="p-2.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 transition-all cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(239,68,68,0.6)]"
                    title="Dengarkan Lagu"
                  >
                    <FaPlay size={11} />
                  </button>

                  {/* Tombol Simpan Favorit */}
                  <button
                    onClick={() =>
                      handleToggleFavorite(rawSong, activeTab === "op" ? "OP" : "ED")
                    }
                    disabled={isProcessingFav}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isFav
                        ? "bg-pink-600 text-white border-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.5)]"
                        : "bg-black/60 text-gray-400 hover:text-pink-400 hover:border-pink-500/40 border-red-900/30"
                    }`}
                    title={isFav ? "Hapus dari Lagu Favorit" : "Simpan Lagu Favorit"}
                  >
                    {isFav ? <FaHeart size={12} /> : <FaRegHeart size={12} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PEMUTAR YOUTUBE THEME SONG */}
      {selectedSong && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setSelectedSong(null)}
        >
          <div
            className="bg-[#110303] border border-red-900/60 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="p-5 border-b border-red-900/40 flex items-center justify-between bg-gradient-to-r from-red-950/40 to-black/60">
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <FaMusic className="text-red-500 flex-shrink-0" />
                <h4 className="text-white font-black text-sm sm:text-base truncate">
                  {selectedSong.title}
                </h4>
              </div>
              <button
                onClick={() => setSelectedSong(null)}
                className="text-gray-400 hover:text-white p-2 rounded-full bg-white/5 hover:bg-red-600 transition-colors cursor-pointer"
              >
                <FaTimes size={14} />
              </button>
            </div>

            {/* Konten Pemutar / Link YouTube */}
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-700 to-red-900 flex items-center justify-center text-white mb-5 shadow-[0_0_30px_rgba(220,38,38,0.5)] animate-spin-slow">
                <FaCompactDisc size={40} />
              </div>
              <h3 className="text-xl font-black text-white mb-1">{selectedSong.title}</h3>
              <p className="text-xs text-gray-400 max-w-md mb-6">
                Lagu tema resmi untuk anime <span className="text-red-400 font-bold">{animeTitle}</span>.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                    selectedSong.query
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-5 rounded-2xl text-sm transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2"
                >
                  <FaPlay size={12} /> Buka & Putar di YouTube
                  <FaExternalLinkAlt size={11} className="opacity-70" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
