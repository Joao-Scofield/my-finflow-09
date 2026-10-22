# Nova aba: Contas a pagar

Uma aba para cadastrar contas com data de vencimento e dar baixa gerando a despesa no fluxo de caixa.

## O que você vai ver

Nova aba **Contas** no menu, com:

- Lista das contas cadastradas, ordenadas por vencimento, com destaque para vencidas, "vence hoje" e próximas.
- Cadastro de conta: nome, valor, dia/data de vencimento, se repete todo mês, categoria, saldo (conta) de onde sai o dinheiro, forma de pagamento e observações.
- Botão **Marcar como paga**: registra o pagamento e lança automaticamente a despesa no fluxo de caixa, já descontando do saldo escolhido. Contas mensais geram a próxima automaticamente.
- Resumo no topo: total a vencer no mês, total vencido e total já pago.

## Detalhes técnicos

- Tabela `finance_bills` (user_id, name, amount, due_date, recurring, category_id, account_id, payment_method, status, paid_at, transaction_id) com GRANTs e RLS por `auth.uid()`, mais trigger de `updated_at`.
- Store `src/lib/bills-store.tsx` no padrão de `shopping-store.tsx`; baixa cria transação via a lógica de `finance-store` e grava `transaction_id`.
- Rota `src/routes/contas.tsx` + formulários em `src/components/bills/`, reaproveitando `AppHeader` e o visual atual; item novo em `AppHeader.tsx`.
