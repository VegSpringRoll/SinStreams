import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { Play, Plus, Check, Star, Clock, Loader2 } from "lucide-react";
import { useUser } from "@clerk/clerk-react";

const BACKEND_URL = import.meta.env.PROD ? "/api" : "http://localhost:5000/api";

// Type config — same accent language used across Details / Watch / genre rows,
// so cards feel like part of one system instead of a generic template.
const TYPE_CONFIG = {
  movie:  { label: "MOVIE",  accent: "#e8b84b", glow: "rgba(232,184,75,0.35)" },
  series: { label: "SERIES", accent: "#5ba4d4", glow: "rgba(91,164,212,0.35)" },
  anime:  { label: "ANIME",  accent: "#e05fa0", glow: "rgba(224,95,160,0.35)" },
};

const QUALITY_CONFIG = {
  "2160p": { label: "4K",  bg: "rgba(232,184,75,0.2)",  color: "#e8b84b" },
  "1080p": { label: "HD",  bg: "rgba(91,164,212,0.2)",  color: "#5ba4d4" },
  "720p":  { label: "720", bg: "rgba(255,255,255,0.1)", color: "#8892a4" },
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

  const poster = imgError ? null : (images?.poster || images?.fanart || null);
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

  // Navigate to details page (card click)
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/details/${getMediaType()}/${getMediaId()}`);
  };

  // Navigate to details page with autoPlay (play button click)
  const handlePlay = (e) => {
    e.stopPropagation();
    navigate(`/details/${getMediaType()}/${getMediaId()}`, { state: { autoPlay: true } });
  };

  // Watchlist toggle — mirrors the working implementation in Details.jsx
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

  const hue = title.charCodeAt(0) % 360;
  const hue2 = (hue + 40) % 360;
  const placeholderBg = `linear-gradient(135deg, hsl(${hue},30%,14%) 0%, hsl(${hue2},25%,20%) 100%)`;

  return (
    <>
      <style>{MC_CSS}</style>

      <motion.div
        ref={cardRef}
        className="mc-root"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4), ease: EASE }}
        style={{ width: dims.width, flexShrink: 0, position: "relative", userSelect: "none" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <motion.div
          onClick={handleClick}
          animate={{ scale: hovered && !isMobile ? 1.045 : 1, y: hovered && !isMobile ? -3 : 0, zIndex: hovered ? 10 : 1 }}
          transition={{ duration: 0.3, ease: EASE }}
          style={{
            width: "100%", height: dims.posterH, borderRadius: 12, overflow: "hidden",
            cursor: "pointer", position: "relative", background: placeholderBg,
            boxShadow: hovered && !isMobile
              ? `0 22px 48px rgba(0,0,0,0.6), 0 0 0 1px ${cfg.accent}55, 0 0 28px ${cfg.glow}`
              : "0 6px 20px rgba(0,0,0,0.4)",
            transition: "box-shadow 0.3s ease",
          }}
        >
          {poster && !imgError ? (
            <>
              {!imgLoaded && <div className="mc-skeleton" style={{ position: "absolute", inset: 0 }} />}
              <img
                src={poster}
                alt={title}
                onError={() => setImgError(true)}
                onLoad={() => setImgLoaded(true)}
                style={{
                  width: "100%", height: "100%", objectFit: "cover", display: "block",
                  transition: "transform 0.5s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease",
                  transform: hovered && !isMobile ? "scale(1.09)" : "scale(1)",
                  opacity: imgLoaded ? 1 : 0,
                }}
              />
            </>
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{ fontSize: size === "sm" ? 32 : 42, opacity: 0.35 }}>
                {type === "anime" ? "⚔️" : type === "series" ? "📺" : "🎬"}
              </div>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.2)",
                letterSpacing: "0.08em", textTransform: "uppercase", padding: "0 12px", textAlign: "center", lineHeight: 1.4 }}>
                {title}
              </span>
            </div>
          )}

          {/* Top badges */}
          <div style={{ position: "absolute", top: 8, left: 8, right: 8,
            display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.09em",
              padding: "3px 7px", borderRadius: 5, background: `${cfg.accent}22`,
              border: `1px solid ${cfg.accent}44`, color: cfg.accent }}>
              {cfg.label}
            </span>
            {qualityCfg && (
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                padding: "3px 7px", borderRadius: 5, background: qualityCfg.bg, color: qualityCfg.color,
                border: "1px solid rgba(255,255,255,0.08)" }}>
                {qualityCfg.label}
              </span>
            )}
          </div>

          {/* Rating — always visible on mobile (no hover there), hover-reveal on desktop */}
          <AnimatePresence>
            {imdbScore != null && (isMobile || hovered) && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.18 }}
                style={{ position: "absolute", bottom: 8, left: 8, display: "flex", alignItems: "center", gap: 4,
                  background: "rgba(0,0,0,0.7)", borderRadius: 6, padding: "4px 8px", backdropFilter: "blur(6px)" }}
              >
                <Star size={10} fill="#e8b84b" color="#e8b84b" />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: "#e8b84b" }}>
                  {Number(imdbScore).toFixed(1)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hover gradient (desktop) */}
          {!isMobile && (
            <AnimatePresence>
              {hovered && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ position: "absolute", inset: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)" }} />
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
                    style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,0.2)",
                      border: "2px solid rgba(255,255,255,0.55)", display: "flex", alignItems: "center",
                      justifyContent: "center", cursor: "pointer" }}>
                    <Play size={18} fill="white" color="white" style={{ marginLeft: 2 }} />
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
                  background: inWatchlist ? `${cfg.accent}33` : "rgba(0,0,0,0.65)",
                  boxShadow: inWatchlist ? `0 0 0 1.5px ${cfg.accent}` : "0 0 0 1.5px rgba(255,255,255,0.3)",
                  color: inWatchlist ? cfg.accent : "white",
                  opacity: watchlistBusy ? 0.7 : 1,
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
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: size === "lg" ? 14 : 13, fontWeight: 500,
              color: hovered ? "#e8eaf0" : "#b0b8cc", whiteSpace: "nowrap", overflow: "hidden",
              textOverflow: "ellipsis", cursor: "pointer", transition: "color 0.2s", marginBottom: 5 }}>
            {title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {year && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#3a4560", fontWeight: 400 }}>{year}</span>}
            {year && shortGenres.length > 0 && <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#2a3550", flexShrink: 0 }} />}
            {shortGenres.map((g, i) => (
              <span key={i} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#3a4560", textTransform: "capitalize" }}>
                {g}{i < shortGenres.length - 1 ? " ·" : ""}
              </span>
            ))}
            {runtime && size === "lg" && (
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#3a4560",
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
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
  @keyframes mc-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes mc-spin { to { transform: rotate(360deg); } }

  .mc-root * { box-sizing: border-box; }

  .mc-skeleton {
    background: linear-gradient(90deg, #0d1420 25%, #1a2235 50%, #0d1420 75%);
    background-size: 200% 100%;
    animation: mc-shimmer 1.3s ease infinite;
  }

  .mc-spin { animation: mc-spin 0.7s linear infinite; }

  .mc-btn { border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.18s ease; font-family: 'DM Sans', sans-serif; }
  @media (hover: hover) and (pointer: fine) {
    .mc-btn:hover { transform: scale(1.1); }
    .mc-play-btn:hover { background: rgba(255,255,255,0.28) !important; border-color: rgba(255,255,255,0.9) !important; transform: scale(1.06); }
  }
  .mc-btn:active { transform: scale(0.95); }
  .mc-play-btn { transition: all 0.18s ease; }
`;