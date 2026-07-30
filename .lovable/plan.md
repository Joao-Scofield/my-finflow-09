## Objetivo

Criar uma página dedicada à gestão financeira de frota, com custo por km rodado por veículo.

## Navegação

- Nova rota `/frota`, com um menu no topo alternando entre **Painel** e **Frota** (mesmo cabeçalho, tema claro/escuro e login já existentes).

## O que a página terá

**1. Veículos**
Cadastro de veículos: nome/apelido, placa, marca/modelo, ano, tipo de combustível, odômetro inicial e odômetro atual. Cartão por veículo mostrando km rodados, custo total e **custo por km**.

**2. Abastecimentos**
Data, veículo, odômetro, litros, preço por litro (ou total), posto e tipo de combustível. A partir disso o sistema calcula:
- km rodados entre abastecimentos
- consumo médio (km/l)
- custo de combustível por km

**3. Manutenções e pneus**
Data, veículo, odômetro, tipo (revisão, óleo, pneus, freios, outro), descrição, valor e, opcionalmente, "próxima revisão em X km" — com aviso quando o odômetro se aproximar.

**4. Custos fixos**
IPVA, seguro, licenciamento, financiamento/parcela: valor, periodicidade (mensal/anual/único) e vigência. Rateados proporcionalmente no período analisado.

**5. Indicadores e gráficos**
- Cards: km rodados no período, gasto total, custo/km, consumo médio, gasto por categoria (combustível, manutenção, fixos).
- Gráfico de evolução do custo por km ao longo dos meses.
- Gráfico de composição dos custos (combustível x manutenção x fixos).
- Comparativo entre veículos quando houver mais de um.

**6. Integração opcional com o financeiro**
Cada abastecimento, manutenção ou custo fixo terá a opção "lançar no financeiro". Quando marcada, cria automaticamente uma saída com categoria (ex.: Frota > Combustível) e o saldo/conta escolhido, exatamente como um lançamento manual. Sem marcar, o registro fica só no módulo de frota.

## Detalhes técnicos

- Migração no banco criando `fleet_vehicles`, `fleet_fuelings`, `fleet_maintenances` e `fleet_fixed_costs`, todas com `user_id`, RLS por dono e GRANTs — mesmo padrão das tabelas atuais.
- Quando "lançar no financeiro" estiver marcado, o registro guarda o id da transação criada em `finance_transactions`, para que editar/excluir na frota reflita no financeiro.
- Store própria (`fleet-store`) seguindo o padrão de `finance-store`, com cálculos derivados (km, consumo, custo/km) feitos no cliente.
- Componentes novos em `src/components/fleet/`; rota em `src/routes/frota.tsx` com metadados próprios de SEO.
- Cores e textos usando os tokens do tema atual (legível em claro e escuro).

## Fora do escopo agora

- Motoristas, jornadas e rastreamento por GPS.
- Importação de planilhas de abastecimento (pode vir depois, reaproveitando o importador atual).
