(() => {
  'use strict';
  const config = window.STORE_CONFIG;
  const $ = selector => document.querySelector(selector);
  const login = $('#login'), panel = $('#panel'), editor = $('#editor');
  const message = text => { $('#message').textContent = text; };
  let editing = null;
  const fallback = { Canecas: 'caneca-Ewy437Oq.jpg', Brindes: 'brindes-6tBH5vxx.jpg', Brinquedos: 'brinquedos-BSLPaezt.jpg' };
  async function request(path, options = {}) {
    const headers = { ...options.headers };
    if (options.body && !(options.body instanceof File)) headers['Content-Type'] = 'application/json';
    const response = await fetch(config.apiBase + path, { ...options, credentials: 'same-origin', headers, signal: AbortSignal.timeout(20000) });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { throw new Error('O servidor não respondeu corretamente. Tente novamente.'); }
    if (!response.ok) {
      const error = new Error(data?.error || `Não foi possível concluir a operação (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return data;
  }
  async function busy(form, task) {
    const buttons = form.querySelectorAll('button');
    buttons.forEach(button => { button.disabled = true; });
    message('');
    try { await task(); } catch (error) { message(error.message || 'Não foi possível conectar. Tente novamente.'); }
    finally { buttons.forEach(button => { button.disabled = false; }); }
  }
  login.addEventListener('submit', event => {
    event.preventDefault();
    busy(login, async () => {
      await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: login.elements.email.value.trim(), password: login.elements.password.value }) });
      login.elements.password.value = '';
      await showPanel();
    });
  });
  $('#logout').addEventListener('click', async () => {
    busy($('#logout').parentElement, async () => {
      await request('/auth/logout', { method: 'POST' });
      panel.hidden = true; editor.hidden = true; login.hidden = false; $('#login-view').hidden = false; $('#logout').hidden = true;
      $('#admin-products').replaceChildren(); message('Sessão encerrada.');
    });
  });
  function openEditor(product = null) {
    editing = product; editor.reset();
    $('#editor-title').textContent = product ? 'Editar produto' : 'Novo produto';
    for (const key of ['name', 'description', 'category', 'price']) {
      if (product) editor.elements[key].value = key === 'price' ? String(product[key]).replace('.', ',') : product[key];
    }
    editor.elements.active.checked = product ? product.active : true;
    editor.hidden = false; editor.elements.name.focus();
  }
  $('#new-product').addEventListener('click', () => openEditor());
  $('#cancel-edit').addEventListener('click', () => { editor.hidden = true; });
  async function loadProducts() {
    const products = await request('/admin/products');
    $('#product-count').textContent = `${products.length} ${products.length === 1 ? 'produto' : 'produtos'} no catálogo`;
    const list = $('#admin-products'); list.replaceChildren();
    for (const product of products) {
      const row = document.createElement('article'); row.className = 'admin-row';
      const image = document.createElement('img'); image.src = `../assets/${fallback[product.category] || fallback.Canecas}`; image.alt = product.name;
      if (product.imageUrl) image.src = product.imageUrl;
      const info = document.createElement('div'); info.className = 'info';
      const title = document.createElement('h2'); title.className = 'font-bold text-primary'; title.textContent = product.name + (product.active ? '' : ' (oculto)');
      const price = document.createElement('p'); price.className = 'text-sm text-muted-foreground'; price.textContent = `${product.category} · ${Number(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
      info.append(title, price);
      const edit = document.createElement('button'); edit.className = 'admin-edit'; edit.textContent = 'Editar produto'; edit.addEventListener('click', () => openEditor(product));
      const remove = document.createElement('button'); remove.className = 'admin-delete'; remove.textContent = 'Excluir';
      remove.addEventListener('click', () => {
        if (!confirm(`Excluir permanentemente o produto “${product.name}”?`)) return;
        busy(row, async () => { await request(`/admin/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' }); await loadProducts(); message('Produto excluído.'); });
      });
      row.append(image, info, edit, remove); list.append(row);
    }
  }
  editor.addEventListener('submit', event => {
    event.preventDefault();
    busy(editor, async () => {
      const rawPrice = editor.elements.price.value.trim().replace(',', '.');
      const price = Number(rawPrice);
      if (!rawPrice || !Number.isFinite(price) || price < 0) throw new Error('Informe um preço válido.');
      const name = editor.elements.name.value.trim();
      if (!name) throw new Error('Informe o nome do produto.');
      let imagePath = editing?.image_path || null;
      const file = editor.elements.photo.files[0];
      if (file) {
        if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Escolha uma foto PNG, JPG, WebP ou GIF.');
        if (file.size > 5 * 1024 * 1024) throw new Error('A foto deve ter no máximo 5 MB.');
        const uploaded = await request('/uploads', { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
        imagePath = uploaded.image_path;
      }
      const product = { name, description: editor.elements.description.value.trim(), price, category: editor.elements.category.value, active: editor.elements.active.checked, image_path: imagePath };
      await request(`/admin/products${editing ? `/${encodeURIComponent(editing.id)}` : ''}`, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(product) });
      editor.hidden = true; await loadProducts(); message('Produto salvo.');
    });
  });
  async function showPanel() {
    await loadProducts();
    login.hidden = true; $('#login-view').hidden = true; panel.hidden = false; $('#logout').hidden = false;
  }
  async function restoreSession() {
    login.querySelector('button[type="submit"]').disabled = true;
    try { await request('/auth/session'); await showPanel(); }
    catch (error) { if (error.status !== 401) message(error.message); }
    finally { login.querySelector('button[type="submit"]').disabled = false; }
  }
  restoreSession();
})();
