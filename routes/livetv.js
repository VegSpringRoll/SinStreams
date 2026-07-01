import express from "express";
import axios from "axios";

const router = express.Router();

// Module-level cache (works on long-running servers, partial help on Vercel)
let cachedChannels = null;
let lastFetch = 0;
const CACHE_DURATION = 3600000; // 1 hour

const parseM3U = (m3uContent) => {
  const channels = [];
  const lines = m3uContent.split('\n');
  let current = {};

  for (const line of lines) {
    const l = line.trim();
    if (l.startsWith('#EXTINF:')) {
      current = {
        tvgId:    l.match(/tvg-id="([^"]*)"/)?.[1] || '',
        name:     l.split(',')[1]?.trim() || l.match(/tvg-name="([^"]*)"/)?.[1] || 'Unknown',
        category: l.match(/group-title="([^"]*)"/)?.[1] || 'Other',
        logo:     l.match(/tvg-logo="([^"]*)"/)?.[1] || '',
      };
    } else if (l.startsWith('http') && current.name) {
      channels.push({ ...current, stream: l });
      current = {};
    }
  }
  return channels;
};

const DESIRED_CATEGORIES = [
  'News', 'Sports', 'Entertainment', 'Movies', 'Music',
  'Kids', 'Documentary', 'Science', 'Animation', 'Anime',
  'India', 'Hindi', 'English', 'Business', 'Lifestyle',
  'Comedy', 'Travel', 'Cooking', 'Education',
];

const filterChannels = (channels) =>
  channels.filter(c =>
    DESIRED_CATEGORIES.some(dc =>
      (c.category || '').toLowerCase().includes(dc.toLowerCase())
    )
  );

// ── Shared fetch logic (fixes the missing fetchChannels bug) ──
const getChannels = async () => {
  if (cachedChannels && Date.now() - lastFetch < CACHE_DURATION) {
    return cachedChannels;
  }

  console.log("📡 Fetching IPTV-Org playlist...");
  const { data } = await axios.get('https://iptv-org.github.io/iptv/index.m3u', {
    timeout: 15000, // ⬇️ was 30s — Vercel kills at 10s on hobby, keep it tight
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });

  const all = parseM3U(data);
  const filtered = filterChannels(all);
  console.log(`✅ ${filtered.length} channels cached`);

  cachedChannels = filtered;
  lastFetch = Date.now();
  return filtered;
};

// GET /api/livetv/channels
router.get('/channels', async (req, res) => {
  try {
    const channels = await getChannels();
    const { category } = req.query;
    const result = category
      ? channels.filter(c => c.category.toLowerCase().includes(category.toLowerCase()))
      : channels;
    res.json(result);
  } catch (err) {
    console.error("❌ IPTV fetch error:", err.message);
    if (cachedChannels) return res.json(cachedChannels); // serve stale cache
    res.status(500).json({ error: "Failed to fetch channels" });
  }
});

// GET /api/livetv/categories
router.get('/categories', async (req, res) => {
  try {
    const channels = await getChannels(); // ✅ fixed — uses shared function
    const categories = [...new Set(channels.map(c => c.category))]
      .filter(Boolean).sort();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Failed to get categories" });
  }
});

// GET /api/livetv/search?q=cartoon
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const channels = await getChannels(); // ✅ fixed — no more self HTTP call
    const results = channels.filter(c =>
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.category.toLowerCase().includes(q.toLowerCase())
    );
    res.json(results.slice(0, 50));
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;