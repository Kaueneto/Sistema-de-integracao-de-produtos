import { db } from '../db/database.js';

const definitions = Object.freeze({
  categorias: { table: 'categorias', key: 'nome', limit: 100 },
  marcas: { table: 'marcas', key: 'nome', limit: 100 },
  fornecedores: { table: 'fornecedores', key: 'nome', limit: 120, extra: 'contato', extraLimit: 254 },
  unidades: { table: 'unidades_medida', key: 'sigla', limit: 20, extra: 'descricao', extraLimit: 100 },
});

function definition(kind) {
  const found = definitions[kind];
  if (!found) {
    const error = new Error('Catálogo desconhecido.');
    error.status = 404;
    throw error;
  }
  return found;
}

function input(def, body) {
  const key = String(body[def.key] ?? '').trim();
  const extra = def.extra ? String(body[def.extra] ?? '').trim() : null;
  if (!key || key.length > def.limit || (extra && extra.length > def.extraLimit)) {
    const error = new Error('Nome/sigla obrigatório ou acima do limite permitido.');
    error.status = 400;
    throw error;
  }
  return { key, extra, ativo: body.ativo !== false };
}

export async function listCatalog(kind) {
  const def = definition(kind);
  return (await db.query(`SELECT * FROM ${def.table} ORDER BY ${def.key}`)).rows;
}

export async function createCatalogEntry(kind, body) {
  const def = definition(kind);
  const entry = input(def, body);
  const columns = [def.key, ...(def.extra ? [def.extra] : []), 'ativo'];
  const values = [entry.key, ...(def.extra ? [entry.extra] : []), entry.ativo];
  return (await db.query(
    `INSERT INTO ${def.table} (${columns.join(', ')}) VALUES (${values.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`,
    values,
  )).rows[0];
}

export async function updateCatalogEntry(kind, oldKey, body) {
  const def = definition(kind);
  const entry = input(def, body);
  const assignments = [`${def.key}=$2`, ...(def.extra ? [`${def.extra}=$3`] : []),
    `ativo=$${def.extra ? 4 : 3}`];
  const values = [oldKey, entry.key, ...(def.extra ? [entry.extra] : []), entry.ativo];
  return (await db.query(
    `UPDATE ${def.table} SET ${assignments.join(', ')} WHERE ${def.key}=$1 RETURNING *`,
    values,
  )).rows[0];
}

export async function deleteCatalogEntry(kind, key) {
  const def = definition(kind);
  return (await db.query(`DELETE FROM ${def.table} WHERE ${def.key}=$1 RETURNING *`, [key])).rows[0];
}
