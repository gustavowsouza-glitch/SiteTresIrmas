const $ = selector => document.querySelector(selector);
const message = text => { $('#access-message').textContent = text; };
const mode = document.body.dataset.accessMode;
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function showDelivery(options) {
  const notice = $('#access-delivery');
  notice.hidden = false;
  notice.textContent = options.delivery === 'local'
    ? 'MODO DE TESTE — as solicitações ficam na caixa local do proprietário em Autorizar acessos. Nenhum e-mail real é enviado.'
    : options.enabled ? 'O proprietário é avisado por e-mail para revisar sua solicitação.' : 'O envio de e-mails ainda não foi configurado.';
}
async function api(path, options = {}) {
  const response = await fetch(window.STORE_CONFIG.apiBase + path, { credentials: 'same-origin', cache: 'no-store', ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }, signal: AbortSignal.timeout(25000) });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error || 'Não foi possível concluir.'); error.status = response.status; throw error; }
  return data;
}
let busy = false;
async function action(task) {
  if (busy) return;
  busy = true;
  const controls = [...document.querySelectorAll('button, input')];
  const states = controls.map(control => control.disabled);
  controls.forEach(control => { control.disabled = true; });
  message('');
  try { await task(); }
  catch (error) { message(error.message || 'Falha de conexão. Tente novamente.'); }
  finally { controls.forEach((control, index) => { control.disabled = states[index]; }); busy = false; }
}
if (mode === 'embedded') {
  const login = $('#login'), panel = $('#register-panel'), form = $('#access-register');
  const toggle = register => {
    if (busy) return;
    login.hidden = register; panel.hidden = !register;
    $('#show-register').setAttribute('aria-expanded', String(register));
    $('#message').textContent = '';
    if (register) { login.elements.password.value = ''; form.elements.name.focus(); }
    else { form.elements.password.value = ''; form.elements.confirmation.value = ''; login.elements.email.focus(); }
  };
  $('#show-register').addEventListener('click', () => toggle(true));
  $('#show-login').addEventListener('click', () => toggle(false));
}
if (mode === 'register' || mode === 'embedded') {
  const form = $('#access-register');
  try {
    const options = await api('/auth/access-options');
    showDelivery(options);
    form.querySelector('button[type="submit"]').disabled = !options.enabled;
    message(options.enabled ? 'Sua conta só será liberada após aprovação do proprietário.' : 'O proprietário ainda precisa configurar o envio de e-mails. As solicitações estão temporariamente indisponíveis.');
  } catch { message('Não foi possível conferir o serviço. Atualize a página para tentar novamente.'); }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (form.querySelector('button[type="submit"]').disabled) return;
    if (form.elements.password.value !== form.elements.confirmation.value) { message('As senhas precisam ser iguais.'); return; }
    action(async () => {
      const payload = { name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), password: form.elements.password.value };
      const result = await api('/auth/access-requests', { method: 'POST', body: JSON.stringify(payload) });
      form.reset(); message(result.message);
    });
  });
} else if (mode === 'owner') {
  const form = $('#owner-login'), panel = $('#owner-requests');
  const focus = new URLSearchParams(location.hash.slice(1));
  async function load() {
    const rows = await api('/owner/access-requests');
    form.hidden = true; panel.hidden = false;
    $('#request-list').innerHTML = rows.length ? rows.map(row => `<article class="access-request ${focus.get('solicitacao') === row.id ? 'is-focused' : ''}"><h2>${escape(row.name)}</h2><p>E-mail informado: ${escape(row.email)}</p><p>Solicitado em ${escape(new Date(row.created_at).toLocaleString('pt-BR'))}<br>Expira em ${escape(new Date(row.expires_at).toLocaleString('pt-BR'))}</p><div class="access-actions"><button class="button button-primary" type="button" data-id="${escape(row.id)}" data-decision="approve">Permitir</button><button class="button access-deny" type="button" data-id="${escape(row.id)}" data-decision="deny">Negar</button></div></article>`).join('') : '<p>Nenhuma solicitação pendente.</p>';
    document.querySelectorAll('[data-decision]').forEach(button => button.addEventListener('click', () => {
      if (busy) return;
      const approve = button.dataset.decision === 'approve';
      if (!confirm(approve ? 'Permitir que essa pessoa administre os produtos da loja?' : 'Negar esta solicitação? Nenhuma conta será criada.')) return;
      action(async () => {
        const result = await api(`/owner/access-requests/${encodeURIComponent(button.dataset.id)}`, { method: 'POST', body: JSON.stringify({ decision: button.dataset.decision }) });
        await load(); message(result.message);
      });
    }));
    if (focus.get('solicitacao') && !rows.some(row => row.id === focus.get('solicitacao'))) message('A solicitação indicada expirou, já foi respondida ou não está disponível.');
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    action(async () => {
      const identity = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: form.elements.email.value.trim(), password: form.elements.password.value }) });
      form.elements.password.value = '';
      if (!identity.isOwner) throw new Error('Use a conta proprietária por e-mail. Outros ADMs não podem autorizar acessos.');
      await load();
    });
  });
  $('#refresh-requests').addEventListener('click', () => action(load));
  $('#owner-logout').addEventListener('click', () => action(async () => {
    await api('/auth/logout', { method: 'POST' }); panel.hidden = true; form.hidden = false; $('#request-list').replaceChildren(); message('Sessão encerrada.');
  }));
  try {
    showDelivery(await api('/auth/access-options'));
    const identity = await api('/auth/session');
    if (identity.isOwner) await load();
    else message('Entre com o e-mail da conta proprietária para decidir. Outros ADMs só gerenciam produtos.');
  } catch (error) { if (error.status !== 401) message(error.message); }
}
