import { Link } from "react-router-dom";
import { FaSitemap, FaBook, FaTv } from "react-icons/fa";

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

export default function AnimeRelations({ relations }) {
  if (!relations || !relations.edges || relations.edges.length === 0) return null;

  return (
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
        {relations.edges.map((relation, idx) => (
          <Link
            to={`/anime/${relation.node.id}`}
            key={`${relation.node.id}-${idx}`}
            className="glass-card glass-card-hover p-3 flex gap-4 shadow-lg group"
          >
            <div className="w-16 sm:w-20 flex-shrink-0 rounded-lg overflow-hidden relative border border-red-900/40 aspect-[3/4] bg-black">
              <img
                src={relation.node.coverImage?.large}
                alt={relation.node.title?.romaji || "Cover"}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
              />
              <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-sm p-1 rounded text-gray-300 text-[10px] border border-white/10">
                {relation.node.type === "MANGA" ? <FaBook /> : <FaTv />}
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
                  {relation.node.format || "ANIME"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
