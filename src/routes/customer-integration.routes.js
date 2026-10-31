import { Router } from 'express';
import { db } from '../db/database.js';
import { getIntegration, integrateCustomers } from '../services/customer-integration.service.js';

export const customerIntegrationRouter = Router();

customerIntegrationRouter.post('/executar', async (_request, response) => {
  const run = await integrateCustomers();
  response.status(run.status === 'FALHOU' ? 503 : 201).json(run);
});

customerIntegrationRouter.get('/clientes', async (_request, response) => {
  const result = await db.query(
    `SELECT id_cliente_origem, nome, email, cidade, ativo, atualizado_em_origem, integrado_em
     FROM clientes_integrados ORDER BY id_cliente_origem`,
  );
  response.json(result.rows);
});

customerIntegrationRouter.get('/', async (_request, response) => {
  response.json((await db.query('SELECT * FROM integracoes ORDER BY id DESC')).rows);
});

customerIntegrationRouter.get('/:id', async (request, response) => {
  if (!/^\d+$/.test(request.params.id)) return response.status(400).json({ message: 'ID inválido.' });
  const run = await getIntegration(request.params.id);
  return run ? response.json(run) : response.status(404).json({ message: 'Integração não encontrada.' });
});
