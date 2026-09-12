# Nova aba: Contas a pagar com aviso por e-mail

Uma aba para cadastrar contas com data de vencimento, receber aviso por e-mail antes de vencer e dar baixa gerando a despesa no fluxo de caixa.

## O que você vai ver

Nova aba **Contas** no menu, com:

- Lista das contas cadastradas, ordenadas por vencimento, com destaque para vencidas, "vence hoje" e próximas.
- Cadastro de conta: nome, valor, dia/data de vencimento, se repete todo mês, categoria, saldo (conta) de onde sai o dinheiro, forma de pagamento e observações.
- Campo "avisar com X dias de antecedência" em cada conta (você escolhe por conta, ex.: 1, 3, 7 dias).
- Botão **Marcar como paga**: registra o pagamento e lança automaticamente a despesa no fluxo de caixa, já descontando do saldo escolhido. Contas mensais geram a próxima automaticamente.
- Resumo no topo: total a vencer no mês, total vencido e total já pago.

## Aviso por e-mail

- Uma vez por dia o sistema verifica as contas e envia um e-mail para o endereço da sua conta de acesso, avisando das que vencem dentro do prazo que você configurou.
- O e-mail traz nome da conta, valor, data de vencimento e um link para abrir a aba.
- Cada conta é avisada uma única vez por vencimento (sem e-mails repetidos).

**Necessário antes disso funcionar:** o envio de e-mails exige um domínio próprio seu (ex.: seudominio.com.br) configurado como remetente. A tela de contas e a baixa funcionam de imediato; os e-mails passam a sair assim que o domínio estiver configurado e verificado.

## Detalhes técnicos

- Tabela `finance_bills` (user_id, name, amount, due_date, recurring, notify_days_before, category_id, account_id, payment_method, status, paid_at, transaction_id, last_notified_for) com GRANTs e RLS por `auth.uid()`, mais trigger de `updated_at`.
- Store `src/lib/bills-store.tsx` no padrão de `shopping-store.tsx`; baixa cria transação via a lógica de `finance-store` e grava `transaction_id`.
- Rota `src/routes/contas.tsx` + formulários em `src/components/bills/`, reaproveitando `AppHeader` e o visual atual; item novo em `AppHeader.tsx`.
- Template de e-mail em React Email no registro de templates, enviado pelo helper de envio do projeto (Lovable Emails); e-mail do destinatário vem de `auth.users`.
- Rota `src/routes/api/public/bills-reminder.ts` protegida por segredo no header, que seleciona as contas dentro da janela de aviso ainda não notificadas, envia o e-mail e grava `last_notified_for`.
- Job diário (`pg_cron`, 1x por dia às 11:00 UTC / 08:00 em SP) chamando essa rota — uma execução por dia, custo mínimo e atraso máximo de 24h no aviso.
