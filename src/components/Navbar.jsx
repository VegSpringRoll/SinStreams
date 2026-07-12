import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useUser, useClerk, SignInButton } from "@clerk/clerk-react";
import { Search, X, Film, Tv, Sword, Bookmark, ChevronDown, LogOut, User, Settings, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchMedia } from "../../services/mediaService";

const NAV_LINKS = [
  { label: "Movies",  path: "/movies",  icon: Film },
  { label: "Series",  path: "/series",  icon: Tv },
  { label: "Live TV", path: "/live-tv", icon: Tv },
  { label: "My List", path: "/mylist",  icon: Bookmark },
];

const TYPE_PILL = {
  movie:  { bg: "rgba(232,184,75,0.15)",  border: "rgba(232,184,75,0.35)",  text: "#e8b84b", label: "MOVIE"  },
  series: { bg: "rgba(91,164,212,0.15)",  border: "rgba(91,164,212,0.35)",  text: "#5ba4d4", label: "SERIES" },
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

  // ── Scroll detection ───────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
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
        const results = await searchMedia(searchQuery);
        console.log("Search results:", results);
        
        const formatted = results.map(item => ({
          ...item,
          id: item._id || item.imdb_id,
          rating: item.rating?.percentage
            ? (item.rating.percentage / 10).toFixed(1)
            : "N/A",
          year: item.year || item.releaseDate?.substring(0, 4) || "N/A"
        }));
        
        setSearchResults(formatted);
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // ── Focus input when search opens ─────────────────────────────────────────
  useEffect(() => {
    if (searchOpen) setTimeout(() => document.getElementById("sinema-search")?.focus(), 80);
  }, [searchOpen]);

  // 🎯 Handle search result click - Navigate to home and play
  // 🎯 Handle search result click - Navigate to DETAILS page
const handleResultClick = (result) => {
  console.log("Opening Details For:", result.title);
  
  // Get the correct type
  let mediaType = result.type;
  if (mediaType === 'series') mediaType = 'tv';
  
  // Get the correct ID
  const mediaId = result._id || result.imdb_id || result.id;
  
  console.log("Navigating to:", `/details/${mediaType}/${mediaId}`);
  
  // Close search
  setSearchOpen(false);
  setSearchQuery("");
  setSearchResults([]);
  
  // Navigate to details page
  navigate(`/details/${mediaType}/${mediaId}`);
};

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');

        .sinema-nav * { box-sizing: border-box; }

        .sin-link {
          position: relative; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 400;
          letter-spacing: 0.04em;
          color: #6878a0;
          text-decoration: none;
          display: flex; align-items: center; gap: 6px;
          padding: 4px 0;
          transition: color 0.2s;
        }

        .sin-desktop-links { display: flex; }
.sin-dev-credit { display: flex; }
.sin-mobile-toggle { display: none; flex-shrink: 0; }
.sin-navbar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.sin-profile-name { display: inline; }
.sin-profile-chevron { display: inline-flex; }

@media (max-width: 768px) {
  .sin-desktop-links { display: none !important; }
  .sin-dev-credit { display: none !important; }
  .sin-mobile-toggle { display: flex !important; }
  .sin-navbar-right { gap: 6px; }
  .sin-profile-name { display: none; }
  .sin-profile-chevron { display: none; }
}
        .sin-link:hover { color: #c8d0e0; }
        .sin-link.active { color: #e8eaf0; }
        .sin-link::after {
          content: ''; position: absolute; bottom: -2px; left: 0; right: 0;
          height: 1px; background: #e8b84b;
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.25s ease;
        }
        .sin-link.active::after,
        .sin-link:hover::after { transform: scaleX(1); }

        .sin-icon-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px; cursor: pointer;
          color: #6878a0; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center;
          padding: 7px;
        }
        .sin-icon-btn:hover { background: rgba(255,255,255,0.1); color: #c8d0e0; border-color: rgba(255,255,255,0.15); }

        .sin-search-input {
          background: transparent; border: none; outline: none;
          font-family: 'DM Sans', sans-serif; font-size: 14px;
          color: #e8eaf0; width: 100%;
        }
        .sin-search-input::placeholder { color: #3a4560; }

        .sin-result-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 16px; cursor: pointer;
          transition: background 0.15s;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .sin-result-item:last-child { border-bottom: none; }
        .sin-result-item:hover { background: rgba(255,255,255,0.05); }

        .sin-profile-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 13px;
          color: #8892a4; transition: all 0.15s;
          border-radius: 6px; margin: 2px 6px;
        }
        .sin-profile-item:hover { background: rgba(255,255,255,0.06); color: #c8d0e0; }
        .sin-profile-item.danger:hover { background: rgba(224,95,95,0.1); color: #e05f5f; }

        .sin-mobile-link {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 20px; text-decoration: none;
          font-family: 'DM Sans', sans-serif; font-size: 15px;
          color: #8892a4; border-bottom: 1px solid rgba(255,255,255,0.05);
          transition: color 0.2s, background 0.2s;
        }
        .sin-mobile-link:hover, .sin-mobile-link.active { color: #e8eaf0; background: rgba(255,255,255,0.04); }

        .sinema-nav { padding: 0 32px; }
        .sin-logo-link { margin-right: 36px; }
        .sin-logo-text { font-size: 22px; }
        @media (max-width: 768px) {
          .sinema-nav { padding: 0 16px; }
          .sin-logo-link { margin-right: 14px; }
          .sin-logo-text { font-size: 18px; }
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
          height: 68,
          display: "flex", alignItems: "center",
          background: scrolled
            ? "rgba(8,12,20,0.96)"
            : "linear-gradient(to bottom, rgba(8,12,20,0.95) 0%, rgba(8,12,20,0.5) 70%, transparent)",
          backdropFilter: scrolled ? "blur(4px)" : "blur(4px)",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
          transition: "background 0.4s ease, border-color 0.4s ease, backdrop-filter 0.4s ease",
        }}
      >
        {/* ── LOGO ── */}
        <Link to="/" className="sin-logo-link" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "linear-gradient(135deg, #e8b84b 0%, #e05fa0 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, boxShadow: "0 4px 14px rgba(232,184,75,0.3)",
          }}>▶</div>
          <span className="sin-logo-text" style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 900, letterSpacing: "-0.02em",
            background: "linear-gradient(90deg, #e8eaf0 30%, #a0a8c0 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>SinStreams</span>
        </Link>

        {/* ── NAV LINKS (desktop) ── */}
        <div className="sin-desktop-links" style={{ display: "flex", alignItems: "center", gap: 28, flex: 1 }}>
          {NAV_LINKS.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`sin-link${isActive(path) ? " active" : ""}`}
            >
              <Icon size={13} strokeWidth={2} />
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
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "11px",
    fontWeight: "400",
    color: "rgba(255,255,255,0.15)",
    letterSpacing: "0.08em",
    whiteSpace: "nowrap",
    borderLeft: "1px solid rgba(255,255,255,0.08)",
    paddingLeft: "20px",
  }}>
    Developed by <span style={{
      fontWeight: "600",
      color: "rgba(255,255,255,0.25)",
    }}>Uttkarsh</span>
  </span>
</div>

        {/* ── RIGHT SIDE ── */}
        <div className="sin-navbar-right">

          {/* Search toggle */}
          <button className="sin-icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search">
            <Search size={16} />
          </button>

          {/* Notifications */}
          {isSignedIn && (
            <div style={{ position: "relative" }}>
              <button className="sin-icon-btn" onClick={() => setNotifOpen(v => !v)} aria-label="Notifications">
                <Bell size={16} />
                <span style={{
                  position: "absolute", top: 5, right: 5, width: 6, height: 6,
                  borderRadius: "50%", background: "#e05fa0",
                  border: "1.5px solid #080c14",
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
                      position: "absolute", top: "calc(100% + 10px)", right: 0,
                      width: 280, borderRadius: 12,
                      background: "#0f1623",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#4a5568", letterSpacing: "0.08em", fontWeight: 500 }}>NOTIFICATIONS</span>
                    </div>
                    {["You Should Definitely Watch Alice in Borderland :)", "Thanks for Using the Site ^_^" , "Make Sure to try different servers if movie/series doesn't load"].map((n, i) => (
                      <div key={i} className="sin-result-item">
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#e05fa0", flexShrink: 0 }} />
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#8892a4" }}>{n}</span>
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
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, padding: "5px 10px 5px 5px",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <img
                  src={user?.imageUrl}
                  alt={user?.firstName}
                  style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
                  onError={e => { e.target.style.display = "none"; }}
                />
                <span className="sin-profile-name" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#a0a8c0", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.firstName}
                </span>
                <ChevronDown className="sin-profile-chevron" size={13} color="#4a5568" style={{ transition: "transform 0.2s", transform: profileOpen ? "rotate(180deg)" : "none" }} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      position: "absolute", top: "calc(100% + 10px)", right: 0,
                      width: 210, borderRadius: 12,
                      background: "#0f1623",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                      overflow: "hidden", paddingTop: 6, paddingBottom: 6,
                    }}
                  >
                    <div style={{ padding: "10px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 4 }}>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, color: "#c8d0e0" }}>
                        {user?.fullName}
                      </div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#3a4560", marginTop: 2 }}>
                        {user?.primaryEmailAddress?.emailAddress}
                      </div>
                    </div>

                    {[
                      { icon: User,     label: "Profile",     action: () => { navigate("/profile"); setProfileOpen(false); } },
                      { icon: Bookmark, label: "My Watchlist", action: () => { navigate("/mylist"); setProfileOpen(false); } },
                      { icon: Settings, label: "Settings",    action: () => { navigate("/settings"); setProfileOpen(false); } },
                    ].map(({ icon: Icon, label, action }) => (
                      <div key={label} className="sin-profile-item" onClick={action}>
                        <Icon size={14} /> {label}
                      </div>
                    ))}

                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 4, paddingTop: 4 }}>
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
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
                padding: "8px 20px", borderRadius: 8, cursor: "pointer",
                background: "linear-gradient(135deg, #e8b84b, #e08a2a)",
                border: "none", color: "#0a0a0a", letterSpacing: "0.03em",
                transition: "opacity 0.2s, transform 0.2s",
              }}
                onMouseEnter={e => { e.target.style.opacity = "0.88"; e.target.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.target.style.opacity = "1"; e.target.style.transform = "translateY(0)"; }}
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
            {mobileOpen ? <X size={16} /> : <span style={{ fontSize: 16, lineHeight: 1 }}>☰</span>}
          </button>
        </div>
      </motion.nav>

      {/* ── SEARCH OVERLAY ── */}
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
                background: "rgba(4,7,14,0.85)", backdropFilter: "blur(2px)",
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
                position: "fixed", top: 90, left: "50%", transform: "translateX(-50%)",
                zIndex: 1200, width: "min(620px, 92vw)",
                borderRadius: 14,
                background: "#0d1420",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
                overflow: "hidden",
              }}
            >
              {/* Input row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderBottom: searchResults.length ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                <Search size={17} color="#4a5568" style={{ flexShrink: 0 }} />
                <input
                  id="sinema-search"
                  className="sin-search-input"
                  placeholder="Search movies and Series..."
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
                  <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a5568", display: "flex" }}>
                    <X size={15} />
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
                    style={{ maxHeight: 360, overflowY: "auto" }}
                  >
                    {searchResults.map((result, i) => {
                      const pill = TYPE_PILL[result.type] || TYPE_PILL.movie;
                      return (
                        <motion.div
                          key={result._id || result.imdb_id || i}
                          className="sin-result-item"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => handleResultClick(result)}
                        >
                          {/* Mini poster */}
                          <div style={{
                            width: 38, height: 54, borderRadius: 6, flexShrink: 0,
                            background: result.images?.poster 
                              ? `url(${result.images.poster})` 
                              : "rgba(255,255,255,0.05)",
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: "1px solid rgba(255,255,255,0.06)",
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            fontSize: 18,
                            overflow: 'hidden'
                          }}>
                            {!result.images?.poster && (result.type === 'series' ? '📺' : '🎬')}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="sin-result-title" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, color: "#c8d0e0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {result.title}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                              <span style={{
                                fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 600,
                                letterSpacing: "0.1em", padding: "2px 7px", borderRadius: 4,
                                background: pill.bg, border: `1px solid ${pill.border}`, color: pill.text,
                              }}>{pill.label}</span>
                              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#3a4560" }}>{result.year || "—"}</span>
                            </div>
                          </div>

                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#e8b84b", flexShrink: 0 }}>
                            ★ {result.rating}
                          </span>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Searching indicator */}
              {searching && (
                <div style={{ padding: "14px 18px", textAlign: "center" }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#3a4560" }}>
                    Searching...
                  </span>
                </div>
              )}

              {/* Empty state */}
              {!searching && searchQuery && searchResults.length === 0 && (
                <div style={{ padding: "24px 18px", textAlign: "center" }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#3a4560" }}>
                    No results for "{searchQuery}"
                  </span>
                </div>
              )}

              {/* Hint when empty */}
              {!searchQuery && (
                <div style={{ padding: "14px 18px", display: "flex", gap: 16 }}>
                  {["Movies", "Series"].map((hint) => (
                    <button key={hint} onClick={() => setSearchQuery(hint)}
                      style={{
                        fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                        padding: "5px 12px", borderRadius: 6, cursor: "pointer",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        color: "#6878a0", transition: "all 0.15s",
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

      {/* ── MOBILE DRAWER ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            style={{
              position: "fixed", top: 68, right: 0, bottom: 0,
              width: "70vw", maxWidth: 300, zIndex: 999,
              background: "#0d1420",
              borderLeft: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
              overflowY: "auto",
            }}
          >
            {NAV_LINKS.map(({ label, path, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`sin-mobile-link${isActive(path) ? " active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={15} /> {label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}