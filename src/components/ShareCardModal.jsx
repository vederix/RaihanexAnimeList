import { useEffect, useRef, useState } from "react";
import { FaTimes, FaDownload } from "react-icons/fa";

const ShareCardModal = ({ anime, userRating, onClose }) => {
  const canvasRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [imgUrl, setImgUrl] = useState("");

  useEffect(() => {
    let isCancelled = false;

    const generateCard = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const width = 1080;
      const height = 1920;

      const coverSrc = anime.coverImage?.extraLarge || anime.coverImage?.large;

      const drawCardWithImage = (imageObj) => {
        // 1. Background
        ctx.fillStyle = "#050101";
        ctx.fillRect(0, 0, width, height);

        if (imageObj) {
          // 2. Poster Buram untuk latar
          ctx.filter = "blur(20px) brightness(0.35)";
          ctx.drawImage(imageObj, 0, 0, width, height);
          ctx.filter = "none";

          // 3. Poster utama di tengah
          const posterWidth = 700;
          const posterHeight = 1000;
          const posterX = (width - posterWidth) / 2;
          const posterY = 250;

          ctx.shadowColor = "rgba(0,0,0,0.9)";
          ctx.shadowBlur = 45;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 20;

          ctx.drawImage(imageObj, posterX, posterY, posterWidth, posterHeight);

          // Reset Shadow
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        } else {
          // Fallback Gradient
          const grad = ctx.createLinearGradient(0, 0, 0, height);
          grad.addColorStop(0, "#250303");
          grad.addColorStop(1, "#050000");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
        }

        // 4. Texts
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";

        // Judul Anime
        ctx.font = "bold 60px sans-serif";
        let title = anime.title?.romaji || anime.title?.english || "Anime";
        if (title.length > 28) title = title.substring(0, 25) + "...";
        ctx.fillText(title, width / 2, 1400);

        // Format & Episode
        ctx.font = "bold 40px sans-serif";
        ctx.fillStyle = "#9ca3af";
        const info = `${anime.format?.replace("_", " ") || "ANIME"} • ${
          anime.episodes || "?"
        } Episode`;
        ctx.fillText(info, width / 2, 1480);

        // Rating
        ctx.font = "bold 50px sans-serif";
        ctx.fillStyle = "#fbbf24";
        const ratingText =
          userRating > 0
            ? `My Rating: ★ ${userRating}/10`
            : `Global Rating: ★ ${
                anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "?"
              }/10`;
        ctx.fillText(ratingText, width / 2, 1580);

        // Branding Footer
        ctx.font = "900 45px sans-serif";
        ctx.fillStyle = "#ef4444";
        ctx.fillText("RAIHANEX ANIME LIST", width / 2, 1800);

        try {
          const dataUrl = canvas.toDataURL("image/png");
          if (!isCancelled) {
            setImgUrl(dataUrl);
            setIsGenerating(false);
          }
        } catch (err) {
          console.warn("Canvas export fallback:", err);
          if (!isCancelled) setIsGenerating(false);
        }
      };

      try {
        // Fetch via Blob URL untuk mencegah browser caching tanpa CORS header
        const res = await fetch(coverSrc, { mode: "cors" });
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          drawCardWithImage(img);
          URL.revokeObjectURL(objectUrl);
        };
        img.onerror = () => {
          drawCardWithImage(null);
        };
        img.src = objectUrl;
      } catch {
        // Fallback standar crossOrigin Image
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => drawCardWithImage(img);
        img.onerror = () => drawCardWithImage(null);
        img.src = coverSrc;
      }
    };

    generateCard();

    return () => {
      isCancelled = true;
    };
  }, [anime, userRating]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-sm md:max-w-md bg-[#0a0202] border border-red-900/50 rounded-3xl shadow-[0_20px_60px_rgba(220,38,38,0.2)] p-6 flex flex-col items-center animate-fade-in z-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-red-600 transition-colors border border-white/10 cursor-pointer"
        >
          <FaTimes />
        </button>

        <h3 className="text-xl font-bold text-white mb-4 mt-2">
          Bagikan Anime Ini
        </h3>

        {/* Hidden Canvas */}
        <canvas
          ref={canvasRef}
          width={1080}
          height={1920}
          className="hidden"
        ></canvas>

        {isGenerating ? (
          <div className="w-full aspect-[9/16] bg-slate-900/50 rounded-xl flex items-center justify-center border border-red-900/30">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500"></div>
          </div>
        ) : imgUrl ? (
          <>
            <img
              src={imgUrl}
              alt="Share Card"
              className="w-full max-h-[60vh] object-contain rounded-xl shadow-lg border border-red-900/30 mb-6"
            />
            <a
              href={imgUrl}
              download={`raihanex-${
                anime.title?.romaji?.replace(/\s+/g, "-").toLowerCase() ||
                "anime"
              }.png`}
              className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all cursor-pointer"
            >
              <FaDownload /> Download Kartu
            </a>
          </>
        ) : (
          <div className="text-gray-400 text-center py-10 px-4 bg-red-900/10 rounded-xl border border-red-900/30 w-full aspect-[9/16] flex flex-col items-center justify-center">
            <FaTimes size={40} className="text-red-500 mb-4 opacity-50" />
            <p className="font-bold text-sm">Gagal membuat kartu gambar.</p>
            <p className="text-xs mt-2 text-gray-500">
              Coba kembali beberapa saat lagi.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareCardModal;
