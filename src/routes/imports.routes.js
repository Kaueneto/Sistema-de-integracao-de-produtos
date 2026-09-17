import { Router } from "express";
import multer from "multer";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { db } from "../db/database.js";
import {
  confirmVendasImport,
  previewVendasCsv,
} from "../services/csv-import.service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
export const importsRouter = Router();

function formatSaoPaulo(timestamp) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(`${timestamp}Z`));
}

importsRouter.post(
  "/preview",
  upload.single("file"),
  (request, response, next) => {
    try {
      if (!request.file)
        return response
          .status(400)
          .json({ message: "Selecione um arquivo CSV." });
      return response.json(previewVendasCsv(request.file));
    } catch (error) {
      return next(error);
    }
  },
);

importsRouter.post("/confirm", (request, response, next) => {
  try {
    return response.status(201).json(confirmVendasImport(request.body.token));
  } catch (error) {
    return next(error);
  }
});

importsRouter.get("/", (_request, response) => {
  const imports = db
    .prepare("SELECT * FROM importacoes ORDER BY id DESC")
    .all();
  response.json(imports);
});

importsRouter.get("/:id/errors", (request, response) => {
  const errors = db
    .prepare(
      "SELECT linha AS line, motivo AS reason, dados AS raw FROM erros_importacao WHERE importacao_id = ? ORDER BY linha",
    )
    .all(request.params.id);
  response.json(errors);
});

importsRouter.get("/:id/report", (request, response) => {
  const summary = db
    .prepare(
      "SELECT id, nome_arquivo, recebido_em, total_registros, processados, rejeitados, status, erro_estrutural FROM importacoes WHERE id = ?",
    )
    .get(request.params.id);
  if (!summary)
    return response.status(404).json({ message: "Importação não encontrada." });
  const errors = db
    .prepare(
      "SELECT linha AS line, motivo AS reason FROM erros_importacao WHERE importacao_id = ? ORDER BY linha",
    )
    .all(request.params.id);
  return response.json({ ...summary, errors });
});

importsRouter.get("/:id/report.txt", (request, response) => {
  const summary = db
    .prepare(
      "SELECT id, nome_arquivo, recebido_em, total_registros, processados, rejeitados, status, erro_estrutural FROM importacoes WHERE id = ?",
    )
    .get(request.params.id);
  if (!summary) return response.status(404).send("Importação não encontrada.");
  const errors = db
    .prepare(
      "SELECT linha, motivo FROM erros_importacao WHERE importacao_id = ? ORDER BY linha",
    )
    .all(request.params.id);
  const lines = [
    "====================================",
    `       PROCESSAMENTO DO CSV `,
    "====================================",
    "",
    `Arquivo: ${summary.nome_arquivo ?? "Arquivo não informado"}`,
    `Remessa: #${summary.id}`,
    `Data/hora: ${formatSaoPaulo(summary.recebido_em)}`,
    "",
    `Total de registros: ${summary.total_registros}`,
    `Registros processados: ${summary.processados}`,
    `Registros rejeitados: ${summary.rejeitados}`,
    "",
    "------------------------------------",
    "ERROS ENCONTRADOS",
    "------------------------------------",
    ...(summary.erro_estrutural
      ? ["", summary.erro_estrutural]
      : errors.flatMap((error) => ["", `Linha ${error.linha}:`, error.motivo])),
  ];
  response
    .attachment(`relatorio-importacao-${summary.id}.txt`)
    .type("text/plain; charset=utf-8")
    .send(lines.join("\n"));
});

importsRouter.get("/:id/rejections", (request, response) => {
  const file = join(
    process.cwd(),
    "data",
    "rejections",
    `rejeitados-importacao-${request.params.id}.csv`,
  );
  if (!existsSync(file))
    return response
      .status(404)
      .json({ message: "Não há arquivo de rejeitados para esta importação." });
  return response.download(
    file,
    `rejeitados-importacao-${request.params.id}.csv`,
  );
});
