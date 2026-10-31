import { db, withTransaction } from '../db/database.js';
import { getSourcePool, sourceViewName } from '../db/source-database.js';
import { originIdField, requiredSourceFields, validateCustomer } from './customer-validation.service.js';

function sameCustomer(a, b) {
  return a.nome === b.nome && a.email === b.email && a.cidade === b.cidade &&
    a.ativo === b.ativo &&
    (a.atualizado_em_origem?.getTime() ?? null) === (b.atualizado_em_origem?.getTime() ?? null);
}

function errorData(row) {
  // O relatório identifica a linha sem copiar CPF ou dados financeiros.
  return JSON.stringify({ codigo_cliente: row[originIdField()] ?? null });
}

async function failedRun(message) {
  const result = await db.query(
    `INSERT INTO integracoes (origem, destino, fim, status, erro_estrutural)
     VALUES ('Grupo 1', 'Grupo 3', now(), 'FALHOU', $1) RETURNING id`,
    [message],
  );
  return result.rows[0].id;
}

export async function integrateCustomers() {
  let rows;
  try {
    const result = await getSourcePool().query(`SELECT * FROM ${sourceViewName()}`);
    rows = result.rows;
    const available = new Set(result.fields.map((field) => field.name));
    const missing = requiredSourceFields().filter((field) => !available.has(field));
    if (missing.length) throw new Error(`Estrutura do Grupo 1 incompatível. Campos ausentes: ${missing.join(', ')}.`);
  } catch (error) {
    const id = await failedRun(error.message);
    return { id, status: 'FALHOU', erro_estrutural: error.message, total_consultado: 0,
      processados: 0, inseridos: 0, atualizados: 0, inalterados: 0, rejeitados: 0,
      desativados: 0 };
  }

  try {
    const id = await withTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(3, 1)');
      const runId = (await client.query(
        `INSERT INTO integracoes (origem, destino, total_consultado, status)
         VALUES ('Grupo 1', 'Grupo 3', $1, 'EM_ANDAMENTO') RETURNING id`, [rows.length],
      )).rows[0].id;
      const counts = { inseridos: 0, atualizados: 0, inalterados: 0, rejeitados: 0, desativados: 0 };
      const seen = new Set();
      for (const row of rows) {
        const { errors, record } = validateCustomer(row);
        const originId = String(row[originIdField()] ?? '');
        if (record && seen.has(record.id_cliente_origem)) errors.push('Identificador duplicado na origem.');
        if (record) seen.add(record.id_cliente_origem);
        if (errors.length) {
          counts.rejeitados += 1;
          const campo = ['codigo_cliente', 'nome_cliente', 'email_cliente', 'documento', 'telefone',
            'categoria', 'status_financeiro', 'limite_credito', 'cidade', 'uf', 'ativo',
            'data_cadastro', 'data_atualizacao']
            .find((field) => errors[0].startsWith(field)) ?? null;
          const tipo = errors.some((message) => message.includes('duplicado')) ? 'DUPLICADO' : 'VALIDACAO';
          await client.query(
            `INSERT INTO erros_integracao (integracao_id, registro_origem, campo, tipo_erro, descricao, dados)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [runId, originId, campo, tipo, errors.join(' '), errorData(row)],
          );
          continue;
        }
        await client.query('SAVEPOINT cliente_atual');
        try {
          const current = (await client.query(
            `SELECT nome, email, cidade, ativo, atualizado_em_origem
             FROM clientes_integrados WHERE id_cliente_origem=$1`, [record.id_cliente_origem],
          )).rows[0];
          if (!current) {
            await client.query(
              `INSERT INTO clientes_integrados
                (id_cliente_origem, nome, email, cidade, ativo, atualizado_em_origem)
               VALUES ($1,$2,$3,$4,$5,$6)`,
              [record.id_cliente_origem, record.nome, record.email, record.cidade,
                record.ativo, record.atualizado_em_origem],
            );
            counts.inseridos += 1;
          } else if (sameCustomer(current, record)) {
            counts.inalterados += 1;
          } else {
            await client.query(
              `UPDATE clientes_integrados SET nome=$2, email=$3, cidade=$4, ativo=$5,
               atualizado_em_origem=$6, integrado_em=now() WHERE id_cliente_origem=$1`,
              [record.id_cliente_origem, record.nome, record.email, record.cidade,
                record.ativo, record.atualizado_em_origem],
            );
            counts.atualizados += 1;
          }
          await client.query('RELEASE SAVEPOINT cliente_atual');
        } catch (error) {
          await client.query('ROLLBACK TO SAVEPOINT cliente_atual');
          await client.query('RELEASE SAVEPOINT cliente_atual');
          counts.rejeitados += 1;
          await client.query(
            `INSERT INTO erros_integracao (integracao_id, registro_origem, tipo_erro, descricao, dados)
             VALUES ($1,$2,$3,$4,$5)`,
            [runId, originId, 'GRAVACAO', error.message, errorData(row)],
          );
        }
      }
      // A view publica apenas ativos: ausentes no snapshot completo ficaram inativos.
      // Não reconciliamos um snapshot com rejeições, para evitar desativação indevida.
      if (counts.rejeitados === 0) {
        const result = await client.query(
          'UPDATE clientes_integrados SET ativo = FALSE, integrado_em = now() WHERE ativo = TRUE AND id_cliente_origem <> ALL($1::bigint[])',
          [[...seen]],
        );
        counts.desativados = result.rowCount;
      }
      const status = counts.rejeitados ? 'CONCLUIDA_COM_ERROS' : 'CONCLUIDA';
      await client.query(
        `UPDATE integracoes SET fim=now(), processados=$2, inseridos=$3, atualizados=$4,
         inalterados=$5, rejeitados=$6, status=$7, desativados=$8 WHERE id=$1`,
        [runId, counts.inseridos + counts.atualizados + counts.inalterados,
          counts.inseridos, counts.atualizados, counts.inalterados, counts.rejeitados, status,
          counts.desativados],
      );
      return runId;
    });
    return getIntegration(id);
  } catch (error) {
    const id = await failedRun(error.message);
    return getIntegration(id);
  }
}

export async function getIntegration(id) {
  const run = (await db.query('SELECT * FROM integracoes WHERE id=$1', [id])).rows[0];
  if (!run) return null;
  const errors = (await db.query(
    `SELECT registro_origem, campo, tipo_erro, descricao, dados, ocorrido_em
     FROM erros_integracao WHERE integracao_id=$1 ORDER BY id`, [id],
  )).rows;
  return { ...run, errors };
}
