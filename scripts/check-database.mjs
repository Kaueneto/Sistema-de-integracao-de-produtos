import { db } from '../src/db/database.js';

try {
  const connection = (await db.query(
    'SELECT current_database() AS banco, current_user AS usuario, inet_server_port() AS porta',
  )).rows[0];
  const required = ['produtos', 'categorias', 'marcas', 'fornecedores', 'unidades_medida',
    'clientes_integrados', 'integracoes', 'erros_integracao', 'importacoes', 'vendas',
    'erros_importacao'];
  const missing = [];
  for (const name of required) {
    const exists = (await db.query('SELECT to_regclass($1) AS objeto', [`public.${name}`])).rows[0].objeto;
    if (!exists) missing.push(name);
  }
  if (!(await db.query("SELECT to_regclass('public.vw_integracao_produtos') AS objeto")).rows[0].objeto) {
    missing.push('public.vw_integracao_produtos');
  }
  console.log('Conexão:', connection);
  if (missing.length) {
    console.error('Objetos ausentes:', missing.join(', '));
    process.exitCode = 1;
  } else {
    const counts = (await db.query(`SELECT
      (SELECT COUNT(*)::int FROM produtos) AS produtos,
      (SELECT COUNT(*)::int FROM clientes_integrados) AS clientes_integrados,
      (SELECT COUNT(*)::int FROM integracoes) AS integracoes,
      (SELECT COUNT(*)::int FROM importacoes) AS importacoes_csv,
      (SELECT COUNT(*)::int FROM vendas) AS vendas_csv`)).rows[0];
    console.log('Registros:', counts);
    console.log('Esquema completo: 11 tabelas e 1 view.');
  }
} catch (error) {
  console.error('Falha ao verificar o PostgreSQL:', error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
