import { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.PROD ? "/api" : "http://localhost:5000/api"

export default function LiveTV() {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [playerType, setPlayerType] = useState('m3u8');

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const [channelsRes, categoriesRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/livetv/channels`),
        axios.get(`${BACKEND_URL}/livetv/categories`),
      ]);
      
      const chData = channelsRes.data;
      setChannels(chData);
      setCategories(categoriesRes.data);
      
      if (chData.length > 0) {
        setSelectedChannel(chData[0]);
      }
    } catch (err) {
      console.error("Failed to fetch channels:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredChannels = activeCategory === "All" 
    ? channels 
    : channels.filter(c => c.category === activeCategory);

  const searchedChannels = searchQuery
    ? filteredChannels.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredChannels;

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={{ color: '#888', fontFamily: "'DM Sans', sans-serif" }}>Loading channels...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📺 Live TV</h1>
        <p style={styles.subtitle}>{channels.length}+ Channels from IPTV-Org</p>
      </div>

      {/* Search */}
      <div style={styles.searchRow}>
        <input
          type="text"
          placeholder="Search channels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Categories */}
      <div style={styles.categoryRow}>
        <button onClick={() => setActiveCategory("All")} style={{...styles.categoryBtn, ...(activeCategory === "All" ? styles.categoryActive : {})}}>All</button>
        {categories.slice(0, 15).map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{...styles.categoryBtn, ...(activeCategory === cat ? styles.categoryActive : {})}}>{cat}</button>
        ))}
      </div>

      <div style={styles.mainContent}>
        {/* Player */}
        <div style={styles.playerSection}>
          {selectedChannel && (
            <>
              <div style={styles.playerWrapper}>
                {selectedChannel.stream ? (
                  <video
                    key={selectedChannel.tvgId}
                    controls
                    autoPlay
                    style={styles.video}
                    poster={selectedChannel.logo}
                  >
                    <source src={selectedChannel.stream} type="application/x-mpegURL" />
                  </video>
                ) : (
                  <div style={styles.noStream}>
                    <p>No stream available for this channel</p>
                  </div>
                )}
              </div>
              <div style={styles.channelInfo}>
                {selectedChannel.logo && (
                  <img src={selectedChannel.logo} alt={selectedChannel.name} style={styles.channelLogo} />
                )}
                <div>
                  <h2 style={styles.channelName}>{selectedChannel.name}</h2>
                  <span style={styles.channelCategory}>{selectedChannel.category}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Channel List */}
        <div style={styles.channelList}>
          <h3 style={styles.listTitle}>
            Channels {activeCategory !== "All" && `- ${activeCategory}`}
          </h3>
          <div style={styles.channelGrid}>
            {searchedChannels.map(channel => (
              <div
                key={channel.tvgId || channel.name}
                onClick={() => setSelectedChannel(channel)}
                style={{
                  ...styles.channelCard,
                  ...(selectedChannel?.tvgId === channel.tvgId ? styles.channelCardActive : {})
                }}
              >
                {channel.logo && (
                  <img src={channel.logo} alt={channel.name} style={styles.channelLogoSmall} />
                )}
                <div style={styles.channelCardInfo}>
                  <span style={styles.channelCardName}>{channel.name}</span>
                  <span style={styles.channelCardCat}>{channel.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { background: '#080c14', minHeight: '100vh', paddingTop: 80, paddingBottom: 40 },
  header: { padding: '0 32px', marginBottom: 20 },
  title: { fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 900, color: '#fff', margin: 0 },
  subtitle: { fontFamily: "'DM Sans', sans-serif", color: '#666', fontSize: 14, marginTop: 4 },
  searchRow: { padding: '0 32px', marginBottom: 16 },
  searchInput: { width: '100%', maxWidth: 400, padding: '10px 16px', background: '#1a2235', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: 'none' },
  categoryRow: { display: 'flex', gap: 8, padding: '0 32px', marginBottom: 20, overflowX: 'auto', flexWrap: 'wrap' },
  categoryBtn: { padding: '8px 16px', background: 'rgba(255,255,255,0.05)', color: '#888', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' },
  categoryActive: { background: '#e50914', color: '#fff', border: '1px solid #e50914' },
  mainContent: { display: 'flex', gap: 20, padding: '0 32px', flexWrap: 'wrap' },
  playerSection: { flex: '1 1 70%', minWidth: 300 },
  playerWrapper: { width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 12, overflow: 'hidden' },
  video: { width: '100%', height: '100%', border: 'none' },
  noStream: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', fontFamily: "'DM Sans', sans-serif" },
  channelInfo: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, padding: '12px 16px', background: '#0d1420', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' },
  channelLogo: { width: 50, height: 50, borderRadius: 8, objectFit: 'contain', background: '#000' },
  channelName: { fontFamily: "'DM Sans', sans-serif", color: '#fff', fontSize: 18, fontWeight: 600, margin: 0 },
  channelCategory: { fontFamily: "'DM Sans', sans-serif", color: '#e50914', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' },
  channelList: { flex: '1 1 25%', minWidth: 250 },
  listTitle: { fontFamily: "'DM Sans', sans-serif", color: '#ccc', fontSize: 16, fontWeight: 600, marginBottom: 12 },
  channelGrid: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '60vh', overflowY: 'auto' },
  channelCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#0d1420', borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.04)' },
  channelCardActive: { background: '#1a1a3e', border: '1px solid #e50914' },
  channelLogoSmall: { width: 36, height: 36, borderRadius: 6, objectFit: 'contain', background: '#000', flexShrink: 0 },
  channelCardInfo: { flex: 1, minWidth: 0 },
  channelCardName: { fontFamily: "'DM Sans', sans-serif", color: '#ccc', fontSize: 13, fontWeight: 500, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  channelCardCat: { fontFamily: "'DM Sans', sans-serif", color: '#555', fontSize: 10, textTransform: 'uppercase' },
  loadingContainer: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: 16 },
  spinner: { width: 50, height: 50, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #e50914', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};