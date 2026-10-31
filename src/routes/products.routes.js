import { Router } from 'express';
import { createProduct, deactivateProduct, getProduct, listProducts, updateProduct } from '../services/product.service.js';

export const productsRouter = Router();

function validId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[";\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

productsRouter.get('/', async (_request, response) => {
  response.json(await listProducts());
});

productsRouter.get('/export/csv', async (_request, response) => {
  const products = await listProducts();
  const lines = [
    'id_produto;nome;descricao;categoria;preco;unidade_medida;ativo',
    ...products.map((product) => [
      product.id_produto, product.nome, product.descricao, product.categoria,
      Number(product.preco).toFixed(2), product.unidade_medida, product.ativo ? 'S' : 'N',
    ].map(csvEscape).join(';')),
  ];
  response.attachment('produtos.csv').type('text/csv; charset=utf-8').send(lines.join('\n'));
});

productsRouter.get('/:id', async (request, response) => {
  const id = validId(request.params.id);
  if (!id) return response.status(400).json({ message: 'ID de produto inválido.' });
  const product = await getProduct(id);
  return product ? response.json(product) : response.status(404).json({ message: 'Produto não encontrado.' });
});

productsRouter.post('/', async (request, response) => {
  const product = await createProduct(request.body);
  response.status(201).json(product);
});

productsRouter.put('/:id', async (request, response) => {
  const id = validId(request.params.id);
  if (!id) return response.status(400).json({ message: 'ID de produto inválido.' });
  const product = await updateProduct(id, request.body);
  return product ? response.json(product) : response.status(404).json({ message: 'Produto não encontrado.' });
});

productsRouter.delete('/:id', async (request, response) => {
  const id = validId(request.params.id);
  if (!id) return response.status(400).json({ message: 'ID de produto inválido.' });
  const product = await deactivateProduct(id);
  return product ? response.json(product) : response.status(404).json({ message: 'Produto não encontrado.' });
});
