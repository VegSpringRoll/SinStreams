import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Play, Plus, Check, Star, Clock, Calendar, Film, Tv } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import VideoPlayer from '../components/VideoPlayer';

const BACKEND_URL = import.meta.env.PROD ? "/api" : "http://localhost:5000/api";
const TMDB_API_KEY = '8ade991ea509eefe3cca2142132d753a';

export default function Details() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [type, id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      
      if (type === 'movie') {
        const { data } = await axios.get(`https://api.themoviedb.org/3/movie/${id}`, {
          params: { api_key: TMDB_API_KEY, append_to_response: 'credits,videos,external_ids' }
        });
        
        setMedia({
          _id: String(data.id),
          imdb_id: data.imdb_id || data.external_ids?.imdb_id,
          title: data.title,
          type: 'movie',
          year: data.release_date?.substring(0, 4),
          rating: { percentage: Math.round(data.vote_average * 10), votes: data.vote_count },
          runtime: data.runtime,
          genres: data.genres?.map(g => g.name) || [],
          synopsis: data.overview,
          tagline: data.tagline,
          images: {
            poster: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
            fanart: `https://image.tmdb.org/t/p/original${data.backdrop_path}`,
          },
          cast: data.credits?.cast?.slice(0, 10).map(c => ({ name: c.name, character: c.character, image: c.profile_path })),
          director: data.credits?.crew?.find(c => c.job === 'Director')?.name,
          budget: data.budget,
          revenue: data.revenue,
        });
      } else if (type === 'tv' || type === 'series') {
        const { data } = await axios.get(`https://api.themoviedb.org/3/tv/${id}`, {
          params: { api_key: TMDB_API_KEY, append_to_response: 'credits,videos,external_ids' }
        });
        
        setMedia({
          _id: String(data.id),
          imdb_id: data.external_ids?.imdb_id,
          title: data.name,
          type: 'series',
          year: data.first_air_date?.substring(0, 4),
          rating: { percentage: Math.round(data.vote_average * 10), votes: data.vote_count },
          seasons: data.number_of_seasons,
          episodes: data.number_of_episodes,
          genres: data.genres?.map(g => g.name) || [],
          synopsis: data.overview,
          tagline: data.tagline,
          images: {
            poster: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
            fanart: `https://image.tmdb.org/t/p/original${data.backdrop_path}`,
          },
          cast: data.credits?.cast?.slice(0, 10).map(c => ({ name: c.name, character: c.character, image: c.profile_path })),
          created_by: data.created_by?.map(c => c.name).join(', '),
        });
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch details:", err);
      setError("Failed to load details");
      setLoading(false);
    }
  };

  const handleWatchlist = async () => {
    if (!user) return alert("Please sign in");
    
    try {
      if (inWatchlist) {
        await axios.delete(`${BACKEND_URL}/user/watchlist/${user.id}/${media._id}`);
      } else {
        await axios.post(`${BACKEND_URL}/user/watchlist`, {
          clerkId: user.id,
          media: {
            _id: media._id,
            imdb_id: media.imdb_id,
            type: media.type,
            title: media.title,
            images: { poster: media.images?.poster }
          }
        });
      }
      setInWatchlist(!inWatchlist);
    } catch (err) {
      console.error("Watchlist error:", err);
    }
  };

  if (loading) {
    return (
      <div className="page-content" style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={{ color: '#888', fontFamily: "'DM Sans', sans-serif" }}>Loading details...</p>
        </div>
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="page-content" style={styles.container}>
        <div style={styles.loadingContainer}>
          <p style={{ color: '#ccc', fontSize: 18 }}>{error || 'Not found'}</p>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-content" style={styles.container}>
        {/* Backdrop */}
        <div style={{
          ...styles.backdrop,
          backgroundImage: media.images?.fanart ? `url(${media.images.fanart})` : 'none',
        }}>
          <div style={styles.backdropOverlay} />
        </div>

        {/* Content */}
        <div style={styles.content}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back</button>
          
          <div className="details-main" style={styles.mainInfo}>
            {/* Poster */}
            <div className="details-poster" style={styles.posterContainer}>
              {media.images?.poster ? (
                <img src={media.images.poster} alt={media.title} style={styles.poster} />
              ) : (
                <div style={styles.posterPlaceholder}>
                  {media.type === 'series' ? <Tv size={40} /> : <Film size={40} />}
                </div>
              )}
            </div>

            {/* Info */}
            <div style={styles.info}>
              <h1 style={styles.title}>{media.title}</h1>
              
              {media.tagline && (
                <p style={styles.tagline}>"{media.tagline}"</p>
              )}

              <div style={styles.metaRow}>
                {media.rating && (
                  <span style={styles.rating}>
                    <Star size={16} fill="#e8b84b" color="#e8b84b" />
                    {(media.rating.percentage / 10).toFixed(1)}
                  </span>
                )}
                <span style={styles.metaItem}><Calendar size={14} /> {media.year}</span>
                {media.runtime && <span style={styles.metaItem}><Clock size={14} /> {media.runtime} min</span>}
                {media.seasons && <span style={styles.metaItem}>{media.seasons} Seasons • {media.episodes} Episodes</span>}
              </div>

              <div style={styles.genreRow}>
                {media.genres?.map(g => (
                  <span key={g} style={styles.genre}>{g}</span>
                ))}
              </div>

              <p style={styles.synopsis}>{media.synopsis}</p>

              {media.director && (
                <p style={styles.credit}><strong>Director:</strong> {media.director}</p>
              )}
              {media.created_by && (
                <p style={styles.credit}><strong>Created by:</strong> {media.created_by}</p>
              )}

              <div style={styles.actionRow}>
                <button onClick={() => {
                    navigate(`/watch/${media.type}/${media._id}`, {
                        state: { media, autoPlay: true }
                    });
                    }} style={styles.playBtn}>
                    <Play size={20} fill="white" /> Play Now
                    </button>
                <button onClick={handleWatchlist} style={{
                  ...styles.watchlistBtn,
                  ...(inWatchlist ? styles.watchlistActive : {})
                }}>
                  {inWatchlist ? <Check size={18} /> : <Plus size={18} />}
                  {inWatchlist ? 'In List' : 'My List'}
                </button>
              </div>
            </div>
          </div>

          {/* Cast */}
          {media.cast && media.cast.length > 0 && (
            <div style={styles.castSection}>
              <h2 style={styles.sectionTitle}>Cast</h2>
              <div style={styles.castRow}>
                {media.cast.map((actor, i) => (
                  <div key={i} style={styles.castCard}>
                    <div style={{
                      ...styles.castImage,
                      backgroundImage: actor.image ? `url(https://image.tmdb.org/t/p/w200${actor.image})` : 'none',
                    }}>
                      {!actor.image && <span style={{ fontSize: 20 }}>👤</span>}
                    </div>
                    <p style={styles.castName}>{actor.name}</p>
                    <p style={styles.castRole}>{actor.character}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {playing && (
        <VideoPlayer media={media} onClose={() => setPlaying(false)} />
      )}
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#080c14',
    position: 'relative',
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '500px',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  backdropOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to bottom, rgba(8,12,20,0.6) 0%, rgba(8,12,20,0.95) 100%)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    padding: '100px 40px 40px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    gap: '16px',
  },
  spinner: {
    width: '50px', height: '50px',
    border: '3px solid rgba(255,255,255,0.1)',
    borderTop: '3px solid #e50914',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  backBtn: {
    background: 'rgba(255,255,255,0.1)',
    color: '#ccc',
    border: '1px solid rgba(255,255,255,0.2)',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '14px',
    marginBottom: '30px',
  },
  mainInfo: {
    display: 'flex',
    gap: '40px',
    flexWrap: 'wrap',
  },
  posterContainer: {
    flexShrink: 0,
  },
  poster: {
    width: '300px',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
  },
  posterPlaceholder: {
    width: '300px',
    height: '450px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#444',
  },
  info: {
    flex: 1,
    minWidth: '300px',
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 'clamp(28px, 4vw, 48px)',
    fontWeight: '900',
    color: '#fff',
    margin: '0 0 10px',
  },
  tagline: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '16px',
    color: '#888',
    fontStyle: 'italic',
    margin: '0 0 15px',
  },
  metaRow: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: '15px',
  },
  rating: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#e8b84b',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '16px',
    fontWeight: '600',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#888',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '14px',
  },
  genreRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  genre: {
    padding: '6px 14px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    color: '#aaa',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '13px',
  },
  synopsis: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '15px',
    color: '#999',
    lineHeight: '1.8',
    marginBottom: '15px',
  },
  credit: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '14px',
    color: '#888',
    marginBottom: '8px',
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '25px',
  },
  playBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 32px',
    background: '#e50914',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    fontFamily: "'DM Sans', sans-serif",
  },
  watchlistBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 24px',
    background: 'rgba(255,255,255,0.1)',
    color: '#ccc',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    fontFamily: "'DM Sans', sans-serif",
  },
  watchlistActive: {
    background: 'rgba(232,184,75,0.15)',
    border: '1px solid rgba(232,184,75,0.4)',
    color: '#e8b84b',
  },
  castSection: {
    marginTop: '50px',
  },
  sectionTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '22px',
    fontWeight: '600',
    color: '#ccc',
    marginBottom: '20px',
  },
  castRow: {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    paddingBottom: '10px',
  },
  castCard: {
    flexShrink: 0,
    width: '120px',
    textAlign: 'center',
  },
  castImage: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    margin: '0 auto 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  castName: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '13px',
    color: '#ccc',
    fontWeight: '500',
    margin: '0 0 2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  castRole: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '11px',
    color: '#666',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};