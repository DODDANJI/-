// SmartGlass: 헤더 타임코드(분 : 초 : 프레임)와 사진이 화면에 들어올 때 떠오르는 효과

const FPS = 25; // 타임코드 프레임 수

// 1) 타임코드: 페이지를 연 뒤 흐른 시간을 "분 : 초 : 프레임"으로 보여줘요
const clocks = [...document.querySelectorAll('.tc')].map(tc => tc.querySelectorAll('.n'));
const start = performance.now();
const pad = n => String(n).padStart(2, '0');
function tick(now) {
  const f = Math.floor((now - start) / 1000 * FPS);
  const parts = [pad(Math.floor(f / FPS / 60) % 60), pad(Math.floor(f / FPS) % 60), pad(f % FPS)];
  for (const n of clocks) parts.forEach((p, i) => { if (n[i].textContent !== p) n[i].textContent = p; });
  requestAnimationFrame(tick);
}
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(tick);

// 2) 사진 떠오르기: class="reveal"이 붙은 사진만 적용돼요. 빼고 싶으면 그 사진에서 reveal을 지우세요
const io = new IntersectionObserver(entries => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// 3) 상단바: 지금 보고 있는 섹션의 메뉴에 밑줄, 상단바 색은 바로 아래 섹션에 맞춰요
const bar = document.querySelector('.topbar');
const links = [...document.querySelectorAll('.topbar .nav')];
const secObs = new IntersectionObserver(entries => {
  for (const e of entries) if (e.isIntersecting) {
    links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
  }
}, { rootMargin: '-45% 0px -54% 0px' });
document.querySelectorAll('section[id]').forEach(s => secObs.observe(s));
const bands = [...document.querySelectorAll('section[id]')];
function themeBar() {
  const y = bar.offsetHeight / 2;
  const s = bands.find(b => { const r = b.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
  if (s) bar.dataset.theme = s.id;
}
addEventListener('scroll', themeBar, { passive: true });
addEventListener('resize', themeBar);
themeBar();

// 4) 그리드 보기: 챕터에 들어가면 아래에 작은 그리드 버튼이 뜨고,
//    누르면 그 챕터 사진들이 제자리에서 날아와 그리드로 모여요 (GSAP Flip)
const GRID = {
  duration: 1,      // 한 장이 옮겨 가는 시간(초)
  stagger: 0.35,    // 첫 장과 마지막 장이 출발하는 시간 차(초). 클수록 더 쭈루룩
  from: 'start',    // 출발 순서: 'start' 앞에서부터, 'end' 뒤에서부터, 'center', 'random'
  flash: true,      // 크기 버튼으로 바꿀 때 살짝 흐려지고 밝아지는 효과
};
if (window.gsap && window.Flip) gsap.registerPlugin(Flip);
const dock = document.querySelector('.gdock');
const toggle = dock.querySelector('.gd-toggle');
const sizeBtns = [...dock.querySelectorAll('.gsize button')];
const view = document.querySelector('.gridview');
const grid = view.querySelector('.ggrid');
const chapters = [...document.querySelectorAll('.chapter1, .chapter2')];
const canFlip = () => window.Flip && !matchMedia('(prefers-reduced-motion: reduce)').matches;
const flipOpts = extra => ({ duration: GRID.duration, ease: 'expo.inOut', stagger: { amount: GRID.stagger, from: GRID.from }, ...extra });
let isOpen = false, busy = false, chapter = null, originals = [];

function chapterInView() {
  const y = innerHeight / 2;
  return chapters.find(c => { const r = c.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
}
function updateDock() {
  if (isOpen) return;
  const c = chapterInView();
  dock.classList.toggle('show', !!c);
  if (c) dock.dataset.theme = c.id;
}
addEventListener('scroll', updateDock, { passive: true });
addEventListener('resize', updateDock);
updateDock();

function setOpen(on) {
  isOpen = on;
  dock.classList.toggle('open', on);
  toggle.setAttribute('aria-pressed', on);
  toggle.setAttribute('aria-label', on ? '원래 화면으로' : '그리드로 보기');
}

function openGrid() {
  chapter = chapterInView();
  if (!chapter || busy) return;
  originals = [...chapter.querySelectorAll('img')];
  grid.innerHTML = originals.map((img, i) => {
    const r = img.getBoundingClientRect();
    img.dataset.flipId = 'g' + i;
    return `<figure class="gitem"><img src="${img.getAttribute('src')}" alt="${img.alt}" data-i="${i}" data-flip-id="g${i}" style="aspect-ratio:${(r.width / r.height).toFixed(4)}"><figcaption>${String(i + 1).padStart(2, '0')}</figcaption></figure>`;
  }).join('');
  const state = canFlip() ? Flip.getState(originals) : null;
  originals.forEach(img => { img.classList.add('in'); img.style.visibility = 'hidden'; });
  view.dataset.theme = dock.dataset.theme = bar.dataset.theme = chapter.id;
  view.hidden = false; view.scrollTop = 0;
  document.documentElement.classList.add('grid-open');
  setOpen(true);
  requestAnimationFrame(() => view.classList.add('on'));
  if (!state) return;
  busy = true;
  Flip.from(state, flipOpts({ targets: grid.querySelectorAll('img'), absolute: true, onComplete: () => { busy = false; } }));
}

function closeGrid() {
  if (busy) return;
  const state = canFlip() ? Flip.getState(grid.querySelectorAll('img')) : null;
  view.classList.remove('on');
  grid.style.visibility = 'hidden';
  originals.forEach(img => { img.style.visibility = ''; });
  const done = () => {
    view.hidden = true; grid.innerHTML = ''; grid.style.visibility = '';
    document.documentElement.classList.remove('grid-open', 'flipping');
    busy = false; setOpen(false); themeBar(); updateDock();
  };
  if (!state) return done();
  busy = true;
  document.documentElement.classList.add('flipping');
  Flip.from(state, flipOpts({ targets: originals, onComplete: done }));
}

toggle.addEventListener('click', () => (isOpen ? closeGrid() : openGrid()));
addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) closeGrid(); });

// 그리드 크기 버튼: 칸 수가 바뀌며 사진들이 차례로 새 자리로 미끄러져요
sizeBtns.forEach(btn => btn.addEventListener('click', () => {
  const size = btn.dataset.size;
  if (busy || size === grid.dataset.size) return;
  sizeBtns.forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', b === btn); });
  if (!canFlip()) { grid.dataset.size = size; return; }
  busy = true;
  const items = grid.querySelectorAll('.gitem');
  const state = Flip.getState(items);
  grid.dataset.size = size;
  const tl = Flip.from(state, flipOpts({ absolute: true, onComplete: () => { busy = false; } }));
  if (GRID.flash) tl.fromTo(items, { filter: 'blur(0px) brightness(100%)' }, {
    duration: GRID.duration, clearProps: 'filter', stagger: { amount: GRID.stagger, from: GRID.from },
    keyframes: [
      { filter: 'blur(6px) brightness(150%)', duration: GRID.duration * 0.45, ease: 'power2.in' },
      { filter: 'blur(0px) brightness(100%)', duration: GRID.duration * 0.55, ease: 'power2.out' },
    ],
  }, 0);
}));

// 5) 사진 크게 보기: 사진을 누르면 확대되고 오른쪽에 정보가 떠요. ← → 키로 넘기고 Esc로 닫아요
const lb = document.querySelector('.lightbox');
const lbImg = lb.querySelector('.lb-img');
const photos = [...document.querySelectorAll('section img[data-title]')];
let lbIndex = -1, lbSource = null, lbBusy = false, lbPrevId;
const sourceFor = n => (isOpen && originals.includes(photos[n])) ? grid.querySelector(`img[data-i="${originals.indexOf(photos[n])}"]`) : photos[n];
const chapterName = img => img.closest('.chapter1') ? 'Chapter 1 · Desert' : img.closest('.chapter2') ? 'Chapter 2 · Neon' : '';

function swatches(img) {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 24;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, 24, 24);
    const d = x.getImageData(0, 0, 24, 24).data, buckets = {};
    for (let i = 0; i < d.length; i += 4) {
      const k = [d[i], d[i + 1], d[i + 2]].map(v => Math.min(255, Math.round(v / 48) * 48)).join(',');
      buckets[k] = (buckets[k] || 0) + 1;
    }
    return Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([k]) => '#' + k.split(',').map(v => (+v).toString(16).padStart(2, '0')).join('').toUpperCase());
  } catch (e) { return []; } // 파일을 직접 열면(file://) 브라우저가 색 읽기를 막아요
}

function fill(i) {
  const img = photos[i], file = img.getAttribute('src').split('/').pop();
  const box = img.getBoundingClientRect();
  lbIndex = i;
  lbImg.src = img.src; lbImg.alt = img.alt;
  lb.querySelector('.lb-no').textContent = `${String(i + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}`;
  lb.querySelector('.lb-title').textContent = img.dataset.title;
  lb.querySelector('.lb-desc').textContent = img.dataset.desc || '';
  const sw = swatches(img);
  const rows = [
    ['챕터', chapterName(img)],
    ['파일', file],
    ['원본 크기', img.naturalWidth ? `${img.naturalWidth} × ${img.naturalHeight} px` : '불러오는 중'],
    ['화면 비율', box.height ? `${(box.width / box.height).toFixed(2)} : 1` : '—'],
    ['피그마 레이어', img.dataset.layer || '—'],
  ];
  if (sw.length) rows.push(['대표 색', sw.map(c => `<span class="sw" style="background:${c}" title="${c}"></span>`).join('') + `<span class="hex">${sw[0]}</span>`]);
  lb.querySelector('.lb-props').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  lb.dataset.theme = img.closest('.chapter2') ? 'dark' : 'light';
}

function openLightbox(i, source) {
  if (lbBusy) return;
  photos[i].loading = 'eager';
  fill(i);
  lbSource = source;
  lbPrevId = source.dataset.flipId; source.dataset.flipId = 'lb'; lbImg.dataset.flipId = 'lb';
  const state = canFlip() ? Flip.getState(source) : null;
  lb.hidden = false;
  document.documentElement.classList.add('lb-open');
  requestAnimationFrame(() => lb.classList.add('on'));
  source.style.visibility = 'hidden';
  if (!state) return;
  lbBusy = true;
  Flip.from(state, { targets: lbImg, duration: 0.8, ease: 'expo.inOut', absolute: true, onComplete: () => { lbBusy = false; } });
}

function closeLightbox() {
  if (lbBusy || lb.hidden) return;
  const src = lbSource;
  const r = src.getBoundingClientRect();
  const onScreen = r.bottom > 0 && r.top < innerHeight;
  const done = () => {
    if (lbPrevId) src.dataset.flipId = lbPrevId; else delete src.dataset.flipId; lb.hidden = true; lb.classList.remove('on'); src.style.visibility = ''; lbImg.removeAttribute('style'); document.documentElement.classList.remove('lb-open', 'flipping'); lbBusy = false; };
  lb.classList.remove('on');
  if (!canFlip() || !onScreen) { src.style.visibility = ''; return setTimeout(done, 350); }
  lbBusy = true;
  document.documentElement.classList.add('flipping');
  const state = Flip.getState(lbImg);
  src.style.visibility = ''; lbImg.style.visibility = 'hidden';
  Flip.from(state, { targets: src, duration: 0.7, ease: 'expo.inOut', onComplete: done });
}

function step(d) {
  if (lbBusy) return;
  const n = (lbIndex + d + photos.length) % photos.length;
  lbSource.style.visibility = '';
  if (lbPrevId) lbSource.dataset.flipId = lbPrevId; else delete lbSource.dataset.flipId;
  lbSource = sourceFor(n); lbPrevId = lbSource.dataset.flipId; lbSource.dataset.flipId = 'lb';
  lbImg.style.opacity = 0;
  setTimeout(() => { fill(n); lbImg.style.opacity = ''; }, 180);
}

photos.forEach((img, i) => img.addEventListener('click', () => openLightbox(i, img)));
grid.addEventListener('click', e => {
  const t = e.target.closest('img[data-i]');
  if (t) openLightbox(photos.indexOf(originals[+t.dataset.i]), t);
});
lb.querySelector('.lb-close').addEventListener('click', closeLightbox);
lb.querySelector('.lb-prev').addEventListener('click', () => step(-1));
lb.querySelector('.lb-next').addEventListener('click', () => step(1));
lb.querySelector('.lb-stage').addEventListener('click', e => { if (e.target !== lbImg) closeLightbox(); });
addEventListener('keydown', e => {
  if (lb.hidden) return;
  if (e.key === 'Escape') { e.stopImmediatePropagation(); closeLightbox(); }
  if (e.key === 'ArrowLeft') step(-1);
  if (e.key === 'ArrowRight') step(1);
}, true);
