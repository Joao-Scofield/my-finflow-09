# Corrigir cálculos da Frota + criar a Lista de Compras

## 1. Frota: km/l e custo por km com um único abastecimento

Hoje os cálculos ignoram o odômetro inicial cadastrado no veículo:

- `fuelStats` (src/lib/fleet-data.ts) mede a distância apenas entre o primeiro e o último abastecimento e descarta os litros do último. Com 1 abastecimento, distância = 0 e litros usados = 0, então **km/l fica 0**.
- `kmInMonth` (src/lib/fleet-metrics.ts) usa como base o abastecimento anterior ao mês; se não existir, usa o próprio abastecimento do mês. Com 1 abastecimento, km do mês = 0, e como custo/km = custo ÷ km, o **gráfico de custo por km fica zerado**.

Correções:

- Usar o odômetro inicial do veículo como base quando não há abastecimento anterior, tanto em `fuelStats` quanto em `kmInMonth` (passar o veículo/odômetro inicial para as funções e para os gráficos).
- Em `fuelStats`, calcular km/l como distância percorrida ÷ litros abastecidos no período. Quando houver 2 ou mais abastecimentos, manter a regra mais precisa (descartar o último tanque); com apenas um, usar distância desde o odômetro inicial ÷ litros do abastecimento.
- Atualizar `CostPerKmChart`, `CostCompositionChart` e `VehicleComparisonChart` (src/components/fleet/FleetCharts.tsx) e o resumo em src/routes/frota.tsx para receberem o odômetro inicial e refletirem os novos valores.
- Exibir "—" em vez de R$ 0,00 / 0 km/l quando ainda não houver dados suficientes, para não parecer erro.

## 2. Nova aba Lista de Compras (/lista)

Página no mesmo padrão de Frota e Saldos, com dados salvos na nuvem por usuário.

Campos do item: nome, valor estimado, link de compra, loja, quantidade, prioridade (alta/média/baixa), categoria opcional, observações e status (desejado / comprado).

Funcionalidades:
- Cards de resumo: total estimado dos itens pendentes, total já comprado e quantidade de itens.
- Filtros por status e prioridade, ordenação por prioridade/valor.
- Formulário em modal para criar e editar, botão de excluir.
- Ao marcar como comprado: opção de lançar automaticamente a despesa no financeiro, escolhendo conta (saldo), categoria e valor realmente pago.
- Layout em cards no celular e tabela no desktop, com skeletons de carregamento.
- Link "Lista" na navegação das páginas Painel, Saldos e Frota.

## Detalhes técnicos

- Migração: tabela `shopping_items` (user_id, name, estimated_amount, url, store, quantity, priority, category_id, notes, status, purchased_at, transaction_id) com GRANTs, RLS por `auth.uid()` e trigger de `updated_at`.
- Store `src/lib/shopping-store.tsx` seguindo o padrão de `fleet-store.tsx`; rota `src/routes/lista.tsx` com `head()` próprio; componentes em `src/components/shopping/`.
- Ao comprar com lançamento, criar a transação via store de finanças e guardar `transaction_id` para remover o lançamento se o item for desfeito/excluído.
