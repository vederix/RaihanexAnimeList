import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { FaTrash, FaStar, FaPlay, FaCheck, FaClock, FaPlus, FaMinus } from "react-icons/fa";
import toast from "react-hot-toast";
import { showConfirmToast } from "../utils/confirmToast.jsx";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const Watchlist = () => {
  const { user } = useAuth();
  const [savedAnime, setSavedAnime] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [activeTab, setActiveTab] = useState("Semua");

  const tabs = [
    { id: "Semua", label: "Semua", icon: null },
    { id: "Plan to Watch", label: "Plan to Watch", icon: <FaClock /> },
    { id: "Watching", label: "Watching", icon: <FaPlay /> },
    { id: "Completed", label: "Completed", icon: <FaCheck /> },
  ];

  const loadWatchlist = async (isCancelled = false) => {
    if (!user) {
      if (!isCancelled) {
        setSavedAnime([]);
        setIsLoading(false);
      }
      return;
    }
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from("watchlist")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!isCancelled) {
        setSavedAnime(data || []);
      }
    } catch (err) {
      console.error("Gagal memuat watchlist:", err);
      if (!isCancelled) {
        setFetchError("Gagal memuat data Watchlist dari server. Periksa koneksi internetmu.");
        toast.error("Gagal memuat Watchlist.");
      }
    } finally {
      if (!isCancelled) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    let isCancelled = false;
    loadWatchlist(isCancelled);

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // --- FUNGSI UPDATE STATUS TONTONAN ---
  const updateStatus = async (animeId, newStatus) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("watchlist")
        .update({ status_tontonan: newStatus })
        .eq("user_id", user.id)
        .eq("anilist_id", animeId);

      if (error) throw error;

      setSavedAnime((prev) =>
        prev.map((anime) =>
          anime.anilist_id === animeId
            ? { ...anime, status_tontonan: newStatus }
            : anime,
        ),
      );
      toast.success(`Status diubah ke ${newStatus}`);
    } catch {
      toast.error("Gagal mengubah status.");
    }
  };

  // --- FUNGSI UPDATE RATING PRIBADI ---
  const updateRating = async (animeId, newRating) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("watchlist")
        .update({ rating_pribadi: newRating })
        .eq("user_id", user.id)
        .eq("anilist_id", animeId);

      if (error) throw error;

      setSavedAnime((prev) =>
        prev.map((anime) =>
          anime.anilist_id === animeId
            ? { ...anime, rating_pribadi: newRating }
            : anime,
        ),
      );
      toast.success("Rating pribadimu disimpan!");
    } catch {
      toast.error("Gagal menyimpan rating.");
    }
  };

  // --- FUNGSI UPDATE EPISODES WATCHED ---
  const updateEpisodesWatched = async (animeId, newEpisodesWatched) => {
    if (!user) return;
    if (newEpisodesWatched < 0) return;

    const target = savedAnime.find((a) => a.anilist_id === animeId);
    if (target && target.total_episodes && newEpisodesWatched > target.total_episodes) {
      return;
    }

    try {
      const { error } = await supabase
        .from("watchlist")
        .update({ episodes_watched: newEpisodesWatched })
        .eq("user_id", user.id)
        .eq("anilist_id", animeId);

      if (error) throw error;

      setSavedAnime((prev) =>
        prev.map((anime) =>
          anime.anilist_id === animeId
            ? { ...anime, episodes_watched: newEpisodesWatched }
            : anime,
        ),
      );
    } catch {
      toast.error("Gagal menyimpan progress episode.");
    }
  };

  // --- FUNGSI MENGHAPUS ANIME ---
  const executeDeleteSingle = async (animeId) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("watchlist")
        .delete()
        .eq("user_id", user.id)
        .eq("anilist_id", animeId);
      if (error) throw error;
      setSavedAnime((prev) =>
        prev.filter((anime) => anime.anilist_id !== animeId),
      );
      toast.success("Anime dihapus dari Watchlist!");
    } catch {
      toast.error("Gagal menghapus anime.");
    }
  };

  const handleRemoveItem = (animeId) => {
    showConfirmToast({
      title: "Hapus dari Watchlist?",
      message: "Anime ini akan dihapus dari daftar tontonan kamu.",
      confirmText: "Hapus",
      onConfirm: () => executeDeleteSingle(animeId),
    });
  };

  // --- PERSIAPAN DATA UNTUK GRAFIK & FILTER ---
  const watchingCount = savedAnime.filter(
    (a) => a.status_tontonan === "Watching",
  ).length;
  const completedCount = savedAnime.filter(
    (a) => a.status_tontonan === "Completed",
  ).length;
  const planCount = savedAnime.filter(
    (a) => (a.status_tontonan || "Plan to Watch") === "Plan to Watch",
  ).length;

  const chartData = [
    { name: "Watching", value: watchingCount, color: "#f59e0b" },
    { name: "Completed", value: completedCount, color: "#10b981" },
    { name: "Plan to Watch", value: planCount, color: "#3b82f6" },
  ].filter((item) => item.value > 0);

  const filteredAnime =
    activeTab === "Semua"
      ? savedAnime
      : savedAnime.filter(
          (anime) => (anime.status_tontonan || "Plan to Watch") === activeTab,
        );

  // --- RENDER LOADING ---
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] relative z-10">
        <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  // --- RENDER UTAMA ---
  return (
    <div className="pb-16 mt-6 sm:mt-10 min-h-[70vh] relative z-10">
      {/* 1. HEADER */}
      <div className="flex flex-col mb-8 gap-4 text-center md:text-left">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300">
            Watchlist
          </span>{" "}
          & Tracker
        </h1>
        <p className="text-sm sm:text-base text-red-100/70 max-w-2xl mx-auto md:mx-0">
          Kelola koleksi tontonanmu dan berikan rating pribadimu di RAIHANEX.
        </p>
      </div>

      {/* 2. VISUALISASI DATA (ANALYTICS DASHBOARD) */}
      {savedAnime.length > 0 && (
        <div className="glass-card rounded-3xl p-6 sm:p-8 mb-10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center gap-8 relative overflow-hidden animate-scale-up">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-red-600/10 rounded-full blur-[80px] pointer-events-none"></div>
          {/* Teks & Angka */}
          <div className="flex-1 w-full text-center md:text-left">
            <h2 className="text-2xl font-bold text-white mb-2">
              Statistik Tontonan
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              Ringkasan aktivitas dan progres menonton anime-mu di RAIHANEX.
            </p>

            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <div className="bg-black/40 border border-blue-900/50 px-5 py-3 rounded-2xl flex-1 md:flex-none min-w-[100px]">
                <span className="block text-[10px] sm:text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">
                  Rencana
                </span>
                <span className="text-2xl font-black text-white">
                  {planCount}
                </span>
              </div>
              <div className="bg-black/40 border border-amber-900/50 px-5 py-3 rounded-2xl flex-1 md:flex-none min-w-[100px]">
                <span className="block text-[10px] sm:text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
                  Berjalan
                </span>
                <span className="text-2xl font-black text-white">
                  {watchingCount}
                </span>
              </div>
              <div className="bg-black/40 border border-emerald-900/50 px-5 py-3 rounded-2xl flex-1 md:flex-none min-w-[100px]">
                <span className="block text-[10px] sm:text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">
                  Selesai
                </span>
                <span className="text-2xl font-black text-white">
                  {completedCount}
                </span>
              </div>
            </div>
          </div>

          {/* Donut Chart (Recharts) */}
          <div className="w-full md:w-1/2 lg:w-1/3 h-48 flex justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="drop-shadow-lg"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0202",
                    border: "1px solid #7f1d1d",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                  itemStyle={{ color: "#fff", fontWeight: "bold" }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Teks Total di Tengah Grafik */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-white">
                {savedAnime.length}
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Total
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. TABS NAVIGATION */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-4 snap-x hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:justify-start">
        {tabs.map((tab) => {
          const count =
            tab.id === "Semua"
              ? savedAnime.length
              : savedAnime.filter(
                  (a) => (a.status_tontonan || "Plan to Watch") === tab.id,
                ).length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`snap-center shrink-0 flex items-center gap-2 px-6 py-3 rounded-full text-xs sm:text-sm font-bold transition-all border cursor-pointer active:scale-95 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-red-700 to-red-600 text-white border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                  : "bg-black/40 text-gray-400 border-red-900/30 hover:border-red-500/50 hover:text-white hover:bg-[#1a0505]/60"
              }`}
            >
              {tab.icon} {tab.label}
              <span
                className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black shadow-inner ${activeTab === tab.id ? "bg-white/20 text-white" : "bg-red-950/60 text-red-300 border border-red-900/40"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. GRID DATA / ERROR / KONDISI KOSONG */}
      {fetchError ? (
        <div className="glass-card p-8 sm:p-12 rounded-3xl text-center max-w-2xl mx-auto shadow-[0_20px_40px_rgba(0,0,0,0.5)] animate-fade-in border border-red-500/30">
          <span className="text-4xl sm:text-5xl mb-4 sm:mb-6 block drop-shadow-lg">⚠️</span>
          <h2 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight drop-shadow-md">
            Gagal Memuat Watchlist
          </h2>
          <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">{fetchError}</p>
          <button
            onClick={() => loadWatchlist(false)}
            className="btn-primary py-3 px-8 text-sm sm:text-base shadow-[0_0_20px_rgba(220,38,38,0.3)] active:scale-95"
          >
            Coba Muat Ulang
          </button>
        </div>
      ) : filteredAnime.length === 0 ? (
        <div className="glass-card p-8 sm:p-12 rounded-3xl text-center max-w-2xl mx-auto shadow-[0_20px_40px_rgba(0,0,0,0.5)] animate-fade-in border-t border-red-900/50">
          <span className="text-4xl sm:text-5xl mb-4 sm:mb-6 block drop-shadow-lg">🍃</span>
          <h2 className="text-xl sm:text-2xl font-black text-white mb-3 tracking-tight drop-shadow-md">
            Belum ada anime di kategori ini!
          </h2>
          <Link
            to="/search"
            className="inline-block mt-4 btn-primary py-3 px-8 text-sm sm:text-base shadow-[0_0_20px_rgba(220,38,38,0.3)]"
          >
            Cari Anime
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
          {filteredAnime.map((anime) => (
            <div
              key={anime.anilist_id}
              className="glass-card glass-card-hover rounded-2xl overflow-hidden relative flex flex-col"
            >
              {/* Gambar Cover */}
              <div className="relative h-48 sm:h-64 overflow-hidden bg-black">
                <Link to={`/anime/${anime.anilist_id}`}>
                  <img
                    src={anime.image_url}
                    alt={anime.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-90"></div>
                </Link>

                {/* Tombol Hapus Mengambang */}
                <button
                  onClick={() => handleRemoveItem(anime.anilist_id)}
                  className="absolute top-3 right-3 bg-red-950/80 hover:bg-red-600 border border-red-500/40 text-red-200 hover:text-white p-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] active:scale-90 z-10 cursor-pointer"
                  title="Hapus dari Watchlist"
                >
                  <FaTrash size={12} />
                </button>
              </div>

              {/* Teks Judul & Kontrol Tracker */}
              <div className="p-4 sm:p-5 flex flex-col flex-grow justify-between bg-gradient-to-b from-black/80 to-[#0a0202] relative z-10 -mt-8 sm:-mt-10 border-t border-red-900/30">
                <Link to={`/anime/${anime.anilist_id}`}>
                  <h3 className="font-black text-white line-clamp-2 text-base sm:text-lg mb-4 hover:text-red-400 transition-colors drop-shadow-md leading-tight">
                    {anime.title}
                  </h3>
                </Link>

                <div className="flex flex-col gap-3">
                  {/* Select Status */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Status
                    </label>
                    <select
                      value={anime.status_tontonan || "Plan to Watch"}
                      onChange={(e) =>
                        updateStatus(anime.anilist_id, e.target.value)
                      }
                      className="input-field px-3 py-2 text-sm appearance-none cursor-pointer"
                    >
                      <option value="Plan to Watch">Plan to Watch</option>
                      <option value="Watching">Watching</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  {/* Select Rating */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Ratingku
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaStar className="text-yellow-400 text-sm" />
                      </div>
                      <select
                        value={anime.rating_pribadi || 0}
                        onChange={(e) =>
                          updateRating(anime.anilist_id, parseInt(e.target.value, 10))
                        }
                        className="input-field py-2 pl-9 pr-3 text-sm appearance-none cursor-pointer w-full"
                      >
                        <option value="0">Belum Dinilai</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <option key={num} value={num}>
                            {num} / 10
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Tracker Episode */}
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Progress
                      </label>
                      <span className="text-xs font-bold text-white">
                        {anime.episodes_watched || 0} / {anime.total_episodes || "?"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateEpisodesWatched(anime.anilist_id, Math.max(0, (anime.episodes_watched || 0) - 1))}
                        className="bg-black/60 hover:bg-red-900/40 text-gray-400 hover:text-white border border-red-900/50 rounded-lg p-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!anime.episodes_watched || anime.episodes_watched <= 0}
                      >
                        <FaMinus size={10} />
                      </button>
                      
                      <div className="flex-1 h-2 bg-black/60 rounded-full overflow-hidden border border-red-900/30">
                        <div 
                          className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
                          style={{ width: `${anime.total_episodes ? ((anime.episodes_watched || 0) / anime.total_episodes) * 100 : (anime.episodes_watched ? 100 : 0)}%` }}
                        ></div>
                      </div>

                      <button
                        onClick={() => updateEpisodesWatched(anime.anilist_id, (anime.episodes_watched || 0) + 1)}
                        className="bg-black/60 hover:bg-green-900/40 text-gray-400 hover:text-white border border-green-900/50 rounded-lg p-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={anime.total_episodes && (anime.episodes_watched || 0) >= anime.total_episodes}
                      >
                        <FaPlus size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Watchlist;
