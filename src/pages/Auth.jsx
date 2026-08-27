import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const Auth = () => {
  const { user, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !authLoading) {
      navigate("/profile", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isLogin) {
        // LOGIN
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        const activeUser = data?.user;
        const greetingName =
          activeUser?.user_metadata?.display_name ||
          email.split("@")[0] ||
          "User";
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(greetingName)}&background=880000&color=fff&size=128&bold=true`;

        toast.custom(
          (t) => (
            <div
              className={`${t.visible ? "animate-enter" : "animate-leave"} max-w-sm w-full bg-[#1a0505]/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(220,38,38,0.5)] rounded-2xl pointer-events-auto flex border border-red-900/50 overflow-hidden`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 relative">
                    <img
                      className="h-12 w-12 rounded-full border-2 border-red-500/80 shadow-[0_0_15px_rgba(220,38,38,0.6)]"
                      src={avatarUrl}
                      alt="Avatar"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 border-2 border-[#1a0505] rounded-full"></div>
                  </div>

                  <div className="ml-4 flex-1">
                    <p className="text-sm font-black text-white tracking-wide">
                      Welcome back,{" "}
                      <span className="text-red-400">{greetingName}</span>! 🚀
                    </p>
                    <p className="mt-1 text-xs text-red-200/70 font-medium">
                      Siap untuk marathon anime hari ini?
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ),
          {
            duration: 5000,
            position: "top-center",
          },
        );

        navigate("/");
      } else {
        // REGISTER
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName.trim() || email.split("@")[0],
            },
          },
        });
        if (error) throw error;

        toast.success("Pendaftaran berhasil! Silakan login.");
        setIsLogin(true);
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[75vh]">
      <div className="bg-[#1a0505]/40 backdrop-blur-xl p-10 rounded-3xl border border-red-900/30 w-full max-w-md shadow-[0_0_40px_rgba(153,27,27,0.15)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>

        <h2 className="text-3xl font-extrabold text-center text-white mb-8 tracking-tight">
          {isLogin ? "Masuk ke " : "Gabung dengan "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300">
            RAIHANEX
          </span>
        </h2>

        {errorMsg && (
          <div className="bg-red-950/50 border border-red-800 text-red-300 p-3 rounded-lg mb-5 text-sm text-center backdrop-blur-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          {!isLogin && (
            <div>
              <label className="block text-red-200/70 text-xs font-bold mb-1.5 tracking-wide uppercase">
                Username / Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-black/40 border border-red-900/30 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/50 transition-all"
                placeholder="Misal: MiauAug"
              />
            </div>
          )}

          <div>
            <label className="block text-red-200/70 text-xs font-bold mb-1.5 tracking-wide uppercase">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-red-900/30 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/50 transition-all"
              placeholder="nama@email.com"
            />
          </div>

          <div>
            <label className="block text-red-200/70 text-xs font-bold mb-1.5 tracking-wide uppercase">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-red-900/30 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/50 transition-all"
              placeholder="Minimal 6 karakter"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] mt-4 border border-red-500/50 cursor-pointer"
          >
            {loading ? "Memproses..." : isLogin ? "MASUK" : "DAFTAR SEKARANG"}
          </button>
        </form>

        <div className="mt-8 text-center text-gray-400 text-sm">
          {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-red-400 hover:text-red-300 font-bold hover:underline transition-all cursor-pointer"
          >
            {isLogin ? "Buat Akun Baru" : "Login di sini"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
