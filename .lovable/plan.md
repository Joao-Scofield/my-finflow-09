# Fazer o saldo continuar de um mês para o outro

## O que foi verificado

Olhando a conta do cliente (silvio):

- Ele não tem nenhum saldo/conta cadastrado — todos os lançamentos dele estão sem saldo vinculado.
- Por isso o cartão grande "Patrimônio (saldos)" mostra R$ 0,00 para ele.
- Hoje a tela principal calcula só "Receitas", "Despesas" e "Balanço do mês" usando **apenas** os lançamentos do período escolhido. Não existe nenhum número que traga o resultado dos meses anteriores.

Ou seja: quando ele vira de julho para agosto, tudo recomeça do zero. Não é perda de dados — os lançamentos continuam salvos — é que a tela não mostra nada acumulado.

## O que vou fazer

1. **Novo cartão "Saldo anterior"**: soma de tudo que entrou menos tudo que saiu antes do primeiro mês do período selecionado.
2. **Novo cartão "Saldo acumulado"**: saldo anterior + balanço do período. É esse número que "passa" de julho para agosto.
3. O cartão "Balanço do mês" continua existindo, mostrando só o resultado do período.
4. O cartão "Patrimônio (saldos)" continua como está, mas quando o usuário não tiver nenhum saldo cadastrado ele mostra um aviso curto convidando a cadastrar, em vez de um R$ 0,00 sem explicação.
5. Transferências continuam fora dessas contas (não são receita nem despesa).

## Detalhes técnicos

- `src/routes/index.tsx`: calcular `previousBalance` percorrendo `transactions` com data anterior a `${startYear}-${startMonth}-01`, somando `income` e subtraindo `expense` (ignorando `transfer`), memoizado junto do índice `txByMonth` já existente.
- `src/components/finance/SummaryCards.tsx`: aceitar `previousBalance`, renderizar os cartões "Saldo anterior" e "Saldo acumulado" (`previousBalance + income - expense`) e o estado vazio do patrimônio quando `accountsTotal === 0` e não houver contas.
- Grid dos cartões reorganizado para caber os novos itens sem quebrar no celular.
- Sem mudança de banco de dados nem de dados existentes.
