# Guia para desenvolvedores e IAs

Documentação conferida com o código em **30/10/2026**. Comece por este índice para entender o projeto e fazer alterações sem perder dados da loja.

| Guia | O que explica |
| --- | --- |
| [Arquitetura e funcionamento](arquitetura.md) | Serviços, arquivos, páginas e fluxo dos dados |
| [Tutorial de desenvolvimento](desenvolvimento.md) | Preparar ambiente, alterar visual, criar página/campo e testar |
| [Guia e registro de branches](branches/README.md) | Escolher entre main, teste, designer e bugs; criar e documentar novas branches |
| [API e dados](api-e-dados.md) | Endpoints, payloads, banco, autenticação e regras |
| [Acessos administrativos](acessos-administrativos.md) | Solicitação de conta, decisão exclusiva do proprietário e configuração de e-mail |
| [Operação e diagnóstico](operacao.md) | Backup, preservação de dados, problemas comuns e Lovable |
| [Orientação para IAs](../AGENTS.md) | Convenções para agentes que trabalham no repositório |
| [README principal](../README.md) | Visão geral, histórico de mudanças e uso da loja |

## Primeiros passos

Com o Docker Desktop aberto, em modo Linux, execute na raiz do repositório:

```powershell
docker compose up -d --build --wait
Start-Process 'http://localhost:8080'
```

| Endereço local | Uso |
| --- | --- |
| `http://localhost:8080/` | Vitrine |
| `http://localhost:8080/gestao/` | Preparar rascunhos, revisar e publicar produtos |
| `http://localhost:8080/admin/` | Alterar produtos publicados diretamente |

Uma instalação nova importa apenas os produtos do seed e não cria contas administrativas automaticamente. Os dados completos e as contas da instalação existente ficam no volume Docker, não no Git.

## Como usar estes guias

**Para um desenvolvedor:** leia arquitetura e siga o tutorial da alteração desejada. Consulte a referência da API ao mexer em dados ou permissões.

**Para uma IA:** leia também `AGENTS.md`, identifique os arquivos ativos e confirme o comportamento no código. Estes documentos descrevem a implementação atual; propostas e tarefas futuras não devem ser tratadas como funcionalidades prontas.

**Para manter a documentação:** atualize o guia quando a implementação mudar. Prefira apontar para o código, evitando copiar arquivos inteiros para os documentos. Não inclua dados privados da instalação.
