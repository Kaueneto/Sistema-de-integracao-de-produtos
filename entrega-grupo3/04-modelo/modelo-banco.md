# 4. Modelo lógico do banco `grupo3_db`

Modelo derivado de `02-banco/01-schema.sql`. As setas representam chaves estrangeiras de fato criadas pelo esquema; a view não é uma tabela e aparece em nota ao final.

```mermaid
erDiagram
    CATEGORIAS ||--o{ PRODUTOS : categoria
    MARCAS |o--o{ PRODUTOS : marca
    FORNECEDORES |o--o{ PRODUTOS : fornecedor
    UNIDADES_MEDIDA ||--o{ PRODUTOS : unidade_medida
    INTEGRACOES ||--o{ ERROS_INTEGRACAO : integracao_id
    IMPORTACOES ||--o{ VENDAS : importacao_id
    IMPORTACOES ||--o{ ERROS_IMPORTACAO : importacao_id

    CATEGORIAS { varchar nome PK
                 boolean ativo }
    MARCAS { varchar nome PK
             boolean ativo }
    FORNECEDORES { varchar nome PK
                   varchar contato
                   boolean ativo }
    UNIDADES_MEDIDA { varchar sigla PK
                      varchar descricao
                      boolean ativo }
    PRODUTOS { integer id_produto PK
               varchar nome
               varchar categoria FK
               varchar marca FK
               varchar fornecedor FK
               numeric preco
               varchar unidade_medida FK
               boolean ativo
               timestamptz atualizado_em }
    CLIENTES_INTEGRADOS { bigint id PK
                          bigint id_cliente_origem UK
                          varchar nome
                          varchar email
                          varchar cidade
                          boolean ativo
                          timestamptz atualizado_em_origem }
    INTEGRACOES { bigint id PK
                  varchar origem
                  varchar destino
                  integer total_consultado
                  integer processados
                  integer atualizados
                  integer rejeitados
                  varchar status }
    ERROS_INTEGRACAO { bigint id PK
                       bigint integracao_id FK
                       varchar tipo_erro
                       text descricao }
    IMPORTACOES { bigint id PK
                  varchar hash_arquivo UK
                  integer processados
                  integer rejeitados
                  varchar status }
    VENDAS { bigint id PK
             bigint importacao_id FK
             bigint id_venda
             bigint id_cliente
             bigint id_produto
             numeric valor_total }
    ERROS_IMPORTACAO { bigint id PK
                       bigint importacao_id FK
                       integer linha
                       text motivo }
```

**Notas:** `clientes_integrados` tem origem externa: `id_cliente_origem` corresponde a `codigo_cliente` no Grupo 1, sem FK entre bancos. `vendas.id_cliente` e `vendas.id_produto` são campos legados da importação CSV; o esquema atual não declara FKs deles para clientes ou produtos. `public.vw_integracao_produtos` projeta oito colunas de `produtos` para o Grupo 5.
