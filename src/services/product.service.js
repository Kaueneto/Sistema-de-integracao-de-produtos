import { db, withTransaction } from '../db/database.js';

const columns = 'id_produto, nome, descricao, categoria, marca, fornecedor, preco, unidade_medida, ativo, criado_em, atualizado_em';

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function productInput(body) {
  const nome = String(body.nome ?? '').trim();
  const descricao = String(body.descricao ?? '').trim();
  const categoria = String(body.categoria ?? '').trim();
  const marca = String(body.marca ?? '').trim() || null;
  const fornecedor = String(body.fornecedor ?? '').trim() || null;
  const unidade = String(body.unidade_medida ?? '').trim();
  const priceText = String(body.preco ?? '').trim().replace(',', '.');
  if (!nome || !categoria || !unidade) invalid('Informe nome, categoria e unidade de medida.');
  if (nome.length > 120 || descricao.length > 500 || categoria.length > 100 ||
      (marca && marca.length > 100) || (fornecedor && fornecedor.length > 120) || unidade.length > 20) {
    invalid('Um dos campos de texto excede o limite permitido.');
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(priceText) || Number(priceText) <= 0 || Number(priceText) > 9999999999.99) {
    invalid('Preço inválido. Informe valor entre 0,01 e 9.999.999.999,99.');
  }
  return { nome, descricao, categoria, marca, fornecedor,
    preco: Number(priceText), unidade_medida: unidade, ativo: body.ativo !== false };
}

const catalogReferences = [
  { field: 'categoria', table: 'categorias', key: 'nome', label: 'Categoria' },
  { field: 'marca', table: 'marcas', key: 'nome', label: 'Marca' },
  { field: 'fornecedor', table: 'fornecedores', key: 'nome', label: 'Fornecedor' },
  { field: 'unidade_medida', table: 'unidades_medida', key: 'sigla', label: 'Unidade de medida' },
];

async function validateCatalogReferences(client, product, previous = null) {
  for (const reference of catalogReferences) {
    const value = product[reference.field];
    if (!value) continue;
    const result = await client.query(
      `SELECT ativo FROM ${reference.table} WHERE ${reference.key} = $1`,
      [value],
    );
    if (!result.rows.length || (!result.rows[0].ativo && value !== previous?.[reference.field])) {
      invalid(`${reference.label} não encontrada ou inativa. Se necessário, cadastre ou ative a opção em Catálogos.`);
    }
  }
}

export async function listProducts() {
  return (await db.query(`SELECT ${columns} FROM produtos ORDER BY id_produto`)).rows;
}

export async function getProduct(id) {
  return (await db.query(`SELECT ${columns} FROM produtos WHERE id_produto = $1`, [id])).rows[0];
}

export async function createProduct(body) {
  const p = productInput(body);
  return withTransaction(async (client) => {
    await validateCatalogReferences(client, p);
    const result = await client.query(
      `INSERT INTO produtos (nome, descricao, categoria, marca, fornecedor, preco, unidade_medida, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${columns}`,
      [p.nome, p.descricao, p.categoria, p.marca, p.fornecedor, p.preco, p.unidade_medida, p.ativo],
    );
    return result.rows[0];
  });
}

export async function updateProduct(id, body) {
  const p = productInput(body);
  return withTransaction(async (client) => {
    const previous = (await client.query(
      'SELECT categoria, marca, fornecedor, unidade_medida FROM produtos WHERE id_produto = $1 FOR UPDATE',
      [id],
    )).rows[0];
    if (!previous) return null;
    await validateCatalogReferences(client, p, previous);
    const result = await client.query(
      `UPDATE produtos SET nome = $2, descricao = $3, categoria = $4, marca = $5, fornecedor = $6,
        preco = $7, unidade_medida = $8, ativo = $9 WHERE id_produto = $1 RETURNING ${columns}`,
      [id, p.nome, p.descricao, p.categoria, p.marca, p.fornecedor,
        p.preco, p.unidade_medida, p.ativo],
    );
    return result.rows[0];
  });
}

// A exclusão é lógica para que o Grupo 5 perceba que o produto ficou inativo.
export async function deactivateProduct(id) {
  const result = await db.query(
    `UPDATE produtos SET ativo = FALSE WHERE id_produto = $1 RETURNING ${columns}`,
    [id],
  );
  return result.rows[0];
}
