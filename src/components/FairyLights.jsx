import { useState, useEffect, useMemo } from 'react';

/**
 * Basic Festive Bulbs Garland
 * - Positioned lower (hanging right beneath the 70px Navbar) so the Navbar is clean and uncrowded.
 * - Continuous parabola curves that open upward (hanging U-scallops).
 * - Simple glowing circle bulbs that continuously dim and glow without changing size (no scaling/growing).
 * - Fully mobile-optimized with 0 click interception (pointer-events: none).
 */
export default function FairyLights() {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    let timeout;
    const onResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setWindowWidth(window.innerWidth);
      }, 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(timeout);
    };
  }, []);

  const isMobile = windowWidth <= 768;
  const count = isMobile ? 9 : 18;
  const dip = isMobile ? 12 : 16;
  const bulbRadius = isMobile ? 3.4 : 4.2;
  const containerHeight = isMobile ? 22 : 28;

  // Segments across 1000 SVG coordinate units
  const segments = useMemo(() => {
    const list = [];
    const step = 1000 / count;

    for (let i = 0; i < count; i++) {
      const startX = i * step;
      const endX = (i + 1) * step;
      const midX = startX + step / 2;

      // Staggered delay for continuous flowing wave of dim and glow
      const delay = (i * 0.24) % 2.2;
      const duration = 2.0 + ((i * 0.2) % 0.8);

      list.push({
        id: i,
        startX,
        endX,
        midX,
        dip,
        delay: delay.toFixed(2),
        duration: duration.toFixed(2),
      });
    }
    return list;
  }, [count, dip]);

  // Build a single continuous seamless SVG path for all upward-opening parabolas
  const wirePath = useMemo(() => {
    return segments
      .map((seg, idx) => {
        const prefix = idx === 0 ? `M ${seg.startX} 0` : '';
        return `${prefix} Q ${seg.midX} ${seg.dip} ${seg.endX} 0`;
      })
      .join(' ');
  }, [segments]);

  return (
    <>
      <style>{`
        /* Smooth continuous dim and glow animation without changing size */
        @keyframes bulbDimAndGlow {
          0%, 100% {
            opacity: 0.95;
            filter: drop-shadow(0 0 3px #ffffff) drop-shadow(0 0 8px rgba(255, 255, 255, 0.85));
          }
          50% {
            opacity: 0.22;
            filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.25));
          }
        }

        .fairy-lights-root {
          position: fixed;
          top: 68px; /* Positioned right beneath the 70px Navbar */
          left: 0;
          width: 100vw;
          height: ${containerHeight}px;
          pointer-events: none;
          z-index: 999;
          overflow: visible;
          user-select: none;
        }

        .fairy-wire-continuous {
          stroke: rgba(255, 255, 255, 0.35);
          stroke-width: ${isMobile ? '1.2' : '1.5'};
          fill: none;
          stroke-linecap: round;
        }

        .fairy-bulb-circle {
          fill: #ffffff;
          animation-name: bulbDimAndGlow;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
          will-change: opacity, filter;
        }
      `}</style>

      <div className="fairy-lights-root" aria-hidden="true">
        <svg
          viewBox={`0 0 1000 ${containerHeight}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          {/* Continuous upward-opening parabola wire along bottom of Navbar */}
          <path d={wirePath} className="fairy-wire-continuous" />

          {/* Glowing circle bulbs at the bottom dip of each parabola */}
          {segments.map((seg) => (
            <circle
              key={seg.id}
              cx={seg.midX}
              cy={seg.dip}
              r={bulbRadius}
              className="fairy-bulb-circle"
              style={{
                animationDuration: `${seg.duration}s`,
                animationDelay: `${seg.delay}s`,
              }}
            />
          ))}
        </svg>
      </div>
    </>
  );
}
