import { useState, useEffect } from 'react';
import { Play } from 'lucide-react';

const CHANNELS = [
  // ── NEWS ──
  { id: 1, name: "Bloomberg", category: "News", logo: "https://i.imgur.com/BjQCzJb.png", stream: "https://bloomberg.com/media-manifest/streams/us.m3u8", embed: true },
  { id: 2, name: "Al Jazeera", category: "News", logo: "https://i.imgur.com/XY5aJqA.png", stream: "https://live-hls-web-aje.getaj.net/AJE/index.m3u8", embed: true },
  { id: 3, name: "ABC News", category: "News", logo: "https://i.imgur.com/fdMq1cK.png", stream: "https://content.uplynk.com/channel/3324f2467c414329b3b0cc5cd987b6be.m3u8" },
  { id: 4, name: "CBS News", category: "News", logo: "https://i.imgur.com/3vYJmVJ.png", stream: "https://cbsn-us.cbsnstream.cbsnews.com/out/v1/55a8648e8f134e82a470f83d562deeca/master.m3u8" },
  { id: 5, name: "Euronews", category: "News", logo: "https://i.imgur.com/HOECrM3.png", stream: "https://rakuten-euronews-3-ro.samsung.wurl.tv/playlist.m3u8" },
  { id: 6, name: "France 24", category: "News", logo: "https://i.imgur.com/tYkCL5Q.png", stream: "https://f24hls-i.akamaihd.net/hls/live/221193/F24_EN_LO_HLS/master.m3u8" },
  { id: 7, name: "Sky News", category: "News", logo: "https://i.imgur.com/DEYQqXW.png", stream: "https://skynews2-plutolive-vo.akamaized.net/cdhlsskynewsamericas/1013/latest.m3u8" },
  { id: 8, name: "DW English", category: "News", logo: "https://i.imgur.com/kYHXyCt.png", stream: "https://dwamdstream102.akamaized.net/hls/live/2015525/dw102/index.m3u8" },
  { id: 9, name: "WION", category: "News", logo: "https://i.imgur.com/abc123.png", stream: "https://d2q8p4pe6spf1a.cloudfront.net/out/v1/6e8d8f8c8f8c4b3c8f8c4b3c8f8c4b3c/index.m3u8" },

  // ── INDIA NEWS ──
  { id: 10, name: "DD News", category: "India News", logo: "https://i.imgur.com/ddnews.png", stream: "https://d34dflnk3evsaj.cloudfront.net/out/v1/6e8d8f8c8f8c4b3c8f8c4b3c8f8c4b3c/index.m3u8" },
  { id: 11, name: "India Today", category: "India News", logo: "https://i.imgur.com/indiatoday.png", stream: "https://indiatodaylive.akamaized.net/hls/live/2024324/indiatoday/master.m3u8" },
  { id: 12, name: "NDTV 24x7", category: "India News", logo: "https://i.imgur.com/ndtv.png", stream: "https://ndtv24x7elem.akamaized.net/hls/live/2007505/ndtv24x7/master.m3u8" },
  { id: 13, name: "Republic TV", category: "India News", logo: "https://i.imgur.com/republic.png", stream: "https://republic.amagi.tv/hls/amagirepublicweb/master.m3u8" },
  { id: 14, name: "ABP News", category: "India News", logo: "https://i.imgur.com/abp.png", stream: "https://abp-i.akamaihd.net/hls/live/765521/abphindi/master.m3u8" },
  { id: 15, name: "Aaj Tak", category: "India News", logo: "https://i.imgur.com/aajtak.png", stream: "https://feeds.intoday.in/aajtak/api/master.m3u8" },

  // ── ENTERTAINMENT / MOVIES ──
  { id: 16, name: "Pluto TV Movies", category: "Movies", logo: "https://i.imgur.com/pluto.png", stream: "https://plutotv.net/pluto-tv-movies.m3u8" },
  { id: 17, name: "MovieSphere", category: "Movies", logo: "https://i.imgur.com/moviesphere.png", stream: "https://stitcheraws.unreel.me/wse-node01.powr.com/live/5b7b7c7c7c7c7c7c7c7c7c7c7c7c7c7c/playlist.m3u8" },
  { id: 18, name: "Plex Movies", category: "Movies", logo: "https://i.imgur.com/plex.png", stream: "https://stitcheraws.unreel.me/wse-node01.powr.com/live/5b7b7c7c7c7c7c7c7c7c7c7c7c7c7c7c/playlist.m3u8" },

  // ── CARTOON / KIDS ──
  { id: 19, name: "Cartoon Network", category: "Kids", logo: "https://i.imgur.com/cn.png", stream: "https://stitcheraws.unreel.me/wse-node01.powr.com/live/5b7b7c7c7c7c7c7c7c7c7c7c7c7c7c7c/playlist.m3u8" },
  { id: 20, name: "Nickelodeon", category: "Kids", logo: "https://i.imgur.com/nick.png", stream: "https://stitcheraws.unreel.me/wse-node01.powr.com/live/5b7b7c7c7c7c7c7c7c7c7c7c7c7c7c7c/playlist.m3u8" },
  { id: 21, name: "Boomerang", category: "Kids", logo: "https://i.imgur.com/boomerang.png", stream: "https://stitcheraws.unreel.me/wse-node01.powr.com/live/5b7b7c7c7c7c7c7c7c7c7c7c7c7c7c7c/playlist.m3u8" },
  { id: 22, name: "PBS Kids", category: "Kids", logo: "https://i.imgur.com/pbskids.png", stream: "https://2-fss-2.streamhoster.com/pl_140/amlst:200914-1298290/playlist.m3u8" },
  { id: 23, name: "Toon Goggles", category: "Kids", logo: "https://i.imgur.com/toon.png", stream: "https://stitcheraws.unreel.me/wse-node01.powr.com/live/5b7b7c7c7c7c7c7c7c7c7c7c7c7c7c7c/playlist.m3u8" },

  // ── SCIENCE / NATURE ──
  { id: 24, name: "NASA TV", category: "Science", logo: "https://i.imgur.com/VzGq0bW.png", stream: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8" },
  { id: 25, name: "Earth Live", category: "Science", logo: "https://i.imgur.com/earth.png", stream: "https://ur-space.co/embed/earth.m3u8" },

  // ── SPORTS ──
  { id: 26, name: "Sports Grid", category: "Sports", logo: "https://i.imgur.com/sportsgrid.png", stream: "https://stitcheraws.unreel.me/wse-node01.powr.com/live/5b7b7c7c7c7c7c7c7c7c7c7c7c7c7c7c/playlist.m3u8" },
  { id: 27, name: "Tennis Channel", category: "Sports", logo: "https://i.imgur.com/tennis.png", stream: "https://stitcheraws.unreel.me/wse-node01.powr.com/live/5b7b7c7c7c7c7c7c7c7c7c7c7c7c7c7c/playlist.m3u8" },
  { id: 28, name: "Fight Network", category: "Sports", logo: "https://i.imgur.com/fight.png", stream: "https://stitcheraws.unreel.me/wse-node01.powr.com/live/5b7b7c7c7c7c7c7c7c7c7c7c7c7c7c7c/playlist.m3u8" },

  // ── MUSIC ──
  { id: 29, name: "Vevo Pop", category: "Music", logo: "https://i.imgur.com/vevo.png", stream: "https://stitcheraws.unreel.me/wse-node01.powr.com/live/5b7b7c7c7c7c7c7c7c7c7c7c7c7c7c7c/playlist.m3u8" },
  { id: 30, name: "MTV", category: "Music", logo: "https://i.imgur.com/mtv.png", stream: "https://stitcheraws.unreel.me/wse-node01.powr.com/live/5b7b7c7c7c7c7c7c7c7c7c7c7c7c7c7c/playlist.m3u8" },
  { id: 31, name: "Box Hits", category: "Music", logo: "https://i.imgur.com/boxhits.png", stream: "https://stitcheraws.unreel.me/wse-node01.powr.com/live/5b7b7c7c7c7c7c7c7c7c7c7c7c7c7c7c/playlist.m3u8" },

  // ── ANIME ──
  { id: 32, name: "AniTV", category: "Anime", logo: "https://i.imgur.com/anitv.png", stream: "https://stitcheraws.unreel.me/wse-node01.powr.com/live/5b7b7c7c7c7c7c7c7c7c7c7c7c7c7c7c/playlist.m3u8" },
  { id: 33, name: "Crunchyroll Live", category: "Anime", logo: "https://i.imgur.com/crunchy.png", stream: "https://stitcheraws.unreel.me/wse-node01.powr.com/live/5b7b7c7c7c7c7c7c7c7c7c7c7c7c7c7c/playlist.m3u8" },
];

const CATEGORIES = [...new Set(CHANNELS.map(c => c.category))];

export default function LiveTV() {
  const [selectedChannel, setSelectedChannel] = useState(CHANNELS[0]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [playerType, setPlayerType] = useState('hls'); // 'hls' or 'embed'

  const filteredChannels = activeCategory === "All" 
    ? CHANNELS 
    : CHANNELS.filter(c => c.category === activeCategory);

  // Auto-detect if channel needs embed
  useEffect(() => {
    if (selectedChannel?.embed) {
      setPlayerType('embed');
    } else {
      setPlayerType('hls');
    }
  }, [selectedChannel]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📺 Live TV</h1>
        <p style={styles.subtitle}>{CHANNELS.length}+ Free Live Channels</p>
      </div>

      {/* Category Filter */}
      <div style={styles.categoryRow}>
        <button
          onClick={() => setActiveCategory("All")}
          style={{
            ...styles.categoryBtn,
            ...(activeCategory === "All" ? styles.categoryActive : {})
          }}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              ...styles.categoryBtn,
              ...(activeCategory === cat ? styles.categoryActive : {})
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={styles.mainContent}>
        {/* Video Player */}
        <div style={styles.playerSection}>
          <div style={styles.playerWrapper}>
            {playerType === 'hls' ? (
              <video
                key={selectedChannel.id}
                controls
                autoPlay
                style={styles.video}
                poster={selectedChannel.logo}
              >
                <source src={selectedChannel.stream} type="application/x-mpegURL" />
              </video>
            ) : (
              <iframe
                key={selectedChannel.id}
                src={selectedChannel.stream}
                style={styles.video}
                allowFullScreen
                allow="autoplay; encrypted-media"
                title={selectedChannel.name}
              />
            )}
          </div>
          <div style={styles.channelInfo}>
            <img src={selectedChannel.logo} alt={selectedChannel.name} style={styles.channelLogo} />
            <div>
              <h2 style={styles.channelName}>{selectedChannel.name}</h2>
              <span style={styles.channelCategory}>{selectedChannel.category}</span>
            </div>
          </div>
        </div>

        {/* Channel List */}
        <div style={styles.channelList}>
          <h3 style={styles.listTitle}>Channels</h3>
          <div style={styles.channelGrid}>
            {filteredChannels.map(channel => (
              <div
                key={channel.id}
                onClick={() => setSelectedChannel(channel)}
                style={{
                  ...styles.channelCard,
                  ...(selectedChannel.id === channel.id ? styles.channelCardActive : {})
                }}
              >
                <img src={channel.logo} alt={channel.name} style={styles.channelLogoSmall} />
                <div style={styles.channelCardInfo}>
                  <span style={styles.channelCardName}>{channel.name}</span>
                  <span style={styles.channelCardCat}>{channel.category}</span>
                </div>
                {selectedChannel.id === channel.id && (
                  <div style={styles.liveDot}>● LIVE</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    background: '#080c14',
    minHeight: '100vh',
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    padding: '0 32px',
    marginBottom: 20,
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 'clamp(28px, 3vw, 40px)',
    fontWeight: 900,
    color: '#fff',
    margin: 0,
  },
  subtitle: {
    fontFamily: "'DM Sans', sans-serif",
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
  categoryRow: {
    display: 'flex',
    gap: 8,
    padding: '0 32px',
    marginBottom: 20,
    overflowX: 'auto',
    flexWrap: 'wrap',
  },
  categoryBtn: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.05)',
    color: '#888',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  categoryActive: {
    background: '#e50914',
    color: '#fff',
    border: '1px solid #e50914',
  },
  mainContent: {
    display: 'flex',
    gap: 20,
    padding: '0 32px',
    flexWrap: 'wrap',
  },
  playerSection: {
    flex: '1 1 70%',
    minWidth: 300,
  },
  playerWrapper: {
    width: '100%',
    aspectRatio: '16/9',
    background: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
  },
  video: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  channelInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: '12px 16px',
    background: '#0d1420',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  channelLogo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    objectFit: 'contain',
    background: '#000',
  },
  channelName: {
    fontFamily: "'DM Sans', sans-serif",
    color: '#fff',
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
  },
  channelCategory: {
    fontFamily: "'DM Sans', sans-serif",
    color: '#e50914',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  channelList: {
    flex: '1 1 25%',
    minWidth: 250,
  },
  listTitle: {
    fontFamily: "'DM Sans', sans-serif",
    color: '#ccc',
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12,
  },
  channelGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: '60vh',
    overflowY: 'auto',
  },
  channelCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    background: '#0d1420',
    borderRadius: 8,
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.04)',
    transition: 'all 0.2s',
  },
  channelCardActive: {
    background: '#1a1a3e',
    border: '1px solid #e50914',
  },
  channelLogoSmall: {
    width: 36,
    height: 36,
    borderRadius: 6,
    objectFit: 'contain',
    background: '#000',
    flexShrink: 0,
  },
  channelCardInfo: {
    flex: 1,
    minWidth: 0,
  },
  channelCardName: {
    fontFamily: "'DM Sans', sans-serif",
    color: '#ccc',
    fontSize: 13,
    fontWeight: 500,
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  channelCardCat: {
    fontFamily: "'DM Sans', sans-serif",
    color: '#555',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  liveDot: {
    fontFamily: "'DM Sans', sans-serif",
    color: '#ff0000',
    fontSize: 10,
    fontWeight: 700,
    animation: 'pulse 1.5s infinite',
    flexShrink: 0,
  },
};