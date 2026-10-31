import express from 'express';
import multer from 'multer';
import { join } from 'node:path';

import { importsRouter } from './routes/imports.routes.js';
import { productsRouter } from './routes/products.routes.js';
import { salesRouter } from './routes/sales.routes.js';
import { customerIntegrationRouter } from './routes/customer-integration.routes.js';
import { catalogRouter } from './routes/catalog.routes.js';

export const app = express();

// Middlewares.
app.use(express.json());
app.use(express.static(join(process.cwd(), 'public')));

// Rotas separadas por domínio.
app.use('/api/importacoes', importsRouter);
app.use('/api/produtos', productsRouter);
app.use('/api/vendas', salesRouter);
app.use('/api/integracao-clientes', customerIntegrationRouter);
app.use('/api/catalogos', catalogRouter);

// Resposta uniforme para erros de validação e banco.
app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    return response.status(400).json({
      message: 'Arquivo excede o limite de 5 MB.',
    });
  }

  const status = error.status || (error.code === '23505' || error.code === '23503' ? 409 : error.code?.startsWith('23') ? 400 :
    error.message?.startsWith('Configure ') ? 400 : 500);
  return response.status(status).json({
    message: error.message || 'Não foi possível concluir a operação.',
  });
});
