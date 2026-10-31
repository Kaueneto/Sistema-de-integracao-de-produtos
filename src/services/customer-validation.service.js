import 'dotenv/config';

const fieldNames = {
  id: process.env.GRUPO1_FIELD_ID || 'codigo_cliente',
  name: process.env.GRUPO1_FIELD_NAME || 'nome_cliente',
  email: process.env.GRUPO1_FIELD_EMAIL || 'email_cliente',
  city: process.env.GRUPO1_FIELD_CITY || 'cidade',
  active: process.env.GRUPO1_FIELD_ACTIVE || 'ativo',
  updated: process.env.GRUPO1_FIELD_UPDATED || 'data_atualizacao',
};

export function originIdField() {
  return fieldNames.id;
}

export function requiredSourceFields() {
  return [fieldNames.id, fieldNames.name, fieldNames.email, fieldNames.active,
    fieldNames.updated, 'documento', 'categoria', 'status_financeiro',
    'limite_credito', 'data_cadastro'];
}

export function validateCustomer(row, fields = fieldNames) {
  const errors = [];
  const rawId = row[fields.id];
  const id = Number(rawId);
  const name = String(row[fields.name] ?? '').trim();
  const emailValue = row[fields.email];
  const cityValue = row[fields.city];
  const email = emailValue == null || emailValue === '' ? null : String(emailValue).trim();
  const city = cityValue == null || cityValue === '' ? null : String(cityValue).trim();
  const activeValue = row[fields.active];
  const active = activeValue;
  const updatedValue = row[fields.updated];
  const updated = updatedValue == null ? null : new Date(updatedValue);
  const registered = row.data_cadastro == null ? null : new Date(row.data_cadastro);
  const limit = Number(row.limite_credito);

  if (!Number.isSafeInteger(id) || id <= 0) errors.push('codigo_cliente deve ser um inteiro positivo.');
  if (!name || name.length > 120) errors.push('nome_cliente é obrigatório e deve ter até 120 caracteres.');
  if (!email || email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email_cliente inválido.');
  if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(String(row.documento ?? ''))) errors.push('documento deve ter formato 999.999.999-99.');
  if (row.telefone != null && String(row.telefone).length > 20) errors.push('telefone excede 20 caracteres.');
  if (!['BRONZE', 'PRATA', 'OURO', 'DIAMANTE', 'SEM_CATEGORIA'].includes(row.categoria)) errors.push('categoria do cliente inválida.');
  if (!['ADIMPLENTE', 'INADIMPLENTE', 'EM_ANALISE', 'DESCONHECIDO'].includes(row.status_financeiro)) errors.push('status_financeiro inválido.');
  if (row.limite_credito == null || !Number.isFinite(limit) || limit < 0 || limit > 9999999999.99) errors.push('limite_credito inválido.');
  if (city && city.length > 60) errors.push('cidade excede 60 caracteres.');
  if (row.uf != null && !/^[A-Z]{2}$/.test(String(row.uf))) errors.push('uf deve conter duas letras maiúsculas.');
  if (typeof active !== 'boolean') errors.push('ativo deve ser BOOLEAN.');
  if (!registered || Number.isNaN(registered.getTime())) errors.push('data_cadastro inválida.');
  if (!updated || Number.isNaN(updated.getTime())) errors.push('data_atualizacao inválida.');

  return {
    errors,
    record: errors.length ? null : {
      id_cliente_origem: id, nome: name, email, cidade: city,
      ativo: active, atualizado_em_origem: updated,
    },
  };
}
