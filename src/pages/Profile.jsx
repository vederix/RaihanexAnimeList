import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaSignOutAlt,
  FaChartBar,
  FaCalendarAlt,
  FaPlayCircle,
  FaComments,
  FaHistory,
  FaTrophy,
  FaPen,
  FaTimes,
  FaCheck,
  FaCloudDownloadAlt,
} from "react-icons/fa";
import toast from "react-hot-toast";
import SmartRecommendation from "../components/SmartRecommendation";
import ImportWatchlistModal from "../components/ImportWatchlistModal";
import { showConfirmToast } from "../utils/confirmToast.jsx";

const Profile = () => {
  const { user, logout, displayName, avatarUrl, updateProfile } = useAuth();
  const [stats, setStats] = useState({ totalWatchlist: 0, totalReviews: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [activeTab, setActiveTab] = useState("statistik"); // 'statistik' atau 'aktivitas'
  const [isLoading, setIsLoading] = useState(true);
  
  // State Edit Profile Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(displayName);
  const [isUpdating, setIsUpdating] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    let isCancelled = false;

    const fetchProfileData = async () => {
      if (!user) {
        navigate("/auth");
        return;
      }

      try {
        // Parallel Fetch untuk mempercepat load time dasbor profil
        const [
          { count: watchlistCount, error: watchlistError },
          { count: reviewCount, error: reviewError },
          { data: recentWatchlist, error: recentError },
          { data: earnedData, error: badgesError },
        ] = await Promise.all([
          supabase
            .from("watchlist")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("reviews")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("watchlist")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(4),
          supabase
            .from("user_badges")
            .select("*, badges(*)")
            .eq("user_id", user.id),
        ]);

        if (watchlistError) console.error("Error watchlist count:", watchlistError);
        if (reviewError) console.error("Error review count:", reviewError);
        if (recentError) console.error("Error recent watchlist:", recentError);
        if (badgesError) console.error("Error badges:", badgesError);

        const finalBadges = earnedData || [];

        if (!isCancelled) {
          setStats({
            totalWatchlist: watchlistCount || 0,
            totalReviews: reviewCount || 0,
          });
          setRecentActivity(recentWatchlist || []);
          setUserBadges(finalBadges.map((b) => b.badges).filter(Boolean));
          setNewDisplayName(displayName);
        }
      } catch (error) {
        console.error("Gagal memuat data profil:", error);
        toast.error("Gagal memuat data profil.");
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchProfileData();

    return () => {
      isCancelled = true;
    };
  }, [user, navigate, displayName]);

  const handleLogout = () => {
    showConfirmToast({
      title: "Keluar Akun?",
      message: "Sesi login kamu akan diakhiri.",
      confirmText: "Keluar",
      onConfirm: async () => {
        try {
          await logout();
          toast.success("Berhasil keluar akun!");
          navigate("/");
        } catch {
          toast.error("Gagal logout.");
        }
      },
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!newDisplayName.trim()) {
      return toast.error("Nama tampilan tidak boleh kosong!");
    }
    setIsUpdating(true);
    try {
      await updateProfile(newDisplayName.trim());
      toast.success("Profil berhasil diperbarui!");
      setIsEditModalOpen(false);
    } catch {
      toast.error("Gagal memperbarui profil.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] relative z-10">
        <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]"></div>
      </div>
    );
  }

  // --- LOGIKA GAMIFIKASI RANK ---
  const calculateRank = (watchlistCount) => {
    if (watchlistCount >= 50)
      return {
        title: "Wibu Sepuh",
        color: "text-amber-400",
        next: 100,
        progress: (watchlistCount / 100) * 100,
      };
    if (watchlistCount >= 20)
      return {
        title: "Veteran Anime",
        color: "text-purple-400",
        next: 50,
        progress: (watchlistCount / 50) * 100,
      };
    if (watchlistCount >= 5)
      return {
        title: "Penikmat Anime",
        color: "text-blue-400",
        next: 20,
        progress: (watchlistCount / 20) * 100,
      };
    return {
      title: "Otaku Pemula",
      color: "text-green-400",
      next: 5,
      progress: (watchlistCount / 5) * 100,
    };
  };

  const userRank = calculateRank(stats.totalWatchlist);
  const userEmail = user?.email || "User";
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Baru saja";

  return (
    <div className="pb-16 mt-10 min-h-[70vh] relative z-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-0">
        {/* Header Title */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-white tracking-tight drop-shadow-lg">
            Dasbor{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300">
              Pengguna
            </span>
          </h1>
          <p className="text-red-100/70">
            Pusat komando RAIHANEX. Kelola akun dan pantau progres eksplorasimu.
          </p>
        </div>

        {/* Profile Card Main */}
        <div className="glass-card rounded-3xl p-6 md:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative overflow-hidden mb-8 animate-scale-up border-t border-red-900/50">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-red-600/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
            {/* Bagian Avatar & Rank Badge */}
            <div className="flex flex-col items-center gap-4 flex-shrink-0">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-tr from-red-600 to-red-900 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
                <img
                  src={avatarUrl}
                  alt="User Avatar"
                  className="relative w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#1a0505] shadow-2xl object-cover"
                />
              </div>
              <div className="flex items-center gap-2 bg-black/60 border border-red-900/50 px-4 py-1.5 rounded-full shadow-inner">
                <FaTrophy className={userRank.color} size={14} />
                <span
                  className={`text-xs font-black uppercase tracking-widest ${userRank.color}`}
                >
                  {userRank.title}
                </span>
              </div>
            </div>

            {/* Bagian Info Diri & Progress Bar */}
            <div className="flex-1 w-full text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">
                {displayName}
              </h2>

              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 sm:gap-6 text-sm mb-8">
                <div className="flex items-center gap-2 text-gray-300 bg-red-950/30 px-3 py-1.5 rounded-lg border border-red-900/20">
                  <FaEnvelope className="text-red-400" />{" "}
                  <span>{userEmail}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 bg-red-950/30 px-3 py-1.5 rounded-lg border border-red-900/20">
                  <FaCalendarAlt className="text-red-400/70" />{" "}
                  <span>Bergabung {joinDate}</span>
                </div>
              </div>

              {/* Progress Bar Gamifikasi */}
              <div className="bg-[#0a0202] border border-red-900/30 p-4 rounded-2xl mb-6 shadow-inner">
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-gray-400">
                    Progres Level Selanjutnya
                  </span>
                  <span className="text-red-400">
                    {stats.totalWatchlist} / {userRank.next} Anime
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 shadow-inner overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-red-600 to-red-400 h-2.5 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(userRank.progress, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Koleksi Lencana (Badges) */}
              {userBadges.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <FaTrophy className="text-yellow-500" /> Lencana Prestasi
                  </h3>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    {userBadges.map((badge, idx) => (
                      <div key={idx} className="flex flex-col items-center group relative">
                        <div className="w-12 h-12 flex items-center justify-center bg-black/60 border border-yellow-500/50 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.2)] text-2xl group-hover:scale-110 transition-transform">
                          {badge.icon_url || '🏅'}
                        </div>
                        {/* Tooltip */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 border border-white/10">
                          <strong className="block text-yellow-400">{badge.name}</strong>
                          {badge.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tombol Aksi */}
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="btn-secondary px-5 py-2.5 flex items-center gap-2"
                >
                  <FaPen size={12} /> Edit Profil
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all border border-blue-500/50 flex items-center gap-2 cursor-pointer"
                >
                  <FaCloudDownloadAlt size={16} /> Impor dari AniList
                </button>
                <button
                  onClick={handleLogout}
                  className="btn-primary px-5 py-2.5 flex items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                >
                  <FaSignOutAlt /> Keluar Akun
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* --- MODAL EDIT PROFIL --- */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="glass-card p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl relative border-t border-red-500/30 animate-scale-up">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <FaUser className="text-red-500" /> Ubah Nama Tampilan
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-400 hover:text-white p-2 rounded-lg bg-black/40 cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[11px] font-black text-red-300 uppercase mb-2 tracking-widest">
                    Username / Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="w-full input-field px-4 py-3 text-sm"
                    placeholder="Nama baru kamu..."
                  />
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="btn-secondary px-5 py-2.5 text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2 shadow-lg"
                  >
                    {isUpdating ? "Menyimpan..." : <><FaCheck /> Simpan</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- TABS NAVIGASI --- */}
        <div className="flex gap-4 mb-6 border-b border-red-900/30 pb-2">
          <button
            onClick={() => setActiveTab("statistik")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all border-b-2 cursor-pointer ${activeTab === "statistik" ? "border-red-500 text-red-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}
          >
            <FaChartBar /> Analitik Data
          </button>
          <button
            onClick={() => setActiveTab("aktivitas")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all border-b-2 cursor-pointer ${activeTab === "aktivitas" ? "border-red-500 text-red-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}
          >
            <FaHistory /> Aktivitas Terakhir
          </button>
        </div>

        {/* --- KONTEN TABS --- */}
        {activeTab === "statistik" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 animate-fade-in">
            {/* Box 1: Watchlist */}
            <div className="glass-card glass-card-hover p-6 rounded-2xl flex items-center gap-5 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <FaPlayCircle size={100} className="text-red-500" />
              </div>
              <div className="bg-gradient-to-br from-red-600 to-red-900 p-4 rounded-xl text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] z-10">
                <FaPlayCircle size={28} />
              </div>
              <div className="z-10">
                <h3 className="text-4xl font-black text-white tracking-tight">
                  {stats.totalWatchlist}
                </h3>
                <p className="text-sm text-gray-400 font-medium uppercase tracking-wide mt-1">
                  Anime Tersimpan
                </p>
              </div>
            </div>

            {/* Box 2: Ulasan */}
            <div className="glass-card glass-card-hover p-6 rounded-2xl flex items-center gap-5 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <FaComments size={100} className="text-blue-500" />
              </div>
              <div className="bg-gradient-to-br from-blue-600 to-blue-900 p-4 rounded-xl text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] z-10">
                <FaComments size={28} />
              </div>
              <div className="z-10">
                <h3 className="text-4xl font-black text-white tracking-tight">
                  {stats.totalReviews}
                </h3>
                <p className="text-sm text-gray-400 font-medium uppercase tracking-wide mt-1">
                  Ulasan Ditulis
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-6 animate-fade-in shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
            {recentActivity.length === 0 ? (
              <div className="text-center py-10 text-gray-500 font-medium">
                Belum ada aktivitas. Mulai tambahkan anime ke Watchlist!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {recentActivity.map((item) => (
                  <Link
                    to={`/anime/${item.anilist_id}`}
                    key={item.id}
                    className="relative group rounded-xl overflow-hidden shadow-lg border border-red-900/30 block aspect-[3/4] hover:border-red-500 transition-colors"
                  >
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3 opacity-90 group-hover:opacity-100 transition-opacity">
                      <h4 className="text-white text-xs font-bold line-clamp-2 leading-snug">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-gray-400 mt-1">
                        {new Date(item.created_at).toLocaleDateString("id-ID", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {recentActivity.length > 0 && (
              <div className="mt-6 text-center">
                <Link
                  to="/watchlist"
                  className="text-red-400 hover:text-white text-sm font-bold transition-colors"
                >
                  Lihat Semua Watchlist &rarr;
                </Link>
              </div>
            )}
          </div>
        )}
        <SmartRecommendation />
      </div>
      
      {/* MODAL IMPORT ANILIST */}
      <ImportWatchlistModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        user={user}
      />
    </div>
  );
};

export default Profile;
