# Operação e diagnóstico

[Voltar ao índice](README.md)

## Onde ficam os dados

| Local | Conteúdo |
| --- | --- |
| Volume `irmas-coqueiro_store-data`, montado em `/data` | `store.sqlite`, arquivos auxiliares do SQLite e `uploads/` |
| Pasta local `backups/` | Cópias completas e verificadas do banco e das fotos referenciadas |
| localStorage do navegador | Carrinho, favoritos, histórico local e tema |
| Git | Código e documentação; não substitui o backup dos dados |

Recriar containers preserva o volume. `docker compose down` também o preserva. A opção `-v` remove volumes: não a utilize em manutenção da loja que deva conservar dados. Mudar o nome Compose pode fazer a aplicação iniciar com outro volume e aparentar perda dos registros.

## Comandos de rotina

```powershell
docker compose up -d --build --wait
docker compose ps
docker compose logs --tail=50 api web
docker compose logs --tail=20 backup
```

Para parar preservando dados:

```powershell
docker compose down
```

Os containers usam `restart: unless-stopped`; serviços parados explicitamente podem precisar de `up` mesmo depois de abrir o Docker Desktop.

## Backup

O serviço `backup` lê `/data` sem permissão de escrita e grava em `/backups`, mapeado para `./backups` do projeto. Cria uma cópia ao iniciar, repete 24 horas depois da conclusão e, em caso de falha, tenta de novo após uma hora.

Para fazer uma cópia imediata, com o serviço em execução:

```powershell
docker compose exec -T backup node backup.mjs
docker compose logs --tail=20 backup
```

O script usa `VACUUM INTO`, abre o snapshot, inclui as fotos referenciadas por produtos publicados e rascunhos e verifica a integridade do banco. Somente após concluir renomeia a pasta de trabalho para o nome final. Pastas terminadas em `.partial` não são backups concluídos.

O backup preserva também contas e sessões presentes no banco, portanto contém dados privados. Não o envie ao Git nem o use como anexo de código para migrar a plataformas. Os nomes das cópias usam UTC e UUID. Não há remoção automática: acompanhe o espaço disponível.

`backups/` está fora do volume Docker, mas ainda no mesmo computador. Para proteção contra perda do equipamento/disco, mantenha também uma cópia em outro local apropriado.

## Restauração: procedimento de manutenção

1. Escolha uma pasta concluída, com `store.sqlite` e `uploads/` correspondentes.
2. Preserve uma cópia verificável do estado atual antes de substituir dados.
3. Pare os serviços que acessam o volume.
4. Restaure banco e fotos como um conjunto, mantendo as permissões necessárias ao usuário do container. Não misture o banco restaurado com arquivos `store.sqlite-wal` e `store.sqlite-shm` da instalação anterior.
5. Reinicie os serviços e confira saúde da API, catálogo, produtos ocultos, rascunhos e login.

A restauração sobrescreve o estado atual pelo estado da cópia. Não é necessária para instalar uma alteração comum de CSS ou JavaScript. O histórico do navegador não faz parte desse backup.

## Limpeza das fotos

`catalogImagePaths()` reúne as fotos dos produtos publicados e do rascunho. `cleanUploads()` marca arquivos sem referência e só remove após pelo menos 24 horas desde a identificação. Se voltarem a ser usados, a marcação é retirada.

A verificação acontece ao iniciar a API, a cada hora e depois de gravar/excluir produtos ou operar o catálogo na gestão. Fotos de produtos ocultos e fotos compartilhadas continuam protegidas. Arquivos desconhecidos e links simbólicos não são apagados. Imagens estáticas em `site/assets/` não participam dessa limpeza.

## Resolver problemas comuns

| Sintoma | Conferir |
| --- | --- |
| Docker informa que não encontrou `dockerDesktopLinuxEngine` | Abra o Docker Desktop e aguarde o mecanismo Linux iniciar |
| `service "backup" is not running` | Execute `docker compose up -d --wait` e confira `docker compose ps` |
| Site não abre | Saúde dos serviços, porta 8080 e logs do Nginx/API |
| API retorna 502 | Container `api`, healthcheck e logs; confirme a comunicação interna do Compose |
| Edição não aparece na vitrine | Se foi salva em `/gestao/`, falta publicar; se código do backend mudou, falta reconstruir |
| Botão Publicar fica bloqueado | Rascunho inexistente, editor aberto, operação em andamento ou conflito do catálogo |
| Erro 409 na central | Outra aba ou o painel direto mudou o estado; releia a lista e reconcilie o trabalho |
| Formulário/texto antigo | Atualize com `Ctrl + F5` e confirme que está vendo localhost, não a prévia do Lovable |
| Página nova funciona pelo menu e falha ao recarregar | Configure a rota virtual no Nginx e reconstrua `web` |
| Produtos/contas ausentes após clonar | Git não leva o volume; uma instalação nova contém apenas o seed |
| Favoritos ou compras sumiram | Origem/navegador diferente, armazenamento limpo ou indisponível; não há sincronização com conta |
| Backup falha | Espaço, permissões, presença das fotos e logs do serviço; `.partial` não deve ser restaurado |

Se ocorrer erro inesperado, registre o endpoint, código HTTP e sequência para reproduzir, sem copiar cookies, senhas ou conteúdo privado para o relatório. Crie um caso com dados temporários nos testes.

## Lovable e exportação

A versão local e a versão do Lovable são instalações independentes. Salvar arquivos aqui, publicar um rascunho local ou recriar containers não altera o Lovable.

[scripts/export-lovable.ps1](../scripts/export-lovable.ps1) prepara pacotes de código e dados; [scripts/LOVABLE-MIGRATION.md](../scripts/LOVABLE-MIGRATION.md) contém as instruções. Leia o script antes de exportar: a exportação atual inclui produtos da tabela publicada, inclusive ocultos, e suas fotos; não inclui o rascunho como catálogo a publicar nem as contas administrativas. Ela depende da API no Docker e deve ser refeita após mudanças que precisem ir para o destino. Os pacotes antigos são snapshots, não arquivos sincronizados automaticamente.

Docker/SQLite, autenticação e políticas de backup/limpeza precisam ser adaptados se o destino usar outro backend. Preservar o visual não comprova que as permissões e os dados foram migrados corretamente. A disponibilidade de importação e as telas do Lovable podem mudar; confira a plataforma antes de seguir um procedimento antigo.

## Preparar uma publicação futura

A configuração atual atende somente localhost. Uma hospedagem pública exige planejar servidor, domínio, HTTPS e armazenamento persistente, ajustar `PUBLIC_ORIGIN`, ativar `COOKIE_SECURE` com HTTPS e rever acesso administrativo e backups. Não exponha o volume ou o banco como arquivos públicos. Pagamento online, frete automático e status de pedidos confirmados ainda não estão implementados.
