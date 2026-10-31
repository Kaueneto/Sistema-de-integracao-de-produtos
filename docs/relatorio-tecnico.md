# Relatório técnico — integração por banco de dados

## Arquitetura

A aplicação Express usa `pg` para acessar o PostgreSQL próprio do Grupo 3. Um pool separado, configurado por `GRUPO1_*`, consulta o banco do Grupo 1. Os dois bancos são independentes. O Grupo 5 acessa somente `public.vw_integracao_produtos` pelo usuário de leitura `usuario_integracao_g5`.

## Processo de consumo

1. Consultar a view do Grupo 1.
2. Verificar as colunas obrigatórias do contrato v1.0 do Grupo 1.
3. Validar ID, nome, e-mail, CPF no formato contratado, categoria, situação financeira, limite, cidade, UF, ativo e datas de cada cliente.
4. Transformar textos por remoção de espaços externos e guardar o ID de origem.
5. Dentro de uma transação local, inserir, atualizar ou manter clientes. A chave única `id_cliente_origem` evita duplicidade. O processo usa savepoint por cliente para rejeitar um registro com erro sem perder os demais.
6. Se não houver registros rejeitados, marcar como inativos os clientes locais ausentes na view de ativos.
7. Registrar `integracoes` e `erros_integracao`. O relatório informa consultados, processados, inseridos, atualizados, inalterados, desativados e rejeitados.

O Grupo 3 armazena somente os campos necessários para identificar clientes; CPF e dados financeiros são validados, mas não copiados.

Falha de conexão ou mudança estrutural impede o processamento e produz uma execução `FALHOU`. Uma falha inesperada na transação provoca `ROLLBACK` e também é registrada. O acesso remoto nunca altera o banco do Grupo 1.

## Produção de produtos

Produtos usam chave gerada pelo PostgreSQL e se relacionam com categorias, marcas, fornecedores e unidades. Edições atualizam `atualizado_em` por trigger. A exclusão na aplicação é lógica (`ativo = FALSE`), permitindo ao Grupo 5 observar a desativação. A view esconde dados internos e mantém os oito campos do contrato enviado pelo Grupo 3. O usuário do Grupo 5 possui `SELECT` nela. A data da view permanece `TIMESTAMPTZ`.

## Verificações realizadas

- Cadastro, edição e desativação de produto com persistência PostgreSQL.
- Leitura da view pelo papel do Grupo 5 e negativa de acesso à tabela interna.
- Testes automatizados da validação de cliente conforme os campos do contrato v1.0.
- Integração real em 30/10/2026: três clientes consultados, processados e inseridos no banco do Grupo 3, sem rejeições.
- Migração do SQLite anterior: 4 importações, 873 vendas e 7 erros transferidos para um banco de teste vazio.

O teste ponta a ponta com a view real do Grupo 1 foi realizado por túnel TCP. A interface de produtos segue o contrato enviado pelo Grupo 3; o acesso remoto a partir do computador do Grupo 5 e a concordância formal com o contrato de oito colunas ainda precisam ser comprovados.
