import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { fetchAniList } from "../utils/anilist";
import CharacterModal from "../components/CharacterModal";
import ShareCardModal from "../components/ShareCardModal";
import CollectionModal from "../components/CollectionModal";
import ThemeSongsPlayer from "../components/ThemeSongsPlayer";
import { generateGoogleCalendarUrl, downloadIcsFile } from "../utils/calendar";
import toast from "react-hot-toast";
import { showConfirmToast } from "../utils/confirmToast.jsx";
import {
  FaStar,
  FaArrowLeft,
  FaYoutube,
  FaUsers,
  FaComments,
  FaPaperPlane,
  FaTrash,
  FaShareAlt,
  FaHeart,
  FaRegHeart,
  FaPen,
  FaReply,
  FaEyeSlash,
  FaFire,
  FaClock,
  FaInfoCircle,
  FaSitemap,
  FaTv,
  FaBook,
  FaBookmark,
  FaPlay,
  FaCheck,
  FaPlus,
  FaMinus,
  FaLayerGroup,
  FaCalendarPlus,
  FaBell,
  FaDownload,
  FaImage,
} from "react-icons/fa";

// 1. QUERY ANILIST DIPERLUAS (Termasuk Relations, idMal, nextAiringEpisode)
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

// Helper untuk Silsilah
const translateRelation = (type) => {
  const types = {
    ADAPTATION: "Adaptasi",
    PREQUEL: "Prekuel",
    SEQUEL: "Sekuel",
    PARENT: "Cerita Utama",
    SIDE_STORY: "Side Story",
    CHARACTER: "Karakter",
    SUMMARY: "Ringkasan",
    ALTERNATIVE: "Versi Alternatif",
    SPIN_OFF: "Spin-off",
    OTHER: "Lainnya",
  };
  return types[type] || type;
};

const AnimeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, displayName } = useAuth();

  const [anime, setAnime] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // STATE WATCHLIST & TRACKER LENGKAP
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [watchlistStatus, setWatchlistStatus] = useState("Plan to Watch");
  const [userRating, setUserRating] = useState(0);
  const [episodesWatched, setEpisodesWatched] = useState(0);
  const [watchlistId, setWatchlistId] = useState(null);
  const [isProcessingWatchlist, setIsProcessingWatchlist] = useState(false);

  // STATE ULASAN & FITUR KOMUNITAS
  const [reviews, setReviews] = useState([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [isLoadingMoreReviews, setIsLoadingMoreReviews] = useState(false);
  const REVIEWS_PER_PAGE = 20;

  const [reviewInput, setReviewInput] = useState("");
  const [isSpoilerInput, setIsSpoilerInput] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);

  const [replyingTo, setReplyingTo] = useState(null);
  const [replyInput, setReplyInput] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [sortBy, setSortBy] = useState("terbaru");
  const [revealedSpoilers, setRevealedSpoilers] = useState([]);

  // STATE MODAL
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

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
          setWatchlistId(data.id);
          setWatchlistStatus(data.status_tontonan || "Plan to Watch");
          setUserRating(data.rating_pribadi || 0);
          setEpisodesWatched(data.episodes_watched || 0);
        } else {
          setIsInWatchlist(false);
          setWatchlistId(null);
          setWatchlistStatus("Plan to Watch");
          setUserRating(0);
          setEpisodesWatched(0);
        }
      } catch (err) {
        console.error("Gagal cek status watchlist:", err);
      }
    },
    [user],
  );

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

  // --- KONTROL TRACKER & WATCHLIST ---
  const handleAddToWatchlist = async () => {
    if (!user) {
      toast.error("Kamu harus login dulu!", {
        style: { background: "#333", color: "#fff", borderRadius: "10px" },
      });
      return navigate("/auth");
    }
    setIsProcessingWatchlist(true);
    try {
      const { error } = await supabase.from("watchlist").insert([
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
      if (error) {
        console.error("Watchlist Insert Error:", JSON.stringify(error, null, 2));
        throw error;
      }
      setIsInWatchlist(true);
      setWatchlistStatus("Plan to Watch");
      setUserRating(0);
      setEpisodesWatched(0);
      toast.success("Ditambahkan ke Watchlist!");
      
      // Re-fetch to get the new watchlist ID
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
    if (!user) return;
    if (newEpisodes < 0) return;
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

          if (error) {
            console.error("Watchlist Delete Error:", JSON.stringify(error, null, 2));
            throw error;
          }
          setIsInWatchlist(false);
          setWatchlistStatus("Plan to Watch");
          setUserRating(0);
          toast.success("Dihapus dari Watchlist!");
        } catch (err) {
          toast.error(err?.message || "Gagal menghapus dari Watchlist.");
          } finally {
          setIsProcessingWatchlist(false);
        }
      },
    });
  };

  // --- LOGIKA PENGINGAT JADWAL TAYANG (REMINDER) ---
  const handleSaveReminder = async () => {
    if (!user) {
      return toast.error("Silakan masuk akun untuk menyimpan pengingat!");
    }
    if (!anime?.nextAiringEpisode) return;

    try {
      const { error } = await supabase.from("user_reminders").upsert([
        {
          user_id: user.id,
          anime_id: anime.id,
          anime_title: anime.title?.romaji || "Anime",
          anime_image: anime.coverImage?.large || "",
          episode: anime.nextAiringEpisode.episode,
          airing_at: anime.nextAiringEpisode.airingAt,
        },
      ]);

      if (error) throw error;
      toast.success("Pengingat episode baru berhasil disimpan ke akun! 🔔");
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan pengingat.");
    }
  };

  // --- LOGIKA ULASAN & KOMUNITAS ---
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      return toast.error("Kamu harus login dulu!", {
        style: { background: "#333", color: "#fff", borderRadius: "10px" },
      });
    }
    if (!reviewInput.trim()) return toast.error("Ulasan tidak boleh kosong!");
    setIsSubmittingReview(true);
    try {
      const newReview = {
        user_id: user.id,
        anilist_id: anime.id,
        user_email: user.email,
        user_name: displayName,
        content: reviewInput.trim(),
        liked_by: [],
        is_spoiler: isSpoilerInput,
        parent_id: null,
      };
      const { data, error } = await supabase
        .from("reviews")
        .insert([newReview])
        .select();
      if (error) throw error;
      setReviews((prev) => [data[0], ...prev]);
      setReviewInput("");
      setIsSpoilerInput(false);
      toast.success("Ulasan berhasil diposting!");
    } catch (err) {
      console.error("Gagal mengirim ulasan:", err);
      toast.error(err?.message || "Gagal mengirim ulasan.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleSubmitReply = async (parentId) => {
    if (!user) return toast.error("Kamu harus login dulu!");
    if (!replyInput.trim()) return toast.error("Balasan tidak boleh kosong!");
    setIsSubmittingReply(true);
    try {
      const newReply = {
        user_id: user.id,
        anilist_id: anime.id,
        user_email: user.email,
        user_name: displayName,
        content: replyInput.trim(),
        liked_by: [],
        is_spoiler: false,
        parent_id: parentId,
      };
      const { data, error } = await supabase
        .from("reviews")
        .insert([newReply])
        .select();
      if (error) throw error;
      setReviews((prev) => [...prev, data[0]]);
      setReplyingTo(null);
      setReplyInput("");
      toast.success("Balasan terkirim!");
    } catch (err) {
      console.error("Gagal mengirim balasan:", err);
      toast.error(err?.message || "Gagal mengirim balasan.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const executeDeleteReview = async (reviewId) => {
    try {
      // Coba hapus balasan jika ada izin (jika RLS membatasi, fallback ke penghapusan ulasan induk/cascade)
      try {
        await supabase.from("reviews").delete().eq("parent_id", reviewId);
      } catch (replyErr) {
        console.warn("Cascade delete balasan diabaikan:", replyErr);
      }

      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId)
        .eq("user_id", user.id);

      if (error) throw error;
      setReviews((prev) =>
        prev.filter((r) => r.id !== reviewId && r.parent_id !== reviewId),
      );
      toast.success("Ulasan dihapus.");
    } catch {
      toast.error("Gagal menghapus ulasan.");
    }
  };

  const confirmDeleteReview = (reviewId) => {
    showConfirmToast({
      title: "Hapus Ulasan?",
      message: "Tindakan ini tidak dapat dibatalkan.",
      confirmText: "Hapus",
      onConfirm: () => executeDeleteReview(reviewId),
    });
  };

  const handleUpdateReview = async (reviewId) => {
    if (!editContent.trim()) return toast.error("Tidak boleh kosong!");
    setIsUpdatingReview(true);
    try {
      const { error } = await supabase
        .from("reviews")
        .update({ content: editContent.trim() })
        .eq("id", reviewId)
        .eq("user_id", user.id);
      if (error) throw error;
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, content: editContent.trim() } : r,
        ),
      );
      toast.success("Ulasan diperbarui!");
      setEditingReviewId(null);
    } catch {
      toast.error("Gagal memperbarui.");
    } finally {
      setIsUpdatingReview(false);
    }
  };

  const handleLikeReview = async (reviewId, currentLikes) => {
    if (!user) return toast.error("Login dulu untuk menyukai ulasan!");
    const likesArray = currentLikes || [];
    const hasLiked = likesArray.includes(user.id);
    const newLikes = hasLiked
      ? likesArray.filter((uId) => uId !== user.id)
      : [...likesArray, user.id];

    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, liked_by: newLikes } : r)),
    );
    try {
      const { error } = await supabase
        .from("reviews")
        .update({ liked_by: newLikes })
        .eq("id", reviewId);
      if (error) throw error;
    } catch (err) {
      console.error("Gagal update like ulasan:", err);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, liked_by: likesArray } : r,
        ),
      );
      toast.error("Gagal memperbarui like ulasan.");
    }
  };

  const handleShare = () => {
    const shareData = {
      title: `Tonton ${anime?.title?.romaji || "Anime"} di RAIHANEX!`,
      text: `Lihat info lengkap, jadwal, dan ulasan anime ${anime?.title?.romaji || "Anime"} di RAIHANEX.`,
      url: window.location.href,
    };
    if (navigator.share) navigator.share(shareData).catch(() => {});
    else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link disalin ke clipboard!");
    }
  };

  const mainReviews = reviews.filter((r) => !r.parent_id);
  const getReplies = (parentId) =>
    reviews
      .filter((r) => r.parent_id === parentId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const sortedMainReviews = [...mainReviews].sort((a, b) => {
    if (sortBy === "terbaru")
      return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === "terpopuler")
      return (b.liked_by?.length || 0) - (a.liked_by?.length || 0);
    return 0;
  });

  if (isLoading)
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]"></div>
      </div>
    );

  if (!anime)
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

  // --- KOMPONEN RENDER ULASAN ---
  const renderReviewBox = (review, isReply = false) => {
    const reviewerName =
      review.user_name ||
      (review.user_email ? review.user_email.split("@")[0] : "Pengguna");
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewerName)}&background=dc2626&color=fff&size=128&bold=true`;
    const isOwner = user && user.id === review.user_id;
    const isEditing = editingReviewId === review.id;
    const likesArray = review.liked_by || [];
    const hasLiked = user && likesArray.includes(user.id);
    const isSpoilerHidden =
      review.is_spoiler && !revealedSpoilers.includes(review.id);

    return (
      <div
        key={review.id}
        className={`${isReply ? "ml-8 sm:ml-12 mt-3 border-l-2 border-red-900/40 pl-4" : "glass-card p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"} transition-all hover:border-red-500/50 relative group`}
      >
        {isOwner && !isEditing && (
          <div
            className={`absolute ${isReply ? "-top-1 right-0" : "top-4 right-4"} flex gap-2 opacity-0 group-hover:opacity-100 transition-all`}
          >
            <button
              onClick={() => {
                setEditingReviewId(review.id);
                setEditContent(review.content);
              }}
              className="text-gray-400 hover:text-blue-400 p-1.5 bg-black/50 rounded-lg backdrop-blur-sm border border-white/10 cursor-pointer"
              title="Edit"
            >
              <FaPen size={12} />
            </button>
            <button
              onClick={() => confirmDeleteReview(review.id)}
              className="text-gray-400 hover:text-red-500 p-1.5 bg-black/50 rounded-lg backdrop-blur-sm border border-white/10 cursor-pointer"
              title="Hapus"
            >
              <FaTrash size={12} />
            </button>
          </div>
        )}

        <div className="flex items-start gap-4">
          <img
            src={avatar}
            alt="Avatar"
            className={`${isReply ? "w-8 h-8" : "w-10 h-10 sm:w-12 sm:h-12"} rounded-full border-2 border-red-500/50 flex-shrink-0 shadow-md`}
          />
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <span
                className={`font-bold text-white ${isReply ? "text-sm" : "text-base"}`}
              >
                {reviewerName}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-500 bg-black/40 px-2 py-0.5 rounded-full border border-red-900/30">
                {new Date(review.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>

            {isEditing ? (
              <div className="mt-2 mb-3 pr-2 animate-fade-in">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full input-field p-3 min-h-[80px] resize-none text-sm mb-2 shadow-inner"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setEditingReviewId(null)}
                    className="btn-secondary px-4 py-2 text-xs"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleUpdateReview(review.id)}
                    disabled={isUpdatingReview}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer"
                  >
                    {isUpdatingReview ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </div>
            ) : isSpoilerHidden ? (
              <div
                onClick={() =>
                  setRevealedSpoilers((prev) => [...prev, review.id])
                }
                className="bg-black/50 border border-dashed border-red-500/50 rounded-xl p-4 cursor-pointer hover:bg-red-900/20 transition-all flex items-center justify-center gap-3 mb-3 text-red-400 shadow-inner group/spoiler"
              >
                <FaEyeSlash
                  size={18}
                  className="group-hover/spoiler:scale-110 transition-transform"
                />
                <span className="text-sm font-bold tracking-wide">
                  Mengandung Spoiler. Klik untuk melihat.
                </span>
              </div>
            ) : (
              <p
                className={`text-gray-300 ${isReply ? "text-xs sm:text-sm" : "text-sm sm:text-base"} leading-relaxed whitespace-pre-line mb-3 pr-8`}
              >
                {review.content}
              </p>
            )}

            <div
              className={`flex items-center gap-4 ${!isReply && "border-t border-red-900/30 pt-3 mt-2"}`}
            >
              <button
                onClick={() => handleLikeReview(review.id, likesArray)}
                className={`flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${hasLiked ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "text-gray-500 hover:text-red-400"}`}
              >
                {hasLiked ? (
                  <FaHeart className="scale-110 transition-transform" />
                ) : (
                  <FaRegHeart />
                )}
                <span>
                  {likesArray.length > 0 ? likesArray.length : "Suka"}
                </span>
              </button>

              {!isReply && (
                <button
                  onClick={() =>
                    setReplyingTo(replyingTo === review.id ? null : review.id)
                  }
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-500 hover:text-blue-400 transition-all cursor-pointer"
                >
                  <FaReply /> <span>Balas</span>
                </button>
              )}
            </div>

            {replyingTo === review.id && !isReply && (
              <div className="mt-4 flex gap-3 items-start animate-fade-in bg-black/30 p-3 rounded-xl border border-blue-900/30">
                <div className="flex-1">
                  <textarea
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    placeholder={`Balas ${reviewerName}...`}
                    className="w-full bg-[#0a0202]/80 text-white border border-blue-900/50 focus:border-blue-500 rounded-xl p-3 min-h-[60px] outline-none resize-none text-sm mb-2 shadow-inner transition-colors"
                    autoFocus
                  ></textarea>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => handleSubmitReply(review.id)}
                      disabled={isSubmittingReply || !replyInput.trim()}
                      className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 transition-colors shadow-[0_0_10px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:shadow-none cursor-pointer"
                    >
                      <FaPaperPlane size={10} /> Kirim
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {!isReply &&
          getReplies(review.id).map((reply) => renderReviewBox(reply, true))}
      </div>
    );
  };

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
          {/* 2. SIDEBAR KIRI (COVER, CONTROLLER WATCHLIST, INFO DETAIL) */}
          <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col gap-6 mx-auto md:mx-0 max-w-[280px] md:max-w-none">
            {/* Cover Image */}
            <div className="rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.8)] border-2 border-red-900/50 relative group aspect-[2/3] bg-black">
              <img
                src={anime.coverImage?.extraLarge || anime.coverImage?.large}
                alt={anime.title?.romaji || "Poster"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md border border-yellow-500/50 text-white font-black px-3 py-1.5 rounded-xl text-lg shadow-lg flex items-center gap-1.5">
                <FaStar className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />{" "}
                {anime.averageScore
                  ? (anime.averageScore / 10).toFixed(1)
                  : "N/A"}
              </div>
            </div>

            {/* INTERACTIVE WATCHLIST CONTROLLER */}
            <div className="flex flex-col gap-3">
              {isInWatchlist ? (
                <div className="glass-card p-4 shadow-xl flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-red-900/30 pb-2">
                    <span className="text-xs font-black uppercase text-red-400 tracking-wider flex items-center gap-1.5">
                      <FaCheck className="text-green-400" /> Di Watchlist
                    </span>
                    <button
                      onClick={handleRemoveFromWatchlist}
                      disabled={isProcessingWatchlist}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Hapus dari Watchlist"
                    >
                      <FaTrash size={10} /> Hapus
                    </button>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      {watchlistStatus === "Watching" && <FaPlay className="text-amber-400 text-[10px]" />}
                      {watchlistStatus === "Completed" && <FaCheck className="text-emerald-400 text-[10px]" />}
                      {watchlistStatus === "Plan to Watch" && <FaClock className="text-blue-400 text-[10px]" />}
                      Status Tontonan
                    </label>
                    <select
                      value={watchlistStatus}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      className="w-full input-field px-3 py-2 text-xs font-semibold cursor-pointer"
                    >
                      <option value="Plan to Watch">Plan to Watch</option>
                      <option value="Watching">Watching</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  {/* Rating Selector */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FaStar className="text-yellow-400 text-[10px]" /> Rating Pribadiku
                    </label>
                    <select
                      value={userRating}
                      onChange={(e) =>
                        handleUpdateRating(parseInt(e.target.value, 10))
                      }
                      className="w-full input-field px-3 py-2 text-xs font-semibold cursor-pointer"
                    >
                      <option value="0">Belum Dinilai</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <option key={num} value={num}>
                          {num} / 10 Bintang
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tracker Episode */}
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FaTv className="text-blue-400 text-[10px]" /> Progress Episode
                      </label>
                      <span className="text-xs font-bold text-white bg-black/50 px-2 py-0.5 rounded-md border border-red-900/50">
                        {episodesWatched} / {anime.episodes || "?"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateEpisodes(Math.max(0, episodesWatched - 1))}
                        className="bg-black/60 hover:bg-red-900/40 text-gray-400 hover:text-white border border-red-900/50 rounded-lg p-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={episodesWatched <= 0}
                      >
                        <FaMinus size={10} />
                      </button>
                      
                      <div className="flex-1 h-2 bg-black/60 rounded-full overflow-hidden border border-red-900/30">
                        <div 
                          className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
                          style={{ width: `${anime.episodes ? (episodesWatched / anime.episodes) * 100 : (episodesWatched ? 100 : 0)}%` }}
                        ></div>
                      </div>

                      <button
                        onClick={() => handleUpdateEpisodes(episodesWatched + 1)}
                        className="bg-black/60 hover:bg-green-900/40 text-gray-400 hover:text-white border border-green-900/50 rounded-lg p-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={anime.episodes && episodesWatched >= anime.episodes}
                      >
                        <FaPlus size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleAddToWatchlist}
                  disabled={isProcessingWatchlist}
                  className="w-full btn-primary py-3.5 px-4 rounded-xl flex items-center justify-center gap-2.5 text-sm font-bold shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessingWatchlist ? (
                    <span className="animate-pulse flex items-center gap-2">Memproses...</span>
                  ) : (
                    <>
                      <FaBookmark className="text-sm shrink-0" />
                      <span>Tambah ke Watchlist</span>
                    </>
                  )}
                </button>
              )}

              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleShare}
                    className="btn-secondary py-2.5 px-3 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:border-red-500/50 transition-all cursor-pointer active:scale-95"
                    title="Bagikan Tautan"
                  >
                    <FaShareAlt className="text-xs shrink-0" />
                    <span>Tautan</span>
                  </button>
                  <button
                    onClick={() => setShowShareCard(true)}
                    className="btn-secondary py-2.5 px-3 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:border-red-500/50 transition-all cursor-pointer active:scale-95"
                    title="Buat Kartu Gambar"
                  >
                    <FaImage className="text-xs shrink-0" />
                    <span>Kartu Visual</span>
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (!user) return toast.error("Kamu harus login dulu!");
                    setShowCollectionModal(true);
                  }}
                  className="w-full btn-secondary py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 text-xs md:text-sm font-bold shadow-md hover:border-red-500/50 transition-all cursor-pointer active:scale-95"
                >
                  <FaLayerGroup className="text-sm shrink-0" />
                  <span>Tambahkan ke Koleksi</span>
                </button>
              </div>
            </div>

            {/* Detailed Info Table Glassmorphism */}
            <div className="glass-card p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col gap-4">
              <h4 className="text-white font-bold flex items-center gap-2 mb-2 border-b border-red-900/30 pb-3 uppercase tracking-wider text-sm">
                <FaInfoCircle className="text-red-500" /> Informasi Teknis
              </h4>
              {[
                { label: "Format", value: anime.format?.replace("_", " ") },
                { label: "Episode", value: anime.episodes },
                {
                  label: "Durasi",
                  value: anime.duration ? `${anime.duration} menit` : null,
                },
                { label: "Status", value: anime.status?.replace("_", " ") },
                {
                  label: "Musim",
                  value: anime.season
                    ? `${anime.season.toLowerCase()} ${anime.seasonYear || ""}`
                    : null,
                },
                {
                  label: "Studio",
                  value: anime.studios?.nodes?.[0]?.name,
                  highlight: true,
                },
                {
                  label: "Sumber",
                  value: anime.source?.replace("_", " ").toLowerCase(),
                },
              ].map((info, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center text-sm border-b border-red-900/10 pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-gray-400 font-medium">
                    {info.label}
                  </span>
                  <span
                    className={`font-bold capitalize text-right ${info.highlight ? "text-red-400 bg-red-900/20 px-2 py-0.5 rounded-md border border-red-900/30" : "text-gray-200"}`}
                  >
                    {info.value || "?"}
                  </span>
                </div>
              ))}
            </div>

            {/* NEXT AIRING EPISODE & REMINDER WIDGET */}
            {anime.nextAiringEpisode && (
              <div className="glass-card p-6 border-red-500/40 shadow-[0_10px_30px_rgba(220,38,38,0.25)] flex flex-col gap-4 animate-fade-in border-t border-red-900/50">
                <div className="flex items-center gap-2 text-red-400 font-black text-sm uppercase tracking-wider">
                  <FaBell className="animate-bounce" /> Jadwal Tayang Berikutnya
                </div>

                <div className="bg-black/60 rounded-2xl p-4 border border-red-900/40">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-400 font-bold">Episode</span>
                    <span className="text-white font-black text-base text-red-400">
                      EP {anime.nextAiringEpisode.episode}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-medium">Waktu Rilis</span>
                    <span className="text-gray-200 font-bold">
                      {new Date(anime.nextAiringEpisode.airingAt * 1000).toLocaleDateString("id-ID", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={generateGoogleCalendarUrl({
                      title: anime.title?.romaji || "Anime",
                      episode: anime.nextAiringEpisode.episode,
                      airingAt: anime.nextAiringEpisode.airingAt,
                      durationMinutes: anime.duration || 25,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md shadow-red-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <FaCalendarPlus /> Tambah ke Google Calendar
                  </a>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        downloadIcsFile({
                          title: anime.title?.romaji || "Anime",
                          episode: anime.nextAiringEpisode.episode,
                          airingAt: anime.nextAiringEpisode.airingAt,
                          durationMinutes: anime.duration || 25,
                        })
                      }
                      className="flex-1 py-2 px-2 bg-black/60 hover:bg-white/10 text-gray-300 hover:text-white border border-red-900/40 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      title="Unduh file .ics untuk Apple / Outlook"
                    >
                      <FaDownload size={10} /> Unduh .ICS
                    </button>

                    <button
                      onClick={handleSaveReminder}
                      className="flex-1 py-2 px-2 bg-black/60 hover:bg-red-900/30 text-gray-300 hover:text-red-400 border border-red-900/40 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      title="Simpan pengingat ke database akun"
                    >
                      <FaBell size={10} /> Pasang Alarm
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. AREA UTAMA KANAN */}
          <div className="flex-1 flex flex-col gap-12 mt-4 md:mt-24">
            {/* Judul & Sinopsis */}
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
                  dangerouslySetInnerHTML={{
                    __html: anime.description || "Sinopsis belum tersedia.",
                  }}
                />
              </div>
            </div>

            {/* RELASI & SILSILAH */}
            {anime.relations && anime.relations.edges?.length > 0 && (
              <div>
                <div className="mb-6 flex items-center gap-4 border-b border-red-900/30 pb-4">
                  <div className="bg-purple-900/30 p-3 rounded-xl border border-purple-500/20 shadow-inner">
                    <FaSitemap className="text-purple-400 text-xl drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">
                      Hubungan Silsilah
                    </h3>
                    <p className="text-sm text-gray-400">
                      Prekuel, sekuel, dan versi alternatif.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {anime.relations.edges.map((relation, idx) => (
                    <Link
                      to={`/anime/${relation.node.id}`}
                      key={`${relation.node.id}-${idx}`}
                      className="glass-card glass-card-hover p-3 flex gap-4 shadow-lg group"
                    >
                      <div className="w-16 sm:w-20 flex-shrink-0 rounded-lg overflow-hidden relative border border-red-900/40 aspect-[3/4]">
                        <img
                          src={relation.node.coverImage?.large}
                          alt={relation.node.title?.romaji || "Cover"}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                        <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-sm p-1 rounded text-gray-300 text-[10px] border border-white/10">
                          {relation.node.type === "MANGA" ? (
                            <FaBook />
                          ) : (
                            <FaTv />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col justify-center flex-1 overflow-hidden">
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 mb-1">
                          {translateRelation(relation.relationType)}
                        </span>
                        <h4 className="text-white text-sm font-bold leading-tight line-clamp-2 group-hover:text-red-300 transition-colors">
                          {relation.node.title?.romaji}
                        </h4>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-400 bg-black/40 px-1.5 py-0.5 rounded-md border border-gray-800">
                            {relation.node.format}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* TRAILER YOUTUBE */}
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

            {/* KARAKTER & SEIYUU */}
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

            {/* SOUNDTRACK & LAGU TEMA (OP & ED) */}
            <ThemeSongsPlayer
              idMal={anime.idMal}
              animeId={anime.id}
              animeTitle={anime.title?.romaji}
            />

            {/* --- KOMUNITAS & ULASAN --- */}
            <div className="mt-8 border-t-2 border-red-900/30 pt-12 relative">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-32 bg-red-600/10 rounded-full blur-[60px] pointer-events-none"></div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-red-900/30 p-3 rounded-xl border border-red-500/20 shadow-inner">
                    <FaComments className="text-red-500 text-xl drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                      Ruang Diskusi
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {reviews.length} ulasan dari komunitas RAIHANEX.
                    </p>
                  </div>
                </div>

                {/* Filter Ulasan */}
                <div className="flex bg-black/60 border border-red-900/40 rounded-xl p-1.5 w-max shadow-inner backdrop-blur-md">
                  <button
                    onClick={() => setSortBy("terbaru")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${sortBy === "terbaru" ? "bg-red-600 text-white shadow-md" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                  >
                    <FaClock /> Terbaru
                  </button>
                  <button
                    onClick={() => setSortBy("terpopuler")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${sortBy === "terpopuler" ? "bg-red-600 text-white shadow-md" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                  >
                    <FaFire /> Terpopuler
                  </button>
                </div>
              </div>

              {/* Form Input Ulasan Baru */}
              {user ? (
                <form
                  onSubmit={handleSubmitReview}
                  className="glass-card p-6 mb-12 shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative overflow-hidden group/form animate-scale-up"
                >
                  <div className="absolute top-0 left-0 w-1 bg-red-600 h-full"></div>

                  <textarea
                    value={reviewInput}
                    onChange={(e) => setReviewInput(e.target.value)}
                    placeholder="Tuliskan pendapat epikmu tentang anime ini..."
                    className="w-full input-field p-5 min-h-[140px] resize-none text-sm md:text-base shadow-inner placeholder-gray-600"
                  ></textarea>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                    <label className="flex items-center gap-3 cursor-pointer group bg-black/40 hover:bg-red-900/20 px-5 py-3 rounded-xl border border-red-900/30 w-max transition-colors">
                      <input
                        type="checkbox"
                        checked={isSpoilerInput}
                        onChange={(e) => setIsSpoilerInput(e.target.checked)}
                        className="w-4 h-4 accent-red-600 cursor-pointer rounded"
                      />
                      <span className="text-xs font-bold text-gray-400 group-hover:text-red-300 transition-colors uppercase tracking-wider flex items-center gap-2">
                        <FaEyeSlash /> Tandai Sebagai Spoiler
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={isSubmittingReview || !reviewInput.trim()}
                      className="btn-primary px-8 py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-[0_10px_20px_rgba(220,38,38,0.3)] disabled:opacity-50 disabled:shadow-none disabled:transform-none cursor-pointer active:scale-95 transition-all"
                    >
                      {isSubmittingReview ? (
                        <span className="animate-pulse flex items-center gap-2">Mengirim...</span>
                      ) : (
                        <>
                          <FaPaperPlane className="text-xs shrink-0" />
                          <span>Kirim Ulasan Publik</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="glass-card p-10 mb-12 text-center shadow-lg relative overflow-hidden animate-scale-up border-t border-red-900/50">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-900/20 text-9xl pointer-events-none">
                    <FaComments />
                  </div>
                  <h4 className="text-2xl font-black text-white mb-2 relative z-10">
                    Suaramu Dibutuhkan!
                  </h4>
                  <p className="text-gray-400 mb-8 font-medium relative z-10 max-w-md mx-auto">
                    Bergabunglah dengan ribuan otaku lainnya. Masuk sekarang
                    untuk membagikan teori, ulasan, dan pendapatmu.
                  </p>
                  <Link
                    to="/auth"
                    className="relative z-10 inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-10 py-4 rounded-full font-bold shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all hover:scale-105"
                  >
                    Masuk ke RAIHANEX &rarr;
                  </Link>
                </div>
              )}

              {/* Daftar Ulasan */}
              <div className="flex flex-col gap-6">
                {sortedMainReviews.length === 0 ? (
                  <div className="text-center py-16 text-gray-500 font-bold border-2 border-dashed border-red-900/20 rounded-[2rem] bg-[#1a0505]/20 backdrop-blur-sm">
                    <p className="text-lg text-gray-400 mb-1">
                      Belum ada jejak diskusi di sini.
                    </p>
                    <p className="text-sm">
                      Jadilah pionir yang memberikan ulasan pertama!
                    </p>
                  </div>
                ) : (
                  <>
                    {sortedMainReviews.map((review) =>
                      renderReviewBox(review, false),
                    )}

                    {hasMoreReviews && (
                      <div className="flex justify-center mt-6">
                        <button
                          onClick={handleLoadMoreReviews}
                          disabled={isLoadingMoreReviews}
                          className="btn-secondary px-8 py-3 text-sm font-bold flex items-center gap-2 cursor-pointer active:scale-95 shadow-md"
                        >
                          {isLoadingMoreReviews ? (
                            <span className="animate-pulse">Memuat Ulasan...</span>
                          ) : (
                            "Muat Lebih Banyak Ulasan ↓"
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
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
};

export default AnimeDetail;
