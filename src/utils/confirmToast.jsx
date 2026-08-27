import toast from "react-hot-toast";

/**
 * Menampilkan dialog konfirmasi bergaya custom (toast) yang konsisten di seluruh aplikasi.
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
  confirmStyle = "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30",
  onConfirm,
}) {
  toast(
    (t) => (
      <div className="flex flex-col gap-3 p-2 w-full min-w-[250px]">
        <span className="font-bold text-gray-800 text-center text-lg">
          {title}
        </span>
        {message && (
          <span className="text-sm text-gray-500 text-center mb-1">
            {message}
          </span>
        )}
        <div className="flex justify-center gap-3">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              await onConfirm?.();
            }}
            className={`text-white px-4 py-2.5 rounded-xl text-sm font-bold w-full transition-all cursor-pointer ${confirmStyle}`}
          >
            {confirmText}
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold w-full transition-all cursor-pointer"
          >
            {cancelText}
          </button>
        </div>
      </div>
    ),
    { duration: 10000 }
  );
}
