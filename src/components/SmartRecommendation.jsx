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
          const { data: trendingData, error: trendingError } = await fetchAniList(TRENDING_QUERY);
          if (trendingError) throw new Error(trendingError);
          if (!isCancelled) {
            setRecommendations(trendingData?.Page?.media || []);
            setTopGenres(["Trending"]);
          }
          return;
        }

        // FASE 1: Data Selection (Ambil Watchlist dari Supabase)
        const { data: watchlist } = await supabase
          .from("watchlist")
          .select("anilist_id")
          .eq("user_id", user.id);

        const watchedIds = watchlist?.map((item) => item.anilist_id) || [];

        // Jika Watchlist masih kosong, tampilkan Trending
        if (watchedIds.length === 0) {
          const { data: trendingData, error: trendingError } = await fetchAniList(TRENDING_QUERY);
          if (trendingError) throw new Error(trendingError);
          if (!isCancelled) {
            setRecommendations(trendingData?.Page?.media || []);
            setTopGenres(["Trending Saat Ini"]);
          }
          return;
        }

        // FASE 2: Transformation (Ekstraksi Pola Genre - ambil max 50 ID)
        const { data: genreData, error: genreError } = await fetchAniList(GENRE_EXTRACTION_QUERY, {
          idIn: watchedIds.slice(0, 50),
        });
        if (genreError) throw new Error(genreError);

        // Komputasi genre dominan dengan Web Worker + Fallback Sinkron + Timeout Safety
        const sortedGenres = await new Promise((resolve) => {
          // Helper fallback sinkron jika worker gagal/timeout
          const fallbackCompute = () => {
            try {
              const media = genreData?.Page?.media || [];
              const genreCounts = {};
              media.forEach((anime) => {
                if (Array.isArray(anime?.genres)) {
                  anime.genres.forEach((g) => {
                    if (g) genreCounts[g] = (genreCounts[g] || 0) + 1;
                  });
                }
              });
              return Object.entries(genreCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 2)
                .map((entry) => entry[0]);
            } catch {
              return [];
            }
          };

          try {
            if (typeof Worker === "undefined") {
              return resolve(fallbackCompute());
            }

            const worker = new Worker(
              new URL("../workers/recommendation.worker.js", import.meta.url),
              { type: "module" }
            );

            const timer = setTimeout(() => {
              try {
                worker.terminate();
              } catch (termErr) {
                console.warn("Worker termination error:", termErr);
              }
              resolve(fallbackCompute());
            }, 3000); // 3 detik safety timeout

            worker.onmessage = (e) => {
              clearTimeout(timer);
              try {
                worker.terminate();
              } catch (termErr) {
                console.warn("Worker termination error:", termErr);
              }
              resolve(e.data?.sortedGenres || fallbackCompute());
            };

            worker.onerror = (err) => {
              clearTimeout(timer);
              console.warn("SmartRecommendation worker error, beralih ke fallback:", err);
              try {
                worker.terminate();
              } catch (termErr) {
                console.warn("Worker termination error:", termErr);
              }
              resolve(fallbackCompute());
            };

            worker.postMessage({ watchedIds, genreData });
          } catch (workerErr) {
            console.warn("Gagal inisialisasi worker:", workerErr);
            resolve(fallbackCompute());
          }
        });

        if (sortedGenres.length === 0) {
          const { data: trendingData, error: trendingError } = await fetchAniList(TRENDING_QUERY);
          if (trendingError) throw new Error(trendingError);
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
        const { data: recData, error: recError } = await fetchAniList(RECOMMENDATION_QUERY, {
          genreIn: sortedGenres,
          idNotIn: watchedIds.slice(0, 50),
        });
        if (recError) throw new Error(recError);

        let recList = recData?.Page?.media || [];
        if (recList.length === 0) {
          const { data: trendingData, error: trendingError } = await fetchAniList(TRENDING_QUERY);
          if (trendingError) throw new Error(trendingError);
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
      <div className="glass-card p-8 mt-8 animate-pulse flex flex-col items-center justify-center h-48 rounded-3xl">
        <FaMagic className="text-red-500/80 text-4xl mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
        <span className="text-red-400 font-black text-sm uppercase tracking-widest drop-shadow-md">
          AI sedang menganalisis pola tontonanmu...
        </span>
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <div className="mt-8 glass-card rounded-3xl p-6 md:p-8 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden group animate-fade-in">
      {/* Efek Cahaya Latar */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-red-600/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-red-600/20 transition-all duration-700"></div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 relative z-10 border-b border-red-900/30 pb-5">
        <div>
          <h3 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 tracking-tight drop-shadow-md">
            <FaMagic className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" /> Rekomendasi Pintar
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 mt-2 font-medium">
            Hasil ekstraksi pola data dari koleksi anime di RAIHANEX.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {topGenres.map((genre, idx) => (
            <span
              key={idx}
              className="bg-red-950/80 border border-red-500/40 text-red-300 text-[10px] font-black px-3.5 py-1.5 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.2)] uppercase tracking-widest"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 relative z-10">
        {recommendations.map((anime) => (
          <Link
            to={`/anime/${anime.id}`}
            key={anime.id}
            className="glass-card glass-card-hover rounded-2xl overflow-hidden group/card block aspect-[3/4]"
          >
            <div className="relative w-full h-full">
              <img
                src={anime.coverImage?.large}
                alt={anime.title?.romaji || anime.title?.english || "Anime Cover"}
                className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0202] via-[#0a0202]/40 to-transparent opacity-90 group-hover/card:opacity-100 transition-opacity"></div>

              <div className="absolute bottom-0 left-0 w-full p-4 flex flex-col justify-end translate-y-2 group-hover/card:translate-y-0 transition-transform">
                <h4 className="text-white font-bold text-sm line-clamp-2 leading-snug group-hover/card:text-red-400 transition-colors drop-shadow-md">
                  {anime.title?.romaji || anime.title?.english}
                </h4>
                <div className="flex items-center gap-1.5 mt-2 badge-status bg-black/80 border-yellow-500/50 w-fit">
                  <FaStar className="text-yellow-400 text-[10px]" />
                  <span className="text-white text-[10px] font-black mt-0.5">
                    {anime.averageScore
                      ? (anime.averageScore / 10).toFixed(1)
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SmartRecommendation;
