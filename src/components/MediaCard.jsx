import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Plus, Check, Star, Clock, ChevronDown, Volume2, VolumeX } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";

// Type config
const TYPE_CONFIG = {
  movie:  { label: "MOVIE",  accent: "#e8b84b", glow: "rgba(232,184,75,0.35)"  },
  series: { label: "SERIES", accent: "#5ba4d4", glow: "rgba(91,164,212,0.35)"  },
  anime:  { label: "ANIME",  accent: "#e05fa0", glow: "rgba(224,95,160,0.35)"  },
};

//  Quality badge 
const QUALITY_CONFIG = {
  "2160p": { label: "4K",  bg: "rgba(232,184,75,0.2)",  color: "#e8b84b" },
  "1080p": { label: "HD",  bg: "rgba(91,164,212,0.2)",  color: "#5ba4d4" },
  "720p":  { label: "720", bg: "rgba(255,255,255,0.1)", color: "#8892a4" },
};

export default function MediaCard({
  media = {},
  type = "movie",
  size = "md",
  onAddList,
  inList = false,
  index = 0,
  onPlay, // 🆕 NEW: Callback when play is clicked
}) {
  const navigate   = useNavigate();
  const [hovered,  setHovered]  = useState(false);
  const [imgError, setImgError] = useState(false);
  const [listed,   setListed]   = useState(inList);
  const [muted,    setMuted]    = useState(true);
  const cardRef    = useRef(null);

  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.movie;

  // Dimensions by size 
  const dims = {
    sm: { width: 130, posterH: 190 },
    md: { width: 160, posterH: 235 },
    lg: { width: 200, posterH: 290 },
  }[size] || { width: 160, posterH: 235 };

  // Destructure media fields
  const {
    title       = "Unknown Title",
    year        = "",
    rating      = {},
    images      = {},
    genres      = [],
    runtime     = "",
    synopsis    = "",
    torrents    = {},
    _id,
    slug,
  } = media;

  const poster    = imgError ? null : (images?.poster || images?.fanart || null);
  const imdbScore =
    rating && typeof rating === "object"
      ? rating.percentage / 10
      : typeof rating === "number"
      ? rating
      : null;
  const bestQuality =
    torrents["2160p"]
      ? "2160p"
      : torrents["1080p"]
      ? "1080p"
      : torrents["720p"]
      ? "720p"
      : null;
  const qualityCfg  = QUALITY_CONFIG[bestQuality] || null;
  const shortGenres = genres.slice(0, 2);
  const id          = _id || slug || String(index);

  // Handle Play Button Click
  const handlePlay = (e) => {
    e.stopPropagation();
    if (onPlay) {
      onPlay(media);
    } else {
      // Fallback: Navigate to watch page
      navigate(`/watch/${type}/${media._id || media.imdb_id}`, {
        state: { media }
      });
    }
  };

  // Handle Card Click
  const handleClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const finalId = media._id || media.imdb_id || "unknown";
    
    // If onPlay exists, use it; otherwise navigate
    if (onPlay) {
      onPlay(media);
    } else {
      navigate(`/watch/${type}/${finalId}`, {
        state: { media }
      });
    }
  };

  const { user } = useUser();

  // Handle Watchlist
const handleList = async (e) => {
  e.stopPropagation();
  
  if (!user) {
    alert("Please sign in to add to your list");
    return;
  }

  const mediaId = media._id || media.imdb_id || id;
  
  setListed(v => !v);

  try {
    if (!listed) {
      // ADD
      await axios.post("http://localhost:5000/api/user/watchlist", {
        media: {
          _id: mediaId,
          imdb_id: media.imdb_id,
          type: type,
          title: media.title,
          images: {
            poster: media.images?.poster || null
          }
        }
      });
    } else {
      // REMOVE
      await axios.delete(`http://localhost:5000/api/user/watchlist/${mediaId}`);
    }
    
    onAddList?.(id);
  } catch (err) {
    console.error("Watchlist error:", err.response?.data || err.message);
    setListed(v => !v);
  }
};

  // ── Poster placeholder gradient ──────────────────────────────────────────────
  const hue   = title.charCodeAt(0) % 360;
  const hue2  = (hue + 40) % 360;
  const placeholderBg = `linear-gradient(135deg, hsl(${hue},30%,14%) 0%, hsl(${hue2},25%,20%) 100%)`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        .mc-root * { box-sizing: border-box; }
        .mc-btn {
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.18s ease;
          font-family: 'DM Sans', sans-serif;
        }
        .mc-btn:hover { opacity: 0.88; transform: scale(1.06); }
        .mc-btn:active { transform: scale(0.97); }
      `}</style>

      <motion.div
        ref={cardRef}
        className="mc-root"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: dims.width, flexShrink: 0, position: "relative", userSelect: "none" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/*  POSTER  */}
        <motion.div
          onClick={handleClick}
          animate={{
            scale: hovered ? 1.04 : 1,
            zIndex: hovered ? 10 : 1,
          }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: "100%",
            height: dims.posterH,
            borderRadius: 10,
            overflow: "hidden",
            cursor: "pointer",
            position: "relative",
            background: placeholderBg,
            boxShadow: hovered
              ? `0 20px 50px rgba(0,0,0,0.65), 0 0 24px ${cfg.glow}`
              : "0 6px 24px rgba(0,0,0,0.45)",
            border: hovered
              ? `1px solid ${cfg.accent}55`
              : "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Poster image */}
          {poster && !imgError ? (
            <img
              src={poster}
              alt={title}
              onError={() => setImgError(true)}
              style={{
                width: "100%", height: "100%",
                objectFit: "cover", display: "block",
                transition: "transform 0.4s ease",
                transform: hovered ? "scale(1.08)" : "scale(1)",
              }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <div style={{ fontSize: size === "sm" ? 32 : 42, opacity: 0.35 }}>
                {type === "anime" ? "⚔️" : type === "series" ? "📺" : "🎬"}
              </div>
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10, color: "rgba(255,255,255,0.2)",
                letterSpacing: "0.08em", textTransform: "uppercase",
                padding: "0 12px", textAlign: "center", lineHeight: 1.4,
              }}>{title}</span>
            </div>
          )}

          {/* Top badges row */}
          <div style={{
            position: "absolute", top: 8, left: 8, right: 8,
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          }}>
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 9, fontWeight: 600, letterSpacing: "0.1em",
              padding: "3px 7px", borderRadius: 4,
              background: `${cfg.accent}22`,
              border: `1px solid ${cfg.accent}44`,
              color: cfg.accent,
            }}>{cfg.label}</span>

            {qualityCfg && (
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                padding: "3px 7px", borderRadius: 4,
                background: qualityCfg.bg,
                color: qualityCfg.color,
                border: "1px solid rgba(255,255,255,0.08)",
              }}>{qualityCfg.label}</span>
            )}
          </div>

          {/* Rating badge */}
          <AnimatePresence>
            {hovered && imdbScore && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.18 }}
                style={{
                  position: "absolute", bottom: 8, left: 8,
                  display: "flex", alignItems: "center", gap: 4,
                  background: "rgba(0,0,0,0.7)",
                  borderRadius: 6, padding: "4px 8px",
                  backdropFilter: "blur(6px)",
                }}
              >
                <Star size={10} fill="#e8b84b" color="#e8b84b" />
                <span style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11, fontWeight: 600, color: "#e8b84b",
                }}>{Number(imdbScore).toFixed(1)}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hover overlay */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",
                }}
              />
            )}
          </AnimatePresence>

          {/* Play button - NOW OPENS VIDEO PLAYER */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "absolute",
                  top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  onClick={handlePlay}  // 🆕 Use handlePlay instead
                  style={{
                    width: 46, height: 46, borderRadius: "50%",
                    background: "rgba(255,255,255,0.18)",
                    border: "2px solid rgba(255,255,255,0.55)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    backdropFilter: "blur(2px)",
                    cursor: "pointer",
                    transition: "all 0.18s",
                  }}
                  onMouseEnter={e => { 
                    e.currentTarget.style.background = "rgba(255,255,255,0.28)"; 
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.9)"; 
                  }}
                  onMouseLeave={e => { 
                    e.currentTarget.style.background = "rgba(255,255,255,0.18)"; 
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.55)"; 
                  }}
                >
                  <Play size={18} fill="white" color="white" style={{ marginLeft: 3 }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add to list button */}
          {/* Add to list button */}
<AnimatePresence>
  {hovered && (
    <motion.button
      className="mc-btn"
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ duration: 0.18, delay: 0.05 }}
      onClick={handleList}  // ✅ Must be handleList, not something else
      style={{
        position: "absolute", bottom: 8, right: 8,
        width: 28, height: 28, borderRadius: "50%",
        background: listed ? `${cfg.accent}33` : "rgba(0,0,0,0.65)",
        border: listed ? `1.5px solid ${cfg.accent}` : "1.5px solid rgba(255,255,255,0.3)",
        backdropFilter: "blur(2px)",
        color: listed ? cfg.accent : "white",
      }}
    >
      {listed
        ? <Check size={13} strokeWidth={2.5} />
        : <Plus  size={13} strokeWidth={2.5} />
      }
    </motion.button>
  )}
</AnimatePresence>
        </motion.div>

        {/* ── INFO BELOW POSTER ── */}
        <div style={{ padding: "10px 2px 4px" }}>
          <div
            onClick={handleClick}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: size === "lg" ? 14 : 13,
              fontWeight: 500,
              color: hovered ? "#e8eaf0" : "#b0b8cc",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              cursor: "pointer",
              transition: "color 0.2s",
              marginBottom: 5,
            }}
          >{title}</div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {year && (
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11, color: "#3a4560", fontWeight: 400,
              }}>{year}</span>
            )}

            {year && shortGenres.length > 0 && (
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#2a3550", flexShrink: 0 }} />
            )}

            {shortGenres.map((g, i) => (
              <span key={i} style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10, color: "#3a4560",
                textTransform: "capitalize",
              }}>{g}{i < shortGenres.length - 1 ? " ·" : ""}</span>
            ))}

            {runtime && size === "lg" && (
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10, color: "#3a4560",
                display: "flex", alignItems: "center", gap: 3, marginLeft: "auto",
              }}>
                <Clock size={9} /> {runtime}m
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}