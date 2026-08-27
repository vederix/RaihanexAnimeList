import { useState, useEffect, useRef, useCallback } from "react";
import { FaSearch, FaTimes, FaStar, FaHeart, FaFire, FaChartBar, FaFilm } from "react-icons/fa";
import { fetchAniList } from "../utils/anilist";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const SEARCH_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 5) {
      media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
        id
        title { romaji english }
        coverImage { medium }
        seasonYear
      }
    }
  }
`;

const ANIME_DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english }
      coverImage { extraLarge }
      averageScore
      popularity
      favourites
      trending
      episodes
      status
      seasonYear
      format
      genres
      studios(isMain: true) { nodes { name } }
    }
  }
`;

export default function Compare() {
  const [leftAnime, setLeftAnime] = useState(null);
  const [rightAnime, setRightAnime] = useState(null);

  const fetchAnimeDetails = useCallback(async (id, side) => {
    try {
      const data = await fetchAniList(ANIME_DETAIL_QUERY, { id });
      if (data?.Media) {
        if (side === "left") setLeftAnime(data.Media);
        else setRightAnime(data.Media);
      } else {
        toast.error("Anime tidak ditemukan.");
      }
    } catch (err) {
      console.error("Gagal memuat detail anime untuk perbandingan:", err);
      toast.error("Gagal memuat data anime. Coba lagi.");
    }
  }, []);

  return (
    <div className="pt-24 min-h-screen px-4 pb-12 max-w-7xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300 drop-shadow-md">
          ANIME HEAD-TO-HEAD
        </h1>
        <p className="text-gray-400 text-sm mt-2 font-medium">
          Bandingkan dua anime secara berdampingan untuk menentukan pilihan tontonanmu.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 relative">
        {/* Kolom Kiri */}
        <div className="glass-card p-6 flex flex-col h-full rounded-2xl animate-scale-up border-t border-red-900/50">
          {!leftAnime ? (
            <SearchAnimeBox side="left" onSelect={(id) => fetchAnimeDetails(id, "left")} />
          ) : (
            <AnimeCard side="left" anime={leftAnime} onRemove={() => setLeftAnime(null)} opponent={rightAnime} />
          )}
        </div>

        {/* Kolom Kanan */}
        <div className="glass-card p-6 flex flex-col h-full rounded-2xl animate-scale-up border-t border-red-900/50">
          {!rightAnime ? (
            <SearchAnimeBox side="right" onSelect={(id) => fetchAnimeDetails(id, "right")} />
          ) : (
            <AnimeCard side="right" anime={rightAnime} onRemove={() => setRightAnime(null)} opponent={leftAnime} />
          )}
        </div>

        {/* VS Label - Tengah */}
        <div className="hidden lg:flex absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.8)] items-center justify-center font-black text-white text-2xl z-10 border-4 border-[#0a0a0a]">
          VS
        </div>
      </div>
    </div>
  );
}

function SearchAnimeBox({ side, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (!query.trim()) {
      timeoutRef.current = setTimeout(() => {
        if (!isCancelled) setResults([]);
      }, 0);
      return () => { isCancelled = true; clearTimeout(timeoutRef.current); };
    }

    timeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await fetchAniList(SEARCH_QUERY, { search: query });
        if (!isCancelled) setResults(data?.Page?.media || []);
      } catch {
        // Fallback
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }, 500);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutRef.current);
    };
  }, [query]);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
      <div className="w-full max-w-sm relative">
        <div className="relative">
          <input
            type="text"
            placeholder={`Cari anime ke-${side === "left" ? "1" : "2"}...`}
            className="w-full input-field px-12 py-4 font-medium text-lg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
          {isLoading && (
            <div className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>

        {results.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20">
            {results.map((anime) => (
              <button
                key={anime.id}
                onClick={() => onSelect(anime.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
              >
                <img src={anime.coverImage.medium} alt={anime.title.romaji} className="w-12 h-16 object-cover rounded-md" />
                <div>
                  <h4 className="text-white font-bold text-sm line-clamp-1">{anime.title.romaji}</h4>
                  <span className="text-gray-400 text-xs">{anime.seasonYear || "TBA"}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AnimeCard({ anime, opponent, onRemove }) {
  const getWinnerClass = (myVal, oppVal, isLowerBetter = false) => {
    if (!opponent) return "text-white";
    if (myVal === oppVal) return "text-yellow-400";
    if (isLowerBetter) {
      return myVal < oppVal ? "text-green-400 font-bold" : "text-red-400";
    }
    return myVal > oppVal ? "text-green-400 font-bold" : "text-red-400";
  };

  const getBarColor = (myVal, oppVal, isLowerBetter = false) => {
    if (!opponent) return "bg-red-500";
    if (myVal === oppVal) return "bg-yellow-400";
    if (isLowerBetter) return myVal < oppVal ? "bg-green-500" : "bg-red-500";
    return myVal > oppVal ? "bg-green-500" : "bg-red-500";
  };

  const calculateWidth = (myVal, oppVal, isLowerBetter = false) => {
    if (!opponent || !myVal || !oppVal) return "50%";
    const max = Math.max(myVal, oppVal);
    if (isLowerBetter) {
      if (myVal === 0) return "0%";
      return `${Math.min(Math.max((oppVal / (myVal + oppVal)) * 100, 10), 90)}%`;
    }
    return `${(myVal / max) * 100}%`;
  };

  const formatNumber = (num) => (num ? num.toLocaleString() : "-");

  return (
    <div className="relative flex flex-col items-center">
      <button onClick={onRemove} className="absolute top-0 right-0 bg-red-950/80 hover:bg-red-600 text-red-200 hover:text-white p-2 rounded-xl transition-colors z-10 border border-red-500/30 shadow-lg">
        <FaTimes />
      </button>

      <img src={anime.coverImage.extraLarge} alt={anime.title.romaji} className="w-48 h-64 object-cover rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] mb-4 border border-white/10" />
      
      <Link to={`/anime/${anime.id}`} className="text-xl font-black text-white hover:text-red-400 transition-colors text-center line-clamp-2 mb-1 drop-shadow-md">
        {anime.title.romaji}
      </Link>
      
      <div className="flex flex-wrap justify-center gap-2 mb-6 mt-2">
        <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-bold text-gray-300">{anime.format || "TV"}</span>
        <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-bold text-gray-300">{anime.seasonYear || "TBA"}</span>
        <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-bold text-gray-300 line-clamp-1 max-w-[120px]">{anime.studios?.nodes?.[0]?.name || "Unknown Studio"}</span>
      </div>

      <div className="w-full space-y-5">
        <StatRow 
          icon={<FaStar className="text-yellow-400"/>} 
          label="Skor Rata-rata" 
          value={`${anime.averageScore || 0}%`}
          barColor={getBarColor(anime.averageScore, opponent?.averageScore)}
          barWidth={calculateWidth(anime.averageScore, opponent?.averageScore)}
          textColor={getWinnerClass(anime.averageScore, opponent?.averageScore)}
        />
        <StatRow 
          icon={<FaHeart className="text-pink-500"/>} 
          label="Difavoritkan" 
          value={formatNumber(anime.favourites)}
          barColor={getBarColor(anime.favourites, opponent?.favourites)}
          barWidth={calculateWidth(anime.favourites, opponent?.favourites)}
          textColor={getWinnerClass(anime.favourites, opponent?.favourites)}
        />
        <StatRow 
          icon={<FaFire className="text-orange-500"/>} 
          label="Peringkat Popularitas" 
          value={`#${formatNumber(anime.popularity)}`}
          barColor={getBarColor(anime.popularity, opponent?.popularity, true)}
          barWidth={calculateWidth(anime.popularity, opponent?.popularity, true)}
          textColor={getWinnerClass(anime.popularity, opponent?.popularity, true)}
        />
        <StatRow 
          icon={<FaChartBar className="text-blue-400"/>} 
          label="Sedang Tren" 
          value={formatNumber(anime.trending)}
          barColor={getBarColor(anime.trending, opponent?.trending)}
          barWidth={calculateWidth(anime.trending, opponent?.trending)}
          textColor={getWinnerClass(anime.trending, opponent?.trending)}
        />
        <StatRow 
          icon={<FaFilm className="text-purple-400"/>} 
          label="Jumlah Episode" 
          value={anime.episodes || "Ongoing"}
          barColor={getBarColor(anime.episodes, opponent?.episodes)}
          barWidth={calculateWidth(anime.episodes, opponent?.episodes)}
          textColor={getWinnerClass(anime.episodes, opponent?.episodes)}
        />
      </div>

      <div className="w-full mt-6">
        <h4 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider text-center">Genre</h4>
        <div className="flex flex-wrap justify-center gap-2">
          {anime.genres?.map(g => (
            <span key={g} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatRow({ icon, label, value, barColor, barWidth, textColor }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between items-center text-sm font-bold">
        <div className="flex items-center gap-2 text-gray-400">
          {icon} <span>{label}</span>
        </div>
        <span className={`${textColor}`}>{value}</span>
      </div>
      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`} style={{ width: barWidth }}></div>
      </div>
    </div>
  );
}
