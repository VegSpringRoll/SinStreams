import mongoose from "mongoose";

const watchlistSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    required: true,
  },
  mediaId: {
    type: String,
    required: true,
  },
  mediaType: {
    type: String,
    default: 'movie',
  },
  title: {
    type: String,
    required: true,
  },
  poster: {
    type: String,
    default: null,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  }
});

watchlistSchema.index({ clerkId: 1, mediaId: 1 }, { unique: true });

const Watchlist = mongoose.model("Watchlist", watchlistSchema);
export default Watchlist;