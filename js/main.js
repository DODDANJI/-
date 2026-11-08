/* AGORA editorial page script.
   1. Pixel reveal: every <img data-reveal> is uncovered by a band of square cells
      that sweeps from top to bottom each time the image enters the screen.
   2. Film strip thumbnails turn into a pixel version on hover.
   3. The header timecode runs at 25 fps and drives the strip's progress bar. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- settings you can tune ---------- */
  const REVEAL = {
    cell: 20,          // size of one square cell, in CSS pixels
    band: 0.2,         // height of the cell band, as a share of the image height
    duration: 1600,    // milliseconds for one full sweep
    color: '#141414'   // colour of the cells
  };

  // Resolves once the image has loaded or failed; callers check naturalWidth.
  const ready = img => img.complete
    ? Promise.resolve()
    : new Promise(r => {
        img.addEventListener('load', r, { once: true });
        img.addEventListener('error', r, { once: true });
      });

  // Source rectangle that reproduces object-fit: cover for a w×h box.
  function coverRect(img, w, h) {
    const ir = img.naturalWidth / img.naturalHeight, cr = w / h;
    let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
    if (ir > cr) { sw = sh * cr; sx = (img.naturalWidth - sw) / 2; }
    else { sh = sw / cr; sy = (img.naturalHeight - sh) / 2; }
    return [sx, sy, sw, sh];
  }

  // Stable pseudo-random value per cell.
  const rand = (x, y) => {
    const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
    return v - Math.floor(v);
  };
  const smooth = (e0, e1, x) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };

  class Reveal {
    constructor(img) {
      this.img = img;
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'reveal';
      this.canvas.setAttribute('aria-hidden', 'true');
      img.after(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      this.progress = 0;
      this.raf = 0;
      img.style.visibility = 'hidden';
    }
    size() {
      const r = this.canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = r.width; this.h = r.height;
      this.canvas.width = Math.round(r.width * dpr);
      this.canvas.height = Math.round(r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.cols = Math.max(1, Math.ceil(this.w / REVEAL.cell));
      this.rows = Math.max(1, Math.ceil(this.h / REVEAL.cell));
      this.src = coverRect(this.img, this.w, this.h);
    }
    draw() {
      const { ctx, w, h, rows, cols } = this;
      const H = REVEAL.band, cell = REVEAL.cell;
      // the band's centre travels from just above the top (1 + H) to just below the bottom (-H)
      const line = (1 + H) - this.progress * (1 + 2 * H);
      ctx.clearRect(0, 0, w, h);

      // rows whose height (1 at top, 0 at bottom) is at or above the line show the image
      let visibleRows = 0;
      for (let r = 0; r < rows; r++) {
        const gy = 1 - (r + 1) / rows;
        if (gy >= line) visibleRows = r + 1; else break;
      }
      if (visibleRows > 0) {
        const vh = Math.min(h, visibleRows * cell);
        const [sx, sy, sw, sh] = this.src;
        ctx.drawImage(this.img, sx, sy, sw, sh * (vh / h), 0, 0, w, vh);
      }

      // the band: cells near the line, thinned out at random
      ctx.fillStyle = REVEAL.color;
      for (let r = 0; r < rows; r++) {
        const gy = 1 - (r + 1) / rows;
        const d = Math.abs(gy - line);
        if (d > H) continue;
        for (let c = 0; c < cols; c++) {
          const rnd = rand(c / cols, gy);
          const edge = d <= H * rnd ? 1 : 0;
          const a = Math.min(1, Math.max(0, smooth(H, 0, d) + rnd - 0.5 * (1 - edge)));
          if (a <= 0.01) continue;
          ctx.globalAlpha = a;
          ctx.fillRect(c * cell, r * cell, cell + 0.5, cell + 0.5);
        }
      }
      ctx.globalAlpha = 1;
    }
    play() {
      cancelAnimationFrame(this.raf);
      // a missing image is shown as the browser would, never left hidden
      if (!this.img.naturalWidth) { this.img.style.visibility = ''; this.canvas.hidden = true; return; }
      this.img.style.visibility = 'hidden';
      this.canvas.hidden = false;
      this.size();
      const start = performance.now();
      const step = now => {
        this.progress = Math.min(1, (now - start) / REVEAL.duration);
        this.draw();
        if (this.progress < 1) this.raf = requestAnimationFrame(step);
        else { this.img.style.visibility = ''; this.canvas.hidden = true; }
      };
      this.raf = requestAnimationFrame(step);
    }
    reset() {
      cancelAnimationFrame(this.raf);
      this.progress = 0;
      this.img.style.visibility = 'hidden';
      this.canvas.hidden = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  if (!reduce && 'IntersectionObserver' in window) {
    const items = new Map();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const rv = items.get(e.target);
        if (!rv) return;
        // play each time the image comes on screen, reset once it has fully left
        if (e.isIntersecting) ready(rv.img).then(() => rv.play());
        else rv.reset();
      });
    }, { threshold: 0 });
    document.querySelectorAll('img[data-reveal]').forEach(img => {
      const rv = new Reveal(img);
      items.set(img, rv);
      io.observe(img);
    });
  }

  /* ---------- film strip: pixel thumbnails on hover ---------- */
  function pixelate(canvas, img, cols) {
    const w = canvas.width = Math.max(1, cols);
    const h = canvas.height = Math.max(1, Math.round(cols * canvas.clientHeight / Math.max(1, canvas.clientWidth)));
    const [sx, sy, sw, sh] = coverRect(img, w, h);
    canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  }
  document.querySelectorAll('.reel .thumb').forEach(t => {
    const img = t.querySelector('img');
    const c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    t.append(c);
    ready(img).then(() => { if (img.naturalWidth) pixelate(c, img, 16); });
  });

  /* ---------- header timecode and strip progress ---------- */
  const tcEl = document.getElementById('cover-tc');
  const bar = document.getElementById('progress');
  if (tcEl && bar) {
    const total = 130 * 25;      // the reel is 2 min 10 s long
    let f = 8 * 25;              // start at 00:00:08:00
    const pad = n => String(n).padStart(2, '0');
    const draw = () => {
      const s = Math.floor(f / 25);
      tcEl.textContent = `00:${pad(Math.floor(s / 60))}:${pad(s % 60)}:${pad(f % 25)}`;
      bar.style.width = (f / total * 100).toFixed(2) + '%';
    };
    draw();
    if (!reduce) setInterval(() => { f = (f + 1) % total; draw(); }, 40);
  }
})();
