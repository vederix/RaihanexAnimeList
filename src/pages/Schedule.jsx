import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaStar,
  FaClock,
  FaHome,
  FaPlayCircle,
  FaCalendarPlus,
  FaDownload,
} from "react-icons/fa";
import { fetchAniList } from "../utils/anilist";
import { generateGoogleCalendarUrl, downloadIcsFile } from "../utils/calendar";

const SCHEDULE_QUERY = `
  query ($page: Int, $startTime: Int, $endTime: Int) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      airingSchedules(airingAt_greater: $startTime, airingAt_lesser: $endTime, sort: TIME) {
        id
        episode
        airingAt
        media {
          id
          title { romaji english }
          coverImage { large }
          averageScore
        }
      }
    }
  }
`;

const Schedule = () => {
  const [scheduleData, setScheduleData] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Generate 7 Hari Penuh
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const fetchSchedule = async () => {
    setIsError(false);
    try {
      const startTime = Math.floor(days[0].getTime() / 1000);
      const endTime = Math.floor(
        new Date(days[6]).setHours(23, 59, 59, 999) / 1000,
      );

      let allSchedules = [];
      let page = 1;
      let hasNextPage = true;

      // Safety limit: max 5 halaman (250 anime) untuk mencegah rate-limit 429 dari AniList
      while (hasNextPage && page <= 5) {
        const data = await fetchAniList(SCHEDULE_QUERY, {
          page,
          startTime,
          endTime,
        });
        allSchedules = [
          ...allSchedules,
          ...(data?.Page?.airingSchedules || []),
        ];
        hasNextPage = data?.Page?.pageInfo?.hasNextPage || false;
        page++;
      }

      const grouped = days.map((day) => {
        const startOfDay = Math.floor(day.getTime() / 1000);
        const endOfDay = Math.floor(
          new Date(day).setHours(23, 59, 59, 999) / 1000,
        );
        return allSchedules.filter(
          (item) => item.airingAt >= startOfDay && item.airingAt <= endOfDay,
        );
      });

      setScheduleData(grouped);
    } catch (error) {
      console.error("Gagal memuat jadwal:", error);
      setIsError(true);
      setScheduleData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getDayName = (date, index) => {
    if (index === 0) return "Hari Ini";
    if (index === 1) return "Besok";
    return date.toLocaleDateString("id-ID", { weekday: "long" });
  };

  return (
    <div className="pb-16 mt-8 min-h-[80vh] relative z-10 pt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* --- HEADER SECTION GLASSMORPHISM --- */}
        <div className="relative mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 overflow-hidden glass-card p-8 md:p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] group border-t border-red-900/50 animate-scale-up">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-red-600/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-red-600/20 transition-all duration-700"></div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-950/50 border border-red-500/30 text-red-300 text-xs font-bold mb-4 backdrop-blur-md shadow-inner">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Update Real-time
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-lg mb-2">
              Jadwal{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300">
                Mingguan
              </span>
            </h1>
            <p className="text-red-100/60 mt-3 max-w-2xl text-sm md:text-base leading-relaxed font-medium">
              Pantau jadwal tayang anime favoritmu untuk 7 hari ke depan. Waktu
              rilis disinkronkan otomatis dengan zona waktu perangkatmu.
            </p>
          </div>

          <Link
            to="/"
            className="relative z-10 btn-secondary px-6 py-3.5 flex items-center gap-2 w-max h-max shadow-[0_10px_20px_rgba(0,0,0,0.4)] hover:-translate-y-1"
          >
            <FaHome className="text-lg" /> Beranda
          </Link>
        </div>

        {/* --- TABS NAVIGASI HARI --- */}
        <div className="flex overflow-x-auto gap-3 pb-4 mb-8 scroll-smooth snap-x relative z-10 hide-scrollbar cursor-grab active:cursor-grabbing">
          {days.map((day, index) => {
            const count = scheduleData[index]?.length || 0;
            const isActive = activeTab === index;
            const isToday = index === 0;

            return (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`snap-center flex-shrink-0 flex items-center gap-3 px-6 py-3.5 rounded-2xl font-bold transition-all duration-300 border shadow-md group cursor-pointer active:scale-95 ${
                  isActive
                    ? "bg-gradient-to-r from-red-700 to-red-600 text-white border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.5)] scale-[1.02]"
                    : "glass-card text-gray-400 border-red-900/30 hover:bg-red-950/60 hover:text-white hover:border-red-500/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isToday && (
                    <span
                      className={`w-2 h-2 rounded-full ${isActive ? "bg-white animate-pulse" : "bg-red-500"}`}
                    ></span>
                  )}
                  <span className="whitespace-nowrap tracking-wide">
                    {getDayName(day, index)}
                  </span>
                </div>
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-black transition-colors ${
                    isActive
                      ? "bg-black/30 text-white shadow-inner"
                      : "bg-red-900/30 text-red-400 group-hover:text-red-300"
                  }`}
                >
                  {isLoading ? "..." : count}
                </span>
              </button>
            );
          })}
        </div>

        {/* --- KONTEN JADWAL --- */}
        {isLoading ? (
          <div className="flex justify-center items-center py-32">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FaClock className="text-red-500/50 text-xl animate-pulse" />
              </div>
            </div>
          </div>
        ) : isError ? (
          <div className="glass-card rounded-3xl py-24 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] px-4 animate-fade-in border-t border-red-900/50">
            <div className="bg-red-900/20 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 border border-red-900/50 shadow-inner">
              <FaClock className="text-4xl text-red-500/70" />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white mb-2">
              Gagal Memuat Jadwal
            </h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
              Terjadi kendala koneksi ke server AniList. Silakan coba kembali.
            </p>
            <button
              onClick={fetchSchedule}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-lg cursor-pointer text-sm"
            >
              Muat Ulang Jadwal
            </button>
          </div>
        ) : !scheduleData[activeTab] || scheduleData[activeTab].length === 0 ? (
          <div className="glass-card rounded-3xl py-32 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in border-t border-red-900/50">
            <div className="bg-red-900/20 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 border border-red-900/50 shadow-inner">
              <FaClock className="text-5xl text-red-500/70" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">
              Jadwal Kosong
            </h3>
            <p className="text-gray-400 text-base max-w-sm mx-auto">
              Tidak ada anime yang dijadwalkan tayang pada hari ini. Silakan cek
              hari lainnya!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 animate-fade-in pb-10">
            {scheduleData[activeTab]?.map((item) => {
              const timeString = new Date(
                item.airingAt * 1000,
              ).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <Link
                  to={`/anime/${item.media?.id}`}
                  key={item.id}
                  className="group relative glass-card glass-card-hover rounded-2xl overflow-hidden shadow-xl flex flex-col h-full hover:-translate-y-1.5"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-red-900/0 to-red-900/0 group-hover:from-red-900/20 transition-all duration-500 z-10 pointer-events-none"></div>

                  {/* Badge Waktu & Episode */}
                  <div className="absolute top-2.5 right-2.5 bg-red-600/90 backdrop-blur-md text-white text-[10px] md:text-xs font-bold px-2.5 py-1 md:py-1.5 rounded-lg shadow-md z-20 flex items-center gap-1.5 border border-red-400/50 group-hover:bg-red-500 transition-colors">
                    <FaClock size={10} /> {timeString}
                  </div>

                  <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-md text-white text-[9px] md:text-[10px] font-black px-2.5 py-1 md:py-1.5 rounded-lg shadow-md z-20 border border-red-900/60 uppercase tracking-widest">
                    EP {item.episode}
                  </div>

                  {/* Ikon Play Hover */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
                    <FaPlayCircle className="text-white/80 text-5xl drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]" />
                  </div>

                  {/* Cover Image */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-black/50">
                    <img
                      src={item.media?.coverImage?.large}
                      alt={item.media?.title?.romaji || "Cover"}
                      className="w-full h-full object-cover group-hover:scale-110 group-hover:brightness-75 transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050101] via-[#050101]/40 to-transparent opacity-95"></div>
                  </div>

                  {/* Info Text */}
                  <div className="p-4 flex flex-col flex-grow justify-between relative z-20 -mt-12">
                    <div>
                      <h3 className="text-white font-black text-xs md:text-sm line-clamp-2 leading-snug drop-shadow-lg group-hover:text-red-400 transition-colors">
                        {item.media?.title?.romaji}
                      </h3>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-md border border-red-900/30 shadow-inner">
                        <FaStar className="text-yellow-400 text-[9px] drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]" />
                        <span className="text-white text-[10px] md:text-xs font-bold">
                          {item.media?.averageScore
                            ? (item.media.averageScore / 10).toFixed(1)
                            : "N/A"}
                        </span>
                      </div>

                      {/* Quick Add to Calendar Action */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(
                              generateGoogleCalendarUrl({
                                title: item.media?.title?.romaji || "Anime",
                                episode: item.episode,
                                airingAt: item.airingAt,
                              }),
                              "_blank"
                            );
                          }}
                          className="p-1.5 rounded-lg bg-red-600/30 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 transition-all cursor-pointer shadow-sm"
                          title="Tambah ke Google Calendar"
                        >
                          <FaCalendarPlus size={11} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            downloadIcsFile({
                              title: item.media?.title?.romaji || "Anime",
                              episode: item.episode,
                              airingAt: item.airingAt,
                            });
                          }}
                          className="p-1.5 rounded-lg bg-black/60 hover:bg-white/10 text-gray-400 hover:text-white border border-red-900/30 transition-all cursor-pointer shadow-sm"
                          title="Unduh Pengingat .ICS"
                        >
                          <FaDownload size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedule;
