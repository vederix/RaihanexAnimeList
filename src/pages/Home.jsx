import { useState, useEffect } from "react";
import AnimeCard from "../components/AnimeCard";
import SkeletonCard from "../components/SkeletonCard";
import { fetchAniList } from "../utils/anilist";
import { supabase } from "../supabaseClient";
import { FaFire, FaCalendarAlt, FaMagic, FaClock } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";

// 1. QUERY TRENDING (Sama seperti sebelumnya)
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

// 2. QUERY JADWAL RILIS (Mengambil anime yang akan tayang dalam waktu dekat)
const AIRING_QUERY = `
  query {
    Page(page: 1, perPage: 5) {
      airingSchedules(notYetAired: true, sort: TIME) {
        episode
        timeUntilAiring
        media {
          id title { romaji english } coverImage { large } averageScore format seasonYear
        }
      }
    }
  }
`;

// 3. QUERY REKOMENDASI PINTAR (Berdasarkan ID anime favorit user)
const RECOM_QUERY = `
  query ($id: Int) {
    Media(id: $id) {
      title { romaji }
      recommendations(sort: RATING_DESC, perPage: 5) {
        edges {
          node {
            mediaRecommendation {
              id title { romaji english } coverImage { large } averageScore format seasonYear
            }
          }
        }
      }
    }
  }
`;

const Home = () => {
  const [trendingAnime, setTrendingAnime] = useState([]);
  const [airingAnime, setAiringAnime] = useState([]);
  const [recommendedAnime, setRecommendedAnime] = useState([]);
  const [baseRecomTitle, setBaseRecomTitle] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Ambil Sesi User dari Supabase
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Ambil Jadwal Tayang (Airing) & Trending secara paralel
      const [airingData, trendingData] = await Promise.all([
        fetchAniList(AIRING_QUERY),
        fetchAniList(TRENDING_QUERY, { page: 1 }),
      ]);

      setAiringAnime(airingData.Page.airingSchedules);
      setTrendingAnime(trendingData.Page.media);
      setHasNextPage(trendingData.Page.pageInfo.hasNextPage);

      // --- LOGIKA REKOMENDASI CERDAS (KDD) ---
      if (session?.user) {
        // Cari 1 anime di watchlist user dengan rating tertinggi (>= 8)
        const { data: topAnime } = await supabase
          .from("watchlist")
          .select("mal_id")
          .eq("user_id", session.user.id)
          .gte("rating_pribadi", 8)
          .limit(1);

        if (topAnime && topAnime.length > 0) {
          const recomData = await fetchAniList(RECOM_QUERY, {
            id: topAnime[0].mal_id,
          });
          const animeNodes = recomData.Media.recommendations.edges
            .map((edge) => edge.node.mediaRecommendation)
            .filter((anime) => anime !== null); // Filter null data dari AniList

          setBaseRecomTitle(recomData.Media.title.romaji);
          setRecommendedAnime(animeNodes);
        }
      }
    } catch (error) {
      console.error("Gagal memuat dasbor:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    setIsFetchingMore(true);
    const nextPage = page + 1;
    try {
      const data = await fetchAniList(TRENDING_QUERY, { page: nextPage });
      setTrendingAnime((prev) => [...prev, ...data.Page.media]);
      setHasNextPage(data.Page.pageInfo.hasNextPage);
      setPage(nextPage);
    } catch (error) {
      console.error("Gagal load more:", error);
    } finally {
      setIsFetchingMore(false);
    }
  };

  // Fungsi mengubah detik menjadi format Jam/Hari
  const formatTimeAiring = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} hari lagi`;
    return `${hours} jam lagi`;
  };

  return (
    <div className="pb-16 relative z-10">
      {/* HEADER HERO */}
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center mb-12">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 tracking-tight drop-shadow-xl text-white mt-10">
          Temukan{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300">
            Anime
          </span>{" "}
          Favoritmu
        </h1>
        <p className="text-red-100/70 max-w-xl text-sm sm:text-lg font-medium px-4">
          Jelajahi jadwal rilis terbaru, ulasan komunitas, dan rekomendasi AI
          eksklusif di RAIHANEX.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-16">
          {/* SECTION 1: JADWAL RILIS TERDEKAT (AIRING SCHEDULE) */}
          <section>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FaCalendarAlt className="text-red-500 text-2xl drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                <h2 className="text-2xl font-bold text-white">
                  Jadwal Rilis Terdekat
                </h2>
              </div>
              <Link
                to="/schedule"
                className="text-xs sm:text-sm font-bold text-red-400 hover:text-white transition-colors bg-red-900/20 px-4 py-2 rounded-full border border-red-900/50 flex items-center gap-2 hover:bg-red-900/40 w-max"
              >
                Lihat Kalender Lengkap &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
              {airingAnime.map((schedule) => (
                <div key={schedule.media.id} className="relative group">
                  {/* Badge Notifikasi Episode & Waktu */}
                  <div className="absolute -top-3 -right-3 z-20 bg-gradient-to-r from-red-700 to-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-[0_5px_15px_rgba(220,38,38,0.5)] flex items-center gap-1.5 border border-red-400/50">
                    <FaClock /> Ep {schedule.episode}:{" "}
                    {formatTimeAiring(schedule.timeUntilAiring)}
                  </div>
                  <AnimeCard anime={schedule.media} />
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 2: SMART RECOMMENDATION (Muncul jika user login & punya rating tinggi) */}
          {recommendedAnime.length > 0 && (
            <section className="bg-red-900/10 border border-red-900/30 p-6 rounded-3xl backdrop-blur-sm relative overflow-hidden">
              <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-64 h-64 bg-red-600/10 rounded-full blur-[80px] pointer-events-none"></div>

              <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2 relative z-10">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <FaMagic className="text-amber-400 text-2xl drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                    <h2 className="text-2xl font-bold text-white">
                      Direkomendasikan Untukmu
                    </h2>
                  </div>
                  <p className="text-sm text-gray-400">
                    Karena kamu memberi rating tinggi pada{" "}
                    <b className="text-red-300">{baseRecomTitle}</b>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 relative z-10">
                {recommendedAnime.map((anime) => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </div>
            </section>
          )}

          {/* SECTION 3: SEDANG TRENDING */}
          <section>
            <div className="mb-6 flex items-center gap-3">
              <FaFire className="text-orange-500 text-2xl drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
              <h2 className="text-2xl font-bold text-white">Sedang Trending</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
              {trendingAnime.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>

            {hasNextPage && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={handleLoadMore}
                  disabled={isFetchingMore}
                  className="bg-black/40 hover:bg-red-900/40 backdrop-blur-md border border-red-900/50 hover:border-red-500 text-red-300 hover:text-white px-8 py-3.5 rounded-full transition-all shadow-[0_5px_20px_rgba(220,38,38,0.15)] font-bold tracking-wide flex items-center gap-2"
                >
                  {isFetchingMore ? "Memuat Anime..." : "Muat Lebih Banyak ↓"}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default Home;
