import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
mkdirSync(dataDirectory, { recursive: true });

export const db = new Database(join(dataDirectory, 'produtos.db'));
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS produtos (
    id_produto INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT NOT NULL DEFAULT '',
    categoria TEXT NOT NULL,
    preco REAL NOT NULL CHECK(preco > 0),
    unidade_medida TEXT NOT NULL,
    ativo INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0, 1)),
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS importacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_arquivo TEXT,
    recebido_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_registros INTEGER NOT NULL DEFAULT 0,
    processados INTEGER NOT NULL DEFAULT 0,
    rejeitados INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    erro_estrutural TEXT
  );

  CREATE TABLE IF NOT EXISTS vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    importacao_id INTEGER NOT NULL REFERENCES importacoes(id),
    id_venda INTEGER NOT NULL,
    id_cliente INTEGER NOT NULL,
    id_produto INTEGER NOT NULL,
    quantidade INTEGER NOT NULL,
    valor_unitario REAL NOT NULL,
    valor_total REAL NOT NULL,
    data_venda TEXT NOT NULL,
    forma_pagamento TEXT NOT NULL,
    status TEXT NOT NULL,
    integrante TEXT NOT NULL,
    email TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(importacao_id, id_venda)
  );

  CREATE TABLE IF NOT EXISTS erros_importacao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    importacao_id INTEGER NOT NULL REFERENCES importacoes(id),
    linha INTEGER NOT NULL,
    motivo TEXT NOT NULL,
    dados TEXT NOT NULL
  );
`);

const productColumns = db.prepare("PRAGMA table_info('produtos')").all().map((column) => column.name);
if (!productColumns.includes('id_produto')) {
  db.transaction(() => {
    db.exec(`
      CREATE TABLE produtos_novos (
        id_produto INTEGER PRIMARY KEY,
        nome TEXT NOT NULL,
        descricao TEXT NOT NULL DEFAULT '',
        categoria TEXT NOT NULL,
        preco REAL NOT NULL CHECK(preco > 0),
        unidade_medida TEXT NOT NULL,
        ativo INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0, 1)),
        criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO produtos_novos (id_produto, nome, descricao, categoria, preco, unidade_medida, ativo, criado_em)
      SELECT id, nome, descricao, 'Não informada', preco_unitario, 'UN', ativo, criado_em FROM produtos;
      DROP TABLE produtos;
      ALTER TABLE produtos_novos RENAME TO produtos;
    `);
  })();
}

// Migração da primeira versão: o histórico não deve bloquear testes pelo nome
// ou pelo conteúdo de um arquivo. A regra de conflito pertence ao id_venda.
const importDefinition = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'importacoes'").get()?.sql ?? '';
if (importDefinition.includes('hash_arquivo')) {
  db.pragma('foreign_keys = OFF');
  db.transaction(() => {
    db.exec(`
      CREATE TABLE importacoes_nova (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recebido_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        total_registros INTEGER NOT NULL DEFAULT 0,
        processados INTEGER NOT NULL DEFAULT 0,
        rejeitados INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        erro_estrutural TEXT
      );
      INSERT INTO importacoes_nova (id, recebido_em, total_registros, processados, rejeitados, status, erro_estrutural)
      SELECT id, recebido_em, total_registros, processados, rejeitados, status, erro_estrutural FROM importacoes;
      DROP TABLE importacoes;
      ALTER TABLE importacoes_nova RENAME TO importacoes;
    `);
  })();
  db.pragma('foreign_keys = ON');
}

const importColumns = db.prepare("PRAGMA table_info('importacoes')").all().map((column) => column.name);
if (!importColumns.includes('nome_arquivo')) {
  db.exec('ALTER TABLE importacoes ADD COLUMN nome_arquivo TEXT');
}
if (!importColumns.includes('hash_arquivo')) {
  db.exec('ALTER TABLE importacoes ADD COLUMN hash_arquivo TEXT');
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_importacoes_hash_arquivo ON importacoes(hash_arquivo) WHERE hash_arquivo IS NOT NULL');

// Uma pessoa pode realizar várias vendas. Logo, o e-mail precisa ser válido,
// mas não deve impedir novas vendas quando se repetir em linhas diferentes.
const salesDefinition = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'vendas'").get()?.sql ?? '';
if (salesDefinition.includes('email TEXT NOT NULL UNIQUE')) {
  db.pragma('foreign_keys = OFF');
  db.transaction(() => {
    db.exec(`
      CREATE TABLE vendas_nova (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        importacao_id INTEGER NOT NULL REFERENCES importacoes(id),
        id_venda INTEGER NOT NULL,
        id_cliente INTEGER NOT NULL,
        id_produto INTEGER NOT NULL,
        quantidade INTEGER NOT NULL,
        valor_unitario REAL NOT NULL,
        valor_total REAL NOT NULL,
        data_venda TEXT NOT NULL,
        forma_pagamento TEXT NOT NULL,
        status TEXT NOT NULL,
        integrante TEXT NOT NULL,
        email TEXT NOT NULL,
        criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(importacao_id, id_venda)
      );
      INSERT INTO vendas_nova SELECT * FROM vendas;
      DROP TABLE vendas;
      ALTER TABLE vendas_nova RENAME TO vendas;
    `);
  })();
  db.pragma('foreign_keys = ON');
}

// Os CSVs do exercício representam cenários/remessas independentes. Assim,
// id_venda precisa ser único somente dentro de uma mesma remessa.
const scopedSalesDefinition = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'vendas'").get()?.sql ?? '';
if (scopedSalesDefinition.includes('id_venda INTEGER NOT NULL UNIQUE')) {
  db.pragma('foreign_keys = OFF');
  db.transaction(() => {
    db.exec(`
      CREATE TABLE vendas_nova (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        importacao_id INTEGER NOT NULL REFERENCES importacoes(id),
        id_venda INTEGER NOT NULL,
        id_cliente INTEGER NOT NULL,
        id_produto INTEGER NOT NULL,
        quantidade INTEGER NOT NULL,
        valor_unitario REAL NOT NULL,
        valor_total REAL NOT NULL,
        data_venda TEXT NOT NULL,
        forma_pagamento TEXT NOT NULL,
        status TEXT NOT NULL,
        integrante TEXT NOT NULL,
        email TEXT NOT NULL,
        criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(importacao_id, id_venda)
      );
      INSERT INTO vendas_nova SELECT * FROM vendas;
      DROP TABLE vendas;
      ALTER TABLE vendas_nova RENAME TO vendas;
    `);
  })();
  db.pragma('foreign_keys = ON');
}
