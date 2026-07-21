import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import AnimeDetail from "./pages/AnimeDetail";
import Search from "./pages/Search";
import Auth from "./pages/Auth";
import Watchlist from "./pages/Watchlist";
import { Toaster } from "react-hot-toast";
import Profile from "./pages/Profile";
import Schedule from "./pages/Schedule";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#050505] text-white selection:bg-red-500/40 relative overflow-hidden">
        {/* Dekorasi Cahaya */}
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-red-800/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] bg-red-900/20 rounded-full blur-[100px] pointer-events-none"></div>

        <Navbar />

        {/* 2. Pasang Toaster dengan tema Dark/Red */}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "rgba(26, 5, 5, 0.9)", // Warna kaca hitam-merah
              color: "#fff",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(153, 27, 27, 0.5)",
            },
            success: {
              iconTheme: { primary: "#ef4444", secondary: "#fff" },
            },
          }}
        />

        <main className="pt-28 px-4 container mx-auto relative z-10">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/anime/:id" element={<AnimeDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/schedule" element={<Schedule />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
