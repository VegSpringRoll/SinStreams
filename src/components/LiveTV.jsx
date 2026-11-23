// LiveTV.jsx
import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { Search, Tv, Signal, X } from 'lucide-react';

// ─── REGIONAL & NATIONAL (INDIAN) CHANNELS ──────────────────────────────────
const INDIAN_CHANNELS = [
  // Music
  { id: "ind-m1", name: "7S Music", category: "Music", stream: "https://mumt03.tangotv.in/Dsly5z3H7SMUSIC/index.m3u8" },
  { id: "ind-m2", name: "9X Jalwa", category: "Music", stream: "https://b.jsrdn.com/strm/channels/9xjalwa/master.m3u8" },
  { id: "ind-m5", name: "9XM", category: "Music", stream: "https://9xjio.wiseplayout.com/9XM/master.m3u8" },
  { id: "ind-m12", name: "9XM (Alt)", category: "Music", stream: "https://mumt01.tangotv.in/O5aw8Zn39XM/index.m3u8" },
  { id: "ind-m13", name: "9X Jalwa (Alt)", category: "Music", stream: "https://mumt03.tangotv.in/Dsly5z3H9XJALWA/index.m3u8" },
  { id: "ind-m14", name: "9X Jhakaas", category: "Music", stream: "https://mumt03.tangotv.in/Dsly5z3H9XJHAKAAS/index.m3u8" },
  { id: "ind-m15", name: "9X Tashan", category: "Music", stream: "https://mumt01.tangotv.in/O5aw8Zn39XTASHAN/index.m3u8" },
  { id: "ind-m6", name: "B4U Music", category: "Music", stream: "https://cdn-2.pishow.tv/live/415/master.m3u8" },
  { id: "ind-m8", name: "MTV HD", category: "Music", stream: "http://149.71.34.166:8000/play/a00p/index.m3u8" },
  { id: "ind-m9", name: "YRF Music", category: "Music", stream: "https://amg01412-xiaomiasia-yrfmusic-xiaomi-1rmk2.amagi.tv/ts-eu-w1-n2/playlist/amg01412-xiaomiasia-yrfmusic-xiaomi/cb543d1f7b6c678d9fd43d65d4ef49a1f9591fde1d6988693eb5518975d1073edce2a59caa08ff16388f1ede7f0a66413a3e951fda77118fd87eb141453c5728cfffe729a2c05616b7db083429b56a062a866a68ac39437ed0e21f48a238b6720a5aa82a66443d80b846ac725bdb80148b61299bce8c37683f03409a5e5afba358b1ebe25d47df6df7b81b55922a46b69f43c8821da688d7599d5ed074f71795c7a28e87178580f3c3986d8d5c9f870f07fba957d1ac74b8de93684bf31b4a672d252d270e9c3458a7544a5d8290a376fad361a7a720962013be0c9046c67de2c61124d5836a8cd7f8f1435530abca5a6d6783e4b083ef343ffd52feb0fbd467738bef5477418949dd2e2331da95a172d59245c6e67bd7f6017c4907196dd50273dfcfc99828664db1e9c7b8772e6f700d03c976ad9666da3ddc4265af792e71425ea49659c5c98c10602207b18950d01c0caa9ba5b79f5f6b8430401adf69d70d51378c2c3a28ac6dd88a2c608c110f871e34ef1760d315b2eb7ab5eff0cd32169992874ef664eaf52dd7f509a6247c7a0aa1fd215a0a1d2989a0364360379305d7d2cce065004fb9a49ab093054a72537d650585e6e86788ce91796f71ef676631245e47ec47bc0ff80f460722cc64a38f01668a0b246dabe70854546899dfa2c3e0f2cf57be6bdcdff75a7e630883dcf785d5dcb527d666c744a8b833d9d69fa21257ae8d/181/1920x1080_5876488/index.m3u8" },
  { id: "ind-m10", name: "Shemaroo Filmi Gaane", category: "Music", stream: "https://prod-runn.cdn.runn.tv/shemaroo/stream/smrfgn/playlist.m3u8" },
  { id: "ind-m11", name: "Balle Balle", category: "Music", stream: "https://mcncdndigital.com/balleballetv/index.m3u8" },
  { id: "ind-m16", name: "Music India", category: "Music", stream: "https://cdn-2.pishow.tv/live/226/226_1.m3u8" },
  { id: "ind-m17", name: "Sangeet Bangla", category: "Music", stream: "https://cdn-4.pishow.tv/live/1143/1143_1.m3u8" },
  { id: "ind-m20", name: "Tunes 6", category: "Music", stream: "https://stream.d6-pro.com/tunes6music/live/video.m3u8" },
  { id: "ind-m21", name: "ETV Music", category: "Music", stream: "https://cc-szivnms4rlah6.akamaized.net/WWBI/Amagi/ETV_Music_IN/playlist.m3u8" },
  { id: "ind-m22", name: "Raj Musix Tamil", category: "Music", stream: "https://livestream.rajtv.tv/hlslive/Admin/px08241087/live/Raj_Musix/master_1.m3u8" },
  { id: "ind-m23", name: "Mango Music", category: "Music", stream: "https://amg01911-mangotv-amg01911c1-xiaomi-in-1270.playouts.now.amagi.tv/playlist/amg01911-mangomassmedia-mangotv-xiaomiin/playlist.m3u8" },

  // News
  { id: "ind-n1", name: "Aaj Tak", category: "News", stream: "https://feeds.intoday.in/aajtak/api/master.m3u8" },
  { id: "ind-n2", name: "Aaj Tak HD", category: "News", stream: "https://feeds.intoday.in/aajtak/api/aajtakhd/master.m3u8" },
  { id: "ind-n3", name: "ABP News", category: "News", stream: "https://d1rc86nwwc9fag.cloudfront.net/vglive-sk-472500/abpnews/master.m3u8" },
  { id: "ind-n4", name: "India TV", category: "News", stream: "https://pl-indiatvnews.akamaized.net/out/v1/db79179b608641ceaa5a4d0dd0dca8da/index.m3u8" },
  { id: "ind-n5", name: "NDTV 24x7", category: "News", stream: "https://raw.githubusercontent.com/amazeyourself/adaptive-streams/refs/heads/main/streams/in/YuppTV/NDTV24x7.m3u8" },
  { id: "ind-n6", name: "NDTV India", category: "News", stream: "https://raw.githubusercontent.com/amazeyourself/adaptive-streams/refs/heads/main/streams/in/YuppTV/NDTVIndia.m3u8" },
  { id: "ind-n7", name: "Republic TV", category: "News", stream: "https://raw.githubusercontent.com/amazeyourself/adaptive-streams/refs/heads/main/streams/in/YuppTV/RepublicTV.m3u8" },
  { id: "ind-n8", name: "Republic Bharat", category: "News", stream: "https://raw.githubusercontent.com/amazeyourself/adaptive-streams/refs/heads/main/streams/in/YuppTV/RepublicBharat.m3u8" },
  { id: "ind-n9", name: "Zee News", category: "News", stream: "https://dt3lrqnyx3dks.cloudfront.net/index.m3u8" },
  { id: "ind-n10", name: "News18 India", category: "News", stream: "https://n18syndication.akamaized.net/bpk-tv/News18_India_NW18_MOB/output01/master.m3u8" },
  { id: "ind-n11", name: "Times Now Navbharat", category: "News", stream: "https://raw.githubusercontent.com/amazeyourself/adaptive-streams/refs/heads/main/streams/in/YuppTV/TimesNowNavbharat.m3u8" },
  { id: "ind-n12", name: "WION", category: "News", stream: "https://d7x8z4yuq42qn.cloudfront.net/index_7.m3u8" },
  { id: "ind-n13", name: "DD News", category: "News", stream: "https://cdn-2.pishow.tv/live/12/master.m3u8" },
  { id: "ind-n14", name: "News24", category: "News", stream: "https://vidcdn.vidgyor.com/news24-origin/liveabr/playlist.m3u8" },
  { id: "ind-n15", name: "News Nation", category: "News", stream: "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/6cd2f649739a45ca9de1daf81cc7d0f2/index.m3u8" },
  { id: "ind-n16", name: "India Today", category: "News", stream: "https://d1rc86nwwc9fag.cloudfront.net/vglive-sk-293160/master.m3u8" },
  { id: "ind-n17", name: "ABP News (Alt)", category: "News", stream: "https://d2l4ar6y3mrs4k.cloudfront.net/live-streaming/abpnews-livetv/master.m3u8" },
  { id: "ind-n18", name: "TV9 Bharatvarsh", category: "News", stream: "https://dyjmyiv3bp2ez.cloudfront.net/pub-iotv9hinjzgtpe/liveabr/playlist.m3u8" },
  { id: "ind-n19", name: "News18 Bangla", category: "News", stream: "https://n18syndication.akamaized.net/bpk-tv/News18_Bangla_NW18_MOB/output01/master.m3u8" },
  { id: "ind-n20", name: "News18 Gujarati", category: "News", stream: "https://n18syndication.akamaized.net/bpk-tv/News18_Gujarati_NW18_MOB/output01/master.m3u8" },
  { id: "ind-n21", name: "News18 Marathi", category: "News", stream: "https://n18syndication.akamaized.net/bpk-tv/News18_Lokmat_NW18_MOB/output01/master.m3u8" },
  { id: "ind-n22", name: "TV9 Kannada", category: "News", stream: "https://dyjmyiv3bp2ez.cloudfront.net/pub-iotv9kanmo6oiq/liveabr/playlist.m3u8" },
  { id: "ind-n23", name: "TV9 Telugu", category: "News", stream: "https://dyjmyiv3bp2ez.cloudfront.net/pub-iotv9telcmjhcs/liveabr/playlist.m3u8" },
  { id: "ind-n24", name: "TV9 Marathi", category: "News", stream: "https://dyjmyiv3bp2ez.cloudfront.net/pub-iotv9marlygv8h/liveabr/playlist.m3u8" },
  { id: "ind-n25", name: "Polimer News", category: "News", stream: "https://live-cf-polimernews.dailyhunt.in/master.m3u8" },
  { id: "ind-n26", name: "Sudarshan News", category: "News", stream: "https://ott.livelegitpro.in/sudarshannews/sudarshannews/tracks-v1/index.fmp4.m3u8" },
  { id: "ind-n27", name: "Manorama News", category: "News", stream: "https://mmtvnews1.akamaized.net/v1/master/673630b269b766886555eebfddd4f27f3de3ab50/mmtvNewsCampaign1/index.m3u8" },
  { id: "ind-n28", name: "Asianet News", category: "News", stream: "https://amg13737-amg13737c1-amgplt0016.playout.now3.amagi.tv/playlist/amg13737-amg13737c1-amgplt0016/playlist.m3u8" },
  { id: "ind-n29", name: "Mathrubhumi News", category: "News", stream: "https://mathrubhumicdn.vidgyor.com/mathrubhumi-origin/liveabr/playlist.m3u8" },
  { id: "ind-n30", name: "Kolkata TV", category: "News", stream: "https://cdn.ottlive.co.in/kolkatatv/tracks-v1a1/mono.m3u8" },

  // Entertainment
  { id: "ind-e5", name: "Dangal TV", category: "Entertainment", stream: "https://live-dangal.akamaized.net/liveabr/playlist.m3u8" },
  { id: "ind-e6", name: "Shemaroo TV", category: "Entertainment", stream: "https://airtelapp.shemaroo.com/shemarootv/smil:shemarootvadp.smil/playlist.m3u8" },
  { id: "ind-e7", name: "Dangal 2", category: "Entertainment", stream: "https://live-dangal2.akamaized.net/liveabr/playlist.m3u8" },
  { id: "ind-e8", name: "Big Magic", category: "Entertainment", stream: "https://mumt05.tangotv.in/87NeALx2BIGMAGIC/index.m3u8" },
  { id: "ind-e9", name: "Shemaroo Umang", category: "Entertainment", stream: "https://airtelapp.shemaroo.com/shemarooumang/smil:shemarooumangadp.smil/playlist.m3u8" },
  { id: "ind-e10", name: "Manoranjan TV", category: "Entertainment", stream: "https://cdn-1.pishow.tv/live/1013/1013_2.m3u8" },

  // Movies
  { id: "ind-f1", name: "B4U Movies", category: "Movies", stream: "https://cdn-2.pishow.tv/live/419/master.m3u8" },
  { id: "ind-f4", name: "Sony Max 2", category: "Movies", stream: "http://149.71.34.166:8000/play/a00z/index.m3u8" },
  { id: "ind-f5", name: "&pictures HD", category: "Movies", stream: "https://trs1.aynaott.com/andpictureshd/index.m3u8" },
  { id: "ind-f6", name: "Colors Cineplex HD", category: "Movies", stream: "http://149.71.34.166:8000/play/a00b/index.m3u8" },
  { id: "ind-f7", name: "Goldmines Movies", category: "Movies", stream: "https://cdn-2.pishow.tv/live/1461/1461_2.m3u8" },
  { id: "ind-f8", name: "B4U Kadak", category: "Movies", stream: "https://cdn-2.pishow.tv/live/227/master.m3u8" },
  { id: "ind-f10", name: "Zee Action", category: "Movies", stream: "http://103.72.101.252:8080/live/488.m3u8" },
  { id: "ind-f11", name: "Zee Bollywood", category: "Movies", stream: "http://149.71.34.166:8000/play/a01q/index.m3u8" },
  { id: "ind-f12", name: "Goldmines Bollywood", category: "Movies", stream: "https://mumt03.tangotv.in/Dsly5z3HGOLDMINESBOLLYWOOD/index.m3u8" },

  // Kids
  { id: "ind-k4", name: "Sony Action!", category: "Kids", stream: "https://5098a8b860504a3690fd2e7c0a18d68f.mediatailor.us-west-2.amazonaws.com/v1/manifest/ba62fe743df0fe93366eba3a257d792884136c7f/LINEAR-817-FR-SONYONEHITSACTION-LG_FR/9b50a19b-172c-48dd-a771-dace19dee8b5/2.m3u8" },
  { id: "ind-k5", name: "Disney Channel", category: "Kids", stream: "https://cors-proxy.cooks.fyi/http://212.5.144.156:8080/disney/tracks-v1a1/mono.m3u8" },
  { id: "ind-k7", name: "Cartoon Shala", category: "Kids", stream: "https://stmv6.voxtvhd.com.br/xtremacartoons/xtremacartoons/playlist.m3u8?hls_ctx=497467o0" },

  // Sports
  { id: "ind-s1", name: "Star Sports 1 HD", category: "Sports", stream: "http://103.253.18.58:8000/play/a00m" },
  { id: "ind-s2", name: "Star Sports 1 Hindi HD", category: "Sports", stream: "http://103.253.18.58:8000/play/a00t" },
  { id: "ind-s3", name: "DD Sports", category: "Sports", stream: "https://trs1.aynaott.com/ddsports/index.m3u8" },
  { id: "ind-s4", name: "Sony Sports Ten 3 Hindi", category: "Sports", stream: "http://103.229.254.25:7001/play/a09q/index.m3u8" },
  { id: "ind-s5", name: "Star Sports 2 HD", category: "Sports", stream: "https://tvsen7.aynaott.com/ssport2hd/index.m3u8" },

  // Regional
  { id: "ind-r1", name: "Asianet", category: "Regional", stream: "https://anet.keralive.workers.dev/v1/master/a0d007312bfd99c47f76b77ae26b1ccdaae76cb1/starasianet1_live_https/index.m3u8" },
  { id: "ind-r2", name: "Star Maa HD", category: "Regional", stream: "http://217.20.112.199:8080/maatv/index.m3u8" },
];

const CATEGORIES = ['All', ...new Set(INDIAN_CHANNELS.map(c => c.category))];

// ─── HLSPlayer ─────────────────────────────────────────────────────────────────
function HLSPlayer({ src, poster, channelName }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setStatus('loading');

    if (Hls.isSupported()) {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { setStatus('ready'); video.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) setStatus('error'); });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.onloadedmetadata = () => { setStatus('ready'); video.play().catch(() => {}); };
      video.onerror = () => setStatus('error');
    } else { setStatus('error'); }
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [src]);

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 14, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 24px 60px rgba(0,0,0,0.8)' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)' }} />
      {status === 'loading' && <div style={overlay}><div style={spinner} /><span style={overlayText}>Connecting to <b style={{ color: '#ffffff' }}>{channelName}</b>…</span></div>}
      {status === 'error' && <div style={overlay}><Tv size={44} color="#71717a" strokeWidth={1.5} /><span style={{ ...overlayText, color: '#a1a1aa' }}>Stream broadcast offline</span></div>}
      <video ref={videoRef} controls playsInline poster={poster} style={{ width: '100%', height: '100%', display: 'block', position: 'relative', zIndex: 1 }} />
    </div>
  );
}

// ─── LiveDot ───────────────────────────────────────────────────────────────────
function LiveDot() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, padding: '3px 9px 3px 7px', boxShadow: '0 0 12px rgba(255,255,255,0.15)' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 8px #ffffff', animation: 'livePulse 1.4s ease-in-out infinite' }} />
      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#ffffff', textTransform: 'uppercase' }}>Live</span>
    </span>
  );
}

// ─── ChannelCard ───────────────────────────────────────────────────────────────
function ChannelCard({ channel, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.18s ease',
        background: isActive ? 'rgba(255, 255, 255, 0.12)' : hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
        border: `1px solid ${isActive ? 'rgba(255, 255, 255, 0.35)' : 'transparent'}`,
        boxShadow: isActive ? '0 0 16px rgba(255, 255, 255, 0.12), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none' }}>
      <div style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, overflow: 'hidden', background: '#0a0a0d', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${isActive ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
        {channel.logo ? <img src={channel.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} /> : <Tv size={16} color="#a1a1aa" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? '#ffffff' : '#d4d4d8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.name}</div>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{channel.category}</div>
      </div>
      {isActive && <Signal size={13} color="#ffffff" style={{ flexShrink: 0 }} />}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function LiveTV() {
  const [selectedChannel, setSelectedChannel] = useState(INDIAN_CHANNELS[0]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const filteredChannels = INDIAN_CHANNELS
    .filter(c => activeCategory === 'All' || c.category === activeCategory)
    .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={pageBase}>
      <style>{keyframes}</style>

      {/* Header */}
      <div style={{ padding: isMobile ? '0 16px 20px' : '0 32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: "'Cinzel', 'Playfair Display', serif", fontSize: isMobile ? 28 : 36, fontWeight: 900, color: '#ffffff', margin: 0 }}>Live TV</h1>
          <LiveDot />
        </div>
        <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#71717a', fontSize: 13, margin: 0 }}>
          {INDIAN_CHANNELS.length}+ Channels • Regional & National Feeds
        </p>
      </div>

      {/* Search Bar */}
      <div style={{ padding: isMobile ? '0 16px 16px' : '0 32px 16px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(16, 16, 22, 0.7)',
          border: `1px solid ${searchFocused ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 12, padding: '0 16px', transition: 'all 0.2s', maxWidth: 440,
          boxShadow: searchFocused ? '0 0 16px rgba(255,255,255,0.15)' : 'none',
          backdropFilter: 'blur(16px)',
        }}>
          <Search size={16} color="#a1a1aa" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search channels…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, color: '#ffffff', padding: '12px 0' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <X size={15} color="#a1a1aa" />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: 8, padding: isMobile ? '0 16px 20px' : '0 32px 24px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => {
          const isActiveCat = activeCategory === cat;
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              padding: '7px 16px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '0.02em',
              transition: 'all 0.18s', border: '1px solid',
              background: isActiveCat ? '#ffffff' : 'rgba(255,255,255,0.05)',
              borderColor: isActiveCat ? '#ffffff' : 'rgba(255,255,255,0.12)',
              color: isActiveCat ? '#030304' : '#a1a1aa',
              boxShadow: isActiveCat ? '0 0 16px rgba(255,255,255,0.3)' : 'none',
            }}>{cat}</button>
          );
        })}
      </div>

      {/* Main Layout */}
      <div style={{ display: 'flex', gap: 20, flexDirection: isMobile ? 'column' : 'row', padding: isMobile ? '0 16px 32px' : '0 32px 40px', alignItems: 'flex-start' }}>
        {/* Player column */}
        <div style={{ flex: '1 1 66%', minWidth: 0, width: isMobile ? '100%' : 'auto' }}>
          {selectedChannel ? (
            <HLSPlayer src={selectedChannel.stream} channelName={selectedChannel.name} />
          ) : (
            <div style={{ aspectRatio: '16/9', borderRadius: 14, background: '#0a0a0d', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Tv size={48} color="#71717a" strokeWidth={1.5} />
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#a1a1aa', fontSize: 14 }}>Select a channel</span>
            </div>
          )}
          {selectedChannel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, background: 'rgba(16, 16, 22, 0.7)', borderRadius: 14, padding: '14px 18px', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#07070a', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Tv size={20} color="#ffffff" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700, color: '#ffffff' }}>{selectedChannel.name}</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#71717a', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{selectedChannel.category}</div>
              </div>
              <LiveDot />
            </div>
          )}
        </div>

        {/* Channel List column */}
        <div style={{ flex: '0 0 320px', width: isMobile ? '100%' : 320, background: 'rgba(16, 16, 22, 0.7)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)', overflow: 'hidden', maxHeight: isMobile ? 420 : 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Channels</span>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: '#71717a', fontWeight: 600 }}>{filteredChannels.length}</span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '8px', scrollbarWidth: 'thin' }}>
            {filteredChannels.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <Tv size={32} color="#71717a" strokeWidth={1.5} style={{ marginBottom: 10 }} />
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#71717a', fontSize: 13 }}>No matching channels found</div>
              </div>
            ) : (
              filteredChannels.map(channel => (
                <ChannelCard
                  key={channel.id || channel.name}
                  channel={channel}
                  isActive={selectedChannel?.id === channel.id}
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

// ─── Styles ────────────────────────────────────────────────────────────────────
const pageBase = { background: '#030304', minHeight: '100vh', paddingTop: 85, boxSizing: 'border-box' };
const overlay = { position: 'absolute', inset: 0, zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(0,0,0,0.85)' };
const overlayText = { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, color: '#d4d4d8' };
const spinner = { width: 38, height: 38, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #ffffff', animation: 'spin 0.8s linear infinite' };
const keyframes = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes livePulse { 0%, 100% { opacity: 1; box-shadow: 0 0 10px #ffffff; } 50% { opacity: 0.4; box-shadow: 0 0 2px #ffffff; } }
  ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
`;
