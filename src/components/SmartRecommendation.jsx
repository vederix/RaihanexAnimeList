import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { fetchAniList } from "../utils/anilist";
import { FaMagic, FaStar } from "react-icons/fa";

// Query 1: Ambil metadata (genre) dari daftar anime di Watchlist
const GENRE_EXTRACTION_QUERY = `
  query ($idIn: [Int]) {
    Page(perPage: 50) {
      media(id_in: $idIn, type: ANIME) {
        genres
      }
    }
  }
`;

// Query 2: Cari anime baru berdasarkan genre dominan, kecualikan yang sudah ditonton
const RECOMMENDATION_QUERY = `
  query ($genreIn: [String], $idNotIn: [Int]) {
    Page(perPage: 4) {
      media(genre_in: $genreIn, id_not_in: $idNotIn, type: ANIME, sort: SCORE_DESC) {
        id
        title { romaji english }
        coverImage { large }
        averageScore
      }
    }
  }
`;

// Query Cadangan: Jika user belum punya Watchlist atau belum login, tampilkan yang sedang Trending
const TRENDING_QUERY = `
  query {
    Page(perPage: 4) {
      media(type: ANIME, sort: TRENDING_DESC) {
        id
        title { romaji english }
        coverImage { large }
        averageScore
      }
    }
  }
`;

const SmartRecommendation = () => {
  const { user, loading: authLoading } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [topGenres, setTopGenres] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const generateRecommendations = async () => {
      if (authLoading) return;

      setIsLoading(true);
      try {
        // Jika user belum login, tampilkan Anime Trending sebagai rekomendasi umum
        if (!user) {
          const trendingData = await fetchAniList(TRENDING_QUERY);
          if (!isCancelled) {
            setRecommendations(trendingData?.Page?.media || []);
            setTopGenres(["Trending"]);
          }
          return;
        }

        // FASE 1: Data Selection (Ambil Watchlist dari Supabase)
        const { data: watchlist } = await supabase
          .from("watchlist")
          .select("mal_id")
          .eq("user_id", user.id);

        const watchedIds = watchlist?.map((item) => item.mal_id) || [];

        // Jika Watchlist masih kosong, tampilkan Trending
        if (watchedIds.length === 0) {
          const trendingData = await fetchAniList(TRENDING_QUERY);
          if (!isCancelled) {
            setRecommendations(trendingData?.Page?.media || []);
            setTopGenres(["Trending Saat Ini"]);
          }
          return;
        }

        // FASE 2: Transformation (Ekstraksi Pola Genre - ambil max 50 ID)
        const genreData = await fetchAniList(GENRE_EXTRACTION_QUERY, {
          idIn: watchedIds.slice(0, 50),
        });
        const genreCounts = {};

        genreData?.Page?.media?.forEach((anime) => {
          anime.genres?.forEach((genre) => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          });
        });

        // Urutkan genre dari yang paling banyak ditonton, ambil 2 teratas
        const sortedGenres = Object.entries(genreCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map((entry) => entry[0]);

        if (sortedGenres.length === 0) {
          const trendingData = await fetchAniList(TRENDING_QUERY);
          if (!isCancelled) {
            setRecommendations(trendingData?.Page?.media || []);
            setTopGenres(["Trending"]);
          }
          return;
        }

        if (!isCancelled) {
          setTopGenres(sortedGenres);
        }

        // FASE 3: Data Mining (Cari Rekomendasi Akurat)
        const recData = await fetchAniList(RECOMMENDATION_QUERY, {
          genreIn: sortedGenres,
          idNotIn: watchedIds.slice(0, 50),
        });

        let recList = recData?.Page?.media || [];
        if (recList.length === 0) {
          const trendingData = await fetchAniList(TRENDING_QUERY);
          recList = trendingData?.Page?.media || [];
          if (!isCancelled) setTopGenres(["Trending"]);
        }

        if (!isCancelled) {
          setRecommendations(recList);
        }
      } catch (error) {
        console.error("Gagal memproses algoritma rekomendasi:", error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    generateRecommendations();

    return () => {
      isCancelled = true;
    };
  }, [user, authLoading]);

  if (isLoading) {
    return (
      <div className="bg-[#1a0505]/40 backdrop-blur-md border border-red-900/30 rounded-3xl p-8 mt-8 animate-pulse flex flex-col items-center justify-center h-48">
        <FaMagic className="text-red-500/50 text-4xl mb-4 animate-bounce" />
        <span className="text-red-300/70 font-medium text-sm">
          AI sedang menganalisis pola tontonanmu...
        </span>
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <div className="bg-[#1a0505]/60 backdrop-blur-xl border border-red-900/40 rounded-3xl p-6 md:p-8 mt-8 shadow-[0_20px_50px_rgba(220,38,38,0.1)] relative overflow-hidden group">
      {/* Efek Cahaya Latar */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-red-600/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-red-600/20 transition-all duration-700"></div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 relative z-10 border-b border-red-900/30 pb-4">
        <div>
          <h3 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3 tracking-tight">
            <FaMagic className="text-red-500" /> Rekomendasi Pintar
          </h3>
          <p className="text-sm text-gray-400 mt-2">
            Hasil ekstraksi pola data dari koleksi anime di RAIHANEX.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {topGenres.map((genre, idx) => (
            <span
              key={idx}
              className="bg-gradient-to-r from-red-900/60 to-red-800/60 border border-red-500/30 text-red-200 text-xs font-bold px-3 py-1.5 rounded-lg shadow-inner uppercase tracking-wider"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
        {recommendations.map((anime) => (
          <Link
            to={`/anime/${anime.id}`}
            key={anime.id}
            className="relative rounded-2xl overflow-hidden border border-red-900/30 shadow-lg hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:border-red-500/60 transition-all duration-300 group/card block aspect-[3/4]"
          >
            <img
              src={anime.coverImage?.large}
              alt={anime.title?.romaji || anime.title?.english || "Anime Cover"}
              className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-90 group-hover/card:opacity-100 transition-opacity"></div>

            <div className="absolute bottom-0 left-0 w-full p-4 flex flex-col justify-end translate-y-2 group-hover/card:translate-y-0 transition-transform">
              <h4 className="text-white font-bold text-sm line-clamp-2 leading-snug group-hover/card:text-red-300 transition-colors">
                {anime.title?.romaji || anime.title?.english}
              </h4>
              <div className="flex items-center gap-1.5 mt-2">
                <FaStar className="text-yellow-400 text-[10px]" />
                <span className="text-white text-xs font-bold">
                  {anime.averageScore
                    ? (anime.averageScore / 10).toFixed(1)
                    : "N/A"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SmartRecommendation;
