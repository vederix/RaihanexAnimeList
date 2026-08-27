import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";
import { FaGlobe, FaCommentDots, FaUserCircle } from "react-icons/fa";

export default function CommunityFeed() {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initial Fetch
  useEffect(() => {
    async function fetchRecent() {
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
      } finally {
        setIsLoading(false);
      }
    }
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
        <FaGlobe className="text-4xl text-blue-500 animate-pulse" />
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
            LIVE COMMUNITY FEED
          </h1>
          <p className="text-gray-400 font-medium mt-1">Aktivitas real-time dari sesama otaku di seluruh penjuru RAIHANEX.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="text-center py-20"><div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div></div>
        ) : activities.length === 0 ? (
          <div className="text-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-white/10">Belum ada aktivitas.</div>
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
    <div className="bg-black/40 border border-white/10 rounded-2xl p-5 hover:border-blue-500/50 transition-colors animate-fade-in flex gap-4">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-xl shadow-[0_0_15px_rgba(59,130,246,0.5)]">
        {activity.user_name ? activity.user_name[0].toUpperCase() : <FaUserCircle />}
      </div>
      
      <div className="flex flex-col flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-bold text-white">{activity.user_name || "Seseorang"}</span>
          <span className="text-gray-500 text-sm">
            {isReview ? "menulis ulasan baru untuk" : "membalas ulasan di"}
          </span>
          <Link
            to={`/anime/${activity.mal_id}`}
            className="text-blue-400 font-bold hover:underline line-clamp-1 max-w-[200px] sm:max-w-xs"
          >
            {activity.anime_title || `Anime #${activity.mal_id}`}
          </Link>
          <span className="text-gray-600 text-xs ml-auto">
            {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        <div className="bg-white/5 rounded-xl p-3 mt-2 border border-white/5 relative">
          <div className="absolute -top-3 -left-2 text-blue-500/20">
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
