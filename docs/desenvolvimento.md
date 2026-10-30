# Tutorial de desenvolvimento

[Voltar ao índice](README.md)

## Preparar e executar

1. Abra a raiz do projeto no VS Code.
2. Abra o Docker Desktop com containers Linux.
3. Confira as alterações existentes com `git status --short`.
4. Execute:

```powershell
docker compose up -d --build --wait
docker compose ps
Start-Process 'http://localhost:8080'
```

Use HTTP; abrir `site/index.html` por `file://` não reproduz módulos, API e navegação corretamente. O Node.js do backend roda no container, sem exigir instalação local para esse fluxo.

## Tutorial 1: mudar banner, cores ou logo

1. Localize o HTML do componente em `site/index.html` ou a função de página em `site/storefront.js`. O banner inicial é renderizado por `home()`.
2. Para cores compartilhadas, procure as variáveis em `site/brand.css`, nos blocos `:root` e `.dark`.
3. Para dimensões do banner, busca, filtros e listas, confira `site/marketplace.css`, que sobrescreve o CSS base da vitrine.
4. Preserve nomes de atributos `data-*`, IDs e seletores usados pelo JavaScript, ou atualize os dois lados juntos.
5. Atualize o navegador e confira tema claro, tema escuro e largura de celular. `Ctrl + F5` ajuda quando houver cache.

A pasta `site/` está montada no Nginx: HTML, CSS e JS da vitrine mudam sem reconstruir o container. Uma alteração visual pequena não exige criar testes que apenas repitam os valores do CSS.

## Tutorial 2: criar uma página da vitrine

Exemplo de planejamento para uma futura rota `/ajuda/`, ainda não implementada:

1. Crie uma função de renderização em `site/storefront.js`, seguindo o padrão de `contact()` ou `about()`.
2. Adicione o título ao mapa `titles` dentro de `render()`.
3. Acrescente a condição de renderização. Páginas sem dependência do catálogo devem ficar antes do trecho que consulta `/products`.
4. Inclua a rota na expressão de páginas virtuais em `docker/nginx.conf`.
5. Adicione o link no menu/rodapé apropriado e confira o comportamento da History API.
6. Reconstrua o Nginx com `docker compose up -d --build --wait`.
7. Teste acesso pelo menu, URL direta, atualização da página, Voltar e rota inexistente. Atualize a documentação.

Adicionar somente o link não cria uma rota. Adicionar somente a função JavaScript pode funcionar após navegar internamente e falhar ao abrir a URL diretamente.

## Tutorial 3: editar produtos e incluir um campo

Para mudar dados comerciais, use `/gestao/`: editar → salvar rascunho → revisar → publicar. Não altere o seed para editar o catálogo de uma instalação já criada; ele não é reaplicado a cada inicialização.

Para adicionar um campo de produto no código, percorra o fluxo completo:

1. Planeje a migração em `backend/database.mjs`, com valor padrão para registros existentes e inicialização idempotente. Preserve IDs, preços, contas e rascunhos.
2. Atualize a validação e a transformação `rowToProduct` em `backend/server.mjs`.
3. Atualize gravação direta, gravação do rascunho e publicação em `backend/catalog-drafts.mjs`. Revise também SQL com `INSERT INTO products VALUES`, que depende do número/ordem das colunas.
4. Ajuste formulários de `/admin/` e `/gestao/` e os dados capturados em `site/admin/admin.js` antes de qualquer `await`.
5. Atualize exibição, seed para instalações novas, migração de snapshots/rascunhos antigos e exportação quando aplicável.
6. Se mudar referências de fotos, confira `catalogImagePaths()`, limpeza e backup.
7. Acrescente regressões para dados antigos e para publicação; execute os testes em banco temporário antes de aplicar a migração real.

Não remova o banco para forçar uma migração a funcionar. Prepare e verifique um backup antes de mudanças no esquema ou nos dados reais.

## Tutorial 4: alterar carrinho, favoritos ou compras

Comece pelas funções puras de `site/shop-core.mjs`; a interação com DOM, rede e localStorage fica em `site/storefront.js`.

- Preserve a leitura de listas antigas e o tratamento de JSON inválido ou armazenamento indisponível.
- O cliente envia apenas ID, quantidade e personalização na cotação. Preço e disponibilidade vêm do servidor.
- Não transforme o histórico local em status “pago”, “enviado” ou “entregue” sem implementar uma fonte confiável para esse estado.
- Após um `await`, confira se a rota e os dados relevantes ainda correspondem à operação iniciada.
- Teste seleção vazia, itens ocultos/excluídos, quantidades limite e mudança de aba/rota durante a requisição.

## Testar com isolamento

Reconstrua a imagem para que os testes usem o código novo:

```powershell
docker compose build api
docker run --rm --network none irmas-coqueiro-api node test.mjs
docker run --rm --network none irmas-coqueiro-api node --test catalog-drafts.test.mjs shop-core.test.mjs maintenance.test.mjs ui-regression.test.mjs
```

Esses comandos não montam o volume da loja. As suítes criam bancos e uploads temporários; `--network none` mantém o isolamento externo e permite o loopback usado pelos testes HTTP no próprio container.

| Alteração | Verificação principal |
| --- | --- |
| API, sessão, validação ou produto publicado | `backend/test.mjs` |
| Regras e sanitização das listas | `site/shop-core.test.mjs` |
| Fotos, retenção ou backup | `backend/maintenance.test.mjs` |
| Operações assíncronas e estados dos botões | `backend/ui-regression.test.mjs` |
| Revisão, rascunhos, conflitos ou publicação | `backend/catalog-drafts.test.mjs` |
| HTML/CSS responsivo | Conferência no navegador nos dois temas e em tela estreita |

O teste de publicação cria uma falha de SQLite intencional para verificar o rollback. Considere o resultado final da suíte; nesse caso, o log de falha interna faz parte do cenário esperado. Os testes de interface simulam DOM e rede, sem substituir a avaliação visual.

## Aplicar e concluir uma mudança

- Backend, Dockerfile ou Nginx: execute `docker compose up -d --build --wait`.
- Mudanças só no frontend: atualize o navegador. Reconstrua a imagem `api` antes de rodar testes, pois ela contém cópias dos scripts da interface.
- Antes da entrega, confira `git diff --check`, os testes pertinentes e o endereço solicitado pelo usuário.
- Registre o que mudou, como foi verificado e se a mudança foi aplicada apenas localmente. Atualize estes guias quando o contrato ou o fluxo mudar.
