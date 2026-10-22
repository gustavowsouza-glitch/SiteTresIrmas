# Dindinha Presentes

Loja e painel próprios, com frontend estático, API Node.js e banco SQLite no Docker. A marca foi atualizada para Dindinha Presentes em 22/10/2026, usando a logo e o ícone fornecidos pelo dono. O catálogo, o acesso administrativo e as fotos funcionam sem o backend do Lovable.

## Iniciar

Com o Docker Desktop aberto, execute na raiz:

```powershell
docker compose up -d --build --wait
```

- Vitrine: http://localhost:8080
- Administração: http://localhost:8080/admin/

## Páginas e carrinho

- `/`: início com banner, categorias, destaques, personalização e apresentação da marca.
- `/produtos/`: catálogo, busca, quatro categorias e ordenação.
- `/produto/?id=…`: detalhes, quantidade e texto de personalização.
- `/carrinho/`: itens salvos no navegador, alteração de quantidades, remoção e subtotal.
- `/contato/`: WhatsApp e informações sobre o atendimento.
- `/sobre/`: apresentação da Dindinha Presentes.

Categorias: canecas personalizadas, brindes personalizados, brinquedos personalizados e outros presentes. Os valores internos anteriores foram preservados no banco; a nova categoria usa `Outros`.

O cliente monta o carrinho sem precisar de conta. Antes de abrir o WhatsApp, a API confere a disponibilidade e calcula novamente os preços em centavos, usando o banco. O navegador não determina os valores. O botão apenas abre uma conversa com o resumo; não envia mensagens automaticamente nem registra uma venda confirmada.

Pagamento, frete automático, cadastro de cliente, domínio e publicação ficam para outra etapa. Não há ranking de mais vendidos porque ainda não existe histórico de vendas. Os produtos da página inicial são apresentados como destaques do catálogo.

O acesso fica disponível somente neste computador. A pasta `site/` é montada em modo somente leitura no Nginx; edite os arquivos e atualize o navegador. Mudanças em `backend/` exigem reconstruir o serviço com o comando acima.

## Administrador

A conta proprietária é criada por `backend/bootstrap-admin.mjs`, que recebe JSON com `email` e `password` pela entrada padrão. A senha deve ter no mínimo 12 caracteres. O script recusa sobrescrever uma conta existente. Não existe cadastro público, e clientes não precisam entrar na loja.

O administrador gerencia nome, categoria, descrição, preço, foto e visibilidade dos produtos. Os preços são armazenados em centavos. Fotos podem ser PNG, JPG, WebP ou GIF até 5 MB. A API exige sessão válida para todas as alterações e para listar produtos ocultos. A senha é armazenada com salt e hash scrypt. O cookie de sessão é HttpOnly e SameSite=Strict, dura 8 horas e é invalidado no logout.

O banco e as fotos ficam no volume `irmas-coqueiro_store-data`. Reiniciar ou recriar os containers mantém os dados. `docker compose down` mantém o volume; **não use `docker compose down -v` se quiser preservar os dados**.

## Backup

O serviço `backup` cria uma cópia ao iniciar e a cada 24 horas enquanto o Docker estiver rodando. Os arquivos ficam em `./backups`, fora do volume do banco; uma falha gera mensagem nos logs e nova tentativa após uma hora. Cada cópia verifica o SQLite e inclui apenas as fotos referenciadas naquele banco. Pastas `.partial` indicam tentativas incompletas e não devem ser usadas na restauração. Não há exclusão automática de backups.

Para uma cópia imediata na pasta do computador:

```powershell
docker compose exec -T backup node backup.mjs
docker compose logs --tail=20 backup
```

Essa pasta ainda fica no mesmo computador. Copie-a também para um disco externo ou serviço de armazenamento para se proteger de falhas do computador. O destino externo depende de onde o proprietário deseja guardar os arquivos.

O comando antigo continua disponível para criar uma cópia dentro do volume:

```powershell
docker compose exec -T api node backup.mjs
docker compose cp api:/data/backups ./backups
```

O script cria uma cópia consistente do SQLite e copia as fotos. Guarde a pasta resultante em local seguro fora do computador. Para restaurar, pare os serviços, recoloque o `store.sqlite` e `uploads/` do backup no volume e reinicie. Não misture arquivos WAL de outra versão com o banco restaurado.

## Comandos úteis

```powershell
docker compose ps
docker compose logs --tail=50
docker compose run --rm --no-deps api node test.mjs
docker compose run --rm --no-deps api node --test shop-core.test.mjs
docker compose run --rm --no-deps api node --test maintenance.test.mjs
docker compose run --rm --no-deps api node --test ui-regression.test.mjs
docker compose down
```

Os testes usam banco e arquivos temporários, sem modificar produtos reais. Cobrem autenticação, bloqueio de alterações por visitantes, origem de requisições, preços, produtos ocultos, criação/edição/exclusão, fotos, persistência, quarta categoria, detalhes de produto, cotação do carrinho e logout. Os testes do módulo de carrinho cobrem quantidades, personalizações, persistência de campos e resumo do WhatsApp. A validação visual em navegador e celular não foi automatizada: não havia navegador conectado à ferramenta.

## Estrutura

Fotos sem referência em produtos são identificadas e removidas somente depois de 24 horas sem uso. A verificação roda ao iniciar a API, a cada hora e após salvar/excluir produtos. Fotos compartilhadas e fotos de produtos ocultos são preservadas. O painel bloqueia a troca de produto durante o salvamento; o carrinho descarta cotações se seus itens ou a página mudarem durante o preparo do pedido.

- `site/`: vitrine, imagens, tema claro/escuro e painel.
- `site/storefront.js`: navegação, páginas, catálogo, detalhes e carrinho.
- `site/shop-core.mjs`: regras do carrinho, categorias e resumo de pedido.
- `site/brand.css`: identidade rosa/vinho, temas claro/escuro e layout responsivo.
- `site/config.js`: WhatsApp e endereço relativo `/api`.
- `site/admin/`: login e editor de produtos.
- `backend/`: API, banco, importação inicial, criação do dono, backup e testes.
- `backend/seed.json`: três produtos públicos recuperados do original em 20/10/2026. A importação ocorre uma única vez, sem repor produtos excluídos.
- `docker/nginx.conf`, `Dockerfile` e `compose.yaml`: servidor e containers.

O botão de sol/lua salva o tema neste navegador. A logo e o ícone recebidos estão em `site/assets/dindinha-logo.png` e `site/assets/dindinha-icon.png`. O acesso ao painel foi removido da vitrine; a administração continua disponível pelo endereço direto `/admin/`. A conta administrativa e o volume do banco permanecem os mesmos da versão anterior.

## Origem dos dados

Layout, imagens e três produtos foram recuperados de https://irmscoqueiro.lovable.app. A conta proprietária local é nova e independente da conta cadastrada no Lovable. Não foram exportados outros usuários, dados privados ou produtos ocultos do projeto original; nada foi excluído ou alterado nele.

`irmas-coqueiro/`, seu ZIP, `lovable-reference/` e `original-site.html` são referências preservadas e não são servidas pelo Docker. Os arquivos antigos `site/app.js` e `site/catalog.js` não são carregados pela nova loja. A navegação usa módulos JavaScript e exige HTTP; abra a loja pelo Docker em vez de `file://`. Os preços e a disponibilidade vêm sempre da API.

Para publicação futura com HTTPS, configure `PUBLIC_ORIGIN` no serviço `api` com a origem exata do domínio e `COOKIE_SECURE: "true"`. O projeto está rodando localmente; ainda não foi publicado na internet.
