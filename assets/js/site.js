(() => {
  'use strict';
  const menu = document.querySelector('.site-nav');
  const toggle = document.querySelector('.menu-toggle');
  function closeMenu(returnFocus = false) {
    menu?.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');
    if (returnFocus) toggle?.focus();
  }
  toggle?.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(menu?.classList.contains('is-open')); });
  document.addEventListener('click', e => { if (!e.target.closest('.site-header')) closeMenu(); });
  menu?.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  const wide = matchMedia('(min-width: 851px)');
  wide.addEventListener('change', () => closeMenu());
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('reveal-in'); observer.unobserve(entry.target); }
    }), {threshold: 0.08});
    document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
  }
})();
