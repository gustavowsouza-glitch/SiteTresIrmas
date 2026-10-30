import { categoryNames, categoryImages, money, cleanCart, cleanFavorites, cleanOrders, addToCart, orderMessage } from './shop-core.mjs';

const config = window.STORE_CONFIG;
const root = document.querySelector('#page');
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const icons = {
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8H7.5A2.5 2.5 0 1 1 10 5.5L12 8Zm0 0h4.5A2.5 2.5 0 1 0 14 5.5L12 8Z"/>',
  mug: '<path d="M4 7h12v10a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V7Zm12 1h2a3 3 0 0 1 0 6h-2M7 2v2m6-2v2"/>',
  puzzle: '<path d="M8 3H3v6h2a2 2 0 1 1 0 4H3v8h6v-2a2 2 0 1 1 4 0v2h8v-8h-2a2 2 0 1 1 0-4h2V3h-8v2a2 2 0 1 1-4 0V3Z"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 10 10 0 0 1-4-.8L3 21l1.8-5.5a10 10 0 0 1-.8-4A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/>',
  bag: '<path d="M5 7h14l2 14H3L5 7Zm3 0V5a4 4 0 0 1 8 0v2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>'
};
function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.gift}</svg>`; }
const image = product => product.imageUrl || categoryImages[product.category] || categoryImages.Outros;
const detailsUrl = product => `/produto/?id=${encodeURIComponent(product.id)}`;
const whatsapp = message => `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(message)}`;
const cartKey = 'dindinha-cart-v1';
let cart = [];
try { cart = cleanCart(JSON.parse(localStorage.getItem(cartKey) || '[]')); } catch { cart = []; }
const favoritesKey = 'dindinha-favorites-v1';
let favorites = [];
try { favorites = cleanFavorites(JSON.parse(localStorage.getItem(favoritesKey) || '[]')); } catch { favorites = []; }
function favoriteButton(product) {
  const saved = favorites.includes(product.id);
  return `<button class="favorite-button" type="button" data-favorite="${escape(product.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Remover dos' : 'Salvar nos'} favoritos: ${escape(product.name)}">${icon('heart')}</button>`;
}
function updateFavorites() {
  document.querySelectorAll('[data-favorites-count]').forEach(node => { node.textContent = favorites.length; });
  document.querySelectorAll('[data-favorite]').forEach(button => {
    const saved = favorites.includes(button.dataset.favorite);
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', `${saved ? 'Remover dos' : 'Salvar nos'} favoritos: ${button.dataset.name || 'produto'}`);
  });
}
function toggleFavorite(id) {
  if (!favorites.includes(id) && favorites.length >= 200) { toast('Você pode salvar até 200 favoritos.'); return; }
  const saved = !favorites.includes(id);
  favorites = saved ? [...favorites, id] : favorites.filter(value => value !== id);
  try { localStorage.setItem(favoritesKey, JSON.stringify(favorites)); } catch { toast('Os favoritos ficam disponíveis enquanto esta página estiver aberta.'); }
  updateFavorites();
  if (location.pathname.replace(/\/$/, '') === '/favoritos') render();
}
function shoppingTabs(active) {
  return `<nav class="shopping-tabs" aria-label="Suas listas"><a href="/carrinho/" ${active === 'cart' ? 'aria-current="page"' : ''}>${icon('bag')} Carrinho <span data-cart-lines-count>${cart.length}</span></a><a href="/favoritos/" ${active === 'favorites' ? 'aria-current="page"' : ''}>${icon('heart')} Favoritos <span data-favorites-count>${favorites.length}</span></a><a href="/minhas-compras/" ${active === 'orders' ? 'aria-current="page"' : ''}>${icon('gift')} Minhas compras</a></nav>`;
}
function favoritesPage(products) {
  const saved = products.filter(product => favorites.includes(product.id));
  const unavailable = favorites.filter(id => !products.some(product => product.id === id));
  root.innerHTML = `<section class="section-wrap shopping-page">${shoppingTabs('favorites')}<div class="shopping-heading"><div><h1>Meus favoritos</h1><p>${saved.length} ${saved.length === 1 ? 'presente disponível' : 'presentes disponíveis'} para escolher com calma.</p></div><a class="quiet-link" href="/produtos/">Continuar explorando ${icon('arrow')}</a></div><p class="favorites-note">Seus favoritos ficam salvos neste navegador, sem precisar de conta.</p>${saved.length ? `<div class="product-grid">${cards(saved)}</div>` : `<div class="empty-cart"><span class="empty-cart-symbol">${icon('heart')}</span><h2>Guarde aqui suas melhores ideias.</h2><p>Toque no coração de um produto para encontrá-lo aqui depois.</p><a class="button button-primary" href="/produtos/">Encontrar presentes ${icon('arrow')}</a></div>`}${unavailable.length ? `<div class="unavailable-favorites"><p>${unavailable.length} ${unavailable.length === 1 ? 'favorito está indisponível' : 'favoritos estão indisponíveis'} no catálogo.</p><button type="button" id="clear-unavailable" class="quiet-link">Remover favoritos indisponíveis</button></div>` : ''}</section>`;
  bindCards(saved);
  root.querySelector('#clear-unavailable')?.addEventListener('click', () => {
    favorites = favorites.filter(id => !unavailable.includes(id));
    try { localStorage.setItem(favoritesKey, JSON.stringify(favorites)); } catch { toast('Não foi possível salvar a alteração neste navegador.'); }
    updateFavorites(); render();
  });
}
let renderVersion = 0;
let toastTimer;
const ordersKey = 'dindinha-orders-v1';
let orders = [];
try { orders = cleanOrders(JSON.parse(localStorage.getItem(ordersKey) || '[]')); } catch { orders = []; }
function rememberOrder(quote) {
  const record = cleanOrders([{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), items: quote.items }])[0];
  if (!record) throw new Error('Não foi possível preparar o resumo do pedido. Tente novamente.');
  orders = cleanOrders([record, ...orders]);
  try { localStorage.setItem(ordersKey, JSON.stringify(orders)); } catch { toast('O histórico não pôde ser salvo neste navegador. Guarde o resumo no WhatsApp.'); }
  return record;
}
function purchasesPage() {
  root.innerHTML = `<section class="section-wrap shopping-page">${shoppingTabs('orders')}<div class="shopping-heading"><div><h1>Minhas compras</h1><p>Consulte os pedidos que você iniciou por este navegador.</p></div><a class="quiet-link" href="/produtos/">Explorar presentes ${icon('arrow')}</a></div><div class="orders-notice">${icon('chat')}<p>Este histórico registra a abertura do WhatsApp, sem confirmar envio, pagamento ou compra. A confirmação e o andamento são combinados diretamente com a loja. Os dados ficam apenas neste navegador; pedidos anteriores à criação deste histórico não aparecem aqui.</p></div>${orders.length ? `<div class="orders-list">${orders.map(order => `<article class="order-card"><div class="order-heading"><div><p>Pedido iniciado em ${escape(new Date(order.createdAt).toLocaleString('pt-BR'))}</p><strong>Referência ${escape(order.id.slice(0, 8).toUpperCase())}</strong></div><span class="order-status">A confirmar com a loja</span></div><div class="order-overview"><div><h2>${escape(order.items[0].name)}${order.items.length > 1 ? ` e mais ${order.items.length - 1}` : ''}</h2><p>${order.items.reduce((sum, item) => sum + item.quantity, 0)} unidade(s) · Subtotal dos produtos na ocasião</p><strong>${money(order.subtotal)}</strong></div><a class="button button-primary" href="${whatsapp(`Olá, Dindinha! Gostaria de consultar o pedido de referência ${order.id}.\n\n${orderMessage(order)}`)}" target="_blank" rel="noopener noreferrer">Consultar com a loja ${icon('chat')}</a></div><details><summary>Ver resumo do pedido</summary><ul>${order.items.map(item => `<li><div><strong>${escape(item.name)}</strong><p>${item.quantity} × ${money(item.price)}${item.personalization ? `<br>Personalização: ${escape(item.personalization)}` : ''}</p></div><span>${money(item.total)}</span></li>`).join('')}</ul><p class="subtle-note">Valores registrados na ocasião. Frete, personalização e disponibilidade precisam ser confirmados com a loja.</p></details></article>`).join('')}</div>` : `<div class="empty-cart"><span class="empty-cart-symbol">${icon('gift')}</span><h2>Seu próximo presente começa aqui.</h2><p>Ao continuar pelo WhatsApp no carrinho, o resumo aparecerá nesta página para você consultar depois.</p><a class="button button-primary" href="/produtos/">Escolher meu presente ${icon('arrow')}</a></div>`}</section>`;
}
function toast(message) {
  const box = document.querySelector('#shop-toast'); box.textContent = message; box.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { box.hidden = true; }, 4000);
}
function saveCart() {
  try { localStorage.setItem(cartKey, JSON.stringify(cart)); } catch { toast('O carrinho fica disponível enquanto esta página estiver aberta.'); }
  updateCartCount();
}
function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('[data-cart-count]').forEach(node => { node.textContent = count; });
  document.querySelectorAll('[data-cart-lines-count]').forEach(node => { node.textContent = cart.length; });
  document.querySelector('[data-cart-link]').setAttribute('aria-label', `Carrinho com ${count} ${count === 1 ? 'unidade' : 'unidades'}`);
}
async function api(path, options = {}) {
  const response = await fetch(config.apiBase + path, { cache: 'no-store', ...options, signal: AbortSignal.timeout(15000) });
  let data;
  try { data = await response.json(); } catch { throw new Error('Não foi possível conectar à loja. Tente novamente.'); }
  if (!response.ok) throw new Error(data.error || 'Não foi possível carregar os produtos.');
  return data;
}
const quoteCart = () => api('/cart/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart.filter(item => item.selected !== false).map(({ id, quantity, personalization }) => ({ id, quantity, personalization })) }) });
function add(product, quantity = 1, personalization = '') {
  try {
    cart = addToCart(cart, { key: crypto.randomUUID(), id: product.id, quantity, personalization: personalization.trim() });
    saveCart(); toast(`${product.name} adicionado ao carrinho.`);
  } catch (error) { toast(error.message); }
}
function cards(products, catalogView = false) {
  return products.map(product => `<article class="gift-card" data-category="${escape(product.category)}">${favoriteButton(product)}<a class="gift-picture" href="${detailsUrl(product)}"><img src="${escape(image(product))}" width="600" height="600" alt="${escape(product.name)}" loading="lazy"><span class="product-chip">${escape(categoryNames[product.category] || product.category)}</span></a><div class="gift-content"><h3><a href="${detailsUrl(product)}">${escape(product.name)}</a></h3><p>${escape(product.description)}</p><div class="gift-price-row"><div class="gift-price-copy"><strong>${money(product.price)}</strong>${catalogView ? '<small>valor por unidade</small>' : ''}</div><button class="add-icon" type="button" data-add="${product.id}" aria-label="Adicionar ${escape(product.name)} ao carrinho">${catalogView ? `${icon('bag')}<span>Adicionar</span>` : '+'}</button></div><a class="product-details-link" href="${detailsUrl(product)}">${catalogView ? 'Conhecer e personalizar' : 'Ver detalhes'} ${icon('arrow')}</a></div></article>`).join('');
}
function bindCards(products) {
  root.querySelectorAll('[data-favorite]').forEach(button => {
    const product = products.find(item => item.id === button.dataset.favorite);
    if (product) button.dataset.name = product.name;
    button.addEventListener('click', () => toggleFavorite(button.dataset.favorite));
  });
  root.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => { const product = products.find(item => item.id === button.dataset.add); if (product) add(product); }));
  root.querySelectorAll('.gift-picture img, .detail-image img').forEach(img => img.addEventListener('error', () => { img.src = categoryImages.Outros; }, { once: true }));
}
function sectionTitle(eyebrow, title, link = '') { return `<div class="section-heading"><div><p class="eyebrow">${eyebrow}</p><h2>${title}</h2></div>${link}</div>`; }
function categories() {
  const names = { Canecas: 'mug', Brindes: 'gift', Brinquedos: 'puzzle', Outros: 'heart' };
  return Object.entries(categoryNames).map(([key, name]) => `<a class="category-card" href="/produtos/?categoria=${encodeURIComponent(key)}"><span class="category-symbol">${icon(names[key])}</span><span>${name}</span>${icon('arrow')}</a>`).join('');
}
function home(products) {
  root.innerHTML = `<section class="hero section-wrap"><div class="hero-copy"><p class="eyebrow"><span class="tiny-heart">♥</span> FEITO PARA ENCANTAR</p><h1>Um presente.<br><em>Todo o seu carinho.</em></h1><p class="hero-description">Presentes personalizados para tornar cada momento especial. Escolha o seu e dê a ele um pouquinho de você.</p><div class="button-row"><a class="button button-primary" href="/produtos/">Encontrar um presente ${icon('arrow')}</a><a class="quiet-link" href="/#personalizar">Como personalizar</a></div><div class="hero-footnote">${icon('heart')} Nomes, frases e temas que contam histórias.</div></div><div class="hero-brand"><img class="hero-logo" src="/assets/dindinha-logo.png" width="1254" height="1254" alt="Dindinha Presentes — presentes personalizados para tornar cada momento especial."><div class="brand-sticker">PRESENTEAR<br>É UM JEITO DE<br><b>abraçar.</b> ♡</div></div></section>
  <div class="benefit-ribbon"><div class="section-wrap benefits"><span>${icon('gift')} Personalização com significado</span><span>${icon('chat')} Atendimento pelo WhatsApp</span><span>${icon('heart')} Para pessoas especiais</span></div></div>
  <section class="section-wrap section-space">${sectionTitle('CADA PESSOA, UM PRESENTE', 'O que vamos personalizar?')}<div class="category-grid">${categories()}</div></section>
  <section class="section-wrap section-space featured">${sectionTitle('ESCOLHIDOS PARA VOCÊ', 'Encontre seu próximo presente', '<a class="quiet-link" href="/produtos/">Ver todos os produtos '+icon('arrow')+'</a>')}<div class="product-grid">${products.length ? cards(products.slice(0, 4)) : '<p class="empty-state">Novos presentes chegam em breve. Fale com a gente para criar o seu.</p>'}</div></section>
  <section class="personalize-section" id="personalizar"><div class="section-wrap personalize-layout"><div><p class="eyebrow">DO SEU JEITINHO</p><h2>A sua ideia.<br>Um toque de <em>afeto.</em></h2><p>Uma frase que só vocês entendem, um nome especial ou o tema da sua comemoração. Vamos criar esse presente juntos?</p><a class="button button-primary" href="${whatsapp('Olá, Dindinha Presentes! Quero conversar sobre um presente personalizado.')}" target="_blank" rel="noopener noreferrer">Quero personalizar ${icon('chat')}</a></div><ol class="steps"><li><span>01</span><div><h3>Escolha seu presente</h3><p>Encontre a caneca, o brinde ou o brinquedo que combina com a ocasião.</p></div></li><li><span>02</span><div><h3>Deixe com a sua cara</h3><p>Conte o nome, a frase ou a ideia nos detalhes do produto.</p></div></li><li><span>03</span><div><h3>Converse com a gente</h3><p>Envie o carrinho pelo WhatsApp e combine a produção e a entrega.</p></div></li></ol></div></section>
  <section class="section-wrap home-about"><img src="/assets/dindinha-icon.png" alt="Símbolo da Dindinha Presentes" width="1254" height="1254" loading="lazy"><div><p class="eyebrow">PRAZER, DINDINHA PRESENTES</p><h2>Um carinho que<br>vira lembrança.</h2><p>Acreditamos no presente escolhido com intenção. No detalhe que diz “lembrei de você”. É esse cuidado que queremos levar a cada personalização.</p><a class="quiet-link" href="/sobre/">Conheça a loja ${icon('arrow')}</a></div></section>`;
  bindCards(products);
}
function catalog(products, url) {
  let category = Object.hasOwn(categoryNames, url.searchParams.get('categoria')) ? url.searchParams.get('categoria') : 'Todos';
  const initialQuery = (url.searchParams.get('q') || '').slice(0, 200);
  const categorySymbols = { Todos: 'gift', Canecas: 'mug', Brindes: 'bag', Brinquedos: 'puzzle', Outros: 'heart' };
  document.querySelector('#header-query').value = initialQuery;
  root.innerHTML = `<section class="section-wrap catalog-intro"><div class="catalog-intro-card"><div><p class="eyebrow">ESCOLHIDO COM CARINHO. FEITO DO SEU JEITO.</p><h1>Um presente que<br>tem <em>tudo a ver.</em></h1><p>Encontre a sua ideia favorita. O toque especial, a gente cria com você.</p></div><div class="catalog-intro-mark" aria-hidden="true">${icon('gift')}<span>Pequenos detalhes.<br>Grandes lembranças.</span></div></div><div class="catalog-category-tabs" role="group" aria-label="Categoria de produtos">${['Todos', ...Object.keys(categoryNames)].map(key => `<button type="button" data-filter="${key}" aria-pressed="${key === category}"><span class="catalog-tab-icon">${icon(categorySymbols[key])}</span><span class="catalog-tab-label">${escape(key === 'Todos' ? 'Todos os presentes' : key === 'Outros' ? 'Outros presentes' : key)}<small>${key === 'Todos' ? 'Explore a coleção' : 'Do seu jeitinho'}</small></span><span class="catalog-tab-count">${products.filter(p => key === 'Todos' || p.category === key).length}</span></button>`).join('')}</div></section><section class="section-wrap catalog-layout"><div class="catalog-section"><div class="catalog-toolbar"><label class="shop-search">${icon('search')}<input type="search" id="catalog-search" maxlength="200" value="${escape(initialQuery)}" placeholder="Buscar um presente" aria-label="Buscar produtos"></label><label class="catalog-price-inline" for="catalog-price">Preço<select id="catalog-price"><option value="all">Todos os valores</option><option value="30">Até R$ 30</option><option value="50">Até R$ 50</option><option value="100">Até R$ 100</option></select></label><button id="clear-filters" class="catalog-clear" type="button">Limpar</button><label class="catalog-sort-label">Ordenar por <select id="catalog-sort"><option value="default">Destaques do catálogo</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option><option value="name">Nome do produto</option></select></label></div><div class="catalog-meta"><p id="catalog-count" role="status" aria-live="polite"></p><span>${icon('heart')} Um toque seu em cada presente</span></div><div class="product-grid" id="catalog-grid"></div></div></section>`;
  const syncFilters = () => {
    const next = new URL(location.href);
    const query = root.querySelector('#catalog-search').value.trim();
    if (query) next.searchParams.set('q', query); else next.searchParams.delete('q');
    if (category === 'Todos') next.searchParams.delete('categoria'); else next.searchParams.set('categoria', category);
    const price = root.querySelector('#catalog-price').value;
    if (price !== 'all') next.searchParams.set('ate', price); else next.searchParams.delete('ate');
    const sort = root.querySelector('#catalog-sort').value;
    if (sort !== 'default') next.searchParams.set('ordem', sort); else next.searchParams.delete('ordem');
    history.replaceState({}, '', next);
    document.querySelector('#header-query').value = query;
  };
  const draw = () => {
    const term = normalize(root.querySelector('#catalog-search').value.trim());
    const ceiling = root.querySelector('#catalog-price').value;
    const list = products.filter(product => (category === 'Todos' || product.category === category) && (ceiling === 'all' || product.price <= Number(ceiling)) && normalize(`${product.name} ${product.description} ${categoryNames[product.category]}`).includes(term));
    const sort = root.querySelector('#catalog-sort').value;
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    root.querySelector('#catalog-count').textContent = `${list.length} ${list.length === 1 ? 'presente encontrado' : 'presentes encontrados'}`;
    root.querySelector('#catalog-grid').innerHTML = list.length ? cards(list, true) : '<div class="empty-state"><h2>Ainda não encontramos esse presente.</h2><p>Experimente outra categoria ou uma busca diferente.</p></div>';
    root.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
    bindCards(list);
    syncFilters();
  };
  if (['30', '50', '100'].includes(url.searchParams.get('ate'))) root.querySelector('#catalog-price').value = url.searchParams.get('ate');
  if (['price-asc', 'price-desc', 'name'].includes(url.searchParams.get('ordem'))) root.querySelector('#catalog-sort').value = url.searchParams.get('ordem');
  root.querySelector('#catalog-search').addEventListener('input', draw);
  root.querySelector('#catalog-sort').addEventListener('change', draw);
  root.querySelector('#catalog-price').addEventListener('change', draw);
  root.querySelector('#clear-filters').addEventListener('click', () => {
    category = 'Todos'; root.querySelector('#catalog-search').value = ''; root.querySelector('#catalog-price').value = 'all'; root.querySelector('#catalog-sort').value = 'default'; draw();
  });
  root.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    category = button.dataset.filter; draw();
  }));
  draw();
}
function detail(product, products) {
  root.innerHTML = `<div class="section-wrap"><nav class="breadcrumbs" aria-label="Localização"><a href="/">Início</a><span>/</span><a href="/produtos/">Produtos</a><span>/</span><span>${escape(product.name)}</span></nav><section class="detail-layout"><div class="detail-image"><img src="${escape(image(product))}" width="800" height="800" alt="${escape(product.name)}"></div><div class="detail-copy"><p class="eyebrow">${escape(categoryNames[product.category] || product.category)}</p><h1>${escape(product.name)}</h1><p class="detail-description">${escape(product.description)}</p><p class="detail-price">${money(product.price)}</p><p class="subtle-note">Valor por unidade. Personalização e entrega a combinar com a loja.</p><form id="add-product-form" class="detail-form"><label>Qual é a sua ideia?<textarea name="personalization" maxlength="500" rows="3" placeholder="Nome, frase, tema ou detalhes que deixam esse presente especial."></textarea></label><div class="detail-order"><label>Quantidade<input name="quantity" type="number" min="1" max="99" step="1" value="1" required></label><button type="submit" class="button button-primary">Adicionar ao carrinho ${icon('bag')}</button></div></form><a href="/carrinho/" class="quiet-link cart-detail-link">Ver meu carrinho ${icon('arrow')}</a><div class="detail-assurance">${icon('heart')} A ideia é sua. Os detalhes, a gente combina junto.</div></div></section><section class="section-space related">${sectionTitle('MAIS IDEIAS PARA PRESENTEAR', 'Combine com outro carinho.')}<div class="product-grid">${cards(products.filter(item => item.id !== product.id).slice(0, 3))}</div></section></div>`;
  root.querySelector('#add-product-form').addEventListener('submit', event => {
    event.preventDefault(); const form = event.currentTarget;
    add(product, Number(form.elements.quantity.value), form.elements.personalization.value);
  });
  root.querySelector('.detail-copy').insertAdjacentHTML('afterbegin', `<div class="detail-favorite">${favoriteButton(product)}<span>Salvar este presente</span></div>`);
  bindCards(products);
}
async function cartPage(products, version) {
  if (!cart.length) {
    root.innerHTML = `<section class="section-wrap shopping-page">${shoppingTabs('cart')}<div class="empty-cart"><span class="empty-cart-symbol">${icon('bag')}</span><h1>Seu carrinho está esperando um carinho.</h1><p>Explore o catálogo ou escolha um dos seus favoritos.</p><div class="button-row"><a class="button button-primary" href="/produtos/">Explorar presentes ${icon('arrow')}</a><a class="quiet-link" href="/favoritos/">Ver favoritos ${icon('heart')}</a></div></div></section>`; return;
  }
  const selected = cart.filter(item => item.selected !== false);
  root.innerHTML = `<section class="section-wrap shopping-page">${shoppingTabs('cart')}<div class="shopping-heading"><div><h1>Meu carrinho</h1><p>Escolha os itens que deseja incluir neste pedido.</p></div><a class="quiet-link" href="/produtos/">Continuar comprando ${icon('arrow')}</a></div></section><section class="section-wrap cart-layout"><div><div class="cart-store-heading"><label><input id="select-all-cart" type="checkbox" ${selected.length === cart.length ? 'checked' : ''}> Selecionar todos</label><span>Dindinha Presentes</span></div><div id="cart-lines" class="cart-lines"></div><p class="favorites-note">Você pode desmarcar um produto e deixá-lo para depois.</p></div><aside class="cart-summary"><h2>Resumo do pedido</h2><div class="summary-line"><span>Produtos (${selected.reduce((sum, item) => sum + item.quantity, 0)})</span><strong id="cart-subtotal">Calculando…</strong></div><div class="summary-line"><span>Entrega</span><span>A combinar</span></div><p class="subtle-note">Personalização, frete, prazo e pagamento serão confirmados com a loja pelo WhatsApp.</p><p id="quote-message" role="status" class="cart-notice"></p><button id="checkout" class="button button-primary" disabled>Continuar pelo WhatsApp ${icon('chat')}</button><a class="quiet-link cart-favorites-link" href="/favoritos/">Escolher dos favoritos ${icon('heart')}</a><p class="checkout-footnote">O pedido só é confirmado após o atendimento da loja.</p></aside></section>`;
  const selectAll = root.querySelector('#select-all-cart');
  selectAll.indeterminate = selected.length > 0 && selected.length < cart.length;
  selectAll.addEventListener('change', () => { cart.forEach(item => { item.selected = selectAll.checked; }); saveCart(); render(); });
  root.querySelector('#cart-lines').innerHTML = cart.map((item, index) => {
    const product = products.find(row => row.id === item.id);
    return `<article class="cart-line ${item.selected === false ? 'cart-line-unselected' : ''}"><input class="cart-select" type="checkbox" data-select="${index}" ${item.selected !== false ? 'checked' : ''} aria-label="Incluir ${escape(product?.name || 'produto indisponível')} no pedido"><img src="${escape(product ? image(product) : categoryImages.Outros)}" width="96" height="96" alt="${escape(product?.name || 'Produto indisponível')}"><div class="cart-line-info"><p class="cart-category">${escape(product ? categoryNames[product.category] : 'Indisponível')}</p><h2>${product ? `<a href="${detailsUrl(product)}">${escape(product.name)}</a>` : 'Produto indisponível'}</h2>${product ? `<p>${money(product.price)} por unidade</p>` : '<p>Este produto saiu da vitrine. Remova-o ou desmarque-o para continuar.</p>'}${item.personalization ? `<p class="cart-personalization">${escape(item.personalization)}</p>` : '<p class="cart-personalization">Personalização a combinar com a loja.</p>'}<div class="cart-line-actions"><label>Qtd. <input type="number" min="1" max="99" step="1" value="${item.quantity}" data-cart-qty="${index}" aria-label="Quantidade de ${escape(product?.name || 'produto')}"></label><button type="button" class="remove-item" data-remove="${index}">Excluir</button>${product ? favoriteButton(product) : ''}</div></div><strong class="cart-line-total">${product ? money(product.price * item.quantity) : '—'}</strong></article>`;
  }).join('');
  bindCards(products);
  root.querySelectorAll('[data-select]').forEach(input => input.addEventListener('change', () => { cart[Number(input.dataset.select)].selected = input.checked; saveCart(); render(); }));
  root.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => { cart.splice(Number(button.dataset.remove), 1); saveCart(); render(); }));
  root.querySelectorAll('[data-cart-qty]').forEach(input => input.addEventListener('change', () => {
    const value = Number(input.value);
    if (!Number.isInteger(value) || value < 1 || value > 99) { toast('Escolha uma quantidade de 1 a 99.'); input.value = cart[Number(input.dataset.cartQty)].quantity; return; }
    cart[Number(input.dataset.cartQty)].quantity = value; saveCart(); render();
  }));
  if (!selected.length) {
    root.querySelector('#checkout').disabled = true;
    root.querySelector('#cart-subtotal').textContent = money(0);
    root.querySelector('#quote-message').textContent = 'Selecione pelo menos um produto para continuar.';
    return;
  }
  try {
    const quote = await quoteCart(); if (version !== renderVersion) return;
    root.querySelector('#cart-subtotal').textContent = money(quote.subtotal);
    const checkout = root.querySelector('#checkout'); checkout.disabled = false;
    checkout.addEventListener('click', async () => {
      if (checkout.disabled || version !== renderVersion) return;
      checkout.disabled = true;
      const snapshot = JSON.stringify(cart);
      try {
        const current = await quoteCart();
        if (version !== renderVersion || snapshot !== JSON.stringify(cart)) return;
        const record = rememberOrder(current);
        location.assign(whatsapp(`${orderMessage(current)}\n\nReferência do pedido: ${record.id}`));
      }
      catch (error) { if (version === renderVersion) { const notice = root.querySelector('#quote-message'); if (notice) notice.textContent = error.message; } }
      finally { checkout.disabled = false; }
    });
  } catch (error) { if (version === renderVersion) { root.querySelector('#cart-subtotal').textContent = '—'; root.querySelector('#quote-message').textContent = error.message; } }
}
function contact() {
  root.innerHTML = `<section class="section-wrap page-intro"><p class="eyebrow">VAMOS CONVERSAR?</p><h1>Seu presente começa<br>com um “oi”.</h1><p>Conte sua ideia, tire uma dúvida ou combine os detalhes do seu pedido.</p></section><section class="section-wrap contact-layout"><div class="contact-card"><span class="category-symbol">${icon('chat')}</span><h2>Fale com a Dindinha</h2><p>Nosso atendimento e os pedidos são combinados pelo WhatsApp.</p><a class="contact-number" href="${whatsapp('Olá, Dindinha Presentes! Gostaria de atendimento.')}" target="_blank" rel="noopener noreferrer">(77) 99869-7003</a><a class="button button-primary" href="${whatsapp('Olá, Dindinha Presentes! Quero conversar sobre um presente.')}" target="_blank" rel="noopener noreferrer">Chamar no WhatsApp ${icon('arrow')}</a></div><div class="contact-questions"><h2>Antes de escolher…</h2><details><summary>Como faço meu pedido?</summary><p>Escolha seus produtos, adicione a personalização e envie seu carrinho pelo WhatsApp. A loja confirma os detalhes com você.</p></details><details><summary>Posso escolher nome, frase ou tema?</summary><p>Conte a sua ideia no campo de personalização de cada produto. A viabilidade e os detalhes são confirmados no atendimento.</p></details><details><summary>Como funcionam pagamento e entrega?</summary><p>As opções de pagamento, o valor da entrega e o prazo de produção são combinados com a loja antes da confirmação do pedido.</p></details></div></section>`;
}
function about() {
  root.innerHTML = `<section class="section-wrap about-page"><div class="about-logo"><img src="/assets/dindinha-logo.png" width="1254" height="1254" alt="Dindinha Presentes"></div><div><p class="eyebrow">SOBRE A LOJA</p><h1>Mais do que dar.<br><em>Demonstrar.</em></h1><p>Na Dindinha Presentes, a ideia é simples: transformar um presente em uma forma de dizer que alguém é especial.</p><p>Canecas, brindes, brinquedos e outras ideias ganham um toque seu: um nome, uma frase, um tema ou aquele detalhe que só vocês entendem.</p><p>Escolha sua base, conte o que imagina e converse com a gente para combinar a personalização. Cada ocasião merece um carinho com significado.</p><a class="button button-primary" href="/produtos/">Encontre seu presente ${icon('arrow')}</a></div></section><section class="about-manifesto"><div class="section-wrap">${icon('heart')}<h2>Presentes personalizados<br>para tornar cada momento especial.</h2><a href="/contato/" class="quiet-link">Vamos criar uma lembrança? ${icon('arrow')}</a></div></section>`;
}
async function render() {
  const version = ++renderVersion;
  const url = new URL(location.href); const route = url.pathname.replace(/\/$/, '') || '/';
  document.querySelector('#main-nav').classList.remove('is-open'); document.querySelector('[data-menu]').setAttribute('aria-expanded', 'false');
  document.querySelectorAll('#main-nav a').forEach(link => { if (link.pathname.replace(/\/$/, '') === (route === '/' ? '' : route)) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
  const titles = { '/': 'Presentes personalizados', '/produtos': 'Produtos', '/produto': 'Detalhes do produto', '/carrinho': 'Meu carrinho', '/favoritos': 'Meus favoritos', '/minhas-compras': 'Minhas compras', '/contato': 'Contato', '/sobre': 'Sobre a loja' };
  document.title = `${titles[route] || 'Página não encontrada'} | Dindinha Presentes`;
  root.setAttribute('aria-busy', 'true');
  try {
    if (route === '/contato') contact();
    else if (route === '/sobre') about();
    else if (route === '/minhas-compras') purchasesPage();
    else if (!Object.hasOwn(titles, route)) root.innerHTML = '<section class="section-wrap empty-cart"><h1>Essa página não foi encontrada.</h1><a class="button button-primary" href="/">Voltar ao início</a></section>';
    else {
      root.innerHTML = '<div class="section-wrap loading-state" role="status">Preparando seus próximos presentes…</div>';
      const products = await api('/products'); if (version !== renderVersion) return;
      if (route === '/') home(products);
      else if (route === '/produtos') catalog(products, url);
      else if (route === '/carrinho') await cartPage(products, version);
      else if (route === '/favoritos') favoritesPage(products);
      else {
        const product = products.find(item => item.id === url.searchParams.get('id'));
        if (!product) throw new Error('Este produto não está disponível na vitrine.');
        document.title = `${product.name} | Dindinha Presentes`; detail(product, products);
      }
    }
    if (version !== renderVersion) return;
    if (url.hash) document.getElementById(url.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  } catch (error) { if (version === renderVersion) root.innerHTML = `<section class="section-wrap empty-cart"><span class="empty-cart-symbol">${icon('gift')}</span><h1>Vamos tentar de novo?</h1><p>${escape(error.message)}</p><a href="${escape(location.pathname + location.search)}" class="button button-primary" data-retry>Tentar novamente</a><a href="/contato/" class="quiet-link">Falar com a loja</a></section>`; }
  finally { if (version === renderVersion) root.removeAttribute('aria-busy'); }
}
document.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin || /^\/(admin|gestao|autorizacoes|solicitar-acesso)(\/|$)/.test(url.pathname)) return;
  event.preventDefault(); history.pushState({}, '', url); window.scrollTo({ top: 0 }); root.focus({ preventScroll: true }); render();
});
document.querySelector('[data-menu]').addEventListener('click', event => { const opened = document.querySelector('#main-nav').classList.toggle('is-open'); event.currentTarget.setAttribute('aria-expanded', String(opened)); });
window.addEventListener('popstate', render);
window.addEventListener('storage', event => {
  if (event.key === cartKey || event.key === null) { try { cart = cleanCart(JSON.parse(localStorage.getItem(cartKey) || '[]')); } catch { cart = []; } updateCartCount(); if (location.pathname.startsWith('/carrinho')) render(); }
  if (event.key === favoritesKey || event.key === null) { try { favorites = cleanFavorites(JSON.parse(localStorage.getItem(favoritesKey) || '[]')); } catch { favorites = []; } updateFavorites(); if (location.pathname.startsWith('/favoritos')) render(); }
  if (event.key === ordersKey || event.key === null) { try { orders = cleanOrders(JSON.parse(localStorage.getItem(ordersKey) || '[]')); } catch { orders = []; } if (location.pathname.startsWith('/minhas-compras')) render(); }
});
document.querySelectorAll('[data-whatsapp]').forEach(link => { link.href = whatsapp('Olá, Dindinha Presentes! Gostaria de atendimento.'); });
document.querySelector('[data-year]').textContent = new Date().getFullYear();
updateCartCount(); updateFavorites(); render();
