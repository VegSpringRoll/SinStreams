import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useUser, useClerk, SignInButton } from "@clerk/clerk-react";
import { Search, X, Film, Tv, Bookmark, ChevronDown, LogOut, User, Settings, Bell, Star, Sparkles, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchMedia } from "../../services/mediaService";
import { searchAnime } from "../../services/animeService";

const NAV_LINKS = [
  { label: "Movies",  path: "/movies",  icon: Film },
  { label: "Series",  path: "/series",  icon: Tv },
  { label: "Anime",   path: "/anime",   icon: Sparkles },
  { label: "Live TV", path: "/live-tv", icon: Tv },
  { label: "History", path: "/history", icon: Clock },
  { label: "My List", path: "/mylist",  icon: Bookmark },
];

const TYPE_PILL = {
  movie:  { bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.18)", text: "#ffffff", label: "FILM"   },
  series: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.14)", text: "#e4e4e7", label: "SERIES" },
  anime:  { bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.22)", text: "#ffffff", label: "ANIME"  },
};

export default function Navbar() {
  const { isSignedIn, user } = useUser();
  const { signOut }          = useClerk();
  const navigate             = useNavigate();
  const location             = useLocation();

  const [scrolled,       setScrolled]       = useState(false);
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [searchResults,  setSearchResults]  = useState([]);
  const [profileOpen,    setProfileOpen]    = useState(false);
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [notifOpen,      setNotifOpen]      = useState(false);
  const [searching,      setSearching]      = useState(false);

  const searchRef  = useRef(null);
  const profileRef = useRef(null);

  const isAnimeSection = location.pathname.startsWith('/anime') || 
                        location.pathname.startsWith('/watch/anime') || 
                        location.pathname.startsWith('/details/anime');

  // Close search overlay if user navigates into anime section
  useEffect(() => {
    if (isAnimeSection && searchOpen) {
      setSearchOpen(false);
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [isAnimeSection, searchOpen]);

  // ── Scroll detection ───────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Close dropdowns on outside click ──────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (searchRef.current  && !searchRef.current.contains(e.target))  { 
        setSearchOpen(false); 
        setSearchQuery(""); 
        setSearchResults([]); 
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Live search with debounce ─────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSearching(true);
        const [results, animeResults] = await Promise.all([
          searchMedia(searchQuery).catch(() => []),
          searchAnime(searchQuery).catch(() => []),
        ]);
        
        const formattedMedia = (results || []).map(item => ({
          ...item,
          id: item._id || item.imdb_id,
          rating: item.rating?.percentage
            ? (item.rating.percentage / 10).toFixed(1)
            : "N/A",
          year: item.year || item.releaseDate?.substring(0, 4) || "—"
        }));

        const formattedAnime = (animeResults || []).slice(0, 6).map(item => ({
          ...item,
          id: item.id || item._id,
          rating: typeof item.rating === 'object'
            ? (item.rating.value || "N/A")
            : (item.rating || "N/A"),
          year: item.year || "—"
        }));
        
        setSearchResults([...formattedMedia, ...formattedAnime]);
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // ── Focus input when search opens ─────────────────────────────────────────
  useEffect(() => {
    if (searchOpen) setTimeout(() => document.getElementById("sin-search-input")?.focus(), 80);
  }, [searchOpen]);

  // 🎯 Handle search result click
  const handleResultClick = (result) => {
    let mediaType = result.type;
    if (mediaType === 'series') mediaType = 'tv';
    if (mediaType === 'anime') mediaType = 'anime';
    const mediaId = result._id || result.imdb_id || result.id;
    
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    navigate(`/details/${mediaType}/${mediaId}`);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <style>{`
        .sinema-nav * { box-sizing: border-box; }

        .sin-link {
          position: relative; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13.5px; font-weight: 500;
          letter-spacing: 0.03em;
          color: #a1a1aa;
          text-decoration: none;
          display: flex; align-items: center; gap: 7px;
          padding: 6px 0;
          transition: color 0.2s ease;
        }

        .sin-desktop-links { display: flex; }
        .sin-dev-credit { display: flex; }
        .sin-mobile-toggle { display: none; flex-shrink: 0; }
        .sin-navbar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; margin-left: auto; }
        .sin-profile-name { display: inline; }
        .sin-profile-chevron { display: inline-flex; }

        @media (max-width: 768px) {
          .sin-desktop-links { display: none !important; }
          .sin-dev-credit { display: none !important; }
          .sin-mobile-toggle { display: flex !important; }
          .sin-navbar-right { gap: 8px; }
          .sin-profile-name { display: none; }
          .sin-profile-chevron { display: none; }
        }

        .sin-link:hover { color: #ffffff; }
        .sin-link.active { color: #ffffff; }
        .sin-link::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0;
          height: 1.5px;
          background: linear-gradient(90deg, transparent, #ffffff, transparent);
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
          transform: scaleX(0); transform-origin: center;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sin-link.active::after,
        .sin-link:hover::after { transform: scaleX(1); }

        .sin-icon-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 9px; cursor: pointer;
          color: #d4d4d8; transition: all 0.2s ease;
          display: flex; align-items: center; justify-content: center;
          padding: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .sin-icon-btn:hover { 
          background: rgba(255, 255, 255, 0.12); 
          color: #ffffff; 
          border-color: rgba(255, 255, 255, 0.35);
          box-shadow: 0 0 14px rgba(255, 255, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .sin-search-input {
          background: transparent; border: none; outline: none;
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14.5px;
          color: #ffffff; width: 100%;
        }
        .sin-search-input::placeholder { color: #71717a; }

        .sin-result-item {
          display: flex; align-items: center; gap: 14px;
          padding: 11px 18px; cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .sin-result-item:last-child { border-bottom: none; }
        .sin-result-item:hover { 
          background: rgba(255, 255, 255, 0.07); 
        }

        .sin-profile-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13.5px;
          color: #a1a1aa; transition: all 0.15s ease;
          border-radius: 8px; margin: 2px 6px;
        }
        .sin-profile-item:hover { 
          background: rgba(255, 255, 255, 0.08); 
          color: #ffffff; 
        }
        .sin-profile-item.danger:hover { 
          background: rgba(255, 255, 255, 0.12); 
          color: #ffffff; 
        }

        .sin-mobile-link {
          display: flex; align-items: center; gap: 12px;
          padding: 15px 22px; text-decoration: none;
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 500;
          color: #a1a1aa; border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          transition: color 0.2s, background 0.2s;
        }
        .sin-mobile-link:hover, .sin-mobile-link.active { 
          color: #ffffff; 
          background: rgba(255, 255, 255, 0.07); 
        }

        .sinema-nav { padding: 0 36px; }
        .sin-logo-link { margin-right: 36px; }
        .sin-logo-text { font-size: 22px; }
        @media (max-width: 768px) {
          .sinema-nav { padding: 0 16px; }
          .sin-logo-link { margin-right: 14px; }
          .sin-logo-text { font-size: 19px; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <motion.nav
        className="sinema-nav"
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
          height: 70,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: scrolled
            ? "rgba(6, 6, 8, 0.88)"
            : "linear-gradient(to bottom, rgba(3, 3, 4, 0.95) 0%, rgba(3, 3, 4, 0.5) 60%, transparent 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: scrolled ? "1px solid rgba(255, 255, 255, 0.09)" : "1px solid rgba(255, 255, 255, 0.04)",
          boxShadow: scrolled ? "0 10px 30px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08)" : "none",
          transition: "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
        }}
      >
        {/* ── LOGO (SinStreams) ── */}
        <Link to="/" className="sin-logo-link" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 11, flexShrink: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.04) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 16px rgba(255, 255, 255, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 700,
          }}>
            ▶
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="sin-logo-text" style={{
              fontFamily: "'Cinzel', 'Playfair Display', serif",
              fontWeight: 900, letterSpacing: "0.06em",
              color: "#ffffff",
              textShadow: "0 0 20px rgba(255, 255, 255, 0.35)",
            }}>SinStreams</span>
          </div>
        </Link>

        {/* ── NAV LINKS (desktop) ── */}
        <div className="sin-desktop-links" style={{ display: "flex", alignItems: "center", gap: 20, flex: 1 }}>
          {NAV_LINKS.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`sin-link${isActive(path) ? " active" : ""}`}
            >
              <Icon size={14} strokeWidth={2} />
              {label}
            </Link>
          ))}
        </div>

        {/* ── DEVELOPER CREDIT ── */}
        <div className="sin-dev-credit" style={{
          display: "flex",
          alignItems: "center",
          marginRight: "20px",
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "11px",
            fontWeight: "400",
            color: "rgba(255, 255, 255, 0.3)",
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
            borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
            paddingLeft: "20px",
          }}>
            Crafted by <span style={{
              fontWeight: "600",
              color: "#ffffff",
            }}>Uttkarsh</span>
          </span>
        </div>

        {/* ── RIGHT SIDE ── */}
        <div className="sin-navbar-right">

          {/* Search toggle (hidden in anime section so dedicated anime search bar remains clear) */}
          {!isAnimeSection && (
            <button className="sin-icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search">
              <Search size={16} />
            </button>
          )}

          {/* Notifications */}
          {isSignedIn && (
            <div style={{ position: "relative" }}>
              <button className="sin-icon-btn" onClick={() => setNotifOpen(v => !v)} aria-label="Notifications">
                <Bell size={16} />
                <span style={{
                  position: "absolute", top: 6, right: 6, width: 6, height: 6,
                  borderRadius: "50%", background: "#ffffff",
                  boxShadow: "0 0 8px rgba(255, 255, 255, 0.9)",
                }} />
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      position: "absolute", top: "calc(100% + 12px)", right: 0,
                      width: 290, borderRadius: 14,
                      background: "rgba(12, 12, 16, 0.95)",
                      backdropFilter: "blur(24px)",
                      WebkitBackdropFilter: "blur(24px)",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.15)",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: "#a1a1aa", letterSpacing: "0.1em", fontWeight: 600 }}>NOTIFICATIONS</span>
                    </div>
                    {["You Should Definitely Watch Alice in Borderland :)", "Welcome to SinStreams", "Switch servers smoothly if stream needs a reload"].map((n, i) => (
                      <div key={i} className="sin-result-item">
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffffff", boxShadow: "0 0 6px rgba(255,255,255,0.8)", flexShrink: 0 }} />
                        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: "#d4d4d8" }}>{n}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Auth */}
          {isSignedIn ? (
            <div ref={profileRef} style={{ position: "relative" }}>
              <button
                onClick={() => setProfileOpen(v => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 9, padding: "5px 12px 5px 6px",
                  cursor: "pointer", transition: "all 0.2s",
                  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                }}
              >
                <img
                  src={user?.imageUrl}
                  alt={user?.firstName}
                  style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,0.2)" }}
                  onError={e => { e.target.style.display = "none"; }}
                />
                <span className="sin-profile-name" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: "#ffffff", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                  {user?.firstName}
                </span>
                <ChevronDown className="sin-profile-chevron" size={13} color="#a1a1aa" style={{ transition: "transform 0.2s", transform: profileOpen ? "rotate(180deg)" : "none" }} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      position: "absolute", top: "calc(100% + 12px)", right: 0,
                      width: 220, borderRadius: 14,
                      background: "rgba(12, 12, 16, 0.95)",
                      backdropFilter: "blur(24px)",
                      WebkitBackdropFilter: "blur(24px)",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.15)",
                      overflow: "hidden", paddingTop: 8, paddingBottom: 8,
                    }}
                  >
                    <div style={{ padding: "10px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 4 }}>
                      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "#ffffff" }}>
                        {user?.fullName}
                      </div>
                      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: "#71717a", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user?.primaryEmailAddress?.emailAddress}
                      </div>
                    </div>

                    {[
                      { icon: User,     label: "Profile",       action: () => { navigate("/profile"); setProfileOpen(false); } },
                      { icon: Clock,    label: "Watch History", action: () => { navigate("/history"); setProfileOpen(false); } },
                      { icon: Bookmark, label: "My Watchlist",  action: () => { navigate("/mylist"); setProfileOpen(false); } },
                      { icon: Settings, label: "Settings",      action: () => { navigate("/settings"); setProfileOpen(false); } },
                    ].map(({ icon: Icon, label, action }) => (
                      <div key={label} className="sin-profile-item" onClick={action}>
                        <Icon size={14} /> {label}
                      </div>
                    ))}

                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: 6, paddingTop: 6 }}>
                      <div className="sin-profile-item danger" onClick={() => signOut()}>
                        <LogOut size={14} /> Sign Out
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <SignInButton mode="modal">
              <button style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600,
                padding: "8px 20px", borderRadius: 9, cursor: "pointer",
                background: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.4)", color: "#000000", letterSpacing: "0.03em",
                boxShadow: "0 0 18px rgba(255, 255, 255, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
                transition: "all 0.2s ease",
              }}
                onMouseEnter={e => { e.target.style.boxShadow = "0 0 25px rgba(255, 255, 255, 0.5)"; e.target.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.target.style.boxShadow = "0 0 18px rgba(255, 255, 255, 0.25)"; e.target.style.transform = "translateY(0)"; }}
              >
                Sign In
              </button>
            </SignInButton>
          )}

          {/* Hamburger (mobile) */}
          <button
            className="sin-icon-btn sin-mobile-toggle"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={17} /> : <span style={{ fontSize: 18, lineHeight: 1 }}>☰</span>}
          </button>
        </div>
      </motion.nav>

      {/* ── SEARCH OVERLAY (Obsidian Frosted Glass) ── */}
      <AnimatePresence>
        {searchOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSearchOpen(false); setSearchQuery(""); setSearchResults([]); }}
              style={{
                position: "fixed", inset: 0, zIndex: 1100,
                background: "rgba(0, 0, 0, 0.82)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              }}
            />

            {/* Search box */}
            <motion.div
              ref={searchRef}
              className="sin-search-overlay" 
              initial={{ opacity: 0, y: -20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "fixed", top: 88, left: "50%", transform: "translateX(-50%)",
                zIndex: 1200, width: "min(640px, 92vw)",
                borderRadius: 16,
                background: "rgba(14, 14, 18, 0.94)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                boxShadow: "0 30px 80px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
                overflow: "hidden",
              }}
            >
              {/* Input row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: searchResults.length ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                <Search size={18} color="#a1a1aa" style={{ flexShrink: 0 }} />
                <input
                  id="sin-search-input"
                  className="sin-search-input"
                  placeholder="Search movies, series, titles..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Escape") { 
                      setSearchOpen(false); 
                      setSearchQuery(""); 
                      setSearchResults([]); 
                    }
                  }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#a1a1aa", display: "flex" }}>
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Results */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ maxHeight: 380, overflowY: "auto" }}
                  >
                    {searchResults.map((result, i) => {
                      const pill = TYPE_PILL[result.type] || TYPE_PILL.movie;
                      return (
                        <motion.div
                          key={result._id || result.imdb_id || i}
                          className="sin-result-item"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => handleResultClick(result)}
                        >
                          {/* Mini poster */}
                          <div style={{
                            width: 38, height: 54, borderRadius: 7, flexShrink: 0,
                            background: result.images?.poster 
                              ? `url(${result.images.poster})` 
                              : "rgba(255, 255, 255, 0.04)",
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            fontSize: 16,
                            overflow: 'hidden'
                          }}>
                            {!result.images?.poster && (result.type === 'series' ? '📺' : '🎬')}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="sin-result-title" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14.5, fontWeight: 600, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {result.title}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                              <span style={{
                                fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 9.5, fontWeight: 600,
                                letterSpacing: "0.08em", padding: "2px 7px", borderRadius: 4,
                                background: pill.bg, border: `1px solid ${pill.border}`, color: pill.text,
                              }}>{pill.label}</span>
                              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: "#71717a" }}>{result.year || "—"}</span>
                            </div>
                          </div>

                          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12.5, fontWeight: 600, color: "#ffffff", display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                            <Star size={11} fill="#ffffff" color="#ffffff" /> {result.rating}
                          </span>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Searching indicator */}
              {searching && (
                <div style={{ padding: "16px 20px", textAlign: "center" }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: "#a1a1aa" }}>
                    Searching titles...
                  </span>
                </div>
              )}

              {/* Empty state */}
              {!searching && searchQuery && searchResults.length === 0 && (
                <div style={{ padding: "28px 20px", textAlign: "center" }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13.5, color: "#71717a" }}>
                    No results for "{searchQuery}"
                  </span>
                </div>
              )}

              {/* Quick suggestions */}
              {!searchQuery && (
                <div style={{ padding: "14px 20px", display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: "#52525b", letterSpacing: "0.06em", textTransform: "uppercase" }}>Suggestions:</span>
                  {["Interstellar", "Batman", "Spider-Man", "Anime"].map((hint) => (
                    <button key={hint} onClick={() => setSearchQuery(hint)}
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12,
                        padding: "5px 12px", borderRadius: 6, cursor: "pointer",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#d4d4d8", transition: "all 0.15s",
                      }}>
                      {hint}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MOBILE DRAWER (Frosted Charcoal Glass) ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop for drawer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{
                position: "fixed", inset: 0, zIndex: 998,
                background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(8px)",
              }}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              style={{
                position: "fixed", top: 70, right: 0, bottom: 0,
                width: "74vw", maxWidth: 320, zIndex: 999,
                background: "rgba(10, 10, 14, 0.96)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                borderLeft: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: "-20px 0 60px rgba(0, 0, 0, 0.8), inset 1px 0 0 rgba(255, 255, 255, 0.1)",
                overflowY: "auto",
              }}
            >
              <div style={{ padding: "18px 22px 10px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <span style={{
                  fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 700,
                  letterSpacing: "0.1em", color: "#ffffff",
                }}>MENU</span>
              </div>
              {NAV_LINKS.map(({ label, path, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`sin-mobile-link${isActive(path) ? " active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={16} strokeWidth={2} /> {label}
                </Link>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
