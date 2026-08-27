import { Link, useNavigate } from "react-router-dom";
import { FaHome, FaSearch, FaArrowLeft, FaCompass } from "react-icons/fa";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
      <div className="relative max-w-lg w-full text-center">
        {/* Glow backdrop effect */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Card Container */}
        <div className="relative glass-card p-8 sm:p-12 rounded-3xl border border-red-900/40 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          {/* Animated 404 Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-950/60 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest mb-6">
            <FaCompass className="animate-spin text-red-500" style={{ animationDuration: "6s" }} />
            <span>Error 404 • Page Not Found</span>
          </div>

          <h1 className="text-6xl sm:text-8xl font-black tracking-tight text-white mb-2 drop-shadow-[0_0_25px_rgba(239,68,68,0.3)]">
            4<span className="text-red-500">0</span>4
          </h1>

          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
            Halaman Tidak Ditemukan
          </h2>

          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-8">
            Sepertinya anime atau halaman yang kamu cari tersesat di dimensi lain atau URL yang dituju salah.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
            >
              <FaArrowLeft className="text-xs" />
              Kembali
            </button>

            <Link
              to="/"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-semibold text-sm shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
            >
              <FaHome className="text-sm" />
              Beranda
            </Link>

            <Link
              to="/search"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-950/40 hover:bg-red-900/40 text-red-300 hover:text-white border border-red-800/40 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
            >
              <FaSearch className="text-xs" />
              Cari Anime
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
