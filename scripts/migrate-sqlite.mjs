import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import Database from 'better-sqlite3';
import { db, initializeDatabase, withTransaction } from '../src/db/database.js';

const path = resolve(process.env.SQLITE_PATH || 'data/produtos.db');
if (!existsSync(path)) throw new Error(`SQLite não encontrado: ${path}`);
const legacy = new Database(path, { readonly: true, fileMustExist: true });

const tables = [
  { name: 'produtos', columns: ['id_produto', 'nome', 'descricao', 'categoria', 'preco', 'unidade_medida', 'ativo', 'criado_em'] },
  { name: 'importacoes', columns: ['id', 'nome_arquivo', 'hash_arquivo', 'recebido_em', 'total_registros', 'processados', 'rejeitados', 'status', 'erro_estrutural'] },
  { name: 'vendas', columns: ['id', 'importacao_id', 'id_venda', 'id_cliente', 'id_produto', 'quantidade', 'valor_unitario', 'valor_total', 'data_venda', 'forma_pagamento', 'status', 'integrante', 'email', 'criado_em'] },
  { name: 'erros_importacao', columns: ['id', 'importacao_id', 'linha', 'motivo', 'dados'] },
];

function convertValue(column, value) {
  if (value == null) return null;
  if (column === 'ativo') return Boolean(value);
  if (column === 'criado_em' || column === 'recebido_em') return new Date(`${value.replace(' ', 'T')}Z`);
  return value;
}

try {
  await initializeDatabase();
  const counts = await withTransaction(async (client) => {
    for (const { name } of tables) {
      const existing = (await client.query(`SELECT count(*)::int AS total FROM ${name}`)).rows[0].total;
      if (existing) throw new Error(`Migração cancelada: ${name} já tem ${existing} registros no PostgreSQL.`);
    }
    const inserted = {};
    for (const { name, columns } of tables) {
      const rows = legacy.prepare(`SELECT ${columns.join(', ')} FROM ${name} ORDER BY rowid`).all();
      if (name === 'produtos') {
        for (const product of rows) {
          await client.query('INSERT INTO categorias (nome) VALUES ($1) ON CONFLICT DO NOTHING', [product.categoria]);
          await client.query('INSERT INTO unidades_medida (sigla) VALUES ($1) ON CONFLICT DO NOTHING', [product.unidade_medida]);
        }
      }
      const overriding = name === 'produtos' ? '' : ' OVERRIDING SYSTEM VALUE';
      const query = `INSERT INTO ${name} (${columns.join(', ')})${overriding} VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})`;
      for (const row of rows) {
        await client.query(query, columns.map((column) => convertValue(column, row[column])));
      }
      inserted[name] = rows.length;
      const key = name === 'produtos' ? 'id_produto' : 'id';
      await client.query(
        `SELECT setval(pg_get_serial_sequence($1, $2),
           GREATEST((SELECT COALESCE(MAX(${key}), 0) FROM ${name}), 1),
           (SELECT COUNT(*) > 0 FROM ${name}))`,
        [name, key],
      );
    }
    return inserted;
  });
  console.log('Migração concluída:', counts);
} finally {
  legacy.close();
  await db.end();
}
