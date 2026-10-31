import { Router } from 'express';
import { db } from '../db/database.js';

export const salesRouter = Router();

salesRouter.get('/', async (_request, response) => {
  const result = await db.query(
    `SELECT importacao_id, id_venda, id_cliente, id_produto, quantidade,
      valor_unitario, valor_total, data_venda, forma_pagamento, status, integrante, email
     FROM vendas ORDER BY id_venda DESC`,
  );
  response.json(result.rows);
});
