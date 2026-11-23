import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getWatchlist, removeFromWatchlist } from '../../services/mediaService';
import MediaCard from './MediaCard';
import VideoPlayer from './VideoPlayer';
import { Trash2, Bookmark, Lock } from 'lucide-react';

export default function MyList() {
  const { user, isSignedIn } = useUser();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingMedia, setPlayingMedia] = useState(null);

  useEffect(() => {
    if (isSignedIn && user) {
      fetchWatchlist();
    } else {
      setLoading(false);
    }
  }, [user, isSignedIn]);

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      const data = await getWatchlist(user.id);
      setWatchlist(data || []);
    } catch (err) {
      console.error("Failed to fetch watchlist:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (mediaId) => {
    try {
      await removeFromWatchlist(mediaId);
      setWatchlist(prev => prev.filter(item => item._id !== mediaId));
    } catch (err) {
      console.error("Failed to remove:", err);
    }
  };

  const handlePlay = (media) => {
    setPlayingMedia(media);
  };

  if (!isSignedIn) {
    return (
      <div className="page-content" style={{
        background: "#030304",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 80,
      }}>
        <div style={{
          textAlign: "center", color: "#ffffff", fontFamily: "'Plus Jakarta Sans', sans-serif",
          padding: "40px 30px", borderRadius: 20,
          background: "rgba(16, 16, 22, 0.7)", border: "1px solid rgba(255, 255, 255, 0.14)",
          backdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
          maxWidth: 420,
        }}>
          <Lock size={40} color="#ffffff" style={{ margin: "0 auto 16px", opacity: 0.8 }} />
          <h2 style={{ fontSize: 24, marginBottom: 10, fontFamily: "'Cinzel', serif", fontWeight: 700 }}>Access Protected</h2>
          <p style={{ color: "#a1a1aa", fontSize: 14 }}>Please sign in to view and curate your personal archives</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        background: "#030304",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 80,
        color: "#ffffff",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <p style={{ color: "#a1a1aa" }}>Opening personal archives...</p>
      </div>
    );
  }

  return (
    <div className="page-content" style={{
      background: "#030304",
      minHeight: "100vh",
      paddingTop: 80,
      paddingLeft: 32,
      paddingRight: 32,
      paddingBottom: 40,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        marginBottom: 8,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: "rgba(255, 255, 255, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
        }}>
          <Bookmark size={15} color="#ffffff" />
        </div>
        <h1 style={{
          fontFamily: "'Cinzel', 'Playfair Display', serif",
          color: "#ffffff",
          margin: 0,
          fontSize: "clamp(24px, 4vw, 36px)",
          fontWeight: 900,
        }}>
          My Watchlist
        </h1>
      </div>
      
      {watchlist.length > 0 ? (
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: "#71717a",
          fontSize: 13,
          marginBottom: 28,
        }}>
          {watchlist.length} {watchlist.length === 1 ? 'title' : 'titles'} saved to your vault
        </p>
      ) : null}

      {watchlist.length > 0 ? (
        <div className="media-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "18px",
        }}>
          {watchlist.map((item, i) => (
            <div key={item._id || i} style={{ position: 'relative' }}>
              <MediaCard
                media={item}
                type={item.type || 'movie'}
                index={i}
                inList={true}
                onPlay={handlePlay}
              />
              {/* Remove button — Pure monochrome frosted button */}
              <button
                onClick={() => handleRemove(item._id)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  zIndex: 50,
                  background: 'rgba(10, 10, 14, 0.85)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(8px)',
                }}
                title="Remove from list"
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.color = '#030304';
                  e.currentTarget.style.boxShadow = '0 0 16px rgba(255,255,255,0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(10, 10, 14, 0.85)';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.6)';
                }}
              >
                <Trash2 size={13} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: "center",
          padding: "80px 20px",
          color: "#a1a1aa",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          background: "rgba(16, 16, 22, 0.5)",
          borderRadius: 20,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          maxWidth: 500,
          margin: "40px auto",
        }}>
          <Bookmark size={40} color="#ffffff" style={{ margin: "0 auto 16px", opacity: 0.7 }} />
          <h3 style={{ fontSize: 20, color: "#ffffff", marginBottom: 8, fontFamily: "'Cinzel', serif" }}>Your vault is empty</h3>
          <p style={{ fontSize: 13.5, color: "#71717a", maxWidth: 360, margin: "0 auto" }}>
            Add movies and series to your collection by clicking the + button on any title.
          </p>
        </div>
      )}

      {/* Video Player */}
      {playingMedia && (
        <VideoPlayer
          media={playingMedia}
          onClose={() => setPlayingMedia(null)}
        />
      )}
    </div>
  );
}
