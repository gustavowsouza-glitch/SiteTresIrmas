import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanCart, cleanFavorites, cleanOrders, addToCart, orderMessage, categoryNames } from './shop-core.mjs';
const id = '52748a7e-7569-4311-9087-c379bec01745';
const item = { id, key: 'first', quantity: 2, personalization: 'Ana' };
test('histórico valida registros, limita a 50 e recalcula os totais em centavos', () => {
  const record = { id, createdAt: '2026-10-22T12:00:00Z', status: 'pago', items: [{ ...item, name: 'Caneca', price: 12.35, total: 0 }], subtotal: 0 };
  const history = cleanOrders([record, { ...record, createdAt: 'inválida' }, { ...record, items: [] }, { ...record, items: [{ ...record.items[0], price: -1 }] }]);
  assert.equal(history.length, 1);
  assert.equal(history[0].subtotal, 24.7);
  assert.equal(history[0].items[0].total, 24.7);
  assert.equal(Object.hasOwn(history[0], 'status'), false);
  assert.equal(history[0].items[0].personalization, 'Ana');
  assert.equal(cleanOrders(Array.from({ length: 60 }, () => record)).length, 50);
  assert.deepEqual(cleanOrders(null), []);
});
test('favoritos preservam apenas IDs válidos, únicos e limitados', () => {
  assert.deepEqual(cleanFavorites(null), []);
  assert.deepEqual(cleanFavorites([id, id, '<script>', null, 1]), [id]);
  const many = Array.from({ length: 210 }, (_, index) => `${index.toString(16).padStart(8, '0')}-1111-4111-8111-111111111111`);
  assert.equal(cleanFavorites(many).length, 200);
});
test('carrinhos antigos são selecionados por padrão e a seleção persiste sem perder personalização', () => {
  assert.equal(cleanCart([item])[0].selected, true);
  const cart = cleanCart([{ ...item, selected: false }]);
  assert.equal(cleanCart(JSON.parse(JSON.stringify(cart)))[0].selected, false);
  const added = addToCart(cart, item);
  assert.equal(added[0].selected, true);
  assert.equal(added[0].personalization, 'Ana');
});
test('carrinho descarta dados inválidos e não armazena preços enviados pelo navegador', () => {
  assert.deepEqual(cleanCart(null), []);
  const cart = cleanCart([{ ...item, price: .01 }, { ...item, quantity: 100 }, { ...item, quantity: -1 }, { ...item, id: '<script>' }, { ...item, quantity: 1.5 }]);
  assert.equal(cart.length, 1); assert.equal(Object.hasOwn(cart[0], 'price'), false);
});
test('une o mesmo presente e preserva personalizações diferentes', () => {
  let cart = addToCart([], item); cart = addToCart(cart, { ...item, key: 'second' });
  assert.equal(cart.length, 1); assert.equal(cart[0].quantity, 4);
  cart = addToCart(cart, { ...item, personalization: 'Bia' });
  assert.equal(cart.length, 2);
  assert.throws(() => addToCart([{ ...item, quantity: 99 }], item));
});
test('mensagem de WhatsApp usa a cotação retornada pelo servidor', () => {
  const text = orderMessage({ items: [{ name: 'Caneca', quantity: 2, price: 12.35, total: 24.7, personalization: 'Ana' }], subtotal: 24.7 });
  assert.match(text, /Dindinha Presentes/); assert.match(text, /24,70/); assert.match(text, /Personalização: Ana/);
  assert.match(text, /sujeitos à confirmação/); assert.equal(Object.keys(categoryNames).length, 4);
});
