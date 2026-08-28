import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { showConfirmToast } from "../utils/confirmToast.jsx";
import toast from "react-hot-toast";
import {
  FaComments,
  FaPaperPlane,
  FaTrash,
  FaHeart,
  FaRegHeart,
  FaPen,
  FaReply,
  FaEyeSlash,
  FaFire,
  FaClock,
} from "react-icons/fa";

export default function AnimeReviewSection({
  anime,
  user,
  displayName,
  reviews,
  setReviews,
  hasMoreReviews,
  isLoadingMoreReviews,
  onLoadMoreReviews,
}) {
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

  const animeTitle = anime?.title?.romaji || anime?.title?.english || "Anime";

  // --- SUBMIT ULASAN BARU ---
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
        anime_title: animeTitle,
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

  // --- SUBMIT BALASAN ---
  const handleSubmitReply = async (parentId) => {
    if (!user) return toast.error("Kamu harus login dulu!");
    if (!replyInput.trim()) return toast.error("Balasan tidak boleh kosong!");
    setIsSubmittingReply(true);
    try {
      const newReply = {
        user_id: user.id,
        anilist_id: anime.id,
        anime_title: animeTitle,
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

  // --- HAPUS ULASAN (Aman dari Orphaned Records) ---
  const executeDeleteReview = async (reviewId) => {
    try {
      const hasReplies = reviews.some((r) => r.parent_id === reviewId);

      if (hasReplies) {
        // Jika memiliki balasan, ubah konten menjadi tombstone agar hierarki balasan pengguna lain tetap utuh & tidak orphaned
        const { error } = await supabase
          .from("reviews")
          .update({
            content: "[Ulasan ini telah dihapus oleh penulis]",
            is_spoiler: false,
            liked_by: [],
          })
          .eq("id", reviewId)
          .eq("user_id", user.id);

        if (error) throw error;
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? {
                  ...r,
                  content: "[Ulasan ini telah dihapus oleh penulis]",
                  is_spoiler: false,
                  liked_by: [],
                }
              : r
          )
        );
        toast.success("Ulasan ditandai sebagai telah dihapus.");
      } else {
        // Hard-delete langsung jika tidak memiliki rantai balasan
        const { error } = await supabase
          .from("reviews")
          .delete()
          .eq("id", reviewId)
          .eq("user_id", user.id);

        if (error) throw error;
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        toast.success("Ulasan berhasil dihapus.");
      }
    } catch (err) {
      console.error("Gagal menghapus ulasan:", err);
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

  // --- UPDATE ULASAN ---
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
          r.id === reviewId ? { ...r, content: editContent.trim() } : r
        )
      );
      toast.success("Ulasan diperbarui!");
      setEditingReviewId(null);
    } catch {
      toast.error("Gagal memperbarui.");
    } finally {
      setIsUpdatingReview(false);
    }
  };

  // --- LIKE ULASAN ---
  const handleLikeReview = async (reviewId, currentLikes) => {
    if (!user) return toast.error("Login dulu untuk menyukai ulasan!");
    const likesArray = currentLikes || [];
    const hasLiked = likesArray.includes(user.id);
    const newLikes = hasLiked
      ? likesArray.filter((uId) => uId !== user.id)
      : [...likesArray, user.id];

    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, liked_by: newLikes } : r))
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
          r.id === reviewId ? { ...r, liked_by: likesArray } : r
        )
      );
      toast.error("Gagal memperbarui like ulasan.");
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

  const renderReviewBox = (review, isReply = false) => {
    const isDeleted = review.content === "[Ulasan ini telah dihapus oleh penulis]";
    const reviewerName = isDeleted
      ? "Pengguna"
      : review.user_name ||
        (review.user_email ? review.user_email.split("@")[0] : "Pengguna");
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      reviewerName
    )}&background=${isDeleted ? "555555" : "dc2626"}&color=fff&size=128&bold=true`;
    const isOwner = user && user.id === review.user_id;
    const isEditing = editingReviewId === review.id;
    const likesArray = review.liked_by || [];
    const hasLiked = user && likesArray.includes(user.id);
    const isSpoilerHidden =
      !isDeleted && review.is_spoiler && !revealedSpoilers.includes(review.id);

    return (
      <div
        key={review.id}
        className={`${
          isReply
            ? "ml-8 sm:ml-12 mt-3 border-l-2 border-red-900/40 pl-4"
            : "glass-card p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
        } transition-all hover:border-red-500/50 relative group`}
      >
        {isOwner && !isEditing && !isDeleted && (
          <div
            className={`absolute ${
              isReply ? "-top-1 right-0" : "top-4 right-4"
            } flex gap-2 opacity-0 group-hover:opacity-100 transition-all`}
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
            className={`${
              isReply ? "w-8 h-8" : "w-10 h-10 sm:w-12 sm:h-12"
            } rounded-full border-2 ${isDeleted ? "border-gray-600" : "border-red-500/50"} flex-shrink-0 shadow-md`}
          />
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <span
                className={`font-bold ${isDeleted ? "text-gray-500 italic" : "text-white"} ${
                  isReply ? "text-sm" : "text-base"
                }`}
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
            ) : isDeleted ? (
              <p className="text-gray-500 italic text-xs sm:text-sm py-1 mb-2">
                [Ulasan ini telah dihapus oleh penulis]
              </p>
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
                className={`text-gray-300 ${
                  isReply ? "text-xs sm:text-sm" : "text-sm sm:text-base"
                } leading-relaxed whitespace-pre-line mb-3 pr-8`}
              >
                {review.content}
              </p>
            )}

            <div
              className={`flex items-center gap-4 ${
                !isReply && "border-t border-red-900/30 pt-3 mt-2"
              }`}
            >
              {!isDeleted && (
                <button
                  onClick={() => handleLikeReview(review.id, likesArray)}
                  className={`flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    hasLiked
                      ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                      : "text-gray-500 hover:text-red-400"
                  }`}
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
              )}

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
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              sortBy === "terbaru"
                ? "bg-red-600 text-white shadow-md"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <FaClock /> Terbaru
          </button>
          <button
            onClick={() => setSortBy("terpopuler")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              sortBy === "terpopuler"
                ? "bg-red-600 text-white shadow-md"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
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
                <span className="animate-pulse flex items-center gap-2">
                  Mengirim...
                </span>
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
            Bergabunglah dengan ribuan otaku lainnya. Masuk sekarang untuk
            membagikan teori, ulasan, dan pendapatmu.
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
            <p className="text-sm">Jadilah pionir yang memberikan ulasan pertama!</p>
          </div>
        ) : (
          <>
            {sortedMainReviews.map((review) => renderReviewBox(review, false))}

            {hasMoreReviews && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={onLoadMoreReviews}
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
  );
}
