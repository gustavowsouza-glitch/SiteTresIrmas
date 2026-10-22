import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanCart, addToCart, orderMessage, categoryNames } from './shop-core.mjs';
const id = '52748a7e-7569-4311-9087-c379bec01745';
const item = { id, key: 'first', quantity: 2, personalization: 'Ana' };
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
