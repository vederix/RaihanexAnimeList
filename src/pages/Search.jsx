import { useState, useEffect } from "react";
// 1. IMPORT FITUR URL PARAMETER DARI REACT ROUTER
import { useSearchParams } from "react-router-dom";
import AnimeCard from "../components/AnimeCard";
import SkeletonCard from "../components/SkeletonCard";
import { FaSearch, FaFilter, FaTimes, FaCalendarAlt } from "react-icons/fa";
import { fetchAniList } from "../utils/anilist";

const SEARCH_QUERY = `
  query ($search: String, $page: Int, $genre: String, $format: MediaFormat, $year: Int) {
    Page(page: $page, perPage: 15) {
      pageInfo { hasNextPage }
      media(search: $search, type: ANIME, sort: POPULARITY_DESC, genre: $genre, format: $format, seasonYear: $year) {
        id
        title { romaji english }
        coverImage { large }
        averageScore
        format
        seasonYear
      }
    }
  }
`;

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

const Search = () => {
  // 2. TANGKAP "PESAN" DARI URL (Misal: ?q=naruto)
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || ""; // Mengambil nilai dari parameter 'q'

  // Jadikan urlQuery sebagai nilai awal kolom pencarian
  const [query, setQuery] = useState(urlQuery);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [apiError, setApiError] = useState(null);

  const [showFilters, setShowFilters] = useState(false);
  const [genre, setGenre] = useState("");
  const [format, setFormat] = useState("");
  const [year, setYear] = useState("");

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // 3. EFFECT OTOMATIS JIKA ADA KATA KUNCI DARI NAVBAR / URL
  useEffect(() => {
    if (urlQuery) {
      setQuery(urlQuery); // Sinkronkan input box yang besar dengan URL
      setPage(1);
      fetchSearchData(urlQuery, 1, { genre, format, year });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]); // Efek ini HANYA berjalan jika URL parameter berubah

  const fetchSearchData = async (searchKeyword, pageNumber, filters) => {
    try {
      if (pageNumber === 1) setIsLoading(true);
      else setIsFetchingMore(true);
      setApiError(null);

      const variables = {
        search: searchKeyword || undefined,
        page: pageNumber,
        genre: filters.genre || undefined,
        format: filters.format || undefined,
        year: filters.year ? parseInt(filters.year) : undefined,
      };

      const data = await fetchAniList(SEARCH_QUERY, variables);

      const newAnimes = data?.Page?.media || [];
      const hasNext = data?.Page?.pageInfo?.hasNextPage || false;

      if (pageNumber === 1) setSearchResults(newAnimes);
      else setSearchResults((prev) => [...prev, ...newAnimes]);

      setHasNextPage(hasNext);
      setHasSearched(true);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  // 4. JIKA USER MENCARI LEWAT TOMBOL DI HALAMAN INI
  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      // Mengubah URL parameter, yang akan otomatis memicu useEffect di atas!
      setSearchParams({ q: query });
    } else {
      setSearchParams({});
    }
  };

  // Logika Filter Lanjutan (Tetap memanggil fetch secara manual karena tidak diubah ke URL)
  const applyFiltersAndSearch = (e) => {
    e.preventDefault();
    setShowFilters(false);
    setPage(1);
    fetchSearchData(query, 1, { genre, format, year });
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSearchData(query, nextPage, { genre, format, year });
  };

  const clearFilters = () => {
    setGenre("");
    setFormat("");
    setYear("");
  };

  return (
    <div className="pb-16 min-h-[70vh] relative z-10">
      <div className="flex flex-col items-center justify-center mb-10 mt-10">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-white tracking-tight drop-shadow-lg text-center">
          Eksplor{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300">
            Katalog Anime
          </span>
        </h1>

        <form
          onSubmit={handleSearch}
          className="w-full max-w-3xl flex flex-col gap-4 relative"
        >
          <div className="flex gap-3 items-center w-full relative z-20">
            <div className="relative group w-full">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-900 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              <input
                type="text"
                placeholder="Cari anime favoritmu..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="relative w-full bg-black/60 backdrop-blur-xl border border-red-900/30 text-white rounded-full py-4 pl-6 pr-16 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/50 transition-all shadow-xl"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white w-12 rounded-full transition-all flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.4)] border border-red-500/30"
              >
                <FaSearch />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-4 rounded-full border transition-all duration-300 shadow-lg flex-shrink-0 backdrop-blur-md ${
                showFilters || genre || format || year
                  ? "bg-red-600 text-white border-red-400/50"
                  : "bg-black/50 text-red-300 border-red-900/40 hover:border-red-500 hover:text-white"
              }`}
            >
              {showFilters ? <FaTimes /> : <FaFilter />}
            </button>
          </div>

          <div
            className={`transition-all duration-500 ease-in-out origin-top w-full overflow-hidden absolute top-[110%] z-10 ${
              showFilters
                ? "opacity-100 scale-y-100 max-h-[500px]"
                : "opacity-0 scale-y-0 max-h-0"
            }`}
          >
            <div className="bg-[#1a0505]/80 backdrop-blur-2xl border border-red-900/50 p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] mt-2 flex flex-col gap-6">
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
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
                        genre === g
                          ? "bg-red-600 text-white border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                          : "bg-slate-900/50 text-gray-300 border-slate-700 hover:border-red-500 hover:text-white"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
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
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
                          format === f.value
                            ? "bg-red-600 text-white border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                            : "bg-slate-900/50 text-gray-300 border-slate-700 hover:border-red-500 hover:text-white"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1">
                  <span className="text-xs font-bold text-red-300/70 uppercase tracking-wider mb-3 block">
                    Tahun Rilis
                  </span>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaCalendarAlt className="text-red-400/50" />
                    </div>
                    <input
                      type="number"
                      placeholder="Contoh: 2026"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full bg-slate-900/50 text-white border border-slate-700 focus:border-red-500 rounded-xl py-2 pl-10 pr-4 text-sm outline-none transition-all placeholder-gray-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center gap-4 mt-2 pt-4 border-t border-red-900/30">
                {(genre || format || year) && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm text-gray-400 hover:text-red-300 transition-colors font-medium"
                  >
                    Reset Filter
                  </button>
                )}
                <button
                  type="button"
                  onClick={applyFiltersAndSearch}
                  className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                >
                  Terapkan & Cari
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-8 relative z-0">
          {[...Array(10)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-8 relative z-0">
          {searchResults.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      )}

      {hasNextPage && !isLoading && (
        <div className="flex justify-center mt-12">
          <button
            onClick={handleLoadMore}
            disabled={isFetchingMore}
            className="bg-black/40 hover:bg-red-900/40 backdrop-blur-md border border-red-900/50 hover:border-red-500 text-red-300 hover:text-white px-8 py-3.5 rounded-full transition-all shadow-[0_5px_20px_rgba(220,38,38,0.15)] font-bold"
          >
            {isFetchingMore ? "Memuat..." : "Muat Lebih Banyak ↓"}
          </button>
        </div>
      )}
    </div>
  );
};

export default Search;
