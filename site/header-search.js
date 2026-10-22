(() => {
  const toggle = document.querySelector('[data-search-toggle]');
  const form = document.querySelector('#header-search');
  const input = document.querySelector('#header-query');

  function setOpen(open, restoreFocus = false) {
    form.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar busca' : 'Abrir busca');
    if (open) input.focus();
    else if (restoreFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => setOpen(form.hidden));
  document.addEventListener('click', event => {
    if (!form.hidden && !form.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !form.hidden) {
      event.preventDefault();
      setOpen(false, true);
    }
  });
  document.addEventListener('focusin', event => {
    if (!form.hidden && !form.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
  });
  window.addEventListener('popstate', () => setOpen(false));
})();
