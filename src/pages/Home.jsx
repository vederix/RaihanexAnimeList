import { useState, useEffect } from "react";
import AnimeCard from "../components/AnimeCard";
import SkeletonCard from "../components/SkeletonCard";
import { fetchAniList } from "../utils/anilist";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import {
  FaFire,
  FaCalendarAlt,
  FaMagic,
  FaClock,
  FaCompass,
  FaPlay,
  FaDice,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import AnimeRandomizerModal from "../components/AnimeRandomizerModal";

const TRENDING_QUERY = `
  query ($page: Int) {
    Page(page: $page, perPage: 10) {
      pageInfo { hasNextPage }
      media(type: ANIME, sort: TRENDING_DESC) {
        id title { romaji english } coverImage { large } averageScore format seasonYear
      }
    }
  }
`;

const AIRING_QUERY = `
  query {
    Page(page: 1, perPage: 5) {
      airingSchedules(notYetAired: true, sort: TIME) {
        episode
        timeUntilAiring
        media {
          id title { romaji english } coverImage { large } averageScore format seasonYear status
        }
      }
    }
  }
`;

const RECOM_QUERY = `
  query ($id: Int) {
    Media(id: $id) {
      title { romaji }
      recommendations(sort: RATING_DESC, perPage: 5) {
        edges {
          node {
            mediaRecommendation {
              id title { romaji english } coverImage { large } averageScore format seasonYear status
            }
          }
        }
      }
    }
  }
`;

const Home = () => {
  const { user } = useAuth();
  const [trendingAnime, setTrendingAnime] = useState([]);
  const [airingAnime, setAiringAnime] = useState([]);
  const [recommendedAnime, setRecommendedAnime] = useState([]);
  const [baseRecomTitle, setBaseRecomTitle] = useState("");
  const [isRandomizerOpen, setIsRandomizerOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const loadDashboard = async () => {
      try {
        const [airingResult, trendingResult] = await Promise.all([
          fetchAniList(AIRING_QUERY),
          fetchAniList(TRENDING_QUERY, { page: 1 }),
        ]);

        if (airingResult.error) throw new Error(airingResult.error);
        if (trendingResult.error) throw new Error(trendingResult.error);

        const airingData = airingResult.data;
        const trendingData = trendingResult.data;

        if (isCancelled) return;
        setAiringAnime(airingData?.Page?.airingSchedules || []);
        setTrendingAnime(trendingData?.Page?.media || []);
        setHasNextPage(trendingData?.Page?.pageInfo?.hasNextPage || false);

        if (user) {
          const { data: topAnime, error: topAnimeError } = await supabase
            .from("watchlist")
            .select("anilist_id")
            .eq("user_id", user.id)
            .gte("rating_pribadi", 8)
            .limit(1);

          if (topAnimeError) {
            console.error("Error fetching top anime for recommendations:", topAnimeError);
            if (!isCancelled) {
              setRecommendedAnime([]);
              setBaseRecomTitle("");
            }
            return;
          }

          if (topAnime && topAnime.length > 0 && !isCancelled) {
            const { data: recomData, error: recomError } = await fetchAniList(RECOM_QUERY, {
              id: topAnime[0].anilist_id,
            });
            if (recomError) throw new Error(recomError);

            const animeNodes =
              recomData?.Media?.recommendations?.edges
                ?.map((edge) => edge.node.mediaRecommendation)
                ?.filter((anime) => anime !== null) || [];

            setBaseRecomTitle(recomData?.Media?.title?.romaji || "");
            setRecommendedAnime(animeNodes);
          } else if (!isCancelled) {
            setRecommendedAnime([]);
            setBaseRecomTitle("");
          }
        } else if (!isCancelled) {
          setRecommendedAnime([]);
          setBaseRecomTitle("");
        }
      } catch (error) {
        console.error("Gagal memuat dasbor:", error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  const handleLoadMore = async () => {
    setIsFetchingMore(true);
    const nextPage = page + 1;
    try {
      const { data, error } = await fetchAniList(TRENDING_QUERY, { page: nextPage });
      if (error) throw new Error(error);
      setTrendingAnime((prev) => [...prev, ...(data?.Page?.media || [])]);
      setHasNextPage(data?.Page?.pageInfo?.hasNextPage || false);
      setPage(nextPage);
    } catch (error) {
      console.error("Gagal load more:", error);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const formatTimeAiring = (seconds) => {
    if (!seconds || seconds <= 0) return "Tayang sekarang";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days} hari lagi`;
    if (hours > 0) return `${hours} jam lagi`;
    if (minutes > 0) return `${minutes} menit lagi`;
    return "Segera tayang";
  };

  return (
    <div className="pb-16 relative z-10">
      {/* --- HERO SECTION ULTIMATE --- */}
      <div className="relative flex flex-col items-center justify-center min-h-[55vh] text-center mb-16 overflow-hidden pt-20">
        {/* Orbs Background Animasi */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-red-900/40 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl px-4 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-950/50 border border-red-500/30 text-red-300 text-xs sm:text-sm font-bold mb-6 backdrop-blur-md shadow-[0_0_15px_rgba(220,38,38,0.2)]">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            Platform Database Anime Terdepan
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black mb-6 tracking-tighter drop-shadow-2xl text-white leading-tight">
            Eksplorasi{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-white">
              Anime
            </span>{" "}
            Tanpa Batas
          </h1>

          <p className="text-red-100/70 max-w-2xl text-base sm:text-lg font-medium mb-10 leading-relaxed">
            Pantau jadwal tayang, simpan watchlist pribadi, dan temukan
            rekomendasi Anime menarik. Semua terintegrasi sempurna di RAIHANEX.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center">
            <Link
              to="/search"
              className="w-full sm:w-auto btn-primary py-4 px-8 text-base shadow-[0_0_30px_rgba(220,38,38,0.4)] flex items-center justify-center gap-3"
            >
              <FaCompass className="text-xl animate-spin-slow" /> Mulai Petualangan
            </Link>
            <button
              onClick={() => setIsRandomizerOpen(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white px-8 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(234,179,8,0.3)] hover:shadow-[0_0_40px_rgba(234,179,8,0.5)] border border-amber-400/40 cursor-pointer active:scale-95 text-base hover:-translate-y-1"
            >
              <FaDice className="text-xl animate-spin-slow text-yellow-200 drop-shadow-md" /> Gacha Anime
            </button>
            <Link
              to="/schedule"
              className="w-full sm:w-auto btn-secondary py-4 px-8 text-base flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
            >
              <FaPlay className="text-red-500" /> Lihat Jadwal
            </Link>
          </div>
        </div>
      </div>

      {/* --- KONTEN UTAMA --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {isLoading ? (
          <div className="flex flex-col gap-12 md:gap-16">
            <section className="glass-card p-6 md:p-8 rounded-[2rem]">
              <div className="h-8 bg-red-900/20 rounded-xl w-64 mb-6 animate-pulse"></div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                {[...Array(5)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="flex flex-col gap-12 md:gap-16">
            {/* SECTION 1: JADWAL RILIS TERDEKAT */}
            <section className="glass-card p-6 md:p-8 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.5)] animate-fade-in relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-red-600/20 transition-all duration-700"></div>
              
              <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-red-900/30 pb-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-red-900/30 p-3 rounded-xl border border-red-500/20">
                    <FaCalendarAlt className="text-red-500 text-2xl drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-md">
                      Jadwal Rilis Terdekat
                    </h2>
                    <p className="text-sm text-gray-400 mt-1 font-medium">
                      Anime yang akan tayang dalam waktu dekat.
                    </p>
                  </div>
                </div>
                <Link
                  to="/schedule"
                  className="text-xs sm:text-sm font-bold text-red-400 hover:text-white transition-colors bg-black/40 px-5 py-2.5 rounded-xl border border-red-900/50 hover:bg-red-900/40 w-max shadow-[0_0_15px_rgba(0,0,0,0.5)] cursor-pointer hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] active:scale-95 flex items-center gap-2"
                >
                  Kalender Lengkap &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 relative z-10">
                {airingAnime.map((schedule, index) => (
                  <div
                    key={`${schedule.media?.id || schedule.id}-${schedule.episode}-${index}`}
                    className="relative group hover:-translate-y-2 transition-transform duration-300"
                  >
                    <div className="absolute -top-3 -right-3 z-20 bg-gradient-to-r from-red-700 to-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-[0_10px_20px_rgba(220,38,38,0.5)] flex items-center gap-1.5 border border-red-400/50 uppercase tracking-wider">
                      <FaClock /> Ep {schedule.episode}:{" "}
                      {formatTimeAiring(schedule.timeUntilAiring)}
                    </div>
                    <AnimeCard anime={schedule.media} />
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 2: SMART RECOMMENDATION */}
            {recommendedAnime.length > 0 && (
              <section className="glass-card p-6 md:p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(220,38,38,0.1)] relative overflow-hidden animate-fade-in group">
                <div className="absolute -left-32 top-1/2 -translate-y-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-amber-600/20 transition-all duration-700"></div>

                <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-red-900/30 pb-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="bg-amber-900/30 p-3 rounded-xl border border-amber-500/20">
                      <FaMagic className="text-amber-400 text-2xl drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-md">
                        Rekomendasi Anime
                      </h2>
                      <p className="text-sm text-gray-300 mt-1 font-medium">
                        Mirip dengan{" "}
                        <span className="font-black text-amber-400 bg-amber-900/30 border border-amber-500/30 px-2 py-0.5 rounded-md shadow-inner">
                          {baseRecomTitle}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 relative z-10">
                  {recommendedAnime.map((anime) => (
                    <div
                      key={anime.id}
                      className="hover:-translate-y-2 transition-transform duration-300"
                    >
                      <AnimeCard anime={anime} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 3: SEDANG TRENDING */}
            <section className="glass-card p-6 md:p-8 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.5)] animate-fade-in relative overflow-hidden group">
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-orange-600/20 transition-all duration-700"></div>

              <div className="mb-8 flex items-center gap-4 border-b border-red-900/30 pb-4 relative z-10">
                <div className="bg-orange-900/30 p-3 rounded-xl border border-orange-500/20">
                  <FaFire className="text-orange-500 text-2xl drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-md">
                    Sedang Trending
                  </h2>
                  <p className="text-sm text-gray-400 mt-1 font-medium">
                    Judul-judul terpanas yang sedang ramai dibicarakan komunitas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 relative z-10">
                {trendingAnime.map((anime) => (
                  <div
                    key={anime.id}
                    className="hover:-translate-y-2 transition-transform duration-300"
                  >
                    <AnimeCard anime={anime} />
                  </div>
                ))}
              </div>

              {hasNextPage && (
                <div className="flex justify-center mt-12 relative z-10">
                  <button
                    onClick={handleLoadMore}
                    disabled={isFetchingMore}
                    className="btn-secondary py-4 px-8 font-bold flex items-center gap-3 group"
                  >
                    {isFetchingMore ? (
                      <span className="animate-pulse">
                        Memuat Data Server...
                      </span>
                    ) : (
                      <>
                        Muat Lebih Banyak{" "}
                        <span className="group-hover:translate-y-1 transition-transform">
                          &darr;
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* MODAL GACHA ROULETTE ANIME */}
      <AnimeRandomizerModal
        isOpen={isRandomizerOpen}
        onClose={() => setIsRandomizerOpen(false)}
      />
    </div>
  );
};

export default Home;
