import { FaInfoCircle } from "react-icons/fa";

export default function AnimeInfoTable({ anime }) {
  if (!anime) return null;

  const infoRows = [
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
  ];

  return (
    <div className="glass-card p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col gap-4">
      <h4 className="text-white font-bold flex items-center gap-2 mb-2 border-b border-red-900/30 pb-3 uppercase tracking-wider text-sm">
        <FaInfoCircle className="text-red-500" /> Informasi Teknis
      </h4>
      {infoRows.map((info, idx) => (
        <div
          key={idx}
          className="flex justify-between items-center text-sm border-b border-red-900/10 pb-2 last:border-0 last:pb-0"
        >
          <span className="text-gray-400 font-medium">{info.label}</span>
          <span
            className={`font-bold capitalize text-right ${
              info.highlight
                ? "text-red-400 bg-red-900/20 px-2 py-0.5 rounded-md border border-red-900/30"
                : "text-gray-200"
            }`}
          >
            {info.value || "?"}
          </span>
        </div>
      ))}
    </div>
  );
}
