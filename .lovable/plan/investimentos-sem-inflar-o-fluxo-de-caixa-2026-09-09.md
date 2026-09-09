# Investimentos sem inflar o fluxo de caixa

Hoje, para investir, você lança uma saída na conta e uma entrada no investimento. Isso soma nas receitas e despesas do mês e distorce o resultado. A solução é um terceiro tipo de lançamento: **Transferência**.

## Como vai funcionar

- No formulário de lançamento passa a existir três opções: Receita, Despesa e **Transferência**.
- Na transferência você escolhe **de qual saldo sai** e **para qual saldo entra**, o valor e a data.
- O dinheiro sai de um saldo e entra no outro normalmente, mas **não conta como receita nem como despesa** em nenhum lugar: cards de resumo, gráficos de categorias, comparativo mensal e formas de pagamento ignoram esse tipo.
- Tudo fica rastreável: as transferências aparecem na tabela de lançamentos, com marcação própria (ex.: "Conta corrente → Investimento"), e podem ser filtradas.
- Rendimento continua sendo **receita** normal: quando o investimento render, você lança uma receita na conta de investimento e ela aparece no fluxo de caixa, como você pediu.
- Na aba Saldos, a evolução de cada saldo continua correta, porque as transferências movimentam os saldos.
- Lançamentos antigos ficam como estão; nada é alterado retroativamente.

## Detalhes técnicos

- Banco: permitir `type = 'transfer'` em `finance_transactions` e adicionar `transfer_account_id` (conta de destino); `account_id` passa a ser a origem na transferência. Categoria deixa de ser obrigatória para esse tipo (coluna nullable).
- `src/lib/finance-data.ts`: novo tipo `TxType = "income" | "expense" | "transfer"` e campo `transferAccountId`.
- `src/lib/finance-store.tsx`: cálculo de saldo por conta passa a subtrair na origem e somar no destino nas transferências; totais de receita/despesa filtram `type !== "transfer"`.
- `TransactionModal.tsx`: terceira opção de tipo, com seletores "De" e "Para" (contas distintas obrigatórias) e ocultação de categoria/status.
- `Charts.tsx`, `SummaryCards.tsx`, `index.tsx`, `saldos.tsx`, endpoint público e ferramentas MCP: excluir transferências dos agregados de receita/despesa.
- `TransactionsTable.tsx`: linha/cartão específico para transferência com origem e destino e filtro por tipo.

# Saldos: visão mensal e trimestral

- O gráfico de evolução de saldos ganha um seletor de agrupamento: **Mensal** (como hoje) e **Trimestral** (T1/T2/T3/T4, usando o saldo do fim de cada trimestre).
- Os períodos disponíveis (6/12/24 meses) continuam, adaptados ao agrupamento escolhido (ex.: 4, 8 ou 12 trimestres).
- Técnico: em `BalanceHistoryChart.tsx`, manter o cálculo O(n) de deltas mensais e agregar em buckets trimestrais antes de montar as séries; rótulos "T1/2026".

# Tela principal: selecionar vários meses

- O seletor de período passa a permitir escolher **um intervalo de meses** (ex.: Janeiro a Março) em vez de apenas um mês.
- Todos os números da tela (cards de resumo, tabela e gráficos) passam a considerar o intervalo inteiro somado.
- Um atalho "Mês atual" mantém o uso rápido de um único mês, e o comparativo mensal continua mostrando cada mês separadamente.
- Técnico: `PeriodSelector.tsx` passa a emitir `{ startMonth, startYear, endMonth, endYear }`; `index.tsx` filtra transações pelo intervalo e passa a lista agregada para cards, tabela e gráficos; ao criar lançamento, a data padrão usa o último mês do intervalo.
