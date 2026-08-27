import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { fetchAniList } from "../utils/anilist";
import { useAuth } from "../context/AuthContext";
import AnimeCard from "../components/AnimeCard";
import SkeletonCard from "../components/SkeletonCard";
import { FaTrash, FaLock, FaGlobe, FaArrowLeft } from "react-icons/fa";
import toast from "react-hot-toast";
import { showConfirmToast } from "../utils/confirmToast.jsx";

const COLLECTION_ANIME_QUERY = `
  query ($ids: [Int]) {
    Page(perPage: 50) {
      media(id_in: $ids, type: ANIME) {
        id
        title { romaji english }
        coverImage { large extraLarge }
        averageScore
        format
        episodes
        status
        seasonYear
      }
    }
  }
`;

export default function CollectionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [collection, setCollection] = useState(null);
  const [animes, setAnimes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCollectionDetail = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("id", id)
        .single();
        
      if (error) throw error;
      setCollection(data);

      if (data.anime_ids && data.anime_ids.length > 0) {
        // Chunking IDs into batches of 50 to prevent AniList perPage truncation
        const CHUNK_SIZE = 50;
        const chunks = [];
        for (let i = 0; i < data.anime_ids.length; i += CHUNK_SIZE) {
          chunks.push(data.anime_ids.slice(i, i + CHUNK_SIZE));
        }

        const results = await Promise.all(
          chunks.map((chunkIds) =>
            fetchAniList(COLLECTION_ANIME_QUERY, { ids: chunkIds })
          )
        );

        const allMedia = results.flatMap((res) => res?.Page?.media || []);
        setAnimes(allMedia);
      } else {
        setAnimes([]);
      }
    } catch {
      toast.error("Koleksi tidak ditemukan atau tidak ada akses.");
      navigate("/collections");
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchCollectionDetail();
  }, [fetchCollectionDetail]);

  function handleDelete() {
    showConfirmToast({
      title: "Hapus Koleksi?",
      message: "Semua data koleksi ini akan hilang permanen dan tidak bisa dikembalikan.",
      confirmText: "Hapus Koleksi",
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          const { error } = await supabase.from("collections").delete().eq("id", id);
          if (error) throw error;
          toast.success("Koleksi berhasil dihapus.");
          navigate("/collections");
        } catch {
          toast.error("Gagal menghapus koleksi.");
          setIsDeleting(false);
        }
      },
    });
  }

  async function handleRemoveAnime(animeId) {
    if (!user || user.id !== collection.user_id) return;
    showConfirmToast({
      title: "Hapus dari Koleksi?",
      message: "Anime ini akan dihapus dari daftar koleksi kamu.",
      confirmText: "Ya, Hapus",
      onConfirm: async () => {
        try {
          const newIds = collection.anime_ids.filter(aid => aid !== animeId);
          const { error } = await supabase.from("collections").update({ anime_ids: newIds }).eq("id", id);
          if (error) throw error;
          setCollection({ ...collection, anime_ids: newIds });
          setAnimes(animes.filter(a => a.id !== animeId));
          toast.success("Anime dihapus dari koleksi.");
        } catch {
          toast.error("Gagal menghapus anime.");
        }
      },
    });
  }

  if (isLoading) {
    return (
      <div className="pt-24 min-h-screen px-4 pb-12 max-w-7xl mx-auto">
         <div className="animate-pulse flex flex-col gap-4 mb-8">
           <div className="h-10 bg-white/10 w-1/3 rounded"></div>
           <div className="h-6 bg-white/10 w-1/2 rounded"></div>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
           {Array.from({length: 5}).map((_,i) => <SkeletonCard key={i} />)}
         </div>
      </div>
    );
  }

  if (!collection) return null;

  const isOwner = user && user.id === collection.user_id;

  return (
    <div className="pt-24 min-h-screen px-4 pb-12 max-w-7xl mx-auto">
      <Link to="/collections" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 font-medium">
        <FaArrowLeft /> Kembali ke Daftar Koleksi
      </Link>

      <div className="glass-card p-6 lg:p-10 mb-8 relative overflow-hidden rounded-3xl border-t border-red-900/50 shadow-[0_20px_40px_rgba(0,0,0,0.5)] animate-scale-up">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none text-red-500">
          {collection.is_public ? <FaGlobe size={150} /> : <FaLock size={150} />}
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-5xl font-black text-white">{collection.title}</h1>
              {collection.is_public ? 
                <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><FaGlobe/> Publik</span> :
                <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><FaLock/> Privat</span>
              }
            </div>
            <p className="text-gray-400 text-lg max-w-3xl">{collection.description || "Tidak ada deskripsi."}</p>
          </div>

          {isOwner && (
            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-950/80 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold whitespace-nowrap shadow-[0_10px_20px_rgba(0,0,0,0.3)] hover:-translate-y-1"
            >
              <FaTrash /> Hapus Koleksi
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 text-xl font-bold text-white border-l-4 border-red-500 pl-3">
        Daftar Anime ({animes.length})
      </div>

      {animes.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-3xl border-dashed border-2 border-red-900/30">
          <p className="text-gray-400 text-lg">Koleksi ini masih kosong.</p>
          {isOwner && <p className="text-sm text-gray-500 mt-2">Buka halaman detail anime dan klik "Tambahkan ke Koleksi".</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {animes.map(anime => (
            <div key={anime.id} className="relative group">
              <AnimeCard anime={anime} />
              {isOwner && (
                <button 
                  onClick={(e) => { e.preventDefault(); handleRemoveAnime(anime.id); }}
                  className="absolute top-2 right-2 bg-red-950/90 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:scale-110 z-20 border border-red-500/30 shadow-lg"
                  title="Hapus dari koleksi"
                >
                  <FaTrash size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
