import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import PageLoader from "./components/PageLoader";
import ErrorBoundary from "./components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import PageTransition from "./components/PageTransition";
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
const Compare = lazy(() => import("./pages/Compare"));
const Collections = lazy(() => import("./pages/Collections"));
const CollectionDetail = lazy(() => import("./pages/CollectionDetail"));
const CommunityFeed = lazy(() => import("./pages/CommunityFeed"));
const NotFound = lazy(() => import("./pages/NotFound"));

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <ErrorBoundary>
          <div className="min-h-screen bg-[#050101] text-white selection:bg-red-500/40 selection:text-white relative overflow-hidden">
            {/* Mobile-Optimized Lightweight Ambient Light (Zero GPU Animation Overhead on Mobile) */}
            <div className="sm:hidden fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(220,38,38,0.15),rgba(255,255,255,0))] pointer-events-none z-0"></div>

            {/* Desktop-Only Multi-layered Glassmorphism Ambient Light Orbs */}
            <div className="hidden sm:block fixed top-[-15%] left-[-10%] w-[50vw] h-[50vw] bg-red-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse-glow z-0"></div>
            <div className="hidden sm:block fixed bottom-[-15%] right-[-10%] w-[45vw] h-[45vw] bg-red-900/15 rounded-full blur-[120px] pointer-events-none animate-pulse-glow z-0"></div>
            <div className="hidden sm:block fixed top-[40%] right-[15%] w-[25vw] h-[25vw] bg-red-500/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

            <Navbar />

            {/* Toaster bertema Ultra-Dark Glass Crimson */}
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: "rgba(20, 4, 4, 0.88)",
                  color: "#fff",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(220, 38, 38, 0.35)",
                  boxShadow: "0 15px 35px rgba(0,0,0,0.6), 0 0 15px rgba(220,38,38,0.2)",
                  borderRadius: "1rem",
                  padding: "0.75rem 1.25rem",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                },
                success: {
                  iconTheme: { primary: "#ef4444", secondary: "#fff" },
                },
                error: {
                  iconTheme: { primary: "#dc2626", secondary: "#fff" },
                },
              }}
            />

            {/* Main view with smooth animated page transitions */}
            <main className="pt-20 lg:pt-28 pb-24 lg:pb-8 px-4 container mx-auto relative z-10 pb-[env(safe-area-inset-bottom)]">
              <Suspense fallback={<PageLoader />}>
                <PageTransition>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/anime/:id" element={<AnimeDetail />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/watchlist" element={<Watchlist />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/schedule" element={<Schedule />} />
                    <Route path="/seasonal" element={<Seasonal />} />
                    <Route path="/compare" element={<Compare />} />
                    <Route path="/collections" element={<Collections />} />
                    <Route path="/collection/:id" element={<CollectionDetail />} />
                    <Route path="/community" element={<CommunityFeed />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </PageTransition>
              </Suspense>
            </main>
          </div>
        </ErrorBoundary>
      </AuthProvider>
    </Router>
  );
}

export default App;
