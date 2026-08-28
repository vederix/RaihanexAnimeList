import { FaBell, FaCalendarPlus, FaDownload } from "react-icons/fa";
import { generateGoogleCalendarUrl, downloadIcsFile } from "../utils/calendar";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";

export default function AnimeAiringReminder({ anime, user }) {
  if (!anime?.nextAiringEpisode) return null;

  const { episode, airingAt } = anime.nextAiringEpisode;
  const animeTitle = anime.title?.romaji || anime.title?.english || "Anime";
  const duration = anime.duration || 25;

  const handleSaveReminder = async () => {
    if (!user) {
      return toast.error("Silakan masuk akun untuk menyimpan pengingat!");
    }

    try {
      const { error } = await supabase.from("user_reminders").upsert([
        {
          user_id: user.id,
          anime_id: anime.id,
          anime_title: animeTitle,
          anime_image: anime.coverImage?.large || "",
          episode: episode,
          airing_at: airingAt,
        },
      ]);

      if (error) throw error;
      toast.success("Pengingat episode baru berhasil disimpan ke akun! 🔔");
    } catch (err) {
      console.error("Gagal simpan pengingat:", err);
      toast.error("Gagal menyimpan pengingat.");
    }
  };

  return (
    <div className="glass-card p-6 border-red-500/40 shadow-[0_10px_30px_rgba(220,38,38,0.25)] flex flex-col gap-4 animate-fade-in border-t border-red-900/50">
      <div className="flex items-center gap-2 text-red-400 font-black text-sm uppercase tracking-wider">
        <FaBell className="animate-bounce" /> Jadwal Tayang Berikutnya
      </div>

      <div className="bg-black/60 rounded-2xl p-4 border border-red-900/40">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-400 font-bold">Episode</span>
          <span className="text-white font-black text-base text-red-400">
            EP {episode}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400 font-medium">Waktu Rilis</span>
          <span className="text-gray-200 font-bold">
            {new Date(airingAt * 1000).toLocaleDateString("id-ID", {
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
            title: animeTitle,
            episode: episode,
            airingAt: airingAt,
            durationMinutes: duration,
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
                title: animeTitle,
                episode: episode,
                airingAt: airingAt,
                durationMinutes: duration,
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
  );
}
