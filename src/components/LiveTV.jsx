// LiveTV.jsx
import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import axios from 'axios';
import { Search, Tv, Signal, X, Globe, Flag } from 'lucide-react';

const BACKEND_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';
const ACCENT = '#00c9ff';
const ACCENT_DIM = 'rgba(0,201,255,0.12)';
const ACCENT_GLOW = 'rgba(0,201,255,0.25)';
const ACCENT_IN = '#ff9933';
const ACCENT_IN_DIM = 'rgba(255,153,51,0.12)';

// ─── ALL INDIAN CHANNELS ──────────────────────────────────────────────────────
const INDIAN_CHANNELS = [
  { id: "ind-m1", name: "7S Music", category: "Music", stream: "https://mumt03.tangotv.in/Dsly5z3H7SMUSIC/index.m3u8" },
  { id: "ind-m2", name: "9X Jalwa", category: "Music", stream: "https://b.jsrdn.com/strm/channels/9xjalwa/master.m3u8" },
  { id: "ind-m3", name: "9X Jhakaas", category: "Music", stream: "https://9xjio.wiseplayout.com/9X_Jhakaas/master.m3u8" },
  { id: "ind-m4", name: "9X Tashan", category: "Music", stream: "https://9xjio.wiseplayout.com/9X_Tashan/master.m3u8" },
  { id: "ind-m5", name: "9XM", category: "Music", stream: "https://9xjio.wiseplayout.com/9XM/master.m3u8" },
  { id: "ind-m6", name: "B4U Music", category: "Music", stream: "https://cdn-2.pishow.tv/live/415/master.m3u8" },
  { id: "ind-m7", name: "MTV", category: "Music", stream: "http://103.72.101.252:8080/live/248.m3u8" },
  { id: "ind-m8", name: "MTV HD", category: "Music", stream: "http://149.71.34.166:8000/play/a00p/index.m3u8" },
  { id: "ind-m9", name: "YRF Music", category: "Music", stream: "https://d14c63magvk61v.cloudfront.net/strm/channels/yrfmusic/master.m3u8" },
  { id: "ind-m10", name: "Shemaroo Filmi Gaane", category: "Music", stream: "https://prod-runn.cdn.runn.tv/shemaroo/stream/smrfgn/playlist.m3u8" },
  { id: "ind-m11", name: "Balle Balle", category: "Music", stream: "https://mcncdndigital.com/balleballetv/index.m3u8" },
  { id: "ind-m12", name: "9XM (Alt)", category: "Music", stream: "https://mumt01.tangotv.in/O5aw8Zn39XM/index.m3u8" },
  { id: "ind-m13", name: "9X Jalwa (Alt)", category: "Music", stream: "https://mumt03.tangotv.in/Dsly5z3H9XJALWA/index.m3u8" },
  { id: "ind-m14", name: "9X Jhakaas (Alt)", category: "Music", stream: "https://mumt03.tangotv.in/Dsly5z3H9XJHAKAAS/index.m3u8" },
  { id: "ind-m15", name: "9X Tashan (Alt)", category: "Music", stream: "https://mumt01.tangotv.in/O5aw8Zn39XTASHAN/index.m3u8" },
  { id: "ind-m16", name: "Music India", category: "Music", stream: "https://trs1.aynaott.com/MusicIndia/index.m3u8" },
  { id: "ind-m17", name: "Sangeet Bangla", category: "Music", stream: "https://trs1.aynaott.com/SangeetBangla/index.m3u8" },
  { id: "ind-m18", name: "Sangeet Bhojpuri", category: "Music", stream: "http://103.213.31.109:90/SangeetBhojpuri/playlist.m3u8" },
  { id: "ind-m19", name: "RC Music", category: "Music", stream: "https://view.rcserver.in/tmp_hls1/stream/index.m3u8" },
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
  { id: "ind-n30", name: "Kolkata TV", category: "News", stream: "https://trs1.aynaott.com/kolkatatv/index.m3u8" },

  // Entertainment
  { id: "ind-e1", name: "Colors HD", category: "Entertainment", stream: "http://149.71.34.166:8000/play/a00c/index.m3u8" },
  { id: "ind-e2", name: "Star Plus HD", category: "Entertainment", stream: "https://trs1.aynaott.com/starplushd/index.m3u8" },
  { id: "ind-e3", name: "Zee TV HD", category: "Entertainment", stream: "https://trs1.aynaott.com/zeetvhd/index.m3u8" },
  { id: "ind-e4", name: "&TV HD", category: "Entertainment", stream: "https://trs1.aynaott.com/andtvhd/index.m3u8" },
  { id: "ind-e5", name: "Dangal TV", category: "Entertainment", stream: "https://live-dangal.akamaized.net/liveabr/playlist.m3u8" },
  { id: "ind-e6", name: "Shemaroo TV", category: "Entertainment", stream: "https://airtelapp.shemaroo.com/shemarootv/smil:shemarootvadp.smil/playlist.m3u8" },
  { id: "ind-e7", name: "Dangal 2", category: "Entertainment", stream: "https://live-dangal2.akamaized.net/liveabr/playlist.m3u8" },
  { id: "ind-e8", name: "Big Magic", category: "Entertainment", stream: "https://mumt05.tangotv.in/87NeALx2BIGMAGIC/index.m3u8" },
  { id: "ind-e9", name: "Shemaroo Umang", category: "Entertainment", stream: "https://airtelapp.shemaroo.com/shemarooumang/smil:shemarooumangadp.smil/playlist.m3u8" },
  { id: "ind-e10", name: "Manoranjan TV", category: "Entertainment", stream: "https://trs1.aynaott.com/ManoranjanTV/index.m3u8" },

  // Movies
  { id: "ind-f1", name: "B4U Movies", category: "Movies", stream: "https://cdn-2.pishow.tv/live/419/master.m3u8" },
  { id: "ind-f2", name: "Zee Cinema HD", category: "Movies", stream: "https://trs1.aynaott.com/ZeeCinemaHD/index.m3u8" },
  { id: "ind-f3", name: "Star Gold Select HD", category: "Movies", stream: "http://149.71.34.166:8000/play/a01d/index.m3u8" },
  { id: "ind-f4", name: "Sony Max 2", category: "Movies", stream: "http://149.71.34.166:8000/play/a00z/index.m3u8" },
  { id: "ind-f5", name: "&pictures HD", category: "Movies", stream: "https://trs1.aynaott.com/andpictureshd/index.m3u8" },
  { id: "ind-f6", name: "Colors Cineplex HD", category: "Movies", stream: "http://149.71.34.166:8000/play/a00b/index.m3u8" },
  { id: "ind-f7", name: "Goldmines Movies", category: "Movies", stream: "https://trs1.aynaott.com/GoldminesMovies/index.m3u8" },
  { id: "ind-f8", name: "B4U Kadak", category: "Movies", stream: "https://cdn-2.pishow.tv/live/227/master.m3u8" },
  { id: "ind-f9", name: "Star Gold 2", category: "Movies", stream: "http://103.253.18.58:8000/play/a00r" },
  { id: "ind-f10", name: "Zee Action", category: "Movies", stream: "http://103.72.101.252:8080/live/488.m3u8" },
  { id: "ind-f11", name: "Zee Bollywood", category: "Movies", stream: "http://149.71.34.166:8000/play/a01q/index.m3u8" },
  { id: "ind-f12", name: "Goldmines Bollywood", category: "Movies", stream: "https://trs1.aynaott.com/GoldminesBollywood/index.m3u8" },
  { id: "ind-f13", name: "Movies Now HD", category: "Movies", stream: "http://103.161.153.165:8000/play/mnh/index.m3u8" },
  { id: "ind-f14", name: "MNX HD", category: "Movies", stream: "http://149.71.34.166:8000/play/a05u/index.m3u8" },

  // Kids
  { id: "ind-k1", name: "Nickelodeon", category: "Kids", stream: "http://149.71.34.166:8000/play/a00u/index.m3u8" },
  { id: "ind-k2", name: "Nick HD+", category: "Kids", stream: "http://116.90.120.157:8000/play/a0i3/index.m3u8" },
  { id: "ind-k3", name: "Hungama TV", category: "Kids", stream: "http://149.71.34.166:8000/play/a075/index.m3u8" },
  { id: "ind-k4", name: "Sony Yay!", category: "Kids", stream: "https://sl.vodep39240327.workers.dev/channel/SONY+YAY.m3u8" },
  { id: "ind-k5", name: "Disney Junior", category: "Kids", stream: "http://149.71.34.166:8000/play/a00l/index.m3u8" },
  { id: "ind-k6", name: "Disney International HD", category: "Kids", stream: "http://149.71.34.166:8002/play/a01p/index.m3u8" },
  { id: "ind-k7", name: "Cartoon Network", category: "Kids", stream: "http://103.72.101.252:8080/live/placeholder.m3u8" },

  // Sports
  { id: "ind-s1", name: "Star Sports 1 HD", category: "Sports", stream: "http://103.253.18.58:8000/play/a00m" },
  { id: "ind-s2", name: "Star Sports 1 Hindi HD", category: "Sports", stream: "http://103.253.18.58:8000/play/a00t" },
  { id: "ind-s3", name: "DD Sports", category: "Sports", stream: "https://trs1.aynaott.com/ddsports/index.m3u8" },
  { id: "ind-s4", name: "Sony Sports Ten 3 Hindi", category: "Sports", stream: "http://103.229.254.25:7001/play/a09q/index.m3u8" },
  { id: "ind-s5", name: "Star Sports 2 HD", category: "Sports", stream: "https://tvsen7.aynaott.com/ssport2hd/index.m3u8" },

  // Regional
  { id: "ind-r1", name: "Asianet", category: "Regional", stream: "https://anet.keralive.workers.dev/v1/master/a0d007312bfd99c47f76b77ae26b1ccdaae76cb1/starasianet1_live_https/index.m3u8" },
  { id: "ind-r2", name: "Star Maa HD", category: "Regional", stream: "http://217.20.112.199:8080/maatv/index.m3u8" },
  { id: "ind-r3", name: "Star Vijay HD", category: "Regional", stream: "http://149.71.34.166:8000/play/a06i/index.m3u8" },
  { id: "ind-r4", name: "Colors Bangla HD", category: "Regional", stream: "https://trs1.aynaott.com/colorsbangla/index.m3u8" },
  { id: "ind-r5", name: "Zee Bangla HD", category: "Regional", stream: "https://trs1.aynaott.com/zeebangla/index.m3u8" },
  { id: "ind-r6", name: "Star Jalsha HD", category: "Regional", stream: "https://tvsen4.aynaott.com/n64PH4YL/index.m3u8" },
  { id: "ind-r7", name: "Zee Marathi HD", category: "Regional", stream: "http://103.72.101.252:8080/live/1360.m3u8" },
  { id: "ind-r8", name: "Star Pravah HD", category: "Regional", stream: "https://anet.keralive.workers.dev/v1/master/a0d007312bfd99c47f76b77ae26b1ccdaae76cb1/starpravah_live_https/index.m3u8" },
  { id: "ind-r9", name: "Kairali TV", category: "Regional", stream: "https://mumt01.tangotv.in/O5aw8Zn3KAIRALI/index.m3u8" },
  { id: "ind-r10", name: "Flowers TV", category: "Regional", stream: "http://103.72.101.252:8080/live/634.m3u8" },
  { id: "ind-r11", name: "Surya TV", category: "Regional", stream: "https://stream.ottlive.co.in/suryatvtamil/index.m3u8" },
  { id: "ind-r12", name: "Zee Telugu HD", category: "Regional", stream: "https://mumbai-edge.smartplaytv.in/ZeeTeluguHD/index.m3u8" },
  { id: "ind-r13", name: "Asianet Movies", category: "Regional", stream: "https://anet.keralive.workers.dev/v1/master/a0d007312bfd99c47f76b77ae26b1ccdaae76cb1/asianetmovies_live_https/index.m3u8" },
  { id: "ind-r14", name: "Jalsha Movies HD", category: "Regional", stream: "http://103.229.254.25:7001/play/a0dt/index.m3u8" },
  { id: "ind-r15", name: "Mazhavil Manorama", category: "Regional", stream: "https://cdn-3.pishow.tv/live/1479/master.m3u8" },
  { id: "ind-r16", name: "Zee Tamil", category: "Regional", stream: "http://103.72.101.252:8080/live/placeholder2.m3u8" },
  { id: "ind-r17", name: "Colors Tamil HD", category: "Regional", stream: "http://103.72.101.252:8080/live/429.m3u8" },
  { id: "ind-r18", name: "Raj TV", category: "Regional", stream: "http://103.72.101.252:8080/live/707.m3u8" },
  { id: "ind-r19", name: "Jaya TV", category: "Regional", stream: "http://103.72.101.252:8080/live/419.m3u8" },
  { id: "ind-r20", name: "Kalaignar TV", category: "Regional", stream: "http://103.72.101.252:8080/live/1209.m3u8" },

  // Devotional
  { id: "ind-d1", name: "Aastha", category: "Devotional", stream: "https://cdn-1.pishow.tv/live/1454/master.m3u8" },
  { id: "ind-d2", name: "Sanskar TV", category: "Devotional", stream: "https://d26idhjf0y1p2g.cloudfront.net/out/v1/cd66dd25b9774cb29943bab54bbf3e2f/index.m3u8" },
  { id: "ind-d3", name: "Aastha Bhajan", category: "Devotional", stream: "https://mumt05.tangotv.in/87NeALx2AASTHABHAJAN/index.m3u8" },
  { id: "ind-d4", name: "Ishwar Bhakti TV", category: "Devotional", stream: "https://cdn-2.pishow.tv/live/1464/master.m3u8" },
  { id: "ind-d5", name: "Hare Krsna TV", category: "Devotional", stream: "https://airtelapp.shemaroo.com/harekrsnatv/smil:harekrsnatvadp.smil/playlist.m3u8" },

  // Infotainment
  { id: "ind-i1", name: "History TV18 HD", category: "Infotainment", stream: "http://103.154.3.101:5001/live/577.m3u8" },
  { id: "ind-i2", name: "National Geographic HD", category: "Infotainment", stream: "http://149.71.34.166:8002/play/a013/index.m3u8" },
  { id: "ind-i3", name: "Nat Geo Wild HD", category: "Infotainment", stream: "http://149.71.34.166:8002/play/a012/index.m3u8" },
  { id: "ind-i4", name: "Travelxp HD", category: "Infotainment", stream: "https://amg00416-amg00416c9-samsung-in-4882.playouts.now.amagi.tv/playlist/amg00416-travelxp-travelxphd-samsungin/playlist.m3u8" },
  { id: "ind-i5", name: "DD National HD", category: "Infotainment", stream: "https://mumt01.tangotv.in/O5aw8Zn3DDNATIONALHD/index.m3u8" },
];

// ─── HLS Player ────────────────────────────────────────────────────────────────
function HLSPlayer({ src, poster, channelName }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
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
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 14, overflow: 'hidden', boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 24px 60px rgba(0,0,0,0.7)` }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)' }} />
      {status === 'loading' && <div style={overlay}><div style={spinner} /><span style={overlayText}>Tuning to <b style={{ color: ACCENT }}>{channelName}</b>…</span></div>}
      {status === 'error' && <div style={overlay}><Tv size={44} color="#2a3550" strokeWidth={1.5} /><span style={{ ...overlayText, color: '#4a5570' }}>Stream unavailable</span></div>}
      <video ref={videoRef} controls playsInline poster={poster} style={{ width: '100%', height: '100%', display: 'block', position: 'relative', zIndex: 1 }} />
    </div>
  );
}

// ─── LiveDot ───────────────────────────────────────────────────────────────────
function LiveDot({ color = '#e50914' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(229,9,20,0.15)', border: '1px solid rgba(229,9,20,0.35)', borderRadius: 20, padding: '3px 8px 3px 6px' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, animation: 'livePulse 1.4s ease-in-out infinite' }} />
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#ff4d55', textTransform: 'uppercase' }}>Live</span>
    </span>
  );
}

// ─── ChannelCard ───────────────────────────────────────────────────────────────
function ChannelCard({ channel, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.18s ease',
        background: isActive ? ACCENT_DIM : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: `1px solid ${isActive ? `${ACCENT}44` : 'transparent'}`, boxShadow: isActive ? `0 0 16px ${ACCENT_GLOW}` : 'none' }}>
      <div style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, overflow: 'hidden', background: '#0d1420', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${isActive ? `${ACCENT}33` : 'rgba(255,255,255,0.06)'}` }}>
        {channel.logo ? <img src={channel.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} /> : <Tv size={16} color="#3a4560" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? '#e8eaf0' : '#8892a4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.name}</div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#3a4560', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{channel.category}</div>
      </div>
      {isActive && <Signal size={12} color={ACCENT} style={{ flexShrink: 0 }} />}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function LiveTV() {
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  // Indian channels state
  const [showIndian, setShowIndian] = useState(false);
  const [indianSearch, setIndianSearch] = useState('');
  const [indianCategory, setIndianCategory] = useState('All');
  const [selectedIndian, setSelectedIndian] = useState(null);
  const [indianSearchFocused, setIndianSearchFocused] = useState(false);

  const indianCategories = ['All', ...new Set(INDIAN_CHANNELS.map(c => c.category))];
  
  const filteredIndian = INDIAN_CHANNELS
    .filter(c => indianCategory === 'All' || c.category === indianCategory)
    .filter(c => !indianSearch || c.name.toLowerCase().includes(indianSearch.toLowerCase()));

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

  const filteredIPTV = channels
    .filter(c => activeCategory === 'All' || c.category === activeCategory)
    .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const activeChannel = showIndian ? selectedIndian : selectedChannel;
  const channelList = showIndian ? filteredIndian : filteredIPTV;

  if (loading) return (
    <div style={{ ...pageBase, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <style>{keyframes}</style>
      <div style={spinner} />
      <span style={{ fontFamily: "'DM Sans', sans-serif", color: '#4a5570', fontSize: 14 }}>Loading channels…</span>
    </div>
  );

  if (fetchError && !showIndian) return (
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

      {/* Header */}
      <div style={{ padding: isMobile ? '0 16px 20px' : '0 32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 28 : 36, fontWeight: 900, color: '#e8eaf0', margin: 0 }}>Live TV</h1>
          <LiveDot />
          {/* Toggle: IPTV / Indian */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button onClick={() => { setShowIndian(false); setSelectedIndian(null); }}
              style={{ ...toggleBtn, background: !showIndian ? ACCENT_DIM : 'transparent', borderColor: !showIndian ? `${ACCENT}55` : 'rgba(255,255,255,0.08)', color: !showIndian ? ACCENT : '#4a5570' }}>
              <Globe size={14} /> IPTV
            </button>
            <button onClick={() => { setShowIndian(true); if (!selectedIndian) setSelectedIndian(INDIAN_CHANNELS[0]); }}
              style={{ ...toggleBtn, background: showIndian ? ACCENT_IN_DIM : 'transparent', borderColor: showIndian ? `${ACCENT_IN}55` : 'rgba(255,255,255,0.08)', color: showIndian ? ACCENT_IN : '#4a5570' }}>
              <Flag size={14} /> Indian
            </button>
          </div>
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#3a4560', fontSize: 13, margin: 0 }}>
          {showIndian ? `${INDIAN_CHANNELS.length}+ Indian channels` : `${channels.length}+ free channels — no sign-in required`}
        </p>
      </div>

      {/* Search + Categories */}
      <div style={{ padding: isMobile ? '0 16px 16px' : '0 32px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: showIndian ? (indianSearchFocused ? 'rgba(255,153,51,0.06)' : '#0d1420') : (searchFocused ? 'rgba(0,201,255,0.06)' : '#0d1420'), border: `1px solid ${showIndian ? (indianSearchFocused ? `${ACCENT_IN}44` : 'rgba(255,255,255,0.07)') : (searchFocused ? `${ACCENT}44` : 'rgba(255,255,255,0.07)')}`, borderRadius: 10, padding: '0 14px', transition: 'all 0.2s', maxWidth: 420, boxShadow: (showIndian && indianSearchFocused) ? `0 0 0 3px rgba(255,153,51,0.25)` : searchFocused ? `0 0 0 3px ${ACCENT_GLOW}` : 'none' }}>
          <Search size={15} color={showIndian ? (indianSearchFocused ? ACCENT_IN : '#3a4560') : (searchFocused ? ACCENT : '#3a4560')} style={{ flexShrink: 0 }} />
          <input type="text" placeholder="Search channels…" value={showIndian ? indianSearch : searchQuery}
            onChange={e => showIndian ? setIndianSearch(e.target.value) : setSearchQuery(e.target.value)}
            onFocus={() => showIndian ? setIndianSearchFocused(true) : setSearchFocused(true)}
            onBlur={() => showIndian ? setIndianSearchFocused(false) : setSearchFocused(false)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#c8d0e0', padding: '12px 0' }} />
          {(showIndian ? indianSearch : searchQuery) && (
            <button onClick={() => showIndian ? setIndianSearch('') : setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <X size={14} color="#4a5570" />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: 6, padding: isMobile ? '0 16px 20px' : '0 32px 24px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {(showIndian ? indianCategories : ['All', ...categories.slice(0, 20)]).map(cat => {
          const isActiveCat = showIndian ? indianCategory === cat : activeCategory === cat;
          return (
            <button key={cat} onClick={() => showIndian ? setIndianCategory(cat) : setActiveCategory(cat)} style={{
              padding: '7px 14px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: '0.02em',
              transition: 'all 0.18s', border: '1px solid',
              background: isActiveCat ? (showIndian ? ACCENT_IN_DIM : ACCENT_DIM) : 'transparent',
              borderColor: isActiveCat ? (showIndian ? `${ACCENT_IN}55` : `${ACCENT}55`) : 'rgba(255,255,255,0.08)',
              color: isActiveCat ? (showIndian ? ACCENT_IN : ACCENT) : '#4a5570',
              boxShadow: isActiveCat ? `0 0 12px ${showIndian ? 'rgba(255,153,51,0.25)' : ACCENT_GLOW}` : 'none',
            }}>{cat}</button>
          );
        })}
      </div>

      {/* Main Layout */}
      <div style={{ display: 'flex', gap: 20, flexDirection: isMobile ? 'column' : 'row', padding: isMobile ? '0 16px 32px' : '0 32px 40px', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 66%', minWidth: 0 }}>
          {activeChannel ? <HLSPlayer src={activeChannel.stream} channelName={activeChannel.name} /> : (
            <div style={{ aspectRatio: '16/9', borderRadius: 14, background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Tv size={48} color="#1a2235" strokeWidth={1.5} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", color: '#2a3550', fontSize: 14 }}>Select a channel</span>
            </div>
          )}
          {activeChannel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, background: '#0d1420', borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: 46, height: 46, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${showIndian ? ACCENT_IN : ACCENT}33` }}>
                <Tv size={20} color="#3a4560" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: '#e8eaf0' }}>{activeChannel.name}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#3a4560', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{activeChannel.category}</div>
              </div>
              <LiveDot />
            </div>
          )}
        </div>

        {/* Channel List */}
        <div style={{ flex: '0 0 300px', width: isMobile ? '100%' : 300, background: '#09101f', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', maxHeight: isMobile ? 400 : 'calc(100vh - 260px)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#5a6680', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Channels</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#2a3550' }}>{channelList.length}</span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '8px 8px', scrollbarWidth: 'thin', scrollbarColor: '#1a2235 transparent' }}>
            {channelList.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <Tv size={32} color="#1a2235" strokeWidth={1.5} style={{ marginBottom: 10 }} />
                <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#2a3550', fontSize: 13 }}>No channels found</div>
              </div>
            ) : (
              channelList.map(channel => (
                <ChannelCard key={channel.id || channel.tvgId || channel.name} channel={channel}
                  isActive={showIndian ? selectedIndian?.id === channel.id : selectedChannel?.tvgId === channel.tvgId}
                  onClick={() => showIndian ? setSelectedIndian(channel) : setSelectedChannel(channel)} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const pageBase = { background: '#080c14', minHeight: '100vh', paddingTop: 90, boxSizing: 'border-box' };
const overlay = { position: 'absolute', inset: 0, zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(0,0,0,0.85)' };
const overlayText = { fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#4a5570' };
const spinner = { width: 36, height: 36, borderRadius: '50%', border: `3px solid ${ACCENT_DIM}`, borderTop: `3px solid ${ACCENT}`, animation: 'spin 0.8s linear infinite' };
const retryBtn = { padding: '9px 20px', background: ACCENT_DIM, color: ACCENT, border: `1px solid ${ACCENT}44`, borderRadius: 8, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600 };
const toggleBtn = { padding: '7px 14px', borderRadius: 20, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, border: '1px solid', transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: 6 };
const keyframes = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes livePulse { 0%, 100% { opacity: 1; box-shadow: 0 0 6px #e50914; } 50% { opacity: 0.5; box-shadow: 0 0 2px #e50914; } }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #1a2235; border-radius: 4px; }
`;