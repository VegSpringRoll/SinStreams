import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Plus, Check, Info, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  movie:  { label: "FILM",   accent: "#e8b84b", glow: "rgba(232,184,75,0.2)"  },
  series: { label: "SERIES", accent: "#5ba4d4", glow: "rgba(91,164,212,0.2)"  },
  anime:  { label: "ANIME",  accent: "#e05fa0", glow: "rgba(224,95,160,0.2)"  },
};

const DEFAULT_SLIDES = [
  {
    _id: "tt0816692",
    title: "Interstellar",
    type: "movie",
    year: 2014,
    rating: { percentage: 86 },
    runtime: 169,
    genres: ["Sci-Fi", "Drama", "Adventure"],
    synopsis: "When Earth's future is threatened by a catastrophic blight and famine, a team of explorers travel through a wormhole in space in search of a new home for humanity.",
    images: {
      fanart: "https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
      poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    },
    torrents: { "2160p": {} },
  },
  {
    _id: "tt9362722",
    title: "Spider-Man: Across the Spider-Verse",
    type: "movie",
    year: 2023,
    rating: { percentage: 95 },
    runtime: 140,
    genres: ["Animation", "Action", "Adventure"],
    synopsis: "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.",
    images: {
      fanart: "https://image.tmdb.org/t/p/original/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg",
      poster: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    },
    torrents: { "1080p": {} },
  },
];

const AUTOPLAY_INTERVAL = 7000;

export default function HeroSlider({
  slides     = DEFAULT_SLIDES,
  autoPlay   = true,
  onAddList,
  watchlist  = [],
  onPlay,  // 🆕 NEW PROP
}) {
  if (!slides || slides.length === 0) {
    return <div style={{ height: "100vh", background: "#080c14" }} />;
  }

  const [current,   setCurrent]   = useState(0);
  const [prev,      setPrev]      = useState(null);
  const [direction, setDirection] = useState(1);
  const [paused,    setPaused]    = useState(false);
  const [muted,     setMuted]     = useState(true);
  const [imgLoaded, setImgLoaded] = useState({});
  const [progress,  setProgress]  = useState(0);
  const intervalRef = useRef(null);
  const progressRef = useRef(null);
  const navigate = useNavigate();
// ── Responsive: detect mobile viewport ──────────────────────────────────────
const [isMobile, setIsMobile] = useState(
  typeof window !== "undefined" ? window.innerWidth <= 768 : false
);
useEffect(() => {
  const onResize = () => setIsMobile(window.innerWidth <= 768);
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}, []);

  const slide    = slides[current];
  const cfg      = TYPE_CONFIG[slide?.type] || TYPE_CONFIG.movie;
  const inList   = watchlist.includes(slide?._id);
  const quality = slide.torrents?.["2160p"] ? "2160p" : slide.torrents?.["1080p"] ? "1080p" : slide.torrents?.["720p"] ? "720p" : null;
  const score = slide?.rating?.percentage ? (slide.rating.percentage / 10).toFixed(1) : null;

  // ── Auto-advance ────────────────────────────────────────────────────────────
  const goTo = useCallback((idx, dir = 1) => {
    setPrev(current);
    setDirection(dir);
    setCurrent(idx);
    setProgress(0);
  }, [current]);

  const goNext = useCallback(() => {
    goTo((current + 1) % slides.length, 1);
  }, [current, slides.length, goTo]);

  const goPrev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length, -1);
  }, [current, slides.length, goTo]);

  useEffect(() => {
    if (!autoPlay || paused) return;
    intervalRef.current = setInterval(goNext, AUTOPLAY_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [autoPlay, paused, goNext]);

  useEffect(() => {
    if (!autoPlay || paused) return;
    setProgress(0);
    const step = 100 / (AUTOPLAY_INTERVAL / 100);
    progressRef.current = setInterval(() => {
      setProgress(p => Math.min(p + step, 100));
    }, 100);
    return () => clearInterval(progressRef.current);
  }, [current, autoPlay, paused]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft")  goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  // 🎬 Handle Watch - Navigate to Watch page
  const handleWatch = () => {
  const mediaId = slide._id || slide.imdb_id;
  let mediaType = slide.type;
  if (mediaType === 'series') mediaType = 'tv';
  
  // Navigate to Watch page
  window.location.href = `#/watch/${mediaType}/${mediaId}`;
  // Or if using navigate:
  // navigate(`/watch/${mediaType}/${mediaId}`, { state: { media: slide } });
};

  const handleMore  = () => {
    console.log("More info for:", slide.title);
  };

  const handleList = () => onAddList?.(slide._id);

  const variants = {
    enter:  (d) => ({ opacity: 0, x: d > 0 ? 60  : -60,  scale: 1.02 }),
    center: {      opacity: 1, x: 0,              scale: 1    },
    exit:   (d) => ({ opacity: 0, x: d > 0 ? -60 : 60,   scale: 0.98 }),
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');
        .hs-root * { box-sizing: border-box; }
        .hs-btn {
          border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s ease;
          font-weight: 500; letter-spacing: 0.03em;
        }
        .hs-btn:hover  { opacity: 0.88; transform: translateY(-2px); }
        .hs-btn:active { transform: translateY(0) scale(0.97); }
        .hs-dot { cursor: pointer; transition: all 0.25s; border: none; padding: 0; }
        .hs-arrow {
          cursor: pointer; border: none;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 50%;
        }
        .hs-arrow:hover {
          background: rgba(255,255,255,0.15);
          border-color: rgba(255,255,255,0.25);
          transform: scale(1.08);
        }
        .hs-tag {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 4px 10px; border-radius: 4px;
        }
      `}</style>

      <div
        className="hero-slider-container"
        style={{
          position: "relative",
          width: "100%",
          height: "100vh",
          minHeight: 560,
          overflow: "hidden",
          background: "#060a12",
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={slide._id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute", inset: 0,
              backgroundImage: imgLoaded[slide._id]
                ? `url(${slide.images?.fanart || slide.images?.poster})`
                : "none",
              backgroundSize: "cover",
              backgroundPosition: "center top",
              backgroundRepeat: "no-repeat",
            }}
          >
            <img
              src={slide.images?.fanart || slide.images?.poster}
              alt=""
              style={{ display: "none" }}
              onLoad={() => setImgLoaded(p => ({ ...p, [slide._id]: true }))}
            />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, rgba(6,10,18,0.97) 0%, rgba(6,10,18,0.7) 40%, rgba(6,10,18,0.15) 70%, rgba(6,10,18,0.4) 100%)",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(6,10,18,1) 0%, rgba(6,10,18,0.5) 30%, transparent 60%)",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: `radial-gradient(ellipse 60% 50% at 80% 50%, ${cfg.glow}, transparent)`,
            }} />
          </motion.div>
        </AnimatePresence>

        {/* CONTENT */}
        <div className="hs-content" style={{
  position: "absolute", inset: 0,
  display: "flex", alignItems: "center",
  padding: isMobile ? "0 20px" : "0 64px",
  paddingTop: 80,
}}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={slide._id + "_content"}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              style={{ maxWidth: isMobile ? "100%" : 580, zIndex: 2 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}
              >
                <span className="hs-tag" style={{
                  background: `${cfg.accent}22`,
                  border: `1px solid ${cfg.accent}44`,
                  color: cfg.accent,
                }}>{cfg.label}</span>
                {slide.year && (
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#5a6480", fontWeight: 400 }}>{slide.year}</span>
                )}
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#2a3550" }} />
                {score && (
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#e8b84b", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                    ★ {score}
                  </span>
                )}
                {quality && (
                  <>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#2a3550" }} />
                    <span className="hs-tag" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#6878a0", fontSize: 9 }}>
                      {quality === "2160p" ? "4K" : quality}
                    </span>
                  </>
                )}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(36px, 4.5vw, 66px)",
                  fontWeight: 900,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  marginBottom: 18,
                  color: "#eef0f8",
                  textShadow: "0 2px 40px rgba(0,0,0,0.5)",
                }}
              >{slide.title}</motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}
              >
                {(slide.genres || []).slice(0, 3).map((g, i) => (
                  <span key={i} style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11, color: "#4a5878",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 4, padding: "3px 10px",
                    fontWeight: 400, letterSpacing: "0.04em",
                  }}>{g}</span>
                ))}
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14, lineHeight: 1.75,
                  color: "#6878a0", fontWeight: 300,
                  marginBottom: 32,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  maxWidth: 500,
                }}
              >{slide.synopsis}</motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                style={{ display: "flex", gap: 12, alignItems: "center" }}
              >
                {/* Watch Now - Opens VideoPlayer */}
                <button
                  className="hs-buttons"
                  onClick={handleWatch}
                  style={{
                    padding: "13px 28px",
                    borderRadius: 9,
                    background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}cc)`,
                    color: "#0a0a0a",
                    fontSize: 14,
                    boxShadow: `0 8px 24px ${cfg.glow}`,
                  }}
                >
                  <Play size={16} fill="currentColor" />
                  Watch Now
                </button>

                <button
                  className="hs-btn"
                  onClick={handleList}
                  style={{
                    padding: "13px 22px",
                    borderRadius: 9,
                    background: inList ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.07)",
                    border: inList ? `1px solid ${cfg.accent}66` : "1px solid rgba(255,255,255,0.12)",
                    color: inList ? cfg.accent : "#8892a4",
                    fontSize: 14,
                  }}
                >
                  {inList ? <Check size={15} /> : <Plus size={15} />}
                  {inList ? "In List" : "My List"}
                </button>

                <button
                  className="hs-btn"
                  onClick={handleMore}
                  style={{
                    padding: "13px 22px",
                    borderRadius: 9,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#6878a0",
                    fontSize: 14,
                  }}
                >
                  <Info size={15} />
                  Details
                </button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* THUMBNAIL STRIP */}
        {/* THUMBNAIL STRIP */}
{!isMobile && (
  <div className="hs-thumbnails" style={{
    position: "absolute", right: 48, top: "50%",
    transform: "translateY(-50%)",
    display: "flex", flexDirection: "column", gap: 12,
    zIndex: 10,
  }}>
    {slides.map((s, i) => {
      const isActive = i === current;
      const sCfg = TYPE_CONFIG[s.type] || TYPE_CONFIG.movie;
      return (
        <motion.div
          key={s._id}
          onClick={() => goTo(i, i > current ? 1 : -1)}
          animate={{ opacity: isActive ? 1 : 0.4, scale: isActive ? 1 : 0.92 }}
          transition={{ duration: 0.25 }}
          style={{
            width: 56, height: 80, borderRadius: 7, overflow: "hidden", cursor: "pointer",
            border: isActive ? `2px solid ${sCfg.accent}` : "2px solid rgba(255,255,255,0.08)",
            boxShadow: isActive ? `0 0 16px ${sCfg.glow}` : "none",
            background: "#0d1420", flexShrink: 0,
          }}
        >
          <img
            src={s.images?.poster || s.images?.fanart}
            alt={s.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={e => { e.target.style.display = "none"; }}
          />
        </motion.div>
      );
    })}
  </div>
)}

        {/* BOTTOM CONTROLS */}
        <div style={{
  position: "absolute", bottom: 36, left: isMobile ? 20 : 64, right: isMobile ? 20 : 64,
  display: "flex", alignItems: "center", gap: 20, zIndex: 10,
}}>
          <button className="hs-arrow" onClick={goPrev} style={{ width: 38, height: 38 }}>
            <ChevronLeft size={18} color="#8892a4" />
          </button>
          <button className="hs-arrow" onClick={goNext} style={{ width: 38, height: 38 }}>
            <ChevronRight size={18} color="#8892a4" />
          </button>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {slides.map((s, i) => {
              const isActive = i === current;
              return (
                <div
                  key={s._id}
                  onClick={() => goTo(i, i > current ? 1 : -1)}
                  style={{
                    position: "relative", height: 3,
                    width: isActive ? 40 : 20, borderRadius: 2,
                    background: "rgba(255,255,255,0.15)", cursor: "pointer", overflow: "hidden",
                  }}
                >
                  {isActive && (
                    <motion.div style={{
                      position: "absolute", left: 0, top: 0, bottom: 0,
                      background: cfg.accent, borderRadius: 2, width: `${progress}%`,
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#3a4560", marginLeft: 4 }}>
            {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </span>

          <button
            className="hs-arrow"
            onClick={() => setMuted(v => !v)}
            style={{ width: 34, height: 34, marginLeft: "auto" }}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX size={14} color="#4a5568" /> : <Volume2 size={14} color="#8892a4" />}
          </button>
        </div>

        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 120,
          background: "linear-gradient(to bottom, transparent, #080c14)",
          pointerEvents: "none",
        }} />
      </div>
    </>
  );
}