# 7. Relatório de integração — Grupo 1 → Grupo 3

## Execução observada

Registro consultado no PostgreSQL do Grupo 3 em **30/10/2026**. A execução de ID **17** constava com status `CONCLUIDA`. O cliente do túnel do Grupo 1 estava ativo e o sistema leu a view `integracao.vw_integracao_clientes`.

| Métrica exigida | Resultado |
|---|---:|
| Registros consultados | 3 |
| Registros processados | 3 |
| Registros rejeitados | 0 |
| Registros atualizados | 0 |
| Registros inseridos | 3 |
| Registros inalterados | 0 |
| Registros desativados | 0 |
| Status | CONCLUIDA |

**Erros encontrados nesta execução:** nenhum (`erro_estrutural = NULL` e nenhum registro em `erros_integracao`). **Tratamento realizado:** os três clientes passaram pela validação de estrutura e de conteúdo e foram inseridos em `clientes_integrados`, sem copiar CPF ou dados financeiros. A consulta posterior ao banco do Grupo 3 confirmou três clientes armazenados.

## Como o sistema trata outras situações

- Falha de conexão ou coluna obrigatória ausente: grava uma execução `FALHOU` em `integracoes`, com a mensagem em `erro_estrutural`; não processa clientes.
- Linha inválida ou duplicada: registra em `erros_integracao`, rejeita essa linha e continua com as válidas. A execução fica `CONCLUIDA_COM_ERROS`.
- Falha de gravação de uma linha: `ROLLBACK TO SAVEPOINT` daquela linha e registro do erro; os demais clientes podem continuar.
- Cliente que desaparece do snapshot de ativos: é marcado localmente como inativo quando não houve rejeições na execução; não é apagado fisicamente.
- Falha da transação local: `ROLLBACK` da operação e registro de execução `FALHOU`.

Os cenários acima descrevem a implementação. **A execução 17 comprovou apenas o caso de três inserções válidas**, não uma atualização ou rejeição real. Para documentar uma execução posterior, consulte:

```sql
SELECT id, inicio, fim, total_consultado, processados, inseridos,
       atualizados, inalterados, desativados, rejeitados, status, erro_estrutural
FROM integracoes ORDER BY id DESC LIMIT 5;

SELECT integracao_id, registro_origem, tipo_erro, descricao
FROM erros_integracao ORDER BY id DESC LIMIT 10;
```

As execuções antigas de preparação foram removidas antes da demonstração; o relatório registra a execução 17 observada depois disso. Não incluir CPF, senha ou dados financeiros em capturas do relatório.
