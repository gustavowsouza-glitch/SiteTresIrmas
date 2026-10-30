# Orientação para agentes de IA

Este repositório contém a **Dindinha Presentes**, uma loja local com Docker, frontend JavaScript e backend Node.js/SQLite. As instruções do usuário definem o escopo do trabalho.

## Comece por aqui

1. Leia [docs/README.md](docs/README.md) para localizar os guias.
2. Consulte [arquitetura](docs/arquitetura.md) e os arquivos envolvidos antes de editar.
3. Confira `git status --short` e preserve alterações preexistentes.
4. Use [desenvolvimento](docs/desenvolvimento.md) para implementar e validar a mudança.
5. Consulte o [guia de branches](docs/branches/README.md) para escolher o destino do trabalho. Respeite a branch solicitada e preserve alterações antes de trocar.

## Branches e registro

- `main`: referência revisada; `teste`: experimentos e validação; `designer`: interface e visual; `bugs`: correções de comportamento.
- Ao criar uma branch, use `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\nova-branch.ps1 -Nome 'nome-da-tarefa' -Finalidade 'Objetivo concreto' -Base 'main'`, ajustando a base ao trabalho. A política vale só para esse processo. O script cria e registra a branch, sem trocar a atual nem fazer commit/push.
- Se criar por outro meio, registre manualmente em `docs/branches/README.md` o nome, a finalidade, a base/commit conhecidos, a data e a situação. Não invente informações históricas.
- Inclua o registro no commit da tarefa e atualize a situação ao concluir ou renomear. O documento só chega às demais branches quando integrado pelo Git.
- Não faça merge, exclusão, publicação ou descarte de alterações como consequência automática dessas convenções. Branches não isolam o banco Docker.

## Convenções do projeto

- A implementação ativa está em `site/`, `backend/`, `docker/` e `compose.yaml`.
- `site/app.js`, `site/catalog.js`, `irmas-coqueiro/` e `lovable-reference/` são referências legadas; não são a vitrine atual. Os estilos `site/styles.css` e `site/local.css` ainda são carregados pelo painel.
- O frontend não usa React, npm ou bundler. Não introduza uma troca de stack como parte de uma edição pequena.
- Preserve a marca Dindinha Presentes, os dois temas e o comportamento responsivo.
- Catálogo publicado e rascunhos são estados distintos: `/admin/` grava diretamente; `/gestao/` exige publicação dos rascunhos.
- Apenas a conta proprietária por e-mail autoriza novos acessos em `/autorizacoes/`. Outros ADMs administram produtos. Preserve a checagem no backend e não transforme a abertura de um link de e-mail em aprovação automática. Consulte `docs/acessos-administrativos.md`.
- Preços são calculados pelo backend em centavos. Favoritos, carrinho e histórico locais não concedem permissões nem comprovam compras.
- Preserve os controles de concorrência: `renderVersion`, snapshots antes de `await`, `revision` e `base_hash`.
- Escape dados inseridos em HTML; no painel, prefira `textContent` para textos.
- Não registre senhas, hashes reais, tokens, cookies ou conteúdo do banco em documentos, commits ou logs. Credenciais fictícias de testes ficam restritas aos testes.
- Não use produtos, rascunhos ou contas reais como dados descartáveis de teste.
- Preserve o nome Compose `irmas-coqueiro` e o volume `irmas-coqueiro_store-data`; `docker compose down -v` exclui o armazenamento.
- Mudanças locais não atualizam o Lovable. Trabalhe no destino solicitado pelo usuário e informe onde a alteração foi aplicada.

## Verificação e entrega

Rode verificações proporcionais à mudança; os comandos estão em [docs/desenvolvimento.md](docs/desenvolvimento.md). Reconstrua a imagem antes de testar código alterado. Os testes devem usar banco temporário, sem montar o volume real.

Ao mudar rotas, campos, endpoints ou regras, atualize os guias correspondentes. Ao finalizar, informe o resultado, a validação executada e eventuais limitações de conferência visual. Alterações somente na documentação exigem conferir conteúdo e links, sem executar a suíte da aplicação por rotina.
