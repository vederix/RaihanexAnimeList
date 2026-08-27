import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient";
import { FaTimes, FaCloudDownloadAlt, FaSpinner, FaCheckCircle } from "react-icons/fa";
import toast from "react-hot-toast";

const ANILIST_USER_LIST_QUERY = `
  query ($userName: String) {
    MediaListCollection(userName: $userName, type: ANIME) {
      lists {
        name
        status
        entries {
          progress
          score(format: POINT_10_DECIMAL)
          media {
            id
            title { romaji english }
            coverImage { large }
            format
            episodes
            status
            averageScore
          }
        }
      }
    }
  }
`;

export default function ImportWatchlistModal({ isOpen, onClose, user }) {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const mapStatus = (statusStr) => {
    if (statusStr === "CURRENT") return "Watching";
    if (statusStr === "COMPLETED") return "Completed";
    if (statusStr === "PLANNING") return "Plan to Watch";
    return "Plan to Watch";
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!username.trim()) return toast.error("Masukkan username AniList!");
    if (!user) return toast.error("Kamu harus login terlebih dahulu.");

    setIsLoading(true);
    try {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: ANILIST_USER_LIST_QUERY,
          variables: { userName: username.trim() },
        }),
      });

      const { data, errors } = await res.json();
      if (errors && errors.length > 0) throw new Error(errors[0].message);

      const lists = data?.MediaListCollection?.lists || [];
      if (lists.length === 0) {
        toast.error("Daftar anime untuk user ini kosong atau profil bersifat privat.");
        return;
      }

      const inserts = [];
      const seenIds = new Set();

      lists.forEach((list) => {
        const mappedStatus = mapStatus(list.status);
        list.entries?.forEach((entry) => {
          if (entry.media && !seenIds.has(entry.media.id)) {
            seenIds.add(entry.media.id);
            inserts.push({
              user_id: user.id,
              anilist_id: entry.media.id,
              title: entry.media.title?.romaji || entry.media.title?.english || "Anime",
              image_url: entry.media.coverImage?.large || "",
              score: entry.media.averageScore ? entry.media.averageScore / 10 : 0,
              status_tontonan: mappedStatus,
              rating_pribadi: entry.score ? Math.round(entry.score) : 0,
              episodes_watched: entry.progress || 0,
              total_episodes: entry.media.episodes || null,
            });
          }
        });
      });

      if (inserts.length === 0) {
        toast.error("Tidak ada anime valid untuk diimpor.");
        return;
      }

      // Batch upsert to Supabase
      const { error: dbError } = await supabase.from("watchlist").upsert(inserts, {
        onConflict: "user_id,anilist_id",
      });

      if (dbError) throw dbError;

      toast.success(
        `Sukses! Berhasil mengimpor ${inserts.length} anime ke Watchlist.`,
        { icon: <FaCheckCircle className="text-green-500" /> }
      );
      onClose();

      // Refresh halaman untuk memperbarui data
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error("Import error:", err);
      toast.error(err.message || "Gagal mengimpor daftar dari AniList.");
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
      onClick={!isLoading ? onClose : undefined}
    >
      <div
        className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md relative shadow-[0_30px_60px_rgba(0,0,0,0.9)] my-auto animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 bg-red-950/80 hover:bg-red-600 border border-red-500/40 text-white w-8 h-8 rounded-full flex items-center justify-center transition-all z-20 shadow-[0_0_15px_rgba(220,38,38,0.3)] cursor-pointer active:scale-95 disabled:opacity-50"
          aria-label="Tutup"
        >
          <FaTimes size={14} />
        </button>

        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-blue-900/40 border border-blue-500/40 rounded-2xl text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <FaCloudDownloadAlt size={22} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white drop-shadow-md">Impor dari AniList</h3>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">
              Sinkronisasi Koleksi
            </p>
          </div>
        </div>

        <p className="text-[11px] text-gray-300 mb-6 bg-black/40 p-4 rounded-xl border border-white/5 leading-relaxed font-medium">
          Masukkan username publik akun AniList. Seluruh daftar status (
          <em className="text-red-400 font-bold">Watching</em>, <em className="text-red-400 font-bold">Completed</em>, <em className="text-red-400 font-bold">Plan to Watch</em>) beserta progres episode dan ratingmu akan disinkronkan.
        </p>

        <form onSubmit={handleImport} className="flex flex-col gap-5">
          <div>
            <label className="text-[10px] font-black text-gray-400 mb-2 block uppercase tracking-widest pl-1">
              Username AniList
            </label>
            <input
              type="text"
              placeholder="Contoh: OtakuMaster99"
              className="input-field w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-4 text-sm mt-2 flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <>
                <FaSpinner className="animate-spin" /> Sedang Mengimpor...
              </>
            ) : (
              "Mulai Sinkronisasi Data"
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
