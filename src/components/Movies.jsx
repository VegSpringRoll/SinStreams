import { useState, useEffect, useMemo } from 'react';
import MediaCard from '../components/MediaCard';
import { getMovies } from '../../services/mediaService';
import { Film, Search, SlidersHorizontal, X } from 'lucide-react';

const ACCENT      = '#e8b84b';
const ACCENT_DIM  = 'rgba(232,184,75,0.1)';
const ACCENT_GLOW = 'rgba(232,184,75,0.2)';

const SORT_OPTIONS = [
  { label: 'Top Rated', value: 'rating'  },
  { label: 'Newest',    value: 'year'    },
  { label: 'A → Z',    value: 'az'      },
];

export default function Movies() {
  const [movies,        setMovies]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeGenre,   setActiveGenre]   = useState('All');
  const [sortBy,        setSortBy]        = useState('rating');
  const [search,        setSearch]        = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    getMovies()
      .then(data => setMovies(Array.isArray(data) ? data.filter(m => !m.type || m.type === 'movie') : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const genres = useMemo(() => {
    const all = movies.flatMap(m => m.genres || []);
    return [...new Set(all)].sort();
  }, [movies]);

  const genreCounts = useMemo(() => {
    const counts = {};
    movies.forEach(m => (m.genres || []).forEach(g => { counts[g] = (counts[g] || 0) + 1; }));
    return counts;
  }, [movies]);

  const filtered = useMemo(() => {
    let result = movies;

    if (activeGenre !== 'All')
      result = result.filter(m => (m.genres || []).includes(activeGenre));

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.title?.toLowerCase().includes(q) ||
        (m.genres || []).some(g => g.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'rating')
      return [...result].sort((a, b) => {
        const ra = typeof a.rating === 'object' ? a.rating.percentage / 10 : (a.rating || 0);
        const rb = typeof b.rating === 'object' ? b.rating.percentage / 10 : (b.rating || 0);
        return rb - ra;
      });
    if (sortBy === 'year')
      return [...result].sort((a, b) => (b.year || 0) - (a.year || 0));
    if (sortBy === 'az')
      return [...result].sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    return result;
  }, [movies, activeGenre, search, sortBy]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#080c14', minHeight: '100vh', paddingTop: 80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .mv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px; }
        @media (max-width: 480px) { .mv-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; } }
        @keyframes mv-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes mv-fadein  { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .mv-skeleton { background: linear-gradient(90deg, #0d1420 25%, #1a2235 50%, #0d1420 75%); background-size: 200% 100%; animation: mv-shimmer 1.4s ease infinite; border-radius: 10px; }
        .mv-pill { transition: all 0.18s ease; }
        .mv-pill:hover { opacity: 0.85; }
        .mv-sort-btn { transition: all 0.18s ease; }
        .mv-sort-btn:hover { opacity: 0.8; }
        .mv-clear-btn:hover { background: rgba(232,184,75,0.18) !important; }
      `}</style>

      <div style={{ padding: '32px 32px 0', maxWidth: 1400, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Film size={18} color={ACCENT} strokeWidth={1.5} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
                color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                Collection
              </span>
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 900,
              color: '#e8eaf0', margin: 0, letterSpacing: '-1px', lineHeight: 1 }}>
              Movies
            </h1>
          </div>

          {!loading && (
            <div style={{ display: 'flex', gap: 28 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30,
                  fontWeight: 700, color: ACCENT, lineHeight: 1 }}>{filtered.length}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#3a4560',
                  textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 3 }}>
                  {activeGenre === 'All' && !search ? 'Total' : 'Results'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30,
                  fontWeight: 700, color: '#2a3550', lineHeight: 1 }}>{genres.length}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#3a4560',
                  textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 3 }}>Genres</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Search + Sort ── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
          <div style={{
            flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 10,
            background: searchFocused ? 'rgba(232,184,75,0.05)' : '#0d1420',
            border: `1px solid ${searchFocused ? `${ACCENT}44` : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 10, padding: '0 14px', transition: 'all 0.2s',
            boxShadow: searchFocused ? `0 0 0 3px ${ACCENT_GLOW}` : 'none',
          }}>
            <Search size={14} color={searchFocused ? ACCENT : '#3a4560'} style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search movies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none',
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#c8d0e0', padding: '12px 0' }}
            />
            {search && (
              <button onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                <X size={14} color="#4a5570" />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <SlidersHorizontal size={13} color="#3a4560" />
            {SORT_OPTIONS.map(opt => (
              <button key={opt.value} className="mv-sort-btn" onClick={() => setSortBy(opt.value)} style={{
                padding: '9px 14px', borderRadius: 8, cursor: 'pointer', border: '1px solid',
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
                background: sortBy === opt.value ? ACCENT_DIM : 'transparent',
                borderColor: sortBy === opt.value ? `${ACCENT}55` : 'rgba(255,255,255,0.07)',
                color: sortBy === opt.value ? ACCENT : '#4a5570',
                boxShadow: sortBy === opt.value ? `0 0 10px ${ACCENT_GLOW}` : 'none',
              }}>{opt.label}</button>
            ))}
          </div>
        </div>

        {/* ── Genre Pills ── */}
        {!loading && genres.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6,
            scrollbarWidth: 'none', marginBottom: 32, flexWrap: 'wrap' }}>
            {['All', ...genres].map(genre => {
              const isActive = activeGenre === genre;
              const count = genre === 'All' ? movies.length : (genreCounts[genre] || 0);
              return (
                <button key={genre} className="mv-pill" onClick={() => setActiveGenre(genre)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 13px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, border: '1px solid',
                  background: isActive ? ACCENT_DIM : 'transparent',
                  borderColor: isActive ? `${ACCENT}55` : 'rgba(255,255,255,0.07)',
                  color: isActive ? ACCENT : '#4a5570',
                  boxShadow: isActive ? `0 0 14px ${ACCENT_GLOW}` : 'none',
                }}>
                  {genre}
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 10, lineHeight: 1.6,
                    background: isActive ? `${ACCENT}22` : 'rgba(255,255,255,0.05)',
                    color: isActive ? ACCENT : '#2a3550',
                  }}>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Grid ── */}
      <div style={{ padding: '0 32px 64px', maxWidth: 1400, margin: '0 auto' }}>
        {loading ? (
          <div className="mv-grid">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="mv-skeleton" style={{ height: 235 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px',
            animation: 'mv-fadein 0.3s ease' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎬</div>
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", color: '#4a5570',
              fontSize: 18, fontWeight: 500, margin: '0 0 8px' }}>No movies found</h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#2a3550', fontSize: 14, margin: 0 }}>
              Try a different genre or clear your search
            </p>
            <button className="mv-clear-btn" onClick={() => { setActiveGenre('All'); setSearch(''); }} style={{
              marginTop: 24, padding: '10px 22px', background: ACCENT_DIM, color: ACCENT,
              border: `1px solid ${ACCENT}44`, borderRadius: 8, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, transition: 'all 0.18s',
            }}>Clear filters</button>
          </div>
        ) : (
          <div className="mv-grid" style={{ animation: 'mv-fadein 0.3s ease' }}>
            {filtered.map((movie, i) => (
              <MediaCard key={movie._id || i} media={movie} type="movie" index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}