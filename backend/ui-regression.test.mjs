import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const source = name => readFileSync(new URL(existsSync(new URL(`./ui/${name}`, import.meta.url)) ? `./ui/${name}` : `../site/${name === 'admin.js' ? 'admin/admin.js' : name}`, import.meta.url), 'utf8');
const node = () => ({ disabled: false, hidden: false, value: '', checked: false, files: [], textContent: '', addEventListener(type, fn) { this[type] = fn; }, querySelectorAll() { return []; }, focus() {}, reset() {}, replaceChildren() {}, append() {} });
const tick = () => new Promise(resolve => setImmediate(resolve));
test('seletor das listas mantém um único destino ativo e carrinho vazio não pede cotação', async () => {
  const script = source('storefront.js');
  const root = { innerHTML: '' };
  const context = vm.createContext({ cart: [], favorites: ['favorite'], root, icon: () => '', quoteCart: () => { throw Error('Carrinho vazio não deve consultar a API'); } });
  vm.runInContext(script.slice(script.indexOf('function shoppingTabs('), script.indexOf('function favoritesPage(')), context);
  for (const [active, route] of [['cart', '/carrinho/'], ['favorites', '/favoritos/'], ['orders', '/minhas-compras/']]) {
    const markup = context.shoppingTabs(active);
    assert.equal((markup.match(/aria-current="page"/g) || []).length, 1);
    assert.ok(markup.includes(`href="${route}" aria-current="page"`));
    assert.equal((markup.match(/<a /g) || []).length, 3);
    assert.match(markup, /data-favorites-count>1/);
  }
  vm.runInContext(script.slice(script.indexOf('async function cartPage('), script.indexOf('function contact()')), context);
  await context.cartPage([], 1);
  assert.match(root.innerHTML, /Seu carrinho ainda está vazio/);
  assert.ok(root.innerHTML.includes('href="/produtos/"'));
  assert.ok(root.innerHTML.includes('href="/favoritos/"'));
  assert.equal(root.innerHTML.includes('id="checkout"'), false);
});
test('criar conta alterna dentro do login e envia uma solicitação sem navegar ou liberar acesso', async () => {
  const selectors = ['#login', '#register-panel', '#access-register', '#show-register', '#show-login', '#message', '#access-message', '#access-delivery'];
  const nodes = Object.fromEntries(selectors.map(key => [key, node()]));
  nodes['#register-panel'].hidden = true;
  nodes['#show-register'].setAttribute = (key, value) => { nodes['#show-register'][key] = value; };
  const form = nodes['#access-register'];
  form.elements = Object.fromEntries(['name', 'email', 'password', 'confirmation'].map(key => [key, node()]));
  nodes['#login'].elements = { email: node(), password: node() };
  const submit = node(); submit.disabled = true;
  form.querySelector = () => submit;
  const requests = [];
  const context = vm.createContext({ document: { body: { dataset: { accessMode: 'embedded' } }, querySelector: selector => nodes[selector], querySelectorAll: () => [submit, nodes['#show-register'], nodes['#show-login'], ...Object.values(form.elements)] }, window: { STORE_CONFIG: { apiBase: '/api' } }, AbortSignal, fetch: async (path, options) => { requests.push({ path, options }); return { ok: true, json: async () => path.endsWith('access-options') ? { enabled: true, delivery: 'local' } : { message: 'Solicitação pendente na caixa local.' } }; } });
  await vm.runInContext(`(async () => { ${source('access.js')} })()`, context);
  nodes['#show-register'].click();
  assert.equal(nodes['#login'].hidden, true); assert.equal(nodes['#register-panel'].hidden, false);
  assert.equal(nodes['#show-register']['aria-expanded'], 'true');
  nodes['#show-login'].click();
  assert.equal(nodes['#login'].hidden, false); assert.equal(nodes['#register-panel'].hidden, true);
  nodes['#show-register'].click();
  Object.assign(form.elements.name, { value: 'Teste' }); Object.assign(form.elements.email, { value: 'test@example.test' });
  form.elements.password.value = 'Temporary-Password-123'; form.elements.confirmation.value = 'different';
  form.submit({ preventDefault() {} }); await tick();
  assert.equal(requests.filter(row => row.options.method === 'POST').length, 0);
  form.elements.confirmation.value = form.elements.password.value;
  form.submit({ preventDefault() {} }); await tick();
  const sent = requests.filter(row => row.options.method === 'POST');
  assert.equal(sent.length, 1); assert.equal(sent[0].path, '/api/auth/access-requests');
  assert.equal(nodes['#login'].hidden, true); assert.match(nodes['#access-message'].textContent, /pendente/);
});
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
  const history = [
    { id: '22222222-2222-4222-8222-222222222222', createdAt: '2026-09-15T12:00:00Z', items: [{ id, name: 'Pedido antigo', quantity: 2, price: 12.35, personalization: '<Nome especial>' }] },
    { id: '33333333-3333-4333-8333-333333333333', createdAt: '2026-10-20T12:00:00Z', items: [{ id, name: 'Pedido recente', quantity: 1, price: 30, personalization: '' }, { id, name: 'Outro presente', quantity: 3, price: 10, personalization: 'Ana' }] }
  ];
  vm.runInContext(`orders = cleanOrders(${JSON.stringify(history)});`, context);
  context.purchasesPage();
  assert.ok(root.innerHTML.indexOf('Pedido recente') < root.innerHTML.indexOf('Pedido antigo'));
  assert.match(root.innerHTML, /outubro de 2026/); assert.match(root.innerHTML, /setembro de 2026/);
  assert.match(root.innerHTML, /&lt;Nome especial&gt;/);
  assert.match(root.innerHTML, /Outro presente/);
  assert.match(root.innerHTML, /24\.7/);
  assert.match(root.innerHTML, /60/);
  assert.equal((root.innerHTML.match(/class="purchase-record"/g) || []).length, 2);
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
test('menus do catálogo aplicam a escolha, sincronizam a limpeza e aceitam teclado', () => {
  const document = { activeElement: null, createElement() {
    return { ...node(), children: [], attributes: {}, setAttribute(key, value) { this.attributes[key] = value; },
      append(...children) { this.children.push(...children); }, focus() { document.activeElement = this; }, contains(target) { return this === target || this.children.some(child => child.contains(target)); } };
  } };
  const select = { value: 'all', options: [{ value: 'all', textContent: 'Todos os valores' }, { value: '30', textContent: 'Até R$ 30' }],
    get selectedIndex() { return this.options.findIndex(option => option.value === this.value); },
    getAttribute: () => 'Faixa de preço', after(dropdown) { this.dropdown = dropdown; } };
  let changes = 0;
  const context = vm.createContext({ document });
  const script = source('storefront.js');
  vm.runInContext(script.slice(script.indexOf('function enhanceCatalogSelect('), script.indexOf('function detail(')), context);
  const sync = context.enhanceCatalogSelect(select, () => changes++);
  const [trigger, menu] = select.dropdown.children;
  assert.equal(select.hidden, true);
  assert.equal(trigger.textContent, 'Todos os valores');
  assert.equal(menu.children[0].attributes['aria-checked'], 'true');
  document.activeElement = trigger;
  select.dropdown.keydown({ key: 'ArrowDown', preventDefault() {} });
  assert.equal(document.activeElement, menu.children[0]);
  select.dropdown.keydown({ key: 'End', preventDefault() {} });
  assert.equal(document.activeElement, menu.children[1]);
  menu.children[1].click();
  assert.equal(select.value, '30');
  assert.equal(changes, 1);
  assert.equal(trigger.textContent, 'Até R$ 30');
  assert.equal(menu.children[1].attributes['aria-checked'], 'true');
  assert.equal(select.dropdown.open, false);
  assert.equal(document.activeElement, trigger);
  select.value = 'all'; sync();
  assert.equal(trigger.textContent, 'Todos os valores');
  assert.equal(menu.children[1].attributes['aria-checked'], 'false');
  select.dropdown.open = true;
  select.dropdown.keydown({ key: 'Escape', preventDefault() {} });
  assert.equal(select.dropdown.open, false);
  select.dropdown.open = true;
  select.dropdown.focusout({ relatedTarget: null });
  assert.equal(select.dropdown.open, false);
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


test('management saves a draft before publishing and blocks publication during edits or pending requests', async () => {
  const ids = ['login','panel','editor','message','logout','new-product','cancel-edit','editor-title','admin-products','product-count','login-view','publish-catalog','discard-catalog','draft-status'];
  const nodes = Object.fromEntries(ids.map(id => [`#${id}`, node()]));
  const editor = nodes['#editor']; editor.hidden = true;
  editor.elements = Object.fromEntries(['name','description','category','price','active','photo'].map(key => [key,node()]));
  nodes['#login'].querySelector = () => node();
  const controls = [...Object.values(editor.elements),nodes['#publish-catalog'],nodes['#discard-catalog']];
  nodes['#panel'].querySelectorAll = () => controls;
  const product = { id:'11111111-1111-4111-8111-111111111111',name:'Caneca original',description:'Original',category:'Canecas',price:10,active:true,image_path:null };
  let published = {...product}, draft = {...product}, revision=0, pending=false, release;
  const calls=[];
  const response = body => ({ok:true,text:async()=>JSON.stringify(body)});
  const state = () => ({products:[draft],revision,pending,conflict:false});
  const context=vm.createContext({window:{STORE_CONFIG:{apiBase:'/api'}},document:{querySelector:s=>nodes[s],createElement:node},File:class {},AbortSignal,confirm:()=>true,fetch:async(url,options={})=>{
    calls.push({url,method:options.method});
    if(url.endsWith('/auth/session'))return response({});
    if(url.endsWith('/management/products'))return response(state());
    if(options.method==='PATCH'){
      const body=JSON.parse(options.body);assert.equal(body.revision,revision);
      draft={...draft,...body};pending=true;revision++;return response(state());
    }
    if(url.endsWith('/management/publish')){
      assert.equal(JSON.parse(options.body).revision,revision);
      return new Promise(resolve=>{release=()=>{published={...draft};pending=false;revision++;resolve(response(state()));};});
    }
    throw Error('Unexpected request '+url);
  }});
  vm.runInContext(source('admin.js').replace('  restoreSession();', '  globalThis.openEditorForTest = openEditor; restoreSession();'),context);
  await tick();await tick();
  assert.equal(nodes['#publish-catalog'].disabled,true);
  nodes['#new-product'].click();
  editor.elements.name.value='Nova caneca';editor.elements.description.value='Nova';editor.elements.category.value='Canecas';editor.elements.price.value='25,90';editor.elements.active.checked=true;
  context.openEditorForTest(product);
  editor.elements.name.value='Caneca revisada';editor.elements.price.value='25,90';
  editor.submit({preventDefault(){}});await tick();await tick();
  assert.equal(published.price,10);assert.equal(draft.price,25.90);
  assert.equal(editor.hidden,true);assert.equal(nodes['#publish-catalog'].disabled,false);
  nodes['#new-product'].click();assert.equal(nodes['#publish-catalog'].disabled,true);
  nodes['#cancel-edit'].click();assert.equal(nodes['#publish-catalog'].disabled,false);
  nodes['#publish-catalog'].click();assert.equal(controls.every(control=>control.disabled),true);
  nodes['#publish-catalog'].click();assert.equal(calls.filter(call=>call.url.endsWith('/management/publish')).length,1);
  release();await tick();await tick();
  assert.equal(published.price,25.90);assert.equal(nodes['#publish-catalog'].disabled,true);
  assert.match(nodes['#message'].textContent,/publicado/);
});
