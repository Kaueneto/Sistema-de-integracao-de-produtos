import assert from 'node:assert/strict';
import { db } from '../src/db/database.js';

const expected = [
  ['id_produto', 'integer', null, 32, 0],
  ['nome', 'character varying', 120, null, null],
  ['descricao', 'character varying', 500, null, null],
  ['categoria', 'character varying', 100, null, null],
  ['preco', 'numeric', null, 12, 2],
  ['unidade_medida', 'character varying', 20, null, null],
  ['ativo', 'boolean', null, null, null],
  ['atualizado_em', 'timestamp with time zone', null, null, null],
];

try {
  const { rows } = await db.query(`
    SELECT column_name, data_type, character_maximum_length,
           numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vw_integracao_produtos'
    ORDER BY ordinal_position`);
  assert.deepEqual(rows.map((row) => [
    row.column_name, row.data_type, row.character_maximum_length,
    row.numeric_precision, row.numeric_scale,
  ]), expected);

  const permissions = (await db.query(`
    SELECT has_schema_privilege('usuario_integracao_g5', 'public', 'USAGE') AS schema_read,
           has_table_privilege('usuario_integracao_g5', 'public.vw_integracao_produtos', 'SELECT') AS view_read,
           has_table_privilege('usuario_integracao_g5', 'public.produtos', 'SELECT') AS table_read,
           has_table_privilege('usuario_integracao_g5', 'public.vw_integracao_produtos', 'INSERT') AS view_write`)).rows[0];
  assert.deepEqual(permissions, {
    schema_read: true, view_read: true, table_read: false, view_write: false,
  });

  console.log('Contrato enviado pelo Grupo 3: oito colunas e tipos corretos.');
  console.log('Permissões: SELECT na view; sem SELECT na tabela e sem INSERT na view.');
  console.log('Produtos disponíveis na view:', (await db.query(
    'SELECT COUNT(*)::int AS total FROM public.vw_integracao_produtos',
  )).rows[0].total);
} catch (error) {
  console.error('Contrato do Grupo 5 não validado:', error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
