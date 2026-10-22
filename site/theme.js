(() => {
  'use strict';
  const key = 'ic-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = null;
  try { preference = localStorage.getItem(key); } catch { /* Tema funciona sem armazenamento. */ }
  if (preference !== 'light' && preference !== 'dark') preference = null;

  function apply(theme) {
    const dark = theme === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = theme;
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.setAttribute('aria-checked', String(dark));
      button.title = dark ? 'Mudar para tema claro' : 'Mudar para tema escuro';
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#302032' : '#713052';
  }
  apply(preference || (system.matches ? 'dark' : 'light'));
  system.addEventListener('change', event => {
    if (!preference) apply(event.matches ? 'dark' : 'light');
  });
  document.addEventListener('DOMContentLoaded', () => {
    apply(preference || (system.matches ? 'dark' : 'light'));
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.addEventListener('click', () => {
        preference = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        try { localStorage.setItem(key, preference); } catch { /* Mantém a escolha nesta página. */ }
        apply(preference);
      });
    });
  });
})();
