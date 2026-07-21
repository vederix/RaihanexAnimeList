import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  FaStar,
  FaArrowLeft,
  FaCheck,
  FaPlus,
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
} from "react-icons/fa";
import { supabase } from "../supabaseClient";
import { fetchAniList } from "../utils/anilist";
import toast from "react-hot-toast";

// 1. QUERY ANILIST DIPERLUAS (Banner, Studio, Durasi, Musim, Format, Sumber)
const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id title { romaji english native } 
      coverImage { large extraLarge } bannerImage 
      averageScore status episodes duration season seasonYear format source description genres 
      studios(isMain: true) { nodes { name } }
      trailer { id site }
      characters(sort: [ROLE, RELEVANCE], perPage: 10) {
        edges { 
          role node { id name { full } image { large } } 
          voiceActors(language: JAPANESE, sort: RELEVANCE) { id name { full } image { large } } 
        }
      }
    }
  }
`;

const AnimeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [anime, setAnime] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [user, setUser] = useState(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // STATE ULASAN & FITUR KOMUNITAS
  const [reviews, setReviews] = useState([]);
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

  useEffect(() => {
    const fetchAnimeAndUser = async () => {
      try {
        const data = await fetchAniList(DETAIL_QUERY, { id: parseInt(id) });
        const animeData = data.Media;
        setAnime(animeData);

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const currentUser = session?.user;
        setUser(currentUser);

        if (currentUser) {
          const { data: watchlistData } = await supabase
            .from("watchlist")
            .select("*")
            .eq("user_id", currentUser.id)
            .eq("mal_id", animeData.id)
            .maybeSingle();
          if (watchlistData) setIsInWatchlist(true);
        }

        fetchReviews(animeData.id);
      } catch (error) {
        console.error("Gagal memuat data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnimeAndUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchReviews = async (animeId) => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("mal_id", animeId);
      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error("Gagal memuat ulasan:", error);
    }
  };

  // --- LOGIKA DATABASE & KOMUNITAS ---
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) return toast.error("Kamu harus login dulu!");
    if (!reviewInput.trim()) return toast.error("Ulasan tidak boleh kosong!");
    setIsSubmittingReview(true);
    try {
      const newReview = {
        user_id: user.id,
        mal_id: anime.id,
        user_email: user.email,
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
    } catch (error) {
      toast.error("Gagal mengirim ulasan.");
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
        mal_id: anime.id,
        user_email: user.email,
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
    } catch (error) {
      toast.error("Gagal mengirim balasan.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const executeDeleteReview = async (reviewId) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId)
        .eq("user_id", user.id);
      if (error) throw error;
      setReviews((prev) =>
        prev.filter((r) => r.id !== reviewId && r.parent_id !== reviewId),
      );
      toast.success("Dihapus.");
    } catch (error) {
      toast.error("Gagal menghapus.");
    }
  };

  const confirmDeleteReview = (reviewId) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-4 p-1 w-full">
          <span className="font-semibold text-white text-center">
            Yakin ingin menghapus ini?
          </span>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                executeDeleteReview(reviewId);
              }}
              className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-bold border border-red-400/50"
            >
              Hapus
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2 rounded-lg text-sm font-bold border border-slate-500/50"
            >
              Batal
            </button>
          </div>
        </div>
      ),
      { duration: 6000 },
    );
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
      toast.success("Diperbarui!");
      setEditingReviewId(null);
    } catch (error) {
      toast.error("Gagal memperbarui.");
    } finally {
      setIsUpdatingReview(false);
    }
  };

  const handleLikeReview = async (reviewId, currentLikes) => {
    if (!user) return toast.error("Login dulu!");
    const likesArray = currentLikes || [];
    const hasLiked = likesArray.includes(user.id);
    const newLikes = hasLiked
      ? likesArray.filter((id) => id !== user.id)
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
    } catch (error) {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, liked_by: likesArray } : r,
        ),
      );
    }
  };

  const toggleWatchlist = async () => {
    if (!user) {
      toast.error("Kamu harus login dulu!");
      return navigate("/auth");
    }
    setIsProcessing(true);
    try {
      if (isInWatchlist) {
        await supabase
          .from("watchlist")
          .delete()
          .eq("user_id", user.id)
          .eq("mal_id", anime.id);
        setIsInWatchlist(false);
        toast.success("Anime dihapus dari Watchlist!");
      } else {
        await supabase.from("watchlist").insert([
          {
            user_id: user.id,
            mal_id: anime.id,
            title: anime.title.romaji || anime.title.english,
            image_url: anime.coverImage.large,
            score: anime.averageScore ? anime.averageScore / 10 : 0,
          },
        ]);
        setIsInWatchlist(true);
        toast.success("Anime ditambahkan ke Watchlist!");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = () => {
    const shareData = {
      title: `Tonton ${anime.title.romaji} di RAIHANEX!`,
      text: `Lihat info lengkap, jadwal, dan ulasan anime ${anime.title.romaji} di RAIHANEX.`,
      url: window.location.href,
    };
    if (navigator.share) navigator.share(shareData).catch(() => {});
    else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link disalin!");
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-red-500 border-transparent"></div>
      </div>
    );
  if (!anime)
    return (
      <div className="text-center mt-20 text-gray-400">
        Anime tidak ditemukan.
      </div>
    );

  const cleanDescription =
    anime.description?.replace(/<br\s*[\/]?>/gi, "\n") ||
    "Sinopsis belum tersedia.";

  // --- KOMPONEN RENDER ULASAN ---
  const renderReviewBox = (review, isReply = false) => {
    const reviewerName = review.user_email.split("@")[0];
    const avatar = `https://ui-avatars.com/api/?name=${reviewerName}&background=880000&color=fff&size=128&bold=true`;
    const isOwner = user && user.id === review.user_id;
    const isEditing = editingReviewId === review.id;
    const likesArray = review.liked_by || [];
    const hasLiked = user && likesArray.includes(user.id);
    const isSpoilerHidden =
      review.is_spoiler && !revealedSpoilers.includes(review.id);

    return (
      <div
        key={review.id}
        className={`${isReply ? "ml-8 sm:ml-14 mt-3 border-l-2 border-red-900/50 pl-4" : "bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md"} transition-all hover:border-red-900/50 relative group`}
      >
        {isOwner && !isEditing && (
          <div
            className={`absolute ${isReply ? "-top-1 right-0" : "top-4 right-4"} flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all`}
          >
            <button
              onClick={() => {
                setEditingReviewId(review.id);
                setEditContent(review.content);
              }}
              className="text-gray-400 hover:text-blue-400 p-1.5 bg-black/40 rounded-lg"
              title="Edit"
            >
              <FaPen size={10} />
            </button>
            <button
              onClick={() => confirmDeleteReview(review.id)}
              className="text-gray-400 hover:text-red-500 p-1.5 bg-black/40 rounded-lg"
              title="Hapus"
            >
              <FaTrash size={10} />
            </button>
          </div>
        )}

        <div className="flex items-start gap-3 sm:gap-4">
          <img
            src={avatar}
            alt="Avatar"
            className={`${isReply ? "w-8 h-8" : "w-10 h-10 sm:w-12 sm:h-12"} rounded-full border border-red-500/30 flex-shrink-0`}
          />
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5">
              <span
                className={`font-bold text-white ${isReply ? "text-sm" : "text-base"}`}
              >
                {reviewerName}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-500">
                {new Date(review.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>

            {isEditing ? (
              <div className="mt-2 mb-3 pr-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-slate-900/80 text-white border border-blue-500/50 rounded-xl p-3 min-h-[60px] outline-none resize-none text-sm mb-2"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setEditingReviewId(null)}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-700 text-white"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleUpdateReview(review.id)}
                    disabled={isUpdatingReview}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white"
                  >
                    {isUpdatingReview ? "..." : "Simpan"}
                  </button>
                </div>
              </div>
            ) : isSpoilerHidden ? (
              <div
                onClick={() =>
                  setRevealedSpoilers((prev) => [...prev, review.id])
                }
                className="bg-black/50 border border-dashed border-red-900/50 rounded-xl p-4 cursor-pointer hover:bg-red-900/20 transition-all flex items-center justify-center gap-3 mb-3 text-red-400"
              >
                <FaEyeSlash size={18} />
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
              className={`flex items-center gap-4 ${!isReply && "border-t border-slate-800 pt-3 mt-1"}`}
            >
              <button
                onClick={() => handleLikeReview(review.id, likesArray)}
                className={`flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-all ${hasLiked ? "text-red-500" : "text-gray-500 hover:text-red-400"}`}
              >
                {hasLiked ? (
                  <FaHeart className="drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
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
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-500 hover:text-blue-400 transition-all"
                >
                  <FaReply /> <span>Balas</span>
                </button>
              )}
            </div>

            {replyingTo === review.id && !isReply && (
              <div className="mt-4 flex gap-3 items-start animate-fade-in">
                <div className="flex-1">
                  <textarea
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    placeholder={`Balas ${reviewerName}...`}
                    className="w-full bg-black/40 text-white border border-blue-900/50 focus:border-blue-500 rounded-xl p-3 min-h-[60px] outline-none resize-none text-sm mb-2"
                    autoFocus
                  ></textarea>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-800 text-gray-400 hover:text-white"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => handleSubmitReply(review.id)}
                      disabled={isSubmittingReply || !replyInput.trim()}
                      className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1"
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
    <div className="pb-16 mt-6">
      {/* 1. HERO BANNER & KEMBALI */}
      <div className="relative w-full h-64 md:h-80 lg:h-96 rounded-3xl overflow-hidden mb-8 shadow-2xl border border-red-900/30">
        {anime.bannerImage ? (
          <img
            src={anime.bannerImage}
            alt="Banner"
            className="w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-red-950 to-black"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0202] via-[#0a0202]/60 to-transparent"></div>

        <Link
          to="/"
          className="absolute top-6 left-6 inline-flex items-center gap-2 text-white bg-black/40 backdrop-blur-md px-4 py-2 rounded-full hover:bg-red-600 transition-colors font-medium border border-red-900/50 shadow-lg z-10"
        >
          <FaArrowLeft /> Beranda
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-8 relative z-10 -mt-20 md:-mt-32 px-4 md:px-8">
        {/* 2. SIDEBAR KIRI (COVER, TOMBOL, INFO DETAIL) */}
        <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col gap-6">
          {/* Cover Image */}
          <div className="rounded-2xl overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.6)] border-2 border-red-900/40 relative group">
            <img
              src={anime.coverImage.extraLarge || anime.coverImage.large}
              alt={anime.title.romaji}
              className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-3 right-3 bg-red-600 text-white font-black px-3 py-1 rounded-lg text-lg shadow-lg flex items-center gap-1.5">
              <FaStar className="text-yellow-300" />{" "}
              {anime.averageScore
                ? (anime.averageScore / 10).toFixed(1)
                : "N/A"}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={toggleWatchlist}
              disabled={isProcessing}
              className={`w-full py-3.5 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 border ${isInWatchlist ? "bg-slate-800/80 text-white border-slate-600" : "bg-gradient-to-r from-red-700 to-red-600 text-white border-red-500/50 hover:scale-[1.02]"}`}
            >
              {isProcessing ? (
                "Memproses..."
              ) : isInWatchlist ? (
                <>
                  <FaCheck className="text-green-400" /> Tersimpan
                </>
              ) : (
                <>
                  <FaPlus /> Tambah Watchlist
                </>
              )}
            </button>
            <button
              onClick={handleShare}
              className="w-full py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 border bg-black/40 text-gray-300 border-red-900/30 hover:bg-red-900/60 hover:text-white hover:scale-[1.02]"
            >
              <FaShareAlt /> Bagikan
            </button>
          </div>

          {/* Detailed Info Table */}
          <div className="bg-[#1a0505]/60 backdrop-blur-md rounded-2xl p-5 border border-red-900/30 flex flex-col gap-3">
            <h4 className="text-white font-bold flex items-center gap-2 mb-2 border-b border-red-900/50 pb-2">
              <FaInfoCircle className="text-red-500" /> Informasi
            </h4>

            <div className="flex justify-between text-sm">
              <span className="text-gray-400 font-medium">Format</span>
              <span className="text-white font-bold">
                {anime.format?.replace("_", " ") || "?"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 font-medium">Episode</span>
              <span className="text-white font-bold">
                {anime.episodes || "?"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 font-medium">Durasi</span>
              <span className="text-white font-bold">
                {anime.duration ? `${anime.duration} menit` : "?"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 font-medium">Status</span>
              <span className="text-white font-bold">
                {anime.status?.replace("_", " ") || "?"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 font-medium">Musim</span>
              <span className="text-white font-bold capitalize">
                {anime.season
                  ? `${anime.season.toLowerCase()} ${anime.seasonYear}`
                  : "?"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 font-medium">Studio</span>
              <span className="text-red-400 font-bold text-right">
                {anime.studios?.nodes?.[0]?.name || "?"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 font-medium">Sumber</span>
              <span className="text-white font-bold capitalize">
                {anime.source?.replace("_", " ").toLowerCase() || "?"}
              </span>
            </div>
          </div>
        </div>

        {/* 3. AREA UTAMA KANAN */}
        <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col gap-10 mt-4 md:mt-24">
          {/* Judul & Sinopsis */}
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-2 tracking-tight drop-shadow-lg">
              {anime.title.romaji}
            </h1>
            <h2 className="text-lg md:text-xl text-red-200/60 italic mb-6 font-medium">
              {anime.title.english || anime.title.native}
            </h2>

            <div className="flex flex-wrap gap-2 mb-6">
              {anime.genres.map((genre, index) => (
                <span
                  key={index}
                  className="bg-red-900/20 text-red-300 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold border border-red-800/40 shadow-sm"
                >
                  {genre}
                </span>
              ))}
            </div>

            <p className="text-gray-300 leading-relaxed text-sm md:text-base text-justify opacity-90 whitespace-pre-line bg-black/30 p-6 rounded-2xl border border-red-900/20 backdrop-blur-sm">
              {cleanDescription}
            </p>
          </div>

          {/* KARAKTER & SEIYUU */}
          {anime.characters?.edges?.length > 0 && (
            <div>
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <FaUsers className="text-red-500" /> Karakter & Pengisi Suara
              </h3>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {anime.characters.edges.map((edge, index) => {
                  const char = edge.node;
                  const va = edge.voiceActors[0];
                  return (
                    <div
                      key={index}
                      className="bg-[#1a0505]/40 backdrop-blur-md border border-red-900/30 rounded-xl p-3 flex justify-between items-center transition-all hover:border-red-500/50 shadow-md group"
                    >
                      <div className="flex items-center gap-3 w-1/2">
                        <img
                          src={char.image?.large}
                          alt={char.name.full}
                          className="w-12 h-16 object-cover rounded-lg shadow-md border border-red-900/50 group-hover:scale-105 transition-transform"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-xs md:text-sm line-clamp-1">
                            {char.name.full}
                          </span>
                          <span className="text-[10px] md:text-xs text-red-400 font-medium uppercase">
                            {edge.role}
                          </span>
                        </div>
                      </div>
                      {va && (
                        <div className="flex items-center gap-3 w-1/2 justify-end text-right">
                          <div className="flex flex-col">
                            <span className="font-bold text-white text-xs md:text-sm line-clamp-1">
                              {va.name.full}
                            </span>
                            <span className="text-[10px] md:text-xs text-gray-400 uppercase">
                              Japanese
                            </span>
                          </div>
                          <img
                            src={va.image?.large}
                            alt={va.name.full}
                            className="w-12 h-16 object-cover rounded-lg shadow-md border border-slate-700 group-hover:scale-105 transition-transform"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TRAILER */}
          {anime.trailer && anime.trailer.site === "youtube" && (
            <div>
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <FaYoutube className="text-red-500" /> Trailer Resmi
              </h3>
              <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-red-900/40 shadow-[0_15px_40px_rgba(220,38,38,0.2)] bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${anime.trailer.id}?rel=0`}
                  title="Anime Trailer"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full"
                ></iframe>
              </div>
            </div>
          )}

          {/* KOMUNITAS & ULASAN */}
          <div className="pt-8 border-t border-red-900/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <FaComments className="text-red-500" /> Komunitas & Ulasan
              </h3>
              <div className="flex bg-black/40 border border-red-900/30 rounded-lg p-1 w-max shadow-inner">
                <button
                  onClick={() => setSortBy("terbaru")}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${sortBy === "terbaru" ? "bg-red-600/80 text-white" : "text-gray-400 hover:text-white"}`}
                >
                  <FaClock /> Terbaru
                </button>
                <button
                  onClick={() => setSortBy("terpopuler")}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${sortBy === "terpopuler" ? "bg-red-600/80 text-white" : "text-gray-400 hover:text-white"}`}
                >
                  <FaFire /> Terpopuler
                </button>
              </div>
            </div>

            {user ? (
              <form
                onSubmit={handleSubmitReview}
                className="bg-black/40 backdrop-blur-md border border-red-900/40 p-5 rounded-3xl mb-10 shadow-xl relative"
              >
                <textarea
                  value={reviewInput}
                  onChange={(e) => setReviewInput(e.target.value)}
                  placeholder="Tuliskan pendapatmu tentang anime ini..."
                  className="w-full bg-[#0a0202]/80 text-white border border-red-900/50 rounded-xl p-4 min-h-[120px] outline-none focus:border-red-500 transition-all resize-none text-sm md:text-base shadow-inner"
                ></textarea>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer group bg-red-950/30 px-4 py-2 rounded-lg border border-red-900/20 w-max">
                    <input
                      type="checkbox"
                      checked={isSpoilerInput}
                      onChange={(e) => setIsSpoilerInput(e.target.checked)}
                      className="w-4 h-4 accent-red-600 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-gray-400 group-hover:text-red-300 transition-colors uppercase tracking-wider">
                      Awas Spoiler
                    </span>
                  </label>
                  <button
                    type="submit"
                    disabled={isSubmittingReview || !reviewInput.trim()}
                    className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 disabled:from-slate-700 disabled:to-slate-800 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02]"
                  >
                    {isSubmittingReview ? (
                      "Mengirim..."
                    ) : (
                      <>
                        <FaPaperPlane /> Kirim Ulasan
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-red-900/10 border border-red-900/30 p-8 rounded-3xl mb-10 text-center backdrop-blur-sm">
                <p className="text-gray-300 mb-5 font-medium">
                  Kamu harus masuk untuk ikut berdiskusi di komunitas.
                </p>
                <Link
                  to="/auth"
                  className="inline-block bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-full font-bold shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-transform hover:scale-105"
                >
                  Masuk ke RAIHANEX
                </Link>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {sortedMainReviews.length === 0 ? (
                <div className="text-center py-12 text-gray-500 font-medium border border-dashed border-red-900/30 rounded-3xl bg-black/20">
                  Jadilah yang pertama memberikan ulasan!
                </div>
              ) : (
                sortedMainReviews.map((review) =>
                  renderReviewBox(review, false),
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimeDetail;
