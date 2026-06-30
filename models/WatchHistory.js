import mongoose from "mongoose"

const watchHistorySchema = new mongoose.Schema({
  clerkId:   { type: String, required: true },
  mediaId:   { type: String, required: true },
  mediaType: { type: String, enum: ["movie", "series", "anime"] },
  title:     { type: String },
  poster:    { type: String },

  progress:  { type: Number, default: 0 },   // seconds watched
  duration:  { type: Number, default: 0 },   // total duration

  episode:   { type: String, default: null }, // "S01E03"
  watchedAt: { type: Date, default: Date.now },
})

// prevent duplicate entries per user + media
watchHistorySchema.index({ clerkId: 1, mediaId: 1 })

export default mongoose.model("WatchHistory", watchHistorySchema)