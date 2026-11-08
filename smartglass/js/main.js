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

// 4) 갤러리 그리드 크기 버튼: GSAP Flip으로 사진들이 새 자리로 차례차례 미끄러져요
const GRID = {
  duration: 1,      // 한 장이 옮겨 가는 시간(초)
  stagger: 0.35,    // 첫 장과 마지막 장이 출발하는 시간 차(초). 클수록 더 쭈루룩
  from: 'start',    // 출발 순서: 'start' 앞에서부터, 'end' 뒤에서부터, 'center', 'random'
  flash: true,      // 옮겨 가는 동안 살짝 흐려지고 밝아지는 효과
};
const grid = document.querySelector('.ggrid');
const sizeBtns = [...document.querySelectorAll('.gsize button')];
let busy = false;
sizeBtns.forEach(btn => btn.addEventListener('click', () => {
  const size = btn.dataset.size;
  if (busy || size === grid.dataset.size) return;
  sizeBtns.forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', b === btn); });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!window.Flip || reduce) { grid.dataset.size = size; return; }
  busy = true;
  const items = grid.querySelectorAll('.gitem');
  const state = Flip.getState(items);
  grid.dataset.size = size;
  const tl = Flip.from(state, {
    duration: GRID.duration, ease: 'expo.inOut', absolute: true,
    stagger: { amount: GRID.stagger, from: GRID.from },
    onComplete: () => { busy = false; },
  });
  if (GRID.flash) tl.fromTo(items, { filter: 'blur(0px) brightness(100%)' }, {
    duration: GRID.duration, clearProps: 'filter',
    stagger: { amount: GRID.stagger, from: GRID.from },
    keyframes: [
      { filter: 'blur(6px) brightness(150%)', duration: GRID.duration * 0.45, ease: 'power2.in' },
      { filter: 'blur(0px) brightness(100%)', duration: GRID.duration * 0.55, ease: 'power2.out' },
    ],
  }, 0);
}));
if (window.gsap && window.Flip) gsap.registerPlugin(Flip);
