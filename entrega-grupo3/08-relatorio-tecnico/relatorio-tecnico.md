# 8. Relatório técnico — Integração por banco de dados

## Arquitetura e banco

O Grupo 3 mantém uma aplicação Node.js/Express e o banco próprio PostgreSQL `grupo3_db`. O módulo `pg` abre um pool para o banco local e outro, configurado por `GRUPO1_*`, para leitura do PostgreSQL do Grupo 1. Os bancos são independentes. A aplicação não escreve no banco do Grupo 1. A interface oferece CRUD de catálogos e produtos, importação CSV legada e tela de clientes integrados.

O banco do Grupo 3 possui 11 tabelas e a view `public.vw_integracao_produtos`. O esquema está em `sql/01-schema.sql`. A aplicação era baseada em SQLite no trabalho anterior; `scripts/migrate-sqlite.mjs` permite transferir os registros legados para um PostgreSQL vazio em transação. Os catálogos e produtos de demonstração também podem ser criados por `sql/03-seed.sql`.

## Estratégia de integração

**Entrada:** o Grupo 3 consulta o snapshot completo da view `integracao.vw_integracao_clientes` no `grupo1_db`. A execução é sob demanda, acionada por `POST /api/integracao-clientes/executar` ou pelo botão da interface. As colunas obrigatórias são verificadas antes do processamento. O identificador externo `codigo_cliente` é guardado como `id_cliente_origem`, único no destino.

**Saída:** o Grupo 3 publica `public.vw_integracao_produtos` com oito colunas. O papel `usuario_integracao_g5` tem `SELECT` na view e não tem `SELECT` direto na tabela `produtos`. A view inclui produtos inativos (`ativo = FALSE`) e a trigger de `produtos` atualiza `atualizado_em` após edições. A sincronização para o banco do Grupo 5 é responsabilidade do consumidor.

## Validação e transformações

O consumidor valida ID positivo, nome e e-mail obrigatórios, formato do documento, tamanho do telefone, categoria e status financeiro permitidos, limite de crédito não negativo, cidade, UF, booleano e datas. Nome, e-mail e cidade perdem espaços nas extremidades. Somente ID externo, nome, e-mail, cidade, ativo e data de atualização são persistidos em `clientes_integrados`; CPF, telefone, UF e dados financeiros não são copiados. Os registros recebidos com a mesma chave no snapshot são tratados como duplicados.

## Erros e transações

Cada execução possui uma linha em `integracoes`, com totais consultados, processados, inseridos, atualizados, inalterados, rejeitados e desativados. Erros de estrutura/conexão ficam em `erro_estrutural`; erros por registro ficam em `erros_integracao`. O texto de auditoria identifica o cliente sem reproduzir CPF nem valores financeiros. A gravação local usa transação e savepoint por cliente, de modo que uma linha rejeitada não impede as demais. Erro inesperado da transação causa `ROLLBACK`. Um snapshot com rejeições não desativa clientes ausentes, para evitar desativação indevida.

## Decisões e limites atuais

- O PostgreSQL substituiu o SQLite como banco de operação; o SQLite antigo permanece como fonte de migração opcional.
- A integração remota pode usar `cloudflared` como encaminhamento TCP quando a rede local bloqueia acesso entre computadores. O túnel precisa estar ativo durante a execução. O modo temporário gera hostname novo ao reiniciar e não garante disponibilidade.
- A importação de clientes é manual/sob demanda; não há agendamento automático.
- A atualização local compara os campos armazenados e o timestamp recebidos. O código atual **não impede explicitamente** que um snapshot com data mais antiga sobrescreva uma data mais nova; isso difere da redação estrita do contrato recebido.
- O sistema armazena clientes integrados, mas não possui vínculo funcional entre produto e cliente. O contrato recebido menciona associação; esse ponto não foi implementado no escopo atual.
- O contrato devolvido pelo Grupo 5 propôs colunas diferentes da view existente. A interface produzida segue o contrato enviado pelo Grupo 3 até aceite conjunto de uma eventual revisão.

## Evidência funcional

Em 30/10/2026, uma execução real da integração com o Grupo 1 consultou três clientes, processou três e inseriu três, sem rejeições; ver o relatório do item 7. O teste de contrato do Grupo 5 está automatizado em `scripts/check-group5-contract.mjs`. O acesso remoto a partir do computador do Grupo 5 deve ser demonstrado separadamente; uma consulta local à view não comprova conectividade externa.
