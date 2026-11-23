/**
 * SuperLista V2 - Utilitários de interface (sem dependência do estado da aplicação)
 * Toast com ação, confetes, escape de HTML e classes de badge por corredor.
 */

export function triggerConfetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#f43f5e', '#fb923c', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];
  const particles = Array.from({ length: 90 }, () => ({
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: (Math.random() - 0.5) * 16,
    vy: (Math.random() - 0.8) * 16,
    size: Math.random() * 8 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    alpha: 1,
    decay: Math.random() * 0.02 + 0.01
  }));

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      if (p.alpha <= 0) continue;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.alpha -= p.decay;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (alive) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(frame);
}

let toastTimer = null;
export function showToast(message, { actionLabel, onAction, duration } = {}) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 max-w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-md text-white text-xs font-bold pl-4 pr-2 py-2 min-h-[44px] rounded-2xl shadow-2xl border border-slate-700 z-[60] transition-all duration-300 opacity-0 translate-y-4 pointer-events-none flex items-center gap-3';
    document.body.appendChild(toast);
  }

  toast.innerHTML = '';
  const text = document.createElement('span');
  text.className = 'py-1';
  text.textContent = message;
  toast.appendChild(text);

  if (actionLabel && onAction) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-amber-300 font-black whitespace-nowrap';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => {
      onAction();
      hide();
    });
    toast.appendChild(btn);
  } else {
    toast.classList.add('pr-4');
  }

  toast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');

  function hide() {
    toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hide, duration || (actionLabel ? 5000 : 2500));
}

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>'"]/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[ch]));
}

export function getBadgeClass(category) {
  switch (category) {
    case 'Hortifruti': return 'badge-hortifruti';
    case 'Padaria': return 'badge-padaria';
    case 'Carnes & Aves': return 'badge-carnes';
    case 'Laticínios & Ovos': return 'badge-laticinios';
    case 'Mercearia': return 'badge-mercearia';
    case 'Bebidas': return 'badge-bebidas';
    case 'Limpeza & Higiene': return 'badge-limpeza';
    case 'Pet & Bazar': return 'badge-pet';
    default: return 'badge-outros';
  }
}
