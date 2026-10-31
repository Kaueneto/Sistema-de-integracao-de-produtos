import { Router } from 'express';
import multer from 'multer';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { db } from '../db/database.js';
import { confirmVendasImport, previewVendasCsv } from '../services/csv-import.service.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
export const importsRouter = Router();

importsRouter.post('/preview', upload.single('file'), async (request, response) => {
  if (!request.file) return response.status(400).json({ message: 'Selecione um arquivo CSV.' });
  response.json(await previewVendasCsv(request.file));
});

importsRouter.post('/confirm', async (request, response) => {
  response.status(201).json(await confirmVendasImport(request.body.token));
});

importsRouter.get('/', async (_request, response) => {
  response.json((await db.query('SELECT * FROM importacoes ORDER BY id DESC')).rows);
});

importsRouter.get('/:id/errors', async (request, response) => {
  const result = await db.query(
    'SELECT linha AS line, motivo AS reason, dados AS raw FROM erros_importacao WHERE importacao_id=$1 ORDER BY linha',
    [request.params.id],
  );
  response.json(result.rows);
});

async function report(id) {
  const summary = (await db.query(
    'SELECT id, nome_arquivo, recebido_em, total_registros, processados, rejeitados, status, erro_estrutural FROM importacoes WHERE id=$1',
    [id],
  )).rows[0];
  if (!summary) return null;
  const errors = (await db.query(
    'SELECT linha AS line, motivo AS reason FROM erros_importacao WHERE importacao_id=$1 ORDER BY linha',
    [id],
  )).rows;
  return { ...summary, errors };
}

importsRouter.get('/:id/report', async (request, response) => {
  const result = await report(request.params.id);
  return result ? response.json(result) : response.status(404).json({ message: 'Importação não encontrada.' });
});

importsRouter.get('/:id/report.txt', async (request, response) => {
  const result = await report(request.params.id);
  if (!result) return response.status(404).send('Importação não encontrada.');
  const lines = [
    'PROCESSAMENTO DO CSV',
    `Arquivo: ${result.nome_arquivo ?? 'Não informado'}`,
    `Remessa: #${result.id}`,
    `Data/hora: ${new Date(result.recebido_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    `Total: ${result.total_registros}`,
    `Processados: ${result.processados}`,
    `Rejeitados: ${result.rejeitados}`,
    'ERROS ENCONTRADOS',
    ...result.errors.map((error) => `Linha ${error.line}: ${error.reason}`),
  ];
  response.attachment(`relatorio-importacao-${result.id}.txt`).type('text/plain; charset=utf-8').send(lines.join('\n'));
});

importsRouter.get('/:id/rejections', (request, response) => {
  if (!/^\d+$/.test(request.params.id)) return response.status(400).json({ message: 'ID inválido.' });
  const file = join(process.cwd(), 'data', 'rejections', `rejeitados-importacao-${request.params.id}.csv`);
  if (!existsSync(file)) return response.status(404).json({ message: 'Não há arquivo de rejeitados.' });
  return response.download(file);
});
