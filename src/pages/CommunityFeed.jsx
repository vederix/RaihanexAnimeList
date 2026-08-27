import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";
import { FaGlobe, FaCommentDots, FaUserCircle } from "react-icons/fa";

import ApiErrorState from "../components/ApiErrorState";

export default function CommunityFeed() {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  async function fetchRecent() {
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      if (data) setActivities(data);
    } catch (err) {
      console.error("Gagal memuat aktivitas:", err);
      setErrorMsg("Gagal memuat aktivitas komunitas. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  // Initial Fetch
  useEffect(() => {
    fetchRecent();
  }, []);

  // Supabase Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel("public:reviews")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reviews" },
        (payload) => {
          const newReview = payload.new;
          setActivities((prev) => [newReview, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="pt-24 min-h-screen px-4 pb-12 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <FaGlobe className="text-4xl text-red-500 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]" />
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300 drop-shadow-md">
            LIVE COMMUNITY FEED
          </h1>
          <p className="text-gray-400 font-medium mt-1">Aktivitas real-time dari sesama otaku di seluruh penjuru RAIHANEX.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="text-center py-20"><div className="animate-spin w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full mx-auto drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]"></div></div>
        ) : errorMsg ? (
          <ApiErrorState message={errorMsg} onRetry={fetchRecent} />
        ) : activities.length === 0 ? (
          <div className="text-center py-20 text-gray-500 glass-card rounded-3xl font-medium">Belum ada aktivitas.</div>
        ) : (
          activities.map((act) => (
            <ActivityCard key={act.id} activity={act} />
          ))
        )}
      </div>
    </div>
  );
}

function ActivityCard({ activity }) {
  const isReview = !activity.parent_id;
  
  return (
    <div className="glass-card glass-card-hover rounded-2xl p-5 flex gap-4 transition-all duration-300">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-900 to-red-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-xl shadow-[0_0_15px_rgba(220,38,38,0.5)] border border-red-500/30">
        {activity.user_name ? activity.user_name[0].toUpperCase() : <FaUserCircle />}
      </div>
      
      <div className="flex flex-col flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-bold text-white">{activity.user_name || "Seseorang"}</span>
          <span className="text-gray-500 text-sm">
            {isReview ? "menulis ulasan baru untuk" : "membalas ulasan di"}
          </span>
          <Link
            to={`/anime/${activity.anilist_id}`}
            className="text-red-400 font-bold hover:text-red-300 transition-colors line-clamp-1 max-w-[200px] sm:max-w-xs drop-shadow-md"
          >
            {activity.anime_title || `Anime #${activity.anilist_id}`}
          </Link>
          <span className="text-gray-600 text-xs ml-auto">
            {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        <div className="bg-red-950/20 rounded-xl p-3 mt-2 border border-red-900/30 relative shadow-inner">
          <div className="absolute -top-3 -left-2 text-red-500/20">
            <FaCommentDots size={30} />
          </div>
          <p className="text-gray-300 text-sm italic relative z-10 line-clamp-3">
            "{activity.is_spoiler ? "⚠️ [Spoiler Disembunyikan]" : activity.content}"
          </p>
        </div>
      </div>
    </div>
  );
}
