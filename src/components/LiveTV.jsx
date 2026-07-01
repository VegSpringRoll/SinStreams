// LiveTV.jsx
// Run: npm install hls.js   ← required for HLS stream playback in Chrome/Firefox

import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import axios from 'axios';
import { Search, Tv, Signal, Loader, X, ChevronDown } from 'lucide-react';

const BACKEND_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';
const ACCENT = '#00c9ff';
const ACCENT_DIM = 'rgba(0,201,255,0.12)';
const ACCENT_GLOW = 'rgba(0,201,255,0.25)';

// ─── HLS Player ────────────────────────────────────────────────────────────────
function HLSPlayer({ src, poster, channelName }) {
  const videoRef = useRef(null);
  const hlsRef  = useRef(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setStatus('loading');
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (!src) { setStatus('error'); return; }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus('ready');
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) setStatus('error');
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = src;
      video.onloadedmetadata = () => { setStatus('ready'); video.play().catch(() => {}); };
      video.onerror = () => setStatus('error');
    } else {
      setStatus('error');
    }

    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [src]);

  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: '16/9',
      background: '#000', borderRadius: 14, overflow: 'hidden',
      boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 24px 60px rgba(0,0,0,0.7)`,
    }}>
      {/* CRT scanline overlay — signature texture */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)',
      }} />

      {/* Loading state */}
      {status === 'loading' && (
        <div style={overlay}>
          <div style={spinner} />
          <span style={overlayText}>Tuning in to <b style={{ color: ACCENT }}>{channelName}</b>…</span>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div style={overlay}>
          <Tv size={44} color="#2a3550" strokeWidth={1.5} />
          <span style={{ ...overlayText, color: '#4a5570' }}>Stream unavailable</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#2a3550' }}>
            Select another channel
          </span>
        </div>
      )}

      <video
        ref={videoRef}
        controls
        playsInline
        poster={poster}
        style={{ width: '100%', height: '100%', display: 'block', position: 'relative', zIndex: 1 }}
      />
    </div>
  );
}

// ─── LiveDot ───────────────────────────────────────────────────────────────────
function LiveDot() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
      background: 'rgba(229,9,20,0.15)', border: '1px solid rgba(229,9,20,0.35)',
      borderRadius: 20, padding: '3px 8px 3px 6px',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: '#e50914',
        boxShadow: '0 0 6px #e50914',
        animation: 'livePulse 1.4s ease-in-out infinite',
      }} />
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700,
        letterSpacing: '0.08em', color: '#ff4d55', textTransform: 'uppercase' }}>Live</span>
    </span>
  );
}

// ─── ChannelCard ───────────────────────────────────────────────────────────────
function ChannelCard({ channel, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
        transition: 'all 0.18s ease',
        background: isActive ? ACCENT_DIM : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: `1px solid ${isActive ? `${ACCENT}44` : 'transparent'}`,
        boxShadow: isActive ? `0 0 16px ${ACCENT_GLOW}` : 'none',
      }}
    >
      {/* Logo */}
      <div style={{
        width: 38, height: 38, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
        background: '#0d1420', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${isActive ? `${ACCENT}33` : 'rgba(255,255,255,0.06)'}`,
      }}>
        {channel.logo
          ? <img src={channel.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; }} />
          : <Tv size={16} color="#3a4560" />
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: isActive ? 600 : 400,
          color: isActive ? '#e8eaf0' : '#8892a4',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          transition: 'color 0.18s',
        }}>{channel.name}</div>
        <div style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#3a4560',
          textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2,
        }}>{channel.category}</div>
      </div>

      {/* Active signal indicator */}
      {isActive && <Signal size={12} color={ACCENT} style={{ flexShrink: 0 }} />}
    </div>
  );
}

// ─── Main LiveTV Component ─────────────────────────────────────────────────────
export default function LiveTV() {
  const [channels,         setChannels]         = useState([]);
  const [categories,       setCategories]       = useState([]);
  const [selectedChannel,  setSelectedChannel]  = useState(null);
  const [activeCategory,   setActiveCategory]   = useState('All');
  const [searchQuery,      setSearchQuery]      = useState('');
  const [loading,          setLoading]          = useState(true);
  const [fetchError,       setFetchError]       = useState(false);
  const [searchFocused,    setSearchFocused]    = useState(false);
  const [isMobile,         setIsMobile]         = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { fetchChannels(); }, []);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      setFetchError(false);
      const [chRes, catRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/livetv/channels`),
        axios.get(`${BACKEND_URL}/livetv/categories`),
      ]);
      setChannels(chRes.data || []);
      setCategories(catRes.data || []);
      if (chRes.data?.length > 0) setSelectedChannel(chRes.data[0]);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  const filtered = channels
    .filter(c => activeCategory === 'All' || c.category === activeCategory)
    .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // ── Loading screen ────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ ...pageBase, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <style>{keyframes}</style>
      <div style={spinner} />
      <span style={{ fontFamily: "'DM Sans', sans-serif", color: '#4a5570', fontSize: 14 }}>Loading channels…</span>
    </div>
  );

  // ── Fetch error screen ────────────────────────────────────────────────────────
  if (fetchError) return (
    <div style={{ ...pageBase, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <style>{keyframes}</style>
      <Tv size={48} color="#2a3550" strokeWidth={1.5} />
      <span style={{ fontFamily: "'DM Sans', sans-serif", color: '#4a5570', fontSize: 16 }}>Couldn't load channels</span>
      <button onClick={fetchChannels} style={retryBtn}>Try again</button>
    </div>
  );

  return (
    <div style={pageBase}>
      <style>{keyframes}</style>

      {/* ── Page Header ── */}
      <div style={{ padding: isMobile ? '0 16px 20px' : '0 32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: isMobile ? 28 : 36, fontWeight: 900,
            color: '#e8eaf0', margin: 0, letterSpacing: '-0.5px',
          }}>Live TV</h1>
          <LiveDot />
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#3a4560', fontSize: 13, margin: 0 }}>
          {channels.length}+ free channels — no sign-in required
        </p>
      </div>

      {/* ── Search ── */}
      <div style={{ padding: isMobile ? '0 16px 16px' : '0 32px 16px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: searchFocused ? 'rgba(0,201,255,0.06)' : '#0d1420',
          border: `1px solid ${searchFocused ? `${ACCENT}44` : 'rgba(255,255,255,0.07)'}`,
          borderRadius: 10, padding: '0 14px',
          transition: 'all 0.2s', maxWidth: 420,
          boxShadow: searchFocused ? `0 0 0 3px ${ACCENT_GLOW}` : 'none',
        }}>
          <Search size={15} color={searchFocused ? ACCENT : '#3a4560'} style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search channels…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#c8d0e0',
              padding: '12px 0',
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <X size={14} color="#4a5570" />
            </button>
          )}
        </div>
      </div>

      {/* ── Category Pills ── */}
      <div style={{
        display: 'flex', gap: 6, padding: isMobile ? '0 16px 20px' : '0 32px 24px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {['All', ...categories.slice(0, 20)].map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{
            padding: '7px 14px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
            letterSpacing: '0.02em', transition: 'all 0.18s', border: '1px solid',
            background: activeCategory === cat ? ACCENT_DIM : 'transparent',
            borderColor: activeCategory === cat ? `${ACCENT}55` : 'rgba(255,255,255,0.08)',
            color: activeCategory === cat ? ACCENT : '#4a5570',
            boxShadow: activeCategory === cat ? `0 0 12px ${ACCENT_GLOW}` : 'none',
          }}>{cat}</button>
        ))}
      </div>

      {/* ── Main Layout ── */}
      <div style={{
        display: 'flex', gap: 20, flexDirection: isMobile ? 'column' : 'row',
        padding: isMobile ? '0 16px 32px' : '0 32px 40px',
        alignItems: 'flex-start',
      }}>

        {/* LEFT: Player + Now Playing */}
        <div style={{ flex: '1 1 66%', minWidth: 0 }}>
          {selectedChannel
            ? <HLSPlayer src={selectedChannel.stream} poster={selectedChannel.logo} channelName={selectedChannel.name} />
            : (
              <div style={{
                aspectRatio: '16/9', borderRadius: 14, background: '#0a0f1a',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
              }}>
                <Tv size={48} color="#1a2235" strokeWidth={1.5} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", color: '#2a3550', fontSize: 14 }}>Select a channel</span>
              </div>
            )
          }

          {/* Now Playing bar */}
          {selectedChannel && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14, marginTop: 14,
              background: '#0d1420', borderRadius: 12, padding: '12px 16px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${ACCENT}33`,
              }}>
                {selectedChannel.logo
                  ? <img src={selectedChannel.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <Tv size={20} color="#3a4560" />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: '#e8eaf0' }}>
                  {selectedChannel.name}
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#3a4560', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {selectedChannel.category}
                </div>
              </div>
              <LiveDot />
            </div>
          )}
        </div>

        {/* RIGHT: Channel List */}
        <div style={{
          flex: '0 0 300px', width: isMobile ? '100%' : 300,
          background: '#09101f', borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.05)',
          overflow: 'hidden',
          maxHeight: isMobile ? 400 : 'calc(100vh - 260px)',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Sidebar header */}
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#5a6680', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Channels
            </span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#2a3550' }}>
              {filtered.length}
            </span>
          </div>

          {/* Channel list */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '8px 8px', scrollbarWidth: 'thin', scrollbarColor: '#1a2235 transparent' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <Tv size={32} color="#1a2235" strokeWidth={1.5} style={{ marginBottom: 10 }} />
                <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#2a3550', fontSize: 13 }}>No channels found</div>
              </div>
            ) : (
              filtered.map(channel => (
                <ChannelCard
                  key={channel.tvgId || channel.name}
                  channel={channel}
                  isActive={selectedChannel?.tvgId === channel.tvgId}
                  onClick={() => setSelectedChannel(channel)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared styles & keyframes ─────────────────────────────────────────────────
const pageBase = {
  background: '#080c14', minHeight: '100vh',
  paddingTop: 90, boxSizing: 'border-box',
};

const overlay = {
  position: 'absolute', inset: 0, zIndex: 3,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
  background: 'rgba(0,0,0,0.85)',
};

const overlayText = {
  fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#4a5570',
};

const spinner = {
  width: 36, height: 36, borderRadius: '50%',
  border: `3px solid ${ACCENT_DIM}`,
  borderTop: `3px solid ${ACCENT}`,
  animation: 'spin 0.8s linear infinite',
};

const retryBtn = {
  padding: '9px 20px', background: ACCENT_DIM, color: ACCENT,
  border: `1px solid ${ACCENT}44`, borderRadius: 8, cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
};

const keyframes = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes livePulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 6px #e50914; }
    50%       { opacity: 0.5; box-shadow: 0 0 2px #e50914; }
  }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1a2235; border-radius: 4px; }
`;