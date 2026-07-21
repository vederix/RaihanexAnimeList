import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import {
  FaSignOutAlt,
  FaUser,
  FaEnvelope,
  FaHome,
  FaCompass,
  FaChevronDown,
  FaSearch,
  FaBookmark,
  FaSpinner,
  FaCalendarAlt,
} from "react-icons/fa";
import { fetchAniList } from "../utils/anilist";

// QUERY KHUSUS UNTUK LIVE SEARCH (Hanya ambil 5 data teratas)
const LIVE_SEARCH_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 5) {
      media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
        id
        title { romaji }
        coverImage { medium }
        seasonYear
      }
    }
  }
`;

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  // State Dropdown Profil & Watchlist
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [watchlistCount, setWatchlistCount] = useState(0);

  // State untuk Live Search Auto-Complete
  const [globalSearch, setGlobalSearch] = useState("");
  const [liveResults, setLiveResults] = useState([]);
  const [isLiveSearching, setIsLiveSearching] = useState(false);

  const searchContainerRef = useRef(null);
  const profileRef = useRef(null);

  // Pantau Status Autentikasi User
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setUser(session?.user ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => subscription.unsubscribe();
  }, []);

  // Hitung jumlah Watchlist secara Real-time
  useEffect(() => {
    const fetchWatchlistCount = async () => {
      if (user) {
        const { count, error } = await supabase
          .from("watchlist")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);
        if (!error) setWatchlistCount(count || 0);
      }
    };
    fetchWatchlistCount();
  }, [user, isProfileOpen]);

  // Efek Navigasi saat di-Scroll
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Menutup popup jika user mengklik di luar area
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target))
        setIsProfileOpen(false);
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      )
        setLiveResults([]);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // LOGIKA DEBOUNCING UNTUK LIVE SEARCH PINTAR
  useEffect(() => {
    // Jika input kosong atau kurang dari 3 huruf, kosongkan hasil
    if (globalSearch.trim().length < 3) {
      setLiveResults([]);
      setIsLiveSearching(false);
      return;
    }

    setIsLiveSearching(true);

    // Tunggu 500ms setelah user berhenti mengetik, baru jalankan fetch API
    const delayDebounceFn = setTimeout(async () => {
      try {
        const data = await fetchAniList(LIVE_SEARCH_QUERY, {
          search: globalSearch,
        });
        setLiveResults(data.Page.media || []);
      } catch (error) {
        console.error("Live search error:", error);
      } finally {
        setIsLiveSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [globalSearch]);

  const executeLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Berhasil keluar akun!");
      navigate("/");
    } catch (error) {
      toast.error("Gagal logout.");
    }
  };

  const handleLogoutClick = () => {
    setIsProfileOpen(false);
    toast(
      (t) => (
        <div className="flex flex-col gap-4 p-1 w-full">
          <span className="font-semibold text-white text-center">
            Yakin ingin keluar dari akun?
          </span>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                executeLogout();
              }}
              className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-bold w-full border border-red-400/50 transition-colors"
            >
              Ya
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2 rounded-lg text-sm font-bold w-full border border-slate-500/50 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      ),
      { duration: 6000 },
    );
  };

  // Submit pencarian menggunakan tombol Enter
  const handleGlobalSearchSubmit = (e) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/search?q=${encodeURIComponent(globalSearch)}`);
      setGlobalSearch("");
      setLiveResults([]); // Tutup dropdown live search
    }
  };

  const userEmail = user?.email || "User";
  const username = userEmail.split("@")[0];
  const avatarUrl = `https://ui-avatars.com/api/?name=${username}&background=880000&color=fff&size=128&bold=true`;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#0a0202]/80 backdrop-blur-md shadow-lg border-b border-red-900/30 py-3 sm:py-4"
          : "bg-transparent py-5 sm:py-6"
      }`}
    >
      <div className="container mx-auto px-3 sm:px-4 flex justify-between items-center relative">
        {/* LOGO KIRI */}
        <Link
          to="/"
          className="text-xl sm:text-2xl font-black tracking-tighter text-white group flex items-center gap-2 sm:gap-3 flex-shrink-0"
        >
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-red-600 to-red-900 rounded-lg sm:rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.5)] group-hover:shadow-[0_0_25px_rgba(220,38,38,0.8)] transition-all">
            <span className="text-white font-bold text-sm sm:text-lg">RX</span>
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 group-hover:to-white transition-colors hidden lg:block">
            RAIHAN<span className="text-red-500">EX</span>
            <span className="text-red-600">.</span>
          </span>
        </Link>

        {/* DOCK NAVIGASI TENGAH (BERJEJER) */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-4 bg-[#1a0505]/60 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-red-900/40 backdrop-blur-md shadow-[0_5px_15px_rgba(0,0,0,0.5)]"
          ref={searchContainerRef}
        >
          <Link
            to="/"
            className="text-gray-400 hover:text-red-400 hover:drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] transition-all px-1 sm:px-2"
            title="Beranda"
          >
            <FaHome className="text-lg sm:text-xl" />
          </Link>

          <div className="h-4 w-px bg-red-900/50"></div>

          {/* Ikon Kalender Schedule */}
          <Link
            to="/schedule"
            className="text-gray-400 hover:text-red-400 hover:drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] transition-all px-1 sm:px-2"
            title="Jadwal Rilis"
          >
            <FaCalendarAlt className="text-lg sm:text-xl" />
          </Link>

          <div className="h-4 w-px bg-red-900/50"></div>

          <Link
            to="/search"
            className="text-gray-400 hover:text-red-400 hover:drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] transition-all px-1 sm:px-2"
            title="Eksplor Katalog"
          >
            <FaCompass className="text-lg sm:text-xl" />
          </Link>

          <div className="h-4 w-px bg-red-900/50"></div>

          {/* Kolom Pencarian + Live Results */}
          <form
            onSubmit={handleGlobalSearchSubmit}
            className="relative group px-1 flex items-center"
          >
            <input
              type="text"
              placeholder="Cari..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="bg-transparent text-white text-sm outline-none w-16 focus:w-28 sm:w-28 sm:focus:w-56 transition-all duration-300 placeholder-gray-500 pl-1 pr-6"
            />
            <button
              type="submit"
              className="absolute right-0 text-gray-400 hover:text-red-400 transition-colors"
            >
              {isLiveSearching ? (
                <FaSpinner className="animate-spin text-red-500" size={14} />
              ) : (
                <FaSearch size={14} />
              )}
            </button>

            {/* DROPDOWN HASIL PENCARIAN INSTAN */}
            {liveResults.length > 0 && (
              <div className="absolute top-[180%] left-1/2 -translate-x-1/2 w-64 sm:w-80 bg-[#1a0505]/95 backdrop-blur-2xl border border-red-900/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden z-50 flex flex-col">
                {liveResults.map((anime) => (
                  <Link
                    to={`/anime/${anime.id}`}
                    key={anime.id}
                    onClick={() => {
                      setLiveResults([]);
                      setGlobalSearch("");
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-red-900/40 transition-colors border-b border-red-900/30 last:border-0"
                  >
                    <img
                      src={anime.coverImage.medium}
                      alt="cover"
                      className="w-10 h-14 object-cover rounded-md shadow-md"
                    />
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="text-white font-bold text-sm truncate">
                        {anime.title.romaji}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {anime.seasonYear || "TBA"}
                      </span>
                    </div>
                  </Link>
                ))}
                <button
                  type="submit"
                  className="bg-black/40 text-red-400 text-xs font-bold py-2.5 hover:bg-red-900/50 transition-colors text-center w-full"
                >
                  Lihat Semua Hasil
                </button>
              </div>
            )}
          </form>
        </div>

        {/* PROFIL KANAN & WATCHLIST */}
        <div className="flex-shrink-0">
          {user ? (
            <div
              className="flex items-center gap-3 sm:gap-4 relative"
              ref={profileRef}
            >
              <Link
                to="/watchlist"
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm font-medium group"
              >
                <FaBookmark
                  className="text-lg sm:text-base text-gray-400 group-hover:text-red-400 transition-colors drop-shadow-md"
                  title="Watchlist"
                />
                <span className="hidden md:block">Watchlist</span>
              </Link>

              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 bg-black/40 hover:bg-red-900/50 p-1 sm:px-3 sm:py-1.5 rounded-full border border-red-900/40 hover:border-red-500 transition-all focus:outline-none"
              >
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-7 h-7 sm:w-7 sm:h-7 rounded-full border border-red-500/50"
                />
                <span className="text-sm font-bold text-white hidden md:block">
                  {username}
                </span>
                <FaChevronDown
                  size={10}
                  className={`text-gray-400 transition-transform hidden sm:block ${isProfileOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* POP-UP PROFIL MENGAMBANG */}
              <div
                className={`absolute top-[140%] right-0 w-64 sm:w-72 bg-[#1a0505]/95 backdrop-blur-xl border border-red-900/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-all duration-300 origin-top-right overflow-hidden ${isProfileOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}
              >
                <div className="p-4 border-b border-red-900/40 flex items-center gap-3 sm:gap-4 bg-black/20">
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-12 h-12 rounded-full border-2 border-red-500/80"
                  />
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-white text-base truncate">
                      {username}
                    </h3>
                    <p className="text-xs text-gray-400 truncate">
                      <FaEnvelope className="inline mr-1 text-red-400/70" />
                      {userEmail}
                    </p>
                  </div>
                </div>

                <div className="p-3">
                  <Link
                    to="/watchlist"
                    onClick={() => setIsProfileOpen(false)}
                    className="bg-black/40 hover:bg-red-900/40 border border-red-900/30 rounded-xl p-3 mb-3 flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-red-900/40 group-hover:bg-red-500/80 p-2 rounded-lg text-red-400 group-hover:text-white transition-colors">
                        <FaBookmark size={16} />
                      </div>
                      <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                        Watchlist Saya
                      </span>
                    </div>
                    <span className="text-lg font-bold text-white bg-red-600/20 px-3 py-0.5 rounded-lg border border-red-500/30 group-hover:bg-red-500/80">
                      {watchlistCount}
                    </span>
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-red-900/30 rounded-xl transition-colors mt-1"
                  >
                    <FaUser className="text-gray-400" /> Dasbor Profil
                  </Link>
                  <button
                    onClick={handleLogoutClick}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:text-white hover:bg-red-900/40 rounded-xl transition-colors mt-1"
                  >
                    <FaSignOutAlt /> Keluar Akun
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link
              to="/auth"
              className="bg-gradient-to-r from-red-700 to-red-600 hover:to-red-500 text-white px-4 py-2 sm:px-6 sm:py-2.5 rounded-full font-bold shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all text-sm sm:text-base"
            >
              Masuk
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
