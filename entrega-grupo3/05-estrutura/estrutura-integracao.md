# 5. Estruturas de integração

## Grupo 3 como produtor: produtos para o Grupo 5

**Banco:** `grupo3_db` · **View:** `public.vw_integracao_produtos` · **Usuário:** `usuario_integracao_g5`, com `CONNECT` no banco, `USAGE` no schema `public` e `SELECT` somente na view. A tabela interna `produtos` não é liberada para leitura direta.

| Coluna | Tipo | Regra |
|---|---|---|
| `id_produto` | INTEGER | Identificador único, maior que zero |
| `nome` | VARCHAR(120) | Obrigatório e não vazio |
| `descricao` | VARCHAR(500) | Texto; pode estar vazio |
| `categoria` | VARCHAR(100) | Obrigatória e não vazia |
| `preco` | NUMERIC(12,2) | Obrigatório e maior que zero |
| `unidade_medida` | VARCHAR(20) | Obrigatória e não vazia |
| `ativo` | BOOLEAN | `FALSE` indica desativação lógica |
| `atualizado_em` | TIMESTAMPTZ | Atualizado por trigger ao modificar produto |

```sql
SELECT id_produto, nome, descricao, categoria, preco,
       unidade_medida, ativo, atualizado_em
FROM public.vw_integracao_produtos
ORDER BY id_produto;
```

A view inclui produtos inativos para que o Grupo 5 receba a mudança de estado. A chave `id_produto` é PK na tabela `produtos`; a view em si não possui restrição de PK.

## Grupo 3 como consumidor: clientes do Grupo 1

**Banco remoto:** `grupo1_db` · **View:** `integracao.vw_integracao_clientes` · **Usuário remoto:** `integ_g3`, somente leitura. A view traz `codigo_cliente`, `nome_cliente`, `email_cliente`, `documento`, `telefone`, `categoria`, `status_financeiro`, `limite_credito`, `cidade`, `uf`, `ativo`, `data_cadastro` e `data_atualizacao`.

O sistema valida as colunas contratadas, mas grava somente `codigo_cliente → id_cliente_origem`, `nome_cliente → nome`, `email_cliente → email`, `cidade → cidade`, `ativo` e `data_atualizacao → atualizado_em_origem` em `clientes_integrados`. CPF e dados financeiros não são copiados. O Grupo 3 não grava nada no banco produtor.

```sql
SELECT codigo_cliente, nome_cliente, email_cliente, data_atualizacao
FROM integracao.vw_integracao_clientes
LIMIT 5;
```

O acesso entre computadores exige uma rota de rede. No ambiente demonstrado, um cliente `cloudflared` local encaminhou `127.0.0.1:15437` para o banco do Grupo 1. O hostname temporário e as credenciais não fazem parte desta documentação.
