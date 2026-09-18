import { Router } from "express";
import { db } from "../db/database.js";

export const productsRouter = Router();

const findProductByDescription = db.prepare(
  "SELECT 1 FROM produtos WHERE lower(descricao) = lower(?)",
);
const findNextProductId = db.prepare(
  "SELECT COALESCE(MAX(id_produto), 0) + 1 AS nextId FROM produtos",
);

function parsePrice(value) {
  const text = String(value ?? "").trim();
  if (!text) return { error: "Informe o preço do produto." };

  if (!/^\d+(?:[,.]\d{1,2})?$/.test(text)) {
    return {
      error:
        "Preço inválido. Use apenas números, com até duas casas decimais, por exemplo: 19,90.",
    };
  }

  const price = Number(text.replace(",", "."));
  if (price <= 0) return { error: "O preço deve ser maior que zero." };
  return { value: price };
}
function escape(value) {
  const text = String(value ?? "");
  return /[";\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

productsRouter.get("/", (_request, response) => {
  response.json(
    db
      .prepare(
        "SELECT id_produto, nome, descricao, categoria, preco, unidade_medida, ativo, criado_em FROM produtos ORDER BY id_produto",
      )
      .all(),
  );
});

productsRouter.get("/proximo-id", (_request, response) => {
  response.json(findNextProductId.get());
});

productsRouter.post("/", (request, response, next) => {
  try {
    const {
      nome,
      descricao = "",
      categoria,
      preco,
      unidade_medida,
      ativo = true,
    } = request.body;
    const requiredFields = [
      ["nome", nome],
      ["categoria", categoria],
      ["unidade de medida", unidade_medida],
    ]
      .filter(([, value]) => !String(value ?? "").trim())
      .map(([label]) => label);
    if (requiredFields.length)
      return response
        .status(400)
        .json({
          message: `Preencha os campos obrigatórios: ${requiredFields.join(", ")}.`,
        });
    if (descricao.trim() && findProductByDescription.get(descricao.trim()))
      return response
        .status(409)
        .json({
          message:
            "Já existe um produto cadastrado com esta descrição. Informe uma descrição diferente.",
        });
    const parsedPrice = parsePrice(preco);
    if (parsedPrice.error)
      return response
        .status(400)
        .json({ message: parsedPrice.error });
    const id = findNextProductId.get().nextId;
    if (!Number.isSafeInteger(id) || id <= 0)
      return response.status(500).json({
        message:
          "Não foi possível gerar um ID válido para o produto. Tente novamente.",
      });
    const result = db
      .prepare(
        "INSERT INTO produtos (id_produto, nome, descricao, categoria, preco, unidade_medida, ativo) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        id,
        nome.trim(),
        descricao.trim(),
        categoria.trim(),
        parsedPrice.value,
        unidade_medida.trim(),
        ativo ? 1 : 0,
      );
    return response
      .status(201)
      .json(
        db
          .prepare(
            "SELECT id_produto, nome, descricao, categoria, preco, unidade_medida, ativo FROM produtos WHERE id_produto = ?",
          )
          .get(result.lastInsertRowid),
      );
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_PRIMARYKEY")
      return response
        .status(409)
        .json({
          message:
            "Não foi possível gerar o ID do produto. Atualize a página e tente novamente.",
        });
    return next(error);
  }
});

productsRouter.get("/export/csv", (_request, response) => {
  const products = db
    .prepare(
      "SELECT id_produto, nome, descricao, categoria, preco, unidade_medida, ativo FROM produtos ORDER BY id_produto",
    )
    .all();
  const header =
    "id_produto;nome;descricao;categoria;preco;unidade_medida;ativo";
  const rows = products.map((product) =>
    [
      product.id_produto,
      product.nome,
      product.descricao,
      product.categoria,
      Number(product.preco).toFixed(2),
      product.unidade_medida,
      product.ativo ? "S" : "N",
    ]
      .map(escape)
      .join(";"),
  );
  response
    .attachment("produtos.csv")
    .type("text/csv; charset=utf-8")
    .send([header, ...rows].join("\n"));
});
