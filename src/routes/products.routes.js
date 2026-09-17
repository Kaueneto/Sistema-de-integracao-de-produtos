import { Router } from "express";
import { db } from "../db/database.js";

export const productsRouter = Router();

const findProductById = db.prepare(
  "SELECT 1 FROM produtos WHERE id_produto = ?",
);
const findProductByDescription = db.prepare(
  "SELECT 1 FROM produtos WHERE lower(descricao) = lower(?)",
);
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

productsRouter.post("/", (request, response, next) => {
  try {
    const {
      id_produto,
      nome,
      descricao = "",
      categoria,
      preco,
      unidade_medida,
      ativo = true,
    } = request.body;
    const id = Number(id_produto);
    if (!Number.isInteger(id) || id <= 0)
      return response
        .status(400)
        .json({ message: "id_produto deve ser um inteiro maior que zero." });
    if (!nome?.trim() || !categoria?.trim() || !unidade_medida?.trim())
      return response
        .status(400)
        .json({
          message: "Nome, categoria e unidade de medida são obrigatórios.",
        });
    if (findProductById.get(id))
      return response
        .status(409)
        .json({
          message: `Já existe um produto cadastrado com o ID ${id}. Informe outro ID.`,
        });
    if (descricao.trim() && findProductByDescription.get(descricao.trim()))
      return response
        .status(409)
        .json({
          message:
            "Já existe um produto cadastrado com esta descrição. Informe uma descrição diferente.",
        });
    const price = Number(preco);
    if (!Number.isFinite(price) || price <= 0)
      return response
        .status(400)
        .json({ message: "Preço unitário deve ser maior que zero." });
    const result = db
      .prepare(
        "INSERT INTO produtos (id_produto, nome, descricao, categoria, preco, unidade_medida, ativo) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        id,
        nome.trim(),
        descricao.trim(),
        categoria.trim(),
        price,
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
            "Já existe um produto cadastrado com este ID. Informe outro ID.",
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
