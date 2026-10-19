# My Money Garden

Crie um aplicativo completo de Gestão Financeira Pessoal com design moderno, responsivo e altamente intuitivo.

### 1. Visão Geral e Filtro Temporal

- **Seletor de Período**: Um dropdown no topo para filtrar os dados por Mês e Ano (ex: "Julho / 2026").

- **Cards de Resumo Financeiro**:

  - Saldo Total do mês.

  - Total de Receitas (verde).

  - Total de Despesas (vermelho).

  - Balanço do Mês (Diferença entre receitas e despesas).

### 2. Sistema de Categorias e Subcategorias

- Permita cadastrar, editar e remover **Categorias** principais (ex: Moradia, Alimentação, Transporte, Lazer, Saúde).

- Para cada categoria, permita adicionar **Subcategorias** vinculadas (ex: Alimentação → Supermercado, Restaurantes, Delivery).

- Atribua cores e/ou ícones para cada categoria para facilitar a visualização rápida.

### 3. Registro de Transações

- **Modal / Formulário de Nova Transação**:

  - Tipo: Receita ou Despesa.

  - Valor (R$).

  - Data de pagamento/recebimento.

  - Categoria (dropdown) e Subcategoria (dropdown dinâmico que carrega apenas as subcategorias da categoria selecionada).

  - Descrição / Observação.

  - Status: Pago ou Pendente.

- **Tabela de Transações do Mês**:

  - Lista detalhada com busca rápida e filtros por Categoria, Subcategoria e Tipo.

  - Ações para editar e deletar transações.

### 4. Relatórios e Gráficos Interativos

- **Gráfico de Rosca/Pizza**: Distribuição percentual das despesas por Categoria no mês selecionado. Ao clicar em uma categoria, mostre o detalhamento por Subcategoria.

- **Gráfico de Barras**: Comparativo de Receitas vs Despesas dos últimos meses.

### 5. UI/UX e Dados

- Interface com componentes shadcn/ui e suporte a tema claro/escuro (Light / Dark mode).

- Inclua dados fictícios (mock data) realistas e bem estruturados pré-carregados para que o app já inicie funcional e visualmente preenchido.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://my-finflow-09.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/97f44d5d-cb75-4f8a-84b8-f60edf1af5bd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
