import assert from 'node:assert/strict';
import { db } from '../src/db/database.js';

const client = await db.connect();
try {
  await client.query('BEGIN');
  await client.query("INSERT INTO categorias (nome) VALUES ('Teste de integração') ON CONFLICT DO NOTHING");
  await client.query("INSERT INTO unidades_medida (sigla) VALUES ('L') ON CONFLICT DO NOTHING");
  await client.query(`INSERT INTO produtos
    (id_produto, nome, categoria, preco, unidade_medida)
    VALUES (2147483640, 'Produto de teste', 'Teste de integração', 19.90, 'L')`);

  const view = () => client.query(`SELECT *, atualizado_em::text AS atualizado_em_text
    FROM public.vw_integracao_produtos
    WHERE id_produto = 2147483640`);
  const before = (await view()).rows[0];
  assert.equal(before.nome, 'Produto de teste');
  assert.equal(before.preco, '19.90');
  assert.equal(before.unidade_medida, 'L');
  assert.equal(before.ativo, true);

  await client.query("UPDATE produtos SET nome = 'Produto alterado' WHERE id_produto = 2147483640");
  const edited = (await view()).rows[0];
  assert.equal(edited.nome, 'Produto alterado');
  assert.ok(edited.atualizado_em_text > before.atualizado_em_text);

  await client.query('UPDATE produtos SET ativo = FALSE WHERE id_produto = 2147483640');
  const disabled = (await view()).rows[0];
  assert.equal(disabled.ativo, false);
  assert.ok(disabled.atualizado_em_text > edited.atualizado_em_text);
  console.log('Cadastro, edição, desativação e data de atualização validados na view.');
} catch (error) {
  console.error('Teste funcional do contrato falhou:', error.message);
  process.exitCode = 1;
} finally {
  await client.query('ROLLBACK');
  client.release();
  await db.end();
}
