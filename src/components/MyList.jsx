import { useState, useEffect } from 'react';
import { useUser , useAuth } from '@clerk/clerk-react';
import { getWatchlist, removeFromWatchlist } from '../../services/mediaService';
import MediaCard from './MediaCard';
import VideoPlayer from './VideoPlayer';
import { Trash2 } from 'lucide-react';

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

  const { getToken } = useAuth();

const fetchWatchlist = async () => {
  try {
    setLoading(true);
    const token = await getToken(); // ← get Clerk JWT
    const data = await getWatchlist(token);
    setWatchlist(data || []);
  } catch (err) {
    console.error("Failed to fetch watchlist:", err);
  } finally {
    setLoading(false);
  }
};

const handleRemove = async (mediaId) => {
  try {
    const token = await getToken(); // ← get Clerk JWT
    await removeFromWatchlist(token, mediaId);
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
        background: "#080c14",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 90,
      }}>
        <div style={{ textAlign: "center", color: "#c8d0e0", fontFamily: "'DM Sans', sans-serif" }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>🔒</div>
          <h2 style={{ fontSize: 24, marginBottom: 10 }}>Sign in to view your list</h2>
          <p style={{ color: "#666" }}>Your watchlist will appear here after signing in</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        background: "#080c14",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 90,
        color: "#c8d0e0",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <p>Loading your list...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: "#080c14",
      minHeight: "100vh",
      paddingTop: 90,
      paddingLeft: 32,
      paddingRight: 32,
      paddingBottom: 40,
    }}>
      <h2 style={{
        fontFamily: "'DM Sans', sans-serif",
        color: "#c8d0e0",
        marginBottom: 10,
        fontSize: 24,
        fontWeight: 600,
      }}>
        📝 My Watchlist
      </h2>
      
      {watchlist.length > 0 && (
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "#666",
          fontSize: 14,
          marginBottom: 30,
        }}>
          {watchlist.length} {watchlist.length === 1 ? 'title' : 'titles'} saved
        </p>
      )}

      {watchlist.length > 0 ? (
        <div className="media-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "20px",
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
              {/* Remove button */}
              <button
  onClick={() => handleRemove(item._id)}
  style={{
    position: 'absolute',
    top: '8px',
    right: '8px',
    zIndex: 50,  // ⬅️ was 5, now higher than MediaCard's hover z-index (10)
    background: 'rgba(229, 9, 20, 0.9)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    transition: 'all 0.2s',
  }}
  title="Remove from list"
  onMouseEnter={e => e.target.style.background = '#ff1a1a'}
  onMouseLeave={e => e.target.style.background = 'rgba(229, 9, 20, 0.9)'}
>
  <Trash2 size={14} />
</button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          color: "#666",
          fontFamily: "'DM Sans', sans-serif",
        }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>📭</div>
          <h3 style={{ fontSize: 20, color: "#888", marginBottom: 10 }}>Your list is empty</h3>
          <p style={{ fontSize: 14 }}>Add movies and shows by clicking the + button on any title</p>
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