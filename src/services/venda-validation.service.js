import { VENDAS_CONTRACT } from "../config/vendas-contract.js";

const INTEGER_PATTERN = /^\d+$/;
const DECIMAL_PATTERN = /^\d+\.\d{2}$/;

function isCalendarDate(value) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const [day, month, year] = value.split("/").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function required(value, label, errors) {
  if (!value?.trim()) errors.push(`Campo obrigatório "${label}" vazio.`);
}

export function validateVenda(values, context) {
  const errors = [];
  const record = Object.fromEntries(
    VENDAS_CONTRACT.headers.map((header, index) => [
      header,
      values[index] ?? "",
    ]),
  );
  const fieldsWithExternalSpaces = new Set(
    VENDAS_CONTRACT.headers.filter(
      (header) =>
        header !== "email" && record[header] !== record[header].trim(),
    ),
  );

  for (const header of VENDAS_CONTRACT.headers.filter(
    (header) => header !== "email",
  ))
    required(record[header], header, errors);
  for (const header of fieldsWithExternalSpaces)
    errors.push(`Campo "${header}" contém espaços no início ou no fim.`);
  if (errors.length) return { errors, record: null };

  for (const field of ["id_venda", "id_cliente", "id_produto", "quantidade"]) {
    if (
      !fieldsWithExternalSpaces.has(field) &&
      !INTEGER_PATTERN.test(record[field])
    )
      errors.push(`Campo "${field}" deve ser um inteiro positivo.`);
  }

  if (
    !fieldsWithExternalSpaces.has("id_venda") &&
    INTEGER_PATTERN.test(record.id_venda)
  ) {
    const idVenda = Number(record.id_venda);
    if (idVenda <= 0) errors.push("id_venda deve ser maior que zero.");
    if (context.saleIds.has(idVenda))
      errors.push("id_venda duplicado dentro da mesma remessa.");
    context.saleIds.add(idVenda);
  }
  if (
    !fieldsWithExternalSpaces.has("id_cliente") &&
    INTEGER_PATTERN.test(record.id_cliente) &&
    !(Number(record.id_cliente) >= 101 && Number(record.id_cliente) <= 140)
  )
    errors.push("id_cliente deve estar entre 101 e 140.");
  if (
    !fieldsWithExternalSpaces.has("id_produto") &&
    INTEGER_PATTERN.test(record.id_produto) &&
    !(Number(record.id_produto) >= 301 && Number(record.id_produto) <= 315)
  )
    errors.push("id_produto deve estar entre 301 e 315.");
  if (
    !fieldsWithExternalSpaces.has("quantidade") &&
    INTEGER_PATTERN.test(record.quantidade) &&
    Number(record.quantidade) <= 0
  )
    errors.push("quantidade deve ser maior que zero.");

  for (const field of ["valor_unitario", "valor_total"]) {
    if (
      !fieldsWithExternalSpaces.has(field) &&
      !DECIMAL_PATTERN.test(record[field])
    )
      errors.push(
        `Campo "${field}" deve usar ponto decimal e duas casas (ex.: 149.90).`,
      );
    else if (Number(record[field]) <= 0)
      errors.push(`Campo "${field}" deve ser maior que zero.`);
  }
  if (
    !fieldsWithExternalSpaces.has("valor_unitario") &&
    !fieldsWithExternalSpaces.has("valor_total") &&
    !fieldsWithExternalSpaces.has("quantidade") &&
    DECIMAL_PATTERN.test(record.valor_unitario) &&
    DECIMAL_PATTERN.test(record.valor_total) &&
    INTEGER_PATTERN.test(record.quantidade)
  ) {
    const expected = Number(record.quantidade) * Number(record.valor_unitario);
    if (Math.abs(expected - Number(record.valor_total)) > 0.00001)
      errors.push("valor_total deve ser igual a quantidade × valor_unitario.");
  }

  if (
    !fieldsWithExternalSpaces.has("data_venda") &&
    !isCalendarDate(record.data_venda)
  )
    errors.push("data_venda deve ser uma data válida no formato DD/MM/YYYY.");
  if (
    !fieldsWithExternalSpaces.has("forma_pagamento") &&
    !VENDAS_CONTRACT.paymentMethods.has(record.forma_pagamento)
  )
    errors.push("forma_pagamento deve ser PIX, CARTAO ou BOLETO.");
  if (
    !fieldsWithExternalSpaces.has("status") &&
    !VENDAS_CONTRACT.statuses.has(record.status)
  )
    errors.push("status deve ser CONCLUIDA ou CANCELADA.");
  if (record.integrante.length > 100)
    errors.push("integrante deve possuir no máximo 100 caracteres.");

  if (errors.length) return { errors, record: null };
  return {
    errors: [],
    record: {
      ...record,
      id_venda: Number(record.id_venda),
      id_cliente: Number(record.id_cliente),
      id_produto: Number(record.id_produto),
      quantidade: Number(record.quantidade),
      valor_unitario: Number(record.valor_unitario),
      valor_total: Number(record.valor_total),
    },
  };
}
