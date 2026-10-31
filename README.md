# Sistema de Produtos — Grupo 3

Aplicação Node.js/Express com banco próprio PostgreSQL. Atua como consumidora de clientes do Grupo 1 e produtora de produtos para o Grupo 5. O importador de vendas por CSV do trabalho anterior continua disponível, agora gravando no PostgreSQL.

## Preparação local

1. Instale PostgreSQL e pgAdmin. No pgAdmin, conecte-se ao servidor local.
2. No **Query Tool** do banco `postgres`, execute `sql/00-create-role.sql`. Em **Login/Group Roles → grupo3_app → Properties**, ative **Can login** e defina uma senha.
3. Ainda no banco `postgres`, execute `sql/00-create-database.sql`. Se `grupo3_db` já existir, em vez disso use `ALTER DATABASE grupo3_db OWNER TO grupo3_app;`.
4. Abra o **Query Tool** de `grupo3_db` como administrador e execute `sql/00-own-schema.sql`.
5. Copie `.env.example` para `.env` e preencha `PGPASSWORD` com a senha que você definiu para `grupo3_app`. Não envie `.env` para outros grupos nem ao Git.
6. Execute `npm install` e `npm run dev`.
7. Abra `http://localhost:3000`. A inicialização cria as tabelas e a view descritas em `sql/01-schema.sql` no banco `grupo3_db`.

O app só abre a porta HTTP depois de conseguir conectar e aplicar o esquema. Se não iniciar, confira o banco, o usuário, a senha e a porta no `.env`.
Depois da primeira inicialização, rode `npm run db:check` para ver o banco, usuário, porta, objetos encontrados e contagens sem mostrar a senha.
Depois de executar `sql/02-grupo5-access.sql`, rode `npm run db:check:g5` para verificar os oito campos e as permissões do Grupo 5.
Para testar cadastro, edição, desativação e mudança da data na view sem deixar dados de teste salvos, rode `npm run db:smoke:g5`.

## O que verificar no pgAdmin

Expanda **Servers → seu servidor → Databases → grupo3_db → Schemas → public → Tables**. O catálogo com CRUD contém `produtos`, `categorias`, `marcas`, `fornecedores` e `unidades_medida`. A integração usa `clientes_integrados`, `integracoes` e `erros_integracao`. As tabelas `importacoes`, `vendas` e `erros_importacao` preservam o exercício CSV. Em **Schemas → public → Views**, confira `vw_integracao_produtos`.

Para conferir dados pelo Query Tool do `grupo3_db`:

```sql
SELECT * FROM produtos ORDER BY id_produto;
SELECT * FROM public.vw_integracao_produtos ORDER BY id_produto;
SELECT * FROM clientes_integrados ORDER BY id_cliente_origem;
SELECT * FROM integracoes ORDER BY id DESC;
SELECT * FROM erros_integracao ORDER BY id DESC;
```

Cadastre um produto na aba **Produtos**, execute as duas primeiras consultas e confira o mesmo ID, nome e preço. Edite o produto e confira `atualizado_em` na view. O botão **Desativar** faz exclusão lógica (`ativo = FALSE`) para o Grupo 5 receber a alteração.

A aba **Catálogos** permite criar, listar, alterar e excluir categorias, marcas, fornecedores e unidades. A aba **Produtos** permite criar, listar, editar e desativar. Para carregar 10 registros em cada catálogo e 10 produtos comerciais sem usar a interface, execute `sql/03-seed.sql` no banco `grupo3_db` depois de iniciar a aplicação. Os preços do seed são ilustrativos e os contatos dos fornecedores não foram preenchidos. O script pode ser executado novamente sem duplicar registros.

## Integração Grupo 1 → Grupo 3

O adaptador segue o contrato mais recente recebido do Grupo 1: consulta `integracao.vw_integracao_clientes` no banco `grupo1_db` com o usuário de leitura `integ_g3`. Configure `GRUPO1_PGHOST`, `GRUPO1_PGPORT`, `GRUPO1_PGDATABASE`, `GRUPO1_PGUSER` e `GRUPO1_PGPASSWORD` no `.env`. Quando o acesso for feito por `cloudflared access tcp --url 127.0.0.1:15437`, use `GRUPO1_PGHOST=127.0.0.1` e `GRUPO1_PGPORT=15437`, mantendo o túnel aberto. Os nomes da view e dos campos principais podem ser ajustados pelas variáveis `GRUPO1_VIEW` e `GRUPO1_FIELD_*`. Reinicie a aplicação após alterar o `.env`.

Na aba **Clientes integrados**, clique **Integrar clientes agora**. A execução consulta a view remota, valida os campos do contrato, insere clientes novos, atualiza os alterados e registra erros dos inválidos. Como a view mostra apenas clientes ativos, uma execução sem registros rejeitados marca como inativos os clientes locais ausentes no snapshot. Cada execução fica em `integracoes`, com relatório e erros em `erros_integracao`. Falhas de conexão ou de estrutura geram execução `FALHOU`; um registro inválido não impede os válidos, mas suspende a reconciliação de inativos nessa execução.

O sistema mantém somente a cópia local necessária para identificar os clientes. CPF e dados financeiros são validados durante a integração, mas não são armazenados no banco do Grupo 3.

Para testar antes da entrega do Grupo 1, há um **simulador local separado** em `sql/demo/` com a mesma estrutura da view contratada. Crie `grupo1_demo_db` pelo primeiro script, conecte o Query Tool a esse banco e execute o segundo. Use no `.env`: `GRUPO1_PGHOST=127.0.0.1`, `GRUPO1_PGDATABASE=grupo1_demo_db`, `GRUPO1_PGUSER` e `GRUPO1_PGPASSWORD` do seu PostgreSQL local. O simulador não substitui a integração real com o Grupo 1.

## Integração Grupo 3 → Grupo 5

A view `public.vw_integracao_produtos` expõe exatamente `id_produto`, `nome`, `descricao`, `categoria`, `preco`, `unidade_medida`, `ativo` e `atualizado_em`, conforme o contrato enviado pelo Grupo 3. Execute `sql/02-grupo5-access.sql` no banco `grupo3_db` como administrador para criar o usuário `usuario_integracao_g5` com permissão de leitura na view. Depois defina uma senha forte e ative o login para esse usuário no pgAdmin. Compartilhe as credenciais com o Grupo 5 por um canal privado.

O Grupo 5 precisa alcançar o servidor PostgreSQL do Grupo 3 por rede ou túnel TCP. No computador consumidor, `localhost:15437` só funciona enquanto o cliente `cloudflared access tcp` estiver ativo e apontando para o túnel do Grupo 3. O usuário de leitura deve ser testado no banco local antes de compartilhar o acesso.

## APIs

- `GET/POST /api/produtos`, `GET/PUT/DELETE /api/produtos/:id` — cadastro de produtos; DELETE desativa.
- `GET/POST /api/catalogos/:tipo`, `PUT/DELETE /api/catalogos/:tipo/:chave` — CRUD de categorias, marcas, fornecedores e unidades.
- `GET /api/produtos/export/csv` — exportação legada.
- `POST /api/integracao-clientes/executar` — executa a integração de clientes.
- `GET /api/integracao-clientes/clientes` — clientes locais.
- `GET /api/integracao-clientes` e `GET /api/integracao-clientes/:id` — histórico e relatório.
- `/api/importacoes` e `/api/vendas` — exercício CSV anterior.

O arquivo SQLite antigo em `data/produtos.db` não é apagado. Para transferir seu histórico, configure o banco novo, pare o servidor e rode `npm run migrate:sqlite` **uma única vez**. O script exige que as quatro tabelas legadas ainda estejam vazias no PostgreSQL; em caso de erro, desfaz toda a migração. Depois inicie `npm run dev`.

O pacote de entrega está em `entrega-grupo3/`, com scripts SQL, contratos, modelo visual, configuração e relatórios. Confirme com o Grupo 5 que consumirão a view de oito colunas, pois o documento que eles devolveram propunha colunas diferentes.
