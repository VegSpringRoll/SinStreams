import express from "express";
import axios from "axios";

const router = express.Router();

// Cache for parsed channels
let cachedChannels = null;
let lastFetch = 0;
const CACHE_DURATION = 3600000; // 1 hour

// Parse M3U file
const parseM3U = (m3uContent) => {
  const channels = [];
  const lines = m3uContent.split('\n');
  
  let currentChannel = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('#EXTINF:')) {
      // Parse channel info
      const tvgId = line.match(/tvg-id="([^"]*)"/)?.[1] || '';
      const tvgName = line.match(/tvg-name="([^"]*)"/)?.[1] || '';
      const tvgLogo = line.match(/tvg-logo="([^"]*)"/)?.[1] || '';
      const groupTitle = line.match(/group-title="([^"]*)"/)?.[1] || 'Other';
      const name = line.split(',')[1]?.trim() || tvgName || 'Unknown';
      
      currentChannel = {
        tvgId,
        name,
        category: groupTitle,
        logo: tvgLogo,
      };
    } else if (line.startsWith('http') && currentChannel.name) {
      currentChannel.stream = line;
      channels.push({ ...currentChannel });
      currentChannel = {};
    }
  }
  
  return channels;
};

// Filter channels by categories
const filterChannels = (channels) => {
  const desiredCategories = [
    'News', 'Sports', 'Entertainment', 'Movies', 'Music',
    'Kids', 'Documentary', 'Science', 'Animation', 'Anime',
    'India', 'Hindi', 'English', 'Business', 'Lifestyle',
    'Comedy', 'Travel', 'Cooking', 'Education',
  ];

  return channels.filter(c => {
    const category = c.category || '';
    return desiredCategories.some(dc => 
      category.toLowerCase().includes(dc.toLowerCase())
    );
  });
};

// GET /api/livetv/channels
router.get('/channels', async (req, res) => {
  try {
    // Return cached data if available
    if (cachedChannels && Date.now() - lastFetch < CACHE_DURATION) {
      console.log(`📺 Serving ${cachedChannels.length} cached channels`);
      return res.json(cachedChannels);
    }

    console.log("📡 Fetching IPTV-Org playlist...");
    
    const { data } = await axios.get('https://iptv-org.github.io/iptv/index.m3u', {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    // Parse M3U
    const allChannels = parseM3U(data);
    console.log(`📊 Parsed ${allChannels.length} total channels`);

    // Filter relevant channels
    const filtered = filterChannels(allChannels);
    console.log(`✅ Filtered to ${filtered.length} channels`);

    // Cache the results
    cachedChannels = filtered;
    lastFetch = Date.now();

    // Support category filter
    const { category } = req.query;
    if (category) {
      const byCategory = filtered.filter(c => 
        c.category.toLowerCase().includes(category.toLowerCase())
      );
      return res.json(byCategory);
    }

    res.json(filtered);
  } catch (error) {
    console.error("❌ IPTV fetch error:", error.message);
    
    // Return cached data if API fails
    if (cachedChannels) {
      console.log("📦 Serving stale cache");
      return res.json(cachedChannels);
    }
    
    res.status(500).json({ error: "Failed to fetch channels" });
  }
});

// GET /api/livetv/categories
router.get('/categories', async (req, res) => {
  try {
    if (!cachedChannels) {
      // Fetch channels first
      await fetchChannels();
    }
    
    const categories = [...new Set(cachedChannels.map(c => c.category))]
      .filter(Boolean)
      .sort();
    
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed to get categories" });
  }
});

// GET /api/livetv/search?q=cartoon
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    
    if (!cachedChannels) {
      const response = await axios.get(`http://localhost:${process.env.PORT || 5000}/api/livetv/channels`);
      cachedChannels = response.data;
    }
    
    const results = cachedChannels.filter(c => 
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.category.toLowerCase().includes(q.toLowerCase())
    );
    
    res.json(results.slice(0, 50));
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;