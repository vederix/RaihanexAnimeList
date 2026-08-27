import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import PageLoader from "./components/PageLoader";
import ErrorBoundary from "./components/ErrorBoundary";
import { Toaster } from "react-hot-toast";

// Route-Level Code Splitting (Lazy Loading)
const Home = lazy(() => import("./pages/Home"));
const AnimeDetail = lazy(() => import("./pages/AnimeDetail"));
const Search = lazy(() => import("./pages/Search"));
const Auth = lazy(() => import("./pages/Auth"));
const Watchlist = lazy(() => import("./pages/Watchlist"));
const Profile = lazy(() => import("./pages/Profile"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Seasonal = lazy(() => import("./pages/Seasonal"));

function App() {
  return (
    <Router>
      <AuthProvider>
        <ErrorBoundary>
          <div className="min-h-screen bg-[#050505] text-white selection:bg-red-500/40 relative overflow-hidden">
            {/* Dekorasi Cahaya */}
            <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-red-800/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] bg-red-900/20 rounded-full blur-[100px] pointer-events-none"></div>

            <Navbar />

            {/* Pasang Toaster dengan tema Dark/Red */}
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: "rgba(26, 5, 5, 0.95)",
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
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/anime/:id" element={<AnimeDetail />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/watchlist" element={<Watchlist />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/seasonal" element={<Seasonal />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </ErrorBoundary>
      </AuthProvider>
    </Router>
  );
}

export default App;
