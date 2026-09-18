const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ],
  );
let pendingPreviewToken = null;
let sales = [];
let salesSort = { key: "id_venda", direction: "desc" };
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function showFeedback(element, message, type = "success") {
  element.textContent = message;
  element.className = `mt-4 rounded-lg px-4 py-3 text-sm ${type === "success" ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200"}`;
}

function table(rows, columns, options = {}) {
  if (!rows.length)
    return '<p class="p-5 text-sm text-slate-400">Nenhum registro encontrado.</p>';
  return `<table class="min-w-full text-left text-sm"><thead class="bg-slate-900 text-slate-300"><tr>${columns.map((column) => `<th class="sticky top-0 z-10 bg-slate-900 px-4 py-3 font-semibold">${options.sortable && column.key ? `<button data-sort="${column.key}" class="flex items-center gap-1 hover:text-cyan-300">${column.label}<span class="text-xs text-cyan-400">${salesSort.key === column.key ? (salesSort.direction === "asc" ? "▲" : "▼") : "↕"}</span></button>` : column.label}</th>`).join("")}</tr></thead><tbody class="divide-y divide-slate-800">${rows.map((row) => `<tr class="bg-slate-950/40">${columns.map((column) => `<td class="px-4 py-3 text-slate-300">${column.render ? column.render(row) : escapeHtml(row[column.key])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

async function api(path, options) {
  const response = await fetch(path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.message || "Não foi possível concluir a operação.");
  return body;
}

async function loadImports() {
  const imports = await api("/api/importacoes");
  if (!imports.length) {
    $("#imports-list").innerHTML =
      '<p class="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">Nenhuma importação confirmada.</p>';
    return;
  }
  const rows = imports
    .map(
      (item) =>
        `<tr class="border-t border-slate-800 bg-slate-950/40"><td class="whitespace-nowrap px-4 py-4 font-semibold text-slate-100">#${item.id}</td><td class="max-w-52 truncate px-4 py-4 text-slate-300" title="${escapeHtml(item.nome_arquivo ?? "Arquivo não informado")}">${escapeHtml(item.nome_arquivo ?? "Arquivo não informado")}</td><td class="whitespace-nowrap px-4 py-4 text-slate-300">${new Date(item.recebido_em + "Z").toLocaleString("pt-BR")}</td><td class="px-4 py-4 text-slate-300">${item.total_registros}</td><td class="px-4 py-4 text-emerald-300">${item.processados}</td><td class="px-4 py-4 text-rose-300">${item.rejeitados}</td><td class="min-w-[22rem] px-4 py-4"><div class="flex flex-wrap items-center gap-2"><button data-report-import="${item.id}" class="rounded-md border border-cyan-500/40 px-2.5 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10">Ver relatório de processamento</button><a class="rounded-md border border-cyan-500/40 px-2.5 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10" href="/api/importacoes/${item.id}/report.txt">Baixar relatório de processamento</a>${item.rejeitados ? `<button data-errors-import="${item.id}" class="rounded-md border border-rose-500/40 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10">Ver erros do processamento</button><a class="rounded-md border border-rose-500/40 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10" href="/api/importacoes/${item.id}/rejections">Baixar rejeitados do processamento</a>` : ""}</div></td></tr>`,
    )
    .join("");
  $("#imports-list").innerHTML =
    `<div class="overflow-x-auto rounded-xl border border-slate-800"><table class="min-w-full text-left text-sm"><thead class="bg-slate-900 text-xs uppercase tracking-wide text-slate-400"><tr><th class="px-4 py-3 font-semibold">Remessa</th><th class="px-4 py-3 font-semibold">Arquivo processado</th><th class="px-4 py-3 font-semibold">Data e hora</th><th class="px-4 py-3 font-semibold">Total recebido</th><th class="px-4 py-3 font-semibold">Total processado</th><th class="px-4 py-3 font-semibold">Total rejeitado</th><th class="px-4 py-3 font-semibold">Ações</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

async function openErrorsModal(importId) {
  const errors = await api(`/api/importacoes/${importId}/errors`);
  $("#errors-title").textContent = `Erros da importação #${importId}`;
  $("#errors-content").innerHTML = table(errors, [
    { key: "line", label: "Linha" },
    { key: "reason", label: "Motivo" },
    {
      key: "raw",
      label: "Dados recebidos",
      render: (row) =>
        `<code class="block max-w-xl whitespace-pre-wrap break-all text-xs text-slate-400">${escapeHtml(row.raw)}</code>`,
    },
  ]);
  $("#errors-modal").showModal();
}

async function loadProducts() {
  const products = await api("/api/produtos");
  $("#products-list").innerHTML = table(products, [
    { key: "id_produto", label: "ID" },
    { key: "nome", label: "Nome" },
    { key: "descricao", label: "Descrição" },
    { key: "categoria", label: "Categoria" },
    {
      key: "preco",
      label: "Preço",
      render: (row) => currencyFormatter.format(Number(row.preco)),
    },
    { key: "unidade_medida", label: "Unidade" },
    {
      key: "ativo",
      label: "Ativo",
      render: (row) => (row.ativo ? "Sim" : "Não"),
    },
  ]);
}

async function loadNextProductId() {
  const { nextId } = await api("/api/produtos/proximo-id");
  $("#product-form [name='id_produto']").value = nextId;
}

function dateToComparable(value) {
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
}
function renderSales() {
  const term = $("#sales-search").value.trim().toLowerCase();
  const status = $("#sales-status").value;
  const from = $("#sales-date-from").value;
  const to = $("#sales-date-to").value;
  const filtered = sales.filter(
    (sale) =>
      (!term ||
        Object.values(sale).some((value) =>
          String(value).toLowerCase().includes(term),
        )) &&
      (!status || sale.status === status) &&
      (!from || dateToComparable(sale.data_venda) >= from) &&
      (!to || dateToComparable(sale.data_venda) <= to),
  );
  filtered.sort((a, b) => {
    const first = a[salesSort.key];
    const second = b[salesSort.key];
    const comparison =
      typeof first === "number"
        ? first - second
        : String(first).localeCompare(String(second), "pt-BR", {
            numeric: true,
          });
    return salesSort.direction === "asc" ? comparison : -comparison;
  });
  $("#sales-count").textContent =
    `${filtered.length} de ${sales.length} vendas exibidas`;
  $("#sales-list").innerHTML = table(
    filtered,
    [
      { key: "id_venda", label: "Venda" },
      { key: "id_cliente", label: "Cliente" },
      { key: "id_produto", label: "Produto" },
      { key: "quantidade", label: "Qtd." },
      {
        key: "valor_total",
        label: "Total",
        render: (row) => `R$ ${Number(row.valor_total).toFixed(2)}`,
      },
      { key: "status", label: "Status" },
      { key: "data_venda", label: "Data" },
      {
        key: "importacao_id",
        label: "Remessa",
        render: (row) => `#${row.importacao_id}`,
      },
      {
        label: "Consulta",
        render: (row) =>
          `<button data-sale="${row.id_venda}" class="text-cyan-400 hover:text-cyan-300">Ver detalhes</button>`,
      },
    ],
    { sortable: true },
  );
}
async function loadSales() {
  sales = await api("/api/vendas");
  renderSales();
}

async function openReportModal(importId) {
  const report = await api(`/api/importacoes/${importId}/report`);
  $("#report-title").textContent =
    `Processamento do CSV`;
  const errors = report.errors.length
    ? `<h3 class="mt-6 mb-3 font-semibold text-rose-300">Erros encontrados</h3>${table(
        report.errors,
        [
          { key: "line", label: "Linha" },
          { key: "reason", label: "Motivo" },
        ],
      )}`
    : '<p class="mt-6 rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-200">Nenhum registro foi rejeitado.</p>';
  $("#report-content").innerHTML =
    `<div class="grid gap-3 sm:grid-cols-3"><div class="rounded-lg bg-slate-800 p-4"><p class="text-xs uppercase text-slate-400">Total recebido</p><p class="mt-1 text-2xl font-bold">${report.total_registros}</p></div><div class="rounded-lg bg-emerald-500/10 p-4"><p class="text-xs uppercase text-emerald-300">Processados</p><p class="mt-1 text-2xl font-bold text-emerald-200">${report.processados}</p></div><div class="rounded-lg bg-rose-500/10 p-4"><p class="text-xs uppercase text-rose-300">Rejeitados</p><p class="mt-1 text-2xl font-bold text-rose-200">${report.rejeitados}</p></div></div>${errors}`;
  $("#report-modal").showModal();
}

function openSaleModal(id) {
  const sale = sales.find((item) => item.id_venda === Number(id));
  if (!sale) return;
  $("#sale-title").textContent = `Venda #${sale.id_venda}`;
  const labels = {
    importacao_id: "Remessa de origem",
    id_cliente: "Cliente",
    id_produto: "Produto",
    quantidade: "Quantidade",
    valor_unitario: "Valor unitário",
    valor_total: "Valor total",
    data_venda: "Data",
    forma_pagamento: "Pagamento",
    status: "Status",
    integrante: "Responsável",
    email: "E-mail recebido",
  };
  $("#sale-content").innerHTML = Object.entries(labels)
    .map(
      ([key, label]) =>
        `<div class="rounded-lg bg-slate-800 p-3"><dt class="text-xs uppercase text-slate-400">${label}</dt><dd class="mt-1 font-medium">${escapeHtml(sale[key])}</dd></div>`,
    )
    .join("");
  $("#sale-modal").showModal();
}

document.querySelectorAll(".tab").forEach((button) =>
  button.addEventListener("click", async () => {
    document
      .querySelectorAll(".panel")
      .forEach((panel) => panel.classList.add("hidden"));
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.remove("tab--active");
      tab.removeAttribute("aria-current");
    });
    const panel = $(`#${button.dataset.tab}`);
    panel.classList.remove("hidden", "panel-enter");
    requestAnimationFrame(() => panel.classList.add("panel-enter"));
    button.classList.add("tab--active");
    button.setAttribute("aria-current", "page");
    if (button.dataset.tab === "products")
      await Promise.all([loadProducts(), loadNextProductId()]);
    if (button.dataset.tab === "sales") await loadSales();
  }),
);

$("#import-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const feedback = $("#import-feedback");
  const button = $("#preview-button");
  try {
    button.disabled = true;
    button.textContent = "Validando arquivo...";
    const result = await api("/api/importacoes/preview", {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    pendingPreviewToken = result.token;
    $("#preview-title").textContent =
      result.status === "REJEITADA_ESTRUTURA"
        ? "Arquivo não pode ser importado"
        : result.status === "REPROCESSAMENTO"
          ? "Remessa já processada"
          : "Revise a importação";
    $("#preview-summary").textContent =
      result.status === "REJEITADA_ESTRUTURA"
        ? result.structuralError
        : result.status === "REPROCESSAMENTO"
          ? `O conteúdo deste arquivo já foi processado na remessa #${result.previousImport.id}, em ${new Date(result.previousImport.receivedAt + "Z").toLocaleString("pt-BR")}. Nenhum dado será salvo automaticamente.`
          : `${result.total} registros lidos: ${result.processed} prontos para salvar e ${result.rejected} rejeitados.`;
    $("#preview-errors").innerHTML = result.errors.length
      ? `<h3 class="mb-3 font-semibold text-rose-300">Inconsistências encontradas</h3>${table(
          result.errors,
          [
            { key: "line", label: "Linha" },
            { key: "reason", label: "Motivo" },
            {
              key: "raw",
              label: "Dados recebidos",
              render: (row) =>
                `<code class="block max-w-xl whitespace-pre-wrap break-all text-xs text-slate-400">${escapeHtml(row.raw)}</code>`,
            },
          ],
        )}`
      : '<p class="rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-200">Nenhuma inconsistência encontrada.</p>';
    $("#confirm-preview").classList.toggle(
      "hidden",
      result.status === "REJEITADA_ESTRUTURA" || result.processed === 0,
    );
    $("#preview-modal").showModal();
  } catch (error) {
    showFeedback(feedback, error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Validar arquivo";
  }
});

$("#product-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const feedback = $("#product-feedback");
  const productForm = event.currentTarget;
  const form = new FormData(productForm);
  try {
    await api("/api/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...Object.fromEntries(form),
        ativo: form.get("ativo") === "on",
      }),
    });
    showFeedback(feedback, "Produto cadastrado com sucesso.");
    productForm.reset();
    await Promise.all([loadProducts(), loadNextProductId()]);
  } catch (error) {
    showFeedback(feedback, error.message, "error");
  }
});

$("#refresh-imports").addEventListener("click", loadImports);
$("#imports-list").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-errors-import]");
  const reportButton = event.target.closest("[data-report-import]");
  try {
    if (button) await openErrorsModal(button.dataset.errorsImport);
    if (reportButton) await openReportModal(reportButton.dataset.reportImport);
  } catch (error) {
    window.alert(error.message);
  }
});
$("#close-errors-modal").addEventListener("click", () =>
  $("#errors-modal").close(),
);
$("#errors-modal").addEventListener("click", (event) => {
  if (event.target === $("#errors-modal")) $("#errors-modal").close();
});
$("#cancel-preview").addEventListener("click", () => {
  pendingPreviewToken = null;
  $("#preview-modal").close();
});
$("#confirm-preview").addEventListener("click", async () => {
  const button = $("#confirm-preview");
  const feedback = $("#import-feedback");
  try {
    button.disabled = true;
    button.textContent = "Salvando...";
    const result = await api("/api/importacoes/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: pendingPreviewToken }),
    });
    showFeedback(
      feedback,
      `Importação salva: ${result.processed} processados e ${result.rejected} rejeitados.`,
    );
    $("#import-form").reset();
    $("#preview-modal").close();
    pendingPreviewToken = null;
    await loadImports();
  } catch (error) {
    showFeedback(feedback, error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Salvar registros válidos";
  }
});
$("#preview-modal").addEventListener("click", (event) => {
  if (event.target === $("#preview-modal")) $("#cancel-preview").click();
});
$("#close-report-modal").addEventListener("click", () =>
  $("#report-modal").close(),
);
$("#report-modal").addEventListener("click", (event) => {
  if (event.target === $("#report-modal")) $("#report-modal").close();
});
$("#close-sale-modal").addEventListener("click", () =>
  $("#sale-modal").close(),
);
$("#sale-modal").addEventListener("click", (event) => {
  if (event.target === $("#sale-modal")) $("#sale-modal").close();
});
$("#refresh-sales").addEventListener("click", loadSales);
[
  "#sales-search",
  "#sales-status",
  "#sales-date-from",
  "#sales-date-to",
].forEach((selector) => $(selector).addEventListener("input", renderSales));
$("#sales-list").addEventListener("click", (event) => {
  const sortButton = event.target.closest("[data-sort]");
  const saleButton = event.target.closest("[data-sale]");
  if (sortButton) {
    const key = sortButton.dataset.sort;
    salesSort = {
      key,
      direction:
        salesSort.key === key && salesSort.direction === "asc" ? "desc" : "asc",
    };
    renderSales();
  }
  if (saleButton) openSaleModal(saleButton.dataset.sale);
});
loadImports();
