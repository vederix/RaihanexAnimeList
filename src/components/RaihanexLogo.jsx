/**
 * Komponen Logo RAIHANEX
 * Menggunakan konsep geometris futuristik (Hexagon + Abstract RX)
 * dipadukan dengan Dark Red Neon Glow effect melalui Tailwind CSS dan properti SVG.
 * 
 * @param {string} className - Class tambahan untuk mengatur ukuran container logo (default: h-12 text-3xl)
 * @param {boolean} iconOnly - Set true jika hanya ingin merender ikon tanpa teks (cocok untuk mobile/favicon)
 */
const RaihanexLogo = ({ className = "h-12 text-3xl", iconOnly = false }) => {
  return (
    <div
      className={`flex items-center gap-3 ${className} group cursor-pointer select-none`}
      title="RAIHANEX"
    >
      {/* --- GEOMETRIC FUTURISTIC ICON --- */}
      <div className="relative h-full aspect-square flex-shrink-0 transition-transform duration-700 ease-out group-hover:scale-110 group-hover:rotate-[5deg]">
        {/* Background Neon Blur Glow */}
        <div className="absolute inset-0 bg-red-600 rounded-full blur-[14px] opacity-40 group-hover:opacity-80 transition-opacity duration-500 mix-blend-screen"></div>

        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative w-full h-full drop-shadow-[0_0_15px_rgba(220,38,38,0.7)] z-10"
        >
          {/* Definisi Gradients */}
          <defs>
            {/* Gradien Merah Neon */}
            <linearGradient id="rx-primary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff4d4d" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
            {/* Gradien Silver/Putih Metalik */}
            <linearGradient
              id="rx-secondary"
              x1="0%"
              y1="100%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#888888" />
            </linearGradient>
          </defs>

          {/* 1. Outer Tech Hexagon Frame */}
          <polygon
            points="50,4 96,27 96,73 50,96 4,73 4,27"
            stroke="url(#rx-primary)"
            strokeWidth="3.5"
            fill="#0a0202"
            strokeLinejoin="round"
            className="transition-all duration-500 group-hover:stroke-[#ff7373]"
          />

          {/* 2. Garis Futuristik (Memberi efek "X" tersembunyi / Slash) */}
          <line
            x1="18"
            y1="77"
            x2="82"
            y2="23"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.3"
            className="group-hover:opacity-100 transition-opacity duration-500"
          />

          {/* 3. Tiang Vertikal 'R' (Left Pillar) */}
          <rect
            x="30"
            y="25"
            width="12"
            height="50"
            rx="2.5"
            fill="url(#rx-secondary)"
          />

          {/* 4. Kepala Huruf 'R' (Top Loop) */}
          <path
            d="M42,25 H58 A 15,15 0 0 1 73,40 A 15,15 0 0 1 58,55 H42 V 43 H58 A 3,3 0 0 0 61,40 A 3,3 0 0 0 58,37 H42 Z"
            fill="url(#rx-secondary)"
          />

          {/* 5. Kaki 'R' yang menyilang membetuk 'X' (Right Leg) */}
          <polygon
            points="48,52 64,52 82,75 62,75"
            fill="url(#rx-primary)"
            className="group-hover:translate-x-1 group-hover:translate-y-1 transition-transform duration-500"
          />
        </svg>
      </div>

      {/* --- TEKS LOGO --- */}
      {!iconOnly && (
        <div className="flex items-center font-black tracking-tighter uppercase relative z-10">
          <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            RAIHAN
          </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-red-500 via-red-600 to-red-900 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] relative">
            EX
            {/* Aksen titik merah / dekorasi */}
            <span className="absolute -right-3 bottom-1.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)] animate-pulse"></span>
            
            {/* Garis bawah menyala saat di-hover */}
            <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-red-500 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left shadow-[0_0_10px_rgba(220,38,38,1)]"></span>
          </span>
        </div>
      )}
    </div>
  );
};

export default RaihanexLogo;
