import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaCalendarAlt, FaStar, FaClock, FaHome } from "react-icons/fa";
import { fetchAniList } from "../utils/anilist";

// Query ke AniList untuk jadwal tayang
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

  // FUNGSI PERBAIKAN: Generate 7 Hari Penuh
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0); // Reset jam ke 00:00:00 untuk acuan awal hari
    return d;
  });

  useEffect(() => {
    const fetchSchedule = async () => {
      setIsLoading(true);
      try {
        // Ambil waktu awal hari ini dan waktu akhir 7 hari ke depan
        const startTime = Math.floor(days[0].getTime() / 1000);
        const endTime = Math.floor(
          new Date(days[6]).setHours(23, 59, 59, 999) / 1000,
        );

        let allSchedules = [];
        let page = 1;
        let hasNextPage = true;

        // Fetching Pagination (karena bisa jadi anime minggu ini sangat banyak)
        while (hasNextPage) {
          const data = await fetchAniList(SCHEDULE_QUERY, {
            page,
            startTime,
            endTime,
          });
          allSchedules = [...allSchedules, ...data.Page.airingSchedules];
          hasNextPage = data.Page.pageInfo.hasNextPage;
          page++;
        }

        // Kelompokkan data anime ke dalam masing-masing hari (0 sampai 6)
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getDayName = (date, index) => {
    if (index === 0) return "Hari Ini";
    if (index === 1) return "Besok";
    return date.toLocaleDateString("id-ID", { weekday: "long" });
  };

  return (
    <div className="pb-16 mt-8 min-h-[75vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header Section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md">
              Jadwal{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300">
                Rilis Mingguan
              </span>
            </h1>
            <p className="text-red-100/70 mt-3 max-w-2xl text-sm md:text-base leading-relaxed">
              Pantau jadwal tayang anime favoritmu untuk 7 hari ke depan. Jadwal
              di bawah ini sudah disesuaikan otomatis dengan zona waktu
              perangkatmu.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-black/40 hover:bg-red-900/40 text-gray-300 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all border border-red-900/30 w-max h-max"
          >
            <FaHome /> Beranda
          </Link>
        </div>

        {/* --- TABS NAVIGASI HARI (SUDAH DIPERBAIKI JADI 7 HARI) --- */}
        <div className="flex overflow-x-auto gap-3 pb-4 mb-6 custom-scrollbar scroll-smooth snap-x">
          {days.map((day, index) => {
            const count = scheduleData[index]?.length || 0;
            const isActive = activeTab === index;

            return (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`snap-center flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition-all border shadow-lg ${
                  isActive
                    ? "bg-gradient-to-r from-red-700 to-red-600 text-white border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.4)] scale-105"
                    : "bg-[#1a0505]/60 backdrop-blur-md text-gray-400 border-red-900/30 hover:bg-red-900/30 hover:text-red-200"
                }`}
              >
                <FaCalendarAlt
                  className={isActive ? "text-white" : "text-red-500/70"}
                />
                <span>{getDayName(day, index)}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ml-1 ${isActive ? "bg-red-900/50 text-white" : "bg-red-950/50 text-red-400"}`}
                >
                  {isLoading ? "..." : `${count} Anime`}
                </span>
              </button>
            );
          })}
        </div>

        {/* --- KONTEN JADWAL --- */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]"></div>
          </div>
        ) : scheduleData[activeTab]?.length === 0 ? (
          <div className="bg-[#1a0505]/40 backdrop-blur-md border border-red-900/30 rounded-3xl py-20 text-center shadow-lg">
            <FaClock className="text-6xl text-red-900/50 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-300">
              Tidak ada jadwal rilis
            </h3>
            <p className="text-gray-500 text-sm mt-2">
              Belum ada anime yang dijadwalkan tayang pada hari ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 animate-fade-in">
            {scheduleData[activeTab]?.map((item) => {
              const timeString = new Date(
                item.airingAt * 1000,
              ).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <Link
                  to={`/anime/${item.media.id}`}
                  key={item.id}
                  className="group relative bg-[#1a0505]/60 backdrop-blur-md rounded-2xl overflow-hidden border border-red-900/30 shadow-lg hover:shadow-[0_0_25px_rgba(220,38,38,0.3)] hover:border-red-500/50 transition-all duration-300 flex flex-col h-full"
                >
                  {/* Badge Waktu Rilis */}
                  <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg z-20 flex items-center gap-1.5 border border-red-400/30 group-hover:bg-red-500 transition-colors">
                    <FaClock /> {timeString}
                  </div>

                  {/* Badge Episode */}
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-lg z-20 border border-red-900/50 uppercase tracking-wider">
                    Ep {item.episode}
                  </div>

                  {/* Cover Image */}
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={item.media.coverImage.large}
                      alt={item.media.title.romaji}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0202] via-[#0a0202]/40 to-transparent opacity-90"></div>
                  </div>

                  {/* Info Text */}
                  <div className="p-4 flex flex-col flex-grow justify-between relative z-10 -mt-12">
                    <div>
                      <h3 className="text-white font-bold text-sm md:text-base line-clamp-2 leading-tight drop-shadow-md group-hover:text-red-400 transition-colors">
                        {item.media.title.romaji}
                      </h3>
                      {item.media.title.english && (
                        <p className="text-gray-400 text-[10px] mt-1 line-clamp-1 italic">
                          {item.media.title.english}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 bg-black/40 w-max px-2 py-1 rounded-md border border-red-900/30">
                      <FaStar className="text-yellow-400 text-[10px]" />
                      <span className="text-white text-xs font-bold">
                        {item.media.averageScore
                          ? (item.media.averageScore / 10).toFixed(1)
                          : "N/A"}
                      </span>
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
