import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient";
import { FaTimes, FaPlus, FaCheck, FaLayerGroup } from "react-icons/fa";
import toast from "react-hot-toast";

export default function CollectionModal({ isOpen, onClose, animeId, user }) {
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  const fetchUserCollections = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setCollections(data || []);
    } catch {
      toast.error("Gagal memuat koleksi milikmu.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      fetchUserCollections();
    }
  }, [isOpen, user, fetchUserCollections]);

  async function toggleAnimeInCollection(col) {
    if (isProcessing) return;
    setIsProcessing(true);
    
    const ids = col.anime_ids || [];
    const isAdded = ids.includes(animeId);
    let newIds = [];
    
    if (isAdded) {
      newIds = ids.filter(id => id !== animeId);
    } else {
      newIds = [...ids, animeId];
    }

    try {
      const { error } = await supabase
        .from("collections")
        .update({ anime_ids: newIds })
        .eq("id", col.id);
        
      if (error) throw error;
      
      setCollections(collections.map(c => c.id === col.id ? { ...c, anime_ids: newIds } : c));
      toast.success(isAdded ? "Dihapus dari koleksi." : "Ditambahkan ke koleksi!");
    } catch {
      toast.error("Gagal memperbarui koleksi.");
    } finally {
      setIsProcessing(false);
    }
  }

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
      <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md relative shadow-[0_30px_60px_rgba(0,0,0,0.9)] my-auto animate-scale-up" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-red-950/80 hover:bg-red-600 border border-red-500/40 text-white w-8 h-8 rounded-full flex items-center justify-center transition-all z-20 shadow-[0_0_15px_rgba(220,38,38,0.3)] cursor-pointer active:scale-95"
          aria-label="Tutup"
        >
          <FaTimes size={14} />
        </button>
        
        <h3 className="text-xl font-black text-white flex items-center gap-3 mb-6 drop-shadow-md">
          <div className="bg-red-950/80 p-2 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.3)]">
            <FaLayerGroup className="text-red-500" />
          </div>
          Simpan ke Koleksi
        </h3>
        
        <div className="max-h-64 overflow-y-auto pr-2 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-red-500/50 scrollbar-track-white/5">
          {isLoading ? (
            <div className="text-center py-8 text-red-400 text-sm font-bold animate-pulse">Memuat...</div>
          ) : collections.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Kamu belum punya koleksi.<br/>Buat di menu Koleksi.</div>
          ) : (
            collections.map(col => {
              const isAdded = (col.anime_ids || []).includes(animeId);
              return (
                <button
                  key={col.id}
                  onClick={() => toggleAnimeInCollection(col)}
                  disabled={isProcessing}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 text-left cursor-pointer active:scale-[0.98] ${
                    isAdded ? "bg-red-900/40 border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.2)]" : "bg-black/40 border-red-900/30 hover:border-red-500/40 hover:bg-[#1a0505]/60 hover:shadow-[0_4px_12px_rgba(220,38,38,0.1)]"
                  }`}
                >
                  <div>
                    <div className={`font-bold text-sm line-clamp-1 transition-colors ${isAdded ? "text-white" : "text-gray-200 group-hover:text-white"}`}>{col.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{(col.anime_ids || []).length} Anime</div>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${
                    isAdded ? "bg-gradient-to-br from-red-600 to-red-800 text-white shadow-[0_0_10px_rgba(220,38,38,0.6)]" : "bg-black/50 text-gray-400 border border-red-900/30"
                  }`}>
                    {isAdded ? <FaCheck /> : <FaPlus />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
