import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const source = name => readFileSync(new URL(existsSync(new URL(`./ui/${name}`, import.meta.url)) ? `./ui/${name}` : `../site/${name === 'admin.js' ? 'admin/admin.js' : name}`, import.meta.url), 'utf8');
const node = () => ({ disabled: false, hidden: false, value: '', checked: false, files: [], textContent: '', addEventListener(type, fn) { this[type] = fn; }, querySelectorAll() { return []; }, focus() {}, reset() {}, replaceChildren() {}, append() {} });
const tick = () => new Promise(resolve => setImmediate(resolve));
test('histórico persiste o resumo e mostra confirmação pendente, sem depender do catálogo', async () => {
  const moduleUrl = existsSync(new URL('./shop-core.mjs', import.meta.url)) ? './shop-core.mjs' : '../site/shop-core.mjs';
  const { cleanOrders } = await import(moduleUrl);
  const saved = new Map(); const root = { innerHTML: '' };
  const id = '11111111-1111-4111-8111-111111111111';
  const context = vm.createContext({ cleanOrders, crypto: { randomUUID: () => id }, localStorage: { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value) }, toast() {}, root, shoppingTabs: () => '', icon: () => '', money: String, whatsapp: () => 'https://wa.me/test', orderMessage: () => '' });
  const script = source('storefront.js');
  vm.runInContext(script.slice(script.indexOf('const escape ='), script.indexOf('const normalize =')) + script.slice(script.indexOf('const ordersKey ='), script.indexOf('function toast(')), context);
  context.purchasesPage(); assert.match(root.innerHTML, /Seu próximo presente/);
  context.rememberOrder({ items: [{ id, name: '<Caneca>', quantity: 2, price: 30, personalization: 'Ana' }] });
  assert.equal(JSON.parse(saved.get('dindinha-orders-v1'))[0].subtotal, 60);
  context.purchasesPage();
  assert.match(root.innerHTML, /&lt;Caneca&gt;/);
  assert.match(root.innerHTML, /A confirmar com a loja/);
  assert.match(root.innerHTML, /sem confirmar envio, pagamento ou compra/);
});

test('admin keeps the original product and all captured fields while a photo upload is pending', async () => {
  const ids = ['login', 'panel', 'editor', 'message', 'logout', 'new-product', 'cancel-edit', 'editor-title', 'admin-products', 'product-count', 'login-view'];
  const nodes = Object.fromEntries(ids.map(id => [`#${id}`, node()]));
  const editor = nodes['#editor'];
  editor.elements = Object.fromEntries(['name', 'description', 'category', 'price', 'active', 'photo', 'password', 'email'].map(key => [key, node()]));
  nodes['#login'].querySelector = () => node();
  const controls = Object.values(editor.elements);
  nodes['#panel'].querySelectorAll = () => controls;
  const a = { id: 'A', name: 'Produto A', description: 'Descrição A', category: 'Outros', price: 10, active: true };
  const b = { ...a, id: 'B', name: 'Produto B', description: 'Descrição B', price: 20 };
  let release;
  const patches = [];
  class Photo { constructor() { this.type = 'image/png'; this.size = 10; } }
  const response = body => ({ ok: true, text: async () => JSON.stringify(body) });
  const context = vm.createContext({ window: { STORE_CONFIG: { apiBase: '/api' } }, document: { querySelector: s => nodes[s], createElement: node }, File: Photo, AbortSignal, confirm: () => true, fetch: async (url, options = {}) => {
    if (url.endsWith('/uploads')) return new Promise(resolve => { release = () => resolve(response({ image_path: 'photo-A.png' })); });
    if (options.method === 'PATCH') patches.push({ url, body: JSON.parse(options.body) });
    return response(url.endsWith('/admin/products') ? [] : {});
  } });
  vm.runInContext(source('admin.js').replace('  restoreSession();', '  globalThis.openEditorForTest = openEditor;'), context);
  context.openEditorForTest(a);
  editor.elements.photo.files = [new Photo()];
  editor.submit({ preventDefault() {} });
  assert.equal(controls.every(control => control.disabled), true);
  context.openEditorForTest(b);
  // Even programmatic form changes cannot alter the captured request.
  editor.elements.description.value = b.description;
  release(); await tick(); await tick();
  assert.equal(patches[0].url, '/api/admin/products/A');
  assert.equal(patches[0].body.name, a.name);
  assert.equal(patches[0].body.description, a.description);
  assert.equal(patches[0].body.price, a.price);
  assert.equal(controls.every(control => !control.disabled), true);
});

async function setupCart(selected = true) {
  const nodes = Object.fromEntries(['#cart-lines', '#cart-subtotal', '#quote-message', '#checkout', '#select-all-cart'].map(key => [key, node()]));
  const redirects = []; const recorded = []; let calls = 0; let resolveQuote, rejectQuote;
  const context = vm.createContext({ cart: [{ id: 'A', quantity: 1, personalization: '', selected }], renderVersion: 1, rememberOrder: quote => { recorded.push(quote); return { id: 'test' }; }, shoppingTabs: () => '', categoryNames: {}, detailsUrl: () => '/produto/', favoriteButton: () => '', bindCards() {}, root: { querySelector: s => nodes[s] || null, querySelectorAll: () => [] }, icon: () => '', escape: String, image: () => '', categoryImages: {}, money: String, quoteCart: () => ++calls === 1 ? Promise.resolve({ subtotal: 10 }) : new Promise((resolve, reject) => { resolveQuote = resolve; rejectQuote = reject; }), orderMessage: JSON.stringify, whatsapp: String, location: { assign: url => redirects.push(url) } });
  const script = source('storefront.js');
  vm.runInContext(script.slice(script.indexOf('async function cartPage('), script.indexOf('function contact()')), context);
  await context.cartPage([{ id: 'A', name: 'A', price: 10 }], 1);
  return { context, nodes, redirects, recorded, calls: () => calls, resolve: quote => resolveQuote(quote), reject: error => rejectQuote(error) };
}
test('nenhuma seleção bloqueia a cotação e somente itens selecionados são enviados à API', async () => {
  const empty = await setupCart(false);
  assert.equal(empty.calls(), 0);
  assert.equal(empty.nodes['#checkout'].disabled, true);
  assert.match(empty.nodes['#quote-message'].textContent, /Selecione/);
  let payload;
  const context = vm.createContext({ cart: [{ id: 'A', quantity: 2, personalization: 'Ana' }, { id: 'B', quantity: 1, personalization: '', selected: false }], api: (path, options) => { payload = JSON.parse(options.body); } });
  vm.runInContext(source('storefront.js').split('\n').find(line => line.startsWith('const quoteCart =')) + '\nquoteCart();', context);
  assert.deepEqual(payload.items, [{ id: 'A', quantity: 2, personalization: 'Ana' }]);
});
test('favoritos alternam e persistem sem alterar o carrinho; produtos indisponíveis são sinalizados', () => {
  const saved = new Map();
  const first = '11111111-1111-4111-8111-111111111111';
  const second = '22222222-2222-4222-8222-222222222222';
  const root = { innerHTML: '', querySelector: () => node() };
  const context = vm.createContext({ cleanFavorites: value => Array.isArray(value) ? value : [], localStorage: { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value) }, document: { querySelectorAll: () => [] }, location: { pathname: '/' }, render() {}, toast() {}, icon: () => '', escape: String, root, cards: rows => rows.map(p => p.name).join('|'), bindCards() {}, cart: [] });
  const script = source('storefront.js');
  vm.runInContext(script.slice(script.indexOf('const favoritesKey ='), script.indexOf('let renderVersion =')), context);
  context.toggleFavorite(first); context.toggleFavorite(second); context.toggleFavorite(first);
  assert.deepEqual(JSON.parse(saved.get('dindinha-favorites-v1')), [second]);
  assert.equal(context.cart.length, 0);
  context.favoritesPage([{ id: second, name: 'Kit MDF' }]);
  assert.match(root.innerHTML, /Kit MDF/);
  context.favoritesPage([]);
  assert.match(root.innerHTML, /favorito está indisponível/);
});
test('catalog combines search, category and price, preserves filters in the URL and clears them', () => {
  const nodes = Object.fromEntries(['#catalog-search', '#catalog-price', '#catalog-sort', '#catalog-count', '#catalog-grid', '#clear-filters'].map(key => [key, node()]));
  nodes['#catalog-search'].value = 'caneca';
  nodes['#catalog-price'].value = 'all';
  nodes['#catalog-sort'].value = 'default';
  const header = node(); let currentUrl = new URL('http://localhost/produtos/?q=caneca&categoria=Canecas&ate=30');
  const products = [{ id: 'A', name: 'Caneca azul', category: 'Canecas', description: '', price: 30 }, { id: 'B', name: 'Caneca rosa', category: 'Canecas', description: '', price: 50 }, { id: 'C', name: 'Kit MDF', category: 'Brinquedos', description: '', price: 20 }];
  const context = vm.createContext({ categoryNames: { Canecas: 'Canecas', Brinquedos: 'Brinquedos' }, document: { querySelector: () => header }, root: { querySelector: key => nodes[key], querySelectorAll: () => [] }, normalize: s => s.toLowerCase(), escape: String, icon: () => '', cards: rows => rows.map(p => p.name).join('|'), bindCards() {}, URL, location: { get href() { return String(currentUrl); } }, history: { replaceState(a, b, next) { currentUrl = new URL(next); } } });
  const script = source('storefront.js');
  vm.runInContext(script.slice(script.indexOf('function catalog('), script.indexOf('function detail(')), context);
  context.catalog(products, currentUrl);
  assert.equal(nodes['#catalog-grid'].innerHTML, 'Caneca azul');
  assert.equal(header.value, 'caneca');
  nodes['#catalog-price'].value = 'all'; nodes['#catalog-price'].change();
  assert.equal(nodes['#catalog-grid'].innerHTML, 'Caneca azul|Caneca rosa');
  assert.equal(currentUrl.searchParams.has('ate'), false);
  nodes['#clear-filters'].click();
  assert.equal(nodes['#catalog-grid'].innerHTML, 'Caneca azul|Caneca rosa|Kit MDF');
  assert.equal(currentUrl.search, '');
  nodes['#catalog-sort'].value = 'price-asc'; nodes['#catalog-sort'].change();
  assert.equal(nodes['#catalog-grid'].innerHTML, 'Kit MDF|Caneca azul|Caneca rosa');
  assert.equal(currentUrl.searchParams.get('ordem'), 'price-asc');
});
test('checkout redirects only with an unchanged cart; stale requests and errors after navigation are ignored', async () => {
  const normal = await setupCart();
  const valid = normal.nodes['#checkout'].click(); normal.resolve({ subtotal: 10 }); await valid;
  assert.equal(normal.redirects.length, 1);
  assert.equal(normal.recorded.length, 1);
  const changed = await setupCart();
  const stale = changed.nodes['#checkout'].click(); changed.context.cart[0].quantity = 2;
  changed.resolve({ subtotal: 10 }); await stale; assert.equal(changed.redirects.length, 0);
  assert.equal(changed.recorded.length, 0);
  const navigated = await setupCart();
  const pending = navigated.nodes['#checkout'].click(); navigated.context.renderVersion++;
  delete navigated.nodes['#quote-message']; navigated.reject(new Error('offline'));
  await pending; assert.equal(navigated.redirects.length, 0);
});
