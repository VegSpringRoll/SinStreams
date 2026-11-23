import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Info, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─── Pure Monochrome Type config ─────────────────────────────────────────────
const TYPE_CONFIG = {
  movie:  { label: "FILM",   accent: "#ffffff", glow: "rgba(255,255,255,0.2)" },
  series: { label: "SERIES", accent: "#e4e4e7", glow: "rgba(255,255,255,0.18)" },
  anime:  { label: "ANIME",  accent: "#d4d4d8", glow: "rgba(255,255,255,0.18)" },
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

// Serve a lighter backdrop size on mobile
const getBackdrop = (url, mobile) => {
  if (!url) return url;
  if (!url.includes("image.tmdb.org/t/p/")) return url;
  return url.replace(/\/t\/p\/(w\d+|original)\//, `/t/p/${mobile ? "w1280" : "original"}/`);
};

export default function HeroSlider({
  slides     = DEFAULT_SLIDES,
  autoPlay   = true,
  onPlay,
}) {
  if (!slides || slides.length === 0) {
    return <div style={{ height: "100vh", background: "#030304" }} />;
  }

  const [current,   setCurrent]   = useState(0);
  const [prev,      setPrev]      = useState(null);
  const [direction, setDirection] = useState(1);
  const [paused,    setPaused]    = useState(false);
  const [imgLoaded, setImgLoaded] = useState({});
  const [progress,  setProgress]  = useState(0);
  const intervalRef = useRef(null);
  const progressRef = useRef(null);
  const navigate = useNavigate();

  // ── Responsive: detect mobile viewport ──
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const slide   = slides[current];
  const cfg     = TYPE_CONFIG[slide?.type] || TYPE_CONFIG.movie;
  const quality = slide.torrents?.["2160p"] ? "2160p" : slide.torrents?.["1080p"] ? "1080p" : slide.torrents?.["720p"] ? "720p" : null;
  const score   = slide?.rating?.percentage ? (slide.rating.percentage / 10).toFixed(1) : null;

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

  // Handle Watch - Navigate to Details page
  const handleWatch = () => {
    const mediaId = slide._id || slide.imdb_id;
    let mediaType = slide.type;
    if (mediaType === 'series') mediaType = 'tv';
    navigate(`/details/${mediaType}/${mediaId}`);
  };

  const variants = {
    enter:  (d) => ({ opacity: 0, x: d > 0 ? 50 : -50, scale: 1.02 }),
    center: {      opacity: 1, x: 0, scale: 1 },
    exit:   (d) => ({ opacity: 0, x: d > 0 ? -50 : 50, scale: 0.98 }),
  };

  return (
    <>
      <style>{`
        .hs-root * { box-sizing: border-box; }
        .hs-btn {
          border: none; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          display: flex; align-items: center; justify-content: center; gap: 9px;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          font-weight: 600; letter-spacing: 0.02em;
        }
        .hs-btn:hover  { transform: translateY(-2px); }
        .hs-btn:active { transform: translateY(0) scale(0.97); }
        
        .hs-arrow {
          cursor: pointer; border: none;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        .hs-arrow:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.4);
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
          transform: scale(1.08);
        }
        .hs-tag {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          padding: 4px 10px; border-radius: 5px;
        }
        .hs-glass {
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .hs-viewport {
          position: relative;
          width: 100%;
          overflow: hidden;
          background: #030304;
          height: 100vh;
          height: 100svh;
          min-height: 580px;
        }
        @media (max-width: 768px) {
          .hs-viewport {
            height: 88vh;
            height: 88svh;
            min-height: 480px;
          }
        }
      `}</style>

      <div
        className="hero-slider-container hs-viewport"
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
                ? `url(${getBackdrop(slide.images?.fanart || slide.images?.poster, isMobile)})`
                : "none",
              backgroundSize: "cover",
              backgroundPosition: "center top",
              backgroundRepeat: "no-repeat",
            }}
          >
            <img
              src={getBackdrop(slide.images?.fanart || slide.images?.poster, isMobile)}
              alt=""
              style={{ display: "none" }}
              onLoad={() => setImgLoaded(p => ({ ...p, [slide._id]: true }))}
            />
            {/* Obsidian pure monochrome dark vignettes */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, rgba(3,3,4,0.98) 0%, rgba(3,3,4,0.82) 42%, rgba(3,3,4,0.2) 75%, rgba(3,3,4,0.55) 100%)",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(3,3,4,1) 0%, rgba(3,3,4,0.7) 25%, transparent 60%)",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse 70% 50% at 80% 40%, rgba(255, 255, 255, 0.05), transparent 75%)",
            }} />
          </motion.div>
        </AnimatePresence>

        {/* CONTENT */}
        <div className="hs-content" style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center",
          padding: isMobile ? "0 20px" : "0 64px",
          paddingTop: 85,
        }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={slide._id + "_content"}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 35 : -35 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -25 : 25 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              style={{ maxWidth: isMobile ? "100%" : 600, zIndex: 2 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.4 }}
                style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}
              >
                <span className="hs-tag" style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  color: "#ffffff",
                  boxShadow: "0 0 10px rgba(255, 255, 255, 0.08)",
                }}>{cfg.label}</span>

                {slide.year && (
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: "#a1a1aa", fontWeight: 500 }}>{slide.year}</span>
                )}
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255, 255, 255, 0.25)" }} />
                {score && (
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: "#ffffff", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <Star size={12} fill="#ffffff" color="#ffffff" /> {score}
                  </span>
                )}
                {quality && (
                  <>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255, 255, 255, 0.25)" }} />
                    <span className="hs-tag" style={{ background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.14)", color: "#e4e4e7", fontSize: 9 }}>
                      {quality === "2160p" ? "4K ULTRA HD" : quality}
                    </span>
                  </>
                )}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontFamily: "'Cinzel', 'Playfair Display', serif",
                  fontSize: "clamp(30px, 4.8vw, 68px)",
                  fontWeight: 900,
                  lineHeight: 1.05,
                  letterSpacing: "-0.01em",
                  marginBottom: isMobile ? 12 : 18,
                  color: "#ffffff",
                  textShadow: "0 4px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 255, 0.15)",
                }}
              >{slide.title}</motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.4 }}
                style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}
              >
                {(slide.genres || []).slice(0, isMobile ? 2 : 3).map((g, i) => (
                  <span key={i} style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 11, color: "#d4d4d8",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 6, padding: "3px 10px",
                    fontWeight: 500, letterSpacing: "0.03em",
                  }}>{g}</span>
                ))}
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.4 }}
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: isMobile ? 13.5 : 14.5, lineHeight: 1.7,
                  color: "#a1a1aa", fontWeight: 400,
                  marginBottom: isMobile ? 22 : 32,
                  display: "-webkit-box",
                  WebkitLineClamp: isMobile ? 2 : 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  maxWidth: 520,
                }}
              >{slide.synopsis}</motion.p>

              <motion.div
                className="hs-buttons"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38, duration: 0.4 }}
                style={{ display: "flex", gap: isMobile ? 10 : 14, alignItems: "stretch" }}
              >
                {/* Watch Now - Pure high contrast solid white button */}
                <button
                  className="hs-btn"
                  onClick={handleWatch}
                  style={{
                    flex: isMobile ? 1 : "0 0 auto",
                    padding: isMobile ? "12px 22px" : "14px 34px",
                    height: isMobile ? 46 : 52,
                    borderRadius: 11,
                    background: "#ffffff",
                    color: "#030304",
                    fontSize: isMobile ? 14 : 15,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    boxShadow: "0 0 20px rgba(255, 255, 255, 0.25), 0 8px 24px rgba(0, 0, 0, 0.6)",
                  }}
                >
                  <Play size={17} fill="#030304" color="#030304" />
                  Watch Now
                </button>

                {/* Details - Frosted Charcoal Glass */}
                <button
                  className="hs-btn hs-glass"
                  onClick={handleWatch}
                  aria-label="Details"
                  title="Details"
                  style={{
                    flex: "0 0 auto",
                    width: isMobile ? 46 : "auto",
                    padding: isMobile ? 0 : "14px 26px",
                    height: isMobile ? 46 : 52,
                    borderRadius: 11,
                    background: "rgba(255, 255, 255, 0.07)",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                    color: "#ffffff",
                    fontSize: 15,
                    whiteSpace: "nowrap",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
                  }}
                >
                  <Info size={18} />
                  {!isMobile && "Details"}
                </button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* THUMBNAIL STRIP (Desktop only) */}
        {!isMobile && (
          <div className="hs-thumbnails" style={{
            position: "absolute", right: 48, top: "50%",
            transform: "translateY(-50%)",
            display: "flex", flexDirection: "column", gap: 12,
            zIndex: 10,
          }}>
            {slides.map((s, i) => {
              const isActive = i === current;
              return (
                <motion.div
                  key={s._id}
                  onClick={() => goTo(i, i > current ? 1 : -1)}
                  animate={{ opacity: isActive ? 1 : 0.45, scale: isActive ? 1 : 0.92 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    width: 58, height: 84, borderRadius: 8, overflow: "hidden", cursor: "pointer",
                    border: isActive ? `2px solid #ffffff` : "1px solid rgba(255, 255, 255, 0.12)",
                    boxShadow: isActive ? "0 0 18px rgba(255, 255, 255, 0.3)" : "none",
                    background: "#0e0e12", flexShrink: 0,
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
          position: "absolute", bottom: isMobile ? 22 : 36, left: isMobile ? 20 : 64, right: isMobile ? 20 : 64,
          display: "flex", alignItems: "center", gap: isMobile ? 12 : 20, zIndex: 10,
        }}>
          {!isMobile && (
            <>
              <button className="hs-arrow" onClick={goPrev} style={{ width: 40, height: 40 }}>
                <ChevronLeft size={18} color="#ffffff" />
              </button>
              <button className="hs-arrow" onClick={goNext} style={{ width: 40, height: 40 }}>
                <ChevronRight size={18} color="#ffffff" />
              </button>
            </>
          )}

          <div style={{ display: "flex", gap: isMobile ? 6 : 8, alignItems: "center" }}>
            {slides.map((s, i) => {
              const isActive = i === current;
              return (
                <div
                  key={s._id}
                  onClick={() => goTo(i, i > current ? 1 : -1)}
                  style={{
                    position: "relative", height: 3.5,
                    width: isActive ? (isMobile ? 30 : 44) : (isMobile ? 14 : 22), borderRadius: 2,
                    background: "rgba(255, 255, 255, 0.18)", cursor: "pointer", overflow: "hidden",
                  }}
                >
                  {isActive && (
                    <motion.div style={{
                      position: "absolute", left: 0, top: 0, bottom: 0,
                      background: "#ffffff", borderRadius: 2, width: `${progress}%`,
                      boxShadow: "0 0 8px rgba(255, 255, 255, 0.8)",
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: "#71717a", marginLeft: 6, fontWeight: 500 }}>
            {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </span>
        </div>

        {/* Bottom smooth dark vignette fade */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 140,
          background: "linear-gradient(to bottom, transparent, #030304)",
          pointerEvents: "none",
        }} />
      </div>
    </>
  );
}
