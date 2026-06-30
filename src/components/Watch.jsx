import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import VideoPlayer from "../components/VideoPlayer";
import MediaCard from "../components/MediaCard";
import { Star, Clock, Calendar, ArrowLeft } from "lucide-react";

export default function Watch() {
  const location = useLocation();
  const navigate = useNavigate();
  const media = location.state?.media;

  const [recommendations, setRecommendations] = useState([]);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);

  // Fetch recommendations when the component loads or the movie changes
  useEffect(() => {
    // Scroll to top automatically when a new movie is selected
    window.scrollTo(0, 0);
    setSeason(1);  
    setEpisode(1);

    if (media) {
      axios.get("http://localhost:5000/api/media/movies")
        .then(res => {
          // Filter out the movie we are currently watching and grab the next 6
          const recs = res.data
            .filter(m => m._id !== media._id)
            .slice(0, 6);
          setRecommendations(recs);
        })
        .catch(err => console.error("Recommendation Fetch Error:", err));
    }
  }, [media]);

  if (!media) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#080c14", color: "white" }}>
        <h2>Session lost or movie not found</h2>
        <button 
          onClick={() => navigate('/')}
          style={{ marginTop: 15, padding: "10px 20px", background: "#e8b84b", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
        >
          Go Back Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: '#080c14', minHeight: '100vh', paddingBottom: '60px' }}>
      
      {/* ── TOP NAV BAR (Optional: subtle back button over the black background) ── */}
      <div style={{ padding: '20px 32px', background: '#000' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#8892a4', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
        >
          <ArrowLeft size={18} /> Back
        </button>
      </div>

      {/* ── VIDEO CONTROLS & PLAYER ── */}
      <div style={{ width: '100%', background: '#000', borderBottom: '1px solid #1a2235' }}>
        
        {/* Only show the Episode Selectors if the media is a TV Series */}
        {media.type === "series" && (
          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            padding: '15px 32px', 
            background: '#0a0f1a', 
            alignItems: 'center',
            justifyContent: 'flex-end'
          }}>
            <span style={{ color: '#8892a4', fontFamily: "'DM Sans', sans-serif", fontSize: '14px' }}>
              Select Episode:
            </span>
            
            <select 
              value={season} 
              onChange={(e) => setSeason(e.target.value)}
              style={{ padding: '8px 12px', background: '#1a2235', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', outline: 'none' }}
            >
              {[...Array(10)].map((_, i) => (
                <option key={i+1} value={i+1}>Season {i+1}</option>
              ))}
            </select>

            <select 
              value={episode} 
              onChange={(e) => setEpisode(e.target.value)}
              style={{ padding: '8px 12px', background: '#1a2235', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', outline: 'none' }}
            >
              {[...Array(24)].map((_, i) => (
                <option key={i+1} value={i+1}>Episode {i+1}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ width: '100%', height: '75vh' }}>
          {/* 🔥 Pass the state down to the player */}
          <VideoPlayer movie={media} season={season} episode={episode} />
        </div>
      </div>

      {/* ── MOVIE DETAILS ── */}
      {/* ── MOVIE DETAILS ── */}
      <div style={{ 
        padding: '40px 32px', 
        maxWidth: '1200px', 
        margin: '0 auto', 
        color: 'white',
        display: 'flex',
        gap: '40px',
        flexWrap: 'wrap' // Allows it to stack on mobile screens
      }}>
        
        {/* 🎬 Left Column: Mini Poster */}
        {media.images?.poster && (
          <div style={{ 
            flexShrink: 0, 
            width: '220px', 
            borderRadius: '12px', 
            overflow: 'hidden', 
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <img 
              src={media.images.poster} 
              alt={media.title} 
              style={{ width: '100%', height: 'auto', display: 'block' }} 
            />
          </div>
        )}

        {/* 📝 Right Column: Text Details */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h1 style={{ 
            fontFamily: "'Playfair Display', serif", 
            fontSize: 'clamp(32px, 4vw, 48px)', 
            fontWeight: 900, 
            marginBottom: '10px' 
          }}>
            {media.title}
          </h1>

          {/* Meta Data Row */}
          <div style={{ display: 'flex', gap: '20px', color: '#8892a4', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', alignItems: 'center', marginBottom: '20px' }}>
            {media.year && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={15} /> {media.year}</span>}
            {media.rating && (
  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e8b84b', fontWeight: 600 }}>
    <Star size={15} fill="#e8b84b" /> 
    {typeof media.rating === 'object' ? (media.rating.percentage / 10).toFixed(1) : media.rating}
  </span>
)}
            {media.runtime > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={15} /> {media.runtime} min</span>}
          </div>

          {/* Genres Pill Row */}
          {media.genres && media.genres.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {media.genres.map(g => (
                <span key={g} style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  padding: '4px 12px', 
                  borderRadius: '6px', 
                  fontSize: '12px', 
                  fontFamily: "'DM Sans', sans-serif",
                  color: '#c8d0e0',
                  textTransform: 'capitalize'
                }}>
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          <p style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            fontSize: '15px', 
            lineHeight: '1.8', 
            color: '#a0a8c0', 
            maxWidth: '800px' 
          }}>
            {media.synopsis || "No description available for this title."}
          </p>
        </div>
      </div>

      {/* ── RECOMMENDATIONS / YOU MAY ALSO LIKE ── */}
      {recommendations.length > 0 && (
        <div style={{ padding: '0 32px', maxWidth: '1200px', margin: '40px auto 0' }}>
          <h3 style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            color: '#e8eaf0', 
            fontSize: '20px', 
            marginBottom: '20px' 
          }}>
            You May Also Like
          </h3>
          
          <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '16px' }}>
            {recommendations.map((rec, i) => (
              <MediaCard 
                key={rec._id} 
                media={rec} 
                type={rec.type || "movie"} 
                index={i} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}