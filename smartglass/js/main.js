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
