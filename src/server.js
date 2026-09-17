import { app } from './app.js';
import './db/database.js';

const PORT = Number(process.env.PORT) || 3000;

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Sistema de Produtos disponível em http://localhost:${PORT}`);
  });
};

startServer();