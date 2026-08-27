import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';

const ApiErrorState = ({ 
  message = "Gagal memuat data. Periksa koneksi internet atau coba lagi nanti.", 
  onRetry 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 mt-8 glass-card rounded-3xl text-center animate-fade-in border border-red-500/30 bg-[#0d0202]">
      <div className="w-16 h-16 bg-red-950/50 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
        <FaExclamationTriangle className="text-red-500 text-3xl drop-shadow-md" />
      </div>
      <h3 className="text-xl font-black text-white mb-2 tracking-tight">Oops! Terjadi Kesalahan</h3>
      <p className="text-gray-400 text-sm max-w-md mb-6">{message}</p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)] hover:-translate-y-0.5 active:scale-95"
        >
          <FaRedo className="text-sm" /> Coba Lagi
        </button>
      )}
    </div>
  );
};

export default ApiErrorState;
