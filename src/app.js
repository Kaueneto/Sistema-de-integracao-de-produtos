import express from 'express';
import multer from 'multer';
import { join } from 'node:path';

import { importsRouter } from './routes/imports.routes.js';
import { productsRouter } from './routes/products.routes.js';
import { salesRouter } from './routes/sales.routes.js';

export const app = express();

// mdlewares
app.use(express.json());
app.use(express.static(join(process.cwd(), 'public')));

// routessss
app.use('/api/importacoes', importsRouter);
app.use('/api/produtos', productsRouter);
app.use('/api/vendas', salesRouter);

// tratam. de erros
  app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    return response.status(400).json({
      message: 'Arquivo excede o limite de 5 MB.',
    });
  }

  return response.status(400).json({
    message: error.message || 'Não foi possível concluir a operação.',
  });
});