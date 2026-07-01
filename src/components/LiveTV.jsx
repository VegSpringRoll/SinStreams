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

// ─── INDIAN CHANNELS (M3U8 Streams) ──────────────────────────────────────────
const INDIAN_CHANNELS = [
  // Music
  { id: "ind-1", name: "7S Music", category: "Music", logo: "", stream: "https://mumt03.tangotv.in/Dsly5z3H7SMUSIC/index.m3u8" },
  { id: "ind-2", name: "9X Jalwa", category: "Music", logo: "", stream: "https://b.jsrdn.com/strm/channels/9xjalwa/master.m3u8" },
  { id: "ind-3", name: "9X Jhakaas", category: "Music", logo: "", stream: "https://9xjio.wiseplayout.com/9X_Jhakaas/master.m3u8" },
  { id: "ind-4", name: "9X Tashan", category: "Music", logo: "", stream: "https://9xjio.wiseplayout.com/9X_Tashan/master.m3u8" },
  { id: "ind-5", name: "9XM", category: "Music", logo: "", stream: "https://9xjio.wiseplayout.com/9XM/master.m3u8" },
  { id: "ind-6", name: "B4U Music", category: "Music", logo: "", stream: "https://cdn-2.pishow.tv/live/415/master.m3u8" },
  { id: "ind-7", name: "MTV", category: "Music", logo: "", stream: "http://103.72.101.252:8080/live/248.m3u8" },
  { id: "ind-8", name: "MTV HD", category: "Music", logo: "", stream: "http://149.71.34.166:8000/play/a00p/index.m3u8" },
  { id: "ind-9", name: "YRF Music", category: "Music", logo: "", stream: "https://d14c63magvk61v.cloudfront.net/strm/channels/yrfmusic/master.m3u8" },
  { id: "ind-10", name: "Shemaroo Filmi Gaane", category: "Music", logo: "", stream: "https://prod-runn.cdn.runn.tv/shemaroo/stream/smrfgn/playlist.m3u8" },
  { id: "ind-11", name: "Balle Balle", category: "Music", logo: "", stream: "https://mcncdndigital.com/balleballetv/index.m3u8" },

  // News - Hindi
  { id: "ind-20", name: "Aaj Tak", category: "News", logo: "", stream: "https://feeds.intoday.in/aajtak/api/master.m3u8" },
  { id: "ind-21", name: "Aaj Tak HD", category: "News", logo: "", stream: "https://feeds.intoday.in/aajtak/api/aajtakhd/master.m3u8" },
  { id: "ind-22", name: "ABP News", category: "News", logo: "", stream: "https://d1rc86nwwc9fag.cloudfront.net/vglive-sk-472500/abpnews/master.m3u8" },
  { id: "ind-23", name: "India TV", category: "News", logo: "", stream: "https://pl-indiatvnews.akamaized.net/out/v1/db79179b608641ceaa5a4d0dd0dca8da/index.m3u8" },
  { id: "ind-24", name: "NDTV 24x7", category: "News", logo: "", stream: "https://raw.githubusercontent.com/amazeyourself/adaptive-streams/refs/heads/main/streams/in/YuppTV/NDTV24x7.m3u8" },
  { id: "ind-25", name: "NDTV India", category: "News", logo: "", stream: "https://raw.githubusercontent.com/amazeyourself/adaptive-streams/refs/heads/main/streams/in/YuppTV/NDTVIndia.m3u8" },
  { id: "ind-26", name: "Republic TV", category: "News", logo: "", stream: "https://raw.githubusercontent.com/amazeyourself/adaptive-streams/refs/heads/main/streams/in/YuppTV/RepublicTV.m3u8" },
  { id: "ind-27", name: "Republic Bharat", category: "News", logo: "", stream: "https://raw.githubusercontent.com/amazeyourself/adaptive-streams/refs/heads/main/streams/in/YuppTV/RepublicBharat.m3u8" },
  { id: "ind-28", name: "Zee News", category: "News", logo: "", stream: "https://dt3lrqnyx3dks.cloudfront.net/index.m3u8" },
  { id: "ind-29", name: "News18 India", category: "News", logo: "", stream: "https://n18syndication.akamaized.net/bpk-tv/News18_India_NW18_MOB/output01/master.m3u8" },
  { id: "ind-30", name: "Times Now Navbharat", category: "News", logo: "", stream: "https://raw.githubusercontent.com/amazeyourself/adaptive-streams/refs/heads/main/streams/in/YuppTV/TimesNowNavbharat.m3u8" },
  { id: "ind-31", name: "WION", category: "News", logo: "", stream: "https://d7x8z4yuq42qn.cloudfront.net/index_7.m3u8" },
  { id: "ind-32", name: "DD News", category: "News", logo: "", stream: "https://cdn-2.pishow.tv/live/12/master.m3u8" },

  // Entertainment
  { id: "ind-40", name: "Colors HD", category: "Entertainment", logo: "", stream: "http://149.71.34.166:8000/play/a00c/index.m3u8" },
  { id: "ind-41", name: "Star Plus HD", category: "Entertainment", logo: "", stream: "https://trs1.aynaott.com/starplushd/index.m3u8" },
  { id: "ind-42", name: "Zee TV HD", category: "Entertainment", logo: "", stream: "https://trs1.aynaott.com/zeetvhd/index.m3u8" },
  { id: "ind-43", name: "Sony Entertainment HD", category: "Entertainment", logo: "", stream: "http://stb-air.wasmer.app/play.php?id=LIVETV_LIVETVCHANNEL_SET_HD&pass=krish-ka&uid=gana-sunega" },
  { id: "ind-44", name: "&TV HD", category: "Entertainment", logo: "", stream: "https://trs1.aynaott.com/andtvhd/index.m3u8" },
  { id: "ind-45", name: "Dangal TV", category: "Entertainment", logo: "", stream: "https://live-dangal.akamaized.net/liveabr/playlist.m3u8" },
  { id: "ind-46", name: "Shemaroo TV", category: "Entertainment", logo: "", stream: "https://airtelapp.shemaroo.com/shemarootv/smil:shemarootvadp.smil/playlist.m3u8" },

  // Movies
  { id: "ind-50", name: "B4U Movies", category: "Movies", logo: "", stream: "https://cdn-2.pishow.tv/live/419/master.m3u8" },
  { id: "ind-51", name: "Zee Cinema HD", category: "Movies", logo: "", stream: "https://trs1.aynaott.com/ZeeCinemaHD/index.m3u8" },
  { id: "ind-52", name: "Star Gold Select HD", category: "Movies", logo: "", stream: "http://149.71.34.166:8000/play/a01d/index.m3u8" },
  { id: "ind-53", name: "Sony Max 2", category: "Movies", logo: "", stream: "http://149.71.34.166:8000/play/a00z/index.m3u8" },
  { id: "ind-54", name: "&pictures HD", category: "Movies", logo: "", stream: "https://trs1.aynaott.com/andpictureshd/index.m3u8" },
  { id: "ind-55", name: "Colors Cineplex HD", category: "Movies", logo: "", stream: "http://149.71.34.166:8000/play/a00b/index.m3u8" },
  { id: "ind-56", name: "Goldmines Movies", category: "Movies", logo: "", stream: "https://trs1.aynaott.com/GoldminesMovies/index.m3u8" },
  { id: "ind-57", name: "B4U Kadak", category: "Movies", logo: "", stream: "https://cdn-2.pishow.tv/live/227/master.m3u8" },

  // Kids
  { id: "ind-60", name: "Nickelodeon", category: "Kids", logo: "", stream: "http://149.71.34.166:8000/play/a00u/index.m3u8" },
  { id: "ind-61", name: "Nick HD+", category: "Kids", logo: "", stream: "http://116.90.120.157:8000/play/a0i3/index.m3u8" },
  { id: "ind-62", name: "Hungama TV", category: "Kids", logo: "", stream: "http://149.71.34.166:8000/play/a075/index.m3u8" },
  { id: "ind-63", name: "Sony Yay!", category: "Kids", logo: "", stream: "https://sl.vodep39240327.workers.dev/channel/SONY+YAY.m3u8" },
  { id: "ind-64", name: "Disney Junior", category: "Kids", logo: "", stream: "http://149.71.34.166:8000/play/a00l/index.m3u8" },

  // Sports
  { id: "ind-70", name: "Star Sports 1 HD", category: "Sports", logo: "", stream: "http://103.253.18.58:8000/play/a00m" },
  { id: "ind-71", name: "Star Sports 1 Hindi HD", category: "Sports", logo: "", stream: "http://103.253.18.58:8000/play/a00t" },
  { id: "ind-72", name: "DD Sports", category: "Sports", logo: "", stream: "https://trs1.aynaott.com/ddsports/index.m3u8" },
  { id: "ind-73", name: "Sony Sports Ten 3 Hindi", category: "Sports", logo: "", stream: "http://103.229.254.25:7001/play/a09q/index.m3u8" },

  // Regional
  { id: "ind-80", name: "Asianet", category: "Regional", logo: "", stream: "https://anet.keralive.workers.dev/v1/master/a0d007312bfd99c47f76b77ae26b1ccdaae76cb1/starasianet1_live_https/index.m3u8" },
  { id: "ind-81", name: "Star Maa HD", category: "Regional", logo: "", stream: "http://217.20.112.199:8080/maatv/index.m3u8" },
  { id: "ind-82", name: "Star Vijay HD", category: "Regional", logo: "", stream: "http://149.71.34.166:8000/play/a06i/index.m3u8" },
  { id: "ind-83", name: "Colors Bangla HD", category: "Regional", logo: "", stream: "https://trs1.aynaott.com/colorsbangla/index.m3u8" },
  { id: "ind-84", name: "Zee Bangla HD", category: "Regional", logo: "", stream: "https://trs1.aynaott.com/zeebangla/index.m3u8" },
  { id: "ind-85", name: "Star Jalsha HD", category: "Regional", logo: "", stream: "https://tvsen4.aynaott.com/n64PH4YL/index.m3u8" },
  { id: "ind-86", name: "Zee Marathi HD", category: "Regional", logo: "", stream: "http://103.72.101.252:8080/live/1360.m3u8" },
  { id: "ind-87", name: "Star Pravah HD", category: "Regional", logo: "", stream: "https://anet.keralive.workers.dev/v1/master/a0d007312bfd99c47f76b77ae26b1ccdaae76cb1/starpravah_live_https/index.m3u8" },
  { id: "ind-88", name: "Kairali TV", category: "Regional", logo: "", stream: "https://mumt01.tangotv.in/O5aw8Zn3KAIRALI/index.m3u8" },
  { id: "ind-89", name: "Flowers TV", category: "Regional", logo: "", stream: "http://103.72.101.252:8080/live/634.m3u8" },

  // Devotional
  { id: "ind-90", name: "Aastha", category: "Devotional", logo: "", stream: "https://cdn-1.pishow.tv/live/1454/master.m3u8" },
  { id: "ind-91", name: "Sanskar TV", category: "Devotional", logo: "", stream: "https://d26idhjf0y1p2g.cloudfront.net/out/v1/cd66dd25b9774cb29943bab54bbf3e2f/index.m3u8" },
];

// ─── HLS Player ────────────────────────────────────────────────────────────────
function HLSPlayer({ src, poster, channelName }) {
  const videoRef = useRef(null);
  const hlsRef  = useRef(null);
  const [status, setStatus] = useState('loading');

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
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)',
      }} />
      {status === 'loading' && (
        <div style={overlay}>
          <div style={spinner} />
          <span style={overlayText}>Tuning in to <b style={{ color: ACCENT }}>{channelName}</b>…</span>
        </div>
      )}
      {status === 'error' && (
        <div style={overlay}>
          <Tv size={44} color="#2a3550" strokeWidth={1.5} />
          <span style={{ ...overlayText, color: '#4a5570' }}>Stream unavailable</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#2a3550' }}>Select another channel</span>
        </div>
      )}
      <video ref={videoRef} controls playsInline poster={poster}
        style={{ width: '100%', height: '100%', display: 'block', position: 'relative', zIndex: 1 }} />
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
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#e50914',
        boxShadow: '0 0 6px #e50914', animation: 'livePulse 1.4s ease-in-out infinite' }} />
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700,
        letterSpacing: '0.08em', color: '#ff4d55', textTransform: 'uppercase' }}>Live</span>
    </span>
  );
}

// ─── ChannelCard ───────────────────────────────────────────────────────────────
function ChannelCard({ channel, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
        cursor: 'pointer', transition: 'all 0.18s ease',
        background: isActive ? ACCENT_DIM : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: `1px solid ${isActive ? `${ACCENT}44` : 'transparent'}`,
        boxShadow: isActive ? `0 0 16px ${ACCENT_GLOW}` : 'none',
      }}>
      <div style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
        background: '#0d1420', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${isActive ? `${ACCENT}33` : 'rgba(255,255,255,0.06)'}` }}>
        {channel.logo
          ? <img src={channel.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; }} />
          : <Tv size={16} color="#3a4560" />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: isActive ? 600 : 400,
          color: isActive ? '#e8eaf0' : '#8892a4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {channel.name}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#3a4560',
          textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
          {channel.category}
        </div>
      </div>
      {isActive && <Signal size={12} color={ACCENT} style={{ flexShrink: 0 }} />}
    </div>
  );
}

// ─── Main LiveTV Component ─────────────────────────────────────────────────────
export default function LiveTV() {
  const [iptvChannels,     setIptvChannels]     = useState([]);
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

  // Combine IPTV + Indian channels
  const allChannels = [...iptvChannels, ...INDIAN_CHANNELS];
  const allCategories = ['All', ...new Set([...categories, ...INDIAN_CHANNELS.map(c => c.category)])];

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
      setIptvChannels(chRes.data || []);
      setCategories(catRes.data || []);
      if (chRes.data?.length > 0) {
        setSelectedChannel(chRes.data[0]);
      } else if (INDIAN_CHANNELS.length > 0) {
        setSelectedChannel(INDIAN_CHANNELS[0]);
      }
    } catch {
      setFetchError(true);
      // If IPTV fails, still show Indian channels
      if (INDIAN_CHANNELS.length > 0) {
        setSelectedChannel(INDIAN_CHANNELS[0]);
        setFetchError(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = allChannels
    .filter(c => activeCategory === 'All' || c.category === activeCategory)
    .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return (
    <div style={{ ...pageBase, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <style>{keyframes}</style>
      <div style={spinner} />
      <span style={{ fontFamily: "'DM Sans', sans-serif", color: '#4a5570', fontSize: 14 }}>Loading channels…</span>
    </div>
  );

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

      <div style={{ padding: isMobile ? '0 16px 20px' : '0 32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 28 : 36, fontWeight: 900,
            color: '#e8eaf0', margin: 0, letterSpacing: '-0.5px' }}>Live TV</h1>
          <LiveDot />
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#3a4560', fontSize: 13, margin: 0 }}>
          {allChannels.length}+ free channels — no sign-in required
        </p>
      </div>

      <div style={{ padding: isMobile ? '0 16px 16px' : '0 32px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          background: searchFocused ? 'rgba(0,201,255,0.06)' : '#0d1420',
          border: `1px solid ${searchFocused ? `${ACCENT}44` : 'rgba(255,255,255,0.07)'}`,
          borderRadius: 10, padding: '0 14px', transition: 'all 0.2s', maxWidth: 420,
          boxShadow: searchFocused ? `0 0 0 3px ${ACCENT_GLOW}` : 'none' }}>
          <Search size={15} color={searchFocused ? ACCENT : '#3a4560'} style={{ flexShrink: 0 }} />
          <input type="text" placeholder="Search channels…" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none',
              fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#c8d0e0', padding: '12px 0' }} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <X size={14} color="#4a5570" />
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: isMobile ? '0 16px 20px' : '0 32px 24px',
        overflowX: 'auto', scrollbarWidth: 'none' }}>
        {allCategories.slice(0, 25).map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{
            padding: '7px 14px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: '0.02em',
            transition: 'all 0.18s', border: '1px solid',
            background: activeCategory === cat ? ACCENT_DIM : 'transparent',
            borderColor: activeCategory === cat ? `${ACCENT}55` : 'rgba(255,255,255,0.08)',
            color: activeCategory === cat ? ACCENT : '#4a5570',
            boxShadow: activeCategory === cat ? `0 0 12px ${ACCENT_GLOW}` : 'none',
          }}>{cat}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20, flexDirection: isMobile ? 'column' : 'row',
        padding: isMobile ? '0 16px 32px' : '0 32px 40px', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 66%', minWidth: 0 }}>
          {selectedChannel
            ? <HLSPlayer src={selectedChannel.stream} poster={selectedChannel.logo} channelName={selectedChannel.name} />
            : (
              <div style={{ aspectRatio: '16/9', borderRadius: 14, background: '#0a0f1a',
                border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Tv size={48} color="#1a2235" strokeWidth={1.5} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", color: '#2a3550', fontSize: 14 }}>Select a channel</span>
              </div>
            )
          }
          {selectedChannel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14,
              background: '#0d1420', borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: 46, height: 46, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${ACCENT}33` }}>
                {selectedChannel.logo
                  ? <img src={selectedChannel.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <Tv size={20} color="#3a4560" />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: '#e8eaf0' }}>
                  {selectedChannel.name}
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#3a4560', marginTop: 2,
                  textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {selectedChannel.category}
                </div>
              </div>
              <LiveDot />
            </div>
          )}
        </div>

        <div style={{ flex: '0 0 300px', width: isMobile ? '100%' : 300, background: '#09101f',
          borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden',
          maxHeight: isMobile ? 400 : 'calc(100vh - 260px)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#5a6680',
              textTransform: 'uppercase', letterSpacing: '0.08em' }}>Channels</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#2a3550' }}>{filtered.length}</span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '8px 8px', scrollbarWidth: 'thin', scrollbarColor: '#1a2235 transparent' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <Tv size={32} color="#1a2235" strokeWidth={1.5} style={{ marginBottom: 10 }} />
                <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#2a3550', fontSize: 13 }}>No channels found</div>
              </div>
            ) : (
              filtered.map(channel => (
                <ChannelCard key={channel.id || channel.tvgId || channel.name} channel={channel}
                  isActive={selectedChannel?.id === channel.id || selectedChannel?.tvgId === channel.tvgId}
                  onClick={() => setSelectedChannel(channel)} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared styles & keyframes ─────────────────────────────────────────────────
const pageBase = { background: '#080c14', minHeight: '100vh', paddingTop: 90, boxSizing: 'border-box' };
const overlay = { position: 'absolute', inset: 0, zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(0,0,0,0.85)' };
const overlayText = { fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#4a5570' };
const spinner = { width: 36, height: 36, borderRadius: '50%', border: `3px solid ${ACCENT_DIM}`, borderTop: `3px solid ${ACCENT}`, animation: 'spin 0.8s linear infinite' };
const retryBtn = { padding: '9px 20px', background: ACCENT_DIM, color: ACCENT, border: `1px solid ${ACCENT}44`, borderRadius: 8, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600 };
const keyframes = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes livePulse { 0%, 100% { opacity: 1; box-shadow: 0 0 6px #e509