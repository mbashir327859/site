'use strict';
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, vx: 0, vy: 0, active: false, hovering: false };
  const bursts = []; // shared by sky + cursor: supernova events

  const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  const sup = (n) => String(n).split('').map((c) => SUP[c] || c).join('');
  const pow10 = (log) => {
    const e = Math.floor(log + 1e-9);
    const m = Math.pow(10, log - e);
    return m < 1.05 ? `10${sup(e)}` : `${m.toFixed(1)} × 10${sup(e)}`;
  };
  const WORDS = [[12, 'trillion'], [9, 'billion'], [6, 'million'], [3, 'thousand']];
  const words = (log) => {
    if (log >= 15) return pow10(log);
    for (const [e, w] of WORDS) if (log >= e) {
      const v = Math.pow(10, log - e);
      return `${v >= 100 ? Math.round(v) : v.toFixed(v >= 10 ? 0 : 1)} ${w}`;
    }
    return Math.round(Math.pow(10, log)).toLocaleString('en-US');
  };

  /* ---------- Canvas helpers ---------- */
  function fitCanvas(c) {
    c.width = innerWidth * DPR; c.height = innerHeight * DPR;
    const ctx = c.getContext('2d'); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); return ctx;
  }

  /* ---------- Sky: stars that lean toward the pointer ---------- */
  const sky = document.getElementById('sky');
  let skyCtx = fitCanvas(sky);
  let stars = [];
  const nebulae = [
    { x: 0.15, y: 0.25, r: 0.45, c: '255,111,174', a: 0.10 },
    { x: 0.85, y: 0.7, r: 0.5, c: '95,227,208', a: 0.08 },
    { x: 0.55, y: 0.1, r: 0.35, c: '150,110,255', a: 0.10 }
  ];
  function seedStars() {
    const n = Math.round((innerWidth * innerHeight) / 4200);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      ox: 0, oy: 0, r: Math.random() * 1.4 + 0.2,
      depth: Math.random() * 0.8 + 0.2, tw: Math.random() * Math.PI * 2,
      hue: Math.random() < 0.15 ? (Math.random() < 0.5 ? '255,198,92' : '95,227,208') : '241,236,251'
    }));
  }
  seedStars();

  function drawSky(t) {
    const w = innerWidth, h = innerHeight;
    skyCtx.clearRect(0, 0, w, h);
    const scrollShift = scrollY * 0.05;
    for (const n of nebulae) {
      const drift = reduceMotion ? 0 : Math.sin(t / 9000 + n.x * 10) * 30;
      const cx = n.x * w + drift, cy = n.y * h + drift * 0.5 - scrollShift;
      const g = skyCtx.createRadialGradient(cx, cy, 0, cx, cy, n.r * Math.max(w, h));
      g.addColorStop(0, `rgba(${n.c},${n.a})`); g.addColorStop(1, `rgba(${n.c},0)`);
      skyCtx.fillStyle = g; skyCtx.fillRect(0, 0, w, h);
    }
    for (const s of stars) {
      let tx = 0, ty = 0;
      if (pointer.active) {
        const dx = pointer.x - s.x, dy = pointer.y - s.y, d2 = dx * dx + dy * dy;
        if (d2 < 220 * 220) { const f = (1 - Math.sqrt(d2) / 220) * 28 * s.depth; const d = Math.sqrt(d2) || 1; tx = dx / d * f; ty = dy / d * f; }
      }
      for (const b of bursts) {
        const dx = s.x - b.x, dy = s.y - b.y, d = Math.hypot(dx, dy) || 1;
        const wave = Math.abs(d - b.radius);
        if (wave < 60) { const f = (1 - wave / 60) * 22 * b.life; tx += dx / d * f; ty += dy / d * f; }
      }
      s.ox += (tx - s.ox) * 0.08; s.oy += (ty - s.oy) * 0.08;
      const tw = reduceMotion ? 1 : 0.6 + 0.4 * Math.sin(t / 700 + s.tw);
      const py = ((s.y - scrollY * 0.15 * s.depth) % h + h) % h;
      skyCtx.fillStyle = `rgba(${s.hue},${0.35 + 0.55 * tw * s.depth})`;
      skyCtx.beginPath(); skyCtx.arc(s.x + s.ox, py + s.oy, s.r, 0, Math.PI * 2); skyCtx.fill();
    }
  }

  /* ---------- Living cursor: a comet with two moons ---------- */
  const cLayer = document.getElementById('cursor-layer');
  let cCtx = fitCanvas(cLayer);
  const tail = Array.from({ length: 18 }, () => ({ x: pointer.x, y: pointer.y }));
  const sparks = [];
  let headSize = 7;

  if (finePointer && !reduceMotion) document.body.classList.add('has-live-cursor');

  addEventListener('pointermove', (e) => {
    pointer.vx = e.clientX - pointer.x; pointer.vy = e.clientY - pointer.y;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
    pointer.hovering = !!e.target.closest && !!e.target.closest('a, button, input, [tabindex]');
    const speed = Math.hypot(pointer.vx, pointer.vy);
    if (!reduceMotion) for (let i = 0; i < Math.min(4, speed / 6); i++) {
      sparks.push({ x: pointer.x, y: pointer.y, vx: (Math.random() - 0.5) * 1.6 - pointer.vx * 0.05,
        vy: (Math.random() - 0.5) * 1.6 - pointer.vy * 0.05, life: 1, hue: Math.random() < 0.5 ? '255,111,174' : '95,227,208' });
    }
  }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.active = false; });

  addEventListener('pointerdown', (e) => {
    if (reduceMotion || e.target.closest('input, button, a')) return;
    bursts.push({ x: e.clientX, y: e.clientY, radius: 0, life: 1 });
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2, v = Math.random() * 6 + 1.5;
      sparks.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.4,
        hue: ['255,198,92', '255,111,174', '241,236,251'][i % 3] });
    }
  });

  function drawCursor(t) {
    const w = innerWidth, h = innerHeight;
    cCtx.clearRect(0, 0, w, h);
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]; b.radius += 9; b.life -= 0.012;
      if (b.life <= 0) { bursts.splice(i, 1); continue; }
      cCtx.strokeStyle = `rgba(255,198,92,${b.life * 0.6})`; cCtx.lineWidth = 2;
      cCtx.beginPath(); cCtx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); cCtx.stroke();
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]; s.x += s.vx; s.y += s.vy; s.vx *= 0.96; s.vy *= 0.96; s.life -= 0.02;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      cCtx.fillStyle = `rgba(${s.hue},${Math.min(1, s.life)})`;
      cCtx.beginPath(); cCtx.arc(s.x, s.y, 1.6 * Math.min(1, s.life) + 0.3, 0, Math.PI * 2); cCtx.fill();
    }
    if (!document.body.classList.contains('has-live-cursor') || !pointer.active) return;

    // Tail follows with a spring, so the comet bends as it turns.
    tail[0].x += (pointer.x - tail[0].x) * 0.55; tail[0].y += (pointer.y - tail[0].y) * 0.55;
    for (let i = 1; i < tail.length; i++) {
      tail[i].x += (tail[i - 1].x - tail[i].x) * 0.42; tail[i].y += (tail[i - 1].y - tail[i].y) * 0.42;
    }
    for (let i = tail.length - 1; i > 0; i--) {
      const k = 1 - i / tail.length;
      cCtx.strokeStyle = `rgba(95,227,208,${k * 0.55})`; cCtx.lineWidth = k * 9; cCtx.lineCap = 'round';
      cCtx.beginPath(); cCtx.moveTo(tail[i].x, tail[i].y); cCtx.lineTo(tail[i - 1].x, tail[i - 1].y); cCtx.stroke();
    }
    const target = pointer.hovering ? 14 : 7;
    headSize += (target - headSize) * 0.15;
    const pulse = 1 + Math.sin(t / 300) * 0.08;
    const g = cCtx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, headSize * 4 * pulse);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.25, 'rgba(255,111,174,0.6)'); g.addColorStop(1, 'rgba(255,111,174,0)');
    cCtx.fillStyle = g; cCtx.beginPath(); cCtx.arc(pointer.x, pointer.y, headSize * 4 * pulse, 0, Math.PI * 2); cCtx.fill();
    cCtx.fillStyle = '#ffffff'; cCtx.beginPath(); cCtx.arc(pointer.x, pointer.y, headSize * 0.45, 0, Math.PI * 2); cCtx.fill();
    // Two moons; they swing wider over clickable things.
    const orbit = headSize * 2.6;
    [[1, '255,198,92', 2.4], [-0.6, '95,227,208', 1.8]].forEach(([speed, c, r], i) => {
      const a = t / 400 * speed + i * Math.PI;
      cCtx.fillStyle = `rgba(${c},0.95)`;
      cCtx.beginPath(); cCtx.arc(pointer.x + Math.cos(a) * orbit * (1 + i * 0.4), pointer.y + Math.sin(a) * orbit * 0.6 * (1 + i * 0.4), r, 0, Math.PI * 2); cCtx.fill();
    });
    if (pointer.hovering) {
      cCtx.strokeStyle = 'rgba(255,198,92,0.7)'; cCtx.lineWidth = 1.5;
      cCtx.beginPath(); cCtx.arc(pointer.x, pointer.y, headSize * 2.2, t / 500, t / 500 + Math.PI * 1.4); cCtx.stroke();
    }
  }

  function frame(t) { drawSky(t); drawCursor(t); drawGalaxy(t); requestAnimationFrame(frame); }

  addEventListener('resize', () => { skyCtx = fitCanvas(sky); cCtx = fitCanvas(cLayer); seedStars(); });

  /* ---------- Hero count ---------- */
  function animateCount() {
    const el = document.getElementById('star-count');
    const final = el.textContent;
    if (reduceMotion) return;
    let step = 0;
    const id = setInterval(() => {
      step++;
      el.textContent = final.split('').map((c, i) => (c === ',' || i < step) ? c : String(Math.floor(Math.random() * 10))).join('');
      if (step > final.length) { clearInterval(id); el.textContent = final; }
    }, 45);
  }

  /* ---------- Spiral galaxy ---------- */
  const gCanvas = document.getElementById('galaxy-canvas');
  const gCtx = gCanvas.getContext('2d');
  const spin = document.getElementById('spin');
  const gStars = Array.from({ length: 2600 }, (_, i) => {
    const arm = i % 2, r = Math.pow(Math.random(), 0.6) * 290;
    const theta = Math.log(r + 8) * 2.4 + arm * Math.PI + (Math.random() - 0.5) * (0.9 - r / 600);
    return { r, theta, size: Math.random() * 1.3 + 0.3, warm: Math.random() < 0.3 + (1 - r / 290) * 0.5 };
  });
  let galaxyAngle = 0, lastT = 0;
  function drawGalaxy(t) {
    const dt = Math.min(50, t - lastT); lastT = t;
    if (!reduceMotion) galaxyAngle += dt * 0.00004 * Number(spin.value);
    const W = gCanvas.width, cx = W / 2, cy = W / 2;
    gCtx.clearRect(0, 0, W, W);
    const core = gCtx.createRadialGradient(cx, cy, 0, cx, cy, 90);
    core.addColorStop(0, 'rgba(255,230,190,0.9)'); core.addColorStop(1, 'rgba(255,198,92,0)');
    gCtx.fillStyle = core; gCtx.fillRect(0, 0, W, W);
    for (const s of gStars) {
      const a = s.theta + galaxyAngle * (300 / (s.r + 60)); // inner stars orbit faster
      gCtx.fillStyle = s.warm ? 'rgba(255,214,160,0.8)' : 'rgba(170,200,255,0.75)';
      gCtx.fillRect(cx + Math.cos(a) * s.r, cy + Math.sin(a) * s.r * 0.92, s.size, s.size);
    }
    const sunR = 290 * 0.52, sa = 1.1 + galaxyAngle * (300 / (sunR + 60));
    const sx = cx + Math.cos(sa) * sunR, sy = cy + Math.sin(sa) * sunR * 0.92;
    gCtx.strokeStyle = '#5fe3d0'; gCtx.lineWidth = 2; gCtx.beginPath(); gCtx.arc(sx, sy, 9, 0, Math.PI * 2); gCtx.stroke();
    gCtx.fillStyle = '#f1ecfb'; gCtx.font = '15px "Atkinson Hyperlegible", sans-serif'; gCtx.fillText('You are here', sx + 14, sy + 5);
  }

  /* ---------- Data-driven sections ---------- */
  const SCALE_MIN = -8, SCALE_MAX = 11;
  let FACTS = null;
  async function loadScale(model) {
    if (!FACTS || !Object.prototype.hasOwnProperty.call(FACTS.scaleModels, model)) throw new Error('scale');
    const data = FACTS.scaleModels[model];
    document.getElementById('scale-anchor').textContent = data.anchor;
    const list = document.getElementById('scale-list');
    list.replaceChildren(...data.items.map((it) => {
      const li = document.createElement('li');
      const pct = ((Math.log10(it.meters) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;
      const name = document.createElement('span'); name.className = 'scale-name'; name.textContent = it.name;
      const track = document.createElement('div'); track.className = 'scale-track';
      const orb = document.createElement('span'); orb.className = 'scale-orb'; orb.style.left = '0%';
      const label = document.createElement('span'); label.className = 'scale-label'; label.style.left = '0%';
      const b = document.createElement('b'); b.textContent = it.size;
      const sp = document.createElement('span'); sp.textContent = `  ${it.like}`;
      label.append(b, sp); track.append(orb, label); li.append(name, track);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        orb.style.left = `${pct}%`; label.style.left = `${Math.min(80, Math.max(12, pct))}%`;
      }));
      return li;
    }));
  }
  document.querySelectorAll('.tabs button').forEach((btn) => btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
    loadScale(btn.dataset.model).catch(showOffline);
  }));

  function renderGalaxy(f) {
    const facts = document.getElementById('galaxy-facts');
    const pairs = [['100–400 bn', 'stars'], [f.milkyWay.massSolar, 'solar masses, mostly dark matter'], ['26,000 ly', 'from the Sun to the center'], ['230 m yrs', 'for one solar orbit']];
    facts.replaceChildren(...pairs.map(([dt, dd]) => {
      const d = document.createElement('div'); const t = document.createElement('dt'); const e = document.createElement('dd');
      t.textContent = dt; e.textContent = dd; d.append(t, e); return d;
    }));
    const max = Math.log10(f.galaxies[0].sizeLy), min = Math.log10(f.milkyWay.diameterLy) - 0.3;
    document.getElementById('giants').replaceChildren(...f.galaxies.map((g) => {
      const li = document.createElement('li'); li.className = 'giant-row'; li.title = `${g.measure}: ${g.sizeLy.toLocaleString('en-US')} light-years`;
      const n = document.createElement('span'); n.textContent = g.name;
      const bar = document.createElement('span'); bar.className = 'giant-bar';
      const x = document.createElement('span'); x.className = 'giant-x'; x.textContent = `${Math.round(g.sizeLy / f.milkyWay.diameterLy)}×`;
      li.append(n, bar, x);
      setTimeout(() => { bar.style.width = `${((Math.log10(g.sizeLy) - min) / (max - min)) * 100}%`; }, 200);
      return li;
    }));
  }

  function renderLadder(f) {
    const svg = document.getElementById('ladder-svg');
    const NS = 'http://www.w3.org/2000/svg';
    const W = 1200, H = 360, L = 40, R = 1160, mid = 180, lo = 6, hi = 30;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const X = (e) => L + ((e - lo) / (hi - lo)) * (R - L);
    const el = (tag, attrs, text) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text) n.textContent = text; return n; };
    svg.replaceChildren(el('line', { x1: L, x2: R, y1: mid, y2: mid, class: 'tick', 'stroke-width': 2 }));
    for (let e = lo; e <= hi; e += 3) {
      svg.append(el('line', { x1: X(e), x2: X(e), y1: mid - 8, y2: mid + 8, class: 'tick', 'stroke-width': 2 }));
      svg.append(el('text', { x: X(e), y: mid + 30, 'text-anchor': 'middle', class: 'tick-label' }, `10${sup(e)}`));
    }
    const readout = document.getElementById('ladder-readout');
    f.ladder.forEach((item, i) => {
      const up = i % 2 === 0, len = 40 + (i % 4) * 28, y = up ? mid - len : mid + len + 20;
      const g = el('g', { class: `marker${item.exp >= 22 ? ' alt' : ''}`, tabindex: 0, role: 'button', 'aria-label': `${item.label}: ${item.text}` });
      g.append(el('line', { x1: X(item.exp), x2: X(item.exp), y1: mid, y2: up ? y + 6 : y - 18 }));
      g.append(el('circle', { cx: X(item.exp), cy: mid, r: 7 }));
      g.append(el('text', { x: X(item.exp), y: up ? y : y, 'text-anchor': 'middle' }, item.label.length > 26 ? item.label.slice(0, 24) + '…' : item.label));
      const show = () => { readout.textContent = `${item.label}: ${item.text}.`; };
      g.addEventListener('mouseenter', show); g.addEventListener('focus', show);
      svg.append(g);
    });
  }

  const starsExp = document.getElementById('stars-exp'), fraction = document.getElementById('fraction');
  let worldsTimer;
  function queueWorlds() {
    document.getElementById('stars-exp-out').textContent = pow10(Number(starsExp.value));
    document.getElementById('fraction-out').textContent = `${fraction.value}%`;
    clearTimeout(worldsTimer); worldsTimer = setTimeout(updateWorlds, 120);
  }
  // Runs in the browser: same validation the old API used.
  function computeHabitable(e, f) {
    if (!Number.isFinite(e) || e < 20 || e > 26) throw new RangeError('stars exponent must be between 20 and 26');
    if (!Number.isFinite(f) || f < 0.1 || f > 100) throw new RangeError('share must be between 0.1% and 100%');
    const worldsLog10 = e + Math.log10(f / 100);
    return { worldsLog10, perPersonLog10: worldsLog10 - Math.log10(FACTS.people.alive) };
  }
  function updateWorlds() {
    const err = document.getElementById('worlds-error');
    try {
      const data = computeHabitable(Number(starsExp.value), Number(fraction.value));
      err.textContent = '';
      document.getElementById('worlds-out').textContent = pow10(data.worldsLog10);
      document.getElementById('per-person-out').textContent = `about ${words(data.perPersonLog10)} for every person alive`;
    } catch (e) {
      err.textContent = `Couldn't calculate: ${e.message}.`;
    }
  }
  starsExp.addEventListener('input', queueWorlds); fraction.addEventListener('input', queueWorlds);

  const AGE = 4.54e9;
  function renderClock(f) {
    const svg = document.getElementById('clock'), NS = 'http://www.w3.org/2000/svg';
    const C = 200, Rr = 160, circ = 2 * Math.PI * Rr;
    const mk = (tag, attrs, text) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text) n.textContent = text; return n; };
    const fill = mk('circle', { cx: C, cy: C, r: Rr, class: 'ring-fill', transform: `rotate(-90 ${C} ${C})`, 'stroke-dasharray': circ, 'stroke-dashoffset': 0 });
    const hand = mk('line', { x1: C, y1: C, x2: C, y2: C - Rr + 30, class: 'hand' });
    svg.replaceChildren(mk('circle', { cx: C, cy: C, r: Rr, class: 'ring' }), fill, hand);
    f.earthDay.forEach((ev) => {
      const a = (1 - ev.yearsAgo / AGE) * 2 * Math.PI - Math.PI / 2;
      svg.append(mk('circle', { cx: C + Math.cos(a) * Rr, cy: C + Math.sin(a) * Rr, r: 6, class: 'ev' }));
    });
    const scrub = document.getElementById('clock-scrub');
    const update = () => {
      const m = Number(scrub.value), frac = m / 1440;
      fill.setAttribute('stroke-dashoffset', circ * (1 - frac));
      hand.setAttribute('transform', `rotate(${frac * 360} ${C} ${C})`);
      const yearsAgo = AGE * (1 - frac);
      let label;
      if (m >= 1440) label = '11:59:54 pm';
      else { const hh = Math.floor(m / 60), mm = m % 60, h12 = ((hh + 11) % 12) + 1; label = `${h12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`; }
      document.getElementById('clock-time').textContent = label;
      const past = f.earthDay.filter((ev) => ev.yearsAgo >= yearsAgo - 1);
      const last = past[past.length - 1];
      document.getElementById('clock-event').textContent = m >= 1440
        ? 'Homo sapiens appears just 6 seconds before midnight. All of recorded history fits in the last tenth of a second.'
        : `${words(Math.log10(Math.max(yearsAgo, 1)))} years ago. Latest milestone: ${last ? last.event.toLowerCase() : 'none yet'}.`;
    };
    scrub.addEventListener('input', update); update();
  }

  function renderLife(f) {
    const total = f.biomass.reduce((s, b) => s + b.gtC, 0);
    document.getElementById('biomass').replaceChildren(...f.biomass.map((b) => {
      const row = document.createElement('div'); row.className = 'bio-row';
      const n = document.createElement('span'); n.textContent = b.group;
      const bar = document.createElement('span'); bar.className = 'bio-bar';
      const p = document.createElement('span'); p.className = 'bio-pct';
      const pct = (b.gtC / total) * 100; p.textContent = pct < 1 ? `${pct.toFixed(2)}%` : `${Math.round(pct)}%`;
      row.append(n, bar, p); setTimeout(() => { bar.style.width = `${pct}%`; }, 200); return row;
    }));
    const alive = Math.round((f.people.alive / f.people.everBorn) * 100);
    document.getElementById('people-dots').replaceChildren(...Array.from({ length: 100 }, (_, i) => {
      const s = document.createElement('span'); if (i >= 100 - alive) s.className = 'alive'; return s;
    }));
    document.getElementById('sources').replaceChildren(...f.sources.map((s) => { const li = document.createElement('li'); li.textContent = s; return li; }));
  }

  function showOffline() {
    document.getElementById('api-status').textContent = "Couldn't load data/facts.json. If you opened index.html directly from disk, serve the folder instead (for example: python3 -m http.server), or view it on GitHub Pages.";
  }

  async function init() {
    animateCount();
    requestAnimationFrame(frame);
    try {
      const res = await fetch('data/facts.json');
      if (!res.ok) throw new Error('facts');
      const facts = await res.json();
      FACTS = facts;
      renderGalaxy(facts); renderLadder(facts); renderClock(facts); renderLife(facts);
      await loadScale('quarter'); queueWorlds();
    } catch { showOffline(); }
  }
  init();
})();
