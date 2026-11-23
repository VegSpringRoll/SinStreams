import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { Play, Plus, Check, Star, Clock, Loader2 } from "lucide-react";
import { useUser } from "@clerk/clerk-react";

const BACKEND_URL = import.meta.env.PROD ? "/api" : "http://localhost:5000/api";

// Pure monochrome type configuration
const TYPE_CONFIG = {
  movie:  { label: "FILM",   bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.22)", color: "#ffffff" },
  series: { label: "SERIES", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.16)", color: "#e4e4e7" },
  anime:  { label: "ANIME",  bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.16)", color: "#e4e4e7" },
};

const QUALITY_CONFIG = {
  "2160p": { label: "4K",  bg: "rgba(255,255,255,0.14)", color: "#ffffff" },
  "1080p": { label: "HD",  bg: "rgba(255,255,255,0.08)", color: "#e4e4e7" },
  "720p":  { label: "720", bg: "rgba(255,255,255,0.05)", color: "#a1a1aa" },
};

const EASE = [0.16, 1, 0.3, 1];

export default function MediaCard({
  media = {},
  type = "movie",
  size = "md",
  inList = false,
  index = 0,
}) {
  const navigate = useNavigate();
  const { user } = useUser();

  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(inList);
  const [watchlistBusy, setWatchlistBusy] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  const cardRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => setInWatchlist(inList), [inList]);

  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.movie;

  const dims = {
    sm: { width: 130, posterH: 190 },
    md: { width: 160, posterH: 235 },
    lg: { width: 200, posterH: 290 },
  }[size] || { width: 160, posterH: 235 };

  const {
    title = "Unknown Title",
    year = "",
    rating = {},
    images = {},
    genres = [],
    runtime = "",
    torrents = {},
    _id,
    imdb_id,
  } = media;

  const poster = imgError ? null : (
    images?.poster ||
    images?.fanart ||
    images?.backdrop ||
    media.coverImage?.extraLarge ||
    media.coverImage?.large ||
    media.coverImage?.medium ||
    media.bannerImage ||
    media.poster ||
    null
  );
  const imdbScore = rating && typeof rating === "object"
    ? rating.percentage / 10
    : typeof rating === "number"
    ? rating
    : null;
  const bestQuality = torrents["2160p"] ? "2160p" : torrents["1080p"] ? "1080p" : torrents["720p"] ? "720p" : null;
  const qualityCfg = QUALITY_CONFIG[bestQuality] || null;
  const shortGenres = genres.slice(0, 2);
  const id = _id || String(index);
  const showActionsOverlay = hovered || isMobile;

  const getMediaType = () => {
    if (type === "series" || type === "tv") return "tv";
    if (type === "anime") return "anime";
    return "movie";
  };

  const getMediaId = () => media._id || media.imdb_id || media.id || id;

  // Navigate to details page
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/details/${getMediaType()}/${getMediaId()}`);
  };

  // Navigate to details page with autoPlay
  const handlePlay = (e) => {
    e.stopPropagation();
    navigate(`/details/${getMediaType()}/${getMediaId()}`, { state: { autoPlay: true } });
  };

  // Watchlist toggle
  const handleWatchlist = async (e) => {
    e.stopPropagation();
    if (!user) { alert("Please sign in to use your watchlist"); return; }
    if (watchlistBusy) return;

    const mediaId = getMediaId();

    try {
      setWatchlistBusy(true);
      if (inWatchlist) {
        await axios.delete(`${BACKEND_URL}/user/watchlist/${user.id}/${mediaId}`);
      } else {
        await axios.post(`${BACKEND_URL}/user/watchlist`, {
          clerkId: user.id,
          media: {
            _id: mediaId,
            imdb_id,
            type,
            title,
            images: { poster: images?.poster || null },
          },
        });
      }
      setInWatchlist(v => !v);
    } catch (err) {
      console.error("Watchlist error:", err.response?.data || err.message);
    } finally {
      setWatchlistBusy(false);
    }
  };

  return (
    <>
      <style>{MC_CSS}</style>

      <motion.div
        ref={cardRef}
        className="mc-root"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.35), ease: EASE }}
        style={{ width: dims.width, flexShrink: 0, position: "relative", userSelect: "none" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <motion.div
          onClick={handleClick}
          animate={{ scale: hovered && !isMobile ? 1.045 : 1, y: hovered && !isMobile ? -3 : 0, zIndex: hovered ? 10 : 1 }}
          transition={{ duration: 0.28, ease: EASE }}
          style={{
            width: "100%", height: dims.posterH, borderRadius: 12, overflow: "hidden",
            cursor: "pointer", position: "relative",
            background: "linear-gradient(135deg, #09090d 0%, #16161d 100%)",
            border: hovered && !isMobile ? "1px solid rgba(255, 255, 255, 0.45)" : "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: hovered && !isMobile
              ? "0 22px 50px rgba(0,0,0,0.85), 0 0 28px rgba(255, 255, 255, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.35)"
              : "0 6px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
            transition: "box-shadow 0.28s ease, border-color 0.28s ease",
          }}
        >
          {poster && !imgError ? (
            <>
              {!imgLoaded && <div className="mc-skeleton" style={{ position: "absolute", inset: 0 }} />}
              <img
                src={poster}
                alt={title}
                loading="lazy"
                decoding="async"
                onError={() => setImgError(true)}
                onLoad={() => setImgLoaded(true)}
                style={{
                  width: "100%", height: "100%", objectFit: "cover", display: "block",
                  transition: "transform 0.5s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease",
                  transform: hovered && !isMobile ? "scale(1.08)" : "scale(1)",
                  opacity: imgLoaded ? 1 : 0,
                }}
              />
            </>
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{ fontSize: size === "sm" ? 30 : 40, opacity: 0.3 }}>
                {type === "anime" ? "⚔️" : type === "series" ? "📺" : "🎬"}
              </div>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.08em", textTransform: "uppercase", padding: "0 12px", textAlign: "center", lineHeight: 1.4 }}>
                {title}
              </span>
            </div>
          )}

          {/* Top badges */}
          <div style={{ position: "absolute", top: 8, left: 8, right: 8,
            display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 6 }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
              padding: "3px 7px", borderRadius: 5, background: cfg.bg,
              border: `1px solid ${cfg.border}`, color: cfg.color, backdropFilter: "blur(8px)" }}>
              {cfg.label}
            </span>
            {qualityCfg && (
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                padding: "3px 7px", borderRadius: 5, background: qualityCfg.bg, color: qualityCfg.color,
                border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                {qualityCfg.label}
              </span>
            )}
          </div>

          {/* Rating */}
          <AnimatePresence>
            {imdbScore != null && (isMobile || hovered) && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.18 }}
                style={{ position: "absolute", bottom: 8, left: 8, display: "flex", alignItems: "center", gap: 4,
                  background: "rgba(10, 10, 14, 0.85)", borderRadius: 6, padding: "4px 8px",
                  border: "1px solid rgba(255, 255, 255, 0.12)", backdropFilter: "blur(10px)", zIndex: 6 }}
              >
                <Star size={10} fill="#ffffff" color="#ffffff" />
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 600, color: "#ffffff" }}>
                  {Number(imdbScore).toFixed(1)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hover gradient overlay (desktop) */}
          {!isMobile && (
            <AnimatePresence>
              {hovered && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ position: "absolute", inset: 0,
                    background: "linear-gradient(to top, rgba(3,3,4,0.92) 0%, rgba(3,3,4,0.3) 55%, transparent 100%)", zIndex: 4 }} />
              )}
            </AnimatePresence>
          )}

          {/* Play button */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 8 }}>
            <AnimatePresence>
              {showActionsOverlay && (
                <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.2, ease: EASE }}>
                  <div className="mc-play-btn" onClick={handlePlay}
                    style={{ width: 46, height: 46, borderRadius: "50%",
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      border: "1.5px solid rgba(255, 255, 255, 0.6)", display: "flex", alignItems: "center",
                      justifyContent: "center", cursor: "pointer",
                      boxShadow: "0 0 20px rgba(255, 255, 255, 0.25)" }}>
                    <Play size={18} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Watchlist button */}
          <AnimatePresence>
            {showActionsOverlay && (
              <motion.button
                className="mc-btn"
                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.18, delay: 0.05 }}
                onClick={handleWatchlist}
                disabled={watchlistBusy}
                aria-label={inWatchlist ? "Remove from My List" : "Add to My List"}
                style={{
                  position: "absolute", bottom: 8, right: 8, width: 28, height: 28, borderRadius: "50%",
                  zIndex: 10, border: "none", cursor: watchlistBusy ? "default" : "pointer",
                  background: inWatchlist ? "#ffffff" : "rgba(10, 10, 14, 0.8)",
                  boxShadow: inWatchlist ? "0 0 12px rgba(255, 255, 255, 0.5)" : "0 0 0 1px rgba(255, 255, 255, 0.2)",
                  color: inWatchlist ? "#030304" : "#ffffff",
                  opacity: watchlistBusy ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  backdropFilter: "blur(8px)",
                }}
              >
                {watchlistBusy
                  ? <Loader2 size={13} strokeWidth={2.5} className="mc-spin" />
                  : inWatchlist ? <Check size={13} strokeWidth={2.5} /> : <Plus size={13} strokeWidth={2.5} />}
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Info below poster */}
        <div style={{ padding: "10px 2px 4px" }}>
          <div onClick={handleClick}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: size === "lg" ? 14 : 13.5, fontWeight: 600,
              color: hovered ? "#ffffff" : "#e4e4e7", whiteSpace: "nowrap", overflow: "hidden",
              textOverflow: "ellipsis", cursor: "pointer", transition: "color 0.2s", marginBottom: 5 }}>
            {title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            {year && <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: "#71717a", fontWeight: 500 }}>{year}</span>}
            {year && shortGenres.length > 0 && <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />}
            {shortGenres.map((g, i) => (
              <span key={i} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10.5, color: "#a1a1aa", textTransform: "capitalize" }}>
                {g}{i < shortGenres.length - 1 ? " ·" : ""}
              </span>
            ))}
            {runtime && size === "lg" && (
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, color: "#71717a",
                display: "flex", alignItems: "center", gap: 3, marginLeft: "auto" }}>
                <Clock size={9} /> {runtime}m
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

const MC_CSS = `
  @keyframes mc-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes mc-spin { to { transform: rotate(360deg); } }

  .mc-root * { box-sizing: border-box; }

  .mc-skeleton {
    background: linear-gradient(90deg, #09090d 25%, #181822 50%, #09090d 75%);
    background-size: 200% 100%;
    animation: mc-shimmer 1.4s ease infinite;
  }

  .mc-spin { animation: mc-spin 0.7s linear infinite; }

  .mc-btn { border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.18s ease; font-family: 'Plus Jakarta Sans', sans-serif; }
  @media (hover: hover) and (pointer: fine) {
    .mc-btn:hover { transform: scale(1.1); }
    .mc-play-btn:hover { background: rgba(255,255,255,0.3) !important; border-color: #ffffff !important; transform: scale(1.08); box-shadow: 0 0 28px rgba(255,255,255,0.4) !important; }
  }
  .mc-btn:active { transform: scale(0.95); }
  .mc-play-btn { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
`;
