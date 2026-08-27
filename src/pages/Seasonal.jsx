import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { fetchAniList } from "../utils/anilist";
import {
  FaSnowflake,
  FaLeaf,
  FaSun,
  FaTree,
  FaStar,
  FaPlayCircle,
} from "react-icons/fa";

// Query GraphQL untuk mengambil anime berdasarkan Musim dan Tahun
const SEASONAL_QUERY = `
  query ($season: MediaSeason, $seasonYear: Int, $page: Int) {
    Page(page: $page, perPage: 24) {
      pageInfo { hasNextPage }
      media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: POPULARITY_DESC) {
        id
        title { romaji english }
        coverImage { large }
        averageScore
        episodes
        status
      }
    }
  }
`;

const getCurrentSeasonAndYear = () => {
  const now = new Date();
  const month = now.getMonth(); // 0 = Jan, 11 = Des
  const currentYear = now.getFullYear();
  let currentSeason;
  if (month >= 2 && month <= 4) {
    currentSeason = "SPRING";
  } else if (month >= 5 && month <= 7) {
    currentSeason = "SUMMER";
  } else if (month >= 8 && month <= 10) {
    currentSeason = "FALL";
  } else {
    currentSeason = "WINTER";
  }
  return { year: currentYear, season: currentSeason };
};

const Seasonal = () => {
  const initial = getCurrentSeasonAndYear();
  const [year, setYear] = useState(initial.year);
  const [season, setSeason] = useState(initial.season);
  const [animeList, setAnimeList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const seasons = [
    {
      value: "WINTER",
      label: "Winter",
      icon: <FaSnowflake className="text-blue-300" />,
    },
    {
      value: "SPRING",
      label: "Spring",
      icon: <FaLeaf className="text-green-400" />,
    },
    {
      value: "SUMMER",
      label: "Summer",
      icon: <FaSun className="text-yellow-400" />,
    },
    {
      value: "FALL",
      label: "Fall",
      icon: <FaTree className="text-orange-400" />,
    },
  ];

  useEffect(() => {
    let isCancelled = false;

    const fetchSeasonalAnime = async () => {
      try {
        const data = await fetchAniList(SEASONAL_QUERY, {
          season: season,
          seasonYear: year,
          page: 1,
        });
        if (!isCancelled) {
          setAnimeList(data?.Page?.media || []);
          setHasNextPage(data?.Page?.pageInfo?.hasNextPage || false);
          setPage(1);
        }
      } catch (error) {
        console.error("Gagal memuat data anime musiman:", error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsFetchingMore(false);
        }
      }
    };

    fetchSeasonalAnime();

    return () => {
      isCancelled = true;
    };
  }, [season, year]);

  const handleLoadMore = useCallback(async () => {
    const nextPage = page + 1;
    setIsFetchingMore(true);
    try {
      const data = await fetchAniList(SEASONAL_QUERY, {
        season: season,
        seasonYear: year,
        page: nextPage,
      });
      const newAnimes = data?.Page?.media || [];
      const hasNext = data?.Page?.pageInfo?.hasNextPage || false;

      setAnimeList((prev) => {
        const prevIds = new Set(prev.map((a) => a.id));
        const filteredNew = newAnimes.filter((a) => !prevIds.has(a.id));
        return [...prev, ...filteredNew];
      });
      setHasNextPage(hasNext);
      setPage(nextPage);
    } catch {
      console.error("Gagal memuat lebih banyak anime.");
    } finally {
      setIsFetchingMore(false);
    }
  }, [page, season, year]);

  const observer = useRef();
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

  const handleYearChange = (e) => {
    setIsLoading(true);
    setYear(parseInt(e.target.value, 10) || initial.year);
  };

  const handleSeasonChange = (sValue) => {
    setIsLoading(true);
    setSeason(sValue);
  };

  return (
    <div className="pb-16 mt-8 min-h-[75vh] relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header Title */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-white tracking-tight drop-shadow-md">
            Anime{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300">
              Musiman
            </span>
          </h1>
          <p className="text-red-100/70 max-w-2xl mx-auto text-sm md:text-base">
            Jelajahi anime paling populer berdasarkan musim rilisnya. Temukan
            tontonan favoritmu untuk mengisi waktu luang di sela-sela jadwal
            kuliah.
          </p>
        </div>

        {/* Kontrol Filter (Glassmorphism) */}
        <div className="bg-[#1a0505]/60 backdrop-blur-xl border border-red-900/40 rounded-2xl p-4 md:p-6 mb-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_10px_30px_rgba(220,38,38,0.15)]">
          {/* Input Tahun */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            <label className="text-gray-300 font-bold uppercase tracking-wider text-sm">
              Tahun Rilis:
            </label>
            <input
              type="number"
              value={year}
              onChange={handleYearChange}
              className="bg-black/50 border border-red-900/50 text-white font-black text-xl rounded-xl px-4 py-2 w-32 text-center focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/50 transition-all"
            />
          </div>

          {/* Tombol Pemilihan Musim */}
          <div className="flex flex-wrap md:flex-nowrap gap-2 md:gap-4 w-full md:w-auto justify-center">
            {seasons.map((s) => (
              <button
                key={s.value}
                onClick={() => handleSeasonChange(s.value)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
                  season === s.value
                    ? "bg-gradient-to-r from-red-700 to-red-600 text-white border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.4)] scale-105"
                    : "bg-black/40 text-gray-400 border-red-900/30 hover:bg-red-900/30 hover:text-white"
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid Daftar Anime */}
        {isLoading && page === 1 ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]"></div>
          </div>
        ) : animeList.length === 0 ? (
          <div className="text-center py-20 bg-[#1a0505]/40 backdrop-blur-md rounded-3xl border border-red-900/30">
            <h3 className="text-xl font-bold text-gray-400">
              Tidak ada anime yang ditemukan pada musim ini.
            </h3>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6 animate-fade-in">
            {animeList.map((anime, index) => {
              const content = (
              <Link
                to={`/anime/${anime.id}`}
                key={anime.id}
                className="group relative bg-[#1a0505]/60 backdrop-blur-md rounded-2xl overflow-hidden border border-red-900/30 shadow-lg hover:shadow-[0_0_25px_rgba(220,38,38,0.3)] hover:border-red-500/50 transition-all duration-300 flex flex-col h-full aspect-[2/3]"
              >
                {/* Badge Status & Episode */}
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md z-20 border border-red-900/50 flex flex-col gap-1">
                  <span
                    className={
                      anime.status === "RELEASING"
                        ? "text-green-400"
                        : "text-gray-300"
                    }
                  >
                    {anime.status}
                  </span>
                  {anime.episodes && (
                    <span className="text-gray-400 border-t border-gray-700 pt-1">
                      {anime.episodes} Ep
                    </span>
                  )}
                </div>

                {/* Cover Poster */}
                <img
                  src={anime.coverImage?.large}
                  alt={anime.title?.romaji || "Poster"}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0202] via-[#0a0202]/30 to-transparent opacity-95 group-hover:opacity-100 transition-opacity"></div>

                {/* Info Text Bawah */}
                <div className="absolute bottom-0 w-full p-3 flex flex-col justify-end translate-y-2 group-hover:translate-y-0 transition-transform">
                  <h3 className="text-white font-bold text-sm line-clamp-2 leading-tight drop-shadow-md group-hover:text-red-400 transition-colors">
                    {anime.title?.romaji}
                  </h3>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-md border border-red-900/40">
                      <FaStar className="text-yellow-400 text-[10px]" />
                      <span className="text-white text-[10px] font-bold">
                        {anime.averageScore
                          ? (anime.averageScore / 10).toFixed(1)
                          : "N/A"}
                      </span>
                    </div>
                    <FaPlayCircle className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xl drop-shadow-lg" />
                  </div>
                </div>
              </Link>
              );

              if (animeList.length === index + 1) {
                return (
                  <div ref={lastElementRef} key={anime.id}>
                    {content}
                  </div>
                );
              }
              return content;
            })}
          </div>
        )}

        {/* Loading Skeletons / Indicator at the bottom */}
        {isFetchingMore && (
          <div className="flex justify-center items-center py-10 mt-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Seasonal;
