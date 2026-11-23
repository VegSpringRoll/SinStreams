import { useEffect, useRef } from 'react';

/**
 * Ultra-lightweight, 60fps Canvas Snowflakes
 * Designed specifically for SinStreams' pure monochrome glassmorphism aesthetic.
 * Non-intrusive, zero-lag, stops animation when tab is in background.
 */
export default function Snowflakes() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isMobile = width <= 768;
    const flakeCount = isMobile ? 24 : 48;

    // Pre-allocated flake pool (avoids garbage collection during animation)
    const flakes = [];
    for (let i = 0; i < flakeCount; i++) {
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.6 + 0.8,
        alpha: Math.random() * 0.45 + 0.25,
        speedY: Math.random() * 0.65 + 0.35,
        swingAmp: Math.random() * 1.2 + 0.4,
        swingFreq: Math.random() * 0.015 + 0.005,
        swingAngle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        twinkleAngle: Math.random() * Math.PI * 2,
        isGlow: Math.random() > 0.8, // 20% of flakes have a subtle soft glow halo
      });
    }

    let isVisible = !document.hidden;

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(animationFrameId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (!canvas) return;
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }, 150);
    };
    window.addEventListener('resize', handleResize);

    let lastTime = performance.now();

    const render = (time) => {
      if (!isVisible) return;

      const delta = Math.min((time - lastTime) / 16.67, 2.0); // normalize around 60fps
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < flakeCount; i++) {
        const f = flakes[i];

        f.swingAngle += f.swingFreq * delta;
        f.twinkleAngle += f.twinkleSpeed * delta;

        f.y += f.speedY * delta;
        f.x += Math.sin(f.swingAngle) * (f.swingAmp * 0.5) * delta;

        // Wrap around seamlessly
        if (f.y > height + 10) {
          f.y = -10;
          f.x = Math.random() * width;
        }
        if (f.x > width + 10) {
          f.x = -10;
        } else if (f.x < -10) {
          f.x = width + 10;
        }

        const currentAlpha = f.alpha * (0.8 + 0.2 * Math.sin(f.twinkleAngle));

        // Core snowflake particle
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.fill();

        // Subtle soft halo for special flakes
        if (f.isGlow) {
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha * 0.18})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1,
        opacity: 0.85,
        willChange: 'transform',
      }}
      aria-hidden="true"
    />
  );
}
