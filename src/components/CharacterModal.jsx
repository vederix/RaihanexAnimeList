import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FaTimes, FaMicrophoneAlt, FaUser } from "react-icons/fa";

const CharacterModal = ({ characterEdge, onClose }) => {
  useEffect(() => {
    if (!characterEdge) return;

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
  }, [characterEdge, onClose]);

  if (!characterEdge) return null;

  const char = characterEdge.node;
  const role = characterEdge.role;
  const va = characterEdge.voiceActors?.[0]; // Ambil VA utama bahasa Jepang

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-2xl glass-card rounded-3xl overflow-hidden flex flex-col md:flex-row animate-scale-up my-auto shadow-[0_30px_60px_rgba(0,0,0,0.9)]">
        {/* Tombol Tutup */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-red-950/80 hover:bg-red-600 border border-red-500/40 text-white w-9 h-9 rounded-full flex items-center justify-center transition-all z-20 shadow-[0_0_15px_rgba(220,38,38,0.3)] cursor-pointer active:scale-95"
          aria-label="Tutup"
        >
          <FaTimes size={14} />
        </button>

        {/* Sisi Karakter (Kiri) */}
        <div className="flex-1 p-6 md:p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-red-900/30 bg-gradient-to-br from-black/40 to-transparent">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-red-600 blur-xl opacity-20 rounded-full animate-pulse"></div>
            <img
              src={char.image?.large}
              alt={char.name?.full}
              className="w-32 h-40 md:w-40 md:h-52 object-cover rounded-2xl relative z-10 border-2 border-red-900/50 shadow-[0_0_20px_rgba(220,38,38,0.3)]"
            />
          </div>
          <h3 className="text-xl md:text-2xl font-black text-white text-center mb-1 drop-shadow-md">
            {char.name?.full}
          </h3>
          <span className="text-[10px] font-black px-3 py-1 bg-red-950/50 text-red-400 rounded-full border border-red-900/50 flex items-center gap-1.5 uppercase tracking-widest shadow-inner">
            <FaUser /> {role}
          </span>
        </div>

        {/* Sisi Seiyuu (Kanan) */}
        <div className="flex-1 p-6 md:p-8 flex flex-col items-center justify-center bg-gradient-to-bl from-black/40 to-transparent">
          {va ? (
            <>
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-blue-600 blur-xl opacity-20 rounded-full animate-pulse"></div>
                <img
                  src={va.image?.large}
                  alt={va.name?.full}
                  className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-full relative z-10 border-2 border-blue-900/50 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-200 text-center mb-1 drop-shadow-md">
                {va.name?.full}
              </h3>
              <span className="text-[10px] font-black px-3 py-1 bg-blue-950/50 text-blue-400 rounded-full border border-blue-900/50 flex items-center gap-1.5 uppercase tracking-widest shadow-inner">
                <FaMicrophoneAlt /> Voice Actor (JP)
              </span>
            </>
          ) : (
            <div className="text-center text-gray-500 flex flex-col items-center gap-3">
              <FaMicrophoneAlt size={40} className="opacity-20" />
              <p className="text-sm font-semibold">Tidak ada data Seiyuu</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CharacterModal;
