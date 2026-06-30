import express from "express";
import { getMovieStreamUrl, getTVStreamUrl, getAllStreamSources, getBestStreamSource } from "../services/streamService.js";

const router = express.Router();

// 🎬 GET MOVIE STREAM URL
router.get('/movie/:imdbId', async (req, res) => {
  try {
    const { imdbId } = req.params;
    const { source } = req.query;
    
    if (!imdbId) {
      return res.status(400).json({ error: "IMDB ID is required" });
    }
    
    const streamUrl = getMovieStreamUrl(imdbId, source);
    
    if (!streamUrl) {
      return res.status(404).json({ error: "Stream URL not found" });
    }
    
    res.json({ 
      url: streamUrl,
      imdbId,
      type: 'movie',
      source: source || 'vidsrc'
    });
  } catch (error) {
    console.error("❌ Movie Stream Error:", error.message);
    res.status(500).json({ error: "Failed to get stream URL" });
  }
});

// 📺 GET TV SHOW STREAM URL
router.get('/tv/:imdbId/:season/:episode', async (req, res) => {
  try {
    const { imdbId, season, episode } = req.params;
    const { source } = req.query;
    
    if (!imdbId) {
      return res.status(400).json({ error: "IMDB ID is required" });
    }
    
    const streamUrl = getTVStreamUrl(imdbId, season, episode, source);
    
    if (!streamUrl) {
      return res.status(404).json({ error: "Stream URL not found" });
    }
    
    res.json({ 
      url: streamUrl,
      imdbId,
      season: parseInt(season),
      episode: parseInt(episode),
      type: 'tv',
      source: source || 'vidsrc'
    });
  } catch (error) {
    console.error("❌ TV Stream Error:", error.message);
    res.status(500).json({ error: "Failed to get stream URL" });
  }
});

// 🎯 GET ALL STREAMING SOURCES
// 🎬 Get direct video URL from VidSrc (scrapes the real video)
router.get('/direct/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const season = req.query.s || 1;
    const episode = req.query.e || 1;
    
    // VidSrc provides direct .m3u8 links internally
    const embedUrl = type === 'tv' 
      ? `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`
      : `https://vidsrc.to/embed/movie/${id}`;
    
    // Fetch the embed page
    const response = await axios.get(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://vidsrc.to/'
      }
    });
    
    // Extract the actual video URL from the page
    const match = response.data.match(/file:\s*['"]([^'"]+)['"]/);
    if (match && match[1]) {
      const videoUrl = match[1];
      // Proxy the video to avoid CORS
      res.json({ url: `/api/video-stream?src=${encodeURIComponent(videoUrl)}` });
    } else {
      // Fallback to embed
      res.json({ url: embedUrl, embed: true });
    }
  } catch (error) {
    res.json({ error: "Failed" });
  }
});

// Proxy video stream
router.get('/video-stream', async (req, res) => {
  try {
    const { src } = req.query;
    if (!src) return res.status(400).send("Missing source");
    
    const response = await axios.get(src, {
      responseType: 'stream',
      headers: { 'Referer': 'https://vidsrc.to/' }
    });
    
    res.setHeader('Content-Type', 'video/mp4');
    response.data.pipe(res);
  } catch (error) {
    res.status(500).send("Failed");
  }
});

export default router;