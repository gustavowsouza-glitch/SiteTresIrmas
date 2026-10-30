const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function approvalMailer({ key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM, fetcher = fetch } = {}) {
  if (!key || !from) return null;
  return async ({ to, name, email, reviewUrl, requestId }) => {
    const link = (decision, label) => `<a href="${escape(`${reviewUrl}&acao=${decision}`)}" style="display:inline-block;padding:12px 20px;margin:8px;background:#713052;color:#fff;border-radius:8px;text-decoration:none">${label}</a>`;
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `access-${requestId}` },
      body: JSON.stringify({ from, to: [to], subject: 'Dindinha Presentes — solicitação de acesso ADM',
        text: `Solicitação de acesso ADM\nNome informado: ${name}\nE-mail informado: ${email}\n\nRevisar: ${reviewUrl}\nEntre com a conta proprietária e escolha Permitir ou Negar. A solicitação expira em 48 horas. Nenhuma senha é enviada por e-mail.`,
        html: `<h2>Solicitação de acesso ADM</h2><p>Nome informado: <strong>${escape(name)}</strong><br>E-mail informado: ${escape(email)}</p><p>Ao permitir, a pessoa poderá gerenciar os produtos. Somente a conta proprietária pode decidir.</p>${link('approve', 'Permitir')}${link('deny', 'Negar')}<p>Os botões abrem a revisão, sem decidir automaticamente. Entre com a conta proprietária e confirme. Prazo: 48 horas. Não compartilhamos a senha do solicitante.</p>` })
    });
    if (!response.ok) throw new Error('Falha no envio do aviso por e-mail.');
  };
}
