import { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldAlert, ExternalLink, RotateCcw } from 'lucide-react';

const YOUTUBE_VIDEO_ID = 'BR_JjtOBNI0';
const YOUTUBE_SHARE_URL = 'https://youtu.be/BR_JjtOBNI0';
const YOUTUBE_EMBED_URL = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0&playsinline=1&loop=1&playlist=${YOUTUBE_VIDEO_ID}`;

/**
 * InspectGuard
 * Blocks casual Inspect / DevTools / View-Source inspection attempts and replaces
 * the app tree with the requested YouTube video popup while blocked.
 */
export default function InspectGuard({ children }) {
  const [blocked, setBlocked] = useState(false);
  const blockedRef = useRef(false);
  const lastDprRef = useRef(typeof window !== 'undefined' ? window.devicePixelRatio : 1);

  const triggerBlock = useCallback(() => {
    if (!blockedRef.current) {
      blockedRef.current = true;
      setBlocked(true);
      try {
        console.clear();
      } catch {
        // ignore console errors
      }
    }
  }, []);

  useEffect(() => {
    // 1. Block right-click Inspect / Context Menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      triggerBlock();
      return false;
    };

    // 2. Block DevTools, Inspector, and View Source keyboard shortcuts
    const handleKeyDown = (e) => {
      const key = (e.key || '').toUpperCase();
      const isF12 = key === 'F12' || e.keyCode === 123;
      const isWinDevTools = e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'K', 'E'].includes(key);
      const isMacDevTools = e.metaKey && e.altKey && ['I', 'J', 'C', 'U'].includes(key);
      const isViewSource = (e.ctrlKey || e.metaKey) && !e.shiftKey && key === 'U';

      if (isF12 || isWinDevTools || isMacDevTools || isViewSource) {
        e.preventDefault();
        e.stopPropagation();
        triggerBlock();
        return false;
      }
    };

    // 3. Detect docked DevTools resize on desktop (ignoring zoom & fullscreen)
    const checkDockedDevTools = () => {
      if (blockedRef.current) return;
      const isDesktopPointer = window.matchMedia?.('(pointer: fine)').matches;
      const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isDesktopPointer || isFullscreen) return;

      const currentDpr = window.devicePixelRatio;
      const dprChanged = Math.abs(currentDpr - lastDprRef.current) > 0.01;
      lastDprRef.current = currentDpr;
      if (dprChanged) return;

      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (window.outerWidth > 500 && (widthDiff > 180 || heightDiff > 240)) {
        triggerBlock();
      }
    };

    // 4. Timing-based debugger check for menu-opened or undocked DevTools
    const debuggerInterval = setInterval(() => {
      if (blockedRef.current) return;
      try {
        const start = performance.now();
        // eslint-disable-next-line no-new-func
        Function('debugger')();
        if (performance.now() - start > 120) {
          triggerBlock();
        }
      } catch {
        // ignore CSP/sandbox restriction if any
      }
    }, 1500);

    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('resize', checkDockedDevTools);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('resize', checkDockedDevTools);
      clearInterval(debuggerInterval);
    };
  }, [triggerBlock]);

  if (blocked) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'radial-gradient(circle at 50% 25%, #15151d 0%, #030304 75%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 16px',
          minHeight: '100dvh',
          boxSizing: 'border-box',
          color: '#ffffff',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 780,
            background: 'rgba(14, 14, 20, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: 18,
            padding: 'clamp(16px, 3vw, 28px)',
            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.9), 0 0 36px rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ShieldAlert size={18} color="#ffffff" />
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 'clamp(15px, 2.5vw, 19px)',
                    fontWeight: 700,
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: '0.03em',
                  }}
                >
                  Nice Try 👀
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#a1a1aa' }}>
                  Inspecting is disabled on SinStreams. Enjoy this instead!
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={YOUTUBE_SHARE_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 13px',
                  borderRadius: 9,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={13} /> Open Video
              </a>
              <button
                onClick={() => window.location.reload()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 9,
                  background: '#ffffff',
                  border: 'none',
                  color: '#030304',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={13} /> Return
              </button>
            </div>
          </div>

          {/* Embedded YouTube Popup Player */}
          <div
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              borderRadius: 12,
              overflow: 'hidden',
              background: '#000000',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            <iframe
              src={YOUTUBE_EMBED_URL}
              title="Inspect Guard Video"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    );
  }

  return children;
}
