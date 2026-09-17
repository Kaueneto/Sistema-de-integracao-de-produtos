# Sistema de Produtos do Grupo 3

aplicação web para cadastrar e exportar produtos, bem como importar e validar os arquivos de vendas fornecido pelo Grupo 2.

## Executar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Contrato de entrada (Grupo 2 > Grupo 3)

O importador exige UTF-8, quebra de linha LF, delimitador `;`, cabecalho e a
ordem de colunas definida no contrato. Primeiro, o sistema apresenta uma
prévia da validação; só depois da confirmação os registros válidos são
gravados e o CSV de rejeitados é gerado. Um mesmo conteúdo é identificado pelo
hash como reprocessamento; `id_venda` é verificado como único dentro da própria
remessa, permitindo cenários de teste distintos com os mesmos IDs.

O e-mail recebido não é validado, pois ele não identifica unicamente uma venda
e não DEVERIA impedir os testes de integração.

