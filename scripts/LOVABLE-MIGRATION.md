# Migração de Dindinha Presentes para Lovable

## Arquivos

- `dindinha-codigo.zip`: frontend, backend, imagens estáticas, testes e configuração de referência. Use na importação inicial.
- `dindinha-produtos-fotos.zip`: registros atuais do catálogo em `products.json` e fotos enviadas em `photos/`. Forneça na etapa de importar os dados.
- As pastas `codigo/` e `dados/` também estão disponíveis sem compactação.

Não foram exportados contas administrativas, senhas, hashes de senha, cookies, sessões, bancos SQLite, backups nem arquivos `.env` com valores. Os testes contêm credenciais fictícias usadas somente em bancos temporários. O telefone comercial já público permanece no código de atendimento.

## Importar

1. Entre na sua conta em https://lovable.dev e, no painel inicial, procure `+` → `Import project to Lovable` → `Upload code`.
2. Selecione `dindinha-codigo.zip`. A importação pode consumir créditos e ser liberada gradualmente por conta. Ela cria um novo projeto.
3. Peça para preservar os temas, a identidade visual e as funcionalidades descritas abaixo. Revise a prévia antes de publicar.
4. Quando forem solicitados os dados existentes, envie `products.json` e as fotos ou o ZIP de dados. Os caminhos `image_file` são relativos à pasta `dados/`; as imagens precisam ser enviadas para o armazenamento do novo projeto e vinculadas aos respectivos produtos.
5. Configure a conta proprietária pelo fluxo de autenticação do novo projeto. Não cole senhas no chat. A autenticação atual não foi exportada.
6. Confira produtos, preços, fotos, personalizações, tema e proteção administrativa. Publique somente depois de revisar o resultado.

## Orientação para o chat de importação

Migre este projeto para Dindinha Presentes, preservando o visual atual do frontend em site/, suas seis rotas, os temas claro e escuro, o presente rosa transparente como favicon, o carrinho com personalizações e o resumo enviado pelo cliente ao WhatsApp.

O projeto de origem usa JavaScript nativo, Nginx, Node.js 24, SQLite e Docker. Adapte a aplicação ao ambiente do Lovable; não tente executar Docker ou depender de localhost:8080 no site publicado. Recrie catálogo, upload de fotos e autenticação no backend disponível. Somente o proprietário pode criar, editar, ocultar e excluir produtos; visitantes apenas consultam o catálogo e montam pedidos. Preserve a restrição no servidor, não apenas escondendo botões. O painel é acessado em /admin/ e não aparece nos menus da vitrine.

Os preços são armazenados em centavos (price_cents). Converta para reais somente para exibir; mantenha o cálculo autoritativo no backend. Valide disponibilidade antes de abrir o WhatsApp. Não há pagamento online nem cálculo automático de frete. Não envie mensagens automaticamente.

Preserve as correções: capturar todos os dados e o ID antes de enviar a foto; impedir troca de produto durante o salvamento; descartar cotações se o carrinho ou a rota mudar. Preserve limites de 30 linhas, 1 a 99 unidades por linha e 500 caracteres de personalização. Mantenha fotos em uso por produtos ocultos ou compartilhadas. Adapte limpeza de imagens abandonadas com prazo mínimo de segurança e cópias de segurança ao novo backend.

Solicite o arquivo de dados separado após a primeira prévia. Preserve os IDs dos produtos e vincule cada image_file à foto correspondente. O kit de MDF está no banco exportado, mas não no seed inicial: não o perca nem duplique os outros produtos. Não importe credenciais de testes como contas reais. Não remova o projeto local nem modifique automaticamente o projeto antigo no Lovable.

## Verificações antes de publicar

- Confira a quantidade de produtos, os valores em centavos e as fotos com `products.json`, incluindo eventuais produtos ocultos.
- Verifique busca, categorias, ordenação, detalhes, carrinho, quantidade, personalização e resumo do WhatsApp.
- Teste como visitante: alterações e envio de fotos devem ser recusados pelo backend.
- Teste como proprietário e simule envio lento de foto e mudança do carrinho durante uma cotação.
- Confira temas claro/escuro, celular, favicon e links de contato.
- Confirme o destino dos backups e a política de limpeza de imagens do novo ambiente.

Referência: https://docs.lovable.dev/features/projects/import-project
