# Guia e registro de branches

[Voltar ao índice](../README.md)

Consulte este arquivo antes de iniciar uma alteração. As branches separam trabalhos no Git; trocar de branch não cria outro banco, ambiente Docker ou site publicado.

## Qual branch usar

| Branch | Finalidade | Exemplos |
| --- | --- | --- |
| `main` | Versão de referência, com alterações revisadas e validadas | Receber trabalhos concluídos |
| `teste` | Experimentos e validação conjunta antes de integrar na `main` | Avaliar funcionalidades ou combinar mudanças para testar |
| `designer` | Interface e experiência visual da loja | Layout, cores, responsividade, componentes e acessibilidade |
| `bugs` | Correções de comportamento e regressões | Filtros incorretos, falhas no carrinho, erros na API |

Essas finalidades são convenções da equipe, não proteções configuradas no servidor Git. A criação local também não publica uma branch no remoto.

Para começar, confira `git status` e salve o trabalho em andamento antes de trocar de branch. Depois escolha **um** comando:

```powershell
git switch designer
```

```powershell
git switch bugs
```

```powershell
git switch teste
```

Para tarefas independentes, prefira uma branch específica, como `visual-cabecalho` ou `correcao-filtro-preco`, criada a partir da referência adequada. Evite nomes como `designer/cabecalho` enquanto existir a branch `designer`: o Git não permite os dois nomes juntos.

## Criar uma branch e registrar sua finalidade

Na raiz do projeto, use o comando abaixo, trocando nome e finalidade:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\nova-branch.ps1 -Nome 'visual-cabecalho' -Finalidade 'Melhorar o tamanho e o alinhamento da marca' -Base 'main'
```

O script cria a branch a partir da base **local** informada e acrescenta uma linha ao registro abaixo, com data e commit de origem. Ele mantém a branch atual aberta, não faz commit, merge, fetch ou push.

O comando usa `-ExecutionPolicy Bypass` somente no processo que executa este script local, porque o Windows deste ambiente bloqueia scripts por padrão. Ele não altera permanentemente a política do computador. Revise o arquivo antes de executá-lo.

Depois entre na nova branch:

```powershell
git switch visual-cabecalho
```

O registro é alterado no diretório de trabalho atual. Inclua este arquivo no commit da nova branch junto com a alteração. Para que o registro fique disponível nas demais branches, ele precisa ser integrado a elas pelo fluxo de revisão; o Git não sincroniza documentos entre branches automaticamente.

**Para manter o registro atualizado:** desenvolvedores e IAs devem usar o script ao criar branches. Branches criadas diretamente pelo VS Code, `git branch`, `git switch -c` ou pelo serviço remoto não são anotadas automaticamente; nesses casos, acrescente a linha manualmente. Não há hook Git instalado.

Para publicar uma branch quando desejar, use `git push -u origin NOME-DA-BRANCH`. A publicação depende do remoto configurado e da sua autenticação.

## Revisar e integrar

1. Confira a diferença da tarefa, valide o comportamento e execute os testes proporcionais descritos no [tutorial de desenvolvimento](../desenvolvimento.md).
2. Faça commit na branch da tarefa e abra uma revisão/PR quando houver remoto configurado.
3. Use `teste` quando precisar avaliar mudanças em conjunto. Envie à `main` apenas mudanças revisadas e aprovadas pela equipe.
4. Ao renomear, concluir ou remover uma branch, atualize seu registro. A documentação não exclui nem protege branches.

Evite misturar uma reformulação visual com correções sem relação na mesma tarefa. A convenção não autoriza descartar alterações, apagar branches ou publicar o site.

## Registro

As quatro branches iniciais foram conferidas localmente em 30/10/2026. “Não registrado” indica que este guia não recuperou a data ou a base histórica de criação.

| Branch | Data de registro | Base informada | Commit de origem | Finalidade | Situação |
| --- | --- | --- | --- | --- | --- |
| `main` | 2026-10-30 | Não registrado | Não registrado | Referência para trabalhos revisados | Permanente |
| `teste` | 2026-10-30 | Não registrado | Não registrado | Experimentos e validação conjunta | Permanente |
| `designer` | 2026-10-30 | Não registrado | Não registrado | Interface, layout e experiência visual | Permanente |
| `bugs` | 2026-10-30 | Não registrado | Não registrado | Correções de comportamento e regressões | Permanente |
