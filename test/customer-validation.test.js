import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCustomer } from '../src/services/customer-validation.service.js';
import { sourceViewName } from '../src/db/source-database.js';

const contractCustomer = {
  codigo_cliente: 101,
  nome_cliente: ' Ana ',
  email_cliente: ' ana@exemplo.com ',
  documento: '123.456.789-00',
  telefone: null,
  categoria: 'PRATA',
  status_financeiro: 'ADIMPLENTE',
  limite_credito: '3000.00',
  cidade: ' Recife ',
  uf: 'PE',
  ativo: true,
  data_cadastro: '2026-10-20T10:00:00',
  data_atualizacao: '2026-10-21T10:00:00',
};

test('cliente válido preserva ID de origem e transforma textos', () => {
  const result = validateCustomer(contractCustomer);
  assert.deepEqual(result.errors, []);
  assert.equal(result.record.id_cliente_origem, 101);
  assert.equal(result.record.nome, 'Ana');
  assert.equal(result.record.email, 'ana@exemplo.com');
  assert.equal(result.record.cidade, 'Recife');
});

test('registro inválido retorna motivos sem dados para gravação', () => {
  const result = validateCustomer({ ...contractCustomer,
    codigo_cliente: -1, nome_cliente: ' ', email_cliente: 'invalido', ativo: 'sim',
    documento: 'invalido', categoria: 'OUTRA', data_atualizacao: null });
  assert.equal(result.record, null);
  assert.match(result.errors.join(' '), /codigo_cliente/);
  assert.match(result.errors.join(' '), /nome_cliente/);
  assert.match(result.errors.join(' '), /email_cliente/);
  assert.match(result.errors.join(' '), /ativo/);
  assert.match(result.errors.join(' '), /data_atualizacao/);
});

test('nome da view remota rejeita SQL arbitrário', () => {
  const previous = process.env.GRUPO1_VIEW;
  try {
    process.env.GRUPO1_VIEW = 'public.clientes; DROP TABLE produtos';
    assert.throws(sourceViewName, /nome de tabela\/view válido/);
  } finally {
    if (previous === undefined) delete process.env.GRUPO1_VIEW;
    else process.env.GRUPO1_VIEW = previous;
  }
});
