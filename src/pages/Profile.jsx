import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
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
} from "react-icons/fa";
import toast from "react-hot-toast";
import SmartRecommendation from "../components/SmartRecommendation";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ totalWatchlist: 0, totalReviews: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [activeTab, setActiveTab] = useState("statistik"); // 'statistik' atau 'aktivitas'
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate("/auth");
          return;
        }
        setUser(session.user);

        // 1. Ambil Jumlah Watchlist
        const { count: watchlistCount } = await supabase
          .from("watchlist")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id);

        // 2. Ambil Jumlah Ulasan
        const { count: reviewCount } = await supabase
          .from("reviews")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id);

        // 3. Ekstraksi Pola Data: Ambil 4 Watchlist Terakhir (Data Mining ringan)
        const { data: recentWatchlist } = await supabase
          .from("watchlist")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(4);

        setStats({
          totalWatchlist: watchlistCount || 0,
          totalReviews: reviewCount || 0,
        });
        setRecentActivity(recentWatchlist || []);
      } catch (error) {
        console.error("Gagal memuat profil:", error);
        toast.error("Gagal memuat data profil.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Berhasil keluar akun!");
      navigate("/");
    } catch (error) {
      toast.error("Gagal logout.");
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
  const userMetadata = user?.user_metadata;
  const username =
    userMetadata?.display_name || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "User";
  const avatarUrl = `https://ui-avatars.com/api/?name=${username}&background=880000&color=fff&size=256&bold=true`;
  const joinDate = new Date(user?.created_at).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
        <div className="bg-[#1a0505]/80 backdrop-blur-3xl border border-red-900/40 rounded-3xl p-6 md:p-10 shadow-[0_20px_50px_rgba(153,27,27,0.2)] relative overflow-hidden mb-8">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-red-600/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
            {/* Bagian Avatar & Rank Badge */}
            <div className="flex flex-col items-center gap-4 flex-shrink-0">
              <div className="relative group cursor-pointer">
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
                {username}
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
              <div className="bg-black/40 border border-red-900/30 p-4 rounded-2xl mb-8">
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

              {/* Tombol Aksi */}
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <button
                  onClick={() =>
                    toast("Fitur Edit Profil sedang dalam pengembangan!", {
                      icon: "🛠️",
                    })
                  }
                  className="bg-black/50 hover:bg-red-900/30 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all border border-red-900/50 flex items-center gap-2"
                >
                  <FaUser /> Edit Profil
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] border border-red-500/50 flex items-center gap-2"
                >
                  <FaSignOutAlt /> Keluar Akun
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* --- TABS NAVIGASI --- */}
        <div className="flex gap-4 mb-6 border-b border-red-900/30 pb-2">
          <button
            onClick={() => setActiveTab("statistik")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all border-b-2 ${activeTab === "statistik" ? "border-red-500 text-red-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}
          >
            <FaChartBar /> Analitik Data
          </button>
          <button
            onClick={() => setActiveTab("aktivitas")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all border-b-2 ${activeTab === "aktivitas" ? "border-red-500 text-red-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}
          >
            <FaHistory /> Aktivitas Terakhir
          </button>
        </div>

        {/* --- KONTEN TABS --- */}
        {activeTab === "statistik" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 animate-fade-in">
            {/* Box 1: Watchlist */}
            <div className="bg-[#1a0505]/40 backdrop-blur-md border border-red-900/30 p-6 rounded-2xl flex items-center gap-5 hover:border-red-500/50 transition-all shadow-lg relative overflow-hidden group">
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
            <div className="bg-[#1a0505]/40 backdrop-blur-md border border-red-900/30 p-6 rounded-2xl flex items-center gap-5 hover:border-blue-500/50 transition-all shadow-lg relative overflow-hidden group">
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
          <div className="bg-[#1a0505]/40 backdrop-blur-md border border-red-900/30 rounded-2xl p-6 animate-fade-in">
            {recentActivity.length === 0 ? (
              <div className="text-center py-10 text-gray-500 font-medium">
                Belum ada aktivitas. Mulai tambahkan anime ke Watchlist!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {recentActivity.map((item) => (
                  <Link
                    to={`/anime/${item.mal_id}`}
                    key={item.id}
                    className="relative group rounded-xl overflow-hidden shadow-lg border border-red-900/30 block"
                  >
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full aspect-[3/4] object-cover group-hover:scale-110 transition-transform duration-500"
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
    </div>
  );
};

export default Profile;
