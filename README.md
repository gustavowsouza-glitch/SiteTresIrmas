# Dindinha Presentes

Loja de presentes personalizados com vitrine, carrinho e painel administrativo. O projeto usa frontend estático, API Node.js 24, banco SQLite e Docker Compose. O catálogo, o acesso administrativo e as fotos funcionam no backend local, independentemente do Lovable.

## Mudanças recentes — 26/10/2026

- Criada a **Central de produtos** em `/gestao/`, separada da vitrine e com acesso administrativo.
- Adicionado o fluxo **Salvar rascunho → Conferir a prévia → Publicar na loja**, para editar nomes, preços, categorias, fotos, descrições e visibilidade antes de atualizar a vitrine.
- Inclusões, edições e remoções ficam pendentes até publicar. É possível descartar os rascunhos sem alterar o catálogo publicado.
- Rascunhos persistem no banco após reiniciar o Docker. Fotos usadas nos rascunhos são preservadas pela limpeza automática e incluídas nos backups.
- Publicação protegida contra versões desatualizadas entre abas e alterações feitas diretamente no painel `/admin/`.
- Login atualizado para aceitar **usuário ou e-mail**. Criado o acesso adicional local `gustavo`, preservando a conta proprietária existente. A senha não é registrada neste documento.
- Validados o acesso adicional, a preservação da conta anterior e o fluxo de publicação com banco e fotos temporários.

## Mudanças anteriores — 22/10/2026

- Removidos os quatro atalhos de categorias do cabeçalho. As categorias continuam no catálogo e na página inicial.
- Adicionada `/minhas-compras/` no menu e nas abas das listas: histórico local dos últimos 50 pedidos iniciados pelo botão de WhatsApp, com referência, data, itens, personalização e subtotal da ocasião. Não confirma mensagem enviada, pagamento, compra ou andamento; esses detalhes dependem da loja. Pedidos anteriores à implementação não são recuperados automaticamente.
- Adicionada a página `/favoritos/`, com corações nos produtos e detalhes, contador no cabeçalho e lista salva neste navegador, sem cadastro. Favoritos indisponíveis são sinalizados e podem ser removidos; a lista aceita até 200 produtos.
- Carrinho com abas Carrinho/Favoritos, seleção individual ou de todos os itens, total por linha e resumo lateral. Apenas os produtos marcados entram na cotação e no resumo para WhatsApp; itens desmarcados permanecem guardados com sua personalização.
- Vitrine reorganizada com inspiração em marketplace: busca global no cabeçalho, atalhos de categorias, banner compacto, quatro destaques na página inicial e preços mais visíveis. A marca, as cores e os temas da Dindinha foram preservados.
- Catálogo com filtros por categoria e faixa de preço, busca, ordenação e botão para limpar filtros. Busca e filtros ficam na URL para permitir compartilhar e reabrir a seleção. Essas alterações estão na versão local; a prévia do Lovable não é atualizada automaticamente.
- Marca atualizada de Três Irmãs para **Dindinha Presentes**, com a logo e o símbolo enviados pelo proprietário.
- Ícone da aba substituído por um presente rosa em SVG, sem fundo branco.
- Tema claro com fundos em rosa, lilás e pêssego, cabeçalho e rodapé em vinho e cartões de produtos em tons mais escuros e suaves.
- Modo escuro refinado com fundo ameixa, contrastes suaves, bordas, sombras e destaques em rosa. O botão de tema usa apenas ícones e mantém uma descrição acessível.
- Vitrine com oito páginas, categorias, busca, ordenação, detalhes, favoritos, histórico local de pedidos e carrinho com personalização.
- Acesso ao painel removido dos menus públicos; a administração permanece em `/admin/`.
- Kit de móveis de casinha em MDF adicionado ao catálogo local, em Brinquedos, com imagem ilustrativa e preço de referência de R$ 30,00. A composição e o valor final são combinados com a loja, até R$ 30,00 por kit.
- Corrigido o salvamento no painel: os dados e o identificador do produto são capturados antes de enviar a foto, e a troca de produto fica bloqueada durante a operação.
- Corrigido o preparo do pedido: uma cotação pendente é descartada se o carrinho ou a página mudar antes de abrir o WhatsApp.
- Adicionadas limpeza automática de fotos sem uso, cópias de segurança fora do volume do banco e verificações de regressão para essas funcionalidades.

## Central de produtos com publicação

Acesse http://localhost:8080/gestao/ e entre com uma conta administrativa. O acesso adicional `gustavo` também pode ser usado aqui.

| Página | Para que usar | Quando a vitrine muda |
| --- | --- | --- |
| `/` e `/produtos/` | Consultar a loja e os produtos publicados | Ao recarregar ou consultar o catálogo após uma publicação |
| `/gestao/` | Preparar e conferir alterações dos produtos | Somente ao clicar em **Publicar na loja** |
| `/admin/` | Administrar produtos diretamente | Ao salvar ou excluir um produto |

Para o uso do dia a dia com revisão antes de enviar, prefira `/gestao/`.

1. Clique em **Novo produto** ou **Editar produto** e altere nome, preço, categoria, foto ou descrição.
2. Clique em **Salvar rascunho**. A prévia da central é atualizada, mas a vitrine continua com os dados publicados.
3. Confira os produtos e clique em **Publicar na loja** para enviar todas as alterações de uma vez. As remoções do rascunho também são aplicadas nessa publicação.
4. Atualize a vitrine aberta para conferir os dados novos. Novas consultas e cotações usam o catálogo publicado.

**Descartar rascunhos** abandona apenas as alterações pendentes. Produtos ocultos continuam fora da vitrine, mesmo após publicar. O rascunho é compartilhado entre os acessos administrativos e fica salvo no banco, inclusive após reiniciar o Docker; suas fotos também entram na limpeza protegida e nos backups.

O painel `/admin/` mantém seu comportamento de salvar diretamente na loja. Prefira `/gestao/` para preparar alterações antes de publicar. Se alguém usar o painel direto enquanto houver rascunhos, a central bloqueia a publicação para evitar sobrescrever a versão atual. Descarte os rascunhos, confira o catálogo atual e refaça as edições necessárias. Duas abas com versões diferentes também recebem aviso para atualizar antes de salvar.

Essa publicação atualiza somente o catálogo desta instalação local. Não envia alterações para o Lovable nem publica o site na internet. Nome da loja e textos da página inicial permanecem como estão.

Os comandos de validação estão na seção **Testes**. Eles usam banco e arquivos temporários.

## Iniciar

É necessário ter o Docker Desktop instalado, aberto e usando containers Linux. Na pasta raiz do projeto, execute:

```powershell
docker compose up -d --build --wait
```

- Vitrine: http://localhost:8080
- Central de produtos (rascunhos e publicação): http://localhost:8080/gestao/
- Administração direta: http://localhost:8080/admin/
- Prévia no Lovable: [Visualizar Dindinha Presentes](https://lovable.dev/preview/eUgGySETCqG6l0DPgEGRnQ8SQKzDAVIj)

Para abrir a vitrine pelo PowerShell:

```powershell
Start-Process 'http://localhost:8080'
```

O Compose inicia três serviços:

| Serviço | Função | Armazenamento |
| --- | --- | --- |
| `web` | Nginx: serve a vitrine e encaminha `/api` ao backend | Pasta `site/`, montada somente para leitura |
| `api` | Catálogo, login, fotos, cotação e limpeza de imagens | Volume persistente `irmas-coqueiro_store-data` |
| `backup` | Cópias automáticas verificadas do banco e das fotos em uso | Pasta `backups/` no computador; lê o volume sem permissão de escrita |

O nome técnico do projeto Compose continua `irmas-coqueiro` para preservar o volume existente, mesmo com a nova marca.

## Páginas e carrinho

- `/`: início com banner, categorias, destaques, personalização e apresentação da marca.
- `/produtos/`: catálogo, busca, quatro categorias e ordenação.
- `/produto/?id=…`: detalhes, quantidade e texto de personalização.
- `/carrinho/`: itens salvos no navegador, alteração de quantidades, remoção e subtotal.
- `/favoritos/`: presentes salvos pelo coração, com acesso aos detalhes e opção de adicionar ao carrinho.
- `/minhas-compras/`: resumos locais dos pedidos iniciados via WhatsApp, sem confirmação automática de compra. Funciona sem carregar o catálogo; os dados podem ser perdidos ao limpar o navegador e não são sincronizados entre dispositivos.
- `/contato/`: WhatsApp e informações sobre o atendimento.
- `/sobre/`: apresentação da Dindinha Presentes.

Categorias: canecas personalizadas, brindes personalizados, brinquedos personalizados e outros presentes. No banco e nos filtros, os valores internos são `Canecas`, `Brindes`, `Brinquedos` e `Outros`.

O catálogo local recebeu quatro produtos: kit brinde personalizado, caneca com nome, quebra-cabeça com nome e kit de móveis de casinha em MDF. O painel é a fonte para consultar preços e disponibilidade atuais. Os três primeiros vêm da importação inicial; o kit de MDF foi cadastrado no banco local e não é recriado por `backend/seed.json` em uma instalação nova. Para transferir o catálogo completo, use um backup do banco e das fotos.

O cliente monta o carrinho sem precisar de conta. Antes de abrir o WhatsApp, a API confere a disponibilidade e calcula novamente os preços em centavos, usando o banco. O navegador não determina os valores. O botão apenas abre uma conversa com o resumo; não envia mensagens automaticamente nem registra uma venda confirmada.

O carrinho fica salvo neste navegador e aceita até 30 itens distintos, com 1 a 99 unidades por item e até 500 caracteres de personalização. Itens do mesmo produto com personalizações diferentes são mantidos separados. A seleção de cada item também é salva; sem nenhum item marcado, o botão de continuar fica bloqueado. Mudanças no carrinho durante uma cotação impedem o envio de um resumo desatualizado. Favoritos e carrinho são sincronizados entre abas do mesmo navegador, mas não entre dispositivos ou contas. Limpar os dados do navegador apaga essas listas locais.

Pagamento, frete automático, cadastro de cliente, domínio e publicação ficam para outra etapa. Não há ranking de mais vendidos porque ainda não existe histórico de vendas. Os produtos da página inicial são apresentados como destaques do catálogo.

O acesso fica disponível somente neste computador, pela porta `127.0.0.1:8080`. A pasta `site/` é montada em modo somente leitura no Nginx; edite os arquivos e atualize o navegador. Mudanças em `backend/`, na configuração do Nginx ou nos arquivos Docker exigem executar novamente `docker compose up -d --build --wait`. Para atualizar também as cópias dos scripts usadas pelos testes de interface, reconstrua as imagens após mudar `storefront.js` ou `admin.js`.

## Administrador

Para entrar na central:

1. Abra http://localhost:8080/gestao/.
2. No campo **Usuário ou e-mail**, informe seu acesso. O usuário adicional criado nesta instalação é `gustavo`.
3. Digite a senha definida para a conta e clique em **Entrar no painel**.
4. Se aparecer o formulário antigo, atualize com **Ctrl + F5**.

O usuário adicional possui permissão administrativa sobre o mesmo catálogo. A conta proprietária anterior continua válida. Os acessos ficam no banco local: clonar o repositório em outra máquina não recria automaticamente as contas. Um backup completo do banco também preserva essas contas; as senhas ficam armazenadas como hash, não como texto.

A conta proprietária é criada por `backend/bootstrap-admin.mjs`, que recebe JSON com `email` e `password` pela entrada padrão. A senha deve ter no mínimo 12 caracteres. O script recusa sobrescrever uma conta existente. Não existe cadastro público, e clientes não precisam entrar na loja. O formulário também aceita nomes de usuário para acessos administrativos adicionais, criados localmente por `backend/create-login.mjs`. Esses acessos compartilham a administração do catálogo e possuem sessões independentes; a conta proprietária por e-mail é preservada. Senhas não devem ser gravadas neste README ou no Git.

O administrador gerencia nome, categoria, descrição, preço, foto e visibilidade dos produtos. Os preços são armazenados em centavos. Fotos podem ser PNG, JPG, WebP ou GIF até 5 MB. A API exige sessão válida para todas as alterações e para listar produtos ocultos. A senha é armazenada com salt e hash scrypt. O cookie de sessão é HttpOnly e SameSite=Strict, dura 8 horas e é invalidado no logout.

Durante o salvamento, o formulário e os controles existentes do painel ficam bloqueados. Mesmo que um campo seja alterado por código durante o envio da foto, o pedido de gravação usa os dados capturados originalmente. O botão de excluir pede confirmação antes de remover um produto. A ausência de um link público para o painel não substitui a autenticação exigida pela API.

O banco e as fotos ficam no volume `irmas-coqueiro_store-data`. Reiniciar ou recriar os containers mantém os dados. `docker compose down` mantém o volume; **não use `docker compose down -v` se quiser preservar os dados**.

## Limpeza de fotos

O backend identifica fotos enviadas que não são referenciadas por nenhum produto. A exclusão só acontece após pelo menos 24 horas desde essa identificação; não é baseada apenas na data de criação do arquivo. A verificação roda ao iniciar a API, a cada hora e após salvar ou excluir produtos.

Fotos de produtos ocultos, fotos dos rascunhos e imagens compartilhadas por vários produtos são preservadas. Se uma foto voltar a ser usada antes da exclusão, a marcação de abandono é removida. Arquivos desconhecidos e links simbólicos não são apagados. A limpeza atua em `/data/uploads`, sem modificar as imagens estáticas em `site/assets/` nem as cópias de backup.

## Backup e restauração

O serviço `backup` cria uma cópia ao iniciar e agenda a próxima para 24 horas após a conclusão, enquanto estiver rodando. Os arquivos ficam em `./backups`, fora do volume do banco; uma falha gera mensagem nos logs e nova tentativa após uma hora. Cada cópia verifica a integridade do SQLite e inclui apenas as fotos referenciadas naquele banco, inclusive as de produtos ocultos e dos rascunhos. Pastas `.partial` indicam tentativas incompletas e não devem ser usadas na restauração. Não há exclusão automática de backups: acompanhe o espaço ocupado por essa pasta.

Para uma cópia imediata na pasta do computador:

```powershell
docker compose exec -T backup node backup.mjs
docker compose logs --tail=20 backup
```

Essa pasta ainda fica no mesmo computador. Copie-a também para um disco externo ou serviço de armazenamento para se proteger de falhas do computador. O destino externo depende de onde o proprietário deseja guardar os arquivos.

Como alternativa, estes comandos criam uma cópia dentro do volume e depois a copiam para o computador:

```powershell
docker compose exec -T api node backup.mjs
docker compose cp api:/data/backups ./backups
```

Uma pasta de backup concluído contém `store.sqlite` e `uploads/`. Os nomes usam data e hora UTC e um identificador único. Para restaurar, pare os serviços, preserve uma cópia dos dados atuais, substitua o banco e a pasta de uploads no volume pelo conjunto do backup e reinicie os serviços. Não misture arquivos `store.sqlite-wal` ou `store.sqlite-shm` da versão anterior com o banco restaurado. A restauração também recupera as contas administrativas, os produtos publicados e os rascunhos existentes na data daquela cópia.

## Operação

```powershell
docker compose ps
docker compose logs --tail=50
docker compose logs --tail=20 backup
docker compose down
```

Se o site não abrir, confirme que o Docker Desktop está em execução, inicie os serviços e confira os logs. Para parar sem excluir o catálogo, use `docker compose down`, sem a opção `-v`.

## Testes

Execute depois de reconstruir a imagem com os arquivos atuais:

```powershell
docker compose build api
docker run --rm --network none irmas-coqueiro-api node test.mjs
docker run --rm --network none irmas-coqueiro-api node --test catalog-drafts.test.mjs shop-core.test.mjs maintenance.test.mjs ui-regression.test.mjs
```

Os testes usam banco e arquivos temporários, sem modificar produtos reais:

| Arquivo | Cobertura |
| --- | --- |
| `backend/test.mjs` | Login por e-mail e usuário, sessões independentes, preservação da conta proprietária, bloqueio de visitantes, origem das requisições, criação/edição/exclusão, fotos, persistência, produtos ocultos, detalhes e preços calculados no servidor |
| `site/shop-core.test.mjs` | Validação do carrinho, limites, personalizações e resumo para WhatsApp |
| `backend/maintenance.test.mjs` | Prazo de limpeza, preservação de fotos em uso, backup válido e cópias incompletas |
| `backend/ui-regression.test.mjs` | Salvamento com foto pendente, botões de rascunho/publicação e mudança do carrinho ou navegação durante a cotação |
| `backend/catalog-drafts.test.mjs` | Rascunhos separados da vitrine, persistência, fotos, backups, publicação atômica, descarte e conflitos de versão |

Na validação de 26/10/2026, o teste de integração passou, incluindo o novo login por usuário. As demais suítes passaram com **16 testes**, cobrindo também rascunhos, publicação, persistência e preservação das fotos. Os testes de interface simulam elementos e respostas de rede em Node.js; não substituem a conferência visual no navegador e no celular. Os contêineres de teste não montam o volume real da loja.


## Estrutura

- `site/`: vitrine, imagens, tema claro/escuro e painel.
- `site/storefront.js`: navegação, páginas, catálogo, detalhes e carrinho.
- `site/shop-core.mjs`: regras do carrinho, categorias e resumo de pedido.
- `site/brand.css`: identidade rosa/vinho, temas claro/escuro e layout responsivo.
- `site/marketplace.css`: organização da vitrine em formato de marketplace, busca do cabeçalho, filtros e adaptação para celular, sem alterar o visual do painel.
- `site/theme.js`: seleção do tema, preferência do sistema e escolha salva no navegador.
- `site/config.js`: WhatsApp e endereço relativo `/api`.
- `site/admin/`: login e editor direto de produtos; o JavaScript também atende a central no modo rascunho.
- `site/gestao/`: página da central de produtos, prévia do catálogo e botões de publicação e descarte.
- `backend/`: API, banco, importação inicial, criação do dono, backup e testes.
- `backend/seed.json`: três produtos públicos recuperados do original em 20/10/2026. A importação ocorre uma única vez, sem repor produtos excluídos.
- `backend/catalog-drafts.mjs`: armazenamento dos rascunhos, controle de versões e publicação do catálogo.
- `backend/create-login.mjs`: criação local de acessos administrativos adicionais por usuário, sem substituir contas existentes.
- `backend/uploads.mjs`: identificação e limpeza de fotos sem referência, preservando produtos publicados e rascunhos.
- `backend/backup.mjs`: cópia verificada do banco e das fotos em uso.
- `backend/backup-service.mjs`: execução periódica e repetição após falhas de backup.
- `backend/*test.mjs` e `site/shop-core.test.mjs`: testes de integração e regressão.
- `backups/`: cópias locais; ignoradas pelo Git por conterem dados da loja.
- `design/`: registros de criação dos recursos visuais.
- `docker/nginx.conf`, `Dockerfile` e `compose.yaml`: servidor e containers.

O botão de sol/lua salva o tema neste navegador. Sem uma escolha salva, o site acompanha o tema do sistema. A logo e o símbolo recebidos estão em `site/assets/dindinha-logo.png` e `site/assets/dindinha-icon.png`; o ícone da aba é `site/assets/presente-rosa.svg`. A imagem ilustrativa dos móveis de MDF está em `site/assets/moveis-casinha-mdf.png`; a foto usada pelo produto cadastrado é atendida pelo backend.

## Origem dos dados

Layout, imagens e três produtos foram recuperados de https://irmscoqueiro.lovable.app. A conta proprietária local é nova e independente da conta cadastrada no Lovable. Não foram exportados outros usuários, dados privados ou produtos ocultos do projeto original; nada foi excluído ou alterado nele.

`irmas-coqueiro/`, seu ZIP, `lovable-reference/` e `original-site.html` são referências preservadas e não são servidas pelo Docker. Os arquivos antigos `site/app.js` e `site/catalog.js` não são carregados pela nova loja. A navegação usa módulos JavaScript e exige HTTP; abra a loja pelo Docker em vez de `file://`. Os preços e a disponibilidade vêm sempre da API.

## Configuração e próximas etapas

| Configuração | Local | Uso |
| --- | --- | --- |
| WhatsApp e caminho `/api` | `site/config.js` | Número de atendimento e endereço relativo da API |
| `PUBLIC_ORIGIN` | Ambiente do serviço `api` | Origem aceita para as alterações, atualmente `http://localhost:8080` |
| `COOKIE_SECURE` | Ambiente do serviço `api` | Atualmente `false` para HTTP local; usar `true` com HTTPS |
| `DATA_DIR` | Imagem do backend | Banco e uploads; padrão `/data` |
| `BACKUP_DIR` | Ambiente do serviço `backup` | Destino das cópias; configurado como `/backups`, ligado à pasta local |

O projeto está configurado para uso local. Publicação, domínio, HTTPS, integração de pagamento e cálculo de frete ainda precisam ser implementados/configurados. Para publicar, será necessário ajustar também a exposição do servidor, configurar `PUBLIC_ORIGIN` com a origem exata do domínio e ativar `COOKIE_SECURE`. As alterações locais não atualizam automaticamente o projeto hospedado no Lovable.
