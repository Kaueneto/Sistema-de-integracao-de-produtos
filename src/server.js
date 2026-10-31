import { app } from './app.js';
import { initializeDatabase } from './db/database.js';

const PORT = Number(process.env.PORT) || 3000;

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Sistema de Produtos disponível em http://localhost:${PORT}`);
  });
};

try {
  await initializeDatabase();
  startServer();
} catch (error) {
  console.error('Falha ao iniciar o PostgreSQL do Grupo 3:', error.message);
  process.exitCode = 1;
}
