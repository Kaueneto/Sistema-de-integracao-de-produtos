import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
let sourcePool;

export function getSourcePool() {
  if (!process.env.GRUPO1_PGHOST || !process.env.GRUPO1_PGDATABASE || !process.env.GRUPO1_PGUSER) {
    throw new Error('Configure GRUPO1_PGHOST, GRUPO1_PGDATABASE e GRUPO1_PGUSER antes de integrar clientes.');
  }
  sourcePool ??= new Pool({
    host: process.env.GRUPO1_PGHOST,
    port: Number(process.env.GRUPO1_PGPORT || 5432),
    database: process.env.GRUPO1_PGDATABASE,
    user: process.env.GRUPO1_PGUSER,
    password: process.env.GRUPO1_PGPASSWORD,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
  return sourcePool;
}

// Identificadores SQL não aceitam parâmetros $1; a whitelist evita SQL arbitrário.
export function sourceViewName() {
  const name = process.env.GRUPO1_VIEW || 'integracao.vw_integracao_clientes';
  if (!/^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)?$/i.test(name)) {
    throw new Error('GRUPO1_VIEW deve ser um nome de tabela/view válido.');
  }
  return name.split('.').map((part) => `"${part}"`).join('.');
}
