import React from "react";
import { FaExclamationTriangle, FaRedo, FaHome } from "react-icons/fa";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <div className="bg-[#0d0202]/80 backdrop-blur-2xl border border-red-900/50 p-8 sm:p-12 rounded-3xl max-w-lg w-full text-center shadow-[0_20px_50px_rgba(220,38,38,0.3)] relative overflow-hidden">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-950/60 rounded-2xl border border-red-500/40 flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)] relative">
              <FaExclamationTriangle size={36} className="relative z-10" />
              <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full animate-pulse"></div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">
              Oops, Terjadi Kendala Teknis!
            </h2>
            <p className="text-red-200/70 text-sm mb-6 leading-relaxed">
              Terjadi anomali saat memuat halaman ini. Jangan khawatir, data akun
              dan watchlist Anda tetap aman.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="btn-primary px-6 py-3 rounded-xl text-sm flex items-center justify-center gap-2"
              >
                <FaRedo /> Muat Ulang Halaman
              </button>
              <button
                onClick={this.handleReset}
                className="btn-secondary px-6 py-3 rounded-xl text-sm flex items-center justify-center gap-2"
              >
                <FaHome /> Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
