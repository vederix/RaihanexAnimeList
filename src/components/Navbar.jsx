import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  FaBars,
  FaSun,
  FaTimes,
} from "react-icons/fa";
import { fetchAniList } from "../utils/anilist";

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
  const location = useLocation();

  // States
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [watchlistCount, setWatchlistCount] = useState(0);

  // Live Search States
  const [globalSearch, setGlobalSearch] = useState("");
  const [liveResults, setLiveResults] = useState([]);
  const [isLiveSearching, setIsLiveSearching] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const searchContainerRef = useRef(null);
  const profileRef = useRef(null);

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

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target))
        setIsProfileOpen(false);
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setLiveResults([]);
        setIsSearchExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (globalSearch.trim().length < 3) {
      setLiveResults([]);
      setIsLiveSearching(false);
      return;
    }
    setIsLiveSearching(true);
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
      toast.success("Berhasil keluar akun!", {
        style: { borderRadius: "10px", background: "#333", color: "#fff" },
      });
      navigate("/");
    } catch (error) {
      toast.error("Gagal logout.");
    }
  };

  const handleLogoutClick = () => {
    setIsProfileOpen(false);
    toast(
      (t) => (
        <div className="flex flex-col gap-3 p-2 w-full min-w-[250px]">
          <span className="font-bold text-gray-800 text-center text-lg">
            Keluar Akun?
          </span>
          <span className="text-sm text-gray-500 text-center mb-2">
            Sesi kamu akan diakhiri.
          </span>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                executeLogout();
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold w-full shadow-lg shadow-red-500/30 transition-all"
            >
              Keluar
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold w-full transition-all"
            >
              Batal
            </button>
          </div>
        </div>
      ),
      { duration: 5000 },
    );
  };

  const handleGlobalSearchSubmit = (e) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/search?q=${encodeURIComponent(globalSearch)}`);
      setGlobalSearch("");
      setLiveResults([]);
      setIsSearchExpanded(false);
    }
  };

  const userEmail = user?.email || "User";
  const username = userEmail.split("@")[0];
  const avatarUrl = `https://ui-avatars.com/api/?name=${username}&background=dc2626&color=fff&size=128&bold=true`;

  const NavLinks = [
    { to: "/", icon: <FaHome size={18} />, label: "Beranda" },
    { to: "/schedule", icon: <FaCalendarAlt size={18} />, label: "Jadwal" },
    { to: "/seasonal", icon: <FaSun size={18} />, label: "Musiman" },
    { to: "/search", icon: <FaCompass size={18} />, label: "Eksplor" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-[#050101]/80 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] border-b border-red-900/30 py-3"
          : "bg-gradient-to-b from-black/90 via-black/50 to-transparent py-5 lg:py-6"
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8 flex justify-between items-center relative">
        {/* LOGO KIRI */}
        <Link
          to="/"
          className="text-2xl font-black tracking-tighter text-white group flex items-center gap-3 flex-shrink-0 z-50"
        >
          <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-br from-red-600 to-red-900 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] group-hover:shadow-[0_0_30px_rgba(220,38,38,0.8)] transition-all duration-500 group-hover:scale-105">
            <span className="text-white font-bold text-lg">RX</span>
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 group-hover:to-white transition-colors hidden sm:block text-xl">
            RAIHAN<span className="text-red-500">EX</span>
            <span className="text-red-600">.</span>
          </span>
        </Link>

        {/* DOCK NAVIGASI TENGAH (DESKTOP ONLY) */}
        <div
          className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-2 bg-[#1a0505]/40 backdrop-blur-xl px-2 py-1.5 rounded-full border border-red-500/20 shadow-[0_8px_32px_rgba(220,38,38,0.1)] hover:border-red-500/40 transition-all duration-500"
          ref={searchContainerRef}
        >
          {NavLinks.map((link, idx) => (
            <div key={idx} className="relative group px-3 py-2">
              <Link
                to={link.to}
                className={`text-gray-400 hover:text-red-400 transition-all duration-300 flex items-center justify-center ${location.pathname === link.to ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" : ""}`}
              >
                {link.icon}
              </Link>
              {/* Tooltip */}
              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-red-900/50 shadow-xl">
                {link.label}
              </span>
            </div>
          ))}

          <div className="h-6 w-px bg-red-900/50 mx-1"></div>

          {/* Kolom Pencarian Expandable */}
          <form
            onSubmit={handleGlobalSearchSubmit}
            className="relative flex items-center px-2"
          >
            <div
              className={`flex items-center bg-black/40 rounded-full border transition-all duration-500 overflow-hidden ${isSearchExpanded || globalSearch ? "border-red-500/50 w-64 px-4" : "border-transparent w-10 px-0 hover:bg-white/5 cursor-pointer"}`}
              onClick={() => setIsSearchExpanded(true)}
            >
              <button
                type="submit"
                className={`text-gray-400 hover:text-red-400 transition-colors flex-shrink-0 ${!isSearchExpanded && !globalSearch ? "m-auto p-2" : ""}`}
              >
                {isLiveSearching ? (
                  <FaSpinner className="animate-spin text-red-500" size={16} />
                ) : (
                  <FaSearch size={16} />
                )}
              </button>
              <input
                type="text"
                placeholder="Cari anime..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className={`bg-transparent text-white text-sm outline-none transition-all duration-500 placeholder-gray-500 h-10 ${isSearchExpanded || globalSearch ? "w-full ml-3 opacity-100" : "w-0 opacity-0"}`}
                onBlur={() => !globalSearch && setIsSearchExpanded(false)}
              />
            </div>

            {/* DROPDOWN HASIL PENCARIAN INSTAN */}
            {liveResults.length > 0 && (
              <div className="absolute top-[130%] left-1/2 -translate-x-1/2 w-[350px] bg-[#1a0505]/95 backdrop-blur-3xl border border-red-900/50 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.9)] overflow-hidden z-50 flex flex-col animate-fade-in origin-top">
                {liveResults.map((anime) => (
                  <Link
                    to={`/anime/${anime.id}`}
                    key={anime.id}
                    onClick={() => {
                      setLiveResults([]);
                      setGlobalSearch("");
                      setIsSearchExpanded(false);
                    }}
                    className="flex items-center gap-4 p-3 hover:bg-red-900/30 transition-colors border-b border-red-900/20 last:border-0 group"
                  >
                    <img
                      src={anime.coverImage.medium}
                      alt="cover"
                      className="w-12 h-16 object-cover rounded-lg shadow-md group-hover:scale-105 transition-transform"
                    />
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="text-white font-bold text-sm truncate group-hover:text-red-400 transition-colors">
                        {anime.title.romaji}
                      </span>
                      <span className="text-gray-400 text-xs mt-1 bg-black/40 w-max px-2 py-0.5 rounded-md border border-red-900/30">
                        {anime.seasonYear || "TBA"}
                      </span>
                    </div>
                  </Link>
                ))}
                <button
                  type="submit"
                  className="bg-gradient-to-r from-red-900/40 to-black/40 text-red-400 text-xs font-bold py-3 hover:from-red-800/50 transition-all text-center w-full"
                >
                  Lihat Semua Hasil
                </button>
              </div>
            )}
          </form>
        </div>

        {/* PROFIL KANAN & HAMBURGER (MOBILE) */}
        <div className="flex items-center gap-4 z-50">
          {user ? (
            <div className="flex items-center gap-4 relative" ref={profileRef}>
              <Link
                to="/watchlist"
                className="hidden lg:flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm font-medium group"
              >
                <FaBookmark className="text-gray-400 group-hover:text-red-400 transition-colors drop-shadow-md" />
                <span>Watchlist</span>
              </Link>

              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 bg-[#1a0505]/60 hover:bg-red-900/40 p-1 lg:pl-1 lg:pr-3 lg:py-1 rounded-full border border-red-900/30 hover:border-red-500/50 transition-all duration-300 shadow-lg"
              >
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full border border-red-500/50"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0a0202] rounded-full"></div>
                </div>
                <span className="text-sm font-bold text-white hidden lg:block">
                  {username}
                </span>
                <FaChevronDown
                  size={10}
                  className={`text-gray-400 transition-transform duration-300 hidden lg:block ${isProfileOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* POP-UP PROFIL MENGAMBANG */}
              <div
                className={`absolute top-[130%] right-0 w-72 bg-[#1a0505]/95 backdrop-blur-3xl border border-red-900/50 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.9)] transition-all duration-300 origin-top-right overflow-hidden ${isProfileOpen ? "opacity-100 scale-100 visible translate-y-0" : "opacity-0 scale-95 invisible -translate-y-4"}`}
              >
                <div className="p-5 border-b border-red-900/30 flex items-center gap-4 bg-gradient-to-br from-red-900/20 to-black/40">
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-14 h-14 rounded-full border-2 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                  />
                  <div className="overflow-hidden">
                    <h3 className="font-extrabold text-white text-base truncate">
                      {username}
                    </h3>
                    <p className="text-xs text-gray-400 truncate mt-1">
                      <FaEnvelope className="inline mr-1 text-red-500" />
                      {userEmail}
                    </p>
                  </div>
                </div>
                <div className="p-3">
                  <Link
                    to="/watchlist"
                    onClick={() => setIsProfileOpen(false)}
                    className="bg-black/40 hover:bg-red-900/30 border border-red-900/20 rounded-xl p-3 mb-2 flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-red-900/40 group-hover:bg-red-500 text-red-400 group-hover:text-white p-2 rounded-lg transition-colors">
                        <FaBookmark size={14} />
                      </div>
                      <span className="text-sm font-bold text-gray-300 group-hover:text-white">
                        Watchlist Saya
                      </span>
                    </div>
                    <span className="text-sm font-black text-white bg-red-600 px-2.5 py-1 rounded-lg shadow-md">
                      {watchlistCount}
                    </span>
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-300 hover:text-white hover:bg-red-900/30 rounded-xl transition-colors"
                  >
                    <FaUser className="text-gray-400" /> Dasbor Profil
                  </Link>
                  <button
                    onClick={handleLogoutClick}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-400 hover:text-white hover:bg-red-600 rounded-xl transition-all mt-1"
                  >
                    <FaSignOutAlt /> Keluar Akun
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link
              to="/auth"
              className="hidden lg:flex bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white px-8 py-2.5 rounded-full font-bold shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all"
            >
              Masuk
            </Link>
          )}

          {/* HAMBURGER BUTTON (MOBILE) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-gray-300 hover:text-white bg-[#1a0505]/80 p-2.5 rounded-xl border border-red-900/40 focus:outline-none transition-colors"
          >
            {isMobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      <div
        className={`lg:hidden absolute top-full left-0 w-full bg-[#0a0202]/95 backdrop-blur-3xl border-b border-red-900/50 overflow-hidden transition-all duration-500 ease-in-out ${isMobileMenuOpen ? "max-h-[500px] opacity-100 border-opacity-100" : "max-h-0 opacity-0 border-opacity-0"}`}
      >
        <div className="px-4 py-6 flex flex-col gap-2">
          {/* Mobile Search */}
          <form onSubmit={handleGlobalSearchSubmit} className="relative mb-4">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Cari anime..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full bg-black/60 border border-red-900/50 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-red-500"
            />
          </form>

          {NavLinks.map((link, idx) => (
            <Link
              key={idx}
              to={link.to}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-colors ${location.pathname === link.to ? "bg-red-900/40 text-red-400" : "text-gray-300 hover:bg-black/50 hover:text-white"}`}
            >
              <div
                className={
                  location.pathname === link.to
                    ? "text-red-500"
                    : "text-gray-500"
                }
              >
                {link.icon}
              </div>
              {link.label}
            </Link>
          ))}

          {!user && (
            <Link
              to="/auth"
              onClick={() => setIsMobileMenuOpen(false)}
              className="mt-4 bg-gradient-to-r from-red-700 to-red-600 text-white text-center px-4 py-3 rounded-xl font-bold shadow-lg shadow-red-900/50"
            >
              Masuk / Daftar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
