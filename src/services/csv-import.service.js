import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { TextDecoder } from "node:util";
import { parse } from "csv-parse/sync";
import { db } from "../db/database.js";
import { VENDAS_CONTRACT } from "../config/vendas-contract.js";
import { validateVenda } from "./venda-validation.service.js";

const findImportByHash = db.prepare(
  "SELECT id, recebido_em, status FROM importacoes WHERE hash_arquivo = ?",
);
const insertImport = db.prepare(
  "INSERT INTO importacoes (nome_arquivo, status, hash_arquivo) VALUES (?, ?, ?)",
);
const insertSale = db.prepare(
  `INSERT INTO vendas (importacao_id, id_venda, id_cliente, id_produto, quantidade, valor_unitario, valor_total, data_venda, forma_pagamento, status, integrante, email) VALUES (@importacao_id, @id_venda, @id_cliente, @id_produto, @quantidade, @valor_unitario, @valor_total, @data_venda, @forma_pagamento, @status, @integrante, @email)`,
);
const insertError = db.prepare(
  "INSERT INTO erros_importacao (importacao_id, linha, motivo, dados) VALUES (?, ?, ?, ?)",
);
const completeImport = db.prepare(
  "UPDATE importacoes SET total_registros = ?, processados = ?, rejeitados = ?, status = ? WHERE id = ?",
);

const pendingImports = new Map();

function createPreview(payload) {
  const token = crypto.randomUUID();
  pendingImports.set(token, payload);
  setTimeout(() => pendingImports.delete(token), 30 * 60 * 1000).unref();
  return { token, ...payload };
}

function structuralFailure(message) {
  return createPreview({
    status: "REJEITADA_ESTRUTURA",
    structuralError: message,
    total: 0,
    processed: 0,
    rejected: 0,
    errors: [],
    validRecords: [],
  });
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[";\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeRejections(importId, errors) {
  const directory = join(process.cwd(), "data", "rejections");
  mkdirSync(directory, { recursive: true });
  const content = [
    "linha;motivo;dados",
    ...errors.map((error) =>
      [error.line, error.reason, error.raw].map(csvEscape).join(";"),
    ),
  ].join("\n");
  writeFileSync(
    join(directory, `rejeitados-importacao-${importId}.csv`),
    content,
    "utf8",
  );
}

export function previewVendasCsv(file) {
  const hash = createHash("sha256").update(file.buffer).digest("hex");
  const previousImport = findImportByHash.get(hash);
  if (previousImport) {
    return createPreview({
      status: "REPROCESSAMENTO",
      total: 0,
      processed: 0,
      rejected: 0,
      errors: [],
      validRecords: [],
      previousImport: {
        id: previousImport.id,
        receivedAt: previousImport.recebido_em,
      },
    });
  }
  let content;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(file.buffer);
  } catch {
    return structuralFailure("Arquivo não está codificado em UTF-8 válido.");
  }
  if (content.includes("\r"))
    return structuralFailure(
      "Quebra de linha inválida: o contrato exige LF (\\n), sem CRLF.",
    );

  let parsed;
  try {
    parsed = parse(content, {
      bom: true,
      delimiter: ";",
      quote: '"',
      relax_column_count: true,
      skip_empty_lines: true,
      raw: true,
      info: true,
    });
  } catch (error) {
    return structuralFailure(`CSV estruturalmente inválido: ${error.message}`);
  }
  if (!parsed.length)
    return structuralFailure(
      "O arquivo CSV não possui cabeçalho nem registros.",
    );

  const header = parsed[0].record;
  if (
    header.length !== VENDAS_CONTRACT.headers.length ||
    header.some((value, index) => value !== VENDAS_CONTRACT.headers[index])
  ) {
    return structuralFailure(
      `Cabeçalho inválido. Esperado: ${VENDAS_CONTRACT.headers.join(";")}`,
    );
  }
  const errors = [];
  const validRecords = [];
  const context = { saleIds: new Set() };
  for (const item of parsed.slice(1)) {
    const line = item.info.lines;
    const raw = item.raw.trimEnd();
    if (item.record.length !== VENDAS_CONTRACT.headers.length) {
      const reason = `Quantidade de campos inválida: esperado ${VENDAS_CONTRACT.headers.length}, recebido ${item.record.length}.`;
      errors.push({ line, reason, raw });
      continue;
    }
    const validation = validateVenda(item.record, context);
    if (validation.errors.length) {
      const reason = validation.errors.join(" ");
      errors.push({ line, reason, raw });
      continue;
    }
    validRecords.push(validation.record);
  }
  return createPreview({
    status: "PRONTA_PARA_SALVAR",
    fileName: file.originalname,
    hash,
    total: parsed.length - 1,
    processed: validRecords.length,
    rejected: errors.length,
    errors,
    validRecords,
  });
}

export function confirmVendasImport(token) {
  const preview = pendingImports.get(token);
  if (!preview)
    throw new Error("A prévia expirou. Selecione o arquivo novamente.");
  if (preview.status === "REJEITADA_ESTRUTURA")
    throw new Error("Arquivos com erro estrutural não podem ser salvos.");

  const errors = [...preview.errors];
  let processed = 0;
  let importId;
  db.transaction(() => {
    importId = insertImport.run(
      preview.fileName,
      "CONCLUIDA",
      preview.hash,
    ).lastInsertRowid;
    for (const record of preview.validRecords) {
      insertSale.run({ importacao_id: importId, ...record });
      processed += 1;
    }
    for (const error of preview.errors)
      insertError.run(importId, error.line, error.reason, error.raw);
    completeImport.run(
      preview.total,
      processed,
      errors.length,
      "CONCLUIDA",
      importId,
    );
  })();
  pendingImports.delete(token);
  writeRejections(importId, errors);
  return {
    id: importId,
    status: "CONCLUIDA",
    total: preview.total,
    processed,
    rejected: errors.length,
    errors,
  };
}
