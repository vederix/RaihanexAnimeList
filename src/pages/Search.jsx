import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import AnimeCard from "../components/AnimeCard";
import SkeletonCard from "../components/SkeletonCard";
import toast from "react-hot-toast";
import {
  FaSearch,
  FaFilter,
  FaTimes,
  FaCalendarAlt,
  FaSun,
  FaSortAmountDown,
  FaBroadcastTower,
  FaFire,
} from "react-icons/fa";
import { fetchAniList } from "../utils/anilist";
import { useGenres } from "../utils/genreService";
import ApiErrorState from "../components/ApiErrorState";

// 1. QUERY GRAPHQL UTAMA
const SEARCH_QUERY = `
  query ($search: String, $page: Int, $genre: String, $format: MediaFormat, $season: MediaSeason, $seasonYear: Int, $status: MediaStatus, $sort: [MediaSort]) {
    Page(page: $page, perPage: 20) {
      pageInfo { hasNextPage }
      media(search: $search, type: ANIME, genre: $genre, format: $format, season: $season, seasonYear: $seasonYear, status: $status, sort: $sort) {
        id
        title { romaji english }
        coverImage { large }
        averageScore
        format
        episodes
        status
        seasonYear
        genres
      }
    }
  }
`;

const TRENDING_QUERY = `
  query {
    Page(page: 1, perPage: 10) {
      media(type: ANIME, sort: TRENDING_DESC) {
        id
        title { romaji english }
        coverImage { large }
        averageScore
        format
        episodes
        status
        seasonYear
        genres
      }
    }
  }
`;

// 2. DATA FILTER
const FORMAT_LIST = [
  { label: "TV Series", value: "TV" },
  { label: "Movie", value: "MOVIE" },
  { label: "OVA", value: "OVA" },
  { label: "ONA", value: "ONA" },
  { label: "Special", value: "SPECIAL" },
];

const SEASON_LIST = [
  { label: "Semua Musim", value: "" },
  { label: "Winter", value: "WINTER" },
  { label: "Spring", value: "SPRING" },
  { label: "Summer", value: "SUMMER" },
  { label: "Fall", value: "FALL" },
];

const STATUS_LIST = [
  { label: "Semua Status", value: "" },
  { label: "Sedang Tayang", value: "RELEASING" },
  { label: "Selesai Tayang", value: "FINISHED" },
  { label: "Belum Tayang", value: "NOT_YET_RELEASED" },
];

const SORT_LIST = [
  { label: "Terpopuler", value: "POPULARITY_DESC" },
  { label: "Skor Tertinggi", value: "SCORE_DESC" },
  { label: "Trending", value: "TRENDING_DESC" },
  { label: "Rilis Terbaru", value: "START_DATE_DESC" },
];

// Custom Hook untuk Debounce
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef(null);
  
  // Baca Parameter dari URL
  const qParam = searchParams.get("q") || "";
  const genreParam = searchParams.get("genre") || "";
  const formatParam = searchParams.get("format") || "";
  const seasonParam = searchParams.get("season") || "";
  const yearParam = searchParams.get("year") || "";
  const statusParam = searchParams.get("status") || "";
  const sortParam = searchParams.get("sort") || "POPULARITY_DESC";

  // Ambil list genre dinamis
  const { genres: genreList, isLoading: isGenreLoading } = useGenres();

  // Local State untuk UI Search Bar
  const [localQuery, setLocalQuery] = useState(qParam);
  const debouncedQuery = useDebounce(localQuery, 400); // 400ms delay

  // State Hasil & Status
  const [searchResults, setSearchResults] = useState([]);
  const [trendingResults, setTrendingResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // State Pagination
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Fungsi helper update URL Params (di-hoist manual)
  function updateParams(newParams) {
    const currentParams = Object.fromEntries(searchParams.entries());
    const updated = { ...currentParams, ...newParams };
    // Bersihkan key yang kosong
    Object.keys(updated).forEach(key => {
      if (!updated[key]) delete updated[key];
    });
    setSearchParams(updated);
  }

  // Sinkronisasi form eksternal (misal dari Navbar) ke lokal
  useEffect(() => {
    setLocalQuery(qParam);
    if (qParam && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [qParam]);

  // Update URL otomatis ketika user berhenti mengetik
  useEffect(() => {
    if (debouncedQuery !== qParam) {
      updateParams({ q: debouncedQuery });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const isFilterActive = genreParam || formatParam || seasonParam || yearParam || statusParam || (sortParam !== "POPULARITY_DESC");
  const isSearchEmpty = !qParam && !isFilterActive;

  // FETCH 1: Trending Data (Ditampilkan jika Search & Filter kosong)
  useEffect(() => {
    const fetchTrending = async () => {
      if (isSearchEmpty && trendingResults.length === 0) {
        setIsLoading(true);
        try {
          const { data, error } = await fetchAniList(TRENDING_QUERY);
          if (error) throw new Error(error);
          setTrendingResults(data?.Page?.media || []);
        } catch {
          console.error("Gagal load trending");
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchTrending();
  }, [isSearchEmpty, trendingResults.length]);

  // FETCH 2: Search Data Lanjutan
  useEffect(() => {
    if (isSearchEmpty) {
       setSearchResults([]);
       return;
    }

    const controller = new AbortController();

    const executeSearch = async () => {
      setIsLoading(true);
      try {
        setApiError(null);
        const variables = {
          search: qParam || undefined,
          page: 1,
          genre: genreParam || undefined,
          format: formatParam || undefined,
          season: seasonParam || undefined,
          seasonYear: yearParam ? parseInt(yearParam, 10) : undefined,
          status: statusParam || undefined,
          sort: [sortParam]
        };

        const { data, error, isAborted } = await fetchAniList(SEARCH_QUERY, variables, {
          signal: controller.signal,
        });
        if (error && !isAborted) throw new Error(error);
        
        if (!controller.signal.aborted) {
          setSearchResults(data?.Page?.media || []);
          setHasNextPage(data?.Page?.pageInfo?.hasNextPage || false);
          setPage(1);
        }
      } catch {
        if (!controller.signal.aborted) {
          setApiError("Gagal mengambil data pencarian.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsFetchingMore(false);
        }
      }
    };

    executeSearch();
    return () => controller.abort();
  }, [qParam, genreParam, formatParam, seasonParam, yearParam, statusParam, sortParam, isSearchEmpty]);

  // Infinite Scroll Handler
  const isFetchingRef = useRef(false);
  const observer = useRef();

  const handleLoadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasNextPage || isSearchEmpty) return;
    isFetchingRef.current = true;
    setIsFetchingMore(true);
    if (observer.current) observer.current.disconnect();

    const nextPage = page + 1;
    try {
      const variables = {
        search: qParam || undefined,
        page: nextPage,
        genre: genreParam || undefined,
        format: formatParam || undefined,
        season: seasonParam || undefined,
        seasonYear: yearParam ? parseInt(yearParam, 10) : undefined,
        status: statusParam || undefined,
        sort: [sortParam]
      };
      const { data, error } = await fetchAniList(SEARCH_QUERY, variables);
      if (error) throw new Error(error);
      const newAnimes = data?.Page?.media || [];
      const hasNext = data?.Page?.pageInfo?.hasNextPage || false;

      setSearchResults((prev) => {
        const prevIds = new Set(prev.map((a) => a.id));
        const filteredNew = newAnimes.filter((a) => !prevIds.has(a.id));
        return [...prev, ...filteredNew];
      });
      setHasNextPage(hasNext);
      setPage(nextPage);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat lebih banyak anime.");
    } finally {
      isFetchingRef.current = false;
      setIsFetchingMore(false);
    }
  }, [page, qParam, genreParam, formatParam, seasonParam, yearParam, statusParam, sortParam, hasNextPage, isSearchEmpty]);

  const lastElementRef = useCallback(
    (node) => {
      if (isLoading || isFetchingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          handleLoadMore();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isLoading, isFetchingMore, hasNextPage, handleLoadMore]
  );

  const clearAllFilters = () => {
    // Keep the search query, clear the rest
    setSearchParams(qParam ? { q: qParam } : {});
  };

  return (
    <div className="pb-16 min-h-[80vh] relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Header Title */}
        <div className="flex flex-col items-center justify-center mb-8 mt-8">
          <h1 className="text-3xl md:text-5xl font-black mb-3 text-white tracking-tight drop-shadow-xl text-center flex items-center gap-3">
            <FaSearch className="text-red-500" /> Eksplor <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300">Anime</span>
          </h1>
          <p className="text-red-100/70 max-w-xl text-center text-xs md:text-sm">
            Gunakan fitur pencarian *live* dan kombinasi filter multi-kategori untuk menemukan tontonan yang tepat.
          </p>
        </div>

        {/* --- FORM PENCARIAN & FILTER --- */}
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-4 relative mb-12">
          
          {/* Main Search Bar (Glassmorphism) */}
          <div className="flex gap-2 sm:gap-3 items-center w-full relative z-20">
            <div className="relative group w-full flex-1">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-900 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
              <div className="relative flex items-center w-full bg-[#140404]/90 backdrop-blur-xl border border-red-900/40 rounded-2xl overflow-hidden shadow-2xl transition-all group-focus-within:border-red-500/80 group-focus-within:ring-1 group-focus-within:ring-red-500/50">
                <div className="pl-5 text-gray-400 group-focus-within:text-red-400 transition-colors">
                  <FaSearch size={18} />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Ketik judul anime favoritmu..."
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  className="w-full bg-transparent text-white placeholder-gray-500 text-sm sm:text-base py-4 px-4 focus:outline-none"
                />
                {localQuery && (
                  <button
                    onClick={() => {
                      setLocalQuery("");
                      updateParams({ q: "" });
                      searchInputRef.current?.focus();
                    }}
                    className="pr-5 text-gray-500 hover:text-white transition-colors cursor-pointer p-2 flex items-center justify-center"
                    title="Hapus pencarian"
                  >
                    <FaTimes size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Toggle Filter Button */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-14 w-14 sm:w-auto sm:px-6 rounded-2xl border transition-all duration-300 shadow-xl flex-shrink-0 backdrop-blur-md cursor-pointer flex items-center justify-center gap-2 font-bold text-sm ${
                showFilters || isFilterActive
                  ? "bg-gradient-to-br from-red-700 to-red-900 text-white border-red-400/50 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                  : "bg-[#140404]/90 text-red-300 border-red-900/50 hover:border-red-500 hover:bg-red-900/30 hover:text-white"
              }`}
            >
              {showFilters ? <FaTimes size={18} /> : <FaFilter size={18} />}
              <span className="hidden sm:inline">
                {isFilterActive ? "Filter Aktif" : "Filter Lanjutan"}
              </span>
            </button>
          </div>

          {/* Expandable Filter Drawer (Multi-Category) */}
          <div
            className={`transition-all duration-500 ease-in-out origin-top w-full overflow-hidden absolute top-[110%] z-30 ${
              showFilters
                ? "opacity-100 scale-y-100 max-h-[1200px]"
                : "opacity-0 scale-y-95 max-h-0 pointer-events-none"
            }`}
          >
            <div className="bg-[#0a0202]/95 backdrop-blur-3xl p-5 md:p-8 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.95)] mt-2 border border-red-900/40 grid grid-cols-1 md:grid-cols-12 gap-8 relative overflow-hidden">
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-900/20 blur-[100px] rounded-full pointer-events-none"></div>

              {/* Kiri: Select Dropdowns (Musim, Tahun, Status, Sort) */}
              <div className="md:col-span-4 flex flex-col gap-5 z-10">
                <div className="bg-[#120303] p-4 rounded-2xl border border-red-900/30">
                  <label className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <FaSortAmountDown /> Urutkan Berdasarkan
                  </label>
                  <select
                    value={sortParam}
                    onChange={(e) => updateParams({ sort: e.target.value })}
                    className="w-full bg-[#1a0505] text-white text-sm font-semibold py-2.5 px-3 rounded-xl border border-red-900/40 focus:border-red-500 outline-none cursor-pointer"
                  >
                    {SORT_LIST.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-[#120303] p-4 rounded-2xl border border-red-900/30 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <FaSun /> Musim
                    </label>
                    <select
                      value={seasonParam}
                      onChange={(e) => updateParams({ season: e.target.value })}
                      className="w-full bg-[#1a0505] text-white text-xs font-semibold py-2.5 px-2 rounded-xl border border-red-900/40 outline-none"
                    >
                      {SEASON_LIST.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <FaCalendarAlt /> Tahun
                    </label>
                    <input
                      type="number"
                      placeholder="Semua"
                      value={yearParam}
                      onChange={(e) => updateParams({ year: e.target.value })}
                      className="w-full bg-[#1a0505] text-white text-xs font-semibold py-2.5 px-3 rounded-xl border border-red-900/40 outline-none"
                    />
                  </div>
                </div>

                <div className="bg-[#120303] p-4 rounded-2xl border border-red-900/30">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <FaBroadcastTower /> Status Rilis
                  </label>
                  <select
                    value={statusParam}
                    onChange={(e) => updateParams({ status: e.target.value })}
                    className="w-full bg-[#1a0505] text-white text-xs font-semibold py-2.5 px-3 rounded-xl border border-red-900/40 outline-none cursor-pointer"
                  >
                    {STATUS_LIST.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Kanan: Badge Buttons (Format & Genre) */}
              <div className="md:col-span-8 flex flex-col gap-6 z-10">
                {/* Format Filter */}
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">
                    Format Tayangan
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {FORMAT_LIST.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => updateParams({ format: formatParam === f.value ? "" : f.value })}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer active:scale-95 ${
                          formatParam === f.value
                            ? "bg-gradient-to-r from-red-600 to-red-800 text-white border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                            : "bg-[#120303] text-gray-400 border-red-900/30 hover:border-red-500/50 hover:bg-[#1a0505] hover:text-white"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Genre Filter */}
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">
                    Kategori / Genre
                  </span>
                  <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                    {isGenreLoading ? (
                      [...Array(12)].map((_, i) => (
                        <div key={i} className="h-8 w-24 rounded-full bg-red-900/20 animate-pulse border border-red-900/10"></div>
                      ))
                    ) : (
                      genreList.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => updateParams({ genre: genreParam === g ? "" : g })}
                          className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border cursor-pointer active:scale-95 ${
                            genreParam === g
                              ? "bg-gradient-to-r from-red-600 to-red-800 text-white border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                              : "bg-[#120303] text-gray-400 border-red-900/30 hover:border-red-500/50 hover:bg-[#1a0505] hover:text-white"
                          }`}
                        >
                          {g}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Clear Filters Action */}
                <div className="mt-auto pt-5 border-t border-red-900/30 flex justify-end">
                  {isFilterActive && (
                    <button
                      type="button"
                      onClick={() => {
                        clearAllFilters();
                        setShowFilters(false);
                      }}
                      className="px-5 py-2 text-xs font-bold text-red-400 hover:text-white bg-red-950/30 hover:bg-red-600 rounded-xl transition-all border border-red-900/50 hover:border-red-500 cursor-pointer"
                    >
                      Reset Semua Filter
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- ERROR MESSAGE --- */}
        {apiError && <ApiErrorState message={apiError} />}

        {/* --- HASIL RENDER UI --- */}
        {isSearchEmpty ? (
          // EMPTY STATE: Tampilkan Trending
          <div className="mt-10 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-red-900/30 p-2 rounded-lg text-red-500">
                <FaFire size={20} />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white">Sedang Trending</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {isLoading ? (
                [...Array(10)].map((_, i) => <SkeletonCard key={i} />)
              ) : (
                trendingResults.map((anime) => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))
              )}
            </div>
          </div>

        ) : (
          // SEARCH RESULTS STATE
          <div className="mt-10">
            {/* Header info pencarian */}
            {!isLoading && searchResults.length > 0 && (
              <p className="text-sm text-gray-400 mb-6 font-medium">
                Menampilkan hasil pencarian {qParam ? (<span>untuk <strong className="text-white">"{qParam}"</strong></span>) : "dengan filter khusus"}
              </p>
            )}

            {!isLoading && searchResults.length === 0 && !apiError ? (
              <div className="flex flex-col items-center justify-center py-20 bg-[#0a0202]/50 backdrop-blur-md rounded-3xl border border-red-900/20 shadow-inner">
                <div className="text-6xl mb-4 opacity-50">👻</div>
                <h3 className="text-xl font-bold text-gray-300">Pencarian Tidak Ditemukan</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-sm text-center">
                  Coba ubah kata kunci atau hapus beberapa filter pencarian untuk menemukan anime yang kamu mau.
                </p>
                <button 
                  onClick={() => {
                    clearAllFilters();
                    setLocalQuery("");
                    updateParams({ q: "" });
                  }} 
                  className="mt-6 px-6 py-2 bg-red-900/40 text-red-300 font-bold text-sm rounded-full border border-red-900 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                >
                  Reset Pencarian
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 relative z-0">
                {isLoading && page === 1
                  ? [...Array(10)].map((_, i) => <SkeletonCard key={i} />)
                  : searchResults.map((anime, index) => {
                      if (searchResults.length === index + 1) {
                        return (
                          <div ref={lastElementRef} key={`${anime.id}-${index}`}>
                            <AnimeCard anime={anime} />
                          </div>
                        );
                      } else {
                        return <AnimeCard key={`${anime.id}-${index}`} anime={anime} />;
                      }
                    })}
              </div>
            )}
            
            {/* INFINITE SCROLL LOADER */}
            {isFetchingMore && (
              <div className="flex justify-center items-center py-12">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-red-600 animate-spin"></div>
                  <div className="absolute inset-2 rounded-full border-[3px] border-transparent border-b-red-400 animate-spin-reverse opacity-70"></div>
                </div>
              </div>
            )}

            {!hasNextPage && searchResults.length > 0 && !isLoading && (
              <div className="text-center py-14">
                <span className="bg-red-900/20 text-red-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-red-900/30">
                  Semua Hasil Telah Ditampilkan
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
