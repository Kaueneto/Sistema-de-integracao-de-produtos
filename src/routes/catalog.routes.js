import { Router } from 'express';
import { createCatalogEntry, deleteCatalogEntry, listCatalog, updateCatalogEntry } from '../services/catalog.service.js';

export const catalogRouter = Router();

catalogRouter.get('/:kind', async (request, response) => {
  response.json(await listCatalog(request.params.kind));
});

catalogRouter.post('/:kind', async (request, response) => {
  response.status(201).json(await createCatalogEntry(request.params.kind, request.body));
});

catalogRouter.put('/:kind/:key', async (request, response) => {
  const entry = await updateCatalogEntry(request.params.kind, request.params.key, request.body);
  return entry ? response.json(entry) : response.status(404).json({ message: 'Registro não encontrado.' });
});

catalogRouter.delete('/:kind/:key', async (request, response) => {
  const entry = await deleteCatalogEntry(request.params.kind, request.params.key);
  return entry ? response.json(entry) : response.status(404).json({ message: 'Registro não encontrado.' });
});
