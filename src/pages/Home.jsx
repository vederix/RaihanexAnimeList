import { useState, useEffect, useCallback, lazy, Suspense, memo } from "react";
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

// Code-splitting: Lazy load modal Gacha agar bundle utama Home lebih ramping
const AnimeRandomizerModal = lazy(() => import("../components/AnimeRandomizerModal"));

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

const AiringScheduleCard = memo(({ schedule }) => (
  <div className="relative group hover:-translate-y-1.5 transition-transform duration-300">
    <div className="absolute -top-2.5 -right-2.5 sm:-top-3 sm:-right-3 z-20 bg-gradient-to-r from-red-700 to-red-500 text-white text-[9px] sm:text-[10px] font-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-md flex items-center gap-1 border border-red-400/40 uppercase tracking-tight">
      <FaClock size={9} /> Ep {schedule.episode}: {formatTimeAiring(schedule.timeUntilAiring)}
    </div>
    <AnimeCard anime={schedule.media} />
  </div>
));
AiringScheduleCard.displayName = "AiringScheduleCard";

const StandardAnimeWrapper = memo(({ anime }) => (
  <div className="hover:-translate-y-1.5 transition-transform duration-300">
    <AnimeCard anime={anime} />
  </div>
));
StandardAnimeWrapper.displayName = "StandardAnimeWrapper";

const Home = () => {
  const { user } = useAuth();
  const userId = user?.id;
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

        if (isCancelled) return;

        const airingData = airingResult.data;
        const trendingData = trendingResult.data;

        setAiringAnime(airingData?.Page?.airingSchedules || []);
        setTrendingAnime(trendingData?.Page?.media || []);
        setHasNextPage(trendingData?.Page?.pageInfo?.hasNextPage || false);

        if (userId) {
          // Query deterministik: pilih anime dengan rating tertinggi dan paling baru ditambahkan
          const { data: topAnime, error: topAnimeError } = await supabase
            .from("watchlist")
            .select("anilist_id")
            .eq("user_id", userId)
            .gte("rating_pribadi", 8)
            .order("rating_pribadi", { ascending: false })
            .order("created_at", { ascending: false })
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
        if (!isCancelled) {
          console.error("Gagal memuat dasbor:", error);
        }
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
  }, [userId]);

  const handleLoadMore = useCallback(async () => {
    if (isFetchingMore || !hasNextPage) return;
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
  }, [page, hasNextPage, isFetchingMore]);

  return (
    <div className="pb-16 relative z-10">
      {/* --- HERO SECTION (RINGAN & OPTIMAL UNTUK MOBILE) --- */}
      <div className="relative flex flex-col items-center justify-center min-h-[48vh] sm:min-h-[55vh] text-center mb-10 sm:mb-16 overflow-hidden pt-16 sm:pt-20 px-4">
        {/* Orbs Background Animasi - Ringan pada GPU Mobile */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[600px] h-[320px] sm:h-[600px] bg-red-600/15 rounded-full blur-[60px] sm:blur-[120px] pointer-events-none"></div>
        <div className="hidden sm:block absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-red-900/30 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl w-full flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/60 border border-red-500/30 text-red-300 text-xs sm:text-sm font-bold mb-4 sm:mb-6 backdrop-blur-sm shadow-[0_0_15px_rgba(220,38,38,0.2)]">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            Platform Database Anime Terdepan
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black mb-4 sm:mb-6 tracking-tight drop-shadow-2xl text-white leading-tight">
            Eksplorasi{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-white">
              Anime
            </span>{" "}
            Tanpa Batas
          </h1>

          <p className="text-red-100/70 max-w-2xl text-sm sm:text-base md:text-lg font-medium mb-8 sm:mb-10 leading-relaxed px-2">
            Pantau jadwal tayang, simpan watchlist pribadi, dan temukan
            rekomendasi Anime menarik. Semua terintegrasi sempurna di RAIHANEX.
          </p>

          <div className="grid grid-cols-1 sm:flex sm:flex-row gap-3 w-full sm:w-auto items-center justify-center">
            <Link
              to="/search"
              className="w-full sm:w-auto btn-primary py-3.5 sm:py-4 px-6 sm:px-8 text-sm sm:text-base shadow-[0_0_25px_rgba(220,38,38,0.35)] flex items-center justify-center gap-2.5"
            >
              <FaCompass className="text-lg" /> Mulai Petualangan
            </Link>
            <button
              onClick={() => setIsRandomizerOpen(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(234,179,8,0.25)] border border-amber-400/40 cursor-pointer active:scale-95 text-sm sm:text-base"
            >
              <FaDice className="text-lg text-yellow-200" /> Gacha Anime
            </button>
            <Link
              to="/schedule"
              className="w-full sm:w-auto btn-secondary py-3.5 sm:py-4 px-6 sm:px-8 text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            >
              <FaPlay className="text-red-500" /> Lihat Jadwal
            </Link>
          </div>
        </div>
      </div>

      {/* --- KONTEN UTAMA --- */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        {isLoading ? (
          <div className="flex flex-col gap-8 md:gap-16">
            <section className="glass-card p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem]">
              <div className="h-6 sm:h-8 bg-red-900/20 rounded-xl w-48 sm:w-64 mb-6 animate-pulse"></div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
                {[...Array(5)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="flex flex-col gap-8 md:gap-16">
            {/* SECTION 1: JADWAL RILIS TERDEKAT */}
            <section className="glass-card p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] shadow-[0_15px_35px_rgba(0,0,0,0.4)] animate-fade-in relative overflow-hidden group">
              <div className="hidden sm:block absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-[80px] pointer-events-none"></div>

              <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-red-900/30 pb-4 relative z-10">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="bg-red-900/30 p-2.5 sm:p-3 rounded-xl border border-red-500/20 flex-shrink-0">
                    <FaCalendarAlt className="text-red-500 text-xl sm:text-2xl drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-md">
                      Jadwal Rilis Terdekat
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5 font-medium">
                      Anime yang akan tayang dalam waktu dekat.
                    </p>
                  </div>
                </div>
                <Link
                  to="/schedule"
                  className="text-xs sm:text-sm font-bold text-red-400 hover:text-white transition-colors bg-black/40 px-4 py-2 rounded-xl border border-red-900/50 hover:bg-red-900/40 w-max shadow-md flex items-center gap-1.5"
                >
                  Kalender Lengkap &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 relative z-10">
                {airingAnime.map((schedule, index) => (
                  <AiringScheduleCard
                    key={`${schedule.media?.id || schedule.id}-${schedule.episode}-${index}`}
                    schedule={schedule}
                  />
                ))}
              </div>
            </section>

            {/* SECTION 2: SMART RECOMMENDATION (Optimasi Content Visibility) */}
            {recommendedAnime.length > 0 && (
              <section
                style={{ contentVisibility: "auto", containIntrinsicSize: "0 400px" }}
                className="glass-card p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] shadow-[0_15px_35px_rgba(220,38,38,0.1)] relative overflow-hidden animate-fade-in group"
              >
                <div className="hidden sm:block absolute -left-32 top-1/2 -translate-y-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-red-900/30 pb-4 relative z-10">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="bg-amber-900/30 p-2.5 sm:p-3 rounded-xl border border-amber-500/20 flex-shrink-0">
                      <FaMagic className="text-amber-400 text-xl sm:text-2xl drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-md">
                        Rekomendasi Anime
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-300 mt-0.5 font-medium">
                        Mirip dengan{" "}
                        <span className="font-black text-amber-400 bg-amber-900/30 border border-amber-500/30 px-2 py-0.5 rounded-md shadow-inner">
                          {baseRecomTitle}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 relative z-10">
                  {recommendedAnime.map((anime) => (
                    <StandardAnimeWrapper key={anime.id} anime={anime} />
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 3: SEDANG TRENDING (Optimasi Content Visibility) */}
            <section
              style={{ contentVisibility: "auto", containIntrinsicSize: "0 600px" }}
              className="glass-card p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] shadow-[0_15px_35px_rgba(0,0,0,0.4)] animate-fade-in relative overflow-hidden group"
            >
              <div className="hidden sm:block absolute bottom-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[80px] pointer-events-none"></div>

              <div className="mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4 border-b border-red-900/30 pb-4 relative z-10">
                <div className="bg-orange-900/30 p-2.5 sm:p-3 rounded-xl border border-orange-500/20 flex-shrink-0">
                  <FaFire className="text-orange-500 text-xl sm:text-2xl drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-md">
                    Sedang Trending
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-400 mt-0.5 font-medium">
                    Judul-judul terpanas yang sedang ramai dibicarakan komunitas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 relative z-10">
                {trendingAnime.map((anime) => (
                  <StandardAnimeWrapper key={anime.id} anime={anime} />
                ))}
              </div>

              {hasNextPage && (
                <div className="flex justify-center mt-8 sm:mt-12 relative z-10">
                  <button
                    onClick={handleLoadMore}
                    disabled={isFetchingMore}
                    className="btn-secondary py-3.5 px-6 sm:py-4 sm:px-8 text-xs sm:text-sm font-bold flex items-center gap-2.5 group active:scale-95"
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

      {/* MODAL GACHA ROULETTE ANIME (Lazy Loaded) */}
      {isRandomizerOpen && (
        <Suspense fallback={null}>
          <AnimeRandomizerModal
            isOpen={isRandomizerOpen}
            onClose={() => setIsRandomizerOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Home;
