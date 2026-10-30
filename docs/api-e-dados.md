# API e dados

[Voltar ao índice](README.md)

Referência da implementação de [backend/server.mjs](../backend/server.mjs). A API é acessada pelo navegador no mesmo domínio, pelo prefixo `/api`.

## Contratos gerais

- JSON de entrada deve ser um objeto. `null`, arrays e valores simples são recusados com 400.
- Corpos JSON usam `Content-Type: application/json` e limite de 20.000 bytes.
- Upload é uma exceção: corpo binário, sem JSON nem multipart, até 5 MiB.
- Erros JSON têm formato `{ "error": "Mensagem" }`.
- Respostas JSON não são armazenadas em cache. Fotos têm cache público de um dia.
- Alterações passam pela verificação de origem e de requisição entre sites, além da autenticação quando o endpoint é administrativo.

## Endpoints

Todos os caminhos abaixo começam com `/api`.

| Método e caminho | Acesso | Comportamento |
| --- | --- | --- |
| `GET /health` | Público | Saúde da API: `{ "ok": true }` |
| `POST /auth/login` | Público | Recebe `email` e `password`; `email` também aceita o nome de usuário |
| `GET /auth/session` | Administrador | Identidade da sessão atual |
| `POST /auth/logout` | Sem exigência de sessão válida | Invalida o token apresentado e expira o cookie |
| `GET /products` | Público | Array de produtos publicados e ativos |
| `GET /products/:id` | Público | Produto ativo; indisponível retorna 404 |
| `POST /cart/quote` | Público | Valida linhas e retorna preços atuais e subtotal |
| `GET /admin/products` | Administrador | Produtos publicados, inclusive ocultos |
| `POST /admin/products` | Administrador | Cria um produto publicado diretamente |
| `PATCH /admin/products/:id` | Administrador | Atualiza um produto publicado diretamente |
| `DELETE /admin/products/:id` | Administrador | Exclui um produto publicado diretamente |
| `POST /uploads` | Administrador | Recebe uma foto binária e devolve seu identificador |
| `GET /images/:filename` | Público | Entrega a imagem enviada |
| `GET /management/products` | Administrador | Estado do rascunho ou do catálogo atual, se não houver rascunho |
| `POST /management/products` | Administrador | Inclui produto no rascunho |
| `PATCH /management/products/:id` | Administrador | Atualiza produto no rascunho |
| `DELETE /management/products/:id` | Administrador | Remove produto do rascunho |
| `POST /management/publish` | Administrador | Publica o rascunho inteiro, de forma transacional |
| `DELETE /management/catalog` | Administrador | Descarta o rascunho inteiro e preserva a vitrine |

## Produto

Exemplo de payload para criação/edição; os valores são ilustrativos:

```json
{
  "name": "Caneca personalizada",
  "description": "Nome e tema a combinar.",
  "category": "Canecas",
  "price": 39.9,
  "active": true,
  "image_path": null
}
```

Apesar do método `PATCH`, os campos obrigatórios devem ser enviados juntos; não há mesclagem automática de um payload parcial. Na gestão, inclua também `revision`, obtida da última resposta.

| Campo | Regra atual |
| --- | --- |
| `name` | Texto não vazio, até 200 caracteres; gravado sem espaços nas pontas |
| `description` | Texto de até 5.000 caracteres |
| `category` | `Canecas`, `Brindes`, `Brinquedos` ou `Outros` |
| `price` | Número em reais, entre 0 e 1.000.000; convertido para centavos com arredondamento |
| `active` | Booleano |
| `image_path` | `null` ou nome retornado pelo upload; a gravação exige que o arquivo exista |

A resposta acrescenta `id`, `created_at`, `imageUrl` e mantém `image_path`. `id` é gerado no servidor com UUID. `price` e totais da API são expressos em reais; `price_cents` no banco é inteiro em centavos.

## Cotação do carrinho

```json
{
  "items": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "quantity": 2,
      "personalization": "Nome: Ana"
    }
  ]
}
```

O ID é ilustrativo: use um produto real de `/products` ao interagir com uma instalação. A cotação aceita de 1 a 30 linhas, 1 a 99 unidades por linha e personalização com até 500 caracteres. Produto oculto ou excluído gera 409.

A resposta contém `items`, `subtotal` e `currency: "BRL"`. Cada linha inclui os dados atuais do produto, quantidade, personalização e total. Enviar um campo `price` pelo cliente não muda o cálculo: a API usa `price_cents` do banco.

## Rascunhos e revisão

Respostas da gestão contêm:

```json
{
  "products": [],
  "revision": 0,
  "pending": false,
  "conflict": false
}
```

Os valores acima são apenas um exemplo do formato. Sempre use o estado retornado pelo servidor.

Para publicar, descartar ou remover um produto do rascunho, envie `{ "revision": numeroAtual }`. Para criar/editar, acrescente `revision` ao payload completo do produto. Não incremente esse valor por conta própria no frontend.

O rascunho admite até 2.000 produtos. A revisão impede salvar por uma aba desatualizada. O hash do catálogo publicado impede sobrescrever uma edição feita no painel direto. Publicar ou descartar remove o rascunho, avança a revisão e retorna o novo estado. A publicação valida todas as fotos antes de substituir os produtos na transação.

## Autenticação

O campo `email` do login aceita e-mail proprietário ou usuário adicional, normalizado para minúsculas. A API usa scrypt para verificar senhas e armazena somente o hash do token de sessão no banco.

O cookie `ic_session` é HttpOnly, SameSite=Strict, tem `Path=/api` e duração de 8 horas. `Secure` depende de `COOKIE_SECURE`. Requisições de administração feitas no navegador usam credenciais da mesma origem.

O limite de login conta tentativas por endereço em memória: após 10 tentativas na janela, devolve 429. Não é um limite persistente nem compartilhado entre múltiplas instâncias.

`bootstrap-admin.mjs` recebe JSON pela entrada padrão e cria a conta proprietária sem sobrescrever a existente. `create-login.mjs` faz o mesmo para usuários adicionais. Os mínimos atuais diferem: 12 caracteres para a senha proprietária e 4 para a adicional; nomes adicionais aceitam de 3 a 64 caracteres em minúsculas, números, ponto, sublinhado e hífen. Isso descreve a implementação, não uma recomendação de senha curta. As contas adicionais têm o mesmo acesso administrativo ao catálogo; não existe divisão de permissões por produto.

## Esquema e fontes de verdade

| Tabela | Conteúdo |
| --- | --- |
| `products` | Catálogo publicado; `price_cents`, `active`, `image_path` e dados do produto |
| `admins` | Conta proprietária, com `id=1`, e-mail e hash da senha |
| `admin_logins` | Usuários administrativos adicionais e hashes |
| `sessions` | Hash do token, expiração e login associado |
| `metadata` | Marcador `seeded` e contador `catalog_revision` |
| `catalog_draft` | Rascunho único: `products_json`, `base_hash` e `revision` |
| `orphan_uploads` | Imagens sem referência e instante em que foram identificadas |

`database.mjs` cria as tabelas principais e executa as migrações existentes. `catalog-drafts.mjs` e `uploads.mjs` inicializam suas tabelas auxiliares. O SQLite usa WAL e espera de até 5 segundos para bloqueios.

Não há tabelas de clientes, pagamentos ou compras confirmadas. Carrinho, favoritos e histórico estão no navegador. O seed é importado uma vez, quando `metadata.seeded` ainda não existe.

## Erros para tratar na interface

| Código | Exemplos |
| --- | --- |
| 400 | JSON inválido, campo inválido ou foto referenciada ausente |
| 401 | Sessão ausente/expirada ou login inválido |
| 403 | Origem não permitida |
| 404 | Produto/imagem inexistente |
| 409 | Revisão antiga, conflito de catálogo ou produto indisponível na cotação |
| 413 | Corpo maior que o permitido |
| 415 | Tipo de conteúdo ou imagem não aceito |
| 429 | Excesso de tentativas de login |
| 500 | Falha interna; resposta não expõe os detalhes do servidor |

Não esconda um conflito 409 salvando novamente com uma revisão inventada. Recarregue e reconcilie o estado, preservando o trabalho do usuário quando possível.
