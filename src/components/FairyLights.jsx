import { useState, useEffect, useMemo } from 'react';

/**
 * Festive Fairy Lights Garland at the top of SinStreams.
 * Positioned above the Navbar (z-index: 1050) with high visibility.
 * Continuous glow and dim animation running smoothly on GPU.
 * 100% pointer-events: none (zero click or tap blocking).
 * Fully optimized for both desktop and mobile viewports.
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
  const count = isMobile ? 11 : 22;
  const viewBoxHeight = isMobile ? 32 : 44;

  // Segments across 1000 SVG coordinate units
  const segments = useMemo(() => {
    const list = [];
    const step = 1000 / count;
    const dip = isMobile ? 13 : 18;

    for (let i = 0; i < count; i++) {
      const startX = i * step;
      const endX = (i + 1) * step;
      const midX = startX + step / 2;

      // Staggered delay for continuous flowing wave of glowing & dimming
      const delay = (i * 0.26) % 2.4;
      const duration = 2.1 + ((i * 0.22) % 0.8);
      const tintType = i % 3; // 0 = luminous white, 1 = warm pearl, 2 = cool crystal silver

      list.push({
        id: i,
        startX,
        endX,
        midX,
        dip,
        delay: delay.toFixed(2),
        duration: duration.toFixed(2),
        tintType,
      });
    }
    return list;
  }, [count, isMobile]);

  return (
    <>
      <style>{`
        /* Continuous glow and dim animation */
        @keyframes continuousGlowDim {
          0%, 100% {
            opacity: 1;
            transform: scale(1.1);
            filter: drop-shadow(0 0 5px #ffffff) drop-shadow(0 0 12px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 24px rgba(255, 255, 255, 0.6));
          }
          50% {
            opacity: 0.35;
            transform: scale(0.85);
            filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.4)) drop-shadow(0 0 5px rgba(255, 255, 255, 0.2));
          }
        }

        .fairy-lights-root {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: ${isMobile ? '32px' : '44px'};
          pointer-events: none;
          z-index: 1050; /* Above Navbar (1000) so it is prominently visible */
          overflow: visible;
          user-select: none;
        }

        .fairy-wire-path {
          stroke: rgba(255, 255, 255, 0.42);
          stroke-width: ${isMobile ? '1.3' : '1.7'};
          fill: none;
          stroke-linecap: round;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
        }

        .fairy-bulb-unit {
          transform-box: fill-box;
          transform-origin: center center;
          animation-name: continuousGlowDim;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
          will-change: transform, opacity, filter;
        }
      `}</style>

      <div className="fairy-lights-root" aria-hidden="true">
        <svg
          viewBox={`0 0 1000 ${viewBoxHeight}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            {/* Crisp radiant white gradient */}
            <radialGradient id="fgWhite" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="45%" stopColor="#fafafa" stopOpacity="0.95" />
              <stop offset="85%" stopColor="#e4e4e7" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#a1a1aa" stopOpacity="0.7" />
            </radialGradient>

            {/* Warm incandescent pearl gradient */}
            <radialGradient id="fgPearl" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="45%" stopColor="#fffbf0" stopOpacity="0.95" />
              <stop offset="85%" stopColor="#fef08a" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#d4d4d8" stopOpacity="0.7" />
            </radialGradient>

            {/* Icy diamond silver gradient */}
            <radialGradient id="fgSilver" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="45%" stopColor="#f1f5f9" stopOpacity="0.95" />
              <stop offset="85%" stopColor="#cbd5e1" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0.7" />
            </radialGradient>
          </defs>

          {segments.map((seg) => {
            const x0 = seg.startX;
            const x1 = seg.endX;
            const xm = seg.midX;
            const ym = seg.dip;

            const bulbFill =
              seg.tintType === 0
                ? 'url(#fgWhite)'
                : seg.tintType === 1
                ? 'url(#fgPearl)'
                : 'url(#fgSilver)';

            const bulbRadius = isMobile ? 4.8 : 6.2;
            const socketW = isMobile ? 3.0 : 4.0;
            const socketH = isMobile ? 3.2 : 4.4;

            return (
              <g key={seg.id}>
                {/* Suspension wire catenary swag */}
                <path
                  d={`M ${x0} 0 Q ${xm} ${ym * 1.45} ${x1} 0`}
                  className="fairy-wire-path"
                />

                {/* Little anchor clips at wire joints */}
                <circle cx={x0} cy={0} r={1.2} fill="rgba(255,255,255,0.6)" />

                {/* Hanging bulb unit positioned at the lowest point of the swag */}
                <g
                  className="fairy-bulb-unit"
                  style={{
                    animationDuration: `${seg.duration}s`,
                    animationDelay: `${seg.delay}s`,
                  }}
                >
                  {/* Socket cap / brass holder */}
                  <rect
                    x={xm - socketW / 2}
                    y={ym - 0.5}
                    width={socketW}
                    height={socketH}
                    rx={0.8}
                    fill="rgba(120, 120, 135, 0.95)"
                    stroke="rgba(255, 255, 255, 0.35)"
                    strokeWidth={0.5}
                  />

                  {/* Glass bulb body */}
                  <circle
                    cx={xm}
                    cy={ym + socketH + bulbRadius - 1.2}
                    r={bulbRadius}
                    fill={bulbFill}
                  />

                  {/* Bright central filament highlight */}
                  <circle
                    cx={xm - 0.8}
                    cy={ym + socketH + bulbRadius - 2.0}
                    r={bulbRadius * 0.32}
                    fill="#ffffff"
                    opacity={0.98}
                  />

                  {/* Soft ambient floor light aura */}
                  <ellipse
                    cx={xm}
                    cy={ym + socketH + bulbRadius + 3}
                    rx={bulbRadius * 2.2}
                    ry={bulbRadius * 1.1}
                    fill="rgba(255, 255, 255, 0.16)"
                  />
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
}
