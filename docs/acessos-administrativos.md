# Solicitar e autorizar acessos administrativos

[Voltar ao índice](README.md)

## Funcionamento

1. Na tela de login do ADM, a pessoa escolhe **Criar conta**. O formulário aparece na mesma página, preservando o visual da tela de acesso; **Já tenho conta → Entrar** volta ao login. A rota `/solicitar-acesso/` continua disponível para links diretos.
2. Informa nome, e-mail e uma nova senha de 12 a 128 caracteres. Não é solicitada a senha da caixa de e-mail.
3. Se o envio de e-mail estiver configurado, o servidor salva uma solicitação pendente, com a senha em hash, e avisa `gustavo.wsouza@sacws.com.br`.
4. O proprietário abre **Permitir** ou **Negar** no e-mail. O link leva à página `/autorizacoes/`, destacando a solicitação. Abrir o link não decide nada.
5. É preciso entrar com a **conta proprietária por e-mail**, conferir os dados e confirmar a decisão no site. O usuário adicional `gustavo` e os outros ADMs não têm essa permissão.
6. Ao permitir, a conta é criada com o e-mail como login, nome salvo e senha escolhida pelo solicitante. Ela pode administrar produtos, mas não autorizar usuários.
7. Ao negar, a solicitação e seu hash pendente são removidos e nenhuma conta é criada.

As solicitações expiram em 48 horas. A revisão recusa solicitações expiradas ou respondidas; a limpeza roda ao iniciar, periodicamente e nas consultas. Negar não bloqueia para sempre aquele e-mail: uma nova solicitação futura é possível. Não há e-mail automático de resultado ao solicitante nesta versão; o proprietário deve comunicar a decisão.

Os nomes e e-mails informados são declarações do solicitante, não uma identidade verificada. Confira quem está pedindo antes de permitir. A solicitação não gera sessão e não libera acesso automaticamente.

## Situação inicial: envio desativado

### Testar sem serviço de e-mail

Nesta instalação foi ativado `ACCESS_MAIL_MODE=local` no arquivo privado `.env`. A solicitação aparece na própria página `/autorizacoes/`, acessível somente ao proprietário. As telas e a resposta de cadastro mostram um aviso de teste; nenhum e-mail real é enviado. A aprovação continua criando um acesso administrativo de verdade nesta instalação, por isso aprove apenas as pessoas desejadas.

1. Abra `/gestao/` e, na tela de acesso, clique em **Criar conta**. Se já estiver conectado, saia da conta para visualizar o formulário de entrada. Preencha nome, um e-mail válido de teste e senha de pelo menos 12 caracteres, sem sair dessa página.
2. Abra `/autorizacoes/` e entre com o e-mail da conta proprietária. Não use o usuário adicional `gustavo` para aprovar.
3. Clique em **Atualizar solicitações**, confira os dados e escolha **Permitir** ou **Negar**.
4. Se permitir, teste o login com o e-mail e a senha solicitados. Se negar, nenhuma conta é criada.

O modo local só inicia com `PUBLIC_ORIGIN` apontando para `localhost` ou endereço de loopback. Não desativa autenticação, verificação de origem, limites ou expiração. Ele pode ser ativado em outra instalação com `ACCESS_MAIL_MODE=local` no `.env` e reconstrução/reinício pelo Compose.

Para enviar e-mails reais, troque para `ACCESS_MAIL_MODE=resend` e preencha as credenciais de envio abaixo. O modo padrão do código e do modelo `.env.example` continua sendo `resend`, sem ativação automática da caixa local.

### Modo de envio real sem credenciais

Sem `RESEND_API_KEY` e `MAIL_FROM`, o botão de solicitação fica bloqueado com um aviso. A API também recusa a solicitação com 503 e não cria pendência nem conta. Se a configuração existir mas o envio falhar, retorna 502 e remove a pendência ainda não aprovada.

O fluxo foi testado com transporte de e-mail simulado. Isso não comprova entrega em uma caixa de e-mail real; a configuração e um teste autorizado de entrega ainda são necessários.

## Configurar o envio via Resend

A integração usa a API HTTPS do Resend, sem adicionar dependências npm.

1. Configure sua conta no serviço e um remetente autorizado. Se usar domínio próprio, siga a verificação de domínio no provedor; não basta colocar qualquer endereço em `MAIL_FROM`.
2. Crie uma chave de envio e guarde-a em arquivo privado. Não cole a chave no chat, no README, em exemplos ou em commits.
3. Se ainda não existir `.env`, crie uma cópia do modelo na raiz:

```powershell
if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
```

4. Edite `.env` localmente. Complete `RESEND_API_KEY` com sua chave e `MAIL_FROM` com o remetente autorizado. `.env.example` deve continuar sem credenciais. O Compose injeta essas configurações apenas no backend.
5. Execute:

```powershell
docker compose up -d --build --wait
```

6. Confira `/solicitar-acesso/`. A disponibilidade também depende de o e-mail da conta proprietária no banco corresponder ao destinatário configurado.
7. Faça um teste de entrega com uma solicitação real desejada e confira remetente, destino, dados e link. Negue se for apenas um teste e não quiser criar a conta. O site não imprime chaves, senhas ou conteúdo dos e-mails nos logs.

Referências oficiais: [enviar e-mail](https://resend.com/docs/api-reference/emails/send-email) e [configurar domínio](https://resend.com/docs/dashboard/domains/introduction).

## Limite do endereço local

O serviço atual só atende `http://localhost:8080`. O link recebido precisa ser aberto **no computador que executa o site**. No celular ou em outro computador, `localhost` aponta para outro equipamento.

Para autorizar de qualquer lugar, primeiro publique o site com HTTPS e configure `PUBLIC_ORIGIN` com a origem pública exata e `COOKIE_SECURE=true`. Não exponha a porta local nem desative a autenticação para contornar essa limitação.

## Arquivos e contratos

| Local | Responsabilidade |
| --- | --- |
| [backend/access-requests.mjs](../backend/access-requests.mjs) | Validação, pendências, expiração e transação da decisão |
| [backend/approval-mail.mjs](../backend/approval-mail.mjs) | Transporte HTTPS e mensagem HTML/texto |
| [backend/server.mjs](../backend/server.mjs) | Sessão proprietária, endpoints e limite de solicitações |
| [site/solicitar-acesso/index.html](../site/solicitar-acesso/index.html) | Formulário público de solicitação |
| [site/autorizacoes/index.html](../site/autorizacoes/index.html) | Login proprietário e revisão |
| [site/access.js](../site/access.js) | Interações das duas telas, confirmação e respostas da API |
| [site/access.css](../site/access.css) | Visual das duas telas |
| [backend/access-requests.test.mjs](../backend/access-requests.test.mjs) | Regressões de autorização e envio simulado |

`GET /api/auth/access-options` retorna `{ "enabled": boolean, "delivery": "local" | "email" }`. `POST /api/auth/access-requests` recebe `{ "name", "email", "password" }` e retorna 202 em caso de sucesso. Há limite de cinco tentativas por endereço por hora, em memória, além do limite global de pendências.

Somente a conta proprietária consulta `GET /api/owner/access-requests` e envia `POST /api/owner/access-requests/:id` com `{ "decision": "approve" }` ou `{ "decision": "deny" }`. Administradores comuns recebem 403, inclusive quando tentam chamar esses endpoints diretamente. O resultado de login e sessão inclui `isOwner`, calculado no servidor; enviar esse campo no cadastro não concede privilégios.

`access_requests` guarda ID, nome, e-mail, hash pendente, estado e datas. `admin_profiles` guarda nome/e-mail dos acessos aprovados; a credencial ativa fica em `admin_logins`. Essas tabelas entram no backup completo e não são incluídas na exportação de produtos para Lovable.

Contas existentes não são convertidas nem removidas por essa mudança. Scripts locais de manutenção ainda pressupõem acesso ao computador/servidor; não são endpoints públicos disponíveis aos ADMs da loja.

## Testar sem enviar e-mails

```powershell
docker compose build api
docker run --rm --network none irmas-coqueiro-api node --test access-requests.test.mjs
```

A suíte injeta um remetente simulado e verifica permissão exclusiva, conta pendente sem login, aprovação, negação, expiração, duplicatas, limite de solicitações, falha de entrega, ausência de configuração, escape HTML e proteção contra requisições de outra origem. Não monta o volume real e não envia mensagens.
