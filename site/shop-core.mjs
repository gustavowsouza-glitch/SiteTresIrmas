export const categoryNames = Object.freeze({ Canecas: 'Canecas personalizadas', Brindes: 'Brindes personalizados', Brinquedos: 'Brinquedos personalizados', Outros: 'Outros presentes' });
export const categoryImages = Object.freeze({ Canecas: '/assets/caneca-Ewy437Oq.jpg', Brindes: '/assets/brindes-6tBH5vxx.jpg', Brinquedos: '/assets/brinquedos-BSLPaezt.jpg', Outros: '/assets/hero-BEDHQ4UU.jpg' });
export const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function cleanCart(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && /^[a-f0-9-]{36}$/.test(item.id) && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 99).slice(0, 30).map((item, index) => ({ key: typeof item.key === 'string' ? item.key.slice(0, 80) : `${item.id}-${index}`, id: item.id, quantity: item.quantity, personalization: typeof item.personalization === 'string' ? item.personalization.slice(0, 500) : '' }));
}
export function addToCart(cart, item) {
  const items = cleanCart(cart);
  const entry = cleanCart([item])[0];
  if (!entry) throw new Error('Confira a quantidade do produto.');
  const same = items.find(row => row.id === entry.id && row.personalization === entry.personalization);
  if (same) {
    if (same.quantity + entry.quantity > 99) throw new Error('Você pode adicionar até 99 unidades de cada presente.');
    same.quantity += entry.quantity;
  } else {
    if (items.length >= 30) throw new Error('Seu carrinho pode ter até 30 itens diferentes.');
    items.push(entry);
  }
  return items;
}
export function orderMessage(quote) {
  return ['Olá, Dindinha Presentes! Gostaria de solicitar este pedido:', '', ...quote.items.flatMap((item, index) => [`${index + 1}. ${item.name}`, `Quantidade: ${item.quantity} · ${money(item.price)} cada`, ...(item.personalization ? [`Personalização: ${item.personalization}`] : []), `Subtotal: ${money(item.total)}`, '']), `Subtotal dos produtos: ${money(quote.subtotal)}`, 'Podemos combinar a personalização, a entrega e o pagamento?', 'Valores, disponibilidade e prazo sujeitos à confirmação da loja.'].join('\n');
}
