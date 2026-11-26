import { useState, useEffect } from 'react';

/**
 * 5-second Opening Splash Screen
 * Displays user-provided Desktop & Mobile splash backgrounds natively at full clarity
 * (zero zoom distortion, zero blur) while routes & data load in the background.
 * Dispatches `sinstreams:splash-complete` on finish so post-intro prompts wait cleanly.
 */
export default function SplashScreen({ durationMs = 5000 }) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    window.__sinSplashDone = false;
    const fadeLeadMs = 450;

    const exitTimer = setTimeout(() => {
      setExiting(true);
    }, Math.max(durationMs - fadeLeadMs, 500));

    const hideTimer = setTimeout(() => {
      setVisible(false);
      window.__sinSplashDone = true;
      window.dispatchEvent(new CustomEvent('sinstreams:splash-complete'));
    }, durationMs);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, [durationMs]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes sinSplashFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sinSpinnerRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes sinSpinnerPulse {
          0%, 100% { opacity: 0.78; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        .sin-splash-overlay {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100dvh;
          z-index: 20000;
          background-color: #030304;
          overflow: hidden;
          touch-action: none;
          user-select: none;
          animation: sinSplashFadeIn 0.35s ease-out forwards;
          transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sin-splash-bg-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
          display: block;
          image-rendering: auto;
        }
        .sin-splash-loader-dock {
          position: absolute;
          bottom: clamp(22px, 5.5vh, 46px);
          left: 0;
          right: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .sin-splash-ring-wrap {
          position: relative;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(6, 6, 9, 0.58);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.75), 0 0 22px rgba(239, 68, 68, 0.28);
        }
        .sin-splash-ring-spin {
          width: 40px;
          height: 40px;
          animation: sinSpinnerRotate 0.95s linear infinite;
          will-change: transform;
        }
        .sin-splash-ring-core {
          position: absolute;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.95), 0 0 18px rgba(255, 255, 255, 0.4);
          animation: sinSpinnerPulse 1.4s ease-in-out infinite;
          will-change: transform, opacity;
        }
        @media (max-width: 768px) {
          .sin-splash-ring-wrap {
            width: 44px;
            height: 44px;
          }
          .sin-splash-ring-spin {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>

      <div
        className="sin-splash-overlay"
        style={{
          opacity: exiting ? 0 : 1,
          pointerEvents: exiting ? 'none' : 'auto',
        }}
      >
        {/* Native crisp Desktop / Mobile Splash Background (no scaling/blur) */}
        <picture style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <source media="(max-width: 768px), (orientation: portrait)" srcSet="/images/splash-mobile.png" />
          <img
            src="/images/splash-desktop.png"
            alt="SinStreams"
            className="sin-splash-bg-img"
            decoding="sync"
            fetchPriority="high"
          />
        </picture>

        {/* Matching Crimson & Silver Loading Circle */}
        <div className="sin-splash-loader-dock">
          <div className="sin-splash-ring-wrap" role="status" aria-label="Loading SinStreams">
            <svg className="sin-splash-ring-spin" viewBox="0 0 44 44">
              <defs>
                <linearGradient id="sinSplashArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
                  <stop offset="55%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
                </linearGradient>
              </defs>
              <circle
                cx="22"
                cy="22"
                r="17"
                fill="none"
                stroke="rgba(255, 255, 255, 0.14)"
                strokeWidth="2.6"
              />
              <circle
                cx="22"
                cy="22"
                r="17"
                fill="none"
                stroke="url(#sinSplashArcGrad)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="76 36"
              />
            </svg>
            <div className="sin-splash-ring-core" />
          </div>
        </div>
      </div>
    </>
  );
}
