import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { fetchAniList } from "../utils/anilist";
import { sanitizeHtml } from "../utils/sanitize";
import CharacterModal from "../components/CharacterModal";
import ShareCardModal from "../components/ShareCardModal";
import CollectionModal from "../components/CollectionModal";
import ThemeSongsPlayer from "../components/ThemeSongsPlayer";
import AnimeTrackerCard from "../components/AnimeTrackerCard";
import AnimeInfoTable from "../components/AnimeInfoTable";
import AnimeAiringReminder from "../components/AnimeAiringReminder";
import AnimeRelations from "../components/AnimeRelations";
import AnimeReviewSection from "../components/AnimeReviewSection";
import { showConfirmToast } from "../utils/confirmToast.jsx";
import toast from "react-hot-toast";
import {
  FaStar,
  FaArrowLeft,
  FaYoutube,
  FaUsers,
} from "react-icons/fa";

// Query AniList lengkap (Karakter, Voice Actors, Relations, Next Airing Episode, Studios, Trailer)
const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id idMal title { romaji english native } 
      coverImage { large extraLarge } bannerImage 
      averageScore status episodes duration season seasonYear format source description(asHtml: true) genres 
      studios(isMain: true) { nodes { name } }
      trailer { id site }
      nextAiringEpisode { episode airingAt timeUntilAiring }
      characters(sort: [ROLE, RELEVANCE], perPage: 10) {
        edges { 
          role node { id name { full } image { large } } 
          voiceActors(language: JAPANESE, sort: RELEVANCE) { id name { full } image { large } } 
        }
      }
      relations {
        edges {
          relationType
          node {
            id title { romaji } coverImage { large } type format status averageScore
          }
        }
      }
    }
  }
`;

const REVIEWS_PER_PAGE = 20;

export default function AnimeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, displayName } = useAuth();

  const [anime, setAnime] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // STATE WATCHLIST & TRACKER
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [watchlistStatus, setWatchlistStatus] = useState("Plan to Watch");
  const [userRating, setUserRating] = useState(0);
  const [episodesWatched, setEpisodesWatched] = useState(0);
  const [isProcessingWatchlist, setIsProcessingWatchlist] = useState(false);

  // STATE ULASAN & DISKUSI
  const [reviews, setReviews] = useState([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [isLoadingMoreReviews, setIsLoadingMoreReviews] = useState(false);

  // STATE MODAL
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  // --- FETCH ULASAN SUPABASE ---
  const fetchReviews = useCallback(async (animeId, pageNum = 1) => {
    try {
      const from = (pageNum - 1) * REVIEWS_PER_PAGE;
      const to = from + REVIEWS_PER_PAGE - 1;

      const { data, error, count } = await supabase
        .from("reviews")
        .select("*", { count: "exact" })
        .eq("anilist_id", animeId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (pageNum === 1) {
        setReviews(data || []);
      } else {
        setReviews((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const filtered = (data || []).filter((r) => !existingIds.has(r.id));
          return [...prev, ...filtered];
        });
      }

      setHasMoreReviews((count || 0) > pageNum * REVIEWS_PER_PAGE);
      setReviewsPage(pageNum);
    } catch (err) {
      console.error("Gagal memuat ulasan:", err);
    }
  }, []);

  const handleLoadMoreReviews = async () => {
    if (isLoadingMoreReviews || !anime?.id) return;
    setIsLoadingMoreReviews(true);
    await fetchReviews(anime.id, reviewsPage + 1);
    setIsLoadingMoreReviews(false);
  };

  // --- CEK STATUS WATCHLIST ---
  const checkWatchlistStatus = useCallback(
    async (animeId) => {
      if (!user) {
        setIsInWatchlist(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("watchlist")
          .select("id, status_tontonan, rating_pribadi, episodes_watched, total_episodes")
          .eq("user_id", user.id)
          .eq("anilist_id", animeId)
          .maybeSingle();

        if (error) console.error("Gagal mengecek status watchlist:", error);

        if (data) {
          setIsInWatchlist(true);
          setWatchlistStatus(data.status_tontonan || "Plan to Watch");
          setUserRating(data.rating_pribadi || 0);
          setEpisodesWatched(data.episodes_watched || 0);
        } else {
          setIsInWatchlist(false);
          setWatchlistStatus("Plan to Watch");
          setUserRating(0);
          setEpisodesWatched(0);
        }
      } catch (err) {
        console.error("Gagal cek status watchlist:", err);
      }
    },
    [user]
  );

  // --- LOAD ANIME DETAIL ---
  useEffect(() => {
    let isCancelled = false;

    const fetchAnime = async () => {
      try {
        const parsedId = parseInt(id, 10);
        if (isNaN(parsedId)) {
          if (!isCancelled) setIsLoading(false);
          return;
        }

        const { data, error } = await fetchAniList(DETAIL_QUERY, { id: parsedId });
        if (error) throw new Error(error);
        const animeData = data?.Media;
        if (!isCancelled) {
          setAnime(animeData);
        }

        if (animeData?.title?.romaji) {
          document.title = `${animeData.title.romaji} - RAIHANEX`;
        }

        if (animeData?.id && !isCancelled) {
          await Promise.all([
            fetchReviews(animeData.id),
            checkWatchlistStatus(animeData.id),
          ]);
        }
      } catch (error) {
        console.error("Gagal memuat detail anime:", error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchAnime();

    return () => {
      isCancelled = true;
      document.title = "RAIHANEX - Anime List & Tracker";
    };
  }, [id, fetchReviews, checkWatchlistStatus]);

  // --- WATCHLIST HANDLERS ---
  const handleAddToWatchlist = async () => {
    if (!user) {
      toast.error("Kamu harus login dulu!", {
        style: { background: "#333", color: "#fff", borderRadius: "10px" },
      });
      return navigate("/auth");
    }
    setIsProcessingWatchlist(true);
    try {
      const { error } = await supabase.from("watchlist").upsert([
        {
          user_id: user.id,
          anilist_id: anime.id,
          title: anime.title?.romaji || anime.title?.english || "Anime",
          image_url: anime.coverImage?.large || "",
          score: anime.averageScore ? anime.averageScore / 10 : 0,
          status_tontonan: "Plan to Watch",
          rating_pribadi: 0,
          episodes_watched: 0,
          total_episodes: anime.episodes || null,
        },
      ]);
      if (error) throw error;
      setIsInWatchlist(true);
      setWatchlistStatus("Plan to Watch");
      setUserRating(0);
      setEpisodesWatched(0);
      toast.success("Ditambahkan ke Watchlist!");
      checkWatchlistStatus(anime.id);
    } catch (err) {
      toast.error(err?.message || "Gagal menambahkan ke Watchlist.");
    } finally {
      setIsProcessingWatchlist(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("watchlist")
        .update({ status_tontonan: newStatus })
        .eq("user_id", user.id)
        .eq("anilist_id", anime.id);

      if (error) throw error;
      setWatchlistStatus(newStatus);
      toast.success(`Status diubah: ${newStatus}`);
    } catch {
      toast.error("Gagal mengubah status.");
    }
  };

  const handleUpdateRating = async (newRating) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("watchlist")
        .update({ rating_pribadi: newRating })
        .eq("user_id", user.id)
        .eq("anilist_id", anime.id);

      if (error) throw error;
      setUserRating(newRating);
      toast.success("Rating pribadimu disimpan!");
    } catch {
      toast.error("Gagal menyimpan rating.");
    }
  };

  const handleUpdateEpisodes = async (newEpisodes) => {
    if (!user || newEpisodes < 0) return;
    try {
      const { error } = await supabase
        .from("watchlist")
        .update({ episodes_watched: newEpisodes })
        .eq("user_id", user.id)
        .eq("anilist_id", anime.id);

      if (error) throw error;
      setEpisodesWatched(newEpisodes);
    } catch {
      toast.error("Gagal menyimpan progress episode.");
    }
  };

  const handleRemoveFromWatchlist = () => {
    if (!user) return;
    showConfirmToast({
      title: "Hapus dari Watchlist?",
      message: `"${anime?.title?.romaji}" akan dihapus beserta progres dan rating kamu.`,
      confirmText: "Ya, Hapus",
      onConfirm: async () => {
        setIsProcessingWatchlist(true);
        try {
          if (!anime.id) throw new Error("Anime ID tidak valid");
          const { error } = await supabase
            .from("watchlist")
            .delete()
            .eq("user_id", user.id)
            .eq("anilist_id", anime.id);

          if (error) throw error;
          setIsInWatchlist(false);
          setWatchlistStatus("Plan to Watch");
          setUserRating(0);
          setEpisodesWatched(0);
          toast.success("Dihapus dari Watchlist!");
        } catch (err) {
          toast.error(err?.message || "Gagal menghapus dari Watchlist.");
        } finally {
          setIsProcessingWatchlist(false);
        }
      },
    });
  };

  const handleShare = () => {
    const shareData = {
      title: `Tonton ${anime?.title?.romaji || "Anime"} di RAIHANEX!`,
      text: `Lihat info lengkap, jadwal, dan ulasan anime ${
        anime?.title?.romaji || "Anime"
      } di RAIHANEX.`,
      url: window.location.href,
    };
    if (navigator.share) navigator.share(shareData).catch(() => {});
    else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link disalin ke clipboard!");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]"></div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
        <div className="glass-card p-8 sm:p-12 rounded-3xl text-center max-w-md w-full mx-auto shadow-[0_20px_40px_rgba(0,0,0,0.5)] animate-fade-in border border-red-500/30">
          <span className="text-5xl mb-4 block">🔍</span>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
            Anime Tidak Ditemukan
          </h2>
          <p className="text-zinc-400 text-sm mb-6">
            Data anime dengan ID ini tidak tersedia atau telah dihapus dari database AniList.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/search"
              className="btn-primary py-2.5 px-6 text-sm shadow-[0_0_20px_rgba(220,38,38,0.3)]"
            >
              Cari Anime Lain
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const cleanDescription = sanitizeHtml(anime.description || "Sinopsis belum tersedia.");

  return (
    <div className="pb-16 min-h-screen relative z-10 pt-16">
      {/* 1. HERO BANNER & KEMBALI */}
      <div className="relative w-full h-[35vh] md:h-[45vh] lg:h-[55vh] rounded-b-[3rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-b border-red-900/50">
        {anime.bannerImage ? (
          <img
            src={anime.bannerImage}
            alt="Banner"
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-950 via-black to-red-900/50"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050101] via-[#050101]/60 to-transparent"></div>

        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-4 md:left-8 btn-secondary px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold z-10 group inline-flex items-center gap-2 shadow-xl backdrop-blur-md cursor-pointer active:scale-95 transition-all"
        >
          <FaArrowLeft className="group-hover:-translate-x-1 transition-transform text-xs" />
          <span>Kembali</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-20 -mt-24 md:-mt-40">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          {/* 2. SIDEBAR KIRI (COVER, CONTROLLER WATCHLIST, INFO DETAIL, AIRING REMINDER) */}
          <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col gap-6 mx-auto md:mx-0 max-w-[280px] md:max-w-none">
            {/* Cover Poster Image */}
            <div className="rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.8)] border-2 border-red-900/50 relative group aspect-[2/3] bg-black">
              <img
                src={anime.coverImage?.extraLarge || anime.coverImage?.large}
                alt={anime.title?.romaji || "Poster"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md border border-yellow-500/50 text-white font-black px-3 py-1.5 rounded-xl text-lg shadow-lg flex items-center gap-1.5">
                <FaStar className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />{" "}
                {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "N/A"}
              </div>
            </div>

            {/* Interactive Tracker Controller */}
            <AnimeTrackerCard
              anime={anime}
              isInWatchlist={isInWatchlist}
              watchlistStatus={watchlistStatus}
              userRating={userRating}
              episodesWatched={episodesWatched}
              isProcessingWatchlist={isProcessingWatchlist}
              onAddToWatchlist={handleAddToWatchlist}
              onUpdateStatus={handleUpdateStatus}
              onUpdateRating={handleUpdateRating}
              onUpdateEpisodes={handleUpdateEpisodes}
              onRemoveFromWatchlist={handleRemoveFromWatchlist}
              onShare={handleShare}
              onShowShareCard={() => setShowShareCard(true)}
              onShowCollectionModal={() => {
                if (!user) return toast.error("Kamu harus login dulu!");
                setShowCollectionModal(true);
              }}
            />

            {/* Technical Specifications Table */}
            <AnimeInfoTable anime={anime} />

            {/* Next Airing Episode & Reminder Widget */}
            <AnimeAiringReminder anime={anime} user={user} />
          </div>

          {/* 3. AREA UTAMA KANAN (DESKRIPSI, RELASI, TRAILER, KARAKTER, THEMES, ULASAN) */}
          <div className="flex-1 flex flex-col gap-12 mt-4 md:mt-24">
            {/* Judul & Sinopsis Sanitasi */}
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-2 leading-tight tracking-tighter drop-shadow-lg">
                {anime.title?.romaji}
              </h1>
              <h2 className="text-lg md:text-xl text-gray-400 font-medium mb-6">
                {anime.title?.english || anime.title?.native}
              </h2>

              <div className="flex flex-wrap gap-2 mb-8">
                {anime.genres?.map((genre, index) => (
                  <span
                    key={index}
                    className="bg-red-900/20 text-red-300 px-4 py-1.5 rounded-lg text-sm font-bold border border-red-800/40 shadow-sm uppercase tracking-wider hover:bg-red-900/40 transition-colors cursor-default"
                  >
                    {genre}
                  </span>
                ))}
              </div>

              <div className="glass-card p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                <div
                  className="text-gray-300/90 text-sm sm:text-base leading-relaxed prose prose-invert prose-p:mb-4 prose-a:text-red-400 hover:prose-a:text-red-300 max-w-none text-justify"
                  dangerouslySetInnerHTML={{ __html: cleanDescription }}
                />
              </div>
            </div>

            {/* Relations Tree / Silsilah */}
            <AnimeRelations relations={anime.relations} />

            {/* YouTube Trailer Player */}
            {anime.trailer && anime.trailer.site === "youtube" && (
              <div>
                <div className="mb-6 flex items-center gap-4 border-b border-red-900/30 pb-4">
                  <div className="bg-red-900/30 p-3 rounded-xl border border-red-500/20 shadow-inner">
                    <FaYoutube className="text-red-500 text-xl drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    Trailer Resmi
                  </h3>
                </div>
                <div className="relative w-full aspect-video rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-4 border-red-900/30 bg-black group">
                  <iframe
                    src={`https://www.youtube.com/embed/${anime.trailer.id}?rel=0`}
                    title="Trailer"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full"
                  ></iframe>
                </div>
              </div>
            )}

            {/* Characters & Voice Actors Grid */}
            {anime.characters?.edges?.length > 0 && (
              <div>
                <div className="mb-6 flex items-center gap-4 border-b border-red-900/30 pb-4">
                  <div className="bg-blue-900/30 p-3 rounded-xl border border-blue-500/20 shadow-inner">
                    <FaUsers className="text-blue-400 text-xl drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    Karakter Utama
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {anime.characters.edges.map((edge, index) => {
                    const char = edge.node;
                    const va = edge.voiceActors?.[0];
                    return (
                      <button
                        key={`${char.id}-${index}`}
                        onClick={() => setSelectedCharacter(edge)}
                        className="w-full text-left glass-card glass-card-hover p-3 flex justify-between items-center shadow-lg group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 w-1/2">
                          <img
                            src={char.image?.large}
                            alt={char.name?.full || "Karakter"}
                            className="w-12 h-16 object-cover rounded-xl shadow-md border border-red-900/50 group-hover:scale-105 transition-transform"
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-white text-sm line-clamp-1">
                              {char.name?.full}
                            </span>
                            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">
                              {edge.role}
                            </span>
                          </div>
                        </div>
                        {va && (
                          <div className="flex items-center gap-3 w-1/2 justify-end text-right">
                            <div className="flex flex-col">
                              <span className="font-bold text-white text-sm line-clamp-1">
                                {va.name?.full}
                              </span>
                              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                                Jepang
                              </span>
                            </div>
                            <img
                              src={va.image?.large}
                              alt={va.name?.full || "Pengisi Suara"}
                              className="w-12 h-16 object-cover rounded-xl shadow-md border border-slate-800 group-hover:scale-105 transition-transform"
                            />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Official Soundtrack & Theme Songs Player */}
            <ThemeSongsPlayer
              idMal={anime.idMal}
              animeId={anime.id}
              animeTitle={anime.title?.romaji}
            />

            {/* Community Discussion & Reviews */}
            <AnimeReviewSection
              anime={anime}
              user={user}
              displayName={displayName}
              reviews={reviews}
              setReviews={setReviews}
              hasMoreReviews={hasMoreReviews}
              isLoadingMoreReviews={isLoadingMoreReviews}
              onLoadMoreReviews={handleLoadMoreReviews}
            />
          </div>
        </div>
      </div>

      {/* MODAL KARAKTER */}
      {selectedCharacter && (
        <CharacterModal
          characterEdge={selectedCharacter}
          onClose={() => setSelectedCharacter(null)}
        />
      )}

      {/* MODAL SHARE CARD */}
      {showShareCard && (
        <ShareCardModal
          anime={anime}
          userRating={userRating}
          onClose={() => setShowShareCard(false)}
        />
      )}

      {/* MODAL KOLEKSI */}
      <CollectionModal
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        animeId={anime.id}
        user={user}
      />
    </div>
  );
}
