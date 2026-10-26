(() => {
  'use strict';
  const config = window.STORE_CONFIG;
  const $ = selector => document.querySelector(selector);
  const login = $('#login'), panel = $('#panel'), editor = $('#editor');
  const message = text => { $('#message').textContent = text; };
  let editing = null;
  let saving = false;
  const management = !!$('#publish-catalog');
  const productsPath = management ? '/management/products' : '/admin/products';
  let revision = 0, pendingDraft = false, draftConflict = false;
  function updatePublishing() {
    if (!management) return;
    $('#publish-catalog').disabled = saving || !pendingDraft || draftConflict || !editor.hidden;
    $('#discard-catalog').disabled = saving || !pendingDraft || !editor.hidden;
    $('#draft-status').textContent = draftConflict
      ? 'A vitrine mudou fora desta central. Descarte os rascunhos para carregar a versão atual.'
      : pendingDraft ? 'Há alterações salvas em rascunho. A loja principal ainda não foi atualizada.'
      : 'Tudo publicado. As próximas edições serão guardadas como rascunho.';
  }
  async function catalogAction(task) {
    if (saving) return;
    saving = true;
    const controls = [...panel.querySelectorAll('button, input, select, textarea'), $('#logout')];
    const disabledStates = controls.map(control => control.disabled);
    controls.forEach(control => { control.disabled = true; }); message('');
    try { await task(); } catch (error) { message(error.message || 'Não foi possível conectar. Tente novamente.'); }
    finally { saving = false; controls.forEach((control, index) => { control.disabled = disabledStates[index]; }); updatePublishing(); }
  }
  if (management) {
    $('#publish-catalog').addEventListener('click', () => {
      if (saving || !pendingDraft || !editor.hidden) return;
      if (!confirm('Publicar todos os rascunhos na loja principal? Produtos removidos do rascunho também sairão da vitrine.')) return;
      catalogAction(async () => {
        await request('/management/publish', { method: 'POST', body: JSON.stringify({ revision }) });
        await loadProducts(); message('Catálogo publicado! Atualize a vitrine para conferir os novos produtos e preços.');
      });
    });
    $('#discard-catalog').addEventListener('click', () => {
      if (saving || !pendingDraft || !editor.hidden) return;
      if (!confirm('Descartar todas as alterações ainda não publicadas? A loja principal será preservada.')) return;
      catalogAction(async () => {
        await request('/management/catalog', { method: 'DELETE', body: JSON.stringify({ revision }) });
        await loadProducts(); message('Rascunhos descartados. Você está vendo o catálogo publicado.');
      });
    });
  }
  const fallback = { Canecas: 'caneca-Ewy437Oq.jpg', Brindes: 'brindes-6tBH5vxx.jpg', Brinquedos: 'brinquedos-BSLPaezt.jpg', Outros: 'hero-BEDHQ4UU.jpg' };
  const categoryLabels = { Canecas: 'Canecas personalizadas', Brindes: 'Brindes personalizados', Brinquedos: 'Brinquedos personalizados', Outros: 'Outros presentes' };
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
    if (saving) return;
    editing = product; editor.reset();
    $('#editor-title').textContent = product ? 'Editar produto' : 'Novo produto';
    for (const key of ['name', 'description', 'category', 'price']) {
      if (product) editor.elements[key].value = key === 'price' ? String(product[key]).replace('.', ',') : product[key];
    }
    editor.elements.active.checked = product ? product.active : true;
    editor.hidden = false; editor.elements.name.focus(); updatePublishing();
  }
  $('#new-product').addEventListener('click', () => openEditor());
  $('#cancel-edit').addEventListener('click', () => { editor.hidden = true; updatePublishing(); });
  async function loadProducts() {
    const result = await request(productsPath);
    if (management) { revision = result.revision; pendingDraft = result.pending; draftConflict = result.conflict; updatePublishing(); }
    const products = management ? result.products : result;
    $('#product-count').textContent = `${products.length} ${products.length === 1 ? 'produto' : 'produtos'} no catálogo`;
    const list = $('#admin-products'); list.replaceChildren();
    for (const product of products) {
      const row = document.createElement('article'); row.className = 'admin-row';
      const image = document.createElement('img'); image.src = `../assets/${fallback[product.category] || fallback.Canecas}`; image.alt = product.name;
      if (product.imageUrl) image.src = product.imageUrl;
      const info = document.createElement('div'); info.className = 'info';
      const title = document.createElement('h2'); title.className = 'font-bold text-primary'; title.textContent = product.name + (product.active ? '' : ' (oculto)');
      const price = document.createElement('p'); price.className = 'text-sm text-muted-foreground'; price.textContent = `${categoryLabels[product.category] || product.category} · ${Number(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
      info.append(title, price);
      const edit = document.createElement('button'); edit.className = 'admin-edit'; edit.textContent = 'Editar produto'; edit.addEventListener('click', () => openEditor(product));
      const remove = document.createElement('button'); remove.className = 'admin-delete'; remove.textContent = management ? 'Remover do rascunho' : 'Excluir';
      remove.addEventListener('click', () => {
        if (saving) return;
        if (!confirm(management ? `Remover “${product.name}” do rascunho? Ele só sairá da loja ao publicar.` : `Excluir permanentemente o produto “${product.name}”?`)) return;
        if (management) {
          catalogAction(async () => {
            await request(`${productsPath}/${encodeURIComponent(product.id)}`, { method: 'DELETE', body: JSON.stringify({ revision }) });
            await loadProducts(); message('Remoção salva em rascunho. Publique para atualizar a loja.');
          });
          return;
        }
        busy(row, async () => { await request(`/admin/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' }); await loadProducts(); message('Produto excluído.'); });
      });
      row.append(image, info, edit, remove); list.append(row);
    }
  }
  editor.addEventListener('submit', event => {
    event.preventDefault();
    if (saving) return;
    saving = true;
    const controls = [...panel.querySelectorAll('button, input, select, textarea'), $('#logout')];
    const disabledStates = controls.map(control => control.disabled);
    const pending = busy(editor, async () => {
      const rawPrice = editor.elements.price.value.trim().replace(',', '.');
      const price = Number(rawPrice);
      if (!rawPrice || !Number.isFinite(price) || price < 0) throw new Error('Informe um preço válido.');
      const name = editor.elements.name.value.trim();
      if (!name) throw new Error('Informe o nome do produto.');
      let imagePath = editing?.image_path || null;
      const file = editor.elements.photo.files[0];
      const productId = editing?.id;
      const product = { name, description: editor.elements.description.value.trim(), price, category: editor.elements.category.value, active: editor.elements.active.checked, image_path: imagePath };
      controls.forEach(control => { control.disabled = true; });
      if (file) {
        if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Escolha uma foto PNG, JPG, WebP ou GIF.');
        if (file.size > 5 * 1024 * 1024) throw new Error('A foto deve ter no máximo 5 MB.');
        const uploaded = await request('/uploads', { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
        imagePath = uploaded.image_path;
      }
      product.image_path = imagePath;
      if (management) product.revision = revision;
      await request(`${productsPath}${productId ? `/${encodeURIComponent(productId)}` : ''}`, { method: productId ? 'PATCH' : 'POST', body: JSON.stringify(product) });
      editor.hidden = true; await loadProducts(); message(management ? 'Rascunho salvo. Confira e clique em Publicar na loja para enviar.' : 'Produto salvo.');
    });
    pending.finally(() => {
      saving = false;
      controls.forEach((control, index) => { control.disabled = disabledStates[index]; });
      updatePublishing();
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
