# Entrega — Grupo 3, Sistema de Produtos

Esta pasta organiza os oito itens da seção 21 do trabalho. O sistema usa PostgreSQL (`grupo3_db`), consome a view de clientes do Grupo 1 e publica uma view de produtos para o Grupo 5.

| Item | Arquivos nesta pasta |
|---|---|
| 1. Código-fonte | `01-codigo-fonte.md` — link do GitHub e instruções |
| 2. Banco de dados | `02-banco/` — scripts de criação, permissões e dados iniciais |
| 3. Contratos | `03-contratos/` — documentos recebidos e enviados, com nota sobre versões |
| 4. Modelo do banco | `04-modelo/` — DER em PDF, PNG e Mermaid |
| 5. Estrutura de integração | `05-estrutura/` — campos e regras das views |
| 6. Configuração | `06-configuracao/` — guia, modelo do `.env` e scripts PowerShell |
| 7. Relatório de integração | `07-relatorio-integracao/` — execução real e tratamento de erros |
| 8. Relatório técnico | `08-relatorio-tecnico/` — arquitetura, transformação e decisões |

## Conferências antes de enviar ao professor

1. Abra o link do GitHub e confirme que o código mais recente está publicado.
2. Confirme com o Grupo 5 o aceite do contrato de oito colunas. A proposta anterior recebida deles não corresponde à view implementada e está identificada como tal.
3. Se houver uma execução posterior à registrada no item 7, atualize o relatório a partir da tabela `integracoes`.
4. Não envie o `.env` real, senhas, tokens Cloudflare ou dados pessoais de clientes. O modelo de ambiente contém somente campos para preencher localmente.

Os documentos principais estão disponíveis em PDF. Os arquivos Markdown permitem edição e os scripts SQL podem ser executados no Query Tool do pgAdmin.
