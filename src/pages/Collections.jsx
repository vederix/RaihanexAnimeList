import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { FaPlus, FaTimes, FaLock, FaGlobe, FaLayerGroup } from "react-icons/fa";
import toast from "react-hot-toast";

export default function Collections() {
  const { user } = useAuth();
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form Create
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCollections = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from("collections").select("*").order("created_at", { ascending: false });
      
      if (user) {
        // Fetch public OR user's own
        query = query.or(`is_public.eq.true,user_id.eq.${user.id}`);
      } else {
        query = query.eq("is_public", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCollections(data || []);
    } catch {
      toast.error("Gagal memuat koleksi.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Judul wajib diisi.");
    setIsSubmitting(true);
    try {
      const newCol = {
        user_id: user.id,
        title: title.trim(),
        description: desc.trim(),
        is_public: isPublic,
        anime_ids: []
      };
      const { data, error } = await supabase.from("collections").insert([newCol]).select();
      if (error) throw error;
      
      setCollections([data[0], ...collections]);
      setShowForm(false);
      setTitle("");
      setDesc("");
      toast.success("Koleksi berhasil dibuat!");
    } catch {
      toast.error("Gagal membuat koleksi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="pt-24 min-h-screen px-4 pb-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300 flex items-center gap-3">
            <FaLayerGroup className="text-red-500" /> KURASI KOLEKSI
          </h1>
          <p className="text-gray-400 mt-2 font-medium">Temukan koleksi anime menarik atau buat daftar spesialmu sendiri.</p>
        </div>
        
        {user && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg flex items-center gap-2"
          >
            {showForm ? <FaTimes /> : <FaPlus />} 
            {showForm ? "Batal" : "Buat Koleksi Baru"}
          </button>
        )}
      </div>

      {showForm && user && (
        <form onSubmit={handleCreate} className="bg-black/40 border border-white/10 p-6 rounded-2xl mb-8 animate-fade-in">
          <div className="flex flex-col gap-4 max-w-2xl">
            <input 
              type="text" 
              placeholder="Nama Koleksi (misal: Anime Sci-Fi Terbaik)"
              className="bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea 
              placeholder="Deskripsi koleksi..."
              className="bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none h-24 resize-none"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="visibility" checked={isPublic} onChange={() => setIsPublic(true)} className="accent-red-500" />
                <span className="text-gray-300 text-sm flex items-center gap-1"><FaGlobe /> Publik</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="visibility" checked={!isPublic} onChange={() => setIsPublic(false)} className="accent-red-500" />
                <span className="text-gray-300 text-sm flex items-center gap-1"><FaLock /> Privat</span>
              </label>
            </div>
            <button disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all">
              {isSubmitting ? "Menyimpan..." : "Simpan Koleksi"}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full"></div></div>
      ) : collections.length === 0 ? (
        <div className="text-center py-20 text-gray-500">Belum ada koleksi yang dibuat.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map(col => (
            <Link key={col.id} to={`/collection/${col.id}`} className="block group">
              <div className="bg-black/30 border border-white/10 rounded-2xl p-6 h-full hover:border-red-500/50 hover:bg-white/5 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors line-clamp-2">{col.title}</h3>
                  {col.is_public ? <FaGlobe className="text-gray-500" title="Publik"/> : <FaLock className="text-yellow-500" title="Privat"/>}
                </div>
                <p className="text-gray-400 text-sm line-clamp-3 mb-4">{col.description || "Tidak ada deskripsi."}</p>
                <div className="flex items-center gap-2 text-xs font-bold text-red-500/80 bg-red-500/10 w-fit px-3 py-1 rounded-full">
                  <FaLayerGroup /> {col.anime_ids?.length || 0} Anime
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
