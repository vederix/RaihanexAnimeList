import toast from "react-hot-toast";

/**
 * Menampilkan dialog konfirmasi bergaya custom (toast) yang konsisten di seluruh aplikasi dengan tema Ultra-Dark Crimson Glass.
 *
 * @param {object} options
 * @param {string} options.title - Judul dialog (mis: "Hapus Ulasan?")
 * @param {string} options.message - Pesan deskripsi (mis: "Tindakan ini tidak bisa dibatalkan.")
 * @param {string} [options.confirmText="Hapus"] - Label tombol konfirmasi
 * @param {string} [options.cancelText="Batal"] - Label tombol batal
 * @param {string} [options.confirmStyle] - Kelas Tailwind ekstra untuk tombol konfirmasi
 * @param {Function} options.onConfirm - Callback async/sync yang dijalankan saat user konfirmasi
 */
export function showConfirmToast({
  title,
  message,
  confirmText = "Hapus",
  cancelText = "Batal",
  confirmStyle = "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]",
  onConfirm,
}) {
  toast(
    (t) => (
      <div className="flex flex-col gap-2.5 p-1 w-full min-w-[260px]">
        <span className="font-black text-white text-center text-base tracking-tight drop-shadow-md">
          {title}
        </span>
        {message && (
          <span className="text-xs text-gray-300 text-center leading-relaxed mb-1 font-medium">
            {message}
          </span>
        )}
        <div className="flex justify-center gap-2.5 mt-1">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              await onConfirm?.();
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold w-full transition-all cursor-pointer active:scale-95 border border-red-500/30 ${confirmStyle}`}
          >
            {confirmText}
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="bg-black/60 hover:bg-white/10 text-gray-300 hover:text-white border border-red-900/40 px-4 py-2.5 rounded-xl text-xs font-bold w-full transition-all cursor-pointer active:scale-95"
          >
            {cancelText}
          </button>
        </div>
      </div>
    ),
    { duration: 10000 }
  );
}

