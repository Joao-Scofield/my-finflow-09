## Objetivo

Nova aba **Lista de compras / desejos** (`/lista`), no mesmo estilo das abas Saldos e Frota, para cadastrar itens que você quer comprar.

## O que a página terá

**Cadastro de item**
- Nome do item
- Valor estimado
- Link de compra (abre em nova aba)
- Loja
- Quantidade
- Prioridade: alta / média / baixa
- Categoria (usa as mesmas categorias de despesa do financeiro)
- Observações

**Lista única com filtros**
- Filtro por prioridade, categoria e por status (pendentes / comprados)
- Ordenação por prioridade, valor ou data de criação
- Agrupamento visual por categoria
- Busca por nome

**Cards de resumo**
- Total estimado dos itens pendentes
- Total já comprado
- Quantidade de itens por prioridade

**Marcar como comprado**
- Ao marcar, abre uma confirmação com a opção "lançar no financeiro" (igual à Frota): valor real pago, data, categoria/subcategoria, saldo (conta) e forma de pagamento.
- Marcando a opção, cria automaticamente uma saída em Lançamentos vinculada ao item; desmarcando/desfazendo a compra, o lançamento vinculado é removido.
- Sem marcar, o item só fica registrado como comprado na lista.

**Mobile**
- Cartões no celular (em vez de tabela), com o mesmo padrão já usado na tabela de transações.

## Detalhes técnicos

- Migração criando `shopping_items` com `user_id`, RLS por dono e GRANTs, seguindo o padrão das tabelas atuais. Campos: nome, valor estimado, valor pago, link, loja, quantidade, prioridade, `category_id`/`subcategory_id`, notas, `purchased` + `purchased_at`, `transaction_id` (vínculo com `finance_transactions`), `position`.
- Store própria `src/lib/shopping-store.tsx` no padrão do `fleet-store`, incluindo criação/remoção da transação vinculada.
- Componentes em `src/components/shopping/`; rota `src/routes/lista.tsx` com head() próprio de SEO e skeleton de carregamento.
- Link "Lista" adicionado à navegação dos cabeçalhos de `/`, `/saldos` e `/frota`.
- Cores e prioridade usando tokens do tema (legível em claro e escuro).

## Fora do escopo agora

- Várias listas separadas (fica uma lista única com filtros).
- Comparação de preços automática ou leitura de preço pelo link.
