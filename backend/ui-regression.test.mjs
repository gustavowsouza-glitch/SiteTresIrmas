import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const source = name => readFileSync(new URL(existsSync(new URL(`./ui/${name}`, import.meta.url)) ? `./ui/${name}` : `../site/${name === 'admin.js' ? 'admin/admin.js' : name}`, import.meta.url), 'utf8');
const node = () => ({ disabled: false, hidden: false, value: '', checked: false, files: [], textContent: '', addEventListener(type, fn) { this[type] = fn; }, querySelectorAll() { return []; }, focus() {}, reset() {}, replaceChildren() {}, append() {} });
const tick = () => new Promise(resolve => setImmediate(resolve));

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

async function setupCart() {
  const nodes = Object.fromEntries(['#cart-lines', '#cart-subtotal', '#quote-message', '#checkout'].map(key => [key, node()]));
  const redirects = []; let calls = 0; let resolveQuote, rejectQuote;
  const context = vm.createContext({ cart: [{ id: 'A', quantity: 1, personalization: '' }], renderVersion: 1, root: { querySelector: s => nodes[s] || null, querySelectorAll: () => [] }, icon: () => '', escape: String, image: () => '', categoryImages: {}, money: String, quoteCart: () => ++calls === 1 ? Promise.resolve({ subtotal: 10 }) : new Promise((resolve, reject) => { resolveQuote = resolve; rejectQuote = reject; }), orderMessage: JSON.stringify, whatsapp: String, location: { assign: url => redirects.push(url) } });
  const script = source('storefront.js');
  vm.runInContext(script.slice(script.indexOf('async function cartPage('), script.indexOf('function contact()')), context);
  await context.cartPage([{ id: 'A', name: 'A', price: 10 }], 1);
  return { context, nodes, redirects, resolve: quote => resolveQuote(quote), reject: error => rejectQuote(error) };
}
test('checkout redirects only with an unchanged cart; stale requests and errors after navigation are ignored', async () => {
  const normal = await setupCart();
  const valid = normal.nodes['#checkout'].click(); normal.resolve({ subtotal: 10 }); await valid;
  assert.equal(normal.redirects.length, 1);
  const changed = await setupCart();
  const stale = changed.nodes['#checkout'].click(); changed.context.cart[0].quantity = 2;
  changed.resolve({ subtotal: 10 }); await stale; assert.equal(changed.redirects.length, 0);
  const navigated = await setupCart();
  const pending = navigated.nodes['#checkout'].click(); navigated.context.renderVersion++;
  delete navigated.nodes['#quote-message']; navigated.reject(new Error('offline'));
  await pending; assert.equal(navigated.redirects.length, 0);
});
