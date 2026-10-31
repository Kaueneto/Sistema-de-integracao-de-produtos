# 6. Configuração do ambiente

## Requisitos

- Node.js compatível com `package.json`, PostgreSQL e pgAdmin.
- `cloudflared` nos computadores que usam túnel para PostgreSQL pela internet.
- Código-fonte do item 1 e scripts SQL do item 2.

## Banco do Grupo 3

1. No pgAdmin, conectado como administrador ao banco `postgres`, execute `02-banco/00-create-role.sql` e depois `02-banco/00-create-database.sql`.
2. Ative LOGIN e defina uma senha própria para `grupo3_app` no pgAdmin.
3. Conecte-se ao banco `grupo3_db` e execute `02-banco/00-own-schema.sql`.
4. Pela raiz do projeto, copie `.env.example` para `.env`, preencha o acesso ao PostgreSQL do Grupo 3 e rode `npm install` e `npm run dev`. O servidor aplica `sql/01-schema.sql` na inicialização. Alternativamente, execute esse SQL no Query Tool.
5. No pgAdmin, execute `02-banco/02-grupo5-access.sql`. Ative LOGIN e defina outra senha para `usuario_integracao_g5`.
6. Execute `02-banco/03-seed.sql` para dados iniciais e `npm run db:check` / `npm run db:check:g5` para verificar.

## Consumo dos clientes do Grupo 1

O arquivo `env-modelo.txt` mostra as variáveis. Use os dados de acesso fornecidos pelo Grupo 1. Se houver túnel TCP ativo no computador consumidor, `GRUPO1_PGHOST=127.0.0.1` e `GRUPO1_PGPORT=15437`. O parâmetro `GRUPO1_VIEW` deve apontar para `integracao.vw_integracao_clientes`. Reinicie `npm run dev` após alterar `.env`.

Para abrir o cliente do túnel no PowerShell, na pasta `06-configuracao`, execute:

```powershell
.\acessar-grupo1.ps1 -Hostname "HOSTNAME_ATUAL_DO_GRUPO1"
```

Deixe esse terminal aberto. No sistema, abra **Clientes integrados** e clique **Integrar clientes agora**. O sistema grava o relatório em `integracoes`.

## Publicação de produtos ao Grupo 5

O Grupo 5 consulta `grupo3_db.public.vw_integracao_produtos` com `usuario_integracao_g5`. O script `publicar-grupo3-tunel-rapido.ps1` reproduz o modo temporário usado em sala. Deixe o terminal aberto e entregue ao Grupo 5 o hostname gerado, o nome do banco e as credenciais de leitura por canal privado. O hostname muda ao reiniciar o túnel. O modo rápido TCP pode falhar; para acesso estável, configure um túnel com domínio e rota `tcp://127.0.0.1:5432`.

No computador do Grupo 5, o cliente `cloudflared access tcp` cria uma porta local, por exemplo `127.0.0.1:15437`; é essa porta que deve ser usada no pgAdmin deles. Não envie o papel `grupo3_app`, o usuário `postgres`, tokens do túnel ou o arquivo `.env`.

## Migração do SQLite anterior

Caso seja necessário transferir dados do trabalho CSV, mantenha a aplicação parada e, somente em um PostgreSQL de destino vazio, execute `npm run migrate:sqlite`. O script `scripts/migrate-sqlite.mjs` transfere `produtos`, `importacoes`, `vendas` e `erros_importacao` em transação; se encontrar dados preexistentes, cancela a operação.
