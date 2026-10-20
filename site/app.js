(() => {
  'use strict';
  const config = window.STORE_CONFIG;
  document.querySelectorAll('a[href^="https://wa.me/"]').forEach(link => {
    const url = new URL(link.href);
    url.pathname = `/${config.whatsapp}`;
    link.href = url.href;
    link.rel = 'noopener noreferrer';
  });
  const fallback = { Canecas: 'caneca-Ewy437Oq.jpg', Brindes: 'brindes-6tBH5vxx.jpg', Brinquedos: 'brinquedos-BSLPaezt.jpg' };
  const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const element = (tag, classes, text) => {
    const node = document.createElement(tag);
    node.className = classes || '';
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const grid = document.getElementById('product-grid');
  const status = document.getElementById('catalog-status');
  const filePreview = location.protocol === 'file:';
  let products = filePreview ? window.STORE_CATALOG.filter(product => product.active) : [];
  let category = 'Todos';
  const filters = document.querySelectorAll('#produtos button');
  function render() {
    grid.replaceChildren();
    const visible = products.filter(product => category === 'Todos' || product.category === category);
    status.hidden = visible.length > 0;
    status.textContent = 'Nenhum produto nesta categoria ainda.';
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.textContent === category)));
    visible.forEach(product => {
      const card = element('article', 'flex flex-col overflow-hidden rounded-3xl bg-card shadow-soft transition hover:-translate-y-1');
      const image = element('img', 'aspect-square w-full object-cover');
      image.src = product.imageUrl || `assets/${fallback[product.category] || fallback.Canecas}`;
      image.alt = product.name;
      image.loading = 'lazy';
      image.width = image.height = 600;
      image.addEventListener('error', () => { image.src = `assets/${fallback[product.category] || fallback.Canecas}`; }, { once: true });
      const content = element('div', 'flex flex-1 flex-col p-6');
      content.append(element('span', 'text-xs font-bold uppercase tracking-widest text-accent', product.category), element('h3', 'mt-1 text-2xl font-bold text-primary', product.name), element('p', 'mt-2 flex-1 text-muted-foreground', product.description));
      const actions = element('div', 'mt-5 flex items-center justify-between');
      const buy = element('a', 'rounded-full bg-accent px-5 py-2 font-bold text-accent-foreground transition hover:scale-105', 'Comprar');
      buy.href = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(`Olá! Quero comprar: ${product.name} (${money(product.price)}). Gostaria de personalizar.`)}`;
      buy.target = '_blank';
      buy.rel = 'noopener noreferrer';
      buy.setAttribute('aria-label', `Comprar ${product.name} pelo WhatsApp`);
      actions.append(element('span', 'font-display text-2xl font-bold text-primary', money(product.price)), buy);
      content.append(actions);
      card.append(image, content);
      grid.append(card);
    });
  }
  filters.forEach(button => button.addEventListener('click', () => {
    category = button.textContent;
    filters.forEach(item => { item.className = 'rounded-full px-5 py-2 font-bold transition bg-card text-primary hover:bg-muted'; });
    render();
  }));
  render();
  async function refreshCatalog() {
    if (filePreview) return;
    status.hidden = false;
    status.textContent = 'Carregando produtos…';
    try {
      const response = await fetch(`${config.apiBase}/products`, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error(`Catálogo: ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Catálogo inválido');
      products = data;
      render();
    } catch (error) {
      products = []; render(); status.hidden = false;
      status.textContent = 'Não foi possível carregar os produtos. Atualize a página ou fale com a loja pelo WhatsApp.';
      console.info('Catálogo indisponível.', error.message);
    }
  }
  refreshCatalog();
})();
