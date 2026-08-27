import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
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
  FaSun,
  FaTimes,
  FaFire,
  FaList,
  FaGlobe,
  FaDice,
} from "react-icons/fa";
import { fetchAniList } from "../utils/anilist";
import { showConfirmToast } from "../utils/confirmToast.jsx";
import AnimeRandomizerModal from "./AnimeRandomizerModal";

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
  const { user, logout, displayName, avatarUrl } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // States
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isRandomizerOpen, setIsRandomizerOpen] = useState(false);
  const [watchlistCount, setWatchlistCount] = useState(0);

  // Live Search States
  const [globalSearch, setGlobalSearch] = useState("");
  const [liveResults, setLiveResults] = useState([]);
  const [isLiveSearching, setIsLiveSearching] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const searchContainerRef = useRef(null);
  const profileRef = useRef(null);

  // Fetch watchlist count
  useEffect(() => {
    let isMounted = true;
    const fetchWatchlistCount = async () => {
      if (user) {
        const { count, error } = await supabase
          .from("watchlist")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);
        if (!error && isMounted) setWatchlistCount(count || 0);
      } else {
        if (isMounted) setWatchlistCount(0);
      }
    };
    fetchWatchlistCount();
    return () => {
      isMounted = false;
    };
  }, [user, isProfileOpen]);

  // Navbar scroll background effect
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
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

  const searchInputRef = useRef(null);

  // Keyboard Shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchExpanded(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced Live Search
  useEffect(() => {
    const trimmed = globalSearch.trim();
    if (trimmed.length < 3) {
      return;
    }

    let isCancelled = false;
    const delayDebounceFn = setTimeout(async () => {
      setIsLiveSearching(true);
      try {
        const { data, error } = await fetchAniList(LIVE_SEARCH_QUERY, {
          search: trimmed,
        });
        if (error) throw new Error(error);
        if (!isCancelled) {
          setLiveResults(data?.Page?.media || []);
        }
      } catch (err) {
        console.error("Live search error:", err);
      } finally {
        if (!isCancelled) {
          setIsLiveSearching(false);
        }
      }
    }, 500);

    return () => {
      isCancelled = true;
      clearTimeout(delayDebounceFn);
    };
  }, [globalSearch]);

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setGlobalSearch(value);
    if (value.trim().length < 3) {
      setLiveResults([]);
      setIsLiveSearching(false);
    }
  };

  const executeLogout = async () => {
    try {
      await logout();
      toast.success("Berhasil keluar akun!", {
        style: { borderRadius: "10px", background: "#333", color: "#fff" },
      });
      navigate("/");
    } catch {
      toast.error("Gagal logout.");
    }
  };

  const handleLogoutClick = () => {
    setIsProfileOpen(false);
    showConfirmToast({
      title: "Keluar Akun?",
      message: "Sesi kamu akan diakhiri.",
      confirmText: "Keluar",
      onConfirm: executeLogout,
    });
  };

  const handleGlobalSearchSubmit = (e) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/search?q=${encodeURIComponent(globalSearch.trim())}`);
      setGlobalSearch("");
      setLiveResults([]);
      setIsSearchExpanded(false);
      setIsSearchExpanded(false);
    }
  };

  const handleLinkClick = () => {
    setIsProfileOpen(false);
  };

  const userEmail = user?.email || "User";

  const NavLinks = [
    { to: "/", icon: <FaHome size={18} />, label: "Beranda" },
    { to: "/schedule", icon: <FaCalendarAlt size={18} />, label: "Jadwal" },
    { to: "/seasonal", icon: <FaSun size={18} />, label: "Musiman" },
    { to: "/search", icon: <FaCompass size={18} />, label: "Eksplor" },
    { to: "/compare", icon: <FaFire size={18} />, label: "Komparasi" },
    { to: "/collections", icon: <FaList size={18} />, label: "Koleksi" },
    { to: "/community", icon: <FaGlobe size={18} />, label: "Komunitas" },
  ];

  const BottomNavLinks = [
    { to: "/", icon: <FaHome size={20} />, label: "Beranda" },
    { to: "/schedule", icon: <FaCalendarAlt size={20} />, label: "Jadwal" },
    { to: "/search", icon: <FaCompass size={20} />, label: "Eksplor" },
    { to: "/watchlist", icon: <FaBookmark size={20} />, label: "Watchlist" },
  ];

  const MobileExtraLinks = [
    { to: "/seasonal", icon: <FaSun />, label: "Anime Musiman" },
    { to: "/compare", icon: <FaFire />, label: "Komparasi" },
    { to: "/collections", icon: <FaList />, label: "Koleksi" },
    { to: "/community", icon: <FaGlobe />, label: "Komunitas Feed" },
  ];

  return (
    <>
      {/* TOP NAVBAR (Desktop & Mobile) */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-[#050101]/80 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] border-b border-red-900/30 py-3"
            : "bg-gradient-to-b from-black/90 via-black/50 to-transparent py-4 lg:py-5"
        }`}
      >
        <div className="container mx-auto px-4 lg:px-8 flex justify-between items-center relative gap-4">
          
          {/* LOGO (KIRI) */}
          <Link
            to="/"
            onClick={handleLinkClick}
            className="text-2xl font-black tracking-tighter text-white group flex items-center gap-3 flex-shrink-0 z-50"
          >
            <div className="relative flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-red-600 to-red-900 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] group-hover:shadow-[0_0_30px_rgba(220,38,38,0.8)] transition-all duration-500 group-hover:scale-105">
              <span className="text-white font-bold text-base lg:text-lg">RX</span>
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 group-hover:to-white transition-colors text-lg lg:text-xl">
              RAIHAN<span className="text-red-500">EX</span>
              <span className="text-red-600 hidden lg:inline">.</span>
            </span>
          </Link>

          {/* TENGAH: DOCK MENU (DESKTOP ONLY) */}
          <div className="hidden lg:flex flex-1 justify-center">
            <div className="flex items-center gap-2 bg-[#1a0505]/60 backdrop-blur-xl px-4 py-2 rounded-full border border-red-500/20 shadow-[0_8px_32px_rgba(220,38,38,0.15)] hover:border-red-500/40 transition-all duration-500">
              {NavLinks.map((link, idx) => {
                const isActive = location.pathname === link.to;
                return (
                  <div key={idx} className="relative group px-2">
                    <Link
                      to={link.to}
                      onClick={handleLinkClick}
                      className={`text-gray-400 hover:text-red-400 transition-all duration-300 flex items-center justify-center p-2 rounded-full hover:bg-white/5 ${isActive ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] scale-110 bg-white/5" : ""}`}
                    >
                      {link.icon}
                    </Link>
                    {/* Tooltip */}
                    <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-red-900/50 shadow-xl z-50">
                      {link.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* KANAN: PENCARIAN & PROFIL */}
          <div className="flex items-center gap-3 lg:gap-5 flex-shrink-0 relative z-50" ref={searchContainerRef}>
            
            {/* GACHA ROULETTE (Mobile + Desktop) */}
            <button
              onClick={() => setIsRandomizerOpen(true)}
              className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-gradient-to-tr from-amber-600/20 to-red-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center cursor-pointer shadow-sm active:scale-95 transition-all hover:border-amber-500/60 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]"
              title="Gacha Roulette"
            >
              <FaDice size={16} />
            </button>
            
            {/* PENCARIAN MOBILE (TOGGLE) */}
            <button
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              className="lg:hidden w-9 h-9 rounded-full bg-[#1a0505]/60 text-gray-300 border border-red-900/40 flex items-center justify-center cursor-pointer shadow-sm active:scale-95 transition-all"
            >
              {isSearchExpanded ? <FaTimes size={16} className="text-red-400" /> : <FaSearch size={16} />}
            </button>

            {/* PENCARIAN DESKTOP (EXPANDABLE/FIXED) */}
            <form
              onSubmit={handleGlobalSearchSubmit}
              className="hidden lg:flex relative items-center"
            >
              <div
                className={`flex items-center bg-black/40 rounded-full border transition-all duration-500 overflow-hidden ${isSearchExpanded || globalSearch ? "border-red-500/50 w-64 px-4 shadow-[0_0_15px_rgba(220,38,38,0.2)]" : "border-red-900/40 w-10 px-0 hover:border-red-500/40 cursor-pointer"}`}
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
                  ref={searchInputRef}
                  type="text"
                  placeholder="Cari anime... (Ctrl+K)"
                  value={globalSearch}
                  onChange={handleSearchInputChange}
                  className={`bg-transparent text-white text-sm outline-none transition-all duration-500 placeholder-gray-500 h-10 ${isSearchExpanded || globalSearch ? "w-full ml-3 opacity-100" : "w-0 opacity-0"}`}
                  onBlur={() => !globalSearch && setIsSearchExpanded(false)}
                />
              </div>

              {/* DROPDOWN HASIL PENCARIAN (Desktop) */}
              {liveResults.length > 0 && (
                <div className="absolute top-[130%] right-0 w-[350px] bg-[#1a0505]/95 backdrop-blur-3xl border border-red-900/50 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.9)] overflow-hidden z-50 flex flex-col animate-fade-in origin-top-right">
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
                        className="w-10 h-14 object-cover rounded-lg shadow-md group-hover:scale-105 transition-transform"
                      />
                      <div className="flex flex-col flex-1 overflow-hidden">
                        <span className="text-white font-bold text-sm truncate group-hover:text-red-400 transition-colors">
                          {anime.title.romaji}
                        </span>
                        <span className="text-gray-400 text-[10px] mt-0.5 bg-black/40 w-max px-2 py-0.5 rounded-md border border-red-900/30">
                          {anime.seasonYear || "TBA"}
                        </span>
                      </div>
                    </Link>
                  ))}
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-red-900/40 to-black/40 text-red-400 text-xs font-bold py-3 hover:from-red-800/50 transition-all text-center w-full cursor-pointer"
                  >
                    Lihat Semua Hasil
                  </button>
                </div>
              )}
            </form>

            {/* HASIL PENCARIAN (Mobile) */}
            {isSearchExpanded && (
              <div className="lg:hidden absolute top-14 right-0 w-[85vw] sm:w-[300px] bg-[#0a0202]/95 backdrop-blur-2xl border border-red-900/50 rounded-2xl shadow-2xl p-3 animate-fade-in origin-top-right">
                <form onSubmit={handleGlobalSearchSubmit} className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Cari anime..."
                    value={globalSearch}
                    onChange={handleSearchInputChange}
                    className="w-full bg-black/60 border border-red-900/50 text-white rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-red-500"
                    autoFocus
                  />
                </form>
                {/* Mobile Live Results */}
                {liveResults.length > 0 && (
                  <div className="mt-2 flex flex-col gap-2 max-h-[60vh] overflow-y-auto hide-scrollbar">
                    {liveResults.map((anime) => (
                      <Link
                        to={`/anime/${anime.id}`}
                        key={anime.id}
                        onClick={() => {
                          setLiveResults([]);
                          setGlobalSearch("");
                          setIsSearchExpanded(false);
                        }}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-red-900/30 transition-colors border border-transparent hover:border-red-900/20"
                      >
                        <img src={anime.coverImage.medium} alt="cover" className="w-10 h-14 object-cover rounded-md" />
                        <div className="flex flex-col flex-1 overflow-hidden">
                          <span className="text-white font-bold text-xs truncate">{anime.title.romaji}</span>
                          <span className="text-gray-500 text-[10px] mt-0.5">{anime.seasonYear || "TBA"}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PEMBATAS DESKTOP */}
            <div className="hidden lg:block h-8 w-px bg-red-900/50 mx-1"></div>

            {/* PROFIL / AUTH KANAN (DESKTOP ONLY) */}
            <div className="hidden lg:flex items-center z-50">
              {user ? (
                <div className="flex items-center gap-4 relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 bg-[#1a0505]/60 hover:bg-red-900/40 p-1 pl-1 pr-3 py-1 rounded-full border border-red-900/30 hover:border-red-500/50 transition-all duration-300 shadow-lg cursor-pointer group"
                  >
                    <div className="relative">
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full border border-red-500/50 group-hover:border-red-400 transition-colors"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0a0202] rounded-full"></div>
                    </div>
                    <span className="text-sm font-bold text-white hidden xl:block max-w-[100px] truncate">
                      {displayName}
                    </span>
                    <FaChevronDown
                      size={10}
                      className={`text-gray-400 transition-transform duration-300 ${isProfileOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* POP-UP PROFIL MENGAMBANG (DESKTOP) */}
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
                          {displayName}
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
                        onClick={handleLinkClick}
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
                        onClick={handleLinkClick}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-300 hover:text-white hover:bg-red-900/30 rounded-xl transition-colors"
                      >
                        <FaUser className="text-gray-400" /> Dasbor Profil
                      </Link>
                      <button
                        onClick={handleLogoutClick}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-400 hover:text-white hover:bg-red-600 rounded-xl transition-all mt-1 cursor-pointer"
                      >
                        <FaSignOutAlt /> Keluar Akun
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  to="/auth"
                  onClick={handleLinkClick}
                  className="btn-primary px-6 py-2 text-sm rounded-full"
                >
                  Masuk
                </Link>
              )}
            </div>

          </div>
        </div>
      </nav>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0202]/90 backdrop-blur-2xl border-t border-red-900/40 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16 px-2 relative">
          {BottomNavLinks.map((link, idx) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={idx}
                to={link.to}
                onClick={handleLinkClick}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative ${isActive ? "text-red-500 scale-105" : "text-gray-500 hover:text-gray-300"}`}
              >
                {isActive && (
                  <div className="absolute -top-3 w-8 h-1 bg-gradient-to-r from-red-600 to-red-400 rounded-b-full shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-fade-in"></div>
                )}
                <div className={`${isActive ? "drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" : ""}`}>
                  {link.icon}
                </div>
                <span className={`text-[10px] font-bold ${isActive ? "text-white" : ""}`}>{link.label}</span>
              </Link>
            );
          })}
          
          {/* PROFILE / MENU BUTTON FOR MOBILE */}
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative ${isProfileOpen ? "text-red-500 scale-105" : "text-gray-500"}`}
          >
            {isProfileOpen && (
              <div className="absolute -top-3 w-8 h-1 bg-gradient-to-r from-red-600 to-red-400 rounded-b-full shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-fade-in"></div>
            )}
            {user ? (
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className={`w-5 h-5 rounded-full border transition-all ${isProfileOpen ? "border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "border-gray-500"}`}
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border border-[#0a0202] rounded-full"></div>
              </div>
            ) : (
              <FaUser size={20} className={isProfileOpen ? "drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" : ""} />
            )}
            <span className={`text-[10px] font-bold ${isProfileOpen ? "text-white" : ""}`}>{user ? "Profil" : "Masuk"}</span>
          </button>
        </div>

        {/* MOBILE BOTTOM SHEET FOR PROFILE & EXTRA LINKS */}
        <div
          className={`absolute bottom-[100%] left-0 w-full bg-[#0a0202]/95 backdrop-blur-3xl border-t border-red-900/50 rounded-t-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.9)] overflow-hidden transition-all duration-300 ease-in-out origin-bottom ${isProfileOpen ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0"}`}
        >
          <div className="p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto hide-scrollbar">
            {/* User Info or Auth CTA */}
            {user ? (
              <div className="bg-gradient-to-br from-red-900/20 to-black/40 border border-red-900/30 rounded-2xl p-4 flex items-center gap-4">
                <img src={avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]" />
                <div className="overflow-hidden">
                  <h3 className="font-extrabold text-white text-base truncate">{displayName}</h3>
                  <p className="text-xs text-gray-400 truncate"><FaEnvelope className="inline mr-1 text-red-500" />{userEmail}</p>
                </div>
              </div>
            ) : (
              <div className="bg-red-900/20 border border-red-900/30 rounded-2xl p-4 text-center">
                <p className="text-sm text-gray-300 mb-3">Masuk untuk menyimpan watchlist dan progres menonton anime.</p>
                <Link to="/auth" onClick={() => setIsProfileOpen(false)} className="btn-primary py-2 px-6 rounded-xl text-sm w-full block">
                  Masuk / Daftar
                </Link>
              </div>
            )}

            {/* Profile Action Links */}
            {user && (
              <div className="flex flex-col gap-2">
                <Link to="/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 bg-black/40 hover:bg-white/5 p-3 rounded-xl border border-white/5 transition-colors">
                  <div className="bg-red-900/40 text-red-400 p-2 rounded-lg"><FaUser size={14} /></div>
                  <span className="text-sm font-bold text-gray-200">Dasbor Profil</span>
                </Link>
                <Link to="/watchlist" onClick={() => setIsProfileOpen(false)} className="flex items-center justify-between bg-black/40 hover:bg-white/5 p-3 rounded-xl border border-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-900/40 text-red-400 p-2 rounded-lg"><FaBookmark size={14} /></div>
                    <span className="text-sm font-bold text-gray-200">Watchlist Saya</span>
                  </div>
                  <span className="text-xs font-black text-white bg-red-600 px-2.5 py-1 rounded-lg">{watchlistCount}</span>
                </Link>
              </div>
            )}

            <div className="h-px bg-white/10 my-1 w-full"></div>

            {/* Extra Menu Links */}
            <div className="grid grid-cols-2 gap-3">
              {MobileExtraLinks.map((link, idx) => (
                <Link key={idx} to={link.to} onClick={() => setIsProfileOpen(false)} className="bg-black/40 hover:bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-colors">
                  <div className="text-gray-400 text-lg">{link.icon}</div>
                  <span className="text-[10px] font-bold text-gray-300 text-center">{link.label}</span>
                </Link>
              ))}
            </div>

            {/* Logout Button */}
            {user && (
              <button onClick={handleLogoutClick} className="w-full flex items-center justify-center gap-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 p-3 rounded-xl mt-2 transition-colors font-bold text-sm">
                <FaSignOutAlt /> Keluar Akun
              </button>
            )}
            
            {/* Safe Area spacing */}
            <div className="h-4"></div>
          </div>
        </div>
      </div>

      {/* MODAL GACHA ANIME ROULETTE */}
      <AnimeRandomizerModal
        isOpen={isRandomizerOpen}
        onClose={() => setIsRandomizerOpen(false)}
      />
    </>
  );
};

export default Navbar;
