// src/components/History.jsx
// Guest Watch History powered by IndexedDB (stores up to 20 visited / watched titles)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, Trash2, Play, Info, ArrowLeft, Film, Tv, Sparkles, AlertCircle
} from 'lucide-react';
import { getWatchHistory, removeHistoryItem, clearWatchHistory } from '../../services/indexedDbHistory';

const TYPE_CONFIG = {
  movie:  { label: 'FILM',   bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.22)' },
  series: { label: 'SERIES', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.16)' },
  anime:  { label: 'ANIME',  bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.22)' },
};

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Recently';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function History() {
  const navigate = useNavigate();
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const items = await getWatchHistory();
      setHistoryItems(items || []);
    } catch (err) {
      console.error('Failed to load history:', err);
      setHistoryItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (e, id) => {
    e.stopPropagation();
    await removeHistoryItem(id);
    setHistoryItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearAll = async () => {
    await clearWatchHistory();
    setHistoryItems([]);
    setShowConfirmClear(false);
  };

  const handleResume = (item) => {
    const targetType = item.type === 'tv' ? 'series' : item.type;
    navigate(`/watch/${targetType}/${item.mediaId}`, {
      state: {
        media: {
          _id: item.mediaId,
          id: item.mediaId,
          title: item.title,
          type: item.type,
          year: item.year,
          rating: item.rating,
          images: { poster: item.poster, fanart: item.backdrop },
        },
        startSeason: item.season || 1,
        startEpisode: item.episode || 1,
        autoPlay: true,
      }
    });
  };

  const handleOpenDetails = (item) => {
    const targetType = item.type === 'tv' ? 'series' : item.type;
    navigate(`/details/${targetType}/${item.mediaId}`);
  };

  return (
    <div style={{ background: '#030304', minHeight: '100vh', paddingTop: 85, paddingBottom: 60 }}>
      <style>{HISTORY_CSS}</style>

      {/* Header */}
      <div style={{ padding: isMobile ? '0 16px 24px' : '0 32px 30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 12px rgba(255, 255, 255, 0.1)',
              }}>
                <Clock size={16} color="#ffffff" />
              </div>
              <h1 style={{
                fontFamily: "'Cinzel', 'Playfair Display', serif",
                fontSize: isMobile ? 26 : 32,
                fontWeight: 900,
                color: '#ffffff',
                margin: 0,
              }}>
                Watch History
              </h1>
            </div>
            <p style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13, color: '#71717a', margin: 0,
            }}>
              Private IndexedDB vault • Automatically stores your last 20 visited & watched titles without signing in.
            </p>
          </div>

          {historyItems.length > 0 && (
            <div>
              {!showConfirmClear ? (
                <button
                  onClick={() => setShowConfirmClear(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 9,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    color: '#d4d4d8', fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = '#d4d4d8';
                  }}
                >
                  <Trash2 size={14} /> Clear History
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={handleClearAll}
                    style={{
                      padding: '8px 14px', borderRadius: 9,
                      background: '#ffffff', color: '#030304',
                      border: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Confirm Clear
                  </button>
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    style={{
                      padding: '8px 12px', borderRadius: 9,
                      background: 'rgba(255, 255, 255, 0.06)', color: '#a1a1aa',
                      border: '1px solid rgba(255, 255, 255, 0.12)', fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 12.5, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: isMobile ? '0 16px' : '0 32px' }}>
        {loading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: isMobile ? 12 : 18,
          }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="hist-sk" style={{ aspectRatio: '2/3', borderRadius: 14 }} />
            ))}
          </div>
        ) : historyItems.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '70px 20px',
            maxWidth: 440,
            margin: '40px auto',
            background: 'rgba(14, 14, 18, 0.7)',
            borderRadius: 20,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)',
          }}>
            <div style={{
              width: 54, height: 54, borderRadius: 14, margin: '0 auto 16px',
              background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Clock size={24} color="#ffffff" />
            </div>
            <h3 style={{
              fontFamily: "'Cinzel', serif", fontSize: 20, color: '#ffffff', fontWeight: 700, margin: '0 0 8px 0',
            }}>
              No watch history recorded
            </h3>
            <p style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13.5, color: '#71717a', lineHeight: 1.6, margin: '0 0 24px 0',
            }}>
              Titles you visit or stream will automatically appear here. Stored safely inside your browser's private database.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/movies')}
                style={{
                  padding: '10px 20px', borderRadius: 9, background: '#ffffff', color: '#030304',
                  fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                }}
              >
                Browse Movies
              </button>
              <button
                onClick={() => navigate('/anime')}
                style={{
                  padding: '10px 20px', borderRadius: 9, background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.18)', color: '#ffffff',
                  fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Explore Anime
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: isMobile ? 12 : 18,
          }}>
            {historyItems.map((item) => {
              const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.movie;
              const hasEp = item.episode != null;
              const hasSeason = item.season != null;

              return (
                <div
                  key={item.id}
                  className="hist-card"
                  onClick={() => handleResume(item)}
                  style={{
                    position: 'relative',
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: 'rgba(14, 14, 18, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  {/* Poster Image */}
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '2/3', background: '#09090c' }}>
                    {item.poster ? (
                      <img
                        src={item.poster}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255,255,255,0.03)',
                      }}>
                        {item.type === 'anime' ? <Sparkles size={28} color="#71717a" /> : <Film size={28} color="#71717a" />}
                      </div>
                    )}

                    {/* Gradient shadow */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(3, 3, 4, 0.95) 0%, rgba(3, 3, 4, 0.2) 50%, transparent 100%)',
                    }} />

                    {/* Type badge */}
                    <div style={{
                      position: 'absolute', top: 9, left: 9,
                      background: cfg.bg, border: `1px solid ${cfg.border}`,
                      borderRadius: 4, padding: '2px 7px',
                      fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 9.5, fontWeight: 700,
                      color: '#ffffff', letterSpacing: '0.06em',
                    }}>
                      {cfg.label}
                    </div>

                    {/* Remove single button */}
                    <button
                      onClick={(e) => handleRemove(e, item.id)}
                      className="hist-remove-btn"
                      title="Remove from history"
                      style={{
                        position: 'absolute', top: 9, right: 9,
                        width: 28, height: 28, borderRadius: 7,
                        background: 'rgba(0, 0, 0, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        color: '#a1a1aa', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.18s ease',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>

                    {/* Play icon overlay */}
                    <div className="hist-play-icon" style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.2s',
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.95)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(255, 255, 255, 0.4)',
                      }}>
                        <Play size={18} fill="#030304" color="#030304" style={{ marginLeft: 2 }} />
                      </div>
                    </div>

                    {/* Bottom info on poster */}
                    <div style={{ position: 'absolute', bottom: 8, left: 10, right: 10 }}>
                      <div style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700,
                        color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {item.title}
                      </div>

                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4,
                        fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#a1a1aa',
                      }}>
                        <span>
                          {hasSeason ? `S${item.season} ` : ''}
                          {hasEp ? `Ep ${item.episode}` : (item.year || '—')}
                        </span>
                        <span style={{ fontSize: 10.5, color: '#71717a' }}>{formatTimeAgo(item.visitedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card bottom bar */}
                  <div style={{
                    display: 'flex', borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(10, 10, 14, 0.9)',
                  }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleResume(item); }}
                      style={{
                        flex: 1, padding: '9px 8px', border: 'none', background: 'none',
                        color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <Play size={12} fill="#ffffff" /> Resume
                    </button>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenDetails(item); }}
                      style={{
                        padding: '9px 12px', border: 'none', background: 'none',
                        color: '#a1a1aa', fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: 12, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'color 0.15s, background 0.15s',
                      }}
                      title="View details"
                      onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#a1a1aa'; e.currentTarget.style.background = 'none'; }}
                    >
                      <Info size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const HISTORY_CSS = `
  .hist-card:hover {
    transform: translateY(-3px);
    border-color: rgba(255, 255, 255, 0.35);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 255, 0.1);
  }
  .hist-card:hover .hist-play-icon {
    opacity: 1 !important;
  }
  .hist-remove-btn:hover {
    background: rgba(255, 255, 255, 0.2) !important;
    color: #ffffff !important;
    border-color: rgba(255, 255, 255, 0.4) !important;
  }
  .hist-sk {
    background: linear-gradient(90deg, #09090c 25%, #18181f 50%, #09090c 75%);
    background-size: 200% 100%;
    animation: hist-shimmer 1.5s ease infinite;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  @keyframes hist-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;
