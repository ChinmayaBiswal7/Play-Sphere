/**
 * PlaySphere Cinematic Boot Intro Animation v2
 * - Sphere forms from swirling energy particles
 * - Core glow fades INTO the sphere (no permanent orb)
 * - Orbital rings draw themselves with comet heads
 * - After draw-in: rings get persistent spinning electron dots + slow tilt drift
 * - Wordmark types in, prompt fades
 */

(function () {
  'use strict';

  function startIntroAnimation() {
    const canvas = document.getElementById('ps5-intro-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W, H, cx, cy, SPHERE_R, RING1_RX, RING1_RY, RING2_RX, RING2_RY;

    function resize() {
      W  = canvas.width  = window.innerWidth;
      H  = canvas.height = window.innerHeight;
      cx = W / 2;
      cy = H / 2 - 30;
      SPHERE_R  = Math.min(W, H) * 0.075;
      RING1_RX  = SPHERE_R * 1.80;
      RING1_RY  = SPHERE_R * 0.50;
      RING2_RX  = SPHERE_R * 1.60;
      RING2_RY  = SPHERE_R * 0.50;
    }
    resize();
    window.addEventListener('resize', resize);

    // ── Timeline (seconds) ─────────────────────────────
    const T = {
      particleStart: 0.0,
      coreFlash:     1.4,
      sphereForm:    1.6,
      burst:         2.4,
      ring1Start:    2.6,
      ring1End:      3.8,
      ring2Start:    3.0,
      ring2End:      4.2,
      wordStart:     4.5,
      wordEnd:       5.6,
      promptFade:    6.0,
    };

    // Base tilt angles for the two rings (fixed in space)
    const TILT1 = -0.50; // ~-28.6°
    const TILT2 =  0.50; // ~+28.6°

    let elapsed  = 0;
    let lastTime = null;
    let raf      = null;
    let done     = false;

    const WORDMARK  = 'PLAYSPHERE';
    const WORD_SPLIT = 4;

    // ── Energy particles ───────────────────────────────
    const NUM_P = 160;
    const particles = Array.from({ length: NUM_P }, (_, i) => ({
      angle: Math.random() * Math.PI * 2,
      dist:  SPHERE_R * (2.5 + Math.random() * 3.5),
      speed: 0.5 + Math.random() * 0.6,
      size:  0.8 + Math.random() * 1.8,
      hue:   200 + Math.random() * 50,
    }));

    // ── Burst state ────────────────────────────────────
    let burstR = 0, burstAlpha = 0, burstFired = false;

    // ── Helpers ────────────────────────────────────────
    function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function tP(start, end) {
      if (elapsed < start) return 0;
      if (elapsed >= end)  return 1;
      return (elapsed - start) / (end - start);
    }
    // Point on a tilted ellipse at parametric angle a
    function ellipsePoint(a, rx, ry, tilt) {
      return {
        x: cx + Math.cos(a) * rx * Math.cos(tilt) - Math.sin(a) * ry * Math.sin(tilt),
        y: cy + Math.cos(a) * rx * Math.sin(tilt) + Math.sin(a) * ry * Math.cos(tilt),
      };
    }

    // ── Draw a partial ellipse arc with glow + comet head ──────
    function drawEllipseArc(rx, ry, tilt, arcFrac, color, glowColor, lineW) {
      if (arcFrac <= 0) return;
      const arcStart = -Math.PI;
      const arcEnd   = -Math.PI + Math.PI * 2 * Math.min(arcFrac, 1);
      const steps    = 140;

      ctx.save();

      // Glow pass
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = arcStart + (arcEnd - arcStart) * (i / steps);
        const p = ellipsePoint(a, rx, ry, tilt);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle   = glowColor.replace('A)', `${0.22})`);
      ctx.lineWidth     = lineW * 3.5;
      ctx.shadowColor   = glowColor.replace('A)', '1)');
      ctx.shadowBlur    = 20;
      ctx.globalAlpha   = 0.6;
      ctx.stroke();

      // Crisp line
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = arcStart + (arcEnd - arcStart) * (i / steps);
        const p = ellipsePoint(a, rx, ry, tilt);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth   = lineW;
      ctx.shadowBlur  = 8;
      ctx.globalAlpha = arcFrac;
      ctx.stroke();

      // Comet head at arc tip
      if (arcFrac < 1) {
        const head = ellipsePoint(arcEnd, rx, ry, tilt);
        const hg = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, lineW * 4);
        hg.addColorStop(0,   'rgba(255,255,255,0.95)');
        hg.addColorStop(0.4, color.replace('1)', '0.7)'));
        hg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(head.x, head.y, lineW * 4, 0, Math.PI * 2);
        ctx.fillStyle = hg;
        ctx.shadowBlur = 24;
        ctx.shadowColor = glowColor.replace('A)', '1)');
        ctx.globalAlpha = 1;
        ctx.fill();
      }

      ctx.restore();
    }

    // ── Draw a full spinning ring + orbiting electron ────────────
    function drawLiveRing(rx, ry, tilt, alpha, electronAngle, mainColor, electronColor, lineW) {
      if (alpha <= 0) return;
      const steps = 160;

      ctx.save();

      // Ring glow
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = -Math.PI + (Math.PI * 2 * i / steps);
        const p = ellipsePoint(a, rx, ry, tilt);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.strokeStyle = mainColor.replace('1)', `${alpha * 0.18})`);
      ctx.lineWidth   = lineW * 3;
      ctx.shadowColor = mainColor.replace('1)', '1)');
      ctx.shadowBlur  = 18;
      ctx.globalAlpha = alpha;
      ctx.stroke();

      // Crisp ring
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = -Math.PI + (Math.PI * 2 * i / steps);
        const p = ellipsePoint(a, rx, ry, tilt);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.strokeStyle = mainColor.replace('1)', `${alpha * 0.7})`);
      ctx.lineWidth   = lineW;
      ctx.shadowBlur  = 5;
      ctx.globalAlpha = alpha;
      ctx.stroke();

      // Orbiting electron dot
      const ep = ellipsePoint(electronAngle, rx, ry, tilt);
      // Tail — draw a few trailing dots
      for (let t = 1; t <= 8; t++) {
        const ta = electronAngle - (t * 0.12);
        const tp = ellipsePoint(ta, rx, ry, tilt);
        const tailAlpha = alpha * (1 - t / 9) * 0.6;
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, lineW * (1.5 - t * 0.12), 0, Math.PI * 2);
        ctx.fillStyle   = electronColor.replace('1)', `${tailAlpha})`);
        ctx.shadowColor = electronColor.replace('1)', '1)');
        ctx.shadowBlur  = 12;
        ctx.globalAlpha = tailAlpha;
        ctx.fill();
      }
      // Main electron
      const eg = ctx.createRadialGradient(ep.x, ep.y, 0, ep.x, ep.y, lineW * 5);
      eg.addColorStop(0,   'rgba(255,255,255,1.0)');
      eg.addColorStop(0.3, electronColor.replace('1)', '0.85)'));
      eg.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, lineW * 5, 0, Math.PI * 2);
      ctx.fillStyle   = eg;
      ctx.shadowColor = electronColor.replace('1)', '1)');
      ctx.shadowBlur  = 25;
      ctx.globalAlpha = alpha;
      ctx.fill();

      ctx.restore();
    }

    // ── Main draw loop ─────────────────────────────────
    function draw(ts) {
      if (done) return;
      if (lastTime === null) lastTime = ts;
      const dt = Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      elapsed += dt;

      ctx.clearRect(0, 0, W, H);

      const sphereP    = tP(T.sphereForm,  T.sphereForm + 1.0);
      const coreP      = tP(T.coreFlash,   T.coreFlash  + 0.5);
      const particleT  = tP(T.particleStart, T.sphereForm + 0.4);
      const ring1P     = ease(tP(T.ring1Start, T.ring1End));
      const ring2P     = ease(tP(T.ring2Start, T.ring2End));

      // ── 1. ENERGY PARTICLES ──────────────────────────
      if (particleT < 1) {
        const progress = ease(particleT);
        particles.forEach((p, i) => {
          const curDist = p.dist * (1 - progress * 0.92);
          const spin    = p.angle + elapsed * p.speed * 1.8;
          const x = cx + Math.cos(spin) * curDist;
          const y = cy + Math.sin(spin) * curDist * 0.55;
          const fade = (1 - progress) * (0.45 + 0.55 * Math.abs(Math.sin(elapsed * 2.5 + i)));
          ctx.beginPath();
          ctx.arc(x, y, p.size * (1 - progress * 0.7), 0, Math.PI * 2);
          ctx.fillStyle   = `hsla(${p.hue}, 90%, 75%, ${fade})`;
          ctx.shadowColor = `hsla(${p.hue}, 100%, 80%, 0.7)`;
          ctx.shadowBlur  = 7;
          ctx.globalAlpha = fade;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.shadowBlur  = 0;
        });
      }

      // ── 2. AMBIENT GLOW ─────────────────────────────
      if (sphereP > 0) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, SPHERE_R * 3.8);
        g.addColorStop(0,   `rgba(59,130,246,${ease(sphereP) * 0.30})`);
        g.addColorStop(0.5, `rgba(99,102,241,${ease(sphereP) * 0.10})`);
        g.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, SPHERE_R * 3.8, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.globalAlpha = 1;
        ctx.fill();
      }

      // ── 3. SPHERE BODY ──────────────────────────────
      if (sphereP > 0) {
        const sAlpha = ease(sphereP);
        const sR     = SPHERE_R * ease(sphereP);

        ctx.save();
        ctx.globalAlpha = sAlpha;

        // Outer soft glow
        const og = ctx.createRadialGradient(cx, cy, sR * 0.5, cx, cy, sR * 1.6);
        og.addColorStop(0, 'rgba(59,130,246,0.25)');
        og.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, sR * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = og;
        ctx.fill();

        // Sphere surface
        const sg = ctx.createRadialGradient(
          cx - sR * 0.3, cy - sR * 0.35, sR * 0.04,
          cx, cy, sR
        );
        sg.addColorStop(0.00, '#ffffff');
        sg.addColorStop(0.14, '#bfdbfe');
        sg.addColorStop(0.42, '#3b82f6');
        sg.addColorStop(0.70, '#1e40af');
        sg.addColorStop(1.00, '#0c1535');
        ctx.beginPath();
        ctx.arc(cx, cy, sR, 0, Math.PI * 2);
        ctx.fillStyle   = sg;
        ctx.shadowColor = 'rgba(59,130,246,0.85)';
        ctx.shadowBlur  = sR * 0.75;
        ctx.fill();
        ctx.shadowBlur  = 0;

        // Specular highlight
        const spec = ctx.createRadialGradient(
          cx - sR * 0.26, cy - sR * 0.30, 0,
          cx - sR * 0.26, cy - sR * 0.30, sR * 0.48
        );
        spec.addColorStop(0, 'rgba(255,255,255,0.68)');
        spec.addColorStop(0.5,'rgba(255,255,255,0.10)');
        spec.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, sR, 0, Math.PI * 2);
        ctx.fillStyle = spec;
        ctx.fill();

        // Rim
        ctx.beginPath();
        ctx.arc(cx, cy, sR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth   = 1.2;
        ctx.stroke();

        ctx.restore();
      }

      // ── 4. CORE GLOW — only during formation, fades out ──
      // Core is visible only while forming; it fades to 0 once sphere is fully formed
      const coreVisible = coreP * (1 - Math.min(1, (elapsed - T.coreFlash - 1.0) / 0.6));
      if (coreVisible > 0.01) {
        const coreR = SPHERE_R * 0.18 * coreP;
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        cg.addColorStop(0,   'rgba(255,255,255,0.92)');
        cg.addColorStop(0.4, 'rgba(186,230,253,0.5)');
        cg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fillStyle   = cg;
        ctx.globalAlpha = coreVisible;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur  = 22;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur  = 0;
      }

      // ── 5. BURST ────────────────────────────────────
      if (!burstFired && elapsed >= T.burst) {
        burstFired = true;
        burstR = SPHERE_R;
        burstAlpha = 1.0;
      }
      if (burstFired && burstAlpha > 0) {
        burstR    += dt * SPHERE_R * 5.0;
        burstAlpha = Math.max(0, burstAlpha - dt * 2.0);
        ctx.beginPath();
        ctx.arc(cx, cy, burstR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(147,197,253,${burstAlpha})`;
        ctx.lineWidth   = 3 * burstAlpha;
        ctx.shadowColor = '#93c5fd';
        ctx.shadowBlur  = 20 * burstAlpha;
        ctx.globalAlpha = burstAlpha;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur  = 0;

        const b2A = burstAlpha * 0.45;
        ctx.beginPath();
        ctx.arc(cx, cy, burstR * 1.35, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(99,102,241,${b2A})`;
        ctx.lineWidth   = 1.2;
        ctx.globalAlpha = b2A;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // ── 6. ORBITAL RINGS ────────────────────────────
      // Electron orbit angles — different speeds, opposite directions
      const eAngle1 =  elapsed * 2.0;        // ring 1: forward
      const eAngle2 = -elapsed * 1.5 + 1.0;  // ring 2: reverse

      if (ring1P > 0) {
        if (ring1P < 1) {
          // Drawing in
          drawEllipseArc(RING1_RX, RING1_RY, TILT1, ring1P, 'rgba(59,130,246,1)', 'rgba(96,165,250,A)', 2.6);
        } else {
          // Fully drawn — live spinning ring
          drawLiveRing(RING1_RX, RING1_RY, TILT1, 1.0, eAngle1, 'rgba(59,130,246,1)', 'rgba(96,165,250,1)', 2.0);
        }
      }

      if (ring2P > 0) {
        if (ring2P < 1) {
          // Drawing in
          drawEllipseArc(RING2_RX, RING2_RY, TILT2, ring2P, 'rgba(129,140,248,1)', 'rgba(167,139,250,A)', 2.2);
        } else {
          // Fully drawn — live spinning ring
          drawLiveRing(RING2_RX, RING2_RY, TILT2, 1.0, eAngle2, 'rgba(129,140,248,1)', 'rgba(196,181,253,1)', 1.8);
        }
      }

      // ── 7. WORDMARK ─────────────────────────────────
      const wordP = tP(T.wordStart, T.wordEnd);
      if (wordP > 0) {
        const typedChars = Math.floor(wordP * WORDMARK.length);
        const wordY    = cy + SPHERE_R + 62;
        const fontSize = Math.max(14, Math.min(20, W * 0.019));

        ctx.save();
        ctx.font         = `800 ${fontSize}px 'Outfit', sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha  = Math.min(1, wordP * 2);

        const play   = WORDMARK.slice(0, Math.min(typedChars, WORD_SPLIT));
        const sphere = typedChars > WORD_SPLIT ? WORDMARK.slice(WORD_SPLIT, typedChars) : '';
        const cursor = typedChars < WORDMARK.length ? '|' : '';

        // Measure total width for centering
        ctx.font = `800 ${fontSize}px 'Outfit', sans-serif`;
        const spaceW   = fontSize * 0.32 * WORDMARK.length;
        const playW    = play   ? ctx.measureText(play).width   : 0;
        const sphereW  = sphere ? ctx.measureText(sphere).width : 0;
        const totalW   = ctx.measureText(WORDMARK).width + spaceW;
        const startX   = cx - totalW / 2;

        // PLAY — white
        if (play) {
          ctx.fillStyle   = '#ffffff';
          ctx.shadowColor = 'rgba(255,255,255,0.5)';
          ctx.shadowBlur  = 10;
          ctx.fillText(play, cx - (sphere || cursor ? (sphereW + fontSize) / 2 : 0), wordY);
        }
        // SPHERE — blue
        if (sphere) {
          ctx.fillStyle   = '#60a5fa';
          ctx.shadowColor = '#3b82f6';
          ctx.shadowBlur  = 14;
          ctx.fillText(sphere, cx + (playW + fontSize) / 2, wordY);
        }
        // Blinking cursor
        if (cursor && Math.sin(elapsed * 9) > 0) {
          ctx.fillStyle  = '#60a5fa';
          ctx.shadowBlur = 6;
          ctx.fillText(cursor, cx + (playW + sphereW + fontSize) / 2 + 2, wordY);
        }
        ctx.restore();
      }

      // ── 8. PROMPT ───────────────────────────────────
      const promptA = tP(T.promptFade, T.promptFade + 0.8);
      const btn = document.getElementById('ps5-boot-btn');
      if (btn) btn.style.opacity = promptA;

      // Subtle horizontal scanline sweep during formation
      if (sphereP < 1 && sphereP > 0.1) {
        const scanY = ((elapsed * 200) % (H * 1.2)) - H * 0.1;
        const sg = ctx.createLinearGradient(0, scanY, 0, scanY + 60);
        sg.addColorStop(0, 'rgba(96,165,250,0)');
        sg.addColorStop(0.5, `rgba(96,165,250,${(1 - sphereP) * 0.045})`);
        sg.addColorStop(1, 'rgba(96,165,250,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(0, scanY, W, 60);
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);

    window._stopIntroAnimation = function () {
      done = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }

  // Wait for canvas to be injected by ps5_dashboard.js or start immediately if already present
  const existingCanvas = document.getElementById('ps5-intro-canvas');
  if (existingCanvas) {
    startIntroAnimation();
  } else {
    const observer = new MutationObserver(() => {
      const canvas = document.getElementById('ps5-intro-canvas');
      if (canvas) {
        observer.disconnect();
        startIntroAnimation();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

})();
