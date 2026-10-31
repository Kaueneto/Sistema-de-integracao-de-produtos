-- Execute no banco grupo1_demo_db. Simula somente a estrutura contratada pelo Grupo 1.
CREATE SCHEMA IF NOT EXISTS integracao;

CREATE TABLE IF NOT EXISTS clientes_contrato_demo (
  codigo_cliente INTEGER PRIMARY KEY,
  nome_cliente VARCHAR(120) NOT NULL,
  email_cliente VARCHAR(120) NOT NULL,
  documento VARCHAR(14) NOT NULL,
  telefone VARCHAR(20),
  categoria VARCHAR(30) NOT NULL,
  status_financeiro VARCHAR(20) NOT NULL,
  limite_credito NUMERIC(12,2) NOT NULL,
  cidade VARCHAR(60),
  uf CHAR(2),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  data_cadastro TIMESTAMP NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMP NOT NULL DEFAULT now()
);

INSERT INTO clientes_contrato_demo
  (codigo_cliente, nome_cliente, email_cliente, documento, telefone, categoria,
   status_financeiro, limite_credito, cidade, uf)
VALUES
  (101, 'Ana Souza', 'ana.souza@exemplo.com', '000.000.000-00', '(81) 99999-0101', 'PRATA', 'ADIMPLENTE', 3000, 'Recife', 'PE'),
  (102, 'Bruno Lima', 'bruno.lima@exemplo.com', '111.111.111-11', NULL, 'BRONZE', 'DESCONHECIDO', 0, 'Olinda', 'PE'),
  (103, 'Carla Alves', 'email-invalido', '222.222.222-22', NULL, 'OURO', 'ADIMPLENTE', 5000, 'Natal', 'RN')
ON CONFLICT (codigo_cliente) DO NOTHING;

CREATE OR REPLACE VIEW integracao.vw_integracao_clientes AS
SELECT codigo_cliente, nome_cliente, email_cliente, documento, telefone, categoria,
       status_financeiro, limite_credito, cidade, uf, ativo, data_cadastro, data_atualizacao
FROM clientes_contrato_demo
WHERE ativo = TRUE;

-- Após testar a rejeição, corrija o cliente 103 no banco demo:
-- UPDATE clientes_contrato_demo SET email_cliente = 'carla.alves@exemplo.com', data_atualizacao = now() WHERE codigo_cliente = 103;
-- Após uma integração sem rejeições, simule um cliente que some da view:
-- UPDATE clientes_contrato_demo SET ativo = FALSE, data_atualizacao = now() WHERE codigo_cliente = 102;
