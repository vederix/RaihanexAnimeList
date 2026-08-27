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
      <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-md relative shadow-2xl my-auto" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2 bg-white/5 rounded-full hover:bg-red-600 cursor-pointer active:scale-95"
          aria-label="Tutup"
        >
          <FaTimes size={14} />
        </button>
        
        <h3 className="text-xl font-black text-white flex items-center gap-2 mb-4">
          <FaLayerGroup className="text-red-500" /> Simpan ke Koleksi
        </h3>
        
        <div className="max-h-64 overflow-y-auto pr-2 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-red-500/50 scrollbar-track-white/5">
          {isLoading ? (
            <div className="text-center py-4 text-gray-400 text-sm">Memuat...</div>
          ) : collections.length === 0 ? (
            <div className="text-center py-4 text-gray-400 text-sm">Kamu belum punya koleksi.<br/>Buat di menu Koleksi.</div>
          ) : (
            collections.map(col => {
              const isAdded = (col.anime_ids || []).includes(animeId);
              return (
                <button
                  key={col.id}
                  onClick={() => toggleAnimeInCollection(col)}
                  disabled={isProcessing}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left cursor-pointer ${
                    isAdded ? "bg-red-500/20 border-red-500/50" : "bg-white/5 border-white/10 hover:border-red-500/30 hover:bg-white/10"
                  }`}
                >
                  <div>
                    <div className="font-bold text-white text-sm line-clamp-1">{col.title}</div>
                    <div className="text-xs text-gray-400">{(col.anime_ids || []).length} Anime</div>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    isAdded ? "bg-red-500 text-white" : "bg-white/10 text-gray-400"
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
