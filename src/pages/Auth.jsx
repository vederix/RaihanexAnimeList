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
              className={`${t.visible ? "animate-fade-in" : "animate-leave"} max-w-sm w-full glass-card p-0 shadow-[0_30px_60px_rgba(0,0,0,0.8)] rounded-2xl pointer-events-auto flex overflow-hidden border border-red-500/30`}
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
        return;
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
        setLoading(false);
      }
    } catch (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[75vh] animate-fade-in p-4">
      <div className="glass-card p-8 sm:p-10 rounded-3xl w-full max-w-md shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative overflow-hidden animate-scale-up">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-800 via-red-500 to-red-800 opacity-80"></div>

        <h2 className="text-3xl font-black text-center text-white mb-8 tracking-tight drop-shadow-md">
          {isLogin ? "Masuk ke " : "Gabung ke "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
            RAIHANEX
          </span>
        </h2>

        {errorMsg && (
          <div className="bg-red-950/80 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl mb-6 text-sm text-center shadow-[0_0_15px_rgba(220,38,38,0.3)] font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          {!isLogin && (
            <div>
              <label className="block text-red-300 text-[11px] font-black mb-2 tracking-widest uppercase">
                Username / Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full input-field px-4 py-3.5 text-sm"
                placeholder="Misal: MiauAug"
              />
            </div>
          )}

          <div>
            <label className="block text-red-300 text-[11px] font-black mb-2 tracking-widest uppercase">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full input-field px-4 py-3.5 text-sm"
              placeholder="nama@email.com"
            />
          </div>

          <div>
            <label className="block text-red-300 text-[11px] font-black mb-2 tracking-widest uppercase">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full input-field px-4 py-3.5 text-sm"
              placeholder="Minimal 6 karakter"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-4 text-sm mt-4 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
          >
            {loading ? "MEMPROSES..." : isLogin ? "MASUK" : "DAFTAR SEKARANG"}
          </button>
        </form>

        <div className="mt-8 text-center text-gray-400 text-[13px] font-medium">
          {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            type="button"
            className="text-red-400 hover:text-white font-black transition-colors cursor-pointer ml-1 drop-shadow-md"
          >
            {isLogin ? "Buat Akun Baru" : "Login di sini"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
