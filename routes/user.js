import express from "express"
import requireAuth from "../middleware/requireAuth.js"
import Watchlist from "../models/Watchlist.js"
import WatchHistory from "../models/WatchHistory.js"

const router = express.Router()

// ── WATCHLIST ────────────────────────────────────────────────

// GET /api/user/watchlist
router.get("/watchlist", requireAuth, async (req, res) => {
  try {
    const items = await Watchlist.find({ clerkId: req.auth.userId }).sort({ addedAt: -1 }).lean()
    
    // Format for frontend MediaCard
    const formatted = items.map(item => ({
      _id: item.mediaId,
      title: item.title,
      type: item.mediaType || 'movie',
      images: { poster: item.poster }
    }))
    
    res.json(formatted)
  } catch (err) {
    console.error("Watchlist GET error:", err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/user/watchlist
router.post("/watchlist", requireAuth, async (req, res) => {
  try {
    const { media } = req.body
    const mediaId = media?._id || media?.imdb_id

    if (!mediaId || !media?.title) {
      return res.status(400).json({ error: "Missing media data" })
    }

    console.log("📝 Saving to watchlist:", {
      clerkId: req.auth.userId,
      mediaId,
      title: media.title
    })

    const item = await Watchlist.findOneAndUpdate(
      { clerkId: req.auth.userId, mediaId: String(mediaId) },
      { 
        clerkId: req.auth.userId, 
        mediaId: String(mediaId), 
        mediaType: media.type || 'movie', 
        title: media.title, 
        poster: media.images?.poster || null 
      },
      { upsert: true, new: true }
    )

    console.log("✅ Saved:", item.title)
    res.json({ message: "Added to list", item })
  } catch (err) {
    console.error("Watchlist POST error:", err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/user/watchlist/:mediaId
router.delete("/watchlist/:mediaId", requireAuth, async (req, res) => {
  try {
    await Watchlist.findOneAndDelete({
      clerkId: req.auth.userId,
      mediaId: req.params.mediaId
    })

    console.log("✅ Removed from watchlist:", req.params.mediaId)
    res.json({ success: true, message: "Removed from watchlist" })
  } catch (err) {
    console.error("Watchlist DELETE error:", err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// ── WATCH HISTORY ────────────────────────────────────────────

// GET /api/user/history
router.get("/history", requireAuth, async (req, res) => {
  try {
    const history = await WatchHistory.find({ clerkId: req.auth.userId })
      .sort({ watchedAt: -1 })
      .limit(20)
      .lean()

    res.json({ success: true, results: history })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/user/history
router.post("/history", requireAuth, async (req, res) => {
  try {
    const { mediaId, mediaType, title, poster, progress, duration, episode } = req.body

    const entry = await WatchHistory.findOneAndUpdate(
      { clerkId: req.auth.userId, mediaId },
      {
        clerkId: req.auth.userId,
        mediaId,
        mediaType,
        title,
        poster,
        progress,
        duration,
        episode,
        watchedAt: Date.now()
      },
      { upsert: true, new: true }
    )

    res.json({ success: true, result: entry })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

export default router