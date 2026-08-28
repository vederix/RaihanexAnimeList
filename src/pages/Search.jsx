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
} from "react-icons/fa";
import { fetchAniList } from "../utils/anilist";
import ApiErrorState from "../components/ApiErrorState";

// 1. QUERY GRAPHQL YANG SUDAH LENGKAP (Termasuk Season & Episodes)
const SEARCH_QUERY = `
  query ($search: String, $page: Int, $genre: String, $format: MediaFormat, $season: MediaSeason, $seasonYear: Int) {
    Page(page: $page, perPage: 15) {
      pageInfo { hasNextPage }
      media(search: $search, type: ANIME, sort: POPULARITY_DESC, genre: $genre, format: $format, season: $season, seasonYear: $seasonYear) {
        id
        title { romaji english }
        coverImage { large }
        averageScore
        format
        episodes
        status
        seasonYear
      }
    }
  }
`;

// 2. DATA FILTER MASTER
const GENRE_LIST = [
  "Action",
  "Romance",
  "Comedy",
  "Horror",
  "Fantasy",
  "Sci-Fi",
  "Drama",
  "Slice of Life",
];
const FORMAT_LIST = [
  { label: "TV Series", value: "TV" },
  { label: "Movie", value: "MOVIE" },
];
const SEASON_LIST = [
  { label: "Semua Musim", value: "" },
  { label: "Winter (Jan-Mar)", value: "WINTER" },
  { label: "Spring (Apr-Jun)", value: "SPRING" },
  { label: "Summer (Jul-Sep)", value: "SUMMER" },
  { label: "Fall (Okt-Des)", value: "FALL" },
];

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";

  // State Pencarian Utama
  const [query, setQuery] = useState(urlQuery);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // State Filter Lanjutan
  const [showFilters, setShowFilters] = useState(false);
  const [genre, setGenre] = useState("");
  const [format, setFormat] = useState("");
  const [season, setSeason] = useState("");
  const [year, setYear] = useState("");

  // State Pagination
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Jalankan pencarian jika URL param atau filter berubah dengan AbortController
  useEffect(() => {
    const controller = new AbortController();

    const executeSearch = async () => {
      try {
        setApiError(null);
        const variables = {
          search: urlQuery || undefined,
          page: 1,
          genre: genre || undefined,
          format: format || undefined,
          season: season || undefined,
          seasonYear: year ? parseInt(year, 10) : undefined,
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
          setApiError("Gagal mengambil data dari server. Silakan coba lagi.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsFetchingMore(false);
        }
      }
    };

    executeSearch();

    return () => {
      controller.abort();
    };
  }, [urlQuery, genre, format, season, year]);

  // Eksekusi ketika tombol Cari atau Enter ditekan
  const handleSearch = (e) => {
    e.preventDefault();
    setShowFilters(false);
    setIsLoading(true);
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    } else {
      setSearchParams({});
    }
  };

  const applyFiltersAndSearch = () => {
    setShowFilters(false);
    setIsLoading(true);
  };

  const isFetchingRef = useRef(false);
  const observer = useRef();

  const handleLoadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasNextPage) return;
    isFetchingRef.current = true;
    setIsFetchingMore(true);
    if (observer.current) observer.current.disconnect();

    const nextPage = page + 1;
    try {
      const variables = {
        search: urlQuery || undefined,
        page: nextPage,
        genre: genre || undefined,
        format: format || undefined,
        season: season || undefined,
        seasonYear: year ? parseInt(year, 10) : undefined,
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
      console.error("Gagal memuat lebih banyak anime:", err);
      toast.error("Gagal memuat lebih banyak anime.");
    } finally {
      isFetchingRef.current = false;
      setIsFetchingMore(false);
    }
  }, [page, urlQuery, genre, format, season, year, hasNextPage]);

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

  const clearFilters = () => {
    setGenre("");
    setFormat("");
    setSeason("");
    setYear("");
    setIsLoading(true);
  };

  // Cek apakah ada filter yang aktif
  const isFilterActive = genre || format || season || year;

  return (
    <div className="pb-16 min-h-[75vh] relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header Section */}
        <div className="flex flex-col items-center justify-center mb-10 mt-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-white tracking-tight drop-shadow-lg text-center">
            Pencarian{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300">
              Lanjutan
            </span>
          </h1>
          <p className="text-red-100/70 max-w-2xl text-center text-sm md:text-base">
            Temukan anime spesifik dengan presisi tinggi menggunakan filter
            kategori di bawah ini.
          </p>
        </div>

        {/* --- FORM PENCARIAN & FILTER --- */}
        <form
          onSubmit={handleSearch}
          className="w-full max-w-4xl mx-auto flex flex-col gap-4 relative mb-12"
        >
          {/* Main Search Bar */}
          <div className="flex gap-3 items-center w-full relative z-20">
            <div className="relative group w-full">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-900 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
              <input
                type="text"
                placeholder="Cari judul anime favoritmu..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="relative w-full bg-[#1a0505]/80 backdrop-blur-xl border border-red-900/40 text-white rounded-full py-4 pl-6 pr-16 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/50 transition-all shadow-xl"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 bottom-2 btn-primary w-12 rounded-full flex items-center justify-center cursor-pointer p-0 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
              >
                <FaSearch />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-4 rounded-full border transition-all duration-300 shadow-lg flex-shrink-0 backdrop-blur-md cursor-pointer ${
                showFilters || isFilterActive
                  ? "bg-red-600 text-white border-red-400/50 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                  : "bg-black/50 text-red-300 border-red-900/40 hover:border-red-500 hover:bg-red-900/30 hover:text-white"
              }`}
            >
              {showFilters ? <FaTimes /> : <FaFilter />}
            </button>
          </div>

          {/* Expandable Filter Panel */}
          <div
            className={`transition-all duration-500 ease-in-out origin-top w-full overflow-hidden absolute top-[105%] z-10 ${
              showFilters
                ? "opacity-100 scale-y-100 max-h-[800px]"
                : "opacity-0 scale-y-0 max-h-0 pointer-events-none"
            }`}
          >
            <div className="glass-card p-6 md:p-8 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] mt-3 border-t border-red-900/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Kolom Kiri: Musim & Tahun */}
                <div className="flex flex-col gap-6">
                  <div>
                    <label className="text-xs font-bold text-red-300/70 uppercase tracking-wider mb-3 block flex items-center gap-2">
                      <FaSun /> Musim Rilis
                    </label>
                    <select
                      value={season}
                      onChange={(e) => setSeason(e.target.value)}
                      className="w-full input-field px-4 py-3 cursor-pointer"
                    >
                      {SEASON_LIST.map((s) => (
                        <option
                          key={s.value}
                          value={s.value}
                          className="bg-[#1a0505]"
                        >
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-red-300/70 uppercase tracking-wider mb-3 block flex items-center gap-2">
                      <FaCalendarAlt /> Tahun Rilis
                    </label>
                    <input
                      type="number"
                      placeholder="Contoh: 2026"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full input-field px-4 py-3"
                    />
                  </div>
                </div>

                {/* Kolom Kanan: Genre & Format */}
                <div className="flex flex-col gap-6">
                  <div>
                    <span className="text-xs font-bold text-red-300/70 uppercase tracking-wider mb-3 block">
                      Format
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {FORMAT_LIST.map((f) => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() =>
                            setFormat(format === f.value ? "" : f.value)
                          }
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border cursor-pointer active:scale-95 ${
                            format === f.value
                              ? "bg-gradient-to-r from-red-700 to-red-600 text-white border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                              : "bg-[#0a0202] text-gray-400 border-red-900/30 hover:border-red-500/50 hover:text-white"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-red-300/70 uppercase tracking-wider mb-3 block">
                      Genre Utama
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {GENRE_LIST.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGenre(genre === g ? "" : g)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer active:scale-95 ${
                            genre === g
                              ? "bg-gradient-to-r from-red-700 to-red-600 text-white border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                              : "bg-[#0a0202] text-gray-400 border-red-900/30 hover:border-red-500/50 hover:text-white"
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end items-center gap-4 mt-8 pt-6 border-t border-red-900/30">
                {isFilterActive && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm text-gray-400 hover:text-red-400 transition-colors font-bold cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
                <button
                  type="button"
                  onClick={applyFiltersAndSearch}
                  className="btn-primary px-8 py-3 text-sm font-bold shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                >
                  Terapkan Filter
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* --- ERROR MESSAGE --- */}
        {apiError && (
          <ApiErrorState message={apiError} />
        )}

        {/* --- HASIL PENCARIAN --- */}
        {!isLoading && searchResults.length === 0 && !apiError ? (
          <div className="text-center py-20 glass-card rounded-3xl mt-8">
            <h3 className="text-xl font-bold text-gray-400">
              Belum ada anime yang dicari.
            </h3>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              Gunakan kotak pencarian atau terapkan filter untuk memulai
              eksplorasi.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 relative z-0">
            {/* Loading Skeletons */}
            {isLoading && page === 1
              ? [...Array(10)].map((_, i) => <SkeletonCard key={i} />)
              : searchResults.map((anime, index) => {
                  if (searchResults.length === index + 1) {
                    return (
                      <div ref={lastElementRef} key={anime.id}>
                        <AnimeCard anime={anime} />
                      </div>
                    );
                  } else {
                    return <AnimeCard key={anime.id} anime={anime} />;
                  }
                })}
          </div>
        )}

        {/* --- INFINITE SCROLL LOADER & END STATE --- */}
        {isFetchingMore && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]"></div>
          </div>
        )}

        {!hasNextPage && searchResults.length > 0 && !isLoading && (
          <div className="text-center py-12 text-gray-500 text-xs font-bold uppercase tracking-widest">
            Semua hasil pencarian telah ditampilkan
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
