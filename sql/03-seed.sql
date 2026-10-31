-- Catálogo inicial para demonstração. Produtos e marcas correspondem a itens comerciais;
-- os preços são ilustrativos e os contatos dos fornecedores ficam em branco.
-- Execute no grupo3_db. O script pode ser executado novamente sem duplicar registros.
BEGIN;

INSERT INTO categorias (nome) VALUES
  ('Papelaria'), ('Material escolar'), ('Escritório'), ('Organização'), ('Bebidas'),
  ('Mercearia'), ('Higiene pessoal'), ('Limpeza doméstica'), ('Cuidados com a pele'), ('Lavanderia')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO marcas (nome) VALUES
  ('BIC'), ('Tilibra'), ('Faber-Castell'), ('Scotch'), ('Coca-Cola'),
  ('MOÇA'), ('Dove'), ('Bombril'), ('NIVEA'), ('Ypê')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO fornecedores (nome) VALUES
  ('BIC Brasil'), ('Tilibra'), ('Faber-Castell Brasil'), ('3M do Brasil'),
  ('Coca-Cola Brasil'), ('Nestlé Brasil'), ('Unilever Brasil'), ('Bombril'),
  ('Beiersdorf Brasil'), ('Química Amparo')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO unidades_medida (sigla, descricao) VALUES
  ('UN', 'Unidade'), ('PCT', 'Pacote'), ('CX', 'Caixa'), ('KG', 'Quilograma'),
  ('G', 'Grama'), ('L', 'Litro'), ('ML', 'Mililitro'), ('M', 'Metro'),
  ('PAR', 'Par'), ('FD', 'Fardo')
ON CONFLICT (sigla) DO NOTHING;

INSERT INTO produtos
  (id_produto, nome, descricao, categoria, marca, fornecedor, preco, unidade_medida, ativo)
VALUES
  (301, 'Caneta esferográfica BIC Cristal azul 1,0 mm', 'Caneta esferográfica de tinta azul, ponta média.',
   'Papelaria', 'BIC', 'BIC Brasil', 2.50, 'UN', TRUE),
  (302, 'Caderno Tilibra Mais Feminino 10 matérias 200 folhas', 'Caderno universitário espiral de capa dura.',
   'Material escolar', 'Tilibra', 'Tilibra', 39.90, 'UN', TRUE),
  (303, 'Ecolápis Grafite Faber-Castell Castell 9000 2B', 'Lápis grafite de graduação 2B.',
   'Escritório', 'Faber-Castell', 'Faber-Castell Brasil', 5.90, 'UN', TRUE),
  (304, 'Fita adesiva Scotch transparente 12 mm x 20 m', 'Rolo de fita adesiva transparente.',
   'Organização', 'Scotch', '3M do Brasil', 8.90, 'UN', TRUE),
  (305, 'Coca-Cola Sabor Original 2 L', 'Refrigerante em garrafa de 2 litros.',
   'Bebidas', 'Coca-Cola', 'Coca-Cola Brasil', 12.90, 'UN', TRUE),
  (306, 'Leite condensado MOÇA integral lata 395 g', 'Leite condensado integral em lata.',
   'Mercearia', 'MOÇA', 'Nestlé Brasil', 9.90, 'UN', TRUE),
  (307, 'Sabonete em barra Dove Original 90 g', 'Sabonete em barra para higiene pessoal.',
   'Higiene pessoal', 'Dove', 'Unilever Brasil', 6.90, 'UN', TRUE),
  (308, 'Esponja de aço Bom Bril 6 unidades', 'Pacote com seis esponjas de aço.',
   'Limpeza doméstica', 'Bombril', 'Bombril', 3.90, 'PCT', TRUE),
  (309, 'Creme hidratante NIVEA Soft 48 g', 'Creme hidratante para rosto, mãos e corpo.',
   'Cuidados com a pele', 'NIVEA', 'Beiersdorf Brasil', 28.50, 'UN', TRUE),
  (310, 'Amaciante Ypê Tradicional Aconchego 2 L', 'Amaciante de roupas em embalagem de 2 litros.',
   'Lavanderia', 'Ypê', 'Química Amparo', 14.90, 'UN', TRUE)
ON CONFLICT (id_produto) DO NOTHING;

SELECT setval(pg_get_serial_sequence('produtos', 'id_produto'),
  GREATEST((SELECT COALESCE(MAX(id_produto), 0) FROM produtos), 1),
  (SELECT COUNT(*) > 0 FROM produtos));
COMMIT;
